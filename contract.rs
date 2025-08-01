use cosmwasm_std::{
    entry_point, to_binary, Addr, BankMsg, Binary, Coin, CosmosMsg, Deps, DepsMut, Env,
    MessageInfo, Response, StdResult, Timestamp, Uint128,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::{
    ConfigResponse, ExecuteMsg, InstantiateMsg, QueryMsg, SwapResponse, SwapsResponse,
    SwapStatus, ValidateSecretResponse,
};
use crate::state::{AtomicSwap, Config, CONFIG, SWAPS, SWAPS_BY_RECIPIENT, SWAPS_BY_SENDER};

// Version info for migration
const CONTRACT_NAME: &str = "fusion-escrow";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

// 1inch API key hardcoded as requested
const ONEINCH_API_KEY: &str = "h6VoEtvRieMSQZiK0INL4g93Tv2UpaXr";

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    let admin = msg
        .admin
        .map(|s| deps.api.addr_validate(&s))
        .transpose()?
        .unwrap_or_else(|| info.sender.clone());

    let config = Config {
        admin,
        total_swaps: 0,
    };

    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("admin", config.admin)
        .add_attribute("oneinch_api_key", ONEINCH_API_KEY))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::CreateSwap {
            id,
            recipient,
            hashlock,
            timelock,
            eth_recipient,
        } => execute_create_swap(deps, env, info, id, recipient, hashlock, timelock, eth_recipient),
        ExecuteMsg::ClaimSwap { id, secret } => execute_claim_swap(deps, env, info, id, secret),
        ExecuteMsg::RefundSwap { id } => execute_refund_swap(deps, env, info, id),
        ExecuteMsg::UpdateAdmin { admin } => execute_update_admin(deps, info, admin),
    }
}

pub fn execute_create_swap(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    id: String,
    recipient: String,
    hashlock: String,
    timelock: u64,
    eth_recipient: Option<String>,
) -> Result<Response, ContractError> {
    // Validate inputs
    if id.is_empty() {
        return Err(ContractError::CustomError {
            val: "Swap ID cannot be empty".to_string(),
        });
    }

    if hashlock.is_empty() {
        return Err(ContractError::InvalidHashlock {});
    }

    if timelock <= env.block.time.seconds() {
        return Err(ContractError::InvalidTimelock {});
    }

    // Check if swap already exists
    if SWAPS.has(deps.storage, &id) {
        return Err(ContractError::CustomError {
            val: format!("Swap with ID {} already exists", id),
        });
    }

    // Validate recipient address
    let recipient_addr = deps.api.addr_validate(&recipient)?;

    // Check that exactly one coin was sent
    if info.funds.len() != 1 {
        return Err(ContractError::InvalidAmount {});
    }

    let amount = info.funds[0].clone();
    if amount.amount.is_zero() {
        return Err(ContractError::InvalidAmount {});
    }

    // Create the atomic swap
    let swap = AtomicSwap::new(
        id.clone(),
        info.sender.clone(),
        recipient_addr,
        amount.clone(),
        hashlock.clone(),
        timelock,
        env.block.time,
        eth_recipient.clone(),
    );

    // Save the swap
    SWAPS.save(deps.storage, &id, &swap)?;

    // Update indexes
    SWAPS_BY_SENDER.save(deps.storage, (info.sender.as_str(), &id), &())?;
    SWAPS_BY_RECIPIENT.save(deps.storage, (swap.recipient.as_str(), &id), &())?;

    // Update total swaps count
    CONFIG.update(deps.storage, |mut config| -> StdResult<_> {
        config.total_swaps += 1;
        Ok(config)
    })?;

    Ok(Response::new()
        .add_attribute("method", "create_swap")
        .add_attribute("swap_id", id)
        .add_attribute("sender", info.sender)
        .add_attribute("recipient", recipient)
        .add_attribute("amount", amount.to_string())
        .add_attribute("hashlock", hashlock)
        .add_attribute("timelock", timelock.to_string())
        .add_attribute("eth_recipient", eth_recipient.unwrap_or_default()))
}

