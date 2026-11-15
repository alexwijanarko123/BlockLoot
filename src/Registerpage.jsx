import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useWeb3 } from './context/Web3Context';
import { updateProfile } from './services/api';
import './Register.css';

export default function Register() {
  const navigate = useNavigate();
  const { token, login, loading } = useWeb3();
  const [username, setUsername] = useState('');
  const [gameAccount, setGameAccount] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (token) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !gameAccount.trim()) {
      setErrorMessage('Semua kolom form wajib diisi!');
      return;
    }
    if (username.trim().length > 60) {
      setErrorMessage('Username maksimal 60 karakter!');
      return;
    }

    try {
      await login(); // wallet = identitas akun
      await updateProfile({ displayName: username.trim(), gameAccount: gameAccount.trim() });
      navigate('/');
    } catch (err) {
      setErrorMessage(err.message || 'Registrasi gagal!');
    }
  };

  return (
    <div className="register-container">
      <div className="Brand">
        <h1>Blockloot</h1>
        <img src="#" alt="Logo" className="logo" />
      </div>
      <div className="register-card">
        <p className="subtitle">Register Page</p>
        <form onSubmit={handleSubmit} className="register-form">
          <div className="input-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Akun Game</label>
            <input
              type="text"
              placeholder="ID akun game (tujuan item)"
              value={gameAccount}
              onChange={(e) => setGameAccount(e.target.value)}
            />
          </div>

          <div className="error-message">
            {errorMessage && <p>{errorMessage}</p>}
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Connecting...' : '🦊 Register with MetaMask'}
          </button>
          <p>
            <a
              href="/login"
              className="link"
              onClick={(e) => { e.preventDefault(); navigate('/login'); }}
            >
              Sign In
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
