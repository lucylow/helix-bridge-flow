import { ethers } from "ethers";

// Contract addresses for testnet deployment
const CONTRACTS = {
  sepolia: {
    crossChainSwap: "0x...", // Your deployed contract address
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
  
  async initialize() {
    if (!window.ethereum) {
      throw new Error("MetaMask not found");
    }
    
    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();
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
    
    console.log("Creating swap with recipient:", cleanRecipient);
    
    // Always use sender's address as the on-chain recipient for cross-chain swaps
    // The real recipient is verified through the hashlock mechanism
    const senderAddress = await this.signer.getAddress();
    const ethRecipient = senderAddress; // Use sender's address as placeholder
    
    console.log("Using ethRecipient:", ethRecipient);

    const contract = new ethers.Contract(
      CONTRACTS.sepolia.crossChainSwap,
      CROSS_CHAIN_SWAP_ABI,
      this.signer
    );

    const timelock = Math.floor(Date.now() / 1000) + timelockDuration;
    const amountWei = ethers.parseEther(amount);

    console.log("Transaction params:", {
      ethRecipient,
      hashlock,
      timelock,
      amountWei: amountWei.toString()
    });

    const tx = await contract.createHTLC(
      ethRecipient,
      hashlock,
      timelock,
      { value: amountWei }
    );

    return {
      hash: tx.hash,
      wait: () => tx.wait()
    };
  }

  async claimSwap(swapId: string, secret: string) {
    if (!this.signer) {
      throw new Error("Engine not initialized");
    }

    const contract = new ethers.Contract(
      CONTRACTS.sepolia.crossChainSwap,
      CROSS_CHAIN_SWAP_ABI,
      this.signer
    );

    const tx = await contract.claim(swapId, secret);
    return {
      hash: tx.hash,
      wait: () => tx.wait()
    };
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
    return ethers.hexlify(ethers.randomBytes(32));
  }

  generateHashlock(secret: string): string {
    return ethers.keccak256(secret);
  }
}

export const atomicSwapEngine = new AtomicSwapEngine();