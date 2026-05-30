import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, ExternalLink, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { isPro, openCheckout } from '../lib/billing';

interface GSettings {
  autoSnapshot: boolean; intervalSec: number;
  autoRestore: boolean; notifyOnCrash: boolean;
  ignorePatterns: string;
  enableBrowserNotifications: boolean;
  minSeverityScore: number;
  notifyOnlyOnStackMatch: boolean;
}

const DEFAULTS: GSettings = {
  autoSnapshot: true, intervalSec: 300,
  autoRestore: false, notifyOnCrash: true,
  ignorePatterns: "node_modules\n.git\n.next\ndist\nbuild",
  enableBrowserNotifications: true,
  minSeverityScore: 80,
  notifyOnlyOnStackMatch: false
};

function Row({ label, desc, proOnly, children }: { label: string; desc: string; proOnly?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-white/5 last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{label}</p>
          {proOnly && <span className="text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded-full font-sans">Pro</span>}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      <div className="flex-none">{children}</div>
    </div>
  );
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button onClick={() => !disabled && onChange(!on)} disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-orange-500' : 'bg-gray-700'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : ''}`}/>
    </button>
  );
}

export function Settings() {
  const [s, setS] = useState<GSettings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [pro, setPro] = useState(isPro());
  const [permission, setPermission] = useState<string>('default');

  useEffect(() => {
    const stored = localStorage.getItem('ghost_settings_v1');
    if (stored) try { setS({ ...DEFAULTS, ...JSON.parse(stored) }); } catch {}

    // Check pro state periodically or on focus
    const interval = setInterval(() => {
      setPro(isPro());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        setPermission(Notification.permission);
      } catch (e) {
        console.warn('[Settings Notification permission read blocked]:', e);
        setPermission('denied');
      }
    }
  }, []);

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
          toast.success('🎉 Desktop notifications permission granted!');
        } else if (result === 'denied') {
          toast.error('❌ Desktop notifications permission denied by your browser.');
        }
      } catch (e: any) {
        console.warn('Notification permission request blocked by sandbox:', e);
        toast.error('Blocked by sandbox policy. Open the app in a new tab to authorize updates!');
      }
    } else {
      toast.error('Browser does not support desktop notifications.');
    }
  };

  const triggerTestNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      let isPermissionGranted = false;
      try {
        isPermissionGranted = Notification.permission === 'granted';
      } catch (e) {}

      if (!isPermissionGranted) {
        toast.error('Please request/allow permission first.');
        return;
      }
      
      const title = '👻 Ghost Universal (Test Alert)';
      const options: NotificationOptions = {
        body: 'Testing native background alert channels. Ghost engine is active and tracking changes!',
        icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">👻</text></svg>',
      };
      
      try {
        new Notification(title, options);
        toast.success('Test notification dispatched!');
      } catch (e: any) {
        console.warn('Failed to trigger notification:', e);
        toast.error('Notification blocked by sandboxed iframe. Please try in a new tab!');
      }
    } else {
      toast.error('Browser does not support desktop notifications.');
    }
  };

  const set = (k: keyof GSettings, v: any) => setS(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      localStorage.setItem('ghost_settings_v1', JSON.stringify(s));
      toast.success('Settings saved');
    } finally { setSaving(false); }
  };

  const handleDevUpgrade = () => {
    localStorage.setItem('ghost_billing_v1', JSON.stringify({ tier: 'pro', isActive: true, since: Date.now() }));
    setPro(true);
    toast.success('👻 Pro Tier activated! (Dev Simulator mode)');
  };

  const handleDevDowngrade = () => {
    localStorage.removeItem('ghost_billing_v1');
    setPro(false);
    toast.info('Downgraded to Free Tier.');
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h2 className="text-xl font-bold">Settings</h2>

      {/* Snapshots */}
      <div className="rounded-xl border border-white/5 bg-white/3 p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Snapshots</h3>
        <Row label="Auto Snapshots" desc="Save project state automatically in background">
          <Toggle on={s.autoSnapshot} onChange={v => set('autoSnapshot', v)}/>
        </Row>
        {s.autoSnapshot && (
          <Row label="Interval" desc="How often to auto-save (seconds)">
            <input type="number" min={30} max={3600} step={30} value={s.intervalSec} onChange={e => set('intervalSec', parseInt(e.target.value) || 300)}
              className="w-20 text-center text-sm bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 outline-none focus:border-orange-500 text-white font-sans"/>
          </Row>
        )}
        <Row label="Auto Restore on Crash" desc="Automatically revert when crash detected" proOnly>
          <Toggle on={s.autoRestore} onChange={v => { if (!pro) { toast.info('Upgrade to Pro to unlock auto-restores on crash'); return; } set('autoRestore', v); }} disabled={!pro}/>
        </Row>
        <Row label="Crash Notifications" desc="Desktop notification when crash detected">
          <Toggle on={s.notifyOnCrash} onChange={v => set('notifyOnCrash', v)}/>
        </Row>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-white/5 bg-white/3 p-5 space-y-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notifications</h3>
        
        <Row label="Browser Notifications" desc="Alert you via web notifications when high-severity crashes are discovered">
          <Toggle on={s.enableBrowserNotifications} onChange={v => set('enableBrowserNotifications', v)}/>
        </Row>
        
        {s.enableBrowserNotifications && (
          <div className="space-y-4 pt-2">
            <div className="py-3 border-b border-white/5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Browser Permission</p>
                  <p className="text-xs text-gray-500 mt-0.5">Required to trigger system-level desktop alerts</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-semibold border ${
                    permission === 'granted' 
                      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                      : permission === 'denied' 
                        ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  }`}>
                    {permission === 'granted' ? 'GRANTED' : permission === 'denied' ? 'DENIED' : 'PENDING'}
                  </span>
                  {permission !== 'granted' && (
                    <button onClick={requestPermission} className="text-xs px-2.5 py-1 bg-white/10 hover:bg-white/15 border border-white/10 rounded transition-colors cursor-pointer font-medium text-white">
                      Authorize
                    </button>
                  )}
                </div>
              </div>
            </div>

            <Row label="Min severity threshold" desc="Only notify on file-mutation suspect score ≥ this percentage">
              <div className="flex items-center gap-3">
                <input type="range" min={10} max={100} step={5} value={s.minSeverityScore} onChange={e => set('minSeverityScore', parseInt(e.target.value) || 80)}
                  className="w-28 sm:w-36 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"/>
                <span className="text-xs font-bold text-orange-400 font-mono w-8 text-right">{s.minSeverityScore}%</span>
              </div>
            </Row>

            <Row label="Confidence Filter" desc="Only fire notification if a signature stack trace matches perfectly">
              <Toggle on={s.notifyOnlyOnStackMatch} onChange={v => set('notifyOnlyOnStackMatch', v)}/>
            </Row>

            <div className="pt-2 flex justify-end">
              <button onClick={triggerTestNotification} className="text-xs px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 rounded-lg transition-colors cursor-pointer font-medium">
                ⚡ Fire Test Notification
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ignore patterns */}
      <div className="rounded-xl border border-white/5 bg-white/3 p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Ignored Paths</h3>
        <textarea value={s.ignorePatterns} onChange={e => set('ignorePatterns', e.target.value)} rows={5}
          className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-sm font-mono text-gray-300 outline-none focus:border-orange-500 resize-none placeholder:text-gray-700"/>
      </div>

      {/* Account */}
      <div className="rounded-xl border border-white/5 bg-white/3 p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Account</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className={`h-6 w-6 ${pro ? 'text-orange-500' : 'text-gray-600'}`}/>
            <div>
              <p className="text-sm font-semibold">{pro ? '👻 Ghost Pro' : 'Free Tier'}</p>
              <p className="text-xs text-gray-500">{pro ? 'All features unlocked' : '24h history · Upgrade for unlimited'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!pro ? (
              <>
                <button onClick={openCheckout} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg font-semibold hover:opacity-90 transition-opacity cursor-pointer text-white">
                  Upgrade $19/mo <ExternalLink className="h-3 w-3"/>
                </button>
                <button onClick={handleDevUpgrade} className="text-[10px] text-gray-500 hover:text-gray-300 px-2 py-1 border border-white/5 bg-white/5 rounded cursor-pointer">
                  Simulate Pro
                </button>
              </>
            ) : (
              <button onClick={handleDevDowngrade} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 bg-red-950/20 border border-red-900/30 rounded cursor-pointer">
                Cancel Sub (Simulator)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer">
          <Save className="h-4 w-4"/>{saving ? 'Saving...' : 'Save Settings'}
        </button>
        <button onClick={() => { setS(DEFAULTS); toast.info('Reset to defaults'); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-gray-400 transition-colors cursor-pointer">
          <RotateCcw className="h-4 w-4"/>Reset
        </button>
      </div>
    </div>
  );
}
