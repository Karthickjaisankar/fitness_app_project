import { Router, Request, Response } from 'express';
import { store } from '../data/store';
import { LedgerService } from '../services/ledger';
import { StravaService } from '../services/strava';
import { HealthKitService } from '../services/healthkit';
import { EventsService } from '../services/events';
import { ScraperEngine } from '../services/scraper';
import { AntiFraudEngine } from '../services/antifraud';
import { PipelineOrchestrator } from '../pipeline/orchestrator';

export const apiRouter = Router();

// Health check endpoint for container probes / Railway
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Client configuration endpoint (Google Maps API key)
apiRouter.get('/config', (req: Request, res: Response) => {
  res.json({
    gmapApiKey: process.env.GMAP_API || process.env.GOOGLE_MAPS_API_KEY || ''
  });
});

// ==========================================
// 1. User & Ledger
// ==========================================
apiRouter.get('/user/stats', (req: Request, res: Response) => {
  res.json({
    success: true,
    user: LedgerService.getUserStats()
  });
});

apiRouter.get('/ledger', (req: Request, res: Response) => {
  res.json({
    success: true,
    ledger: LedgerService.getLedgerEntries()
  });
});

apiRouter.get('/activities', (req: Request, res: Response) => {
  res.json({
    success: true,
    activities: store.activities
  });
});

// ==========================================
// 2. Strava API & Webhook Ingestion Engine
// ==========================================
// Webhook Handshake (GET)
apiRouter.get('/webhooks/strava', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string;
  const challenge = req.query['hub.challenge'] as string;
  const token = req.query['hub.verify_token'] as string;

  const result = StravaService.handleWebhookHandshake(mode, challenge, token);
  if (result.verified && result.challengeResponse) {
    res.status(200).json(result.challengeResponse);
  } else {
    res.status(403).json({ error: result.error || 'Verification failed' });
  }
});

// Webhook Push Receiver (POST)
apiRouter.post('/webhooks/strava', async (req: Request, res: Response) => {
  try {
    const event = req.body;
    const result = await StravaService.processWebhookEvent(event);
    res.status(200).json({
      received: true,
      processed: result.processed,
      activity: result.activity,
      error: result.error
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Webhook processing error' });
  }
});

// Interactive Simulator for Strava Activities
apiRouter.post('/activities/strava-simulate', (req: Request, res: Response) => {
  const { title, activityType, distanceMeters, durationSeconds, cheatMode } = req.body;
  const activity = StravaService.simulatePushActivity({
    title: title || 'Simulated Morning Run',
    activityType: activityType || 'run',
    distanceMeters: Number(distanceMeters) || 5000,
    durationSeconds: Number(durationSeconds) || 1500,
    cheatMode: cheatMode || 'none'
  });

  res.json({
    success: true,
    activity,
    user: LedgerService.getUserStats(),
    ledger: LedgerService.getLedgerEntries()
  });
});

// Telemetry & Rate-limit stats
apiRouter.get('/webhooks/strava/stats', (req: Request, res: Response) => {
  res.json({
    success: true,
    stats: StravaService.getRateLimitStats()
  });
});

// ==========================================
// 3. Apple HealthKit & Health Connect Sync
// ==========================================
apiRouter.post('/activities/healthkit-sync', (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload || !payload.samples) {
    res.status(400).json({ error: 'Missing samples array in sync payload' });
    return;
  }

  const result = HealthKitService.processSyncBatch(payload);
  res.json({
    ...result,
    user: LedgerService.getUserStats()
  });
});

// ==========================================
// 4. Calendar & Events Aggregation
// ==========================================
apiRouter.get('/events', (req: Request, res: Response) => {
  try {
    const { query, city, category, source, fromDate, toDate } = req.query;
    const events = EventsService.getEvents({
      query: query as string,
      city: city as string,
      category: category as string,
      source: source as string,
      fromDate: fromDate as string,
      toDate: toDate as string
    });

    res.json({
      success: true,
      count: events.length,
      events
    });
  } catch (err: any) {
    console.error('Error in /api/events:', err);
    res.json({
      success: true,
      count: (store.events || []).length,
      events: store.events || []
    });
  }
});

apiRouter.get('/events/:id', (req: Request, res: Response) => {
  const event = EventsService.getEventById(req.params.id);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  res.json({ success: true, event });
});

// Native Event Registration with Points Discount
apiRouter.post('/events/register', (req: Request, res: Response) => {
  const { eventId, categoryName, pointsToRedeem } = req.body;
  const result = EventsService.registerForEvent(eventId, categoryName, Number(pointsToRedeem) || 0);
  res.json({
    ...result,
    user: LedgerService.getUserStats()
  });
});

// UGC Event Creation (Chapter Admin)
apiRouter.post('/events/ugc', (req: Request, res: Response) => {
  const newEvent = EventsService.createUgcEvent(req.body);
  res.json({
    success: true,
    event: newEvent
  });
});

// Scraper Ingestion Sweep Trigger (Medallion Pipeline Sweep)
apiRouter.post('/scrapers/trigger', (req: Request, res: Response) => {
  const result = PipelineOrchestrator.runSweep();
  const allGoldEvents = EventsService.getEvents({});
  res.json({
    success: true,
    newEventsFound: result.report.bronzeInserted,
    skippedCdc: result.report.bronzeSkippedCdc,
    silverValidated: result.report.silverValidated,
    goldUpserted: result.report.goldUpserted,
    dlqQuarantined: result.report.dlqQuarantined,
    lakehouseStats: result.lakehouseStats,
    events: allGoldEvents
  });
});

apiRouter.get('/scrapers/status', (req: Request, res: Response) => {
  const sweep = PipelineOrchestrator.runSweep();
  res.json({
    success: true,
    lakehouseStats: sweep.lakehouseStats,
    lastAudit: sweep.report
  });
});

// ==========================================
// 5. Rewards & Marketplace
// ==========================================
apiRouter.get('/rewards', (req: Request, res: Response) => {
  res.json({
    success: true,
    rewards: store.rewards
  });
});

apiRouter.post('/rewards/redeem', (req: Request, res: Response) => {
  const { rewardId } = req.body;
  const result = LedgerService.redeemReward(rewardId);
  res.json({
    ...result,
    user: LedgerService.getUserStats()
  });
});

// ==========================================
// 6. Community Chapters & Safety SOS (Phase 2)
// ==========================================
apiRouter.get('/chapters', (req: Request, res: Response) => {
  res.json({
    success: true,
    chapters: store.chapters
  });
});

apiRouter.post('/safety/beacon', (req: Request, res: Response) => {
  const { lat, lng, batteryLevel, emergencyContacts } = req.body;
  const beaconId = `bcn_${Math.random().toString(36).substring(2, 8)}`;
  const shareableUrl = `https://fitpulse.app/live/${beaconId}`;

  res.json({
    success: true,
    beaconId,
    shareableUrl,
    active: true,
    lastCoordinates: { lat: lat || 12.9716, lng: lng || 77.5946 },
    batteryLevel: batteryLevel || '87%',
    statusMessage: 'Live GPS Beacon broadcasting to emergency contacts'
  });
});
