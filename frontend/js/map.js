// Interactive Event Radar Map Controller (Leaflet Dark Mode + Neon Athletic Pins)
import { api } from './api.js';

class EventRadarMap {
  constructor() {
    this.map = null;
    this.markersLayer = null;
    this.markersMap = new Map(); // eventId -> { marker, lat, lng, evt }
    this.events = [];
    this.selectedCity = 'All';
    this.selectedCategory = 'All';
    this.selectedEventId = null;

    // Priority Hub Centroids
    this.hubCoordinates = {
      All: { lat: 12.3500, lng: 78.6000, zoom: 7 },
      Bengaluru: { lat: 12.9716, lng: 77.5946, zoom: 12 },
      Chennai: { lat: 13.0450, lng: 80.2600, zoom: 12 },
      Coimbatore: { lat: 11.0100, lng: 76.9650, zoom: 12 }
    };
  }

  async init() {
    const mapEl = document.getElementById('event-radar-map');
    if (!mapEl || !window.L) return;

    const L = window.L;

    // 1. Initialize Map Canvas
    this.map = L.map('event-radar-map', {
      zoomControl: false,
      attributionControl: false
    }).setView([12.3500, 78.6000], 7);

    // Zoom control in bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // 2. High-Tech Multi-Layer Basemap (Zero Watermarks: Esri Dark Canvas, Google Satellite, Google Streets)
    this.initBaseLayers();

    this.markersLayer = L.layerGroup().addTo(this.map);

    // 3. Setup UI Controls & Event Listeners
    this.setupHubButtons();
    this.setupSidebarFilters();

    // 4. Load Live Events
    await this.loadAndPlotEvents();

    // Expose instance globally for cross-tab event selection
    window.eventRadarMap = this;
  }

  async loadAndPlotEvents() {
    try {
      const res = await api.getEvents();
      if (res.success && res.events) {
        this.events = res.events;
        this.renderMarkersAndSidebar();
      }
    } catch (err) {
      console.error('[EventRadarMap] Error loading events:', err);
    }
  }

  renderMarkersAndSidebar() {
    if (!this.map || !window.L) return;
    const L = window.L;

    this.markersLayer.clearLayers();
    this.markersMap.clear();

    // Filter events
    const filtered = this.events.filter((evt) => {
      if (this.selectedCity !== 'All' && (evt.city || '').toLowerCase() !== this.selectedCity.toLowerCase()) {
        return false;
      }
      if (this.selectedCategory !== 'All') {
        const cat = this.selectedCategory.toLowerCase();
        const hasCat = (evt.distanceCategories || []).some((d) => {
          if (cat === 'marathon') return d.distanceKm >= 42;
          if (cat === 'half_marathon') return d.distanceKm >= 21 && d.distanceKm < 42;
          if (cat === '10k') return d.distanceKm >= 9 && d.distanceKm <= 12;
          if (cat === '5k') return d.distanceKm <= 5;
          return false;
        });
        if (!hasCat) return false;
      }
      return true;
    });

    // Render Markers on Map
    filtered.forEach((evt) => {
      const lat = evt.coordinates?.lat || 12.9716;
      const lng = evt.coordinates?.lng || 77.5946;
      const isSelected = String(evt.id) === String(this.selectedEventId);

      const markerColor = this.getDisciplineColor(evt);
      const customIcon = L.divIcon({
        className: `custom-map-marker ${isSelected ? 'active-selected' : ''}`,
        html: `
          <div class="neon-pin-icon" data-pin-id="${evt.id}">
            <div class="pin-pulse" style="background: ${markerColor};"></div>
            <div class="pin-core" style="background: ${markerColor}; color: ${markerColor};"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18]
      });

      const popupHtml = `
        <div class="popup-card">
          <img src="${evt.bannerUrl}" class="popup-card-banner" alt="${evt.title}" />
          <div class="popup-card-body">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span class="glass-pill badge-neon" style="font-size:0.7rem; padding:2px 8px;">${(evt.city || '').toUpperCase()}</span>
              <span style="font-size:0.8rem; font-weight:700; color:var(--accent-gold);">${evt.date}</span>
            </div>
            <h4 class="popup-card-title">${evt.title}</h4>
            <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:12px;">
              📍 ${evt.venue}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.08); padding-top:10px;">
              <div>
                <span style="font-size:0.7rem; color:var(--text-muted);">From</span>
                <div style="font-family:var(--font-family-display); font-weight:800; font-size:1.1rem; color:#fff;">
                  ₹${(evt.priceFromInr || 0).toLocaleString()}
                </div>
              </div>
              <button class="btn btn-primary map-register-btn" data-id="${evt.id}" style="font-size:0.8rem; padding:6px 14px;">
                Register & Save
              </button>
            </div>
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon: customIcon }).bindPopup(popupHtml);
      
      // When marker is clicked, synchronize selection and highlight in sidebar
      marker.on('click', () => {
        this.selectEvent(evt.id, { fly: false, openPopup: true });
      });

      this.markersLayer.addLayer(marker);
      this.markersMap.set(String(evt.id), { marker, lat, lng, evt });
    });

