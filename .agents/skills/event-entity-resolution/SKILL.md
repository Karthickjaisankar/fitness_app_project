---
name: event-entity-resolution
description: >-
  Multi-pass entity resolution and deduplication protocol for matching endurance
  fitness events across multiple ticketing platforms (Townscript, Eventbrite,
  IndiaRunning, Audax).
---

# Fitness Event Entity Resolution & Deduplication Protocol

Endurance events are frequently listed across multiple ticketing platforms simultaneously (e.g., Tata Mumbai Marathon listed on IndiaRunning, Townscript, and official Procam portals). This skill details the multi-pass entity resolution algorithm to reconcile duplicates into a single canonical Gold record.

---

## The 3-Pass Resolution Pipeline

```
Raw Candidate Event
        │
        ▼
[Pass 1: Deterministic Blocking] ────► No Match? ──► Create New Canonical Event
        │
        ├─ Match Found (Date ±24h + Geohash < 25km)?
        ▼
[Pass 2: String & Distance Metric] ──► Score > 0.85 ─► Definite Duplicate (Merge)
        │
        ├─ Score between 0.65 and 0.85 (Ambiguous)?
        ▼
[Pass 3: LLM Judge Arbiter] ────────► Decides Match or Distinct
```

---

## Step 1: Deterministic Blocking (Candidate Indexing)

To avoid an $O(N^2)$ cross-product comparison across thousands of events:
- **Date Blocking Key**: Match on exact date or $\pm 1$ day (accounting for weekend multi-day festivals).
- **Spatial Blocking Key**: Match on City string canonicalization or Geohash-5 (radius $\approx 25$ km).

```typescript
function getBlockingKey(date: string, city: string): string {
  const normalizedCity = city.toLowerCase().replace(/[^a-z]/g, '');
  return `${date}_${normalizedCity}`;
}
```

---

## Step 2: Metric Scoring

For candidate pairs within the same blocking bucket:

1. **Title Similarity (Jaro-Winkler Metric)**:
   - Normalize titles: strip years, words like "edition", "annual", "presents", "powered by".
   - Compare base event name: e.g. `"TCS World 10K Bengaluru"` vs `"TCS W10K"`.
2. **Venue Proximity**:
   - Haversine distance between venue lat/lng coordinates ($< 5$ km yields high similarity).
3. **Distance Category Overlap**:
   - Jaccard similarity between distance sets: e.g., `{10, 21.1}` vs `{10, 21.1, 42.2}`.

**Decision Matrix**:
- $\ge 0.85$: **Automatic Merge**.
- $0.65 - 0.84$: **Ambiguous -> Route to Pass 3 (LLM Judge)**.
- $< 0.65$: **Distinct Events**.

---

## Step 3: Canonical Merging Rules

When two listings represent the same event:
1. **Title**: Retain the most complete title (e.g. "TCS World 10K Bengaluru 2026").
2. **Price**: Record the lowest `priceFromInr` as promotional entry price.
3. **Ticketing Links**: Merge all ticketing options into an array:
   ```json
   "bookingUrls": [
     { "source": "Townscript", "url": "https://www.townscript.com/e/...", "isOfficial": false },
     { "source": "IndiaRunning", "url": "https://www.indiarunning.com/...", "isOfficial": true }
   ]
   ```
4. **Distance Categories**: Union of all unique distance categories without duplicates.
