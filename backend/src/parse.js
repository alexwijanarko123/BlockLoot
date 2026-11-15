import { ethers } from "ethers";
import { httpError } from "./errors.js";

export function parseEth(value, name) {
  try {
    const amount = ethers.parseEther(String(value).trim());
    if (amount <= 0n) throw new Error("low");
    return amount;
  } catch (error) {
    if (error.status) throw error;
    throw httpError(400, `${name} harus nominal ETH lebih dari 0, contoh 0.05`);
  }
}

export function parsePositiveInt(value, name) {
  try {
    const raw = String(value).trim();
    if (!/^\d+$/.test(raw)) throw new Error("nan");
    const amount = BigInt(raw);
    if (amount <= 0n) throw new Error("low");
    return amount;
  } catch (error) {
    if (error.status) throw error;
    throw httpError(400, `${name} harus bilangan bulat lebih dari 0`);
  }
}

export function parseIdList(values) {
  if (values == null) return [];
  if (!Array.isArray(values)) throw httpError(400, "orderIds harus berupa array");
  return values.map((value, index) => parsePositiveInt(value, `orderIds[${index}]`));
}

export function parseAddress(value, name = "address") {
  if (!ethers.isAddress(value || "")) {
    throw httpError(400, `${name} bukan alamat wallet yang valid`);
  }
  return ethers.getAddress(value);
}

export function parseStats(value) {
  if (value == null || value === "") return {};
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw httpError(400, 'stats harus objek JSON, contoh {"rarity":"legendary","attack":120}');
    }
    for (const key of Object.keys(parsed)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        throw httpError(400, "stats berisi key yang tidak diizinkan");
      }
    }
    return parsed;
  } catch (error) {
    if (error.status) throw error;
    throw httpError(400, 'stats harus objek JSON, contoh {"rarity":"legendary","attack":120}');
  }
}

export function parseAssetStandard(value) {
  const standard = (value || "ERC-1155").toUpperCase();
  if (standard !== "ERC-721" && standard !== "ERC-1155") {
    throw httpError(400, "assetStandard harus ERC-721 atau ERC-1155");
  }
  return standard;
}

export function parseTxHash(value) {
  if (!/^0x[a-fA-F0-9]{64}$/.test(value || "")) {
    throw httpError(400, "txHash tidak valid");
  }
  return value;
}