pub fn execute_claim_swap(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    id: String,
    secret: String,
) -> Result<Response, ContractError> {
    let mut swap = SWAPS.load(deps.storage, &id).map_err(|_| ContractError::SwapNotFound {})?;

    // Check if the claimer is the recipient
    if info.sender != swap.recipient {
        return Err(ContractError::Unauthorized {});
    }

    // Check if swap can be claimed
    if !swap.can_claim(env.block.time) {
        if swap.is_expired(env.block.time) {
            return Err(ContractError::SwapExpired {});
        } else {
            return Err(ContractError::SwapAlreadyClaimed {});
        }
    }

    // Validate the secret
    if !swap.validate_secret(&secret) {
        return Err(ContractError::InvalidSecret {});
    }

    // Update swap status
    swap.claim(secret.clone(), env.block.time);

    // Save updated swap
    SWAPS.save(deps.storage, &id, &swap)?;

    // Transfer funds to recipient
    let transfer_msg = CosmosMsg::Bank(BankMsg::Send {
        to_address: swap.recipient.to_string(),
        amount: vec![swap.amount.clone()],
    });

    Ok(Response::new()
        .add_message(transfer_msg)
        .add_attribute("method", "claim_swap")
        .add_attribute("swap_id", id)
        .add_attribute("claimer", info.sender)
        .add_attribute("secret", secret)
        .add_attribute("amount", swap.amount.to_string()))
}

pub fn execute_refund_swap(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    id: String,
) -> Result<Response, ContractError> {
    let mut swap = SWAPS.load(deps.storage, &id).map_err(|_| ContractError::SwapNotFound {})?;

    // Check if the refunder is the sender
    if info.sender != swap.sender {
        return Err(ContractError::Unauthorized {});
    }

    // Check if swap can be refunded
    if !swap.can_refund(env.block.time) {
        return Err(ContractError::SwapNotExpired {});
    }

    // Update swap status
    swap.refund(env.block.time);

    // Save updated swap
    SWAPS.save(deps.storage, &id, &swap)?;

    // Transfer funds back to sender
    let refund_msg = CosmosMsg::Bank(BankMsg::Send {
        to_address: swap.sender.to_string(),
        amount: vec![swap.amount.clone()],
    });

    Ok(Response::new()
        .add_message(refund_msg)
        .add_attribute("method", "refund_swap")
        .add_attribute("swap_id", id)
        .add_attribute("refunder", info.sender)
        .add_attribute("amount", swap.amount.to_string()))
}

pub fn execute_update_admin(
    deps: DepsMut,
    info: MessageInfo,
    admin: String,
) -> Result<Response, ContractError> {
    let mut config = CONFIG.load(deps.storage)?;

    // Check if sender is current admin
    if info.sender != config.admin {
        return Err(ContractError::Unauthorized {});
    }

    // Validate new admin address
    let new_admin = deps.api.addr_validate(&admin)?;
    config.admin = new_admin.clone();

    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new()
        .add_attribute("method", "update_admin")
        .add_attribute("new_admin", new_admin))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetSwap { id } => to_binary(&query_swap(deps, id)?),
        QueryMsg::GetSwapsByUser { user } => to_binary(&query_swaps_by_user(deps, user)?),
        QueryMsg::GetConfig {} => to_binary(&query_config(deps)?),
        QueryMsg::ValidateSecret { id, secret } => {
            to_binary(&query_validate_secret(deps, env, id, secret)?)
        }
    }
}

fn query_swap(deps: Deps, id: String) -> StdResult<SwapResponse> {
    let swap = SWAPS.load(deps.storage, &id)?;
    Ok(SwapResponse {
        id: swap.id,
        sender: swap.sender,
        recipient: swap.recipient,
        amount: swap.amount,
        hashlock: swap.hashlock,
        timelock: swap.timelock,
        status: swap.status,
        created_at: swap.created_at,
        eth_recipient: swap.eth_recipient,
        secret: swap.secret,
    })
}

