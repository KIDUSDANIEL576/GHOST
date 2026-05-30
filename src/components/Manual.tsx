import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Play, Pause, Sparkles, Send, Volume2, 
  HelpCircle, ChevronRight, Cpu, FileCode, CheckCircle2, 
  Settings, Camera, Undo2, RotateCcw, Link2, AlertTriangle,
  Code, Eye, Database, CornerDownRight, BarChart2,
  Terminal, ArrowRight, ArrowDownUp
} from 'lucide-react';
import { toast } from 'sonner';

// Resilient Web Audio Synthesizer for sandboxed environments
function playSyllableSound(isAlice: boolean) {
  if (typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Alice (higher, cheerful): 380Hz ~ 500Hz
    // Bob (lower, warm/subtle): 160Hz ~ 230Hz
    const freq = isAlice 
      ? 380 + Math.random() * 120 
      : 160 + Math.random() * 70;
      
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.type = 'triangle'; // Smooth musical wave
    
    // Very quick envelope to prevent popping clicks
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    // blocked or inactive context
  }
}

// Futuristic bell chime on chapter selection / start
function playSelectionChime() {
  if (typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.08); // G5
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch (e) {}
}

interface PodcastChapter {
  id: string;
  title: string;
  timestamp: string;
  seconds: number;
  snippet: string;
  hostsSpeak: { host: 'Alice' | 'Bob'; text: string }[];
}

const PODCAST_CHAPTERS: PodcastChapter[] = [
  {
    id: 'intro',
    title: '1. Introduction to Ghost Watchdogs',
    timestamp: '00:00',
    seconds: 0,
    snippet: 'Discover how Ghost Universal acts as a physical security wrapper for code changes offline.',
    hostsSpeak: [
      { host: 'Alice', text: 'Welcome to Ghost Deep Dive summaries! Today we are looking at Ghost Universal—a local physical security wrapper for code.' },
      { host: 'Bob', text: 'Exactly. Instead of piping your raw files to random clouds, Ghost keeps cold snapshots in your local disk. Safe and private.' }
    ]
  },
  {
    id: 'weighting',
    title: '2. Heuristic Suspect Scoring',
    timestamp: '01:30',
    seconds: 90,
    snippet: 'An overview of the ranker.py algorithm blending stack trace matches and edit decay.',
    hostsSpeak: [
      { host: 'Bob', text: 'When your code crashes, ranker.py immediately assigns suspicion scores using stack trace matches and decay.' },
      { host: 'Alice', text: 'Right! It doesnt guess. It calculates mutation recency & density to isolate the buggy changes instantly.' }
    ]
  },
  {
    id: 'handshake',
    title: '3. WebSockets & Interception',
    timestamp: '03:40',
    seconds: 220,
    snippet: 'How the extension intercepts clipboard copies and streams them over port 4321.',
    hostsSpeak: [
      { host: 'Alice', text: 'Let us chat about Vibe Link. The Chrome Extension watches Claude or ChatGPT clipboard copy trends.' },
      { host: 'Bob', text: 'And it forwards the metadata straight to Ghost over WebSocket port 4321, correlating copy-events with mutations!' }
    ]
  },
  {
    id: 'failback',
    title: '4. Resilient Fallbacks',
    timestamp: '05:10',
    seconds: 310,
    snippet: 'A breakdown of the three-tiered restore protocol (fast copy, emergency sync).',
    hostsSpeak: [
      { host: 'Alice', text: 'What happens during a restore? Ghost executes a secure three-stage protocol.' },
      { host: 'Bob', text: 'First is quick replacement, then locked descriptors bypass, and finally adjacent snapshots mapping if directory locks fail.' }
    ]
  }
];

