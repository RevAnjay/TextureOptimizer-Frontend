import { useState, useRef, useEffect } from 'react';

export default function BedrockConverter({ token, user }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // State
  const [baseItem, setBaseItem] = useState('minecraft:paper');
  const [attachableMaterial, setAttachableMaterial] = useState('entity_alphatest');
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, processing, done, error
  const [progress, setProgress] = useState({ current: 0, total: 0, eta: 0 });
  const [logs, setLogs] = useState([]);
  const [sizes, setSizes] = useState({ original: 0, final: 0 });
  const [errorMsg, setErrorMsg] = useState(null);

  const fileInputRef = useRef(null);
  const logsEndRef = useRef(null);

  const formatSize = (bytes) => {
    if (!bytes) return '0 MB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.zip')) {
        setFile(droppedFile);
        resetState();
      } else {
        setErrorMsg('Format file tidak didukung. Harap unggah file berformat .zip');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const max_size = user?.tier === 'premium' ? 100 * 1024 * 1024 : 30 * 1024 * 1024;
      
      if (!user?.is_admin && selectedFile.size > max_size) {
        setErrorMsg(`Ukuran file melebihi batas. Limit akun ${user?.tier || 'free'} Anda adalah ${max_size / (1024*1024)}MB. Silakan upgrade ke Premium!`);
        return;
      }
      
      setFile(selectedFile);
      resetState();
    }
  };

  const resetState = () => {
    setStatus('idle');
    setTaskId(null);
    setErrorMsg(null);
    setProgress({ current: 0, total: 0, eta: 0 });
    setLogs([]);
    setSizes({ original: 0, final: 0 });
  };

  const handleConvert = async () => {
    if (!file) return;
    setStatus('uploading');
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetFormat', '999'); // 999 = Bedrock Edition & GeyserMC format
    formData.append('baseItem', baseItem);
    formData.append('attachableMaterial', attachableMaterial);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/convert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Koneksi ke server gagal. Pastikan backend aktif.');
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setTaskId(data.task_id);
      setStatus('processing');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  // Polling status
  useEffect(() => {
    let interval;
    if (status === 'processing' && taskId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/status/${taskId}`);
          if (!res.ok) throw new Error('Gagal mengambil status tugas');
          const data = await res.json();
          
          if (data.error) throw new Error(data.error);
          
          setLogs(data.logs || []);
          
          if (data.status === 'done') {
            setSizes({ original: data.original_size, final: data.final_size });
            setStatus('done');
            clearInterval(interval);
          } else if (data.status === 'error') {
            setStatus('error');
            setErrorMsg(data.error_msg);
            clearInterval(interval);
          } else {
            setProgress({
              current: data.current,
              total: data.total,
              eta: data.eta
            });
          }
        } catch (err) {
          console.error("Polling error", err);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, taskId]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleDownload = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/download/${taskId}`;
  };

  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="w-full flex-1 flex flex-col h-full bg-dark-bg animate-fade-in-up">
      {errorMsg && (
        <div className="w-full bg-red-950/30 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p className="font-medium text-sm">{errorMsg}</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Cross-Platform Bedrock Engine
          </div>
        </div>
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Bedrock & GeyserMC Converter</h2>
        <p className="text-slate-400 text-sm">Convert Java resource packs to Bedrock Edition (.mcpack) and generate GeyserMC custom items v2 mappings.</p>
      </div>

      {/* Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        {/* Kolom Kiri: Upload & Controls */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* File Upload Box */}
          {!file && status === 'idle' && (
            <div 
              className={`w-full min-h-[300px] bg-dark-surface border border-dark-border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer ${
                isDragging ? 'border-brand-500 bg-brand-900/10' : 'hover:border-dark-borderHover hover:bg-dark-surface2'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <div className="w-16 h-16 bg-dark-surface2 border border-dark-border rounded-2xl flex items-center justify-center mb-6 text-brand-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
              </div>
              <p className="text-xl font-semibold text-white mb-2">Select a Java pack (.zip) for Bedrock conversion</p>
              <p className="text-slate-500 text-sm mb-6 text-center max-w-sm">Upload your Java resource pack to generate Bedrock textures and GeyserMC mappings.</p>
              
              <input type="file" accept=".zip" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              <button className="px-6 py-2.5 bg-white hover:bg-slate-200 active:scale-[0.98] text-black font-semibold rounded-lg transition-all text-sm">
                Browse Files
              </button>
            </div>
          )}

          {/* File Selected Area */}
          {file && status === 'idle' && (
            <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-dark-surface2 border border-dark-border rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white truncate max-w-[200px] sm:max-w-sm">{file.name}</p>
                    <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
                  </div>
                </div>
                <button onClick={() => setFile(null)} className="text-slate-500 hover:text-white transition-colors p-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Fallback Base Item</label>
                  <select 
                    value={baseItem} 
                    onChange={(e) => setBaseItem(e.target.value)}
                    className="w-full bg-dark-surface2 border border-dark-border text-slate-200 rounded-xl p-3 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm"
                  >
                    <option value="minecraft:paper">minecraft:paper (Default - General Items)</option>
                    <option value="minecraft:stick">minecraft:stick (Tools & Weapons)</option>
                    <option value="minecraft:feather">minecraft:feather (Lightweight items)</option>
                    <option value="minecraft:leather_horse_armor">minecraft:leather_horse_armor (3D / Furniture)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Attachable Material</label>
                  <select 
                    value={attachableMaterial} 
                    onChange={(e) => setAttachableMaterial(e.target.value)}
                    className="w-full bg-dark-surface2 border border-dark-border text-slate-200 rounded-xl p-3 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm"
                  >
                    <option value="entity_alphatest">entity_alphatest (Standard Alpha Test - Recommended)</option>
                    <option value="entity_emissive_alpha">entity_emissive_alpha (Glow / Emissive Effects)</option>
                    <option value="entity_cutout">entity_cutout (Sharp Cutout)</option>
                  </select>
                </div>

                <div className="bg-dark-surface2 border border-dark-border rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider">Output Assets Included (2 Output Files)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span> Bedrock Pack (`bedrock_texture.mcpack`)
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span> Geyser Mappings (`geyser_texture.zip`)
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={handleConvert} className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 active:scale-[0.98] text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                Convert to Bedrock & GeyserMC
              </button>
            </div>
          )}

          {/* Processing / Upload State */}
          {(status === 'uploading' || status === 'processing') && (
            <div className="bg-dark-surface border border-dark-border rounded-2xl p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border-4 border-dark-surface2 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{status === 'uploading' ? 'Uploading File...' : 'Converting to Bedrock Format...'}</h3>
              
              {status === 'processing' && (
                <div className="w-full max-w-md mt-6">
                  <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
                    <span>{percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-dark-surface2 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Done State */}
          {status === 'done' && (
            <div className="bg-dark-surface border border-dark-border rounded-2xl p-8 text-center min-h-[400px] flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Bedrock Conversion Complete</h3>
              <p className="text-slate-400 text-sm mb-8">Successfully generated Bedrock Resource Pack & GeyserMC mappings.</p>

              <div className="flex gap-4 w-full max-w-sm">
                <button onClick={resetState} className="flex-1 py-3 bg-dark-surface2 border border-dark-border hover:bg-dark-border active:scale-[0.98] text-white font-medium rounded-lg transition-all text-sm">
                  Convert Another
                </button>
                <button onClick={handleDownload} className="flex-1 py-3 bg-white hover:bg-slate-200 active:scale-[0.98] text-black font-semibold rounded-lg transition-all text-sm">
                  Download Pack (.zip)
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="bg-dark-surface border border-dark-border rounded-2xl p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Conversion Failed</h3>
              <p className="text-red-400 text-sm mb-6 max-w-sm">{errorMsg}</p>
              <button onClick={resetState} className="px-6 py-2.5 bg-dark-surface2 border border-dark-border hover:bg-dark-border active:scale-[0.98] text-white font-medium rounded-lg transition-all text-sm">
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Logs & Instructions */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">GeyserMC Installation Note</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              After downloading the converted pack:
            </p>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside">
              <li>Place the resource pack in your Geyser server's <code className="bg-dark-bg px-1 py-0.5 rounded text-brand-400">packs/</code> folder.</li>
              <li>Extract <code className="bg-dark-bg px-1 py-0.5 rounded text-brand-400">geyser_mappings.json</code> into Geyser's <code className="bg-dark-bg px-1 py-0.5 rounded text-brand-400">custom_mappings/</code> folder.</li>
              <li>Restart your Geyser server.</li>
            </ol>
          </div>

          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 flex-1 flex flex-col min-h-[300px]">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Conversion Logs</h3>
            <div className="flex-1 bg-dark-bg/60 border border-dark-border/60 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-y-auto max-h-[250px] space-y-1">
              {logs.length === 0 ? (
                <p className="text-slate-500 italic">No conversion logs yet...</p>
              ) : (
                logs.map((log, idx) => (
                  <p key={idx} className="leading-relaxed">{log}</p>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
