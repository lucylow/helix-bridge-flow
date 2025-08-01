use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::{Addr, Coin, Timestamp};

#[cw_serde]
pub struct InstantiateMsg {
    pub admin: Option<String>,
}

#[cw_serde]
pub enum ExecuteMsg {
    /// Create a new atomic swap
    CreateSwap {
        id: String,
        recipient: String,
        hashlock: String,
        timelock: u64,
        eth_recipient: Option<String>,
    },
    /// Claim an atomic swap by revealing the secret
    ClaimSwap {
        id: String,
        secret: String,
    },
    /// Refund an expired atomic swap
    RefundSwap {
        id: String,
    },
    /// Update contract admin
    UpdateAdmin {
        admin: String,
    },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    /// Get swap details
    #[returns(SwapResponse)]
    GetSwap { id: String },
    
    /// Get all swaps for a user
    #[returns(SwapsResponse)]
    GetSwapsByUser { user: String },
    
    /// Get contract configuration
    #[returns(ConfigResponse)]
    GetConfig {},
    
    /// Check if a secret is valid for a swap
    #[returns(ValidateSecretResponse)]
    ValidateSecret { id: String, secret: String },
}

#[cw_serde]
pub struct SwapResponse {
    pub id: String,
    pub sender: Addr,
    pub recipient: Addr,
    pub amount: Coin,
    pub hashlock: String,
    pub timelock: u64,
    pub status: SwapStatus,
    pub created_at: Timestamp,
    pub eth_recipient: Option<String>,
    pub secret: Option<String>,
}

#[cw_serde]
pub struct SwapsResponse {
    pub swaps: Vec<SwapResponse>,
}

#[cw_serde]
pub struct ConfigResponse {
    pub admin: Addr,
    pub total_swaps: u64,
}

#[cw_serde]
pub struct ValidateSecretResponse {
    pub valid: bool,
}

#[cw_serde]
pub enum SwapStatus {
    Open,
    Claimed,
    Refunded,
    Expired,
}

impl SwapStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            SwapStatus::Open => "open",
            SwapStatus::Claimed => "claimed",
            SwapStatus::Refunded => "refunded",
            SwapStatus::Expired => "expired",
        }
    }
}

#[cw_serde]
pub struct MigrateMsg {}

