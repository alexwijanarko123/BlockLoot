import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import {
  chainCancelOrder,
  chainConfirmDelivery,
  chainSubmit,
  getMyOrders,
} from "../services/api";
import { sendMarketplaceTx } from "../services/chain";
import "./OrdersPage.css";

export default function OrdersPage() {
  const { address, token } = useWeb3();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [asFilter, setAsFilter] = useState("all"); // 'all' | 'buyer' | 'seller'
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setErr(null);
    try {
      const params = {};
      if (asFilter !== "all") params.as = asFilter;
      if (statusFilter) params.status = statusFilter;

      const data = await getMyOrders(params);
      setOrders(data || []);
    } catch (e) {
      setErr(e.message || "Gagal memuat daftar pesanan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [asFilter, statusFilter]);

  // Buyer: Confirm Delivery -> Releases escrow to seller
  const handleConfirmDelivery = async (orderId) => {
    const confirm = window.confirm(
      `Apakah Anda telah menerima item game di akun Anda? Konfirmasi ini akan otomatis mencairkan dana escrow langsung ke wallet penjual di blockchain.`
    );
    if (!confirm) return;

    setActionLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const payload = await chainConfirmDelivery(orderId);
      const txHash = await sendMarketplaceTx(payload.tx);
      await chainSubmit("confirm", txHash);

      setMsg(`Pesanan #${orderId} telah dikonfirmasi! Dana berhasil dicairkan ke penjual.`);
      await fetchOrders();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Gagal mengonfirmasi pengiriman");
    } finally {
      setActionLoading(false);
    }
  };

  // Buyer or Seller: Cancel Order (Only if PAID_HELD) -> Automatic refund
  const handleCancelOrder = async (orderId) => {
    const confirm = window.confirm(
      `Batalkan pesanan #${orderId}? Dana kripto yang terkunci di escrow akan otomatis dikembalikan (refund) ke wallet pembeli.`
    );
    if (!confirm) return;

    setActionLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const payload = await chainCancelOrder(orderId);
      const txHash = await sendMarketplaceTx(payload.tx);
      await chainSubmit("cancel", txHash);

      setMsg(`Pesanan #${orderId} dibatalkan. Refund ke pembeli telah diproses di blockchain.`);
      await fetchOrders();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Gagal membatalkan pesanan");
    } finally {
      setActionLoading(false);
    }
  };

  const formatAddr = (a) => (a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "-");

  return (
    <div className="orders-container">
      <div className="orders-header">
        <div>
          <h1>Riwayat Pesanan & Escrow</h1>
          <p>
            Pantau status transaksi on-chain, status escrow dana kripto, dan konfirmasi penerimaan.
          </p>
        </div>
      </div>

      {msg && <div className="order-alert alert-success">✅ {msg}</div>}
      {err && <div className="order-alert alert-error">⚠️ {err}</div>}

      {/* Filter Bar */}
      <div className="orders-filter-bar">
        <div className="filter-pill-group">
          <button
            className={`pill-btn ${asFilter === "all" ? "active" : ""}`}
            onClick={() => setAsFilter("all")}
          >
            Semua Pesanan
          </button>
          <button
            className={`pill-btn ${asFilter === "buyer" ? "active" : ""}`}
            onClick={() => setAsFilter("buyer")}
          >
            🛒 Sebagai Pembeli (Buyer)
          </button>
          <button
            className={`pill-btn ${asFilter === "seller" ? "active" : ""}`}
            onClick={() => setAsFilter("seller")}
          >
            📦 Sebagai Penjual (Seller)
          </button>
        </div>

        <div className="status-select-wrap">
          <label>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="orders-select"
          >
            <option value="">Semua Status</option>
            <option value="PAID_HELD">PAID_HELD (Escrow Terkunci)</option>
            <option value="SHIPPED">SHIPPED (Dalam Pengiriman)</option>
            <option value="COMPLETED">COMPLETED (Selesai & Cair)</option>
            <option value="CANCELLED">CANCELLED (Dibatalkan/Refund)</option>
          </select>
        </div>
      </div>

      {/* Orders Grid/List */}
      {loading ? null : orders.length === 0 ? (
        <div className="orders-empty">
          <div className="empty-icon">📜</div>
          <h3>Belum Ada Transaksi</h3>
          <p>Anda belum memiliki pesanan yang sesuai dengan filter di atas.</p>
          <Link to="/catalog" className="btn-primary" style={{ marginTop: 14 }}>
            Jelajahi Katalog Item
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((o) => {
            const isBuyer =
              address &&
              o.buyer &&
              address.toLowerCase() === o.buyer.toLowerCase();
            const isSeller =
              address &&
              o.seller &&
              address.toLowerCase() === o.seller.toLowerCase();

            return (
              <div key={o.orderId} className="order-card">
                <div className="order-card-top">
                  <div className="order-title-group">
                    <span className="order-main-id">Order #{o.orderId}</span>
                    <span className="order-listing-id">
                      Listing #{o.listingId}
                    </span>
                    {isBuyer && <span className="user-role-badge buyer">Buyer</span>}
                    {isSeller && <span className="user-role-badge seller">Seller</span>}
                  </div>

                  <div className="badges-group">
                    <span className={`order-status-pill status-${o.status?.toLowerCase()}`}>
                      {o.status}
                    </span>
                    <span className={`escrow-pill escrow-${o.escrow}`}>
                      Escrow: {o.escrow}
                    </span>
                  </div>
                </div>

                <div className="order-card-body">
                  <div className="info-cell">
                    <span className="cell-label">Dana Kripto di Escrow:</span>
                    <span className="cell-val eth-amount">
                      <span className="symbol">Ξ</span> {o.amountEth} ETH ({o.quantity} unit)
                    </span>
                  </div>

                  <div className="info-cell">
                    <span className="cell-label">Pembeli (Buyer):</span>
                    <span className="cell-val">{formatAddr(o.buyer)}</span>
                  </div>

                  <div className="info-cell">
                    <span className="cell-label">Penjual (Seller):</span>
                    <span className="cell-val">{formatAddr(o.seller)}</span>
                  </div>

                  {o.deliveryNote && (
                    <div className="info-cell full-width">
                      <span className="cell-label">Catatan Pengiriman Seller:</span>
                      <p className="note-text">{o.deliveryNote}</p>
                    </div>
                  )}
                </div>

                <div className="order-card-actions">
                  <Link to={`/orders/${o.orderId}`} className="btn-view-timeline">
                    Buka Timeline Log Transaksi →
                  </Link>

                  <div className="action-buttons-group">
                    {/* Buyer Action: Confirm Delivery when SHIPPED */}
                    {isBuyer && o.status === "SHIPPED" && (
                      <button
                        className="btn-confirm-delivery"
                        onClick={() => handleConfirmDelivery(o.orderId)}
                        disabled={actionLoading}
                      >
                        ✅ Konfirmasi Penerimaan Item (CONFIRM_DELIVERY)
                      </button>
                    )}

                    {/* Cancel Action: When PAID_HELD (before shipping) */}
                    {o.status === "PAID_HELD" && (isBuyer || isSeller) && (
                      <button
                        className="btn-cancel-order"
                        onClick={() => handleCancelOrder(o.orderId)}
                        disabled={actionLoading}
                      >
                        ✕ Batalkan Pesanan (Refund Otomatis)
                      </button>
                    )}

                    {/* Seller Quick Navigation: Mark Shipped */}
                    {isSeller && o.status === "PAID_HELD" && (
                      <Link to="/seller" className="btn-ship-link">
                        📦 Kirim di Seller Dashboard
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
