import { Router } from "express";
import { isConfigured, readCounts, readOrder, sameAddress } from "../chain.js";
import { httpError } from "../errors.js";
import { asyncHandler, requireAuth } from "../middleware.js";
import { parsePositiveInt } from "../parse.js";
import { readStore } from "../store.js";

const router = Router();

async function chainOrders() {
  const { orderCount } = await readCounts();
  const orders = [];
  for (let id = 1; id <= orderCount; id += 1) {
    orders.push(await readOrder(id));
  }
  return orders;
}

function hydrate(order, store, viewer) {
  const extra = store.orders.find((item) => item.orderId === order.orderId);
  const involved = sameAddress(order.buyer, viewer.address)
    || sameAddress(order.seller, viewer.address)
    || viewer.role === "ADMIN";
  const buyerProfile = store.profiles.find((item) => sameAddress(item.address, order.buyer));

  return {
    ...order,
    txHash: extra?.txHash || null,
    deliveryNote: involved ? (extra?.deliveryNote || "") : "",
    buyerGameAccount: involved ? (buyerProfile?.gameAccount || "") : ""
  };
}

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const store = await readStore();
  const source = isConfigured()
    ? await chainOrders()
    : store.orders;

  let rows = source.filter((order) =>
    req.user.role === "ADMIN"
    || sameAddress(order.buyer, req.user.address)
    || sameAddress(order.seller, req.user.address)
  );

  if (req.query.as === "buyer") {
    rows = rows.filter((order) => sameAddress(order.buyer, req.user.address));
  }
  if (req.query.as === "seller") {
    rows = rows.filter((order) => sameAddress(order.seller, req.user.address));
  }
  if (req.query.status) {
    const status = String(req.query.status).toUpperCase();
    rows = rows.filter((order) => order.status === status);
  }

  res.json(rows.map((order) => hydrate(order, store, req.user)));
}));

router.get("/:orderId", requireAuth, asyncHandler(async (req, res) => {
  if (!isConfigured()) throw httpError(503, "RPC_URL atau CONTRACT_ADDRESS belum disetel");
  const orderId = parsePositiveInt(req.params.orderId, "orderId");
  const order = await readOrder(orderId);
  const allowed = req.user.role === "ADMIN"
    || sameAddress(order.buyer, req.user.address)
    || sameAddress(order.seller, req.user.address);
  if (!allowed) throw httpError(403, "Order ini bukan milik wallet kamu");

  const store = await readStore();
  res.json(hydrate(order, store, req.user));
}));

export default router;
