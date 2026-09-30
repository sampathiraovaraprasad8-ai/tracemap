import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, RefreshCw, Eye, Flame, ShieldAlert } from 'lucide-react';
import { analyzeGraphDiagnostics } from '../utils/cycleDetector';

export default function DetectedIssues({ nodes, edges, activeCycleId, onSelectCycle }) {
  const { issues, hasIssues, cycles } = analyzeGraphDiagnostics(nodes, edges);

  return (
    <div className="bg-[#0a0e1a] border border-slate-800/80 rounded-xl p-4 space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-slate-200 tracking-wide uppercase font-mono">
            Detected Issues
          </h3>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
          hasIssues
            ? 'bg-red-950/60 text-red-400 border-red-800/60'
            : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
        }`}>
          {issues.length} {issues.length === 1 ? 'Issue' : 'Issues'}
        </span>
      </div>

      {!hasIssues ? (
        <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-emerald-300 text-xs flex items-center space-x-2 font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>✓ No critical dependency issues detected</span>
        </div>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
          {issues.map((issue) => {
            const isCircular = issue.type === 'circular';
            const isLatency = issue.type === 'latency';
            const isBottleneck = issue.type === 'bottleneck';
            const isSelected = activeCycleId === issue.id;

            return (
              <div
                key={issue.id}
                className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                  isCircular
                    ? 'bg-red-950/30 border-red-800/60 text-red-200 shadow-sm'
                    : isLatency
                    ? 'bg-amber-950/20 border-amber-800/50 text-amber-200'
                    : 'bg-yellow-950/20 border-yellow-800/40 text-yellow-200'
                } ${isSelected ? 'ring-2 ring-cyan-400' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold">
                    {isCircular && <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse shrink-0" />}
                    {isLatency && <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    {isBottleneck && <AlertCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                    <span>{issue.title}</span>
                  </div>

                  {isCircular && (
                    <button
                      onClick={() => onSelectCycle(isSelected ? null : issue.id, isSelected ? null : issue.nodes, isSelected ? null : issue.edgeIds)}
                      className={`text-[10px] px-2 py-0.5 rounded border font-mono flex items-center space-x-1 transition-all ${
                        isSelected
                          ? 'bg-cyan-600 text-white border-cyan-400 shadow'
                          : 'bg-red-950 hover:bg-red-900 text-red-300 border-red-800'
                      }`}
                    >
                      <Eye className="w-3 h-3 text-cyan-300" />
                      <span>{isSelected ? 'Clear View' : 'View Cycle'}</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] font-mono leading-relaxed opacity-95">
                  {issue.description}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
