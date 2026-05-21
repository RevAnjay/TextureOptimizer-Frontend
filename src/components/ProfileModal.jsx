import { useState, useEffect } from 'react';

export default function ProfileModal({ user, onClose, onLogout }) {
  // calculate time until reset
  const getDaysUntilReset = () => {
    if (!user.week_start) return 7;
    const weekStart = new Date(user.week_start);
    const now = new Date();
    const diffTime = Math.abs(now - weekStart);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, 7 - diffDays);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
      <div className="bg-dark-surface border border-dark-border w-full max-w-sm rounded-2xl p-8 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors p-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <div className="flex flex-col items-center mt-2">
          <div className="w-16 h-16 bg-brand-900/50 rounded-2xl flex items-center justify-center font-bold text-2xl text-brand-400 border border-brand-500/30 mb-4">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{user.username}</h2>
          <p className="text-sm text-slate-500 mb-6">{user.email || 'No email provided'}</p>
          
          <div className="flex items-center gap-2 mb-6">
            <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg uppercase tracking-wider border ${
              user.tier === 'premium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-dark-surface2 text-slate-300 border-dark-border'
            }`}>
              {user.tier} Tier
            </span>
            {user.is_admin && (
               <span className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold rounded-lg uppercase tracking-wider">
                 Admin
               </span>
            )}
          </div>

          <div className="w-full bg-dark-surface2 rounded-xl p-5 mb-8 border border-dark-border">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-medium text-slate-400">Weekly Quota</span>
              <span className="text-lg font-bold text-white">
                {user.tier === 'premium' ? '∞' : `${user.usage_count} / 5`}
              </span>
            </div>
            
            {user.tier === 'free' ? (
              <>
                <div className="w-full h-1.5 bg-dark-border rounded-full overflow-hidden mb-3">
                  <div 
                    className="h-full bg-brand-500 transition-all duration-500" 
                    style={{ width: `${Math.min((user.usage_count / 5) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 text-center">
                  {5 - user.usage_count} optimizations left • Resets in {getDaysUntilReset()} days
                </p>
              </>
            ) : (
              <p className="text-xs text-amber-400/80 text-center mt-2">
                You can optimize without limits!
              </p>
            )}
          </div>

          <button 
            onClick={onLogout} 
            className="w-full py-3 bg-dark-surface2 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-white border border-dark-border rounded-xl transition-all text-sm font-semibold flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
