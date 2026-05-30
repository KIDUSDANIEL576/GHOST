import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, Link2, Network, ShieldCheck, RefreshCw, Zap, Play, Terminal, 
  Settings, Save, AlertCircle, Sparkles, CheckCircle2, Wifi, WifiOff, 
  FileCode2, Download, Search, Plus, Radio, ExternalLink,
  Chrome, Code, Eye, Monitor
} from 'lucide-react';
import { toast } from 'sonner';
import { WebVibeTool } from '../lib/vibeActiveRegistry';
import { useWebVibeRegistry } from '../hooks/useWebVibeRegistry';

interface VibeAgent {
  id: string;
  name: string;
  type: 'ide' | 'browser' | 'cli';
  status: 'connected' | 'disconnected' | 'writing';
  lastActivity: string;
  mutationsCount: number;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'mutation';
}

const generateUniqueId = (prefix = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export function VibeLink() {
  const [agents, setAgents] = useState<VibeAgent[]>([
    { id: '1', name: 'Cursor IDE Agent', type: 'ide', status: 'connected', lastActivity: '2 minutes ago', mutationsCount: 142 },
    { id: '2', name: 'Ghost Chrome Extension', type: 'browser', status: 'connected', lastActivity: 'Just now', mutationsCount: 88 },
    { id: '3', name: 'Windsurf Agentic Loop', type: 'ide', status: 'disconnected', lastActivity: '1 hour ago', mutationsCount: 412 },
    { id: '4', name: 'Aistudio Build CLI', type: 'cli', status: 'writing', lastActivity: '0 seconds ago', mutationsCount: 23 },
  ]);

  const [newToolName, setNewToolName] = useState('');
  const [newToolDomain, setNewToolDomain] = useState('');

  const [logs, setLogs] = useState<ActivityLog[]>([
    { id: '1', timestamp: '12:04:15 PM', source: 'Ghost Chrome Extension', message: 'Established active sandbox debugger channel.', type: 'success' },
    { id: '2', timestamp: '12:04:10 PM', source: 'Cursor IDE Agent', message: 'Began modification storm in src/components/Timeline.tsx (+214 lines)', type: 'mutation' },
    { id: '3', timestamp: '12:03:55 PM', source: 'Ghost System', message: 'Captured snapshot_1782342240 ahead of Cursor AI file write.', type: 'info' },
    { id: '4', timestamp: '12:02:10 PM', source: 'Aistudio Build CLI', message: 'Dev server telemetry: compiling application modules...', type: 'info' },
  ]);

  const [websocketPort, setWebsocketPort] = useState(4321);
  const [autoIntercept, setAutoIntercept] = useState(true);
  const [autoHeal, setAutoHeal] = useState(true);
  const [isSimulatingAgent, setIsSimulatingAgent] = useState(false);
  const [vibeActive, setVibeActive] = useState(true);
  const [selectedExtFile, setSelectedExtFile] = useState<'manifest' | 'content' | 'background'>('manifest');
  const [isExtensionSimActive, setIsExtensionSimActive] = useState(true);

  // Hook-driven VibeActiveRegistry Monitor
  const {
    discoveredTools,
    isScanning,
    runActiveScan,
    updateToolStatus,
    registerNewTool,
    removeTool
  } = useWebVibeRegistry(vibeActive, 10000);

  // Hook-driven periodic telemetry sync to user activity feed
  useEffect(() => {
    // Log initial platform scan
    const activeCount = discoveredTools.filter((t: WebVibeTool) => t.status === 'active').length;
    setLogs(prev => [
      {
        id: generateUniqueId('scan_init'),
        timestamp: new Date().toLocaleTimeString(),
        source: 'Browser Watcher',
        message: `🔍 Active Registry linked. Tracked ${discoveredTools.length} channels, found ${activeCount} active workspace frame(s).`,
        type: 'success'
      },
      ...prev
    ].slice(0, 30));
  }, []);



  // Periodic simulation of extension active traffic
  useEffect(() => {
    if (!vibeActive) return;

    const interval = setInterval(() => {
      setAgents(prev => prev.map(a => {
        if (a.id === '4' && isSimulatingAgent) {
          return { ...a, status: 'writing', mutationsCount: a.mutationsCount + 3, lastActivity: '0 seconds ago' };
        }
        if (a.id === '2') {
          return { ...a, lastActivity: 'Just now' };
        }
        return a;
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [vibeActive, isSimulatingAgent]);

  // Periodic Simulation of real browser extension events reading tab activity
  useEffect(() => {
    if (!vibeActive || !isExtensionSimActive) return;

    const extMessages = [
      'Detected DOM mutation wave of +114 nodes inside editor previews.',
      'Active tab URL checked: matched workspace filters (http://localhost:3000).',
      'Port Handshake: WebSocket connection alive and streaming frames at 25Hz.',
      'Intercepted compiler state trigger. App preview synchronizing cleanly.',
      'Tab switched event registered: active workspace is ai.studio/build/a5790e.',
      'Monitoring iframe context: successfully mounted mutation observers.'
    ];

    const intvl = setInterval(() => {
      if (Math.random() > 0.5) {
        const msg = extMessages[Math.floor(Math.random() * extMessages.length)];
        setLogs(prev => [
          {
            id: generateUniqueId('ext_sim'),
            timestamp: new Date().toLocaleTimeString(),
            source: 'Chrome Extension',
            message: `🌐 [TAB WATCH] ${msg}`,
            type: 'info'
          },
          ...prev
        ]);
      }
    }, 6000);

    return () => clearInterval(intvl);
  }, [vibeActive, isExtensionSimActive]);

  const toggleAgent = (id: string) => {
    setAgents(prev => prev.map(a => {
      if (a.id === id) {
        const nextStatus = a.status === 'disconnected' ? 'connected' : 'disconnected';
        toast.info(`${a.name} ${nextStatus === 'connected' ? 'Connected' : 'Disconnected'}`);
        return { ...a, status: nextStatus, lastActivity: nextStatus === 'connected' ? 'Just now' : a.lastActivity };
      }
      return a;
    }));
  };

  const handleSimulateVibeStorm = () => {
    if (isSimulatingAgent) return;
    setIsSimulatingAgent(true);
    toast.promise(
      new Promise<void>((resolve) => {
        // Step-by-step agent mock actions
        setTimeout(() => {
          setLogs(prev => [
            {
              id: generateUniqueId('storm_init'),
              timestamp: new Date().toLocaleTimeString(),
              source: 'Aistudio Build CLI',
              message: '⚡ AI Storm Initiated: 8 paths queued for rapid auto-rewriting.',
              type: 'mutation'
            },
            ...prev
          ]);
        }, 800);

        setTimeout(() => {
          setLogs(prev => [
            {
              id: generateUniqueId('storm_backup'),
              timestamp: new Date().toLocaleTimeString(),
              source: 'Ghost System',
              message: '📸 Pre-emptive cold snapshot backup generated automatically.',
              type: 'success'
            },
            ...prev
          ]);
          // Mutate local storage simulation
          const raw = localStorage.getItem('ghost_snapshots') || '[]';
          try {
            const snaps = JSON.parse(raw);
            const now = Date.now() / 1000;
            const newSnap = {
              id: generateUniqueId('snap_vibe'),
              timestamp: now,
              label: 'VibeStorm Intercept (Auto)',
              fileCount: 28,
              triggerType: 'vibe_link',
              isValid: true,
              time: new Date().toLocaleTimeString()
            };
            localStorage.setItem('ghost_snapshots', JSON.stringify([newSnap, ...snaps]));
            // Trigger storage reload event
            window.dispatchEvent(new Event('storage'));
          } catch {}
        }, 1800);

        setTimeout(() => {
          setLogs(prev => [
            {
              id: generateUniqueId('storm_crash'),
              timestamp: new Date().toLocaleTimeString(),
              source: 'Vibe Extension',
              message: '❌ Critical build crash compiled into src/components/Timeline.tsx:82',
              type: 'error'
            },
            ...prev
          ]);
          
          if (autoHeal) {
            setTimeout(() => {
              setLogs(prev => [
                {
                  id: generateUniqueId('storm_heal'),
                  timestamp: new Date().toLocaleTimeString(),
                  source: 'Self-Healer Daemon',
                  message: '🛡️ Crash auto-healed! Restoring last working pre-vibe snapshot...',
                  type: 'success'
                },
                ...prev
              ]);
              // Clear active mock crash
              localStorage.setItem('ghost_active_crash', 'null');
              window.dispatchEvent(new Event('ghost_crash_cleared'));
              toast.success('🛡️ Self-healer auto-reverted the broken Vibe code!');
              setIsSimulatingAgent(false);
              resolve();
            }, 1200);
          } else {
            // Set mock active crash
            const mockCrash = {
              suspects: [
                {
                  rank: 1,
                  file: 'src/components/Timeline.tsx',
                  score: 98,
                  signals: ['VIBE_STORM_MUTATION', 'STACK_MATCH'],
                  context: "TypeError: Cannot read properties of undefined (reading 'timestamp') at Timeline.tsx:82"
                }
              ],
              crashFile: 'src/components/Timeline.tsx',
              crashLine: 82
            };
            localStorage.setItem('ghost_active_crash', JSON.stringify(mockCrash));
            toast.error('💥 Compile crash caught! Go to Crashes tab to view suspects.');
            setIsSimulatingAgent(false);
            resolve();
          }
        }, 3200);
      }),
      {
        loading: 'Vibe Coding Agent is generating code...',
        success: 'Vibe Link interception loop finished!',
        error: 'Simulation failed'
      }
    );
  };

  // Export current telemetry sessions logs to JSON file
  const exportLogsAsJson = () => {
    try {
      const exportObject = {
        exportedAt: new Date().toISOString(),
        ghostVersion: '1.2.0-vibe-bridge',
        activeWebsocketPort: websocketPort,
        discoveredVibeTools: discoveredTools,
        streamLogs: logs,
        activeWatcherAgents: agents,
      };

      const jsonStr = JSON.stringify(exportObject, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `ghost_vibe_telemetry_stream_${Math.floor(Date.now() / 1000)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('🎉 Session telemetry stream exported successfully!');
    } catch (e: any) {
      toast.error('Failed to export. ' + e.message);
    }
  };

  // Perform a real browser tab network & port check scan
  // Perform a real browser tab network & port check scan
  const handlePerformBrowserScan = async () => {
    const updated = await runActiveScan(true);
    if (updated) {
      const activeCount = updated.filter(t => t.status === 'active').length;
      setLogs(prev => [
        {
          id: generateUniqueId('scan'),
          timestamp: new Date().toLocaleTimeString(),
          source: 'Browser Watcher',
          message: `🔍 Completed active platform registry scan. Verified ${updated.length} workspace entries, found ${activeCount} active.`,
          type: 'success'
        },
        ...prev
      ].slice(0, 30));
    }
  };

  // Add custom developer workspace to screen list & probe instantly
  const handleAddWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = registerNewTool(newToolName, newToolDomain, 'workspace');
    if (success) {
      setLogs(prev => [
        {
          id: generateUniqueId('mount'),
          timestamp: new Date().toLocaleTimeString(),
          source: 'User Mounted',
          message: `Registered custom browser environment watcher for: ${newToolDomain}`,
          type: 'info'
        },
        ...prev
      ]);
      setNewToolName('');
      setNewToolDomain('');
    }
  };


  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <Link2 className="h-5 w-5 text-ghost-orange"/>
            Vibe Link Extension Hub
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium font-sans">
            Connect desktop code-watchdogs directly with browser preview debuggers and AI IDE engines (Cursor, Windsurf, IDX).
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setVibeActive(!vibeActive);
              toast.info(vibeActive ? 'Vibe Link service paused' : 'Vibe Link bridge active');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
              vibeActive 
                ? 'bg-emerald-950/20 hover:bg-emerald-950/40 text-ghost-green border border-emerald-800/80 shadow-sm' 
                : 'bg-red-950/20 hover:bg-red-950/45 text-ghost-red border border-red-900/80 shadow-sm'
            }`}
          >
            {vibeActive ? <Wifi className="h-3.5 w-3.5 animate-pulse" /> : <WifiOff className="h-3.5 w-3.5" />}
            {vibeActive ? 'Bridge Active' : 'Bridge Paused'}
          </button>
        </div>
      </div>

      {/* Grid: Connected Agents & Link Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Connection status card */}
        <div className="md:col-span-2 rounded-xl border border-slate-800 bg-[#131936] p-5 flex flex-col justify-between space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-205">
              <Network className="h-4 w-4 text-ghost-orange" />
              <span>Active Agent Link Status</span>
            </div>
            <span className="text-[10px] font-mono bg-[#1E2551] border border-slate-700/80 px-2 py-0.5 rounded text-slate-400 font-bold">
              IPC Port: {websocketPort}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {agents.map(a => (
              <div key={a.id} className="p-3.5 rounded-lg bg-[#1C2248]/40 border border-slate-800 flex items-center justify-between shadow-3xs hover:bg-[#1C2248]/75 transition-all">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white truncate max-w-[120px]">{a.name}</span>
                    <span className={`w-1.5 h-1.5 rounded-full flex-none ${
                       a.status === 'connected' ? 'bg-[#06D6A0]' : a.status === 'writing' ? 'bg-[#FF6B35] animate-ping' : 'bg-slate-600'
                    }`} />
                  </div>
                  <p className="text-[10px] text-slate-450 font-medium mt-0.5">Watched · {a.mutationsCount} mutations</p>
                </div>
                <button 
                  onClick={() => toggleAgent(a.id)}
                  className="text-[10px] px-2.5 py-1 bg-[#232A55] border border-slate-705 hover:bg-[#2A3366] text-slate-250 font-bold rounded cursor-pointer shadow-3xs transition-all"
                >
                  {a.status === 'disconnected' ? 'Enable' : 'Disable'}
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 flex flex-wrap gap-2.5">
            <button 
              onClick={handleSimulateVibeStorm}
              disabled={isSimulatingAgent || !vibeActive}
              className="flex items-center gap-1.5 text-xs px-3.5 py-2.5 bg-ghost-orange hover:bg-ghost-orange/80 text-white rounded-lg font-bold cursor-pointer disabled:opacity-40 transition-colors shadow-sm"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              Simulate AI Rewrite Storm
            </button>
            <button 
              onClick={() => toast.success('IPC Config synced!')}
              className="text-xs px-3.5 py-2.5 bg-[#1C2246] hover:bg-[#252E5E] border border-slate-700/80 text-slate-200 rounded-lg cursor-pointer flex items-center gap-1.5 font-bold shadow-sm transition-all"
            >
              <Settings className="h-3 w-3" />
              Config Port
            </button>
          </div>
        </div>

        {/* Info / Explanation Card */}
        <div className="rounded-xl border border-slate-800 bg-linear-to-br from-[#171D3A]/90 to-[#121631]/80 p-5 flex flex-col justify-between shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ghost-orange" />
              <span className="font-bold text-sm text-white">How it works</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300 font-semibold font-sans">
              Ghost Universal sits in the background monitor stack. It exposes a local WebSocket endpoint (e.g. <code className="font-mono text-ghost-orange bg-ghost-orange/10 border border-ghost-orange/20 font-bold px-1.5 py-0.5 rounded text-[10px]">localhost:4321</code>) that external editor plugins and browsers can link with.
            </p>
            <p className="text-xs leading-relaxed text-slate-300 font-semibold font-sans">
              Whenever an LLM agent issues safe/aggressive writing batches, Ghost halts potential broken compilation states, automatically auto-saves state, and pushes diagnostics.
            </p>
          </div>
          
          <div className="border-t border-slate-800/85 pt-3.5 mt-4">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center justify-between text-[11px] text-slate-400 hover:text-ghost-orange font-semibold font-sans cursor-pointer transition-all"
            >
              <span>Get Chrome Extension (CRX)</span>
              <span className="text-[10px] text-ghost-orange">View source →</span>
            </a>
          </div>
        </div>
      </div>

      {/* WATCHER Sandbox Scan Map */}
      <div className="rounded-xl border border-slate-800 bg-[#131936] p-5 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-sans">
              <Radio className="h-3.5 w-3.5 text-ghost-orange animate-pulse" />
              Browser Builders & Sandboxes Monitoring Deck
            </h3>
            <p className="text-xs text-slate-400 font-semibold mt-1 font-sans">
              Actively monitoring opened browser channels and browser context tool interfaces.
            </p>
          </div>
          <button
            onClick={handlePerformBrowserScan}
            disabled={isScanning}
            className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 bg-[#1C2246] hover:bg-[#252E5E] border border-slate-700/80 text-slate-200 rounded-lg font-bold cursor-pointer transition-all disabled:opacity-50 shadow-sm"
          >
            <Search className={`h-3 w-3 ${isScanning ? 'animate-spin' : ''}`} />
            Scan Browser Tabs
          </button>
        </div>

        {/* Grid of browser components */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {discoveredTools.map(t => {
            const isDefault = ['w1', 'w2', 'w3', 'w4', 'w5'].includes(t.id);
            return (
              <div 
                key={t.id} 
                className="p-4 rounded-xl border border-slate-800 bg-[#1C2248]/40 hover:bg-[#1C2248]/85 transition-all flex flex-col justify-between space-y-3 relative group shadow-3xs hover:border-ghost-orange/60 select-none cursor-pointer active:scale-[0.99]"
                title="Click to toggle simulated status"
                onClick={() => {
                  const nextStatus = t.status === 'active' ? 'stopped' : 'active';
                  updateToolStatus(t.id, nextStatus);
                  toast.success(`Active State Updated: ${t.name} is now ${nextStatus.toUpperCase()}`);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1 pr-1">
                    <h4 className="font-bold text-xs text-slate-200 flex items-center gap-1 group-hover:text-ghost-orange transition-colors truncate">{t.name}</h4>
                    <p className="text-[10px] text-slate-450 font-mono font-medium mt-0.5 truncate">{t.domain}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-none">
                    <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-sans font-bold border transition-all ${
                      t.status === 'active' 
                        ? 'bg-emerald-950/30 border-emerald-800/80 text-[#06D6A0]' 
                        : t.status === 'sleeping' 
                          ? 'bg-amber-950/20 border-amber-900/50 text-[#FFB627]' 
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}>
                      {t.status.toUpperCase()}
                    </span>
                    <span className="text-[8px] text-slate-500 group-hover:text-ghost-orange transition-colors font-semibold">Click to toggle</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium border-t border-slate-800/80 pt-2.5">
                  <span className="truncate">Key: <code className="text-ghost-orange font-bold font-mono text-[9px]">{t.integrationKey}</code></span>
                  <div className="flex items-center gap-2">
                    {!isDefault && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTool(t.id);
                        }}
                        className="text-[9px] text-red-400 hover:text-red-350 font-bold border border-red-900/60 px-1.5 py-0.5 rounded bg-red-950/30 transition-all cursor-pointer"
                        title="Delete custom reference watcher"
                      >
                        Delete
                      </button>
                    )}
                    <span className="flex items-center gap-1 text-[9px] text-slate-400 font-semibold font-sans">
                      {t.detectable ? '🔓 Visible' : '🔒 Scoped'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

        </div>

        {/* Explanation & User Guide for Custom Local Ports / Sandboxes */}
        <div className="bg-amber-950/10 border border-amber-900/40 rounded-xl p-4.5 text-xs text-slate-305 space-y-2 mt-2">
          <p className="font-bold text-amber-500 flex items-center gap-2 font-sans">
            <AlertCircle className="h-4 w-4 text-[#FFB627] flex-none" />
            <span>Understanding Local Ports and Custom Channels</span>
          </p>
          <p className="leading-relaxed mb-1.5 font-medium text-slate-300 font-sans">
            When you run code generated by AI/vibe tools locally, your browser opens it on a local server address known as <code className="bg-[#121631] px-1.5 py-0.5 rounded border border-slate-800 font-mono text-[10px] text-ghost-orange font-bold">localhost</code>.
          </p>
          <ul className="list-disc pl-4.5 space-y-2.5 leading-relaxed font-semibold text-slate-400 font-sans">
            <li>
              <span className="text-white font-bold">Where do I get the localhost address?</span> When you spin up a local development server in your terminal (using commands like <code className="bg-[#1E2551] px-1 font-mono text-[10px] text-slate-200 border border-slate-700/80 rounded">npm run dev</code> or <code className="bg-[#1E2551] px-1 font-mono text-[10px] text-slate-200 border border-slate-700/80 rounded font-bold">vite</code>), the terminal displays a line like: <span className="text-[#06D6A0] font-mono text-[10px] bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-900/60">Local: http://localhost:5173/</span>.
            </li>
            <li>
              <span className="text-white font-bold">How does Ghost use it?</span> Copy that address (e.g. <code className="bg-[#1E2551] px-1 font-mono text-[10px] border border-slate-700/80 rounded text-amber-500 font-bold">localhost:5173</code>) and paste it below. Ghost will perform <span className="text-ghost-orange font-bold">active, real-time fetching probes</span> to verify that server is responsive.
            </li>
            <li>
              <span className="text-white font-bold">No More Guesswork:</span> Platforms like <span className="text-white font-bold">Lovable</span> and <span className="text-white font-bold">Google AI Studio</span> are checked by inspecting your browser session referrer records. Only what is currently active will show as <span className="text-[#06D6A0] font-bold">ACTIVE</span>; others remain securely <span className="text-slate-400 font-bold">STOPPED</span>.
            </li>
          </ul>
        </div>

        {/* Custom mount form */}
        <form onSubmit={handleAddWorkspace} className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workspace Name</label>
            <input 
              type="text" 
              placeholder="e.g. StackBlitz Dev Shell" 
              value={newToolName} 
              onChange={e => setNewToolName(e.target.value)}
              className="w-full bg-[#1E2551] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-ghost-orange shadow-inner font-medium"
            />
          </div>
          <div className="flex-1 w-full space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Browser Domain Port</label>
            <input 
              type="text" 
              placeholder="e.g. localhost:5173" 
              value={newToolDomain} 
              onChange={e => setNewToolDomain(e.target.value)}
              className="w-full bg-[#1E2551] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-ghost-orange shadow-inner font-medium"
            />
          </div>
          <button 
            type="submit"
            className="flex items-center justify-center gap-1.5 text-xs px-4 py-2 bg-ghost-orange/15 hover:bg-ghost-orange/25 border border-ghost-orange/30 text-ghost-orange rounded-lg font-bold transition-all cursor-pointer w-full sm:w-auto flex-none shadow-sm font-sans"
          >
            <Plus className="h-3.5 w-3.5" />
            Mount Custom Channel
          </button>
        </form>
      </div>

      {/* Toggle Interceptors */}
      <div className="rounded-xl border border-slate-800 bg-[#131936] p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-405 uppercase tracking-wide mb-4">Interception Triggers</h3>
        
        <div className="flex items-start justify-between gap-6 py-3 border-b border-slate-800/80">
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-200">Pre-write Hot Backup</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Auto-saves state the millisecond Cursor/Windsurf open file streams.</p>
          </div>
          <button 
            onClick={() => setAutoIntercept(!autoIntercept)}
            className={`relative w-9 h-5 rounded-full transition-colors ${autoIntercept ? 'bg-ghost-orange' : 'bg-slate-700'} cursor-pointer`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoIntercept ? 'translate-x-4' : ''}`}/>
          </button>
        </div>

        <div className="flex items-start justify-between gap-6 py-3 last:border-0">
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-200">Self-Healing Feedback Loop</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Instantly rolls back broken node imports, syntax loops, and redirects stdout back to the Vibe agent stack trace context.</p>
          </div>
          <button 
            onClick={() => setAutoHeal(!autoHeal)}
            className={`relative w-9 h-5 rounded-full transition-colors ${autoHeal ? 'bg-ghost-orange' : 'bg-slate-700'} cursor-pointer`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoHeal ? 'translate-x-4' : ''}`}/>
          </button>
        </div>
      </div>

      {/* CHROME EXTENSION DECK - PRODUCING REAL-TIME READERS FOR ALL BROWSER ACTIVITY */}
      <div className="rounded-xl border border-slate-800 bg-[#131936] p-5 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/85">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Chrome className="h-4 w-4 text-ghost-orange animate-spin-slow" />
              Chrome Extension Finalize Blueprint (v1.0.0-Beta Code)
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1 font-sans">
              Convert Ghost into a fully integrated Chrome Extension to listen and actively monitor tab activities in background contexts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold font-sans">Simulator Feed:</span>
            <button
              type="button"
              onClick={() => {
                setIsExtensionSimActive(!isExtensionSimActive);
                toast.success(isExtensionSimActive ? "Simulated extension paused" : "Simulated extension streaming active!");
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                isExtensionSimActive
                  ? 'bg-ghost-orange/15 text-ghost-orange border border-ghost-orange/30'
                  : 'bg-[#1E2551] text-slate-400 border border-slate-700/80 hover:bg-[#252E5E]'
              }`}
            >
              <Eye className="h-3 w-3" />
              {isExtensionSimActive ? 'ACTIVE SIM' : 'MUTED SIM'}
            </button>
          </div>
        </div>

        <p className="text-xs leading-relaxed font-semibold text-slate-300 font-sans">
          To actively track <code className="bg-[#1C2248]/50 border border-slate-700/80 px-1 py-0.5 rounded font-mono font-bold text-ghost-orange">bolt.new</code>, <code className="bg-[#1C2248]/50 border border-slate-700/80 px-1 py-0.5 rounded font-mono font-bold text-ghost-orange">lovable.dev</code>, and other fast-paced vibe compilers, the finalize step packages Ghost into a local browser add-on. The extension utilizes the <code className="bg-[#1C2248]/50 border border-slate-700/80 px-1 py-0.5 rounded font-mono font-bold">chrome.tabs</code> background event loops and attaches a localized <code className="bg-[#1C2248]/50 border border-slate-700/80 px-1 py-0.5 rounded font-mono font-bold">MutationObserver</code> into development sandboxes, relaying activity over our active WebSocket stream.
        </p>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 overflow-x-auto space-x-1.5 pb-0.5">
          <button
            type="button"
            onClick={() => setSelectedExtFile('manifest')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors cursor-pointer border-t border-x ${
              selectedExtFile === 'manifest'
                ? 'bg-[#1E2551] text-white border-slate-700/80'
                : 'bg-[#1C2248]/20 hover:bg-[#1C2248]/60 text-slate-400 border-transparent'
            }`}
          >
            <FileCode2 className="h-3 w-3 inline mr-1" />
            manifest.json (Metadata & Permissions)
          </button>
          <button
            type="button"
            onClick={() => setSelectedExtFile('content')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors cursor-pointer border-t border-x ${
              selectedExtFile === 'content'
                ? 'bg-[#1E2551] text-white border-slate-700/80'
                : 'bg-[#1C2248]/20 hover:bg-[#1C2248]/60 text-slate-400 border-transparent'
            }`}
          >
            <Code className="h-3 w-3 inline mr-1" />
            content-script.js (DOM Mutation Watcher)
          </button>
          <button
            type="button"
            onClick={() => setSelectedExtFile('background')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors cursor-pointer border-t border-x ${
              selectedExtFile === 'background'
                ? 'bg-[#1E2551] text-white border-slate-700/80'
                : 'bg-[#1C2248]/20 hover:bg-[#1C2248]/60 text-slate-400 border-transparent'
            }`}
          >
            <Cpu className="h-3 w-3 inline mr-1" />
            service-worker.js (Local WebSocket Sync Router)
          </button>
        </div>

        {/* Code Content Window */}
        <div className="rounded-xl border border-slate-850 bg-slate-950 overflow-hidden font-mono text-[10.5px]">
          <div className="bg-slate-900 px-4 py-1.5 flex items-center justify-between border-b border-slate-800 text-slate-400 text-[10px] font-bold">
            <span>extension_src/{selectedExtFile === 'manifest' ? 'manifest.json' : selectedExtFile === 'content' ? 'content.js' : 'background.js'}</span>
            <span className="text-[9px] uppercase tracking-wider text-orange-500 bg-orange-950/40 border border-orange-900/60 px-1.5 py-0.5 rounded font-black">PROPOSAL BLUEPRINT</span>
          </div>
          <pre className="p-4 overflow-x-auto max-h-72 select-all text-slate-200 leading-relaxed whitespace-pre font-mono">
            {selectedExtFile === 'manifest' && `{
  "manifest_version": 3,
  "name": "Ghost Vibe Watch - Browser Sandbox Monitor",
  "version": "1.0.0",
  "description": "Monitors and streams tab updates, referrers, and AI generation frames back to the local Ghost micro-daemon.",
  "permissions": [
    "tabs",
    "activeTab",
    "webNavigation",
    "scripting",
    "storage"
  ],
  "host_permissions": [
    "http://localhost/*",
    "https://*.studio.google/*",
    "https://*.bolt.new/*",
    "https://*.lovable.dev/*",
    "https://*.v0.dev/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ]
}`}
            {selectedExtFile === 'content' && `// INJECTED TO DETECT AND BROADCAST MUTATIONS ACCORDING TO LIVE CHANNELS
console.log("[Ghost System] Tab activity listener mounted successfully.");

// Track direct changes in the page DOM structure (used by Vibe editors to represent state)
const observer = new MutationObserver((mutations) => {
  let mutationsCount = mutations.length;
  if (mutationsCount > 15) {
    chrome.runtime.sendMessage({
      type: "VIBE_STORM_DETECTED",
      url: window.location.href,
      referrer: document.referrer,
      title: document.title,
      mutationCount: mutationsCount
    });
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true
});

// Intercept specific custom window events posted by Lovable or Bolt
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "AI_COMPILE_ERROR") {
    chrome.runtime.sendMessage({
      type: "BROWSER_COMPILATION_CRASH",
      error: event.data.message,
      stack: event.data.stack
    });
  }
});`}
            {selectedExtFile === 'background' && `// MAINTAIN WEBSOCKET PIPES IN BACKGROUND TO LOCALHOST MICRO-DAEMON
let socket = null;

function connectToGhost() {
  socket = new WebSocket("ws://localhost:4321");
  
  socket.onopen = () => {
    console.log("[Extension Background] Hooked up to local Ghost daemon.");
  };
  
  socket.onclose = () => {
    // Retry periodically if local service drops
    setTimeout(connectToGhost, 5000);
  };
}

connectToGhost();

// Listen to messages from content scripts and forward them over local web socket
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      timestamp: Date.now(),
      tabId: sender.tab?.id,
      url: sender.tab?.url,
      title: sender.tab?.title,
      data: message
    }));
  }
});

// Watch active browser channel switches
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "TAB_SWITCHED",
        url: tab.url,
        title: tab.title
      }));
    }
  });
});`}
          </pre>
        </div>
      </div>

      {/* Bridge Activity Terminal Log */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden font-mono text-[11px] shadow-md">
        <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-orange-500" />
            <span className="font-bold text-slate-400">Extension Bridge Telemetry Stream</span>
          </div>
          <div className="flex items-center gap-2.5">
            {logs.length > 0 && (
              <button 
                onClick={exportLogsAsJson}
                className="text-[10px] text-orange-400 hover:text-orange-300 transition-colors cursor-pointer flex items-center gap-1 font-sans font-bold hover:underline"
              >
                <Download className="h-3 w-3" />
                Export JSON
              </button>
            )}
            <button 
              onClick={() => setLogs([])}
              className="text-[10px] text-slate-500 hover:text-slate-350 transition-colors cursor-pointer font-bold"
            >
              Clear logs
            </button>
          </div>
        </div>
        <div className="p-4 max-h-56 overflow-y-auto space-y-2 select-text">
          <AnimatePresence initial={false}>
            {logs.length === 0 ? (
              <div className="text-center text-slate-650 py-6 font-sans">Telemetry dry. No current active agent edit spikes.</div>
            ) : (
              logs.map(l => (
                <motion.div 
                  key={l.id} 
                  initial={{ opacity: 0, x: -5 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  className="flex items-start gap-2.5 leading-relaxed"
                >
                  <span className="text-slate-650 flex-none">{l.timestamp}</span>
                  <span className={`flex-none font-bold ${
                    l.type === 'success' ? 'text-emerald-450' : l.type === 'error' ? 'text-red-400' : l.type === 'mutation' ? 'text-amber-450 font-semibold' : 'text-blue-400'
                  }`}>
                    [{l.source}]
                  </span>
                  <span className="text-slate-300 break-all">{l.message}</span>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
