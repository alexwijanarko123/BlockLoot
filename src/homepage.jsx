import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWeb3 } from './context/Web3Context';
import { getProducts } from './services/api';
import './homepage.css';

const formatAddress = (addr) =>
  addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : '';

export default function Homepage() {
  const navigate = useNavigate();
  const { address, token, role, login, loading: isConnecting, error: walletError } = useWeb3();

  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sortAsc, setSortAsc] = useState(null); // null | true | false
  const [reloadKey, setReloadKey] = useState(0);

  // Ambil produk aktif dari backend (data on-chain + off-chain)
  useEffect(() => {
    let mounted = true;
    getProducts()
      .then((data) => mounted && setProducts(data || []))
      .catch((err) => console.error('Gagal mengambil produk:', err))
      .finally(() => mounted && setIsLoading(false));
    return () => { mounted = false; };
  }, [reloadKey]);

  const reload = () => { setIsLoading(true); setReloadKey((k) => k + 1); };

  let filteredProducts = products.filter((item) =>
    (item.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  if (sortAsc !== null) {
    filteredProducts = [...filteredProducts].sort((a, b) =>
      sortAsc ? parseFloat(a.price) - parseFloat(b.price) : parseFloat(b.price) - parseFloat(a.price)
    );
  }

  const canSell = token && (role === 'SELLER' || role === 'ADMIN');

  return (
    <>
      {/* ---------- Complete Credential / MetaMask ---------- */}
      <div className="credential-section">
        {!token ? (
          <div className="credential-card">
            <div className="credential-info">
              <span className="credential-badge">Pending Credential</span>
              <p>Complete your credential by connecting your Web3 wallet</p>
            </div>
            <button className="btn-connect-wallet" onClick={login} disabled={isConnecting}>
              {isConnecting ? 'Connecting...' : '🦊 Connect MetaMask'}
            </button>
          </div>
        ) : (
          <div className="wallet-connected-pill">
            <span className="dot-green" />
            <span>
              Wallet Connected: <strong>{formatAddress(address)}</strong> · {role}
            </span>
          </div>
        )}
        {walletError && !token && <p className="wallet-error">{walletError}</p>}
      </div>

      {/* ---------- Hero Tagline ---------- */}
      <section className="hero-section">
        <h1 className="hero-tagline">
          Trade Game Items at the Speed<br />
          of Blockchain.
        </h1>

        <div className="search-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Search Product"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </section>

      {/* ---------- Actions Bar ---------- */}
      <div className="actions-bar">
        <button className="btn-product-highlight" type="button" onClick={() => { setSortAsc(null); setSearchQuery(''); reload(); }}>
          <span className="fire-icon">🔥</span>
          <span>Product Highlight</span>
        </button>

        <button
          className="btn-filter"
          type="button"
          onClick={() => setSortAsc((v) => (v === null ? true : v ? false : null))}
          title="Urutkan berdasarkan harga"
        >
          <svg className="filter-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span>Filter{sortAsc === null ? '' : sortAsc ? ' ↑ Harga' : ' ↓ Harga'}</span>
        </button>
      </div>

      <div className="divider-line" />

      {/* ---------- Content Area ---------- */}
      <main className="content-area">
        {isLoading ? null : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <h2 className="empty-title">No Item Found</h2>
            {canSell ? (
              <button className="btn-add-items" type="button" onClick={() => navigate('/seller/drafts/new')}>
                Add More Items
              </button>
            ) : (
              <button className="btn-add-items" type="button" onClick={() => { setSearchQuery(''); reload(); }}>
                Refresh
              </button>
            )}
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((item) => (
              <Link key={item.id} to={`/catalog/${item.id}`} className="product-card" style={{ textDecoration: 'none' }}>
                <div className="product-img-wrapper">
                  {item.image && <img src={item.image} alt={item.title} className="product-img" />}
                </div>
                <div className="product-details">
                  <h3 className="product-title">{item.title}</h3>
                  <div className="product-price">
                    <svg className="usdt-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L5 12.2L12 16.2L19 12.2L12 2Z" fill="#2dd4bf" />
                      <path d="M12 17.3L5 13.3L12 22L19 13.3L12 17.3Z" fill="#2dd4bf" />
                    </svg>
                    <span className="price-text">{item.price} ETH</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
