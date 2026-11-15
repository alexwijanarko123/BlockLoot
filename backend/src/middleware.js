import crypto from "crypto";
import fs from "fs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import { config } from "./config.js";
import { httpError } from "./errors.js";
import { getUserRole, isConfigured } from "./chain.js";

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    fs.mkdirSync(config.uploadsDir, { recursive: true });
    callback(null, config.uploadsDir);
  },
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    callback(null, name);
  }
});

function imageFilter(_req, file, callback) {
  if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
    callback(null, true);
    return;
  }
  callback(httpError(400, "Gambar harus JPG, PNG, WEBP, atau GIF"));
}

export const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 8 * 1024 * 1024 }
});

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ message: "Login wallet diperlukan" });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { address: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ message: "Sesi login tidak valid atau sudah kedaluwarsa" });
  }
}

export function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      if (!req.user) throw httpError(401, "Login wallet diperlukan");
      if (isConfigured()) req.user.role = await getUserRole(req.user.address);
      if (!roles.includes(req.user.role)) {
        res.status(403).json({ message: `Role ${req.user.role} tidak punya akses ini` });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function errorHandler(error, _req, res, _next) {
  if (error.code === "LIMIT_FILE_SIZE") {
    res.status(400).json({ message: "Ukuran gambar maksimal 8 MB" });
    return;
  }
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ message: error.message || "Terjadi kesalahan server" });
}
