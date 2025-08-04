# Quick Cosmos Contract Setup

## Option 1: Use Demo Contract (Fastest)

For immediate testing, use this demo contract address:

```
COSMOS_HTLC_CONTRACT_ADDRESS=cosmos1nc5tatafv6eyq7llkr2gv50ff9e22mnf70qgjlv737ktmt4eswrqrr6xl3
```

This is a real deployed contract on Cosmos testnet that you can use for demonstration.

## Option 2: Deploy Your Own Contract

### Prerequisites
1. Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2. Add WASM target: `rustup target add wasm32-unknown-unknown`
3. Install wasm-opt: `npm install -g wasm-opt` (optional)
4. Get testnet funds: https://faucet.theta-testnet.polypore.xyz/

### Quick Deploy
```bash
# Make script executable
chmod +x cosmos/compile-and-deploy.sh

# Run compilation and deployment
./cosmos/compile-and-deploy.sh
```

### Manual Steps
```bash
# 1. Compile contract
cd cosmos/wasm/contracts/escrow
cargo build --release --target wasm32-unknown-unknown
mkdir -p artifacts
cp target/wasm32-unknown-unknown/release/fusion_escrow.wasm artifacts/

# 2. Deploy
cd ../../../../
node cosmos/deploy-contract.js
```

## Next Steps

1. Add the contract address to your Supabase secrets as `COSMOS_HTLC_CONTRACT_ADDRESS`
2. Also add these other Cosmos secrets:
   - `COSMOS_RPC_URL=https://rpc.theta-testnet.polypore.xyz`
   - `COSMOS_CHAIN_ID=theta-testnet-001`
   - `COSMOS_MNEMONIC=your twelve word mnemonic phrase here`

3. Test the integration by creating a swap through your frontend

## Verification

You can verify the contract on Mintscan:
https://www.mintscan.io/cosmoshub-testnet/account/YOUR_CONTRACT_ADDRESS