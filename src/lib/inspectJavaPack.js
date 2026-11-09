// Read the ZIP directory and a bounded sample of JSON locally. No texture decoding
// or whole-archive extraction is needed to inspect a pack before uploading it.
const decoder = new TextDecoder('utf-8');
const MAX_ENTRIES = 60000;
const MAX_EXPANDED_BYTES = 512 * 1024 * 1024;
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const MAX_FORMAT_COMPONENT = 0x7fffffff;

function readFormatVersion(value, defaultMinor) {
  const parts = Array.isArray(value) ? value : [value];
  if (parts.length < 1 || parts.length > 2 || !parts.every(part => Number.isInteger(part) && part >= 0 && part <= MAX_FORMAT_COMPONENT)) return null;
  return [parts[0], parts.length === 2 ? parts[1] : defaultMinor];
}

function readPackFormat(pack) {
  const legacy = pack?.pack_format;
  const hasLegacy = Object.hasOwn(pack || {}, 'pack_format');
  const validLegacy = Number.isInteger(legacy) && legacy > 0;
  if (hasLegacy && !validLegacy) throw new Error('pack.mcmeta must contain a valid pack.pack_format number when that field is present.');
  const hasBounds = Object.hasOwn(pack || {}, 'min_format') || Object.hasOwn(pack || {}, 'max_format');
  if (!hasBounds) {
    if (validLegacy) return { packFormat: legacy, sourceFormat: { pack_format: legacy } };
    throw new Error('pack.mcmeta must contain a valid pack.pack_format number or ordered min_format / max_format versions.');
  }
  // Modern resource packs can omit pack_format from version 65 onward.
  // Mojang's 1.21.9 metadata contract gives shorthand max_format an open minor range.
  const min = readFormatVersion(pack?.min_format, 0);
  const max = readFormatVersion(pack?.max_format, MAX_FORMAT_COMPONENT);
  if (!min || !max || (!validLegacy && min[0] < 65) || min[0] > max[0] || (min[0] === max[0] && min[1] > max[1])) {
    throw new Error('pack.mcmeta must contain ordered min_format / max_format versions; ranges below resource format 65 also require a valid pack.pack_format number.');
  }
  return {
    packFormat: validLegacy ? legacy : `${min[0]}.${min[1]}–${max[0]}.${max[1] === MAX_FORMAT_COMPONENT ? 'x' : max[1]}`,
    sourceFormat: { ...(validLegacy ? { pack_format: legacy } : {}), min_format: min, max_format: max },
  };
}

async function readBytes(file, start, length) {
  if (start < 0 || length < 0 || start + length > file.size) throw new Error('The ZIP is truncated or has an invalid directory.');
  return new Uint8Array(await file.slice(start, start + length).arrayBuffer());
}

