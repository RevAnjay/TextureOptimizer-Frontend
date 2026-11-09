export const API_URL = (import.meta.env?.VITE_API_URL?.trim() || '/api').replace(/\/+$/, '');

export async function responseError(response, fallback = 'The server could not complete this request.') {
  try {
    const body = await response.json();
    const message = body.detail || body.error_msg || body.error;
    if (typeof message === 'string') return message;
  } catch { /* A proxy can return an HTML error instead of JSON. */ }
  if (response.status === 401) return 'Your session has expired. Sign in again to continue.';
  if (response.status === 413) return 'This pack exceeds the server upload limit.';
  if (response.status === 429) return 'Too many requests. Please wait before trying again.';
  return `${fallback} (HTTP ${response.status})`;
}

export function formatBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3);
  return `${(bytes / 1024 ** unit).toFixed(unit > 1 ? 1 : 0)} ${['B', 'KB', 'MB', 'GB'][unit]}`;
}

export function newPasswordError(password) {
  const length = new TextEncoder().encode(password).length;
  if (length < 8) return 'Password must be at least 8 characters.';
  if (length > 72) return 'Password is too long. Use fewer characters (maximum 72 UTF-8 bytes).';
  return '';
}

function safeDownloadName(filename) {
  let name = String(filename || 'resource_pack.zip')
    .replace(/[^a-zA-Z0-9_. ()-]/g, '_')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, 120);
  if (!name) name = 'resource_pack';
  if (!/\.zip$/i.test(name)) name += '.zip';
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) name = `pack_${name}`;
  return name;
}

/** Download private task output without putting credentials in its URL. */
export async function downloadTask(taskId, token, filename, signal) {
  if (typeof token !== 'string' || !token.trim()) throw new Error('Sign in again to download this pack.');
  if (typeof taskId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(taskId)) throw new Error('This conversion has no valid task ID.');
  signal?.throwIfAborted();
  const response = await fetch(`${API_URL}/download/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${token}` }, signal,
  });
  if (!response.ok) throw new Error(await responseError(response, 'Could not download this pack.'));
  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (contentType && !['application/zip', 'application/x-zip-compressed', 'application/octet-stream'].includes(contentType)) {
    throw new Error('The server returned an unreadable pack download.');
  }
  const blob = await response.blob();
  signal?.throwIfAborted();
  const suggested = response.headers.get('content-disposition')?.match(/filename="([^"]*)"/i)?.[1];
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  try {
    anchor.href = url;
    anchor.download = safeDownloadName(filename || suggested);
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    const release = setTimeout(() => URL.revokeObjectURL(url), 60000);
    release?.unref?.();
  }
}
