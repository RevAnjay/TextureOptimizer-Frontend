import { useState } from 'react';
import usePackJob from '../hooks/usePackJob';
import { ToolHeader, PanelHeading, PackPicker, JobNotice, JobPanel, ActivityLog, ToolIcon } from '../components/PackWorkspace';
import OptimizationReport from '../components/OptimizationReport';
import { optimizerDefaults as defaults, optimizerPresets as presets, diagnoseReloadLog } from '../lib/optimizerProfiles';

const groups = [
  ['Assets', [
    ['deduplicate', 'Merge duplicate assets', 'Consolidate identical files and update their references.'],
    ['unusedCleaner', 'Remove unused textures', 'Remove textures the pack does not reference. Check plugin-dependent assets before enabling.'],
    ['minifyJson', 'Minify JSON and metadata', 'Remove unnecessary whitespace from supported JSON files.'],
    ['sortJsonKeys', 'Sort JSON keys', 'Write keys in alphabetical order.'],
  ]],
  ['Textures', [
    ['powerOfTwo', 'Power-of-two dimensions', 'Adjust texture dimensions to power-of-two bounds.'],
    ['downscale', 'Downscale large textures', 'Reduce resolution for textures above the chosen size.'],
    ['tieredResize', 'Tiered resizing', 'Scale textures in steps based on their original dimensions.'],
    ['compressPillow', 'Basic PNG compression', 'Use the standard image re-encoding pass.'],
    ['compressPngquant', 'Reduce PNG colors', 'Lossy palette compression. May change subtle color details.'],
    ['compressOxipng', 'Lossless PNG optimization', 'Reduce encoded file size without changing pixels.'],
  ]],
  ['Audio', [
    ['fullOptimize', 'Optimize audio', 'Enable the audio compression pass.'],
    ['audioAggressive', 'Aggressive audio compression', 'Reduce audio quality further. Listen to the result before distributing.'],
  ]],
];

