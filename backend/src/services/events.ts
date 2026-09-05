import { v4 as uuidv4 } from 'uuid';
import { FitnessEvent, DistanceCategory } from '../models/types';
import { store } from '../data/store';
import { LedgerService } from './ledger';
import path from 'path';
import fs from 'fs';

export interface EventFilterOptions {
  query?: string;
  city?: string;
  category?: string; // e.g. '10k', 'half_marathon', 'marathon', 'triathlon', 'cycling'
  source?: string;
  minPrice?: number;
  maxPrice?: number;
  fromDate?: string;
  toDate?: string;
}

export class EventsService {
  /**
   * Load real Gold records from SQLite Lakehouse, with seamless fallback to gold_events_seed.json
   */
  public static loadGoldEvents(): FitnessEvent[] {
    // 1. Try gold_events_seed.json (pure JSON, instant, zero native SIGSEGV risk in containers)
    try {
      const seedPath = path.resolve(__dirname, '../../data/gold_events_seed.json');
      if (fs.existsSync(seedPath)) {
        const raw = fs.readFileSync(seedPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (seedErr: any) {
      console.warn('[EventsService] Seed JSON load error:', seedErr?.message || seedErr);
    }

    // 2. Try SQLite Lakehouse DB if present
    try {
      const dbPath = path.resolve(__dirname, '../../data/pipeline_lakehouse.db');
      if (fs.existsSync(dbPath)) {
        const sqlite3 = require('better-sqlite3');
        const db = new sqlite3(dbPath, { readonly: true });
        const rows = db.prepare('SELECT * FROM lakehouse_gold ORDER BY event_date ASC').all() as any[];
        db.close();

        if (rows && rows.length > 0) {
          return rows.map((r) => {
            const bookingLinks = JSON.parse(r.booking_links_json || '[]');
            const primaryLink = bookingLinks[0]?.url || 'https://www.townscript.com';
            return {
              id: r.canonical_id,
              title: r.canonical_title,
              slug: r.canonical_slug,
              organizer: 'Townscript Verified Partner',
              date: r.event_date,
              time: '05:30 AM IST',
              city: r.city,
              state: 'Karnataka',
              venue: r.venue,
              distanceCategories: JSON.parse(r.categories_json || '[]'),
              tags: JSON.parse(r.tags_json || '[]'),
              priceFromInr: r.price_from_inr,
              registrationUrl: primaryLink,
              source: r.primary_source || 'Townscript',
              verified: Boolean(r.verified),
              bannerUrl: r.banner_url || 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&auto=format&fit=crop&q=80',
              coordinates: { lat: r.lat || 12.9716, lng: r.lng || 77.5946 }
            };
          });
        }
      }
    } catch (err: any) {
      console.warn('[EventsService] SQLite load bypassed:', err?.message || err);
    }

    // 3. Fallback to in-memory store
    return store.events || [];
  }

  /**
   * Filter and search events from the normalized unified calendar
   */
  public static getEvents(filters: EventFilterOptions): FitnessEvent[] {
    const allEvents = this.loadGoldEvents();
    return allEvents.filter((evt) => {
      // 1. Text Query
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const matchesQuery =
          evt.title.toLowerCase().includes(q) ||
          evt.city.toLowerCase().includes(q) ||
          evt.organizer.toLowerCase().includes(q) ||
          evt.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      // 2. City Filter
      if (filters.city && filters.city !== 'All') {
        if (evt.city.toLowerCase() !== filters.city.toLowerCase()) return false;
      }

      // 3. Category Filter
      if (filters.category && filters.category !== 'All') {
        const cat = filters.category.toLowerCase();
        let matchesCat = false;

        if (cat === 'marathon') {
          matchesCat = evt.distanceCategories.some((d) => d.distanceKm >= 42);
        } else if (cat === 'half_marathon') {
          matchesCat = evt.distanceCategories.some((d) => d.distanceKm >= 21 && d.distanceKm < 42);
        } else if (cat === '10k') {
          matchesCat = evt.distanceCategories.some((d) => d.distanceKm >= 9 && d.distanceKm <= 12);
        } else if (cat === '5k') {
          matchesCat = evt.distanceCategories.some((d) => d.distanceKm <= 5);
        } else if (cat === 'cycling') {
          matchesCat =
            evt.tags.some((t) => t.toLowerCase().includes('cycl') || t.toLowerCase().includes('brevet')) ||
            evt.title.toLowerCase().includes('cyclo') ||
            evt.title.toLowerCase().includes('tour');
        } else if (cat === 'triathlon') {
          matchesCat = evt.tags.some((t) => t.toLowerCase().includes('triathlon') || t.toLowerCase().includes('duathlon'));
        }

        if (!matchesCat) return false;
      }

      // 4. Source Filter
      if (filters.source && filters.source !== 'All') {
        if (evt.source !== filters.source) return false;
      }

      // 5. Date filter
      if (filters.fromDate && evt.date < filters.fromDate) return false;
      if (filters.toDate && evt.date > filters.toDate) return false;

      return true;
    });
  }

  /**
   * Get event details by ID or Slug
   */
  public static getEventById(idOrSlug: string): FitnessEvent | undefined {
    return store.events.find((e) => e.id === idOrSlug || e.slug === idOrSlug);
  }

  /**
   * Chapter Admin UGC Event Submission (Phase 2 feature)
   */
  public static createUgcEvent(data: {
    title: string;
    organizer: string;
    date: string;
    time: string;
    city: string;
    venue: string;
    distanceCategories: DistanceCategory[];
    tags: string[];
    priceFromInr: number;
    registrationUrl: string;
  }): FitnessEvent {
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newEvent: FitnessEvent = {
      id: `evt_ugc_${uuidv4().substring(0, 8)}`,
      title: data.title,
      slug,
      organizer: data.organizer,
      date: data.date,
      time: data.time || '06:00 AM IST',
      city: data.city,
      state: '',
      venue: data.venue,
      distanceCategories: data.distanceCategories,
      tags: [...data.tags, 'Community Run', 'Grassroots'],
      priceFromInr: data.priceFromInr || 0,
      registrationUrl: data.registrationUrl || '#',
      source: 'ChapterUGC',
      verified: true,
      bannerUrl: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&auto=format&fit=crop&q=80'
    };

    store.events.unshift(newEvent);
    return newEvent;
  }

  /**
   * Direct Event Registration with Points Discount Redemption (Phase 3 feature)
   */
  public static registerForEvent(
    eventId: string,
    categoryName: string,
    pointsToRedeem: number = 0
  ): {
    success: boolean;
    message: string;
    registrationReference?: string;
    originalPriceInr?: number;
    discountInr?: number;
    finalPriceInr?: number;
    pointsRedeemed?: number;
  } {
    const event = store.events.find((e) => e.id === eventId);
    if (!event) {
      return { success: false, message: 'Event not found' };
    }

    const category = event.distanceCategories.find((c) => c.name === categoryName) || event.distanceCategories[0];
    const originalPrice = category ? category.priceInr : event.priceFromInr;

    // 100 points = ₹200 discount (capped at 50% of registration fee)
    const maxRedeemablePoints = Math.min(store.user.totalPoints, pointsToRedeem, Math.floor((originalPrice * 0.5) / 2));
    const discountInr = maxRedeemablePoints * 2;
    const finalPrice = originalPrice - discountInr;

    if (maxRedeemablePoints > 0) {
      // Deduct points via ledger
      const balanceAfter = store.user.totalPoints - maxRedeemablePoints;
      store.ledger.unshift({
        id: `led_${uuidv4().substring(0, 8)}`,
        userId: store.user.userId,
        type: 'REDEEM_REWARD',
        points: -maxRedeemablePoints,
        balanceAfter,
        description: `Redeemed ${maxRedeemablePoints} pts for ₹${discountInr} discount on ${event.title}`,
        status: 'POSTED',
        timestamp: new Date().toISOString()
      });
      store.user.totalPoints = balanceAfter;
    }

    const ref = `REG-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    return {
      success: true,
      message: `Confirmed registration for ${event.title} (${category.name})!`,
      registrationReference: ref,
      originalPriceInr: originalPrice,
      discountInr,
      finalPriceInr: finalPrice,
      pointsRedeemed: maxRedeemablePoints
    };
  }
}
