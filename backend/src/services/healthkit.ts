import { v4 as uuidv4 } from 'uuid';
import { Activity, HealthKitSyncPayload, ActivityType } from '../models/types';
import { store } from '../data/store';
import { AntiFraudEngine } from './antifraud';
import { LedgerService } from './ledger';

export class HealthKitService {
  /**
   * Processes a batch of on-device fitness records synced from Apple HealthKit or Google Health Connect
   */
  public static processSyncBatch(payload: HealthKitSyncPayload): {
    success: boolean;
    totalProcessed: number;
    approvedCount: number;
    flaggedCount: number;
    totalPointsCredited: number;
    results: Array<{ sampleId: string; activityId?: string; status: string; points: number; reasons: string[] }>;
  } {
    let approvedCount = 0;
    let flaggedCount = 0;
    let totalPointsCredited = 0;
    const results: Array<{ sampleId: string; activityId?: string; status: string; points: number; reasons: string[] }> = [];

    for (const sample of payload.samples) {
      // Evaluate Anti-Fraud
      const fraudEval = AntiFraudEngine.evaluateActivity({
        userId: payload.userId,
        activityType: sample.activityType,
        distanceMeters: sample.distanceMeters,
        durationSeconds: sample.durationSeconds,
        movingTimeSeconds: sample.durationSeconds,
        startTimestamp: sample.startDate,
        telemetryPoints: sample.telemetryPoints
      });

      const title =
        sample.activityType === 'run'
          ? `Apple Health Run (${(sample.distanceMeters / 1000).toFixed(1)} km)`
          : `Health Connect ${(sample.distanceMeters / 1000).toFixed(1)} km`;

      const activity: Activity = {
        id: `act_${uuidv4().substring(0, 8)}`,
        userId: payload.userId,
        source: payload.source,
        externalId: sample.id,
        activityType: sample.activityType,
        title,
        distanceMeters: sample.distanceMeters,
        durationSeconds: sample.durationSeconds,
        movingTimeSeconds: sample.durationSeconds,
        averageSpeedKmh: fraudEval.calculatedSpeedKmh,
        maxSpeedKmh: Number((fraudEval.calculatedSpeedKmh * 1.2).toFixed(1)),
        startTimestamp: sample.startDate,
        endTimestamp: sample.endDate,
        telemetryPoints: sample.telemetryPoints,
        fraudStatus: fraudEval.status,
        fraudReasons: fraudEval.reasons,
        pointsAwarded: fraudEval.pointsAwarded,
        createdAt: new Date().toISOString()
      };

      store.activities.unshift(activity);

      if (fraudEval.status === 'APPROVED' && fraudEval.pointsAwarded > 0) {
        approvedCount++;
        totalPointsCredited += fraudEval.pointsAwarded;
        LedgerService.postActivityPoints(activity, fraudEval.pointsAwarded, fraudEval.isCapped);
      } else {
        flaggedCount++;
      }

      results.push({
        sampleId: sample.id,
        activityId: activity.id,
        status: fraudEval.status,
        points: fraudEval.pointsAwarded,
        reasons: fraudEval.reasons
      });
    }

    return {
      success: true,
      totalProcessed: payload.samples.length,
      approvedCount,
      flaggedCount,
      totalPointsCredited,
      results
    };
  }
}
