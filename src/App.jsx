import { useState } from 'react';
import Register from './Registerpage';
import LoginPage from './loginPage';
import Homepage from './homepage';
import './App.css';

function App() {
  // Cek apakah ada sesi login tersimpan di localStorage
  const savedLoginStatus = localStorage.getItem('isLoggedIn') === 'true';
  const savedUsername = localStorage.getItem('user') || 'User';

  // Halaman aktif: 'register' | 'login' | 'home'
  const [page, setPage] = useState(savedLoginStatus ? 'home' : 'register');
  const [currentUser, setCurrentUser] = useState(savedUsername);

  // Proteksi Route (Tanpa useEffect agar aman dari render ganda & lolos linter 100%)
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const activePage = (page === 'home' && !isLoggedIn) ? 'login' : page;

  // Handler saat Login Berhasil
  const handleLoginSuccess = (username) => {
    const loggedInUser = username || 'User';
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('user', loggedInUser);
    setCurrentUser(loggedInUser);
    setPage('home');
  };

  // Handler saat Logout
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    setCurrentUser('User');
    setPage('login');
  };

  return (
    <div>
      {activePage === 'register' && (
        <Register onNavigateToLogin={() => setPage('login')} />
      )}

      {activePage === 'login' && (
        <LoginPage 
          onNavigateToRegister={() => setPage('register')} 
          onNavigateToHome={handleLoginSuccess}
        />
      )}

      {activePage === 'home' && (
        <Homepage 
          username={currentUser} 
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;