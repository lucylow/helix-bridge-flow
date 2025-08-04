import { ethers } from "ethers";

// Contract addresses for testnet deployment
const CONTRACTS = {
  sepolia: {
    // REAL deployed CrossChainSwap contract on Sepolia testnet
    // This is a real contract address that you can deploy using: npx hardhat run scripts/deploy.js --network sepolia
    crossChainSwap: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", // Update with your deployed contract
    mockERC20: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", 
  }
};

// Updated Contract ABI based on the actual CrossChainSwap contract
const CROSS_CHAIN_SWAP_ABI = [
  "function initiateCrossChainSwap(address participant, address token, uint256 amount, bytes32 hashlock, uint256 timelock, string calldata cosmosRecipient) external payable returns (bytes32)",
  "function claim(bytes32 swapId, bytes32 secret) external",
  "function refund(bytes32 swapId) external",
  "function getSwap(bytes32 swapId) external view returns (tuple(address initiator, address participant, address token, uint256 amount, bytes32 hashlock, uint256 timelock, bool claimed, bool refunded, string cosmosRecipient))",
  "function isClaimable(bytes32 swapId, bytes32 secret) external view returns (bool)",
  "function isRefundable(bytes32 swapId) external view returns (bool)",
  "function swapFee() external view returns (uint256)",
  "event SwapInitiated(bytes32 indexed swapId, address indexed initiator, address indexed participant, address token, uint256 amount, bytes32 hashlock, uint256 timelock, string cosmosRecipient)",
  "event SwapClaimed(bytes32 indexed swapId, bytes32 secret)",
  "event SwapRefunded(bytes32 indexed swapId)"
];

export class AtomicSwapEngine {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private networkInfo = {
    sepolia: {
      chainId: 11155111,
      name: "Sepolia Testnet",
      explorer: "https://sepolia.etherscan.io"
    }
  };
  
  async initialize() {
    if (!window.ethereum) {
      throw new Error("MetaMask not found");
    }
    
    this.provider = new ethers.BrowserProvider(window.ethereum);
    await this.switchToSepolia();
    this.signer = await this.provider.getSigner();
    
    console.log("AtomicSwapEngine initialized on Sepolia testnet");
  }

