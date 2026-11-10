import { useState } from 'react';
import usePackJob from '../hooks/usePackJob';
import { ToolHeader, PanelHeading, PackPicker, JobNotice, JobPanel, ActivityLog, ToolIcon } from '../components/PackWorkspace';
import MultiVersionReport from '../components/MultiVersionReport';
import { javaVersions, selectedVersions, rangePresets, formatVersion } from '../lib/packReports';

export default function Converter({ token, user }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [minVersion, setMin] = useState('1.20.2');
  const [maxVersion, setMax] = useState('1.21.4');
  const controller = usePackJob(token, user.username, 'multiversion');
  const { job, start, reset, retryConnection } = controller;
  const hasJob = job.status !== 'idle';
  const releases = selectedVersions(minVersion, maxVersion);
  const maxMB = user.tier === 'premium' || user.is_admin ? 100 : 40;
  function newPack() { reset(); setFile(null); setError(''); }

  return <div className="tool-workspace">
    <ToolHeader title="Multi-version pack" description="Build a Java pack with a version range and item overlays. Minecraft loads the matching assets from a single ZIP." meta="JAVA → JAVA" />
    <JobNotice job={job} retryConnection={retryConnection} />
    <div className="workspace-columns">
      <div className="space-y-5 min-w-0">
        {hasJob ? <JobPanel controller={controller} action="Pack build" onReset={newPack} /> : <section className="card overflow-hidden">
          <PanelHeading number="01" title="Source pack"><span className="text-xs text-slate-500">{maxMB} MB max</span></PanelHeading>
          <div className="p-5 sm:p-6"><PackPicker file={file} onChange={setFile} maxMB={maxMB} error={error} setError={setError} /></div>
          <PanelHeading number="02" title="Version range" />
          <div className="p-5 sm:p-6 space-y-5">
            <div className="preset-list">{rangePresets.map(preset => <button type="button" key={preset.name} aria-pressed={minVersion === preset.min && maxVersion === preset.max} className={minVersion === preset.min && maxVersion === preset.max ? 'is-selected' : ''} onClick={() => { setMin(preset.min); setMax(preset.max); }}><span className="preset-radio" /><span><strong>{preset.name} · {preset.min} → {preset.max}</strong><span>{preset.description}</span></span></button>)}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[['Oldest release', minVersion, setMin, 'min-version'], ['Newest release', maxVersion, setMax, 'max-version']].map(([label, value, set, id]) => <label key={id} htmlFor={id} className="text-xs text-slate-400 min-w-0">{label}<select id={id} className="field mt-2" value={value} onChange={event => set(event.target.value)}>{javaVersions.map(version => <option key={version.id} value={version.id}>{version.label}</option>)}</select></label>)}</div>
            {!releases.length ? <p role="alert" className="text-xs text-red-300">The oldest release must come before the newest release.</p> : <div className="range-summary"><span>{releases.length} release group{releases.length === 1 ? '' : 's'}</span><span>Formats {formatVersion(releases[0].format)} → {formatVersion(releases.at(-1).format)}</span></div>}
            {releases.some(version => version.format[0] >= 75) && <p className="text-xs text-amber-200 leading-relaxed">1.21.11+ uses a separate item atlas. The builder adds sources for resolved item textures; overlay-only models, shaders and changed vanilla layouts need review.</p>}
            <div className="workspace-action"><p>Source assets and authored overlay priority are preserved.</p><button type="button" className="btn-primary" disabled={!file || !releases.length} onClick={() => start(file, { conversionMode: 'multiversion', minVersion, maxVersion })}>Build multi-version pack <ToolIcon name="arrow" className="w-4 h-4" /></button></div>
          </div>
        </section>}
        <MultiVersionReport report={job.report} />
        <p className="workspace-caption">Version declarations are not a compatibility guarantee. Test the output on the releases your players use.</p>
      </div>
      <aside className="space-y-5 min-w-0"><section className="workspace-note"><h2>What gets adapted</h2><ul className="tool-checklist"><li>Version metadata for older and newer pack schemas.</li><li>Plain numeric CustomModelData item definitions, where a faithful bridge can be generated.</li><li>Item atlas sources for 1.21.11+ when referenced textures can be resolved.</li></ul><p className="mt-4">Shaders, complex item states, fonts and renamed vanilla assets may need authored overlays. The output report lists what needs attention.</p><div className="note-file"><ToolIcon name="file" className="w-4 h-4" /><span>Output <strong>*_multiversion.zip</strong></span></div></section><ActivityLog logs={job.logs} hasJob={hasJob} /></aside>
    </div>
  </div>;
}
