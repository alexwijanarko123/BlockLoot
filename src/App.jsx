import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Web3Provider } from './context/Web3Context';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Register from './Registerpage';
import LoginPage from './loginPage';
import Homepage from './homepage';
import ProfilePage from './profilepage';

import AdminPage from './pages/AdminPage';
import CatalogPage from './pages/CatalogPage';
import CreateDraftPage from './pages/CreateDraftPage';
import ItemDetailPage from './pages/ItemDetailPage';
import OrderDetailPage from './pages/OrderDetailPage';
import OrdersPage from './pages/OrdersPage';
import SellerDashboardPage from './pages/SellerDashboardPage';

import './App.css';

// Layout bergaya homepage: header KrypGear + konten halaman
function Layout() {
  return (
    <div className="homepage-container">
      <Navbar />
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Web3Provider>
        <Routes>
          {/* Halaman auth layar penuh (desain Register/Login) */}
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={<Layout />}>
            <Route path="/" element={<Homepage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/catalog/:id" element={<ItemDetailPage />} />

            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
            <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />

            <Route path="/seller" element={<ProtectedRoute roles={['SELLER', 'ADMIN']}><SellerDashboardPage /></ProtectedRoute>} />
            <Route path="/seller/drafts/new" element={<ProtectedRoute roles={['SELLER', 'ADMIN']}><CreateDraftPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminPage /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Web3Provider>
    </BrowserRouter>
  );
}

export default App;
