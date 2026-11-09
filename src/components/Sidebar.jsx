import React from 'react';
import { Logo } from './AuthLayout';

const NAV_ITEMS = [
  {
    page: 'bedrock',
    label: 'Java → Bedrock',
    hint: 'Pack + Geyser mappings',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9" />
    ),
  },
  {
    page: 'home',
    label: 'Texture Optimizer',
    hint: 'Compress packs',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    ),
  },
  {
    page: 'scanner',
    label: 'Scan & Analyze',
    hint: 'Audit assets',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    ),
  },
  {
    page: 'converter',
    label: 'Version Converter',
    hint: 'Port pack versions',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    ),
  },
];

const Sidebar = ({ currentPage, setCurrentPage, user, setShowProfile, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const quotaUsed = user?.usage_count ?? 0;
  const quotaMax = 5;
  const quotaPct = Math.min((quotaUsed / quotaMax) * 100, 100);
  const isPremium = user?.tier === 'premium';

  const NavButton = ({ item, muted }) => {
    const active = currentPage === item.page;
    return (
      <button
        onClick={() => {
          setCurrentPage(item.page);
          setIsMobileMenuOpen(false);
        }}
        aria-current={active ? 'page' : undefined}
        className={`group relative w-full flex items-center gap-3 pl-3.5 pr-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
          active
            ? muted
              ? 'bg-indigo-500/10 text-indigo-200 border border-indigo-500/20'
              : 'bg-brand-500/10 text-white border border-brand-500/25'
            : 'text-slate-400 border border-transparent hover:bg-dark-surface2 hover:text-slate-100 hover:border-dark-border'
        }`}
      >
        {active && (
          <span
            className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full ${
              muted ? 'bg-indigo-400' : 'bg-brand-400'
            }`}
          />
        )}
        <span
          className={`shrink-0 transition-colors ${
            active ? (muted ? 'text-indigo-300' : 'text-brand-300') : 'text-slate-500 group-hover:text-slate-300'
          }`}
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {item.icon}
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold truncate leading-tight">{item.label}</span>
          <span className="block text-[10px] text-slate-600 truncate mt-0.5 group-hover:text-slate-500 transition-colors">
            {item.hint}
          </span>
        </span>
        {active && <span className={`w-1.5 h-1.5 rounded-full ${muted ? 'bg-indigo-400' : 'bg-brand-400'}`} />}
      </button>
    );
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-[268px] bg-dark-surface/95 backdrop-blur-xl border-r border-dark-border flex flex-col transition-transform duration-300 ease-out md:static md:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <Logo size="sm" />
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden p-1.5 -mr-1 text-slate-500 hover:text-white rounded-lg hover:bg-dark-surface2 transition-colors"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="section-title px-3 mt-2 mb-2">Tools</p>
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavButton key={item.page} item={item} />
          ))}
        </div>

        <p className="section-title px-3 mt-6 mb-2">Workspace</p>
        <div className="space-y-1">
          <NavButton
            item={{
              page: 'queue',
              label: 'Queue Monitor',
              hint: 'Live task feed',
              icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              ),
            }}
          />
          {user?.is_admin && (
            <NavButton
              muted
              item={{
                page: 'admin',
                label: 'Admin Panel',
                hint: 'Manage users',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                ),
              }}
            />
          )}
        </div>

        {/* Quota card */}
        {!isPremium && (
          <div className="mt-6 mx-1 panel-inset p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Weekly quota</span>
              <span className="text-[11px] font-mono font-semibold text-brand-300">
                {quotaUsed}/{quotaMax}
              </span>
            </div>
            <div className="h-1.5 bg-dark-bg rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-500"
                style={{ width: `${quotaPct}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
              {quotaMax - quotaUsed > 0
                ? `${quotaMax - quotaUsed} optimization${quotaMax - quotaUsed === 1 ? '' : 's'} left this week`
                : 'Quota exhausted — resets weekly'}
            </p>
          </div>
        )}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-dark-border">
        <button
          onClick={() => {
            setShowProfile(true);
            setIsMobileMenuOpen(false);
          }}
          className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-dark-border bg-dark-surface2/60 hover:bg-dark-surface3 hover:border-dark-borderHover transition-all text-left"
        >
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500/25 to-brand-700/25 border border-brand-500/25 flex items-center justify-center font-bold text-sm text-brand-300">
              {user?.username ? user.username.charAt(0).toUpperCase() : '?'}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand-400 border-2 border-dark-surface" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white truncate leading-tight">
              {user?.username || 'Guest'}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 mt-0.5">
              {user?.tier || 'free'} tier
            </p>
          </div>
          <svg className="w-4 h-4 text-slate-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
