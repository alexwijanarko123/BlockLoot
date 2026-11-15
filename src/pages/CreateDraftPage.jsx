import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { createDraft } from "../services/api";
import "./CreateDraftPage.css";

export default function CreateDraftPage() {
  const navigate = useNavigate();
  const { role } = useWeb3();

  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [priceEth, setPriceEth] = useState("0.05");
  const [stock, setStock] = useState("1");
  const [assetStandard, setAssetStandard] = useState("ERC-1155");
  const [assetContract, setAssetContract] = useState("");
  const [tokenId, setTokenId] = useState("");

  // Key-value stats list
  const [stats, setStats] = useState([
    { key: "Rarity", value: "Legendary" },
    { key: "Attack", value: "150" },
    { key: "Durability", value: "100%" },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleStandardChange = (std) => {
    setAssetStandard(std);
    if (std === "ERC-721") {
      setStock("1");
    }
  };

  const addStatField = () => {
    setStats([...stats, { key: "", value: "" }]);
  };

  const removeStatField = (index) => {
    setStats(stats.filter((_, i) => i !== index));
  };

  const updateStatField = (index, field, val) => {
    const next = [...stats];
    next[index][field] = val;
    setStats(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      setError("Silakan unggah gambar HD item game Anda!");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("story", story);
      formData.append("image", imageFile);
      formData.append("priceEth", priceEth);
      formData.append("stock", assetStandard === "ERC-721" ? "1" : stock);
      formData.append("assetStandard", assetStandard);

      if (assetContract.trim()) {
        formData.append("assetContract", assetContract.trim());
      }
      if (tokenId.trim()) {
        formData.append("tokenId", tokenId.trim());
      }

      // Convert stats to JSON object
      const statsObj = {};
      stats.forEach(({ key, value }) => {
        const k = key.trim();
        if (k) statsObj[k] = value.trim();
      });
      formData.append("stats", JSON.stringify(statsObj));

      await createDraft(formData);
      navigate("/seller");
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal membuat draft item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-draft-container">
      <Link to="/seller" className="back-link">
        ← Kembali ke Dashboard Seller
      </Link>

      <div className="create-draft-header">
        <h1>Unggah Detail Item Game (Off-Chain Media)</h1>
        <p>
          Simpan gambar HD, cerita item, dan statistik RPG Anda secara off-chain sebelum me-listing ke Smart Contract on-chain.
        </p>
      </div>

      {error && <div className="create-error-box">⚠️ {error}</div>}

      <form onSubmit={handleSubmit} className="create-draft-form">
        <div className="form-grid">
          {/* Left Column: Media & Standard */}
          <div className="form-column">
            {/* Image Upload */}
            <div className="form-group">
              <label className="field-label">Gambar HD Item Game *</label>
              <div
                className={`image-upload-dropzone ${
                  imagePreview ? "has-preview" : ""
                }`}
                onClick={() => document.getElementById("item-image-input").click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="preview-img" />
                ) : (
                  <div className="dropzone-hint">
                    <span className="upload-icon">🖼️</span>
                    <p>Klik untuk memilih file gambar (PNG, JPG, WEBP, GIF)</p>
                    <span className="file-limit">Maksimal 8 MB</span>
                  </div>
                )}
                <input
                  id="item-image-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                />
              </div>
            </div>

            {/* Asset Standard Radio */}
            <div className="form-group">
              <label className="field-label">Standar Aset Blockchain *</label>
              <div className="standard-radio-cards">
                <div
                  className={`radio-card ${
                    assetStandard === "ERC-1155" ? "selected" : ""
                  }`}
                  onClick={() => handleStandardChange("ERC-1155")}
                >
                  <div className="radio-card-header">
                    <input
                      type="radio"
                      name="standard"
                      checked={assetStandard === "ERC-1155"}
                      onChange={() => handleStandardChange("ERC-1155")}
                    />
                    <strong>ERC-1155 (Multi-Stok)</strong>
                  </div>
                  <p>Cocok untuk item game semi-fungible dengan stok lebih dari 1 (potion, mata uang, material).</p>
                </div>

                <div
                  className={`radio-card ${
                    assetStandard === "ERC-721" ? "selected" : ""
                  }`}
                  onClick={() => handleStandardChange("ERC-721")}
                >
                  <div className="radio-card-header">
                    <input
                      type="radio"
                      name="standard"
                      checked={assetStandard === "ERC-721"}
                      onChange={() => handleStandardChange("ERC-721")}
                    />
                    <strong>ERC-721 (NFT Langka 1-of-1)</strong>
                  </div>
                  <p>Item game unik dengan stok tepat 1 unit (senjata legendaris, skin eksklusif, akun).</p>
                </div>
              </div>
            </div>

            {/* Optional contract / token id */}
            <div className="form-row-2">
              <div className="form-group">
                <label className="field-label">Alamat Smart Contract NFT (Opsional)</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={assetContract}
                  onChange={(e) => setAssetContract(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="field-label">Token ID NFT (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: 1042"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Title, Lore, Pricing, Stats */}
          <div className="form-column">
            <div className="form-group">
              <label className="field-label">Nama / Judul Item Game *</label>
              <input
                type="text"
                placeholder="Contoh: Excalibur Holy Blade +10"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="field-label">Cerita & Lore Item (Story) *</label>
              <textarea
                rows={4}
                placeholder="Tuliskan latar belakang item, server game, efek unik..."
                value={story}
                onChange={(e) => setStory(e.target.value)}
                required
                className="form-textarea"
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="field-label">Harga Satuan (NATIVE ETH) *</label>
                <div className="input-with-symbol">
                  <span className="symbol-prefix">Ξ</span>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    placeholder="0.05"
                    value={priceEth}
                    onChange={(e) => setPriceEth(e.target.value)}
                    required
                    className="form-input symbol-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="field-label">
                  Jumlah Stok Terbatas *{" "}
                  {assetStandard === "ERC-721" && (
                    <span className="hint-locked">(Terkunci 1 untuk ERC-721)</span>
                  )}
                </label>
                <input
                  type="number"
                  min="1"
                  value={assetStandard === "ERC-721" ? "1" : stock}
                  onChange={(e) => setStock(e.target.value)}
                  disabled={assetStandard === "ERC-721"}
                  required
                  className="form-input"
                />
              </div>
            </div>

            {/* Dynamic Stats */}
            <div className="form-group">
              <div className="stats-header-row">
                <label className="field-label">Statistik & Atribut RPG</label>
                <button
                  type="button"
                  onClick={addStatField}
                  className="btn-add-stat"
                >
                  + Tambah Atribut
                </button>
              </div>

              <div className="stats-list">
                {stats.map((s, idx) => (
                  <div key={idx} className="stat-input-row">
                    <input
                      type="text"
                      placeholder="Nama (e.g. Damage)"
                      value={s.key}
                      onChange={(e) =>
                        updateStatField(idx, "key", e.target.value)
                      }
                      className="form-input"
                    />
                    <input
                      type="text"
                      placeholder="Nilai (e.g. 250)"
                      value={s.value}
                      onChange={(e) =>
                        updateStatField(idx, "value", e.target.value)
                      }
                      className="form-input"
                    />
                    <button
                      type="button"
                      onClick={() => removeStatField(idx)}
                      className="btn-remove-stat"
                      title="Hapus Atribut"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="form-submit-bar">
          <Link to="/seller" className="btn-secondary">
            Batal
          </Link>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Menyimpan Media Off-Chain..." : "💾 Simpan Draft Off-Chain"}
          </button>
        </div>
      </form>
    </div>
  );
}
