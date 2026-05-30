import React, { useState, useEffect } from 'react';
import { invoke } from '../lib/invoke';
import { AlertTriangle, Loader2, CheckCircle2, Code2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

export function CrashDashboard() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);

  const check = async () => {
    try { 
      setData(await invoke('get_crash_suspects')); 
    } catch { 
      setData(null); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    check();
    const t = setInterval(check, 5000);
    
    // Live feedback in browser when a snapshot is restored
    window.addEventListener('ghost_crash_cleared', check);

    return () => {
      clearInterval(t);
      window.removeEventListener('ghost_crash_cleared', check);
    };
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-orange-600 animate-spin"/></div>;

  if (!data || !data.suspects?.length) return (
    <div className="text-center py-16 space-y-4 bg-ghost-surface border border-slate-800/80 rounded-xl shadow-md">
      <CheckCircle2 className="h-12 w-12 text-ghost-green mx-auto"/>
      <p className="text-slate-100 font-bold text-lg">No active crashes</p>
      <p className="text-sm text-slate-400 font-medium">Ghost Watchdog is actively monitoring. Everything is green. 🟢</p>
    </div>
  );

  const suspects: any[] = data.suspects || [];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-ghost-red flex-none mt-0.5 animate-pulse"/>
          <div>
            <h3 className="font-bold text-slate-100">Crash Detected</h3>
            <p className="text-sm text-slate-350 mt-1 font-mono font-semibold">{data.crashFile}:{data.crashLine}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {suspects.slice(0, 3).map((s: any, i: number) => (
          <div key={s.file} className={`p-5 rounded-xl border transition-all duration-200 bg-ghost-surface shadow-xs hover:scale-[1.005] ${
            i === 0 
              ? 'border-red-500/40' 
              : i === 1 
                ? 'border-amber-500/30' 
                : 'border-slate-800/80'
          }`}>
            <div className="flex items-start gap-4">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono flex-none ${
                i === 0 
                  ? 'bg-ghost-red' 
                  : i === 1 
                    ? 'bg-ghost-yellow' 
                    : 'bg-slate-600'
              } text-white`}>{i+1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-slate-450 flex-none"/>
                  <p className="font-mono text-sm truncate font-bold text-slate-150">{s.file}</p>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 font-medium">
                  Suspect Score: <span className={`font-bold font-mono ${
                    i === 0 ? 'text-ghost-red' : i === 1 ? 'text-ghost-yellow' : 'text-slate-300'
                  }`}>{s.score}%</span> · {s.signals?.join(', ')}
                </p>
                {s.context && s.context !== 'UNTRACKED' && s.context !== 'TRACKED' && (
                  <p className="text-[11px] text-red-300 font-mono mt-2.5 p-3 bg-red-950/20 rounded-lg border border-red-900/30 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text shadow-inner">
                    {s.context}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button 
          onClick={async () => { 
            setRestoring(true); 
            const r = await invoke<any>('restore_last_working'); 
            setRestoring(false); 
            toast[r.success ? 'success' : 'error'](r.success ? '✅ Restored!' : 'No working snapshot'); 
          }} 
          disabled={restoring}
          className="py-3 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-800/50 text-ghost-green rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm transition-all"
        >
          {restoring ? <Loader2 className="h-4 w-4 animate-spin"/> : <Undo2 className="h-4 w-4"/>}
          {restoring ? 'Restoring...' : 'Restore Working'}
        </button>
        <button 
          onClick={() => toast.info('See Timeline tab to browse snapshots')}
          className="py-3 bg-ghost-surface hover:bg-black/20 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-all text-center"
        >
          View Timeline →
        </button>
      </div>
    </div>
  );
}
