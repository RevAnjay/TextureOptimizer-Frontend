import { useState } from 'react';
import usePackJob from '../hooks/usePackJob';
import { ToolHeader, PanelHeading, PackPicker, JobNotice, JobPanel, ActivityLog, ToolIcon } from '../components/PackWorkspace';
import InspectorReport from '../components/InspectorReport';

export default function Scanner({ token, user }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [minPixel, setMinPixel] = useState('512');
  const [minKb, setMinKb] = useState('256');
  const controller = usePackJob(token, user.username, 'inspector');
  const { job, start, reset, retryConnection } = controller;
  const hasJob = job.status !== 'idle';
  const maxMB = user.tier === 'premium' || user.is_admin ? 100 : 40;
  function newPack() { reset(); setFile(null); setError(''); }

  return <div className="tool-workspace">
    <ToolHeader title="Pack inspector" description="Find costly textures, broken metadata and version-sensitive assets before changing anything. Your pack stays untouched." meta="READ-ONLY ANALYSIS" />
    <JobNotice job={job} retryConnection={retryConnection} />
    <div className="workspace-columns">
      <div className="space-y-5 min-w-0">{hasJob ? <JobPanel controller={controller} action="Inspection" onReset={newPack} downloadable={false} /> : <section className="card overflow-hidden">
        <PanelHeading number="01" title="Source pack"><span className="text-xs text-slate-500">{maxMB} MB max</span></PanelHeading>
        <div className="p-5 sm:p-6"><PackPicker file={file} onChange={setFile} maxMB={maxMB} error={error} setError={setError} /></div>
        <PanelHeading number="02" title="Highlight thresholds" />
        <div className="p-5 sm:p-6"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="text-xs text-slate-400">Texture side at least<select className="field mt-2" value={minPixel} onChange={event => setMinPixel(event.target.value)}>{[128, 256, 512, 1024, 2048, 4096].map(value => <option key={value} value={value}>{value} px</option>)}</select></label><label className="text-xs text-slate-400">File size above<select className="field mt-2" value={minKb} onChange={event => setMinKb(event.target.value)}>{[64, 128, 256, 512, 1024, 2048].map(value => <option key={value} value={value}>{value} KB</option>)}</select></label></div><p className="text-xs text-slate-500 leading-relaxed mt-3">These thresholds only filter the oversized asset lists. Metadata, animation and atlas checks still cover the pack.</p><div className="workspace-action"><p>Read-only analysis · no assets removed</p><button type="button" className="btn-primary" disabled={!file} onClick={() => start(file, { minPixel, minKb })}>Inspect pack <ToolIcon name="arrow" className="w-4 h-4" /></button></div></div>
      </section>}</div>
      <aside className="space-y-5 min-w-0"><section className="workspace-note"><h2>Check before you optimize</h2><ul className="tool-checklist"><li>JSON and animation metadata.</li><li>Texture sheet memory and atlas estimates.</li><li>Version overlays and item model formats.</li><li>Model parent cycles and missing custom textures.</li><li>Duplicate bytes and oversized files.</li></ul></section><ActivityLog logs={job.logs} hasJob={hasJob} /></aside>
    </div>
    {job.result && <div className="mt-6"><InspectorReport report={job.result} /></div>}
    {job.status === 'done' && !job.result && <p className="job-notice is-warning mt-6">The server returned no inspection report. Update the backend and inspect this pack again.</p>}
  </div>;
}
