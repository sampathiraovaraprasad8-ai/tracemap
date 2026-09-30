import React, { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Handle,
  Position,
  MarkerType
} from '@xyflow/react';
import {
  Server,
  AlertOctagon,
  AlertTriangle,
  Radio,
  Globe,
  ShoppingCart,
  CreditCard,
  ShieldCheck,
  Database,
  BarChart3,
  Box,
  Truck,
  Layers,
  Cpu,
  Search,
  X
} from 'lucide-react';
import { getLayoutedElements } from '../utils/layout';
import { classifyService } from '../utils/serviceClassifier';

/**
 * Resolves custom category icon and color themes dynamically based on service name
 */
function getServiceIcon(serviceName) {
  const name = (serviceName || '').toLowerCase();

  if (name.includes('cart') || name.includes('checkout') || name.includes('basket')) {
    return { Icon: ShoppingCart, color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/40 ring-amber-500/20' };
  }
  if (name.includes('payment') || name.includes('pay') || name.includes('charge') || name.includes('upi')) {
    return { Icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/40 ring-emerald-500/20' };
  }
  if (name.includes('auth') || name.includes('login') || name.includes('security') || name.includes('rome')) {
    return { Icon: ShieldCheck, color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/40 ring-purple-500/20' };
  }
  if (name.includes('db') || name.includes('database') || name.includes('sql') || name.includes('mongo') || name.includes('store')) {
    return { Icon: Database, color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/40 ring-blue-500/20' };
  }
  if (name.includes('sonic') || name.includes('fdp') || name.includes('analytics') || name.includes('metrics') || name.includes('telemetry') || name.includes('bam') || name.includes('nr-data')) {
    return { Icon: BarChart3, color: 'text-pink-400', bg: 'bg-pink-500/15 border-pink-500/40 ring-pink-500/20' };
  }
  if (name.includes('static') || name.includes('assets') || name.includes('cdn') || name.includes('flixcart')) {
    return { Icon: Box, color: 'text-indigo-400', bg: 'bg-indigo-500/15 border-indigo-500/40 ring-indigo-500/20' };
  }
  if (name.includes('logistics') || name.includes('shipment') || name.includes('delivery') || name.includes('order')) {
    return { Icon: Truck, color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/40 ring-orange-500/20' };
  }
  if (name.includes('gateway') || name.includes('www') || name.includes('web') || name.includes('flipkart.com') || name.includes('sarvasiddhi')) {
    return { Icon: Globe, color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/40 ring-cyan-500/20' };
  }

  return { Icon: Cpu, color: 'text-sky-400', bg: 'bg-sky-500/15 border-sky-500/40 ring-sky-500/20' };
}

// ==========================================
// Custom React Flow Node Component
// ==========================================
function CustomServiceNode({ data }) {
  const isCritical = data.status === 'critical';
  const isWarning = data.status === 'warning';
  const isDimmed = data.isDimmed;
  const isCycleHighlighted = data.isCycleHighlighted;
  const isSearchMatched = data.isSearchMatched;

  const { Icon, color, bg } = getServiceIcon(data.label);
  const serviceClass = classifyService(data.label);

  return (
    <div className={`px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 border backdrop-blur-md min-w-[230px] ${
      isDimmed ? 'opacity-30 grayscale' : 'opacity-100'
    } ${
      isCycleHighlighted
        ? 'bg-gradient-to-b from-red-950/95 to-slate-900/95 border-red-500 ring-4 ring-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.7)] animate-pulse'
        : isSearchMatched
        ? 'bg-gradient-to-b from-cyan-950/90 to-slate-900/90 border-cyan-400 ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)]'
        : isCritical
        ? 'bg-gradient-to-b from-red-950/90 to-slate-900/90 border-red-500/80 shadow-red-900/40 ring-2 ring-red-500/30'
        : isWarning
        ? 'bg-gradient-to-b from-amber-950/80 to-slate-900/90 border-amber-500/70 shadow-amber-900/30'
        : 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-slate-700/80 shadow-black/60 hover:border-cyan-500/60'
    }`}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-slate-400 border-2 !border-slate-900 shadow-md"
      />

      <div className="flex items-center space-x-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ring-1 shadow-md ${
          isCritical || isCycleHighlighted
            ? 'bg-red-500/20 text-red-400 border-red-500/40 ring-red-500/20'
            : isWarning
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 ring-amber-500/20'
            : `${bg} ${color}`
        }`}>
          {isCritical || isCycleHighlighted ? (
            <AlertOctagon className="w-5 h-5 animate-pulse text-red-400" />
          ) : isWarning ? (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          ) : (
            <Icon className={`w-5 h-5 ${color}`} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-100 truncate tracking-wide font-sans" title={data.label}>
              {data.label}
            </h3>
          </div>

          <div className="flex items-center space-x-1.5 mt-1">
            <span className={`w-2 h-2 rounded-full ${
              isCritical || isCycleHighlighted ? 'bg-red-500 animate-ping' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
            }`} />
            <span className={`text-[10px] uppercase font-mono tracking-wider font-semibold ${
              isCritical || isCycleHighlighted ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {data.status || 'healthy'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
        <span className={`px-1.5 py-0.5 rounded border font-semibold ${serviceClass.badgeStyle}`}>
          {serviceClass.typeLabel}
        </span>
        <span className="flex items-center space-x-1 text-slate-400">
          <Radio className="w-3 h-3 text-cyan-400" />
          <span className="font-bold text-slate-200">{data.connectionCount || 0} Hops</span>
        </span>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-slate-400 border-2 !border-slate-900 shadow-md"
      />
    </div>
  );
}

// Map custom node types
const nodeTypes = {
  customServiceNode: CustomServiceNode,
};

// ==========================================
// GraphCanvas Main Component
// ==========================================
export default function GraphCanvas({
  nodes = [],
  edges = [],
  latencyThreshold = 0,
  onSelectNode,
  onSelectEdge,
  searchQuery = '',
  setSearchQuery,
  activeCycleNodes = null,
  activeCycleEdges = null
}) {

  // 1. Calculate Layout Deterministically using Dagre
  const layoutedData = useMemo(() => {
    return getLayoutedElements(nodes, edges, 'LR');
  }, [nodes, edges]);

  // 2. Prepare Display Nodes (Applying Search & Cycle Highlighting)
  const displayNodes = useMemo(() => {
    const query = (searchQuery || '').trim().toLowerCase();
    
    return layoutedData.nodes.map((node) => {
      const nodeLabel = (node.data?.label || '').toLowerCase();
      const matchesSearch = query ? nodeLabel.includes(query) : false;
      const isCycleNode = activeCycleNodes ? activeCycleNodes.includes(node.id) : false;

      let isDimmed = false;
      if (query && !matchesSearch) isDimmed = true;
      if (activeCycleNodes && !isCycleNode) isDimmed = true;

      return {
        ...node,
        data: {
          ...node.data,
          isSearchMatched: matchesSearch,
          isCycleHighlighted: isCycleNode,
          isDimmed,
        },
      };
    });
  }, [layoutedData.nodes, searchQuery, activeCycleNodes]);

  // 3. Filter and Style Display Edges
  const displayEdges = useMemo(() => {
    return layoutedData.edges
      .filter((edge) => {
        const edgeLatency = edge.data?.latency_ms || 0;
        return edgeLatency >= latencyThreshold;
      })
      .map((edge) => {
        const isCircular = Boolean(edge.data?.is_circular);
        const latency = edge.data?.latency_ms || 0;
        const isCycleEdge = activeCycleEdges ? activeCycleEdges.includes(edge.id) : false;

        let strokeColor = '#10b981'; // Green <100ms
        if (isCircular) strokeColor = '#ef4444';
        else if (latency > 250) strokeColor = '#ef4444'; // High >250ms
        else if (latency >= 100) strokeColor = '#f59e0b'; // Elevated 100-250ms

        let opacity = 1;
        if (activeCycleEdges && !isCycleEdge) opacity = 0.2;

        return {
          ...edge,
          animated: isCircular || isCycleEdge,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color: strokeColor,
          },
          style: {
            stroke: strokeColor,
            strokeWidth: isCycleEdge ? 5 : isCircular ? 4 : 2,
            opacity
          },
        };
      });
  }, [layoutedData.edges, latencyThreshold, activeCycleEdges]);

  return (
    <div className="flex-1 h-full relative bg-[#080c14] overflow-hidden">
      <ReactFlow
        key={`rf-canvas-${displayNodes.length}-${displayEdges.length}`}
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2.5}
        onNodeClick={(_, node) => {
          if (onSelectNode) {
            const nodeId = node.id;
            
            const incoming = edges
              .filter(e => e.target === nodeId)
              .map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                latency_ms: e.data?.latency_ms || 0,
                is_circular: Boolean(e.data?.is_circular)
              }));

            const outgoing = edges
              .filter(e => e.source === nodeId)
              .map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                latency_ms: e.data?.latency_ms || 0,
                is_circular: Boolean(e.data?.is_circular)
              }));

            onSelectNode({
              id: nodeId,
              name: node.data?.label || nodeId,
              status: node.data?.status || 'healthy',
              connectionCount: node.data?.connectionCount || 0,
              incoming,
              outgoing
            });
          }
        }}
        onEdgeClick={(_, edge) => {
          if (onSelectEdge) {
            onSelectEdge(edge);
          }
        }}
        onPaneClick={() => {
          if (onSelectNode) onSelectNode(null);
          if (onSelectEdge) onSelectEdge(null);
        }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
      >
        <Background color="#1e293b" gap={24} size={1.5} />
        <Controls position="bottom-right" className="m-4 text-[#080c14]" />
      </ReactFlow>

      {/* Canvas Top Controls & Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        
        {/* Topology Active Status Badge */}
        <div className="pointer-events-auto flex items-center space-x-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3.5 py-2 rounded-xl text-xs shadow-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-slate-300 font-medium font-mono">Dagre Hierarchical Layout Active</span>
        </div>

        {/* Req 13: Service Search Bar */}
        <div className="pointer-events-auto flex items-center space-x-2 bg-[#0c1220]/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-xl">
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search service..."
            className="bg-transparent text-slate-100 text-xs font-mono outline-none w-36 sm:w-48 placeholder:text-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-0.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
