import React, { useState } from 'react';
import { invoke } from '../lib/invoke';
import { Undo2, RotateCcw, Camera } from 'lucide-react';
import { toast } from 'sonner';

export function QuickActions({ onDone }: { onDone?: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); 
    try { 
      await fn(); 
      // Trigger instant UI updates throughout components
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('ghost_snapshots_updated'));
      onDone?.(); 
    } finally { 
      setBusy(null); 
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[
        { key: 'undo', icon: Undo2, label: 'Undo', color: 'hover:text-ghost-orange hover:bg-[#1E254A]',
          fn: async () => {
            const snaps = await invoke<any[]>('get_timeline');
            if (snaps.length < 2) { toast.info('Nothing to undo'); return; }
            const r = await invoke<any>('restore_snapshot', { snapshotId: snaps[1].id });
            toast[r.success ? 'success' : 'error'](r.success ? `↩ Undone` : 'Undo failed');
          }},
        { key: 'restore', icon: RotateCcw, label: 'Last Working', color: 'hover:text-[#06D6A0] hover:bg-[#1E254A]',
          fn: async () => {
            const r = await invoke<any>('restore_last_working');
            toast[r.success ? 'success' : 'error'](r.success ? '✅ Restored last working state!' : r.error || 'No snapshot found');
          }},
        { key: 'snap', icon: Camera, label: 'Save Snap', color: 'hover:text-blue-300 hover:bg-[#1E254A]',
          fn: async () => {
            const label = `manual_${new Date().toLocaleTimeString()}`;
            await invoke('create_snapshot', { label, triggerType: 'manual' });
            toast.success(`📸 Snapshot saved`);
          }},
      ].map(a => (
        <button key={a.key} onClick={() => run(a.key, a.fn)} disabled={busy === a.key}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs text-slate-300 font-bold transition-all disabled:opacity-40 ${a.color} cursor-pointer`}>
          <a.icon className={`h-3.5 w-3.5 ${busy === a.key ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">{a.label}</span>
        </button>
      ))}
    </div>
  );
}
