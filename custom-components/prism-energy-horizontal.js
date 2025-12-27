/**
 * Prism Energy Horizontal Card
 * A glassmorphism energy flow card for Home Assistant
 * Horizontal layout optimized for tablets with side panel details
 * 
 * @version 1.0.0
 * @author BangerTech
 */

class PrismEnergyHorizontalCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = {};
    this._animationFrame = null;
  }

  static getStubConfig() {
    return {
      name: "Energy Monitor",
      solar_power: "",
      grid_power: "",
      battery_soc: "",
      battery_power: "",
      home_consumption: "",
      ev_power: "",
      autarky: "",
      image: "/local/custom-components/images/prism-energy-home.png",
      max_solar_power: 10000,
      max_grid_power: 10000,
      max_consumption: 10000,
      show_details: true,
      // Solar modules (optional)
      solar_module1: "",
      solar_module1_name: "",
      solar_module2: "",
      solar_module2_name: "",
      solar_module3: "",
      solar_module3_name: "",
      solar_module4: "",
      solar_module4_name: ""
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: "name",
          label: "Kartenname",
          selector: { text: {} }
        },
        {
          name: "image",
          label: "Bild-URL (Standard: prism-energy-home.png)",
          selector: { text: {} }
        },
        {
          name: "show_details",
          label: "Details-Panel standardmäßig anzeigen",
          selector: { boolean: {} }
        },
        {
          name: "",
          type: "divider"
        },
        {
          name: "solar_power",
          label: "Solar Leistung (Gesamt)",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "grid_power",
          label: "Netz Leistung (positiv=Bezug, negativ=Einspeisung)",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "battery_soc",
          label: "Batterie SOC %",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "battery_power",
          label: "Batterie Leistung (positiv=Entladung, negativ=Ladung)",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "home_consumption",
          label: "Hausverbrauch",
          required: true,
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "ev_power",
          label: "E-Auto Ladeleistung (optional)",
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "autarky",
          label: "Autarkie % (optional)",
          selector: { entity: { domain: "sensor" } }
        },
        {
          name: "",
          type: "divider"
        },
        {
          type: "expandable",
          name: "",
          title: "📊 Maximalwerte für Gauges",
          schema: [
            {
              name: "max_solar_power",
              label: "Max. Solar-Leistung (Watt) - z.B. 10000 für 10kW",
              selector: { number: { min: 1000, max: 100000, step: 100, mode: "box", unit_of_measurement: "W" } }
            },
            {
              name: "max_grid_power",
              label: "Max. Netz-Leistung (Watt)",
              selector: { number: { min: 1000, max: 100000, step: 100, mode: "box", unit_of_measurement: "W" } }
            },
            {
              name: "max_consumption",
              label: "Max. Verbrauch (Watt)",
              selector: { number: { min: 1000, max: 100000, step: 100, mode: "box", unit_of_measurement: "W" } }
            }
          ]
        },
        {
          type: "expandable",
          name: "",
          title: "☀️ Solar Module (optional - für Einzelanzeige)",
          schema: [
            {
              name: "solar_module1",
              label: "Solar Modul 1 (Entity)",
              selector: { entity: { domain: "sensor" } }
            },
            {
              name: "solar_module1_name",
              label: "Modul 1 Name (z.B. Büro links)",
              selector: { text: {} }
            },
            {
              name: "solar_module2",
              label: "Solar Modul 2 (Entity)",
              selector: { entity: { domain: "sensor" } }
            },
            {
              name: "solar_module2_name",
              label: "Modul 2 Name (z.B. Büro rechts)",
              selector: { text: {} }
            },
            {
              name: "solar_module3",
              label: "Solar Modul 3 (Entity)",
              selector: { entity: { domain: "sensor" } }
            },
            {
              name: "solar_module3_name",
              label: "Modul 3 Name (z.B. Wohnhaus)",
              selector: { text: {} }
            },
            {
              name: "solar_module4",
              label: "Solar Modul 4 (Entity)",
              selector: { entity: { domain: "sensor" } }
            },
            {
              name: "solar_module4_name",
              label: "Modul 4 Name",
              selector: { text: {} }
            }
          ]
        }
      ]
    };
  }

  setConfig(config) {
    this._config = {
      name: config.name || "Energy Monitor",
      solar_power: config.solar_power || "",
      grid_power: config.grid_power || "",
      battery_soc: config.battery_soc || "",
      battery_power: config.battery_power || "",
      home_consumption: config.home_consumption || "",
      ev_power: config.ev_power || "",
      autarky: config.autarky || "",
      image: config.image || "/local/custom-components/images/prism-energy-home.png",
      show_details: config.show_details !== false,
      // Max values for gauges (in Watts)
      max_solar_power: config.max_solar_power || 10000,
      max_grid_power: config.max_grid_power || 10000,
      max_consumption: config.max_consumption || 10000,
      // Solar modules
      solar_module1: config.solar_module1 || "",
      solar_module1_name: config.solar_module1_name || "Modul 1",
      solar_module2: config.solar_module2 || "",
      solar_module2_name: config.solar_module2_name || "Modul 2",
      solar_module3: config.solar_module3 || "",
      solar_module3_name: config.solar_module3_name || "Modul 3",
      solar_module4: config.solar_module4 || "",
      solar_module4_name: config.solar_module4_name || "Modul 4"
    };
  }

  set hass(hass) {
    this._hass = hass;
    // Only do full render on first load, then just update values
    if (!this._initialized) {
      this.render();
      this._initialized = true;
    } else {
      this._updateValues();
    }
  }

  // Update only the dynamic values without re-rendering (preserves animations)
  _updateValues() {
    if (!this.shadowRoot || !this._hass) return;

    const solarPower = this._getState(this._config.solar_power, 0);
    const gridPower = this._getState(this._config.grid_power, 0);
    const batterySoc = this._getState(this._config.battery_soc, 0);
    const batteryPower = this._getState(this._config.battery_power, 0);
    const homeConsumption = this._getState(this._config.home_consumption, 0);
    const evPower = this._getState(this._config.ev_power, 0);
    const autarky = this._getState(this._config.autarky, 0);

    // Update pill values
    this._updateElement('.pill-solar .pill-val', this._formatPower(solarPower));
    this._updateElement('.pill-grid .pill-val', this._formatPower(gridPower));
    this._updateElement('.pill-home .pill-val', this._formatPower(homeConsumption));
    this._updateElement('.pill-battery .pill-val', `${Math.round(batterySoc)}%`);
    
    if (this._config.ev_power) {
      const isEvCharging = evPower > 50;
      this._updateElement('.pill-ev .pill-val', isEvCharging ? this._formatPower(evPower) : 'Idle');
    }
    
    if (this._config.autarky) {
      this._updateElement('.autarkie-value', `${Math.round(autarky)}%`);
    }

    // Update gauge values
    this._updateGauges();

    // Update flow visibility
    this._updateFlows();
  }

  _updateElement(selector, value) {
    const el = this.shadowRoot.querySelector(selector);
    if (el && el.textContent !== value) {
      el.textContent = value;
    }
  }

  _updateGauges() {
    const solarPower = this._getState(this._config.solar_power, 0);
    const gridPower = this._getState(this._config.grid_power, 0);
    const batterySoc = this._getState(this._config.battery_soc, 0);
    const homeConsumption = this._getState(this._config.home_consumption, 0);

    // Update inlet gauge arcs
    this._updateGaugeArc('solar-gauge-arc', solarPower / this._config.max_solar_power);
    this._updateGaugeArc('grid-gauge-arc', Math.abs(gridPower) / this._config.max_grid_power);
    this._updateGaugeArc('consumption-gauge-arc', homeConsumption / this._config.max_consumption);

    // Update inlet gauge values
    this._updateElement('.inlet-gauge-solar .inlet-value', this._formatPower(solarPower));
    this._updateElement('.inlet-gauge-grid .inlet-value', this._formatPower(gridPower));
    this._updateElement('.inlet-gauge-consumption .inlet-value', this._formatPower(homeConsumption));
    
    // Update battery display
    this._updateElement('.battery-soc', `${Math.round(batterySoc)}%`);
  }

  _updateGaugeArc(id, percentage) {
    const arc = this.shadowRoot.querySelector(`#${id}`);
    if (arc) {
      const clampedPercentage = Math.min(Math.max(percentage, 0), 1);
      const r = 40;
      const c = 2 * Math.PI * r;
      const arcLength = c * 0.75; // 270 degrees
      const dashOffset = arcLength * (1 - clampedPercentage);
      arc.style.strokeDashoffset = dashOffset;
    }
  }

  _updateFlows() {
    const solarPower = this._getState(this._config.solar_power, 0);
    const gridPower = this._getState(this._config.grid_power, 0);
    const batteryPower = this._getState(this._config.battery_power, 0);
    const homeConsumption = this._getState(this._config.home_consumption, 0);
    const evPower = this._getState(this._config.ev_power, 0);

    const isSolarActive = solarPower > 50;
    const isGridImport = gridPower > 50;
    const isGridExport = gridPower < -50;
    const isBatteryCharging = batteryPower < -50;
    const isBatteryDischarging = batteryPower > 50;
    const isEvCharging = evPower > 50;
    const hasEV = !!this._config.ev_power;

    // Show/hide flow groups based on state
    this._setFlowVisibility('flow-solar-home', isSolarActive && homeConsumption > 0);
    this._setFlowVisibility('flow-solar-battery', isSolarActive && isBatteryCharging);
    this._setFlowVisibility('flow-solar-grid', isSolarActive && isGridExport);
    this._setFlowVisibility('flow-grid-home', isGridImport);
    this._setFlowVisibility('flow-grid-battery', isGridImport && isBatteryCharging);
    this._setFlowVisibility('flow-battery-home', isBatteryDischarging);
    this._setFlowVisibility('flow-battery-grid', isBatteryDischarging && isGridExport);
    
    if (hasEV) {
      this._setFlowVisibility('flow-solar-ev', isSolarActive && isEvCharging);
      this._setFlowVisibility('flow-grid-ev', isGridImport && isEvCharging);
      this._setFlowVisibility('flow-battery-ev', isBatteryDischarging && isEvCharging);
    }
  }

  _setFlowVisibility(className, visible) {
    const el = this.shadowRoot.querySelector(`.${className}`);
    if (el) {
      el.style.display = visible ? 'block' : 'none';
    }
  }

  getCardSize() {
    return 5;
  }

  // Tell HA this card prefers full width
  getLayoutOptions() {
    return {
      grid_columns: 4,
      grid_min_columns: 3,
      grid_rows: 'auto'
    };
  }

  connectedCallback() {
    this.render();
    this._setupEventListeners();
  }

  disconnectedCallback() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }
  }

  // Open more-info dialog for an entity (shows history)
  _openMoreInfo(entityId) {
    if (!entityId || !this._hass) return;
    
    const event = new Event('hass-more-info', {
      bubbles: true,
      composed: true
    });
    event.detail = { entityId: entityId };
    this.dispatchEvent(event);
  }

  // Setup click event listeners for pills
  _setupEventListeners() {
    if (!this.shadowRoot) return;
    
    // Add click listeners to all pills with data-entity attribute
    this.shadowRoot.querySelectorAll('.pill[data-entity]').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const entityId = pill.getAttribute('data-entity');
        if (entityId) {
          this._openMoreInfo(entityId);
        }
      });
    });

    // Add click listener to house image (opens home consumption history)
    const houseImg = this.shadowRoot.querySelector('.house-img');
    if (houseImg && this._config.home_consumption) {
      houseImg.addEventListener('click', () => {
        this._openMoreInfo(this._config.home_consumption);
      });
    }

    // Add click listeners to gauges
    this.shadowRoot.querySelectorAll('.gauge[data-entity]').forEach(gauge => {
      gauge.addEventListener('click', (e) => {
        e.stopPropagation();
        const entityId = gauge.getAttribute('data-entity');
        if (entityId) {
          this._openMoreInfo(entityId);
        }
      });
    });
  }

  // Helper to get entity state
  _getState(entityId, defaultVal = 0) {
    if (!entityId || !this._hass) return defaultVal;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return defaultVal;
    const val = parseFloat(stateObj.state);
    return isNaN(val) ? defaultVal : val;
  }

  // Helper to format power values
  _formatPower(watts) {
    const absWatts = Math.abs(watts);
    if (absWatts >= 1000) {
      return `${(absWatts / 1000).toFixed(1)} kW`;
    }
    return `${Math.round(absWatts)} W`;
  }

  // Render a circular gauge with inlet style (like prism-heat)
  _renderInletGauge(id, label, value, percentage, color, entityId = '') {
    const r = 36;
    const c = 2 * Math.PI * r;
    const arcLength = c * 0.75; // 270 degrees
    const strokeDashArray = `${arcLength} ${c}`;
    const clampedPercentage = Math.min(Math.max(percentage, 0), 1);
    const dashOffset = arcLength * (1 - clampedPercentage);

    return `
      <div class="inlet-gauge inlet-gauge-${id}" data-entity="${entityId}" title="Klicken für Historie">
        <div class="inlet-track"></div>
        <svg viewBox="0 0 100 100">
          <defs>
            <linearGradient id="inlet-grad-${id}" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:${color};stop-opacity:0.4" />
              <stop offset="100%" style="stop-color:${color};stop-opacity:1" />
            </linearGradient>
          </defs>
          <!-- Background track -->
          <circle cx="50" cy="50" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="8" 
                  stroke-dasharray="${strokeDashArray}" stroke-linecap="round" 
                  transform="rotate(135, 50, 50)" />
          <!-- Active arc -->
          <circle id="${id}-gauge-arc" cx="50" cy="50" r="${r}" fill="none" stroke="url(#inlet-grad-${id})" stroke-width="8" 
                  stroke-dasharray="${strokeDashArray}" 
                  stroke-dashoffset="${dashOffset}" 
                  stroke-linecap="round"
                  transform="rotate(135, 50, 50)"
                  style="transition: stroke-dashoffset 0.5s ease;" />
        </svg>
        <div class="inlet-content">
          <div class="inlet-value">${value}</div>
          <div class="inlet-label">${label}</div>
        </div>
      </div>
    `;
  }

  // Generate animated flow path with "Fake Glow" - 3 layered paths instead of filters
  _renderFlow(path, color, active, reverse = false, className = '') {
    const direction = reverse ? 'reverse' : '';
    const display = active ? 'block' : 'none';
    
    return `
      <g class="flow-group ${className}" style="display: ${display};">
        <!-- Background track (always visible when flow is active) -->
        <path d="${path}" fill="none" stroke="${color}" stroke-width="0.4" stroke-opacity="0.12" stroke-linecap="round" />
        
        <!-- LAYER 1: Breiter, sehr transparenter Outer Glow -->
        <path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="0.08" stroke-linecap="round" class="flow-beam ${direction}" />
        
        <!-- LAYER 2: Mittlerer Inner Glow -->
        <path d="${path}" fill="none" stroke="${color}" stroke-width="1" stroke-opacity="0.35" stroke-linecap="round" class="flow-beam ${direction}" />
        
        <!-- LAYER 3: Dünner, heller Kern -->
        <path d="${path}" fill="none" stroke="#ffffff" stroke-width="0.3" stroke-opacity="0.25" stroke-linecap="round" class="flow-beam ${direction}" />
      </g>
    `;
  }

  render() {
    if (!this.shadowRoot) return;

    // Get current values
    const solarPower = this._getState(this._config.solar_power, 0);
    const gridPower = this._getState(this._config.grid_power, 0);
    const batterySoc = this._getState(this._config.battery_soc, 0);
    const batteryPower = this._getState(this._config.battery_power, 0);
    const homeConsumption = this._getState(this._config.home_consumption, 0);
    const evPower = this._getState(this._config.ev_power, 0);
    const autarky = this._getState(this._config.autarky, 0);
    
    const hasEV = !!this._config.ev_power;
    const hasAutarky = !!this._config.autarky;
    const houseImg = this._config.image;

    // Determine flow states
    const isSolarActive = solarPower > 50;
    const isGridImport = gridPower > 50;
    const isGridExport = gridPower < -50;
    const isBatteryCharging = batteryPower < -50;
    const isBatteryDischarging = batteryPower > 50;
    const isEvCharging = evPower > 50;

    // Battery icon based on SOC
    let batteryIcon = "mdi:battery";
    if (batterySoc >= 90) batteryIcon = "mdi:battery";
    else if (batterySoc >= 70) batteryIcon = "mdi:battery-80";
    else if (batterySoc >= 50) batteryIcon = "mdi:battery-60";
    else if (batterySoc >= 30) batteryIcon = "mdi:battery-40";
    else if (batterySoc >= 10) batteryIcon = "mdi:battery-20";
    else batteryIcon = "mdi:battery-outline";
    
    if (isBatteryCharging) batteryIcon = "mdi:battery-charging";

    // SVG Paths for energy flows (matched to pill positions)
    // Solar: 50,22 | Grid: 18,38 | Home: 52,55 | Battery: 78,62 | EV: 20,75
    const paths = {
      solarToHome: "M 55 25 Q 54 38 52 50",
      solarToBattery: "M 55 25 Q 72 44 88 62",
      solarToGrid: "M 55 25 Q 36 29 18 34",
      solarToEv: "M 55 25 Q 36 48 20 70",
      
      gridToHome: "M 18 34 Q 35 42 52 50",
      gridToBattery: "M 18 34 Q 53 48 88 62",
      gridToEv: "M 18 34 Q 19 52 20 70",
      
      batteryToHome: "M 88 62 Q 70 56 52 50",
      batteryToEv: "M 88 62 Q 54 66 20 70",
      batteryToGrid: "M 88 62 Q 53 48 18 34"
    };

    // Colors
    const colors = {
      solar: '#F59E0B',
      grid: '#3B82F6',
      battery: '#10B981',
      home: '#8B5CF6',
      ev: '#EC4899'
    };

    this.shadowRoot.innerHTML = `
      <style>
        .card {
          position: relative;
          width: 100%;
          min-width: 600px;
          border-radius: 28px;
          display: flex;
          flex-direction: row;
          overflow: hidden;
          background: rgba(30, 32, 36, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(0, 0, 0, 0.3);
          color: white;
          box-sizing: border-box;
          user-select: none;
          height: calc(100vh - 80px);
          max-height: 850px;
          min-height: 350px;
        }
        
        :host {
          display: block;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          /* Force card to use full width in dashboard */
          --ha-card-border-radius: 28px;
        }
        
        .noise {
          position: absolute;
          inset: 0;
          opacity: 0.02;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          mix-blend-mode: overlay;
        }

        /* Main Content (House Area) */
        .main-content {
          position: relative;
          flex: 1;
          min-width: 380px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Header */
        .header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 24px 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 30;
          background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        
        .icon-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(245, 158, 11, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${colors.solar};
          border: 1px solid rgba(245, 158, 11, 0.25);
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.2), inset 0 0 10px rgba(245, 158, 11, 0.1);
        }
        
        .icon-circle ha-icon {
          --mdc-icon-size: 26px;
        }
        
        .title-group h2 {
          font-size: 1.3rem;
          font-weight: 600;
          line-height: 1.2;
          margin: 0;
          color: rgba(255, 255, 255, 0.95);
        }
        
        .live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
        }
        
        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          animation: pulse 2s ease-in-out infinite;
          box-shadow: 0 0 8px #22c55e;
        }
        
        .live-text {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #4ade80;
        }
        
        .autarkie-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px 10px 10px;
          border-radius: 999px;
          background: rgba(20, 20, 20, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.6),
            inset -1px -1px 2px rgba(255, 255, 255, 0.03),
            0 6px 12px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-top: 1px solid rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .autarkie-icon {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(74, 222, 128, 0.15);
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.4),
            inset -1px -1px 2px rgba(255, 255, 255, 0.05),
            0 0 15px rgba(74, 222, 128, 0.3);
        }
        
        .autarkie-icon ha-icon {
          --mdc-icon-size: 20px;
          color: #4ade80;
        }
        
        .autarkie-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .autarkie-value {
          font-size: 1.1rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
          line-height: 1;
        }
        
        .autarkie-label {
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.5);
        }
        

        /* Visual Container - Larger House */
        .visual-container {
          position: relative;
          width: 100%;
          height: 100%;
          flex: 1;
          min-width: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
          padding: 60px 0 0 0;
          box-sizing: border-box;
        }
        
        /* Wrapper for image and pills - pills are positioned relative to this */
        .house-wrapper {
          position: relative;
          width: 120%;
          max-width: 900px;
          margin-left: -10%;
        }
        
        /* When no details panel - house can be larger */
        .card:not(:has(.details-panel)) .house-wrapper {
          width: 100%;
          max-width: 1100px;
          margin-left: 0;
        }
        
        .card:not(:has(.details-panel)) .main-content {
          align-items: center;
          justify-content: center;
        }
        
        .card:not(:has(.details-panel)) .visual-container {
          max-width: 1000px;
        }
        
        .house-img {
          width: 100%;
          height: auto;
          display: block;
          z-index: 0;
          filter: drop-shadow(0 20px 40px rgba(0,0,0,0.5));
          cursor: pointer;
          transition: filter 0.2s ease, transform 0.3s ease;
        }
        
        .house-img:hover {
          filter: drop-shadow(0 20px 40px rgba(0,0,0,0.5)) brightness(1.05);
        }
        
        .bottom-gradient {
          position: absolute;
          inset: auto 0 0 0;
          height: 4rem;
          background: linear-gradient(to top, rgba(30, 32, 36, 1), transparent);
          pointer-events: none;
          z-index: 5;
        }

        /* SVG Overlay */
        .svg-overlay {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 10;
        }

        /* Animations */
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
        
        @keyframes flow-animation {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
        
        @keyframes flow-animation-reverse {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 100; }
        }
        
        .flow-beam {
          stroke-dasharray: 25 75;
          animation: flow-animation 3s linear infinite;
        }
        
        .flow-beam.reverse {
          stroke-dasharray: 25 75;
          animation: flow-animation-reverse 3s linear infinite;
        }

        /* Data Pills - Fixed to image positions */
        .pill {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(20, 20, 20, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 999px;
          padding: 10px 16px 10px 10px;
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.6),
            inset -1px -1px 2px rgba(255, 255, 255, 0.03),
            0 6px 12px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-top: 1px solid rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          z-index: 20;
          transform: translate(-50%, -50%);
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        
        .pill:hover {
          transform: translate(-50%, -50%) scale(1.05);
        }
        
        .pill[data-entity] {
          cursor: pointer;
        }
        
        .pill[data-entity]:active {
          transform: translate(-50%, -50%) scale(0.97);
        }
        
        .pill-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .pill-icon ha-icon {
          --mdc-icon-size: 22px;
        }
        
        .pill-content {
          display: flex;
          flex-direction: column;
          line-height: 1;
          gap: 3px;
        }
        
        .pill-val {
          font-size: 1.1rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
        }
        
        .pill-label {
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.4);
        }

        /* Pill Icon Colors */
        .bg-solar {
          background: rgba(245, 158, 11, 0.15);
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
        }
        .color-solar { color: ${colors.solar}; }
        
        .bg-grid {
          background: rgba(59, 130, 246, 0.15);
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
        }
        .color-grid { color: ${colors.grid}; }
        
        .bg-battery {
          background: rgba(16, 185, 129, 0.15);
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
        }
        .color-battery { color: ${colors.battery}; }
        
        .bg-home {
          background: rgba(139, 92, 246, 0.15);
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
        }
        .color-home { color: ${colors.home}; }
        
        .bg-ev {
          background: rgba(236, 72, 153, 0.15);
          box-shadow: 0 0 10px rgba(236, 72, 153, 0.3);
        }
        .color-ev { color: ${colors.ev}; }
        
        .bg-inactive {
          background: rgba(255, 255, 255, 0.03);
          box-shadow: none;
        }
        .color-inactive { color: rgba(255, 255, 255, 0.35); }

        /* Details Panel (Right Side) - Responsive */
        .details-panel {
          width: clamp(280px, 25vw, 400px);
          min-width: 280px;
          flex-shrink: 0;
          background: rgba(0, 0, 0, 0.35);
          border-left: 1px solid rgba(255, 255, 255, 0.05);
          padding: clamp(12px, 1.5vw, 20px);
          display: flex;
          flex-direction: column;
          gap: clamp(8px, 1vw, 14px);
          overflow-y: auto;
        }
        
        .details-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        
        .details-title {
          font-size: clamp(0.65rem, 0.8vw, 0.85rem);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(255, 255, 255, 0.4);
          text-align: center;
          width: 100%;
        }

        /* Inlet Gauge Styles (like prism-heat) - Responsive */
        .inlet-gauge {
          position: relative;
          width: clamp(100px, 12vw, 160px);
          height: clamp(100px, 12vw, 160px);
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        
        .inlet-gauge:hover {
          transform: scale(1.05);
        }
        
        .inlet-gauge:active {
          transform: scale(0.98);
        }
        
        .inlet-gauge .inlet-track {
          position: absolute;
          inset: 8%;
          border-radius: 50%;
          background: rgba(20, 20, 20, 0.8);
          box-shadow: inset 2px 2px 5px rgba(0,0,0,0.7), inset -1px -1px 2px rgba(255,255,255,0.04);
          border-bottom: 1px solid rgba(255,255,255,0.04);
          border-top: 1px solid rgba(0,0,0,0.3);
        }
        
        .inlet-gauge svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          transform: rotate(0deg);
        }
        
        .inlet-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          width: 65%;
          z-index: 2;
        }
        
        .inlet-value {
          font-size: clamp(0.9rem, 1.2vw, 1.3rem);
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
          line-height: 1.1;
        }
        
        .inlet-label {
          font-size: clamp(0.55rem, 0.7vw, 0.75rem);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 4px;
        }
        
        /* Two gauges side by side */
        .gauges-row {
          display: flex;
          justify-content: center;
          gap: 12px;
          width: 100%;
        }
        
        /* Solar Modules List */
        .modules-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }
        
        .module-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: clamp(8px, 1vw, 12px) clamp(10px, 1.2vw, 16px);
          background: rgba(20, 20, 20, 0.6);
          border-radius: 12px;
          box-shadow: inset 1px 1px 3px rgba(0,0,0,0.5), inset -1px -1px 2px rgba(255,255,255,0.03);
          border: 1px solid rgba(0,0,0,0.2);
        }
        
        .module-name {
          font-size: clamp(0.7rem, 0.85vw, 0.9rem);
          color: rgba(255, 255, 255, 0.5);
        }
        
        .module-value {
          font-size: clamp(0.8rem, 0.95vw, 1rem);
          font-weight: 700;
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
          color: ${colors.solar};
        }

        /* Battery Display */
        .battery-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 16px;
          background: rgba(20, 20, 20, 0.6);
          border-radius: 16px;
          box-shadow: inset 2px 2px 5px rgba(0,0,0,0.5), inset -1px -1px 2px rgba(255,255,255,0.03);
          border: 1px solid rgba(0,0,0,0.2);
          width: 100%;
          box-sizing: border-box;
        }
        
        .battery-icon-container {
          position: relative;
          width: clamp(50px, 5vw, 70px);
          height: clamp(70px, 7vw, 95px);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .battery-icon-container ha-icon {
          --mdc-icon-size: clamp(48px, 5vw, 72px);
          color: ${colors.battery};
          filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.4));
        }
        
        .battery-soc {
          font-size: clamp(1.2rem, 1.5vw, 1.8rem);
          font-weight: 700;
          color: ${colors.battery};
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
        }
        
        .battery-info {
          display: flex;
          flex-direction: column;
          gap: clamp(4px, 0.5vw, 8px);
          width: 100%;
        }
        
        .battery-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: clamp(0.75rem, 0.9vw, 0.95rem);
        }
        
        .battery-label {
          color: rgba(255, 255, 255, 0.5);
        }
        
        .battery-value {
          font-weight: 600;
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
        }
        
        .battery-value.charging { color: ${colors.battery}; }
        .battery-value.discharging { color: #ef4444; }
        .battery-value.standby { color: rgba(255, 255, 255, 0.6); }

        ha-icon {
          --mdc-icon-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Responsive Media Queries */
        @media (max-width: 1200px) {
          .card {
            min-width: 550px;
          }
          .house-wrapper {
            width: 115%;
            margin-left: -7%;
          }
        }

        @media (max-width: 900px) {
          .card {
            flex-direction: column;
            min-width: unset;
            height: auto;
            max-height: unset;
          }
          .main-content {
            min-width: unset;
            height: 60vh;
            min-height: 400px;
          }
          .house-wrapper {
            width: 100%;
            margin-left: 0;
          }
          .details-panel {
            width: 100%;
            min-width: unset;
            border-left: none;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
          }
          .gauges-row {
            justify-content: center;
          }
        }

        @media (max-height: 600px) {
          .card {
            height: calc(100vh - 40px);
            min-height: 300px;
          }
          .inlet-gauge {
            width: 90px;
            height: 90px;
          }
        }
        
      </style>

      <div class="card">
        <div class="noise"></div>
        
        <!-- Main Content (House Visualization) -->
        <div class="main-content">
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <div class="icon-circle">
                <ha-icon icon="mdi:solar-power-variant"></ha-icon>
              </div>
              <div class="title-group">
                <h2>${this._config.name}</h2>
                <div class="live-indicator">
                  <div class="dot"></div>
                  <span class="live-text">Live</span>
                </div>
              </div>
            </div>
            ${hasAutarky ? `
            <div class="autarkie-badge" data-entity="${this._config.autarky}" title="Klicken für Historie">
              <div class="autarkie-icon">
                <ha-icon icon="mdi:leaf"></ha-icon>
              </div>
              <div class="autarkie-content">
                <span class="autarkie-value">${Math.round(autarky)}%</span>
                <span class="autarkie-label">Autarkie</span>
              </div>
            </div>
            ` : ''}
          </div>

          <!-- Visual Container -->
          <div class="visual-container">
            <!-- House Wrapper - Pills are positioned relative to this -->
            <div class="house-wrapper">
              <img src="${houseImg}" class="house-img" alt="Energy Home" />

              <!-- SVG Flows -->
              <svg class="svg-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <filter id="glow-filter-h" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                
                <!-- Solar Flows -->
                ${this._renderFlow(paths.solarToHome, colors.solar, isSolarActive && homeConsumption > 0, false, 'flow-solar-home')}
                ${this._renderFlow(paths.solarToBattery, colors.solar, isSolarActive && isBatteryCharging, false, 'flow-solar-battery')}
                ${this._renderFlow(paths.solarToGrid, colors.solar, isSolarActive && isGridExport, false, 'flow-solar-grid')}
                ${hasEV ? this._renderFlow(paths.solarToEv, colors.solar, isSolarActive && isEvCharging, false, 'flow-solar-ev') : ''}

                <!-- Grid Flows -->
                ${this._renderFlow(paths.gridToHome, colors.grid, isGridImport, false, 'flow-grid-home')}
                ${this._renderFlow(paths.gridToBattery, colors.grid, isGridImport && isBatteryCharging, false, 'flow-grid-battery')}
                ${hasEV ? this._renderFlow(paths.gridToEv, colors.grid, isGridImport && isEvCharging, false, 'flow-grid-ev') : ''}

                <!-- Battery Flows -->
                ${this._renderFlow(paths.batteryToHome, colors.battery, isBatteryDischarging, false, 'flow-battery-home')}
                ${hasEV ? this._renderFlow(paths.batteryToEv, colors.battery, isBatteryDischarging && isEvCharging, false, 'flow-battery-ev') : ''}
                ${this._renderFlow(paths.batteryToGrid, colors.battery, isBatteryDischarging && isGridExport, false, 'flow-battery-grid')}
              </svg>

              <!-- Solar Pill (Top - over roof) -->
              <div class="pill pill-solar" style="top: 25%; left: 55%;" data-entity="${this._config.solar_power}" title="Klicken für Historie">
                <div class="pill-icon ${isSolarActive ? 'bg-solar' : 'bg-inactive'}">
                  <ha-icon icon="mdi:solar-power" class="${isSolarActive ? 'color-solar' : 'color-inactive'}"></ha-icon>
                </div>
                <div class="pill-content">
                  <span class="pill-val">${this._formatPower(solarPower)}</span>
                  <span class="pill-label">${isSolarActive ? 'Erzeugung' : 'Inaktiv'}</span>
                </div>
              </div>

              <!-- Grid Pill (on power pole) -->
              <div class="pill pill-grid" style="top: 34%; left: 18%;" data-entity="${this._config.grid_power}" title="Klicken für Historie">
                <div class="pill-icon ${isGridImport || isGridExport ? 'bg-grid' : 'bg-inactive'}">
                  <ha-icon icon="mdi:transmission-tower" class="${isGridImport || isGridExport ? 'color-grid' : 'color-inactive'}"></ha-icon>
                </div>
                <div class="pill-content">
                  <span class="pill-val">${this._formatPower(gridPower)}</span>
                  <span class="pill-label">${isGridExport ? 'Einspeisung' : isGridImport ? 'Bezug' : 'Neutral'}</span>
                </div>
              </div>

              <!-- Home Pill (Center-right - on house) -->
              <div class="pill pill-home" style="top: 50%; left: 52%;" data-entity="${this._config.home_consumption}" title="Klicken für Historie">
                <div class="pill-icon bg-home">
                  <ha-icon icon="mdi:home-lightning-bolt" class="color-home"></ha-icon>
                </div>
                <div class="pill-content">
                  <span class="pill-val">${this._formatPower(homeConsumption)}</span>
                  <span class="pill-label">Verbrauch</span>
                </div>
              </div>

              <!-- Battery Pill (Right - battery storage) -->
              <div class="pill pill-battery" style="top: 62%; left: 88%;" data-entity="${this._config.battery_soc}" title="Klicken für Historie">
                <div class="pill-icon ${isBatteryCharging || isBatteryDischarging ? 'bg-battery' : 'bg-inactive'}">
                  <ha-icon icon="${batteryIcon}" class="${isBatteryCharging || isBatteryDischarging ? 'color-battery' : 'color-inactive'}"></ha-icon>
                </div>
                <div class="pill-content">
                  <span class="pill-val">${Math.round(batterySoc)}%</span>
                  <span class="pill-label">${isBatteryCharging ? 'Ladung' : isBatteryDischarging ? 'Entladung' : 'Standby'}</span>
                </div>
              </div>

              <!-- EV Pill (Bottom Left - carport) -->
              ${hasEV ? `
              <div class="pill pill-ev" style="top: 70%; left: 20%;" data-entity="${this._config.ev_power}" title="Klicken für Historie">
                <div class="pill-icon ${isEvCharging ? 'bg-ev' : 'bg-inactive'}">
                  <ha-icon icon="mdi:car-electric" class="${isEvCharging ? 'color-ev' : 'color-inactive'}"></ha-icon>
                </div>
                <div class="pill-content">
                  <span class="pill-val">${isEvCharging ? this._formatPower(evPower) : 'Idle'}</span>
                  <span class="pill-label">Fahrzeug</span>
                </div>
              </div>
              ` : ''}
            </div>
            <div class="bottom-gradient"></div>
          </div>
        </div>

        <!-- Details Panel (Right Side) - shown based on config -->
        ${this._config.show_details ? `
        <div class="details-panel">
          <!-- Solar Section -->
          <div class="details-section">
            <div class="details-title">Solar</div>
            ${this._renderInletGauge('solar', 'Erzeugung', this._formatPower(solarPower), solarPower / this._config.max_solar_power, colors.solar, this._config.solar_power)}
          </div>
          
          <!-- Solar Modules (if configured) -->
          ${this._renderSolarModules()}
          
          <!-- Grid & Consumption Row -->
          <div class="gauges-row">
            ${this._renderInletGauge('grid', isGridExport ? 'Einspeis.' : 'Bezug', this._formatPower(gridPower), Math.abs(gridPower) / this._config.max_grid_power, isGridExport ? colors.battery : '#ef4444', this._config.grid_power)}
            ${this._renderInletGauge('consumption', 'Verbrauch', this._formatPower(homeConsumption), homeConsumption / this._config.max_consumption, colors.home, this._config.home_consumption)}
          </div>
          
          <!-- Battery Section with Icon -->
          <div class="details-section">
            <div class="details-title">Speicher</div>
            <div class="battery-display" data-entity="${this._config.battery_soc}">
              <div class="battery-icon-container">
                <ha-icon icon="${batteryIcon}"></ha-icon>
              </div>
              <div class="battery-soc">${Math.round(batterySoc)}%</div>
              <div class="battery-info">
                <div class="battery-row">
                  <span class="battery-label">Leistung</span>
                  <span class="battery-value ${isBatteryCharging ? 'charging' : isBatteryDischarging ? 'discharging' : 'standby'}">
                    ${isBatteryCharging ? '↓ ' : isBatteryDischarging ? '↑ ' : ''}${this._formatPower(Math.abs(batteryPower))}
                  </span>
                </div>
                <div class="battery-row">
                  <span class="battery-label">Status</span>
                  <span class="battery-value ${isBatteryCharging ? 'charging' : isBatteryDischarging ? 'discharging' : 'standby'}">
                    ${isBatteryCharging ? 'Lädt' : isBatteryDischarging ? 'Entlädt' : 'Standby'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          ${hasEV ? `
          <!-- EV Section -->
          <div class="details-section">
            <div class="details-title">E-Auto</div>
            <div class="module-item" data-entity="${this._config.ev_power}">
              <span class="module-name">Ladeleistung</span>
              <span class="module-value" style="color: ${colors.ev};">${isEvCharging ? this._formatPower(evPower) : 'Nicht aktiv'}</span>
            </div>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
    `;
    
    // Setup click event listeners after rendering
    this._setupEventListeners();
  }

  // Render solar modules if configured
  _renderSolarModules() {
    const modules = [];
    if (this._config.solar_module1) {
      modules.push({
        entity: this._config.solar_module1,
        name: this._config.solar_module1_name || "Modul 1"
      });
    }
    if (this._config.solar_module2) {
      modules.push({
        entity: this._config.solar_module2,
        name: this._config.solar_module2_name || "Modul 2"
      });
    }
    if (this._config.solar_module3) {
      modules.push({
        entity: this._config.solar_module3,
        name: this._config.solar_module3_name || "Modul 3"
      });
    }
    if (this._config.solar_module4) {
      modules.push({
        entity: this._config.solar_module4,
        name: this._config.solar_module4_name || "Modul 4"
      });
    }

    if (modules.length === 0) return '';

    let html = `<div class="modules-list">`;

    modules.forEach(mod => {
      const power = this._getState(mod.entity, 0);
      html += `
        <div class="module-item">
          <span class="module-name">${mod.name}</span>
          <span class="module-value">${this._formatPower(power)}</span>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }
}

// Register card component
customElements.define('prism-energy-horizontal', PrismEnergyHorizontalCard);

// Register with HACS / HA card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-energy-horizontal",
  name: "Prism Energy Horizontal",
  preview: true,
  description: "A glassmorphism energy flow card optimized for tablets with side panel details"
});

console.info(
  `%c PRISM-ENERGY-HORIZONTAL %c v1.0.0 `,
  'background: #F59E0B; color: black; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;',
  'background: #1e2024; color: white; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;'
);
