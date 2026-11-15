import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import {
  chainCancelOrder,
  chainDelistItem,
  chainListItem,
  chainMarkShipped,
  chainSubmit,
  deleteDraft,
  getMyDrafts,
  getMyOrders,
} from "../services/api";
import { sendMarketplaceTx } from "../services/chain";
import "./SellerDashboardPage.css";

export default function SellerDashboardPage() {
  const { address, role } = useWeb3();
  const [activeTab, setActiveTab] = useState("drafts"); // 'drafts' | 'orders'

  const [drafts, setDrafts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  // Delivery Note modal / input state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryNote, setDeliveryNote] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [draftsData, ordersData] = await Promise.all([
        getMyDrafts(),
        getMyOrders({ as: "seller" }),
      ]);
      setDrafts(draftsData || []);
      setOrders(ordersData || []);
    } catch (e) {
      setErr(e.message || "Gagal memuat data seller");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Action: List item on blockchain
  const handleListItemOnChain = async (draft) => {
    setActionLoading(true);
    setMsg(null);
    setErr(null);
    try {
      // 1. Dapatkan tx payload dari backend
      const payload = await chainListItem(draft.id);

      // 2. Kirim transaksi ke blockchain lewat MetaMask
      const txHash = await sendMarketplaceTx(payload.tx);

      // 3. Submit txHash ke backend untuk sinkronisasi database
      await chainSubmit("list", txHash, { draftId: draft.id });

      setMsg(`Berhasil me-listing "${draft.title}" secara on-chain! Tx: ${txHash}`);
      await fetchData();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Gagal me-listing item on-chain");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Delist item (Soft-delete & Cancel)
  const handleDelistItem = async (draft) => {
    if (!draft.listingId) {
      alert("Item ini belum memiliki listingId di blockchain.");
      return;
    }
    const confirmDelist = window.confirm(
      `Apakah Anda yakin ingin menghapus (delist) listing #${draft.listingId}? Kontrak akan menjalankan soft-delete menjadi CANCELLED dan mengembalikan dana pesanan aktif secara otomatis.`
    );
    if (!confirmDelist) return;

    setActionLoading(true);
    setMsg(null);
    setErr(null);
    try {
      // Cari order PAID_HELD milik listing ini untuk di-refund otomatis
      const activeOrderIds = orders
        .filter(
          (o) => o.listingId === draft.listingId && o.status === "PAID_HELD"
        )
        .map((o) => o.orderId);

      const payload = await chainDelistItem(draft.listingId, activeOrderIds);
      const txHash = await sendMarketplaceTx(payload.tx);
      await chainSubmit("delist", txHash);

      setMsg(`Listing #${draft.listingId} berhasil di-delist (status CANCELLED).`);
      await fetchData();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Gagal menghapus listing");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Delete draft lokal
  const handleDeleteDraft = async (id) => {
    if (!window.confirm("Hapus draft produk ini?")) return;
    try {
      await deleteDraft(id);
      setMsg("Draft berhasil dihapus.");
      await fetchData();
    } catch (e) {
      setErr(e.message || "Gagal menghapus draft");
    }
  };

  // Action: Submit Mark Shipped
  const handleMarkShippedSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setActionLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const payload = await chainMarkShipped(
        selectedOrder.orderId,
        deliveryNote
      );
      const txHash = await sendMarketplaceTx(payload.tx);
      await chainSubmit("ship", txHash, { deliveryNote });

      setMsg(`Order #${selectedOrder.orderId} telah ditandai SHIPPED!`);
      setSelectedOrder(null);
      setDeliveryNote("");
      await fetchData();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Gagal memperbarui status order");
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Cancel order (sebelum barang dikirim)
  const handleCancelOrder = async (orderId) => {
    const confirmCancel = window.confirm(
      `Batalkan order #${orderId}? Dana kripto pembeli di escrow akan otomatis di-refund secara on-chain.`
    );
    if (!confirmCancel) return;

    setActionLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const payload = await chainCancelOrder(orderId);
      const txHash = await sendMarketplaceTx(payload.tx);
      await chainSubmit("cancel", txHash);

      setMsg(`Order #${orderId} berhasil dibatalkan dan direfund.`);
      await fetchData();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Gagal membatalkan order");
    } finally {
      setActionLoading(false);
    }
  };

  const pendingShipCount = orders.filter((o) => o.status === "PAID_HELD").length;

  return (
    <div className="seller-dashboard-container">
      <div className="seller-dashboard-header">
        <div>
          <span className="seller-role-tag">🛡️ {role} PANEL</span>
          <h1>Seller Dashboard</h1>
          <p>
            Kelola draft media item off-chain, publikasi listing on-chain, dan pengiriman aset game.
          </p>
        </div>
        <Link to="/seller/drafts/new" className="btn-create-draft">
          + Buat Draft Item Baru
        </Link>
      </div>

      {msg && <div className="seller-alert alert-success">✅ {msg}</div>}
      {err && <div className="seller-alert alert-error">⚠️ {err}</div>}

      {/* Tabs */}
      <div className="seller-tabs">
        <button
          className={`tab-btn ${activeTab === "drafts" ? "active" : ""}`}
          onClick={() => setActiveTab("drafts")}
        >
          📦 Draft & Listing Aset ({drafts.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          🚚 Pesanan Pembeli ({orders.length})
          {pendingShipCount > 0 && (
            <span className="tab-badge">{pendingShipCount} Siap Kirim</span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="seller-loading">
          <div className="spinner"></div>
          <p>Memuat data seller...</p>
        </div>
      ) : activeTab === "drafts" ? (
        /* DRAFTS TAB */
        <div className="drafts-section">
          {drafts.length === 0 ? (
            <div className="empty-panel">
              <p>Anda belum memiliki draft atau listing item.</p>
              <Link to="/seller/drafts/new" className="btn-primary">
                + Tambah Draft Pertama Anda
              </Link>
            </div>
          ) : (
            <div className="drafts-grid">
              {drafts.map((d) => (
                <div key={d.id} className="draft-card">
                  <div className="draft-img-wrap">
                    {d.image ? (
                      <img src={d.image} alt={d.title} />
                    ) : (
                      <div className="img-placeholder">⚔️</div>
                    )}
                    <span className={`status-pill status-${d.status?.toLowerCase()}`}>
                      {d.status}
                    </span>
                    {d.assetStandard && (
                      <span className="standard-pill">{d.assetStandard}</span>
                    )}
                  </div>

                  <div className="draft-body">
                    <h3>{d.title}</h3>
                    <p className="draft-story">{d.story}</p>

                    <div className="draft-meta-row">
                      <div>
                        <span className="meta-label">Harga</span>
                        <span className="meta-val price-val">
                          <span className="symbol">Ξ</span> {d.priceEth} ETH
                        </span>
                      </div>
                      <div>
                        <span className="meta-label">Stok</span>
                        <span className="meta-val">{d.stock}</span>
                      </div>
                      {d.listingId && (
                        <div>
                          <span className="meta-label">On-chain ID</span>
                          <span className="meta-val">#{d.listingId}</span>
                        </div>
                      )}
                    </div>

                    <div className="draft-actions">
                      {d.status === "DRAFT" && (
                        <>
                          <button
                            className="btn-list-chain"
                            onClick={() => handleListItemOnChain(d)}
                            disabled={actionLoading}
                          >
                            🚀 List On-Chain
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteDraft(d.id)}
                            disabled={actionLoading}
                          >
                            Hapus
                          </button>
                        </>
                      )}

                      {d.status === "LISTED" && (
                        <>
                          <Link
                            to={`/catalog/${d.listingId}`}
                            className="btn-view-catalog"
                          >
                            Buka di Katalog
                          </Link>
                          <button
                            className="btn-delist"
                            onClick={() => handleDelistItem(d)}
                            disabled={actionLoading}
                          >
                            Delist (Soft-Delete)
                          </button>
                        </>
                      )}

                      {d.status === "DELISTED" && (
                        <span className="delisted-notice">
                          Item telah di-delist dari blockchain.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ORDERS TAB */
        <div className="seller-orders-section">
          {orders.length === 0 ? (
            <div className="empty-panel">
              <p>Belum ada pesanan yang masuk dari pembeli.</p>
            </div>
          ) : (
            <div className="seller-orders-list">
              {orders.map((o) => (
                <div key={o.orderId} className="seller-order-card">
                  <div className="order-header-row">
                    <div>
                      <span className="order-id">Order #{o.orderId}</span>
                      <span className="listing-ref">Listing #{o.listingId}</span>
                    </div>
                    <span className={`order-status-badge status-${o.status?.toLowerCase()}`}>
                      {o.status}
                    </span>
                  </div>

                  <div className="order-body-grid">
                    <div>
                      <span className="label">Pembeli (Buyer):</span>
                      <code className="val">{o.buyer}</code>
                    </div>
                    <div>
                      <span className="label">Akun Game Tujuan:</span>
                      <strong className="val game-acc">
                        {o.buyerGameAccount || "Belum diisi pembeli (hubungi via wallet)"}
                      </strong>
                    </div>
                    <div>
                      <span className="label">Jumlah & Dana Escrow:</span>
                      <span className="val eth-val">
                        {o.quantity} unit • {o.amountEth} ETH ({o.escrow} in escrow)
                      </span>
                    </div>
                    {o.deliveryNote && (
                      <div className="full-width">
                        <span className="label">Catatan Pengiriman:</span>
                        <p className="delivery-note-val">{o.deliveryNote}</p>
                      </div>
                    )}
                  </div>

                  <div className="order-footer-row">
                    <Link to={`/orders/${o.orderId}`} className="btn-detail-order">
                      Detail Order & Log On-Chain →
                    </Link>

                    {o.status === "PAID_HELD" && (
                      <div className="order-action-buttons">
                        <button
                          className="btn-ship"
                          onClick={() => {
                            setSelectedOrder(o);
                            setDeliveryNote(
                              o.buyerGameAccount
                                ? `Terkirim ke ID ${o.buyerGameAccount}`
                                : ""
                            );
                          }}
                          disabled={actionLoading}
                        >
                          📦 Kirim Aset & Tandai SHIPPED
                        </button>
                        <button
                          className="btn-cancel"
                          onClick={() => handleCancelOrder(o.orderId)}
                          disabled={actionLoading}
                        >
                          Batalkan & Refund
                        </button>
                      </div>
                    )}

                    {o.status === "SHIPPED" && (
                      <span className="waiting-confirmation-tag">
                        ⏳ Menunggu pembeli klik CONFIRM_DELIVERY di wallet mereka
                      </span>
                    )}

                    {o.status === "COMPLETED" && (
                      <span className="completed-tag">
                        ✅ Selesai: Dana {o.amountEth} ETH telah dicairkan ke wallet Anda!
                      </span>
                    )}

                    {o.status === "CANCELLED" && (
                      <span className="cancelled-tag">
                        ↩️ Dibatalkan: Dana telah otomatis dikembalikan ke pembeli.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Mark Shipped Delivery Note */}
      {selectedOrder && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <h3>Konfirmasi Pengiriman Item Game</h3>
            <p>
              Pastikan aset game telah dikirimkan ke akun pembeli:{" "}
              <strong>
                {selectedOrder.buyerGameAccount || selectedOrder.buyer}
              </strong>
            </p>

            <form onSubmit={handleMarkShippedSubmit}>
              <div className="form-group">
                <label>Catatan Pengiriman (ID Transaksi Game / Akun):</label>
                <textarea
                  className="modal-textarea"
                  rows={3}
                  placeholder="Contoh: Item pedang dikirim via In-Game Mail ID #99214"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedOrder(null)}
                  disabled={actionLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? "Menandatangani Transaksi..."
                    : "🚀 Tandatangani markShipped di Wallet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
