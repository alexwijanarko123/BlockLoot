import crypto from "crypto";
import { Router } from "express";
import { ethers } from "ethers";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { getUserRole, isConfigured } from "../chain.js";
import { httpError } from "../errors.js";
import { asyncHandler, requireAuth } from "../middleware.js";
import { parseAddress } from "../parse.js";
import { updateStore } from "../store.js";

const router = Router();
const NONCE_TTL_MS = 10 * 60 * 1000;

function loginMessage(address, nonce, issuedAt) {
  return [
    "BlockLoot login",
    `Alamat: ${address}`,
    `Nonce: ${nonce}`,
    `Waktu: ${issuedAt}`,
    "Tanda tangan ini hanya untuk masuk dan membaca role. Bukan transaksi."
  ].join("\n");
}

async function resolveRole(address) {
  if (isConfigured()) {
    return { role: await getUserRole(address), roleSource: "chain" };
  }

  const normalized = address.toLowerCase();
  if (config.devAdmins.some((item) => item.toLowerCase() === normalized)) {
    return { role: "ADMIN", roleSource: "env" };
  }
  if (config.devSellers.some((item) => item.toLowerCase() === normalized)) {
    return { role: "SELLER", roleSource: "env" };
  }
  return { role: "BUYER", roleSource: "default" };
}

router.post("/challenge", asyncHandler(async (req, res) => {
  const address = parseAddress(req.body?.address);
  const nonce = crypto.randomBytes(16).toString("hex");
  const issuedAt = new Date().toISOString();
  const message = loginMessage(address, nonce, issuedAt);
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS).toISOString();

  await updateStore((data) => {
    data.nonces[address.toLowerCase()] = { message, expiresAt };
  });

  res.json({ address, message, expiresAt });
}));

router.post("/verify", asyncHandler(async (req, res) => {
  const address = parseAddress(req.body?.address);
  const signature = req.body?.signature;
  if (!signature || typeof signature !== "string") {
    throw httpError(400, "signature wajib diisi");
  }

  const saved = await updateStore((data) => {
    const key = address.toLowerCase();
    const current = data.nonces[key] || null;
    delete data.nonces[key];
    return current;
  });

  if (!saved) throw httpError(400, "Minta challenge baru sebelum menandatangani");
  if (Date.now() > Date.parse(saved.expiresAt)) {
    throw httpError(400, "Challenge kedaluwarsa, minta challenge baru");
  }

  let recovered;
  try {
    recovered = ethers.verifyMessage(saved.message, signature);
  } catch {
    throw httpError(401, "Tanda tangan tidak valid");
  }
  if (recovered.toLowerCase() !== address.toLowerCase()) {
    throw httpError(401, "Tanda tangan bukan dari alamat wallet ini");
  }

  const { role, roleSource } = await resolveRole(address);
  const token = jwt.sign({ sub: address, role }, config.jwtSecret, { expiresIn: "12h" });

  res.json({
    token,
    address,
    role,
    roleSource,
    expiresIn: "12h"
  });
}));

router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const { role, roleSource } = await resolveRole(req.user.address);
  res.json({ address: req.user.address, role, roleSource });
}));

router.get("/role/:address", asyncHandler(async (req, res) => {
  const address = parseAddress(req.params.address);
  const { role, roleSource } = await resolveRole(address);
  res.json({ address, role, roleSource });
}));

export default router;
