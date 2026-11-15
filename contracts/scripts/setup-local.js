const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  const seller = signers[1];

  // Get the most recently deployed contract
  // Requires the contract address to be passed via env or we re-deploy
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("ERROR: Set CONTRACT_ADDRESS env variable to the deployed contract address.");
    console.error("Example: CONTRACT_ADDRESS=0x5FbDB... npx hardhat run scripts/setup-local.js --network localhost");
    process.exitCode = 1;
    return;
  }

  const marketplace = await hre.ethers.getContractAt("SimpleGameMarketplace", contractAddress);
  console.log("Connected to SimpleGameMarketplace at:", contractAddress);

  // Grant SELLER_ROLE to the second Hardhat account
  const SELLER_ROLE = await marketplace.SELLER_ROLE();
  const hasRole = await marketplace.hasRole(SELLER_ROLE, seller.address);

  if (hasRole) {
    console.log("Account", seller.address, "already has SELLER_ROLE");
  } else {
    const tx = await marketplace.connect(deployer).grantRole(SELLER_ROLE, seller.address);
    await tx.wait();
    console.log("SELLER_ROLE granted to:", seller.address);
  }

  // Verify roles
  console.log("\n--- Role Check ---");
  for (let i = 0; i < 3; i++) {
    const role = await marketplace.getUserRole(signers[i].address);
    const roleNames = ["BUYER", "SELLER", "ADMIN"];
    console.log(`Account ${i} (${signers[i].address}): ${roleNames[role]}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
