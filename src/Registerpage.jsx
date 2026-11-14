import { useState } from 'react';
import './Register.css'; // Opsional kalau mau buat file CSS terpisah

export default function Register({ onNavigateToLogin }) {
  // State untuk form input biasa
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState(''); 
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState(''); 

  // Fungsi saat form disubmit
  const handleSubmit = async (e) => {
  e.preventDefault();
  const isValidEmail = (emailString) => {
     const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
     return regex.test(emailString);
  };

  const isValidPassword = (passwordString) => {
    // Password harus memiliki minimal 8 karakter, setidaknya satu huruf besar, satu huruf kecil, satu angka, dan satu karakter khusus
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(passwordString);
  }

    // Validasi sederhana
    if (!username || !password || !confirmPassword || !email || !gender) {
      setErrorMessage('Semua kolom form wajib diisi!');
      return;
    }
    if (!isValidEmail(email)) {
      setErrorMessage('Format email tidak valid!');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password harus minimal 8 karakter!');
      return;
    }
    if (!isValidPassword(password)) {
      setErrorMessage('Password harus memiliki setidaknya satu huruf besar, satu huruf kecil, satu angka, dan satu karakter khusus!');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Password dan Confirm Password tidak cocok!');
      return;
    }
    


    // Data siap dikirim ke backend
    const formData = {
      username,
      password,
      gender,
      email
    };

    console.log('Data Registrasi Dikirim ke Backend:', formData);
    alert('Registrasi berhasil!');
    onNavigateToLogin(); // Redirect ke halaman login setelah registrasi berhasil
  };


  return (
    <div className="register-container">
        <div className="Brand">
            <h1>Blockloot</h1>
            <img src="#" alt="Logo" className="logo" />
        </div>
      <div className="register-card">
        <p className="subtitle">Register Page </p>
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

          {/* Confirm Password */}
          <div className="input-group">
            <label>Confirm Password</label>
            <input 
              type="password" 
              placeholder="Ulangi password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Email</label>
            <input 
              type="email" 
              placeholder="Masukkan email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Gender Selection */}
          <div className="input-group">
            <label>Gender</label>
            <div className="radio-group">
              <label>
                <input 
                  type="radio" 
                  name="gender" 
                  value="Male"
                  checked={gender === 'Male'}
                  onChange={(e) => setGender(e.target.value)}
                /> Laki-laki
              </label>
              <label>
                <input 
                  type="radio" 
                  name="gender" 
                  value="Female"
                  checked={gender === 'Female'}
                  onChange={(e) => setGender(e.target.value)}
                /> Perempuan
              </label>
              <label>
                <input 
                  type="radio" 
                  name="gender" 
                  value="Other"
                  checked={gender === 'Other'}
                  onChange={(e) => setGender(e.target.value)}
                /> Lainnya
              </label>
            </div>
          </div>

          <div className="error-message">
            {errorMessage && <p>{errorMessage}</p>}
          </div>
          {/* Submit Button */}
          <button type="submit" className="btn-submit">
            Daftar Sekarang
          </button>
        </form>
      </div>
    </div>
  );
}