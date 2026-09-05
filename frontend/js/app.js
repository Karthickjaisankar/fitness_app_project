import { api } from './api.js';
import { eventRadarMap } from './map.js';

// Application State
const state = {
  user: null,
  events: [],
  ledger: [],
  activities: [],
  rewards: [],
  chapters: [],
  currentTab: 'map',
  filters: {
    query: '',
    city: 'All',
    category: 'All',
    source: 'All'
  },
  selectedEvent: null
};

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupFilters();
  setupSimulator();
  setupScraperControls();
  setupRegistrationModal();
  setupSosBeacon();

  (window as any).openRegistrationModal = openRegistrationModal;

  await loadAllData();
  await eventRadarMap.init();
});

// Load Initial Data
async function loadAllData() {
  try {
    const [userRes, eventsRes, ledgerRes, activitiesRes, rewardsRes, chaptersRes, stravaStatsRes] = await Promise.all([
      api.getUserStats(),
      api.getEvents(),
      api.getLedger(),
      api.getActivities(),
      api.getRewards(),
      api.getChapters(),
      api.getStravaStats()
    ]);

    if (userRes.success) {
      state.user = userRes.user;
      renderUserStats();
    }

    if (eventsRes.success) {
      state.events = eventsRes.events;
      renderEvents();
    }

    if (ledgerRes.success) {
      state.ledger = ledgerRes.ledger;
      renderLedger();
    }

    if (activitiesRes.success) {
      state.activities = activitiesRes.activities;
      renderAntiFraudHistory();
    }

    if (rewardsRes.success) {
      state.rewards = rewardsRes.rewards;
      renderRewards();
    }

    if (chaptersRes.success) {
      state.chapters = chaptersRes.chapters;
      renderChapters();
    }

    if (stravaStatsRes.success) {
      renderStravaRateLimitInfo(stravaStatsRes.stats);
    }
  } catch (err) {
    console.error('Error loading data:', err);
    showToast('Failed to load live data. Ensure backend is running.', 'error');
  }
}

// ----------------------------------------------------
// UI Renderers
// ----------------------------------------------------

function renderUserStats() {
  if (!state.user) return;
  const u = state.user;

  // Header stats
  const headerPoints = document.getElementById('header-points-val');
  if (headerPoints) headerPoints.textContent = u.totalPoints.toLocaleString();

  const headerTier = document.getElementById('header-tier-badge');
  if (headerTier) {
    headerTier.textContent = `${u.tier} Athlete`;
    headerTier.className = `glass-pill badge-${u.tier.toLowerCase() === 'gold' ? 'gold' : u.tier.toLowerCase() === 'elite' ? 'neon' : 'cyan'}`;
  }

  // Hero Card 1: Balance
  const heroBalance = document.getElementById('hero-points-balance');
  if (heroBalance) heroBalance.textContent = u.totalPoints.toLocaleString();

  const heroLifetime = document.getElementById('hero-lifetime-points');
  if (heroLifetime) heroLifetime.textContent = `${u.lifetimePoints.toLocaleString()} lifetime earned`;

  // Hero Card 2: Daily Cap
  const heroTodayEarned = document.getElementById('hero-today-earned');
  if (heroTodayEarned) heroTodayEarned.textContent = `${u.todayPointsEarned} / ${u.dailyCap} PTS`;

  const capPercentage = Math.min(100, Math.round((u.todayPointsEarned / u.dailyCap) * 100));
  const capBar = document.getElementById('hero-cap-bar');
  if (capBar) capBar.style.width = `${capPercentage}%`;

  const heroCapRemaining = document.getElementById('hero-cap-remaining');
  if (heroCapRemaining) {
    const rem = Math.max(0, u.dailyCap - u.todayPointsEarned);
    heroCapRemaining.textContent = `${rem} PTS daily allowance remaining`;
  }

  // Hero Card 3: Distance
  const heroDistance = document.getElementById('hero-total-distance');
  if (heroDistance) heroDistance.textContent = `${u.totalDistanceKm} KM`;
}

