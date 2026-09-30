/**
 * Graph Diagnostic Engine:
 * Analyzes nodes and edges for:
 * 1. Circular Dependencies (Cycles via DFS traversal)
 * 2. High Latency Hops (> 200 ms)
 * 3. Potential Bottlenecks / SPOFs (Services with multiple connections)
 */

export function analyzeGraphDiagnostics(nodes = [], edges = []) {
  const issues = [];
  const cycles = findSimpleCycles(nodes, edges);
  
  // 1. Circular Dependency Issues
  cycles.forEach((cycle, index) => {
    issues.push({
      id: `cycle-${index + 1}`,
      type: 'circular',
      severity: 'critical',
      title: `Circular Dependency #${index + 1}`,
      path: cycle.pathString,
      nodes: cycle.nodes,
      edgeIds: cycle.edgeIds,
      description: `Recursive call loop detected: ${cycle.pathString}`
    });
  });

  // 2. High Latency Issues
  edges.forEach((edge) => {
    const latency = edge.data?.latency_ms || 0;
    if (latency > 200) {
      issues.push({
        id: `latency-${edge.id}`,
        type: 'latency',
        severity: latency > 250 ? 'critical' : 'warning',
        title: 'High Latency Connection',
        path: `${edge.source} → ${edge.target}`,
        latency,
        description: `${edge.source} → ${edge.target} (${latency} ms)`
      });
    }
  });

  // 3. Potential Bottleneck / SPOF Issues
  const connectionCounts = {};
  nodes.forEach(n => { connectionCounts[n.id] = { in: 0, out: 0, name: n.data?.label || n.id }; });

  edges.forEach(e => {
    if (connectionCounts[e.source]) connectionCounts[e.source].out += 1;
    if (connectionCounts[e.target]) connectionCounts[e.target].in += 1;
  });

  Object.entries(connectionCounts).forEach(([nodeId, info]) => {
    const total = info.in + info.out;
    if (total >= 4 || info.in >= 3) {
      issues.push({
        id: `bottleneck-${nodeId}`,
        type: 'bottleneck',
        severity: 'warning',
        title: 'Potential Bottleneck / SPOF',
        nodeId,
        nodeName: info.name,
        description: `${info.name} (Handling ${total} network hops across ${info.in} inbound & ${info.out} outbound calls)`
      });
    }
  });

  return {
    cycles,
    issues,
    hasIssues: issues.length > 0
  };
}

/**
 * Finds all simple directed cycles in graph
 */
function findSimpleCycles(nodes = [], edges = []) {
  const adj = {};
  const edgeMap = {};

  nodes.forEach(n => { adj[n.id] = []; });
  edges.forEach(e => {
    if (!adj[e.source]) adj[e.source] = [];
    adj[e.source].push(e.target);
    edgeMap[`${e.source}->${e.target}`] = e.id;
  });

  const rawCycles = [];
  const visited = new Set();
  const path = [];

  function dfs(curr, startNode) {
    path.push(curr);
    visited.add(curr);

    const neighbors = adj[curr] || [];
    for (const next of neighbors) {
      if (next === startNode && path.length >= 2) {
        rawCycles.push([...path, startNode]);
      } else if (!visited.has(next)) {
        dfs(next, startNode);
      }
    }

    path.pop();
    visited.delete(curr);
  }

  nodes.forEach(n => {
    dfs(n.id, n.id);
  });

  // Deduplicate cycles by normalizing starting node
  const uniqueCycles = [];
  const seenKeys = new Set();

  for (const c of rawCycles) {
    const nodesInCycle = c.slice(0, -1);
    if (nodesInCycle.length < 2) continue;

    const minNode = [...nodesInCycle].sort()[0];
    const minIdx = nodesInCycle.indexOf(minNode);
    const normalized = [
      ...nodesInCycle.slice(minIdx),
      ...nodesInCycle.slice(0, minIdx)
    ];
    const key = normalized.join('->');

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      const cycleWithLoop = [...normalized, normalized[0]];
      const edgeIds = [];
      for (let i = 0; i < cycleWithLoop.length - 1; i++) {
        const eId = edgeMap[`${cycleWithLoop[i]}->${cycleWithLoop[i+1]}`];
        if (eId) edgeIds.push(eId);
      }

      uniqueCycles.push({
        nodes: cycleWithLoop,
        edgeIds,
        pathString: cycleWithLoop.join(' → ')
      });
    }
  }

  return uniqueCycles;
}
