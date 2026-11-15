import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { chainBuyItem, chainSubmit, getCatalogItem } from "../services/api";
import { sendMarketplaceTx } from "../services/chain";
import "./ItemDetailPage.css";

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { address, token, role, login, loading: authLoading } = useWeb3();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const [buySuccess, setBuySuccess] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    getCatalogItem(id)
      .then((data) => {
        if (mounted) {
          setItem(data);
          if (data.assetStandard === "ERC-721") {
            setQuantity(1);
          }
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message || "Item tidak ditemukan");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const isOwner =
    address &&
    item?.seller &&
    address.toLowerCase() === item.seller.toLowerCase();

  const isAvailable =
    item?.status === "ACTIVE" && Number(item?.stock || 0) > 0;

  const totalEth = item?.price
    ? (parseFloat(item.price) * quantity).toFixed(4)
    : "0";

  const handleBuy = async () => {
    if (!token) {
      await login();
      return;
    }

    if (isOwner) {
      alert("Anda tidak dapat membeli item milik Anda sendiri!");
      return;
    }

    const listingId = item.listingId || item.id;
    if (!listingId) {
      alert("Item ini belum terdaftar di blockchain (masih draft off-chain).");
      return;
    }

    setBuying(true);
    setError(null);

    try {
      // 1. Dapatkan objek payload transaksi dari backend
      const txPayload = await chainBuyItem(listingId, quantity);

      // 2. Kirim transaksi ke blockchain lewat MetaMask
      const txHash = await sendMarketplaceTx(txPayload.tx);

      // 3. Laporkan receipt ke backend untuk update indexer / orders
      const submitRes = await chainSubmit("buy", txHash);

      setBuySuccess({
        txHash,
        message: "Pesanan berhasil dibuat! Dana kripto Anda telah aman terkunci di Smart Contract Escrow.",
      });
    } catch (err) {
      console.error("Buy error:", err);
      setError(err.message || "Gagal melakukan transaksi pembelian");
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="detail-container">
        <div className="detail-loading">
          <div className="spinner"></div>
          <p>Memuat detail item...</p>
        </div>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="detail-container">
        <div className="detail-error">
          <h2>Item Tidak Ditemukan</h2>
          <p>{error}</p>
          <Link to="/catalog" className="btn-secondary">
            ← Kembali ke Katalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-container">
      <Link to="/catalog" className="back-link">
        ← Kembali ke Katalog
      </Link>

      {buySuccess && (
        <div className="success-banner">
          <div className="banner-icon">🎉</div>
          <div className="banner-text">
            <h3>Pembelian Sukses (Status: PAID_HELD)</h3>
            <p>{buySuccess.message}</p>
            <p className="tx-hash">
              Tx Hash: <code>{buySuccess.txHash}</code>
            </p>
            <div className="banner-actions">
              <Link to="/orders" className="btn-primary">
                Lihat Pesanan Saya di Escrow →
              </Link>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error-banner">⚠️ {error}</div>}

      <div className="detail-layout">
        {/* Left Column: Media */}
        <div className="detail-media-column">
          <div className="detail-media-card">
            {item.image ? (
              <img src={item.image} alt={item.title} className="detail-image" />
            ) : (
              <div className="detail-placeholder">🎮</div>
            )}
            <div className="media-badges">
              {item.assetStandard && (
                <span className={`badge-pill badge-${item.assetStandard.toLowerCase()}`}>
                  {item.assetStandard}
                </span>
              )}
              <span className={`badge-pill status-${item.status?.toLowerCase()}`}>
                {item.status || "ACTIVE"}
              </span>
            </div>
          </div>

          {/* Off-chain Metadata Info Card */}
          <div className="metadata-card">
            <h4>Penyimpanan Off-chain & On-chain Log</h4>
            <div className="meta-row">
              <span>Payment:</span>
              <strong>NATIVE ETH (Escrow)</strong>
            </div>
            {item.metadataURI && (
              <div className="meta-row">
                <span>Metadata URI:</span>
                <a href={item.metadataURI} target="_blank" rel="noreferrer">
                  Buka JSON Metadata ↗
                </a>
              </div>
            )}
            {item.tokenId && (
              <div className="meta-row">
                <span>Token ID:</span>
                <code>{item.tokenId}</code>
              </div>
            )}
            {item.assetContract && (
              <div className="meta-row">
                <span>Asset Contract:</span>
                <code>{item.assetContract}</code>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Details & Buy Section */}
        <div className="detail-info-column">
          <h1 className="detail-title">{item.title}</h1>

          {/* Seller Pill */}
          <div className="seller-badge-row">
            <span>Penjual (Seller):</span>
            <code className="seller-address">{item.seller}</code>
            {isOwner && <span className="owner-tag">(Anda)</span>}
          </div>

          {/* Story / Lore */}
          <div className="detail-section">
            <h3>Cerita & Lore Item</h3>
            <p className="item-story-text">
              {item.story || "Penjual belum menambahkan deskripsi cerita untuk item ini."}
            </p>
          </div>

          {/* Stats & Attributes */}
          {item.stats && Object.keys(item.stats).length > 0 && (
            <div className="detail-section">
              <h3>Statistik & Atribut RPG</h3>
              <div className="stats-grid">
                {Object.entries(item.stats).map(([k, v]) => (
                  <div key={k} className="stat-card">
                    <span className="stat-name">{k}</span>
                    <span className="stat-value">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Purchase / Escrow Box */}
          <div className="purchase-card">
            <div className="purchase-price-row">
              <div>
                <span className="purchase-label">Harga per Unit</span>
                <div className="purchase-price">
                  <span className="eth-symbol">Ξ</span> {item.price} ETH
                </div>
              </div>
              <div className="purchase-stock">
                <span className="purchase-label">Stok Tersedia</span>
                <span className="stock-number">{item.stock} item</span>
              </div>
            </div>

            {isAvailable ? (
              <div className="purchase-actions">
                {item.assetStandard !== "ERC-721" && (
                  <div className="quantity-row">
                    <label>Jumlah Beli:</label>
                    <div className="quantity-control">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1 || buying}
                      >
                        -
                      </button>
                      <span>{quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((q) =>
                            Math.min(Number(item.stock), q + 1)
                          )
                        }
                        disabled={quantity >= Number(item.stock) || buying}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                <div className="total-calculation">
                  <span>Total yang dikunci ke Escrow:</span>
                  <strong>{totalEth} ETH</strong>
                </div>

                {isOwner ? (
                  <div className="owner-notice">
                    ℹ️ Anda adalah pemilik listing ini. Gunakan Seller Dashboard untuk mengelola pesanan.
                  </div>
                ) : (
                  <button
                    className="btn-buy-escrow"
                    onClick={handleBuy}
                    disabled={buying || authLoading}
                  >
                    {buying
                      ? "Memproses Transaksi On-chain..."
                      : !token
                      ? "🦊 Hubungkan Wallet & Beli"
                      : "🔒 Beli Sekarang (Kunci Dana di Escrow)"}
                  </button>
                )}

                <div className="escrow-assurance">
                  <div className="shield-icon">🛡️</div>
                  <p>
                    <strong>Jaminan Aman:</strong> Dana Anda tidak langsung dikirim ke penjual, melainkan dikunci di Smart Contract Escrow hingga Anda mengonfirmasi penerimaan aset di akun game Anda.
                  </p>
                </div>
              </div>
            ) : (
              <div className="unavailable-notice">
                {item.status === "CANCELLED"
                  ? "❌ Item ini telah di-delist oleh penjual."
                  : "❌ Stok item ini telah habis terjual."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
