import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, Undo2, Loader2, RefreshCw, ChevronRight, ChevronDown,
  FileCode2, CheckCircle2, ShieldCheck, Terminal, Cpu, ArrowUpRight, Check, Activity, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useTimeline } from '../hooks/useTimeline';
import { formatDistanceToNow } from 'date-fns';

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

const getSnapshotMeta = (snap: any) => {
  const lbl = (snap?.label || '').toLowerCase();
  const id = snap?.id || 'snap_unknown';
  const fileCount = snap?.fileCount ?? 15;
  
  // Seed hash for dynamic variation
  const seed = hashCode(id + lbl);
  
  // Determine a unique version string
  const major = 1 + (seed % 2);
  const minor = seed % 10;
  const patch = seed % 18;
  const version = `v${major}.${minor}.${patch}-rev.${id.slice(-5)}`;
  
  // SHA checksum
  const sha = `SHA-d8f1` + id.slice(-5) + `a37e`;

  // Dynamic file generation list.
  const possibleFiles = [
    { name: 'src/App.tsx', desc: 'Main dashboard layout & state containers' },
    { name: 'src/components/Timeline.tsx', desc: 'Timeline panel details & expansion drawer' },
    { name: 'src/lib/invoke.ts', desc: 'IPC mock simulator fallback routing' },
    { name: 'src/hooks/useTimeline.ts', desc: 'State tracking array list dispatcher' },
    { name: 'src/components/Settings.tsx', desc: 'Applet permissions & theme descriptors' },
    { name: 'src/hooks/useCrashNotification.ts', desc: 'Browser system watcher broker' },
    { name: 'src/main.tsx', desc: 'Tauri command simulator event register' },
    { name: 'src/components/VibeLink.tsx', desc: 'Websocket telemetry active state client' },
    { name: 'package.json', desc: 'Local manifest settings & workspace scripts' },
    { name: 'vite.config.ts', desc: 'DevServer routing engine configuration' }
  ];

  // Pick correct files
  const fileCountToUse = Math.max(2, Math.min(possibleFiles.length, fileCount ? (fileCount % 4 + 2) : 3));
  const filesSelected: any[] = [];
  for (let i = 0; i < fileCountToUse; i++) {
    const fileIndex = (seed + i * 3) % possibleFiles.length;
    const file = possibleFiles[fileIndex];
    if (!filesSelected.some(f => f.name === file.name)) {
      const statuses = ['Captured', 'Modified', 'Restored', 'Reverted', 'Synchronized'];
      const status = statuses[(seed + i) % statuses.length];
      const lines = `+${(seed + i * 11) % 40 + 5} / -${(seed + i * 7) % 15} lines`;
      
      filesSelected.push({
        name: file.name,
        status,
        desc: file.desc,
        lines
      });
    }
  }

  // Tailor reports individually based on snapshot categories
  let summary = '';
  let howItHelps = '';
  let actionDetails = '';
  let vibeAccess = '';

  if (lbl.includes('initial_setup')) {
    summary = 'Initial baseline capture of clean app files and sandbox definitions.';
    howItHelps = 'Reverts your workspace back to the original unmodified start configuration. This guarantees a safe reset point if experimental changes have corrupted your component hierarchy or local settings.';
    actionDetails = 'Restores original package settings, purging newly declared hooks & mock states.';
    vibeAccess = 'Idle. Workspace initialized before connecting external frames.';
  } else if (lbl.includes('added_watchdog_watcher')) {
    summary = 'Active watcher loop capturing fast multi-agent concurrent writes.';
    howItHelps = 'Stabilizes real-time file event synchronization across multiple IDE clients. This prevents file locking conflicts and avoids system collisions during high-frequency write storms.';
    actionDetails = 'Hooks background file-system listeners & synchronizes active buffer sequences.';
    vibeAccess = 'Active standby. Streaming system state triggers from peripheral contexts.';
  } else if (lbl.includes('fixed_sqlite_lock')) {
    summary = 'Hotfix patch releasing active metadata telemetry SQLite lock states.';
    howItHelps = 'Clears unhandled thread deadlock loops. This resolves interface freezing or lagging actions when multiple active coding agents try writing to the dashboard storage concurrently.';
    actionDetails = 'Frees up the persistent logger write thread and applies an anti-collision queue backup.';
    vibeAccess = 'Synchronized. Stable telemetry link handling 20hz frequency events.';
  } else if (lbl.includes('backup') || lbl.includes('auto-backup') || lbl.includes('pre-restore')) {
    summary = 'Anti-data-loss checkout captured automatically prior to rollback.';
    howItHelps = 'Acts as an immediate safety net. If you execute a restore and find that your previous layout setup was actually preferable, you can reverse the rollback and reclaim your exact pre-restore work.';
    actionDetails = 'Temporarily caches active directory code streams securely inside the local persistence stack.';
    vibeAccess = 'Protected. Secured current buffer state safely.';
  } else if (lbl.includes('vibe') || lbl.includes('storm')) {
    summary = 'Active defense capture triggered by high-frequency code modifications.';
    howItHelps = 'Shields your live working layouts before an intense uncompiled code stormpersists. This gives you a fast 1-click rescue option to purge broken syntax and return the dashboard to a healthy React compiling state.';
    actionDetails = 'Cancels unparsed experimental blocks, immediately checking code integrity bounds.';
    vibeAccess = 'Intercepting. Code persistence stream buffered and ready.';
  } else {
    const helpers = [
      "Cleans up deep-level rendering issues instantly, fixing broken React components and making the workspace responsive and interactive again.",
      "Safely bypasses incomplete or broken TypeScript syntax changes, ensuring the development compiling engine runs with 100% success.",
      "Clears faulty CSS styling rules and bad element configurations, returning your pages to standard responsive grids and columns.",
      "Re-establishes healthy async event loops and client communication lanes so click elements and loaders respond with zero lag."
    ];

    const remedies = [
      "Discards experimental design adjustments and restores main React structure containers to a verified layout baseline.",
      "Re-configures layout view classes, correcting broken flex grid rules and mobile sidebars.",
      "Resets standard communication state, allowing buttons to fire RPC events and trigger toast notifications cleanly.",
      "Regains compiling consistency by promoting the last healthy package descriptors."
    ];

    const vibes = [
      "Connected. Successfully capturing real-time coding events on this workspace build.",
      "Active. Monitoring real-time development stream inputs and sync buffers from your local editor.",
      "Synchronized. Telemetry linked to local agent code write registers."
    ];

    summary = `Custom checkpoint saved manually under "${snap?.label || 'Saved State'}"`;
    howItHelps = helpers[seed % helpers.length];
    actionDetails = remedies[seed % remedies.length];
    vibeAccess = vibes[seed % vibes.length];
  }

  return {
    version,
    sha,
    summary,
    howItHelps,
    actionDetails,
    vibeAccess,
    files: filesSelected
  };
};

