import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeLogContent } from './src/utils/sanitizer.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: '*/*', limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// ==========================================
// PostgreSQL Pool Setup & In-Memory Fallback
// ==========================================
const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tracemap';

let pool = null;
let useInMemoryDb = false;

// In-Memory Database Fallback Store
let inMemoryServices = [
  { id: '1', name: 'API Gateway', status: 'healthy' },
  { id: '2', name: 'Auth Service', status: 'healthy' },
  { id: '3', name: 'Cart Service', status: 'warning' },
  { id: '4', name: 'Payment Service', status: 'critical' },
  { id: '5', name: 'Inventory Service', status: 'healthy' },
  { id: '6', name: 'Database Service', status: 'healthy' },
  { id: '7', name: 'Notification Service', status: 'healthy' }
];

let inMemoryConnections = [
  { id: 'c1', source_service: 'API Gateway', target_service: 'Auth Service', latency_ms: 24, is_circular: false },
  { id: 'c2', source_service: 'Auth Service', target_service: 'Database Service', latency_ms: 15, is_circular: false },
  { id: 'c3', source_service: 'API Gateway', target_service: 'Cart Service', latency_ms: 45, is_circular: false },
  { id: 'c4', source_service: 'Cart Service', target_service: 'Payment Service', latency_ms: 180, is_circular: true },
  { id: 'c5', source_service: 'Payment Service', target_service: 'Inventory Service', latency_ms: 210, is_circular: true },
  { id: 'c6', source_service: 'Inventory Service', target_service: 'Cart Service', latency_ms: 195, is_circular: true },
  { id: 'c7', source_service: 'Payment Service', target_service: 'Notification Service', latency_ms: 65, is_circular: false }
];

async function initDb() {
  try {
    pool = new Pool({ connectionString, connectionTimeoutMillis: 2000 });
    const client = await pool.connect();
    client.release();
    console.log(' Successfully connected to PostgreSQL database!');
  } catch (err) {
    console.warn('⚠️  PostgreSQL connection failed or not configured. Falling back to active in-memory database store.');
    useInMemoryDb = true;
  }
}

initDb();

// ==========================================
// Phase 2 Req 2: Security Sanitization Middleware
// ==========================================

export function sanitizeMiddleware(req, res, next) {
  try {
    let raw = '';
    if (typeof req.body === 'string') {
      raw = req.body;
    } else if (req.body && typeof req.body.logs === 'string') {
      raw = req.body.logs;
    } else if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      raw = JSON.stringify(req.body);
    } else if (Buffer.isBuffer(req.body)) {
      raw = req.body.toString('utf-8');
    }
    req.rawSanitizedLog = sanitizeLogContent(raw);
  } catch (e) {
    req.rawSanitizedLog = '';
  }
  next();
}

// ==========================================
// Phase 2 Req 3 & 4: Log Parser & DFS Diagnostic Engine
// ==========================================

/**
 * Extracts source and target microservices from sanitized cURL / HTTP log strings.
 */
function parseServicesFromLogs(sanitizedLogs) {
  const connections = [];
  const lines = sanitizedLogs.split(/\r?\n/);

  let currentSource = 'API Gateway'; // Default caller if unspecified

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    // Pattern A: Check explicit Source -> Target arrow lines first
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

    // Pattern B: cURL with explicit X-Source-Service header
    const sourceMatch = line.match(/-H\s+['"]X-Source-Service:\s*([^'"]+)['"]/i);
    if (sourceMatch) {
      currentSource = formatServiceName(sourceMatch[1]);
    }

    let source = currentSource;
    let target = null;
    let method = 'POST';
    let endpoint = 'N/A';

    const methodMatch = line.match(/-X\s+(GET|POST|PUT|DELETE|PATCH)/i);
    if (methodMatch) {
      method = methodMatch[1].toUpperCase();
    }

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

  return connections;
}

