import { v4 as uuidv4 } from 'uuid';
import { Activity, LedgerEntry, UserStats } from '../models/types';
import { store } from '../data/store';

export class LedgerService {
  /**
   * Posts activity points to the ledger atomically
   */
  public static postActivityPoints(activity: Activity, pointsAwarded: number, isCapped: boolean): LedgerEntry | null {
    if (pointsAwarded <= 0) {
      return null;
    }

    const currentBalance = store.user.totalPoints;
    const newBalance = currentBalance + pointsAwarded;

    const entry: LedgerEntry = {
      id: `led_${uuidv4().substring(0, 8)}`,
      userId: store.user.userId,
      activityId: activity.id,
      type: 'EARN_DISTANCE',
      points: pointsAwarded,
      balanceAfter: newBalance,
      description: `${(activity.distanceMeters / 1000).toFixed(1)} KM ${activity.activityType.toUpperCase()} (+${pointsAwarded} pts)${
        isCapped ? ' [Daily Cap Reached]' : ''
      }`,
      status: isCapped ? 'CAPPED' : 'POSTED',
      timestamp: new Date().toISOString()
    };

    // Update store state
    store.ledger.unshift(entry);
    store.user.totalPoints = newBalance;
    store.user.lifetimePoints += pointsAwarded;
    store.user.todayPointsEarned += pointsAwarded;
    store.user.totalDistanceKm = Number((store.user.totalDistanceKm + activity.distanceMeters / 1000).toFixed(1));
    store.user.totalActivitiesCount += 1;

    // Recalculate Tier
    this.updateUserTier();

    return entry;
  }

  /**
   * Redeems a reward, deducting points from user balance
   */
  public static redeemReward(rewardId: string): { success: boolean; message: string; code?: string; newBalance?: number } {
    const reward = store.rewards.find((r) => r.id === rewardId);
    if (!reward) {
      return { success: false, message: 'Reward item not found' };
    }

    if (store.user.totalPoints < reward.costPoints) {
      return {
        success: false,
        message: `Insufficient points. Required: ${reward.costPoints}, Available: ${store.user.totalPoints}`
      };
    }

    if (reward.stockCount <= 0) {
      return { success: false, message: 'Reward is currently out of stock' };
    }

    // Deduct points
    reward.stockCount -= 1;
    const newBalance = store.user.totalPoints - reward.costPoints;
    const uniqueCoupon = reward.couponCodeTemplate.replace('{{ID}}', Math.random().toString(36).substring(2, 8).toUpperCase());

    const entry: LedgerEntry = {
      id: `led_${uuidv4().substring(0, 8)}`,
      userId: store.user.userId,
      type: 'REDEEM_REWARD',
      points: -reward.costPoints,
      balanceAfter: newBalance,
      description: `Redeemed ${reward.title} (-${reward.costPoints} pts)`,
      status: 'POSTED',
      timestamp: new Date().toISOString()
    };

    store.ledger.unshift(entry);
    store.user.totalPoints = newBalance;

    return {
      success: true,
      message: `Successfully redeemed! Voucher Code: ${uniqueCoupon}`,
      code: uniqueCoupon,
      newBalance
    };
  }

  /**
   * Recalculates user tier dynamically based on lifetime points
   */
  public static updateUserTier(): void {
    const lifetime = store.user.lifetimePoints;
    if (lifetime >= 2500) {
      store.user.tier = 'Elite';
    } else if (lifetime >= 1000) {
      store.user.tier = 'Gold';
    } else if (lifetime >= 400) {
      store.user.tier = 'Silver';
    } else {
      store.user.tier = 'Bronze';
    }
  }

  public static getUserStats(): UserStats {
    return { ...store.user };
  }

  public static getLedgerEntries(): LedgerEntry[] {
    return [...store.ledger];
  }
}
