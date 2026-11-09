import { API_URL } from './api.js';

export const validTaskId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
const number = value => Math.max(0, Number(value) || 0);
const text = value => typeof value === 'string' ? value.slice(0, 256) : '';

export function jobStorageKey(kind, username, api = API_URL) {
  return `converttexture:job:v1:${encodeURIComponent(api)}:${encodeURIComponent(username)}:${kind}`;
}

// Keep a bounded checkpoint, never a token or the uploaded ZIP. The server is
// still the authority for completion, permissions, and output availability.
export function jobCheckpoint(job) {
  if (!validTaskId(job?.taskId)) return null;
  return {
    version: 1, taskId: job.taskId, fileName: text(job.fileName), fileSize: number(job.fileSize),
    packName: text(job.packName), startedAt: number(job.startedAt), status: text(job.status),
    current: number(job.current), total: number(job.total),
    logs: Array.isArray(job.logs) ? job.logs.slice(-100).map(line => String(line).slice(0, 500)) : [],
  };
}

export function saveJob(key, job, storage) {
  try {
    storage ??= globalThis.localStorage;
    const checkpoint = jobCheckpoint(job);
    if (!checkpoint) return false;
    storage.setItem(key, JSON.stringify(checkpoint));
    return true;
  } catch { return false; }
}

export function readJob(key, storage) {
  try {
    storage ??= globalThis.localStorage;
    const saved = JSON.parse(storage.getItem(key));
    return saved?.version === 1 ? jobCheckpoint(saved) : null;
  } catch { return null; }
}

export function forgetJob(key, storage) {
  try { (storage ?? globalThis.localStorage).removeItem(key); } catch { /* Storage is optional. */ }
}
