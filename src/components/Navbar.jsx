import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { getProfile } from '../services/api';
import '../homepage.css';
import './Navbar.css';

const short = (a) => (a ? `${a.slice(0, 6)}...${a.slice(-4)}` : '');

export default function Navbar() {
  const navigate = useNavigate();
  const { address, token, role, logout } = useWeb3();
  const [name, setName] = useState('');

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    getProfile().then((p) => mounted && setName(p.displayName || '')).catch(() => {});
    return () => { mounted = false; };
  }, [token]);

  return (
    <header className="home-navbar">
      <Link to="/" className="brand-group" style={{ textDecoration: 'none' }}>
        <div className="brand-logo-circle" />
        <span className="brand-title">KrypGear</span>
      </Link>

      {token && (
        <nav className="nav-links">
          <NavLink to="/catalog">Catalog</NavLink>
          <NavLink to="/orders">Orders</NavLink>
          {(role === 'SELLER' || role === 'ADMIN') && <NavLink to="/seller">Seller</NavLink>}
          {role === 'ADMIN' && <NavLink to="/admin">Admin</NavLink>}
        </nav>
      )}

      {token ? (
        <div className="user-group">
          <div className="user-text">
            <span className="welcome-text">Welcome · {role}</span>
            <span className="username-text">{name || short(address)}</span>
          </div>
          <div
            className="user-avatar-circle"
            onClick={() => navigate('/profile')}
            title="Klik untuk melihat profil"
          />
          <button
            className="btn-logout"
            onClick={() => { logout(); navigate('/login'); }}
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="user-group">
          <button className="btn-connect-wallet" onClick={() => navigate('/login')}>Login</button>
        </div>
      )}
    </header>
  );
}
