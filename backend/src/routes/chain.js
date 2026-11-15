import { Router } from "express";
import { ethers } from "ethers";
import { ORDER_STATUS } from "../abi.js";
import {
  buildTx,
  getInterface,
  getProvider,
  getReadContract,
  isConfigured,
  loadReceipt,
  readListing,
  readOrder,
  sameAddress
} from "../chain.js";
import { config } from "../config.js";
import { httpError } from "../errors.js";
import { asyncHandler, requireAuth, requireRole } from "../middleware.js";
import { parseAddress, parseIdList, parsePositiveInt, parseTxHash } from "../parse.js";
import { readStore, updateStore } from "../store.js";
import { applyChainEvents, eventName } from "../sync.js";

const router = Router();

const METHOD_BY_KIND = {
  list: "listItem",
  buy: "buyItem",
  ship: "markShipped",
  confirm: "confirmDelivery",
  cancel: "cancelOrder",
  delist: "delistItem",
  "grant-seller": "grantRole"
};

const STATUS_BY_KIND = {
  ship: "SHIPPED",
  confirm: "COMPLETED",
  cancel: "CANCELLED"
};

function txBody(step, tx, extra = {}) {
  return {
    step,
    paymentStandard: "NATIVE_ETH",
    tx,
    signWith: "wallet",
    next: "POST /api/chain/submit setelah transaksi masuk blok",
    ...extra
  };
}

router.get("/listings/:listingId", asyncHandler(async (req, res) => {
  const listingId = parsePositiveInt(req.params.listingId, "listingId");
  res.json(await readListing(listingId));
}));

router.get("/orders/:orderId", asyncHandler(async (req, res) => {
  const orderId = parsePositiveInt(req.params.orderId, "orderId");
  res.json(await readOrder(orderId));
}));

router.post("/list-item", requireAuth, requireRole("SELLER"), asyncHandler(async (req, res) => {
  const store = await readStore();
  const draft = store.drafts.find((item) => item.id === req.body?.draftId);
  if (!draft || !sameAddress(draft.seller, req.user.address)) {
    throw httpError(404, "Draft tidak ditemukan");
  }
  if (draft.status !== "DRAFT") throw httpError(409, "Draft ini sudah masuk listing");

  const tx = await buildTx({
    from: req.user.address,
    method: "listItem",
    args: [draft.metadataURI, BigInt(draft.priceWei), BigInt(draft.stock)]
  });

  res.json(txBody("list_item", tx, {
    draftId: draft.id,
    metadataURI: draft.metadataURI,
    priceEth: draft.priceEth,
    stock: draft.stock
  }));
}));

router.post("/buy-item", requireAuth, asyncHandler(async (req, res) => {
  const listingId = parsePositiveInt(req.body?.listingId, "listingId");
  const quantity = parsePositiveInt(req.body?.quantity, "quantity");
  const listing = await readListing(listingId);

  if (listing.status !== "ACTIVE") throw httpError(400, "Listing tidak aktif");
  if (sameAddress(listing.seller, req.user.address)) throw httpError(400, "Tidak bisa beli listing sendiri");
  if (quantity > BigInt(listing.stock)) throw httpError(400, "Stok tidak cukup");

  const total = BigInt(listing.priceWei) * quantity;
  const tx = await buildTx({
    from: req.user.address,
    method: "buyItem",
    args: [listingId, quantity],
    value: total
  });

  res.json(txBody("buy_item", tx, {
    listingId: listingId.toString(),
    quantity: quantity.toString(),
    totalWei: total.toString(),
    totalEth: ethers.formatEther(total),
    resultingStatus: "PAID_HELD",
    escrow: "held"
  }));
}));