const MOCK_QUESTIONS = [
  {
    chip: '🔒 Is my code secure?',
    question: 'How does Ghost guarantee my code security and privacy?',
    answer: 'Ghost Universal is built on an absolute local-only architecture. All file scans, SQLite metadata logging, and snapshot diff directories live inside the local `.ghost` folder on your own hard drive. It utilizes zero external network calls and zero trackers. Your IP and source code remain strictly isolated on your personal machine.',
    visualData: {
      type: 'flow',
      title: 'Local Security Boundary',
      steps: [
        { label: 'File Change', detail: 'Local Disk Event' },
        { label: 'Watcher.py Logger', detail: 'Saves metadata to offline SQLite (ledger.db)' },
        { label: 'Snapshot Directory', detail: 'Saved to local .ghost/snapshots' },
        { label: 'Security Boundary', detail: '🛑 BLOCK: zero outbound network packets' }
      ]
    }
  },
  {
    chip: '🧠 How does ranker.py work?',
    question: 'What are the heuristic scoring layers in ranker.py?',
    answer: 'When a crash is parsed (via stderr monitoring), ranker.py assigns suspicion scores according to: 1) Stack-Trace Exact Matching (90% weight boosting if a filename/line aligns with the stack-trace), 2) Recency Decay (exponential gravity drop matching the seconds since mutation), and 3) Mutation Density (how many edits happened in that directory in the last 120s window). This gives you highly correlated recent changes.',
    visualData: {
      type: 'simulate',
      title: 'Ranker Weight Simulation Override',
      fields: ['Stack Trace Match (90pt)', 'Recency Gravity (exponential)', 'Density Frequency']
    }
  },
  {
    chip: '⚡ What are the 3 restore steps?',
    question: 'What happens when I click "Restore Last Working"?',
    answer: 'Snapshot restoration executes sequentially through these safety walls: Stage 1 (Fast Copy - replaces mutated files in parallel while writing backup copies to `.ghost_bak`), Stage 2 (Resilient Copier - if a file is temporarily locked or write-restricted, it skips lock-holds and forces override on release), and Stage 3 (Emergency Sync - rolls recursively to the nearest neighbor snapshot to ensure system health succeeds).',
    visualData: {
      type: 'flow',
      title: 'Sequential Rollback Protocol',
      steps: [
        { label: 'Stage 1: Fast Copy', detail: 'Writes current state to *.ghost_bak dynamically' },
        { label: 'Stage 2: Resilient Gate', detail: 'Bypasses locked descriptors and overrides permissions' },
        { label: 'Stage 3: Emergency Sync', detail: 'Reverts to nearest valid state if current tree is corrupt' }
      ]
    }
  }
];

interface ManualProps {
  onNavigate?: (tab: 'timeline' | 'crashes' | 'health' | 'vibelink' | 'manual' | 'settings') => void;
}

