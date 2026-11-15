import { ethers } from "ethers";
import { config } from "./config.js";
import { httpError } from "./errors.js";
import {
  LISTING_STATUS,
  MARKETPLACE_ABI,
  ORDER_STATUS,
  ROLE_NAMES,
  escrowState
} from "./abi.js";

let provider;
let iface;
let cachedChainId;

export function isConfigured() {
  return Boolean(config.rpcUrl && config.contractAddress && ethers.isAddress(config.contractAddress));
}

export function assertConfigured() {
  if (!isConfigured()) {
    throw httpError(503, "RPC_URL atau CONTRACT_ADDRESS belum disetel di backend/.env");
  }
}

export function getProvider() {
  assertConfigured();
  if (!provider) provider = new ethers.JsonRpcProvider(config.rpcUrl);
  return provider;
}

export function getInterface() {
  if (!iface) iface = new ethers.Interface(MARKETPLACE_ABI);
  return iface;
}

export function getReadContract() {
  return new ethers.Contract(ethers.getAddress(config.contractAddress), MARKETPLACE_ABI, getProvider());
}

export function sameAddress(left, right) {
  if (!left || !right || !ethers.isAddress(left) || !ethers.isAddress(right)) return false;
  return ethers.getAddress(left) === ethers.getAddress(right);
}

export async function getChainId() {
  if (config.chainId) return config.chainId;
  if (!cachedChainId) {
    const network = await getProvider().getNetwork();
    cachedChainId = Number(network.chainId);
  }
  return cachedChainId;
}

function revertMessage(error) {
  const message = error.shortMessage || error.reason || error.message || "Panggilan kontrak gagal";
  const quoted = message.match(/"([^"]+)"/);
  return quoted?.[1] || message;
}

export async function getUserRole(address) {
  try {
    const role = await getReadContract().getUserRole(address);
    return ROLE_NAMES[Number(role)] || "BUYER";
  } catch (error) {
    throw httpError(502, revertMessage(error));
  }
}

export function formatListing(id, raw) {
  return {
    listingId: id.toString(),
    seller: raw.seller,
    priceWei: raw.price.toString(),
    priceEth: ethers.formatEther(raw.price),
    currency: "ETH",
    paymentStandard: "NATIVE_ETH",
    stock: raw.stock.toString(),
    status: LISTING_STATUS[Number(raw.status)] || "NONE",
    metadataURI: raw.metadataURI
  };
}

export function formatOrder(id, raw) {
  const status = ORDER_STATUS[Number(raw.status)] || "NONE";
  return {
    orderId: id.toString(),
    listingId: raw.listingId.toString(),
    buyer: raw.buyer,
    seller: raw.seller,
    quantity: raw.quantity.toString(),
    amountWei: raw.amount.toString(),
    amountEth: ethers.formatEther(raw.amount),
    currency: "ETH",
    paymentStandard: "NATIVE_ETH",
    status,
    escrow: escrowState(status)
  };
}

export async function readListing(listingId) {
  try {
    const raw = await getReadContract().listings(listingId);
    if (raw.seller === ethers.ZeroAddress) {
      throw httpError(404, "Listing tidak ditemukan");
    }
    return formatListing(listingId, raw);
  } catch (error) {
    if (error.status) throw error;
    throw httpError(502, revertMessage(error));
  }
}

export async function readOrder(orderId) {
  try {
    const raw = await getReadContract().orders(orderId);
    if (raw.buyer === ethers.ZeroAddress) {
      throw httpError(404, "Order tidak ditemukan");
    }
    return formatOrder(orderId, raw);
  } catch (error) {
    if (error.status) throw error;
    throw httpError(502, revertMessage(error));
  }
}

export async function readCounts() {
  const contract = getReadContract();
  const [listingCount, orderCount] = await Promise.all([
    contract.listingCount(),
    contract.orderCount()
  ]);
  return { listingCount: Number(listingCount), orderCount: Number(orderCount) };
}

export async function buildTx({ from, method, args, value = 0n }) {
  const data = getInterface().encodeFunctionData(method, args);
  const tx = {
    from,
    to: ethers.getAddress(config.contractAddress),
    data,
    value: value.toString(),
    chainId: await getChainId()
  };

  try {
    await getProvider().call({ from, to: tx.to, data, value });
  } catch (error) {
    throw httpError(400, revertMessage(error));
  }

  return tx;
}

export function parseReceiptLogs(receipt) {
  const parsed = [];
  const contractAddress = ethers.getAddress(config.contractAddress).toLowerCase();
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contractAddress) continue;
    try {
      const event = getInterface().parseLog(log);
      if (event) parsed.push(event);
    } catch {
      // Log kontrak lain atau event yang tidak dikenal diabaikan.
    }
  }
  return parsed;
}

export async function loadReceipt(txHash) {
  const tx = await getProvider().getTransaction(txHash);
  if (!tx) throw httpError(404, "Transaksi tidak ditemukan di RPC");
  const receipt = await getProvider().getTransactionReceipt(txHash);
  if (!receipt) throw httpError(409, "Transaksi belum masuk blok");
  if (receipt.status !== 1) throw httpError(400, "Transaksi gagal di blockchain");
  return { tx, receipt, events: parseReceiptLogs(receipt) };
}
