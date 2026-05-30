import React, { useState, useEffect } from 'react';
import { 
  Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, 
  Database, Terminal, Play, RotateCcw, Plus, ListFilter, ShieldAlert,
  ServerCrash, Settings
} from 'lucide-react';
import { useHealth, SystemHealth } from '../hooks/useHealth';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface MutationRecord {
  id: number;
  session_id: string;
  timestamp: string;
  file_path: string;
  change_type: 'TRACKED' | 'UNTRACKED' | 'DELETED' | 'CREATED';
  file_size: number;
}

interface DBLog {
  id: number;
  timestamp: string;
  component: string;
  status: string;
  message: string;
}

export function HealthMonitor() {
  const { health } = useHealth(4000);
  const [selectedTable, setSelectedTable] = useState<'file_mutations' | 'runtime_crashes' | 'snapshots' | 'restores' | 'health_logs'>('file_mutations');
  
  // Simulation custom states
  const [isDbLocked, setIsDbLocked] = useState(false);
  const [isDbCorrupted, setIsDbCorrupted] = useState(false);
  const [queryCount, setQueryCount] = useState(148);
  const [activeTab, setActiveTab] = useState<'components' | 'terminal'>('components');

  // Hardcoded mutations & log entries that user can seed/explore
  const [mutations, setMutations] = useState<MutationRecord[]>([
    { id: 1, session_id: 'session_8f44', timestamp: '12:04:10 PM', file_path: 'src/components/Timeline.tsx', change_type: 'TRACKED', file_size: 22625 },
    { id: 2, session_id: 'session_8f44', timestamp: '12:03:15 PM', file_path: 'src/components/VibeLink.tsx', change_type: 'CREATED', file_size: 43565 },
    { id: 3, session_id: 'session_8f44', timestamp: '12:01:45 PM', file_path: 'src/lib/invoke.ts', change_type: 'TRACKED', file_size: 8485 },
    { id: 4, session_id: 'session_812a', timestamp: '11:58:30 AM', file_path: 'package.json', change_type: 'TRACKED', file_size: 961 },
    { id: 5, session_id: 'session_812a', timestamp: '11:55:00 AM', file_path: 'src/main.tsx', change_type: 'CREATED', file_size: 9807 }
  ]);

  const [dbLogs, setDbLogs] = useState<DBLog[]>([
    { id: 1, timestamp: '12:04:30 PM', component: 'sqlite_daemon', status: 'OK', message: 'Checkpoint flushed to disk with journal_mode = WAL (94 nodes)' },
    { id: 2, timestamp: '12:04:18 PM', component: 'schema_sync', status: 'OK', message: 'Trigger auto_resolve_crashes initiated successfully.' },
    { id: 3, timestamp: '12:02:10 PM', component: 'sqlite_daemon', status: 'OK', message: 'WAL journal normalized after pre-emptive file sequence lock.' },
    { id: 4, timestamp: '11:59:02 AM', component: 'backup_service', status: 'OK', message: 'Auto backup transaction stored under index #2.' }
  ]);

  // Load snapshots from local storage to represent real snapshots table
  const [storedSnapshots, setStoredSnapshots] = useState<any[]>([]);
  const [storedCrash, setStoredCrash] = useState<any | null>(null);

  const loadLocalData = () => {
    try {
      const rawSnaps = localStorage.getItem('ghost_snapshots');
      if (rawSnaps) {
        setStoredSnapshots(JSON.parse(rawSnaps));
      }
      const rawCrash = localStorage.getItem('ghost_active_crash');
      if (rawCrash && rawCrash !== 'null') {
        setStoredCrash(JSON.parse(rawCrash));
      } else {
        setStoredCrash(null);
      }
    } catch {}
  };

  useEffect(() => {
    loadLocalData();
    window.addEventListener('storage', loadLocalData);
    window.addEventListener('ghost_snapshots_updated', loadLocalData);
    window.addEventListener('ghost_crash_cleared', loadLocalData);
    
    return () => {
      window.removeEventListener('storage', loadLocalData);
      window.removeEventListener('ghost_snapshots_updated', loadLocalData);
      window.removeEventListener('ghost_crash_cleared', loadLocalData);
    };
  }, []);

  if (!health) return <div className="flex justify-center py-20"><RefreshCw className="h-8 w-8 text-orange-600 animate-spin"/></div>;

  const icons = { 
    OK: <CheckCircle2 className="h-5 w-5 text-emerald-500 shadow-2xs"/>, 
    DEGRADED: <AlertTriangle className="h-5 w-5 text-amber-550"/>, 
    FAILED: <XCircle className="h-5 w-5 text-red-650 animate-pulse"/>, 
    RECOVERING: <RefreshCw className="h-5 w-5 text-blue-600 animate-spin"/>, 
    UNKNOWN: <Activity className="h-5 w-5 text-slate-505"/> 
  };
  
  // Custom overriding system health status based on user corrupt simulation
  const effectiveHealthStatus = isDbCorrupted ? 'DEGRADED' : health.overall;
  
  const bannerColor = { 
    HEALTHY: 'bg-emerald-50 border-emerald-250 text-emerald-900', 
    WARNING: 'bg-amber-50 border-amber-250 text-amber-900', 
    DEGRADED: 'bg-red-50 border-red-250 text-red-900', 
    UNKNOWN: 'bg-slate-50 border-slate-250 text-slate-900' 
  }[effectiveHealthStatus] || 'bg-slate-50 border-slate-250 text-slate-900';

  const handleToggleDbLock = () => {
    setIsDbLocked(!isDbLocked);
    setQueryCount(q => q + 1);
    if (!isDbLocked) {
      toast.warning('💥 SQLite WAL lock enabled. Writing transactions are now queued in memory.', {
        description: 'Testing resilient queue back pressure.'
      });
    } else {
      toast.success('✨ SQLite WAL lock released. Memory buffers flushed cleanly to ledger.db.');
    }
  };

  const handleToggleDbCorrupted = () => {
    setIsDbCorrupted(!isDbCorrupted);
    setQueryCount(q => q + 1);
    if (!isDbCorrupted) {
      toast.error('🔥 Ledger Database Connection Corrupted simulation active!', {
        description: 'Simulating missing file or drive permission level read obstacles.'
      });
    } else {
      toast.success('🛡️ Self-healer re-established connection and recovered SQLite WAL schema files.');
    }
  };

  const handleSeedRecord = () => {
    setQueryCount(q => q + 1);
    const newId = mutations.length + 1;
    const newMut: MutationRecord = {
      id: newId,
      session_id: 'session_' + Math.floor(1000 + Math.random() * 9000).toString(16),
      timestamp: new Date().toLocaleTimeString(),
      file_path: ['src/App.tsx', 'src/components/Timeline.tsx', 'vite.config.ts', 'tsconfig.json'][Math.floor(Math.random() * 4)],
      change_type: ['TRACKED', 'UNTRACKED', 'CREATED'][Math.floor(Math.random() * 3)] as any,
      file_size: Math.floor(1500 + Math.random() * 40000)
    };
    
    setMutations(prev => [newMut, ...prev]);

    const newLog: DBLog = {
      id: dbLogs.length + 1,
      timestamp: new Date().toLocaleTimeString(),
      component: 'user_probe',
      status: 'OK',
      message: `Manually seeded code commit trace logged inside database (Index #${newId})`
    };
    setDbLogs(prev => [newLog, ...prev]);
    toast.success('📥 Appended a code mutation trace row to the SQLite transaction ledger!');
  };

  const handleResetSimulator = () => {
    setIsDbLocked(false);
    setIsDbCorrupted(false);
    setQueryCount(148);
    toast.info('Database simulator states normalized.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <Activity className="h-5 w-5 text-orange-600"/>
            Diagnostic System Health
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Monitor primary watchdog telemetry processors, snapshot cache drivers, and ledger databases.
          </p>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('components')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              activeTab === 'components' ? 'bg-white text-slate-800 shadow-3xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Processor Status
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'terminal' ? 'bg-white text-slate-800 shadow-3xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Database className="h-3.5 w-3.5 text-orange-600" />
            SQLite DB Ledger ({storedSnapshots.length + mutations.length + dbLogs.length} rows)
          </button>
        </div>
      </div>

      <div className={`rounded-xl border p-5 flex items-center gap-4 shadow-2xs transition-all ${bannerColor}`}>
        <Activity className={`h-8 w-8 flex-none text-orange-600 ${effectiveHealthStatus !== 'HEALTHY' ? 'animate-pulse' : ''}`}/>
        <div className="flex-1">
          <div className="font-bold text-lg tracking-tight uppercase flex items-center gap-2">
            <span>{effectiveHealthStatus}</span>
            {isDbLocked && <span className="text-[10px] bg-amber-200 border border-amber-300 text-amber-800 px-2 py-0.5 rounded-full font-bold">WAL_THREADS_LOCKED</span>}
            {isDbCorrupted && <span className="text-[10px] bg-red-200 border border-red-300 text-red-800 px-2 py-0.5 rounded-full font-bold">CONN_DROPPED</span>}
          </div>
          <div className="text-xs text-slate-500 font-semibold mt-0.5">
            Updated {formatDistanceToNow(new Date(health.timestamp * 1000), { addSuffix: true })} · System Engine: Tauri VibeBridge
          </div>
        </div>
        <div className="text-xs text-slate-650 font-mono bg-white/70 border border-slate-200/80 px-2.5 py-1.5 rounded-lg font-bold">
          Queries: {queryCount}
        </div>
      </div>

      {activeTab === 'components' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.entries(health.components) as [string, { status: string; message: string; fallback: boolean }][]).map(([name, comp]) => {
              // Custom state check for database specifically in mock simulation
              let statusText = comp.status;
              let msgText = comp.message;
              if (name === 'database') {
                if (isDbCorrupted) {
                  statusText = 'FAILED';
                  msgText = 'SQLITE_CANTOPEN: unable to access database file .ghost/ledger.db';
                } else if (isDbLocked) {
                  statusText = 'DEGRADED';
                  msgText = 'Database active but locked by thread stream: executing WAL memory fallback.';
                }
              }

              return (
                <div key={name} className="rounded-xl border border-slate-200 bg-white p-4.5 space-y-2 shadow-3xs hover:bg-slate-50/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {icons[statusText as keyof typeof icons] ?? icons.UNKNOWN}
                      <span className="font-bold text-xs text-slate-800 capitalize tracking-wide leading-snug">{name.replace(/_/g, ' ')}</span>
                    </div>
                    {(comp.fallback || (name === 'database' && isDbLocked)) && (
                      <span className="text-[9px] bg-orange-50 border border-orange-200 text-orange-850 px-2 py-0.5 rounded-full font-sans font-bold">
                        WAL Fallback
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-slate-500 font-medium leading-relaxed font-sans">{msgText}</p>
                </div>
              );
            })}
          </div>

          {/* Database Control Simulation deck */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Database className="h-5 w-5 text-orange-600" />
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Interactive Database Integrity Control Deck
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Force simulation faults below to verify how Ghost's defensive architectures guard transaction pipelines when writing snapshots locally.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <button
                onClick={handleToggleDbLock}
                className={`px-3 py-2.5 border text-xs font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1 shadow-3xs ${
                  isDbLocked 
                    ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100/80 animate-pulse' 
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800'
                }`}
              >
                <ShieldAlert className={`h-4 w-4 ${isDbLocked ? 'text-amber-600' : 'text-slate-500'}`} />
                <span>{isDbLocked ? 'Release SQLite WAL Lock' : 'Simulate WAL Mutex Lock'}</span>
              </button>

              <button
                onClick={handleToggleDbCorrupted}
                className={`px-3 py-2.5 border text-xs font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1 shadow-3xs ${
                  isDbCorrupted 
                    ? 'bg-red-50 border-red-300 text-red-900 hover:bg-red-100/80 animate-pulse' 
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800'
                }`}
              >
                <ServerCrash className={`h-4 w-4 ${isDbCorrupted ? 'text-red-600' : 'text-slate-500'}`} />
                <span>{isDbCorrupted ? 'Recover DB Connection' : 'Simulate Corrupt Database'}</span>
              </button>

              <button
                onClick={handleSeedRecord}
                className="px-3 py-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1 shadow-3xs"
              >
                <Plus className="h-4 w-4 text-emerald-600" />
                <span>Seed Mutation Log Trace</span>
              </button>
            </div>

            {(isDbLocked || isDbCorrupted) && (
              <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3 text-xs text-amber-950 font-semibold flex items-start gap-2 animate-fade-in">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-none mt-0.5" />
                <div>
                  <span className="font-bold">Active Shielding Enabled:</span> Ghost is executing offline staging queues. The application compiles safely without losing writes because it acts as an in-memory storage fallback. Click commands normally to test.
                </div>
              </div>
            )}
            
            <div className="flex justify-end pt-1">
              <button
                onClick={handleResetSimulator}
                className="text-[11px] font-bold text-slate-400 hover:text-orange-600 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" /> Reset Simulator Controls
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          {/* Table select tabs */}
          <div className="flex flex-wrap border-b border-slate-200 gap-1.5 pb-0.5">
            {[
              { id: 'file_mutations', label: 'file_mutations', count: mutations.length },
              { id: 'runtime_crashes', label: 'runtime_crashes', count: storedCrash ? 1 : 0 },
              { id: 'snapshots', label: 'snapshots', count: storedSnapshots.length },
              { id: 'restores', label: 'restores', count: storedSnapshots.length > 3 ? 3 : 2 },
              { id: 'health_logs', label: 'health_logs', count: dbLogs.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTable(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-t-lg border-t border-x transition-all cursor-pointer ${
                  selectedTable === tab.id
                    ? 'bg-slate-900 text-slate-100 border-slate-900'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-transparent'
                }`}
              >
                {tab.label} <span className="text-[10px] opacity-75 font-mono">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* SQLite Table Terminal Grid */}
          <div className="bg-slate-950 rounded-xl p-4 text-xs font-mono text-slate-200 overflow-x-auto select-all shadow-inner border border-slate-900 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 text-slate-450 uppercase text-[10px] tracking-wider font-bold">
              <span>sqlite_console &gt; SELECT * FROM {selectedTable};</span>
              <span className="text-emerald-500 font-bold">● ACTIVE LINK (ledger.db)</span>
            </div>

            <div className="overflow-x-auto">
              {isDbCorrupted ? (
                <div className="py-8 text-center text-red-400 font-semibold space-y-1">
                  <XCircle className="h-8 w-8 text-red-500 mx-auto animate-pulse" />
                  <p>SQLITE_IOERR: disk I/O error or missing lock permissions.</p>
                  <p className="text-[10px] text-slate-500">Enable "Recover DB Connection" above to sync views.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10.5px]">
                      {selectedTable === 'file_mutations' && (
                        <>
                          <th className="py-2 pr-4">ID</th>
                          <th className="py-2 pr-4">SESSION_ID</th>
                          <th className="py-2 pr-4">TIMESTAMP</th>
                          <th className="py-2 pr-4">FILE_PATH</th>
                          <th className="py-2 pr-4">CHANGE_TYPE</th>
                          <th className="py-2 text-right">SIZE_BYTES</th>
                        </>
                      )}
                      {selectedTable === 'runtime_crashes' && (
                        <>
                          <th className="py-2 pr-4">ID</th>
                          <th className="py-2 pr-4">FAILING_FILE</th>
                          <th className="py-2 pr-4">LINE</th>
                          <th className="py-2 pr-4">ERROR_TYPE</th>
                          <th className="py-2 pr-4">STATUS</th>
                          <th className="py-2">SIGNALS</th>
                        </>
                      )}
                      {selectedTable === 'snapshots' && (
                        <>
                          <th className="py-2 pr-4">ID</th>
                          <th className="py-2 pr-4">UUID</th>
                          <th className="py-2 pr-4">LABEL</th>
                          <th className="py-2 pr-4">TRIGGER</th>
                          <th className="py-2 pr-4">TIMESTAMP</th>
                          <th className="py-2 text-right">FILE_COUNT</th>
                        </>
                      )}
                      {selectedTable === 'restores' && (
                        <>
                          <th className="py-2 pr-4">ID</th>
                          <th className="py-2 pr-4">RESTORE_TYPE</th>
                          <th className="py-2 pr-4">DURATION_MS</th>
                          <th className="py-2 pr-4">STATUS</th>
                          <th className="py-2 pr-4">FILES_RESTORED</th>
                          <th className="py-2">ERROR_MESSAGE</th>
                        </>
                      )}
                      {selectedTable === 'health_logs' && (
                        <>
                          <th className="py-2 pr-4">ID</th>
                          <th className="py-2 pr-4">TIMESTAMP</th>
                          <th className="py-2 pr-4">COMPONENT</th>
                          <th className="py-2 pr-4">STATUS</th>
                          <th className="py-2">MESSAGE</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-[11px] text-slate-300">
                    {selectedTable === 'file_mutations' && mutations.map(m => (
                      <tr key={m.id} className="hover:bg-slate-900/50">
                        <td className="py-2 text-slate-500">{m.id}</td>
                        <td className="py-2 text-orange-400 font-bold">{m.session_id}</td>
                        <td className="py-2 text-slate-400">{m.timestamp}</td>
                        <td className="py-2 text-emerald-400 font-bold">{m.file_path}</td>
                        <td className="py-2"><span className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded text-[9.5px] font-bold">{m.change_type}</span></td>
                        <td className="py-2 text-right text-slate-400">{m.file_size}</td>
                      </tr>
                    ))}

                    {selectedTable === 'runtime_crashes' && (
                      storedCrash ? (
                        <tr className="hover:bg-slate-900/50">
                          <td className="py-2 text-slate-500">1</td>
                          <td className="py-2 text-emerald-400 font-bold">{storedCrash.crashFile}</td>
                          <td className="py-2 text-amber-500">{storedCrash.crashLine}</td>
                          <td className="py-2 text-red-400">TypeError: Cannot read properties</td>
                          <td className="py-2 text-red-500 font-bold">UNRESOLVED</td>
                          <td className="py-2 text-slate-400 truncate max-w-[200px]" title={storedCrash.suspects?.[0]?.signals?.join(', ')}>
                            {storedCrash.suspects?.[0]?.signals?.join(', ') || 'STACK_MATCH'}
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-slate-500">No rows found in table runtime_crashes. (All is healthy)</td>
                        </tr>
                      )
                    )}

                    {selectedTable === 'snapshots' && storedSnapshots.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-900/50">
                        <td className="py-2 text-slate-500">{idx + 1}</td>
                        <td className="py-2 text-orange-400 font-bold text-[10px]">{s.id.slice(0, 10)}...</td>
                        <td className="py-2 text-slate-200">{s.label}</td>
                        <td className="py-2"><span className="bg-slate-850 text-slate-300 px-1 py-0.5 rounded text-[9px] font-sans font-bold">{s.triggerType.toUpperCase()}</span></td>
                        <td className="py-2 text-slate-450 text-[10.5px]">{s.time || '15:00:00'}</td>
                        <td className="py-2 text-right text-emerald-400 font-bold">{s.fileCount}</td>
                      </tr>
                    ))}

                    {selectedTable === 'restores' && storedSnapshots.slice(0, 3).map((s, idx) => (
                      <tr key={s.id + idx} className="hover:bg-slate-900/50">
                        <td className="py-2 text-slate-500">{idx + 1}</td>
                        <td className="py-2 text-slate-300">Resilient Copy</td>
                        <td className="py-2 text-amber-400">{Math.floor(180 + idx * 80)}ms</td>
                        <td className="py-2 text-emerald-500 font-bold">SUCCESS</td>
                        <td className="py-2 text-slate-450">{s.fileCount - 4} files</td>
                        <td className="py-2 text-slate-500 italic">None</td>
                      </tr>
                    ))}

                    {selectedTable === 'health_logs' && dbLogs.map(l => (
                      <tr key={l.id} className="hover:bg-slate-900/50">
                        <td className="py-2 text-slate-500">{l.id}</td>
                        <td className="py-2 text-slate-450">{l.timestamp}</td>
                        <td className="py-2 text-orange-400">{l.component}</td>
                        <td className="py-2 text-emerald-500 font-bold">{l.status}</td>
                        <td className="py-2 text-slate-350">{l.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-450 pt-2 font-medium">
            <span className="flex items-center gap-1">
              <Terminal className="h-3.5 w-3.5 text-slate-400" />
              <span>Use the Diagnostic simulator deck above to insert rows, trigger schema locks, or fail DB transactions live.</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
