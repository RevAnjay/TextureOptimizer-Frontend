import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Admin from './pages/Admin'
import Scanner from './pages/Scanner'
import Optimizer from './pages/Optimizer'
import ProfileModal from './components/ProfileModal'
import Sidebar from './components/Sidebar'

function App() {
  const [currentPage, setCurrentPage] = useState('login') // 'login', 'register', 'home'
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [showProfile, setShowProfile] = useState(false)
  
  // Session Persistence Effect
  useEffect(() => {
    if (token) {
      fetch(`${import.meta.env.VITE_API_URL}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error('Token expired')
        return res.json()
      })
      .then(data => {
        setUser(data)
        setCurrentPage(currentPage === 'login' || currentPage === 'register' ? 'home' : currentPage)
      })
      .catch(() => {
        handleLogout()
      })
    }
  }, [token])

  // Sync token state to localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token])

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setCurrentPage('login');
    setShowProfile(false);
  };

  // Jika belum login, tampilkan halaman auth full screen
  if (!user || currentPage === 'login' || currentPage === 'register') {
    return (
      <div className="font-sans antialiased min-h-screen bg-dark-bg text-slate-100 flex flex-col items-center justify-center relative overflow-x-hidden">
        {currentPage === 'login' ? (
          <Login setToken={setToken} setUser={setUser} navigateTo={setCurrentPage} />
        ) : (
          <Register navigateTo={setCurrentPage} />
        )}
      </div>
    );
  }

  // Jika sudah login, tampilkan layout utama (Dashboard)
  return (
    <div className="font-sans antialiased h-screen bg-dark-bg text-slate-100 flex overflow-hidden selection:bg-brand-500/30">
      
      {/* Sidebar Component */}
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        user={user} 
        setShowProfile={setShowProfile} 
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-dark-bg p-4 md:p-8 relative">
        {/* Profile Modal */}
        {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} onLogout={handleLogout} />}

        <div className="max-w-6xl mx-auto h-full flex flex-col">
          {currentPage === 'admin' ? (
            <Admin token={token} navigateTo={setCurrentPage} />
          ) : currentPage === 'scanner' ? (
            <Scanner token={token} />
          ) : (
            <Optimizer token={token} user={user} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
