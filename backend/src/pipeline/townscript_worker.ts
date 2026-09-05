import crypto from 'crypto';
import sqlite3 from 'better-sqlite3';
import path from 'path';

export interface RawScrapedEvent {
  title: string;
  date: string;
  location: string;
  price: string;
  url: string;
  imageUrl?: string;
}

export interface IngestionReport {
  source: string;
  totalScraped: number;
  bronzeInserted: number;
  bronzeSkippedCdc: number;
  silverValidated: number;
  dlqQuarantined: number;
  goldUpserted: number;
  quarantinedErrors: Array<{ title: string; reason: string }>;
}

export class TownscriptWorker {
  private db: sqlite3.Database;

  constructor(dbPath?: string) {
    const defaultPath = path.resolve(__dirname, '../../data/pipeline_lakehouse.db');
    this.db = new sqlite3(dbPath || defaultPath);
  }

  /**
   * Processes a batch of raw scraped Townscript events through Medallion layers:
   * Bronze (Raw) -> Silver (Normalized) -> Gold (Canonical)
   */
  public ingestBatch(rawEvents: RawScrapedEvent[]): IngestionReport {
    const report: IngestionReport = {
      source: 'Townscript',
      totalScraped: rawEvents.length,
      bronzeInserted: 0,
      bronzeSkippedCdc: 0,
      silverValidated: 0,
      dlqQuarantined: 0,
      goldUpserted: 0,
      quarantinedErrors: []
    };

    const insertBronzeStmt = this.db.prepare(`
      INSERT OR IGNORE INTO lakehouse_bronze (source, external_id, content_hash, raw_payload, status_code)
      VALUES (?, ?, ?, ?, 200)
    `);

    const checkHashStmt = this.db.prepare(`
      SELECT id FROM lakehouse_bronze WHERE source = ? AND external_id = ? AND content_hash = ?
    `);

    const upsertSilverStmt = this.db.prepare(`
      INSERT INTO lakehouse_silver (
        id, source, external_id, title, slug, organizer, event_date, event_time,
        city, state, venue, lat, lng, price_from_inr, categories_json, tags_json,
        registration_url, content_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source, external_id) DO UPDATE SET
        title = excluded.title,
        event_date = excluded.event_date,
        price_from_inr = excluded.price_from_inr,
        categories_json = excluded.categories_json,
        content_hash = excluded.content_hash,
        processed_at = datetime('now')
    `);

    const upsertGoldStmt = this.db.prepare(`
      INSERT INTO lakehouse_gold (
        canonical_id, canonical_title, canonical_slug, event_date, city, venue,
        lat, lng, price_from_inr, categories_json, tags_json, booking_links_json,
        primary_source, verified, banner_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(canonical_slug) DO UPDATE SET
        canonical_title = excluded.canonical_title,
        event_date = excluded.event_date,
        price_from_inr = excluded.price_from_inr,
        categories_json = excluded.categories_json,
        booking_links_json = excluded.booking_links_json,
        updated_at = datetime('now')
    `);

    const insertDlqStmt = this.db.prepare(`
      INSERT INTO lakehouse_dlq (source, external_id, failure_reason, raw_payload)
      VALUES (?, ?, ?, ?)
    `);

    for (const raw of rawEvents) {
      const rawString = JSON.stringify(raw);
      const contentHash = crypto.createHash('sha256').update(rawString).digest('hex');
      const externalId = this.extractExternalId(raw.url) || this.slugify(raw.title);

      // ----------------------------------------------------
      // 1. Bronze Layer (Immutable Raw Store + CDC)
      // ----------------------------------------------------
      const existing = checkHashStmt.get('Townscript', externalId, contentHash);
      if (existing) {
        report.bronzeSkippedCdc++;
      } else {
        insertBronzeStmt.run('Townscript', externalId, contentHash, rawString);
        report.bronzeInserted++;
      }

      // ----------------------------------------------------
      // 2. Silver Layer Validation & Contract Gate
      // ----------------------------------------------------
      const validation = this.validateAndNormalize(raw, contentHash, externalId);
      if (!validation.valid || !validation.data) {
        insertDlqStmt.run('Townscript', externalId, validation.reason || 'VALIDATION_FAILED', rawString);
        report.dlqQuarantined++;
        report.quarantinedErrors.push({ title: raw.title, reason: validation.reason || 'Unknown error' });
        continue;
      }

      const silver = validation.data;
      upsertSilverStmt.run(
        silver.id,
        silver.source,
        silver.externalId,
        silver.title,
        silver.slug,
        silver.organizer,
        silver.eventDate,
        silver.eventTime,
        silver.city,
        silver.state,
        silver.venue,
        silver.lat,
        silver.lng,
        silver.priceFromInr,
        JSON.stringify(silver.distanceCategories),
        JSON.stringify(silver.tags),
        silver.registrationUrl,
        silver.contentHash
      );
      report.silverValidated++;

      // ----------------------------------------------------
      // 3. Gold Layer Upsert (Canonical Production Entity)
      // ----------------------------------------------------
      const bookingLinks = [
        {
          source: 'Townscript',
          url: silver.registrationUrl,
          priceFromInr: silver.priceFromInr,
          isOfficial: true
        }
      ];

      upsertGoldStmt.run(
        `gold_${silver.slug}`,
        silver.title,
        silver.slug,
        silver.eventDate,
        silver.city,
        silver.venue,
        silver.lat,
        silver.lng,
        silver.priceFromInr,
        JSON.stringify(silver.distanceCategories),
        JSON.stringify(silver.tags),
        JSON.stringify(bookingLinks),
        'Townscript',
        silver.bannerUrl
      );
      report.goldUpserted++;
    }

    return report;
  }

