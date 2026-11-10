import { formatBytes } from '../lib/api';
import { optimizationSummary } from '../lib/optimizerProfiles';
import { PanelHeading } from './PackWorkspace';

export default function OptimizationReport({ report }) {
  const summary = optimizationSummary(report);
  if (!summary) return null;
  return <section className="card overflow-hidden">
    <PanelHeading title="Compatibility report"><span className={`task-label ${summary.needsAttention ? 'is-error' : 'is-done'}`}>{summary.needsAttention ? 'Review needed' : 'Processed'}</span></PanelHeading>
    <div className="p-5 sm:p-6 space-y-5">
      <div><p className="text-xs text-slate-400">Decoded RGBA texture data</p><p className="text-lg font-semibold text-white mt-1">{formatBytes(summary.beforeBytes)} <span className="text-slate-500 px-2">→</span> {formatBytes(summary.afterBytes)}</p><p className="text-xs text-slate-500 mt-1">Sum of inspected texture sheets. This is not measured game RAM or an FPS benchmark.</p></div>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-xs text-slate-400">Resized textures</dt><dd className="text-white mt-1">{summary.resized}</dd></div>
        <div><dt className="text-xs text-slate-400">Animations made static</dt><dd className="text-white mt-1">{summary.frozen}</dd></div>
        <div><dt className="text-xs text-slate-400">Interpolation disabled</dt><dd className="text-white mt-1">{summary.interpolation}</dd></div>
        <div><dt className="text-xs text-slate-400">Shader folders removed</dt><dd className="text-white mt-1">{summary.shaderFolders}</dd></div>
      </dl>
      {summary.atlases.length > 0 && <div className="overflow-x-auto"><table className="w-full text-xs text-left"><caption className="text-left text-slate-400 mb-3">Uploaded sprite estimates · vanilla, mods and other packs excluded</caption><thead className="text-slate-500"><tr><th className="py-2 font-normal">Atlas / overlay</th><th className="px-3 font-normal">Planned size</th><th className="font-normal">Budget</th></tr></thead><tbody>{summary.atlases.map((atlas, index) => <tr key={`${atlas.name}-${index}`} className="border-t border-white/5"><td className="py-3 break-all text-slate-300">{atlas.name}<span className="block text-slate-500">{atlas.sprites} sprites{atlas.partial ? ' · partial estimate' : ''}</span></td><td className="px-3 whitespace-nowrap text-slate-300">{atlas.width} × {atlas.height}</td><td className={atlas.fits ? 'text-emerald-400' : 'text-amber-300'}>{atlas.fits ? 'Within target' : 'Review'}</td></tr>)}</tbody></table></div>}
      {summary.issueCount > 0 && <div className="text-xs text-amber-200 space-y-2" role="status"><p>{summary.issueCount} issue(s) need review. Some assets were kept unchanged.</p><ul className="list-disc pl-4 space-y-2">{summary.issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul></div>}
      <p className="text-xs text-slate-400 leading-relaxed">Font and GUI layouts are protected. Atlas packing is an estimate, and launcher compatibility still needs testing on the target device. The ZIP includes <code>optimization_report.json</code> with details and warnings.</p>
    </div>
  </section>;
}
