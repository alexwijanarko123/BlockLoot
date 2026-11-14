import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import './homepage.css';

// ============================================================================
// ⚙️ KONFIGURASI MODE:
// Ubah `USE_BACKEND = true` jika server backend API Anda sudah aktif.
// Biarkan `USE_BACKEND = false` untuk testing lokal di frontend (menggunakan data dummy).
// ============================================================================
const USE_BACKEND = false;

// ----------------------------------------------------------------------------
// [SKENARIO 1: LOKAL FRONTEND ONLY] Data dummy untuk uji coba tampilan lokal
// ----------------------------------------------------------------------------
const DUMMY_PRODUCTS = [
  {
    id: '1',
    title: 'Pac man original game',
    price: '1.99',
    image: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: '2',
    title: 'Clash of Clans Town Hall 18',
    price: '2.99',
    image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: '3',
    title: 'Clash Royale Maxed Acc',
    price: '2.99',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80'
  }
];

export default function Homepage({ 
  username = 'User', 
  onNavigateToProfile, 
  onLogout 
}) {
  // State produk: jika mode lokal pakai dummy, jika backend mulai dengan array kosong
  const [products, setProducts] = useState(USE_BACKEND ? [] : DUMMY_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletError, setWalletError] = useState('');

  // --------------------------------------------------------------------------
  // [SKENARIO 2: KONEKSI KE BACKEND API]
  // Bagian ini akan otomatis aktif jika USE_BACKEND = true
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!USE_BACKEND) {
      // Mode Lokal: Tidak perlu memanggil API server
      return;
    }

    /*
     * KODE INTEGRASI BACKEND:
     * Mengambil daftar produk dari endpoint API server saat halaman dibuka
     */
    const fetchProductsFromBackend = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('https://api.blockloot.com/api/products', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
            // Nanti jika butuh autentikasi token, buka komentar baris di bawah:
            // 'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const data = await response.json();

        if (response.ok) {
          // Simpan data produk asli dari database backend
          setProducts(data);
        } else {
          console.error('Gagal mengambil data produk dari server:', data.message);
        }
      } catch (error) {
        console.error('Koneksi server produk gagal:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductsFromBackend();
  }, []);

  // Filter produk berdasarkan input pencarian
  const filteredProducts = products.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Koneksi ke MetaMask (Web3 / Ethers)
  const connectMetaMask = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask belum terpasang di browser!');
      return;
    }

    try {
      setIsConnecting(true);
      setWalletError('');
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);

      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
      }
    } catch (err) {
      console.error('Koneksi MetaMask dibatalkan:', err);
      setWalletError('Koneksi MetaMask dibatalkan.');
    } finally {
      setIsConnecting(false);
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const handleAddMoreItems = () => {
    if (USE_BACKEND) {
      // Jika mode backend, lakukan re-fetch dari server
      window.location.reload();
    } else {
      // Jika mode lokal, reset kembali ke data dummy
      setProducts(DUMMY_PRODUCTS);
    }
    setSearchQuery('');
  };

  return (
    <div className="homepage-container">
      {/* ---------- Header / Navbar ---------- */}
      <header className="home-navbar">
        <div className="brand-group">
          <div className="brand-logo-circle" />
          <span className="brand-title">KrypGear</span>
        </div>

        <div className="user-group">
          <div className="user-text">
            <span className="welcome-text">Welcome</span>
            <span className="username-text">{username}</span>
          </div>
          {/* Avatar profil: klik untuk buka halaman profile */}
          <div 
            className="user-avatar-circle" 
            onClick={onNavigateToProfile || onLogout} 
            title="Klik untuk melihat profil"
          />
        </div>
      </header>

      {/* ---------- Opsi Complete Credential / MetaMask ---------- */}
      <div className="credential-section">
        {!walletAddress ? (
          <div className="credential-card">
            <div className="credential-info">
              <span className="credential-badge">Pending Credential</span>
              <p>Complete your credential by connecting your Web3 wallet</p>
            </div>
            <button 
              className="btn-connect-wallet" 
              onClick={connectMetaMask} 
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : '🦊 Connect MetaMask'}
            </button>
          </div>
        ) : (
          <div className="wallet-connected-pill">
            <span className="dot-green" />
            <span>Wallet Connected: <strong>{formatAddress(walletAddress)}</strong></span>
          </div>
        )}
        {walletError && <p className="wallet-error">{walletError}</p>}
      </div>

      {/* ---------- Hero Tagline ---------- */}
      <section className="hero-section">
        <h1 className="hero-tagline">
          Trade Game Items at the Speed<br />
          of Blockchain.
        </h1>

        {/* Search Bar */}
        <div className="search-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Search Product"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg
            className="search-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </section>

      {/* ---------- Actions Bar (Highlight & Filter) ---------- */}
      <div className="actions-bar">
        <button 
          className="btn-product-highlight" 
          type="button"
          onClick={() => setProducts(DUMMY_PRODUCTS)}
        >
          <span className="fire-icon">🔥</span>
          <span>Product Highlight</span>
        </button>

        <button 
          className="btn-filter" 
          type="button"
          onClick={() => setProducts(products.length ? [] : DUMMY_PRODUCTS)}
          title="Klik untuk mencoba tampilan Empty State"
        >
          <svg
            className="filter-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span>Filter</span>
        </button>
      </div>

      {/* Divider */}
      <div className="divider-line" />

      {/* ---------- Content Area (Grid Produk vs Empty State) ---------- */}
      <main className="content-area">
        {isLoading ? (
          <div className="empty-state">
            <h2 className="empty-title">Loading products...</h2>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <h2 className="empty-title">No Item Found</h2>
            <button 
              className="btn-add-items" 
              type="button" 
              onClick={handleAddMoreItems}
            >
              Add More Items
            </button>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((item) => (
              <div key={item.id} className="product-card">
                <div className="product-img-wrapper">
                  <img src={item.image} alt={item.title} className="product-img" />
                </div>
                <div className="product-details">
                  <h3 className="product-title">{item.title}</h3>
                  <div className="product-price">
                    {/* Tether / USDT Icon */}
                    <svg className="usdt-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L3 8.5L12 21L21 8.5L12 2Z" fill="#2dd4bf" />
                      <path d="M7.5 7.5H16.5V9H13V14H11V9H7.5V7.5Z" fill="#080e1a" />
                    </svg>
                    <span className="price-text">{item.price} USDT</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}