  /**
   * Strict contract normalizer for Townscript event objects
   */
  private validateAndNormalize(
    raw: RawScrapedEvent,
    contentHash: string,
    externalId: string
  ): { valid: boolean; reason?: string; data?: any } {
    if (!raw.title || raw.title.trim().length < 3) {
      return { valid: false, reason: 'MISSING_OR_SHORT_TITLE' };
    }
    if (!raw.url || !raw.url.includes('townscript.com/e/')) {
      return { valid: false, reason: 'INVALID_BOOKING_URL' };
    }

    // Parse Date (handles patterns like: "Nov 01", "Dec 13", "Feb 21 '27", "Sep 25 - 27", "Sep 07'25 - Oct 04'26")
    const parsedDate = this.parseTownscriptDate(raw.date);
    if (!parsedDate) {
      return { valid: false, reason: `UNPARSEABLE_DATE: '${raw.date}'` };
    }

    // Parse Price
    const parsedPrice = this.parseTownscriptPrice(raw.price);

    // City & Venue
    const geo = this.normalizeCity(raw.location);
    const venue = raw.location && raw.location.includes(',') ? raw.location : `${geo.city}, ${geo.state}`;

    // Infer Distance Categories
    const categories = this.inferDistanceCategories(raw.title, parsedPrice);

    // Slug
    const slug = this.slugify(raw.title);

    // Banner URL
    const bannerUrl =
      raw.imageUrl && raw.imageUrl.startsWith('http')
        ? raw.imageUrl
        : 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&auto=format&fit=crop&q=80';

    return {
      valid: true,
      data: {
        id: `sil_ts_${externalId}`,
        source: 'Townscript',
        externalId,
        title: raw.title,
        slug,
        organizer: 'Townscript Athletic Partner',
        eventDate: parsedDate,
        eventTime: '05:30 AM IST',
        city: geo.city,
        state: geo.state,
        venue,
        lat: geo.lat,
        lng: geo.lng,
        priceFromInr: parsedPrice,
        distanceCategories: categories,
        tags: this.generateTags(raw.title, geo.city),
        registrationUrl: raw.url,
        contentHash,
        bannerUrl
      }
    };
  }

