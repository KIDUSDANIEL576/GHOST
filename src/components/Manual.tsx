import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Play, Pause, RefreshCw, Sparkles, Send, Volume2, 
  HelpCircle, ChevronRight, Cpu, FileCode, CheckCircle2, 
  Settings, Camera, Undo2, RotateCcw, Link2, AlertTriangle, ShieldCheck,
  Code, Eye, Database, Info, ArrowRight, CornerDownRight, BarChart2,
  Terminal, Layers, ArrowDownUp, HardDrive, Smartphone
} from 'lucide-react';
import { toast } from 'sonner';

// Chapter structure for the NotebookLM Podcast Sim
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
    snippet: 'Discover how Ghost Universal acts as a physical security wrapper for code changes without requiring any cloud connection.',
    hostsSpeak: [
      { host: 'Alice', text: 'Hey there! Welcome to the Ghost Deep Dive summary. Today, we are breaking down Ghost Universal—which is essentially an intelligent physical security wrapper for cold, hard code.' },
      { host: 'Bob', text: 'Right. Most systems want to backup your code to some random servers. Ghost is local-first, storing snapshots on the host machine. AI coding without fear, literally.' }
    ]
  },
  {
    id: 'weighting',
    title: '2. How Heuristics Outsmart Scenarios',
    timestamp: '01:30',
    seconds: 90,
    snippet: 'An overview of the ranker.py algorithm combining time decay, stack traces, and edit frequency.',
    hostsSpeak: [
      { host: 'Bob', text: 'When your AI tool explodes, how does Ghost know what broke it? It is all in ranker.py. It does not guess. It scores recent mutations based on three exact heuristics: stack trace presence, edit recency, and directory weight.' },
      { host: 'Alice', text: 'Exactly. Instead of claiming a mysterious "root cause detected", it reduces your search space. It shows the highly correlated recent files. That keeps the developer in control.' }
    ]
  },
  {
    id: 'handshake',
    title: '3. WebSockets & Extension Handshake',
    timestamp: '03:40',
    seconds: 220,
    snippet: 'How the extension intercepts AI clipboard copies and pairs them over WebSocket port 4321.',
    hostsSpeak: [
      { host: 'Alice', text: 'Let us chat about Vibe Link. The Chrome Extension watches platforms like Claude, cursor.sh, etc., for clipboard copies.' },
      { host: 'Bob', text: 'Then, it shoots a WebSocket query on port 4321 back to the Ghost agent. That means when a crash occurs 2 seconds later, Ghost has complete temporal correlation. It knows exactly what code you just copied!' }
    ]
  },
  {
    id: 'failback',
    title: '4. Fail-safe Snapshots & Rollbacks',
    timestamp: '05:10',
    seconds: 310,
    snippet: 'A breakdown of the three-tiered restore protocol (full copy, resilient copy, emergency directory restore).',
    hostsSpeak: [
      { host: 'Alice', text: 'And if the worst happen, what is the recovery? We have a 3-layered fallback. First is a fast copy restore.' },
      { host: 'Bob', text: 'And if files are locked, it falls back to a resilient copier that handles errors, and finally an emergency nearest-neighbor check. Ghost never locks you out.' }
    ]
  }
];

