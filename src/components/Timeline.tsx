import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Undo2, Loader2, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useTimeline } from '../hooks/useTimeline';
import { formatDistanceToNow } from 'date-fns';

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
  };  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-orange-600 animate-spin"/></div>;
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
              {expanded === snap.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                  <div className="px-9 pb-3 pt-1 border-t border-slate-100">
                    <p className="text-[11px] font-mono text-slate-400">ID: {snap.id} · {new Date(snap.timestamp * 1000).toLocaleString()}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