function renderEvents() {
  const container = document.getElementById('events-grid');
  if (!container) return;

  if (state.events.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted)">
        <p style="font-size: 1.2rem; margin-bottom: 8px;">No events matching your search or filters.</p>
        <button class="btn btn-secondary" onclick="resetFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  container.innerHTML = state.events
    .map((evt) => {
      const dateObj = new Date(evt.date);
      const month = dateObj.toLocaleString('en-US', { month: 'short' });
      const day = dateObj.getDate();

      const categoriesHtml = evt.distanceCategories
        .map((c) => `<span class="category-tag">${c.name} (₹${c.priceInr})</span>`)
        .join('');

      return `
        <div class="event-card">
          <div class="event-banner">
            <img src="${evt.bannerUrl}" alt="${escapeHtml(evt.title)}" loading="lazy" />
            <div class="event-date-badge">
              <div class="event-date-month">${month}</div>
              <div class="event-date-day">${day}</div>
            </div>
            <div class="event-source-badge">${evt.source}</div>
          </div>
          <div class="event-body">
            <h3 class="event-title">${escapeHtml(evt.title)}</h3>
            <div class="event-location">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent-neon)"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <span>${escapeHtml(evt.venue)}, ${escapeHtml(evt.city)}</span>
            </div>
            <div class="event-categories">${categoriesHtml}</div>
            <div class="event-footer">
              <div class="event-price">
                <span>From</span>
                <div class="event-price-amount">₹${evt.priceFromInr.toLocaleString()}</div>
              </div>
              <button class="btn btn-primary register-btn" data-event-id="${evt.id}">
                Register & Save PTS
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  // Attach event click listeners
  container.querySelectorAll('.register-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-event-id');
      openRegistrationModal(id);
    });
  });
}

function renderLedger() {
  const tbody = document.getElementById('ledger-tbody');
  if (!tbody) return;

  tbody.innerHTML = state.ledger
    .map((entry) => {
      const isPositive = entry.points > 0;
      const ptsClass = isPositive ? 'var(--accent-neon)' : 'var(--accent-orange)';
      const sign = isPositive ? '+' : '';
      const dateStr = new Date(entry.timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      let statusBadge = 'badge-neon';
      if (entry.status === 'CAPPED') statusBadge = 'badge-warning';
      if (entry.status === 'PENDING') statusBadge = 'badge-cyan';

      return `
        <tr>
          <td><span style="color: var(--text-muted); font-size: 0.8rem;">${dateStr}</span></td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(entry.description)}</div>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${entry.id}</span>
          </td>
          <td><span class="glass-pill ${statusBadge}" style="font-size: 0.75rem; padding: 2px 10px;">${entry.status}</span></td>
          <td style="font-family: var(--font-family-mono); font-weight: 700; color: ${ptsClass};">
            ${sign}${entry.points} PTS
          </td>
          <td style="font-family: var(--font-family-mono); color: var(--text-secondary);">
            ${entry.balanceAfter} PTS
          </td>
        </tr>
      `;
    })
    .join('');
}

function renderAntiFraudHistory() {
  const container = document.getElementById('antifraud-history-list');
  if (!container) return;

  container.innerHTML = state.activities
    .slice(0, 5)
    .map((act) => {
      const statusBadge =
        act.fraudStatus === 'APPROVED'
          ? 'badge-neon'
          : act.fraudStatus === 'REJECTED'
          ? 'badge-danger'
          : 'badge-warning';

      const reasonsHtml =
        act.fraudReasons && act.fraudReasons.length > 0
          ? `<div style="margin-top: 6px; padding: 6px 10px; background: rgba(239, 68, 68, 0.1); border-radius: 6px; font-size: 0.75rem; color: #fca5a5;">
              ${act.fraudReasons.map((r) => `<div>• ${escapeHtml(r)}</div>`).join('')}
             </div>`
          : '';

      return `
        <div style="padding: 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="font-weight: 700; font-size: 0.95rem;">${escapeHtml(act.title)}</div>
            <span class="glass-pill ${statusBadge}" style="font-size: 0.75rem; padding: 2px 10px;">${act.fraudStatus}</span>
          </div>
          <div style="display: flex; gap: 16px; font-size: 0.8rem; color: var(--text-secondary);">
            <span>Dist: ${(act.distanceMeters / 1000).toFixed(2)} km</span>
            <span>Speed: ${act.averageSpeedKmh} km/h</span>
            <span>Source: ${act.source}</span>
            <span style="color: var(--accent-neon); font-weight: 600;">+${act.pointsAwarded} pts</span>
          </div>
          ${reasonsHtml}
        </div>
      `;
    })
    .join('');
}

function renderRewards() {
  const container = document.getElementById('rewards-grid');
  if (!container) return;

  container.innerHTML = state.rewards
    .map((rew) => {
      const canAfford = state.user && state.user.totalPoints >= rew.costPoints;
      return `
        <div class="glass-panel" style="padding: 20px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="height: 120px; border-radius: var(--radius-md); overflow: hidden; margin-bottom: 14px;">
              <img src="${rew.imageUrl}" alt="${escapeHtml(rew.title)}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            <span class="glass-pill badge-cyan" style="font-size: 0.7rem; margin-bottom: 6px;">${rew.brand}</span>
            <h4 style="font-size: 1rem; font-weight: 700; margin: 6px 0;">${escapeHtml(rew.title)}</h4>
            <div style="font-size: 0.85rem; color: var(--accent-gold); font-weight: 700; margin-bottom: 14px;">${rew.discountValue}</div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px solid var(--border-subtle);">
            <div>
              <div style="font-family: var(--font-family-display); font-size: 1.2rem; font-weight: 800; color: var(--accent-gold);">${rew.costPoints} PTS</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${rew.stockCount} left</div>
            </div>
            <button class="btn ${canAfford ? 'btn-primary' : 'btn-secondary'} redeem-reward-btn" 
                    data-reward-id="${rew.id}" 
                    ${!canAfford ? 'disabled' : ''}>
              ${canAfford ? 'Redeem Voucher' : 'Need More Points'}
            </button>
          </div>
        </div>
      `;
    })
    .join('');

  container.querySelectorAll('.redeem-reward-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const rewId = btn.getAttribute('data-reward-id');
      await handleRedeemReward(rewId);
    });
  });
}

function renderChapters() {
  const container = document.getElementById('chapters-list');
  if (!container) return;

  container.innerHTML = state.chapters
    .map((chp) => `
      <div style="padding: 16px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(0, 245, 155, 0.15); color: var(--accent-neon); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem;">
            #${chp.rank}
          </div>
          <div>
            <div style="font-weight: 700; font-size: 1rem;">${escapeHtml(chp.name)}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">${chp.city} • Admin: ${chp.admin}</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-family: var(--font-family-display); font-weight: 800; font-size: 1.1rem; color: var(--accent-cyan);">
            ${chp.weeklyDistanceKm.toLocaleString()} KM
          </div>
          <span class="glass-pill badge-gold" style="font-size: 0.7rem; padding: 2px 8px;">${chp.badge}</span>
        </div>
      </div>
    `)
    .join('');
}

function renderStravaRateLimitInfo(stats) {
  const statEl = document.getElementById('hero-strava-saved');
  if (statEl) {
    statEl.textContent = `${stats.apiCallsSavedVsPolling.toLocaleString()} API calls saved`;
  }
}

// ----------------------------------------------------
// Simulator Controller (Core Wearable & Anti-Fraud Loop)
// ----------------------------------------------------

function setupSimulator() {
  const presetButtons = document.querySelectorAll('.sim-preset-btn');
  presetButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const title = btn.getAttribute('data-title');
      const type = btn.getAttribute('data-type');
      const dist = Number(btn.getAttribute('data-dist'));
      const dur = Number(btn.getAttribute('data-dur'));
      const cheat = btn.getAttribute('data-cheat') || 'none';

      await runSimulation({
        title,
        activityType: type,
        distanceMeters: dist,
        durationSeconds: dur,
        cheatMode: cheat
      });
    });
  });

  // Custom Form
  const customForm = document.getElementById('custom-sim-form');
  if (customForm) {
    customForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('sim-custom-title').value;
      const type = document.getElementById('sim-custom-type').value;
      const distKm = parseFloat(document.getElementById('sim-custom-dist').value);
      const durMins = parseFloat(document.getElementById('sim-custom-dur').value);

      await runSimulation({
        title,
        activityType: type,
        distanceMeters: Math.round(distKm * 1000),
        durationSeconds: Math.round(durMins * 60),
        cheatMode: 'none'
      });
    });
  }
}

async function runSimulation(params) {
  const consoleOutput = document.getElementById('sim-output-console');
  if (consoleOutput) {
    consoleOutput.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--accent-cyan);">
        <div class="animate-spin" style="display: inline-block; width: 30px; height: 30px; border: 3px solid var(--accent-cyan); border-top-color: transparent; border-radius: 50%;"></div>
        <p style="margin-top: 12px; font-weight: 600;">Evaluating activity with Anti-Fraud Engine...</p>
      </div>
    `;
  }

  try {
    const res = await api.simulateStravaPush(params);
    if (res.success) {
      const act = res.activity;
      state.user = res.user;
      state.ledger = res.ledger;
      state.activities.unshift(act);

      renderUserStats();
      renderLedger();
      renderAntiFraudHistory();
      renderRewards(); // re-evaluates affordability

      // Render Evaluation details in console
      const isApproved = act.fraudStatus === 'APPROVED';
      const statusBadge = isApproved
        ? 'badge-neon'
        : act.fraudStatus === 'REJECTED'
        ? 'badge-danger'
        : 'badge-warning';

      const paceFormatted = formatSecondsToPace(act.durationSeconds / (act.distanceMeters / 1000));

      if (consoleOutput) {
        consoleOutput.innerHTML = `
          <div class="evaluation-box" style="border-color: ${isApproved ? 'rgba(0, 245, 155, 0.4)' : 'rgba(239, 68, 68, 0.4)'}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <div>
                <h4 style="font-size: 1.1rem; font-weight: 800;">${escapeHtml(act.title)}</h4>
                <span style="font-size: 0.8rem; color: var(--text-muted);">${act.source.toUpperCase()} Webhook Event</span>
              </div>
              <span class="glass-pill ${statusBadge}" style="font-size: 0.9rem; font-weight: 800; padding: 4px 14px;">
                ${act.fraudStatus}
              </span>
            </div>

            <div class="eval-metric-row">
              <span class="eval-metric-label">Distance Validated:</span>
              <span class="eval-metric-val">${(act.distanceMeters / 1000).toFixed(2)} KM</span>
            </div>
            <div class="eval-metric-row">
              <span class="eval-metric-label">Calculated Pace:</span>
              <span class="eval-metric-val">${paceFormatted}</span>
            </div>
            <div class="eval-metric-row">
              <span class="eval-metric-label">Average Speed:</span>
              <span class="eval-metric-val">${act.averageSpeedKmh} km/h</span>
            </div>
            <div class="eval-metric-row">
              <span class="eval-metric-label">Anti-Fraud Telemetry:</span>
              <span class="eval-metric-val" style="color: ${act.fraudReasons.length === 0 ? 'var(--accent-neon)' : 'var(--status-danger)'}">
                ${act.fraudReasons.length === 0 ? '✓ BIOMETRIC INTEGRITY PASSED' : '⚠️ ANOMALIES FLAGGED'}
              </span>
            </div>
            <div class="eval-metric-row">
              <span class="eval-metric-label">Points Awarded:</span>
              <span class="eval-metric-val" style="color: var(--accent-neon); font-size: 1.1rem;">
                +${act.pointsAwarded} PTS
              </span>
            </div>

            ${
              act.fraudReasons.length > 0
                ? `<div style="margin-top: 14px; padding: 12px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px;">
                    <div style="font-size: 0.85rem; font-weight: 700; color: #fca5a5; margin-bottom: 4px;">Fraud Engine Analysis:</div>
                    ${act.fraudReasons.map((r) => `<div style="font-size: 0.8rem; color: #fee2e2;">• ${escapeHtml(r)}</div>`).join('')}
                   </div>`
                : ''
            }
          </div>
        `;
      }

      showToast(
        isApproved
          ? `Activity Approved! +${act.pointsAwarded} PTS credited to Ledger.`
          : `Activity Flagged by Anti-Fraud: ${act.fraudStatus}`,
        isApproved ? 'success' : 'error'
      );
    }
  } catch (err) {
    console.error('Simulation error:', err);
    showToast('Failed to run simulation', 'error');
  }
}