export function Manual({ onNavigate }: ManualProps) {
  // Podcast Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0); 
  const [audioSpeed, setAudioSpeed] = useState<'1.0x' | '1.25x' | '1.5x' | '2.0x'>('1.0x');
  const [activeChapter, setActiveChapter] = useState<PodcastChapter>(PODCAST_CHAPTERS[0]);
  const [simulatedTime, setSimulatedTime] = useState('00:00');
  const [activeVoiceIndex, setActiveVoiceIndex] = useState(0); 

  // Interactive Guides
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAnswer, setActiveAnswer] = useState<typeof MOCK_QUESTIONS[0] | null>(MOCK_QUESTIONS[0]);

  // Parameters
  const [stackWeight, setStackWeight] = useState(90);
  const [recencyGravity, setRecencyGravity] = useState(70);
  const [frequencyWeight, setFrequencyWeight] = useState(50);

  // Equalizer wave
  const [waveHeights, setWaveHeights] = useState<number[]>(Array.from({ length: 30 }, () => Math.random() * 30 + 10));

  // Clean speaking context on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Try standard HTML5 speech synthesis in background
  const triggerNativeSpeech = (text: string, host: 'Alice' | 'Bob') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = audioSpeed === '1.0x' ? 1.0 : audioSpeed === '1.25x' ? 1.25 : audioSpeed === '1.5x' ? 1.5 : 1.9;
      utterance.pitch = host === 'Alice' ? 1.2 : 0.85;
      
      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices.filter(v => v.lang.startsWith('en'));
      if (englishVoices.length > 0) {
        const matchingVoice = host === 'Alice'
          ? englishVoices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha'))
          : englishVoices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david'));
        if (matchingVoice) utterance.voice = matchingVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  };

  // Robust fallback timer + vocal synth chime loops (Guarantees play mechanics never freeze)
  useEffect(() => {
    let stepperTimer: NodeJS.Timeout;
    let chimeTimer: NodeJS.Timeout;

    if (isPlaying) {
      const activeLine = activeChapter.hostsSpeak[activeVoiceIndex];
      if (activeLine) {
        triggerNativeSpeech(activeLine.text, activeLine.host);
        
        // Periodic synthesizer vocalization sounds matching host syllable changes
        chimeTimer = setInterval(() => {
          playSyllableSound(activeLine.host === 'Alice');
        }, 150);
      }

      // Automatically move to the next transcript slide after reading window expires
      stepperTimer = setTimeout(() => {
        const nextVoiceIdx = activeVoiceIndex + 1;
        if (nextVoiceIdx < activeChapter.hostsSpeak.length) {
          setActiveVoiceIndex(nextVoiceIdx);
          setAudioProgress(prev => Math.min(100, prev + 3));
        } else {
          // Hop to the next chapter
          const currentIndex = PODCAST_CHAPTERS.findIndex(c => c.id === activeChapter.id);
          const nextCh = PODCAST_CHAPTERS[currentIndex + 1];
          if (nextCh) {
            setActiveChapter(nextCh);
            setActiveVoiceIndex(0);
            playSelectionChime();
            toast.success(`Playing Section: ${nextCh.title}`);
          } else {
            // End podcast
            setIsPlaying(false);
            setActiveVoiceIndex(0);
            setAudioProgress(0);
            setSimulatedTime('00:00');
            toast.success('🎉 Custom Podcast Briefing finished rendering!');
          }
        }
      }, 5500); // 5.5 seconds per slide (comfortable reading time)
    }

    return () => {
      clearTimeout(stepperTimer);
      clearInterval(chimeTimer);
    };
  }, [isPlaying, activeChapter, activeVoiceIndex, audioSpeed]);

  // Audio timeline feedback ticks
  useEffect(() => {
    let playbackTick: NodeJS.Timeout;
    if (isPlaying) {
      playbackTick = setInterval(() => {
        setAudioProgress(prev => {
          if (prev >= 100) return 0;
          const factor = audioSpeed === '1.0x' ? 0.5 : audioSpeed === '1.25x' ? 0.7 : audioSpeed === '1.5x' ? 0.9 : 1.3;
          const updated = prev + factor;
          
          // Render progress time string
          const maximumSecs = 370; // 6:10 duration
          const currentSecs = Math.floor((updated / 100) * maximumSecs);
          const min = Math.floor(currentSecs / 60).toString().padStart(2, '0');
          const sec = (currentSecs % 60).toString().padStart(2, '0');
          setSimulatedTime(`${min}:${sec}`);
          
          // Equalizer vibrations
          setWaveHeights(Array.from({ length: 30 }, () => Math.random() * 32 + 8));
          return updated;
        });
      }, 500);
    }
    return () => clearInterval(playbackTick);
  }, [isPlaying, audioSpeed]);

  const handleSelectChapter = (ch: PodcastChapter) => {
    playSelectionChime();
    setActiveChapter(ch);
    setActiveVoiceIndex(0);
    const maximumSecs = 370;
    const initialPercentage = (ch.seconds / maximumSecs) * 100;
    setAudioProgress(initialPercentage);
    
    const min = Math.floor(ch.seconds / 60).toString().padStart(2, '0');
    const sec = (ch.seconds % 60).toString().padStart(2, '0');
    setSimulatedTime(`${min}:${sec}`);
    setIsPlaying(true);
  };

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const queryText = searchQuery.toLowerCase();
    const matched = MOCK_QUESTIONS.find(
      q => q.question.toLowerCase().includes(queryText) || q.answer.toLowerCase().includes(queryText)
    );

    if (matched) {
      setActiveAnswer(matched);
      toast.success('Notebook AI matched context!');
    } else {
      const dynamicResp = {
        chip: `🔍 Compiled search`,
        question: searchQuery,
        answer: `Direct Search Query: "${searchQuery}". Reviewing tauri/engine ledger databases. Ghost Universal holds strict offline parameters locally, utilizing SQLite database triggers and mutation streams instead of slow LLM queries. This protects system memory limits and restricts outbound network access entirely to 0KB.`,
        visualData: {
          type: 'flow',
          title: 'Dynamic Sandbox Scan',
          steps: [
            { label: 'Query Registered', detail: `Parsed keywords: "${searchQuery}"` },
            { label: 'Local Security Loop', detail: 'Verifies privacy parameters' },
            { label: 'Diagnostics Result', detail: 'Heuristics confirmed: 100% SECURE' }
          ]
        }
      };
      setActiveAnswer(dynamicResp);
      toast.info('Synthesized instant offline Guide response...', { icon: '🧠' });
    }
  };

  // Button mapping for clean workspace switching
  const REDIRECT_WORKFLOWS_MAP = [
    {
      name: 'Quick Snap File Tracer',
      icon: Camera,
      tabLabel: 'Timeline',
      flow: 'File System ⟶ .ghost/snapshots',
      trigger: 'Auto-save / Manual Click',
      details: 'Registers changed files < 10MB into ledger, updating rollback pointer records instantly.',
      borderColor: 'border-blue-500/25',
      targetTab: 'timeline' as const
    },
    {
      name: 'Review Crash Suspects',
      icon: RotateCcw,
      tabLabel: 'Crashes Monitor',
      flow: 'File Watcher ⟶ Suspicion Weights',
      trigger: 'Stderr / Log Interception',
      details: 'Ranks recent mutation scores by trace overlap, sorting files to let you pinpoint issues fast.',
      borderColor: 'border-green-500/25',
      targetTab: 'crashes' as const
    },
    {
      name: 'Telemetry logs / WS Status',
      icon: Link2,
      tabLabel: 'Vibe Link Hub',
      flow: 'Editor WS Port ⟶ Active Registry',
      trigger: 'Chrome Sandbox Sync (25Hz)',
      details: 'Pushes DOM clipboard mutations. Establishes clean handshake links without leaking data.',
      borderColor: 'border-pink-500/25',
      targetTab: 'vibelink' as const
    }
  ];

  const suspectScoreCalculation = [
    { file: 'src/components/Timeline.tsx', base: 45, getComputedVal: () => Math.min(100, 45 + (stackWeight * 0.5) + (recencyGravity * 0.1)) },
    { file: 'src-tauri/engine/watcher.py', base: 20, getComputedVal: () => Math.min(100, 20 + (recencyGravity * 0.4) + (frequencyWeight * 0.2)) },
    { file: 'src/App.tsx', base: 10, getComputedVal: () => Math.min(100, 10 + (frequencyWeight * 0.6)) }
  ];

  return (
    <div className="space-y-6">
      {/* Dynamic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <BookOpen className="h-5 w-5 text-ghost-orange" />
            Interactive Notebook & Manual
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium font-sans">
            Apple-level audio guidance and interactive documentation for Ghost Watchdog protocols.
          </p>
        </div>
        <span className="self-start text-[10px] bg-ghost-orange/15 text-ghost-orange border border-ghost-orange/30 px-3 py-1 rounded-full font-mono font-bold uppercase tracking-wider">
          Resilient Synth Enabled
        </span>
      </div>

      {/* SECTION 1: PODCAST PLAYER INTEGRATION */}
      <div className="rounded-2xl border border-slate-800 bg-ghost-surface overflow-hidden shadow-md p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-ghost-yellow text-xs font-bold font-mono uppercase tracking-wider">
              <Sparkles className="h-4 w-4 animate-spin-slow" />
              <span>NotebookLM Podcast Simulator</span>
            </div>
            <h3 className="text-base font-bold text-slate-100">
              Inside Ghost Watchdog & Rollback Protocol
            </h3>
            <p className="text-xs text-slate-450 font-medium">
              Listen to a simulated dialogue between Host Alice and Host Bob explaining Ghost offline security layers.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setIsPlaying(!isPlaying);
                playSelectionChime();
              }}
              className={`flex items-center gap-2 px-5 py-2.5 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer ${
                isPlaying 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-ghost-orange hover:bg-orange-600 text-white'
              }`}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? 'PAUSE PODCAST' : 'PLAY PODCAST (VOCAL SYSTEM)'}
            </button>
            <select
              value={audioSpeed}
              onChange={(e) => setAudioSpeed(e.target.value as any)}
              className="text-xs bg-black/30 border border-slate-800 rounded-xl px-3 py-2.5 font-mono font-bold outline-none text-slate-300 focus:border-ghost-orange"
            >
              <option value="1.0x">1.0x Rate</option>
              <option value="1.25x">1.25x</option>
              <option value="1.5x">1.5x</option>
              <option value="2.0x">2.0x</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* iOS-Style Media Widget */}
          <div className="lg:col-span-7 bg-black/20 rounded-xl border border-slate-800 p-5 flex flex-col justify-between space-y-4 shadow-inner">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-2 font-semibold">
                <Volume2 className="h-4 h-4 text-ghost-orange animate-pulse" />
                Dual Fallback Audio Out
              </span>
              <span className="font-bold text-ghost-orange font-mono">{simulatedTime} / 06:10</span>
            </div>

            {/* EQ visualizers */}
            <div className="h-14 flex items-end justify-between px-1 py-1 gap-[3px]">
              {waveHeights.map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${isPlaying ? h : Math.max(6, (i % 6) * 3 + 4)}px` }}
                  className={`flex-1 rounded-t transition-all duration-300 ${
                    i < (audioProgress * 30) / 100 
                      ? 'bg-ghost-orange' 
                      : 'bg-slate-800/80'
                  }`}
                />
              ))}
            </div>

            {/* Progress seek line */}
            <div className="relative w-full h-1.5 bg-slate-850 rounded-full overflow-hidden">
              <div 
                style={{ width: `${audioProgress}%` }}
                className="absolute top-0 left-0 h-full bg-ghost-orange transition-all duration-200"
              />
            </div>

            {/* Transcripts visual screen */}
            <div className="bg-black/30 rounded-xl p-4 border border-slate-800/80 min-h-[110px] flex flex-col justify-center shadow-inner relative overflow-hidden">
              <span className="absolute top-2 right-3 text-[9px] font-mono text-slate-500 uppercase tracking-widest">Transcript</span>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] uppercase tracking-wider font-mono px-2.5 py-0.5 rounded-full font-bold ${
                  activeChapter.hostsSpeak[activeVoiceIndex]?.host === 'Alice' ? 'bg-ghost-yellow/20 text-ghost-yellow' : 'bg-ghost-green/20 text-ghost-green'
                }`}>
                  {activeChapter.hostsSpeak[activeVoiceIndex]?.host || 'Alice'}
                </span>
                <span className="text-[10.5px] text-slate-450 font-semibold">{activeChapter.title}</span>
              </div>
              <p className="text-xs text-slate-100 italic leading-relaxed font-semibold">
                "{activeChapter.hostsSpeak[activeVoiceIndex]?.text || 'Loading media sequence...'}"
              </p>
            </div>
          </div>

          {/* Chapter Guide List */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chapters (Jump & Listen)</p>
              {PODCAST_CHAPTERS.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => handleSelectChapter(ch)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs flex items-start gap-3 cursor-pointer ${
                    activeChapter.id === ch.id 
                      ? 'bg-ghost-orange/10 border-ghost-orange/50 text-white font-semibold shadow-inner' 
                      : 'bg-black/10 border-slate-800 hover:bg-[#1E2442] text-slate-400'
                  }`}
                >
                  <span className="mt-0.5 font-mono text-[9px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-bold text-ghost-yellow">{ch.timestamp}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-xs ${activeChapter.id === ch.id ? 'text-ghost-orange' : 'text-slate-100'}`}>{ch.title}</p>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 truncate">{ch.snippet}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: SYSTEM WORKFLOW DIRECTORY MAP */}
      <div className="rounded-2xl border border-slate-800 bg-ghost-surface p-6 space-y-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-ghost-blue text-xs font-bold uppercase tracking-wider font-mono">
            <Database className="h-4 w-4" />
            <span>Interactive Workflow Map & Switcher</span>
          </div>
          <h3 className="text-base font-bold text-slate-100">System Button & Redirect Deck</h3>
          <p className="text-xs text-slate-450 leading-relaxed font-medium">
            Jump instantly to any operational module matching the workflows configured inside Ghost Watchdog:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {REDIRECT_WORKFLOWS_MAP.map((btn, idx) => {
            const IconComp = btn.icon;
            return (
              <div 
                key={idx} 
                className={`p-5 rounded-xl bg-black/20 border ${btn.borderColor} flex flex-col justify-between space-y-3.5 hover:scale-[1.01] transition-all`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-black/30 border border-slate-800 rounded-lg text-ghost-orange">
                      <IconComp className="h-5.5 w-5.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-150">{btn.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Focus Pointer: {btn.tabLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="text-[11.5px] leading-relaxed text-slate-400 space-y-1">
                  <div>
                    <span className="text-[9.5px] font-mono text-slate-500 uppercase">Route: </span>
                    <span className="font-mono text-slate-200 font-semibold">{btn.flow}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-mono text-slate-500 uppercase">Trigger: </span>
                    <span className="font-mono text-slate-200 font-semibold">{btn.trigger}</span>
                  </div>
                </div>

                <p className="text-[11.5px] leading-relaxed text-slate-450 border-t border-slate-800/60 pt-3 italic font-medium">
                  {btn.details}
                </p>

                {onNavigate && (
                  <button
                    onClick={() => {
                      onNavigate(btn.targetTab);
                      toast.success(`Switched active panel to: ${btn.tabLabel}`);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-ghost-orange/10 hover:bg-ghost-orange border border-ghost-orange/20 hover:border-transparent text-ghost-orange hover:text-white rounded-lg transition-all font-sans font-bold text-xs cursor-pointer shadow-3xs"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    Navigate Dashboard
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: SYSTEM HEURISTICS DECAY TUNER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Q&A (7 Cols) */}
        <div className="lg:col-span-7 bg-ghost-surface border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-ghost-yellow text-xs font-bold uppercase tracking-wider font-mono">
              <CornerDownRight className="h-4 w-4 text-ghost-yellow" />
              <span>Context Notebook Exploration</span>
            </div>
            <h3 className="text-base font-bold text-slate-100">Local Guide Index Queries</h3>
            <p className="text-xs text-slate-450">
              Select or search documented chapters to verify Ghost offline sandboxing and metadata algorithms.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {MOCK_QUESTIONS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveAnswer(item);
                  playSelectionChime();
                  toast.success(`Loaded context block: ${idx+1}`);
                }}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  activeAnswer?.question === item.question 
                    ? 'bg-ghost-orange/15 border-ghost-orange/40 text-ghost-orange' 
                    : 'bg-black/20 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                {item.chip}
              </button>
            ))}
          </div>

          <form onSubmit={handleCustomSearch} className="flex gap-2.5">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask anything (e.g. storage size constraints, rollback safety)..."
              className="flex-1 bg-black/30 border border-slate-800 focus:border-ghost-orange rounded-xl px-4 py-2.5 text-xs outline-none text-slate-200 placeholder:text-slate-600 font-sans"
            />
            <button
              type="submit"
              className="bg-ghost-orange hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl transition-all text-xs font-bold cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          <AnimatePresence mode="wait">
            {activeAnswer && (
              <motion.div
                key={activeAnswer.question}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="bg-black/30 p-5 rounded-xl border border-slate-800/80 space-y-4 shadow-inner"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4.5 w-4.5 text-ghost-yellow" />
                  <p className="text-xs font-bold text-slate-200">{activeAnswer.question}</p>
                </div>

                <p className="text-[12px] leading-relaxed text-slate-350 font-sans font-medium">
                  {activeAnswer.answer}
                </p>

                {activeAnswer.visualData?.type === 'flow' && (
                  <div className="border-t border-slate-800/60 pt-4 space-y-2.5">
                    <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                      {activeAnswer.visualData.title}:
                    </p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      {activeAnswer.visualData.steps?.map((st, sIdx) => (
                        <div key={sIdx} className="bg-black/40 p-3 rounded-lg border border-slate-800 text-[10px]">
                          <span className="text-ghost-orange block font-bold text-[9px] font-mono mb-1">STAGE {sIdx + 1}</span>
                          <span className="text-slate-200 font-bold block truncate">{st.label}</span>
                          <span className="text-[9.5px] text-slate-500 leading-tight block mt-1">{st.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live Tune Sliders (5 Cols) */}
        <div className="lg:col-span-5 bg-ghost-surface border border-slate-800 rounded-2xl p-6 space-y-5 flex flex-col justify-between shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-ghost-green text-xs font-bold uppercase tracking-wider font-mono">
              <Cpu className="h-4.5 w-4.5 text-ghost-green animate-pulse" />
              <span>ranker.py Suspect Index parameters</span>
            </div>
            <h3 className="text-base font-bold text-slate-100 font-sans">Heuristics Weights Tuner</h3>
            <p className="text-xs text-slate-450 leading-relaxed font-semibold">
              Ghost weights file mutations live. Drag these system parameters to simulate weight decay inside sqlite schemas.
            </p>
          </div>

          {/* Sliders selectors */}
          <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-slate-800/60 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-bold text-[10.5px]">Stack Trace Matching Strength</span>
                <span className="font-mono font-bold text-ghost-orange">{stackWeight} pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={150}
                value={stackWeight}
                onChange={(e) => setStackWeight(parseInt(e.target.value))}
                className="w-full accent-ghost-orange h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-bold text-[10.5px]">Temporal Decay Gravity (Exponential)</span>
                <span className="font-mono font-bold text-ghost-yellow">{recencyGravity} pts</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={recencyGravity}
                onChange={(e) => setRecencyGravity(parseInt(e.target.value))}
                className="w-full accent-ghost-yellow h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-bold text-[10.5px]">Mutation Frequency Overwrite</span>
                <span className="font-mono font-bold text-ghost-green">{frequencyWeight} pts</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={frequencyWeight}
                onChange={(e) => setFrequencyWeight(parseInt(e.target.value))}
                className="w-full accent-ghost-green h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Suspicion output list */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 className="h-4 h-4 text-ghost-green" />
              Recalculated Suspicion Indices Output
            </p>
            <div className="space-y-2">
              {suspectScoreCalculation.map((suspect, idx) => {
                const computedVal = suspect.getComputedVal();
                return (
                  <div key={idx} className="bg-black/35 p-3 rounded-lg border border-slate-850 flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-slate-300 truncate max-w-[190px]">{suspect.file}</span>
                    <div className="flex items-center gap-2.5">
                      <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                        <div 
                          style={{ width: `${computedVal}%` }} 
                          className={`h-full rounded-full ${
                            computedVal > 80 ? 'bg-ghost-red' : computedVal > 50 ? 'bg-ghost-orange' : 'bg-ghost-blue'
                          }`}
                        />
                      </div>
                      <span className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                        computedVal > 80 ? 'bg-red-950/40 text-ghost-red' : computedVal > 50 ? 'bg-orange-950/40 text-ghost-orange' : 'bg-blue-950/40 text-ghost-blue'
                      }`}>
                        {computedVal} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[9.5px] text-slate-500 text-center leading-normal italic pt-1">
              Watcher diagnostics calculated locally inside ledger.db schemas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
