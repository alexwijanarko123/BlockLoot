import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { getProfile, updateProfile } from "../services/api";
import "./ProfilePage.css";

export default function ProfilePage() {
  const { address, role } = useWeb3();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [gameAccount, setGameAccount] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getProfile()
      .then((data) => {
        if (mounted && data) {
          setDisplayName(data.displayName || "");
          setBio(data.bio || "");
          setGameAccount(data.gameAccount || "");
        }
      })
      .catch((e) => {
        if (mounted) setErr(e.message || "Gagal memuat profil");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);

    try {
      await updateProfile({ displayName, bio, gameAccount });
      setMsg("Profil berhasil diperbarui!");
    } catch (e) {
      setErr(e.message || "Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Profil Pengguna Web3</h1>
        <p>
          Kelola identitas off-chain Anda dan cantumkan akun game untuk penerimaan item game langsung.
        </p>
      </div>

      {msg && <div className="profile-alert alert-success">✅ {msg}</div>}
      {err && <div className="profile-alert alert-error">⚠️ {err}</div>}

      <div className="profile-layout">
        {/* Left: Card Overview */}
        <div className="profile-card-overview">
          <div className="avatar-placeholder">🎮</div>

          <h2 className="profile-user-name">
            {displayName || "Unnamed Player"}
          </h2>

          <div className="profile-role-badge-row">
            <span className={`role-badge role-${role?.toLowerCase()}`}>
              {role || "BUYER"}
            </span>
          </div>

          <div className="wallet-address-box">
            <span className="box-label">Wallet Address</span>
            <code>{address}</code>
          </div>

          {gameAccount && (
            <div className="game-account-box">
              <span className="box-label">Akun Game Terdaftar</span>
              <strong>{gameAccount}</strong>
            </div>
          )}

          {role === "SELLER" && (
            <div className="seller-quick-links">
              <Link to="/seller" className="btn-secondary btn-full">
                📦 Buka Seller Dashboard
              </Link>
            </div>
          )}

          {role === "ADMIN" && (
            <div className="admin-quick-links">
              <Link to="/admin" className="btn-secondary btn-full">
                🛡️ Buka Admin Panel
              </Link>
            </div>
          )}
        </div>

        {/* Right: Edit Form */}
        <div className="profile-card-form">
          <h3>Edit Profil & Akun Game</h3>

          {loading ? (
            <div className="profile-loading">Memuat data profil...</div>
          ) : (
            <form onSubmit={handleSave} className="profile-edit-form">
              <div className="form-group">
                <label className="field-label">Nama Tampilan (Display Name)</label>
                <input
                  type="text"
                  placeholder="Contoh: ShadowHunter99"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={60}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="field-label">
                  ID Akun Game (Game Account) *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Steam ID: 76561198... / Riot: player#NA1 / Mobile Legends ID"
                  value={gameAccount}
                  onChange={(e) => setGameAccount(e.target.value)}
                  maxLength={80}
                  className="form-input"
                />
                <span className="input-hint">
                  ℹ️ Akun game ini akan dilihat oleh penjual saat mengirimkan item game yang Anda beli.
                </span>
              </div>

              <div className="form-group">
                <label className="field-label">Bio Singkat</label>
                <textarea
                  rows={4}
                  placeholder="Tuliskan pengalaman gaming, guild, atau reputasi Anda..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                  className="form-textarea"
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? "Menyimpan Perubahan..." : "💾 Simpan Profil"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
