const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Marketplace = await hre.ethers.getContractFactory("SimpleGameMarketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();

  const address = await marketplace.getAddress();
  console.log("SimpleGameMarketplace deployed to:", address);

  // Grant SELLER_ROLE to a test address (second Hardhat account)
  const signers = await hre.ethers.getSigners();
  const testSeller = signers[1];
  const SELLER_ROLE = await marketplace.SELLER_ROLE();
  const tx = await marketplace.grantRole(SELLER_ROLE, testSeller.address);
  await tx.wait();
  console.log("SELLER_ROLE granted to:", testSeller.address);

  console.log("\n--- Deployment Summary ---");
  console.log("Contract:", address);
  console.log("Admin:   ", deployer.address);
  console.log("Seller:  ", testSeller.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
