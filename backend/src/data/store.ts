import { Activity, LedgerEntry, UserStats, FitnessEvent, RewardItem } from '../models/types';

class DataStore {
  public user: UserStats = {
    userId: 'usr_athlete_42',
    name: 'Karthick Jaisankar',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    totalPoints: 840,
    lifetimePoints: 1290,
    todayPointsEarned: 50,
    dailyCap: 250, // Max 250 pts / day (equivalent to 25 km run)
    totalDistanceKm: 129.4,
    totalActivitiesCount: 18,
    tier: 'Gold',
    stravaConnected: true,
    healthKitConnected: true
  };

  public activities: Activity[] = [
    {
      id: 'act_seed_001',
      userId: 'usr_athlete_42',
      source: 'strava',
      externalId: 'strava_9041284',
      activityType: 'run',
      title: 'Sunrise Cubbon Park Interval Run',
      distanceMeters: 5000,
      durationSeconds: 1560, // 26 mins -> ~5:12 /km (11.5 km/h)
      movingTimeSeconds: 1540,
      averageSpeedKmh: 11.6,
      maxSpeedKmh: 15.2,
      elevationGainMeters: 38,
      startTimestamp: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
      endTimestamp: new Date(Date.now() - 3600000 * 24 * 1 + 1560000).toISOString(),
      fraudStatus: 'APPROVED',
      fraudReasons: [],
      pointsAwarded: 50,
      createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString()
    },
    {
      id: 'act_seed_002',
      userId: 'usr_athlete_42',
      source: 'apple_health',
      externalId: 'hk_829104',
      activityType: 'ride',
      title: 'Airport Road Weekend Pace Ride',
      distanceMeters: 30000,
      durationSeconds: 3900, // 65 mins -> ~27.7 km/h
      movingTimeSeconds: 3820,
      averageSpeedKmh: 28.2,
      maxSpeedKmh: 42.1,
      elevationGainMeters: 112,
      startTimestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      endTimestamp: new Date(Date.now() - 3600000 * 24 * 2 + 3900000).toISOString(),
      fraudStatus: 'APPROVED',
      fraudReasons: [],
      pointsAwarded: 100, // 30km ride @ 1 pt per 300m = 100 pts
      createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
    },
    {
      id: 'act_seed_003',
      userId: 'usr_athlete_42',
      source: 'manual_gpx',
      externalId: 'gpx_spoof_999',
      activityType: 'run',
      title: 'Suspicious 10K Highway Dash',
      distanceMeters: 10000,
      durationSeconds: 780, // 13 mins -> 1:18 min/km pace (~46 km/h) impossible running pace
      movingTimeSeconds: 780,
      averageSpeedKmh: 46.1,
      maxSpeedKmh: 68.0,
      elevationGainMeters: 10,
      startTimestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
      endTimestamp: new Date(Date.now() - 3600000 * 48 + 780000).toISOString(),
      fraudStatus: 'REJECTED',
      fraudReasons: [
        'IMPOSSIBLE_PACE: Running pace 1:18 min/km exceeds human threshold (2:10 min/km)',
        'VEHICLE_SPEED_DETECTED: Average speed 46.1 km/h matches automobile or motorized scooter',
        'TELEMETRY_ANOMALY: Zero natural cadence fluctuations detected'
      ],
      pointsAwarded: 0,
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
    }
  ];

  public ledger: LedgerEntry[] = [
    {
      id: 'led_001',
      userId: 'usr_athlete_42',
      activityId: 'act_seed_001',
      type: 'EARN_DISTANCE',
      points: 50,
      balanceAfter: 790,
      description: '5.0 KM Morning Run (+50 pts)',
      status: 'POSTED',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: 'led_002',
      userId: 'usr_athlete_42',
      activityId: 'act_seed_002',
      type: 'EARN_DISTANCE',
      points: 100,
      balanceAfter: 890,
      description: '30.0 KM Road Cycling (+100 pts)',
      status: 'POSTED',
      timestamp: new Date(Date.now() - 3600000 * 48).toISOString()
    },
    {
      id: 'led_003',
      userId: 'usr_athlete_42',
      type: 'REDEEM_REWARD',
      points: -50,
      balanceAfter: 840,
      description: 'Redeemed ₹250 Fast & Up Nutrition Voucher',
      status: 'POSTED',
      timestamp: new Date(Date.now() - 3600000 * 12).toISOString()
    }
  ];

