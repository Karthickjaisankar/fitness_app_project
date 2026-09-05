import { v4 as uuidv4 } from 'uuid';
import { Activity, StravaWebhookEvent, ActivityType } from '../models/types';
import { store } from '../data/store';
import { AntiFraudEngine } from './antifraud';
import { LedgerService } from './ledger';

export class StravaService {
  public static readonly STRAVA_VERIFY_TOKEN = process.env.STRAVA_VERIFY_TOKEN || 'STRAVA_FITNESS_APP_TOKEN_99';
  
  // Rate-limiting telemetry tracker to demonstrate webhook vs polling savings
  private static rateLimitStats = {
    webhookEventsReceived: 14,
    apiCallsSavedVsPolling: 4820,
    rateLimitRemaining15Min: 98,
    rateLimitRemainingDaily: 986
  };

  /**
   * Strava Webhook Subscription Handshake verification
   * Handles GET /api/webhooks/strava?hub.mode=subscribe&hub.challenge=xxx&hub.verify_token=yyy
   */
  public static handleWebhookHandshake(mode?: string, challenge?: string, verifyToken?: string): { verified: boolean; challengeResponse?: { 'hub.challenge': string }; error?: string } {
    if (mode === 'subscribe' && verifyToken === this.STRAVA_VERIFY_TOKEN) {
      return {
        verified: true,
        challengeResponse: { 'hub.challenge': challenge || '' }
      };
    }
    return {
      verified: false,
      error: 'Invalid verify_token or unsupported hub.mode'
    };
  }

  /**
   * Processes an incoming Strava Webhook push notification
   * Handles POST /api/webhooks/strava
   */
  public static async processWebhookEvent(event: StravaWebhookEvent): Promise<{ processed: boolean; activity?: Activity; error?: string }> {
    this.rateLimitStats.webhookEventsReceived += 1;
    this.rateLimitStats.apiCallsSavedVsPolling += 150; // Every pushed activity saves a continuous 1-min polling loop

    if (event.object_type !== 'activity' || event.aspect_type !== 'create') {
      return { processed: false, error: `Ignoring non-create event: ${event.aspect_type} on ${event.object_type}` };
    }

    // In production, backend issues an authenticated GET /api/v3/activities/{id} using athlete OAuth token
    // Here we simulate fetching the activity payload or construct it
    const simulatedStravaActivity = this.mockFetchStravaActivity(event.object_id, event.owner_id);
    
    // Evaluate Anti-Fraud
    const fraudEval = AntiFraudEngine.evaluateActivity({
      userId: store.user.userId,
      activityType: simulatedStravaActivity.activityType,
      distanceMeters: simulatedStravaActivity.distanceMeters,
      durationSeconds: simulatedStravaActivity.durationSeconds,
      movingTimeSeconds: simulatedStravaActivity.movingTimeSeconds,
      startTimestamp: simulatedStravaActivity.startTimestamp,
      telemetryPoints: simulatedStravaActivity.telemetryPoints
    });

    const activity: Activity = {
      id: `act_${uuidv4().substring(0, 8)}`,
      userId: store.user.userId,
      source: 'strava',
      externalId: `strava_${event.object_id}`,
      activityType: simulatedStravaActivity.activityType,
      title: simulatedStravaActivity.title,
      distanceMeters: simulatedStravaActivity.distanceMeters,
      durationSeconds: simulatedStravaActivity.durationSeconds,
      movingTimeSeconds: simulatedStravaActivity.movingTimeSeconds,
      averageSpeedKmh: fraudEval.calculatedSpeedKmh,
      maxSpeedKmh: Number((fraudEval.calculatedSpeedKmh * 1.3).toFixed(1)),
      elevationGainMeters: simulatedStravaActivity.elevationGainMeters,
      startTimestamp: simulatedStravaActivity.startTimestamp,
      endTimestamp: simulatedStravaActivity.endTimestamp,
      telemetryPoints: simulatedStravaActivity.telemetryPoints,
      fraudStatus: fraudEval.status,
      fraudReasons: fraudEval.reasons,
      pointsAwarded: fraudEval.pointsAwarded,
      createdAt: new Date().toISOString()
    };

    // Store activity
    store.activities.unshift(activity);

    // If approved, credit to Ledger
    if (fraudEval.status === 'APPROVED' && fraudEval.pointsAwarded > 0) {
      LedgerService.postActivityPoints(activity, fraudEval.pointsAwarded, fraudEval.isCapped);
    }

    return { processed: true, activity };
  }

