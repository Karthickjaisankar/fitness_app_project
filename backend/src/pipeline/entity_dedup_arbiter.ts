import sqlite3 from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { FitnessEvent } from '../models/types';

export interface DedupReport {
  totalSilverRecords: number;
  uniqueCanonicalEvents: number;
  duplicatePairsMerged: number;
  goldUpserted: number;
  multiSourceEventsCount: number;
}

export class EntityDedupArbiter {
  private db: sqlite3.Database;

  constructor(dbPath?: string) {
    const defaultPath = path.resolve(__dirname, '../../data/pipeline_lakehouse.db');
    this.db = new sqlite3(dbPath || defaultPath);
  }

  /**
   * Runs the 3-pass cross-platform entity resolution protocol across all Silver Layer records:
   * 1. Pass 1: Deterministic geospatial & temporal clustering (Date ±24h + Geohash / City)
   * 2. Pass 2: Fuzzy title token similarity (Dice coefficient > 0.65)
   * 3. Pass 3: Multi-source consolidation (booking links, verified coordinates, unified categories)
   */
  public resolveAndPromoteToGold(): DedupReport {
    console.log('----------------------------------------------------');
    console.log('⚡ [ENTITY DEDUP ARBITER] Starting Cross-Platform Event Resolution...');
    console.log('----------------------------------------------------');

    const silverRows = this.db.prepare('SELECT * FROM lakehouse_silver ORDER BY event_date ASC').all() as any[];

    const report: DedupReport = {
      totalSilverRecords: silverRows.length,
      uniqueCanonicalEvents: 0,
      duplicatePairsMerged: 0,
      goldUpserted: 0,
      multiSourceEventsCount: 0
    };

    // Cluster groups
    const clusters: Array<any[]> = [];

    for (const record of silverRows) {
      let matchedCluster = null;

      for (const cluster of clusters) {
        const rep = cluster[0];
        if (this.isMatch(rep, record)) {
          matchedCluster = cluster;
          break;
        }
      }

      if (matchedCluster) {
        matchedCluster.push(record);
        report.duplicatePairsMerged++;
      } else {
        clusters.push([record]);
      }
    }

    report.uniqueCanonicalEvents = clusters.length;

    const upsertGoldStmt = this.db.prepare(`
      INSERT INTO lakehouse_gold (
        canonical_id, canonical_title, canonical_slug, event_date, city, venue,
        lat, lng, price_from_inr, categories_json, tags_json, booking_links_json,
        primary_source, verified, banner_url, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
      ON CONFLICT(canonical_slug) DO UPDATE SET
        canonical_title = excluded.canonical_title,
        event_date = excluded.event_date,
        venue = excluded.venue,
        lat = excluded.lat,
        lng = excluded.lng,
        price_from_inr = excluded.price_from_inr,
        categories_json = excluded.categories_json,
        tags_json = excluded.tags_json,
        booking_links_json = excluded.booking_links_json,
        primary_source = excluded.primary_source,
        banner_url = excluded.banner_url,
        updated_at = datetime('now')
    `);

    const canonicalEventsForExport: FitnessEvent[] = [];

    for (const cluster of clusters) {
      const canonical = this.mergeCluster(cluster);
      if (cluster.length > 1) {
        report.multiSourceEventsCount++;
      }

      upsertGoldStmt.run(
        canonical.id,
        canonical.title,
        canonical.slug,
        canonical.date,
        canonical.city,
        canonical.venue,
        canonical.coordinates?.lat || 12.9716,
        canonical.coordinates?.lng || 77.5946,
        canonical.priceFromInr,
        JSON.stringify(canonical.distanceCategories),
        JSON.stringify(canonical.tags),
        JSON.stringify(canonical.bookingLinks || []),
        canonical.source,
        canonical.bannerUrl
      );

      canonicalEventsForExport.push(canonical);
      report.goldUpserted++;
    }

    // Export canonical dataset to gold_events_seed.json for instant UI & Docker runtime parity
    try {
      const seedPath = path.resolve(__dirname, '../../data/gold_events_seed.json');
      fs.writeFileSync(seedPath, JSON.stringify(canonicalEventsForExport, null, 2), 'utf-8');
      console.log(`[ENTITY DEDUP ARBITER] Exported ${canonicalEventsForExport.length} canonical events to: ${seedPath}`);
    } catch (e: any) {
      console.warn('[ENTITY DEDUP ARBITER] Failed to write gold seed JSON:', e.message);
    }

    console.log('✅ [ENTITY DEDUP ARBITER] Deduplication & Gold Promotion Complete.');
    console.log(`   • Total Silver Ingested: ${report.totalSilverRecords}`);
    console.log(`   • Unique Canonical Gold: ${report.uniqueCanonicalEvents}`);
    console.log(`   • Duplicates Merged:     ${report.duplicatePairsMerged}`);
    console.log(`   • Multi-Source Listings: ${report.multiSourceEventsCount}`);

    return report;
  }