  public events: FitnessEvent[] = [
    {
      id: 'evt_tcs_bengaluru_10k',
      title: 'TCS World 10K Bengaluru 2026',
      slug: 'tcs-world-10k-bengaluru-2026',
      organizer: 'Procam International',
      date: '2026-10-18',
      time: '05:30 AM IST',
      city: 'Bengaluru',
      state: 'Karnataka',
      venue: 'Sree Kanteerava Stadium',
      distanceCategories: [
        { name: 'Open 10K', distanceKm: 10, priceInr: 1550 },
        { name: 'Majja Run (5K)', distanceKm: 5, priceInr: 950 },
        { name: 'Champions with Disability', distanceKm: 4.2, priceInr: 450 }
      ],
      tags: ['Gold Label', 'Road Race', 'Timing Chip', 'Finisher Medal'],
      priceFromInr: 950,
      registrationUrl: 'https://tcsworld10k.procam.in',
      source: 'Townscript',
      verified: true,
      bannerUrl: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&auto=format&fit=crop&q=80',
      coordinates: { lat: 12.9698, lng: 77.5926 }
    },
    {
      id: 'evt_mumbai_marathon',
      title: 'Tata Mumbai Marathon 2027',
      slug: 'tata-mumbai-marathon-2027',
      organizer: 'Procam International',
      date: '2027-01-17',
      time: '05:00 AM IST',
      city: 'Mumbai',
      state: 'Maharashtra',
      venue: 'Chhatrapati Shivaji Maharaj Terminus (CSMT)',
      distanceCategories: [
        { name: 'Full Marathon', distanceKm: 42.195, priceInr: 2800 },
        { name: 'Half Marathon', distanceKm: 21.097, priceInr: 2200 },
        { name: 'Open 10K', distanceKm: 10, priceInr: 1600 }
      ],
      tags: ['World Athletics Platinum', 'Sea Link Route', 'Bib Expo'],
      priceFromInr: 1600,
      registrationUrl: 'https://tatamumbaimarathon.procam.in',
      source: 'Townscript',
      verified: true,
      bannerUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&auto=format&fit=crop&q=80',
      coordinates: { lat: 18.9401, lng: 72.8347 }
    },
    {
      id: 'evt_delhi_half_marathon',
      title: 'Vedanta Delhi Half Marathon 2026',
      slug: 'vedanta-delhi-half-marathon-2026',
      organizer: 'Procam International',
      date: '2026-10-25',
      time: '05:15 AM IST',
      city: 'Delhi',
      state: 'Delhi NCR',
      venue: 'Jawaharlal Nehru Stadium',
      distanceCategories: [
        { name: 'Half Marathon', distanceKm: 21.097, priceInr: 2100 },
        { name: 'Open 10K', distanceKm: 10, priceInr: 1500 },
        { name: 'Great Delhi Run (4.5K)', distanceKm: 4.5, priceInr: 850 }
      ],
      tags: ['World Athletics Gold', 'Capital Run', 'Fast Course'],
      priceFromInr: 850,
      registrationUrl: 'https://vedantadelhihalfmarathon.procam.in',
      source: 'Eventbrite',
      verified: true,
      bannerUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80',
      coordinates: { lat: 28.5828, lng: 77.2344 }
    },
    {
      id: 'evt_hyderabad_triathlon',
      title: 'Hyderabad City Triathlon & Duathlon 2026',
      slug: 'hyderabad-city-triathlon-2026',
      organizer: 'Great Hyderabad Adventure Club (GHAC)',
      date: '2026-11-08',
      time: '06:00 AM IST',
      city: 'Hyderabad',
      state: 'Telangana',
      venue: 'Gachibowli Stadium Complex',
      distanceCategories: [
        { name: 'Olympic Triathlon (1.5k Swim / 40k Cycle / 10k Run)', distanceKm: 51.5, priceInr: 3400 },
        { name: 'Sprint Triathlon', distanceKm: 25.75, priceInr: 2500 },
        { name: 'Duathlon (5k Run / 20k Cycle / 2.5k Run)', distanceKm: 27.5, priceInr: 1800 }
      ],
      tags: ['Triathlon', 'Duathlon', 'Pool Swim', 'Closed Circuit'],
      priceFromInr: 1800,
      registrationUrl: 'https://www.townscript.com/e/hyderabad-triathlon-2026',
      source: 'Townscript',
      verified: true,
      bannerUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80',
      coordinates: { lat: 17.4443, lng: 78.3498 }
    },
    {
      id: 'evt_goa_iron_ultra',
      title: 'Goa Coastal Ultra 50K & Beach Marathon',
      slug: 'goa-coastal-ultra-50k-2026',
      organizer: 'Goa Tri & Athletics Club',
      date: '2026-12-06',
      time: '04:45 AM IST',
      city: 'Goa',
      state: 'Goa',
      venue: 'Miramar Beach Promenade, Panaji',
      distanceCategories: [
        { name: '50K Coastal Ultra', distanceKm: 50, priceInr: 3800 },
        { name: 'Beach Half Marathon', distanceKm: 21.1, priceInr: 2000 },
        { name: '10K Sunset Dash', distanceKm: 10, priceInr: 1200 }
      ],
      tags: ['Ultra Running', 'Scenic Route', 'Sand & Tarmac'],
      priceFromInr: 1200,
      registrationUrl: 'https://www.eventbrite.com/e/goa-coastal-ultra-50k',
      source: 'Eventbrite',
      verified: true,
      bannerUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
      coordinates: { lat: 15.4868, lng: 73.8087 }
    },
    {
      id: 'evt_tour_of_nilgiris',
      title: 'Tour of Nilgiris (TfN) Gran Fondo Cyclothon',
      slug: 'tour-of-nilgiris-gran-fondo-2026',
      organizer: 'RideACycle Foundation',
      date: '2026-12-13',
      time: '06:00 AM IST',
      city: 'Ooty / Nilgiris',
      state: 'Tamil Nadu',
      venue: 'Kalahatty Ghat Base, Ooty',
      distanceCategories: [
        { name: '100K Kalahatty Climber Brevet', distanceKm: 100, priceInr: 4500 },
        { name: '60K Hill Loop', distanceKm: 60, priceInr: 3200 }
      ],
      tags: ['Cycling', 'Gran Fondo', 'Elevation 2200m', 'King of Mountains'],
      priceFromInr: 3200,
      registrationUrl: 'https://tourofnilgiris.com/register',
      source: 'ChapterUGC',
      verified: true,
      bannerUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80',
      coordinates: { lat: 11.4102, lng: 76.695 }
    },
    {
      id: 'evt_chennai_marathon',
      title: 'Freshworks Chennai Marathon 2027',
      slug: 'chennai-marathon-2027',
      organizer: 'Chennai Runners',
      date: '2027-01-03',
      time: '04:00 AM IST',
      city: 'Chennai',
      state: 'Tamil Nadu',
      venue: 'Napier Bridge / Marina Beach',
      distanceCategories: [
        { name: 'Full Marathon', distanceKm: 42.195, priceInr: 2500 },
        { name: 'Half Marathon', distanceKm: 21.097, priceInr: 1900 },
        { name: '10K Coastal Challenge', distanceKm: 10, priceInr: 1400 }
      ],
      tags: ['Coastal Run', 'AIMS Certified', 'Flat & Fast'],
      priceFromInr: 1400,
      registrationUrl: 'https://www.chennaimarathon.com',
      source: 'Townscript',
      verified: true,
      bannerUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop&q=80',
      coordinates: { lat: 13.0694, lng: 80.2824 }
    }
  ];

