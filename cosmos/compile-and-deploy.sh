#!/bin/bash

echo "🔨 Compiling and Deploying Cosmos HTLC Contract"
echo "=============================================="

# Check if we're in the right directory
if [ ! -d "cosmos/wasm/contracts/escrow" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Navigate to contract directory
cd cosmos/wasm/contracts/escrow

echo "📦 Compiling contract..."

# Install dependencies (if needed)
if [ ! -d "target" ]; then
    echo "Installing Rust dependencies..."
    cargo fetch
fi

# Compile to WASM
echo "Building WASM..."
cargo build --release --target wasm32-unknown-unknown

# Check if build was successful
if [ ! -f "target/wasm32-unknown-unknown/release/fusion_escrow.wasm" ]; then
    echo "❌ Compilation failed!"
    exit 1
fi

# Create artifacts directory
mkdir -p artifacts

# Optimize WASM (optional but recommended)
if command -v wasm-opt &> /dev/null; then
    echo "🚀 Optimizing WASM..."
    wasm-opt -Oz target/wasm32-unknown-unknown/release/fusion_escrow.wasm -o artifacts/fusion_escrow.wasm
else
    echo "⚠️  wasm-opt not found, copying unoptimized WASM"
    cp target/wasm32-unknown-unknown/release/fusion_escrow.wasm artifacts/fusion_escrow.wasm
fi

echo "✅ Contract compiled successfully!"
echo "📁 WASM file: cosmos/wasm/contracts/escrow/artifacts/fusion_escrow.wasm"

# Go back to project root
cd ../../../../

echo ""
echo "🚀 Now deploying to Cosmos testnet..."

# Install Node.js dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install @cosmjs/cosmwasm-stargate @cosmjs/proto-signing @cosmjs/stargate
fi

# Run deployment script
node cosmos/deploy-contract.js

echo ""
echo "✅ Deployment complete!"
echo "🔑 Copy the contract address to your Supabase secrets as COSMOS_HTLC_CONTRACT_ADDRESS"