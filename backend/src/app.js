import cors from "cors";
import express from "express";
import { isConfigured } from "./chain.js";
import { config } from "./config.js";
import { errorHandler } from "./middleware.js";
import authRoutes from "./routes/auth.js";
import catalogRoutes, { itemRouter, productRouter } from "./routes/catalog.js";
import chainRoutes from "./routes/chain.js";
import draftRoutes from "./routes/drafts.js";
import orderRoutes from "./routes/orders.js";
import profileRoutes, { sellerProfileRouter } from "./routes/profile.js";

const app = express();

app.use(cors({
  origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(",").map((item) => item.trim())
}));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(config.uploadsDir));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "blockloot-backend",
    chainConfigured: isConfigured()
  });
});

app.get("/api", (_req, res) => {
  res.json({
    name: "BlockLoot API",
    payment: "NATIVE_ETH",
    assetRecord: ["ERC-721", "ERC-1155"],
    flow: [
      "Hubungkan wallet, minta challenge, tanda tangani pesan, lalu kirim signature untuk mendapat role ADMIN, SELLER, atau BUYER.",
      "Seller mengunggah gambar, statistik, dan cerita sebagai product draft off-chain.",
      "Seller menandatangani listItem. Stok dan harga ETH tercatat on-chain, media tetap di metadataURI.",
      "Buyer checkout lewat buyItem. ETH terkunci di escrow dengan status PAID_HELD.",
      "Seller mengirim item ke akun game buyer, lalu markShipped mengubah status menjadi SHIPPED.",
      "Buyer confirmDelivery. Kontrak mencairkan escrow ke wallet seller dan status menjadi COMPLETED.",
      "cancelOrder sebelum dikirim, atau delistItem, mengubah status menjadi CANCELLED dan mengembalikan ETH. Log on-chain tetap ada."
    ],
    auth: {
      challenge: "POST /api/auth/challenge",
      verify: "POST /api/auth/verify",
      me: "GET /api/auth/me",
      role: "GET /api/auth/role/:address"
    },
    offChain: {
      productDrafts: "/api/product-drafts",
      itemData: "/api/items/:id",
      catalog: "/api/catalog",
      products: "/api/products",
      profile: "/api/profile",
      sellerProfile: "/api/seller-profile/:address"
    },
    onChain: {
      listItem: "POST /api/chain/list-item",
      buyItem: "POST /api/chain/buy-item",
      orderStatus: "GET /api/chain/orders/:orderId",
      markShipped: "POST /api/chain/mark-shipped",
      confirmDelivery: "POST /api/chain/confirm-delivery",
      cancelOrder: "POST /api/chain/cancel-order",
      delistItem: "POST /api/chain/delist-item",
      grantSeller: "POST /api/chain/grant-seller",
      submit: "POST /api/chain/submit",
      orders: "/api/orders"
    }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/product-drafts", draftRoutes);
app.use("/api/items", itemRouter);
app.use("/api/catalog", catalogRoutes);
app.use("/api/products", productRouter);
app.use("/api/profile", profileRoutes);
app.use("/api/seller-profile", sellerProfileRouter);
app.use("/api/orders", orderRoutes);
app.use("/api/chain", chainRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Endpoint tidak ditemukan" });
});
app.use(errorHandler);

export default app;
