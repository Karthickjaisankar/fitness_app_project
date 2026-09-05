import { AntiFraudEngine } from './services/antifraud';
import { LedgerService } from './services/ledger';
import { StravaService } from './services/strava';
import { HealthKitService } from './services/healthkit';
import { EventsService } from './services/events';
import { ScraperEngine } from './services/scraper';
import { store } from './data/store';

async function runVerificationSuite() {
  console.log('====================================================');
  console.log('🚀 RUNNING COMPREHENSIVE FITNESS APP VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `- ${detail}` : ''}`);
    }
  }

  // ----------------------------------------------------
  // Test 1: Strava Webhook Subscription Handshake
  // ----------------------------------------------------
  console.log('--- TEST GROUP 1: Strava Webhook Handshake ---');
  const validHandshake = StravaService.handleWebhookHandshake(
    'subscribe',
    'challenge_code_98765',
    'STRAVA_FITNESS_APP_TOKEN_99'
  );
  assert(
    validHandshake.verified && validHandshake.challengeResponse?.['hub.challenge'] === 'challenge_code_98765',
    'Strava subscription handshake succeeds with matching verify_token and returns hub.challenge'
  );

  const invalidHandshake = StravaService.handleWebhookHandshake('subscribe', 'challenge_code_98765', 'wrong_token');
  assert(!invalidHandshake.verified, 'Strava handshake rejects illegitimate verify_token');

  // ----------------------------------------------------
  // Test 2: Anti-Fraud Engine - Pace Anomalies
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 2: Anti-Fraud Engine ---');
  // Case A: Legit 5km run @ 5:00 min/km (1500s)
  const legitRun = AntiFraudEngine.evaluateActivity({
    userId: 'usr_athlete_42',
    activityType: 'run',
    distanceMeters: 5000,
    durationSeconds: 1500,
    movingTimeSeconds: 1500,
    startTimestamp: new Date().toISOString()
  });
  assert(
    legitRun.status === 'APPROVED' && legitRun.pointsEligible === 50,
    'Legit 5K run (5:00 min/km) is APPROVED and awards 50 points'
  );

  // Case B: Fraudulent run @ 1:00 min/km (60 km/h)
  const fraudRun = AntiFraudEngine.evaluateActivity({
    userId: 'usr_athlete_42',
    activityType: 'run',
    distanceMeters: 10000,
    durationSeconds: 600, // 10 mins for 10 km
    movingTimeSeconds: 600,
    startTimestamp: new Date().toISOString()
  });
  assert(
    fraudRun.status === 'REJECTED' &&
      fraudRun.pointsAwarded === 0 &&
      fraudRun.reasons.some((r) => r.includes('IMPOSSIBLE_RUN_PACE')),
    'Impossible run pace (< 2:10 min/km) is REJECTED with 0 points awarded'
  );

  // Case C: GPS Teleportation Spoof
  const now = Date.now();
  const teleportRun = AntiFraudEngine.evaluateActivity({
    userId: 'usr_athlete_42',
    activityType: 'run',
    distanceMeters: 10000,
    durationSeconds: 3000,
    movingTimeSeconds: 3000,
    startTimestamp: new Date().toISOString(),
    telemetryPoints: [
      { lat: 12.9716, lng: 77.5946, timestamp: now },
      { lat: 18.9401, lng: 72.8347, timestamp: now + 5000 } // ~850 km in 5 seconds
    ]
  });
  assert(
    teleportRun.status === 'REJECTED' && teleportRun.reasons.some((r) => r.includes('GPS_TELEPORTATION')),
    'GPS Teleportation coordinate jump (>120 km/h) is flagged and REJECTED'
  );

  // ----------------------------------------------------
  // Test 3: Transactional Reward Ledger & Daily Cap
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 3: Transactional Ledger & Cap ---');
  const initialBalance = store.user.totalPoints;
  const initialToday = store.user.todayPointsEarned;
  const dailyCap = store.user.dailyCap;

  // Post a 10km run (100 points)
  const dummyActivity: any = {
    id: 'act_test_10k',
    userId: store.user.userId,
    activityType: 'run',
    distanceMeters: 10000,
    title: 'Test Verification 10K Run'
  };

  const remainingAllowance = dailyCap - initialToday;
  const expectedPoints = Math.min(100, remainingAllowance);
  const ledgerEntry = LedgerService.postActivityPoints(dummyActivity, expectedPoints, 100 > expectedPoints);

  assert(
    ledgerEntry !== null && store.user.totalPoints === initialBalance + expectedPoints,
    `Ledger credits ${expectedPoints} points atomically (New Balance: ${store.user.totalPoints})`
  );

  // ----------------------------------------------------
  // Test 4: Apple HealthKit / Health Connect Sync Batch
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 4: Apple HealthKit Sync Batch ---');
  const syncResult = HealthKitService.processSyncBatch({
    userId: store.user.userId,
    source: 'apple_health',
    syncTimestamp: new Date().toISOString(),
    samples: [
      {
        id: `hk_sample_${Date.now()}`,
        activityType: 'run',
        startDate: new Date(Date.now() - 3600000).toISOString(),
        endDate: new Date().toISOString(),
        distanceMeters: 4000,
        durationSeconds: 1200 // 20 mins -> 5:00 min/km
      }
    ]
  });
  assert(
    syncResult.success && syncResult.approvedCount === 1,
    'Apple HealthKit distance samples parsed, validated and synchronized'
  );

  // ----------------------------------------------------
  // Test 5: Normalized Calendar & Autonomous Scraper Sweep
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 5: Calendar Ingestion & Scrapers ---');
  const initialEventCount = store.events.length;
  assert(initialEventCount >= 7, `Pre-seeded calendar has ${initialEventCount} fitness events across major cities`);

  // Filter verification
  const bengaluruEvents = EventsService.getEvents({ city: 'Bengaluru' });
  assert(bengaluruEvents.length > 0, `Filter by city=Bengaluru returns ${bengaluruEvents.length} events`);

  const marathonEvents = EventsService.getEvents({ category: 'marathon' });
  assert(marathonEvents.length > 0, `Filter by category=marathon returns ${marathonEvents.length} events`);

  // Autonomous Scraper Sweep Trigger
  const scraperRun = await ScraperEngine.triggerIngestionSweep();
  assert(scraperRun.success && scraperRun.events.length >= initialEventCount, 'Scraper sweep indexes and normalizes Townscript & Eventbrite events');

  // ----------------------------------------------------
  // Test 6: Direct Event Registration with Points Redemption
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 6: Native Ticketing & Point Redemption ---');
  const testEvent = store.events[0];
  const balanceBeforeReg = store.user.totalPoints;
  const regResult = EventsService.registerForEvent(testEvent.id, testEvent.distanceCategories[0].name, 50);

  assert(
    regResult.success &&
      regResult.pointsRedeemed === 50 &&
      regResult.discountInr === 100 &&
      store.user.totalPoints === balanceBeforeReg - 50,
    `Event registration applies ₹100 discount in exchange for 50 reward points`
  );

  // ----------------------------------------------------
  // Test 7: Rewards Store Voucher Redemption
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 7: Reward Store Redemption ---');
  const rewardItem = store.rewards[0];
  const balanceBeforeReward = store.user.totalPoints;
  const redeemResult = LedgerService.redeemReward(rewardItem.id);

  assert(
    redeemResult.success &&
      Boolean(redeemResult.code) &&
      store.user.totalPoints === balanceBeforeReward - rewardItem.costPoints,
    `Redeemed ${rewardItem.title} - Voucher Code generated: ${redeemResult.code}`
  );

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVerificationSuite();