// ----------------------------------------------------
// Navigation & Tab Switching
// ----------------------------------------------------

function setupNavigation() {
  const tabs = document.querySelectorAll('.nav-tab-btn');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      switchTab(target);
    });
  });
}

function switchTab(tabId) {
  state.currentTab = tabId;

  document.querySelectorAll('.nav-tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.toggle('active', content.id === `tab-${tabId}`);
  });

  if (tabId === 'map') {
    eventRadarMap.invalidateSize();
  }
}

// ----------------------------------------------------
// Filter Controls
// ----------------------------------------------------

function setupFilters() {
  // Search query
  const searchInput = document.getElementById('search-events-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(async (e) => {
      state.filters.query = e.target.value.trim();
      await applyFilters();
    }, 250));
  }

  // Category filter pills
  const catPills = document.querySelectorAll('.cat-filter-pill');
  catPills.forEach((pill) => {
    pill.addEventListener('click', async () => {
      catPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      state.filters.category = pill.getAttribute('data-category');
      await applyFilters();
    });
  });

  // City filter pills (Quick priority hubs)
  const cityPills = document.querySelectorAll('.city-filter-pill');
  cityPills.forEach((pill) => {
    pill.addEventListener('click', async () => {
      cityPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      const selectedCity = pill.getAttribute('data-city');
      state.filters.city = selectedCity;

      // Sync dropdown if exists
      const citySelect = document.getElementById('city-filter-select');
      if (citySelect) citySelect.value = selectedCity;

      await applyFilters();
    });
  });

  // City selector dropdown
  const citySelect = document.getElementById('city-filter-select');
  if (citySelect) {
    citySelect.addEventListener('change', async (e) => {
      state.filters.city = e.target.value;
      cityPills.forEach((p) => {
        p.classList.toggle('active', p.getAttribute('data-city') === e.target.value);
      });
      await applyFilters();
    });
  }
}