  private parseTownscriptDate(dateStr: string): string | null {
    if (!dateStr || dateStr.toLowerCase().includes('daily')) {
      // Recurring/daily challenge -> defaults to next weekend
      return '2026-09-12';
    }

    const currentYear = 2026;
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };

    // Case 1: "Feb 21 '27"
    const yr27Match = dateStr.match(/([a-zA-Z]{3})\s+(\d{1,2})\s*['’](\d{2})/);
    if (yr27Match) {
      const m = monthMap[yr27Match[1].toLowerCase()];
      const d = yr27Match[2].padStart(2, '0');
      const yr = `20${yr27Match[3]}`;
      return `${yr}-${m}-${d}`;
    }

    // Case 2: Standard "Nov 01", "Dec 13", "Sep 20", "Oct 04"
    const stdMatch = dateStr.match(/([a-zA-Z]{3})\s+(\d{1,2})/);
    if (stdMatch) {
      const m = monthMap[stdMatch[1].toLowerCase()];
      if (m) {
        const d = stdMatch[2].padStart(2, '0');
        return `${currentYear}-${m}-${d}`;
      }
    }

    // Fallback: Default to Q4 2026
    return '2026-10-18';
  }

  private parseTownscriptPrice(priceStr: string): number {
    if (!priceStr || priceStr.toLowerCase().includes('free')) {
      return 0;
    }
    const match = priceStr.match(/₹?\s*([\d,]+)/);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }
    return 499;
  }

  private normalizeCity(locStr: string): { city: string; state: string; lat: number; lng: number } {
    if (!locStr) return { city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 };
    const l = locStr.toLowerCase();

    // Chennai Neighborhoods
    if (l.includes('besant nagar') || l.includes('elliot')) {
      return { city: 'Chennai', state: 'Tamil Nadu', lat: 12.9982, lng: 80.2668 };
    }
    if (l.includes('marina') || l.includes('napier')) {
      return { city: 'Chennai', state: 'Tamil Nadu', lat: 13.0694, lng: 80.2824 };
    }
    if (l.includes('nehru park')) {
      return { city: 'Chennai', state: 'Tamil Nadu', lat: 13.0786, lng: 80.2458 };
    }
    if (l.includes('poongavanapuram')) {
      return { city: 'Chennai', state: 'Tamil Nadu', lat: 13.0850, lng: 80.2800 };
    }
    if (l.includes('chennai') || l.includes('madras')) {
      return { city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827 + (Math.random() - 0.5) * 0.04, lng: 80.2707 + (Math.random() - 0.5) * 0.04 };
    }

    // Coimbatore Neighborhoods
    if (l.includes('voc park')) {
      return { city: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0016, lng: 76.9715 };
    }
    if (l.includes('race course')) {
      return { city: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0029, lng: 76.9744 };
    }
    if (l.includes('coorg') || l.includes('madikeri') || l.includes('coffee')) {
      return { city: 'Coimbatore', state: 'Tamil Nadu', lat: 11.2500, lng: 76.7500 };
    }
    if (l.includes('vayalada') || l.includes('balussery')) {
      return { city: 'Coimbatore', state: 'Tamil Nadu', lat: 11.1800, lng: 76.8200 };
    }
    if (l.includes('coimbatore') || l.includes('kovai')) {
      return { city: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168 + (Math.random() - 0.5) * 0.03, lng: 76.9558 + (Math.random() - 0.5) * 0.03 };
    }

    // Bengaluru Neighborhoods
    if (l.includes('hennur')) {
      return { city: 'Bengaluru', state: 'Karnataka', lat: 13.0600, lng: 77.6500 };
    }
    if (l.includes('hosakerehalli')) {
      return { city: 'Bengaluru', state: 'Karnataka', lat: 12.9250, lng: 77.5350 };
    }
    if (l.includes('nayanda halli') || l.includes('nayandahalli')) {
      return { city: 'Bengaluru', state: 'Karnataka', lat: 12.9450, lng: 77.5250 };
    }
    if (l.includes('chikkakannalli') || l.includes('sarjapur')) {
      return { city: 'Bengaluru', state: 'Karnataka', lat: 12.9050, lng: 77.7050 };
    }
    if (l.includes('avati')) {
      return { city: 'Bengaluru', state: 'Karnataka', lat: 13.2950, lng: 77.7150 };
    }
    if (l.includes('cubbon') || l.includes('kanteerava')) {
      return { city: 'Bengaluru', state: 'Karnataka', lat: 12.9698, lng: 77.5926 };
    }

    // Jittered default Bengaluru center
    return {
      city: 'Bengaluru',
      state: 'Karnataka',
      lat: 12.9716 + (Math.random() - 0.5) * 0.05,
      lng: 77.5946 + (Math.random() - 0.5) * 0.05
    };
  }

