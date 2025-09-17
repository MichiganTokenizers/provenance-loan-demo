const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying LoanAgreement contract...");

  // Get the contract factory
  const LoanAgreement = await ethers.getContractFactory("LoanAgreement");

  // Deploy the contract
  const loanAgreement = await LoanAgreement.deploy();

  // Wait for deployment to complete
  await loanAgreement.deployed();

  console.log("LoanAgreement deployed to:", loanAgreement.address);
  console.log("Transaction hash:", loanAgreement.deployTransaction.hash);

  // Verify contract on block explorer (if on testnet/mainnet)
  if (network.name !== "hardhat") {
    console.log("Waiting for block confirmations...");
    await loanAgreement.deployTransaction.wait(6);
    
    console.log("Verifying contract...");
    try {
      await hre.run("verify:verify", {
        address: loanAgreement.address,
        constructorArguments: [],
      });
      console.log("Contract verified successfully!");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    contractAddress: loanAgreement.address,
    transactionHash: loanAgreement.deployTransaction.hash,
    blockNumber: loanAgreement.deployTransaction.blockNumber,
    deployer: loanAgreement.deployTransaction.from,
    timestamp: new Date().toISOString()
  };

  console.log("Deployment completed successfully!");
  console.log("Deployment info:", JSON.stringify(deploymentInfo, null, 2));

  return loanAgreement;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
