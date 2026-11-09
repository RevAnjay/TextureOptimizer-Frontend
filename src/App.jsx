import { useState, useEffect, useCallback, useRef } from 'react'
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
import { Logo } from './components/AuthLayout'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import { API_URL } from './lib/api'

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
    case '/optimizer': return 'home';
    case '':
    default: return 'bedrock';
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
    default: return '/bedrock-converter';
  }
};

const AUTH_PAGES = ['login', 'register', 'forgot-password', 'reset-password'];

function App() {
  const [currentPage, setCurrentPageState] = useState(() => getPageFromPath(window.location.pathname));
  const currentPageRef = useRef(currentPage);
  const requestedPageRef = useRef(AUTH_PAGES.includes(currentPage) ? 'bedrock' : currentPage);
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [showProfile, setShowProfile] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(!!localStorage.getItem('token'))
  const [sessionError, setSessionError] = useState('')
  const [sessionAttempt, setSessionAttempt] = useState(0)
  const [resetEmail, setResetEmail] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const mainRef = useRef(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [currentPage]);

  const setCurrentPage = useCallback((pageOrFn) => {
    const nextPage = typeof pageOrFn === 'function' ? pageOrFn(currentPageRef.current) : pageOrFn;
    currentPageRef.current = nextPage;
    if (!AUTH_PAGES.includes(nextPage)) requestedPageRef.current = nextPage;
    const path = getPathFromPage(nextPage);
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
    setCurrentPageState(nextPage);
    setIsMobileMenuOpen(false);
  }, []);

  const navigateFromAuth = (page) => {
    setCurrentPage(page === 'home' ? requestedPageRef.current : page);
  };

  useEffect(() => {
    const handlePopState = () => {
      const page = getPageFromPath(window.location.pathname);
      currentPageRef.current = page;
      if (!AUTH_PAGES.includes(page)) requestedPageRef.current = page;
      setCurrentPageState(page);
      setIsMobileMenuOpen(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // A temporary connection failure must not discard a valid session.
  useEffect(() => {
    if (!token) {
      setIsAuthLoading(false);
      return;
    }
    const controller = new AbortController();
    setIsAuthLoading(true);
    setSessionError('');
    fetch(`${API_URL}/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal,
      })
      .then(res => {
        if (controller.signal.aborted) return null;
        if (res.status === 401 || res.status === 403) {
          setUser(null);
          setToken(null);
          setCurrentPage('login');
          return null;
        }
        if (!res.ok) throw new Error('The server could not verify your session. Please try again.');
        return res.json();
      })
      .then(data => {
        if (controller.signal.aborted || !data) return;
        setUser(data);
        if (currentPageRef.current === 'login' || currentPageRef.current === 'register') {
          setCurrentPage(requestedPageRef.current);
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError' && !controller.signal.aborted) {
          setSessionError('Unable to reach the server. Your session has been saved; retry when the connection is available.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsAuthLoading(false);
      });
    return () => controller.abort();
  }, [token, sessionAttempt, setCurrentPage]);

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
    setSessionError('');
    setIsAuthLoading(false);
    setCurrentPage('login');
    setShowProfile(false);
    setIsMobileMenuOpen(false);
  };

  if (sessionError && token) {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <Logo size="lg" />
        <div className="max-w-md" role="alert">
          <h1 className="text-xl font-semibold mb-3">Connection unavailable</h1>
          <p className="text-sm text-slate-400 leading-relaxed">{sessionError}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => setSessionAttempt(attempt => attempt + 1)} className="btn-primary">Retry connection</button>
          <button type="button" onClick={handleLogout} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Sign in again</button>
        </div>
      </div>
    );
  }

  // Show loading splash while checking auth — prevents login page flash
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100 flex flex-col items-center justify-center gap-7">
        <Logo size="lg" />
        <div className="relative w-7 h-7">
          <div className="absolute inset-0 border-2 border-dark-border rounded-full"></div>
          <div className="absolute inset-0 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Not logged in: full screen auth pages
  if (!user || AUTH_PAGES.includes(currentPage)) {
    return (
      <div className="min-h-screen bg-dark-bg text-slate-100">
        {currentPage === 'register' ? (
          <Register navigateTo={setCurrentPage} />
        ) : currentPage === 'forgot-password' ? (
          <ForgotPassword navigateTo={setCurrentPage} setResetEmail={setResetEmail} />
        ) : currentPage === 'reset-password' ? (
          <ResetPassword navigateTo={setCurrentPage} resetEmail={resetEmail} />
        ) : (
          <Login setToken={setToken} setUser={setUser} navigateTo={navigateFromAuth} />
        )}
      </div>
    );
  }

  const pageMeta = {
    home: { title: 'Texture Optimizer', crumb: 'Workspace' },
    scanner: { title: 'Scan & Analyze', crumb: 'Tools' },
    converter: { title: 'Version Converter', crumb: 'Tools' },
    bedrock: { title: 'Bedrock Converter', crumb: 'Tools' },
    queue: { title: 'Queue Monitor', crumb: 'Workspace' },
    admin: { title: 'Admin Panel', crumb: 'Manage' },
  }[currentPage] || { title: 'Workspace', crumb: 'Workspace' };

  return (
    <div className="h-screen bg-dark-bg text-slate-100 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile top bar */}
      <header className="flex md:hidden items-center justify-between px-4 py-3 bg-dark-surface/90 backdrop-blur-xl border-b border-dark-border z-30 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-dark-surface2 transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Logo size="sm" />
        </div>
        <button
          onClick={() => setShowProfile(true)}
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500/25 to-brand-700/25 border border-brand-500/25 flex items-center justify-center font-bold text-xs text-brand-300"
          aria-label="Open profile"
        >
          {user?.username ? user.username.charAt(0).toUpperCase() : '?'}
        </button>
      </header>

      {/* Mobile menu backdrop */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        user={user}
        setShowProfile={setShowProfile}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main */}
      <main ref={mainRef} className="flex-1 overflow-y-auto relative min-w-0" id="main-content">

        {showProfile && (
          <ProfileModal user={user} onClose={() => setShowProfile(false)} onLogout={handleLogout} />
        )}

        <div className="relative max-w-6xl mx-auto px-4 py-5 sm:px-6 md:px-8 md:py-7">
          {/* Desktop breadcrumb */}
          <div className="hidden md:flex items-center gap-2 mb-5 pb-5 border-b border-dark-border text-xs font-medium">
            <span className="text-slate-600">ConvertTexture</span>
            <svg className="w-3 h-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-slate-600">{pageMeta.crumb}</span>
            <svg className="w-3 h-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-slate-400">{pageMeta.title}</span>
          </div>

          <div key={user.username} className="h-full flex flex-col">
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
        </div>
      </main>
    </div>
  );
}

export default App;
