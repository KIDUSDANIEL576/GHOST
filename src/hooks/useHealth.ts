import { useState, useEffect } from 'react';
import { invoke } from '../lib/invoke';

export interface SystemHealth {
  overall: 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'UNKNOWN';
  components: Record<string, { status: string; message: string; fallback: boolean }>;
  timestamp: number;
}

export function useHealth(intervalMs = 10000) {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  useEffect(() => {
    const check = async () => {
      try { setHealth(await invoke<SystemHealth>('get_system_health')); }
      catch { setHealth({ overall: 'UNKNOWN', components: {}, timestamp: Date.now() / 1000 }); }
    };
    check();

    window.addEventListener('ghost_crash_cleared', check);
    window.addEventListener('ghost_snapshots_updated', check);
    window.addEventListener('storage', check);

    const t = setInterval(check, intervalMs);
    return () => {
      window.removeEventListener('ghost_crash_cleared', check);
      window.removeEventListener('ghost_snapshots_updated', check);
      window.removeEventListener('storage', check);
      clearInterval(t);
    };
  }, [intervalMs]);
  return { health };
}
