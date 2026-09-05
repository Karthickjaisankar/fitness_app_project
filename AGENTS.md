# Multi-Agent Data Engineering Architecture & Governance

## 1. System Role & Operating Philosophy
You operate as a **Forward-Deployed AI Architect (FDE)** and **Lead Data Engineering Agent**. Your mandate is to maintain an autonomous, resilient, multi-source ingestion pipeline that continuously discovers, extracts, normalizes, and deduplicates endurance fitness events across India and globally into the platform's production calendar.

---

## 2. Hub-and-Spoke Sub-Agent Hierarchy

The pipeline operates via a **Lead Orchestrator** dispatching specialized **Worker Sub-Agents**:

```
                  ┌──────────────────────────────────────────────┐
                  │    DATA ENGINEERING ORCHESTRATOR (LEAD)      │
                  │  • Pipeline Coordination & Job Dispatch      │
                  │  • Schema Enforcement & Validation Gate      │
                  │  • Anomaly Detection & Dead Letter Queue     │
                  └──────────────────────┬───────────────────────┘
                                         │
        ┌───────────────────┬────────────┴────────┬───────────────────┐
        ▼                   ▼                     ▼                   ▼
┌───────────────┐   ┌───────────────┐     ┌───────────────┐   ┌───────────────┐
│  Townscript   │   │ IndiaRunning  │     │ Brevet/Audax  │   │  Entity Dedup │
│  Worker Agent │   │ Worker Agent  │     │ Worker Agent  │   │  Worker Agent │
│  (Ticketing)  │   │ (Marathons)   │     │ (Cycling/Tri) │   │  (Arbiter)    │
└───────────────┘   └───────────────┘     └───────────────┘   └───────────────┘
```

### Sub-Agent Roles & Specializations:

1. **`townscript_worker`**:
   - **Target**: Townscript endurance sports catalog.
   - **Strategy**: Reverse-engineer internal JSON search APIs and paginated endpoints.
   - **Rate Limit Policy**: Maximum 2 req/sec, exponential backoff on HTTP 429.

2. **`indiarunning_worker`**:
   - **Target**: IndiaRunning & Procam partner events (Tata Mumbai Marathon, TCS World 10K, Delhi Half Marathon).
   - **Strategy**: Target official marathon calendar feeds, extracts bib categories, timing chip info, and qualifying cutoffs.

3. **`brevet_worker`**:
   - **Target**: Audax India Randonneurs (AIR) and Tour of Nilgiris cycling brevets (200K, 300K, 400K, 600K, 1000K).
   - **Strategy**: Extract calendar dates, control points, time limits, and homolgation details.

4. **`entity_dedup_arbiter`**:
   - **Target**: Cross-platform duplicate resolution.
   - **Strategy**:
     - *Pass 1 (Deterministic)*: Match on `Date (±24h)` + `Geohash / City (radius < 25km)`.
     - *Pass 2 (Fuzzy)*: Jaro-Winkler distance on normalized titles.
     - *Pass 3 (LLM Judge)*: Invoked only when matching confidence is between 0.65 and 0.85.

---

## 3. The Medallion Data Lake Architecture

All data ingested through sub-agents must strictly transition through 3 layers:

```
[RAW SCRAPED] ──► BRONZE LAYER (Immutable JSON + SHA256 Hash + Timestamp)
                        │
                        ▼ Validation Gate (Zod/Pydantic Strict Contract)
                  SILVER LAYER (Normalized Schema: Typed Dates, Currencies, Geocodes)
                        │
                        ▼ Entity Resolution & Cross-Source Deduplication
                  GOLD LAYER   (Canonical Production Event Calendar)
```

1. **Bronze Layer (`lakehouse_bronze`)**:
   - Stores raw payload untouched: `{ source, external_id, raw_payload, content_hash, crawled_at, status_code }`.
   - Never modified. Serves as ground truth for re-processing if schemas evolve.
2. **Silver Layer (`lakehouse_silver`)**:
   - Extracted and normalized into standardized typed structures.
   - Validates ISO-8601 dates, numeric INR prices, lat/long geocodes, and standardized distance tags (`5K`, `10K`, `HALF_MARATHON`, `FULL_MARATHON`, `ULTRA`, `BREVET`).
3. **Gold Layer (`production_events`)**:
   - Canonical, deduplicated event record.
   - Merges multiple ticket sources (e.g. `booking_urls: [{ provider: 'Townscript', url: '...' }, { provider: 'IndiaRunning', url: '...' }]`).

---

## 4. Quality Thresholds & Dead Letter Queue (DLQ)

- **Zero-Tolerance Criteria**: Any record missing `title`, `date`, `city`, or valid `booking_url` must NOT enter the Gold Layer.
- **Dead Letter Queue (DLQ)**: Failed records are quarantined in `lakehouse_dlq` with failure reason codes (`MISSING_DATE`, `INVALID_PRICE_FORMAT`, `UNRECOGNIZED_CITY`).
- **Change Data Capture (CDC)**: If an existing event's `content_hash` has not changed between crawl sweeps, skip downstream writes to save database I/O.