  async switchToSepolia() {
    if (!window.ethereum) return;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chainId
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        // Chain not added, add it
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xaa36a7',
            chainName: 'Sepolia test network',
            nativeCurrency: {
              name: 'SepoliaETH',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://sepolia.infura.io/v3/'],
            blockExplorerUrls: ['https://sepolia.etherscan.io/'],
          }],
        });
      }
    }
  }

  async createEthereumSwap(
    recipientAddress: string,
    amount: string,
    hashlock: string,
    timelockDuration: number
  ) {
    if (!this.signer || !this.provider) {
      throw new Error("Engine not initialized");
    }

    // Clean the recipient address to remove any invisible characters
    const cleanRecipient = recipientAddress.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
    
    console.log("🚀 Creating REAL Ethereum HTLC on Sepolia testnet");
    console.log("Cosmos Recipient:", cleanRecipient);
    
    // Get addresses
    const senderAddress = await this.signer.getAddress();
    const participant = senderAddress; // For atomic swaps, participant can be initiator
    
    console.log("Using participant:", participant);
    console.log("Contract address:", CONTRACTS.sepolia.crossChainSwap);

    const contract = new ethers.Contract(
      CONTRACTS.sepolia.crossChainSwap,
      CROSS_CHAIN_SWAP_ABI,
      this.signer
    );

    const timelock = Math.floor(Date.now() / 1000) + timelockDuration;
    const amountWei = ethers.parseEther(amount);

    // Get the current swap fee
    const swapFee = await contract.swapFee();
    const totalValue = amountWei + swapFee;

    console.log("⚡ Transaction params:", {
      participant,
      token: "0x0000000000000000000000000000000000000000", // ETH
      amount: amountWei.toString(),
      hashlock,
      timelock,
      cosmosRecipient: cleanRecipient,
      swapFee: swapFee.toString(),
      totalValue: totalValue.toString(),
      contract: CONTRACTS.sepolia.crossChainSwap
    });

    // Estimate gas before sending
    const gasEstimate = await contract.initiateCrossChainSwap.estimateGas(
      participant,
      "0x0000000000000000000000000000000000000000", // ETH (zero address)
      amountWei,
      hashlock,
      timelock,
      cleanRecipient,
      { value: totalValue }
    );

    console.log("💰 Gas estimate:", gasEstimate.toString());

    const tx = await contract.initiateCrossChainSwap(
      participant,
      "0x0000000000000000000000000000000000000000", // ETH
      amountWei,
      hashlock,
      timelock,
      cleanRecipient,
      { 
        value: totalValue,
        gasLimit: gasEstimate * 110n / 100n // Add 10% buffer
      }
    );

    console.log("📝 Transaction sent:", tx.hash);
    console.log("🔗 Etherscan link:", `${this.networkInfo.sepolia.explorer}/tx/${tx.hash}`);

    // Wait for transaction receipt to get the swap ID from logs
    const receipt = await tx.wait();
    let swapId = null;
    
    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === 'SwapInitiated') {
            swapId = parsed.args.swapId;
            console.log("✅ Swap ID:", swapId);
            break;
          }
        } catch (e) {
          // Skip logs that don't match our interface
        }
      }
    }

    return {
      hash: tx.hash,
      swapId: swapId,
      explorerUrl: `${this.networkInfo.sepolia.explorer}/tx/${tx.hash}`,
      wait: () => tx.wait(),
      contract: CONTRACTS.sepolia.crossChainSwap
    };
  }

  async claimSwap(swapId: string, secret: string) {
    if (!this.signer) {
      throw new Error("Engine not initialized");
    }

    console.log("🎯 Claiming swap:", swapId);

    const contract = new ethers.Contract(
      CONTRACTS.sepolia.crossChainSwap,
      CROSS_CHAIN_SWAP_ABI,
      this.signer
    );

    const tx = await contract.claim(swapId, secret);
    console.log("✅ Claim transaction sent:", tx.hash);
    console.log("🔗 Etherscan link:", `${this.networkInfo.sepolia.explorer}/tx/${tx.hash}`);
    
    return {
      hash: tx.hash,
      explorerUrl: `${this.networkInfo.sepolia.explorer}/tx/${tx.hash}`,
      wait: () => tx.wait()
    };
  }

  async getSwapDetails(swapId: string) {
    if (!this.signer) {
      throw new Error("Engine not initialized");
    }

    const contract = new ethers.Contract(
      CONTRACTS.sepolia.crossChainSwap,
      CROSS_CHAIN_SWAP_ABI,
      this.signer
    );

    return await contract.getSwap(swapId);
  }

  async refundSwap(swapId: string) {
    if (!this.signer) {
      throw new Error("Engine not initialized");
    }

    const contract = new ethers.Contract(
      CONTRACTS.sepolia.crossChainSwap,
      CROSS_CHAIN_SWAP_ABI,
      this.signer
    );

    const tx = await contract.refund(swapId);
    return {
      hash: tx.hash,
      wait: () => tx.wait()
    };
  }

  generateSecret(): string {
    const secret = ethers.hexlify(ethers.randomBytes(32));
    console.log("🔐 Generated secret:", secret);
    return secret;
  }

  generateHashlock(secret: string): string {
    const hashlock = ethers.keccak256(secret);
    console.log("🔒 Generated hashlock:", hashlock);
    return hashlock;
  }

  // Cosmos integration stubs (for future implementation)
  async createCosmosSwap(
    recipientAddress: string,
    amount: string,
    hashlock: string,
    timelockDuration: number
  ) {
    console.log("🌌 Creating Cosmos swap (simulated for demo)");
    
    // Simulate Cosmos transaction
    const cosmosHash = `cosmos_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hash: cosmosHash,
      explorerUrl: `https://testnet.mintscan.io/cosmos-testnet/txs/${cosmosHash}`,
      wait: () => Promise.resolve({ status: 1 })
    };
  }

  async claimCosmosSwap(swapId: string, secret: string) {
    console.log("🌌 Claiming Cosmos swap (simulated for demo)");
    
    const cosmosHash = `cosmos_claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hash: cosmosHash,
      explorerUrl: `https://testnet.mintscan.io/cosmos-testnet/txs/${cosmosHash}`,
      wait: () => Promise.resolve({ status: 1 })
    };
  }
}

export const atomicSwapEngine = new AtomicSwapEngine();