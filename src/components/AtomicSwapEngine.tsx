import { ethers } from "ethers";

// Contract addresses for testnet deployment
const CONTRACTS = {
  sepolia: {
    // Use a well-known deployed contract for testing
    crossChainSwap: "0x1234567890123456789012345678901234567890", // Will be updated with real address
    mockERC20: "0x1234567890123456789012345678901234567891", 
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
    
    console.log("🚀 Creating REAL Ethereum transaction on Sepolia testnet");
    console.log("Cosmos Recipient:", cleanRecipient);
    
    // Get participant address (for cross-chain swaps, this should be the initiator)
    const senderAddress = await this.signer.getAddress();
    
    console.log("From:", senderAddress);
    console.log("Sending ETH amount:", amount);

    // For demo purposes, we'll create a simple ETH transfer transaction
    // In production, this would interact with the deployed CrossChainSwap contract
    const amountWei = ethers.parseEther(amount);

    // Create a simple ETH transfer to demonstrate real testnet interaction
    // This simulates locking ETH for the atomic swap
    const tx = await this.signer.sendTransaction({
      to: senderAddress, // Send to self for demo (would be contract in production)
      value: amountWei,
      gasLimit: 21000,
      data: "0x" + Buffer.from(`HTLC:${hashlock.slice(0, 10)}:${cleanRecipient.slice(0, 20)}`).toString('hex')
    });

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