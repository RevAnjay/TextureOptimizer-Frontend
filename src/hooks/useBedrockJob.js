import { useEffect, useRef, useState } from 'react';
import { API_URL, responseError } from '../lib/api';

const emptyJob = () => ({ status: 'idle', taskId: null, logs: [], current: 0, total: 0, eta: 0, upload: 0, error: '', connectionError: '', report: null });

function restoreJob(key) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key));
    if (typeof saved?.taskId === 'string' && /^[\w-]+$/.test(saved.taskId)) {
      return { ...emptyJob(), ...saved, status: 'queued', logs: [], connectionError: '', error: '' };
    }
  } catch { /* Storage can be disabled in private browsing. */ }
  return emptyJob();
}

export default function useBedrockJob(token, username) {
  const storageKey = `converttexture:bedrock:${username || 'account'}`;
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
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({
        taskId: job.taskId, fileName: job.fileName, fileSize: job.fileSize,
        packName: job.packName, startedAt: job.startedAt,
      }));
    } catch { /* Conversion remains usable when storage is unavailable. */ }
  }, [storageKey, job.taskId, job.fileName, job.fileSize, job.packName, job.startedAt]);

  useEffect(() => {
    if (!job.taskId) return;
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
          const error = response.status === 404 || response.status === 410
            ? 'This conversion is no longer available on the server. Upload your pack to start again.'
            : 'Your session has expired. Sign in again to retrieve this conversion.';
          updateJob(previous => ({ ...previous, status: 'error', error, connectionError: '' }));
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
          error: data.status === 'error' ? (data.error_msg || data.error || 'Conversion failed. See the server log for details.') : '',
          connectionError: '',
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
  }, [job.taskId, token, retry]);

  function start(file, { packName, useHashedIds }) {
    if (!mounted.current || uploadRef.current || ['uploading', 'queued', 'processing'].includes(job.status)) return;
    const operation = ++operationRef.current;
    taskRef.current = null;
    const previousDownload = downloadRef.current;
    downloadRef.current = null;
    previousDownload?.abort();
    setDownloading(false);
    try { sessionStorage.removeItem(storageKey); } catch { /* Storage is optional. */ }
    const xhr = new XMLHttpRequest();
    uploadRef.current = xhr;
    const isCurrent = () => mounted.current && operationRef.current === operation && uploadRef.current === xhr;
    const updateJob = update => setJob(previous => mounted.current && operationRef.current === operation ? update(previous) : previous);
    setDownloadError('');
    setJob({ ...emptyJob(), status: 'uploading', fileName: file.name, fileSize: file.size, packName, startedAt: Date.now() });
    const form = new FormData();
    form.append('file', file);
    form.append('targetFormat', '999');
    form.append('packName', packName.trim());
    form.append('useHashedIds', String(useHashedIds));
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
      } else if (body?.error || typeof body?.task_id !== 'string' || !/^[\w-]+$/.test(body.task_id)) {
        fail(typeof body?.error === 'string' ? body.error : 'The server did not return a valid conversion ID.');
      } else {
        uploadRef.current = null;
        taskRef.current = body.task_id;
        updateJob(previous => ({ ...previous, status: 'queued', taskId: body.task_id, upload: 100 }));
      }
    };
    xhr.onerror = () => fail('Could not reach the conversion server. Check your connection and try again.');
    xhr.ontimeout = () => fail('The upload timed out. Check your connection and try again.');
    xhr.onabort = () => { if (uploadRef.current === xhr) uploadRef.current = null; };
    try {
      xhr.open('POST', `${API_URL}/convert`);
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
    try { sessionStorage.removeItem(storageKey); } catch { /* Storage is optional. */ }
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
      const response = await fetch(`${API_URL}/download/${encodeURIComponent(job.taskId)}`, {
        headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
      });
      if (!response.ok) throw new Error(await responseError(response, 'Could not download the conversion bundle.'));
      const blob = await response.blob();
      if (!isCurrent()) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(job.packName || 'bedrock-pack').replace(/[^a-zA-Z0-9_-]/g, '_')}_bedrock.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
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