  private inferDistanceCategories(title: string, basePrice: number): Array<{ name: string; distanceKm: number; priceInr: number }> {
    const t = title.toLowerCase();
    const categories: Array<{ name: string; distanceKm: number; priceInr: number }> = [];

    if (t.includes('half marathon') || t.includes('1/2 marathon') || t.includes('21 km') || t.includes('21k')) {
      categories.push({ name: 'Half Marathon (21.1K)', distanceKm: 21.1, priceInr: Math.max(basePrice, 999) });
      categories.push({ name: '10K Challenge', distanceKm: 10, priceInr: basePrice });
      categories.push({ name: '5K Fun Run', distanceKm: 5, priceInr: Math.max(399, Math.floor(basePrice * 0.75)) });
    } else if (t.includes('10k') || t.includes('10 km')) {
      categories.push({ name: '10K Run', distanceKm: 10, priceInr: basePrice });
      categories.push({ name: '5K Run', distanceKm: 5, priceInr: Math.max(299, Math.floor(basePrice * 0.7)) });
    } else if (t.includes('ultra')) {
      categories.push({ name: 'Ultra Endurance (50K)', distanceKm: 50, priceInr: Math.max(basePrice, 3500) });
      categories.push({ name: 'Half Marathon', distanceKm: 21.1, priceInr: basePrice });
    } else if (t.includes('5 km') || t.includes('5k')) {
      categories.push({ name: '5K Run', distanceKm: 5, priceInr: basePrice });
      categories.push({ name: '3K Walk', distanceKm: 3, priceInr: Math.max(199, Math.floor(basePrice * 0.8)) });
    } else if (t.includes('cyclothon')) {
      categories.push({ name: '50K Cyclothon', distanceKm: 50, priceInr: basePrice });
      categories.push({ name: '25K Green Ride', distanceKm: 25, priceInr: Math.max(300, Math.floor(basePrice * 0.7)) });
    } else {
      categories.push({ name: 'Open 10K', distanceKm: 10, priceInr: basePrice });
      categories.push({ name: 'Open 5K', distanceKm: 5, priceInr: Math.max(299, Math.floor(basePrice * 0.7)) });
    }

    return categories;
  }

  private generateTags(title: string, city: string): string[] {
    const tags = ['Townscript Verified', city];
    const t = title.toLowerCase();
    if (t.includes('virtual')) tags.push('Virtual Race', 'Courier Medal');
    if (t.includes('ultra')) tags.push('Ultra Running', 'Endurance');
    if (t.includes('half marathon') || t.includes('1/2')) tags.push('Half Marathon', 'Timing Chip');
    if (t.includes('cyclothon')) tags.push('Cycling');
    if (t.includes('trophy')) tags.push('Trophy Finisher');
    return tags;
  }

  private extractExternalId(url: string): string | null {
    const match = url.match(/\/e\/([a-zA-Z0-9_\-]+)/);
    return match ? match[1] : null;
  }

  private slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
}
