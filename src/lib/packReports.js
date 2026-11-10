import versions from './javaVersions.json' with { type: 'json' };

export const javaVersions = versions;
export const rangePresets = [
  { name: 'Item bridge', min: '1.20.2', max: '1.21.4', description: 'Bridge plain CustomModelData items across the 1.21.4 item format change.' },
  { name: 'Extended range', min: '1.20.2', max: '26.3', description: 'Include newer metadata and item atlas sources. More assets need manual review.' },
];

export function selectedVersions(min, max) {
  const first = versions.findIndex(version => version.id === min);
  const last = versions.findIndex(version => version.id === max);
  return first < 0 || last < first ? [] : versions.slice(first, last + 1);
}

export function formatVersion(value) {
  if (!Array.isArray(value) || !value.length) return 'Unknown';
  return value[1] && value[1] < 2147483647 ? `${value[0]}.${value[1]}` : String(value[0]);
}

export function inspectorFindings(report, severity = 'all', query = '') {
  const rows = [...(report?.health?.findings || []), ...(report?.invalid_jsons || []).map(row => ({ severity: 'error', code: 'json_syntax', path: row.path, message: row.error, action: 'Correct the JSON syntax in the source pack, then inspect again.' }))];
  const search = query.trim().toLowerCase();
  return rows.filter(row => (severity === 'all' || row.severity === severity) && (!search || [row.path, row.code, row.message, row.action].join(' ').toLowerCase().includes(search)));
}

export function exportReport(report, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
