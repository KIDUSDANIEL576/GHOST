import React from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { useHealth } from '../hooks/useHealth';
import { formatDistanceToNow } from 'date-fns';

export function HealthMonitor() {
  const { health } = useHealth(5000);
  if (!health) return <div className="flex justify-center py-20"><RefreshCw className="h-8 w-8 text-orange-600 animate-spin"/></div>;

  const icons = { 
    OK: <CheckCircle2 className="h-5 w-5 text-emerald-500 shadow-2xs"/>, 
    DEGRADED: <AlertTriangle className="h-5 w-5 text-amber-550"/>, 
    FAILED: <XCircle className="h-5 w-5 text-red-650"/>, 
    RECOVERING: <RefreshCw className="h-5 w-5 text-blue-600 animate-spin"/>, 
    UNKNOWN: <Activity className="h-5 w-5 text-slate-505"/> 
  };
  
  const bannerColor = { 
    HEALTHY: 'bg-emerald-50 border-emerald-250 text-emerald-900', 
    WARNING: 'bg-amber-50 border-amber-250 text-amber-900', 
    DEGRADED: 'bg-red-55 border-red-250 text-red-900', 
    UNKNOWN: 'bg-slate-50 border-slate-250 text-slate-900' 
  }[health.overall] || 'bg-slate-50 border-slate-250 text-slate-900';

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
        <Activity className="h-5 w-5 text-orange-600"/>System Health
      </h2>
      <div className={`rounded-xl border p-4 flex items-center gap-4 shadow-2xs ${bannerColor}`}>
        <Activity className="h-8 w-8 flex-none text-orange-600 animate-pulse"/>
        <div>
          <div className="font-bold text-lg tracking-tight uppercase">{health.overall}</div>
          <div className="text-xs text-slate-500 font-medium">
            Updated {formatDistanceToNow(new Date(health.timestamp * 1000), { addSuffix: true })}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(Object.entries(health.components) as [string, { status: string; message: string; fallback: boolean }][]).map(([name, comp]) => (
          <div key={name} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-2xs hover:bg-slate-50/40 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {icons[comp.status as keyof typeof icons] ?? icons.UNKNOWN}
                <span className="font-bold text-sm text-slate-800 capitalize leading-snug">{name.replace(/_/g, ' ')}</span>
              </div>
              {comp.fallback && (
                <span className="text-[10px] bg-amber-100 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-sans font-bold">
                  Fallback
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans">{comp.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
