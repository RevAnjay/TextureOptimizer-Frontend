import React from 'react';

export const Logo = ({ size = 'md', className = '' }) => {
  const dims = {
    sm: { box: 'w-8 h-8 rounded-lg', icon: 'w-4 h-4', text: 'text-base' },
    md: { box: 'w-9 h-9 rounded-xl', icon: 'w-5 h-5', text: 'text-lg' },
    lg: { box: 'w-11 h-11 rounded-xl', icon: 'w-6 h-6', text: 'text-xl' },
  }[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${dims.box} bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shrink-0 shadow-[0_8px_24px_-8px_rgba(16,185,129,0.7)]`}
      >
        <svg className={`${dims.icon} text-[#04150f]`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <span className={`${dims.text} font-bold tracking-tight text-white`}>
        Convert<span className="text-brand-400">Texture</span>
      </span>
    </div>
  );
};

const highlights = [
  {
    title: 'Lossless compression',
    body: 'Shrink resource packs by up to 80% with smart PNG re-encoding.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M4 14l4-4 3 3 5-6 4 4M4 20h16" />
    ),
  },
  {
    title: 'Version conversion',
    body: 'Port packs between Java and Bedrock releases in one pass.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />
    ),
  },
  {
    title: 'Deep pack analysis',
    body: 'Spot unused assets, duplicates, and oversized textures instantly.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    ),
  },
];

export default function AuthLayout({ title, subtitle, badge, children, footer }) {
  return (
    <div className="flex w-full min-h-screen bg-dark-bg text-slate-300">
      {/* Form column */}
      <div className="relative w-full lg:w-[52%] flex flex-col items-center justify-center px-5 py-10 sm:px-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
          <div className="absolute -top-24 -left-16 w-72 h-72 bg-brand-500/10 blur-[90px] rounded-full" />
        </div>

        <div className="relative w-full max-w-[400px] animate-fade-in-up">
          <Logo size="md" className="mb-9" />

          {badge}

          <div className="mb-8">
            <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-white leading-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-slate-500 leading-relaxed">{subtitle}</p>}
          </div>

          {children}

          {footer && <div className="mt-8">{footer}</div>}
        </div>

        <p className="relative mt-10 text-[11px] text-slate-600 order-last">
          &copy; {new Date().getFullYear()} ConvertTexture. Built for the Minecraft community.
        </p>
      </div>

      {/* Visual column */}
      <div className="relative hidden lg:flex w-[48%] flex-col justify-center overflow-hidden border-l border-dark-border bg-dark-surface">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute -top-32 -right-24 w-[420px] h-[420px] bg-brand-500/15 rounded-full blur-[120px] animate-float-slow" />
        <div className="absolute -bottom-40 -left-20 w-[380px] h-[380px] bg-indigo-500/10 rounded-full blur-[120px]" />

        <div className="relative z-10 px-12 xl:px-16 max-w-[560px]">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-500/25 bg-brand-500/10 mb-8">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-400" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-300">
              Built for resource pack authors
            </span>
          </div>

          <h2 className="text-[40px] leading-[1.1] font-bold text-white tracking-tight mb-4">
            Ship lighter packs.
            <br />
            <span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent">
              Keep the detail.
            </span>
          </h2>
          <p className="text-slate-400 leading-relaxed mb-10">
            One workspace for compressing, scanning, and converting texture packs across every Minecraft version.
          </p>

          <div className="space-y-3">
            {highlights.map((h) => (
              <div
                key={h.title}
                className="group flex gap-4 p-4 rounded-2xl border border-dark-border bg-dark-surface2/60 backdrop-blur-sm
                           hover:border-dark-borderHover hover:bg-dark-surface3/70 transition-all duration-300"
              >
                <div className="w-9 h-9 shrink-0 rounded-xl bg-brand-500/12 border border-brand-500/20 flex items-center justify-center text-brand-400">
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {h.icon}
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{h.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{h.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-6 text-[11px] font-medium text-slate-500">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Files auto-deleted after 24h
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              No watermarks
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthAlert({ type = 'error', children }) {
  const styles =
    type === 'success'
      ? 'bg-brand-500/10 border-brand-500/25 text-brand-300'
      : 'bg-red-500/10 border-red-500/25 text-red-300';

  return (
    <div className={`flex items-start gap-2.5 border rounded-xl p-3.5 mb-6 text-sm animate-fade-in ${styles}`}>
      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {type === 'success' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        )}
      </svg>
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}
