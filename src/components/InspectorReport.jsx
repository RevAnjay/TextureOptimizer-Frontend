import { useState } from 'react';
import { formatBytes } from '../lib/api';
import { exportReport, formatVersion, inspectorFindings } from '../lib/packReports';
import { PanelHeading, ToolIcon } from './PackWorkspace';

const tabs = [['findings', 'Findings'], ['textures', 'Textures & atlases'], ['duplicates', 'Duplicates'], ['files', 'Files & versions']];
const number = value => (Number(value) || 0).toLocaleString();

function Empty({ children = 'No matching entries.' }) { return <p className="report-empty">{children}</p>; }
function AssetList({ rows, detail }) {
  return rows.length ? <ul className="asset-list">{rows.map((row, index) => <li key={`${row.path}-${index}`}><code>{row.path}</code><span>{detail(row)}</span></li>)}</ul> : <Empty />;
}

export default function InspectorReport({ report }) {
  const [tab, setTab] = useState('findings');
  const [severity, setSeverity] = useState('all');
  const [query, setQuery] = useState('');
  const health = report.health;
  const audit = health?.texture_audit;
  const allFindings = inspectorFindings(report);
  const findings = inspectorFindings(report, severity, query);
  const errors = (health?.finding_counts?.error || 0) + (report.invalid_jsons?.length || 0);
  const warnings = health?.finding_counts?.warning || 0;
  const matches = row => !query.trim() || JSON.stringify(row).toLowerCase().includes(query.trim().toLowerCase());

  return <section className="card overflow-hidden inspector-report">
    <PanelHeading title="Inspection report"><button type="button" className="report-export" onClick={() => exportReport(report, 'pack-inspection.json')}><ToolIcon name="download" className="w-4 h-4" /> Export JSON</button></PanelHeading>
    <div className="p-5 sm:p-6">
      <div className="inspection-verdict"><span className={`task-label ${errors ? 'is-error' : ''}`}>{errors ? 'Needs attention' : warnings ? 'Review warnings' : health ? 'No detected errors' : 'File analysis'}</span><p>{number(errors)} errors · {number(warnings)} warnings{!health && ' · Update the backend for full health checks'}</p></div>
      <dl className="report-metrics mt-5">{[['Files in pack', number(report.total_files)], ['Uncompressed size', formatBytes(report.total_size || 0)], ['Inspected RGBA sheets', audit ? formatBytes(audit.before.decoded_rgba_bytes) : 'Unavailable'], ['Animated textures', audit ? number(audit.before.animated_textures) : 'Unavailable']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className="workspace-caption mt-4">RGBA is the decoded texture sheet total, not measured game RAM. Atlas estimates exclude vanilla, mods and other active packs.</p>
    </div>
    <div className="report-tabs" role="tablist" aria-label="Inspection sections">{tabs.map(([id, label]) => <button type="button" role="tab" id={`inspector-tab-${id}`} aria-controls="inspector-content" aria-selected={tab === id} key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}{id === 'findings' && <span>{allFindings.length}</span>}</button>)}</div>
    <div className="report-toolbar"><label className="flex-1 min-w-0"><span className="sr-only">Search report</span><input className="field" type="search" placeholder="Search paths, issues or assets…" value={query} onChange={event => setQuery(event.target.value)} /></label>{tab === 'findings' && <label><span className="sr-only">Finding severity</span><select className="field" value={severity} onChange={event => setSeverity(event.target.value)}><option value="all">All levels</option><option value="error">Errors</option><option value="warning">Warnings</option><option value="info">Information</option></select></label>}</div>
    <div className="p-5 sm:p-6 pt-0 sm:pt-0" role="tabpanel" id="inspector-content" aria-labelledby={`inspector-tab-${tab}`}>
      {tab === 'findings' && <><div className="report-scroll">{findings.length ? <ul className="finding-list">{findings.map((finding, index) => <li key={`${finding.code}-${index}`}><span className={`finding-level is-${finding.severity}`}>{finding.severity}</span><div className="min-w-0"><h3>{finding.message}</h3>{finding.path && <code>{finding.path}</code>}<p>{finding.action}</p></div></li>)}</ul> : <Empty>{allFindings.length ? 'No findings match this filter.' : 'No issues detected in the inspected scope. Test the pack in game to confirm behavior.'}</Empty>}</div>{health && <div className="report-recommendations"><h3>Suggested next steps</h3><ul className="tool-checklist mt-3">{health.recommendations?.map(message => <li key={message}>{message}</li>)}</ul><p className="workspace-caption mt-4">Detailed findings are capped by the server. Export JSON for totals and the complete retained report.</p></div>}</>}
      {tab === 'textures' && <div className="space-y-6"><div><h3 className="report-section-title">Atlas planning · 4096 px budget</h3><div className="report-scroll">{audit?.atlases_after?.filter(matches).length ? <table className="report-table"><thead><tr><th>Atlas / variant</th><th>Planned size</th><th>RGBA + mipmaps</th></tr></thead><tbody>{audit.atlases_after.filter(matches).map((atlas, index) => <tr key={index}><td><code>{atlas.name}</code><small>{number(atlas.sprites)} sprites · {atlas.within_budget ? 'Within planning budget' : 'Exceeds planning budget'}{atlas.partial ? ' · partial' : ''}</small></td><td>{atlas.width} × {atlas.height}</td><td>{formatBytes(atlas.rgba_with_mipmaps_bytes || 0)}</td></tr>)}</tbody></table> : <Empty>No atlas entries available for this filter.</Empty>}</div></div><div><h3 className="report-section-title">Oversized texture sheets · largest first</h3><AssetList rows={(report.high_res || []).filter(matches)} detail={row => `${row.width} × ${row.height} px`} /><p className="workspace-caption mt-3">Sheet dimensions include animation frames. A tall animation is not necessarily an oversized individual sprite.</p></div></div>}
      {tab === 'duplicates' && <><p className="text-sm text-slate-300 mb-2">{formatBytes(report.total_waste || 0)} of repeated file bytes</p><p className="workspace-caption mb-5">Identical bytes can still need different resource IDs. This is a disk estimate, not a safe automatic saving or an FPS prediction.</p><div className="report-scroll space-y-4">{(report.duplicates || []).filter(matches).length ? report.duplicates.filter(matches).map((group, index) => <div key={index} className="duplicate-group"><div><strong>{group.copies} copies · {formatBytes(group.size_each)} each</strong><span>{formatBytes(group.waste)} repeated</span></div><ul className="report-paths">{group.paths.map(path => <li key={path}>{path}</li>)}</ul>{group.copies > group.paths.length && <p className="workspace-caption mt-2">Showing {group.paths.length} of {group.copies} paths.</p>}</div>) : <Empty>No duplicate groups match this filter.</Empty>}</div></>}
      {tab === 'files' && <div className="space-y-6"><div><h3 className="report-section-title">Declared version metadata</h3><pre className="metadata-code">{JSON.stringify(health?.declared_formats || { pack_format: report.pack_format }, null, 2)}</pre><p className="workspace-caption mt-2">Declared by the pack author; not a tested compatibility range. Pack type hint: {report.pack_type || 'Unknown'}.</p></div>{!!health?.overlays?.length && <div><h3 className="report-section-title">Authored overlays</h3><div className="report-scroll"><table className="report-table"><thead><tr><th>Directory</th><th>Formats</th><th>Assets</th></tr></thead><tbody>{health.overlays.filter(matches).map((overlay, index) => <tr key={index}><td><code>{overlay.directory}</code>{!overlay.exists && <small>Assets directory missing</small>}</td><td>{formatVersion(overlay.min_format)}–{formatVersion(overlay.max_format)}</td><td>{number(overlay.assets)}</td></tr>)}</tbody></table></div></div>}<div><h3 className="report-section-title">Where the bytes go</h3><ul className="category-list">{(report.categories || []).map(category => <li key={category.name}><div><span>{category.name} · {number(category.count)} files</span><strong>{formatBytes(category.size)}</strong></div><div className="category-track"><span style={{ width: `${report.total_size ? category.size / report.total_size * 100 : 0}%` }} /></div></li>)}</ul></div><div><h3 className="report-section-title">Large files · largest first</h3><AssetList rows={(report.large_files || []).filter(matches)} detail={row => formatBytes(row.size)} /></div></div>}
    </div>
    {health?.scope && <p className="report-scope">{health.scope}</p>}
  </section>;
}
