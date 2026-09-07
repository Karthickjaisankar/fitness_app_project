import sqlite3 from 'better-sqlite3';
import path from 'path';
import { TownscriptWorker, RawScrapedEvent } from './townscript_worker';
import { IndiaRunningWorker } from './indiarunning_worker';
import { RunnersDuniyaWorker } from './runnersduniya_worker';
import { AimsWorker } from './aims_worker';
import { EntityDedupArbiter, DedupReport } from './entity_dedup_arbiter';

// Priority 1: Bengaluru Running Catalog
export const bengaluruDataset: RawScrapedEvent[] = [
  {
    title: 'Times Internet Bengaluru Half Marathon 2026',
    date: 'Dec 13',
    location: 'Bengaluru',
    price: '₹1,799 onwards',
    url: 'https://www.townscript.com/e/times-internet-bengaluru-half-marathon-2026-113403',
    imageUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'Hennur Bamboo Ultra 2026',
    date: 'Sep 25 - 27',
    location: 'Bengaluru',
    price: '₹7,000 onwards',
    url: 'https://www.townscript.com/e/hennur-bamboo-ultra-2026',
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'Hoysala Hustle 2026',
    date: 'Nov 01',
    location: 'Bengaluru',
    price: '₹1,000 onwards',
    url: 'https://www.townscript.com/e/hoysala-hustle-2026',
    imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'Pink 10K Challenge - Bangalore',
    date: 'Nov 22',
    location: 'Nayanda Halli, Bengaluru',
    price: '₹199 onwards',
    url: 'https://www.townscript.com/e/pink-10k-challenge-bangalore-301233',
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'Namma Hejje Bengaluru Half Marathon 2027 | First Edition',
    date: "Feb 21 '27",
    location: 'Bengaluru',
    price: '₹723 onwards',
    url: 'https://www.townscript.com/e/nammahejjehalfmarathon2027',
    imageUrl: 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'Thump! Celebration Bengaluru 1/2 Marathon and 10K RUN 2026',
    date: 'Dec 20',
    location: 'Hosakerehalli, Bengaluru',
    price: '₹700 onwards',
    url: 'https://www.townscript.com/e/thump-celebration-bengaluru-12-marathon-and-10k-run-2026',
    imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'Bengaluru Corporate Wellness Run 2026',
    date: 'Nov 15',
    location: 'Hosakerehalli, Bengaluru',
    price: '₹999 onwards',
    url: 'https://www.townscript.com/e/bengaluru-corporate-wellness-run-2026-402411',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80'
  }
];

// Priority 2: Chennai Running Catalog
export const chennaiDataset: RawScrapedEvent[] = [
  {
    title: 'Run for Our National Heroes 2026',
    date: 'Dec 13',
    location: 'Besant Nagar, Chennai',
    price: '₹649 onwards',
    url: 'https://www.townscript.com/e/run-for-our-national-heroes-2026-102013',
    imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'Our CM Our Pride - Mega Marathon 2026',
    date: 'Sep 20',
    location: 'Poongavanapuram, Chennai',
    price: '₹399 onwards',
    url: 'https://www.townscript.com/e/our-cm-our-pride-mega-marathon-2026-022011',
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'Chennai Kids Running Festival 2026',
    date: 'Sep 06',
    location: 'Nehru Park, Chennai',
    price: '₹599 onwards',
    url: 'https://www.townscript.com/e/chennai-kids-running-festival-2026-330123',
    imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'Freshworks Chennai Marathon 2027',
    date: '2027-01-03',
    location: 'Marina Beach, Chennai',
    price: '₹1,400 onwards',
    url: 'https://www.townscript.com/e/chennai-marathon-2027',
    imageUrl: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'World Heart Day Run/Ride 2025 – Chennai',
    date: 'Sep 20',
    location: 'Guindy, Chennai',
    price: 'Free',
    url: 'https://www.townscript.com/e/world-heart-day-runride-2025-chennai-243202',
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&auto=format&fit=crop&q=80'
  }
];

// Priority 3: Coimbatore Running Catalog
export const coimbatoreDataset: RawScrapedEvent[] = [
  {
    title: 'Vayalada Ultra 2026 - Season 5',
    date: 'Nov 29',
    location: 'Race Course, Coimbatore',
    price: '₹2,500 onwards',
    url: 'https://www.townscript.com/e/vayalada-ultra-2026-season-5-112140',
    imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'Kovai 10K & Green City Challenge',
    date: 'Oct 25',
    location: 'Race Course Road, Coimbatore',
    price: '₹450 onwards',
    url: 'https://www.townscript.com/e/kovai-10k-green-city-challenge-2026',
    imageUrl: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&auto=format&fit=crop&q=80'
  }
];

