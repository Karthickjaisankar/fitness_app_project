// API Service layer connecting frontend to the backend REST endpoints
const API_BASE = '/api';

export const api = {
  // User Stats & Profile
  async getUserStats() {
    const res = await fetch(`${API_BASE}/user/stats`);
    return res.json();
  },

  // Client Config (Google Maps API Key)
  async getConfig() {
    try {
      const res = await fetch(`${API_BASE}/config`);
      return res.json();
    } catch (e) {
      return { gmapApiKey: '' };
    }
  },

  // Ledger Transactions
  async getLedger() {
    const res = await fetch(`${API_BASE}/ledger`);
    return res.json();
  },

  // Activities
  async getActivities() {
    const res = await fetch(`${API_BASE}/activities`);
    return res.json();
  },

  // Strava Webhook Simulator
  async simulateStravaPush(params) {
    const res = await fetch(`${API_BASE}/activities/strava-simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return res.json();
  },

  // Strava Rate Limit Telemetry
  async getStravaStats() {
    const res = await fetch(`${API_BASE}/webhooks/strava/stats`);
    return res.json();
  },

  // HealthKit Sync Batch
  async syncHealthKit(payload) {
    const res = await fetch(`${API_BASE}/activities/healthkit-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // Events Calendar
  async getEvents(filters = {}) {
    const params = new URLSearchParams();
    if (filters.query) params.append('query', filters.query);
    if (filters.city && filters.city !== 'All') params.append('city', filters.city);
    if (filters.category && filters.category !== 'All') params.append('category', filters.category);
    if (filters.source && filters.source !== 'All') params.append('source', filters.source);

    const res = await fetch(`${API_BASE}/events?${params.toString()}`);
    return res.json();
  },

  // Native Event Registration with Points
  async registerForEvent(eventId, categoryName, pointsToRedeem = 0) {
    const res = await fetch(`${API_BASE}/events/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, categoryName, pointsToRedeem })
    });
    return res.json();
  },

  // UGC Event Creation
  async createUgcEvent(data) {
    const res = await fetch(`${API_BASE}/events/ugc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Scraper Sweep
  async triggerScraperSweep() {
    const res = await fetch(`${API_BASE}/scrapers/trigger`, {
      method: 'POST'
    });
    return res.json();
  },

  async getScraperStatus() {
    const res = await fetch(`${API_BASE}/scrapers/status`);
    return res.json();
  },

  // Rewards
  async getRewards() {
    const res = await fetch(`${API_BASE}/rewards`);
    return res.json();
  },

  async redeemReward(rewardId) {
    const res = await fetch(`${API_BASE}/rewards/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardId })
    });
    return res.json();
  },

  // Chapters & Safety
  async getChapters() {
    const res = await fetch(`${API_BASE}/chapters`);
    return res.json();
  },

  async triggerSafetyBeacon(data) {
    const res = await fetch(`${API_BASE}/safety/beacon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }
};
