import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ghost, Clock, AlertTriangle, Activity, Settings as SettingsIcon, AlertCircle, RefreshCw, Link2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { Timeline } from './components/Timeline';
import { CrashDashboard } from './components/CrashDashboard';
import { HealthMonitor } from './components/HealthMonitor';
import { QuickActions } from './components/QuickActions';
import { useHealth } from './hooks/useHealth';
import { Settings } from './components/Settings';
import { useCrashNotification } from './hooks/useCrashNotification';
import { VibeLink } from './components/VibeLink';

type Tab = 'timeline' | 'crashes' | 'health' | 'vibelink' | 'settings';

export default function App() {
  const [tab, setTab] = useState<Tab>('timeline');
  const { health } = useHealth(5000);
  const [simulateActive, setSimulateActive] = useState(false);

  // Initialize background browser notification daemon for crashes
  useCrashNotification();

  useEffect(() => {
    // Check if a crash is currently active in localStorage
    const raw = localStorage.getItem('ghost_active_crash');
    setSimulateActive(!!raw && raw !== 'null');
  }, [tab]);

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
    <div className="h-screen flex flex-col bg-[#F5F7FA] text-slate-900 overflow-hidden font-sans">
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          style: { 
            background: '#FFFFFF', 
            color: '#0F172A', 
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05)'
          } 
        }}
      />

      {/* Header */}
      <header className="flex-none border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Ghost className="h-7 w-7 text-orange-600"/>
            <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${dot} animate-pulse`}/>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none font-sans text-slate-900">Ghost Universal</h1>
            <p className="text-[10px] text-slate-500 mt-1 font-mono font-medium">Time travel for vibe coders</p>
          </div>
        </div>
        <span className="text-xs text-slate-500 font-mono tracking-wider font-semibold">{health?.overall ?? 'Starting...'}</span>
      </header>

      {/* Tabs */}
      <nav className="flex-none flex border-b border-slate-200 bg-white px-6">
        {tabs.map(t => (
          <button 
            key={t.id} 
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-all cursor-pointer ${
              tab === t.id 
                ? 'text-orange-600 border-orange-600 font-semibold' 
                : 'text-slate-500 border-transparent hover:text-slate-900'
            }`}
          >
            <t.icon className="h-4 w-4"/>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Quick actions bar */}
      <div className="flex-none border-b border-slate-200/60 bg-slate-100/80 px-6 py-2">
        <QuickActions />
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto bg-[#F5F7FA]">
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
            {tab === 'settings' && (
              <div className="space-y-6">
                <Settings />

                {/* Simulation Control Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 text-orange-600 font-bold text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>PREVIEW & MONITORING SIMULATOR</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Since the Rust filesystem watcher compiles specifically for desktop apps, you can use these simulation triggers to test visual notifications, reactive charts, and rollback flows live in this web preview.
                  </p>

                  <div className="flex flex-wrap gap-3 pt-2">
                    {simulateActive ? (
                      <button 
                        onClick={handleClearCrash}
                        className="text-xs px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-semibold transition-all cursor-pointer"
                      >
                        ✅ Resolve Active Crash
                      </button>
                    ) : (
                      <button 
                        onClick={handleSimulateCrash}
                        className="text-xs px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg font-semibold transition-all cursor-pointer"
                      >
                        💥 Trigger Simulated Crash
                      </button>
                    )}

                    <button 
                      onClick={handleResetData}
                      className="text-xs px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-700 border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 font-medium shadow-2xs"
                    >
                      <RefreshCw className="h-3 w-3" />
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