router.post("/mark-shipped", requireAuth, requireRole("SELLER"), asyncHandler(async (req, res) => {
  const orderId = parsePositiveInt(req.body?.orderId, "orderId");
  const order = await readOrder(orderId);
  if (!sameAddress(order.seller, req.user.address)) throw httpError(403, "Bukan seller order ini");
  if (order.status !== "PAID_HELD") throw httpError(400, "Order harus berstatus PAID_HELD");

  const tx = await buildTx({
    from: req.user.address,
    method: "markShipped",
    args: [orderId]
  });

  res.json(txBody("mark_shipped", tx, {
    orderId: orderId.toString(),
    resultingStatus: "SHIPPED",
    escrow: "held"
  }));
}));

router.post("/confirm-delivery", requireAuth, asyncHandler(async (req, res) => {
  const orderId = parsePositiveInt(req.body?.orderId, "orderId");
  const order = await readOrder(orderId);
  if (!sameAddress(order.buyer, req.user.address)) throw httpError(403, "Bukan buyer order ini");
  if (order.status !== "SHIPPED") throw httpError(400, "Konfirmasi hanya setelah status SHIPPED");

  const tx = await buildTx({
    from: req.user.address,
    method: "confirmDelivery",
    args: [orderId]
  });

  res.json(txBody("confirm_delivery", tx, {
    orderId: orderId.toString(),
    resultingStatus: "COMPLETED",
    escrow: "released",
    payoutTo: order.seller,
    amountEth: order.amountEth
  }));
}));

router.post("/cancel-order", requireAuth, asyncHandler(async (req, res) => {
  const orderId = parsePositiveInt(req.body?.orderId, "orderId");
  const order = await readOrder(orderId);
  const allowed = sameAddress(order.buyer, req.user.address) || sameAddress(order.seller, req.user.address);
  if (!allowed) throw httpError(403, "Hanya buyer atau seller order ini yang bisa membatalkan");
  if (order.status !== "PAID_HELD") {
    throw httpError(400, "Pembatalan hanya sebelum barang dikirim (status PAID_HELD)");
  }

  const tx = await buildTx({
    from: req.user.address,
    method: "cancelOrder",
    args: [orderId]
  });

  res.json(txBody("cancel_order", tx, {
    orderId: orderId.toString(),
    resultingStatus: "CANCELLED",
    escrow: "refunded",
    refundTo: order.buyer,
    amountEth: order.amountEth
  }));
}));

router.post("/delist-item", requireAuth, requireRole("SELLER"), asyncHandler(async (req, res) => {
  const listingId = parsePositiveInt(req.body?.listingId, "listingId");
  const orderIds = parseIdList(req.body?.orderIds);
  const listing = await readListing(listingId);
  if (!sameAddress(listing.seller, req.user.address)) throw httpError(403, "Bukan seller listing ini");
  if (listing.status !== "ACTIVE") throw httpError(400, "Listing tidak aktif");

  for (const orderId of orderIds) {
    const order = await readOrder(orderId);
    if (order.listingId !== listingId.toString()) {
      throw httpError(400, `Order ${orderId} bukan milik listing ini`);
    }
    if (order.status !== "PAID_HELD") {
      throw httpError(400, `Order ${orderId} harus PAID_HELD supaya refund otomatis`);
    }
  }

  const tx = await buildTx({
    from: req.user.address,
    method: "delistItem",
    args: [listingId, orderIds]
  });

  res.json(txBody("delist_item", tx, {
    listingId: listingId.toString(),
    orderIds: orderIds.map((id) => id.toString()),
    resultingListingStatus: "CANCELLED",
    resultingOrderStatus: "CANCELLED",
    escrow: "refunded"
  }));
}));

router.post("/grant-seller", requireAuth, requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const account = parseAddress(req.body?.address, "address");
  const sellerRole = await getReadContract().SELLER_ROLE();
  const tx = await buildTx({
    from: req.user.address,
    method: "grantRole",
    args: [sellerRole, account]
  });

  res.json(txBody("grant_seller", tx, { account, role: "SELLER" }));
}));

