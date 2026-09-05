---
name: data-engineering-orchestrator
description: >-
  Comprehensive runbook for the Lead Data Engineering Agent to manage, orchestrate,
  monitor, and audit fitness event ingestion pipelines, dispatching sub-agents,
  validating Medallion layers (Bronze/Silver/Gold), and managing the Dead Letter Queue.
---

# Lead Data Engineering Orchestrator Runbook

This skill provides step-by-step procedures for orchestrating multi-source event extraction, enforcing schema contracts, and maintaining data pipeline health.

---

## Pipeline Execution Workflow

### 1. Pre-Flight Health Check
Before launching sub-agents, verify:
- Data Lake storage path: `backend/data/pipeline_lakehouse.db` exists or is initialized.
- Network connectivity to source endpoints (Townscript, IndiaRunning, Eventbrite).
- Target directory write permissions.

### 2. Sub-Agent Dispatching
The orchestrator triggers extraction jobs across worker sub-agents:

```bash
# Example extraction sweep command
node backend/dist/pipeline/orchestrator.js --sources=townscript,indiarunning,brevets --mode=incremental
```

1. **`townscript_worker`**:
   - Queries Townscript's category taxonomy: `running`, `cycling`, `triathlon`.
   - Iterates through cities: Bengaluru, Mumbai, Delhi-NCR, Hyderabad, Chennai, Pune, Goa, Kolkata.
2. **`indiarunning_worker`**:
   - Scrapes Procam and AIMS-certified marathon bib feeds.
3. **`brevet_worker`**:
   - Indexes Audax India Randonneurs (AIR) 200K, 300K, 400K, 600K brevets.

---

## Medallion Architecture Ingestion Protocol

### Bronze Layer (Raw Capture)
- Each worker writes raw responses into `lakehouse_bronze`:
  ```sql
  INSERT INTO lakehouse_bronze (source, external_id, raw_payload, content_hash, status_code, crawled_at)
  VALUES ('townscript', 'ts_89214', '{"title":...}', 'sha256_hash_here', 200, datetime('now'));
  ```
- **Change Data Capture (CDC)**: If `content_hash` matches an existing record from the last sweep, mark `unchanged = true` and bypass Silver reprocessing.

### Silver Layer (Normalization & Contract Validation)
- Validate through strict contract:
  - `date`: Valid ISO-8601 string (`YYYY-MM-DD`). Reject past events or invalid date strings.
  - `city`: Standardized canonical city name (e.g., 'Bangalore' -> 'Bengaluru', 'Bombay' -> 'Mumbai').
  - `priceFromInr`: Positive integer or 0 (free).
  - `distanceCategories`: Array with valid `distanceKm` and `priceInr`.
- If contract validation fails: Route record immediately to `lakehouse_dlq`.

### Gold Layer (Entity Resolution & Production Catalog)
- Dispatch `entity_dedup_arbiter` to merge cross-platform listings.
- Upsert into `production_events` with canonical slug, verified flag, and consolidated booking URLs.

---

## Dead Letter Queue (DLQ) Remediation Runbook

When records land in `lakehouse_dlq`:
1. Inspect the quarantine reason:
   - `MISSING_DATE`: Trigger extraction retry with fallback regex on event description body.
   - `UNRESOLVED_CITY`: Query reverse-geocoder using venue coordinates.
   - `MALFORMED_CATEGORY`: Extract distance numbers from category title (e.g. "10K Dash" -> 10.0 km).
2. Reprocess repaired records back into the Silver pipeline.
