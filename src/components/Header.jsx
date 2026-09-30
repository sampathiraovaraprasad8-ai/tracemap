import React from 'react';
import { Network, Activity, AlertTriangle, ShieldCheck, RefreshCw, Trash2, Layers } from 'lucide-react';

export default function Header({ metrics, onReset, onClear, isResetting }) {
  return (
    <header className="h-16 border-b border-slate-800 bg-[#0c121e]/90 backdrop-blur-md px-6 flex items-center justify-between z-20 shrink-0">
      {/* Brand Title */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
          <Network className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold tracking-tight text-white font-sans">TraceMap</h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
              v1.0 Hackathon Release
            </span>
          </div>
          <p className="text-xs text-slate-400">Microservice Dependency Visualizer & DFS Diagnostic Engine</p>
        </div>
      </div>

      {/* Metrics Counter Bar */}
      <div className="hidden md:flex items-center space-x-6 bg-[#131b2c] border border-slate-800/80 px-4 py-2 rounded-xl">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <div className="text-xs">
            <span className="text-slate-400">Services: </span>
            <span className="font-mono font-bold text-slate-100">{metrics.nodeCount || 0}</span>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-800"></div>

        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <div className="text-xs">
            <span className="text-slate-400">Hops: </span>
            <span className="font-mono font-bold text-slate-100">{metrics.edgeCount || 0}</span>
          </div>
        </div>

        <div className="h-4 w-px bg-slate-800"></div>

        <div className="flex items-center space-x-2">
          <AlertTriangle className={`w-4 h-4 ${metrics.circularCount > 0 ? 'text-red-400 animate-pulse' : 'text-slate-500'}`} />
          <div className="text-xs">
            <span className="text-slate-400">Circular Loops: </span>
            <span className={`font-mono font-bold ${metrics.circularCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {metrics.circularCount || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Security Status & Actions */}
      <div className="flex items-center space-x-3">
        <div className="hidden lg:flex items-center space-x-2 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Regex Sanitizer Active</span>
        </div>

        <button
          onClick={onClear}
          disabled={isResetting}
          className="flex items-center space-x-1.5 text-xs font-medium bg-slate-800/80 hover:bg-red-950/40 hover:text-red-300 border border-slate-700 hover:border-red-800/50 text-slate-300 px-3 py-2 rounded-lg transition-all shadow-sm disabled:opacity-50"
          title="Clear canvas to start clean"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Clear Canvas</span>
        </button>

        <button
          onClick={onReset}
          disabled={isResetting}
          className="flex items-center space-x-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg transition-all shadow-sm hover:text-cyan-400 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>Reset Demo</span>
        </button>
      </div>
    </header>
  );
}
