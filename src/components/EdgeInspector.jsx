import React from 'react';
import { X, Clock, Network, ArrowRight, ShieldCheck, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { classifyService } from '../utils/serviceClassifier';

export default function EdgeInspector({ selectedEdgeData, onClose }) {
  if (!selectedEdgeData) return null;

  const { source, target, data = {} } = selectedEdgeData;
  const latency = data.latency_ms || 0;
  const isCircular = Boolean(data.is_circular);
  const method = data.method || 'POST';
  const endpoint = data.endpoint || '/api/v1/service';
  const status = data.status || '200 OK';
  const timestamp = data.timestamp ? new Date(data.timestamp).toLocaleString() : new Date().toLocaleString();

  const sourceType = classifyService(source);
  const targetType = classifyService(target);

  let latencyClass = { label: 'Normal', color: 'text-emerald-400', bg: 'bg-emerald-950/60 border-emerald-800' };
  if (latency > 250) {
    latencyClass = { label: 'High', color: 'text-red-400', bg: 'bg-red-950/60 border-red-800' };
  } else if (latency >= 100) {
    latencyClass = { label: 'Elevated', color: 'text-amber-400', bg: 'bg-amber-950/60 border-amber-800' };
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 backdrop-blur-sm bg-black/40 transition-opacity z-40"
      />

      {/* Connection Details Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0c1220] border border-slate-700/80 rounded-2xl shadow-2xl z-50 p-5 space-y-4 text-slate-100 font-sans ring-1 ring-cyan-500/20 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Network className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Connection Details</h3>
              <p className="text-[11px] text-slate-400 font-mono">Microservice Network Hop Metadata</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source -> Target Visual Banner */}
        <div className="bg-[#101728] border border-slate-800 p-3.5 rounded-xl flex items-center justify-between space-x-2">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Source Service</span>
            <span className="text-xs font-bold text-cyan-300 truncate block" title={source}>
              {source}
            </span>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border mt-1 inline-block ${sourceType.badgeStyle}`}>
              {sourceType.typeLabel}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center px-2">
            <ArrowRight className="w-5 h-5 text-cyan-400" />
            <span className="text-[9px] font-mono text-slate-500 mt-0.5">{method}</span>
          </div>

          <div className="flex-1 min-w-0 text-right">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Target Service</span>
            <span className="text-xs font-bold text-cyan-300 truncate block" title={target}>
              {target}
            </span>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border mt-1 inline-block ${targetType.badgeStyle}`}>
              {targetType.typeLabel}
            </span>
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
          <div className="bg-[#090e1a] p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">HTTP Method</span>
            <span className="font-bold text-slate-200">{method}</span>
          </div>

          <div className="bg-[#090e1a] p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">Endpoint</span>
            <span className="font-bold text-slate-200 truncate block" title={endpoint}>{endpoint}</span>
          </div>

          <div className="bg-[#090e1a] p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">Latency</span>
            <div className="flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-slate-100">{latency} ms</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${latencyClass.bg} ${latencyClass.color}`}>
                {latencyClass.label}
              </span>
            </div>
          </div>

          <div className="bg-[#090e1a] p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block">Status</span>
            <span className="font-bold text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{status}</span>
            </span>
          </div>
        </div>

        {/* Circular Warning Banner if applicable */}
        {isCircular && (
          <div className="bg-red-950/40 border border-red-800/60 p-3 rounded-xl flex items-start space-x-2.5 text-xs text-red-300">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <span className="font-bold block">Circular Loop Dependency</span>
              <span className="text-[11px] text-red-300/80 leading-snug block">
                This network edge is part of a recursive DFS call loop that risks infinite recursion.
              </span>
            </div>
          </div>
        )}

        <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-800/80">
          <span>Ingest Timestamp:</span>
          <span>{timestamp}</span>
        </div>

      </div>
    </>
  );
}
