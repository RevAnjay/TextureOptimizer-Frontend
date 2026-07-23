import React from 'react';

const Sidebar = ({ currentPage, setCurrentPage, user, setShowProfile, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-dark-surface border-r border-dark-border flex flex-col transition-transform duration-300 md:static md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          {/* Close button on mobile (placed on the left for better alignment) */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/50 transition-colors focus:outline-none"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Convert<span className="text-brand-500">Texture</span></h1>
        </div>
        
        <nav className="space-y-2">
          <button 
            onClick={() => {
              setCurrentPage('home');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-left ${currentPage === 'home' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <span className="truncate">Texture Optimizer</span>
          </button>

          <button
            onClick={() => {
              setCurrentPage('scanner');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-left ${currentPage === 'scanner' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <span className="truncate">Scan & Analyze</span>
          </button>

          <button
            onClick={() => {
              setCurrentPage('converter');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-left ${currentPage === 'converter' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
            <span className="truncate">Version Converter</span>
          </button>

          <button
            onClick={() => {
              setCurrentPage('bedrock');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-left ${currentPage === 'bedrock' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            <span className="truncate">Bedrock Converter</span>
          </button>

          <button
            onClick={() => {
              setCurrentPage('queue');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-left ${currentPage === 'queue' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            <span className="truncate">Queue Monitor</span>
          </button>
          
          {user?.is_admin && (
            <button 
              onClick={() => {
                setCurrentPage('admin');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-left transition-all ${currentPage === 'admin' ? 'bg-dark-surface2 text-brand-400 border border-dark-border' : 'text-slate-400 hover:text-white hover:bg-dark-surface2'}`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              <span className="truncate">Admin Panel</span>
            </button>
          )}
        </nav>
      </div>

      <div className="p-4 border-t border-dark-border mt-auto">
        <button 
          onClick={() => {
            setShowProfile(true);
            setIsMobileMenuOpen(false);
          }}
          className="w-full flex items-center gap-3 p-3 bg-dark-surface2 rounded-xl hover:border-dark-borderHover border border-dark-border transition-colors text-left"
        >
          <div className="w-10 h-10 bg-brand-900/50 rounded-lg flex items-center justify-center font-bold text-brand-400">
            {user?.username ? user.username.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="overflow-hidden">
            <p className="font-semibold text-white truncate text-sm">{user?.username || 'Guest'}</p>
            <p className="text-xs uppercase tracking-wider text-brand-500 font-bold mt-0.5">{user?.tier || 'free'}</p>
          </div>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