  /**
   * Deterministic + Fuzzy match evaluator
   */
  private isMatch(a: any, b: any): boolean {
    // 1. Same source & externalId is exact duplicate
    if (a.source === b.source && a.external_id === b.external_id) return true;

    // 2. Temporal Gate: Events must occur on same date (or ±24h)
    const dateA = new Date(a.event_date).getTime();
    const dateB = new Date(b.event_date).getTime();
    if (Math.abs(dateA - dateB) > 24 * 3600 * 1000) {
      return false;
    }

    // 3. Spatial Gate: Same city or within 25km radius
    const cityA = (a.city || '').toLowerCase().trim();
    const cityB = (b.city || '').toLowerCase().trim();
    const sameCity = cityA === cityB;

    let withinRadius = false;
    if (a.lat && a.lng && b.lat && b.lng) {
      const distKm = this.haversineDistance(a.lat, a.lng, b.lat, b.lng);
      if (distKm <= 25.0) withinRadius = true;
    }

    if (!sameCity && !withinRadius) {
      return false;
    }

    // 4. Semantic / Fuzzy Title Match
    const sim = this.tokenDiceSimilarity(a.title, b.title);
    if (sim >= 0.65) {
      return true;
    }

    // If slugs match closely
    if (a.slug && b.slug && (a.slug.includes(b.slug) || b.slug.includes(a.slug))) {
      return true;
    }

    return false;
  }

  /**
   * Merges multiple source listings of the same real-world event into a single Gold Record
   */
  private mergeCluster(cluster: any[]): FitnessEvent {
    // Prefer AIMS > IndiaRunning > Townscript > RunnersDuniya for canonical naming
    const sourcePriority: Record<string, number> = {
      AIMS: 4,
      IndiaRunning: 3,
      Townscript: 2,
      RunnersDuniya: 1
    };

    cluster.sort((a, b) => (sourcePriority[b.source] || 0) - (sourcePriority[a.source] || 0));
    const primary = cluster[0];

    // Consolidate booking links
    const bookingLinks: Array<{ provider: string; url: string; priceInr?: number; isOfficial?: boolean }> = [];
    const seenUrls = new Set<string>();

    for (const rec of cluster) {
      if (rec.registration_url && !seenUrls.has(rec.registration_url)) {
        seenUrls.add(rec.registration_url);
        bookingLinks.push({
          provider: rec.source,
          url: rec.registration_url,
          priceInr: rec.price_from_inr || undefined,
          isOfficial: rec.source === 'AIMS' || rec.source === 'Townscript'
        });
      }
    }

    // Lowest available price across ticket providers
    const prices = cluster.map((r) => r.price_from_inr).filter((p) => typeof p === 'number' && p >= 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

    // Highest precision GPS coordinates
    let bestLat = primary.lat;
    let bestLng = primary.lng;
    for (const rec of cluster) {
      if (rec.lat && rec.lng && (rec.lat !== 12.9716 && rec.lat !== 13.0827 && rec.lat !== 18.9376)) {
        bestLat = rec.lat;
        bestLng = rec.lng;
        break;
      }
    }

    // Combine tags
    const allTags = new Set<string>();
    for (const rec of cluster) {
      try {
        const tags = JSON.parse(rec.tags_json || '[]');
        tags.forEach((t: string) => allTags.add(t));
      } catch (e) {}
    }

    // Distance categories
    let distanceCategories: any[] = [];
    try {
      distanceCategories = JSON.parse(primary.categories_json || '[]');
    } catch (e) {
      distanceCategories = [{ name: 'Open 10K', distanceKm: 10, priceInr: minPrice }];
    }

    return {
      id: `gold_${primary.slug}`,
      title: primary.title,
      slug: primary.slug,
      organizer: primary.organizer || `${primary.source} Verified Partner`,
      date: primary.event_date,
      time: primary.event_time || '05:30 AM IST',
      city: primary.city,
      state: primary.state || 'India',
      venue: primary.venue || `${primary.city} Event Venue`,
      distanceCategories,
      tags: Array.from(allTags),
      priceFromInr: minPrice,
      registrationUrl: bookingLinks[0]?.url || primary.registration_url,
      bookingLinks,
      source: primary.source,
      verified: true,
      bannerUrl:
        primary.banner_url ||
        'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&auto=format&fit=crop&q=80',
      coordinates: { lat: bestLat, lng: bestLng }
    };
  }

  /**
   * Token Dice similarity coefficient
   */
  private tokenDiceSimilarity(a: string, b: string): number {
    const cleanTokens = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 1 && !['the', 'and', 'for', 'in', 'of', 'run', 'marathon'].includes(w));

    const setA = new Set(cleanTokens(a));
    const setB = new Set(cleanTokens(b));

    if (setA.size === 0 && setB.size === 0) return 1.0;
    if (setA.size === 0 || setB.size === 0) return 0.0;

    let intersection = 0;
    for (const token of setA) {
      if (setB.has(token)) intersection++;
    }

    return (2.0 * intersection) / (setA.size + setB.size);
  }

  /**
   * Haversine formula for distance between 2 coordinates in KM
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
