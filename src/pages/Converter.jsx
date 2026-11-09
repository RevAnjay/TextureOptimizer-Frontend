import { useState } from 'react';
import usePackJob from '../hooks/usePackJob';
import { ToolHeader, PanelHeading, PackPicker, JobNotice, JobPanel, ActivityLog, ToolIcon } from '../components/PackWorkspace';

const versions = [
  ['46', '1.21.4'], ['42', '1.21.2–1.21.3'], ['34', '1.21–1.21.1'],
  ['32', '1.20.5–1.20.6'], ['22', '1.20.3–1.20.4'], ['18', '1.20.2'], ['15', '1.20–1.20.1'],
];

export default function Converter({ token, user }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [targetFormat, setTargetFormat] = useState('46');
  const controller = usePackJob(token, user.username, 'version');
  const { job, start, reset, retryConnection } = controller;
  const hasJob = job.status !== 'idle';
  const maxMB = user.tier === 'premium' || user.is_admin ? 100 : 30;
  function newPack() { reset(); setFile(null); setError(''); }

  return <div className="tool-workspace">
    <ToolHeader title="Version converter" description="Update a Java resource pack’s format and supported item definitions for another Java release." meta="JAVA → JAVA" />
    <JobNotice job={job} retryConnection={retryConnection} />
    <div className="workspace-columns">
      <div className="space-y-5 min-w-0">
        {hasJob ? <JobPanel controller={controller} action="Conversion" onReset={newPack} /> : <section className="card overflow-hidden">
          <PanelHeading number="01" title="Source pack"><span className="text-xs text-slate-500">{maxMB} MB max</span></PanelHeading>
          <div className="p-5 sm:p-6"><PackPicker file={file} onChange={setFile} maxMB={maxMB} error={error} setError={setError} /></div>
          <PanelHeading number="02" title="Target version" />
          <div className="p-5 sm:p-6"><label htmlFor="target-version" className="text-sm text-slate-300">Minecraft Java Edition</label><select id="target-version" className="field mt-3" value={targetFormat} onChange={event => setTargetFormat(event.target.value)}>{versions.map(([value, label]) => <option key={value} value={value}>{label} · Pack format {value}</option>)}</select><p className="text-xs text-slate-500 leading-relaxed mt-3">Format 46 introduces item definitions in assets/minecraft/items/. Review the activity log for conversion details and unsupported features.</p>
            <div className="workspace-action"><p>Your original ZIP stays unchanged.</p><button type="button" className="btn-primary" disabled={!file} onClick={() => start(file, { targetFormat })}>Convert pack <ToolIcon name="arrow" className="w-4 h-4" /></button></div>
          </div>
        </section>}
        <p className="workspace-caption">Format conversion cannot guarantee every custom model or predicate behaves identically in a different release.</p>
      </div>
      <aside className="space-y-5 min-w-0"><ActivityLog logs={job.logs} hasJob={hasJob} /><section className="workspace-note"><h2>Staying on Java?</h2><p>This tool converts between Java pack formats. To create a Bedrock pack and Geyser mappings, use Java → Bedrock in the sidebar.</p><div className="note-file"><ToolIcon name="file" className="w-4 h-4" /><span>Output <strong>converted.zip</strong></span></div></section></aside>
    </div>
  </div>;
}
