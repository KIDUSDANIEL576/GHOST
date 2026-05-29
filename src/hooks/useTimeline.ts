import { useState, useEffect, useCallback } from 'react';
import { invoke } from '../lib/invoke';

export interface Snapshot {
  id: string; timestamp: number; label: string;
  fileCount: number; triggerType: string; isValid: boolean; time: string;
}
interface RestoreResult { success: boolean; filesRestored: number; error?: string; }

export function useTimeline(intervalMs = 4000) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await invoke<Snapshot[]>('get_timeline');
      setSnapshots(data ?? []); setError(null);
    } catch (e) { setError('Engine offline'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    refresh();
    const handleUpdate = () => {
      refresh();
    };
    window.addEventListener('ghost_snapshots_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    const t = setInterval(refresh, intervalMs);
    return () => {
      window.removeEventListener('ghost_snapshots_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      clearInterval(t);
    };
  }, [refresh, intervalMs]);

  const restoreTo = useCallback(async (id: string) => {
    setRestoring(true);
    try {
      const r = await invoke<RestoreResult>('restore_snapshot', { snapshotId: id });
      await refresh(); return r.success;
    } catch { return false; } finally { setRestoring(false); }
  }, [refresh]);

  const restoreLastWorking = useCallback(async () => {
    setRestoring(true);
    try {
      const r = await invoke<RestoreResult>('restore_last_working');
      await refresh(); return r.success;
    } catch { return false; } finally { setRestoring(false); }
  }, [refresh]);

  const createSnap = useCallback(async (label: string) => {
    try {
      await invoke('create_snapshot', { label, triggerType: 'manual' });
      await refresh(); return true;
    } catch { return false; }
  }, [refresh]);

  return { snapshots, loading, error, restoring, refresh, restoreTo, restoreLastWorking, createSnap };
}
