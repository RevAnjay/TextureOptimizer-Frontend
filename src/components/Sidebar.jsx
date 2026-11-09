import { Logo } from './AuthLayout';

const tools = [
  ['bedrock', 'Java → Bedrock', 'm12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9'],
  ['home', 'Texture optimizer', 'M4 16l5-5 4 4 3-3 4 4M6 4h12v16H6zM14 8h.01'],
  ['converter', 'Version converter', 'M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4'],
  ['scanner', 'Pack inspector', 'm21 21-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z'],
];
const workspace = [
  ['queue', 'Tasks', 'M8 6h12M8 12h12M8 18h12M3 6h.01M3 12h.01M3 18h.01'],
  ['admin', 'Administration', 'M12 3 3 7v6c0 4 9 8 9 8s9-4 9-8V7l-9-4ZM9 12l2 2 4-4'],
];

export default function Sidebar({ currentPage, setCurrentPage, user, setShowProfile, isMobileMenuOpen, setIsMobileMenuOpen }) {
  const unlimited = user?.tier === 'premium' || user?.is_admin;
  const used = user?.usage_count ?? 0;
  function navigate(page) { setCurrentPage(page); setIsMobileMenuOpen(false); }
  function item([page, label, path]) {
    return <button type="button" key={page} onClick={() => navigate(page)} aria-current={currentPage === page ? 'page' : undefined} className={`sidebar-link ${currentPage === page ? 'is-active' : ''}`}><svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d={path} /></svg><span>{label}</span></button>;
  }
  return <aside className={`app-sidebar fixed inset-y-0 left-0 z-50 w-[240px] flex flex-col transition-transform duration-200 md:static md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
    <div className="flex items-center justify-between px-5 py-6"><Logo size="sm" /><button type="button" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu" className="md:hidden p-2 text-slate-400"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M6 18 18 6" /></svg></button></div>
    <div className="px-5 pb-6"><span className="sidebar-workspace">Resource pack workspace</span></div>
    <nav className="px-3 flex-1 overflow-y-auto" aria-label="Main navigation"><p className="sidebar-section">Tools</p><div className="space-y-1">{tools.map(item)}</div><p className="sidebar-section mt-8">Workspace</p><div className="space-y-1">{workspace.filter(([page]) => page !== 'admin' || user?.is_admin).map(item)}</div></nav>
    <div className="px-5 py-5"><div className="flex items-center justify-between text-xs"><span className="text-slate-400">{unlimited ? 'Pack uploads' : 'Weekly optimizations'}</span><span className="font-mono text-slate-300">{unlimited ? 'Unlimited' : `${used} / 5`}</span></div>{!unlimited && <div className="quota-track"><span style={{ width: `${Math.min(100, used / 5 * 100)}%` }} /></div>}<p className="text-[11px] text-slate-500 mt-2">{user?.is_admin ? 'Administrator account' : user?.tier === 'premium' ? 'Premium account · 100 MB per pack' : 'Free account · 30 MB per pack'}</p></div>
    <div className="p-3 border-t border-dark-border"><button type="button" onClick={() => { setShowProfile(true); setIsMobileMenuOpen(false); }} className="sidebar-account"><span>{user?.username?.charAt(0).toUpperCase() || '?'}</span><div><strong>{user?.username || 'Guest'}</strong><span>Account settings</span></div><svg className="w-4 h-4 ml-auto text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg></button></div>
  </aside>;
}
