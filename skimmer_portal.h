#pragma once
#include <Arduino.h>

// ============================================================================
// AquaSkim USV Mission Control - Offline Web Portal
// Embeddable raw literal string for ESP32 / ESPAsyncWebServer / WebServer
// Zero external CDN dependencies (Self-contained HTML, CSS, JS, SVG)
// ============================================================================

const char index_html[] PROGMEM = R"rawliteral(<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>AquaSkim USV Mission Control</title>
<style>
  :root {
    --bg-main: #060a12;
    --bg-card: #0d1524;
    --bg-card-hover: #131e33;
    --border: #1e2d48;
    --border-glow: rgba(6, 182, 212, 0.4);
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    --cyan: #06b6d4;
    --cyan-glow: rgba(6, 182, 212, 0.35);
    --emerald: #10b981;
    --emerald-glow: rgba(16, 185, 129, 0.35);
    --amber: #f59e0b;
    --rose: #f43f5e;
    --rose-glow: rgba(244, 63, 94, 0.45);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; }

  body {
    background-color: var(--bg-main);
    color: var(--text-primary);
    min-height: 100vh;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    -webkit-font-smoothing: antialiased;
  }

  /* Header */
  header {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px 16px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand svg {
    width: 28px;
    height: 28px;
    fill: none;
    stroke: var(--cyan);
    stroke-width: 2;
  }

  .brand-title {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: #fff;
  }

  .brand-sub {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .header-badges {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pill {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    padding: 4px 10px;
    border-radius: 20px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid transparent;
  }

  .pill-wifi {
    background: rgba(16, 185, 129, 0.12);
    border-color: rgba(16, 185, 129, 0.35);
    color: var(--emerald);
  }

  .pill-wifi.offline {
    background: rgba(244, 63, 94, 0.15);
    border-color: rgba(244, 63, 94, 0.4);
    color: var(--rose);
  }

  .pill-wifi .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--emerald);
    box-shadow: 0 0 8px var(--emerald);
  }

  .pill-wifi.offline .dot {
    background: var(--rose);
    box-shadow: 0 0 8px var(--rose);
  }

  .pill-fsm {
    background: rgba(6, 182, 212, 0.12);
    border-color: rgba(6, 182, 212, 0.4);
    color: var(--cyan);
  }

  /* Grid Layout */
  .grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
  }

  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    position: relative;
    overflow: hidden;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }

  .card-header-icon {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .card-header-icon svg {
    width: 16px;
    height: 16px;
    stroke: var(--cyan);
    fill: none;
    stroke-width: 2;
  }

  .card-val {
    font-size: 26px;
    font-weight: 700;
    color: #fff;
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  .card-val small {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .card-subtext {
    font-size: 11px;
    color: var(--text-muted);
  }

  /* Ultrasonic Alert Warning */
  .sonar-warning {
    border-color: var(--rose) !important;
    background: rgba(244, 63, 94, 0.08) !important;
    box-shadow: 0 0 15px var(--rose-glow) !important;
  }

  .sonar-bar-bg {
    width: 100%;
    height: 8px;
    background: #090e17;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid #1e293b;
    margin-top: 4px;
  }

  .sonar-bar-fill {
    height: 100%;
    width: 50%;
    background: linear-gradient(90deg, var(--rose), var(--amber), var(--emerald));
    transition: width 0.3s ease;
  }

  /* Compass Angle Visualizer */
  .compass-ring {
    width: 54px;
    height: 54px;
    border: 2px dashed var(--border);
    border-radius: 50%;
    position: relative;
    margin: 4px auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .compass-needle {
    width: 2px;
    height: 24px;
    background: var(--cyan);
    position: absolute;
    transform-origin: 50% 100%;
    box-shadow: 0 0 8px var(--cyan);
    transition: transform 0.3s ease-out;
  }

  /* Water Quality Bars */
  .ph-bar-wrap {
    margin-top: 4px;
    width: 100%;
    height: 8px;
    border-radius: 4px;
    background: linear-gradient(90deg, #ef4444 0%, #f59e0b 35%, #10b981 50%, #06b6d4 75%, #8b5cf6 100%);
    position: relative;
  }

  .ph-indicator {
    position: absolute;
    top: -3px;
    width: 4px;
    height: 14px;
    background: #ffffff;
    border-radius: 2px;
    box-shadow: 0 0 6px rgba(0,0,0,0.8);
    transform: translateX(-50%);
    transition: left 0.3s ease;
  }

  /* Stepper Motor Conveyor Card */
  .conveyor-card {
    border-color: rgba(16, 185, 129, 0.3);
  }

  .conveyor-status-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .conveyor-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 6px 12px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .conveyor-badge.active {
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid var(--emerald);
    color: var(--emerald);
    box-shadow: 0 0 12px var(--emerald-glow);
  }

  .conveyor-badge.inactive {
    background: rgba(100, 116, 139, 0.15);
    border: 1px solid #334155;
    color: var(--text-muted);
  }

  .gear-icon {
    width: 22px;
    height: 22px;
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
  }

  .gear-spinning {
    animation: spinGear 2s linear infinite;
  }

  @keyframes spinGear {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .conveyor-track {
    width: 100%;
    height: 24px;
    border-radius: 6px;
    border: 1px solid #1e293b;
    background: #080d16;
    overflow: hidden;
    position: relative;
    display: flex;
    align-items: center;
  }

  .conveyor-belt-anim {
    width: 200%;
    height: 100%;
    background-image: repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(16, 185, 129, 0.3) 14px, rgba(16, 185, 129, 0.3) 22px);
    display: none;
  }

  .conveyor-belt-anim.moving {
    display: block;
    animation: beltMove 1s linear infinite;
  }

  @keyframes beltMove {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50px); }
  }

  .btn-conveyor {
    background: linear-gradient(135deg, #059669, #10b981);
    color: #fff;
    border: 1px solid #34d399;
    padding: 12px 18px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.6px;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.15s ease;
  }

  .btn-conveyor:active {
    transform: scale(0.98);
  }

  .btn-conveyor.btn-off {
    background: #1e293b;
    border-color: #334155;
    color: #94a3b8;
    box-shadow: none;
  }

  /* Controls Section */
  .controls-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  @media (max-width: 640px) {
    .controls-section { grid-template-columns: 1fr; }
  }

  .btn-mode {
    padding: 12px;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.15s ease;
  }

  .btn-mode:active { transform: scale(0.98); }

  .btn-auto {
    background: rgba(6, 182, 212, 0.15);
    border-color: var(--cyan);
    color: var(--cyan);
  }

  .btn-auto:hover {
    background: var(--cyan);
    color: #060a12;
  }

  .btn-estop {
    background: linear-gradient(135deg, #dc2626, #ef4444);
    border-color: #f87171;
    color: #fff;
    box-shadow: 0 0 18px var(--rose-glow);
    font-size: 14px;
  }

  .btn-estop:hover {
    background: #b91c1c;
  }

  /* Differential Thruster D-Pad */
  .dpad-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
  }

  .dpad-row {
    display: flex;
    gap: 8px;
  }

  .btn-dpad {
    width: 62px;
    height: 52px;
    background: #0f1a2e;
    border: 1px solid #1e2e4a;
    border-radius: 8px;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.1s ease;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .btn-dpad svg {
    width: 22px;
    height: 22px;
    stroke: var(--cyan);
    fill: none;
    stroke-width: 2.2;
  }

  .btn-dpad:active {
    background: var(--cyan);
    border-color: #22d3ee;
    transform: scale(0.94);
  }

  .btn-dpad:active svg {
    stroke: #060a12;
  }

  footer {
    text-align: center;
    font-size: 11px;
    color: var(--text-muted);
    padding: 8px;
  }
</style>
</head>
<body>

  <!-- 1. Header -->
  <header>
    <div class="brand">
      <svg viewBox="0 0 24 24"><path d="M2 20a6 6 0 0 0 12 0 6 6 0 0 0 12 0M2 16a6 6 0 0 0 12 0 6 6 0 0 0 12 0M12 4v10M8 8l4-4 4 4"/></svg>
      <div>
        <div class="brand-title">Autonomous Trash-Skimming USV</div>
        <div class="brand-sub">ESP32 Mission Control Console</div>
      </div>
    </div>
    <div class="header-badges">
      <div id="wifiPill" class="pill pill-wifi">
        <span class="dot"></span>
        <span id="wifiText">AP: TrashBoat_AP (192.168.4.1)</span>
      </div>
      <div id="fsmPill" class="pill pill-fsm">
        STATE: <span id="fsmState">IDLE</span>
      </div>
    </div>
  </header>

  <!-- 2. Telemetry Grid -->
  <div class="grid-container">
    <!-- FOMO Vision Card -->
    <div class="card">
      <div class="card-header">
        <div class="card-header-icon">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
          FOMO Vision Lock
        </div>
        <span id="fomoStatusBadge" style="color:var(--text-muted)">SEARCHING</span>
      </div>
      <div class="card-val" id="fomoTargetVal">NONE</div>
      <div class="card-subtext" id="fomoSubtext">Edge Impulse Centroid (96x96 Grid)</div>
    </div>

    <!-- Ultrasonic Sonar Card -->
    <div class="card" id="sonarCard">
      <div class="card-header">
        <div class="card-header-icon">
          <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 1 10 10c0 4.42-2.87 8.17-6.84 9.5M12 6a6 6 0 0 1 6 6c0 2.22-1.21 4.15-3 5.19M12 10a2 2 0 0 1 2 2"/></svg>
          Bow Ultrasonic Distance
        </div>
        <span id="sonarAlertTag" style="font-size:10px;color:var(--emerald)">CLEAR</span>
      </div>
      <div class="card-val"><span id="sonarVal">--</span> <small>cm</small></div>
      <div class="sonar-bar-bg">
        <div id="sonarBar" class="sonar-bar-fill"></div>
      </div>
      <div class="card-subtext">Obstacle threshold: 35.0 cm</div>
    </div>

    <!-- MPU6050 Heading Card -->
    <div class="card">
      <div class="card-header">
        <div class="card-header-icon">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
          MPU6050 Heading
        </div>
        <span>YAW (Z-AXIS)</span>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="card-val"><span id="yawVal">0.0</span> <small>deg</small></div>
        <div class="compass-ring">
          <div id="compassNeedle" class="compass-needle"></div>
        </div>
      </div>
      <div class="card-subtext">Real-time IMU Drift Tracking</div>
    </div>

    <!-- Water Quality: pH Level -->
    <div class="card">
      <div class="card-header">
        <div class="card-header-icon">
          <svg viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
          Water pH Level
        </div>
        <span id="phStatus" style="color:var(--emerald)">OPTIMAL</span>
      </div>
      <div class="card-val"><span id="phVal">7.00</span> <small>pH</small></div>
      <div class="ph-bar-wrap">
        <div id="phIndicator" class="ph-indicator" style="left:50%"></div>
      </div>
      <div class="card-subtext" style="display:flex;justify-content:space-between">
        <span>0 (Acidic)</span><span>7.0</span><span>14 (Alkaline)</span>
      </div>
    </div>

    <!-- Water Quality: Turbidity -->
    <div class="card">
      <div class="card-header">
        <div class="card-header-icon">
          <svg viewBox="0 0 24 24"><path d="M2 12h20M2 6h20M2 18h20"/></svg>
          Turbidity Index
        </div>
        <span>WATER CLARITY</span>
      </div>
      <div class="card-val"><span id="turbVal">0</span> <small>NTU</small></div>
      <div class="card-subtext" id="turbDesc">Clear Surface Harbor Water</div>
    </div>
  </div>

  <!-- 3. Dedicated Live Stepper Motor Conveyor Card -->
  <div class="card conveyor-card">
    <div class="card-header">
      <div class="card-header-icon">
        <svg class="gear-icon" id="gearSvg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        NEMA 17 Stepper Conveyor Feed
      </div>
      <span id="conveyorBadge" class="conveyor-badge inactive">COILS DE-ENERGIZED (COOLING)</span>
    </div>

    <!-- Animated conveyor belt graphic -->
    <div class="conveyor-track">
      <div id="conveyorBelt" class="conveyor-belt-anim"></div>
    </div>

    <!-- Toggle button trigger -->
    <button id="btnConveyorToggle" class="btn-conveyor btn-off" onclick="toggleConveyor()">
      <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/></svg>
      <span id="conveyorBtnText">CONVEYOR BELT STEPPER: OFF</span>
    </button>
  </div>

  <!-- 4. Navigation & Thruster Control Pad -->
  <div class="controls-section">
    <!-- Mode Actions -->
    <div class="card" style="justify-content:center;gap:12px">
      <div class="card-header">Mission Command Overrides</div>
      <button class="btn-mode btn-auto" onclick="sendCmd('auto')">
        <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        ENGAGE AUTO MISSION
      </button>
      <button class="btn-mode btn-estop" onclick="sendCmd('stop')">
        <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
        EMERGENCY STOP (ESTOP)
      </button>
    </div>

    <!-- Manual D-Pad -->
    <div class="card">
      <div class="card-header">
        <span>Manual Thruster D-Pad</span>
        <small style="color:var(--text-muted)">Differential Steering</small>
      </div>
      <div class="dpad-container">
        <!-- Forward -->
        <button class="btn-dpad" onclick="sendCmd('fwd')" title="Forward">
          <svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
        <!-- Left / Reverse / Right -->
        <div class="dpad-row">
          <button class="btn-dpad" onclick="sendCmd('left')" title="Turn Left">
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="btn-dpad" onclick="sendCmd('rev')" title="Reverse">
            <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button class="btn-dpad" onclick="sendCmd('right')" title="Turn Right">
            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    </div>
  </div>

  <footer>
    AquaSkim Autonomous USV &bull; ESP32 Flight Controller &bull; Edge Impulse FOMO
  </footer>

<script>
  let isConveyorActive = false;
  let consecutiveErrors = 0;

  // Send command to ESP32 web server
  function sendCmd(cmd) {
    fetch('/cmd?c=' + encodeURIComponent(cmd))
      .then(r => r.text())
      .then(txt => console.log('CMD ACK:', txt))
      .catch(err => console.warn('CMD ERR:', err));
  }

  // Toggle Conveyor Stepper
  function toggleConveyor() {
    sendCmd('conv');
  }

  // Poll /status endpoint every 500ms
  function pollStatus() {
    fetch('/status')
      .then(response => {
        if (!response.ok) throw new Error('Network error');
        return response.json();
      })
      .then(data => {
        consecutiveErrors = 0;
        updateUI(data);
      })
      .catch(() => {
        consecutiveErrors++;
        if (consecutiveErrors >= 3) {
          const pill = document.getElementById('wifiPill');
          pill.className = 'pill pill-wifi offline';
          document.getElementById('wifiText').innerText = 'OFFLINE (LINK LOST)';
        }
      });
  }

  function updateUI(data) {
    // 1. Wifi Pill Recovery
    const pill = document.getElementById('wifiPill');
    pill.className = 'pill pill-wifi';
    document.getElementById('wifiText').innerText = 'AP: TrashBoat_AP (192.168.4.1)';

    // 2. FSM State Badge
    const state = (data.state || 'IDLE').toUpperCase();
    document.getElementById('fsmState').innerText = state;

    // 3. Vision Lock Target
    const target = data.target || 'NO';
    const fomoBadge = document.getElementById('fomoStatusBadge');
    const fomoVal = document.getElementById('fomoTargetVal');
    if (target.includes('YES') || target.includes('LOCKED')) {
      fomoBadge.innerText = 'LOCKED';
      fomoBadge.style.color = 'var(--emerald)';
      fomoVal.innerText = target;
      fomoVal.style.color = 'var(--cyan)';
    } else {
      fomoBadge.innerText = 'SEARCHING';
      fomoBadge.style.color = 'var(--text-muted)';
      fomoVal.innerText = 'NONE';
      fomoVal.style.color = 'var(--text-muted)';
    }

    // 4. Ultrasonic Sonar
    const dist = parseFloat(data.dist) || 0;
    document.getElementById('sonarVal').innerText = dist.toFixed(1);
    const sonarCard = document.getElementById('sonarCard');
    const sonarBar = document.getElementById('sonarBar');
    const sonarTag = document.getElementById('sonarAlertTag');

    const pct = Math.max(5, Math.min(100, (dist / 200) * 100));
    sonarBar.style.width = pct + '%';

    if (dist < 35.0) {
      sonarCard.classList.add('sonar-warning');
      sonarTag.innerText = 'OBSTACLE DETECTED!';
      sonarTag.style.color = 'var(--rose)';
    } else {
      sonarCard.classList.remove('sonar-warning');
      sonarTag.innerText = 'CLEAR';
      sonarTag.style.color = 'var(--emerald)';
    }

    // 5. MPU6050 Yaw / Heading
    const yaw = parseFloat(data.yaw) || 0;
    document.getElementById('yawVal').innerText = yaw.toFixed(1);
    document.getElementById('compassNeedle').style.transform = `rotate(${yaw}deg)`;

    // 6. Water Quality - pH
    const ph = parseFloat(data.ph) || 7.0;
    document.getElementById('phVal').innerText = ph.toFixed(2);
    const phPct = Math.max(0, Math.min(100, (ph / 14) * 100));
    document.getElementById('phIndicator').style.left = phPct + '%';
    const phStatus = document.getElementById('phStatus');
    if (ph >= 6.5 && ph <= 8.5) {
      phStatus.innerText = 'OPTIMAL';
      phStatus.style.color = 'var(--emerald)';
    } else {
      phStatus.innerText = 'ALERT';
      phStatus.style.color = 'var(--amber)';
    }

    // 7. Water Quality - Turbidity
    const turb = parseInt(data.turb) || 0;
    document.getElementById('turbVal').innerText = turb;
    const turbDesc = document.getElementById('turbDesc');
    if (turb < 25) turbDesc.innerText = 'Very Clear Harbor Water';
    else if (turb < 100) turbDesc.innerText = 'Moderate Suspended Solids';
    else turbDesc.innerText = 'Heavy Organic / Debris Runoff';

    // 8. Conveyor Stepper State
    isConveyorActive = !!data.conveyor;
    const conveyorBadge = document.getElementById('conveyorBadge');
    const conveyorBelt = document.getElementById('conveyorBelt');
    const gear = document.getElementById('gearSvg');
    const btnConveyor = document.getElementById('btnConveyorToggle');
    const btnText = document.getElementById('conveyorBtnText');

    if (isConveyorActive) {
      conveyorBadge.className = 'conveyor-badge active';
      conveyorBadge.innerText = 'STEPPER ACTIVE (ENERGIZED)';
      conveyorBelt.classList.add('moving');
      gear.classList.add('gear-spinning');
      btnConveyor.className = 'btn-conveyor';
      btnText.innerText = 'CONVEYOR BELT STEPPER: ON';
    } else {
      conveyorBadge.className = 'conveyor-badge inactive';
      conveyorBadge.innerText = 'COILS DE-ENERGIZED (COOLING)';
      conveyorBelt.classList.remove('moving');
      gear.classList.remove('gear-spinning');
      btnConveyor.className = 'btn-conveyor btn-off';
      btnText.innerText = 'CONVEYOR BELT STEPPER: OFF';
    }
  }

  // Start polling
  setInterval(pollStatus, 500);
  pollStatus();
</script>
</body>
</html>)rawliteral";
