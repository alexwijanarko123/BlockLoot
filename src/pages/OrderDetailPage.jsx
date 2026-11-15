import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import {
  chainCancelOrder,
  chainConfirmDelivery,
  chainMarkShipped,
  chainSubmit,
  getOrderDetail,
} from "../services/api";
import { sendMarketplaceTx } from "../services/chain";
import "./OrderDetailPage.css";

export default function OrderDetailPage() {
  const { id } = useParams();
  const { address } = useWeb3();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  // Delivery Note for Seller
  const [deliveryNote, setDeliveryNote] = useState("");
  const [showShipModal, setShowShipModal] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await getOrderDetail(id);
      setOrder(data);
    } catch (e) {
      setErr(e.message || "Gagal memuat detail pesanan");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const isBuyer =
    address &&
    order?.buyer &&
    address.toLowerCase() === order.buyer.toLowerCase();
  const isSeller =
    address &&
    order?.seller &&
    address.toLowerCase() === order.seller.toLowerCase();

  // Buyer: Confirm Delivery
  const handleConfirmDelivery = async () => {
    const confirm = window.confirm(
      "Apakah Anda telah menerima item game di akun Anda? Smart Contract akan langsung mencairkan dana escrow ke wallet penjual."
    );
    if (!confirm) return;

    setActionLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const payload = await chainConfirmDelivery(order.orderId);
      const txHash = await sendMarketplaceTx(payload.tx);
      await chainSubmit("confirm", txHash);

      setMsg(`Pengiriman telah berhasil dikonfirmasi! Dana telah dicairkan ke penjual.`);
      await fetchOrder();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Gagal mengonfirmasi pengiriman");
    } finally {
      setActionLoading(false);
    }
  };

  // Seller: Mark Shipped
  const handleMarkShippedSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const payload = await chainMarkShipped(order.orderId, deliveryNote);
      const txHash = await sendMarketplaceTx(payload.tx);
      await chainSubmit("ship", txHash, { deliveryNote });

      setMsg("Pesanan telah ditandai SHIPPED!");
      setShowShipModal(false);
      setDeliveryNote("");
      await fetchOrder();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Gagal menandai pengiriman");
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel & Refund
  const handleCancelOrder = async () => {
    const confirm = window.confirm(
      "Batalkan pesanan ini? Smart Contract akan otomatis mengembalikan (refund) seluruh ETH escrow ke wallet pembeli."
    );
    if (!confirm) return;

    setActionLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const payload = await chainCancelOrder(order.orderId);
      const txHash = await sendMarketplaceTx(payload.tx);
      await chainSubmit("cancel", txHash);

      setMsg("Pesanan berhasil dibatalkan dan direfund secara on-chain.");
      await fetchOrder();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Gagal membatalkan pesanan");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return null;

  if (err && !order) {
    return (
      <div className="order-detail-container">
        <div className="detail-error">
          <h2>Pesanan Tidak Ditemukan</h2>
          <p>{err}</p>
          <Link to="/orders" className="btn-secondary">
            ← Kembali ke Daftar Pesanan
          </Link>
        </div>
      </div>
    );
  }

  // Timeline Step Calculations
  const getStepStatus = (stepName) => {
    if (order.status === "CANCELLED") {
      if (stepName === "PAID_HELD") return "completed";
      if (stepName === "CANCELLED") return "current-cancelled";
      return "skipped";
    }

    const orderLevels = { PAID_HELD: 1, SHIPPED: 2, COMPLETED: 3 };
    const currentLvl = orderLevels[order.status] || 0;
    const thisLvl = orderLevels[stepName] || 0;

    if (currentLvl > thisLvl) return "completed";
    if (currentLvl === thisLvl) return "active";
    return "pending";
  };

  return (
    <div className="order-detail-container">
      <Link to="/orders" className="back-link">
        ← Kembali ke Semua Pesanan
      </Link>

      <div className="order-detail-header">
        <div>
          <span className="order-badge">ON-CHAIN ORDER TRACKER</span>
          <h1>Pesanan #{order.orderId}</h1>
          <p>
            Listing Referensi:{" "}
            <Link to={`/catalog/${order.listingId}`}>
              Listing #{order.listingId} ↗
            </Link>
          </p>
        </div>

        <div className="header-status-box">
          <span className={`status-pill status-${order.status?.toLowerCase()}`}>
            {order.status}
          </span>
          <span className={`escrow-tag escrow-${order.escrow}`}>
            Escrow State: {order.escrow}
          </span>
        </div>
      </div>

      {msg && <div className="detail-alert alert-success">✅ {msg}</div>}
      {err && <div className="detail-alert alert-error">⚠️ {err}</div>}

      {/* Visual Workflow Timeline */}
      <div className="timeline-card">
        <h3>Alur Status Transaksi Escrow</h3>

        <div className="timeline-track">
          {/* Step 1 */}
          <div className={`timeline-node ${getStepStatus("PAID_HELD")}`}>
            <div className="node-icon">1</div>
            <div className="node-label">
              <strong>PAID_HELD</strong>
              <span>Dana Terkunci di Escrow</span>
            </div>
          </div>
          <div className="timeline-line"></div>

          {/* Step 2 */}
          <div className={`timeline-node ${getStepStatus("SHIPPED")}`}>
            <div className="node-icon">2</div>
            <div className="node-label">
              <strong>SHIPPED</strong>
              <span>Aset Dikirim ke Akun Game</span>
            </div>
          </div>
          <div className="timeline-line"></div>

          {/* Step 3 */}
          <div className={`timeline-node ${getStepStatus("COMPLETED")}`}>
            <div className="node-icon">3</div>
            <div className="node-label">
              <strong>COMPLETED</strong>
              <span>Penerimaan Dikonfirmasi & Dana Cair</span>
            </div>
          </div>

          {order.status === "CANCELLED" && (
            <>
              <div className="timeline-line cancelled"></div>
              <div className="timeline-node current-cancelled">
                <div className="node-icon">✕</div>
                <div className="node-label">
                  <strong>CANCELLED</strong>
                  <span>Refund Otomatis ke Pembeli</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Order Details Grid */}
      <div className="detail-grid">
        {/* Left: Financial & Counterparty info */}
        <div className="detail-card">
          <h3>Informasi Transaksi & Escrow</h3>

          <div className="info-row">
            <span>Nilai Transaksi (ETH):</span>
            <strong className="eth-val">
              <span className="symbol">Ξ</span> {order.amountEth} ETH ({order.quantity} unit)
            </strong>
          </div>

          <div className="info-row">
            <span>Standar Pembayaran:</span>
            <span>NATIVE ETH (Smart Contract Escrow)</span>
          </div>

          <div className="info-row">
            <span>Alamat Pembeli (Buyer):</span>
            <code>{order.buyer}</code>
          </div>

          <div className="info-row">
            <span>Alamat Penjual (Seller):</span>
            <code>{order.seller}</code>
          </div>

          {order.buyerGameAccount && (
            <div className="info-row">
              <span>Akun Game Pembeli:</span>
              <strong className="game-acc">{order.buyerGameAccount}</strong>
            </div>
          )}

          {order.deliveryNote && (
            <div className="info-row delivery-note-row">
              <span>Catatan Pengiriman Seller:</span>
              <p className="note-box">{order.deliveryNote}</p>
            </div>
          )}

          {order.txHash && (
            <div className="info-row">
              <span>Tx Hash Terakhir:</span>
              <code>{order.txHash}</code>
            </div>
          )}
        </div>

        {/* Right: Actions and Escrow Protection */}
        <div className="detail-card actions-card">
          <h3>Tindakan Transaksi</h3>

          {/* Action: Buyer Confirm Delivery */}
          {isBuyer && order.status === "SHIPPED" && (
            <div className="action-box">
              <p>
                Barang sudah dikirim oleh penjual! Jika Anda sudah menerima item di akun game Anda, silakan konfirmasi penerimaan di bawah untuk mencairkan dana escrow ke penjual:
              </p>
              <button
                className="btn-primary btn-full"
                onClick={handleConfirmDelivery}
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Menandatangani Konfirmasi..."
                  : "✅ Konfirmasi Penerimaan Item (confirmDelivery)"}
              </button>
            </div>
          )}

          {/* Action: Seller Mark Shipped */}
          {isSeller && order.status === "PAID_HELD" && (
            <div className="action-box">
              <p>
                Pembeli telah mengunci dana di escrow. Kirimkan aset game ke akun pembeli, lalu tandai pesanan sebagai terkirim:
              </p>
              <button
                className="btn-primary btn-full"
                onClick={() => setShowShipModal(true)}
                disabled={actionLoading}
              >
                📦 Kirim Aset & Tandai SHIPPED
              </button>
            </div>
          )}

          {/* Action: Cancel Order before shipped */}
          {order.status === "PAID_HELD" && (isBuyer || isSeller) && (
            <div className="action-box cancel-box">
              <p>
                Pesanan belum dikirim. Baik pembeli maupun penjual berhak membatalkan pesanan. Smart Contract akan otomatis mengembalikan seluruh dana ke pembeli:
              </p>
              <button
                className="btn-cancel-full"
                onClick={handleCancelOrder}
                disabled={actionLoading}
              >
                ✕ Batalkan Pesanan & Refund Otomatis (cancelOrder)
              </button>
            </div>
          )}

          {order.status === "COMPLETED" && (
            <div className="status-finished-box completed">
              <div className="finished-icon">🎉</div>
              <div>
                <strong>Transaksi Selesai & Berhasil</strong>
                <p>
                  Dana kripto telah dicairkan dari akun escrow langsung ke wallet penjual. Seluruh log transaksi tercatat permanen di blockchain.
                </p>
              </div>
            </div>
          )}

          {order.status === "CANCELLED" && (
            <div className="status-finished-box cancelled">
              <div className="finished-icon">↩️</div>
              <div>
                <strong>Pesanan Telah Dibatalkan (Refund Sukses)</strong>
                <p>
                  Dana kripto pembeli telah dikembalikan secara otomatis oleh smart contract. Histori pesanan tetap tersimpan secara transparan di log on-chain.
                </p>
              </div>
            </div>
          )}

          {/* Escrow Mechanism Explainer */}
          <div className="escrow-explainer">
            <h4>Bagaimana Escrow Melindungi Anda?</h4>
            <ul>
              <li>
                <strong>Dana Terkunci:</strong> ETH pembeli dipegang oleh smart contract, bukan oleh pihak ketiga atau backend.
              </li>
              <li>
                <strong>Pencairan Otomatis:</strong> Hanya pembeli yang dapat memicu transfer dana ke penjual saat konfirmasi.
              </li>
              <li>
                <strong>Refund Terjamin:</strong> Jika barang tidak dikirim atau dibatalkan, smart contract mengembalikan dana 100%.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal: Mark Shipped */}
      {showShipModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <h3>Kirim Aset Game & Tandai SHIPPED</h3>
            <p>
              Kirimkan item game ke akun pembeli:{" "}
              <strong>
                {order.buyerGameAccount || order.buyer}
              </strong>
            </p>

            <form onSubmit={handleMarkShippedSubmit}>
              <div className="form-group">
                <label>Catatan Pengiriman / ID Transaksi Game:</label>
                <textarea
                  className="modal-textarea"
                  rows={3}
                  placeholder="Contoh: Aset dikirim via In-Game Trade ID #5512 ke akun pembeli."
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowShipModal(false)}
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
