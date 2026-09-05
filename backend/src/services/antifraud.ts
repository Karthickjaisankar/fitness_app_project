import { ActivityType, TelemetryPoint, FraudStatus } from '../models/types';
import { store } from '../data/store';

export interface FraudEvaluationResult {
  status: FraudStatus;
  reasons: string[];
  calculatedPaceSecPerKm: number;
  calculatedSpeedKmh: number;
  pointsEligible: number;
  pointsAwarded: number;
  capRemainingToday: number;
  isCapped: boolean;
}

export class AntiFraudEngine {
  // Biomechanical and vehicular thresholds
  private static readonly MIN_RUN_PACE_SEC_KM = 130; // 2:10 min/km (sub-human marathon/interval pace)
  private static readonly MAX_RUN_SPEED_KMH = 27.7; // ~2:10 min/km
  private static readonly MAX_CYCLE_SPEED_KMH = 65.0; // Flat road threshold
  private static readonly MAX_WALK_SPEED_KMH = 9.5;
  private static readonly TELEPORTATION_SPEED_KMH = 120.0; // Impossible sudden jump between telemetry points

  /**
   * Evaluates an activity against biometric and GPS integrity rules.
   */
  public static evaluateActivity(params: {
    userId: string;
    activityType: ActivityType;
    distanceMeters: number;
    durationSeconds: number;
    movingTimeSeconds: number;
    telemetryPoints?: TelemetryPoint[];
    elevationGainMeters?: number;
    startTimestamp: string;
  }): FraudEvaluationResult {
    const reasons: string[] = [];
    const distanceKm = params.distanceMeters / 1000;
    const effectiveDuration = Math.max(params.movingTimeSeconds || params.durationSeconds, 1);
    const speedMps = params.distanceMeters / effectiveDuration;
    const speedKmh = Number((speedMps * 3.6).toFixed(2));
    const paceSecPerKm = distanceKm > 0 ? effectiveDuration / distanceKm : 0;

    // 1. Check distance validity
    if (params.distanceMeters <= 50) {
      reasons.push('DISTANCE_TOO_SHORT: Activity distance is less than 50 meters.');
    }

    // 2. Pace & Speed Anomaly Detection
    if (params.activityType === 'run' || params.activityType === 'trail_run') {
      if (speedKmh > this.MAX_RUN_SPEED_KMH || (paceSecPerKm > 0 && paceSecPerKm < this.MIN_RUN_PACE_SEC_KM)) {
        const paceFormatted = this.formatPace(paceSecPerKm);
        reasons.push(
          `IMPOSSIBLE_RUN_PACE: Average pace of ${paceFormatted} (${speedKmh} km/h) exceeds human physical endurance limits.`
        );
      }
    } else if (params.activityType === 'ride' || params.activityType === 'virtual_ride') {
      if (speedKmh > this.MAX_CYCLE_SPEED_KMH) {
        // Allow high speeds only if massive negative elevation (not checked here)
        reasons.push(
          `MOTOR_VEHICLE_SUSPICION: Average cycling speed of ${speedKmh} km/h exceeds non-motorized cycling benchmarks.`
        );
      }
    } else if (params.activityType === 'walk') {
      if (speedKmh > this.MAX_WALK_SPEED_KMH) {
        reasons.push(`UNREALISTIC_WALK_SPEED: Walking speed of ${speedKmh} km/h indicates running or transport.`);
      }
    }

    // 3. Telemetry & GPS Jump Analysis
    if (params.telemetryPoints && params.telemetryPoints.length > 1) {
      let teleportCount = 0;
      for (let i = 1; i < params.telemetryPoints.length; i++) {
        const prev = params.telemetryPoints[i - 1];
        const curr = params.telemetryPoints[i];
        const timeDiffSec = Math.abs(curr.timestamp - prev.timestamp) / 1000;
        
        if (timeDiffSec > 0) {
          const distKm = this.haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
          const segmentSpeedKmh = (distKm / timeDiffSec) * 3600;
          if (segmentSpeedKmh > this.TELEPORTATION_SPEED_KMH) {
            teleportCount++;
          }
        }
      }

      if (teleportCount > 0) {
        reasons.push(
          `GPS_TELEPORTATION: Detected ${teleportCount} coordinate jump(s) exceeding ${this.TELEPORTATION_SPEED_KMH} km/h.`
        );
      }
    }

    // 4. Duplicate Check
    const isDuplicate = store.activities.some(
      (a) =>
        a.userId === params.userId &&
        Math.abs(new Date(a.startTimestamp).getTime() - new Date(params.startTimestamp).getTime()) < 60000 &&
        Math.abs(a.distanceMeters - params.distanceMeters) < 10
    );
    if (isDuplicate) {
      reasons.push('DUPLICATE_ACTIVITY: An identical activity has already been credited.');
    }

    // 5. Determine Status
    let status: FraudStatus = 'APPROVED';
    if (reasons.length > 0) {
      status = reasons.some((r) => r.startsWith('IMPOSSIBLE') || r.startsWith('DUPLICATE') || r.startsWith('GPS_TELEPORTATION'))
        ? 'REJECTED'
        : 'FLAGGED_REVIEW';
    }

    // 6. Point Calculation with Daily Cap
    // Formula: Run/Walk: 1 KM = 10 Points. Cycling: 1 KM = 3.33 Points (3 km = 10 pts).
    let pointsEligible = 0;
    if (params.activityType === 'run' || params.activityType === 'trail_run' || params.activityType === 'walk') {
      pointsEligible = Math.floor(distanceKm * 10);
    } else {
      pointsEligible = Math.floor(distanceKm * 3.33);
    }

    // If fraudulent, points are 0
    if (status !== 'APPROVED') {
      pointsEligible = 0;
    }

    // Daily Cap calculation
    const todayEarned = store.user.todayPointsEarned;
    const dailyCap = store.user.dailyCap;
    const capRemainingToday = Math.max(0, dailyCap - todayEarned);

    let pointsAwarded = Math.min(pointsEligible, capRemainingToday);
    const isCapped = pointsEligible > pointsAwarded;

    return {
      status,
      reasons,
      calculatedPaceSecPerKm: Number(paceSecPerKm.toFixed(1)),
      calculatedSpeedKmh: speedKmh,
      pointsEligible,
      pointsAwarded,
      capRemainingToday,
      isCapped
    };
  }

  private static formatPace(paceSecPerKm: number): string {
    const mins = Math.floor(paceSecPerKm / 60);
    const secs = Math.floor(paceSecPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')} min/km`;
  }

  private static haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
