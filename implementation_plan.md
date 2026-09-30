# Implementation Plan - TraceMap Microservice Dependency Visualizer

TraceMap is a full-stack microservice dependency visualizer that ingests raw network logs and cURL traces, sanitizes sensitive data, detects circular dependency loops via Depth-First Search (DFS), and displays an interactive network topology graph using React Flow.

## User Review Required

> [!IMPORTANT]
> - **PostgreSQL Dependency**: The project uses PostgreSQL (`pg` package). A seed script and connection fallback to standard environment variables (`DATABASE_URL` or local `postgres://...`) will be included. An optional in-memory or SQLite fallback can be supported in `server.js` if a live Postgres server isn't running locally during instant testing.
> - **Tailwind CSS**: As requested, Tailwind CSS (v3 with Vite + PostCSS) will be used to craft a high-end dark-mode developer UI.
> - **React Flow**: `@xyflow/react` (or `reactflow`) will be used for interactive canvas visualization, featuring auto-layout algorithms (Dagre/Circular) so imported nodes render neatly without overlapping.

---

## Proposed Changes

### Root & Configuration

#### [NEW] `package.json`
Root `package.json` containing scripts for running both backend and frontend, and all requisite dependencies: `express`, `pg`, `cors`, `dotenv`, `react`, `react-dom`, `@xyflow/react`, `lucide-react`, `tailwindcss`, `postcss`, `autoprefixer`, `vite`.

#### [NEW] `vite.config.js`
Vite configuration configured with React plugin and proxy settings to route `/api` requests to the Express server (port 5000).

#### [NEW] `tailwind.config.js` & `postcss.config.js`
Tailwind CSS configuration set up with custom colors (dark mode palette, vibrant red glow for circular dependencies, neon cyan accents).

#### [NEW] `.env.example` & `README.md`
Documentation for database setup, running `schema.sql`, environment configuration, and starting server and frontend.

---

### Database Architecture

#### [NEW] `schema.sql`
- Table `services`: `id` (UUID), `name` (VARCHAR), `status` (VARCHAR).
- Table `connections`: `id` (UUID), `source_service` (VARCHAR), `target_service` (VARCHAR), `latency_ms` (INT), `is_circular` (BOOLEAN).
- Seed script populating a sample e-commerce microservice architecture (API Gateway, Auth, Cart, Payment, Inventory, Database) with an intentional circular loop: `Cart -> Payment -> Inventory -> Cart`.

---

### Backend Service (`server.js`)

#### [NEW] `server.js`
- **Express Server**: Listens on port 5000 with CORS and JSON/text parsing.
- **Security Middleware (`sanitizeLogs`)**: Aggressively strips out authentication headers (`Authorization: Bearer ...`, `Cookie: ...`, `X-Api-Key: ...`) and request body payloads (`-d '{...}'`, `--data '...'`, JSON bodies). Replaces sensitive matches with `[REDACTED]`.
- **Log Parser**: Extract source & target service identifiers from cURL text or HTTP call logs (e.g. parsing `curl -X POST http://payment-service/api/charge -H "X-Source-Service: cart-service"` or host/path conventions).
- **DFS Cycle Diagnostic Engine**: DFS graph traversal on existing DB connections prior to inserting a new edge. Sets `is_circular = true` if adding the edge forms a cycle. Assigns random latency (10ms - 250ms).
- **REST Endpoints**:
  - `POST /api/logs/ingest`: Accepts raw cURL/log payload, sanitizes, parses, detects cycles, and saves to DB.
  - `GET /api/topology`: Queries DB and outputs formatted React Flow JSON (`{ nodes, edges }`).
  - `POST /api/reset`: Resets/reseeds demo database state.

---

### Frontend Web Application

#### [NEW] `src/index.css`
Global styles, Tailwind directives, dark mode styling, custom animation keyframes for pulse red edges, custom scrollbars, and React Flow overlay styles.

#### [NEW] `src/App.jsx`
Main layout component:
- Header: TraceMap branding, system health metrics, reseed button, live status badge.
- Grid/Flex container: 20% Sidebar, 80% Main Graph Canvas area.

#### [NEW] `src/components/Sidebar.jsx`
- Raw log `<textarea>` for pasting cURL commands.
- Preset log sample buttons (e.g. "Load Circular Loop Trace", "Load Microservice Swarm").
- "Generate Topology" submit button triggering `/api/logs/ingest`.
- Sub-second latency slider filter ("Hide hops < X ms").
- Redacted log preview viewer showing sanitization in real time.
- Topology summary metrics (Active Services, Latency distribution, Circular dependency alerts).

#### [NEW] `src/components/GraphCanvas.jsx`
- React Flow visualizer rendering nodes and edges.
- Node layout engine (Dagre / layout calculation) so nodes auto-arrange gracefully.
- Custom Node Rendering: Service status badges, latency indicators, hover tooltips.
- Visual Diagnostics:
  - Standard edge: sleek dark/gray directed arrows.
  - Circular edge (`is_circular: true`): thick, animated, glowing bright red line (`#ef4444`) flagging points of failure.
- Built-in React Flow Controls: Zoom, Pan, Fit View, MiniMap, Dark Canvas Background.

---

## Verification Plan

### Automated / API Verification
- Run backend server and test `POST /api/logs/ingest` with cURL commands containing tokens and payloads to verify:
  1. Sanitization of tokens to `[REDACTED]`.
  2. Parsing of source and target services.
  3. DFS cycle detection correctly marking `is_circular = true`.
- Test `GET /api/topology` returns React Flow formatted nodes and edges.

### Manual & UI Verification
- Build and serve React app via Vite dev server.
- Verify 80/20 layout, dark mode aesthetic, React Flow canvas interactive zoom/pan/drag.
- Confirm pasting cURL commands ingests new services/edges into graph.
- Confirm circular dependencies glow red with animated strokes.
- Confirm latency slider filters visible graph nodes/edges dynamically.
