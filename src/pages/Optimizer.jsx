import React, { useState, useRef, useEffect } from 'react';

const Optimizer = ({ token, user }) => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Opsi Optimasi
  const [options, setOptions] = useState({
    unusedCleaner: false,
    powerOfTwo: false,
    downscale: false,
    minPixel: '1024',
    compressPillow: false,
    compressPngquant: true,
    pngquantQuality: '60-90',
    compressOxipng: true,
    fullOptimize: true
  });

  // Template Sistem
  const templates = {
    custom: { 
      name: 'Custom', 
      desc: 'Choose specific optimization options according to your needs.' 
    },
    script_default: { 
      name: 'Standard (All-in-One)', 
      desc: 'Recommended optimization: high image compression & OGG audio compression.',
      opts: { unusedCleaner: true, powerOfTwo: false, downscale: false, compressPillow: false, compressPngquant: true, compressOxipng: true, fullOptimize: true }
    },
    safe: {
      name: 'Safe (Lossless)', 
      desc: 'Reduces file size without losing any visual quality.',
      opts: { unusedCleaner: false, powerOfTwo: false, downscale: false, compressPillow: true, compressPngquant: false, compressOxipng: false, fullOptimize: false }
    },
    aggressive: {
      name: 'Aggressive (Max FPS)', 
      desc: 'Downscale resolution, reduce colors, and clean up junk files for maximum performance.',
      opts: { unusedCleaner: true, powerOfTwo: true, downscale: true, minPixel: '1024', compressPillow: false, compressPngquant: true, pngquantQuality: '40-80', compressOxipng: false, fullOptimize: false }
    }
  };
  const [activeTemplate, setActiveTemplate] = useState('script_default');

  // State Proses
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, processing, done, error
  const [progress, setProgress] = useState({ current: 0, total: 0, eta: 0 });
  const [logs, setLogs] = useState([]);
  const [sizes, setSizes] = useState({ original: 0, final: 0 });
  const [errorMsg, setErrorMsg] = useState(null);

  const fileInputRef = useRef(null);
  const logsEndRef = useRef(null);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.zip')) {
        setFile(droppedFile); resetState();
      } else {
        setErrorMsg('Format file tidak didukung. Harap unggah file berformat .zip');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const max_size = user?.tier === 'premium' ? 100 * 1024 * 1024 : 30 * 1024 * 1024;
      
      if (selectedFile.size > max_size) {
        setErrorMsg(`Ukuran file melebihi batas. Limit akun ${user?.tier || 'free'} Anda adalah ${max_size / (1024*1024)}MB. Silakan upgrade ke Premium!`);
        return;
      }
      
      setFile(selectedFile); resetState();
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

  const applyTemplate = (key) => {
    setActiveTemplate(key);
    if (key !== 'custom') {
      setOptions(prev => ({ ...prev, ...templates[key].opts }));
    }
  };

  const handleOptionChange = (key, value) => {
    setActiveTemplate('custom');
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleOptimize = async () => {
    if (!file) return;
    setStatus('uploading');
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    Object.entries(options).forEach(([key, val]) => {
      formData.append(key, typeof val === 'boolean' ? val.toString() : val);
    });

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      if (!res.ok) throw new Error('Connection to server failed. Ensure backend is running.');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setTaskId(data.task_id);
      setStatus('processing');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  // Polling Effect
  useEffect(() => {
    let interval;
    if (status === 'processing' && taskId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/status/${taskId}`);
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

  // Format Helpers
  const formatTime = (seconds) => {
    if (!seconds) return 'Calculating estimate...';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 MB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <>
      {errorMsg && (
        <div className="w-full bg-red-950/30 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <p className="font-medium text-sm">{errorMsg}</p>
        </div>
      )}

      {/* Header Title */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Workspace</h2>
        <p className="text-slate-400 text-sm">Optimize and compress your texture packs efficiently.</p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        {/* Kolom Kiri: Upload & Options */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Upload Box (Hanya tampil jika file belum ada) */}
          {!file && status === 'idle' && (
            <div 
              className={`w-full min-h-[300px] bg-dark-surface border border-dark-border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${
                isDragging ? 'border-brand-500 bg-brand-900/10' : 'hover:border-dark-borderHover hover:bg-dark-surface2'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="w-16 h-16 bg-dark-surface2 border border-dark-border rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              </div>
              <p className="text-xl font-semibold text-white mb-2">Select a .zip file to optimize</p>
              <p className="text-slate-500 text-sm mb-6 text-center max-w-sm">Drag and drop your Minecraft resource pack here, or click to browse files.</p>
              
              <input type="file" accept=".zip" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              <button onClick={() => fileInputRef.current.click()} className="px-6 py-2.5 bg-white hover:bg-slate-200 text-black font-semibold rounded-lg transition-colors text-sm">
                Browse Files
              </button>
            </div>
          )}

          {/* File Selected & Process UI */}
          {file && status === 'idle' && (
            <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-dark-surface2 border border-dark-border rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-brand-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path></svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white truncate max-w-[200px] sm:max-w-sm">{file.name}</p>
                    <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
                  </div>
                </div>
                <button onClick={() => setFile(null)} className="text-slate-500 hover:text-white transition-colors p-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Optimization Profile</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(templates).map(([key, tpl]) => (
                    <button 
                      key={key}
                      onClick={() => applyTemplate(key)}
                      className={`p-3 text-left rounded-xl border transition-all text-sm ${
                        activeTemplate === key 
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400' 
                        : 'border-dark-border bg-dark-surface2 hover:border-dark-borderHover text-slate-300'
                      }`}
                    >
                      <p className="font-semibold mb-1">{tpl.name}</p>
                      <p className="text-xs text-slate-500 line-clamp-2">{tpl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleOptimize} className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
                Start Processing
              </button>
            </div>
          )}

          {/* Processing Status */}
          {(status === 'uploading' || status === 'processing') && (
            <div className="bg-dark-surface border border-dark-border rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border-2 border-dark-border rounded-full"></div>
                <div className="absolute inset-0 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{status === 'uploading' ? 'Uploading File...' : 'Optimizing Pack...'}</h3>
              
              {status === 'processing' && (
                <div className="w-full max-w-md mt-6">
                  <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
                    <span>{percentage}%</span>
                    <span>{formatTime(progress.eta)} remaining</span>
                  </div>
                  <div className="w-full h-1.5 bg-dark-surface2 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${percentage}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-4 text-left">Processing file {progress.current} of {progress.total}</p>
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
              <h3 className="text-2xl font-bold text-white mb-2">Optimization Complete</h3>
              <p className="text-slate-400 text-sm mb-8">Successfully compressed your resource pack.</p>
              
              <div className="flex items-center justify-center gap-8 mb-8">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Original</p>
                  <p className="text-xl font-semibold text-slate-300">{formatSize(sizes.original)}</p>
                </div>
                <div className="w-px h-10 bg-dark-border"></div>
                <div>
                  <p className="text-xs text-brand-500 uppercase tracking-wider mb-1">Optimized</p>
                  <p className="text-2xl font-bold text-white">{formatSize(sizes.final)}</p>
                </div>
              </div>

              <div className="flex gap-4 w-full max-w-sm">
                <button onClick={resetState} className="flex-1 py-3 bg-dark-surface2 border border-dark-border hover:bg-dark-border text-white font-medium rounded-lg transition-colors text-sm">
                  Start New
                </button>
                <button onClick={handleDownload} className="flex-1 py-3 bg-white hover:bg-slate-200 text-black font-semibold rounded-lg transition-colors text-sm">
                  Download .zip
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
              <h3 className="text-xl font-bold text-white mb-2">Process Failed</h3>
              <p className="text-red-400 text-sm mb-6 max-w-sm">{errorMsg}</p>
              <button onClick={resetState} className="px-6 py-2.5 bg-dark-surface2 border border-dark-border hover:bg-dark-border text-white font-medium rounded-lg transition-colors text-sm">
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Advanced Options & Logs */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Konfigurasi Lanjutan */}
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center justify-between">
              Configuration
              {activeTemplate === 'custom' && <span className="text-[10px] bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded">Custom</span>}
            </h3>
            
            <div className="space-y-4">
              {/* Unused Cleaner */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="mt-0.5">
                  <input type="checkbox" checked={options.unusedCleaner} onChange={(e) => handleOptionChange('unusedCleaner', e.target.checked)} className="w-4 h-4 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0 focus:ring-offset-0" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Unused Cleaner</p>
                  <p className="text-xs text-slate-500 mt-0.5">Remove unreferenced textures</p>
                </div>
              </label>
              
              {/* Power-of-Two */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="mt-0.5">
                  <input type="checkbox" checked={options.powerOfTwo} onChange={(e) => handleOptionChange('powerOfTwo', e.target.checked)} className="w-4 h-4 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0 focus:ring-offset-0" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Power-of-Two</p>
                  <p className="text-xs text-slate-500 mt-0.5">Fix dimensions for OpenGL</p>
                </div>
              </label>
              
              {/* Downscale */}
              <div className="flex flex-col gap-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5">
                    <input type="checkbox" checked={options.downscale} onChange={(e) => handleOptionChange('downscale', e.target.checked)} className="w-4 h-4 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0 focus:ring-offset-0" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Downscale Resolution</p>
                    <p className="text-xs text-slate-500 mt-0.5">Reduce large textures for better FPS</p>
                  </div>
                </label>
                {options.downscale && (
                  <div className="ml-7 flex items-center gap-3">
                    <span className="text-xs text-slate-400">Target px:</span>
                    <select value={options.minPixel} onChange={(e) => handleOptionChange('minPixel', e.target.value)} className="bg-dark-bg border border-dark-border text-slate-300 text-xs rounded-lg p-1.5 focus:ring-brand-500 focus:border-brand-500 outline-none">
                      <option value="512">512px</option>
                      <option value="1024">1024px</option>
                      <option value="2048">2048px</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Pillow Compress */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="mt-0.5">
                  <input type="checkbox" checked={options.compressPillow} onChange={(e) => handleOptionChange('compressPillow', e.target.checked)} className="w-4 h-4 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0 focus:ring-offset-0" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Pillow Resize (Fast)</p>
                  <p className="text-xs text-slate-500 mt-0.5">Basic size reduction via Pillow</p>
                </div>
              </label>

              {/* Pngquant */}
              <div className="flex flex-col gap-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5">
                    <input type="checkbox" checked={options.compressPngquant} onChange={(e) => handleOptionChange('compressPngquant', e.target.checked)} className="w-4 h-4 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0 focus:ring-offset-0" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Pngquant Lossy</p>
                    <p className="text-xs text-slate-500 mt-0.5">Aggressive color reduction</p>
                  </div>
                </label>
                {options.compressPngquant && (
                  <div className="ml-7 flex items-center gap-3">
                    <span className="text-xs text-slate-400">Quality:</span>
                    <select value={options.pngquantQuality} onChange={(e) => handleOptionChange('pngquantQuality', e.target.value)} className="bg-dark-bg border border-dark-border text-slate-300 text-xs rounded-lg p-1.5 focus:ring-brand-500 focus:border-brand-500 outline-none">
                      <option value="40-80">Low (40-80)</option>
                      <option value="60-90">Med (60-90)</option>
                      <option value="80-100">High (80-100)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* OxiPNG */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="mt-0.5">
                  <input type="checkbox" checked={options.compressOxipng} onChange={(e) => handleOptionChange('compressOxipng', e.target.checked)} className="w-4 h-4 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0 focus:ring-offset-0" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Oxipng Lossless</p>
                  <p className="text-xs text-slate-500 mt-0.5">Safe size reduction (no quality loss)</p>
                </div>
              </label>

              {/* Full Optimize */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="mt-0.5">
                  <input type="checkbox" checked={options.fullOptimize} onChange={(e) => handleOptionChange('fullOptimize', e.target.checked)} className="w-4 h-4 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0 focus:ring-offset-0" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Full OptiPNG & OGG</p>
                  <p className="text-xs text-slate-500 mt-0.5">Deep image & audio compression</p>
                </div>
              </label>
            </div>
          </div>

          {/* Terminal Logs (Muncul jika ada proses atau selesai) */}
          {(status === 'processing' || status === 'done' || logs.length > 0) && (
            <div className="bg-dark-bg border border-dark-border rounded-2xl p-4 flex flex-col h-[300px] lg:h-[350px] relative">
              <div className="flex gap-2 mb-3 items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                <span className="text-[10px] text-slate-500 ml-2 font-mono">system.log</span>
              </div>
              
              <div className="flex-1 overflow-y-auto font-mono text-[11px] text-slate-400">
                {logs.length === 0 ? (
                  <span className="text-slate-600">Waiting for compiler output...</span>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="mb-1 leading-snug">
                      <span className={log.includes('❌') || log.toLowerCase().includes('error') ? 'text-red-400' : log.includes('✔️') || log.includes('✅') || log.includes('🗑️') ? 'text-brand-400' : 'text-slate-400'}>
                        {log}
                      </span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Optimizer;
