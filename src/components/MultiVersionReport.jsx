import { PanelHeading } from './PackWorkspace';
import { formatVersion } from '../lib/packReports';

export default function MultiVersionReport({ report }) {
  if (report?.kind !== 'multiversion') return null;
  return <section className="card overflow-hidden">
    <PanelHeading title="Build report"><span className={`task-label ${report.manual_review_count ? '' : 'is-done'}`}>{report.manual_review_count ? 'Manual review needed' : 'Prepared'}</span></PanelHeading>
    <div className="p-5 sm:p-6 space-y-5">
      <div><p className="text-lg text-white">Java {report.min_version} → {report.max_version}</p><p className="text-xs text-slate-400 mt-2">Formats {formatVersion(report.min_format)}–{formatVersion(report.max_format)} · {(report.versions || []).length} release groups declared</p></div>
      <dl className="report-metrics">{[['Modern item definitions', report.modern_definitions_generated], ['Legacy item models', report.legacy_models_generated], ['Authored overlays kept', report.existing_overlays_preserved], ['Item atlas sources added', report.item_atlas_sprites]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 0}</dd></div>)}</dl>
      {!!report.generated_overlays?.length && <div><h3 className="text-xs text-slate-400 mb-2">Generated overlays</h3><ul className="report-paths">{report.generated_overlays.map(directory => <li key={directory}>{directory}/</li>)}</ul></div>}
      {!!report.warnings?.length && <div className="report-findings"><h3 className="text-sm text-amber-200">{report.manual_review_count} review item(s)</h3>{report.review_categories && <dl className="review-categories">{Object.entries(report.review_categories).map(([category, count]) => <div key={category}><dt>{category}</dt><dd>{count}</dd></div>)}</dl>}<details className="report-details mt-4"><summary>Review details · up to 8 examples per category</summary><ul className="tool-checklist mt-3">{report.warnings.map((message, index) => <li key={index}>{message}</li>)}</ul></details></div>}
      <details className="report-details"><summary>Scope and limitations</summary><ul className="tool-checklist mt-3">{(report.limitations || []).map(message => <li key={message}>{message}</li>)}</ul></details>
      <p className="workspace-caption">The ZIP includes conversion_report.json. Generated overlays load before authored overlays, keeping the pack author’s overrides in control.</p>
    </div>
  </section>;
}
