import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { Router } from "express";
import { ethers } from "ethers";
import { config } from "../config.js";
import { sameAddress } from "../chain.js";
import { httpError } from "../errors.js";
import { presentDraft } from "../items.js";
import { asyncHandler, requireAuth, requireRole, uploadImage } from "../middleware.js";
import { parseAddress, parseAssetStandard, parseEth, parsePositiveInt, parseStats } from "../parse.js";
import { readStore, updateStore } from "../store.js";

const router = Router();

function withImage(required) {
  return (req, res, next) => {
    uploadImage.single("image")(req, res, (error) => {
      if (error) {
        next(error.status ? error : Object.assign(error, { status: 400 }));
        return;
      }
      if (required && !req.file) {
        next(httpError(400, "Gambar item wajib diunggah pada field image"));
        return;
      }
      next();
    });
  };
}

async function removeUploaded(file) {
  if (!file) return;
  await fs.unlink(file.path).catch(() => undefined);
}

function readDraftFields(body, { partial }) {
  const fields = {};

  if (!partial || body.title != null) {
    const title = String(body.title || "").trim();
    if (!title) throw httpError(400, "title wajib diisi");
    if (title.length > 120) throw httpError(400, "title maksimal 120 karakter");
    fields.title = title;
  }

  if (!partial || body.story != null) {
    const story = String(body.story || "").trim();
    if (!story) throw httpError(400, "story wajib diisi");
    if (story.length > 5000) throw httpError(400, "story maksimal 5000 karakter");
    fields.story = story;
  }

  if (!partial || body.stats != null) fields.stats = parseStats(body.stats);

  if (!partial || body.priceEth != null) {
    const price = parseEth(body.priceEth, "priceEth");
    fields.priceWei = price.toString();
    fields.priceEth = ethers.formatEther(price);
  }

  if (!partial || body.stock != null) {
    fields.stock = parsePositiveInt(body.stock, "stock").toString();
  }

  if (!partial || body.assetStandard != null) {
    fields.assetStandard = parseAssetStandard(body.assetStandard);
  }

  if (body.assetContract) {
    fields.assetContract = parseAddress(body.assetContract, "assetContract");
  } else if (!partial) {
    fields.assetContract = null;
  }

  if (body.tokenId != null) {
    const tokenId = String(body.tokenId).trim();
    fields.tokenId = tokenId || null;
  } else if (!partial) {
    fields.tokenId = null;
  }

  return fields;
}

function assertAssetStock(draft) {
  if (draft.assetStandard === "ERC-721" && draft.stock !== "1") {
    throw httpError(400, "Item ERC-721 hanya bisa dicatat dengan stok 1");
  }
}

router.get("/", requireAuth, requireRole("SELLER", "ADMIN"), asyncHandler(async (req, res) => {
  const data = await readStore();
  const rows = req.user.role === "ADMIN"
    ? data.drafts
    : data.drafts.filter((draft) => sameAddress(draft.seller, req.user.address));
  res.json(rows.map(presentDraft));
}));

router.get("/:id", requireAuth, requireRole("SELLER", "ADMIN"), asyncHandler(async (req, res) => {
  const data = await readStore();
  const draft = data.drafts.find((item) => item.id === req.params.id);
  if (!draft) throw httpError(404, "Draft tidak ditemukan");
  if (req.user.role !== "ADMIN" && !sameAddress(draft.seller, req.user.address)) {
    throw httpError(404, "Draft tidak ditemukan");
  }
  res.json(presentDraft(draft));
}));

router.post("/", requireAuth, requireRole("SELLER"), withImage(true), asyncHandler(async (req, res) => {
  try {
    const fields = readDraftFields(req.body, { partial: false });
    assertAssetStock(fields);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const draft = {
      id,
      seller: req.user.address,
      ...fields,
      imagePath: `/uploads/${req.file.filename}`,
      status: "DRAFT",
      listingId: null,
      metadataURI: `${config.publicBaseUrl}/api/items/${id}`,
      createdAt: now,
      updatedAt: now
    };

    await updateStore((data) => {
      data.drafts.push(draft);
    });
    res.status(201).json(presentDraft(draft));
  } catch (error) {
    await removeUploaded(req.file);
    throw error;
  }
}));

router.patch("/:id", requireAuth, requireRole("SELLER"), withImage(false), asyncHandler(async (req, res) => {
  try {
    const fields = readDraftFields(req.body, { partial: true });
    const updated = await updateStore((data) => {
      const draft = data.drafts.find((item) => item.id === req.params.id);
      if (!draft || !sameAddress(draft.seller, req.user.address)) {
        throw httpError(404, "Draft tidak ditemukan");
      }
      if (draft.status !== "DRAFT") {
        throw httpError(409, "Draft yang sudah listing hanya bisa diubah lewat delist on-chain");
      }

      const previousImage = req.file ? draft.imagePath : null;
      Object.assign(draft, fields);
      if (req.file) draft.imagePath = `/uploads/${req.file.filename}`;
      assertAssetStock(draft);
      draft.updatedAt = new Date().toISOString();
      return { draft: { ...draft }, previousImage };
    });

    if (updated.previousImage) {
      const relative = updated.previousImage.replace(/^\//, "");
      await fs.unlink(path.join(config.root, relative)).catch(() => undefined);
    }
    res.json(presentDraft(updated.draft));
  } catch (error) {
    await removeUploaded(req.file);
    throw error;
  }
}));

router.delete("/:id", requireAuth, requireRole("SELLER"), asyncHandler(async (req, res) => {
  const removed = await updateStore((data) => {
    const index = data.drafts.findIndex((item) => item.id === req.params.id);
    if (index === -1 || !sameAddress(data.drafts[index].seller, req.user.address)) {
      throw httpError(404, "Draft tidak ditemukan");
    }
    if (data.drafts[index].status !== "DRAFT") {
      throw httpError(409, "Listing yang sudah on-chain tidak dihapus. Gunakan delist.");
    }
    const [draft] = data.drafts.splice(index, 1);
    return draft;
  });

  if (removed.imagePath) {
    await fs.unlink(path.join(config.root, removed.imagePath.replace(/^\//, ""))).catch(() => undefined);
  }
  res.json({ deleted: true, id: removed.id });
}));

export default router;
