const { SigningCosmWasmClient } = require("@cosmjs/cosmwasm-stargate");
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { GasPrice } = require("@cosmjs/stargate");
const fs = require("fs");

// Cosmos testnet configuration
const RPC_URL = "https://rpc.theta-testnet.polypore.xyz";
const CHAIN_ID = "theta-testnet-001";

async function deployContract() {
    try {
        console.log("🚀 Starting Cosmos HTLC Contract Deployment...");
        
        // You'll need to replace this with your actual mnemonic
        const MNEMONIC = "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12";
        
        console.log("Creating wallet from mnemonic...");
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, {
            prefix: "cosmos",
        });
        
        const [firstAccount] = await wallet.getAccounts();
        console.log("Deployer address:", firstAccount.address);
        
        console.log("Connecting to Cosmos testnet...");
        const client = await SigningCosmWasmClient.connectWithSigner(
            RPC_URL,
            wallet,
            {
                gasPrice: GasPrice.fromString("0.025uatom"),
            }
        );
        
        // Check balance
        const balance = await client.getBalance(firstAccount.address, "uatom");
        console.log("Account balance:", balance);
        
        if (parseInt(balance.amount) < 1000000) {
            console.error("❌ Insufficient balance! Need at least 1 ATOM for deployment.");
            console.log("Please fund your account:", firstAccount.address);
            console.log("Use the Cosmos testnet faucet: https://faucet.theta-testnet.polypore.xyz/");
            return;
        }
        
        // Read the compiled contract
        console.log("Reading contract bytecode...");
        let wasmBytecode;
        try {
            wasmBytecode = fs.readFileSync("cosmos/wasm/contracts/escrow/artifacts/fusion_escrow.wasm");
        } catch (error) {
            console.error("❌ Contract not compiled yet!");
            console.log("To compile the contract, run:");
            console.log("cd cosmos/wasm/contracts/escrow");
            console.log("cargo wasm");
            console.log("wasm-opt -Oz target/wasm32-unknown-unknown/release/fusion_escrow.wasm -o artifacts/fusion_escrow.wasm");
            return;
        }
        
        console.log("Uploading contract code...");
        const uploadResult = await client.upload(
            firstAccount.address,
            wasmBytecode,
            "auto",
            "Fusion HTLC Escrow Contract"
        );
        
        console.log("✅ Contract uploaded!");
        console.log("Code ID:", uploadResult.codeId);
        console.log("Transaction hash:", uploadResult.transactionHash);
        
        console.log("Instantiating contract...");
        const instantiateMsg = {
            admin: firstAccount.address,
        };
        
        const instantiateResult = await client.instantiate(
            firstAccount.address,
            uploadResult.codeId,
            instantiateMsg,
            "Fusion HTLC Escrow",
            "auto",
            {
                admin: firstAccount.address,
            }
        );
        
        console.log("🎉 Contract deployed successfully!");
        console.log("Contract Address:", instantiateResult.contractAddress);
        console.log("Transaction hash:", instantiateResult.transactionHash);
        console.log("Block height:", instantiateResult.height);
        
        // Save deployment info
        const deploymentInfo = {
            network: "theta-testnet-001",
            rpcUrl: RPC_URL,
            contractAddress: instantiateResult.contractAddress,
            codeId: uploadResult.codeId,
            deployer: firstAccount.address,
            uploadTxHash: uploadResult.transactionHash,
            instantiateTxHash: instantiateResult.transactionHash,
            blockHeight: instantiateResult.height,
            timestamp: new Date().toISOString(),
        };
        
        fs.writeFileSync(
            "cosmos/deployment-info.json",
            JSON.stringify(deploymentInfo, null, 2)
        );
        
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Contract Address:", instantiateResult.contractAddress);
        console.log("Explorer URL:", `https://www.mintscan.io/cosmoshub-testnet/account/${instantiateResult.contractAddress}`);
        console.log("\n🔑 Add this to your Supabase secrets:");
        console.log(`COSMOS_HTLC_CONTRACT_ADDRESS=${instantiateResult.contractAddress}`);
        
        return instantiateResult.contractAddress;
        
    } catch (error) {
        console.error("❌ Deployment failed:", error);
        
        if (error.message.includes("insufficient funds")) {
            console.log("\n💰 Get testnet funds from:");
            console.log("https://faucet.theta-testnet.polypore.xyz/");
        }
        
        throw error;
    }
}

// Alternative: Use pre-deployed contract for quick setup
function usePreDeployedContract() {
    console.log("🚀 Using pre-deployed demo contract...");
    
    // This is a demo contract address - replace with your actual deployed contract
    const DEMO_CONTRACT_ADDRESS = "cosmos1example123456789abcdefghijklmnopqrstuvwxyz";
    
    console.log("Demo Contract Address:", DEMO_CONTRACT_ADDRESS);
    console.log("⚠️  This is for demo purposes only!");
    console.log("\n🔑 Add this to your Supabase secrets:");
    console.log(`COSMOS_HTLC_CONTRACT_ADDRESS=${DEMO_CONTRACT_ADDRESS}`);
    
    return DEMO_CONTRACT_ADDRESS;
}

// Main execution
if (require.main === module) {
    const useDemo = process.argv.includes("--demo");
    
    if (useDemo) {
        usePreDeployedContract();
    } else {
        deployContract()
            .then((address) => {
                console.log("✅ Deployment successful!");
                process.exit(0);
            })
            .catch((error) => {
                console.error("❌ Deployment failed:", error.message);
                process.exit(1);
            });
    }
}

module.exports = { deployContract, usePreDeployedContract };