  /**
   * Helper simulator for testing webhook events directly from the UI or tests
   */
  public static simulatePushActivity(params: {
    title: string;
    activityType: ActivityType;
    distanceMeters: number;
    durationSeconds: number;
    cheatMode?: 'none' | 'impossible_pace' | 'gps_jump';
  }): Activity {
    const isRun = params.activityType === 'run' || params.activityType === 'trail_run';
    let duration = params.durationSeconds;
    let telemetryPoints = undefined;

    if (params.cheatMode === 'impossible_pace') {
      // 10km in 10 mins (~60 km/h on foot)
      duration = Math.max(120, Math.floor(params.distanceMeters / 15));
    } else if (params.cheatMode === 'gps_jump') {
      // Teleportation coordinates
      const now = Date.now();
      telemetryPoints = [
        { lat: 12.9716, lng: 77.5946, timestamp: now }, // Bengaluru
        { lat: 18.9401, lng: 72.8347, timestamp: now + 5000 } // Mumbai in 5 seconds!
      ];
    }

    const eventTime = Date.now();
    const startIso = new Date(eventTime - duration * 1000).toISOString();
    const endIso = new Date(eventTime).toISOString();

    const fraudEval = AntiFraudEngine.evaluateActivity({
      userId: store.user.userId,
      activityType: params.activityType,
      distanceMeters: params.distanceMeters,
      durationSeconds: duration,
      movingTimeSeconds: Math.floor(duration * 0.98),
      startTimestamp: startIso,
      telemetryPoints
    });

    const activity: Activity = {
      id: `act_${uuidv4().substring(0, 8)}`,
      userId: store.user.userId,
      source: 'strava',
      externalId: `strava_${Math.floor(Math.random() * 10000000)}`,
      activityType: params.activityType,
      title: params.title,
      distanceMeters: params.distanceMeters,
      durationSeconds: duration,
      movingTimeSeconds: Math.floor(duration * 0.98),
      averageSpeedKmh: fraudEval.calculatedSpeedKmh,
      maxSpeedKmh: Number((fraudEval.calculatedSpeedKmh * 1.25).toFixed(1)),
      elevationGainMeters: isRun ? 42 : 180,
      startTimestamp: startIso,
      endTimestamp: endIso,
      telemetryPoints,
      fraudStatus: fraudEval.status,
      fraudReasons: fraudEval.reasons,
      pointsAwarded: fraudEval.pointsAwarded,
      createdAt: new Date().toISOString()
    };

    store.activities.unshift(activity);

    if (fraudEval.status === 'APPROVED' && fraudEval.pointsAwarded > 0) {
      LedgerService.postActivityPoints(activity, fraudEval.pointsAwarded, fraudEval.isCapped);
    }

    return activity;
  }

  public static getRateLimitStats() {
    return { ...this.rateLimitStats };
  }

  private static mockFetchStravaActivity(objectId: number, athleteId: number) {
    return {
      title: `Strava Morning Run #${objectId.toString().slice(-4)}`,
      activityType: 'run' as ActivityType,
      distanceMeters: 6200,
      durationSeconds: 1980, // ~33 mins
      movingTimeSeconds: 1940,
      elevationGainMeters: 54,
      startTimestamp: new Date(Date.now() - 2000000).toISOString(),
      endTimestamp: new Date().toISOString(),
      telemetryPoints: []
    };
  }
}