export default function Optimizer({ token, user }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [preset, setPreset] = useState('balanced');
  const [options, setOptions] = useState({ ...defaults });
  const [reloadLog, setReloadLog] = useState('');
  const diagnosis = diagnoseReloadLog(reloadLog);
  const compatibilityActive = options.compatibilityProfile !== 'off';
  const frameAwareActive = compatibilityActive || options.fpsMode !== 'off';
  const controller = usePackJob(token, user.username, 'optimizer');
  const { job, start, reset, retryConnection } = controller;
  const hasJob = job.status !== 'idle';
  const maxMB = user.tier === 'premium' || user.is_admin ? 100 : 40;
  function update(key, value) { setPreset('custom'); setOptions(previous => ({ ...previous, [key]: value })); }
  function newPack() { reset(); setFile(null); setError(''); }

  return <div className="tool-workspace">
    <ToolHeader title="Texture optimizer" description="Reduce pack size, plan smaller atlases, and lower animation work for Android launchers." meta="JAVA ZIP → ZIP" />
    <JobNotice job={job} retryConnection={retryConnection} />
    <div className="workspace-columns">
      <div className="space-y-5 min-w-0">
        {hasJob ? <><JobPanel controller={controller} action="Optimization" onReset={newPack} />{job.status === 'done' && <OptimizationReport report={job.optimizationReport} />}</> : <section className="card overflow-hidden">
          <PanelHeading number="01" title="Source pack"><span className="text-xs text-slate-500">{maxMB} MB max</span></PanelHeading>
          <div className="p-5 sm:p-6"><PackPicker file={file} onChange={setFile} maxMB={maxMB} error={error} setError={setError} /></div>
          <PanelHeading number="02" title="Compression profile"><span className="text-xs text-slate-500">{preset === 'custom' ? 'Custom settings' : 'Choose a starting point'}</span></PanelHeading>
          <div className="p-5 sm:p-6"><div className="preset-list" role="group" aria-label="Compression profile">{Object.entries(presets).map(([id, item]) => <button type="button" key={id} aria-pressed={preset === id} className={preset === id ? 'is-selected' : ''} onClick={() => { setPreset(id); setOptions({ ...item.options }); }}><span className="preset-radio" /><span><strong>{item.name}</strong><span>{item.description}</span></span></button>)}</div>
            <fieldset className="mt-6 min-w-0 space-y-4">
              <legend className="text-sm font-semibold text-white mb-3">Device compatibility & FPS</legend>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="text-xs text-slate-400">Compatibility<select className="field mt-2" value={options.compatibilityProfile} onChange={event => update('compatibilityProfile', event.target.value)}><option value="off">Standard pack</option><option value="android">Android · Pojav / Zalith / Mojo</option></select></label>
                <label className="text-xs text-slate-400">FPS / animation work<select className="field mt-2" value={options.fpsMode} onChange={event => update('fpsMode', event.target.value)}><option value="off">Keep animation behavior</option><option value="reduce">Disable animation interpolation</option><option value="static">Freeze animations · first declared frame</option></select></label>
                <label className="text-xs text-slate-400">Target atlas side<select className="field mt-2" disabled={!compatibilityActive} value={options.atlasMaxSize} onChange={event => update('atlasMaxSize', event.target.value)}>{['2048', '4096', '8192'].map(value => <option key={value} value={value}>{value} px</option>)}</select></label>
                <label className="text-xs text-slate-400">Maximum sprite resolution<select className="field mt-2" disabled={!compatibilityActive} value={options.spriteMaxSize} onChange={event => update('spriteMaxSize', event.target.value)}>{['16', '32', '64', '128', '256', '512'].map(value => <option key={value} value={value}>{value} px per frame</option>)}</select></label>
              </div>
              <label className="setting-row"><input type="checkbox" checked={options.removeShaders} onChange={event => update('removeShaders', event.target.checked)} /><span><strong>Use vanilla shaders</strong><span>Remove pack shader overrides. Helps with shader compile failures; custom shader effects may disappear. Installed mods and drivers are unchanged.</span></span></label>
              <p className="text-xs text-slate-500 leading-relaxed">Smaller sprites reduce texture memory. Freezing animations changes their appearance. Actual FPS depends on the device and renderer; a smaller ZIP alone does not increase FPS.</p>
              {frameAwareActive && <p className="text-xs text-emerald-300/80 leading-relaxed">Frame-aware processing keeps animation grids intact. Font and GUI sizes are protected. Legacy resizing, duplicate merging and unused cleanup are skipped for this mode. Atlas estimates exclude vanilla, mods and other enabled packs.</p>}
            </fieldset>
            <details className="optimizer-settings mt-5"><summary>Adjust individual settings <span>{preset === 'custom' ? 'Custom' : `${Object.values(options).filter(value => value === true).length} enabled`}</span></summary><div className="mt-5 space-y-6">{groups.map(([title, fields]) => <fieldset key={title}><legend>{title}</legend>{fields.map(([key, label, description]) => <label className="setting-row" key={key}><input type="checkbox" checked={options[key]} onChange={event => update(key, event.target.checked)} /><span><strong>{label}</strong><span>{description}</span></span></label>)}</fieldset>)}
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="text-xs text-slate-400">Texture size<select className="field mt-2" disabled={!options.downscale} value={options.minPixel} onChange={event => update('minPixel', event.target.value)}>{['512', '1024', '2048'].map(value => <option key={value} value={value}>{value} px</option>)}</select></label>
                <label className="text-xs text-slate-400">PNG quality<select className="field mt-2" disabled={!options.compressPngquant} value={options.pngquantQuality} onChange={event => update('pngquantQuality', event.target.value)}>{['40-80', '60-90', '80-100'].map(value => <option key={value}>{value}</option>)}</select></label>
                <label className="text-xs text-slate-400">Lossless optimization effort<select className="field mt-2" disabled={!options.compressOxipng} value={options.oxipngLevel} onChange={event => update('oxipngLevel', event.target.value)}>{['1', '2', '3', '4', '5', '6'].map(value => <option key={value}>{value}</option>)}</select></label>
              </div>
            </div></details>
            <div className="workspace-action"><p>Your original ZIP stays unchanged.</p><button type="button" className="btn-primary" disabled={!file} onClick={() => start(file, options)}>Optimize pack <ToolIcon name="arrow" className="w-4 h-4" /></button></div>
          </div>
        </section>}
        <p className="workspace-caption">Android profiles reduce texture resolution and remove custom shader overrides. Balanced and Compact use lossy compression. Test the output before distributing it.</p>
      </div>
      <aside className="space-y-5 min-w-0"><ActivityLog logs={job.logs} hasJob={hasJob} />
        <section className="card overflow-hidden"><PanelHeading title="Check a reload log" /><div className="p-5 space-y-4"><p className="text-xs text-slate-400 leading-relaxed">Paste the exception and “Caused by” lines. This check runs in your browser; the log is not uploaded or saved.</p><label className="sr-only" htmlFor="reload-log">Resource reload error log</label><textarea id="reload-log" className="field min-h-36 font-mono text-xs resize-y" maxLength={200000} value={reloadLog} onChange={event => setReloadLog(event.target.value)} placeholder="Caused by: …" />{diagnosis && <div role="status" className="text-xs leading-relaxed space-y-3"><h3 className="font-semibold text-white text-sm">{diagnosis.title}</h3><p className="text-slate-400">{diagnosis.detail}</p>{diagnosis.steps.length > 0 && <ol className="list-decimal pl-4 space-y-2 text-slate-300">{diagnosis.steps.map(step => <li key={step}>{step}</li>)}</ol>}{diagnosis.observations.map(item => <p key={item} className="text-slate-500">{item}</p>)}{diagnosis.settings && !hasJob && <button type="button" className="btn-ghost w-full" onClick={() => { setPreset('custom'); setOptions(previous => ({ ...previous, ...diagnosis.settings })); }}>{diagnosis.action}</button>}</div>}</div></section>
        <section className="workspace-note"><h2>Match the fix to the error</h2><p>Atlas limits, Java/native memory, shader compilation and invalid pack files need different fixes. The compatibility report flags what was inspected and what still needs a device test.</p><div className="note-file"><ToolIcon name="file" className="w-4 h-4" /><span>Output <strong>optimized.zip</strong></span></div></section></aside>
    </div>
  </div>;
}
