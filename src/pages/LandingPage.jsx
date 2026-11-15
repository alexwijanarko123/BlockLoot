import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { getProducts } from "../services/api";
import "./LandingPage.css";

export default function LandingPage() {
  const { address, token, role, login, loading } = useWeb3();
  const [featured, setFeatured] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getProducts()
      .then((data) => {
        if (mounted) setFeatured((data || []).slice(0, 4));
      })
      .catch((err) => console.log("Catalog fetch notice:", err.message))
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="landing-container">
      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-badge">
          <span className="pulse-dot"></span>
          <span>Web3 Powered Game Marketplace</span>
        </div>
        <h1 className="hero-title">
          Trade Game Items at the Speed <br />
          <span className="gradient-text">of Blockchain.</span>
        </h1>
        <p className="hero-subtext">
          Marketplace terdesentralisasi dengan Escrow Smart Contract otomatis.
          Dana pembeli aman terkunci hingga aset diterima secara transparan.
        </p>

        <div className="hero-cta-group">
          {!token ? (
            <button className="btn-primary" onClick={login} disabled={loading}>
              {loading ? "Menghubungkan..." : "🦊 Connect MetaMask"}
            </button>
          ) : (
            <Link to="/catalog" className="btn-primary">
              🚀 Jelajahi Katalog
            </Link>
          )}
          <Link to="/catalog" className="btn-secondary">
            Buka Katalog Visual
          </Link>
          {token && (role === "SELLER" || role === "ADMIN") && (
            <Link to="/seller" className="btn-seller-badge">
              📦 Seller Dashboard
            </Link>
          )}
        </div>
      </section>

      {/* Role Flow Explanation */}
      <section className="landing-roles">
        <div className="section-header">
          <h2>Hak Akses Berdasarkan Smart Contract Role</h2>
          <p>
            Alamat wallet Anda secara on-chain menentukan otoritas dan peran:
          </p>
        </div>

        <div className="role-cards-grid">
          <div className="role-card role-buyer">
            <div className="role-icon">🎮</div>
            <h3>Buyer (Pembeli)</h3>
            <p>
              Menjelajahi katalog off-chain dengan media HD & spek lengkap.
              Melakukan checkout dengan mengunci Native ETH ke dalam Smart
              Contract Escrow (status <strong>PAID_HELD</strong>). Mengonfirmasi
              penerimaan item (<strong>CONFIRM_DELIVERY</strong>) untuk mencairkan
              dana ke penjual.
            </p>
          </div>

          <div className="role-card role-seller">
            <div className="role-icon">⚔️</div>
            <h3>Seller (Penjual)</h3>
            <p>
              Mengunggah draft item off-chain (gambar HD, statistik RPG, lore).
              Me-listing aset ke smart contract on-chain (<strong>listItem</strong>)
              dengan batas stok dan harga ETH. Mengirim item ke akun game pembeli
              dan memperbarui status menjadi <strong>SHIPPED</strong>.
            </p>
          </div>

          <div className="role-card role-admin">
            <div className="role-icon">🛡️</div>
            <h3>Admin (Marketplace)</h3>
            <p>
              Pemegang role DEFAULT_ADMIN_ROLE. Memverifikasi dan memberikan
              otoritas <strong>SELLER_ROLE</strong> kepada akun penjual tepercaya
              secara langsung di smart contract (<strong>grantRole</strong>).
            </p>
          </div>
        </div>
      </section>

      {/* Escrow Mechanism Step by Step */}
      <section className="landing-workflow">
        <div className="section-header">
          <h2>Alur Transaksi & Keamanan Escrow</h2>
          <p>Perlindungan anti-penipuan 100% on-chain</p>
        </div>

        <div className="workflow-steps">
          <div className="step-item">
            <div className="step-number">1</div>
            <h4>Off-chain Draft & On-chain Listing</h4>
            <p>
              Seller mengunggah data media & spek item, lalu menandatangani
              transaksi <code>listItem</code> di blockchain.
            </p>
          </div>
          <div className="step-arrow">➔</div>

          <div className="step-item">
            <div className="step-number">2</div>
            <h4>Order & Lock Escrow</h4>
            <p>
              Buyer checkout <code>buyItem</code>. ETH otomatis terkunci di
              escrow contract dengan status <strong>PAID_HELD</strong>.
            </p>
          </div>
          <div className="step-arrow">➔</div>

          <div className="step-item">
            <div className="step-number">3</div>
            <h4>Kirim Aset Game</h4>
            <p>
              Seller mentransfer aset langsung ke akun game Buyer dan menandai
              pesanan sebagai <strong>SHIPPED</strong>.
            </p>
          </div>
          <div className="step-arrow">➔</div>

          <div className="step-item">
            <div className="step-number">4</div>
            <h4>Konfirmasi & Pencairan</h4>
            <p>
              Buyer klik <code>confirmDelivery</code>. Escrow contract otomatis
              mentransfer ETH ke wallet Seller (<strong>COMPLETED</strong>).
            </p>
          </div>
        </div>

        <div className="refund-callout">
          <span className="callout-icon">↩️</span>
          <div>
            <strong>Mekanisme Pembatalan & Soft-delete Delist:</strong>
            <p>
              Jika pesanan dibatalkan sebelum pengiriman (<code>cancelOrder</code>)
              atau Seller menghapus listing (<code>delistItem</code>), kontrak
              menjalankan soft-delete status <strong>CANCELLED</strong> dan
              mengembalikan dana (refund) ke Buyer secara instan tanpa perantara.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Items Preview */}
      <section className="landing-featured">
        <div className="section-header-row">
          <div>
            <h2>Katalog Item Unggulan</h2>
            <p>Item game langka terverifikasi ERC-721 / ERC-1155</p>
          </div>
          <Link to="/catalog" className="link-see-all">
            Lihat Semua Item →
          </Link>
        </div>

        {isLoading ? (
          <div className="loading-state">Memuat katalog...</div>
        ) : featured.length === 0 ? (
          <div className="empty-featured">
            <p>Belum ada item aktif di katalog saat ini.</p>
            {token && role === "SELLER" && (
              <Link to="/seller/drafts/new" className="btn-secondary">
                + Tambah Item Baru
              </Link>
            )}
          </div>
        ) : (
          <div className="featured-grid">
            {featured.map((item) => (
              <Link
                key={item.id}
                to={`/catalog/${item.id}`}
                className="featured-card"
              >
                <div className="featured-img-wrap">
                  {item.image ? (
                    <img src={item.image} alt={item.title} />
                  ) : (
                    <div className="img-placeholder">🎮</div>
                  )}
                </div>
                <div className="featured-info">
                  <h4 className="item-title">{item.title}</h4>
                  <div className="item-meta">
                    <span className="price-tag">
                      <span className="eth-symbol">Ξ</span> {item.price} ETH
                    </span>
                    <span className="stock-tag">Stok: {item.stock}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