const MOCK_QUESTIONS = [
  {
    chip: '🔒 Is my code secure?',
    question: 'How does Ghost guarantee my code security and privacy?',
    answer: 'Ghost Universal is built on a local-only architecture. All file scans, SQLite metadata logging, and snapshot diff directories live inside the local `.ghost` folder on your own hard drive. It utilizes zero external network calls, zero public AI API trackers, and zero telemetry trackers. Your IP and source code remain securely isolated on your local container or personal device.',
    visualData: {
      type: 'flow',
      title: 'Local Security Boundary',
      steps: [
        { label: 'File Change', detail: 'Local Disk Event' },
        { label: 'Watcher.py Logger', detail: 'Saves metadata to offline SQLite (ledger.db)' },
        { label: 'Snapshot Directory', detail: 'Saved to local .ghost/snapshots/' },
        { label: 'Network Boundary', detail: '🛑 BLOCK: 0KB outbound packets' }
      ]
    }
  },
  {
    chip: '🧠 How does ranker.py work?',
    question: 'What are the three heuristic scoring layers in ranker.py?',
    answer: 'When a crash is parsed (via stderr monitoring), ranker.py assigns suspicion scores according to: 1) Stack-Trace Exact Matching (90% weight boosting if a filename/line aligns with the stack-trace), 2) Recency Decay (exponential gravity drop matching the seconds since mutation), and 3) Mutation Density (how many edits happened in that directory in the last 120s window). This gives you highly correlated recent changes.',
    visualData: {
      type: 'simulate',
      title: 'Ranker Weight Simulation Override',
      fields: ['Stack Trace Match (90pt)', 'Recency Gravity (exponential)', 'Density Frequency']
    }
  },
  {
    chip: '⚡ What are the 3 restore fallback stages?',
    question: 'What happens when I click "Restore Last Working"?',
    answer: 'Snapshot restoration executes sequentially through these safety walls: Stage 1 (Fast Copy - replaces mutated files in parallel while writing backup copies to `.ghost_bak`), Stage 2 (Resilient Copier - if a file is temporarily locked or write-restricted, it skips lock-holds and forces override on release), and Stage 3 (Emergency Sync - rolls recursively to the nearest neighbor snapshot to ensure system health succeeds).',
    visualData: {
      type: 'flow',
      title: 'Sequential Rollback Protocol',
      steps: [
        { label: 'Stage 1: Fast Copy', detail: 'Writes current state to *.ghost_bak dynamically' },
        { label: 'Stage 2: Resilient Safe Copy', detail: 'Bypasses locked descriptors and overrides permissions' },
        { label: 'Stage 3: Emergency Snapshot', detail: 'Reverts to nearest valid state if current tree is corrupt' }
      ]
    }
  }
];

interface ManualProps {
  onNavigate?: (tab: 'timeline' | 'crashes' | 'health' | 'vibelink' | 'manual' | 'settings') => void;
}

