const BASE = "http://localhost:4000";

function getToken() {
  return localStorage.getItem("bl_token");
}

async function request(path, opts = {}) {
  const { method = "GET", body, isFormData = false, query } = opts;

  let url = `${BASE}${path}`;
  if (query) {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v != null && v !== "")
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isFormData && body) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ── Auth ──────────────────────────────────────────────
export const getChallenge = (address) =>
  request("/api/auth/challenge", { method: "POST", body: { address } });

export const verifySignature = (address, signature) =>
  request("/api/auth/verify", { method: "POST", body: { address, signature } });

// ── Profile ───────────────────────────────────────────
export const getProfile = () => request("/api/profile");

export const updateProfile = (data) =>
  request("/api/profile", { method: "PUT", body: data });

export const getSellerProfile = (address) =>
  request(`/api/seller-profile/${address}`);

// ── Catalog / Products ────────────────────────────────
export const getCatalog = (query = {}) =>
  request("/api/catalog", { query });

export const getCatalogItem = (id) => request(`/api/catalog/${id}`);

export const getProducts = (query = {}) =>
  request("/api/products", { query });

// ── Drafts ────────────────────────────────────────────
export const getMyDrafts = () => request("/api/product-drafts");

export const createDraft = (formData) =>
  request("/api/product-drafts", {
    method: "POST",
    body: formData,
    isFormData: true,
  });

export const updateDraft = (id, formData) =>
  request(`/api/product-drafts/${id}`, {
    method: "PATCH",
    body: formData,
    isFormData: true,
  });

export const deleteDraft = (id) =>
  request(`/api/product-drafts/${id}`, { method: "DELETE" });

// ── Orders ────────────────────────────────────────────
export const getMyOrders = (params = {}) =>
  request("/api/orders", { query: params });

export const getOrderDetail = (orderId) => request(`/api/orders/${orderId}`);

// ── Chain actions (get tx object from backend) ────────
export const chainListItem = (draftId) =>
  request("/api/chain/list-item", { method: "POST", body: { draftId } });

export const chainBuyItem = (listingId, quantity) =>
  request("/api/chain/buy-item", {
    method: "POST",
    body: { listingId, quantity },
  });

export const chainMarkShipped = (orderId, deliveryNote) =>
  request("/api/chain/mark-shipped", {
    method: "POST",
    body: { orderId, deliveryNote },
  });

export const chainConfirmDelivery = (orderId) =>
  request("/api/chain/confirm-delivery", {
    method: "POST",
    body: { orderId },
  });

export const chainCancelOrder = (orderId) =>
  request("/api/chain/cancel-order", {
    method: "POST",
    body: { orderId },
  });

export const chainDelistItem = (listingId, orderIds) =>
  request("/api/chain/delist-item", {
    method: "POST",
    body: { listingId, orderIds },
  });

export const chainSubmit = (kind, txHash, extras = {}) =>
  request("/api/chain/submit", {
    method: "POST",
    body: { kind, txHash, ...extras },
  });

export const chainGrantSeller = (address) =>
  request("/api/chain/grant-seller", {
    method: "POST",
    body: { address },
  });

// ── Health ────────────────────────────────────────────
export const getHealthCheck = () => request("/api/health");