export async function readZipDirectory(file) {
  const tail = await readBytes(file, Math.max(0, file.size - 65557), Math.min(file.size, 65557));
  const view = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  let end = -1;
  for (let i = tail.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === tail.length) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error('This is not a readable ZIP archive. Re-export your Java resource pack as .zip.');
  const count = view.getUint16(end + 10, true);
  const directorySize = view.getUint32(end + 12, true);
  const directoryOffset = view.getUint32(end + 16, true);
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || view.getUint16(end + 8, true) !== count) {
    throw new Error('Split ZIP archives are not supported. Upload a single .zip file.');
  }
  if (count === 65535 || directoryOffset === 0xffffffff || directorySize === 0xffffffff) throw new Error('ZIP64 packs are not supported. Export a standard ZIP archive.');
  if (count > MAX_ENTRIES || directorySize > 32 * 1024 * 1024) throw new Error('This ZIP contains too many files to inspect safely.');
  const endOffset = file.size - tail.length + end;
  if (directoryOffset + directorySize > endOffset) throw new Error('The ZIP directory points outside the archive.');
  const bytes = await readBytes(file, directoryOffset, directorySize);
  const central = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = [];
  const names = new Set();
  let offset = 0;
  let expanded = 0;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > bytes.length || central.getUint32(offset, true) !== 0x02014b50) throw new Error('The ZIP file directory is damaged.');
    const flags = central.getUint16(offset + 8, true);
    const method = central.getUint16(offset + 10, true);
    const compressed = central.getUint32(offset + 20, true);
    const size = central.getUint32(offset + 24, true);
    const localOffset = central.getUint32(offset + 42, true);
    const nameLength = central.getUint16(offset + 28, true);
    const next = offset + 46 + nameLength + central.getUint16(offset + 30, true) + central.getUint16(offset + 32, true);
    if (next > bytes.length) throw new Error('The ZIP contains an incomplete file entry.');
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (!name || /[\x00-\x1f\\]/.test(name) || name.startsWith('/') || /^[a-z]:/i.test(name) || name.split('/').includes('..')) {
      throw new Error('The ZIP contains an unsafe file path. Re-export it with relative pack paths.');
    }
    if (names.has(name)) throw new Error(`The ZIP contains a duplicate entry: ${name}`);
    names.add(name);
    if (flags & 1) throw new Error('Password-protected ZIPs are not supported. Remove encryption before uploading.');
    if (central.getUint16(offset + 34, true)) throw new Error('Split ZIP archives are not supported. Upload a single .zip file.');
    if (![0, 8].includes(method)) throw new Error('Use a ZIP with standard Deflate or Store compression.');
    if (size === 0xffffffff || compressed === 0xffffffff) throw new Error('ZIP64 entries are not supported.');
    if (localOffset + 30 > directoryOffset) throw new Error('The ZIP contains an invalid local file offset.');
    expanded += size;
    if (expanded > MAX_EXPANDED_BYTES) throw new Error('This pack expands beyond the 512 MB inspection limit.');
    entries.push({ name, method, compressed, size, offset: localOffset, dataBoundary: directoryOffset });
    offset = next;
  }
  return { entries, expanded };
}

async function readJson(file, entry) {
  if (entry.size > MAX_JSON_BYTES || entry.compressed > MAX_JSON_BYTES) throw new Error(`${entry.name} exceeds the 2 MB JSON inspection limit.`);
  const header = await readBytes(file, entry.offset, 30);
  const view = new DataView(header.buffer);
  if (view.getUint32(0, true) !== 0x04034b50) throw new Error('The ZIP has an invalid local file header.');
  if ((view.getUint16(6, true) & 1) || view.getUint16(8, true) !== entry.method) throw new Error('The ZIP local file header does not match its directory.');
  const nameLength = view.getUint16(26, true);
  const start = entry.offset + 30 + nameLength + view.getUint16(28, true);
  if (start + entry.compressed > entry.dataBoundary) throw new Error('The ZIP contains truncated file data.');
  const localName = decoder.decode(await readBytes(file, entry.offset + 30, nameLength));
  if (localName !== entry.name) throw new Error('The ZIP local file name does not match its directory.');
  let stream = file.slice(start, start + entry.compressed).stream();
  if (entry.method === 8) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Use a current Chrome, Edge, Firefox, or Safari version to inspect compressed packs.');
    stream = stream.pipeThrough(new DecompressionStream('deflate-raw'));
  }
  const reader = stream.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_JSON_BYTES || length > entry.size) throw new Error('A JSON entry expands beyond its declared size.');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  if (length !== entry.size) throw new Error(`${entry.name} has incomplete JSON data.`);
  const output = new Uint8Array(length);
  let position = 0;
  for (const chunk of chunks) { output.set(chunk, position); position += chunk.length; }
  try { return JSON.parse(decoder.decode(output).replace(/^\uFEFF/, '')); }
  catch { throw new Error(`${entry.name} contains invalid JSON.`); }
}

