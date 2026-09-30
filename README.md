# TraceMap - Microservice Dependency Visualizer & Diagnostic Engine

TraceMap is a microservice dependency visualizer that passively ingests raw application network call logs and cURL traces to map service architectures, sanitize sensitive request credentials, and flag circular dependency loops in real time using Depth-First Search (DFS).

---

## Tech Stack

- **Frontend:** React.js (Vite), Tailwind CSS, React Flow (`@xyflow/react`), Lucide React.
- **Backend:** Node.js, Express.js.
- **Database:** PostgreSQL (using `pg` driver) with active in-memory store fallback.

---

## Features & Architecture

### Phase 1: Database Architecture (`schema.sql`)
- **`services`**: UUID primary key, service name, operational status (`healthy`, `warning`, `critical`).
- **`connections`**: UUID primary key, source service, target service, latency (ms), and `is_circular` boolean flag.
- **Seed Architecture**: Pre-populates an e-commerce microservice architecture (`API Gateway`, `Auth Service`, `Cart Service`, `Payment Service`, `Inventory Service`, `Database Service`) with an intentional circular loop (`Cart -> Payment -> Inventory -> Cart`).

### Phase 2: Ingestion & Diagnostic Engine (`server.js`)
- **Security Middleware**: Aggressively strips authentication headers (`Authorization: Bearer <token>`, `Cookie`, `X-Api-Key`) and JSON request payloads (`-d '{...}'` or `--data '{...}'`), replacing them with `[REDACTED]`.
- **Log Parser**: Extracts caller and target services from cURL commands, headers (`X-Source-Service`), or text logs.
- **DFS Cycle Detection**: Executes a Depth-First Search (DFS) algorithm on existing connections before database insertion. If adding the edge creates a cycle, it flags `is_circular = true`.
- **`GET /api/topology`**: Formats nodes and edges for immediate rendering in React Flow.

### Phase 3: Interactive Canvas
- **Dark-Mode Developer Aesthetic**: Sleek slate & dark zinc layout with vibrant neon cyan and red glowing alerts.
- **80/20 Split Layout**: 20% left sidebar with cURL console & latency filter slider, 80% main React Flow graph canvas.
- **Visual Diagnostic Edges**: Standard directed gray arrows vs. glowing red animated lines for circular dependency loops.

---

## Quick Start Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. (Optional) Initialize PostgreSQL Database
If you have PostgreSQL running locally:
```bash
psql -U postgres -d postgres -f schema.sql
```
> *Note: If PostgreSQL is not running locally, `server.js` will automatically switch to the in-memory fallback store so you can test immediately without setup.*

### 3. Start Backend Express Server
```bash
npm run server
```
*Backend runs on `http://localhost:5000`*

### 4. Start Frontend React Vite App
In a new terminal tab:
```bash
npm run dev
```
*Frontend runs on `http://localhost:3000` with automatic API proxy to Express backend.*

---

## Testing Circular Dependency Detection with Custom cURL

Paste the following sample into the TraceMap log console:

```bash
curl -X POST http://cart-service:8080/checkout \
  -H "Authorization: Bearer my_secret_token_123" \
  -H "X-Source-Service: Cart Service" \
  -d '{"amount": 99.99}'

Cart Service -> Payment Service
Payment Service -> Inventory Service
Inventory Service -> Cart Service
```

Click **Generate Topology** to observe:
1. Regex sanitization converting tokens and `-d` bodies to `[REDACTED]`.
2. DFS detecting the cycle and highlighting the red pulsing edge.
