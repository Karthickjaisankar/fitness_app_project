import fs from 'fs';
import path from 'path';
import sqlite3 from 'better-sqlite3';

const dbDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'pipeline_lakehouse.db');
const db = new sqlite3(dbPath);

console.log(`[LAKEHOUSE] Initializing SQLite Medallion Tables at: ${dbPath}`);

// Enable WAL mode for high concurrent throughput
db.pragma('journal_mode = WAL');

// 1. Bronze Layer (Raw Ingestion Lake)
db.exec(`
  CREATE TABLE IF NOT EXISTS lakehouse_bronze (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    external_id TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    raw_payload TEXT NOT NULL,
    status_code INTEGER DEFAULT 200,
    crawled_at TEXT DEFAULT (datetime('now')),
    UNIQUE(source, external_id, content_hash)
  );
  CREATE INDEX IF NOT EXISTS idx_bronze_source_ext ON lakehouse_bronze (source, external_id);
  CREATE INDEX IF NOT EXISTS idx_bronze_hash ON lakehouse_bronze (content_hash);
`);

// 2. Silver Layer (Clean & Normalized Data Contract)
db.exec(`
  CREATE TABLE IF NOT EXISTS lakehouse_silver (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    external_id TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    organizer TEXT,
    event_date TEXT NOT NULL,
    event_time TEXT,
    city TEXT NOT NULL,
    state TEXT,
    venue TEXT,
    lat REAL,
    lng REAL,
    price_from_inr INTEGER DEFAULT 0,
    categories_json TEXT NOT NULL,
    tags_json TEXT NOT NULL,
    registration_url TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    processed_at TEXT DEFAULT (datetime('now')),
    UNIQUE(source, external_id)
  );
  CREATE INDEX IF NOT EXISTS idx_silver_date_city ON lakehouse_silver (event_date, city);
`);

// 3. Gold Layer (Deduplicated Canonical Production Catalog)
db.exec(`
  CREATE TABLE IF NOT EXISTS lakehouse_gold (
    canonical_id TEXT PRIMARY KEY,
    canonical_title TEXT NOT NULL,
    canonical_slug TEXT NOT NULL UNIQUE,
    event_date TEXT NOT NULL,
    city TEXT NOT NULL,
    venue TEXT,
    lat REAL,
    lng REAL,
    price_from_inr INTEGER DEFAULT 0,
    categories_json TEXT NOT NULL,
    tags_json TEXT NOT NULL,
    booking_links_json TEXT NOT NULL,
    primary_source TEXT NOT NULL,
    verified INTEGER DEFAULT 1,
    banner_url TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_gold_date_city ON lakehouse_gold (event_date, city);
`);

// 4. Dead Letter Queue (DLQ)
db.exec(`
  CREATE TABLE IF NOT EXISTS lakehouse_dlq (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    external_id TEXT,
    failure_reason TEXT NOT NULL,
    raw_payload TEXT,
    quarantined_at TEXT DEFAULT (datetime('now'))
  );
`);

console.log('✅ [LAKEHOUSE] Bronze, Silver, Gold, and DLQ schemas successfully initialized.');
db.close();
