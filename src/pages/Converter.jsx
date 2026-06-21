import { useState, useRef, useEffect } from 'react';

export default function Converter({ token, user }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [targetFormat, setTargetFormat] = useState('46'); // default 1.21.4 (Format 46)

  // State
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
    formData.append('targetFormat', targetFormat);

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
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Version converter</h2>
        <p className="text-slate-400 text-sm">Convert legacy texture pack Custom Model Data to 1.21.4+ items format.</p>
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
              <div className="w-16 h-16 bg-dark-surface2 border border-dark-border rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                </svg>
              </div>
              <p className="text-xl font-semibold text-white mb-2">Select a texture pack (.zip) to convert</p>
              <p className="text-slate-500 text-sm mb-6 text-center max-w-sm">Drag and drop your pack here, or click to browse files.</p>
              
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

              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Minecraft version (pack_format)</label>
                <select 
                  value={targetFormat} 
                  onChange={(e) => setTargetFormat(e.target.value)}
                  className="w-full bg-dark-surface2 border border-dark-border text-slate-200 rounded-xl p-3 focus:ring-brand-500 focus:border-brand-500 outline-none"
                >
                  <option value="46">Minecraft 1.21.4 (Format 46 - Latest)</option>
                  <option value="42">Minecraft 1.21.2 - 1.21.3 (Format 42)</option>
                  <option value="34">Minecraft 1.21 - 1.21.1 (Format 34)</option>
                  <option value="32">Minecraft 1.20.5 - 1.20.6 (Format 32)</option>
                  <option value="22">Minecraft 1.20.3 - 1.20.4 (Format 22)</option>
                  <option value="18">Minecraft 1.20.2 (Format 18)</option>
                  <option value="15">Minecraft 1.20 - 1.20.1 (Format 15)</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">Format 46 introduces the new `assets/minecraft/items/*.json` format replacing model overrides predicates.</p>
              </div>

              <button onClick={handleConvert} className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 active:scale-[0.98] text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                Start Conversion
              </button>
            </div>
          )}

          {/* Processing / Upload State */}
          {(status === 'uploading' || status === 'processing') && (
            <div className="bg-dark-surface border border-dark-border rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[350px]">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border-2 border-dark-border rounded-full"></div>
                <div className="absolute inset-0 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{status === 'uploading' ? 'Uploading file...' : 'Converting pack format...'}</h3>
              
              {status === 'processing' && (
                <div className="w-full max-w-md mt-6">
                  <div className="w-full h-1.5 bg-dark-surface2 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 animate-pulse" style={{ width: '80%' }}></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-4">Working on conversion rules. Check the system logs on the right for updates.</p>
                </div>
              )}
            </div>
          )}

          {/* Done State */}
          {status === 'done' && (
            <div className="bg-dark-surface border border-dark-border rounded-2xl p-8 text-center min-h-[350px] flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Conversion complete</h3>
              <p className="text-slate-400 text-sm mb-8">Custom Model Data predicates converted successfully to 1.21.4+ Items json structure.</p>
              
              <div className="flex gap-4 w-full max-w-sm">
                <button onClick={resetState} className="flex-1 py-3 bg-dark-surface2 border border-dark-border hover:bg-dark-border active:scale-[0.98] text-white font-medium rounded-lg transition-all text-sm">
                  Start New
                </button>
                <button onClick={handleDownload} className="flex-1 py-3 bg-white hover:bg-slate-200 active:scale-[0.98] text-black font-semibold rounded-lg transition-all text-sm">
                  Download Pack
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="bg-dark-surface border border-dark-border rounded-2xl p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Conversion failed</h3>
              <p className="text-red-400 text-sm mb-6 max-w-sm">{errorMsg}</p>
              <button onClick={resetState} className="px-6 py-2.5 bg-dark-surface2 border border-dark-border hover:bg-dark-border active:scale-[0.98] text-white font-medium rounded-lg transition-all text-sm">
                Try Again
              </button>
            </div>
          )}

        </div>

        {/* Kolom Kanan: Logs & Terminal */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 h-full flex flex-col min-h-[350px]">
            <div className="flex gap-2 mb-4 items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
              <span className="text-[10px] text-slate-500 ml-2 font-mono">conversion.log</span>
            </div>
            
            <div className="flex-1 overflow-y-auto font-mono text-[11px] text-slate-400 bg-dark-bg/50 p-4 rounded-xl border border-dark-border">
              {logs.length === 0 ? (
                <span className="text-slate-600">Waiting for conversion output...</span>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="mb-1 leading-snug">
                    <span className={log.includes('❌') || log.toLowerCase().includes('error') ? 'text-red-400' : log.includes('✔️') || log.includes('✅') || log.includes('selesai') ? 'text-brand-400' : 'text-slate-400'}>
                      {log}
                    </span>
                  </div>
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
