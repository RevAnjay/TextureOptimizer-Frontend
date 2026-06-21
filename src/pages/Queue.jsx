import React, { useState, useEffect, useRef } from 'react';

const Queue = ({ token }) => {
  const [tasks, setTasks] = useState({});
  const [expandedTask, setExpandedTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const logsEndRefs = useRef({});

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/debug`);
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned invalid content type (non-JSON)');
      }
      const data = await res.json();
      setTasks(data);
      setError(null);
    } catch (err) {
      console.error('Queue polling error:', err);
      setError(err.message || 'Cannot connect to API server');
    } finally {
      setIsLoading(false);
    }
  };

  // Polling /debug every 2 seconds
  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 2000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll expanded logs
  useEffect(() => {
    if (expandedTask && logsEndRefs.current[expandedTask]) {
      logsEndRefs.current[expandedTask].scrollIntoView({ behavior: 'smooth' });
    }
  }, [tasks, expandedTask]);

  const taskEntries = Object.entries(tasks).filter(
    ([key, val]) => typeof val === 'object' && val !== null && val.status
  );

  // Stats
  const totalTasks = taskEntries.length;
  const processingCount = taskEntries.filter(([, t]) => t.status === 'processing' || t.status === 'scanning').length;
  const queuedCount = taskEntries.filter(([, t]) => t.status === 'queued').length;
  const doneCount = taskEntries.filter(([, t]) => t.status === 'done').length;
  const errorCount = taskEntries.filter(([, t]) => t.status === 'error').length;

  const getStatusConfig = (status) => {
    switch (status) {
      case 'uploading':
        return { label: 'Uploading', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', dot: 'bg-sky-400', pulse: true };
      case 'queued':
        return { label: 'In Queue', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400', pulse: true };
      case 'processing':
        return { label: 'Processing', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-400', pulse: true };
      case 'scanning':
        return { label: 'Scanning', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', dot: 'bg-violet-400', pulse: true };
      case 'done':
        return { label: 'Complete', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400', pulse: false };
      case 'error':
        return { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-400', pulse: false };
      default:
        return { label: status, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', dot: 'bg-slate-400', pulse: false };
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatTime = (seconds) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const truncateId = (id) => {
    if (!id || id.length <= 12) return id;
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
  };

  // Sort: processing first, then queued, then uploading, then done, then error. Within the same status, sort by created_at desc (newest first).
  const statusOrder = { processing: 0, scanning: 1, queued: 2, uploading: 3, done: 4, error: 5 };
  const sortedTasks = [...taskEntries].sort(([, a], [, b]) => {
    if (a.status !== b.status) {
      return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
    }
    return (b.created_at || 0) - (a.created_at || 0);
  });

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-3xl font-bold text-white tracking-tight">Queue Monitor</h2>
          {totalTasks > 0 && (
            <span className="px-2.5 py-1 text-xs font-bold bg-brand-500/15 text-brand-400 rounded-lg border border-brand-500/20">
              {totalTasks} task{totalTasks !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p className="text-slate-400 text-sm">Real-time overview of all server tasks and their processing status.</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-dark-surface border border-dark-border rounded-2xl p-5 group hover:border-dark-borderHover transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
              </svg>
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalTasks}</p>
        </div>

        <div className="bg-dark-surface border border-dark-border rounded-2xl p-5 group hover:border-dark-borderHover transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active</span>
          </div>
          <p className="text-3xl font-bold text-blue-400">{processingCount}</p>
        </div>

        <div className="bg-dark-surface border border-dark-border rounded-2xl p-5 group hover:border-dark-borderHover transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Queued</span>
          </div>
          <p className="text-3xl font-bold text-amber-400">{queuedCount}</p>
        </div>

        <div className="bg-dark-surface border border-dark-border rounded-2xl p-5 group hover:border-dark-borderHover transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Done</span>
          </div>
          <p className="text-3xl font-bold text-emerald-400">{doneCount}</p>
        </div>
      </div>

      {/* Task List */}
      <div className="flex flex-col gap-4 flex-1">
        {isLoading ? (
          /* Skeleton Loading */
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-dark-surface border border-dark-border rounded-2xl p-6 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-dark-surface2 rounded-xl"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-dark-surface2 rounded w-48 mb-2"></div>
                    <div className="h-3 bg-dark-surface2 rounded w-32"></div>
                  </div>
                  <div className="h-6 bg-dark-surface2 rounded-full w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Connection Error</h3>
            <p className="text-slate-400 text-sm max-w-sm mb-6">
              {error}. Please verify that the API backend is running.
            </p>
            <button 
              onClick={() => { setIsLoading(true); fetchTasks(); }}
              className="px-6 py-2.5 bg-white hover:bg-slate-200 text-black font-semibold rounded-lg text-sm transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : sortedTasks.length === 0 ? (
          /* Empty State */
          <div className="bg-dark-surface border-2 border-dashed border-dark-border rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
            <div className="w-16 h-16 bg-dark-surface2 border border-dark-border rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Active Tasks</h3>
            <p className="text-slate-400 text-sm max-w-sm">
              The processing queue is currently empty. Tasks will appear here when files are uploaded for optimization or scanning.
            </p>
            <div className="flex items-center gap-2 mt-6 text-xs text-slate-500">
              <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse"></div>
              <span>Auto-refreshing every 2s</span>
            </div>
          </div>
        ) : (
          /* Task Cards */
          sortedTasks.map(([taskId, task]) => {
            const cfg = getStatusConfig(task.status);
            const isExpanded = expandedTask === taskId;
            const percentage = task.total > 0 ? Math.round((task.current / task.total) * 100) : 0;
            const hasLogs = task.logs && task.logs.length > 0;
            const isActive = task.status === 'processing' || task.status === 'scanning' || task.status === 'uploading';
            
            // Calculate reduction percentage for done tasks
            const reduction = task.status === 'done' && task.original_size && task.final_size
              ? Math.round(((task.original_size - task.final_size) / task.original_size) * 100)
              : null;

            return (
              <div
                key={taskId}
                className={`bg-dark-surface border rounded-2xl overflow-hidden transition-all duration-300 ${
                  isActive ? 'border-dark-borderHover' : 'border-dark-border'
                } hover:border-dark-borderHover`}
              >
                {/* Main Card Content */}
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedTask(isExpanded ? null : taskId)}
                >
                  <div className="flex items-center gap-4">
                    {/* Status Icon */}
                    <div className={`w-10 h-10 ${cfg.bg} border ${cfg.border} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      {isActive ? (
                        <div className="relative w-5 h-5">
                          <div className={`absolute inset-0 border-2 ${cfg.border} rounded-full`}></div>
                          <div className={`absolute inset-0 border-2 ${cfg.color.replace('text-', 'border-')} border-t-transparent rounded-full animate-spin`}></div>
                        </div>
                      ) : task.status === 'done' ? (
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      ) : task.status === 'error' ? (
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      )}
                    </div>

                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-white truncate">
                          {task.original_name || `Task ${truncateId(taskId)}`}
                        </p>
                        {task.status === 'queued' && task.queue_position && (
                          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            #{task.queue_position}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="font-mono">{truncateId(taskId)}</span>
                        {task.original_size > 0 && (
                          <>
                            <span className="w-px h-3 bg-dark-border"></span>
                            <span>{formatSize(task.original_size)}</span>
                          </>
                        )}
                        {isActive && task.eta > 0 && (
                          <>
                            <span className="w-px h-3 bg-dark-border"></span>
                            <span>ETA {formatTime(task.eta)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right Side: Status Badge + Expand */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Done Stats */}
                      {task.status === 'done' && reduction !== null && (
                        <div className="hidden sm:flex items-center gap-2 text-xs">
                          <span className="text-slate-500">{formatSize(task.original_size)}</span>
                          <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                          </svg>
                          <span className="text-brand-400 font-semibold">{formatSize(task.final_size)}</span>
                          <span className="text-brand-500 font-bold">-{reduction}%</span>
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${cfg.bg} border ${cfg.border}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`}></div>
                        <span className={`text-[11px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                      </div>

                      {/* Expand Arrow */}
                      <svg
                        className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>

                  {/* Progress Bar (processing) */}
                  {(task.status === 'processing' || task.status === 'scanning') && task.total > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1.5">
                        <span>File {task.current} of {task.total}</span>
                        <span className="font-mono text-brand-400">{percentage}%</span>
                      </div>
                      <div className="w-full h-1 bg-dark-surface2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded: Logs + Details */}
                {isExpanded && (
                  <div className="border-t border-dark-border">
                    {/* Error Message */}
                    {task.status === 'error' && task.error_msg && (
                      <div className="px-5 py-3 bg-red-950/20 border-b border-red-500/10">
                        <p className="text-xs text-red-400 font-mono">{task.error_msg}</p>
                      </div>
                    )}

                    {/* Task Details */}
                    {task.status === 'done' && (
                      <div className="px-5 py-4 bg-dark-surface2/50 border-b border-dark-border">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Original</p>
                            <p className="text-sm font-semibold text-slate-300">{formatSize(task.original_size)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Optimized</p>
                            <p className="text-sm font-semibold text-brand-400">{formatSize(task.final_size)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Saved</p>
                            <p className="text-sm font-semibold text-brand-500">
                              {reduction !== null ? `${reduction}%` : '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Logs Terminal */}
                    <div className="bg-dark-bg p-4 max-h-[250px] overflow-y-auto">
                      <div className="flex gap-1.5 mb-3 items-center">
                        <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                        <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                        <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                        <span className="text-[9px] text-slate-600 ml-1.5 font-mono">task.log — {truncateId(taskId)}</span>
                      </div>
                      
                      <div className="font-mono text-[11px] leading-relaxed">
                        {!hasLogs ? (
                          <span className="text-slate-600 italic">No logs available yet...</span>
                        ) : (
                          task.logs.map((log, idx) => (
                            <div key={idx} className="mb-0.5">
                              <span className={
                                log.includes('❌') || log.toLowerCase().includes('error')
                                  ? 'text-red-400'
                                  : log.includes('✔️') || log.includes('✅') || log.includes('🗑️')
                                    ? 'text-brand-400'
                                    : 'text-slate-500'
                              }>
                                {log}
                              </span>
                            </div>
                          ))
                        )}
                        <div ref={(el) => { logsEndRefs.current[taskId] = el; }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Footer: Auto-refresh indicator */}
        {!isLoading && sortedTasks.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-600">
            <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse"></div>
            <span>Auto-refreshing every 2 seconds</span>
          </div>
        )}
      </div>
    </>
  );
};

export default Queue;
