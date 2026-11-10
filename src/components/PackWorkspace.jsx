import { useEffect, useRef, useState } from 'react';
import { formatBytes } from '../lib/api';

const paths = {
  upload: 'M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4',
  file: 'M14 2H5v20h14V7l-5-5ZM14 2v6h5M8 12h8m-8 4h5',
  check: 'm5 12 4 4L19 6', close: 'm6 6 12 12M6 18 18 6',
  download: 'M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5',
  clock: 'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  arrow: 'M4 12h16m-5-5 5 5-5 5',
};

export function ToolIcon({ name, className = 'w-5 h-5' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.file} /></svg>;
}

export function ToolHeader({ eyebrow = 'Resource pack tools', title, description, meta }) {
  return <header className="tool-header"><div><p className="tool-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="tool-description">{description}</p></div>{meta && <span className="tool-meta">{meta}</span>}</header>;
}

export function PanelHeading({ number, title, children }) {
  return <div className="workspace-panel-heading"><h2>{number && <span>{number}</span>}{title}</h2>{children}</div>;
}

export function PackPicker({ file, onChange, maxMB, error, setError }) {
  const input = useRef(null);
  const [dragging, setDragging] = useState(false);
  function select(files) {
    if (!files?.length) return;
    if (files.length !== 1 || !/\.zip$/i.test(files[0].name)) { setError('Choose one resource pack ZIP file.'); return; }
    if (files[0].size > maxMB * 1024 * 1024) { setError(`This account accepts packs up to ${maxMB} MB.`); return; }
    setError('');
    onChange(files[0]);
  }
  return <>
    <input ref={input} type="file" accept=".zip,application/zip" className="sr-only" aria-label="Choose resource pack ZIP" onChange={event => { select(event.target.files); event.target.value = ''; }} />
    {file ? <div className="selected-pack"><ToolIcon name="file" /><div><p title={file.name}>{file.name}</p><span>{formatBytes(file.size)} · ZIP archive</span></div><button type="button" onClick={() => onChange(null)} aria-label="Remove selected pack"><ToolIcon name="close" className="w-4 h-4" /></button></div>
      : <div className={`pack-dropzone ${dragging ? 'is-dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={event => { event.preventDefault(); setDragging(false); select(event.dataTransfer.files); }}>
        <ToolIcon name="upload" className="w-7 h-7 text-slate-400" /><p>{dragging ? 'Drop your pack here' : 'Choose a resource pack'}</p><span>Drop a .zip here, or browse your files. Up to {maxMB} MB.</span><button type="button" onClick={() => input.current?.click()} className="btn-ghost">Browse files <ToolIcon name="arrow" className="w-4 h-4" /></button>
      </div>}
    {error && <p role="alert" className="text-sm text-red-300 mt-3">{error}</p>}
  </>;
}

export function JobNotice({ job, retryConnection }) {
  if (job.connectionError) return <div role="status" className="job-notice is-warning"><span>{job.connectionError} Your task is retained.</span><button type="button" onClick={retryConnection}>Retry now</button></div>;
  if (job.storageError) return <div role="status" className="job-notice is-warning">Browser storage is unavailable. Keep this page open to follow this task, or find it in Tasks.</div>;
  if (!job.taskId || job.unavailable) return null;
  return <div role="status" className="job-notice"><ToolIcon name="check" className="w-4 h-4 shrink-0" /><span>{job.restoring ? 'Restoring your task. Checking the latest server status…' : job.restored ? 'Task restored. You’re viewing the latest server status.' : 'Task saved. You can reload or leave this page and return later.'}</span></div>;
}

export function JobPanel({ controller, action, onReset, downloadable = true }) {
  const { job, download, downloading, downloadError, reset } = controller;
  const uploading = job.status === 'uploading';
  const done = job.status === 'done';
  const failed = job.status === 'error';
  const percent = uploading ? job.upload : job.total > 0 ? Math.min(100, Math.round(job.current / job.total * 100)) : null;
  const title = job.restoring ? 'Reconnecting to your task' : done ? `${action} complete` : failed ? 'Task could not finish' : uploading ? 'Uploading resource pack' : job.status === 'queued' ? 'Waiting in queue' : `${action} in progress`;
  const reduction = job.originalSize > 0 ? Math.round((1 - job.finalSize / job.originalSize) * 100) : 0;
  return <section className="card overflow-hidden">
    <PanelHeading title="Task progress"><span className={`task-label ${done ? 'is-done' : failed ? 'is-error' : ''}`}>{job.restoring ? 'Reconnecting' : job.status}</span></PanelHeading>
    <div className="job-panel-body">
      <div className="job-title-row"><span className="job-symbol"><ToolIcon name={done ? 'check' : failed ? 'close' : uploading ? 'upload' : 'clock'} /></span><div className="min-w-0"><h3>{title}</h3><p className="truncate" title={job.fileName}>{job.fileName}</p></div></div>
      {!done && !failed && <>
        <div className="job-progress-label"><span>{uploading ? 'Upload' : job.status === 'queued' ? job.queuePosition ? `Queue position ${job.queuePosition}` : 'Waiting for an available worker' : job.total > 0 ? `${job.current.toLocaleString()} / ${job.total.toLocaleString()} files` : 'Waiting for server progress'}</span><strong>{percent === null ? '—' : `${percent}%`}</strong></div>
        <div className="bedrock-progress" role="progressbar" aria-label="Task progress" aria-valuemin={0} aria-valuemax={100} {...(percent === null ? {} : { 'aria-valuenow': percent })}><span className={percent === null ? 'is-indeterminate' : ''} style={percent === null ? undefined : { width: `${percent}%` }} /></div>
        <p className="job-footnote">{uploading ? 'Keep this page open until the server accepts your upload.' : job.eta > 0 ? `About ${job.eta < 60 ? `${Math.ceil(job.eta)} seconds` : `${Math.ceil(job.eta / 60)} minutes`} remaining. Processing continues on the server.` : 'Processing continues on the server, even when you leave this page.'}</p>
        {uploading && <button type="button" onClick={reset} className="text-xs text-slate-400 underline underline-offset-4 mt-5">Cancel upload</button>}
      </>}
      {done && <>
        {downloadable && <div className="result-sizes"><div><span>Original</span><strong>{formatBytes(job.originalSize || job.fileSize)}</strong></div><div><span>Output</span><strong>{formatBytes(job.finalSize)}</strong></div>{action === 'Optimization' && <div><span>{reduction >= 0 ? 'Smaller by' : 'Larger by'}</span><strong>{Math.abs(reduction)}%</strong></div>}</div>}
        {downloadable && <button type="button" onClick={download} disabled={downloading} className="btn-primary mt-6 w-full"><ToolIcon name="download" className="w-4 h-4" />{downloading ? 'Preparing download…' : 'Download resource pack'}</button>}
        <button type="button" onClick={onReset} className="text-xs text-slate-400 hover:text-white mt-4">Process another pack</button>
      </>}
      {failed && <><p role="alert" className="text-sm text-red-300 mt-5 leading-relaxed">{job.error}</p><button type="button" onClick={onReset} className="btn-ghost mt-6">Start a new task</button></>}
      {downloadError && <p role="alert" className="text-sm text-red-300 mt-4">{downloadError}</p>}
      {job.taskId && <p className="job-id">Task {job.taskId}</p>}
    </div>
  </section>;
}

export function ActivityLog({ logs, hasJob }) {
  const ref = useRef(null);
  const [follow, setFollow] = useState(true);
  useEffect(() => { if (follow && ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs, follow]);
  return <section className="card overflow-hidden"><PanelHeading title="Activity"><label className="text-xs text-slate-400 flex items-center gap-2"><input type="checkbox" checked={follow} onChange={event => setFollow(event.target.checked)} />Follow</label></PanelHeading><div ref={ref} className="activity-log" aria-label="Task activity log">{logs.length ? logs.map((line, i) => <p key={i} className={/error|failed|❌/i.test(line) ? 'text-red-300' : /warn|fallback|⚠/i.test(line) ? 'text-amber-200' : ''}><span>{String(i + 1).padStart(2, '0')}</span>{line}</p>) : <div className="activity-empty"><ToolIcon name="clock" className="w-5 h-5" /><p>{hasJob ? 'Waiting for server activity.' : 'No task running.'}</p><span>{hasJob ? 'Updates will appear here.' : 'Start a task to see its progress and logs.'}</span></div>}</div></section>;
}
