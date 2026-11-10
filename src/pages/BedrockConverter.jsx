import { useEffect, useRef, useState } from 'react';
import useBedrockJob from '../hooks/useBedrockJob';
import { formatBytes } from '../lib/api';
import { inspectJavaPack } from '../lib/inspectJavaPack';
import { ToolHeader, JobNotice } from '../components/PackWorkspace';

const paths = {
  upload: 'M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4', arrow: 'M4 12h16m-5-5 5 5-5 5',
  cube: 'm12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9', file: 'M14 2H5v20h14V7l-5-5ZM14 2v6h5M8 12h8m-8 4h5',
  check: 'm5 12 4 4L19 6', close: 'm6 6 12 12M6 18 18 6', download: 'M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5',
  info: 'M12 11v6m0-10v.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', copy: 'M9 9h12v12H9zM5 15H3V3h12v2',
  settings: 'M4 7h16M4 17h16M8 4v6m8 4v6', clock: 'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
};
function Icon({ name, className = 'w-5 h-5' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.file} /></svg>;
}
function saveJson(value, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function WarningList({ warnings }) {
  if (!warnings?.length) return null;
  return <div className="space-y-2.5">{warnings.map((warning, index) => <div key={index} className="flex gap-2.5 text-xs leading-relaxed text-amber-200/85"><Icon name="info" className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" /><p>{typeof warning === 'string' ? warning : JSON.stringify(warning)}</p></div>)}</div>;
}
function InstallGuide() {
  return <details className="bedrock-install" open>
    <summary className="cursor-pointer font-semibold text-sm text-slate-200">Install on your Geyser server</summary>
    <ol className="mt-5 space-y-4">{[
      <>Extract the bundle. Put the <code>.mcpack</code> file in Geyser’s <code>packs/</code> folder.</>,
      <>Put <code>geyser_mappings.json</code> in <code>custom_mappings/</code>. Use a Geyser build with Custom Item API v2 support.</>,
      <>Review <code>conversion_report.json</code>, restart Geyser, and test your custom items in game.</>,
    ].map((text, index) => <li key={index} className="flex gap-3"><span className="bedrock-step-number">{index + 1}</span><p className="text-xs text-slate-400 leading-relaxed min-w-0">{text}</p></li>)}</ol>
    <a href="https://geysermc.org/wiki/geyser/custom-items/" target="_blank" rel="noreferrer" className="inline-flex mt-5 text-xs font-medium text-brand-300 hover:text-brand-200">Geyser documentation <span aria-hidden="true" className="ml-1">↗</span></a>
  </details>;
}

export default function BedrockConverter({ token, user }) {
  const [file, setFile] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [inspecting, setInspecting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [packName, setPackName] = useState('');
  const [useHashedIds, setUseHashedIds] = useState(true);
  const [activeTab, setActiveTab] = useState('output');
  const [followLogs, setFollowLogs] = useState(true);
  const [copyState, setCopyState] = useState('');
  const inputRef = useRef(null);
  const inspectionId = useRef(0);
  const logsRef = useRef(null);
  const { job, start, reset, download, downloading, downloadError, retryConnection } = useBedrockJob(token, user?.username);
  const busy = ['uploading', 'queued', 'processing'].includes(job.status);
  const hasJob = job.status !== 'idle';
  const maxMB = user?.tier === 'premium' || user?.is_admin ? 100 : 40;
  useEffect(() => () => { inspectionId.current++; }, []);
  useEffect(() => { if (followLogs && logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight; }, [job.logs, followLogs, activeTab]);

  async function selectFiles(files) {
    if (busy || !files?.length) return;
    const id = ++inspectionId.current;
    setValidationError(''); setInspection(null); setFile(null);
    if (files.length !== 1) { setInspecting(false); setValidationError('Choose one Java resource pack at a time.'); return; }
    setInspecting(true);
    try {
      const result = await inspectJavaPack(files[0], { maxBytes: maxMB * 1024 * 1024 });
      if (inspectionId.current !== id) return;
      setFile(files[0]); setInspection(result);
      setPackName(files[0].name.replace(/\.zip$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'converted_pack');
      reset();
    } catch (error) { if (inspectionId.current === id) setValidationError(error.message); }
    finally { if (inspectionId.current === id) setInspecting(false); }
  }
  function newPack() { inspectionId.current++; reset(); setFile(null); setInspection(null); setValidationError(''); setInspecting(false); setPackName(''); }
  async function copyLogs() {
    try { await navigator.clipboard.writeText(job.logs.join('\n')); setCopyState('Copied'); }
    catch { setCopyState('Clipboard unavailable'); }
    setTimeout(() => setCopyState(''), 2500);
  }
  const percent = job.status === 'uploading' ? job.upload : job.total > 0 ? Math.min(100, Math.round(job.current / job.total * 100)) : null;
  const report = job.report;
  const reportWarnings = [...(Array.isArray(report?.warnings) ? report.warnings : []), ...(Array.isArray(report?.limitations) ? report.limitations : [])];
  const outputs = [...new Set([...(Array.isArray(report?.outputs) && report.outputs.length ? report.outputs : [
    `${packName || job.packName || 'your_pack'}.mcpack`, 'geyser_mappings.json', 'geyser_blocks.json',
  ]), 'conversion_report.json'])];
  const phase = job.restoring ? 'Reconnecting to your conversion' : job.status === 'queued' ? (job.queuePosition > 0 ? `In queue · position ${job.queuePosition}` : 'Waiting for the conversion worker')
    : job.status === 'uploading' ? (job.upload === 100 ? 'Upload received · waiting for server' : 'Uploading your Java pack') : 'Converting assets on the server';
  const canConvert = file && inspection && /^[a-zA-Z0-9_-]{1,64}$/.test(packName) && !inspecting;

  return <div className="bedrock-workspace animate-fade-in-up pb-8">
    <ToolHeader title="Java → Bedrock" description="Convert a Java resource pack into a Bedrock pack, Geyser mappings, and a report of conversion limits." meta="ZIP → MCPACK + JSON" />
    <ol className="bedrock-workflow" aria-label="Conversion steps">{['Upload & inspect', 'Convert assets', 'Download & install'].map((step, index) => {
      const current = !hasJob ? 0 : job.status === 'done' ? 2 : 1;
      return <li key={step} className={current === index ? 'is-current' : current > index ? 'is-complete' : ''}><span>{current > index ? <Icon name="check" className="w-3 h-3" /> : `0${index + 1}`}</span>{step}</li>;
    })}</ol>
    {(validationError || job.error || downloadError) && <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-red-400/25 bg-red-500/5 p-4 text-sm text-red-300"><Icon name="info" className="w-5 h-5 shrink-0" /><p>{validationError || job.error || downloadError}</p></div>}
    <JobNotice job={job} retryConnection={retryConnection} />

    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)] gap-5 items-start">
      <div className="min-w-0 space-y-5">
        <section className="card overflow-hidden" aria-label="Resource pack conversion">
          <div className="bedrock-panel-heading"><div className="flex items-center gap-2.5"><Icon name="cube" className="w-4 h-4 text-brand-300" /><h2 className="text-sm font-semibold">{job.status === 'done' ? 'Conversion complete' : 'Source resource pack'}</h2></div><span className="text-[10px] font-mono text-slate-500">{hasJob ? job.status.toUpperCase() : `${maxMB} MB MAX`}</span></div>
          <input ref={inputRef} type="file" accept=".zip,application/zip" className="sr-only" tabIndex={-1} aria-label="Choose a Java resource pack ZIP" disabled={busy} onChange={event => { selectFiles(event.target.files); event.target.value = ''; }} />
          {!hasJob && <div className="p-5 sm:p-6">
            {!file && <div onDragOver={event => { event.preventDefault(); setIsDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false); }} onDrop={event => { event.preventDefault(); setIsDragging(false); selectFiles(event.dataTransfer.files); }} className={`bedrock-dropzone ${isDragging ? 'is-dragging' : ''}`}>
              <button type="button" onClick={() => inputRef.current?.click()} disabled={inspecting} className="w-full min-h-[250px] flex flex-col items-center justify-center p-5 rounded-xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-brand-400 disabled:cursor-wait">
                <span className={`bedrock-upload-icon ${inspecting ? 'animate-pulse' : ''}`}><Icon name={inspecting ? 'clock' : 'upload'} className="w-6 h-6" /></span>
                <span className="text-base font-semibold text-slate-100 mt-5">{inspecting ? 'Looking inside your pack…' : isDragging ? 'Drop your Java pack here' : 'Drop your Java resource pack here'}</span>
                <span className="text-xs text-slate-500 mt-2">{inspecting ? 'Reading pack metadata and asset definitions locally.' : 'A .zip with pack.mcmeta and an assets folder'}</span>
                {!inspecting && <span className="btn-ghost text-xs mt-5 !py-2 !px-4">Browse files <Icon name="arrow" className="w-3.5 h-3.5" /></span>}
              </button>
            </div>}
            {file && inspection && <div>
              <div className="flex items-center gap-3 mb-5"><span className="w-11 h-12 rounded-lg border border-brand-500/20 bg-brand-500/5 flex items-center justify-center text-brand-300 shrink-0"><Icon name="file" /></span><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-white truncate" title={file.name}>{file.name}</p><p className="text-[11px] text-slate-500 mt-1">{formatBytes(file.size)} <span className="mx-1.5">·</span> Java pack format {inspection.packFormat}</p></div><button type="button" onClick={newPack} aria-label="Remove selected pack" className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-dark-surface2"><Icon name="close" className="w-4 h-4" /></button></div>
              <div className="bedrock-stats">{[[inspection.textures, 'Textures'], [inspection.models, 'Models'], [inspection.definitions, 'Item definitions']].map(([value, label]) => <div key={label}><strong>{value.toLocaleString()}</strong><span>{label}</span></div>)}</div>
              <div className="flex flex-wrap gap-1.5 mt-4">{inspection.namespaces.slice(0, 8).map(namespace => <span key={namespace} className="bedrock-namespace">{namespace}</span>)}{inspection.namespaces.length > 8 && <span className="bedrock-namespace">+{inspection.namespaces.length - 8} more</span>}</div>
              <details className="mt-5 border-t border-dark-border pt-4" open={inspection.warnings.length > 0}>
                <summary className="text-xs font-medium cursor-pointer text-slate-300">{inspection.warnings.length ? `${inspection.warnings.length} thing${inspection.warnings.length > 1 ? 's' : ''} to review` : 'Preflight inspection complete'}</summary>
                <div className="mt-4"><WarningList warnings={inspection.warnings} /><p className="text-[11px] leading-relaxed text-slate-500 mt-3">Inspected {inspection.files.toLocaleString()} asset files and sampled {inspection.sampledModels + inspection.sampledDefinitions} JSON models / definitions. The server report covers conversion results.</p><button type="button" onClick={() => saveJson(inspection, 'preflight-report.json')} className="mt-3 text-xs text-brand-300 hover:text-brand-200">Save preflight report</button></div>
              </details>
            </div>}
            <p className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed mt-4"><Icon name="info" className="w-3.5 h-3.5 shrink-0 mt-0.5" />Inspected in your browser. Upload starts when you convert.</p>
            {file && <form className="mt-6 pt-5 border-t border-dark-border" onSubmit={event => { event.preventDefault(); if (canConvert) { start(file, { packName, useHashedIds }); setActiveTab('logs'); } }}>
              <label htmlFor="bedrock-pack-name" className="label !text-slate-400">Output pack name</label>
              <input id="bedrock-pack-name" className="field font-mono !text-xs" value={packName} onChange={event => setPackName(event.target.value)} required pattern="[a-zA-Z0-9_-]{1,64}" maxLength={64} aria-describedby="pack-name-help" />
              <p id="pack-name-help" className="text-[10px] text-slate-500 mt-2">Letters, numbers, underscores, and dashes. Up to 64 characters.</p>
              <details className="mt-4"><summary className="text-xs text-slate-400 cursor-pointer"><span className="inline-flex items-center gap-2"><Icon name="settings" className="w-3.5 h-3.5" />Identifier settings</span></summary><label className="flex items-start gap-3 mt-4"><input type="checkbox" checked={useHashedIds} onChange={event => setUseHashedIds(event.target.checked)} className="mt-0.5 w-4 h-4" /><span><span className="block text-xs font-medium text-slate-200">Use compact hashed identifiers</span><span className="block text-[11px] leading-relaxed text-slate-500 mt-1">Generated from the full resource location and Custom Model Data. Keep this setting consistent when updating a pack.</span></span></label></details>
              <button type="submit" disabled={!canConvert} className="btn-primary w-full mt-6 !py-3">Convert to Bedrock <Icon name="arrow" className="w-4 h-4" /></button><p className="text-center text-[10px] text-slate-500 mt-3">One download with the pack, mappings, and conversion report.</p>
            </form>}
          </div>}
          {busy && <div className="p-6 sm:p-8 min-h-[330px] flex flex-col justify-center">
            <span className="bedrock-processing-icon"><Icon name={job.status === 'queued' ? 'clock' : 'cube'} className="w-7 h-7" /></span><h3 className="text-lg font-semibold mt-6">{phase}</h3><p className="text-xs text-slate-500 mt-2 truncate">{job.fileName}</p>
            <div className="flex items-center justify-between gap-3 mt-7 text-[11px]"><span className="text-slate-400">{job.status === 'uploading' ? 'Upload progress' : job.total > 0 ? `Server progress · ${job.current} / ${job.total}` : 'Waiting for server progress'}</span><span className="font-mono text-brand-300">{percent !== null ? `${percent}%` : 'In progress'}</span></div>
            <div className="bedrock-progress mt-3" role="progressbar" aria-label="Conversion progress" aria-valuemin={0} aria-valuemax={100} {...(percent !== null ? { 'aria-valuenow': percent } : {})}><span className={percent === null ? 'is-indeterminate' : ''} style={percent !== null ? { width: `${percent}%` } : undefined} /></div>
            {job.eta > 0 && <p className="text-[11px] text-slate-500 mt-3">Server estimate: {job.eta < 60 ? `${job.eta}s` : `${Math.ceil(job.eta / 60)} min`} remaining</p>}
            <p className="text-xs text-slate-400 leading-relaxed mt-5">{job.taskId ? 'Processing continues on the server. Return to this page to check progress.' : 'Keep this page open until the server accepts your upload.'}</p>
            {job.status === 'uploading' && job.upload < 100 && <button type="button" onClick={reset} className="self-start text-xs text-slate-400 hover:text-white mt-4 underline underline-offset-4">Cancel upload</button>}
          </div>}
          {job.status === 'done' && <div className="p-6 sm:p-7">
            <div className="flex gap-4 items-start"><span className="flex w-12 h-12 items-center justify-center shrink-0 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300"><Icon name="check" className="w-6 h-6" /></span><div className="min-w-0"><h3 className="text-xl font-semibold">Conversion complete</h3><p className="text-xs text-slate-400 mt-2 leading-relaxed break-words">{job.fileName} has been processed. Review the report, then test the pack in game.</p></div></div>
            <div className="bedrock-stats mt-6">{[[formatBytes(job.originalSize || job.fileSize), 'Source ZIP'], [formatBytes(job.finalSize), 'Output bundle'], [report?.converted_items ?? '—', 'Mapped items']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
            <button type="button" onClick={download} disabled={downloading} className="btn-primary w-full !py-3 mt-6"><Icon name="download" className="w-4 h-4" />{downloading ? 'Preparing download…' : 'Download conversion bundle'}<span className="font-mono text-[10px] opacity-70">.zip</span></button>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4"><button type="button" onClick={newPack} className="text-xs text-slate-400 hover:text-white">Convert another pack</button>{report && <button type="button" onClick={() => saveJson(report, 'conversion_report.json')} className="text-xs text-brand-300 hover:text-brand-200">Save conversion report</button>}</div>
            <div className="mt-6 border-t border-dark-border pt-5"><h4 className="text-xs font-semibold text-slate-300 mb-3">Fidelity review</h4>{reportWarnings.length ? <WarningList warnings={reportWarnings} /> : <p className="text-xs text-slate-400 leading-relaxed">{report ? 'No additional warnings were returned by the engine. Test model appearance and item predicates in game.' : 'Open conversion_report.json in your bundle to inspect the engine results. This server does not expose an inline report.'}</p>}</div>
          </div>}
          {job.status === 'error' && <div className="p-6 sm:p-8 min-h-[240px] flex flex-col justify-center"><Icon name="info" className="w-8 h-8 text-red-300 mb-5" /><h3 className="text-xl font-semibold">Conversion failed</h3><p className="text-xs text-slate-400 leading-relaxed mt-3">Check the error above and the conversion logs. Your original Java pack has not been changed.</p><button type="button" onClick={() => { reset(); setActiveTab('output'); }} className="btn-ghost mt-6 self-start">{file ? 'Review settings & retry' : 'Choose a resource pack'}</button></div>}
        </section>
        <div className="flex items-start gap-3 px-1"><Icon name="info" className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" /><p className="text-[11px] leading-relaxed text-slate-500">Designed to preserve your pack’s look where the formats allow. Java shaders, client mods, and server plugin behavior cannot be reproduced from a resource pack alone. Complex item predicates may use fallbacks; always review the report.</p></div>
      </div>
      <aside className="space-y-5 min-w-0" aria-label="Conversion output and instructions">
        <section className="card overflow-hidden">
          <div className="flex border-b border-dark-border px-5 gap-6" role="tablist" aria-label="Conversion details">{[['output', 'Output bundle'], ['logs', 'Activity log']].map(([id, label]) => <button key={id} type="button" id={`tab-${id}`} role="tab" aria-selected={activeTab === id} aria-controls={`panel-${id}`} tabIndex={activeTab === id ? 0 : -1} onClick={() => setActiveTab(id)} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); const next = id === 'output' ? 'logs' : 'output'; setActiveTab(next); document.getElementById(`tab-${next}`)?.focus(); } }} className={`bedrock-tab ${activeTab === id ? 'is-active' : ''}`}>{label}{id === 'logs' && job.logs.length > 0 && <span className="ml-2 text-[10px] font-mono opacity-60">{job.logs.length}</span>}</button>)}</div>
          {activeTab === 'output' ? <div id="panel-output" role="tabpanel" aria-labelledby="tab-output" className="p-5">
            <p className="text-[11px] text-slate-500 mb-5">{job.status === 'done' ? 'Generated files reported by the converter.' : 'Everything travels together in one ZIP.'}</p>
            <ul className="space-y-4">{outputs.map((output, index) => {
              const name = typeof output === 'string' ? output : JSON.stringify(output);
              return <li key={`${name}-${index}`} className="flex items-start gap-3"><span className={`bedrock-output-icon ${name.endsWith('.mcpack') ? 'is-pack' : ''}`}><Icon name={name.endsWith('.mcpack') ? 'cube' : 'file'} className="w-4 h-4" /></span><div className="min-w-0"><p className="text-[11px] font-mono text-slate-300 break-all leading-relaxed">{name}</p><p className="text-[10px] text-slate-500 mt-1">{name.endsWith('.mcpack') ? 'Bedrock textures, models & attachables' : name.includes('report') ? 'Conversion counts & fidelity warnings' : name.includes('blocks') ? 'Generated custom block mappings' : 'Geyser Custom Item API v2 mappings'}</p></div></li>;
            })}</ul>
            <div className="flex items-center justify-between border-t border-dark-border mt-5 pt-4"><span className="text-[10px] uppercase tracking-wider text-slate-500">Delivery format</span><span className="text-xs font-mono text-slate-300">.zip bundle</span></div>
          </div> : <div id="panel-logs" role="tabpanel" aria-labelledby="tab-logs" className="p-5">
            <div className="flex items-center justify-between mb-3"><label className="flex items-center gap-2 text-[10px] text-slate-500"><input type="checkbox" checked={followLogs} onChange={event => setFollowLogs(event.target.checked)} />Follow output</label><button type="button" onClick={copyLogs} disabled={!job.logs.length} className="text-[10px] text-slate-400 hover:text-white disabled:opacity-30 flex gap-1.5 items-center"><Icon name="copy" className="w-3 h-3" />{copyState || 'Copy log'}</button></div>
            <div ref={logsRef} className="bedrock-log" aria-label="Server conversion logs">{job.logs.length ? job.logs.map((line, index) => <p key={index} className={/error|failed|❌/i.test(line) ? 'text-red-300' : /warn|fallback|⚠/i.test(line) ? 'text-amber-200' : ''}><span className="text-slate-700 mr-2 select-none">{String(index + 1).padStart(2, '0')}</span>{line}</p>) : <p className="text-slate-600">{busy ? 'Waiting for the server to publish conversion logs…' : 'Server activity will appear here when you start a conversion.'}</p>}</div>
            {job.taskId && <p className="text-[9px] text-slate-600 font-mono break-all mt-3">Task {job.taskId}</p>}
          </div>}
        </section>
        <section className="card p-5"><InstallGuide /></section>
        <div className="px-1 flex gap-2 items-center text-[10px] text-slate-600"><span className="w-1 h-1 rounded-full bg-slate-600" />Browser upload. Server conversion. No client mod required.</div>
      </aside>
    </div>
  </div>;
}
