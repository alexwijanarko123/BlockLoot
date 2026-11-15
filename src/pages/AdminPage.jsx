import { useEffect, useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { chainGrantSeller, chainSubmit, getHealthCheck } from "../services/api";
import { sendMarketplaceTx } from "../services/chain";
import "./AdminPage.css";

export default function AdminPage() {
  const { address } = useWeb3();

  const [sellerCandidate, setSellerCandidate] = useState("");
  const [lookupAddress, setLookupAddress] = useState("");
  const [lookupResult, setLookupResult] = useState(null);

  const [health, setHealth] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    getHealthCheck()
      .then((data) => setHealth(data))
      .catch((e) => console.log("Health check:", e.message));
  }, []);

  const handleGrantSeller = async (e) => {
    e.preventDefault();
    if (!sellerCandidate || !sellerCandidate.startsWith("0x")) {
      setErr("Alamat wallet tidak valid (harus diawali 0x).");
      return;
    }

    setActionLoading(true);
    setMsg(null);
    setErr(null);

    try {
      // 1. Ambil tx payload dari backend (grantRole(SELLER_ROLE, account))
      const payload = await chainGrantSeller(sellerCandidate.trim());

      // 2. Kirim transaksi ke blockchain lewat wallet Admin
      const txHash = await sendMarketplaceTx(payload.tx);

      // 3. Submit txHash ke backend
      await chainSubmit("grant-seller", txHash);

      setMsg(
        `Sukses! Role SELLER_ROLE berhasil diberikan ke ${sellerCandidate} secara on-chain. Tx: ${txHash}`
      );
      setSellerCandidate("");
    } catch (e) {
      console.error(e);
      setErr(e.message || "Gagal memberikan role seller");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!lookupAddress.trim()) return;
    try {
      const res = await fetch(
        `http://localhost:4000/api/auth/role/${lookupAddress.trim()}`
      );
      const data = await res.json();
      setLookupResult(data);
    } catch (e) {
      setErr(e.message || "Gagal melakukan lookup role");
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <span className="admin-badge">DEFAULT_ADMIN_ROLE</span>
        <h1>Admin Control Panel</h1>
        <p>
          Manajemen hak akses smart contract, delegasi peran SELLER_ROLE, dan monitoring konektivitas blockchain.
        </p>
      </div>

      {msg && <div className="admin-alert alert-success">✅ {msg}</div>}
      {err && <div className="admin-alert alert-error">⚠️ {err}</div>}

      {/* System Status Banner */}
      <div className="system-status-card">
        <div className="status-item">
          <span className="status-label">Koneksi Backend</span>
          <strong className="status-val text-green">Online</strong>
        </div>
        <div className="status-item">
          <span className="status-label">Kontrak On-Chain</span>
          <strong
            className={`status-val ${
              health?.chainConfigured ? "text-green" : "text-yellow"
            }`}
          >
            {health?.chainConfigured
              ? "Terkonfigurasi (Active)"
              : "Off-Chain Dev Mode"}
          </strong>
        </div>
        <div className="status-item">
          <span className="status-label">Admin Wallet Aktif</span>
          <code className="admin-addr">{address}</code>
        </div>
      </div>

      <div className="admin-grid">
        {/* Grant Seller Card */}
        <div className="admin-card">
          <h3>Beri Akses SELLER_ROLE (On-Chain)</h3>
          <p>
            Memberikan hak kepada pengguna untuk membuat listing aset game secara on-chain dengan memanggil fungsi <code>grantRole</code> di smart contract.
          </p>

          <form onSubmit={handleGrantSeller} className="admin-form">
            <div className="form-group">
              <label className="field-label">Alamat Wallet Penerima (0x...)</label>
              <input
                type="text"
                placeholder="0x..."
                value={sellerCandidate}
                onChange={(e) => setSellerCandidate(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={actionLoading}
            >
              {actionLoading
                ? "Menandatangani Transaksi di MetaMask..."
                : "🛡️ Beri SELLER_ROLE di Blockchain"}
            </button>
          </form>
        </div>

        {/* Role Lookup Card */}
        <div className="admin-card">
          <h3>Cek Role Wallet Pengguna</h3>
          <p>
            Periksa status hak akses pengguna apakah terdaftar sebagai ADMIN, SELLER, atau BUYER.
          </p>

          <form onSubmit={handleLookup} className="admin-form">
            <div className="form-group">
              <label className="field-label">Alamat Wallet (0x...)</label>
              <input
                type="text"
                placeholder="0x..."
                value={lookupAddress}
                onChange={(e) => setLookupAddress(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <button type="submit" className="btn-secondary">
              🔍 Cek Hak Akses
            </button>
          </form>

          {lookupResult && (
            <div className="lookup-result-box">
              <div className="result-row">
                <span>Alamat:</span>
                <code>{lookupResult.address}</code>
              </div>
              <div className="result-row">
                <span>Role Terdeteksi:</span>
                <span className={`role-pill role-${lookupResult.role?.toLowerCase()}`}>
                  {lookupResult.role}
                </span>
              </div>
              <div className="result-row">
                <span>Sumber Role:</span>
                <strong>{lookupResult.roleSource}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