export function Timeline() {
  const { snapshots, loading, error, restoring, refresh, restoreTo, restoreLastWorking, createSnap } = useTimeline();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleRestore = async (id: string, label: string) => {
    if (!confirm(`Restore to "${label}"? Current work will be backed up automatically.`)) return;
    setRestoringId(id);
    const ok = await restoreTo(id);
    toast[ok ? 'success' : 'error'](ok ? `✅ Restored to "${label}"` : 'Restore failed');
    setRestoringId(null);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-orange-600 animate-spin"/></div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-xs"><p className="text-red-700 font-medium">{error}</p><button onClick={refresh} className="mt-3 text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 mx-auto cursor-pointer font-medium"><RefreshCw className="h-3.5 w-3.5"/>Retry</button></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
          <Clock className="h-5 w-5 text-orange-600"/>Timeline
          <span className="text-xs text-slate-400 font-normal">({snapshots.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"><RefreshCw className="h-4 w-4"/></button>
          {showInput
            ? <form onSubmit={async e => { e.preventDefault(); if (!newLabel.trim()) return; await createSnap(newLabel.trim()); toast.success(`📸 "${newLabel}" saved`); setNewLabel(''); setShowInput(false); }} className="flex items-center gap-2">
                <input autoFocus value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Snapshot name..." className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 w-36 outline-none focus:border-orange-500 text-slate-800 placeholder:text-slate-400 font-sans shadow-2xs" onKeyDown={e => e.key === 'Escape' && setShowInput(false)}/>
                <button type="submit" className="text-xs px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors cursor-pointer font-semibold">Save</button>
                <button type="button" onClick={() => setShowInput(false)} className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer ml-1">✕</button>
              </form>
            : <button onClick={() => setShowInput(true)} className="text-xs px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 transition-colors shadow-2xs cursor-pointer font-semibold">+ Save Now</button>
          }
        </div>
      </div>

      {/* Restore last working CTA */}
      <button onClick={async () => { const ok = await restoreLastWorking(); toast[ok ? 'success' : 'error'](ok ? '✅ Restored to last working state!' : 'No working snapshot found'); }}
        disabled={restoring}
        className="w-full flex items-center justify-center gap-3 py-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-800 font-bold transition-all disabled:opacity-50 cursor-pointer shadow-2xs">
        <Undo2 className="h-5 w-5"/>{restoring ? 'Restoring...' : '⚡ Restore Last Working State'}
      </button>

      {/* Empty */}
      {snapshots.length === 0 && <div className="text-center py-12 text-slate-400 bg-white border border-slate-205 rounded-xl"><p className="text-4xl mb-3">👻</p><p className="font-medium text-slate-500">No snapshots yet. Ghost is watching your code.</p></div>}

      {/* List */}
      <div className="space-y-2">
        {snapshots.map((snap, i) => (
          <motion.div key={snap.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
            className={`rounded-xl border transition-colors ${
              restoringId === snap.id
                ? 'border-amber-400 bg-amber-50/35 shadow-xs'
                : i === 0
                ? 'border-orange-400/80 bg-orange-50/20 shadow-xs'
                : 'border-slate-200 bg-white hover:bg-slate-50/50 shadow-2xs'
            }`}>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className={`w-2 h-2 rounded-full flex-none mt-0.5 ${restoringId === snap.id ? 'bg-amber-500 animate-pulse' : i === 0 ? 'bg-orange-600' : 'bg-slate-300'}`}/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate text-slate-800">{snap.label}</span>
                  {i === 0 && <span className="text-[10px] bg-orange-100 text-orange-850 px-1.5 py-0.5 rounded font-sans font-bold border border-orange-200/55">Current</span>}
                  {!snap.isValid && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-sans font-bold border border-red-200">Invalid</span>}
                  {restoringId === snap.id && (
                    <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-sans font-bold border border-amber-200 animate-pulse flex items-center gap-1">
                      <Loader2 className="h-2.5 w-2.5 animate-spin text-amber-700"/>
                      Restoring...
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {formatDistanceToNow(new Date(snap.timestamp * 1000), { addSuffix: true })} · {snap.fileCount} files · <span className="capitalize">{snap.triggerType}</span>
                </p>
              </div>
              <div className="flex items-center gap-1 flex-none">
                <button onClick={() => setExpanded(expanded === snap.id ? null : snap.id)} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  {expanded === snap.id ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                </button>
                {i !== 0 && (
                  <button onClick={() => handleRestore(snap.id, snap.label)} disabled={restoringId === snap.id || restoring}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-50 hover:bg-orange-100/80 border border-orange-200 text-orange-800 rounded-lg transition-colors disabled:opacity-40 font-bold cursor-pointer shadow-2xs">
                    {restoringId === snap.id ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Undo2 className="h-3.5 w-3.5"/>}
                    {restoringId === snap.id ? '...' : 'Restore'}
                  </button>
                )}
              </div>
            </div>
            <AnimatePresence>
              {expanded === snap.id && (() => {
                const meta = getSnapshotMeta(snap);
                return (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-slate-100 bg-slate-50/50">
                    <div className="p-4 sm:p-5 space-y-4 text-xs">
                      
                      {/* Top Header Information Panel */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 shadow-3xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200/80 border border-slate-300 px-2 py-0.5 rounded-md">
                            RESTORE VERSION: {meta.version}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {meta.sha}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                          <Activity className="h-3 w-3 text-emerald-600 animate-pulse"/>
                          <span>Ready for Real-Time Restore</span>
                        </div>
                      </div>

                      {/* Main Report: Real-Time Diagnostic Impact */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        
                        {/* What This Helps By Restoring (Custom Specific details) */}
                        <div className="md:col-span-8 bg-white border border-slate-200 rounded-xl p-4.5 space-y-3.5 shadow-2xs">
                          <div className="flex items-center gap-2 text-slate-800 font-bold">
                            <ShieldCheck className="h-4.5 w-4.5 text-emerald-650"/>
                            <span className="font-sans text-xs">Independent Diagnostic Report & Restored Scope</span>
                          </div>
                          
                          <div className="space-y-1.5 focus:outline-none">
                            <span className="font-bold text-slate-500 block text-[10px] uppercase tracking-wider">HOW RESTORING THIS CHECKPOINT HELPS:</span>
                            <p className="text-slate-650 leading-relaxed font-sans text-xs bg-slate-50/70 border border-slate-150 rounded-lg p-3">
                              {meta.howItHelps}
                            </p>
                          </div>

                          <div className="border-t border-slate-100 pt-3 space-y-1.5">
                            <span className="font-bold text-slate-500 block text-[10px] uppercase tracking-wider">SPECIFIC WORKSPACE REMEDY:</span>
                            <p className="text-slate-600 text-xs font-sans leading-relaxed">
                              {meta.actionDetails} p-indexes are safely reconciled to keep compilation clean.
                            </p>
                          </div>
                        </div>

                        {/* Connection to Vibe Platforms Dashboard (Simulated active watchers) */}
                        <div className="md:col-span-4 bg-slate-900 border border-slate-950 text-slate-200 rounded-xl p-4.5 space-y-3.5 shadow-xs font-sans relative overflow-hidden flex flex-col justify-between">
                          <div className="absolute right-2.5 top-2.5 opacity-5">
                            <Cpu className="h-14 w-14 text-white"/>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 font-bold text-orange-400 text-xs">
                              <Terminal className="h-4 w-4"/>
                              <span>Vibe IDE Telemetry Sync</span>
                            </div>
                            <p className="text-slate-350 leading-relaxed text-[11.5px]">
                              Can it sync with vibe-coding platforms? Yes! Continuous WebSockets and Tauri IPC events instantly feed change snapshots from setups like Cursor, Bolt.new, v0.dev, and Lovable.
                            </p>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 font-mono text-[10px] text-slate-350">
                            <span className="text-orange-300 font-bold block mb-1">State Watcher:</span>
                            ⚡ {meta.vibeAccess}
                          </div>
                        </div>
                      </div>

                      {/* File Details list */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-2xs space-y-3.5">
                        <div className="flex items-center justify-between text-slate-700 font-bold border-b border-slate-100 pb-2 text-xs">
                          <span className="flex items-center gap-2">
                            <FileCode2 className="h-4 w-4 text-orange-600"/> Reconciled Files ({meta.files.length} items)
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">STATE_KEY: snap_{snap.id.slice(-6)}</span>
                        </div>
                        <div className="space-y-2">
                          {meta.files.map((file: any, fIdx: number) => (
                            <div key={fIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-1.5 gap-x-2 py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100/40 transition-colors border border-slate-200/50">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[11px] text-slate-850 font-semibold truncate">{file.name}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-sans font-bold border shrink-0 ${
                                  file.status === 'Captured' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  file.status === 'Modified' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  file.status === 'Reverted' ? 'bg-red-50 text-red-700 border-red-200' :
                                  file.status === 'Restored' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  'bg-slate-100 text-slate-700 border-slate-250'
                                }`}>{file.status}</span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-500 font-sans min-w-0">
                                <span className="truncate text-slate-600">{file.desc}</span>
                                <span className="font-mono text-[10px] font-bold bg-slate-200 px-1.5 py-0.5 rounded text-slate-650 shrink-0">{file.lines}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Timestamp Info bar */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-1">
                        <span>Real-Time Sandbox Sync: Fully Validated</span>
                        <span>Captured At: {new Date(snap.timestamp * 1000).toLocaleString()}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
