export const Logo = ({ size = 'md', className = '' }) => {
  const large = size === 'lg';
  return <div className={`flex items-center gap-2.5 ${className}`}>
    <span className={`brand-mark ${large ? 'is-large' : ''}`} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9" /></svg></span>
    <span className={`font-medium tracking-tight text-white ${large ? 'text-xl' : 'text-base'}`}>ConvertTexture<span className="brand-period">.</span></span>
  </div>;
};

export default function AuthLayout({ title, subtitle, badge, children, footer }) {
  return <div className="auth-shell">
    <div className="auth-form-column"><div className="w-full max-w-[380px]"><Logo className="mb-12" />{badge}<div className="mb-8"><h1 className="text-[28px] font-medium tracking-tight">{title}</h1>{subtitle && <p className="mt-3 text-sm text-slate-400 leading-relaxed">{subtitle}</p>}</div>{children}{footer && <div className="mt-8">{footer}</div>}<p className="mt-12 text-[11px] text-slate-500">&copy; {new Date().getFullYear()} ConvertTexture</p></div></div>
    <aside className="auth-notes"><div><p className="tool-eyebrow">For resource pack authors</p><h2>A place to work<br />on your next pack.</h2><p className="auth-intro">Inspect assets, reduce file sizes, and bring Java packs to Bedrock.</p><div className="auth-file-tree" aria-label="Example conversion bundle"><p>resource-pack.zip <span>source</span></p><div><p>bedrock-pack.mcpack <span>Bedrock pack</span></p><p>geyser_mappings.json <span>Item mappings</span></p><p>conversion_report.json <span>Fidelity report</span></p></div></div><p className="text-xs leading-relaxed text-slate-400 mt-8">Your original files stay unchanged. Review conversion limits and test your pack in game before distributing it.</p></div></aside>
  </div>;
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