async function applyFilters() {
  try {
    const res = await api.getEvents(state.filters);
    if (res.success) {
      state.events = res.events;
      renderEvents();
    }
  } catch (err) {
    console.error('Filter error:', err);
  }
}

window.resetFilters = async function () {
  state.filters = { query: '', city: 'All', category: 'All', source: 'All' };
  const searchInput = document.getElementById('search-events-input');
  if (searchInput) searchInput.value = '';

  document.querySelectorAll('.cat-filter-pill').forEach((p) => {
    p.classList.toggle('active', p.getAttribute('data-category') === 'All');
  });

  const citySelect = document.getElementById('city-filter-select');
  if (citySelect) citySelect.value = 'All';

  await applyFilters();
};

// ----------------------------------------------------
// Scraper Sweep Controls
// ----------------------------------------------------

function setupScraperControls() {
  const sweepBtn = document.getElementById('trigger-scraper-btn');
  if (sweepBtn) {
    sweepBtn.addEventListener('click', async () => {
      sweepBtn.disabled = true;
      sweepBtn.innerHTML = `
        <span class="animate-spin" style="display:inline-block; width:14px; height:14px; border:2px solid #fff; border-top-color:transparent; border-radius:50%;"></span>
        Indexing platforms...
      `;

      try {
        const res = await api.triggerScraperSweep();
        if (res.success) {
          state.events = res.events;
          renderEvents();
          showToast(`Autonomous scraper sweep complete! Found ${res.newEventsFound} new fitness events.`, 'success');
        }
      } catch (err) {
        showToast('Scraper sweep failed', 'error');
      } finally {
        sweepBtn.disabled = false;
        sweepBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
          Run Scraper Sweep
        `;
      }
    });
  }
}

// ----------------------------------------------------
// Registration & Points Discount Modal
// ----------------------------------------------------

function setupRegistrationModal() {
  const modal = document.getElementById('registration-modal');
  const closeBtn = document.getElementById('close-modal-btn');
  const cancelBtn = document.getElementById('cancel-modal-btn');
  const confirmBtn = document.getElementById('confirm-register-btn');
  const pointsSlider = document.getElementById('modal-points-slider');

  if (closeBtn) closeBtn.addEventListener('click', () => closeModal());
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal());

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (pointsSlider) {
    pointsSlider.addEventListener('input', () => updateRegistrationPriceCalculation());
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (!state.selectedEvent) return;
      const categorySelect = document.getElementById('modal-category-select');
      const categoryName = categorySelect.value;
      const pointsToRedeem = Number(pointsSlider.value);

      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Processing registration...';

      try {
        const res = await api.registerForEvent(state.selectedEvent.id, categoryName, pointsToRedeem);
        if (res.success) {
          state.user = res.user;
          renderUserStats();
          renderRewards();
          closeModal();
          showToast(
            `🎉 Registration Confirmed! Ref: ${res.registrationReference}. Discount Applied: ₹${res.discountInr}`,
            'success'
          );
        } else {
          showToast(res.message || 'Registration failed', 'error');
        }
      } catch (err) {
        showToast('Registration error occurred', 'error');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm Registration';
      }
    });
  }
}

function openRegistrationModal(eventId) {
  const event = state.events.find((e) => e.id === eventId);
  if (!event) return;

  state.selectedEvent = event;
  const modal = document.getElementById('registration-modal');
  const titleEl = document.getElementById('modal-event-title');
  const catSelect = document.getElementById('modal-category-select');
  const slider = document.getElementById('modal-points-slider');

  if (titleEl) titleEl.textContent = event.title;

  if (catSelect) {
    catSelect.innerHTML = event.distanceCategories
      .map((c) => `<option value="${c.name}">${c.name} - ₹${c.priceInr}</option>`)
      .join('');
    catSelect.addEventListener('change', () => updateRegistrationPriceCalculation());
  }

  // Configure slider based on available user points
  if (slider && state.user) {
    slider.max = Math.min(state.user.totalPoints, 400); // 400 pts max discount (₹800)
    slider.value = Math.min(100, slider.max);
  }

  updateRegistrationPriceCalculation();
  modal.classList.add('open');
}

function updateRegistrationPriceCalculation() {
  if (!state.selectedEvent) return;
  const catSelect = document.getElementById('modal-category-select');
  const slider = document.getElementById('modal-points-slider');
  const ptsValEl = document.getElementById('modal-points-val');
  const discountEl = document.getElementById('modal-discount-inr');
  const finalPriceEl = document.getElementById('modal-final-price');

  const selectedCategory =
    state.selectedEvent.distanceCategories.find((c) => c.name === catSelect.value) ||
    state.selectedEvent.distanceCategories[0];

  const originalPrice = selectedCategory ? selectedCategory.priceInr : state.selectedEvent.priceFromInr;
  const points = Number(slider.value);
  const discount = points * 2; // 100 points = ₹200 discount
  const finalPrice = Math.max(0, originalPrice - discount);

  if (ptsValEl) ptsValEl.textContent = `${points} PTS`;
  if (discountEl) discountEl.textContent = `-₹${discount}`;
  if (finalPriceEl) finalPriceEl.textContent = `₹${finalPrice}`;
}

function closeModal() {
  const modal = document.getElementById('registration-modal');
  if (modal) modal.classList.remove('open');
  state.selectedEvent = null;
}

// ----------------------------------------------------
// Rewards Redemption
// ----------------------------------------------------

async function handleRedeemReward(rewardId) {
  try {
    const res = await api.redeemReward(rewardId);
    if (res.success) {
      state.user = res.user;
      renderUserStats();
      renderRewards();
      showToast(`🎁 ${res.message}`, 'success');
    } else {
      showToast(res.message || 'Redemption failed', 'error');
    }
  } catch (err) {
    showToast('Redemption error', 'error');
  }
}

// ----------------------------------------------------
// SOS Beacon Controller (Phase 2)
// ----------------------------------------------------

function setupSosBeacon() {
  const sosBtn = document.getElementById('trigger-sos-btn');
  const sosOutput = document.getElementById('sos-output-card');

  if (sosBtn) {
    sosBtn.addEventListener('click', async () => {
      sosBtn.disabled = true;
      sosBtn.textContent = 'Acquiring GPS Fix & Broadcasting...';

      try {
        const res = await api.triggerSafetyBeacon({
          lat: 12.9716,
          lng: 77.5946,
          batteryLevel: '92%',
          emergencyContacts: ['+91-9876543210', '+91-9123456780']
        });

        if (res.success && sosOutput) {
          sosOutput.style.display = 'block';
          sosOutput.innerHTML = `
            <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); padding: 20px; border-radius: var(--radius-md);">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <span class="animate-pulse-glow" style="width: 12px; height: 12px; background: #ef4444; border-radius: 50%; display: inline-block;"></span>
                <span style="font-weight: 800; color: #fca5a5;">LIVE BEACON BROADCASTING ACTIVE</span>
              </div>
              <p style="font-size: 0.85rem; color: #fee2e2; margin-bottom: 12px;">
                Your real-time coordinates (12.9716° N, 77.5946° E) are securely broadcasting to emergency contacts and chapter safety monitors.
              </p>
              <div style="display: flex; gap: 10px; align-items: center;">
                <a href="${res.shareableUrl}" target="_blank" class="btn btn-secondary" style="font-size: 0.8rem; padding: 6px 14px;">Open Live Beacon Map</a>
                <button class="btn btn-danger" onclick="document.getElementById('sos-output-card').style.display='none'; document.getElementById('trigger-sos-btn').disabled=false; document.getElementById('trigger-sos-btn').textContent='Broadcast Live SOS Beacon';">Stop Beacon</button>
              </div>
            </div>
          `;
          showToast('SOS Beacon broadcast started successfully', 'success');
        }
      } catch (err) {
        showToast('Failed to trigger SOS beacon', 'error');
        sosBtn.disabled = false;
        sosBtn.textContent = 'Broadcast Live SOS Beacon';
      }
    });
  }
}

// ----------------------------------------------------
// Helpers & Toasts
// ----------------------------------------------------

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  const color = type === 'success' ? 'var(--accent-neon)' : type === 'error' ? 'var(--status-danger)' : 'var(--accent-cyan)';

  toast.innerHTML = `
    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function formatSecondsToPace(secPerKm) {
  if (!secPerKm || isNaN(secPerKm) || secPerKm <= 0) return '0:00 min/km';
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.floor(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')} min/km`;
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