export function Manual({ onNavigate }: ManualProps) {
  // Podcast Audio Simulator State
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0); // Percentage
  const [audioSpeed, setAudioSpeed] = useState<'1.0x' | '1.25x' | '1.5x' | '2.0x'>('1.0x');
  const [activeChapter, setActiveChapter] = useState<PodcastChapter>(PODCAST_CHAPTERS[0]);
  const [simulatedTime, setSimulatedTime] = useState('00:00');
  const [activeVoiceIndex, setActiveVoiceIndex] = useState(0); // Index of active hostsSpeak dialogue

  // Interactive Q&A state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAnswer, setActiveAnswer] = useState<typeof MOCK_QUESTIONS[0] | null>(MOCK_QUESTIONS[0]);

  // Ranker Simulation Adjusters
  const [stackWeight, setStackWeight] = useState(90);
  const [recencyGravity, setRecencyGravity] = useState(70);
  const [frequencyWeight, setFrequencyWeight] = useState(50);

  // Audio wave bar references for random animations
  const [waveHeights, setWaveHeights] = useState<number[]>(Array.from({ length: 42 }, () => Math.random() * 40 + 10));

  // Speech System Ref
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Cancel any speaking on component unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Speak logic
  const speakDialogue = (chapter: PodcastChapter, lineIdx: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel(); // Cancel current audio first

    const dialogue = chapter.hostsSpeak[lineIdx];
    if (!dialogue) {
      // Loop or stop
      setIsPlaying(false);
      setActiveVoiceIndex(0);
      return;
    }

    setActiveVoiceIndex(lineIdx);
    const speechText = `This is Host ${dialogue.host} speaking. ${dialogue.text}`;
    const utterance = new SpeechSynthesisUtterance(dialogue.text);
    
    // Set parameters to simulate separate voices
    if (dialogue.host === 'Alice') {
      utterance.pitch = 1.35; // Higher female simulated pitch
      utterance.rate = audioSpeed === '1.0x' ? 1.05 : audioSpeed === '1.25x' ? 1.25 : audioSpeed === '1.5x' ? 1.5 : 1.9;
    } else {
      utterance.pitch = 0.85; // Lower male simulated pitch
      utterance.rate = audioSpeed === '1.0x' ? 0.95 : audioSpeed === '1.25x' ? 1.15 : audioSpeed === '1.5x' ? 1.35 : 1.75;
    }

    // Try english voices mapping
    try {
      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices.filter(v => v.lang.startsWith('en'));
      if (englishVoices.length > 0) {
        if (dialogue.host === 'Alice') {
          const aliceVoice = englishVoices.find(v => 
            v.name.toLowerCase().includes('female') || 
            v.name.toLowerCase().includes('zira') || 
            v.name.toLowerCase().includes('samantha') || 
            v.name.toLowerCase().includes('karen') || 
            v.name.toLowerCase().includes('google')
          );
          if (aliceVoice) utterance.voice = aliceVoice;
        } else {
          const bobVoice = englishVoices.find(v => 
            v.name.toLowerCase().includes('male') || 
            v.name.toLowerCase().includes('david') || 
            v.name.toLowerCase().includes('daniel') || 
            v.name.toLowerCase().includes('mark') ||
            v.name.toLowerCase().includes('mick')
          );
          if (bobVoice) utterance.voice = bobVoice;
        }
      }
    } catch (_) {}

    // When speak finished, trigger next voice line automatically
    utterance.onend = () => {
      const nextIdx = lineIdx + 1;
      if (nextIdx < chapter.hostsSpeak.length) {
        speakDialogue(chapter, nextIdx);
      } else {
        // Find next chapter or finish
        const currentChapterIndex = PODCAST_CHAPTERS.findIndex(c => c.id === chapter.id);
        const nextChapter = PODCAST_CHAPTERS[currentChapterIndex + 1];
        if (nextChapter) {
          setActiveChapter(nextChapter);
          setActiveVoiceIndex(0);
          speakDialogue(nextChapter, 0);
          toast.success(`Podcast continued: ${nextChapter.title}`);
        } else {
          setIsPlaying(false);
          setActiveVoiceIndex(0);
          setAudioProgress(0);
          setSimulatedTime('00:00');
          toast.success('🎉 Custom Podcast Briefing finished rendering!');
        }
      }
    };

    utterance.onerror = (e) => {
      console.warn("Speech Synthesis error:", e);
    };

    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Sync isPlaying trigger
  useEffect(() => {
    if (isPlaying) {
      speakDialogue(activeChapter, activeVoiceIndex);
    } else {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  }, [isPlaying, activeChapter]);

  // Handle speed rate update live during active audio speak
  useEffect(() => {
    if (isPlaying) {
      speakDialogue(activeChapter, activeVoiceIndex);
    }
  }, [audioSpeed]);

  // Progress Bar update ticks
  useEffect(() => {
    let tickInterval: NodeJS.Timeout;
    if (isPlaying) {
      tickInterval = setInterval(() => {
        setAudioProgress(prev => {
          if (prev >= 100) return 0;
          const factor = audioSpeed === '1.0x' ? 0.4 : audioSpeed === '1.25x' ? 0.6 : audioSpeed === '1.5x' ? 0.8 : 1.3;
          const newVal = prev + factor;
          
          // Calculate simulated time
          const totalSeconds = 370; // 6:10
          const currentSecs = Math.floor((newVal / 100) * totalSeconds);
          const m = Math.floor(currentSecs / 60).toString().padStart(2, '0');
          const s = (currentSecs % 60).toString().padStart(2, '0');
          setSimulatedTime(`${m}:${s}`);

          // Visual equalizer fluctuations
          setWaveHeights(Array.from({ length: 42 }, () => Math.random() * 52 + 10));

          return newVal;
        });
      }, 500);
    }
    return () => clearInterval(tickInterval);
  }, [isPlaying, audioSpeed]);

  const selectChapter = (ch: PodcastChapter) => {
    setActiveChapter(ch);
    setActiveVoiceIndex(0); // Restart line
    const totalSecs = 370;
    const pct = (ch.seconds / totalSecs) * 100;
    setAudioProgress(pct);
    
    const m = Math.floor(ch.seconds / 60).toString().padStart(2, '0');
    const s = (ch.seconds % 60).toString().padStart(2, '0');
    setSimulatedTime(`${m}:${s}`);
    
    setIsPlaying(true);
  };

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Search query match from database
    const text = searchQuery.toLowerCase();
    const found = MOCK_QUESTIONS.find(
      q => q.question.toLowerCase().includes(text) || q.answer.toLowerCase().includes(text)
    );

    if (found) {
      setActiveAnswer(found);
      toast.success('Notebook AI matches relevant chapter!');
    } else {
      // Generate a dynamic responsive mock answer!
      const genAnswer = {
        chip: `🔍 Custom search`,
        question: searchQuery,
        answer: `Notebook AI compiled search: Your query "${searchQuery}" relates to the dynamic safety layers of Ghost Universal. Note that Ghost keeps strict heuristics inside tauri/engine, avoiding LLM endpoints entirely to minimize lag and absolute offline integrity. This ensures rapid system health monitoring at negligible CPU usage.`,
        visualData: {
          type: 'flow',
          title: 'Custom Dynamic Heuristics Scan',
          steps: [
            { label: 'Query Registered', detail: `Analyzed keywords: "${searchQuery}"` },
            { label: 'Offline Mapping', detail: 'Resolves instantly using NotebookLM heuristics' },
            { label: 'Visual Validation', detail: 'Local diagnostics reporting: 100% Secure' }
          ]
        }
      };
      setActiveAnswer(genAnswer);
      toast.info('Synthesizing instant Guide responses...', {
        icon: '🧠'
      });
    }
  };

  // Buttons map
  const APP_BUTTONS_MAP = [
    {
      name: 'Quick Snap',
      icon: Camera,
      tab: 'Timeline / Quick Actions',
      flow: 'File System ⟶ Snaps folder',
      trigger: 'Manual / Auto-save trigger',
      dataOutput: 'Saves changed files < 10MB to .ghost/snapshots/<timestamp> directory simultaneously updating index.',
      borderColor: 'border-blue-500/30',
      targetTab: 'timeline' as const
    },
    {
      name: 'Restore Last Working',
      icon: RotateCcw,
      tab: 'Timeline / Crashes / Quick Actions',
      flow: '.ghost/snapshots ⟶ Working Directory',
      trigger: 'Manual / Automatic Fallback Match',
      dataOutput: 'Loads closest meta snapshot preceding active crash, makes a backup (*.ghost_bak), replaces invalid nodes.',
      borderColor: 'border-green-500/30',
      targetTab: 'crashes' as const
    },
    {
      name: 'Undo State',
      icon: Undo2,
      tab: 'Quick Actions Bar',
      flow: 'Previous Snapshot Index ⟶ Current Directory',
      trigger: 'Manual Click on Undo',
      dataOutput: 'Reverts the exact previous localized save. Moves focus pointer backwards while preserving recent states.',
      borderColor: 'border-amber-500/30',
      targetTab: 'timeline' as const
    },
    {
      name: 'Active Scans / Intercept',
      icon: Link2,
      tab: 'Vibe Link Settings',
      flow: 'WebSocket Traffic ⟶ UI Telemetry Monitor',
      trigger: 'VibeLink API Handshake (25Hz)',
      dataOutput: 'Exposes telemetry logs reading chrome extension DOM copies live from Cursor, Claude, Replit, or local ports.',
      borderColor: 'border-pink-500/30',
      targetTab: 'vibelink' as const
    }
  ];

  // Heuristics Score Suspects
  const simulatedScoreTimeline = [
    { file: 'src/components/Timeline.tsx', base: 45, calculation: () => Math.min(100, 45 + (stackWeight * 0.5) + (recencyGravity * 0.1)) },
    { file: 'src-tauri/engine/watcher.py', base: 20, calculation: () => Math.min(100, 20 + (recencyGravity * 0.4) + (frequencyWeight * 0.2)) },
    { file: 'src/App.tsx', base: 10, calculation: () => Math.min(100, 10 + (frequencyWeight * 0.6)) }
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-ghost-orange animate-bounce" />
          Interactive Notebook & Manual
          <span className="text-xs text-slate-500 font-normal">audio enabled</span>
        </h2>
        <span className="text-[10px] bg-ghost-orange/15 text-ghost-orange border border-ghost-orange/30 px-2.5 py-1 rounded font-mono font-bold uppercase tracking-wider">
          Offline Voice Engine
        </span>
      </div>

      {/* SECTION 1: NOTEBOOKLM AUDIO SUMMARY PODCAST PANEL */}
      <div className="rounded-xl border border-slate-800 bg-ghost-surface overflow-hidden shadow-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-ghost-yellow text-xs font-bold font-mono tracking-wider uppercase">
              <Sparkles className="h-4.5 w-4.5 text-ghost-yellow animate-spin" style={{ animationDuration: '3s' }} />
              <span>Notebook speech Synthesis podcast</span>
            </div>
            <h3 className="text-md font-bold text-slate-100">
              Podcast: Inside the Ghost Watchdog & Rollback Protocol
            </h3>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Listen to a synthesized agent-host dialogue. Ghost will vocally speak using native web speech engines.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-5 py-2.5 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer ${
                isPlaying 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-ghost-orange hover:bg-orange-600 text-white'
              }`}
            >
              {isPlaying ? <Pause className="h-4 w-4 animate-ping" /> : <Play className="h-4 w-4" />}
              {isPlaying ? 'PAUSE PODCAST' : 'PLAY PODCAST (SPEAKS OUT LOUD)'}
            </button>
            <select
              value={audioSpeed}
              onChange={(e) => setAudioSpeed(e.target.value as any)}
              className="text-xs bg-ghost-bg border border-slate-700 rounded-lg px-3 py-2.5 font-mono font-bold outline-none text-slate-300"
            >
              <option value="1.0x">1.0x Speed</option>
              <option value="1.25x">1.25x</option>
              <option value="1.5x">1.5x</option>
              <option value="2.0x">2.0x</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Wave player simulation */}
          <div className="lg:col-span-7 bg-black/40 rounded-xl border border-slate-800/80 p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 font-bold">
                <Volume2 className="h-4 w-4 text-ghost-orange animate-pulse" />
                Speech Synthesis API Output
              </span>
              <span className="font-semibold text-ghost-orange font-mono">{simulatedTime} / 06:10</span>
            </div>

            {/* Audio Wave anim elements */}
            <div className="h-16 flex items-end justify-between px-2 py-1 gap-1">
              {waveHeights.map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${isPlaying ? h : Math.max(6, (i % 8) * 3 + 4)}px` }}
                  className={`flex-1 rounded-t transition-all duration-300 ${
                    i < (audioProgress * 42) / 100 
                      ? 'bg-ghost-orange' 
                      : 'bg-slate-800/70'
                  }`}
                />
              ))}
            </div>

            {/* Seek Bar */}
            <div className="relative w-full h-1.5 bg-slate-800 rounded-lg overflow-hidden">
              <div 
                style={{ width: `${audioProgress}%` }}
                className="absolute top-0 left-0 h-full bg-ghost-orange transition-all duration-150"
              />
            </div>

            {/* Subtitle Dialogue block */}
            <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 min-h-[105px] flex flex-col justify-center shadow-inner relative">
              <span className="absolute top-2 right-3 text-[9px] font-mono text-slate-500">Live Transcript</span>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] uppercase tracking-wider font-mono px-2.5 py-0.5 rounded-full font-bold ${
                  activeChapter.hostsSpeak[activeVoiceIndex]?.host === 'Alice' ? 'bg-[#FFB627]/15 text-[#FFB627]' : 'bg-[#06D6A0]/15 text-[#06D6A0]'
                }`}>
                  {activeChapter.hostsSpeak[activeVoiceIndex]?.host || 'Alice'}
                </span>
                <span className="text-[10.5px] text-slate-500 font-semibold">{activeChapter.title}</span>
              </div>
              <p className="text-xs text-slate-200 italic leading-relaxed font-semibold">
                "{activeChapter.hostsSpeak[activeVoiceIndex]?.text || 'No subtitle segment loaded.'}"
              </p>
            </div>
          </div>

          {/* Chapters List */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chapters (Click to jump & speak)</p>
              {PODCAST_CHAPTERS.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => selectChapter(ch)}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex items-start gap-3 cursor-pointer ${
                    activeChapter.id === ch.id 
                      ? 'bg-ghost-orange/10 border-ghost-orange/50 text-white font-semibold' 
                      : 'bg-black/20 border-slate-800 hover:bg-[#1E2442] text-slate-400'
                  }`}
                >
                  <span className="mt-0.5 font-mono text-[9px] bg-slate-800 px-1.5 py-0.5 rounded font-bold text-ghost-yellow">{ch.timestamp}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-xs ${activeChapter.id === ch.id ? 'text-ghost-orange' : 'text-slate-200'}`}>{ch.title}</p>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 truncate">{ch.snippet}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: GHOST INTERNAL NAVIGATION DIRECTORY */}
      <div className="rounded-xl border border-slate-800 bg-ghost-surface p-5 space-y-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-ghost-blue text-xs font-bold uppercase tracking-wider font-mono">
            <Database className="h-4.5 w-4.5 text-ghost-blue animate-pulse" />
            <span>Application button directory & active workflows</span>
          </div>
          <h3 className="text-md font-bold text-slate-100">System Button Directory (Action Map)</h3>
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            Ghost provides key operation points. Click the customized <strong className="text-ghost-orange">Navigate</strong> button on any item below to jump instantly to that corresponding menu panel!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {APP_BUTTONS_MAP.map((btn, idx) => {
            const IconComponent = btn.icon;
            return (
              <div 
                key={idx} 
                className={`p-5 rounded-xl bg-black/20 border ${btn.borderColor} flex flex-col justify-between space-y-4`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-ghost-bg rounded-lg text-ghost-orange">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-150">{btn.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">{btn.tab}</p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-slate-900/60 text-slate-400 font-mono border border-slate-800 px-2 py-0.5 rounded-full">
                    Trigger node
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-start gap-1.5">
                    <span className="text-[9px] font-mono text-slate-500 uppercase shrink-0">Flow:</span>
                    <span className="text-[10.5px] font-mono font-bold text-slate-300">{btn.flow}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-[9px] font-mono text-slate-500 uppercase shrink-0">Action:</span>
                    <span className="text-[10.5px] font-mono font-bold text-slate-300">{btn.trigger}</span>
                  </div>
                </div>

                <div className="bg-black/30 p-3 rounded-lg border border-slate-850 text-xs leading-relaxed text-slate-400">
                  <span className="font-bold text-[9px] text-ghost-orange block mb-1">DATA EVENT OUTPUT:</span>
                  {btn.dataOutput}
                </div>

                {/* Simulated visual flow diagram */}
                <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800/40">
                  <div className="flex items-center gap-1.5 flex-wrap text-[9px] text-slate-500 font-mono">
                    <span>SQLite Ledger Updates</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-ghost-green animate-ping" />
                    <span>⟶ UI Frame</span>
                  </div>
                  {onNavigate && (
                    <button
                      onClick={() => {
                        onNavigate(btn.targetTab);
                        toast.success(`Switched workspace menu to: ${btn.targetTab.toUpperCase()}`);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-ghost-orange/15 hover:bg-ghost-orange text-ghost-orange hover:text-white rounded-md border border-ghost-orange/30 transition-all font-sans font-bold text-[10.5px] cursor-pointer"
                    >
                      <ArrowRight className="h-3 w-3" />
                      Navigate Tab
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: SYSTEM INTERFACE FLOW MAP */}
      <div className="rounded-xl border border-slate-800 bg-ghost-surface p-5 space-y-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">SYSTEM INTERFACE FLOW MAP</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-black/20 rounded-lg border border-slate-800 text-xs space-y-1">
            <span className="text-[9px] font-extrabold text-ghost-orange block">PHASE 1</span>
            <p className="font-bold text-slate-200">Disk Mutate Event</p>
            <p className="text-[10.5px] text-slate-500">Watcher daemon intercepts code revision {"< 10MB"} in real-time.</p>
          </div>
          <div className="p-3 bg-black/20 rounded-lg border border-slate-800 text-xs space-y-1">
            <span className="text-[9px] font-extrabold text-ghost-yellow block">PHASE 2</span>
            <p className="font-bold text-slate-200">Heuristics Audit (Python)</p>
            <p className="text-[10.5px] text-slate-500">Suspicion scores decay based on stack lines matches and interval.</p>
          </div>
          <div className="p-3 bg-black/20 rounded-lg border border-slate-800 text-xs space-y-1">
            <span className="text-[9px] font-extrabold text-ghost-green block">PHASE 3</span>
            <p className="font-bold text-slate-200">System Notification</p>
            <p className="text-[10.5px] text-slate-500">Native system alerts and automatic rollback options present in dashboard.</p>
          </div>
        </div>
      </div>

      {/* SECTION 4: ADVANCED NOTEBOOKLM INTERACTIVE Q&A */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Notebook Prompt Explorer (7 Cols) */}
        <div className="lg:col-span-7 bg-ghost-surface border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-ghost-yellow text-xs font-bold uppercase tracking-wider font-mono">
              <CornerDownRight className="h-4 w-4 text-ghost-yellow" />
              <span>Notebook Prompt Explorer & LLM Source</span>
            </div>
            <h3 className="text-md font-bold text-slate-100">Click to run Local Notebook AI Index queries</h3>
            <p className="text-xs text-slate-400">
              Ghost keeps documentation in context-rich chapters. Click a manual chip to see instant telemetry mapping.
            </p>
          </div>

          {/* Quick chips mapping */}
          <div className="flex flex-wrap gap-2">
            {MOCK_QUESTIONS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveAnswer(item);
                  toast.success(`Matched Context: "${item.chip.replace(/[^\w\s-]/g, '')}"`);
                }}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  activeAnswer?.question === item.question 
                    ? 'bg-ghost-orange/15 border-ghost-orange/50 text-[#FF6B35]' 
                    : 'bg-black/20 border-slate-800 hover:border-slate-700 text-slate-350'
                }`}
              >
                {item.chip}
              </button>
            ))}
          </div>

          <form onSubmit={handleCustomSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask anything (e.g. stack traces, recovery options)..."
              className="flex-1 bg-black/30 border border-slate-850 focus:border-ghost-orange rounded-lg px-3 py-2 text-xs outline-none text-slate-200 placeholder:text-slate-655"
            />
            <button
              type="submit"
              className="bg-ghost-orange hover:bg-orange-600 border border-transparent text-white px-4 py-2 rounded-lg transition-all text-xs font-bold cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          {/* Output Display box */}
          <AnimatePresence mode="wait">
            {activeAnswer && (
              <motion.div
                key={activeAnswer.question}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="bg-black/30 p-4 rounded-xl border border-slate-850 space-y-3 shadow-inner"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-ghost-yellow" />
                  <p className="text-xs font-bold text-slate-200">{activeAnswer.question}</p>
                </div>

                <p className="text-[11.5px] leading-relaxed text-slate-400 font-sans">
                  {activeAnswer.answer}
                </p>

                {/* Sub Visual flow within Notebook response */}
                {activeAnswer.visualData?.type === 'flow' && (
                  <div className="border-t border-slate-800/60 pt-3 space-y-2">
                    <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wide">
                      {activeAnswer.visualData.title}:
                    </p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      {activeAnswer.visualData.steps?.map((st, sIdx) => (
                        <div key={sIdx} className="bg-black/40 p-2 rounded border border-slate-850 text-[10px]">
                          <span className="text-ghost-orange block font-bold text-[9px] font-mono">STEP {sIdx + 1}</span>
                          <span className="text-slate-300 font-semibold block truncate">{st.label}</span>
                          <span className="text-[9px] text-slate-500 leading-tight block">{st.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live Parameter Heuristics Simulator (5 Cols) */}
        <div className="lg:col-span-5 bg-ghost-surface border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-ghost-green text-xs font-bold uppercase tracking-wider font-mono">
              <Cpu className="h-4.5 w-4.5 text-ghost-green animate-pulse" />
              <span>ranker.py Suspicion weights simulator</span>
            </div>
            <h3 className="text-md font-bold text-slate-100 font-sans">Heuristics Tuner Simulator</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ghost weights events instantly on disk. Drag the sliders to simulate weighting parameters and see how suspicious file nodes are recalculated.
            </p>
          </div>

          {/* Sliders selectors */}
          <div className="space-y-3 bg-black/20 p-3 rounded-lg border border-slate-800/60 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-semibold text-[10.5px]">Stack Trace Matching (pts)</span>
                <span className="font-mono font-bold text-ghost-orange">{stackWeight}</span>
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
                <span className="font-semibold text-[10.5px]">Recency Decay Force (t)</span>
                <span className="font-mono font-bold text-ghost-yellow">{recencyGravity}</span>
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
                <span className="font-semibold text-[10.5px]">Edit Frequency Weight (pts)</span>
                <span className="font-mono font-bold text-ghost-green">{frequencyWeight}</span>
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

          {/* Recalculated Suspicion Indices Output */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-550 uppercase tracking-wider flex items-center gap-1">
              <BarChart2 className="h-4 w-4 text-ghost-green" />
              Recalculated Correlation Telemetry
            </p>
            <div className="space-y-1.5">
              {simulatedScoreTimeline.map((suspect, idx) => {
                const currentScore = suspect.calculation();
                return (
                  <div key={idx} className="bg-black/30 p-2 rounded-lg border border-slate-850 flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-slate-350 truncate max-w-[200px]">{suspect.file}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                        <div 
                          style={{ width: `${currentScore}%` }} 
                          className={`h-full rounded-full ${
                            currentScore > 80 ? 'bg-ghost-red' : currentScore > 50 ? 'bg-ghost-orange' : 'bg-ghost-blue'
                          }`}
                        />
                      </div>
                      <span className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                        currentScore > 80 ? 'bg-red-950/40 text-ghost-red' : currentScore > 50 ? 'bg-orange-950/40 text-ghost-orange' : 'bg-blue-950/40 text-ghost-blue'
                      }`}>
                        {currentScore} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-slate-500 text-center leading-normal italic pt-1">
              Heuristic correlation algorithm computed.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
