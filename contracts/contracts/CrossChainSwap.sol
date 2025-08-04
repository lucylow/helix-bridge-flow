// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CrossChainSwap
 * @dev Cross-chain atomic swap contract for Ethereum <-> Cosmos
 */
contract CrossChainSwap is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant MIN_TIMELOCK = 1 hours;
    uint256 public constant MAX_TIMELOCK = 7 days;
    uint256 public constant SAFETY_MARGIN = 30 minutes;

    // Swap structure
    struct Swap {
        address initiator;
        address participant;
        address token;
        uint256 amount;
        bytes32 hashlock;
        uint256 timelock;
        bool claimed;
        bool refunded;
        string cosmosRecipient;
    }

    // State variables
    mapping(bytes32 => Swap) public swaps;
    uint256 public swapFee = 0.001 ether; // 0.001 ETH fee
    address public feeRecipient;
    string public constant ONEINCH_API_KEY = "demo-key";

    // Events
    event SwapInitiated(
        bytes32 indexed swapId,
        address indexed initiator,
        address indexed participant,
        address token,
        uint256 amount,
        bytes32 hashlock,
        uint256 timelock,
        string cosmosRecipient
    );

    event SwapClaimed(bytes32 indexed swapId, bytes32 secret);
    event SwapRefunded(bytes32 indexed swapId);

    constructor() {
        feeRecipient = msg.sender;
    }

    /**
     * @dev Initiate a cross-chain atomic swap
     */
    function initiateCrossChainSwap(
        address participant,
        address token,
        uint256 amount,
        bytes32 hashlock,
        uint256 timelock,
        string calldata cosmosRecipient
    ) external payable nonReentrant returns (bytes32) {
        require(participant != address(0), "Invalid participant");
        require(participant != msg.sender, "Cannot swap with yourself");
        require(amount > 0, "Amount must be greater than 0");
        require(hashlock != bytes32(0), "Invalid hashlock");
        require(timelock >= block.timestamp + MIN_TIMELOCK, "Timelock too short");
        require(timelock <= block.timestamp + MAX_TIMELOCK, "Timelock too long");
        require(bytes(cosmosRecipient).length > 0, "Invalid cosmos recipient");

        bytes32 swapId = keccak256(
            abi.encodePacked(
                msg.sender,
                participant,
                token,
                amount,
                hashlock,
                timelock,
                block.timestamp
            )
        );

        require(swaps[swapId].initiator == address(0), "Swap already exists");

        // Handle ETH or ERC20 token transfer
        if (token == address(0)) {
            // ETH swap
            require(msg.value >= amount + swapFee, "Insufficient ETH sent");
            
            // Send fee to fee recipient
            if (swapFee > 0) {
                payable(feeRecipient).transfer(swapFee);
            }
        } else {
            // ERC20 token swap
            require(msg.value >= swapFee, "Fee not paid");
            
            // Transfer tokens from sender to contract
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            
            // Send fee to fee recipient
            if (swapFee > 0) {
                payable(feeRecipient).transfer(swapFee);
            }
        }

        // Create swap
        swaps[swapId] = Swap({
            initiator: msg.sender,
            participant: participant,
            token: token,
            amount: amount,
            hashlock: hashlock,
            timelock: timelock,
            claimed: false,
            refunded: false,
            cosmosRecipient: cosmosRecipient
        });

        emit SwapInitiated(
            swapId,
            msg.sender,
            participant,
            token,
            amount,
            hashlock,
            timelock,
            cosmosRecipient
        );

        return swapId;
    }

    /**
     * @dev Claim a swap with the correct secret
     */
    function claim(bytes32 swapId, bytes32 secret) external nonReentrant {
        Swap storage swap = swaps[swapId];
        
        require(swap.initiator != address(0), "Swap does not exist");
        require(!swap.claimed, "Swap already claimed");
        require(!swap.refunded, "Swap already refunded");
        require(block.timestamp < swap.timelock, "Swap expired");
        require(keccak256(abi.encodePacked(secret)) == swap.hashlock, "Invalid secret");
        require(msg.sender == swap.participant, "Only participant can claim");

        swap.claimed = true;

        // Transfer funds to participant
        if (swap.token == address(0)) {
            // ETH transfer
            payable(swap.participant).transfer(swap.amount);
        } else {
            // ERC20 transfer
            IERC20(swap.token).safeTransfer(swap.participant, swap.amount);
        }

        emit SwapClaimed(swapId, secret);
    }

    /**
     * @dev Refund a swap after timelock expires
     */
    function refund(bytes32 swapId) external nonReentrant {
        Swap storage swap = swaps[swapId];
        
        require(swap.initiator != address(0), "Swap does not exist");
        require(!swap.claimed, "Swap already claimed");
        require(!swap.refunded, "Swap already refunded");
        require(block.timestamp >= swap.timelock, "Timelock not yet expired");
        require(msg.sender == swap.initiator, "Only initiator can refund");

        swap.refunded = true;

        // Refund to initiator
        if (swap.token == address(0)) {
            // ETH refund
            payable(swap.initiator).transfer(swap.amount);
        } else {
            // ERC20 refund
            IERC20(swap.token).safeTransfer(swap.initiator, swap.amount);
        }

        emit SwapRefunded(swapId);
    }

    /**
     * @dev Get swap details
     */
    function getSwap(bytes32 swapId) external view returns (Swap memory) {
        return swaps[swapId];
    }

    /**
     * @dev Check if swap can be claimed with given secret
     */
    function isClaimable(bytes32 swapId, bytes32 secret) external view returns (bool) {
        Swap memory swap = swaps[swapId];
        
        return (
            swap.initiator != address(0) &&
            !swap.claimed &&
            !swap.refunded &&
            block.timestamp < swap.timelock &&
            keccak256(abi.encodePacked(secret)) == swap.hashlock
        );
    }

    /**
     * @dev Check if swap can be refunded
     */
    function isRefundable(bytes32 swapId) external view returns (bool) {
        Swap memory swap = swaps[swapId];
        
        return (
            swap.initiator != address(0) &&
            !swap.claimed &&
            !swap.refunded &&
            block.timestamp >= swap.timelock
        );
    }

    /**
     * @dev Set fee recipient (only current fee recipient)
     */
    function setFeeRecipient(address newFeeRecipient) external {
        require(msg.sender == feeRecipient, "Only fee recipient");
        require(newFeeRecipient != address(0), "Invalid address");
        feeRecipient = newFeeRecipient;
    }

    /**
     * @dev Set swap fee (only fee recipient)
     */
    function setSwapFee(uint256 newFee) external {
        require(msg.sender == feeRecipient, "Only fee recipient");
        require(newFee <= 0.01 ether, "Fee too high"); // Max 0.01 ETH
        swapFee = newFee;
    }
}