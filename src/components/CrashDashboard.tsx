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
    <div className="text-center py-16 space-y-4 bg-white border border-slate-200 rounded-xl shadow-xs">
      <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto"/>
      <p className="text-slate-800 font-bold text-lg">No active crashes</p>
      <p className="text-sm text-slate-500 font-medium">Ghost is monitoring status. Everything is green. 🟢</p>
    </div>
  );

  const suspects: any[] = data.suspects || [];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-2xs">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-red-600 flex-none mt-0.5 animate-pulse"/>
          <div>
            <h3 className="font-bold text-red-800">Crash Detected</h3>
            <p className="text-sm text-slate-600 mt-1 font-mono font-semibold">{data.crashFile}:{data.crashLine}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {suspects.slice(0, 3).map((s: any, i: number) => (
          <div key={s.file} className={`p-4 rounded-xl border transition-colors bg-white shadow-2xs ${i === 0 ? 'border-red-200' : i === 1 ? 'border-amber-200' : 'border-slate-200'}`}>
            <div className="flex items-start gap-3">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-sans flex-none ${i === 0 ? 'bg-red-600' : i === 1 ? 'bg-amber-600' : 'bg-slate-500'} text-white`}>{i+1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-slate-400 flex-none"/>
                  <p className="font-mono text-sm truncate font-bold text-slate-800">{s.file}</p>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">Suspect Score: <span className="font-bold text-slate-700">{s.score}%</span> · {s.signals?.join(', ')}</p>
                {s.context && s.context !== 'UNTRACKED' && s.context !== 'TRACKED' && (
                  <p className="text-[11px] text-red-700 font-mono mt-1.5 p-2 bg-red-50/50 rounded border border-red-100 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
                    {s.context}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button onClick={async () => { setRestoring(true); const r = await invoke<any>('restore_last_working'); setRestoring(false); toast[r.success ? 'success' : 'error'](r.success ? '✅ Restored!' : 'No working snapshot'); }} disabled={restoring}
          className="py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 text-emerald-800 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-2xs">
          {restoring ? <Loader2 className="h-4 w-4 animate-spin"/> : <Undo2 className="h-4 w-4"/>}{restoring ? 'Restoring...' : 'Restore Working'}
        </button>
        <button onClick={() => toast.info('See Timeline tab to browse snapshots')}
          className="py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-xl text-sm font-bold cursor-pointer shadow-2xs">
          View Timeline →
        </button>
      </div>
    </div>
  );
}
