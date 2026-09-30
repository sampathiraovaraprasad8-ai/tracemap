import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import GraphCanvas from './components/GraphCanvas';
import NodeInspector from './components/NodeInspector';
import EdgeInspector from './components/EdgeInspector';
import { sanitizeLogContent } from './utils/sanitizer';
import { parseLogsClient } from './utils/logParser';

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [logInput, setLogInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [latencyThreshold, setLatencyThreshold] = useState(0);
  const [sanitizedPreview, setSanitizedPreview] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [selectedNodeData, setSelectedNodeData] = useState(null);
  const [selectedEdgeData, setSelectedEdgeData] = useState(null);
  const [pipelineStats, setPipelineStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cycle Highlight State
  const [activeCycleId, setActiveCycleId] = useState(null);
  const [activeCycleNodes, setActiveCycleNodes] = useState(null);
  const [activeCycleEdges, setActiveCycleEdges] = useState(null);

  // Update client preview when logInput changes
  useEffect(() => {
    if (logInput) {
      setSanitizedPreview(sanitizeLogContent(logInput));
    } else {
      setSanitizedPreview('');
    }
  }, [logInput]);

  // Fetch Topology Graph Data from Backend
  const fetchTopology = useCallback(async () => {
    try {
      const response = await fetch('/api/topology');
      if (!response.ok) throw new Error('Failed to fetch topology');
      const data = await response.json();
      setNodes(data.nodes || []);
      setEdges(data.edges || []);

      // Default pipeline stats if none set yet
      if (!pipelineStats && data.nodes) {
        const rawLines = (logInput || '').split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#'));
        setPipelineStats({
          ingestedCount: rawLines.length || data.edges.length,
          sanitizedCount: rawLines.length || data.edges.length,
          servicesIdentified: data.nodes.length,
          dependenciesCreated: data.edges.length,
          circularDetected: data.edges.filter(e => e.data?.is_circular).length
        });
      }
    } catch (err) {
      console.warn('Backend API topology check:', err.message);
    }
  }, [pipelineStats, logInput]);

  useEffect(() => {
    fetchTopology();
  }, [fetchTopology]);

  // Handle Log Ingestion
  const handleIngestLogs = async () => {
    if (!logInput.trim()) return;
    setIsLoading(true);
    setFeedbackMsg(null);
    setActiveCycleId(null);
    setActiveCycleNodes(null);
    setActiveCycleEdges(null);

    // Primary: Backend API Ingestion
    try {
      const res = await fetch('/api/logs/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: logInput,
      });

      let data = null;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      }

      if (res.ok && data && data.ingestedConnections && data.ingestedConnections.length > 0) {
        setPipelineStats(data.pipelineStats || null);
        setFeedbackMsg({
          type: 'success',
          text: `${data.message} Topology updated successfully!`
        });
        await fetchTopology();
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Backend API ingestion fallback activated:', err);
    }

    // Secondary: Instant Client-Side Parsing Engine Fallback
    try {
      const result = parseLogsClient(logInput);
      if (result.edges.length > 0 || result.nodes.length > 0) {
        setNodes(result.nodes);
        setEdges(result.edges);
        setPipelineStats(result.pipelineStats);
        setFeedbackMsg({
          type: 'success',
          text: `Successfully ingested ${result.edges.length} connection(s). Microservice topology generated!`
        });
      } else {
        setFeedbackMsg({
          type: 'error',
          text: 'Could not parse any valid microservice connections from the trace logs.'
        });
      }
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: 'Error processing trace logs.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Graph Reset
  const handleResetGraph = async () => {
    setIsResetting(true);
    setFeedbackMsg(null);
    setSelectedNodeData(null);
    setSelectedEdgeData(null);
    setActiveCycleId(null);
    setActiveCycleNodes(null);
    setActiveCycleEdges(null);
    setSearchQuery('');
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        setPipelineStats(null);
        setFeedbackMsg({ type: 'success', text: 'Topology reset to initial seed state.' });
        await fetchTopology();
      }
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // Handle Graph Clear
  const handleClearGraph = async () => {
    setIsResetting(true);
    setFeedbackMsg(null);
    setSelectedNodeData(null);
    setSelectedEdgeData(null);
    setActiveCycleId(null);
    setActiveCycleNodes(null);
    setActiveCycleEdges(null);
    setSearchQuery('');
    try {
      const res = await fetch('/api/clear', { method: 'POST' });
      if (res.ok) {
        setPipelineStats({
          ingestedCount: 0,
          sanitizedCount: 0,
          servicesIdentified: 0,
          dependenciesCreated: 0,
          circularDetected: 0
        });
        setFeedbackMsg({ type: 'success', text: 'Canvas cleared. Ready for custom trace ingestion.' });
        await fetchTopology();
      }
    } catch (err) {
      console.error('Clear error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // Cycle selection handler for "View Cycle" button
  const handleSelectCycle = (cycleId, cycleNodes, cycleEdges) => {
    setActiveCycleId(cycleId);
    setActiveCycleNodes(cycleNodes);
    setActiveCycleEdges(cycleEdges);
  };

  // Metrics Calculation
  const metrics = {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    circularCount: edges.filter(e => e.data?.is_circular).length,
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#080c14] overflow-hidden text-slate-100 font-sans">
      {/* Top Header */}
      <Header metrics={metrics} onReset={handleResetGraph} onClear={handleClearGraph} isResetting={isResetting} />

      {/* Main Split Layout: Left Sidebar, Right Graph Canvas */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <Sidebar
          logInput={logInput}
          setLogInput={setLogInput}
          onIngestLogs={handleIngestLogs}
          isLoading={isLoading}
          latencyThreshold={latencyThreshold}
          setLatencyThreshold={setLatencyThreshold}
          sanitizedPreview={sanitizedPreview}
          feedbackMsg={feedbackMsg}
          pipelineStats={pipelineStats}
          nodes={nodes}
          edges={edges}
          activeCycleId={activeCycleId}
          onSelectCycle={handleSelectCycle}
        />
        
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          latencyThreshold={latencyThreshold}
          onSelectNode={setSelectedNodeData}
          onSelectEdge={setSelectedEdgeData}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeCycleNodes={activeCycleNodes}
          activeCycleEdges={activeCycleEdges}
        />

        {/* Node Inspector Side Drawer */}
        <NodeInspector
          selectedNodeData={selectedNodeData}
          onClose={() => setSelectedNodeData(null)}
        />

        {/* Edge / Connection Details Modal */}
        <EdgeInspector
          selectedEdgeData={selectedEdgeData}
          onClose={() => setSelectedEdgeData(null)}
        />
      </div>
    </div>
  );
}
