import { useState, useRef, useEffect } from 'react';

export default function Scanner({ token }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Options
  const [options, setOptions] = useState({
    minPixel: 1024,
    minKb: 500
  });

  // State
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, scanning, done, error
  const [errorMsg, setErrorMsg] = useState(null);
  const [result, setResult] = useState(null);

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
      setFile(e.target.files[0]); resetState();
    }
  };

  const resetState = () => {
    setStatus('idle');
    setTaskId(null);
    setErrorMsg(null);
    setResult(null);
  };

  const handleScan = async () => {
    if (!file) return;
    setStatus('uploading');
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('minPixel', options.minPixel.toString());
    formData.append('minKb', options.minKb.toString());

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      if (!res.ok) throw new Error('Connection to server failed.');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setTaskId(data.task_id);
      setStatus('scanning');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  // Polling Effect
  useEffect(() => {
    let interval;
    if (status === 'scanning' && taskId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/status/${taskId}`);
          const data = await res.json();
          
          if (data.error) throw new Error(data.error);
          
          if (data.status === 'done') {
            setResult(data.result);
            setStatus('done');
            clearInterval(interval);
          } else if (data.status === 'error') {
            setStatus('error');
            setErrorMsg(data.error_msg);
            clearInterval(interval);
          }
        } catch (err) {
          setStatus('error');
          setErrorMsg(err.message);
          clearInterval(interval);
        }
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [status, taskId]);

  return (
    <div className="w-full flex-1 flex flex-col h-full bg-dark-bg animate-fade-in-up">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">Scanner</h2>
        <p className="text-slate-400 mt-2 text-sm max-w-xl leading-relaxed">
          Analyze your texture pack to find giant textures, bloated files, and duplicates before optimizing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kolom Kiri: Upload & Config */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative w-full rounded-[2rem] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8 bg-dark-surface
              ${isDragging ? 'border-brand-500 bg-brand-500/5' : 'border-dark-border hover:border-slate-600 hover:bg-dark-surface2'}
              ${file && status !== 'idle' ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <input 
              type="file" 
              accept=".zip" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
            
            <div className="w-16 h-16 bg-dark-bg rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-dark-border">
              <svg className={`w-8 h-8 ${isDragging ? 'text-brand-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            </div>
            
            {file ? (
              <div className="text-center">
                <p className="text-brand-400 font-semibold mb-1 truncate max-w-[200px]">{file.name}</p>
                <p className="text-xs text-slate-500 font-mono">{formatSize(file.size)}</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-slate-300 font-medium mb-1">Drag & drop your .zip here</p>
                <p className="text-xs text-slate-500">or click to browse</p>
              </div>
            )}
          </div>

          {/* Konfigurasi */}
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 flex flex-col gap-5">
            <h3 className="text-sm font-semibold text-white tracking-wide uppercase">Parameters</h3>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-slate-300">Min Resolution (px)</label>
                <span className="text-xs text-brand-400 font-mono">{options.minPixel}px</span>
              </div>
              <input 
                type="range" min="128" max="4096" step="128"
                value={options.minPixel} 
                onChange={(e) => setOptions({...options, minPixel: parseInt(e.target.value)})}
                className="w-full accent-brand-500 bg-dark-bg rounded-lg h-2 appearance-none" 
              />
              <p className="text-[10px] text-slate-500 mt-2">Find images larger than {options.minPixel}x{options.minPixel}</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-slate-300">Min File Size (KB)</label>
                <span className="text-xs text-brand-400 font-mono">{options.minKb} KB</span>
              </div>
              <input 
                type="range" min="50" max="5000" step="50"
                value={options.minKb} 
                onChange={(e) => setOptions({...options, minKb: parseInt(e.target.value)})}
                className="w-full accent-brand-500 bg-dark-bg rounded-lg h-2 appearance-none" 
              />
              <p className="text-[10px] text-slate-500 mt-2">Find files heavier than {options.minKb} KB</p>
            </div>
          </div>

          <button 
            onClick={handleScan}
            disabled={!file || status === 'uploading' || status === 'scanning'}
            className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2
              ${!file ? 'bg-dark-surface2 text-slate-500 cursor-not-allowed border border-dark-border' 
                : status === 'uploading' || status === 'scanning' ? 'bg-brand-500/50 text-white cursor-wait animate-pulse'
                : 'bg-brand-500 hover:bg-brand-400 text-white shadow-brand-500/20'}`}
          >
            {status === 'idle' || status === 'done' || status === 'error' ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                Scan Now
              </>
            ) : status === 'uploading' ? 'Uploading...' : 'Scanning Pack...'}
          </button>
          
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Kolom Kanan: Hasil Scanner */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {!result && status !== 'scanning' ? (
            <div className="bg-dark-surface border-2 border-dashed border-dark-border rounded-[2rem] p-10 flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <div className="w-16 h-16 bg-dark-surface2 border border-dark-border rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Data Available</h3>
              <p className="text-slate-400 text-sm max-w-sm">Upload a texture pack and click Scan to see the insights here.</p>
            </div>
          ) : status === 'scanning' ? (
            <div className="bg-dark-surface border border-dark-border rounded-2xl p-10 flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 border-4 border-dark-border border-t-brand-500 rounded-full animate-spin mb-4"></div>
              <p className="text-brand-400 font-semibold animate-pulse">Analyzing textures...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Summary */}
              <div className="md:col-span-2 bg-gradient-to-br from-dark-surface to-dark-surface2 border border-dark-border rounded-2xl p-6 flex flex-wrap gap-8">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Total Size</p>
                  <p className="text-3xl font-black text-white">{formatSize(result.total_size)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Files</p>
                  <p className="text-3xl font-black text-white">{result.total_files}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Potential Save</p>
                  <p className="text-3xl font-black text-emerald-400">{formatSize(result.total_waste)}</p>
                </div>
              </div>

              {/* High-res Textures */}
              <div className="bg-dark-surface border border-dark-border rounded-2xl flex flex-col overflow-hidden max-h-[350px]">
                <div className="p-4 border-b border-dark-border flex justify-between items-center bg-dark-bg">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-amber-500">📸</span> Giant Textures
                  </h3>
                  <span className="text-xs bg-dark-surface2 px-2 py-1 rounded text-slate-400">{result.high_res.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {result.high_res.length === 0 ? <p className="text-xs text-slate-500">None found.</p> : 
                    result.high_res.map((img, i) => (
                      <div key={i} className="flex justify-between items-start border-b border-dark-border/50 pb-2 last:border-0 last:pb-0">
                        <p className="text-[11px] text-slate-300 font-mono break-all pr-2">{img.path}</p>
                        <span className="text-[11px] text-amber-400 font-bold whitespace-nowrap bg-amber-500/10 px-1.5 py-0.5 rounded">{img.width}x{img.height}</span>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Large Files */}
              <div className="bg-dark-surface border border-dark-border rounded-2xl flex flex-col overflow-hidden max-h-[350px]">
                <div className="p-4 border-b border-dark-border flex justify-between items-center bg-dark-bg">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-red-400">🔥</span> Heavy Files
                  </h3>
                  <span className="text-xs bg-dark-surface2 px-2 py-1 rounded text-slate-400">{result.large_files.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {result.large_files.length === 0 ? <p className="text-xs text-slate-500">None found.</p> : 
                    result.large_files.map((f, i) => (
                      <div key={i} className="flex justify-between items-start border-b border-dark-border/50 pb-2 last:border-0 last:pb-0">
                        <p className="text-[11px] text-slate-300 font-mono break-all pr-2">{f.path}</p>
                        <span className="text-[11px] text-red-400 font-bold whitespace-nowrap bg-red-500/10 px-1.5 py-0.5 rounded">{formatSize(f.size)}</span>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Duplicates */}
              <div className="md:col-span-2 bg-dark-surface border border-dark-border rounded-2xl flex flex-col overflow-hidden max-h-[400px]">
                <div className="p-4 border-b border-dark-border flex justify-between items-center bg-dark-bg">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-blue-400">👯</span> Duplicates
                  </h3>
                  <span className="text-xs bg-dark-surface2 px-2 py-1 rounded text-slate-400">{result.duplicates.length} groups</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {result.duplicates.length === 0 ? <p className="text-xs text-slate-500">No duplicates found.</p> : 
                    result.duplicates.map((grp, i) => (
                      <div key={i} className="bg-dark-bg border border-dark-border rounded-xl p-3">
                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-dark-border/50">
                          <p className="text-xs font-semibold text-slate-300">{grp.copies} Copies ({formatSize(grp.size_each)} each)</p>
                          <span className="text-xs text-emerald-400 font-bold">Save: {formatSize(grp.waste)}</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1">
                          {grp.paths.map((p, j) => (
                            <li key={j} className="text-[11px] text-slate-400 font-mono break-all">{p}</li>
                          ))}
                        </ul>
                      </div>
                    ))
                  }
                </div>
              </div>
              
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
