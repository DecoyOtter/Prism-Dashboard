class PrismBambuCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.showCamera = false;
    this.hasRendered = false;
  }

  static getStubConfig() {
    return {
      entity: 'sensor.bambu_lab_printer_print_status',
      name: 'Bambu Lab Printer',
      camera_entity: 'camera.bambu_lab_printer_chamber',
      image: '/local/custom-components/images/prism-bambu-pic.png'
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: 'entity',
          label: 'Print Status entity (sensor.*_print_status)',
          required: true,
          selector: { entity: { domain: 'sensor' } }
        },
        {
          name: 'name',
          label: 'Printer name',
          selector: { text: {} }
        },
        {
          name: 'camera_entity',
          label: 'Camera entity (camera.*_chamber)',
          selector: { entity: { domain: 'camera' } }
        },
        {
          name: 'image',
          label: 'Printer image path',
          selector: { text: {} }
        }
      ]
    };
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity');
    }
    this.config = { ...config };
    if (!this.hasRendered) {
      this.render();
      this.hasRendered = true;
      this.setupListeners();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.hasRendered) {
      this.render();
      this.hasRendered = true;
      this.setupListeners();
    } else {
      this.render();
    }
  }

  connectedCallback() {
    if (this.config && !this.hasRendered) {
      this.render();
      this.hasRendered = true;
      this.setupListeners();
    }
  }

  disconnectedCallback() {
    // Cleanup if needed
  }

  setupListeners() {
    const viewToggle = this.shadowRoot?.querySelector('.view-toggle');
    if (viewToggle) {
      viewToggle.addEventListener('click', () => this.toggleView());
    }

    const pauseBtn = this.shadowRoot?.querySelector('.btn-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this.handlePause());
    }

    const stopBtn = this.shadowRoot?.querySelector('.btn-stop');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.handleStop());
    }

    const speedBtn = this.shadowRoot?.querySelector('.btn-speed');
    if (speedBtn) {
      speedBtn.addEventListener('click', () => this.handleSpeed());
    }
  }

  toggleView() {
    this.showCamera = !this.showCamera;
    this.render();
  }

  handlePause() {
    if (!this._hass || !this.config.entity) return;
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: this.config.entity }
    });
    this.dispatchEvent(event);
  }

  handleStop() {
    if (!this._hass || !this.config.entity) return;
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: this.config.entity }
    });
    this.dispatchEvent(event);
  }

  handleSpeed() {
    if (!this._hass || !this.config.entity) return;
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: this.config.entity }
    });
    this.dispatchEvent(event);
  }

  getPrinterData() {
    if (!this._hass || !this.config) {
      return this.getPreviewData();
    }

    const entityId = this.config.entity;
    const state = this._hass.states[entityId];
    const stateStr = state ? state.state : 'unavailable';
    
    // Extract device name from entity ID
    // Supports: sensor.{device}_print_status, sensor.{device}_print_progress, or any sensor.{device}_*
    let deviceName = '';
    if (entityId.startsWith('sensor.')) {
      const parts = entityId.replace('sensor.', '').split('_');
      // Remove common suffixes to get device name
      const suffixes = ['print_status', 'print_progress', 'nozzle', 'bed', 'chamber', 'cooling', 'aux'];
      // Find where the device name ends (before the first known suffix)
      let deviceParts = [];
      for (let i = 0; i < parts.length; i++) {
        if (suffixes.includes(parts[i])) {
          break;
        }
        deviceParts.push(parts[i]);
      }
      deviceName = deviceParts.length > 0 ? deviceParts.join('_') : parts.slice(0, -1).join('_');
    } else {
      // Fallback: try to extract from any entity
      deviceName = entityId.split('.').pop().split('_').slice(0, -1).join('_');
    }
    
    // If we couldn't extract, use a default pattern
    if (!deviceName || deviceName === '') {
      deviceName = entityId.replace(/^sensor\./, '').replace(/_print_status$/, '').replace(/_print_progress$/, '');
    }
    
    // Find related sensor entities based on device name
    const getSensor = (suffix) => {
      const sensorId = `sensor.${deviceName}_${suffix}`;
      const sensorState = this._hass.states[sensorId];
      return sensorState ? parseFloat(sensorState.state) || 0 : 0;
    };
    
    const getSensorState = (suffix) => {
      const sensorId = `sensor.${deviceName}_${suffix}`;
      const sensorState = this._hass.states[sensorId];
      return sensorState ? sensorState.state : null;
    };
    
    // Print Data (from ha-bambulab documentation)
    const progress = getSensor('print_progress');
    const printTimeLeft = getSensorState('remaining_time') || '0m';
    const printEndTime = getSensorState('end_time') || '--:--';
    
    // Temperatures (from ha-bambulab documentation)
    const nozzleTemp = getSensor('nozzle');
    const targetNozzleTemp = getSensor('target_nozzle');
    const bedTemp = getSensor('bed');
    const targetBedTemp = getSensor('target_bed');
    const chamberTemp = getSensor('chamber') || 0; // Not on A1/A1 Mini
    
    // Fans (from ha-bambulab documentation)
    const partFanSpeed = getSensor('cooling') || 0;
    const auxFanSpeed = getSensor('aux') || 0;
    
    // Layer info (from ha-bambulab documentation)
    const currentLayer = getSensor('current_layer') || 0;
    const totalLayers = getSensor('total_layer_count') || 0;
    
    const name = this.config.name || (state ? state.attributes.friendly_name : null) || 'Bambu Lab Printer';
    
    // Camera
    const cameraEntity = this.config.camera_entity;
    const cameraState = cameraEntity ? this._hass.states[cameraEntity] : null;
    const cameraImage = cameraState?.attributes?.entity_picture || null;
    
    // Image path - try config first, then fallback to default
    let printerImg = this.config.image;
    if (!printerImg) {
      // Try to get from www path first, then fallback
      printerImg = '/local/custom-components/images/prism-bambu-pic.png';
    }

    // AMS Data - from ha-bambulab sensor entities
    // Get active tray index
    const activeTrayIndex = getSensor('ams_active_tray_index') || 0;
    const activeTray = getSensorState('ams_active_tray') || null;
    
    // Get AMS tray data (tray_1, tray_2, tray_3, tray_4)
    let amsData = [];
    for (let i = 1; i <= 4; i++) {
      const trayId = `sensor.${deviceName}_ams_tray_${i}`;
      const trayState = this._hass.states[trayId];
      
      if (trayState && trayState.attributes) {
        const attrs = trayState.attributes;
        const isEmpty = attrs.empty === true || attrs.empty === 'true';
        const isActive = (activeTrayIndex === i) || (activeTray === `Tray ${i}`);
        
        amsData.push({
          id: i,
          type: attrs.type || attrs.name || '',
          color: attrs.color || '#666666',
          remaining: isEmpty ? 0 : (parseFloat(attrs.remaining_filament) || 0),
          active: isActive,
          empty: isEmpty
        });
      } else {
        // Empty slot
        amsData.push({
          id: i,
          type: '',
          color: '#666666',
          remaining: 0,
          active: false,
          empty: true
        });
      }
    }
    
    // If no AMS data found, use preview data
    if (amsData.every(slot => slot.empty)) {
      amsData = [
        { id: 1, type: 'PLA', color: '#FF4444', remaining: 85, active: false },
        { id: 2, type: 'PETG', color: '#4488FF', remaining: 42, active: true },
        { id: 3, type: 'ABS', color: '#111111', remaining: 12, active: false },
        { id: 4, type: 'TPU', color: '#FFFFFF', remaining: 0, active: false, empty: true }
      ];
    }

    // Ensure we have 4 AMS slots
    while (amsData.length < 4) {
      amsData.push({ id: amsData.length + 1, type: '', color: '#666666', remaining: 0, active: false, empty: true });
    }

    return {
      stateStr,
      progress,
      printTimeLeft,
      printEndTime,
      nozzleTemp,
      targetNozzleTemp,
      bedTemp,
      targetBedTemp,
      chamberTemp,
      partFanSpeed,
      auxFanSpeed,
      currentLayer,
      totalLayers,
      name,
      cameraEntity,
      cameraImage,
      printerImg,
      amsData
    };
  }

  getPreviewData() {
    return {
      stateStr: 'printing',
      progress: 45,
      printTimeLeft: '2h 15m',
      printEndTime: '14:30',
      nozzleTemp: 220,
      targetNozzleTemp: 220,
      bedTemp: 60,
      targetBedTemp: 60,
      chamberTemp: 35,
      partFanSpeed: 50,
      auxFanSpeed: 30,
      currentLayer: 12,
      totalLayers: 28,
      name: this.config?.name || 'Bambu Lab Printer',
      cameraEntity: null,
      cameraImage: null,
      printerImg: this.config?.image || '/local/custom-components/images/prism-bambu-pic.png',
      amsData: [
        { id: 1, type: 'PLA', color: '#FF4444', remaining: 85, active: false },
        { id: 2, type: 'PETG', color: '#4488FF', remaining: 42, active: true },
        { id: 3, type: 'ABS', color: '#111111', remaining: 12, active: false },
        { id: 4, type: 'TPU', color: '#FFFFFF', remaining: 0, active: false, empty: true }
      ]
    };
  }

  render() {
    const data = this.getPrinterData();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .card {
            position: relative;
            width: 100%;
            min-height: 600px;
            border-radius: 32px;
            padding: 24px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background-color: rgba(30, 32, 36, 0.8);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            box-shadow: 0 20px 40px -10px rgba(0,0,0,0.6);
            color: white;
            box-sizing: border-box;
            user-select: none;
        }
        .noise {
            position: absolute;
            inset: 0;
            opacity: 0.03;
            pointer-events: none;
            background-image: url('https://grainy-gradients.vercel.app/noise.svg');
            mix-blend-mode: overlay;
        }
        
        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 20;
            margin-bottom: 24px;
        }
        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .printer-icon {
            width: 40px;
            height: 40px;
            min-width: 40px;
            min-height: 40px;
            border-radius: 50%;
            background-color: rgba(0, 174, 66, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #00AE42;
            border: 1px solid rgba(0, 174, 66, 0.2);
            box-shadow: inset 0 0 10px rgba(0, 174, 66, 0.1);
            flex-shrink: 0;
        }
        .printer-icon ha-icon {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .title {
            font-size: 1.125rem;
            font-weight: 700;
            line-height: 1;
            margin: 0;
            color: rgba(255, 255, 255, 0.9);
        }
        .status-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 4px;
        }
        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${data.stateStr === 'printing' ? '#22c55e' : 'rgba(255,255,255,0.2)'};
            animation: ${data.stateStr === 'printing' ? 'pulse 2s infinite' : 'none'};
        }
        .status-text {
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: ${data.stateStr === 'printing' ? '#4ade80' : 'rgba(255,255,255,0.6)'};
        }
        
        /* AMS Grid */
        .ams-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
            z-index: 20;
        }
        .ams-slot {
            position: relative;
            aspect-ratio: 3/4;
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            padding: 12px;
            background-color: rgba(20, 20, 20, 0.8);
            box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            border-top: 1px solid rgba(0, 0, 0, 0.2);
            opacity: 0.6;
            filter: grayscale(0.3);
            transition: all 0.2s;
        }
        .ams-slot.active {
            background-color: #1A1A1A;
            border-bottom: 2px solid #00AE42;
            border-top: none;
            box-shadow: 0 0 15px rgba(0, 174, 66, 0.1);
            opacity: 1;
            filter: none;
            transform: scale(1.02);
            z-index: 10;
        }
        .spool-visual {
            position: relative;
            width: 100%;
            aspect-ratio: 1;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: rgba(0, 0, 0, 0.4);
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
        }
        .filament {
            width: 70%;
            height: 70%;
            border-radius: 50%;
            position: relative;
            overflow: hidden;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
        }
        .spool-center {
            position: absolute;
            width: 20%;
            height: 20%;
            border-radius: 50%;
            background-color: #2a2a2a;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 2px 5px rgba(0,0,0,0.5);
            z-index: 5;
        }
        .remaining-badge {
            position: absolute;
            bottom: -4px;
            background-color: rgba(0, 0, 0, 0.8);
            font-size: 9px;
            font-family: monospace;
            color: white;
            padding: 2px 6px;
            border-radius: 999px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 10;
        }
        .ams-info {
            text-align: center;
            width: 100%;
        }
        .ams-type {
            font-size: 10px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.9);
        }
        
        /* Main Visual */
        .main-visual {
            position: relative;
            flex: 1;
            border-radius: 24px;
            background-color: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.05);
            overflow: hidden;
            margin-bottom: 24px;
            min-height: 300px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .view-toggle {
            position: absolute;
            top: 16px;
            right: 16px;
            z-index: 40;
            width: 32px;
            height: 32px;
            min-width: 32px;
            min-height: 32px;
            border-radius: 50%;
            background-color: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.1);
            cursor: pointer;
            transition: background 0.2s;
            flex-shrink: 0;
        }
        .view-toggle ha-icon {
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .view-toggle:hover {
            background-color: rgba(0, 0, 0, 0.8);
        }
        .printer-img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 0 30px rgba(59,130,246,0.15)) brightness(1.05);
            z-index: 10;
            padding: 32px;
            box-sizing: border-box;
        }
        .camera-feed {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        /* Overlays */
        .overlay-left {
            position: absolute;
            left: 12px;
            top: 12px;
            bottom: 12px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 8px;
            z-index: 20;
        }
        .overlay-right {
            position: absolute;
            right: 12px;
            top: 12px;
            bottom: 12px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 8px;
            z-index: 20;
        }
        .overlay-pill {
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 999px;
            padding: 6px 12px 6px 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .overlay-pill.right {
            flex-direction: row-reverse;
            padding: 6px 8px 6px 12px;
            text-align: right;
        }
        .pill-icon-container {
            width: 24px;
            height: 24px;
            min-width: 24px;
            min-height: 24px;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .pill-icon-container ha-icon {
            width: 14px;
            height: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .pill-content {
            display: flex;
            flex-direction: column;
            line-height: 1;
        }
        .pill-value {
            font-size: 12px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.9);
        }
        .pill-label {
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.4);
        }
        
        /* Bottom */
        .stats-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 8px;
            margin-bottom: 8px;
        }
        .stat-group {
            display: flex;
            flex-direction: column;
        }
        .stat-label {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.4);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 700;
        }
        .stat-val {
            font-size: 1.25rem;
            font-family: monospace;
            color: white;
            font-weight: 700;
        }
        
        .progress-bar-container {
            width: 100%;
            height: 16px;
            background-color: rgba(0, 0, 0, 0.4);
            border-radius: 999px;
            overflow: hidden;
            position: relative;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
            border: 1px solid rgba(255, 255, 255, 0.05);
            margin-bottom: 16px;
        }
        .progress-bar-fill {
            height: 100%;
            width: ${data.progress}%;
            background: linear-gradient(to right, #00AE42, #4ade80);
            position: relative;
            transition: width 0.3s ease;
        }
        .progress-text {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 700;
            color: white;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            pointer-events: none;
        }
        
        .controls {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
        }
        .btn {
            height: 48px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 700;
            font-size: 14px;
        }
        .btn ha-icon {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .btn-secondary {
            background-color: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.6);
        }
        .btn-secondary:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }
        .btn-primary {
            grid-column: span 2;
            background-color: rgba(20, 20, 20, 0.8);
            color: #00AE42;
            gap: 8px;
            box-shadow: inset 2px 2px 5px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            border-top: 1px solid rgba(0, 0, 0, 0.2);
        }
        .btn-primary:hover {
            color: #00c94d;
            background-color: rgba(20, 20, 20, 0.9);
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
      </style>
      
      <div class="card">
        <div class="noise"></div>
        
        <div class="header">
            <div class="header-left">
                <div class="printer-icon">
                    <ha-icon icon="mdi:printer-3d-nozzle"></ha-icon>
                </div>
                <div>
                    <h2 class="title">${data.name}</h2>
                    <div class="status-row">
                        <div class="status-dot"></div>
                        <span class="status-text">${data.stateStr}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="ams-grid">
            ${data.amsData.map(slot => `
                <div class="ams-slot ${slot.active ? 'active' : ''}">
                    <div class="spool-visual">
                        ${!slot.empty ? `
                            <div class="filament" style="background-color: ${slot.color}"></div>
                            <div class="remaining-badge">${slot.remaining}%</div>
                        ` : ''}
                        <div class="spool-center"></div>
                    </div>
                    <div class="ams-info">
                        <div class="ams-type">${slot.empty ? 'Empty' : slot.type}</div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="main-visual">
            ${data.cameraEntity && this.showCamera ? `
                <div class="view-toggle">
                    <ha-icon icon="mdi:image"></ha-icon>
                </div>
                ${data.cameraImage ? `
                    <img src="${data.cameraImage}" class="camera-feed" />
                ` : `
                    <ha-camera-stream
                        .hass=${this._hass}
                        .stateObj=${this._hass?.states[data.cameraEntity]}
                        class="camera-feed"
                    ></ha-camera-stream>
                `}
            ` : `
                <div class="view-toggle">
                    <ha-icon icon="${data.cameraEntity ? 'mdi:video' : 'mdi:image'}"></ha-icon>
                </div>
                <img src="${data.printerImg}" class="printer-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 14px;">
                  <ha-icon icon="mdi:printer-3d" style="width: 64px; height: 64px;"></ha-icon>
                </div>
                
                <div class="overlay-left">
                    <div class="overlay-pill">
                        <div class="pill-icon-container"><ha-icon icon="mdi:fan"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.partFanSpeed}%</span>
                            <span class="pill-label">Part</span>
                        </div>
                    </div>
                    <div class="overlay-pill">
                        <div class="pill-icon-container"><ha-icon icon="mdi:weather-windy"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.auxFanSpeed}%</span>
                            <span class="pill-label">Aux</span>
                        </div>
                    </div>
                </div>
                
                <div class="overlay-right">
                    <div class="overlay-pill right">
                        <div class="pill-icon-container"><ha-icon icon="mdi:thermometer" style="color: #F87171;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.nozzleTemp}°</span>
                            <span class="pill-label">/${data.targetNozzleTemp}°</span>
                        </div>
                    </div>
                    <div class="overlay-pill right">
                        <div class="pill-icon-container"><ha-icon icon="mdi:radiator" style="color: #FB923C;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.bedTemp}°</span>
                            <span class="pill-label">/${data.targetBedTemp}°</span>
                        </div>
                    </div>
                    <div class="overlay-pill right">
                        <div class="pill-icon-container"><ha-icon icon="mdi:thermometer" style="color: #4ade80;"></ha-icon></div>
                        <div class="pill-content">
                            <span class="pill-value">${data.chamberTemp}°</span>
                            <span class="pill-label">Cham</span>
                        </div>
                    </div>
                </div>
            `}
        </div>

        <div class="stats-row">
            <div class="stat-group">
                <span class="stat-label">Time Left</span>
                <span class="stat-val">${data.printTimeLeft}</span>
            </div>
            <div class="stat-group" style="align-items: flex-end;">
                <span class="stat-label">Layer</span>
                <span class="stat-val">${data.currentLayer} <span style="font-size: 0.875rem; opacity: 0.4;">/ ${data.totalLayers}</span></span>
            </div>
        </div>

        <div class="progress-bar-container">
            <div class="progress-bar-fill"></div>
            <div class="progress-text">${data.progress}%</div>
        </div>

        <div class="controls">
            <button class="btn btn-secondary btn-speed">
                <ha-icon icon="mdi:speedometer"></ha-icon>
            </button>
            <button class="btn btn-secondary btn-stop">
                <ha-icon icon="mdi:stop"></ha-icon>
            </button>
            <button class="btn btn-primary btn-pause">
                <ha-icon icon="mdi:pause"></ha-icon>
                Pause Print
            </button>
        </div>

      </div>
    `;

    this.setupListeners();
  }

  getCardSize() {
    return 8;
  }
}

customElements.define('prism-bambu', PrismBambuCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'prism-bambu',
  name: 'Prism Bambu',
  preview: true,
  description: 'Bambu Lab 3D Printer card with AMS support'
});