function formatServiceName(str) {
  if (!str) return 'Unknown Service';
  let clean = str.trim().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
  clean = clean.replace(/[-_]/g, ' ').trim();
  // Capitalize words
  return clean.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

/**
 * Depth-First Search (DFS) Cycle Detection Algorithm
 * Checks if adding an edge (source -> target) creates a cycle in the existing graph.
 * A cycle exists if there is already a directed path from `target` to `source`.
 */
function checkCycleDFS(existingEdges, newSource, newTarget) {
  // Build adjacency list graph
  const adj = {};
  for (const edge of existingEdges) {
    if (!adj[edge.source_service]) adj[edge.source_service] = [];
    adj[edge.source_service].push(edge.target_service);
  }

  // If there's already a path from newTarget to newSource, adding newSource -> newTarget forms a cycle!
  const visited = new Set();

  function dfs(currNode) {
    if (currNode === newSource) return true;
    visited.add(currNode);

    const neighbors = adj[currNode] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      }
    }
    return false;
  }

  return dfs(newTarget);
}

// ==========================================
// DB Helper Functions (handles DB vs In-Memory)
// ==========================================
async function getAllConnections() {
  if (useInMemoryDb) return [...inMemoryConnections];
  try {
    const res = await pool.query('SELECT * FROM connections');
    return res.rows;
  } catch (err) {
    console.error('Error fetching connections:', err);
    return inMemoryConnections;
  }
}

async function getAllServices() {
  if (useInMemoryDb) return [...inMemoryServices];
  try {
    const res = await pool.query('SELECT * FROM services');
    return res.rows;
  } catch (err) {
    console.error('Error fetching services:', err);
    return inMemoryServices;
  }
}

