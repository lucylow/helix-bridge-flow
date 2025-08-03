use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Addr, Coin, Timestamp};
use cw_storage_plus::{Item, Map};

use crate::msg::SwapStatus;

#[cw_serde]
pub struct Config {
    pub admin: Addr,
    pub total_swaps: u64,
}

#[cw_serde]
pub struct AtomicSwap {
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
    pub claimed_at: Option<Timestamp>,
    pub refunded_at: Option<Timestamp>,
}

impl AtomicSwap {
    pub fn new(
        id: String,
        sender: Addr,
        recipient: Addr,
        amount: Coin,
        hashlock: String,
        timelock: u64,
        created_at: Timestamp,
        eth_recipient: Option<String>,
    ) -> Self {
        Self {
            id,
            sender,
            recipient,
            amount,
            hashlock,
            timelock,
            status: SwapStatus::Open,
            created_at,
            eth_recipient,
            secret: None,
            claimed_at: None,
            refunded_at: None,
        }
    }

    pub fn is_expired(&self, current_time: Timestamp) -> bool {
        current_time.seconds() >= self.timelock
    }

    pub fn can_claim(&self, current_time: Timestamp) -> bool {
        matches!(self.status, SwapStatus::Open) && !self.is_expired(current_time)
    }

    pub fn can_refund(&self, current_time: Timestamp) -> bool {
        matches!(self.status, SwapStatus::Open) && self.is_expired(current_time)
    }

    pub fn validate_secret(&self, secret: &str) -> bool {
        use sha2::{Digest, Sha256};
        
        // Decode the secret from hex
        let secret_bytes = match hex::decode(secret) {
            Ok(bytes) => bytes,
            Err(_) => return false,
        };

        // Calculate SHA256 hash
        let mut hasher = Sha256::new();
        hasher.update(&secret_bytes);
        let hash = hasher.finalize();
        let calculated_hash = hex::encode(hash);

        // Compare with stored hashlock (case insensitive)
        calculated_hash.to_lowercase() == self.hashlock.to_lowercase()
    }

    pub fn claim(&mut self, secret: String, current_time: Timestamp) {
        self.status = SwapStatus::Claimed;
        self.secret = Some(secret);
        self.claimed_at = Some(current_time);
    }

    pub fn refund(&mut self, current_time: Timestamp) {
        self.status = SwapStatus::Refunded;
        self.refunded_at = Some(current_time);
    }
}

// Storage keys
pub const CONFIG: Item<Config> = Item::new("config");
pub const SWAPS: Map<&str, AtomicSwap> = Map::new("swaps");
pub const SWAPS_BY_SENDER: Map<(&str, &str), ()> = Map::new("swaps_by_sender");
pub const SWAPS_BY_RECIPIENT: Map<(&str, &str), ()> = Map::new("swaps_by_recipient");

