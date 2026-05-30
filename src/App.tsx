import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ghost, Clock, AlertTriangle, Activity, Settings as SettingsIcon, AlertCircle, RefreshCw, Link2, BookOpen } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { Timeline } from './components/Timeline';
import { CrashDashboard } from './components/CrashDashboard';
import { HealthMonitor } from './components/HealthMonitor';
import { QuickActions } from './components/QuickActions';
import { useHealth } from './hooks/useHealth';
import { Settings } from './components/Settings';
import { useCrashNotification } from './hooks/useCrashNotification';
import { VibeLink } from './components/VibeLink';
import { Manual } from './components/Manual';

type Tab = 'timeline' | 'crashes' | 'health' | 'vibelink' | 'manual' | 'settings';

export default function App() {
  const [tab, setTab] = useState<Tab>('timeline');
  const { health } = useHealth(5000);
  const [simulateActive, setSimulateActive] = useState(false);

  // Initialize background browser notification daemon for crashes
  useCrashNotification();

  useEffect(() => {
    const raw = localStorage.getItem('ghost_settings_v1');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.theme === 'light') {
          document.body.classList.add('light-theme');
        } else {
          document.body.classList.remove('light-theme');
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    // Check if a crash is currently active in localStorage
    const checkActive = () => {
      const raw = localStorage.getItem('ghost_active_crash');
      setSimulateActive(!!raw && raw !== 'null');
    };
    checkActive();

    window.addEventListener('storage', checkActive);
    window.addEventListener('ghost_crash_cleared', checkActive);
    window.addEventListener('ghost_snapshots_updated', checkActive);

    return () => {
      window.removeEventListener('storage', checkActive);
      window.removeEventListener('ghost_crash_cleared', checkActive);
      window.removeEventListener('ghost_snapshots_updated', checkActive);
    };
  }, []);

  const dot = { 
    HEALTHY: 'bg-green-400', 
    WARNING: 'bg-yellow-400', 
    DEGRADED: 'bg-red-400', 
    UNKNOWN: 'bg-gray-400' 
  }[health?.overall ?? 'UNKNOWN'];

  const tabs = [
    { id: 'timeline' as Tab, icon: Clock, label: 'Timeline' },
    { id: 'crashes' as Tab, icon: AlertTriangle, label: 'Crashes' },
    { id: 'health' as Tab, icon: Activity, label: 'Health' },
    { id: 'vibelink' as Tab, icon: Link2, label: 'Vibe Link' },
    { id: 'manual' as Tab, icon: BookOpen, label: 'Manual' },
    { id: 'settings' as Tab, icon: SettingsIcon, label: 'Settings' },
  ];

  const handleSimulateCrash = () => {
    const mockCrash = {
      suspects: [
        {
          rank: 1,
          file: 'src/components/Timeline.tsx',
          score: 95,
          signals: ['STACK_MATCH', 'VERY_RECENT'],
          context: "TypeError: Cannot read properties of undefined (reading 'id') at Timeline.tsx:42"
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

    localStorage.setItem('ghost_active_crash', JSON.stringify(mockCrash));
    setSimulateActive(true);
    toast.error('💥 Simulated crash triggered! Check the Crashes tab.', {
      description: 'TypeError on src/components/Timeline.tsx at line 42.'
    });
  };

  const handleClearCrash = () => {
    localStorage.setItem('ghost_active_crash', 'null');
    setSimulateActive(false);
    toast.success('✨ Active crash resolved!');
  };

  const handleResetData = () => {
    localStorage.removeItem('ghost_snapshots');
    localStorage.removeItem('ghost_active_crash');
    toast.success('♻️ App state reset to original defaults.');
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="h-screen flex flex-col bg-ghost-bg text-[#F7F9FB] overflow-hidden font-sans">
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          style: { 
            background: '#1A1E37', 
            color: '#F7F9FB', 
            border: '1px solid #2D3748',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
          } 
        }}
      />

      {/* Header */}
      <header className="flex-none border-b border-slate-800 bg-[#0F142D] px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Ghost className="h-7 w-7 text-ghost-orange animate-pulse"/>
            <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${dot} animate-pulse`}/>
          </div>
          <div>
            <h1 className="font-semibold text-lg leading-none font-sans text-white">Ghost Universal</h1>
            <p className="text-[10px] text-ghost-orange mt-1 font-mono font-semibold">AI coding without fear.</p>
          </div>
        </div>
        <span className="text-xs text-slate-400 font-mono tracking-wider font-semibold">{health?.overall ?? 'Starting...'}</span>
      </header>

      {/* Tabs */}
      <nav className="flex-none flex border-b border-slate-800 bg-[#0F142D] px-6">
        {tabs.map(t => (
          <button 
            key={t.id} 
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-all cursor-pointer ${
              tab === t.id 
                ? 'text-ghost-orange border-ghost-orange font-bold' 
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <t.icon className="h-4 w-4"/>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Quick actions bar */}
      <div className="flex-none border-b border-slate-800 bg-[#161B3B] px-6 py-2">
        <QuickActions />
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto bg-ghost-bg">
        <AnimatePresence mode="wait">
          <motion.div 
            key={tab} 
            initial={{ opacity: 0, y: 4 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -4 }} 
            transition={{ duration: 0.15 }} 
            className="p-6 max-w-4xl mx-auto"
          >
            {tab === 'timeline' && <Timeline/>}
            {tab === 'crashes' && <CrashDashboard/>}
            {tab === 'health' && <HealthMonitor/>}
            {tab === 'vibelink' && <VibeLink />}
            {tab === 'manual' && <Manual onNavigate={setTab} />}
            {tab === 'settings' && (
              <div className="space-y-6">
                <Settings />

                {/* Simulation Control Card */}
                <div className="rounded-xl border border-slate-800 bg-ghost-surface p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 text-ghost-orange font-bold text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>PREVIEW & MONITORING SIMULATOR</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                    Since the Rust filesystem watcher compiles specifically for desktop apps, you can use these simulation triggers to test visual notifications, reactive charts, and rollback flows live in this web preview.
                  </p>

                  <div className="flex flex-wrap gap-3 pt-2">
                    {simulateActive ? (
                      <button 
                        onClick={handleClearCrash}
                        className="text-xs px-3 py-2 bg-emerald-950/40 text-ghost-green hover:bg-emerald-950/60 border border-emerald-800/80 rounded-lg font-bold transition-all cursor-pointer"
                      >
                        ✅ Resolve Active Crash
                      </button>
                    ) : (
                      <button 
                        onClick={handleSimulateCrash}
                        className="text-xs px-3 py-2 bg-red-950/40 text-ghost-red hover:bg-red-950/60 border border-red-800/80 rounded-lg font-bold transition-all cursor-pointer"
                      >
                        💥 Trigger Simulated Crash
                      </button>
                    )}

                    <button 
                      onClick={handleResetData}
                      className="text-xs px-3 py-2 bg-[#1E254A] hover:bg-[#252E5C] rounded-lg text-slate-200 border border-slate-700/80 transition-all cursor-pointer flex items-center gap-1.5 font-bold shadow-xs"
                    >
                      <RefreshCw className="h-3 w-3 text-ghost-orange" />
                      Reset App State
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
