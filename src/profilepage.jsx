import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from './context/Web3Context';
import { getProfile, updateProfile } from './services/api';
import './profilepage.css';

export default function ProfilePage() {
  const { address, role, logout } = useWeb3();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [gameAccount, setGameAccount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    getProfile()
      .then((p) => {
        if (!mounted) return;
        setDisplayName(p.displayName || '');
        setBio(p.bio || '');
        setGameAccount(p.gameAccount || '');
      })
      .catch((e) => mounted && setErr(e.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(''); setErr('');
    try {
      await updateProfile({ displayName, bio, gameAccount });
      setMsg('Profil berhasil disimpan.');
    } catch (e2) {
      setErr(e2.message || 'Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar" />
        <h2 className="profile-name">{displayName || 'Unnamed Player'}</h2>
        <span className={`profile-role profile-role-${(role || 'BUYER').toLowerCase()}`}>{role || 'BUYER'}</span>
        <code className="profile-address">{address}</code>

        <div className="profile-links">
          <Link to="/orders" className="profile-link">Pesanan</Link>
          {(role === 'SELLER' || role === 'ADMIN') && <Link to="/seller" className="profile-link">Seller Dashboard</Link>}
          {role === 'ADMIN' && <Link to="/admin" className="profile-link">Admin</Link>}
        </div>
      </div>

      <form className="profile-form" onSubmit={handleSave}>
        <p className="profile-title">Edit Profile</p>
        {loading ? null : (
          <>
            <input type="text" placeholder="Username" maxLength={60}
              value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <input type="text" placeholder="Akun Game (tujuan pengiriman item)" maxLength={80}
              value={gameAccount} onChange={(e) => setGameAccount(e.target.value)} />
            <textarea placeholder="Bio" rows={4} maxLength={500}
              value={bio} onChange={(e) => setBio(e.target.value)} />
            <p className="profile-hint">Akun game dilihat seller saat mengirim item yang Anda beli.</p>
            {msg && <p className="profile-msg">{msg}</p>}
            {err && <p className="profile-err">{err}</p>}
            <div className="profile-actions">
              <button type="submit" className="btn-submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" className="btn-submit profile-logout" onClick={logout}>Logout</button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