  public rewards: RewardItem[] = [
    {
      id: 'rew_fastup_gel',
      title: 'Fast & Up Energy Gel Bundle (Pack of 5)',
      brand: 'Fast & Up',
      category: 'nutrition',
      costPoints: 150,
      originalPriceInr: 450,
      discountValue: '100% OFF Code',
      couponCodeTemplate: 'FASTUP-GEL-{{ID}}',
      imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
      stockCount: 84
    },
    {
      id: 'rew_marathon_discount',
      title: '₹500 Direct Discount on Any Partner Marathon Bib',
      brand: 'Townscript Pro Pass',
      category: 'event_discount',
      costPoints: 200,
      originalPriceInr: 500,
      discountValue: '₹500 OFF Instant',
      couponCodeTemplate: 'TOWN-BIB-{{ID}}',
      imageUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=500&auto=format&fit=crop&q=80',
      stockCount: 150
    },
    {
      id: 'rew_garmin_voucher',
      title: 'Garmin Forerunner 265 / 965 ₹2,500 Voucher',
      brand: 'Garmin India',
      category: 'gear',
      costPoints: 500,
      originalPriceInr: 2500,
      discountValue: '₹2,500 OFF GPS Watches',
      couponCodeTemplate: 'GARMIN-RUN-{{ID}}',
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80',
      stockCount: 20
    },
    {
      id: 'rew_strava_membership',
      title: 'Strava Subscription (3 Months Free)',
      brand: 'Strava',
      category: 'membership',
      costPoints: 350,
      originalPriceInr: 1200,
      discountValue: '3 Months Free Access',
      couponCodeTemplate: 'STRAVA-PASS-{{ID}}',
      imageUrl: 'https://images.unsplash.com/photo-1510519138171-cbe656418844?w=500&auto=format&fit=crop&q=80',
      stockCount: 45
    }
  ];

  public chapters = [
    {
      id: 'chp_bangalore_hash',
      name: 'Bangalore Hash & Cubbon Striders',
      city: 'Bengaluru',
      membersCount: 412,
      weeklyDistanceKm: 3420,
      rank: 1,
      admin: 'Rahul Sharma',
      badge: 'Gold Verified Chapter'
    },
    {
      id: 'chp_bombay_running',
      name: 'Bombay Running Crew (BRC)',
      city: 'Mumbai',
      membersCount: 388,
      weeklyDistanceKm: 3105,
      rank: 2,
      admin: 'Shweta Mehta',
      badge: 'Gold Verified Chapter'
    },
    {
      id: 'chp_delhi_cyclists',
      name: 'Delhi NCR Randonneurs & Cyclists',
      city: 'Delhi',
      membersCount: 295,
      weeklyDistanceKm: 2890,
      rank: 3,
      admin: 'Amit Verma',
      badge: 'Silver Verified Chapter'
    }
  ];
}

export const store = new DataStore();
