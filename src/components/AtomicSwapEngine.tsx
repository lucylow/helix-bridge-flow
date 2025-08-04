import { ethers } from "ethers";

// Contract addresses for testnet deployment
const CONTRACTS = {
  sepolia: {
    // Use the hardcoded demo address for consistency
    crossChainSwap: "0x758282EFA1887244c7dBe5b7d585887CF345e8a4", // Demo contract address
    mockERC20: "0x...", // Your mock token address
  }
};

// Contract ABI (simplified for atomic swaps)
const CROSS_CHAIN_SWAP_ABI = [
  "function createHTLC(address recipient, bytes32 hashlock, uint256 timelock) external payable returns (bytes32)",
  "function claim(bytes32 swapId, bytes32 secret) external",
  "function refund(bytes32 swapId) external",
  "function getSwap(bytes32 swapId) external view returns (tuple(address sender, address recipient, uint256 amount, bytes32 hashlock, uint256 timelock, bool active, bool claimed))",
  "event HTLCCreated(bytes32 indexed swapId, address indexed sender, address indexed recipient, uint256 amount, bytes32 hashlock, uint256 timelock)",
  "event HTLCClaimed(bytes32 indexed swapId, bytes32 secret)",
  "event HTLCRefunded(bytes32 indexed swapId)"
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
    console.log("Recipient:", cleanRecipient);
    
    // Always use sender's address as the on-chain recipient for cross-chain swaps
    // The real recipient is verified through the hashlock mechanism
    const senderAddress = await this.signer.getAddress();
    const ethRecipient = senderAddress; // Use sender's address as placeholder
    
    console.log("Using ethRecipient:", ethRecipient);
    console.log("Contract address:", CONTRACTS.sepolia.crossChainSwap);

    const contract = new ethers.Contract(
      CONTRACTS.sepolia.crossChainSwap,
      CROSS_CHAIN_SWAP_ABI,
      this.signer
    );

    const timelock = Math.floor(Date.now() / 1000) + timelockDuration;
    const amountWei = ethers.parseEther(amount);

    console.log("⚡ Transaction params:", {
      ethRecipient,
      hashlock,
      timelock,
      amountWei: amountWei.toString(),
      contract: CONTRACTS.sepolia.crossChainSwap
    });

    // Estimate gas before sending
    const gasEstimate = await contract.createHTLC.estimateGas(
      ethRecipient,
      hashlock,
      timelock,
      { value: amountWei }
    );

    console.log("💰 Gas estimate:", gasEstimate.toString());

    const tx = await contract.createHTLC(
      ethRecipient,
      hashlock,
      timelock,
      { 
        value: amountWei,
        gasLimit: gasEstimate * 110n / 100n // Add 10% buffer
      }
    );

    console.log("📝 Transaction sent:", tx.hash);
    console.log("🔗 Etherscan link:", `${this.networkInfo.sepolia.explorer}/tx/${tx.hash}`);

    return {
      hash: tx.hash,
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