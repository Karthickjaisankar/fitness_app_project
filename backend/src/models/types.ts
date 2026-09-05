export type ActivitySource = 'strava' | 'apple_health' | 'health_connect' | 'manual_gpx';
export type ActivityType = 'run' | 'ride' | 'walk' | 'trail_run' | 'virtual_ride';
export type FraudStatus = 'APPROVED' | 'FLAGGED_REVIEW' | 'REJECTED';

export interface TelemetryPoint {
  lat: number;
  lng: number;
  timestamp: number; // epoch ms
  altitude?: number;
  speed?: number;
}

export interface Activity {
  id: string;
  userId: string;
  source: ActivitySource;
  externalId: string;
  activityType: ActivityType;
  title: string;
  distanceMeters: number;
  durationSeconds: number;
  movingTimeSeconds: number;
  averageSpeedKmh: number;
  maxSpeedKmh?: number;
  elevationGainMeters?: number;
  startTimestamp: string;
  endTimestamp: string;
  telemetryPoints?: TelemetryPoint[];
  fraudStatus: FraudStatus;
  fraudReasons: string[];
  pointsAwarded: number;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  userId: string;
  activityId?: string;
  type: 'EARN_DISTANCE' | 'REDEEM_REWARD' | 'ADJUSTMENT' | 'BONUS';
  points: number;
  balanceAfter: number;
  description: string;
  status: 'POSTED' | 'PENDING' | 'CAPPED';
  timestamp: string;
}

export interface UserStats {
  userId: string;
  name: string;
  avatarUrl: string;
  totalPoints: number;
  lifetimePoints: number;
  todayPointsEarned: number;
  dailyCap: number;
  totalDistanceKm: number;
  totalActivitiesCount: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Elite';
  stravaConnected: boolean;
  healthKitConnected: boolean;
}

export interface DistanceCategory {
  name: string; // e.g. '5K Fun Run', '10K Challenge', 'Half Marathon (21.1K)', 'Full Marathon (42.2K)', '100K Brevet'
  distanceKm: number;
  priceInr: number;
}

export interface FitnessEvent {
  id: string;
  title: string;
  slug: string;
  organizer: string;
  date: string; // YYYY-MM-DD
  time: string;
  city: string;
  state: string;
  venue: string;
  distanceCategories: DistanceCategory[];
  tags: string[];
  priceFromInr: number;
  registrationUrl: string;
  source: 'Townscript' | 'Eventbrite' | 'ChapterUGC';
  verified: boolean;
  bannerUrl: string;
  coordinates?: { lat: number; lng: number };
}

export interface StravaWebhookEvent {
  object_type: 'activity' | 'athlete';
  object_id: number;
  aspect_type: 'create' | 'update' | 'delete';
  owner_id: number;
  subscription_id: number;
  event_time: number;
  updates?: Record<string, unknown>;
}

export interface HealthKitSyncPayload {
  userId: string;
  source: 'apple_health' | 'health_connect';
  syncTimestamp: string;
  samples: Array<{
    id: string;
    activityType: ActivityType;
    startDate: string;
    endDate: string;
    distanceMeters: number;
    durationSeconds: number;
    cadenceAvg?: number;
    heartRateAvg?: number;
    telemetryPoints?: TelemetryPoint[];
  }>;
}

export interface RewardItem {
  id: string;
  title: string;
  brand: string;
  category: 'nutrition' | 'gear' | 'event_discount' | 'membership';
  costPoints: number;
  originalPriceInr: number;
  discountValue: string;
  couponCodeTemplate: string;
  imageUrl: string;
  stockCount: number;
}
