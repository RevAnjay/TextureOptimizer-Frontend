export const optimizerDefaults = {
  unusedCleaner: false, deduplicate: true, powerOfTwo: false, downscale: false,
  minPixel: '1024', tieredResize: false, compressPillow: false,
  compressPngquant: true, pngquantQuality: '60-90', compressOxipng: true,
  oxipngLevel: '4', fullOptimize: true, audioAggressive: false,
  removeShaders: false, minifyJson: true, sortJsonKeys: false,
  compatibilityProfile: 'off', atlasMaxSize: '4096', spriteMaxSize: '128', fpsMode: 'off',
};

const android = {
  ...optimizerDefaults, compatibilityProfile: 'android', deduplicate: false,
  compressPngquant: false, oxipngLevel: '2', fullOptimize: false,
  removeShaders: true, fpsMode: 'reduce',
};

export const optimizerPresets = {
  balanced: { name: 'Balanced', description: 'Reduce file size with color compression, duplicate cleanup, and audio optimization.', options: optimizerDefaults },
  android: { name: 'Android compatible', description: 'Budget atlas sprites, preserve frame grids, and use vanilla shaders. Animation interpolation is disabled.', options: android },
  androidLight: { name: 'Android · low memory', description: 'A 2048 px atlas planning target and 64 px sprites. Uses vanilla shaders; keeps animations moving.', options: { ...android, atlasMaxSize: '2048', spriteMaxSize: '64' } },
  lossless: { name: 'Lossless', description: 'Keep texture colors and resolution. Leave audio unchanged.', options: { ...optimizerDefaults, compressPngquant: false, fullOptimize: false } },
  compact: { name: 'Compact', description: 'Lower texture resolution and quality for a smaller pack.', options: { ...optimizerDefaults, unusedCleaner: true, powerOfTwo: true, downscale: true, tieredResize: true, pngquantQuality: '40-80', audioAggressive: true } },
};

// Runs locally. The pasted log is never included in upload fields or storage.
export function diagnoseReloadLog(value) {
  const text = String(value || '').slice(0, 200_000);
  if (!text.trim()) return null;
  const observations = [];
  if (/Brightness[^\n]*outside of range/i.test(text)) observations.push('The brightness range error is separate from the resource reload cause.');
  if (/(?:PrismLauncher|[A-Z]:\\Users\\)/i.test(text)) observations.push('This appears to be a desktop example; it does not identify an Android GPU or renderer.');
  if (/ShaderCompileException|Failed to load required shader programs|Couldn.t compile pipeline|Couldn.t parse GLSL|SPIR-V requires location|GLSL for Vulkan/i.test(text)) {
    return { kind: 'shader', title: 'Shader compilation failed',
      detail: 'The game could not compile a required shader pipeline. Atlas resizing does not repair GLSL or SPIR-V compatibility.',
      steps: ['Try vanilla pack shaders first. Custom shader effects will be removed from the output.', 'If the failure remains, test a matching Minecraft version, renderer and shader-related mods. The optimizer cannot patch installed mods or drivers.'],
      settings: { removeShaders: true }, action: 'Use vanilla shaders', observations };
  }
  if (/StitcherException|Unable to fit[^\n]*(?:texture|sprite)|Unable to fit[^\n]*atlas|stitch[^\n]*failed|exceeds?[^\n]*(?:maximum texture|GL_MAX_TEXTURE_SIZE)/i.test(text)) {
    return { kind: 'atlas', title: 'Atlas stitching or size limit',
      detail: 'The log points to sprite packing or a texture size limit. Reduce sprite resolution and select an atlas target your renderer supports.',
      steps: ['Start with Android · low memory and test with other packs disabled.', 'The planning estimate excludes vanilla/mod textures and the exact GPU stitcher. Check the report for protected or unsupported assets.'],
      settings: { compatibilityProfile: 'android', atlasMaxSize: '2048', spriteMaxSize: '64' }, action: 'Set a smaller atlas budget', observations };
  }
  if (/OutOfMemoryError|GL_OUT_OF_MEMORY|Failed to allocate[^\n]*(?:texture|image|buffer)|out of (?:video |native )?memory/i.test(text)) {
    return { kind: 'memory', title: 'Texture or runtime memory pressure',
      detail: 'Decoded textures and animation sheets can use much more memory than their ZIP size. This log may also involve Java, native memory, mods or the renderer.',
      steps: ['Try smaller atlas sprites and reduced animation work.', 'Freezing animations is an optional visual trade-off. It is not enabled by this recommendation.'],
      settings: { compatibilityProfile: 'android', atlasMaxSize: '2048', spriteMaxSize: '64', fpsMode: 'reduce' }, action: 'Reduce texture memory work', observations };
  }
  return { kind: 'unknown', title: 'The root cause is not visible yet', detail: 'Paste the exception and its “Caused by” lines. Missing sounds, unused animation frames and successful “Created … atlas” messages alone do not identify a reload failure.', steps: [], observations };
}

export function optimizationSummary(report) {
  if (report?.kind !== 'optimization' || report.schema_version !== 1) return null;
  const number = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  return {
    needsAttention: report.status === 'needs_attention',
    beforeBytes: number(report.before?.decoded_rgba_bytes), afterBytes: number(report.after?.decoded_rgba_bytes),
    resized: number(report.resized_textures), frozen: number(report.frozen_animations),
    interpolation: number(report.interpolation_disabled), shaderFolders: number(report.shader_folders_removed),
    issueCount: number(report.issue_count),
    issues: Array.isArray(report.issues) ? report.issues.slice(0, 6).map(item => String(item).slice(0, 400)) : [],
    atlases: Array.isArray(report.atlases_after) ? report.atlases_after.slice(0, 10).filter(item => item && typeof item === 'object' && !Array.isArray(item)).map(item => ({
      name: String(item.name || 'Atlas').slice(0, 160), width: number(item.width), height: number(item.height),
      sprites: number(item.sprites), fits: item.within_budget === true, partial: item.partial === true,
    })) : [],
  };
}
