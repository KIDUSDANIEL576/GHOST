import { useEffect, useRef } from 'react';
import { invoke } from '../lib/invoke';

interface Suspect {
  rank: number;
  file: string;
  score: number;
  signals: string[];
  context: string;
}

interface CrashData {
  suspects: Suspect[];
  crashFile: string;
  crashLine: number;
}

interface GSettings {
  autoSnapshot: boolean;
  intervalSec: number;
  autoRestore: boolean;
  notifyOnCrash: boolean;
  ignorePatterns: string;
  enableBrowserNotifications: boolean;
  minSeverityScore: number;
  notifyOnlyOnStackMatch: boolean;
}

const DEFAULTS: GSettings = {
  autoSnapshot: true,
  intervalSec: 300,
  autoRestore: false,
  notifyOnCrash: true,
  ignorePatterns: "node_modules\n.git\n.next\ndist\nbuild",
  enableBrowserNotifications: true,
  minSeverityScore: 80,
  notifyOnlyOnStackMatch: false
};

function getStoredSettings(): GSettings {
  try {
    const stored = localStorage.getItem('ghost_settings_v1');
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function useCrashNotification() {
  const lastNotifiedCrashRef = useRef<string | null>(null);

  useEffect(() => {
    const checkCrashes = async () => {
      try {
        const config = getStoredSettings();

        // Check if browser notifications are enabled
        if (!config.enableBrowserNotifications) {
          return;
        }

        // Check browser permission
        if (typeof window === 'undefined' || !('Notification' in window)) {
          return;
        }

        let isGranted = false;
        try {
          isGranted = Notification.permission === 'granted';
        } catch (e) {
          console.warn('[Notification Check Blocked by Sandbox]', e);
        }

        if (!isGranted) {
          return;
        }

        const data = await invoke<CrashData | null>('get_crash_suspects');
        
        if (!data || !data.suspects || data.suspects.length === 0) {
          // No active crash, reset reference so we can notify again on future crashes
          lastNotifiedCrashRef.current = null;
          return;
        }

        const crashId = `${data.crashFile}:${data.crashLine}`;

        // If we already sent a notification for this specific crash, skip
        if (lastNotifiedCrashRef.current === crashId) {
          return;
        }

        // Get the top suspect
        const mainSuspect = data.suspects[0];
        if (!mainSuspect) {
          return;
        }

        // Apply custom severity filters
        const meetsScoreThreshold = mainSuspect.score >= config.minSeverityScore;
        const meetsStackMatchFilter = !config.notifyOnlyOnStackMatch || mainSuspect.signals.includes('STACK_MATCH');

        if (meetsScoreThreshold && meetsStackMatchFilter) {
          // Trigger native notification
          const title = `💥 Ghost Crash Alert (${mainSuspect.score}% Severity)`;
          const options: NotificationOptions = {
            body: `File: ${data.crashFile}:${data.crashLine}\nSuspect Rank #1: ${mainSuspect.file} (${mainSuspect.signals.join(', ')})`,
            icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">👻</text></svg>',
            tag: 'ghost-crash', // Deduplicate in notification deck
            requireInteraction: true, // Persist notification so user doesn't miss it even when minimized
          };

          new Notification(title, options);
          lastNotifiedCrashRef.current = crashId;
        }
      } catch (err) {
        console.error('[Notification Monitor Failed]', err);
      }
    };

    // Run check immediately on mount and then every 4.5s
    checkCrashes();
    const timer = setInterval(checkCrashes, 4500);

    return () => clearInterval(timer);
  }, []);
}
