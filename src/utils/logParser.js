import { sanitizeLogContent } from './sanitizer';

export function formatServiceName(str) {
  if (!str) return 'Unknown Service';
  let clean = str.trim().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
  clean = clean.replace(/[-_]/g, ' ').trim();
  return clean.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export function parseLogsClient(rawInput) {
  const sanitizedLogs = sanitizeLogContent(rawInput || '');
  const lines = sanitizedLogs.split(/\r?\n/);
  const connections = [];

  let currentSource = 'API Gateway';

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    const customLineMatch = line.match(/^([\w\s-]+)\s*(?:->|calls|requests)\s*([\w\s-]+)$/i);
    if (customLineMatch) {
      const source = formatServiceName(customLineMatch[1]);
      const target = formatServiceName(customLineMatch[2]);
      if (source && target && source !== target) {
        connections.push({
          source,
          target,
          method: 'POST',
          endpoint: 'N/A',
          status: '200 OK',
          timestamp: new Date().toISOString()
        });
        currentSource = target;
      }
      continue;
    }

    const sourceMatch = line.match(/-H\s+['"]X-Source-Service:\s*([^'"]+)['"]/i);
    if (sourceMatch) {
      currentSource = formatServiceName(sourceMatch[1]);
    }

    let source = currentSource;
    let target = null;
    let method = 'POST';
    let endpoint = 'N/A';

    const methodMatch = line.match(/-X\s+(GET|POST|PUT|DELETE|PATCH)/i);
    if (methodMatch) method = methodMatch[1].toUpperCase();

    const urlMatch = line.match(/https?:\/\/([a-zA-Z0-9.-]+(?::\d+)?)([^'\s\\]*)/i);
    if (urlMatch) {
      target = formatServiceName(urlMatch[1]);
      endpoint = urlMatch[2] || '/';
    }

    const invalidNames = ['Curl', 'Post', 'Get', 'Put', 'Delete', 'X', 'H', 'D', 'Header', 'Unknown Service'];
    if (source && target && !invalidNames.includes(target) && !invalidNames.includes(source)) {
      if (source !== target) {
        connections.push({
          source,
          target,
          method,
          endpoint,
          status: '200 OK',
          timestamp: new Date().toISOString()
        });
        currentSource = target;
      }
    }
  }

  // Collect unique service names
  const serviceSet = new Set();
  connections.forEach(c => {
    serviceSet.add(c.source);
    serviceSet.add(c.target);
  });

  const services = Array.from(serviceSet);

  // DFS Cycle Check
  const adj = {};
  connections.forEach(c => {
    if (!adj[c.source]) adj[c.source] = [];
    adj[c.source].push(c.target);
  });

  function hasCyclePath(src, tgt) {
    const visited = new Set();
    function dfs(curr) {
      if (curr === src) return true;
      visited.add(curr);
      for (const nxt of adj[curr] || []) {
        if (!visited.has(nxt) && dfs(nxt)) return true;
      }
      return false;
    }
    return dfs(tgt);
  }

  // Format React Flow Nodes
  const nodes = services.map((svc, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const connCount = connections.filter(c => c.source === svc || c.target === svc).length;
    return {
      id: svc,
      type: 'customServiceNode',
      position: { x: 100 + col * 280, y: 80 + row * 180 },
      data: {
        label: svc,
        status: 'healthy',
        connectionCount: connCount
      }
    };
  });

  // Format React Flow Edges
  const edges = connections.map((conn) => {
    const isCircular = hasCyclePath(conn.source, conn.target);
    const latencyMs = Math.floor(Math.random() * (250 - 10 + 1)) + 10;
    return {
      id: `e-${conn.source}-${conn.target}`,
      source: conn.source,
      target: conn.target,
      type: 'smoothstep',
      animated: isCircular,
      label: `${latencyMs}ms`,
      style: {
        stroke: isCircular ? '#ef4444' : latencyMs > 250 ? '#ef4444' : latencyMs >= 100 ? '#f59e0b' : '#10b981',
        strokeWidth: isCircular ? 4 : 2,
      },
      labelStyle: {
        fill: isCircular ? '#fca5a5' : '#cbd5e1',
        fontWeight: 700,
        fontSize: 12
      },
      labelBgStyle: {
        fill: isCircular ? '#7f1d1d' : '#1e293b',
        fillOpacity: 0.85,
        rx: 4
      },
      data: {
        latency_ms: latencyMs,
        is_circular: isCircular,
        method: conn.method,
        endpoint: conn.endpoint,
        status: conn.status,
        timestamp: conn.timestamp
      }
    };
  });

  // Update node statuses if involved in circular loop
  edges.forEach(e => {
    if (e.data?.is_circular) {
      const srcNode = nodes.find(n => n.id === e.source);
      const tgtNode = nodes.find(n => n.id === e.target);
      if (srcNode) srcNode.data.status = 'critical';
      if (tgtNode) tgtNode.data.status = 'critical';
    }
  });

  const rawLines = rawInput.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#'));

  return {
    nodes,
    edges,
    pipelineStats: {
      ingestedCount: rawLines.length,
      sanitizedCount: rawLines.length,
      servicesIdentified: nodes.length,
      dependenciesCreated: edges.length,
      circularDetected: edges.filter(e => e.data?.is_circular).length
    }
  };
}
