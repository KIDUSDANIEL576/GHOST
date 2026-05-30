import { useState, useEffect, useRef } from 'react';
import { VibeActiveRegistry, WebVibeTool, probeWebVibeTool } from '../lib/vibeActiveRegistry';
import { toast } from 'sonner';

export function useWebVibeRegistry(autoScanActive = true, intervalMs = 10000) {
  const [discoveredTools, setDiscoveredTools] = useState<WebVibeTool[]>(() => 
    VibeActiveRegistry.getRegisteredTools()
  );
  const [isScanning, setIsScanning] = useState(false);
  const autoScanRef = useRef(autoScanActive);
  
  // Keep live ref of scanned tools to resolve closures
  const stateRef = useRef({ discoveredTools, isScanning });
  useEffect(() => {
    stateRef.current = { discoveredTools, isScanning };
    autoScanRef.current = autoScanActive;
  }, [discoveredTools, isScanning, autoScanActive]);

  // Load from local storage on updates
  const reloadFromStore = () => {
    setDiscoveredTools(VibeActiveRegistry.getRegisteredTools());
  };

  useEffect(() => {
    window.addEventListener('ghost_vibe_registry_updated', reloadFromStore);
    window.addEventListener('storage', reloadFromStore);
    return () => {
      window.removeEventListener('ghost_vibe_registry_updated', reloadFromStore);
      window.removeEventListener('storage', reloadFromStore);
    };
  }, []);

  const runActiveScan = async (showToast = false) => {
    if (stateRef.current.isScanning) return;
    setIsScanning(true);
    if (showToast) {
      toast.loading('Running real-time network probes on registered ports & workspace endpoints...', { id: 'vibe-scan' });
    }

    try {
      const currentTools = stateRef.current.discoveredTools;
      const updated = await Promise.all(
        currentTools.map(async (tool) => {
          const probedStatus = await probeWebVibeTool(tool);
          // If state is manually clicked or customized locally, keep state integrity in mind,
          // but standardize with standard checks
          return { ...tool, status: probedStatus };
        })
      );
      
      setDiscoveredTools(updated);
      VibeActiveRegistry.saveRegisteredTools(updated);
      const activeCount = updated.filter(t => t.status === 'active').length;

      if (showToast) {
        toast.success(`Scan completed! Found ${activeCount} active workspace channels.`, { id: 'vibe-scan' });
      }
      return updated;
    } catch (err: any) {
      if (showToast) {
        toast.error('Vibe Link probe scan failed: ' + err.message, { id: 'vibe-scan' });
      }
    } finally {
      setIsScanning(false);
    }
  };

  const updateToolStatus = (id: string, status: 'active' | 'sleeping' | 'stopped') => {
    const nextList = stateRef.current.discoveredTools.map(tool => 
      tool.id === id ? { ...tool, status } : tool
    );
    setDiscoveredTools(nextList);
    VibeActiveRegistry.saveRegisteredTools(nextList);
  };

  const registerNewTool = (name: string, domain: string, type: 'workspace' | 'generation' | 'sandbox') => {
    const cleanDomain = domain.replace(/^https?:\/\//i, '').trim();
    if (!name || !cleanDomain) {
      toast.error('Please specify both a friendly name and workspace domain path.');
      return false;
    }

    const newId = `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newTool: WebVibeTool = {
      id: newId,
      name,
      domain: cleanDomain,
      detectable: true,
      status: 'stopped',
      type,
      integrationKey: `VAL-${Math.floor(1000 + Math.random() * 9000)}`
    };

    const nextList = [...stateRef.current.discoveredTools, newTool];
    setDiscoveredTools(nextList);
    VibeActiveRegistry.saveRegisteredTools(nextList);
    toast.success(`Registered reference handler for "${name}" successfully.`);
    return true;
  };

  const removeTool = (id: string) => {
    const list = stateRef.current.discoveredTools;
    const target = list.find(t => t.id === id);
    if (!target) return;
    
    const nextList = list.filter(t => t.id !== id);
    setDiscoveredTools(nextList);
    VibeActiveRegistry.saveRegisteredTools(nextList);
    toast.success(`Removed registry watcher for "${target.name}".`);
  };

  // Periodic active environment watcher
  useEffect(() => {
    runActiveScan(false);

    const checkInterval = setInterval(() => {
      if (autoScanRef.current) {
        runActiveScan(false);
      }
    }, intervalMs);

    return () => clearInterval(checkInterval);
  }, [intervalMs]);

  return {
    discoveredTools,
    isScanning,
    runActiveScan,
    updateToolStatus,
    registerNewTool,
    removeTool
  };
}