export async function inspectJavaPack(file, { maxBytes = 30 * 1024 * 1024 } = {}) {
  if (!/\.zip$/i.test(file.name)) throw new Error('Choose a Java resource pack with a .zip extension.');
  if (!file.size) throw new Error('This ZIP is empty. Choose a resource pack with assets.');
  if (file.size > maxBytes) throw new Error(`Your upload limit is ${Math.round(maxBytes / 1024 / 1024)} MB. Choose a smaller pack.`);
  const { entries, expanded } = await readZipDirectory(file);
  const files = entries.filter(entry => !entry.name.endsWith('/') && !entry.name.startsWith('__MACOSX/'));
  const roots = files.filter(entry => /(^|\/)pack\.mcmeta$/.test(entry.name)).filter(entry => {
    const root = entry.name.slice(0, -'pack.mcmeta'.length);
    return files.some(candidate => candidate.name.startsWith(`${root}assets/`));
  });
  if (roots.length !== 1) throw new Error(roots.length ? 'Multiple resource packs were found. Upload one pack per ZIP.' : 'No Java resource pack found. Include pack.mcmeta and an assets/ directory in the ZIP.');
  const root = roots[0].name.slice(0, -'pack.mcmeta'.length);
  const metadata = await readJson(file, roots[0]);
  const format = readPackFormat(metadata?.pack);
  const assets = files.filter(entry => entry.name.startsWith(`${root}assets/`));
  const relative = assets.map(entry => ({ ...entry, path: entry.name.slice(root.length) }));
  const textures = relative.filter(entry => /^assets\/[^/]+\/textures\/.+\.png$/i.test(entry.path));
  const models = relative.filter(entry => /^assets\/[^/]+\/models\/.+\.json$/i.test(entry.path));
  const definitions = relative.filter(entry => /^assets\/[^/]+\/items\/.+\.json$/i.test(entry.path));
  const namespaces = [...new Set(relative.map(entry => entry.path.split('/')[1]))].sort();
  const warnings = [];
  const sampled = [...definitions.slice(0, 64), ...models.slice(0, 64)];
  let legacyOverrides = 0;
  let complexDefinitions = 0;
  let invalidJson = 0;
  for (const entry of sampled) {
    try {
      const json = await readJson(file, entry);
      legacyOverrides += Array.isArray(json.overrides) ? json.overrides.length : 0;
      if (entry.path.includes('/items/') && /"(?:type)"\s*:\s*"(?:minecraft:)?(?:condition|select|composite|range_dispatch)"/.test(JSON.stringify(json))) complexDefinitions++;
    } catch { invalidJson++; }
  }
  if (root) warnings.push(`This pack is inside “${root.slice(0, -1)}”. The server must normalize its pack root.`);
  if (complexDefinitions) warnings.push(`${complexDefinitions} sampled item definition(s) use model branches or predicates. Check the conversion report for fallback behavior.`);
  if (invalidJson) warnings.push(`${invalidJson} sampled JSON file(s) could not be read. The conversion report may contain missing models.`);
  if (relative.some(entry => /\/(?:optifine|mcpatcher)\//i.test(entry.path))) warnings.push('OptiFine / MCPatcher assets detected. CIT rules and client mod behavior need manual review.');
  if (relative.some(entry => /\/shaders\//.test(entry.path))) warnings.push('Java shaders detected. Java shader programs cannot be carried over directly to Bedrock.');
  if (relative.some(entry => /\/font\/.+\.json$/.test(entry.path))) warnings.push('Custom font definitions detected. Font and glyph rendering can differ on Bedrock.');
  if (metadata.overlays) warnings.push('Pack overlays detected. Review version-specific assets in the final output.');
  if (!textures.length && !models.length && !definitions.length) warnings.push('No PNG textures or JSON item models were found. This pack may have little convertible content.');
  const description = metadata.pack.description;
  return {
    name: file.name, size: file.size, expanded, root, ...format,
    description: typeof description === 'string' ? description : 'Java resource pack',
    files: assets.length, textures: textures.length, models: models.length, definitions: definitions.length,
    namespaces, legacyOverrides, sampledModels: Math.min(models.length, 64), sampledDefinitions: Math.min(definitions.length, 64), warnings,
  };
}