    // Delegate register clicks inside popup
    this.map.on('popupopen', (e) => {
      const regBtn = e.popup._container.querySelector('.map-register-btn');
      if (regBtn) {
        regBtn.addEventListener('click', () => {
          const id = regBtn.getAttribute('data-id');
          if (window.openRegistrationModal) {
            window.openRegistrationModal(id);
          }
        });
      }
    });

    // Render Sidebar List
    this.renderSidebarList(filtered);

    // If an event was selected before re-render, re-open its popup
    if (this.selectedEventId && this.markersMap.has(String(this.selectedEventId))) {
      const { marker } = this.markersMap.get(String(this.selectedEventId));
      setTimeout(() => {
        marker.openPopup();
      }, 200);
    }
  }

  renderSidebarList(filtered) {
    const listEl = document.getElementById('map-events-list');
    const countEl = document.getElementById('map-filtered-count');
    if (countEl) countEl.textContent = `${filtered.length} Live Events`;

    if (!listEl) return;

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center; padding:40px 16px; color:var(--text-muted);">
          <p style="font-size:1rem; margin-bottom:8px;">No events in this hub / category.</p>
          <button class="btn btn-secondary" id="reset-map-filters-btn" style="font-size:0.8rem;">Reset Filters</button>
        </div>
      `;
      const rstBtn = document.getElementById('reset-map-filters-btn');
      if (rstBtn) {
        rstBtn.addEventListener('click', () => {
          this.flyToHub('All');
        });
      }
      return;
    }

    listEl.innerHTML = filtered
      .map((evt) => {
        const markerColor = this.getDisciplineColor(evt);
        const isSelected = String(evt.id) === String(this.selectedEventId);
        return `
          <div class="map-event-item ${isSelected ? 'selected' : ''}" data-id="${evt.id}" data-lat="${evt.coordinates?.lat}" data-lng="${evt.coordinates?.lng}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="font-size:0.75rem; font-weight:700; color:${markerColor}; display:flex; align-items:center; gap:4px;">
                ● ${evt.city}
              </span>
              <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">${evt.date}</span>
            </div>
            <div style="font-weight:700; font-size:0.95rem; line-height:1.3; color:#fff; margin-bottom:6px;">
              ${evt.title}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
              <span style="color:var(--text-secondary);">${evt.distanceCategories?.[0]?.name || 'Open'}</span>
              <span style="font-family:var(--font-family-display); font-weight:800; color:var(--accent-neon);">
                ₹${(evt.priceFromInr || 0).toLocaleString()}
              </span>
            </div>
          </div>
        `;
      })
      .join('');

    // Attach click-to-select on sidebar items
    listEl.querySelectorAll('.map-event-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-id');
        this.selectEvent(id, { fly: true, openPopup: true });
      });
    });
  }

  selectEvent(eventId, { fly = true, openPopup = true } = {}) {
    if (!eventId) return;
    this.selectedEventId = String(eventId);

    const evt = this.events.find((e) => String(e.id) === String(eventId));
    if (!evt) return;

    // If currently filtered by another city, reset city to 'All' so marker is visible
    if (this.selectedCity !== 'All' && (evt.city || '').toLowerCase() !== this.selectedCity.toLowerCase()) {
      this.selectedCity = 'All';
      document.querySelectorAll('.map-hub-btn').forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-hub') === 'All');
      });
      this.renderMarkersAndSidebar();
    }

    // 1. Highlight selected item in sidebar list and scroll to it
    const listEl = document.getElementById('map-events-list');
    if (listEl) {
      listEl.querySelectorAll('.map-event-item').forEach((el) => {
        const isMatch = el.getAttribute('data-id') === String(eventId);
        el.classList.toggle('selected', isMatch);
        if (isMatch) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }

    // 2. Spotlight the Leaflet marker
    const markerData = this.markersMap.get(String(eventId));
    if (markerData && this.map) {
      const { marker, lat, lng } = markerData;

      // Reset active-selected on all markers
      this.markersMap.forEach(({ marker: m }) => {
        const iconEl = m.getElement();
        if (iconEl) iconEl.classList.remove('active-selected');
      });

      // Add active-selected to this marker
      const iconEl = marker.getElement();
      if (iconEl) {
        iconEl.classList.add('active-selected');
      }

      // Fly to marker
      if (fly) {
        this.map.flyTo([lat, lng], 15, { duration: 1.2 });
      }

      // Open popup
      if (openPopup) {
        setTimeout(() => {
          marker.openPopup();
        }, fly ? 350 : 50);
      }
    }
  }

  initBaseLayers() {
    const L = window.L;
    if (!L || !this.map) return;

    // Layer 1: Esri Dark Canvas (Clean athletic dark, 100% free, zero watermark)
    const esriBase = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 16, attribution: 'Esri, HERE, Garmin' }
    );
    const esriRef = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 16 }
    );
    const darkCanvas = L.layerGroup([esriBase, esriRef]);

    // Layer 2: Google Satellite Hybrid (Ultra-high-res crisp satellite imagery)
    const googleSatellite = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      { maxZoom: 20, attribution: 'Google' }
    );

    // Layer 3: Google Streets Roadmap
    const googleRoadmap = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      { maxZoom: 20, attribution: 'Google' }
    );

    this.baseLayers = {
      'dark': darkCanvas,
      'google-satellite': googleSatellite,
      'google-roadmap': googleRoadmap
    };

    // Default to clean dark canvas
    darkCanvas.addTo(this.map);
    this.currentBaseLayer = darkCanvas;

    // Attach listeners for layer switcher buttons
    document.querySelectorAll('.map-layer-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const layerKey = btn.getAttribute('data-layer');
        if (layerKey) this.switchBaseLayer(layerKey);
      });
    });
  }

  switchBaseLayer(layerKey) {
    if (!this.baseLayers || !this.baseLayers[layerKey] || !this.map) return;

    if (this.currentBaseLayer) {
      this.map.removeLayer(this.currentBaseLayer);
    }

    this.baseLayers[layerKey].addTo(this.map);
    this.currentBaseLayer = this.baseLayers[layerKey];

    // Ensure pins layer remains top-most
    if (this.markersLayer) {
      this.markersLayer.bringToFront();
    }

    // Update button states
    document.querySelectorAll('.map-layer-btn').forEach((b) => {
      const isActive = b.getAttribute('data-layer') === layerKey;
      b.classList.toggle('active', isActive);
      b.style.color = isActive ? '#fff' : '#9ca3af';
      b.style.background = isActive ? 'rgba(0, 245, 155, 0.2)' : 'none';
      b.style.borderColor = isActive ? 'var(--accent-neon)' : 'transparent';
    });
  }

  setupHubButtons() {
    const hubButtons = document.querySelectorAll('.map-hub-btn');
    hubButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const hub = btn.getAttribute('data-hub') || 'All';
        this.flyToHub(hub);
      });
    });
  }

  flyToHub(hub) {
    this.selectedCity = hub;
    this.selectedEventId = null; // Clear individual selection on hub switch
    const config = this.hubCoordinates[hub] || this.hubCoordinates['All'];

    document.querySelectorAll('.map-hub-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-hub') === hub);
    });

    if (this.map) {
      this.map.flyTo([config.lat, config.lng], config.zoom, { duration: 1.4 });
    }

    this.renderMarkersAndSidebar();
  }

  setupSidebarFilters() {
    const searchInput = document.getElementById('map-sidebar-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        const items = document.querySelectorAll('.map-event-item');
        items.forEach((item) => {
          const text = item.textContent.toLowerCase();
          item.style.display = text.includes(q) ? 'block' : 'none';
        });
      });
    }
  }

  getDisciplineColor(evt) {
    const t = (evt.title || '').toLowerCase();
    if (t.includes('ultra') || t.includes('brevet')) return '#fbbf24'; // Gold
    if (t.includes('half marathon') || t.includes('21k') || t.includes('1/2')) return '#00d2ff'; // Cyan
    if (t.includes('marathon') || t.includes('42k')) return '#9d4edd'; // Purple
    if (t.includes('cycl') || t.includes('ride') || t.includes('triathlon')) return '#ff6b35'; // Orange
    return '#00f59b'; // Neon Green for 10K/5K
  }

  invalidateSize() {
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 150);
    }
  }
}

export const eventRadarMap = new EventRadarMap();
