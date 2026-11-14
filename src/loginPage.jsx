import { useState } from 'react';
import './Login.css'; // Opsional kalau mau buat file CSS terpisah

export default function Login({ onNavigateToRegister, onNavigateToHome }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
   
    const handleSubmit = async (e) => {
     e.preventDefault();

    if (!username || !password ) {
      setErrorMessage('Semua kolom form wajib diisi!');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Password dan Confirm Password tidak cocok!');
      return;
    }

    const formData = { username, password };
    //console.log('Data Login Dikirim ke Backend:', formData); //ini test before backend
    try {
      const response = await fetch('https://api.blockloot.com/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      // 3. JIKA SUKSES DARI SERVER, BARU TAMPILKAN ALERT & PINDAH HALAMAN
      if (response.ok) {
        alert('Login berhasil!');
        onNavigateToHome(); // Pindah ke home
      } else {
        // Jika server menolak (misal: "Username sudah terdaftar")
        setErrorMessage(result.message || 'Login gagal!');
      }
    } catch (error) {
      console.error('Error login:', error); // <-- gunakan error di sini
      setErrorMessage('Tidak dapat terhubung ke server!');
    }

  };

  return (
    <div className="register-container">
      <div className="Brand">
        <h1>Blockloot</h1>
        <img src="#" alt="Logo" className="logo" />
      </div>

      <div className="register-card">
        <p className="subtitle">Login Page  </p>
        <form onSubmit={handleSubmit} className="register-form">
          {/* Username */}
          <div className="input-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {/* Password */}
          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Masukan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="error-message">
            {errorMessage && <p>{errorMessage}</p>}
          </div>

          <button type="submit" className="btn-submit">
            Login
          </button>
          <p><span className="link" onClick={onNavigateToRegister}>Sign Up</span></p>
        </form>
      </div>
    </div>
  );
}