fn query_swaps_by_user(deps: Deps, user: String) -> StdResult<SwapsResponse> {
    let user_addr = deps.api.addr_validate(&user)?;
    let mut swaps = Vec::new();

    // Get swaps where user is sender
    let sender_swaps: StdResult<Vec<_>> = SWAPS_BY_SENDER
        .prefix(user_addr.as_str())
        .keys(deps.storage, None, None, cosmwasm_std::Order::Ascending)
        .collect();

    for swap_id in sender_swaps? {
        if let Ok(swap) = SWAPS.load(deps.storage, &swap_id) {
            swaps.push(SwapResponse {
                id: swap.id,
                sender: swap.sender,
                recipient: swap.recipient,
                amount: swap.amount,
                hashlock: swap.hashlock,
                timelock: swap.timelock,
                status: swap.status,
                created_at: swap.created_at,
                eth_recipient: swap.eth_recipient,
                secret: swap.secret,
            });
        }
    }

    // Get swaps where user is recipient
    let recipient_swaps: StdResult<Vec<_>> = SWAPS_BY_RECIPIENT
        .prefix(user_addr.as_str())
        .keys(deps.storage, None, None, cosmwasm_std::Order::Ascending)
        .collect();

    for swap_id in recipient_swaps? {
        if let Ok(swap) = SWAPS.load(deps.storage, &swap_id) {
            // Avoid duplicates if user is both sender and recipient
            if !swaps.iter().any(|s| s.id == swap.id) {
                swaps.push(SwapResponse {
                    id: swap.id,
                    sender: swap.sender,
                    recipient: swap.recipient,
                    amount: swap.amount,
                    hashlock: swap.hashlock,
                    timelock: swap.timelock,
                    status: swap.status,
                    created_at: swap.created_at,
                    eth_recipient: swap.eth_recipient,
                    secret: swap.secret,
                });
            }
        }
    }

    Ok(SwapsResponse { swaps })
}

fn query_config(deps: Deps) -> StdResult<ConfigResponse> {
    let config = CONFIG.load(deps.storage)?;
    Ok(ConfigResponse {
        admin: config.admin,
        total_swaps: config.total_swaps,
    })
}

fn query_validate_secret(deps: Deps, _env: Env, id: String, secret: String) -> StdResult<ValidateSecretResponse> {
    let swap = SWAPS.load(deps.storage, &id)?;
    let valid = swap.validate_secret(&secret);
    Ok(ValidateSecretResponse { valid })
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::{coins, from_binary};

    #[test]
    fn proper_initialization() {
        let mut deps = mock_dependencies();

        let msg = InstantiateMsg { admin: None };
        let info = mock_info("creator", &coins(1000, "earth"));

        let res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();
        assert_eq!(0, res.messages.len());

        // Check config
        let res = query(deps.as_ref(), mock_env(), QueryMsg::GetConfig {}).unwrap();
        let config: ConfigResponse = from_binary(&res).unwrap();
        assert_eq!("creator", config.admin.as_str());
        assert_eq!(0, config.total_swaps);
    }

    #[test]
    fn create_swap() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let info = mock_info("creator", &coins(1000, "earth"));

        // Instantiate
        let msg = InstantiateMsg { admin: None };
        instantiate(deps.as_mut(), env.clone(), info.clone(), msg).unwrap();

        // Create swap
        let info = mock_info("sender", &coins(100, "uatom"));
        let msg = ExecuteMsg::CreateSwap {
            id: "swap1".to_string(),
            recipient: "recipient".to_string(),
            hashlock: "abcd1234".to_string(),
            timelock: env.block.time.seconds() + 3600,
            eth_recipient: Some("0x123".to_string()),
        };

        let res = execute(deps.as_mut(), env.clone(), info, msg).unwrap();
        assert_eq!(1, res.attributes.len());

        // Query swap
        let res = query(
            deps.as_ref(),
            env,
            QueryMsg::GetSwap {
                id: "swap1".to_string(),
            },
        )
        .unwrap();
        let swap: SwapResponse = from_binary(&res).unwrap();
        assert_eq!("swap1", swap.id);
        assert_eq!("sender", swap.sender.as_str());
        assert_eq!("recipient", swap.recipient.as_str());
    }
}

