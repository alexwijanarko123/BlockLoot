const hre = require("hardhat");

async function main() {
  const provider = hre.ethers.provider;
  const network = await provider.getNetwork();
  const blockNum = await provider.getBlockNumber();

  const contractAddress =
    process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  console.log("\n=======================================================");
  console.log("            🔗 BLOCKLOOT ON-CHAIN INSPECTOR           ");
  console.log("=======================================================");
  console.log(`Network Chain ID    : ${network.chainId}`);
  console.log(`Blok Terakhir       : #${blockNum}`);
  console.log(`Alamat Smart Contract: ${contractAddress}`);

  const code = await provider.getCode(contractAddress);
  if (code === "0x") {
    console.log("❌ Kontrak belum di-deploy di alamat ini!");
    return;
  }

  const escrowBalance = await provider.getBalance(contractAddress);
  console.log(`Total Dana di Escrow: ${hre.ethers.formatEther(escrowBalance)} ETH\n`);

  const marketplace = await hre.ethers.getContractAt(
    "SimpleGameMarketplace",
    contractAddress
  );

  const listingCount = await marketplace.listingCount();
  const orderCount = await marketplace.orderCount();

  console.log(`Jumlah Listing On-Chain : ${listingCount}`);
  console.log(`Jumlah Order On-Chain   : ${orderCount}`);
  console.log("-------------------------------------------------------");

  // Status mapping
  const LISTING_STATUS = ["NONE", "ACTIVE", "CANCELLED"];
  const ORDER_STATUS = [
    "NONE",
    "PAID_HELD (Escrow Terkunci)",
    "SHIPPED (Dalam Pengiriman)",
    "COMPLETED (Selesai & Dicairkan)",
    "CANCELLED (Dibatalkan/Refund)",
  ];

  if (listingCount > 0n) {
    console.log("\n📦 DAFTAR LISTING ON-CHAIN:");
    for (let i = 1n; i <= listingCount; i++) {
      const l = await marketplace.listings(i);
      console.log(`\n  [Listing #${i}]`);
      console.log(`  - Seller     : ${l.seller}`);
      console.log(`  - Harga      : ${hre.ethers.formatEther(l.price)} ETH`);
      console.log(`  - Stok       : ${l.stock}`);
      console.log(`  - Status     : ${LISTING_STATUS[Number(l.status)]}`);
      console.log(`  - MetadataURI: ${l.metadataURI}`);
    }
  }

  if (orderCount > 0n) {
    console.log("\n🚚 DAFTAR PESANAN & ESCROW ON-CHAIN:");
    for (let i = 1n; i <= orderCount; i++) {
      const o = await marketplace.orders(i);
      console.log(`\n  [Order #${i}] (Listing #${o.listingId})`);
      console.log(`  - Buyer      : ${o.buyer}`);
      console.log(`  - Seller     : ${o.seller}`);
      console.log(`  - Jumlah     : ${o.quantity} unit`);
      console.log(`  - Dana Escrow: ${hre.ethers.formatEther(o.amount)} ETH`);
      console.log(`  - Status     : ${ORDER_STATUS[Number(o.status)]}`);
    }
  }

  console.log("\n=======================================================\n");
}

main().catch((err) => {
  console.error("Error inspecting chain:", err);
  process.exitCode = 1;
});
