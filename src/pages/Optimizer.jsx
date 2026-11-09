import { useState } from 'react';
import usePackJob from '../hooks/usePackJob';
import { ToolHeader, PanelHeading, PackPicker, JobNotice, JobPanel, ActivityLog, ToolIcon } from '../components/PackWorkspace';

const defaults = {
  unusedCleaner: false, deduplicate: true, powerOfTwo: false, downscale: false,
  minPixel: '1024', tieredResize: false, compressPillow: false,
  compressPngquant: true, pngquantQuality: '60-90', compressOxipng: true,
  oxipngLevel: '4', fullOptimize: true, audioAggressive: false,
  removeShaders: false, minifyJson: true, sortJsonKeys: false,
};
const presets = {
  balanced: { name: 'Balanced', description: 'Color compression, duplicate cleanup, and audio optimization.', options: defaults },
  lossless: { name: 'Lossless', description: 'Keep texture colors and resolution. Leave audio unchanged.', options: { ...defaults, compressPngquant: false, fullOptimize: false } },
  compact: { name: 'Compact', description: 'Lower texture resolution and quality for a smaller pack.', options: { ...defaults, unusedCleaner: true, powerOfTwo: true, downscale: true, tieredResize: true, pngquantQuality: '40-80', audioAggressive: true } },
};
const groups = [
  ['Assets', [
    ['deduplicate', 'Merge duplicate assets', 'Consolidate identical files and update their references.'],
    ['unusedCleaner', 'Remove unused textures', 'Remove textures the pack does not reference. Check plugin-dependent assets before enabling.'],
    ['removeShaders', 'Remove custom shaders', 'Delete shader files. Packs that rely on them will look different.'],
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
  const controller = usePackJob(token, user.username, 'optimizer');
  const { job, start, reset, retryConnection } = controller;
  const hasJob = job.status !== 'idle';
  const maxMB = user.tier === 'premium' || user.is_admin ? 100 : 30;
  function update(key, value) { setPreset('custom'); setOptions(previous => ({ ...previous, [key]: value })); }
  function newPack() { reset(); setFile(null); setError(''); }

  return <div className="tool-workspace">
    <ToolHeader title="Texture optimizer" description="Reduce your resource pack’s size. Choose what to compress and what to keep." meta="ZIP → ZIP" />
    <JobNotice job={job} retryConnection={retryConnection} />
    <div className="workspace-columns">
      <div className="space-y-5 min-w-0">
        {hasJob ? <JobPanel controller={controller} action="Optimization" onReset={newPack} /> : <section className="card overflow-hidden">
          <PanelHeading number="01" title="Source pack"><span className="text-xs text-slate-500">{maxMB} MB max</span></PanelHeading>
          <div className="p-5 sm:p-6"><PackPicker file={file} onChange={setFile} maxMB={maxMB} error={error} setError={setError} /></div>
          <PanelHeading number="02" title="Compression profile"><span className="text-xs text-slate-500">{preset === 'custom' ? 'Custom settings' : 'Choose a starting point'}</span></PanelHeading>
          <div className="p-5 sm:p-6"><div className="preset-list" role="group" aria-label="Compression profile">{Object.entries(presets).map(([id, item]) => <button type="button" key={id} aria-pressed={preset === id} className={preset === id ? 'is-selected' : ''} onClick={() => { setPreset(id); setOptions({ ...item.options }); }}><span className="preset-radio" /><span><strong>{item.name}</strong><span>{item.description}</span></span></button>)}</div>
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
        <p className="workspace-caption">Balanced and Compact use lossy compression. Use Lossless when preserving texture pixels matters most.</p>
      </div>
      <aside className="space-y-5 min-w-0"><ActivityLog logs={job.logs} hasJob={hasJob} /><section className="workspace-note"><h2>Pick the right trade-off</h2><p>Color reduction and downscaling can make packs smaller, but change their appearance. Test the output in Minecraft before replacing your server pack.</p><div className="note-file"><ToolIcon name="file" className="w-4 h-4" /><span>Output <strong>optimized.zip</strong></span></div></section></aside>
    </div>
  </div>;
}
