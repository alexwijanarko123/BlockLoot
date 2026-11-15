import { Link, NavLink } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import "./Navbar.css";

function truncate(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function Navbar() {
  const { address, token, role, loading, login, logout } = useWeb3();

  return (
    <header className="navbar-wrapper">
      <nav className="navbar">
        <Link to="/" className="navbar__brand">
          <span className="brand-logo-icon">⚔️</span>
          <span className="brand-text">BlockLoot</span>
        </Link>

        <ul className="navbar__links">
          <li>
            <NavLink
              to="/catalog"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              🎮 Katalog Item
            </NavLink>
          </li>
          {token && (
            <>
              <li>
                <NavLink
                  to="/orders"
                  className={({ isActive }) => (isActive ? "active" : "")}
                >
                  📜 Pesanan & Escrow
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/profile"
                  className={({ isActive }) => (isActive ? "active" : "")}
                >
                  👤 Profil
                </NavLink>
              </li>
              {(role === "SELLER" || role === "ADMIN") && (
                <li>
                  <NavLink
                    to="/seller"
                    className={({ isActive }) =>
                      isActive ? "active seller-nav-link" : "seller-nav-link"
                    }
                  >
                    📦 Seller Dashboard
                  </NavLink>
                </li>
              )}
              {role === "ADMIN" && (
                <li>
                  <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                      isActive ? "active admin-nav-link" : "admin-nav-link"
                    }
                  >
                    🛡️ Admin
                  </NavLink>
                </li>
              )}
            </>
          )}
        </ul>

        <div className="navbar__right">
          {token && role && (
            <span className={`navbar__role-badge navbar__role-badge--${role}`}>
              {role}
            </span>
          )}

          {!token ? (
            <button
              className="navbar__connect-btn"
              onClick={login}
              disabled={loading}
            >
              <span className="fox-icon">🦊</span>
              <span>{loading ? "Menghubungkan..." : "Connect Wallet"}</span>
            </button>
          ) : (
            <div className="user-connected-group">
              <span className="wallet-chip" title={address}>
                <span className="connected-dot"></span>
                {truncate(address)}
              </span>
              <button
                className="navbar__logout-btn"
                onClick={logout}
                title="Disconnect Wallet"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
