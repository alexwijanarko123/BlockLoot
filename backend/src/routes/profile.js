import { Router } from "express";
import { getUserRole, isConfigured, sameAddress } from "../chain.js";
import { httpError } from "../errors.js";
import { asyncHandler, requireAuth } from "../middleware.js";
import { parseAddress } from "../parse.js";
import { readStore, updateStore } from "../store.js";

const router = Router();

function cleanText(value, max, name) {
  const text = String(value ?? "").trim();
  if (text.length > max) throw httpError(400, `${name} maksimal ${max} karakter`);
  return text;
}

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const data = await readStore();
  const profile = data.profiles.find((item) => sameAddress(item.address, req.user.address));
  res.json({
    address: req.user.address,
    role: req.user.role,
    displayName: profile?.displayName || "",
    bio: profile?.bio || "",
    gameAccount: profile?.gameAccount || "",
    updatedAt: profile?.updatedAt || null
  });
}));

router.put("/", requireAuth, asyncHandler(async (req, res) => {
  const profile = await updateStore((data) => {
    let current = data.profiles.find((item) => sameAddress(item.address, req.user.address));
    if (!current) {
      current = {
        address: req.user.address,
        displayName: "",
        bio: "",
        gameAccount: "",
        updatedAt: null
      };
      data.profiles.push(current);
    }

    if (req.body?.displayName != null) current.displayName = cleanText(req.body.displayName, 60, "displayName");
    if (req.body?.bio != null) current.bio = cleanText(req.body.bio, 500, "bio");
    if (req.body?.gameAccount != null) current.gameAccount = cleanText(req.body.gameAccount, 80, "gameAccount");
    current.updatedAt = new Date().toISOString();
    return { ...current, role: req.user.role };
  });

  res.json(profile);
}));

export const sellerProfileRouter = Router();

sellerProfileRouter.get("/:address", asyncHandler(async (req, res) => {
  const address = parseAddress(req.params.address);
  const data = await readStore();
  const profile = data.profiles.find((item) => sameAddress(item.address, address));
  const role = isConfigured() ? await getUserRole(address) : null;

  res.json({
    address,
    role,
    displayName: profile?.displayName || "",
    bio: profile?.bio || "",
    updatedAt: profile?.updatedAt || null
  });
}));

export default router;
