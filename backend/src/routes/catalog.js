import { Router } from "express";
import { isConfigured, readCounts, readListing } from "../chain.js";
import { httpError } from "../errors.js";
import { mergeCatalogItem, metadataFor } from "../items.js";
import { asyncHandler } from "../middleware.js";
import { readStore } from "../store.js";

const router = Router();

export async function buildCatalog() {
  const store = await readStore();
  if (!isConfigured()) {
    return store.drafts
      .filter((draft) => draft.listingId || draft.status === "LISTED" || draft.status === "DELISTED")
      .map((draft) => mergeCatalogItem(null, draft));
  }

  const { listingCount } = await readCounts();
  const items = [];
  for (let id = 1; id <= listingCount; id += 1) {
    const listing = await readListing(id);
    const draft = store.drafts.find((item) =>
      item.listingId === listing.listingId || item.metadataURI === listing.metadataURI
    );
    items.push(mergeCatalogItem(listing, draft));
  }
  return items;
}

function filterCatalog(items, query) {
  const status = String(query.status || "ACTIVE").toUpperCase();
  const q = String(query.q || "").trim().toLowerCase();
  return items.filter((item) => {
    const statusOk = status === "ALL" || item.status === status;
    const text = `${item.title} ${item.story}`.toLowerCase();
    return statusOk && (!q || text.includes(q));
  });
}

export function toProductCard(item) {
  return {
    id: String(item.listingId || item.id),
    title: item.title,
    price: item.price,
    image: item.image,
    stock: item.stock,
    seller: item.seller,
    currency: "ETH"
  };
}

router.get("/", asyncHandler(async (req, res) => {
  const items = filterCatalog(await buildCatalog(), req.query);
  res.json(items);
}));

router.get("/:listingId", asyncHandler(async (req, res) => {
  const items = await buildCatalog();
  const item = items.find((entry) => entry.listingId === String(req.params.listingId));
  if (!item) throw httpError(404, "Item katalog tidak ditemukan");
  res.json(item);
}));

export const productRouter = Router();

productRouter.get("/", asyncHandler(async (req, res) => {
  const items = filterCatalog(await buildCatalog(), { ...req.query, status: req.query.status || "ACTIVE" });
  res.json(items.map(toProductCard));
}));

export const itemRouter = Router();

itemRouter.get("/:id", asyncHandler(async (req, res) => {
  const store = await readStore();
  const draft = store.drafts.find((item) => item.id === req.params.id);
  if (!draft) throw httpError(404, "Data item tidak ditemukan");
  res.json(metadataFor(draft));
}));

export default router;
