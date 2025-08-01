use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Invalid secret")]
    InvalidSecret {},

    #[error("Swap expired")]
    SwapExpired {},

    #[error("Swap not found")]
    SwapNotFound {},

    #[error("Swap already claimed")]
    SwapAlreadyClaimed {},

    #[error("Swap not expired")]
    SwapNotExpired {},

    #[error("Invalid timelock")]
    InvalidTimelock {},

    #[error("Invalid amount")]
    InvalidAmount {},

    #[error("Invalid hashlock")]
    InvalidHashlock {},

    #[error("Insufficient funds")]
    InsufficientFunds {},

    #[error("Custom Error val: {val:?}")]
    CustomError { val: String },
}

