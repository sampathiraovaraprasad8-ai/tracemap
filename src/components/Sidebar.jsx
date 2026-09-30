import React, { useState } from 'react';
import { Send, Sliders, Shield, Terminal, Zap, CheckCircle2, AlertCircle, Eye, Activity, Cpu, Check } from 'lucide-react';
import { SAMPLE_CURL_TRACES } from '../utils/sampleLogs';
import DetectedIssues from './DetectedIssues';

export default function Sidebar({
  logInput,
  setLogInput,
  onIngestLogs,
  isLoading,
  latencyThreshold,
  setLatencyThreshold,
  sanitizedPreview,
  feedbackMsg,
  pipelineStats,
  nodes,
  edges,
  activeCycleId,
  onSelectCycle
}) {
  const [showPreview, setShowPreview] = useState(false);

  const handleLoadSample = (sampleKey) => {
    setLogInput(SAMPLE_CURL_TRACES[sampleKey]);
  };

  const placeholderText = `Paste raw cURL traces here...
e.g.
curl -X POST http://payment-service/charge -H 'Authorization: Bearer my_token' -d '{"amount": 100}'`;

  return (
    <aside className="w-full md:w-80 lg:w-96 bg-[#0d1322] border-r border-slate-800/80 flex flex-col h-full overflow-y-auto shrink-0 z-10 font-sans">
      <div className="p-5 space-y-6 flex-1">
        
        {/* Section 1: Ingest Raw cURL & HTTP Logs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-200 font-medium text-sm">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Log & cURL Ingestion</span>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono">
              POST /api/logs/ingest
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Paste raw cURL commands or log outputs below. Sensitive auth tokens and JSON payloads are automatically sanitized via Regex middleware before DFS processing.
          </p>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              onClick={() => handleLoadSample('circularLoop')}
              className="text-[11px] bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/40 px-2.5 py-1 rounded transition-colors flex items-center space-x-1"
            >
              <Zap className="w-3 h-3 text-red-400" />
              <span>Preset: Circular Loop Trace</span>
            </button>

            <button
              onClick={() => handleLoadSample('swarmArchitecture')}
              className="text-[11px] bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 border border-blue-800/40 px-2.5 py-1 rounded transition-colors"
            >
              Preset: Swarm Trace
            </button>

            <button
              onClick={() => handleLoadSample('flipkartSwarm')}
              className="text-[11px] bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/40 px-2.5 py-1 rounded transition-colors"
            >
              Preset: Flipkart Swarm
            </button>

            <button
              onClick={() => handleLoadSample('newServiceIngest')}
              className="text-[11px] bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/40 px-2.5 py-1 rounded transition-colors"
            >
              Preset: Extend Graph
            </button>
          </div>

          {/* Log Textarea */}
          <div className="relative">
            <textarea
              rows={7}
              value={logInput}
              onChange={(e) => setLogInput(e.target.value)}
              placeholder={placeholderText}
              className="w-full bg-[#080c15] text-slate-200 text-xs rounded-xl p-3 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all resize-none font-mono placeholder:text-slate-600"
            />
            {logInput && (
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="absolute bottom-3 right-3 text-[10px] bg-slate-800/90 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 flex items-center space-x-1 backdrop-blur-sm"
              >
                <Eye className="w-3 h-3 text-cyan-400" />
                <span>{showPreview ? 'Hide Preview' : 'Preview Sanitized'}</span>
              </button>
            )}
          </div>

          {/* Req 12: Sanitized Live Preview Drawer */}
          {showPreview && sanitizedPreview && (
            <div className="bg-slate-950 border border-cyan-900/50 rounded-xl p-3 space-y-1">
              <div className="flex items-center space-x-1 text-[11px] text-cyan-400 font-semibold font-mono">
                <Shield className="w-3 h-3 text-cyan-400" />
                <span>Regex Sanitized Output Preview:</span>
              </div>
              <pre className="text-[10px] text-slate-400 overflow-x-auto whitespace-pre-wrap max-h-32 font-mono">
                {sanitizedPreview}
              </pre>
            </div>
          )}

          {/* Submit Ingestion Button */}
          <button
            onClick={onIngestLogs}
            disabled={isLoading || !logInput.trim()}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:from-cyan-700 active:to-blue-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-600/20 ring-1 ring-cyan-400/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className={`w-3.5 h-3.5 ${isLoading ? 'animate-bounce' : ''}`} />
            <span>{isLoading ? 'Ingesting & Running DFS Check...' : 'Generate Topology'}</span>
          </button>

          {/* Req 11: Processing Pipeline Status Indicator */}
          <div className="bg-[#090e1a] border border-slate-800/80 rounded-xl p-3 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold">
              <span className="flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Processing Pipeline Status</span>
              </span>
              <span className="text-[9px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.5 rounded">
                Active
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1 text-[9px] text-center pt-1 font-mono">
              <div className="bg-slate-900 border border-slate-800 p-1 rounded text-cyan-300">
                <span>INGEST</span>
                <Check className="w-3 h-3 mx-auto text-emerald-400 mt-0.5" />
              </div>
              <div className="bg-slate-900 border border-slate-800 p-1 rounded text-cyan-300">
                <span>SANITIZE</span>
                <Check className="w-3 h-3 mx-auto text-emerald-400 mt-0.5" />
              </div>
              <div className="bg-slate-900 border border-slate-800 p-1 rounded text-cyan-300">
                <span>PARSE</span>
                <Check className="w-3 h-3 mx-auto text-emerald-400 mt-0.5" />
              </div>
              <div className="bg-slate-900 border border-slate-800 p-1 rounded text-cyan-300">
                <span>BUILD</span>
                <Check className="w-3 h-3 mx-auto text-emerald-400 mt-0.5" />
              </div>
              <div className="bg-slate-900 border border-slate-800 p-1 rounded text-cyan-300">
                <span>ANALYZE</span>
                <Check className="w-3 h-3 mx-auto text-emerald-400 mt-0.5" />
              </div>
            </div>

            {/* Pipeline Live Real Statistics Counts */}
            {pipelineStats && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[10px] text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Ingested Requests:</span>
                  <span className="font-bold text-cyan-400">✓ {pipelineStats.ingestedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sanitized Outputs:</span>
                  <span className="font-bold text-cyan-400">✓ {pipelineStats.sanitizedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Services Identified:</span>
                  <span className="font-bold text-emerald-400">✓ {nodes ? nodes.length : pipelineStats.servicesIdentified}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Dependencies Created:</span>
                  <span className="font-bold text-emerald-400">✓ {edges ? edges.length : pipelineStats.dependenciesCreated}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Circular Dependencies:</span>
                  <span className={`font-bold ${edges && edges.filter(e => e.data?.is_circular).length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    ✓ {edges ? edges.filter(e => e.data?.is_circular).length : pipelineStats.circularDetected}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Feedback message banner */}
          {feedbackMsg && (
            <div className={`p-3 rounded-xl text-xs flex items-start space-x-2 ${
              feedbackMsg.type === 'error' 
                ? 'bg-red-950/50 text-red-300 border border-red-800/50' 
                : 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/50'
            }`}>
              {feedbackMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              )}
              <div className="flex-1 leading-snug">{feedbackMsg.text}</div>
            </div>
          )}
        </div>

        <hr className="border-slate-800/80" />

        {/* Req 6 & 7: Detected Issues Diagnostic Panel */}
        <DetectedIssues
          nodes={nodes}
          edges={edges}
          activeCycleId={activeCycleId}
          onSelectCycle={onSelectCycle}
        />

        <hr className="border-slate-800/80" />

        {/* Section 2: Sub-Second Latency Filter Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-200 font-medium text-sm">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Latency Filter Slider</span>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded-md">
              &ge; {latencyThreshold} ms
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Filter network hops in sub-second real time. Only display connections with latency equal to or greater than <span className="font-semibold text-slate-200">{latencyThreshold} ms</span>.
          </p>

          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="250"
              step="5"
              value={latencyThreshold}
              onChange={(e) => setLatencyThreshold(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
              <span>0 ms (Show All)</span>
              <span>100 ms</span>
              <span>250 ms (High Latency)</span>
            </div>
          </div>
        </div>

        <hr className="border-slate-800/80" />

        {/* Req 9: Comprehensive Latency Tiers & Diagnostic Legend */}
        <div className="space-y-3 bg-[#0a0e19] p-3.5 rounded-xl border border-slate-800/60 font-mono text-xs">
          <span className="font-semibold text-slate-300 block">Diagnostic Legend & Latency Tiers:</span>
          
          <div className="flex items-center space-x-2 text-slate-300">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></div>
            <span>🟢 Normal Latency (&lt; 100 ms)</span>
          </div>

          <div className="flex items-center space-x-2 text-amber-300">
            <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></div>
            <span>🟡 Elevated Latency (100–250 ms)</span>
          </div>

          <div className="flex items-center space-x-2 text-red-300">
            <div className="w-3 h-3 rounded-full bg-red-500 shrink-0"></div>
            <span>🔴 High Latency (&gt; 250 ms)</span>
          </div>

          <div className="flex items-center space-x-2 text-red-400 pt-1 border-t border-slate-800">
            <div className="w-6 h-1 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></div>
            <span>🔄 Circular Dependency Loop</span>
          </div>
        </div>

      </div>

      <div className="p-4 border-t border-slate-800/80 bg-[#090d17] text-[11px] text-slate-500 text-center">
        TraceMap Hackathon Core • PostgreSQL & React Flow Architecture
      </div>
    </aside>
  );
}
