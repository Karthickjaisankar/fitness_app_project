# PulseFit — Unified Fitness Calendar, Wearable Rewards & Anti-Fraud Ledger

PulseFit is a modern, full-stack endurance sports platform designed to solve event fragmentation across India (Chennai, Bengaluru, Coimbatore, and nationwide). It unites **autonomous multi-source event calendar ingestion**, **biometric wearable activity synchronization (Strava & Apple HealthKit)**, **real-time anti-fraud verification**, and an **immutable double-entry reward ledger**.

---

## 🌟 Key Platform Features

1. **Interactive Event Radar Map (Leaflet Dark Matter)**
   - Custom athletic dark basemap powered by CartoDB Dark Matter.
   - Pulsating neon pins categorized by discipline: Running (Neon Green), Cycling (Cyan), and Triathlons (Gold).
   - Micro-geocoded precision for Chennai (Besant Nagar, Marina, Nehru Park), Bengaluru (Hennur, Cubbon Park, Sarjapur), and Coimbatore (VOC Park Ground, Race Course).
   - One-tap hub fly-to buttons and integrated registration modal with live points subsidy calculation.

2. **Hub-and-Spoke Sub-Agent Autonomous Lakehouse**
   - **Lead Data Engineering Orchestrator** dispatching targeted sub-agents (`townscript_worker`, `indiarunning_worker`, `brevet_worker`, `entity_dedup_arbiter`).
   - Medallion Architecture:
     - **Bronze**: Untouched raw JSON scrape archive with SHA-256 content hashing.
     - **Silver**: Zod-validated normalized schemas with typed ISO dates, numeric INR prices, and lat/long geocodes.
     - **Gold**: Canonical deduplicated event calendar with merged ticket provider links.
     - **DLQ**: Quarantines malformed records with failure diagnostic codes (`MISSING_DATE`, `UNRESOLVED_GEO`).
   - Anti-Bot resilience: Change Data Capture (CDC) to avoid unnecessary requests, internal JSON API reverse-engineering, and real CDP browser fallback.

3. **Biometric Anti-Fraud Engine**
   - Heuristic velocity cutoffs (>7.5 m/s or 27 km/h for running).
   - Cadence vs. Heart Rate cross-correlation to detect motorized transport.
   - GPS jitter and spatial entropy verification to reject desktop spoofers.

4. **Immutable Double-Entry Ledger**
   - Verifiable audit trail where 1 Pulse Point is minted per 500m of authenticated activity.
   - Points directly offset marathon and brevet registration fees (up to 50% subsidy).

5. **Interactive Architecture Deck**
   - Built-in presentation slide deck accessible at `/architecture.html` with interactive nodes, data contracts, and deployment blueprints.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js v18+ (tested on Node v20/v22/v24)
- npm v9+

### Installation & Run
```bash
# Clone the repository
git clone https://github.com/Karthickjaisankar/fitness_app_project.git
cd fitness_app_project

# Install all dependencies (root & backend)
npm run postinstall

# Build TypeScript backend
npm run build

# Start the unified full-stack server
npm start
```

Access the platform:
- **Interactive Event Radar Map & Calendar**: `http://localhost:3000`
- **Architecture Presentation Deck**: `http://localhost:3000/architecture.html`
- **Health Check API**: `http://localhost:3000/api/health`
- **Gold Events API**: `http://localhost:3000/api/events`

---

## 🚂 Deployment Guide (Railway)

This repository is pre-configured with `railway.toml` for zero-configuration container deployment on [Railway](https://railway.app):

1. **Link GitHub Repository**:
   - In Railway, click **New Project** $\rightarrow$ **Deploy from GitHub repo**.
   - Select `Karthickjaisankar/fitness_app_project`.
2. **Add a Persistent Volume (Crucial for SQLite)**:
   - In your Railway Service Settings, navigate to **Volumes**.
   - Add a Volume mounted at `/app/backend/data`.
   - This ensures your `pipeline_lakehouse.db` (and all ingested events and points balances) persist across container restarts.
3. **Environment Variables**:
   - `PORT`: Automatically provided by Railway (defaults to 3000 locally).
   - `NODE_ENV`: `production`.
4. **Deploy**:
   - Railway will detect `railway.toml`, run `npm run build`, execute container healthchecks on `/api/health`, and provision an automatic SSL domain (e.g. `https://fitness-app-production.up.railway.app`).

---

## 🏛️ Architecture Documentation

For complete diagrams, Medallion Lakehouse entity relationships, and anti-fraud state machines, consult:
- Interactive Web Deck: [`frontend/architecture.html`](frontend/architecture.html)
- Detailed Technical Specification: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Sub-Agent Governance Rules: [`AGENTS.md`](AGENTS.md)
