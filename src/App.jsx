import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Admin from './pages/Admin'
import Scanner from './pages/Scanner'
import Converter from './pages/Converter'
import BedrockConverter from './pages/BedrockConverter'
import Optimizer from './pages/Optimizer'
import Queue from './pages/Queue'
import ProfileModal from './components/ProfileModal'
import Sidebar from './components/Sidebar'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

const getPageFromPath = (pathname) => {
  const clean = pathname.replace(/\/$/, '');
  switch (clean) {
    case '/bedrock-converter': return 'bedrock';
    case '/converter': return 'converter';
    case '/scanner': return 'scanner';
    case '/queue': return 'queue';
    case '/admin': return 'admin';
    case '/register': return 'register';
    case '/forgot-password': return 'forgot-password';
    case '/reset-password': return 'reset-password';
    case '/login': return 'login';
    case '/dashboard':
    case '/optimizer':
    case '': return 'home';
    default: return 'home';
  }
};

const getPathFromPage = (page) => {
  switch (page) {
    case 'bedrock': return '/bedrock-converter';
    case 'converter': return '/converter';
    case 'scanner': return '/scanner';
    case 'queue': return '/queue';
    case 'admin': return '/admin';
    case 'home': return '/dashboard';
    case 'register': return '/register';
    case 'forgot-password': return '/forgot-password';
    case 'reset-password': return '/reset-password';
    case 'login': return '/login';
    default: return '/dashboard';
  }
};

function App() {
  const [currentPage, setCurrentPageState] = useState(() => getPageFromPath(window.location.pathname));
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [showProfile, setShowProfile] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(!!localStorage.getItem('token'))
  const [resetEmail, setResetEmail] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const setCurrentPage = (pageOrFn) => {
    setCurrentPageState((prev) => {
      const nextPage = typeof pageOrFn === 'function' ? pageOrFn(prev) : pageOrFn;
      const path = getPathFromPage(nextPage);
      if (window.location.pathname !== path) {
        window.history.pushState({}, '', path);
      }
      return nextPage;
    });
  };

  useEffect(() => {
    const handlePopState = () => {
      const page = getPageFromPath(window.location.pathname);
      setCurrentPageState(page);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Session Persistence Effect
  useEffect(() => {
    if (token) {
      setIsAuthLoading(true)
      fetch(`${import.meta.env.VITE_API_URL}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error('Token expired')
        return res.json()
      })
      .then(data => {
        setUser(data)
        setCurrentPage(prev => (prev === 'login' || prev === 'register') ? getPageFromPath(window.location.pathname) : prev)
      })
      .catch(() => {
        handleLogout()
      })
      .finally(() => {
        setIsAuthLoading(false)
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
    setIsMobileMenuOpen(false);
  };

  // Show loading splash while checking auth — prevents login page flash
  if (isAuthLoading) {
    return (
      <div className="font-sans antialiased min-h-screen bg-dark-bg text-slate-100 flex flex-col items-center justify-center">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Convert<span className="text-brand-500">Texture</span></h1>
        </div>
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 border-2 border-dark-border rounded-full"></div>
          <div className="absolute inset-0 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Jika belum login, tampilkan halaman auth full screen
  if (!user || ['login', 'register', 'forgot-password', 'reset-password'].includes(currentPage)) {
    return (
      <div className="font-sans antialiased min-h-screen bg-dark-bg text-slate-100 flex flex-col items-center justify-center relative overflow-x-hidden">
        {currentPage === 'login' ? (
          <Login setToken={setToken} setUser={setUser} navigateTo={setCurrentPage} />
        ) : currentPage === 'register' ? (
          <Register navigateTo={setCurrentPage} />
        ) : currentPage === 'forgot-password' ? (
          <ForgotPassword navigateTo={setCurrentPage} setResetEmail={setResetEmail} />
        ) : (
          <ResetPassword navigateTo={setCurrentPage} resetEmail={resetEmail} />
        )}
      </div>
    );
  }

  // Jika sudah login, tampilkan layout utama (Dashboard)
  return (
    <div className="font-sans antialiased h-screen bg-dark-bg text-slate-100 flex flex-col md:flex-row overflow-hidden selection:bg-brand-500/30">
      
      {/* Mobile Top Navigation */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 bg-dark-surface border-b border-dark-border z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/50 transition-colors focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/20">
              <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Convert<span className="text-brand-500">Texture</span></span>
          </div>
        </div>
        <button 
          onClick={() => setShowProfile(true)}
          className="w-10 h-10 bg-brand-900/50 rounded-lg flex items-center justify-center font-bold text-brand-400 border border-dark-border text-sm hover:border-dark-borderHover transition-all"
        >
          {user?.username ? user.username.charAt(0).toUpperCase() : '?'}
        </button>
      </header>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        user={user} 
        setShowProfile={setShowProfile} 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
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
          ) : currentPage === 'converter' ? (
            <Converter token={token} user={user} />
          ) : currentPage === 'bedrock' ? (
            <BedrockConverter token={token} user={user} />
          ) : currentPage === 'queue' ? (
            <Queue token={token} />
          ) : (
            <Optimizer token={token} user={user} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
