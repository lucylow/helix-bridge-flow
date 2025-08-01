const { ethers } = require("hardhat");

async function main() {
    console.log("Starting deployment...");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Deploy CrossChainSwap contract
    console.log("\nDeploying CrossChainSwap contract...");
    const CrossChainSwap = await ethers.getContractFactory("CrossChainSwap");
    const crossChainSwap = await CrossChainSwap.deploy();
    await crossChainSwap.deployed();
    console.log("CrossChainSwap deployed to:", crossChainSwap.address);

    // Deploy MockERC20 for testing
    console.log("\nDeploying MockERC20 contract...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Test USDC", "TUSDC", 6);
    await mockToken.deployed();
    console.log("MockERC20 deployed to:", mockToken.address);

    // Mint some test tokens to deployer
    console.log("\nMinting test tokens...");
    const mintAmount = ethers.utils.parseUnits("1000000", 6); // 1M TUSDC
    await mockToken.mint(deployer.address, mintAmount);
    console.log("Minted", ethers.utils.formatUnits(mintAmount, 6), "TUSDC to deployer");

    // Verify deployment
    console.log("\nVerifying deployment...");
    const swapFee = await crossChainSwap.swapFee();
    const apiKey = await crossChainSwap.ONEINCH_API_KEY();
    const tokenName = await mockToken.name();
    const tokenSymbol = await mockToken.symbol();
    const tokenDecimals = await mockToken.decimals();

    console.log("CrossChainSwap swap fee:", ethers.utils.formatEther(swapFee), "ETH");
    console.log("1inch API key:", apiKey);
    console.log("Mock token:", tokenName, "(" + tokenSymbol + ") with", tokenDecimals, "decimals");

    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        crossChainSwap: {
            address: crossChainSwap.address,
            deployer: deployer.address,
            swapFee: swapFee.toString(),
            apiKey: apiKey
        },
        mockToken: {
            address: mockToken.address,
            name: tokenName,
            symbol: tokenSymbol,
            decimals: tokenDecimals
        },
        deploymentTime: new Date().toISOString()
    };

    console.log("\nDeployment completed successfully!");
    console.log("Deployment info:", JSON.stringify(deploymentInfo, null, 2));

    // Example usage
    console.log("\n=== Example Usage ===");
    console.log("To initiate a cross-chain swap:");
    console.log(`crossChainSwap.initiateCrossChainSwap(`);
    console.log(`  participantAddress,`);
    console.log(`  "${mockToken.address}", // or ethers.constants.AddressZero for ETH`);
    console.log(`  amount,`);
    console.log(`  hashlock,`);
    console.log(`  timelock,`);
    console.log(`  "cosmos1recipient..."`);
    console.log(`);`);

    return deploymentInfo;
}

// Handle errors
main()
    .then((deploymentInfo) => {
        console.log("\nDeployment script completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });

