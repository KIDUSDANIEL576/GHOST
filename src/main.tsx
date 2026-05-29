// ────────────────────────────────────────────────────────
// GHOST UNIVERSAL: Tauri Browser Compatibility Mock
// MUST be registered at the very top, before any other imports
// ────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  console.log('👻 Ghost Universal: Initializing Browser Mock Bridge');

  const INITIAL_SNAPSHOTS = [
    {
      id: '1782342000000',
      timestamp: 1782342000,
      label: 'initial_setup',
      fileCount: 15,
      triggerType: 'manual',
      isValid: true,
      time: '15:00:00'
    },
    {
      id: '1782342180000',
      timestamp: 1782342180,
      label: 'added_watchdog_watcher',
      fileCount: 18,
      triggerType: 'auto',
      isValid: true,
      time: '15:03:00'
    },
    {
      id: '1782342240000',
      timestamp: 1782342240,
      label: 'fixed_sqlite_lock',
      fileCount: 22,
      triggerType: 'manual',
      isValid: true,
      time: '15:04:00'
    }
  ];

  const INITIAL_CRASH = {
    suspects: [
      {
        rank: 1,
        file: 'src/components/Timeline.tsx',
        score: 95,
        signals: ['STACK_MATCH', 'VERY_RECENT'],
        context: 'TypeError: Cannot read properties of undefined (reading \'id\')'
      },
      {
        rank: 2,
        file: 'src-tauri/engine/watcher.py',
        score: 65,
        signals: ['RECENT', 'SAME_DIR'],
        context: 'UNTRACKED'
      },
      {
        rank: 3,
        file: 'src/App.tsx',
        score: 30,
        signals: ['IN_WINDOW'],
        context: 'TRACKED'
      }
    ],
    crashFile: 'src/components/Timeline.tsx',
    crashLine: 42
  };

  // Helper to ensure localStorage state
  const getStoredSnapshots = () => {
    const raw = localStorage.getItem('ghost_snapshots');
    if (!raw) {
      localStorage.setItem('ghost_snapshots', JSON.stringify(INITIAL_SNAPSHOTS));
      return INITIAL_SNAPSHOTS;
    }
    return JSON.parse(raw);
  };

  const getStoredCrash = () => {
    const raw = localStorage.getItem('ghost_active_crash');
    if (raw === 'null') return null;
    if (!raw) {
      localStorage.setItem('ghost_active_crash', JSON.stringify(INITIAL_CRASH));
      return INITIAL_CRASH;
    }
    return JSON.parse(raw);
  };

  const handleIpcCommand = async (cmd: string, args?: any) => {
    console.log(`[Tauri IPC Mock] cmd: ${cmd}`, args);

    if (cmd === 'ghost_init') {
      return `Ghost initialized at ${args?.projectPath || '.'}`;
    }

    if (cmd === 'get_timeline') {
      return getStoredSnapshots();
    }

    if (cmd === 'create_snapshot') {
      const snaps = getStoredSnapshots();
      const now = Date.now() / 1000;
      const newSnap = {
        id: String(Date.now()) + '_' + Math.random().toString(36).substring(2, 7),
        timestamp: now,
        label: args?.label || 'auto',
        fileCount: Math.floor(Math.random() * 8) + 20,
        triggerType: args?.triggerType || 'manual',
        isValid: true,
        time: new Date().toLocaleTimeString()
      };
      const updated = [newSnap, ...snaps];
      localStorage.setItem('ghost_snapshots', JSON.stringify(updated));
      return {
        success: true,
        snapshotUuid: newSnap.id,
        filesCaptured: newSnap.fileCount,
        error: null
      };
    }

    if (cmd === 'restore_snapshot') {
      await new Promise(resolve => setTimeout(resolve, 600));
      const snaps = getStoredSnapshots();
      const targetId = args?.snapshotId;
      const index = snaps.findIndex((s: any) => s.id === targetId);
      if (index !== -1) {
        // Create auto-backup of what's currently active (index 0) before promoting
        let backupSnap = null;
        if (snaps.length > 0) {
          const current = snaps[0];
          backupSnap = {
            id: String(Date.now()) + '_backup_' + Math.random().toString(36).substring(2, 7),
            timestamp: Date.now() / 1000,
            label: `Auto-Backup: Pre-Restore state (of ${current.label})`,
            fileCount: current.fileCount,
            triggerType: 'auto',
            isValid: true,
            time: new Date().toLocaleTimeString()
          };
        }

        const [restored] = snaps.splice(index, 1);
        
        // Promote snapshot to current position
        const updated = [restored];
        if (backupSnap) updated.push(backupSnap);
        updated.push(...snaps);

        localStorage.setItem('ghost_snapshots', JSON.stringify(updated));
      }
      localStorage.setItem('ghost_active_crash', 'null');
      window.dispatchEvent(new Event('ghost_crash_cleared'));
      window.dispatchEvent(new Event('ghost_snapshots_updated'));
      window.dispatchEvent(new Event('storage'));
      return {
        success: true,
        filesRestored: 12,
        filesFailed: 0,
        methodUsed: 'resilient_copy',
        error: null
      };
    }

    if (cmd === 'restore_last_working') {
      await new Promise(resolve => setTimeout(resolve, 600));
      const snaps = getStoredSnapshots();
      const workingIndex = snaps.findIndex((s: any) => s.isValid);
      if (workingIndex !== -1) {
        // Create auto-backup of what's currently active (index 0) before promoting
        let backupSnap = null;
        if (snaps.length > 0) {
          const current = snaps[0];
          backupSnap = {
            id: String(Date.now()) + '_backup_' + Math.random().toString(36).substring(2, 7),
            timestamp: Date.now() / 1000,
            label: `Auto-Backup: Pre-Restore state (of ${current.label})`,
            fileCount: current.fileCount,
            triggerType: 'auto',
            isValid: true,
            time: new Date().toLocaleTimeString()
          };
        }

        const [restored] = snaps.splice(workingIndex, 1);
        
        // Promote snapshot to current position
        const updated = [restored];
        if (backupSnap) updated.push(backupSnap);
        updated.push(...snaps);

        localStorage.setItem('ghost_snapshots', JSON.stringify(updated));
      }
      localStorage.setItem('ghost_active_crash', 'null');
      window.dispatchEvent(new Event('ghost_crash_cleared'));
      window.dispatchEvent(new Event('ghost_snapshots_updated'));
      window.dispatchEvent(new Event('storage'));
      return {
        success: true,
        filesRestored: 12,
        filesFailed: 0,
        methodUsed: 'resilient_copy',
        error: null
      };
    }

    if (cmd === 'get_crash_suspects') {
      return getStoredCrash();
    }

    if (cmd === 'get_system_health') {
      const snaps = getStoredSnapshots();
      const crash = getStoredCrash();
      const dbStatus = 'OK';
      const watcherStatus = 'OK';
      const snapStatus = snaps.length > 0 ? 'OK' : 'DEGRADED';
      const overall = crash ? 'WARNING' : 'HEALTHY';

      return {
        overall,
        components: {
          database: {
            status: dbStatus,
            message: 'Database accessible (ledger.db)',
            fallback: false
          },
          file_watcher: {
            status: watcherStatus,
            message: 'Primary watchdog watcher running',
            fallback: false
          },
          snapshot_manager: {
            status: snapStatus,
            message: `Snapshots active (${snaps.length} captured)`,
            fallback: false
          },
          crash_parser: {
            status: 'OK',
            message: 'Monitoring CLI and dev stdout stream',
            fallback: false
          },
          ranker: {
            status: 'OK',
            message: 'Crash suspect ranker initialized',
            fallback: false
          }
        },
        timestamp: Date.now() / 1000
      };
    }

    // Fallback for internal tauri components/shell open
    if (cmd === 'tauri') {
      const { __tauriModule, message: shellMsg } = args || {};
      if (__tauriModule === 'Shell' && shellMsg?.cmd === 'open') {
        const url = shellMsg.path;
        console.log(`[Tauri IPC Mock] HTML window open fallback: ${url}`);
        window.open(url, '_blank');
        return;
      }
    }

    throw new Error(`Unknown command: ${cmd}`);
  };

  // Register modern window.__TAURI__ interface for safety
  (window as any).__TAURI__ = {
    tauri: {
      invoke: async (cmd: string, args?: any) => {
        return handleIpcCommand(cmd, args);
      }
    }
  };

  // Register the classic window.__TAURI_IPC__ function to handle direct @tauri-apps/api invokes in the browser
  (window as any).__TAURI_IPC__ = async (message: any) => {
    const { cmd, callback, error, ...args } = message;
    try {
      const result = await handleIpcCommand(cmd, args);
      if (typeof (window as any)[callback] === 'function') {
        (window as any)[callback](result);
      }
    } catch (err: any) {
      console.error(`[Tauri IPC Mock Error]`, err);
      if (typeof (window as any)[error] === 'function') {
        (window as any)[error](err.message || String(err));
      }
    }
  };
}

// ────────────────────────────────────────────────────────
// React Imports & Render Flow
// ────────────────────────────────────────────────────────
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
