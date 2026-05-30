import { toast } from 'sonner';

export interface WebVibeTool {
  id: string;
  name: string;
  domain: string;
  detectable: boolean;
  status: 'active' | 'sleeping' | 'stopped';
  type: 'workspace' | 'generation' | 'sandbox';
  integrationKey: string;
}

// Default list of elite AI development/Vibe coding spaces
export const DEFAULT_VIBE_TOOLS: WebVibeTool[] = [
  { id: 'w1', name: 'Google AI Studio Build', domain: 'ai.studio/build', detectable: true, status: 'active', type: 'workspace', integrationKey: 'AIS-GHOST-V7' },
  { id: 'w2', name: 'Bolt.new Sandbox Frame', domain: 'bolt.new', detectable: true, status: 'stopped', type: 'sandbox', integrationKey: 'BOLT-9003' },
  { id: 'w3', name: 'Lovable App Container', domain: 'lovable.dev', detectable: true, status: 'stopped', type: 'sandbox', integrationKey: 'LOV-SYNC-SECURE' },
  { id: 'w4', name: 'v0.dev UI Engine', domain: 'v0.dev', detectable: true, status: 'stopped', type: 'generation', integrationKey: 'V0-MOCK-IPC' },
  { id: 'w5', name: 'Replit Agent Shell', domain: 'replit.com', detectable: true, status: 'stopped', type: 'workspace', integrationKey: 'REP-WORK-LINK' }
];

/**
 * Standard probe logic to verify active status of local hosts or web platform frame contexts.
 * Ensures consistent behavior across both simulated and checked contexts.
 */
export async function probeWebVibeTool(tool: WebVibeTool, customReferrer?: string): Promise<'active' | 'stopped' | 'sleeping'> {
  const domain = tool.domain.toLowerCase().trim();
  
  // Check if it's localhost or an IP (like 127.0.0.1) or custom port (e.g. localhost:5173, localhost:3000)
  const isLocal = domain.includes('localhost') || domain.includes('127.0.0.1') || /:\d+/.test(domain);

  if (isLocal) {
    let url = domain;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      
      // Fetch to see if the port / local service is actively listening
      await fetch(url, { 
        mode: 'no-cors', 
        cache: 'no-store',
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      return 'active';
    } catch {
      return 'stopped';
    }
  }

  // Context Aware Checks based on document context & live embed environment
  const referrer = (customReferrer || document.referrer || '').toLowerCase();
  const currentHref = window.location.href.toLowerCase();

  // Standardize Google AI Studio Built verification
  if (domain.includes('ai.studio') || domain.includes('google')) {
    const isAIStudio = 
      referrer.includes('ai.studio') || 
      referrer.includes('google') || 
      referrer.includes('ais-dev') || 
      referrer.includes('ais-pre') || 
      currentHref.includes('google') || 
      currentHref.includes('ai-studio') || 
      currentHref.includes('studio') || 
      currentHref.includes('ais-dev') || 
      currentHref.includes('ais-pre') || 
      currentHref.includes('europe-west2.run.app');
    return isAIStudio ? 'active' : 'stopped';
  }

  // Standardize Lovable App Container
  if (domain.includes('lovable') || domain.includes('lovable.dev')) {
    const isLovable = 
      referrer.includes('lovable') || 
      referrer.includes('gptengineer') || 
      currentHref.includes('lovable') || 
      currentHref.includes('gpt-engineer');
    return isLovable ? 'active' : 'stopped';
  }

  // Standardize Bolt.new
  if (domain.includes('bolt.new') || domain.includes('bolt')) {
    const isBolt = referrer.includes('bolt.new') || referrer.includes('stackblitz') || currentHref.includes('bolt');
    return isBolt ? 'active' : 'stopped';
  }

  // Standardize v0.dev UI Engine
  if (domain.includes('v0.dev') || domain.includes('v5')) {
    const isV5 = referrer.includes('v0.dev') || currentHref.includes('v0');
    return isV5 ? 'active' : 'stopped';
  }

  // Standardize Replit
  if (domain.includes('replit')) {
    const isReplit = referrer.includes('replit') || currentHref.includes('replit');
    return isReplit ? 'active' : 'stopped';
  }

  return 'stopped';
}

/**
 * Unified Active Registry persistence utility
 */
export const VibeActiveRegistry = {
  getRegisteredTools(): WebVibeTool[] {
    try {
      const stored = localStorage.getItem('ghost_vibe_registry_tools');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return DEFAULT_VIBE_TOOLS;
  },

  saveRegisteredTools(tools: WebVibeTool[]): void {
    try {
      localStorage.setItem('ghost_vibe_registry_tools', JSON.stringify(tools));
      window.dispatchEvent(new Event('ghost_vibe_registry_updated'));
    } catch {}
  },

  async runGlobalProbe(tools: WebVibeTool[]): Promise<WebVibeTool[]> {
    return Promise.all(
      tools.map(async (tool) => {
        const nextStatus = await probeWebVibeTool(tool);
        return { ...tool, status: nextStatus };
      })
    );
  }
};
