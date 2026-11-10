import { useEffect, useRef, useState } from 'react';
import { API_URL, responseError, downloadTask } from '../lib/api';
import { jobStorageKey, readJob, saveJob, forgetJob, validTaskId } from '../lib/jobStorage';

const emptyJob = () => ({ status: 'idle', taskId: null, logs: [], current: 0, total: 0, eta: 0, upload: 0, error: '', connectionError: '', report: null, optimizationReport: null, result: null, restoring: false, restored: false, storageError: false });

function restoreJob(key) {
  const saved = readJob(key);
  return saved ? { ...emptyJob(), ...saved, status: 'queued', restoring: true, restored: true } : emptyJob();
}

export default function usePackJob(token, username, kind) {
  const storageKey = jobStorageKey(kind, username);
  const [job, setJob] = useState(() => restoreJob(storageKey));
  const [retry, setRetry] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const uploadRef = useRef(null);
  const downloadRef = useRef(null);
  const mounted = useRef(true);
  const operationRef = useRef(0);
  const pollVersionRef = useRef(0);
  const taskRef = useRef(job.taskId);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      operationRef.current++;
      const upload = uploadRef.current;
      const download = downloadRef.current;
      uploadRef.current = null;
      downloadRef.current = null;
      upload?.abort();
      download?.abort();
    };
  }, []);

  useEffect(() => {
    if (!job.taskId || taskRef.current !== job.taskId) return;
    if (job.unavailable) return;
    const saved = saveJob(storageKey, job);
    if (!saved && !job.storageError) setJob(previous => ({ ...previous, storageError: true }));
  }, [storageKey, job]);

  useEffect(() => {
    if (job.status !== 'uploading' || job.taskId) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [job.status, job.taskId]);

  useEffect(() => {
    if (!job.taskId || !token) return;
    let stopped = false;
    let timer;
    let request;
    let failures = 0;
    const taskId = job.taskId;
    const operation = operationRef.current;
    const pollVersion = pollVersionRef.current;
    const isCurrent = () => !stopped && mounted.current && operationRef.current === operation && pollVersionRef.current === pollVersion && taskRef.current === taskId;
    const updateJob = update => setJob(previous => isCurrent() && previous.taskId === taskId ? update(previous) : previous);
    async function poll() {
      if (!isCurrent()) return;
      request = new AbortController();
      const timeout = setTimeout(() => request.abort(), 15000);
      let nextDelay = 1200;
      let finished = false;
      try {
        const response = await fetch(`${API_URL}/status/${encodeURIComponent(taskId)}`, {
          headers: { Authorization: `Bearer ${token}` }, signal: request.signal,
        });
        if (!isCurrent()) return;
        if ([401, 403, 404, 410].includes(response.status)) {
          const unavailable = [403, 404, 410].includes(response.status);
          const error = response.status === 404 || response.status === 410
            ? 'This task is no longer available on the server. Upload your pack to start again.'
            : response.status === 403 ? 'This account cannot access this task.' : 'Your session has expired. Sign in again to retrieve this task.';
          if (unavailable) forgetJob(storageKey);
          updateJob(previous => ({ ...previous, status: 'error', error, connectionError: '', restoring: false, unavailable }));
          finished = true;
          return;
        }
        if (!response.ok) throw new Error(await responseError(response, 'Could not retrieve conversion status.'));
        const data = await response.json();
        if (!isCurrent()) return;
        if (!['queued', 'uploading', 'processing', 'scanning', 'done', 'error'].includes(data.status)) throw new Error('The server returned an unreadable task status.');
        failures = 0;
        finished = data.status === 'done' || data.status === 'error';
        updateJob(previous => ({
          ...previous, status: data.status === 'scanning' ? 'processing' : data.status,
          logs: Array.isArray(data.logs) ? data.logs.map(String) : [],
          current: Math.max(0, Number(data.current) || 0), total: Math.max(0, Number(data.total) || 0),
          eta: Math.max(0, Number(data.eta) || 0), queuePosition: data.queue_position,
          originalSize: data.original_size, finalSize: data.final_size,
          report: data.conversion_report || null,
          optimizationReport: data.optimization_report || null,
          result: data.result || null,
          error: data.status === 'error' ? (data.error_msg || data.error || 'Conversion failed. See the server log for details.') : '',
          connectionError: '', restoring: false,
        }));
      } catch (error) {
        if (!isCurrent()) return;
        failures++;
        nextDelay = Math.min(15000, 1200 * 2 ** Math.min(failures, 4));
        updateJob(previous => ({ ...previous, connectionError: `${error.name === 'AbortError' ? 'The status request timed out.' : error.message} Reconnecting automatically…` }));
      } finally {
        clearTimeout(timeout);
        if (isCurrent() && !finished) timer = setTimeout(poll, nextDelay);
      }
    }
    poll();
    return () => { stopped = true; clearTimeout(timer); request?.abort(); };
  }, [job.taskId, token, retry, storageKey]);

  function start(file, fields = {}) {
    if (!mounted.current || uploadRef.current || ['uploading', 'queued', 'processing'].includes(job.status)) return;
    const operation = ++operationRef.current;
    taskRef.current = null;
    const previousDownload = downloadRef.current;
    downloadRef.current = null;
    previousDownload?.abort();
    setDownloading(false);
    forgetJob(storageKey);
    const xhr = new XMLHttpRequest();
    uploadRef.current = xhr;
    const isCurrent = () => mounted.current && operationRef.current === operation && uploadRef.current === xhr;
    const updateJob = update => setJob(previous => mounted.current && operationRef.current === operation ? update(previous) : previous);
    setDownloadError('');
    const initial = { ...emptyJob(), status: 'uploading', fileName: file.name, fileSize: file.size, packName: fields.packName || '', startedAt: Date.now() };
    setJob(initial);
    const form = new FormData();
    form.append('file', file);
    for (const [key, value] of Object.entries(fields)) form.append(key, String(value));
    xhr.upload.onprogress = event => {
      if (isCurrent() && event.lengthComputable) updateJob(previous => ({ ...previous, upload: Math.round(event.loaded / event.total * 100) }));
    };
    const fail = error => {
      if (!isCurrent()) return;
      uploadRef.current = null;
      updateJob(previous => ({ ...previous, status: 'error', error }));
    };
    xhr.onload = () => {
      if (!isCurrent()) return;
      let body;
      try { body = JSON.parse(xhr.responseText); } catch { /* Handled below. */ }
      if (xhr.status < 200 || xhr.status >= 300) {
        fail(typeof body?.detail === 'string' ? body.detail : xhr.status === 413 ? 'This pack exceeds the server upload limit.' : `Upload failed (HTTP ${xhr.status}). Please try again.`);
      } else if (body?.error || !validTaskId(body?.task_id)) {
        fail(typeof body?.error === 'string' ? body.error : 'The server did not return a valid conversion ID.');
      } else {
        uploadRef.current = null;
        taskRef.current = body.task_id;
        const accepted = { ...initial, status: 'queued', taskId: body.task_id, upload: 100 };
        // Save immediately on admission, before the next React render.
        accepted.storageError = !saveJob(storageKey, accepted);
        updateJob(() => accepted);
      }
    };
    xhr.onerror = () => fail('Could not reach the conversion server. Check your connection and try again.');
    xhr.ontimeout = () => fail('The upload timed out. Check your connection and try again.');
    xhr.onabort = () => { if (uploadRef.current === xhr) uploadRef.current = null; };
    try {
      xhr.open('POST', `${API_URL}/${kind === 'optimizer' ? 'upload' : kind === 'inspector' ? 'scan' : 'convert'}`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.timeout = 5 * 60 * 1000;
      xhr.send(form);
    }
    catch { fail('The upload could not be started. Check the server address and try again.'); }
  }

  function reset() {
    operationRef.current++;
    taskRef.current = null;
    const upload = uploadRef.current;
    const download = downloadRef.current;
    uploadRef.current = null;
    downloadRef.current = null;
    upload?.abort();
    download?.abort();
    forgetJob(storageKey);
    setJob(emptyJob());
    setDownloading(false);
    setDownloadError('');
  }

  async function download() {
    if (!mounted.current || !job.taskId || taskRef.current !== job.taskId || job.status !== 'done' || downloadRef.current) return;
    const controller = new AbortController();
    const operation = operationRef.current;
    const taskId = job.taskId;
    downloadRef.current = controller;
    const isCurrent = () => mounted.current && operationRef.current === operation && taskRef.current === taskId && downloadRef.current === controller && !controller.signal.aborted;
    setDownloading(true);
    setDownloadError('');
    try {
      const name = kind === 'bedrock' ? `${job.packName || 'bedrock-pack'}_bedrock.zip`
        : `${(job.fileName || 'resource_pack').replace(/\.zip$/i, '')}_${kind === 'optimizer' ? 'optimized' : kind === 'multiversion' ? 'multiversion' : 'converted'}.zip`;
      await downloadTask(taskId, token, name, controller.signal);
    } catch (error) {
      if (isCurrent() && error.name !== 'AbortError') setDownloadError(error.message);
    } finally {
      if (downloadRef.current === controller) {
        downloadRef.current = null;
        if (mounted.current && operationRef.current === operation) setDownloading(false);
      }
    }
  }

  function retryConnection() {
    if (!mounted.current) return;
    pollVersionRef.current++;
    setJob(previous => ({ ...previous, connectionError: '' }));
    setRetry(value => value + 1);
  }

  return { job, start, reset, download, downloading, downloadError, retryConnection };
}
