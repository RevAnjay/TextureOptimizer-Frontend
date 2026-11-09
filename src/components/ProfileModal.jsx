import React from 'react';

export default function ProfileModal({ user, onClose, onLogout }) {
  const getDaysUntilReset = () => {
    if (!user.week_start) return 7;
    const weekStart = new Date(user.week_start);
    const now = new Date();
    const diffTime = Math.abs(now - weekStart);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, 7 - diffDays);
  };

  const isPremium = user.tier === 'premium';
  const usage = user.usage_count ?? 0;
  const quotaPct = Math.min((usage / 5) * 100, 100);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-sm bg-dark-surface border-t sm:border border-dark-border rounded-t-3xl sm:rounded-2xl p-6 sm:p-7 shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-500 hover:text-white hover:bg-dark-surface2 transition-colors"
          aria-label="Close profile"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-brand-500/25 to-brand-700/20 border border-brand-500/25 flex items-center justify-center font-bold text-xl text-brand-300">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white truncate leading-tight">{user.username}</h2>
            <p className="text-xs text-slate-500 truncate mt-0.5">{user.email || 'No email on file'}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={isPremium ? 'badge-warn' : 'badge-neutral'}>{user.tier}</span>
              {user.is_admin && <span className="badge-admin">Admin</span>}
            </div>
          </div>
        </div>

        <div className="panel-inset p-4 mb-5">
          <div className="flex items-baseline justify-between mb-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Weekly quota
            </span>
            <span className="text-base font-bold text-white font-mono">
              {isPremium ? 'Unlimited' : `${usage} / 5`}
            </span>
          </div>

          {isPremium ? (
            <p className="text-xs text-amber-300/80 leading-relaxed">
              Premium tier — no weekly limits on optimizations.
            </p>
          ) : (
            <>
              <div className="h-1.5 bg-dark-bg rounded-full overflow-hidden mb-2.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    quotaPct >= 100
                      ? 'bg-red-500'
                      : 'bg-gradient-to-r from-brand-600 to-brand-400'
                  }`}
                  style={{ width: `${quotaPct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {Math.max(5 - usage, 0)} remaining &middot; resets in {getDaysUntilReset()} day
                {getDaysUntilReset() === 1 ? '' : 's'}
              </p>
            </>
          )}
        </div>

        <button
          onClick={onLogout}
          className="w-full py-2.5 rounded-xl border border-dark-border bg-dark-surface2 text-sm font-semibold text-slate-300
                     hover:text-red-300 hover:border-red-500/30 hover:bg-red-500/10 transition-all
                     flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
}