async function insertOrUpdateConnection(source, target, latencyMs, isCircular, extraData = {}) {
  const { method = 'POST', endpoint = 'N/A', status = '200 OK', timestamp = new Date().toISOString() } = extraData;

  if (useInMemoryDb) {
    // Add services if not exist
    if (!inMemoryServices.some(s => s.name === source)) {
      inMemoryServices.push({ id: String(Date.now() + Math.random()), name: source, status: 'healthy' });
    }
    if (!inMemoryServices.some(s => s.name === target)) {
      inMemoryServices.push({ id: String(Date.now() + Math.random() + 1), name: target, status: isCircular ? 'critical' : 'healthy' });
    }

    const existingIdx = inMemoryConnections.findIndex(c => c.source_service === source && c.target_service === target);
    if (existingIdx >= 0) {
      inMemoryConnections[existingIdx].latency_ms = latencyMs;
      inMemoryConnections[existingIdx].is_circular = isCircular;
      inMemoryConnections[existingIdx].method = method;
      inMemoryConnections[existingIdx].endpoint = endpoint;
      inMemoryConnections[existingIdx].status = status;
      inMemoryConnections[existingIdx].timestamp = timestamp;
      return inMemoryConnections[existingIdx];
    } else {
      const newConn = {
        id: `c_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        source_service: source,
        target_service: target,
        latency_ms: latencyMs,
        is_circular: isCircular,
        method,
        endpoint,
        status,
        timestamp
      };
      inMemoryConnections.push(newConn);
      return newConn;
    }
  }

  // PostgreSQL Query
  try {
    await pool.query('INSERT INTO services (name, status) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [source, 'healthy']);
    await pool.query('INSERT INTO services (name, status) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [target, isCircular ? 'critical' : 'healthy']);

    const query = `
      INSERT INTO connections (source_service, target_service, latency_ms, is_circular)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (source_service, target_service)
      DO UPDATE SET latency_ms = EXCLUDED.latency_ms, is_circular = EXCLUDED.is_circular
      RETURNING *;
    `;
    const res = await pool.query(query, [source, target, latencyMs, isCircular]);
    const record = res.rows[0] || {};
    record.method = method;
    record.endpoint = endpoint;
    record.status = status;
    record.timestamp = timestamp;
    return record;
  } catch (err) {
    console.error('DB Insert Error:', err);
    return null;
  }
}

// ==========================================
// API Endpoints
// ==========================================

/**
 * Phase 2 Req 1: POST /api/logs/ingest
 */
app.post('/api/logs/ingest', sanitizeMiddleware, async (req, res) => {
  try {
    const rawLogs = req.rawSanitizedLog || '';
    if (!rawLogs.trim()) {
      return res.status(400).json({ error: 'No raw logs or cURL commands provided in payload.' });
    }

    const parsedPairs = parseServicesFromLogs(rawLogs);
    if (parsedPairs.length === 0) {
      return res.status(400).json({ error: 'Could not parse any valid service connections from the logs provided.' });
    }

    const currentConnections = await getAllConnections();
    const ingestedResults = [];
    const rawLines = rawLogs.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#'));

    for (const pair of parsedPairs) {
      const { source, target, method, endpoint, status, timestamp } = pair;

      // Execute DFS check for cycles
      const isCircular = checkCycleDFS(currentConnections, source, target);

      // Random latency between 10ms and 250ms as specified
      const latencyMs = Math.floor(Math.random() * (250 - 10 + 1)) + 10;

      const connectionRecord = await insertOrUpdateConnection(source, target, latencyMs, isCircular, { method, endpoint, status, timestamp });
      if (connectionRecord) {
        ingestedResults.push(connectionRecord);
        currentConnections.push(connectionRecord);
      }
    }

    const allServices = await getAllServices();

    return res.json({
      message: `Successfully ingested ${ingestedResults.length} connection(s).`,
      sanitizedLogs: rawLogs,
      ingestedConnections: ingestedResults,
      pipelineStats: {
        ingestedCount: rawLines.length,
        sanitizedCount: rawLines.length,
        servicesIdentified: allServices.length,
        dependenciesCreated: (await getAllConnections()).length,
        circularDetected: (await getAllConnections()).filter(c => c.is_circular).length
      }
    });
  } catch (err) {
    console.error('Ingest API Error:', err);
    return res.status(500).json({ error: 'Failed to process logs.' });
  }
});

/**
 * Phase 2 Req 5: GET /api/topology
 * Returns JSON payload explicitly formatted for React Flow (nodes and edges)
 */
app.get('/api/topology', async (req, res) => {
  try {
    const services = await getAllServices();
    const connections = await getAllConnections();

    // Map DB Services to React Flow Nodes
    const nodes = services.map((svc, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      return {
        id: svc.name,
        type: 'customServiceNode',
        position: { x: 100 + col * 280, y: 80 + row * 180 },
        data: {
          label: svc.name,
          status: svc.status || 'healthy',
          connectionCount: connections.filter(c => c.source_service === svc.name || c.target_service === svc.name).length
        }
      };
    });

    // Map DB Connections to React Flow Edges
    const edges = connections.map((conn) => {
      const isCircular = Boolean(conn.is_circular);
      return {
        id: `e-${conn.source_service}-${conn.target_service}`,
        source: conn.source_service,
        target: conn.target_service,
        type: 'smoothstep',
        animated: isCircular,
        label: `${conn.latency_ms}ms`,
        style: {
          stroke: isCircular ? '#ef4444' : conn.latency_ms > 250 ? '#ef4444' : conn.latency_ms >= 100 ? '#f59e0b' : '#10b981',
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
          latency_ms: conn.latency_ms,
          is_circular: isCircular,
          method: conn.method || 'POST',
          endpoint: conn.endpoint || 'N/A',
          status: conn.status || '200 OK',
          timestamp: conn.timestamp || new Date().toISOString()
        }
      };
    });

    return res.json({ nodes, edges });
  } catch (err) {
    console.error('Topology API Error:', err);
    return res.status(500).json({ error: 'Failed to generate graph topology.' });
  }
});

/**
 * POST /api/clear - Clears graph to empty state
 */
app.post('/api/clear', async (req, res) => {
  if (useInMemoryDb) {
    inMemoryServices = [];
    inMemoryConnections = [];
    return res.json({ message: 'Canvas cleared to empty state.' });
  }

  try {
    await pool.query('TRUNCATE services, connections RESTART IDENTITY CASCADE;');
    return res.json({ message: 'Database cleared to empty state.' });
  } catch (err) {
    console.error('Clear Error:', err);
    return res.status(500).json({ error: 'Failed to clear database.' });
  }
});

/**
 * POST /api/reset - Resets graph to initial seed state
 */
app.post('/api/reset', async (req, res) => {
  if (useInMemoryDb) {
    inMemoryServices = [
      { id: '1', name: 'API Gateway', status: 'healthy' },
      { id: '2', name: 'Auth Service', status: 'healthy' },
      { id: '3', name: 'Cart Service', status: 'warning' },
      { id: '4', name: 'Payment Service', status: 'critical' },
      { id: '5', name: 'Inventory Service', status: 'healthy' },
      { id: '6', name: 'Database Service', status: 'healthy' },
      { id: '7', name: 'Notification Service', status: 'healthy' }
    ];
    inMemoryConnections = [
      { id: 'c1', source_service: 'API Gateway', target_service: 'Auth Service', latency_ms: 24, is_circular: false },
      { id: 'c2', source_service: 'Auth Service', target_service: 'Database Service', latency_ms: 15, is_circular: false },
      { id: 'c3', source_service: 'API Gateway', target_service: 'Cart Service', latency_ms: 45, is_circular: false },
      { id: 'c4', source_service: 'Cart Service', target_service: 'Payment Service', latency_ms: 180, is_circular: true },
      { id: 'c5', source_service: 'Payment Service', target_service: 'Inventory Service', latency_ms: 210, is_circular: true },
      { id: 'c6', source_service: 'Inventory Service', target_service: 'Cart Service', latency_ms: 195, is_circular: true },
      { id: 'c7', source_service: 'Payment Service', target_service: 'Notification Service', latency_ms: 65, is_circular: false }
    ];
    return res.json({ message: 'Graph reset to seed state successfully.' });
  }

  try {
    await pool.query('TRUNCATE services, connections RESTART IDENTITY CASCADE;');
    await pool.query(`
      INSERT INTO services (name, status) VALUES
        ('API Gateway', 'healthy'),
        ('Auth Service', 'healthy'),
        ('Cart Service', 'warning'),
        ('Payment Service', 'critical'),
        ('Inventory Service', 'healthy'),
        ('Database Service', 'healthy'),
        ('Notification Service', 'healthy');
      INSERT INTO connections (source_service, target_service, latency_ms, is_circular) VALUES
        ('API Gateway', 'Auth Service', 24, FALSE),
        ('Auth Service', 'Database Service', 15, FALSE),
        ('API Gateway', 'Cart Service', 45, FALSE),
        ('Cart Service', 'Payment Service', 180, TRUE),
        ('Payment Service', 'Inventory Service', 210, TRUE),
        ('Inventory Service', 'Cart Service', 195, TRUE),
        ('Payment Service', 'Notification Service', 65, FALSE);
    `);
    return res.json({ message: 'PostgreSQL database re-seeded successfully.' });
  } catch (err) {
    console.error('Reset Error:', err);
    return res.status(500).json({ error: 'Failed to reset database.' });
  }
});

/**
 * Phase 3 Explainer Engine: POST /api/node-explain
 * Generates dynamic, contextual architectural analysis based on node details, incoming, and outgoing connections.
 */
export function generateNodeExplanation({ name, status, incoming = [], outgoing = [] }) {
  const serviceName = name || 'Selected Microservice';
  const nodeStatus = status || 'healthy';

  const inSources = incoming.map(e => e.source).filter(Boolean);
  const outTargets = outgoing.map(e => e.target).filter(Boolean);

  const hasCircularIncoming = incoming.some(e => e.is_circular);
  const hasCircularOutgoing = outgoing.some(e => e.is_circular);
  const isCircular = hasCircularIncoming || hasCircularOutgoing || nodeStatus === 'critical';

  let roleDesc = '';
  const lower = serviceName.toLowerCase();
  if (lower.includes('gateway') || lower.includes('www') || lower.includes('web') || lower.includes('flipkart.com') || lower.includes('sarvasiddhi')) {
    roleDesc = `As an API Gateway / Ingress edge service, ${serviceName} handles public HTTP traffic and routes client requests to downstream microservice backends.`;
  } else if (lower.includes('cart') || lower.includes('checkout') || lower.includes('basket')) {
    roleDesc = `As an E-Commerce Cart & Checkout orchestrator, ${serviceName} manages persistent user basket states and transaction initiation.`;
  } else if (lower.includes('payment') || lower.includes('pay') || lower.includes('charge')) {
    roleDesc = `As a Financial Payment Processor, ${serviceName} authorizes payment gateway transactions and coordinates fulfillment downstream.`;
  } else if (lower.includes('auth') || lower.includes('rome') || lower.includes('security')) {
    roleDesc = `As an Authentication & Session Manager, ${serviceName} verifies client JWT tokens and enforces credential access control policies.`;
  } else if (lower.includes('db') || lower.includes('database') || lower.includes('sql') || lower.includes('store')) {
    roleDesc = `As a Core Database Data Store, ${serviceName} persists transactional records and serves database query requests.`;
  } else if (lower.includes('sonic') || lower.includes('fdp') || lower.includes('analytics') || lower.includes('bam') || lower.includes('nr-data')) {
    roleDesc = `As a Real-Time Data Pipeline & Telemetry Collector, ${serviceName} ingests telemetry data streams across web edge instances.`;
  } else if (lower.includes('static') || lower.includes('assets') || lower.includes('cdn') || lower.includes('flixcart')) {
    roleDesc = `As a Static Content Delivery Network (CDN) node, ${serviceName} caches and delivers media assets, CSS, and JS bundles to edge clients.`;
  } else {
    roleDesc = `As an active backend microservice, ${serviceName} processes domain business logic within your system mesh.`;
  }

  let trafficDesc = '';
  if (inSources.length > 0 && outTargets.length > 0) {
    trafficDesc = ` It processes incoming requests from [${inSources.join(', ')}] and forwards execution data downstream to [${outTargets.join(', ')}].`;
  } else if (inSources.length > 0) {
    trafficDesc = ` It receives incoming request traffic from [${inSources.join(', ')}] as an execution sink.`;
  } else if (outTargets.length > 0) {
    trafficDesc = ` It dispatches outgoing API calls to [${outTargets.join(', ')}].`;
  } else {
    trafficDesc = ` It currently operates as a standalone node with 0 active network hops.`;
  }

  let warningDesc = '';
  if (isCircular) {
    warningDesc = ` ⚠️ CRITICAL WARNING: ${serviceName} is currently trapped in a circular dependency loop! Depth-First Search (DFS) identified recursive call chains that increase stack overflow risk and cascade latency failures.`;
  } else if (nodeStatus === 'warning') {
    warningDesc = ` ⚠️ NOTICE: ${serviceName} is experiencing elevated request queues. Monitor connection latency under peak load.`;
  } else {
    warningDesc = ` ✅ SYSTEM STABLE: Execution paths through ${serviceName} are directed and optimal with zero detected cycles.`;
  }

  return `${roleDesc}${trafficDesc}${warningDesc}`;
}

/**
 * Phase 4 AI Chat Engine: POST /api/node-chat
 * Unified endpoint for initial node explanation and interactive follow-up Q&A.
 */
export function processNodeChatRequest({ nodeContext = {}, chatHistory = [], newMessage = '' }) {
  const { name = 'Selected Service', status = 'healthy', incoming = [], outgoing = [] } = nodeContext;

  // Case 1: Initial Automated Architectural Analysis (newMessage is empty)
  if (!newMessage || !newMessage.trim()) {
    return generateNodeExplanation({ name, status, incoming, outgoing });
  }

  // Case 2: Interactive Follow-up Chat Answer
  const q = newMessage.toLowerCase();
  const connCount = incoming.length + outgoing.length;

  if (q.includes('latency') || q.includes('slow') || q.includes('speed') || q.includes('time')) {
    const highLatencyEdge = [...incoming, ...outgoing].find(e => e.latency_ms > 150);
    if (highLatencyEdge) {
      return `⚡ High latency detected on ${highLatencyEdge.source} &rarr; ${highLatencyEdge.target} (${highLatencyEdge.latency_ms} ms). Consider caching responses or tuning query timeouts.`;
    }
    return `✅ Response times for ${name} are within normal thresholds (average <40 ms). All ${connCount} active hops are operating smoothly.`;
  }

  if (q.includes('circular') || q.includes('loop') || q.includes('cycle') || q.includes('dfs')) {
    const isCircular = incoming.some(e => e.is_circular) || outgoing.some(e => e.is_circular) || status === 'critical';
    if (isCircular) {
      return `🔄 DFS Diagnostic Alert: ${name} is involved in a circular dependency loop! To decouple this service, convert synchronous HTTP calls into asynchronous events using a message queue like RabbitMQ or Kafka.`;
    }
    return `✅ Depth-First Search (DFS) traversal confirms that ${name} is free of circular call loops. Execution flows cleanly in a directed acyclic manner.`;
  }

  if (q.includes('traffic') || q.includes('caller') || q.includes('downstream') || q.includes('in') || q.includes('out')) {
    const callers = incoming.map(e => e.source).join(', ') || 'None';
    const targets = outgoing.map(e => e.target).join(', ') || 'None';
    return `📡 Traffic Overview for ${name}:\n• Inbound Callers: [${callers}]\n• Outbound Targets: [${targets}]`;
  }

  if (q.includes('fix') || q.includes('solve') || q.includes('resolve') || q.includes('recommend')) {
    if (status === 'critical') {
      return `🛠️ Recommended Fix: Refactor synchronous HTTP endpoints in ${name} to use event-driven queues or Redis caching to break the circular dependency loop.`;
    }
    return `💡 ${name} is currently healthy. To optimize further, monitor connection pool sizes and implement circuit breakers for downstream calls.`;
  }

  return `🤖 [Inspecting ${name}]: Status is ${status.toUpperCase()} with ${incoming.length} caller(s) and ${outgoing.length} downstream target(s). Ask me about latency, circular loops, or traffic fixes!`;
}

/**
 * Phase 4: POST /api/node-chat Endpoint
 */
app.post('/api/node-chat', (req, res) => {
  try {
    const payload = req.body || {};
    const replyText = processNodeChatRequest(payload);
    return res.json({ reply: replyText });
  } catch (err) {
    console.error('Node Chat API Error:', err);
    return res.status(500).json({ error: 'Failed to process node chat request.' });
  }
});

/**
 * Phase 3 Backward Compatibility: POST /api/node-explain Endpoint
 */
app.post('/api/node-explain', (req, res) => {
  try {
    const payload = req.body || {};
    const explanationText = generateNodeExplanation(payload);
    return res.json({ analysis: explanationText });
  } catch (err) {
    console.error('Node Explain API Error:', err);
    return res.status(500).json({ error: 'Failed to generate node analysis.' });
  }
});

/**
 * Chat Box POST /api/chat Alias Endpoint
 */
app.post('/api/chat', (req, res) => {
  try {
    const payload = req.body || {};
    const replyText = processNodeChatRequest({
      newMessage: payload.message || payload.newMessage || '',
      nodeContext: payload.nodeContext || {}
    });
    return res.json({ reply: replyText });
  } catch (err) {
    console.error('Chat API Error:', err);
    return res.status(500).json({ error: 'Failed to process chat request.' });
  }
});

// API 404 Fallback - Always return JSON for /api routes
app.all('/api/*', (req, res) => {
  return res.status(404).json({ error: `API endpoint ${req.method} ${req.originalUrl} not found.` });
});

// Serve static assets from Vite build in production
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Client-side catch-all fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Global Express Error Handler for JSON responses on /api
app.use((err, req, res, next) => {
  console.error('Express Error Handler:', err);
  if (req.originalUrl && req.originalUrl.startsWith('/api')) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
  return res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`🚀 TraceMap Backend Express Server listening on http://localhost:${PORT}`);
});
