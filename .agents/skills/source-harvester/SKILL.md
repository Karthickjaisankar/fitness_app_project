---
name: source-harvester
description: >-
  Methodology and patterns for reverse-engineering ticketing platform internal APIs
  (Townscript, IndiaRunning, Eventbrite, Audax) to extract live structured data
  reliably with rate-limiting and anti-bot resilience.
---

# Source Harvester & Reverse-Engineering Methodology

Modern event ticketing platforms load data dynamically via client-side XHR/Fetch API requests. Scraping rendered DOM HTML is computationally heavy, prone to frontend selector changes, and triggers bot-detection scripts. This skill details the reverse-engineering methodology to extract data directly from JSON endpoints.

---

## 1. Network Endpoint Discovery Pattern

Before writing scraper code, execute the following inspection workflow:

1. **Open DevTools Network Tab (Filter: `Fetch/XHR`)**:
   - Navigate to the platform's search or category page (e.g. `townscript.com/in/bengaluru/running`).
   - Scroll down or trigger pagination.
   - Look for JSON response payloads containing event lists.
2. **Isolate Request Headers**:
   - Identify required headers: `User-Agent`, `Referer`, `Origin`, `Accept`, and any CSRF tokens or API keys passed in headers (`X-Requested-With`, `Authorization`).
   - Replicate the request in `curl` to verify it succeeds without a full browser instance.

---

## 2. Platform Extraction Patterns

### Platform A: Townscript
- **Public Search / Discovery**:
  - Townscript exposes structured search endpoints for city-wise and category-wise event discovery.
  - Payloads contain: `eventName`, `eventUrlCode`, `startDate`, `venueName`, `cityName`, `minTicketPrice`, `ticketCategories`.
- **Rate-Limit & Anti-Bot Rule**:
  - Cap requests to 2 per second.
  - Randomize jitter delay: `delay = 500ms + Math.random() * 400ms`.
  - Rotate User-Agents between desktop Chrome, Safari, and Firefox.

### Platform B: IndiaRunning / Procam International
- **Endurance Portals**:
  - Events are categorized by certified distance categories: 5K, 10K, Half Marathon (21.097K), Full Marathon (42.195K), and Ultra Marathons.
  - Key fields to extract: Bib collection expo dates, qualifying time criteria, timing chip provider (e.g., Timing India / Sportstats).

### Platform C: Audax India Randonneurs (AIR) / Brevets
- **Cycling Brevets**:
  - Brevet events have non-standard distance tiers: 200 KM (13.5h limit), 300 KM (20h limit), 400 KM (27h limit), 600 KM (40h limit), 1000 KM (75h limit).
  - Extract start control point, finish venue, elevation profile, and homologation code.

---

## 3. Anti-Bot Resilience Checklist

| Threat | Mitigation Technique |
| :--- | :--- |
| **IP Rate-Limiting (HTTP 429)** | Exponential backoff with full jitter ($T = 2^{\text{attempt}} \times \text{rand}(0.5, 1.5)$). |
| **Cloudflare Perimeter Challenge** | Fallback to `puppeteer-harvester` MCP with realistic cursor movements. |
| **Stale Cache / CDN** | Append cache-busting timestamp param: `?_t=${Date.now()}`. |
| **Schema Drift** | Compare response keys against expected Zod contract; route deviations to DLQ. |
