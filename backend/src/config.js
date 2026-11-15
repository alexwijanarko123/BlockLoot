import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, ".env") });

function addressList(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => ethers.isAddress(item))
    .map((item) => ethers.getAddress(item));
}

export const config = {
  port: Number(process.env.PORT || 4000),
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || "http://localhost:4000").replace(/\/$/, ""),
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  rpcUrl: process.env.RPC_URL || "",
  contractAddress: process.env.CONTRACT_ADDRESS || "",
  chainId: process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : 0,
  indexerMs: Number(process.env.INDEXER_INTERVAL_MS || 15000),
  devAdmins: addressList(process.env.DEV_ADMIN_ADDRESSES),
  devSellers: addressList(process.env.DEV_SELLER_ADDRESSES),
  root,
  dataDir: path.join(root, "data"),
  storeFile: path.join(root, "data", "store.json"),
  uploadsDir: path.join(root, "uploads")
};
