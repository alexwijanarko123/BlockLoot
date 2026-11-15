# BlockLoot - Web3 Game Asset Marketplace

BlockLoot adalah marketplace terdesentralisasi untuk jual beli aset item game langka berbasis Web3. Platform ini mengintegrasikan penyimpanan metadata off-chain (gambar HD, statistik RPG, dan cerita item) dengan smart contract on-chain yang dilengkapi mekanisme **Escrow** otomatis untuk menjamin keamanan dana pembeli dan penjual.

---

## 🛠️ Tech Stack

- **Frontend (FE)**: React 19, Vite, React Router v7, Ethers.js v6, CSS Modern.
- **Backend (BE)**: Node.js, Express.js, Ethers.js v6, Multer, JWT.
- **Smart Contract**: Solidity `^0.8.20`, OpenZeppelin (`AccessControl`, `ReentrancyGuard`), Hardhat.
- **Pembayaran**: Native ETH Escrow.
- **Standar Aset Game**: ERC-721 (NFT Langka 1-of-1) & ERC-1155 (Multi-Stok).

---

## 🔄 Alur & Fitur Sistem

### 1. Autentikasi Web3 & Role-Based Access Control (RBAC)
- Pengguna menghubungkan wallet Web3 (seperti **MetaMask**).
- Backend mengirimkan pesan *cryptographic challenge* unik.
- Pengguna menandatangani challenge dengan `personal_sign` di MetaMask (tanpa biaya gas).
- Smart contract membaca alamat wallet `0x...` melalui fungsi `getUserRole(address)` untuk menentukan peran:
  - **Admin** (`DEFAULT_ADMIN_ROLE`): Dapat memberikan hak `SELLER_ROLE` ke pengguna tepercaya via `grantRole`.
  - **Seller** (`SELLER_ROLE`): Dapat mengunggah draft off-chain, membuat listing on-chain, mengirim item game, dan delist item.
  - **Buyer** (Selain keduanya): Dapat menelusuri katalog, membeli item dengan escrow, dan mengonfirmasi penerimaan.

### 2. Alur Penjualan (Seller Flow)
1. **Off-Chain Draft**: Seller mengunggah gambar HD, cerita/lore item, harga dalam ETH, jumlah stok, standar aset (ERC-721/1155), dan statistik RPG dinamis (misal Attack, Durability, Rarity) via endpoint `/api/product-drafts`.
2. **On-Chain Listing**: Seller menekan tombol **"List On-Chain"** yang memicu smart contract memanggil fungsi:
   ```solidity
   listItem(string metadataURI, uint256 price, uint256 stock)
   ```
   Harga dan batas stok tercatat secara transparan di blockchain dengan event `ItemListed`.

### 3. Alur Pembelian & Escrow (Buyer Flow)
1. **Checkout & Escrow Lock**: Buyer memilih jumlah item di katalog dan menekan tombol **"Beli Sekarang"**. Transaksi memicu smart contract:
   ```solidity
   buyItem(uint256 listingId, uint256 quantity) payable
   ```
   Dana Native ETH pembeli otomatis **terkunci di akun escrow smart contract** dengan status transaksi `PAID_HELD`.
2. **In-Game Delivery**: Penjual melihat ID akun game pembeli (dari profil pembeli), mengirimkan aset item game secara langsung di dalam game, mencantumkan catatan pengiriman, dan memperbarui status pesanan menjadi `SHIPPED`:
   ```solidity
   markShipped(uint256 orderId)
   ```
3. **Pencairan Dana Otomatis**: Setelah pembeli menerima item dan menekan **"Konfirmasi Penerimaan"**:
   ```solidity
   confirmDelivery(uint256 orderId)
   ```
   Smart contract memverifikasi bahwa pemanggil adalah pembeli, mengubah status menjadi `COMPLETED`, dan secara otomatis mentransfer dana dari escrow langsung ke wallet penjual.

### 4. Pembatalan Pesanan & Soft-Delete Delist
- **Pembatalan Pesanan (`cancelOrder`)**: Jika pesanan dibatalkan sebelum barang dikirim (status `PAID_HELD`), smart contract mengubah status menjadi `CANCELLED`, mengembalikan stok listing, dan **otomatis me-refund 100% ETH ke wallet pembeli**.
- **Delist Item (`delistItem`)**: Seller dapat menghapus listing secara on-chain (soft-delete status `CANCELLED` & stok menjadi `0`). Seluruh pesanan aktif yang belum dikirim otomatis di-cancel dan dananya di-refund ke masing-masing pembeli.
- Seluruh histori dan log transaksi tetap tersimpan permanen di event log blockchain (`ListingCancelled`, `OrderStatusChanged`).

---

## 📂 Struktur Direktori Proyek

```
BlockLoot/
├── contracts/                        # Smart Contract & Hardhat
│   ├── contracts/
│   │   └── SimpleGameMarketplace.sol # Smart contract utama
│   ├── scripts/
│   │   ├── deploy.js                 # Script deploy ke blockchain lokal
│   │   └── setup-local.js            # Script setup role akun testing
│   ├── hardhat.config.cjs            # Konfigurasi Hardhat
│   └── package.json
├── backend/                          # Express.js REST API
│   ├── src/
│   │   ├── routes/                   # Auth, catalog, drafts, orders, chain, profile
│   │   ├── abi.js                    # Sinkronisasi ABI on-chain
│   │   ├── chain.js                  # Ethers.js helper & contract interaction
│   │   └── index.js                  # Entry point server
│   ├── uploads/                      # Penyimpanan media gambar HD off-chain
│   ├── data/store.json               # Database off-chain
│   └── .env
├── src/                              # Frontend React (Vite)
│   ├── components/                   # Navbar, ProtectedRoute
│   ├── context/                      # Web3Context (MetaMask & Auth)
│   ├── pages/                        # Landing, Catalog, Detail, Seller, Orders, Profile, Admin
│   ├── services/                     # API fetcher & Ethers transaction helpers
│   ├── App.jsx                       # Routing & Layout
│   └── main.jsx
├── package.json
└── README.md
```

---

## 🚀 Panduan Menjalankan Sistem

### 1. Jalankan Blockchain Lokal (Hardhat Node)
Buka terminal pertama:
```bash
npm run chain:node
```

### 2. Deploy Smart Contract
Buka terminal kedua dan deploy kontrak ke blockchain lokal:
```bash
npm run chain:deploy
```
*Catatan: Alamat kontrak default (`0x5FbDB2315678afecb367f032d93F642f64180aa3`) sudah otomatis dikonfigurasikan di `backend/.env`.*

### 3. Jalankan Backend Server
Di terminal kedua:
```bash
npm run server:dev
```
Server backend akan aktif di: `http://localhost:4000`.

### 4. Jalankan Frontend React
Buka terminal ketiga:
```bash
npm run dev
```
Aplikasi frontend akan aktif di: `http://localhost:5173`.

---

## 🦊 Pengujian Akun MetaMask (Hardhat Local)

Gunakan *Private Key* bawaan Hardhat untuk menguji berbagai role:
- **Admin**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` (Akun #0: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`)
- **Seller**: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` (Akun #1: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`)
- **Buyer**: `0x5de4111afa1a4b94908f83103eb219e8b8b609fb54258b3b7e742883494b8077` (Akun #2: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`)