router.post("/broadcast", requireAuth, asyncHandler(async (req, res) => {
  const signedTx = req.body?.signedTx;
  if (typeof signedTx !== "string" || !signedTx.startsWith("0x")) {
    throw httpError(400, "signedTx wajib berupa raw transaction hex");
  }

  let decoded;
  try {
    decoded = ethers.Transaction.from(signedTx);
  } catch {
    throw httpError(400, "signedTx tidak bisa dibaca");
  }
  if (!decoded.to || !sameAddress(decoded.to, config.contractAddress)) {
    throw httpError(400, "Transaksi harus menuju kontrak marketplace");
  }
  if (!decoded.from) throw httpError(400, "Tidak bisa memulihkan alamat penandatangan");
  if (!sameAddress(decoded.from, req.user.address)) {
    throw httpError(403, "Penandatangan transaksi bukan wallet yang login");
  }

  const sent = await getProvider().broadcastTransaction(signedTx);
  res.json({ txHash: sent.hash });
}));

router.post("/submit", requireAuth, asyncHandler(async (req, res) => {
  if (!isConfigured()) throw httpError(503, "RPC_URL atau CONTRACT_ADDRESS belum disetel");

  const kind = req.body?.kind;
  const expectedMethod = METHOD_BY_KIND[kind];
  if (!expectedMethod) {
    throw httpError(400, "kind harus list, buy, ship, confirm, cancel, delist, atau grant-seller");
  }

  const txHash = parseTxHash(req.body?.txHash);
  const { tx, events } = await loadReceipt(txHash);
  if (!sameAddress(tx.from, req.user.address)) {
    throw httpError(403, "Transaksi bukan dari wallet yang login");
  }

  let decoded;
  try {
    decoded = getInterface().parseTransaction({ data: tx.data, value: tx.value });
  } catch {
    throw httpError(400, "Data transaksi tidak cocok dengan kontrak marketplace");
  }
  if (!decoded || decoded.name !== expectedMethod) {
    throw httpError(400, "Isi transaksi tidak sesuai dengan kind");
  }

  if (kind === "list") {
    const store = await readStore();
    const draft = store.drafts.find((item) => item.id === req.body?.draftId);
    if (!draft || !sameAddress(draft.seller, req.user.address)) {
      throw httpError(404, "Draft tidak ditemukan");
    }
    if (decoded.args[0] !== draft.metadataURI) {
      throw httpError(400, "Transaksi ini tidak me-listing draft tersebut");
    }
  }

  if (STATUS_BY_KIND[kind]) {
    const matched = events.some((event) =>
      eventName(event) === "OrderStatusChanged"
      && ORDER_STATUS[Number(event.args.status)] === STATUS_BY_KIND[kind]
    );
    if (!matched) throw httpError(400, "Event status order tidak sesuai");
  }

  if (kind === "delist" && !events.some((event) => eventName(event) === "ListingCancelled")) {
    throw httpError(400, "Event ListingCancelled tidak ditemukan");
  }
  if (kind === "buy" && !events.some((event) => eventName(event) === "ItemBought")) {
    throw httpError(400, "Event ItemBought tidak ditemukan");
  }
  if (kind === "list" && !events.some((event) => eventName(event) === "ItemListed")) {
    throw httpError(400, "Event ItemListed tidak ditemukan");
  }

  const deliveryNote = kind === "ship" && req.body?.deliveryNote
    ? String(req.body.deliveryNote).trim().slice(0, 500)
    : null;

  await updateStore((data) => {
    applyChainEvents(data, events, txHash);
    if (deliveryNote) {
      const shipped = events.find((event) =>
        eventName(event) === "OrderStatusChanged"
        && ORDER_STATUS[Number(event.args.status)] === "SHIPPED"
      );
      if (shipped) {
        const order = data.orders.find((item) => item.orderId === shipped.args.orderId.toString());
        if (order) order.deliveryNote = deliveryNote;
      }
    }
  });

  const body = {
    ok: true,
    kind,
    txHash,
    events: events.map((event) => eventName(event))
  };

  if (kind === "grant-seller") {
    body.address = ethers.getAddress(decoded.args[1]);
    body.role = "SELLER";
  }

  res.json(body);
}));

export default router;
