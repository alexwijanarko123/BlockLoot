import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCatalog } from "../services/api";
import "./CatalogPage.css";

export default function CatalogPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [standardFilter, setStandardFilter] = useState("ALL");
  const [error, setError] = useState(null);

  const fetchItems = () => {
    setLoading(true);
    setError(null);
    getCatalog({ status: statusFilter === "ALL" ? "" : statusFilter, q: search })
      .then((data) => setItems(data || []))
      .catch((err) => setError(err.message || "Gagal memuat katalog"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItems();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchItems();
  };

  const filteredItems = items.filter((item) => {
    if (standardFilter === "ALL") return true;
    return item.assetStandard === standardFilter;
  });

  const formatAddress = (addr) => {
    if (!addr) return "-";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="catalog-container">
      <div className="catalog-header">
        <div>
          <h1 className="catalog-title">Katalog Aset Game</h1>
          <p className="catalog-subtitle">
            Jelajahi item on-chain terverifikasi. Transaksi aman dilindungi Escrow Smart Contract.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="catalog-controls">
        <form onSubmit={handleSearchSubmit} className="catalog-search-form">
          <input
            type="text"
            className="catalog-search-input"
            placeholder="Cari item game, senjata, akun..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="catalog-search-btn">
            🔍 Cari
          </button>
        </form>

        <div className="filter-group">
          <div className="select-wrap">
            <label>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="catalog-select"
            >
              <option value="ACTIVE">Aktif (Tersedia)</option>
              <option value="ALL">Semua Status</option>
              <option value="CANCELLED">Delisted / Batal</option>
            </select>
          </div>

          <div className="select-wrap">
            <label>Standar Aset:</label>
            <select
              value={standardFilter}
              onChange={(e) => setStandardFilter(e.target.value)}
              className="catalog-select"
            >
              <option value="ALL">Semua Standar</option>
              <option value="ERC-721">ERC-721 (NFT Langka 1-of-1)</option>
              <option value="ERC-1155">ERC-1155 (Multi-Stok)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      {error && <div className="catalog-error-box">⚠️ {error}</div>}

      {loading ? null : filteredItems.length === 0 ? (
        <div className="catalog-empty">
          <div className="empty-icon">🎮</div>
          <h3>Tidak Ada Item Ditemukan</h3>
          <p>Coba ubah kata kunci pencarian atau filter status item di atas.</p>
        </div>
      ) : (
        <div className="catalog-grid">
          {filteredItems.map((item) => (
            <Link
              key={item.id}
              to={`/catalog/${item.listingId || item.id}`}
              className="catalog-card"
            >
              <div className="card-media">
                {item.image ? (
                  <img src={item.image} alt={item.title} />
                ) : (
                  <div className="media-placeholder">⚔️</div>
                )}
                {item.assetStandard && (
                  <span className={`badge-standard badge-${item.assetStandard.toLowerCase()}`}>
                    {item.assetStandard}
                  </span>
                )}
                <span
                  className={`badge-status status-${
                    item.status ? item.status.toLowerCase() : "active"
                  }`}
                >
                  {item.status || "ACTIVE"}
                </span>
              </div>

              <div className="card-content">
                <h3 className="card-item-title">{item.title}</h3>
                <p className="card-item-story">{item.story || "Tidak ada deskripsi cerita."}</p>

                {item.stats && Object.keys(item.stats).length > 0 && (
                  <div className="card-stats-tags">
                    {Object.entries(item.stats)
                      .slice(0, 3)
                      .map(([k, v]) => (
                        <span key={k} className="stat-pill">
                          {k}: {String(v)}
                        </span>
                      ))}
                  </div>
                )}

                <div className="card-footer">
                  <div className="price-box">
                    <span className="price-label">Harga</span>
                    <span className="price-val">
                      <span className="symbol">Ξ</span> {item.price} ETH
                    </span>
                  </div>
                  <div className="stock-box">
                    <span className="stock-label">Stok Tersedia</span>
                    <span className="stock-val">{item.stock} item</span>
                  </div>
                </div>

                <div className="card-seller-info">
                  <span>Seller: {formatAddress(item.seller)}</span>
                  <span className="view-detail-hint">Detail Item →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
