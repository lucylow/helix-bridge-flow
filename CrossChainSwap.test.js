const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CrossChainSwap", function () {
    let crossChainSwap;
    let mockToken;
    let owner, initiator, participant, feeRecipient;
    let secret, hashlock;
    let timelock;

    const SWAP_FEE = ethers.parseEther("0.001");
    const SWAP_AMOUNT = ethers.parseEther("1.0");
    const TOKEN_AMOUNT = ethers.parseUnits("100", 18);

    beforeEach(async function () {
        [owner, initiator, participant, feeRecipient] = await ethers.getSigners();

        // Deploy mock ERC20 token
        const MockToken = await ethers.getContractFactory("MockERC20");
        mockToken = await MockToken.deploy("Test Token", "TEST", 18);
        await mockToken.waitForDeployment();

        // Deploy CrossChainSwap contract
        const CrossChainSwap = await ethers.getContractFactory("CrossChainSwap");
        crossChainSwap = await CrossChainSwap.deploy();
        await crossChainSwap.waitForDeployment();

        // Generate secret and hashlock
        secret = ethers.randomBytes(32);
        hashlock = ethers.keccak256(secret);

        // Mint tokens to initiator
        await mockToken.mint(initiator.address, TOKEN_AMOUNT);
        await mockToken.connect(initiator).approve(await crossChainSwap.getAddress(), TOKEN_AMOUNT);

        // Update fee recipient
        await crossChainSwap.updateFeeRecipient(feeRecipient.address);
    });

    // Helper function to get a valid timelock
    async function getValidTimelock() {
        const currentTime = await time.latest();
        return currentTime + 7200; // 2 hours from now (well above MIN_TIMELOCK)
    }

    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            expect(await crossChainSwap.owner()).to.equal(owner.address);
        });

        it("Should have the correct 1inch API key", async function () {
            expect(await crossChainSwap.ONEINCH_API_KEY()).to.equal("h6VoEtvRieMSQZiK0INL4g93Tv2UpaXr");
        });

        it("Should set initial swap fee", async function () {
            expect(await crossChainSwap.swapFee()).to.equal(SWAP_FEE);
        });
    });

    describe("ETH Swaps", function () {
        it("Should initiate ETH swap successfully", async function () {
            const cosmosRecipient = "cosmos1abc123def456";
            const timelock = await getValidTimelock();
            
            const tx = await crossChainSwap.connect(initiator).initiateCrossChainSwap(
                participant.address,
                ethers.ZeroAddress, // ETH
                SWAP_AMOUNT,
                hashlock,
                timelock,
                cosmosRecipient,
                { value: SWAP_AMOUNT + SWAP_FEE }
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return crossChainSwap.interface.parseLog(log).name === "SwapInitiated";
                } catch {
                    return false;
                }
            });
            
            const parsedEvent = crossChainSwap.interface.parseLog(event);
            const swapId = parsedEvent.args.swapId;

            const swap = await crossChainSwap.getSwap(swapId);
            expect(swap.initiator).to.equal(initiator.address);
            expect(swap.participant).to.equal(participant.address);
            expect(swap.tokenContract).to.equal(ethers.ZeroAddress);
            expect(swap.amount).to.equal(SWAP_AMOUNT);
            expect(swap.hashlock).to.equal(hashlock);
            expect(swap.timelock).to.equal(timelock);
            expect(swap.cosmosRecipient).to.equal(cosmosRecipient);
            expect(swap.isEthSwap).to.be.true;
        });

        it("Should claim ETH swap with correct secret", async function () {
            const timelock = await getValidTimelock();
            
            // Initiate swap
            const tx = await crossChainSwap.connect(initiator).initiateCrossChainSwap(
                participant.address,
                ethers.ZeroAddress,
                SWAP_AMOUNT,
                hashlock,
                timelock,
                "cosmos1abc123def456",
                { value: SWAP_AMOUNT + SWAP_FEE }
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return crossChainSwap.interface.parseLog(log).name === "SwapInitiated";
                } catch {
                    return false;
                }
            });
            const swapId = crossChainSwap.interface.parseLog(event).args.swapId;

            // Check initial balance
            const initialBalance = await ethers.provider.getBalance(participant.address);

            // Claim swap
            await expect(crossChainSwap.connect(participant).claimSwap(swapId, secret))
                .to.emit(crossChainSwap, "SwapClaimed")
                .withArgs(swapId, participant.address, secret);

            // Check final balance
            const finalBalance = await ethers.provider.getBalance(participant.address);
            expect(finalBalance - initialBalance).to.be.closeTo(SWAP_AMOUNT, ethers.parseEther("0.01"));

            // Check swap state
            const swap = await crossChainSwap.getSwap(swapId);
            expect(swap.state).to.equal(2); // Claimed

            // Check secret is stored
            expect(await crossChainSwap.getSecret(swapId)).to.equal(secret);
        });

        it("Should refund ETH swap after timelock expiration", async function () {
            const timelock = await getValidTimelock();
            
            // Initiate swap
            const tx = await crossChainSwap.connect(initiator).initiateCrossChainSwap(
                participant.address,
                ethers.ZeroAddress,
                SWAP_AMOUNT,
                hashlock,
                timelock,
                "cosmos1abc123def456",
                { value: SWAP_AMOUNT + SWAP_FEE }
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return crossChainSwap.interface.parseLog(log).name === "SwapInitiated";
                } catch {
                    return false;
                }
            });
            const swapId = crossChainSwap.interface.parseLog(event).args.swapId;

            // Fast forward past timelock
            await time.increaseTo(timelock + 1);

            // Check initial balance
            const initialBalance = await ethers.provider.getBalance(initiator.address);

            // Refund swap
            await expect(crossChainSwap.connect(initiator).refundSwap(swapId))
                .to.emit(crossChainSwap, "SwapRefunded")
                .withArgs(swapId, initiator.address);

            // Check final balance (accounting for gas costs)
            const finalBalance = await ethers.provider.getBalance(initiator.address);
            expect(finalBalance - initialBalance).to.be.closeTo(SWAP_AMOUNT, ethers.parseEther("0.01"));

            // Check swap state
            const swap = await crossChainSwap.getSwap(swapId);
            expect(swap.state).to.equal(3); // Refunded
        });
    });

    describe("ERC20 Token Swaps", function () {
        it("Should initiate ERC20 swap successfully", async function () {
            const cosmosRecipient = "cosmos1abc123def456";
            
            const tx = await crossChainSwap.connect(initiator).initiateCrossChainSwap(
                participant.address,
                await mockToken.getAddress(),
                TOKEN_AMOUNT,
                hashlock,
                timelock,
                cosmosRecipient,
                { value: SWAP_FEE }
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return crossChainSwap.interface.parseLog(log).name === "SwapInitiated";
                } catch {
                    return false;
                }
            });
            const swapId = crossChainSwap.interface.parseLog(event).args.swapId;

            const swap = await crossChainSwap.getSwap(swapId);
            expect(swap.tokenContract).to.equal(await mockToken.getAddress());
            expect(swap.amount).to.equal(TOKEN_AMOUNT);
            expect(swap.isEthSwap).to.be.false;

            // Check token transfer
            expect(await mockToken.balanceOf(await crossChainSwap.getAddress())).to.equal(TOKEN_AMOUNT);
        });

        it("Should claim ERC20 swap with correct secret", async function () {
            // Initiate swap
            const tx = await crossChainSwap.connect(initiator).initiateCrossChainSwap(
                participant.address,
                await mockToken.getAddress(),
                TOKEN_AMOUNT,
                hashlock,
                timelock,
                "cosmos1abc123def456",
                { value: SWAP_FEE }
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return crossChainSwap.interface.parseLog(log).name === "SwapInitiated";
                } catch {
                    return false;
                }
            });
            const swapId = crossChainSwap.interface.parseLog(event).args.swapId;

            // Claim swap
            await crossChainSwap.connect(participant).claimSwap(swapId, secret);

            // Check token transfer
            expect(await mockToken.balanceOf(participant.address)).to.equal(TOKEN_AMOUNT);
            expect(await mockToken.balanceOf(await crossChainSwap.getAddress())).to.equal(0);
        });
    });

    describe("Validation and Security", function () {
        it("Should reject swap with invalid parameters", async function () {
            // Invalid participant
            await expect(
                crossChainSwap.connect(initiator).initiateCrossChainSwap(
                    ethers.ZeroAddress,
                    ethers.ZeroAddress,
                    SWAP_AMOUNT,
                    hashlock,
                    timelock,
                    "cosmos1abc123def456",
                    { value: SWAP_AMOUNT + SWAP_FEE }
                )
            ).to.be.revertedWith("Invalid participant");

            // Self swap
            await expect(
                crossChainSwap.connect(initiator).initiateCrossChainSwap(
                    initiator.address,
                    ethers.ZeroAddress,
                    SWAP_AMOUNT,
                    hashlock,
                    timelock,
                    "cosmos1abc123def456",
                    { value: SWAP_AMOUNT + SWAP_FEE }
                )
            ).to.be.revertedWith("Cannot swap with yourself");

            // Zero amount
            await expect(
                crossChainSwap.connect(initiator).initiateCrossChainSwap(
                    participant.address,
                    ethers.ZeroAddress,
                    0,
                    hashlock,
                    timelock,
                    "cosmos1abc123def456",
                    { value: SWAP_FEE }
                )
            ).to.be.revertedWith("Amount must be greater than 0");
        });

        it("Should reject claim with wrong secret", async function () {
            // Initiate swap
            const tx = await crossChainSwap.connect(initiator).initiateCrossChainSwap(
                participant.address,
                ethers.ZeroAddress,
                SWAP_AMOUNT,
                hashlock,
                timelock,
                "cosmos1abc123def456",
                { value: SWAP_AMOUNT + SWAP_FEE }
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return crossChainSwap.interface.parseLog(log).name === "SwapInitiated";
                } catch {
                    return false;
                }
            });
            const swapId = crossChainSwap.interface.parseLog(event).args.swapId;

            // Try to claim with wrong secret
            const wrongSecret = ethers.randomBytes(32);
            await expect(
                crossChainSwap.connect(participant).claimSwap(swapId, wrongSecret)
            ).to.be.revertedWith("Invalid secret");
        });
    });

    describe("View Functions", function () {
        it("Should check if swap is claimable", async function () {
            // Initiate swap
            const tx = await crossChainSwap.connect(initiator).initiateCrossChainSwap(
                participant.address,
                ethers.ZeroAddress,
                SWAP_AMOUNT,
                hashlock,
                timelock,
                "cosmos1abc123def456",
                { value: SWAP_AMOUNT + SWAP_FEE }
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return crossChainSwap.interface.parseLog(log).name === "SwapInitiated";
                } catch {
                    return false;
                }
            });
            const swapId = crossChainSwap.interface.parseLog(event).args.swapId;

            // Check claimable with correct secret
            expect(await crossChainSwap.isClaimable(swapId, secret)).to.be.true;

            // Check claimable with wrong secret
            const wrongSecret = ethers.randomBytes(32);
            expect(await crossChainSwap.isClaimable(swapId, wrongSecret)).to.be.false;
        });

        it("Should check if swap is refundable", async function () {
            // Initiate swap
            const tx = await crossChainSwap.connect(initiator).initiateCrossChainSwap(
                participant.address,
                ethers.ZeroAddress,
                SWAP_AMOUNT,
                hashlock,
                timelock,
                "cosmos1abc123def456",
                { value: SWAP_AMOUNT + SWAP_FEE }
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return crossChainSwap.interface.parseLog(log).name === "SwapInitiated";
                } catch {
                    return false;
                }
            });
            const swapId = crossChainSwap.interface.parseLog(event).args.swapId;

            // Should not be refundable before expiration
            expect(await crossChainSwap.isRefundable(swapId)).to.be.false;

            // Fast forward past timelock
            await time.increaseTo(timelock + 1);

            // Should be refundable after expiration
            expect(await crossChainSwap.isRefundable(swapId)).to.be.true;
        });
    });

    describe("Fee Management", function () {
        it("Should collect fees correctly", async function () {
            const initialBalance = await ethers.provider.getBalance(feeRecipient.address);

            // Initiate swap
            await crossChainSwap.connect(initiator).initiateCrossChainSwap(
                participant.address,
                ethers.ZeroAddress,
                SWAP_AMOUNT,
                hashlock,
                timelock,
                "cosmos1abc123def456",
                { value: SWAP_AMOUNT + SWAP_FEE }
            );

            const finalBalance = await ethers.provider.getBalance(feeRecipient.address);
            expect(finalBalance - initialBalance).to.equal(SWAP_FEE);
        });

        it("Should update swap fee", async function () {
            const newFee = ethers.parseEther("0.002");
            await crossChainSwap.updateSwapFee(newFee);
            expect(await crossChainSwap.swapFee()).to.equal(newFee);
        });
    });
});

