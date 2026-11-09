import { API_URL, responseError, downloadTask } from '../lib/api';
import { useState, useRef, useEffect } from 'react';

const Optimizer = ({ token, user }) => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Opsi Optimasi
  const [options, setOptions] = useState({
    unusedCleaner: false,
    deduplicate: true,
    powerOfTwo: false,
    downscale: false,
    minPixel: '1024',
    tieredResize: false,
    compressPillow: false,
    compressPngquant: true,
    pngquantQuality: '60-90',
    compressOxipng: true,
    oxipngLevel: '4',
    fullOptimize: true,
    audioAggressive: false,
    removeShaders: false,
    minifyJson: false,
    sortJsonKeys: false
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
      opts: { unusedCleaner: true, deduplicate: true, powerOfTwo: false, downscale: false, tieredResize: false, compressPillow: false, compressPngquant: true, pngquantQuality: '60-90', compressOxipng: true, oxipngLevel: '4', fullOptimize: true, audioAggressive: false, removeShaders: false, minifyJson: true, sortJsonKeys: false }
    },
    safe: {
      name: 'Safe (Lossless)', 
      desc: 'Reduces file size without losing any visual quality.',
      opts: { unusedCleaner: false, deduplicate: true, powerOfTwo: false, downscale: false, tieredResize: false, compressPillow: true, compressPngquant: false, pngquantQuality: '60-90', compressOxipng: false, oxipngLevel: '4', fullOptimize: false, audioAggressive: false, removeShaders: false, minifyJson: true, sortJsonKeys: false }
    },
    aggressive: {
      name: 'Aggressive (Max FPS)', 
      desc: 'Downscale resolution, reduce colors, and clean up junk files for maximum performance.',
      opts: { unusedCleaner: true, deduplicate: true, powerOfTwo: true, downscale: true, minPixel: '1024', tieredResize: true, compressPillow: false, compressPngquant: true, pngquantQuality: '40-80', compressOxipng: false, oxipngLevel: '4', fullOptimize: false, audioAggressive: true, removeShaders: false, minifyJson: true, sortJsonKeys: false }
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const downloadRef = useRef(null);

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
      
      if (!user?.is_admin && selectedFile.size > max_size) {
        setErrorMsg(`Ukuran file melebihi batas. Limit akun ${user?.tier || 'free'} Anda adalah ${max_size / (1024*1024)}MB. Silakan upgrade ke Premium!`);
        return;
      }
      
      setFile(selectedFile); resetState();
    }
  };

  const resetState = () => {
    const download = downloadRef.current;
    downloadRef.current = null;
    download?.abort();
    setIsDownloading(false);
    setStatus('idle');
    setTaskId(null);
    setErrorMsg(null);
    setProgress({ current: 0, total: 0, eta: 0 });
    setUploadProgress(0);
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

  const handleOptimize = () => {
    if (!file) return;
    setStatus('uploading');
    setUploadProgress(0);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    Object.entries(options).forEach(([key, val]) => {
      formData.append(key, typeof val === 'boolean' ? val.toString() : val);
    });

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.error) throw new Error(data.error);
          setTaskId(data.task_id);
          setStatus('processing');
        } catch (err) {
          setStatus('error');
          setErrorMsg(err.message);
        }
      } else {
        setStatus('error');
        setErrorMsg('Connection to server failed. Ensure backend is running.');
      }
    };

    xhr.onerror = () => {
      setStatus('error');
      setErrorMsg('Failed to connect to the server.');
    };

    xhr.send(formData);
  };

  // Only one authenticated status request is active at a time.
  useEffect(() => {
    if (status !== 'processing' || !taskId) return;
    let stopped = false;
    let timer;
    let request;
    let failures = 0;
    async function poll() {
      request = new AbortController();
      const timeout = setTimeout(() => request.abort(), 15000);
      let finished = false;
      let delay = 1000;
      try {
        const res = await fetch(`${API_URL}/status/${encodeURIComponent(taskId)}`, {
          headers: { Authorization: `Bearer ${token}` }, signal: request.signal,
        });
        if (stopped) return;
        if (!res.ok) {
          finished = [401,403,404,410].includes(res.status);
          throw new Error(await responseError(res, 'Could not retrieve this task.'));
        }
        const data = await res.json();
        if (stopped) return;
        if (data.error) { finished = true; throw new Error(data.error); }
        failures = 0;
        setErrorMsg(null);
        setLogs(Array.isArray(data.logs) ? data.logs : []);
        if (data.status === 'done') {
          setSizes({ original: data.original_size, final: data.final_size });
          setStatus('done');
          finished = true;
        } else if (data.status === 'error') {
          setStatus('error');
          setErrorMsg(data.error_msg || 'The task failed.');
          finished = true;
        } else {
          setProgress({ current: data.current, total: data.total, eta: data.eta });
        }
      } catch (error) {
        if (stopped) return;
        if (finished) { setStatus('error'); setErrorMsg(error.message); }
        else {
          failures++;
          delay = Math.min(15000, 1000 * 2 ** Math.min(failures,4));
          setErrorMsg(`${error.name === 'AbortError' ? 'The status request timed out.' : error.message} Reconnecting automatically…`);
        }
      } finally {
        clearTimeout(timeout);
        if (!stopped && !finished) timer = setTimeout(poll,delay);
      }
    }
    poll();
    return () => { stopped = true; clearTimeout(timer); request?.abort(); };
  }, [status,taskId,token]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => () => {
    const download = downloadRef.current;
    downloadRef.current = null;
    download?.abort();
  }, [token]);

  const handleDownload = async () => {
    if (!taskId || status !== 'done' || downloadRef.current) return;
    const controller = new AbortController();
    downloadRef.current = controller;
    setIsDownloading(true);
    setErrorMsg(null);
    try {
      const filename = `${(file?.name || 'resource_pack').replace(/\.zip$/i, '')}_optimized.zip`;
      await downloadTask(taskId, token, filename, controller.signal);
    } catch (error) {
      if (downloadRef.current === controller && error.name !== 'AbortError') setErrorMsg(error.message);
    } finally {
      if (downloadRef.current === controller) {
        downloadRef.current = null;
        setIsDownloading(false);
      }
    }
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
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="badge-brand">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"></span>
            Core Engine
          </span>
          <span className="text-xs text-slate-500 font-mono">Pack Optimizer</span>
        </div>
        <h2 className="page-title">Texture Optimizer</h2>
        <p className="page-subtitle mt-1">Compress textures, consolidate duplicate assets, and strip dead files for peak Minecraft FPS.</p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        {/* Kolom Kiri: Upload & Options */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Upload Box (Hanya tampil jika file belum ada) */}
          {!file && status === 'idle' && (
            <div 
              className={`relative overflow-hidden w-full min-h-[340px] card border-2 border-dashed p-10 flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer group ${
                isDragging ? 'border-brand-500 bg-brand-500/10 scale-[0.99]' : 'border-dark-border hover:border-dark-borderHover hover:bg-dark-surface2/60'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {/* Background ambient decoration */}
              <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none"></div>
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative w-16 h-16 rounded-2xl bg-dark-surface2 border border-dark-border flex items-center justify-center mb-5 group-hover:border-brand-500/50 group-hover:shadow-[0_0_24px_rgba(16,185,129,0.25)] transition-all duration-300">
                <svg className="w-8 h-8 text-brand-400 transition-transform duration-300 group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>

              <h3 className="relative text-xl font-bold text-white mb-2 tracking-tight">Select a .zip file to optimize</h3>
              <p className="relative text-slate-400 text-sm mb-6 max-w-sm leading-relaxed">
                Drag and drop your Minecraft resource pack here, or click to choose from your device.
              </p>

              <div className="relative flex items-center gap-3">
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="btn-white"
                >
                  <svg className="w-4 h-4 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Browse Files
                </button>
                <span className="badge-neutral font-mono">.ZIP ONLY</span>
              </div>

              <input type="file" accept=".zip" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              
              <div className="relative mt-8 pt-6 border-t border-dark-border/60 flex items-center gap-6 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Lossless &amp; Lossy PNG
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  OGG audio compression
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  {user?.tier === 'premium' ? 'Max 100MB (Premium)' : 'Max 30MB (Free)'}
                </span>
              </div>
            </div>
          )}

          {/* File Selected & Process UI */}
          {file && status === 'idle' && (
            <div className="card p-6 md:p-8 animate-scale-in">
              {/* Selected File Banner */}
              <div className="panel-inset p-4 flex items-center justify-between mb-7">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center flex-shrink-0 text-brand-400">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white truncate max-w-[240px] sm:max-w-md">{file.name}</p>
                      <span className="badge-brand text-[10px]">Ready</span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{formatSize(file.size)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setFile(null)} 
                  className="btn-ghost p-2 rounded-xl text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
                  title="Remove file"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Profiles */}
              <div className="mb-7">
                <div className="flex items-center justify-between mb-3">
                  <label className="section-title">Optimization Profile</label>
                  <span className="text-xs text-slate-500">Pick a preset or tune manually</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(templates).map(([key, tpl]) => {
                    const isActive = activeTemplate === key;
                    return (
                      <button 
                        key={key}
                        onClick={() => applyTemplate(key)}
                        className={`p-4 text-left rounded-xl border transition-all text-sm relative group cursor-pointer ${
                          isActive 
                            ? 'border-brand-500 bg-brand-500/10 text-white shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-brand-500/40' 
                            : 'border-dark-border bg-dark-surface2/60 hover:border-dark-borderHover hover:bg-dark-surface2 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <p className={`font-semibold ${isActive ? 'text-brand-300' : 'text-white'}`}>{tpl.name}</p>
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-brand-400"></span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{tpl.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <button 
                onClick={handleOptimize} 
                className="btn-primary w-full py-3.5 text-base shadow-lg cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Start Optimization Pipeline
              </button>
            </div>
          )}

          {/* Processing Status */}
          {(status === 'uploading' || status === 'processing') && (
            <div className="card p-8 md:p-10 flex flex-col items-center justify-center text-center min-h-[380px] animate-scale-in">
              <div className="relative w-20 h-20 mb-7">
                <div className="absolute inset-0 border-3 border-dark-border rounded-full"></div>
                <div className="absolute inset-0 border-3 border-brand-400 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-2 bg-brand-500/10 rounded-full flex items-center justify-center text-brand-400 font-mono text-xs font-bold">
                  {status === 'uploading' ? `${uploadProgress}%` : `${percentage}%`}
                </div>
              </div>
              
              {status === 'uploading' ? (
                <div className="w-full max-w-md">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                    Step 1 / 2 : Upload
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Uploading Resource Pack...</h3>
                  <p className="text-slate-400 text-xs mb-5 font-mono">
                    {((file?.size || 0) * uploadProgress / 100 / (1024 * 1024)).toFixed(1)} MB / {formatSize(file?.size)}
                  </p>
                  <div className="w-full h-2.5 bg-dark-surface2 rounded-full overflow-hidden border border-dark-border p-0.5">
                    <div className="h-full bg-gradient-to-r from-brand-500 to-brand-300 transition-all duration-200 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)]" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-md">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/25 text-brand-400 text-xs font-semibold uppercase tracking-wider mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"></span>
                    Step 2 / 2 : Optimization Engine
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Compressing &amp; Optimizing...</h3>
                  <div className="flex justify-between text-xs font-semibold text-slate-400 mb-2 font-mono">
                    <span>{percentage}% complete</span>
                    <span>{formatTime(progress.eta)} remaining</span>
                  </div>
                  <div className="w-full h-2.5 bg-dark-surface2 rounded-full overflow-hidden border border-dark-border p-0.5">
                    <div className="h-full bg-gradient-to-r from-brand-600 via-brand-400 to-emerald-300 transition-all duration-300 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)]" style={{ width: `${percentage}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-4 font-mono">Processing file {progress.current} of {progress.total}</p>
                </div>
              )}
            </div>
          )}

          {/* Done State */}
          {status === 'done' && (
            <div className="card p-8 md:p-10 text-center min-h-[400px] flex flex-col items-center justify-center animate-scale-in">
              <div className="w-20 h-20 bg-brand-500/15 border border-brand-500/30 text-brand-400 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.25)]">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-3">
                Optimization Succeeded
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">Pack Compressed &amp; Ready</h3>
              <p className="text-slate-400 text-sm mb-7 max-w-md">All texture passes, JSON minifications, and asset consolidation completed successfully.</p>
              
              {/* Savings Banner */}
              <div className="w-full max-w-lg panel-inset p-5 mb-6">
                <div className="grid grid-cols-2 gap-4 mb-4 text-left">
                  <div className="p-3 rounded-xl bg-dark-surface2/60 border border-dark-border/60">
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Original Size</p>
                    <p className="text-xl font-bold text-slate-300 font-mono mt-0.5">{formatSize(sizes.original)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/25">
                    <p className="text-[11px] text-brand-400 uppercase tracking-wider font-bold">Optimized Size</p>
                    <p className="text-xl font-extrabold text-white font-mono mt-0.5">{formatSize(sizes.final)}</p>
                  </div>
                </div>
                {sizes.original > 0 && (
                  <div className="w-full bg-dark-bg rounded-full h-2.5 overflow-hidden border border-dark-border p-0.5 mb-3">
                    <div 
                      className="bg-gradient-to-r from-brand-500 to-brand-300 h-full rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                      style={{ width: `${Math.max(5, Math.min(100, Math.round((sizes.final / sizes.original) * 100)))}%` }}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-400">Total reduction</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    -{formatSize(sizes.original > sizes.final ? sizes.original - sizes.final : 0)} ({sizes.original > 0 ? Math.round(((sizes.original - sizes.final) / sizes.original) * 100) : 0}% saved)
                  </span>
                </div>
              </div>

              {/* Audit Summary Breakdown */}
              <div className="w-full max-w-lg panel-inset p-4 mb-8 text-left space-y-2.5 text-xs">
                <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Pipeline Execution Summary</p>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Smart Asset Consolidation
                  </span>
                  <span className="badge-brand text-[10px]">{options.deduplicate ? 'Active' : 'Disabled'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    Unused Textures &amp; Shaders
                  </span>
                  <span className="badge-neutral text-[10px]">{options.unusedCleaner ? 'Cleaned' : 'Skipped'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    PNG &amp; JSON Minifier
                  </span>
                  <span className="badge-brand text-[10px]">{options.compressOxipng ? `Oxipng Lvl ${options.oxipngLevel}` : 'Standard'}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                <button onClick={resetState} className="btn-ghost flex-1 py-3 text-sm">
                  Start New Pack
                </button>
                <button onClick={handleDownload} disabled={isDownloading} className="btn-primary flex-1 py-3 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {isDownloading ? 'Preparing download…' : 'Download .zip'}
                </button>
              </div>
            </div>
          )}
          
          {/* Error State */}
          {status === 'error' && (
            <div className="card p-8 md:p-10 text-center min-h-[300px] flex flex-col items-center justify-center animate-scale-in">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/25 text-red-400 rounded-2xl flex items-center justify-center mb-5">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Process Failed</h3>
              <p className="text-red-400 text-sm mb-6 max-w-sm leading-relaxed">{errorMsg}</p>
              <button onClick={resetState} className="btn-ghost">
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
              {/* Kategori 1: Clean & structure */}
              <div className="border border-dark-border bg-dark-bg/20 rounded-xl p-3.5 space-y-3">
                <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <svg className="w-3.5 h-3.5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Clean & structure
                </h4>
                
                {/* Unused Cleaner */}
                <label className="flex items-start gap-3 cursor-pointer group" htmlFor="opt-unused-cleaner">
                  <div className="mt-0.5">
                    <input type="checkbox" id="opt-unused-cleaner" checked={options.unusedCleaner} onChange={(e) => handleOptionChange('unusedCleaner', e.target.checked)} className="w-4 h-4 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0 focus:ring-offset-0" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Remove unused textures</p>
                    <p className="text-xs text-slate-500 mt-0.5">Scans model and blockstate references to delete textures that aren't actually loaded by the game.</p>
                  </div>
                </label>

                {/* Deduplicate Textures */}
                <label className="flex items-start gap-3 cursor-pointer group" htmlFor="opt-deduplicate">
                  <div className="mt-0.5">
                    <input type="checkbox" id="opt-deduplicate" checked={options.deduplicate} onChange={(e) => handleOptionChange('deduplicate', e.target.checked)} className="w-4 h-4 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0 focus:ring-offset-0" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Smart Asset Stream Consolidation</p>
                    <p className="text-xs text-slate-500 mt-0.5">Analyzes resource streams to consolidate identical asset payloads and collapse index references.</p>
                  </div>
                </label>
                
                {/* Remove Shaders */}
                <label className="flex items-start gap-3 cursor-pointer group" htmlFor="opt-remove-shaders">
                  <div className="mt-0.5">
                    <input type="checkbox" id="opt-remove-shaders" checked={options.removeShaders} onChange={(e) => handleOptionChange('removeShaders', e.target.checked)} className="w-4 h-4 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0 focus:ring-offset-0" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Strip custom shaders</p>
                    <p className="text-xs text-slate-500 mt-0.5">Removes the shaders directory to ensure absolute compatibility with default Minecraft clients.</p>
                  </div>
                </label>

                {/* Minify JSON */}
                <div className="flex flex-col gap-2">
                  <label className="flex items-start gap-3 cursor-pointer group" htmlFor="opt-minify-json">
                    <div className="mt-0.5">
                      <input type="checkbox" id="opt-minify-json" checked={options.minifyJson} onChange={(e) => handleOptionChange('minifyJson', e.target.checked)} className="w-4 h-4 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0 focus:ring-offset-0" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Minify JSON & mcmeta</p>
                      <p className="text-xs text-slate-500 mt-0.5">Strips comments and unnecessary whitespaces from JSON models and mcmeta files.</p>
                    </div>
                  </label>
                  {options.minifyJson && (
                    <div className="ml-7 border-l border-dark-border/40 pl-3 mt-1">
                      <label className="flex items-start gap-2 cursor-pointer group" htmlFor="opt-sort-json-keys">
                        <div className="mt-0.5">
                          <input type="checkbox" id="opt-sort-json-keys" checked={options.sortJsonKeys} onChange={(e) => handleOptionChange('sortJsonKeys', e.target.checked)} className="w-3.5 h-3.5 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">Alphabetical key reordering</p>
                          <p className="text-[10px] text-slate-500 leading-normal">Sorts JSON keys alphabetically. May cause parsing issues on mobile launchers.</p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Kategori 2: Resolution & scaling */}
              <div className="border border-dark-border bg-dark-bg/20 rounded-xl p-3.5 space-y-3">
                <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <svg className="w-3.5 h-3.5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4M4 20l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg> Resolution & scaling
                </h4>
                
                {/* Power-of-Two */}
                <label className="flex items-start gap-3 cursor-pointer group" htmlFor="opt-power-of-two">
                  <div className="mt-0.5">
                    <input type="checkbox" id="opt-power-of-two" checked={options.powerOfTwo} onChange={(e) => handleOptionChange('powerOfTwo', e.target.checked)} className="w-4 h-4 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0 focus:ring-offset-0" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Power-of-two padding</p>
                    <p className="text-xs text-slate-500 mt-0.5">Forces texture dimensions to standard power-of-two bounds to prevent OpenGL boundary rendering glitching.</p>
                  </div>
                </label>
                
                {/* Downscale */}
                <div className="flex flex-col gap-2">
                  <label className="flex items-start gap-3 cursor-pointer group" htmlFor="opt-downscale">
                    <div className="mt-0.5">
                      <input type="checkbox" id="opt-downscale" checked={options.downscale} onChange={(e) => handleOptionChange('downscale', e.target.checked)} className="w-4 h-4 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0 focus:ring-offset-0" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Downscale oversized textures</p>
                      <p className="text-xs text-slate-500 mt-0.5">Rescales textures exceeding target limits to optimize VRAM footprint and boost FPS on low-end hardware.</p>
                    </div>
                  </label>
                  {options.downscale && (
                    <div className="ml-7 space-y-3 border-l border-dark-border/40 pl-3 mt-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">Target size:</span>
                        <select id="opt-target-px" value={options.minPixel} onChange={(e) => handleOptionChange('minPixel', e.target.value)} className="bg-dark-bg border border-dark-border text-slate-300 text-xs rounded-lg p-1.5 focus:ring-brand-500 focus:border-brand-500 outline-none">
                          <option value="512">512px</option>
                          <option value="1024">1024px</option>
                          <option value="2048">2048px</option>
                        </select>
                      </div>
                      <label className="flex items-start gap-2 cursor-pointer group" htmlFor="opt-tiered-resize">
                        <div className="mt-0.5">
                          <input type="checkbox" id="opt-tiered-resize" checked={options.tieredResize} onChange={(e) => handleOptionChange('tieredResize', e.target.checked)} className="w-3.5 h-3.5 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">Tiered resizing</p>
                          <p className="text-[10px] text-slate-500 leading-normal">Applies proportional scaling steps based on original dimensions rather than a flat cap.</p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Kategori 3: PNG compression */}
              <div className="border border-dark-border bg-dark-bg/20 rounded-xl p-3.5 space-y-3">
                <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <svg className="w-3.5 h-3.5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> PNG compression
                </h4>
                
                {/* Pillow Compress */}
                <label className="flex items-start gap-3 cursor-pointer group" htmlFor="opt-pillow-resize">
                  <div className="mt-0.5">
                    <input type="checkbox" id="opt-pillow-resize" checked={options.compressPillow} onChange={(e) => handleOptionChange('compressPillow', e.target.checked)} className="w-4 h-4 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0 focus:ring-offset-0" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Fast resize (Pillow)</p>
                    <p className="text-xs text-slate-500 mt-0.5">Performs basic, fast downscaling using Python's Pillow library. Recommended for quick drafts.</p>
                  </div>
                </label>

                {/* Pngquant */}
                <div className="flex flex-col gap-2">
                  <label className="flex items-start gap-3 cursor-pointer group" htmlFor="opt-pngquant">
                    <div className="mt-0.5">
                      <input type="checkbox" id="opt-pngquant" checked={options.compressPngquant} onChange={(e) => handleOptionChange('compressPngquant', e.target.checked)} className="w-4 h-4 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0 focus:ring-offset-0" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Lossy compression (Pngquant)</p>
                      <p className="text-xs text-slate-500 mt-0.5">Reduces color palette using median cut algorithms. Highly effective for massive size reductions with minor pixel changes.</p>
                    </div>
                  </label>
                  {options.compressPngquant && (
                    <div className="ml-7 border-l border-dark-border/40 pl-3 flex items-center gap-3">
                      <span className="text-xs text-slate-400">Quality:</span>
                      <select id="opt-pngquant-quality" value={options.pngquantQuality} onChange={(e) => handleOptionChange('pngquantQuality', e.target.value)} className="bg-dark-bg border border-dark-border text-slate-300 text-xs rounded-lg p-1.5 focus:ring-brand-500 focus:border-brand-500 outline-none">
                        <option value="40-80">Low (40-80)</option>
                        <option value="60-90">Medium (60-90)</option>
                        <option value="80-100">High (80-100)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* OxiPNG */}
                <div className="flex flex-col gap-2">
                  <label className="flex items-start gap-3 cursor-pointer group" htmlFor="opt-oxipng">
                    <div className="mt-0.5">
                      <input type="checkbox" id="opt-oxipng" checked={options.compressOxipng} onChange={(e) => handleOptionChange('compressOxipng', e.target.checked)} className="w-4 h-4 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0 focus:ring-offset-0" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Lossless optimization (OxiPNG)</p>
                      <p className="text-xs text-slate-500 mt-0.5">Runs multithreaded PNG optimization to strip redundant metadata and pack IDAT chunks with zero pixel degradation.</p>
                    </div>
                  </label>
                  {options.compressOxipng && (
                    <div className="ml-7 border-l border-dark-border/40 pl-3 flex items-center gap-3">
                      <span className="text-xs text-slate-400">Level:</span>
                      <select id="opt-oxipng-level" value={options.oxipngLevel} onChange={(e) => handleOptionChange('oxipngLevel', e.target.value)} className="bg-dark-bg border border-dark-border text-slate-300 text-xs rounded-lg p-1.5 focus:ring-brand-500 focus:border-brand-500 outline-none">
                        <option value="1">1 (Fastest)</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4 (Recommended)</option>
                        <option value="5">5</option>
                        <option value="6">6 (Deepest/Slow)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Kategori 4: Audio & media */}
              <div className="border border-dark-border bg-dark-bg/20 rounded-xl p-3.5 space-y-3">
                <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <svg className="w-3.5 h-3.5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg> Audio & media
                </h4>
                
                {/* Full Optimize */}
                <div className="flex flex-col gap-2">
                  <label className="flex items-start gap-3 cursor-pointer group" htmlFor="opt-full-optimize">
                    <div className="mt-0.5">
                      <input type="checkbox" id="opt-full-optimize" checked={options.fullOptimize} onChange={(e) => handleOptionChange('fullOptimize', e.target.checked)} className="w-4 h-4 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0 focus:ring-offset-0" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Deep media compression</p>
                      <p className="text-xs text-slate-500 mt-0.5">Runs heavy multi-pass optimization on audio streams alongside standard texture processing pipelines.</p>
                    </div>
                  </label>
                  {options.fullOptimize && (
                    <div className="ml-7 border-l border-dark-border/40 pl-3 space-y-3 mt-1">
                      <label className="flex items-start gap-2 cursor-pointer group" htmlFor="opt-audio-aggressive">
                        <div className="mt-0.5">
                          <input type="checkbox" id="opt-audio-aggressive" checked={options.audioAggressive} onChange={(e) => handleOptionChange('audioAggressive', e.target.checked)} className="w-3.5 h-3.5 rounded border-dark-border bg-dark-bg checked:bg-brand-500 focus:ring-0" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">Aggressive audio compression</p>
                          <p className="text-[10px] text-slate-500 leading-normal">Trims trailing silence, converts stereo assets to mono, and normalizes volume to save maximum disk space.</p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>
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
