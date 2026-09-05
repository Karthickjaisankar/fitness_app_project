import { v4 as uuidv4 } from 'uuid';
import { FitnessEvent } from '../models/types';
import { store } from '../data/store';

export interface ScrapedEventRaw {
  platform: 'Townscript' | 'Eventbrite';
  externalId: string;
  rawTitle: string;
  rawDate: string;
  rawVenue: string;
  rawCity: string;
  rawPriceText: string;
  rawCategories: Array<{ title: string; price: number; distance: string }>;
  sourceUrl: string;
  imageUrl?: string;
}

export class ScraperEngine {
  private static isRunning = false;
  private static lastRunTimestamp: string | null = null;
  private static stats = {
    totalIndexed: 48,
    successfulRuns: 6,
    normalizedCount: 7,
    lastScrapedSource: 'Townscript'
  };

  /**
   * Triggers an autonomous scraper sweep across Townscript and Eventbrite.
   * Normalizes the unstructured listings into the unified schema.
   */
  public static async triggerIngestionSweep(): Promise<{
    success: boolean;
    newEventsFound: number;
    updatedEvents: number;
    events: FitnessEvent[];
  }> {
    this.isRunning = true;
    this.lastRunTimestamp = new Date().toISOString();

    // Simulated scraper extraction pipeline
    const rawBatch: ScrapedEventRaw[] = [
      {
        platform: 'Townscript',
        externalId: 'ts_pune_half_marathon',
        rawTitle: 'Bajaj Allianz Pune Half Marathon 2026',
        rawDate: '2026-11-22',
        rawVenue: 'Balewadi Stadium, Mahalunge',
        rawCity: 'Pune',
        rawPriceText: '₹999 onwards',
        rawCategories: [
          { title: 'Half Marathon 21K', price: 1850, distance: '21.1 km' },
          { title: '10K Challenge', price: 1250, distance: '10 km' },
          { title: '5K Family Run', price: 750, distance: '5 km' }
        ],
        sourceUrl: 'https://www.townscript.com/e/pune-half-marathon-2026',
        imageUrl: 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=800&auto=format&fit=crop&q=80'
      },
      {
        platform: 'Eventbrite',
        externalId: 'eb_kochi_night_cyclothon',
        rawTitle: 'Kochi Marine Drive Night Cyclothon 50K',
        rawDate: '2026-11-28',
        rawVenue: 'Marine Drive Walkway, Ernakulam',
        rawCity: 'Kochi',
        rawPriceText: '₹800',
        rawCategories: [
          { title: '50K Endurance Ride', price: 1200, distance: '50 km' },
          { title: '25K City Joyride', price: 800, distance: '25 km' }
        ],
        sourceUrl: 'https://www.eventbrite.com/e/kochi-night-cyclothon',
        imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80'
      }
    ];

    let newCount = 0;
    let updatedCount = 0;

    for (const raw of rawBatch) {
      const existing = store.events.find((e) => e.title.toLowerCase() === raw.rawTitle.toLowerCase() || e.slug === this.slugify(raw.rawTitle));
      
      const distanceCategories = raw.rawCategories.map((cat) => {
        let dist = 10;
        if (cat.distance.includes('21')) dist = 21.1;
        else if (cat.distance.includes('42')) dist = 42.2;
        else if (cat.distance.includes('50')) dist = 50;
        else if (cat.distance.includes('5')) dist = 5;
        else if (cat.distance.includes('25')) dist = 25;
        return {
          name: cat.title,
          distanceKm: dist,
          priceInr: cat.price
        };
      });

      const normalized: FitnessEvent = {
        id: `evt_scr_${uuidv4().substring(0, 8)}`,
        title: raw.rawTitle,
        slug: this.slugify(raw.rawTitle),
        organizer: raw.platform === 'Townscript' ? 'Pune Athletic Union' : 'Cochin Pedal Club',
        date: raw.rawDate,
        time: '05:45 AM IST',
        city: raw.rawCity,
        state: raw.rawCity === 'Pune' ? 'Maharashtra' : 'Kerala',
        venue: raw.rawVenue,
        distanceCategories,
        tags: [raw.platform, 'Scraped Ingestion', raw.rawCity],
        priceFromInr: Math.min(...distanceCategories.map((c) => c.priceInr)),
        registrationUrl: raw.sourceUrl,
        source: raw.platform,
        verified: true,
        bannerUrl: raw.imageUrl || 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&auto=format&fit=crop&q=80'
      };

      if (!existing) {
        store.events.push(normalized);
        newCount++;
      } else {
        updatedCount++;
      }
    }

    this.isRunning = false;
    this.stats.totalIndexed += newCount;
    this.stats.successfulRuns += 1;
    this.stats.normalizedCount = store.events.length;

    return {
      success: true,
      newEventsFound: newCount,
      updatedEvents: updatedCount,
      events: store.events
    };
  }

  public static getScraperStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTimestamp: this.lastRunTimestamp || new Date(Date.now() - 3600000 * 2).toISOString(),
      stats: this.stats
    };
  }

  private static slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
}
