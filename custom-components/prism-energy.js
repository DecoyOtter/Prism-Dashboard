/**
 * Prism Energy Card
 * A glassmorphism energy flow card for Home Assistant
 * Designed for OpenEMS/Fenecon integration
 * 
 * @version 1.0.0
 * @author BangerTech
 */

class PrismEnergyCard extends HTMLElement {
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
      image: "/local/custom-components/images/prism-energy-home.png"
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
          label: "Details-Bereich unten anzeigen",
          selector: { boolean: {} }
        },
        {
          name: "solar_power",
          label: "Solar Leistung",
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
      show_details: config.show_details !== false
    };
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() {
    return 6;
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }
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

  // Generate animated flow path
  _renderFlow(path, color, active, reverse = false) {
    if (!active) return '';
    return `
      <g class="flow-group">
        <path d="${path}" fill="none" stroke="${color}" stroke-width="1" stroke-opacity="0.15" stroke-linecap="round" />
        <path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-opacity="0.1" class="flow-glow" />
        <path d="${path}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="4 200" class="flow-stream ${reverse ? 'reverse' : ''}" style="filter: drop-shadow(0 0 3px ${color}); opacity: 0.8;" />
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
    // OpenEMS: GridActivePower positive = import, negative = export
    // OpenEMS: EssDischargePower positive = discharge, negative = charge
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

    // SVG Paths for energy flows (adjusted for the house image layout)
    const paths = {
      // Solar flows from top (roof area) - adjusted for pill positions
      solarToHome: "M 52 22 Q 53 40 55 54",
      solarToBattery: "M 52 22 Q 68 38 88 60",
      solarToGrid: "M 52 22 Q 35 27 18 32",
      solarToEv: "M 52 22 Q 38 48 22 72",
      
      // Grid flows from left (power pole)
      gridToHome: "M 18 32 Q 36 45 55 54",
      gridToBattery: "M 18 32 Q 52 48 88 60",
      gridToEv: "M 18 32 Q 20 52 22 72",
      
      // Battery flows from right (battery storage)
      batteryToHome: "M 88 60 Q 72 58 55 54",
      batteryToEv: "M 88 60 Q 55 68 22 72",
      batteryToGrid: "M 88 60 Q 52 48 18 32"
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
        :host {
          display: block;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        
        .card {
          position: relative;
          width: 100%;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
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
        }
        
        .noise {
          position: absolute;
          inset: 0;
          opacity: 0.02;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          mix-blend-mode: overlay;
        }

        /* Header */
        .header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 30;
          background: linear-gradient(to bottom, rgba(0,0,0,0.4), transparent);
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .icon-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(245, 158, 11, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${colors.solar};
          border: 1px solid rgba(245, 158, 11, 0.25);
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.2), inset 0 0 10px rgba(245, 158, 11, 0.1);
        }
        
        .title-group h2 {
          font-size: 1.1rem;
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
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          animation: pulse 2s ease-in-out infinite;
          box-shadow: 0 0 8px #22c55e;
        }
        
        .live-text {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #4ade80;
        }
        
        .autarkie-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
        }
        
        .autarkie-text {
          font-size: 0.8rem;
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
        }

        /* Main Visual */
        .visual-container {
          position: relative;
          width: 100%;
          min-height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
          padding-top: 20px;
        }
        
        .house-img {
          width: 110%;
          max-width: none;
          object-fit: contain;
          margin-left: -1.5rem;
          margin-top: 1rem;
          z-index: 0;
          filter: drop-shadow(0 20px 40px rgba(0,0,0,0.4));
        }
        
        .bottom-gradient {
          position: absolute;
          inset: auto 0 0 0;
          height: 8rem;
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
        
        @keyframes flow-glow {
          0%, 100% { opacity: 0.05; }
          50% { opacity: 0.15; }
        }
        
        .flow-glow {
          animation: flow-glow 3s ease-in-out infinite;
        }
        
        @keyframes flow-stream {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -204; }
        }
        
        @keyframes flow-stream-reverse {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 204; }
        }
        
        .flow-stream {
          animation: flow-stream 4s linear infinite;
        }
        
        .flow-stream.reverse {
          animation: flow-stream-reverse 4s linear infinite;
        }

        /* Data Pills - Inlet Style */
        .pill {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(20, 20, 20, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 999px;
          padding: 6px 10px 6px 6px;
          box-shadow: 
            inset 2px 2px 4px rgba(0, 0, 0, 0.6),
            inset -1px -1px 2px rgba(255, 255, 255, 0.03),
            0 4px 8px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-top: 1px solid rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          z-index: 20;
          transform: translate(-50%, -50%);
          white-space: nowrap;
          transition: all 0.3s ease;
        }
        
        .pill:hover {
          transform: translate(-50%, -50%) scale(1.03);
        }
        
        .pill-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .pill-icon ha-icon {
          --mdc-icon-size: 16px;
        }
        
        .pill-content {
          display: flex;
          flex-direction: column;
          line-height: 1;
          gap: 1px;
        }
        
        .pill-val {
          font-size: 0.8rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
        }
        
        .pill-label {
          font-size: 0.5rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.4);
        }

        /* Pill Icon Colors */
        .bg-solar {
          background: rgba(245, 158, 11, 0.15);
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.3);
        }
        .color-solar { color: ${colors.solar}; }
        
        .bg-grid {
          background: rgba(59, 130, 246, 0.15);
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
        }
        .color-grid { color: ${colors.grid}; }
        
        .bg-battery {
          background: rgba(16, 185, 129, 0.15);
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
        }
        .color-battery { color: ${colors.battery}; }
        
        .bg-home {
          background: rgba(139, 92, 246, 0.15);
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);
        }
        .color-home { color: ${colors.home}; }
        
        .bg-ev {
          background: rgba(236, 72, 153, 0.15);
          box-shadow: 0 0 8px rgba(236, 72, 153, 0.3);
        }
        .color-ev { color: ${colors.ev}; }
        
        .bg-inactive {
          background: rgba(255, 255, 255, 0.03);
          box-shadow: none;
        }
        .color-inactive { color: rgba(255, 255, 255, 0.35); }

        /* Bottom Details */
        .details-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          padding: 20px 24px;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(12px);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        @media (max-width: 600px) {
          .details-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .detail-col {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .detail-header {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.4);
          letter-spacing: 0.08em;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
        }
        
        .detail-label {
          color: rgba(255, 255, 255, 0.6);
        }
        
        .detail-val {
          font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
        }
        
        .detail-bar {
          height: 4px;
          width: 100%;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          overflow: hidden;
          margin-top: 4px;
        }
        
        .detail-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.5s ease;
        }

        ha-icon {
          --mdc-icon-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      </style>

      <div class="card">
        <div class="noise"></div>
        
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
          <div class="autarkie-badge">
            <ha-icon icon="mdi:leaf" style="color: #4ade80; --mdc-icon-size: 16px;"></ha-icon>
            <span class="autarkie-text">${Math.round(autarky)}%</span>
          </div>
          ` : ''}
        </div>

        <!-- Main Visual -->
        <div class="visual-container">
          <img src="${houseImg}" class="house-img" alt="Energy Home" />
          <div class="bottom-gradient"></div>

          <!-- SVG Flows -->
          <svg class="svg-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
            <!-- Solar Flows -->
            ${this._renderFlow(paths.solarToHome, colors.solar, isSolarActive && homeConsumption > 0)}
            ${this._renderFlow(paths.solarToBattery, colors.solar, isSolarActive && isBatteryCharging)}
            ${this._renderFlow(paths.solarToGrid, colors.solar, isSolarActive && isGridExport)}
            ${hasEV ? this._renderFlow(paths.solarToEv, colors.solar, isSolarActive && isEvCharging) : ''}

            <!-- Grid Flows -->
            ${this._renderFlow(paths.gridToHome, colors.grid, isGridImport)}
            ${this._renderFlow(paths.gridToBattery, colors.grid, isGridImport && isBatteryCharging)}
            ${hasEV ? this._renderFlow(paths.gridToEv, colors.grid, isGridImport && isEvCharging) : ''}

            <!-- Battery Flows -->
            ${this._renderFlow(paths.batteryToHome, colors.battery, isBatteryDischarging)}
            ${hasEV ? this._renderFlow(paths.batteryToEv, colors.battery, isBatteryDischarging && isEvCharging) : ''}
            ${this._renderFlow(paths.batteryToGrid, colors.battery, isBatteryDischarging && isGridExport)}
          </svg>

          <!-- Solar Pill (Top - Roof) -->
          <div class="pill" style="top: 22%; left: 52%;">
            <div class="pill-icon ${isSolarActive ? 'bg-solar' : 'bg-inactive'}">
              <ha-icon icon="mdi:solar-power" class="${isSolarActive ? 'color-solar' : 'color-inactive'}"></ha-icon>
            </div>
            <div class="pill-content">
              <span class="pill-val">${this._formatPower(solarPower)}</span>
              <span class="pill-label">${isSolarActive ? 'Erzeugung' : 'Inaktiv'}</span>
            </div>
          </div>

          <!-- Grid Pill (Left - Power Pole) -->
          <div class="pill" style="top: 32%; left: 18%;">
            <div class="pill-icon ${isGridImport || isGridExport ? 'bg-grid' : 'bg-inactive'}">
              <ha-icon icon="mdi:transmission-tower" class="${isGridImport || isGridExport ? 'color-grid' : 'color-inactive'}"></ha-icon>
            </div>
            <div class="pill-content">
              <span class="pill-val">${this._formatPower(gridPower)}</span>
              <span class="pill-label">${isGridExport ? 'Einspeisung' : isGridImport ? 'Bezug' : 'Neutral'}</span>
            </div>
          </div>

          <!-- Home Pill (Center - House) -->
          <div class="pill" style="top: 54%; left: 55%;">
            <div class="pill-icon bg-home">
              <ha-icon icon="mdi:home-lightning-bolt" class="color-home"></ha-icon>
            </div>
            <div class="pill-content">
              <span class="pill-val">${this._formatPower(homeConsumption)}</span>
              <span class="pill-label">Verbrauch</span>
            </div>
          </div>

          <!-- Battery Pill (Right - Battery Storage) -->
          <div class="pill" style="top: 60%; left: 88%;">
            <div class="pill-icon ${isBatteryCharging || isBatteryDischarging ? 'bg-battery' : 'bg-inactive'}">
              <ha-icon icon="${batteryIcon}" class="${isBatteryCharging || isBatteryDischarging ? 'color-battery' : 'color-inactive'}"></ha-icon>
            </div>
            <div class="pill-content">
              <span class="pill-val">${Math.round(batterySoc)}%</span>
              <span class="pill-label">${isBatteryCharging ? 'Ladung' : isBatteryDischarging ? 'Entladung' : 'Standby'}</span>
            </div>
          </div>

          <!-- EV Pill (Bottom Left - Carport) -->
          ${hasEV ? `
          <div class="pill" style="top: 72%; left: 22%;">
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

        <!-- Bottom Details -->
        ${this._config.show_details ? `
        <div class="details-grid">
          <!-- Erzeugung -->
          <div class="detail-col">
            <div class="detail-header">Solar</div>
            <div class="detail-row">
              <span class="detail-label">Leistung</span>
              <span class="detail-val" style="color: ${colors.solar};">${this._formatPower(solarPower)}</span>
            </div>
            <div class="detail-bar">
              <div class="detail-fill" style="width: ${Math.min(100, (solarPower / 10000) * 100)}%; background: ${colors.solar};"></div>
            </div>
          </div>

          <!-- Netz -->
          <div class="detail-col">
            <div class="detail-header">Netz</div>
            <div class="detail-row">
              <span class="detail-label">${isGridExport ? 'Einspeisung' : 'Bezug'}</span>
              <span class="detail-val" style="color: ${isGridExport ? colors.battery : '#ef4444'};">${this._formatPower(gridPower)}</span>
            </div>
            <div class="detail-bar">
              <div class="detail-fill" style="width: ${Math.min(100, (Math.abs(gridPower) / 10000) * 100)}%; background: ${isGridExport ? colors.battery : '#ef4444'};"></div>
            </div>
          </div>

          <!-- Verbrauch -->
          <div class="detail-col">
            <div class="detail-header">Verbrauch</div>
            <div class="detail-row">
              <span class="detail-label">Aktuell</span>
              <span class="detail-val">${this._formatPower(homeConsumption)}</span>
            </div>
            <div class="detail-bar">
              <div class="detail-fill" style="width: ${Math.min(100, (homeConsumption / 10000) * 100)}%; background: ${colors.home};"></div>
            </div>
          </div>

          <!-- Speicher -->
          <div class="detail-col">
            <div class="detail-header">Speicher</div>
            <div class="detail-row">
              <span class="detail-label">SOC</span>
              <span class="detail-val" style="color: ${colors.battery};">${Math.round(batterySoc)}%</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Leistung</span>
              <span class="detail-val">${this._formatPower(Math.abs(batteryPower))}</span>
            </div>
            <div class="detail-bar">
              <div class="detail-fill" style="width: ${batterySoc}%; background: ${colors.battery};"></div>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }
}

// Register card component
customElements.define('prism-energy', PrismEnergyCard);

// Register with HACS / HA card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "prism-energy",
  name: "Prism Energy",
  preview: true,
  description: "A glassmorphism energy flow card for OpenEMS/Fenecon systems"
});

console.info(
  `%c PRISM-ENERGY %c v1.0.0 `,
  'background: #F59E0B; color: black; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;',
  'background: #1e2024; color: white; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;'
);

