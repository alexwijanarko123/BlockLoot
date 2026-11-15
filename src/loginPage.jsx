import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useWeb3 } from './context/Web3Context';
import './login.css';

export default function Login() {
  const navigate = useNavigate();
  const { token, login, loading } = useWeb3();
  const [errorMessage, setErrorMessage] = useState('');

  if (token) return <Navigate to="/" replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      await login(); // connect MetaMask -> sign challenge -> JWT + role
      navigate('/');
    } catch (err) {
      setErrorMessage(err.message || 'Login gagal!');
    }
  };

  return (
    <div className="register-container">
      <div className="Brand">
        <h1>Blockloot</h1>
        <img src="#" alt="Logo" className="logo" />
      </div>

      <div className="register-card">
        <p className="subtitle">Login Page</p>
        <form onSubmit={handleLogin} className="register-form">
          <div className="input-group">
            <p className="web3-hint">
              Hubungkan wallet MetaMask dan tanda tangani pesan untuk masuk.
              Role (Admin / Seller / Buyer) dibaca dari smart contract.
            </p>
          </div>

          <div className="error-message">
            {errorMessage && <p>{errorMessage}</p>}
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Connecting...' : '🦊 Connect MetaMask'}
          </button>
          <p>
            <span className="link" onClick={() => navigate('/register')}>Sign Up</span>
          </p>
        </form>
      </div>
    </div>
  );
}