// Priority 4: Townscript Cycling & Brevet Catalog (https://www.townscript.com/in/india/cycling)
export const cyclingDataset: RawScrapedEvent[] = [
  {
    title: 'Tour of Nilgiris 2026 - 1000K Mountain Brevet',
    date: 'Dec 10 - 17',
    location: 'Mysuru & Ooty Hills, Karnataka',
    price: '₹14,500 onwards',
    url: 'https://www.townscript.com/e/tour-of-nilgiris-brevet-2026',
    imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'Bangalore Randonneurs 200K Brevet - Nandi Loop',
    date: 'Oct 11',
    location: 'Hebbal Flyover, Bengaluru',
    price: '₹850 onwards',
    url: 'https://www.townscript.com/e/bangalore-randonneurs-200k-nandi-loop-2026',
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'Chennai Coastline 100K Cyclothon 2026',
    date: 'Nov 08',
    location: 'Akkarai Beach ECR, Chennai',
    price: '₹750 onwards',
    url: 'https://www.townscript.com/e/chennai-coastline-100k-cyclothon-2026',
    imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'Nandi Hills Hillclimb Challenge & Gran Fondo',
    date: 'Sep 27',
    location: 'Nandi Hills Base, Bengaluru',
    price: '₹1,200 onwards',
    url: 'https://www.townscript.com/e/nandi-hills-hillclimb-challenge-2026',
    imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop&q=80'
  }
];

export const allTownscriptDataset: RawScrapedEvent[] = [
  ...bengaluruDataset,
  ...chennaiDataset,
  ...coimbatoreDataset,
  ...cyclingDataset
];

export class PipelineOrchestrator {
  /**
   * Dispatches the multi-agent ingestion sweep across:
   * 1. Townscript Worker (Running & Cycling)
   * 2. IndiaRunning Worker (Next.js CDN marathon catalog)
   * 3. RunnersDuniya Worker (WP REST API)
   * 4. AIMS World Running Worker (Certified major marathons)
   * 5. Entity Dedup Arbiter (3-pass deduplication into Gold Layer)
   */
  public static async runSweep(): Promise<{
    reports: Record<string, any>;
    dedupReport: DedupReport;
    lakehouseStats: { bronze: number; silver: number; gold: number; dlq: number };
    goldEvents: any[];
  }> {
    console.log('\n======================================================');
    console.log('⚡ [ORCHESTRATOR] DISPATCHING MULTI-AGENT INGESTION SWEEP');
    console.log('Workers: townscript_worker • indiarunning_worker • runnersduniya_worker • aims_worker');
    console.log('Arbiter: entity_dedup_arbiter');
    console.log('======================================================');

    const reports: Record<string, any> = {};

    // 1. Townscript Worker
    const townscriptWorker = new TownscriptWorker();
    reports['Townscript'] = townscriptWorker.ingestBatch(allTownscriptDataset);

    // 2. IndiaRunning Worker
    try {
      const indiaRunningWorker = new IndiaRunningWorker();
      const irEvents = await indiaRunningWorker.fetchLiveCatalog();
      reports['IndiaRunning'] = indiaRunningWorker.ingestBatch(irEvents);
    } catch (e: any) {
      console.warn('[Orchestrator] IndiaRunning worker fallback error:', e.message);
    }

    // 3. RunnersDuniya Worker
    try {
      const rdWorker = new RunnersDuniyaWorker();
      const rdEvents = await rdWorker.fetchLiveCatalog();
      reports['RunnersDuniya'] = rdWorker.ingestBatch(rdEvents);
    } catch (e: any) {
      console.warn('[Orchestrator] RunnersDuniya worker fallback error:', e.message);
    }

    // 4. AIMS World Running Worker
    try {
      const aimsWorker = new AimsWorker();
      const aimsEvents = await aimsWorker.fetchLiveCatalog();
      reports['AIMS'] = aimsWorker.ingestBatch(aimsEvents);
    } catch (e: any) {
      console.warn('[Orchestrator] AIMS worker fallback error:', e.message);
    }

    // 5. Entity Dedup Arbiter (Promotes Silver -> Canonical Gold)
    const arbiter = new EntityDedupArbiter();
    const dedupReport = arbiter.resolveAndPromoteToGold();

    // Query Lakehouse Table Counts
    const dbPath = path.resolve(__dirname, '../../data/pipeline_lakehouse.db');
    const db = new sqlite3(dbPath, { readonly: true });

    const bronzeCount = (db.prepare('SELECT COUNT(*) as count FROM lakehouse_bronze').get() as any).count;
    const silverCount = (db.prepare('SELECT COUNT(*) as count FROM lakehouse_silver').get() as any).count;
    const goldCount = (db.prepare('SELECT COUNT(*) as count FROM lakehouse_gold').get() as any).count;
    const dlqCount = (db.prepare('SELECT COUNT(*) as count FROM lakehouse_dlq').get() as any).count;

    const goldEvents = db.prepare('SELECT * FROM lakehouse_gold ORDER BY event_date ASC').all();
    db.close();

    console.log('\n--- MULTI-AGENT INGESTION AUDIT REPORT ---');
    console.log(`Bronze Layer Total: ${bronzeCount} records`);
    console.log(`Silver Layer Total: ${silverCount} records`);
    console.log(`Gold Layer Total:   ${goldCount} canonical records`);
    console.log(`DLQ Quarantined:    ${dlqCount} records`);
    console.log('======================================================\n');

    return {
      reports,
      dedupReport,
      lakehouseStats: { bronze: bronzeCount, silver: silverCount, gold: goldCount, dlq: dlqCount },
      goldEvents
    };
  }
}

// Execute if run directly via CLI
if (require.main === module) {
  PipelineOrchestrator.runSweep().then(() => {
    console.log('Sweep finished.');
  });
}
