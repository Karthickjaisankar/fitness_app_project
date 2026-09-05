import { TownscriptWorker, RawScrapedEvent } from './townscript_worker';
import sqlite3 from 'better-sqlite3';
import path from 'path';

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
  },
  {
    title: 'BeAthlit Lake Run - September 2026 Edition',
    date: 'Sep 20',
    location: 'Bengaluru',
    price: '₹100 onwards',
    url: 'https://www.townscript.com/e/beathlit-lake-run-september-2026-edition',
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'Breakthrough Run',
    date: 'Oct 25',
    location: 'Hosakerehalli, Bengaluru',
    price: '₹499 onwards',
    url: 'https://www.townscript.com/e/breakthrough-run-402012',
    imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop&q=80'
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
    title: 'THE GREAT HIMALAYA DAY 2026 #VIRTUAL MARATHON & CYCLOTHON - CHENNAI',
    date: 'Sep 13',
    location: 'Poongavanapuram, Chennai',
    price: 'Free',
    url: 'https://www.townscript.com/e/virtual-marathon-cyclothon-chennai-304000',
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'World Heart Day Run/Ride 2025 - Chennai',
    date: 'Sep 20',
    location: 'Chennai',
    price: 'Free',
    url: 'https://www.townscript.com/e/world-heart-day-run-ride-2025-chennai',
    imageUrl: 'https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'Spartan 10K Run - Chennai Edition',
    date: 'Sep 06',
    location: 'Chennai',
    price: '₹425 onwards',
    url: 'https://www.townscript.com/e/spartan-10k-run-get-unique-medal-by-courier-120143',
    imageUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'Chennai Virtual Marathon & 10K',
    date: 'Sep 06',
    location: 'Chennai',
    price: '₹319 onwards',
    url: 'https://www.townscript.com/e/chennai-virtual-challenge-134321',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80'
  }
];

// Priority 3: Coimbatore Running & Trail Catalog
export const coimbatoreDataset: RawScrapedEvent[] = [
  {
    title: 'Coimbatore Marathon 2026 (14th Edition)',
    date: '2026-10-04',
    location: 'VOC Park Ground, Coimbatore',
    price: '₹950 onwards',
    url: 'https://www.townscript.com/e/coimbatore-marathon-2026',
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'Bhagat Singh Memorial Marathon 2025 - Coimbatore',
    date: 'Oct 04',
    location: 'Coimbatore',
    price: 'Free',
    url: 'https://www.townscript.com/e/bhagat-singh-memorial-marathon-2025-coimbatore',
    imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'The Coffee Trails, Coorg - Western Ghats Ultra',
    date: 'Oct 18',
    location: 'Coimbatore Hub / Madikeri',
    price: '₹1,350 onwards',
    url: 'https://www.townscript.com/e/TCT2026',
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80'
  },
  {
    title: 'Vayalada Trail Run Season 5',
    date: 'Nov 15',
    location: 'Balussery / Coimbatore Border',
    price: '₹1,500 onwards',
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

export const southIndiaTriCityDataset: RawScrapedEvent[] = [
  ...bengaluruDataset,
  ...chennaiDataset,
  ...coimbatoreDataset
];

export class PipelineOrchestrator {
  public static runSweep(): {
    report: any;
    lakehouseStats: { bronze: number; silver: number; gold: number; dlq: number };
    cityBreakdown: { Bengaluru: number; Chennai: number; Coimbatore: number };
    goldEvents: any[];
  } {
    console.log('\n======================================================');
    console.log('⚡ [ORCHESTRATOR] DISPATCHING SOUTH INDIA HUB SWEEP');
    console.log('Hubs: Chennai • Bengaluru • Coimbatore');
    console.log('======================================================');

    const worker = new TownscriptWorker();
    const report = worker.ingestBatch(southIndiaTriCityDataset);

    // Query Lakehouse counts
    const dbPath = path.resolve(__dirname, '../../data/pipeline_lakehouse.db');
    const db = new sqlite3(dbPath);

    const bronzeCount = (db.prepare('SELECT COUNT(*) as count FROM lakehouse_bronze').get() as any).count;
    const silverCount = (db.prepare('SELECT COUNT(*) as count FROM lakehouse_silver').get() as any).count;
    const goldCount = (db.prepare('SELECT COUNT(*) as count FROM lakehouse_gold').get() as any).count;
    const dlqCount = (db.prepare('SELECT COUNT(*) as count FROM lakehouse_dlq').get() as any).count;

    // City counts
    const bCount = (db.prepare("SELECT COUNT(*) as count FROM lakehouse_gold WHERE city = 'Bengaluru'").get() as any).count;
    const cCount = (db.prepare("SELECT COUNT(*) as count FROM lakehouse_gold WHERE city = 'Chennai'").get() as any).count;
    const cbCount = (db.prepare("SELECT COUNT(*) as count FROM lakehouse_gold WHERE city = 'Coimbatore'").get() as any).count;

    const goldEvents = db.prepare('SELECT * FROM lakehouse_gold ORDER BY event_date ASC').all();

    console.log('\n--- PIPELINE EXECUTION AUDIT REPORT ---');
    console.log(`Source:              ${report.source}`);
    console.log(`Total Scraped:       ${report.totalScraped}`);
    console.log(`Bronze Layer:        ${report.bronzeInserted} inserted, ${report.bronzeSkippedCdc} skipped via CDC`);
    console.log(`Silver Layer:        ${report.silverValidated} validated through strict contract`);
    console.log(`Dead Letter Queue:   ${report.dlqQuarantined} quarantined`);
    console.log(`Gold Layer:          ${report.goldUpserted} upserted into production`);
    console.log('---------------------------------------');
    console.log(`City Distribution (Gold):`);
    console.log(`• Bengaluru:   ${bCount} events`);
    console.log(`• Chennai:     ${cCount} events`);
    console.log(`• Coimbatore:  ${cbCount} events`);
    console.log('======================================================\n');

    db.close();

    return {
      report,
      lakehouseStats: { bronze: bronzeCount, silver: silverCount, gold: goldCount, dlq: dlqCount },
      cityBreakdown: { Bengaluru: bCount, Chennai: cCount, Coimbatore: cbCount },
      goldEvents
    };
  }
}

// Execute if run directly
if (require.main === module) {
  PipelineOrchestrator.runSweep();
}
