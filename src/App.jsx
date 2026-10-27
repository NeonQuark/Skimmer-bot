import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wifi,
  WifiOff,
  Power,
  Sliders,
  Compass as CompassIcon,
  Crosshair,
  Activity,
  AlertTriangle,
  RotateCw,
  Gauge,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Radio,
  Terminal,
  Cpu,
  Layers,
  CheckCircle2,
  Anchor,
  HelpCircle,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

export default function App() {
  // --- Connection & Simulation State ---
  const [espIp, setEspIp] = useState('192.168.4.1:81');
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(12);
  const [simulationMode, setSimulationMode] = useState(true);
  const [showTuningDrawer, setShowTuningDrawer] = useState(false);
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [logs, setLogs] = useState([
    { ts: new Date().toLocaleTimeString(), text: 'System ready. Flight controller interface standby.' },
    { ts: new Date().toLocaleTimeString(), text: 'Simulation generator running at 10 Hz.' }
  ]);

  // --- Real-Time Telemetry Data ---
  const [telemetry, setTelemetry] = useState({
    state: 'SEARCH',
    heading: 14.5,
    targetHeading: 0.0,
    ultrasonicCm: 124,
    fomo: {
      detected: true,
      x: 52,
      y: 40
    },
    motors: {
      leftPwm: 140,
      rightPwm: 135,
      conveyorOn: true
    }
  });

  // --- Tuning Parameters ---
  const [tuningParams, setTuningParams] = useState({
    baseSpeed: 145,
    trackGain: 1.8,
    gyroKp: 3.0,
    avoidDist: 35
  });

  // Mode: AUTO vs MANUAL
  const [controlMode, setControlMode] = useState('AUTO');

  const wsRef = useRef(null);

  // Key states for WASD
  const [activeKeys, setActiveKeys] = useState({
    w: false,
    a: false,
    s: false,
    d: false
  });

  const addLog = useCallback((text) => {
    setLogs((prev) => [
      { ts: new Date().toLocaleTimeString(), text },
      ...prev.slice(0, 49)
    ]);
  }, []);

  // --- WebSocket Communication ---
  const sendCommand = useCallback((payload) => {
    const jsonStr = JSON.stringify(payload);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(jsonStr);
      addLog(`TX: ${jsonStr}`);
    } else {
      addLog(`[Local] TX: ${jsonStr}`);
    }
  }, [addLog]);

  const handleConnect = () => {
    if (isConnected) {
      if (wsRef.current) wsRef.current.close();
      setIsConnected(false);
      addLog('Disconnected from ESP32.');
      return;
    }

    try {
      const url = espIp.startsWith('ws://') ? espIp : `ws://${espIp}`;
      addLog(`Connecting to ${url}...`);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        addLog(`WebSocket connection verified.`);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setTelemetry((prev) => ({ ...prev, ...data }));
          if (data.state) {
            setControlMode(data.state === 'MANUAL' ? 'MANUAL' : 'AUTO');
          }
        } catch (err) {
          console.error('Invalid telemetry frame:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        addLog('Connection closed.');
      };

      ws.onerror = () => {
        addLog(`Connection error on ${url}`);
      };
    } catch (e) {
      addLog(`Connection exception: ${e.message}`);
    }
  };

  // --- Synthetic Telemetry Generator (10 Hz) ---
  useEffect(() => {
    if (!simulationMode || isConnected) return;

    let targetAngle = 0;
    let simHeading = 12.0;
    let fomoDetected = true;
    let fomoX = 48;
    let fomoY = 35;
    let simState = 'SEARCH';
    let ultraDist = 120;
    let stepCount = 0;

    const interval = setInterval(() => {
      stepCount++;

      if (controlMode === 'MANUAL') {
        simState = 'MANUAL';
      } else {
        if (ultraDist < 35) {
          simState = 'AVOID';
          targetAngle = (targetAngle + 45) % 360;
        } else if (fomoDetected && fomoY > 65) {
          simState = 'COLLECT';
        } else if (fomoDetected) {
          simState = 'TRACK';
        } else {
          simState = 'SEARCH';
        }
      }

      const headingDiff = targetAngle - simHeading;
      simHeading += headingDiff * 0.08 + Math.sin(stepCount * 0.2) * 0.35;
      if (simHeading >= 360) simHeading -= 360;
      if (simHeading < 0) simHeading += 360;

      if (simState === 'TRACK' || simState === 'COLLECT') {
        fomoY += 0.45;
        fomoX += (48 - fomoX) * 0.06 + Math.sin(stepCount * 0.3) * 0.7;
        if (fomoY > 88) {
          fomoDetected = Math.random() > 0.15;
          fomoX = Math.floor(25 + Math.random() * 46);
          fomoY = 18;
        }
      } else if (simState === 'SEARCH') {
        fomoX = (fomoX + 1.2) % 96;
        fomoY = 30 + Math.sin(stepCount * 0.1) * 12;
        if (Math.random() < 0.05) fomoDetected = true;
      }

      if (simState === 'AVOID') {
        ultraDist = Math.min(130, ultraDist + 4.5);
      } else {
        ultraDist = Math.max(18, 115 + Math.sin(stepCount * 0.08) * 45 + (Math.random() * 3 - 1.5));
      }

      let leftPwm = 0;
      let rightPwm = 0;
      let conveyor = true;

      if (simState === 'MANUAL') {
        leftPwm = telemetry.motors.leftPwm;
        rightPwm = telemetry.motors.rightPwm;
        conveyor = telemetry.motors.conveyorOn;
      } else if (simState === 'SEARCH') {
        leftPwm = 130;
        rightPwm = -110;
        conveyor = false;
      } else if (simState === 'TRACK') {
        const errorX = fomoX - 48;
        const turnAdjust = Math.round(errorX * tuningParams.trackGain);
        leftPwm = Math.min(255, Math.max(-255, tuningParams.baseSpeed + turnAdjust));
        rightPwm = Math.min(255, Math.max(-255, tuningParams.baseSpeed - turnAdjust));
        conveyor = true;
      } else if (simState === 'COLLECT') {
        leftPwm = 110;
        rightPwm = 110;
        conveyor = true;
      } else if (simState === 'AVOID') {
        leftPwm = -160;
        rightPwm = 160;
        conveyor = false;
      }

      setTelemetry({
        state: simState,
        heading: parseFloat(simHeading.toFixed(1)),
        targetHeading: parseFloat(targetAngle.toFixed(1)),
        ultrasonicCm: Math.round(ultraDist),
        fomo: {
          detected: fomoDetected,
          x: Math.round(Math.max(2, Math.min(94, fomoX))),
          y: Math.round(Math.max(2, Math.min(94, fomoY)))
        },
        motors: {
          leftPwm,
          rightPwm,
          conveyorOn: conveyor
        }
      });

      setLatency(Math.floor(10 + Math.random() * 5));
    }, 100);

    return () => clearInterval(interval);
  }, [simulationMode, isConnected, controlMode, tuningParams, telemetry.motors]);

  // --- Keyboard Control (WASD) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (controlMode !== 'MANUAL') return;
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
        e.preventDefault();
      }

      const newKeys = { ...activeKeys };
      if (key === 'w' || key === 'arrowup') newKeys.w = true;
      if (key === 's' || key === 'arrowdown') newKeys.s = true;
      if (key === 'a' || key === 'arrowleft') newKeys.a = true;
      if (key === 'd' || key === 'arrowright') newKeys.d = true;

      setActiveKeys(newKeys);
      calculateManualDrive(newKeys);
    };

    const handleKeyUp = (e) => {
      if (controlMode !== 'MANUAL') return;
      const key = e.key.toLowerCase();
      const newKeys = { ...activeKeys };
      if (key === 'w' || key === 'arrowup') newKeys.w = false;
      if (key === 's' || key === 'arrowdown') newKeys.s = false;
      if (key === 'a' || key === 'arrowleft') newKeys.a = false;
      if (key === 'd' || key === 'arrowright') newKeys.d = false;

      setActiveKeys(newKeys);
      calculateManualDrive(newKeys);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [controlMode, activeKeys]);

  const calculateManualDrive = (keys) => {
    let left = 0;
    let right = 0;
    const speed = tuningParams.baseSpeed || 180;

    if (keys.w && !keys.s) {
      left = speed;
      right = speed;
      if (keys.a) left -= Math.round(speed * 0.5);
      if (keys.d) right -= Math.round(speed * 0.5);
    } else if (keys.s && !keys.w) {
      left = -speed;
      right = -speed;
      if (keys.a) left += Math.round(speed * 0.5);
      if (keys.d) right += Math.round(speed * 0.5);
    } else if (keys.a && !keys.d) {
      left = -Math.round(speed * 0.85);
      right = Math.round(speed * 0.85);
    } else if (keys.d && !keys.a) {
      left = Math.round(speed * 0.85);
      right = -Math.round(speed * 0.85);
    }

    setTelemetry((prev) => ({
      ...prev,
      motors: { ...prev.motors, leftPwm: left, rightPwm: right }
    }));

    sendCommand({ cmd: 'DRIVE', left, right });
  };

  const handleToggleMode = (newMode) => {
    setControlMode(newMode);
    sendCommand({ cmd: 'SET_MODE', mode: newMode });
    addLog(`Operating mode: ${newMode}`);
  };

  const handleToggleConveyor = () => {
    const newState = !telemetry.motors.conveyorOn;
    setTelemetry((prev) => ({
      ...prev,
      motors: { ...prev.motors, conveyorOn: newState }
    }));
    sendCommand({ cmd: 'CONVEYOR', enable: newState });
    addLog(`Conveyor state: ${newState ? 'ENABLED' : 'DISABLED'}`);
  };

  const handleEmergencyStop = () => {
    setTelemetry((prev) => ({
      ...prev,
      state: 'MANUAL',
      motors: { leftPwm: 0, rightPwm: 0, conveyorOn: false }
    }));
    setControlMode('MANUAL');
    sendCommand({ cmd: 'ESTOP' });
    addLog('EMERGENCY STOP EXECUTED - Thrusters & Conveyor halted.');
  };

  const handlePushTuning = (newParams) => {
    setTuningParams(newParams);
    sendCommand({ cmd: 'TUNE', ...newParams });
    addLog(`PID updated: Base=${newParams.baseSpeed}, Gain=${newParams.trackGain}, Kp=${newParams.gyroKp}, Dist=${newParams.avoidDist}cm`);
  };

  // State display config
  const getStateConfig = (state) => {
    switch (state) {
      case 'SEARCH':
        return { label: 'AUTONOMOUS SEARCH', color: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-950/20' };
      case 'TRACK':
        return { label: 'TARGET TRACKING', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-950/20' };
      case 'COLLECT':
        return { label: 'INTAKE ENGAGED', color: 'text-teal-400', border: 'border-teal-500/30', bg: 'bg-teal-950/20' };
      case 'AVOID':
        return { label: 'COLLISION AVOIDANCE', color: 'text-rose-400', border: 'border-rose-500/40', bg: 'bg-rose-950/30' };
      case 'MANUAL':
        return { label: 'MANUAL OVERRIDE', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-950/20' };
      default:
        return { label: 'STANDBY', color: 'text-slate-400', border: 'border-slate-700', bg: 'bg-slate-900/40' };
    }
  };

  const stateCfg = getStateConfig(telemetry.state);

  let headingError = telemetry.heading - telemetry.targetHeading;
  if (headingError > 180) headingError -= 360;
  if (headingError < -180) headingError += 360;

  const isObstacleWarning = telemetry.ultrasonicCm < tuningParams.avoidDist;

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-200 flex flex-col font-sans">
      {/* ---------------- APP HEADER ---------------- */}
      <header className="border-b border-slate-800/80 bg-[#0c121e]/90 backdrop-blur sticky top-0 z-40 px-5 py-2.5">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand & System Identification */}
          <div className="flex items-center space-x-3.5">
            <div className="flex items-center justify-center w-8 h-8 rounded border border-cyan-800/60 bg-cyan-950/40 text-cyan-400">
              <Anchor className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold tracking-wide text-slate-100 font-mono">
                  AQUASKIM <span className="text-cyan-400 font-bold">GCS</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800/60 text-slate-300">
                  ESP32 DEVKIT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Marine Robotics Autonomy Platform &bull; v2.4.0
              </p>
            </div>
          </div>

          {/* Connection Controls & Link Metric */}
          <div className="flex items-center space-x-3">
            {/* IP Address Field */}
            <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono">
              <span className="text-slate-500 mr-1.5 select-none">ws://</span>
              <input
                type="text"
                value={espIp}
                onChange={(e) => setEspIp(e.target.value)}
                placeholder="192.168.4.1:81"
                className="bg-transparent text-slate-200 outline-none w-36 text-xs font-mono focus:text-cyan-300"
              />
              <button
                onClick={handleConnect}
                className={`ml-2 px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  isConnected
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900'
                    : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800 hover:bg-cyan-900'
                }`}
              >
                {isConnected ? 'Disconnect' : 'Connect'}
              </button>
            </div>

            {/* Live Link Badge */}
            <div className="flex items-center space-x-2 px-2.5 py-1 rounded border border-slate-800 bg-slate-900/60 text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400' : simulationMode ? 'bg-amber-400' : 'bg-slate-500'
                }`}
              />
              <span className="text-slate-300">
                {isConnected ? 'LIVE LINK' : simulationMode ? 'SIMULATED' : 'DISCONNECTED'}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">{latency} ms</span>
            </div>

            {/* Simulation Toggle */}
            <div className="flex items-center space-x-2 border border-slate-800 bg-slate-900/60 px-2.5 py-1 rounded text-xs font-mono">
              <span className="text-slate-400 text-[11px]">Simulation</span>
              <button
                onClick={() => setSimulationMode(!simulationMode)}
                className={`w-7 h-3.5 rounded-full transition-colors relative ${
                  simulationMode ? 'bg-cyan-700' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    simulationMode ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* PID Tuner Toggle */}
            <button
              onClick={() => setShowTuningDrawer(!showTuningDrawer)}
              className={`p-1.5 rounded border text-xs font-mono flex items-center gap-1.5 transition-colors ${
                showTuningDrawer
                  ? 'border-cyan-500 text-cyan-300 bg-cyan-950/40'
                  : 'border-slate-800 text-slate-400 bg-slate-900/60 hover:text-slate-200'
              }`}
              title="Parameter Configuration"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">Parameters</span>
            </button>

            {/* E-Stop Trigger */}
            <button
              onClick={handleEmergencyStop}
              className="px-3 py-1 rounded text-xs font-mono font-bold tracking-wider bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white border border-rose-400 transition-colors flex items-center space-x-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>E-STOP</span>
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- MAIN WORKSPACE ---------------- */}
      <main className="max-w-[1600px] w-full mx-auto p-4 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ================= COLUMN 1: SENSOR & VISION MATRIX (Cols 1-5) ================= */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          {/* FOMO Visual Matrix */}
          <div className="bg-[#0f1523] rounded-lg border border-slate-800 p-4 flex flex-col shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center space-x-2">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-semibold tracking-wider font-mono text-slate-200 uppercase">
                  Optical Centroid Viewport (96 &times; 96)
                </h2>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                  FOV: 68&deg;
                </span>
                <span
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                    telemetry.fomo.detected
                      ? 'border-emerald-600/40 bg-emerald-950/40 text-emerald-400'
                      : 'border-slate-800 bg-slate-900 text-slate-500'
                  }`}
                >
                  {telemetry.fomo.detected ? 'TARGET ACQUIRED' : 'SEARCHING'}
                </span>
              </div>
            </div>

            {/* Coordinate Frame */}
            <div className="relative w-full aspect-square max-w-[380px] mx-auto bg-[#070b12] rounded border border-slate-800/80 overflow-hidden flex items-center justify-center">
              <svg viewBox="0 0 96 96" className="w-full h-full select-none">
                <defs>
                  <pattern id="subtleGrid" width="8" height="8" patternUnits="userSpaceOnUse">
                    <path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(30, 41, 59, 0.4)" strokeWidth="0.5" />
                  </pattern>
                </defs>

                {/* Base Grid */}
                <rect width="96" height="96" fill="#070b12" />
                <rect width="96" height="96" fill="url(#subtleGrid)" />

                {/* Deadband Corridor (X = 38 to 58) */}
                <rect
                  x="38"
                  y="0"
                  width="20"
                  height="96"
                  fill="rgba(6, 182, 212, 0.05)"
                  stroke="rgba(6, 182, 212, 0.25)"
                  strokeDasharray="2,2"
                  strokeWidth="0.5"
                />
                <text x="48" y="8" fill="rgba(6, 182, 212, 0.5)" fontSize="3.2" textAnchor="middle" fontFamily="monospace">
                  CORRIDOR (X 38-58)
                </text>

                {/* Trigger Line (Y = 68) */}
                <line
                  x1="0"
                  y1="68"
                  x2="96"
                  y2="68"
                  stroke="rgba(245, 158, 11, 0.6)"
                  strokeWidth="0.75"
                  strokeDasharray="2,2"
                />
                <text x="3" y="66" fill="rgba(245, 158, 11, 0.7)" fontSize="3" fontFamily="monospace">
                  COLLECTION LINE (Y=68)
                </text>

                {/* Boat Bow Contour */}
                <polygon
                  points="26,96 38,84 58,84 70,96"
                  fill="rgba(30, 41, 59, 0.6)"
                  stroke="rgba(71, 85, 105, 0.8)"
                  strokeWidth="0.6"
                />
                <text x="48" y="92" fill="rgba(148, 163, 184, 0.7)" fontSize="3" textAnchor="middle" fontFamily="monospace">
                  CONVEYOR INTAKE
                </text>

                {/* Target Plastic Centroid */}
                {telemetry.fomo.detected && (
                  <g className="transition-all duration-100 ease-out">
                    <rect
                      x={telemetry.fomo.x - 3.5}
                      y={telemetry.fomo.y - 3.5}
                      width="7"
                      height="7"
                      fill="none"
                      stroke={telemetry.fomo.y >= 68 ? '#10b981' : '#06b6d4'}
                      strokeWidth="0.75"
                      className="target-locked-anim"
                    />
                    <circle cx={telemetry.fomo.x} cy={telemetry.fomo.y} r="0.8" fill="#ef4444" />
                    <line
                      x1={telemetry.fomo.x - 5}
                      y1={telemetry.fomo.y}
                      x2={telemetry.fomo.x + 5}
                      y2={telemetry.fomo.y}
                      stroke="rgba(239, 68, 68, 0.7)"
                      strokeWidth="0.4"
                    />
                    <line
                      x1={telemetry.fomo.x}
                      y1={telemetry.fomo.y - 5}
                      x2={telemetry.fomo.x}
                      y2={telemetry.fomo.y + 5}
                      stroke="rgba(239, 68, 68, 0.7)"
                      strokeWidth="0.4"
                    />
                    <text
                      x={Math.min(74, telemetry.fomo.x + 5)}
                      y={Math.max(6, telemetry.fomo.y - 2)}
                      fill="#cbd5e1"
                      fontSize="3"
                      fontFamily="monospace"
                    >
                      [{telemetry.fomo.x}, {telemetry.fomo.y}]
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* Target Metric Readouts */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs font-mono">
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block uppercase">Centroid</span>
                <span className="text-slate-200 font-semibold">
                  {telemetry.fomo.detected ? `X:${telemetry.fomo.x}  Y:${telemetry.fomo.y}` : '---'}
                </span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block uppercase">Alignment</span>
                <span
                  className={`font-semibold ${
                    !telemetry.fomo.detected
                      ? 'text-slate-500'
                      : telemetry.fomo.x >= 38 && telemetry.fomo.x <= 58
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {!telemetry.fomo.detected
                    ? '---'
                    : telemetry.fomo.x >= 38 && telemetry.fomo.x <= 58
                    ? 'CENTERED'
                    : telemetry.fomo.x < 38
                    ? `PORT OFFSET (-${38 - telemetry.fomo.x})`
                    : `STBD OFFSET (+${telemetry.fomo.x - 58})`}
                </span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block uppercase">Distance to Intake</span>
                <span className="text-slate-200 font-semibold">
                  {!telemetry.fomo.detected ? '---' : `${Math.max(0, 68 - telemetry.fomo.y)} px`}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Hardware & Rate Card */}
          <div className="bg-[#0f1523] rounded-lg border border-slate-800 p-3 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2 text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-slate-500" />
              <span>Controller: ESP32 DevKit</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-400">
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              <span>Telemetry: 10.0 Hz</span>
            </div>
            <button
              onClick={() => setShowLogDrawer(!showLogDrawer)}
              className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 text-[11px]"
            >
              <Terminal className="w-3 h-3" />
              <span>{showLogDrawer ? 'Hide Logs' : 'Show Logs'}</span>
            </button>
          </div>
        </section>

        {/* ================= COLUMN 2: NAVIGATION & SENSOR HUD (Cols 6-8) ================= */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          {/* Mission FSM State Banner */}
          <div className="bg-[#0f1523] rounded-lg border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-500" />
                Mission State Machine
              </span>
              {/* Mode Toggle */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 text-[11px] font-mono">
                <button
                  onClick={() => handleToggleMode('AUTO')}
                  className={`px-2.5 py-0.5 rounded transition-colors ${
                    controlMode === 'AUTO'
                      ? 'bg-slate-800 text-cyan-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  AUTO
                </button>
                <button
                  onClick={() => handleToggleMode('MANUAL')}
                  className={`px-2.5 py-0.5 rounded transition-colors ${
                    controlMode === 'MANUAL'
                      ? 'bg-slate-800 text-amber-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  MANUAL
                </button>
              </div>
            </div>

            <div className={`p-3 rounded border ${stateCfg.border} ${stateCfg.bg} flex items-center justify-between`}>
              <div>
                <span className={`text-xs font-mono font-bold tracking-wider ${stateCfg.color}`}>
                  {stateCfg.label}
                </span>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {telemetry.state === 'SEARCH' && 'Autonomous sweeping for marine debris'}
                  {telemetry.state === 'TRACK' && 'Aligning heading with vision centroid'}
                  {telemetry.state === 'COLLECT' && 'Conveyor running & advancing forward'}
                  {telemetry.state === 'AVOID' && 'Obstacle detected within avoidance radius'}
                  {telemetry.state === 'MANUAL' && 'Direct thruster control via operator inputs'}
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                STATE_{telemetry.state}
              </span>
            </div>
          </div>

          {/* Heading Compass (MPU6050) */}
          <div className="bg-[#0f1523] rounded-lg border border-slate-800 p-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center space-x-2">
                <CompassIcon className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-semibold tracking-wider font-mono text-slate-200 uppercase">
                  Heading Gyro (MPU6050)
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Target: {telemetry.targetHeading.toFixed(1)}&deg;
              </span>
            </div>

            <div className="flex flex-col items-center py-2">
              <div className="relative w-40 h-40 rounded-full border border-slate-800 bg-[#070b12] flex items-center justify-center">
                <span className="absolute top-1 text-[10px] font-mono text-slate-400">N</span>
                <span className="absolute bottom-1 text-[10px] font-mono text-slate-600">S</span>
                <span className="absolute left-2 text-[10px] font-mono text-slate-600">W</span>
                <span className="absolute right-2 text-[10px] font-mono text-slate-600">E</span>

                {/* Target Heading Marker */}
                <div
                  className="absolute w-full h-full flex items-center justify-center transition-transform duration-200"
                  style={{ transform: `rotate(${telemetry.targetHeading}deg)` }}
                >
                  <div className="absolute top-2 w-1.5 h-1.5 rounded-full bg-cyan-400" />
                </div>

                {/* Current Heading Needle */}
                <div
                  className="absolute w-full h-full flex items-center justify-center transition-transform duration-100 ease-out"
                  style={{ transform: `rotate(${telemetry.heading}deg)` }}
                >
                  <div className="w-0.5 h-16 bg-slate-500 rounded relative">
                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[14px] border-b-rose-500 absolute -top-3 -left-[3px]" />
                  </div>
                </div>

                {/* Center Readout */}
                <div className="z-10 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-center">
                  <span className="text-sm font-bold font-mono text-slate-100">
                    {telemetry.heading.toFixed(1)}&deg;
                  </span>
                </div>
              </div>

              {/* Drift Angle Stats */}
              <div className="w-full grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
                <div className="bg-slate-900/60 p-2 rounded border border-slate-800 text-center">
                  <span className="text-slate-500 text-[10px] block">LOCKED HEADING</span>
                  <span className="text-slate-200 font-semibold">{telemetry.targetHeading.toFixed(1)}&deg;</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded border border-slate-800 text-center">
                  <span className="text-slate-500 text-[10px] block">DRIFT ERROR</span>
                  <span
                    className={`font-semibold ${
                      Math.abs(headingError) < 5
                        ? 'text-emerald-400'
                        : Math.abs(headingError) < 15
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {headingError > 0 ? `+${headingError.toFixed(1)}°` : `${headingError.toFixed(1)}°`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ultrasonic Distance Gauge */}
          <div
            className={`rounded-lg border p-4 transition-colors ${
              isObstacleWarning ? 'bg-rose-950/20 border-rose-500/40' : 'bg-[#0f1523] border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
              <div className="flex items-center space-x-2">
                <Gauge className={`w-4 h-4 ${isObstacleWarning ? 'text-rose-400' : 'text-slate-400'}`} />
                <h2 className="text-xs font-semibold tracking-wider font-mono text-slate-200 uppercase">
                  Bow Ultrasonic Range
                </h2>
              </div>
              <span
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                  isObstacleWarning
                    ? 'border-rose-500/40 bg-rose-950/50 text-rose-300'
                    : 'border-slate-800 bg-slate-900 text-emerald-400'
                }`}
              >
                {isObstacleWarning ? 'PROXIMITY WARNING' : 'CLEAR'}
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-1.5 font-mono">
              <span className="text-xl font-bold text-slate-100">
                {telemetry.ultrasonicCm} <span className="text-xs text-slate-400 font-normal">cm</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Threshold: <span className="text-slate-200 font-semibold">{tuningParams.avoidDist} cm</span>
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-950 rounded border border-slate-800 overflow-hidden relative">
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
                style={{ left: `${Math.min(100, (tuningParams.avoidDist / 200) * 100)}%` }}
              />
              <div
                className={`h-full transition-all duration-150 ${
                  isObstacleWarning ? 'bg-rose-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.max(5, Math.min(100, (telemetry.ultrasonicCm / 200) * 100))}%` }}
              />
            </div>
          </div>
        </section>

        {/* ================= COLUMN 3: PROPULSION & CONVEYOR (Cols 9-12) ================= */}
        <section className="lg:col-span-3 flex flex-col gap-4">
          {/* Dual Thruster Output Gauges */}
          <div className="bg-[#0f1523] rounded-lg border border-slate-800 p-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center space-x-2">
                <RotateCw className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-semibold tracking-wider font-mono text-slate-200 uppercase">
                  Thruster PWM Gauges
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500">(-255 to +255)</span>
            </div>

            <div className="grid grid-cols-2 gap-4 py-1">
              {/* Port (Left) Thruster */}
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-mono text-slate-400 mb-1 font-semibold">PORT (L)</span>
                <div className="relative w-10 h-36 bg-[#070b12] rounded border border-slate-800 p-0.5 flex flex-col justify-center items-center">
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-700 z-10" />
                  <div className="absolute bottom-1/2 left-1 right-1 flex flex-col-reverse items-center overflow-hidden">
                    <div
                      className="w-full bg-cyan-600 rounded-t transition-all duration-100"
                      style={{ height: `${Math.max(0, Math.min(100, (telemetry.motors.leftPwm / 255) * 68))}px` }}
                    />
                  </div>
                  <div className="absolute top-1/2 left-1 right-1 flex flex-col items-center overflow-hidden">
                    <div
                      className="w-full bg-rose-600 rounded-b transition-all duration-100"
                      style={{ height: `${Math.max(0, Math.min(100, (-telemetry.motors.leftPwm / 255) * 68))}px` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-mono font-bold mt-1.5 text-slate-200">
                  {telemetry.motors.leftPwm > 0 ? `+${telemetry.motors.leftPwm}` : telemetry.motors.leftPwm}
                </span>
              </div>

              {/* Starboard (Right) Thruster */}
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-mono text-slate-400 mb-1 font-semibold">STBD (R)</span>
                <div className="relative w-10 h-36 bg-[#070b12] rounded border border-slate-800 p-0.5 flex flex-col justify-center items-center">
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-700 z-10" />
                  <div className="absolute bottom-1/2 left-1 right-1 flex flex-col-reverse items-center overflow-hidden">
                    <div
                      className="w-full bg-cyan-600 rounded-t transition-all duration-100"
                      style={{ height: `${Math.max(0, Math.min(100, (telemetry.motors.rightPwm / 255) * 68))}px` }}
                    />
                  </div>
                  <div className="absolute top-1/2 left-1 right-1 flex flex-col items-center overflow-hidden">
                    <div
                      className="w-full bg-rose-600 rounded-b transition-all duration-100"
                      style={{ height: `${Math.max(0, Math.min(100, (-telemetry.motors.rightPwm / 255) * 68))}px` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-mono font-bold mt-1.5 text-slate-200">
                  {telemetry.motors.rightPwm > 0 ? `+${telemetry.motors.rightPwm}` : telemetry.motors.rightPwm}
                </span>
              </div>
            </div>
          </div>

          {/* NEMA 17 Stepper Conveyor Deck */}
          <div className="bg-[#0f1523] rounded-lg border border-slate-800 p-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-semibold tracking-wider font-mono text-slate-200 uppercase">
                  Conveyor Stepper (A4988)
                </h2>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  telemetry.motors.conveyorOn
                    ? 'border-emerald-600/40 bg-emerald-950/40 text-emerald-400 font-semibold'
                    : 'border-slate-800 bg-slate-900 text-slate-500'
                }`}
              >
                {telemetry.motors.conveyorOn ? 'ENERGIZED' : 'IDLE'}
              </span>
            </div>

            <button
              onClick={handleToggleConveyor}
              className={`w-full py-2 rounded text-xs font-mono font-semibold transition-colors flex items-center justify-center space-x-2 border ${
                telemetry.motors.conveyorOn
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/60'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{telemetry.motors.conveyorOn ? 'DISENGAGE CONVEYOR' : 'ENGAGE CONVEYOR'}</span>
            </button>
          </div>

          {/* Manual Pilot D-Pad */}
          <div className="bg-[#0f1523] rounded-lg border border-slate-800 p-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <span className="text-xs font-mono font-semibold text-slate-300 uppercase">
                Manual Drive Deck
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  controlMode === 'MANUAL'
                    ? 'border-amber-500/40 bg-amber-950/40 text-amber-300'
                    : 'border-slate-800 bg-slate-900 text-slate-500'
                }`}
              >
                {controlMode === 'MANUAL' ? 'ACTIVE' : 'LOCKED (AUTO)'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-mono mb-2">
              {controlMode === 'MANUAL'
                ? 'Operator inputs active via keyboard (W,A,S,D) or buttons below.'
                : 'Switch mode to MANUAL to unlock drive controls.'}
            </p>

            <div className="flex flex-col items-center gap-1.5 py-1">
              <button
                disabled={controlMode !== 'MANUAL'}
                onMouseDown={() => {
                  const k = { ...activeKeys, w: true };
                  setActiveKeys(k);
                  calculateManualDrive(k);
                }}
                onMouseUp={() => {
                  const k = { ...activeKeys, w: false };
                  setActiveKeys(k);
                  calculateManualDrive(k);
                }}
                className={`w-12 h-9 rounded flex items-center justify-center text-xs border font-mono transition-colors ${
                  controlMode !== 'MANUAL'
                    ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                    : activeKeys.w
                    ? 'bg-cyan-600 text-slate-950 border-cyan-400'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={controlMode !== 'MANUAL'}
                  onMouseDown={() => {
                    const k = { ...activeKeys, a: true };
                    setActiveKeys(k);
                    calculateManualDrive(k);
                  }}
                  onMouseUp={() => {
                    const k = { ...activeKeys, a: false };
                    setActiveKeys(k);
                    calculateManualDrive(k);
                  }}
                  className={`w-12 h-9 rounded flex items-center justify-center text-xs border font-mono transition-colors ${
                    controlMode !== 'MANUAL'
                      ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                      : activeKeys.a
                      ? 'bg-cyan-600 text-slate-950 border-cyan-400'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>

                <button
                  disabled={controlMode !== 'MANUAL'}
                  onMouseDown={() => {
                    const k = { ...activeKeys, s: true };
                    setActiveKeys(k);
                    calculateManualDrive(k);
                  }}
                  onMouseUp={() => {
                    const k = { ...activeKeys, s: false };
                    setActiveKeys(k);
                    calculateManualDrive(k);
                  }}
                  className={`w-12 h-9 rounded flex items-center justify-center text-xs border font-mono transition-colors ${
                    controlMode !== 'MANUAL'
                      ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                      : activeKeys.s
                      ? 'bg-cyan-600 text-slate-950 border-cyan-400'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>

                <button
                  disabled={controlMode !== 'MANUAL'}
                  onMouseDown={() => {
                    const k = { ...activeKeys, d: true };
                    setActiveKeys(k);
                    calculateManualDrive(k);
                  }}
                  onMouseUp={() => {
                    const k = { ...activeKeys, d: false };
                    setActiveKeys(k);
                    calculateManualDrive(k);
                  }}
                  className={`w-12 h-9 rounded flex items-center justify-center text-xs border font-mono transition-colors ${
                    controlMode !== 'MANUAL'
                      ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                      : activeKeys.d
                      ? 'bg-cyan-600 text-slate-950 border-cyan-400'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------- SLIDE-OVER PARAMETER TUNING DRAWER ---------------- */}
      {showTuningDrawer && (
        <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-[#0b101c] border-l border-slate-800 shadow-2xl z-50 p-6 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold font-mono text-slate-100 uppercase">Flight Control Parameters</h2>
            </div>
            <button
              onClick={() => setShowTuningDrawer(false)}
              className="text-slate-400 hover:text-white p-1 rounded"
            >
              &times;
            </button>
          </div>

          <p className="text-xs text-slate-400 font-mono mb-4">
            Live updates transmitted over WebSocket without reflashing firmware.
          </p>

          <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
            <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-slate-300 font-semibold">Base Motor Speed</span>
                <span className="text-cyan-400 font-bold">{tuningParams.baseSpeed} PWM</span>
              </div>
              <input
                type="range"
                min="80"
                max="255"
                step="1"
                value={tuningParams.baseSpeed}
                onChange={(e) =>
                  handlePushTuning({ ...tuningParams, baseSpeed: parseInt(e.target.value) })
                }
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 font-mono">Standard cruising PWM (80 - 255)</span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-slate-300 font-semibold">Visual Track Gain</span>
                <span className="text-cyan-400 font-bold">{tuningParams.trackGain}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.1"
                value={tuningParams.trackGain}
                onChange={(e) =>
                  handlePushTuning({ ...tuningParams, trackGain: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 font-mono">
                Centroid error gain for differential steer
              </span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-slate-300 font-semibold">Gyro Heading Kp</span>
                <span className="text-cyan-400 font-bold">{tuningParams.gyroKp}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="6.0"
                step="0.2"
                value={tuningParams.gyroKp}
                onChange={(e) =>
                  handlePushTuning({ ...tuningParams, gyroKp: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 font-mono">
                MPU6050 proportional heading correction
              </span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-slate-300 font-semibold">Avoidance Distance</span>
                <span className="text-amber-400 font-bold">{tuningParams.avoidDist} cm</span>
              </div>
              <input
                type="range"
                min="15"
                max="80"
                step="1"
                value={tuningParams.avoidDist}
                onChange={(e) =>
                  handlePushTuning({ ...tuningParams, avoidDist: parseInt(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 font-mono">
                Ultrasonic threshold to trigger STATE_AVOID
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => setShowTuningDrawer(false)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ---------------- RAW LOG DRAWER ---------------- */}
      {showLogDrawer && (
        <div className="fixed bottom-0 inset-x-0 bg-[#070b12]/95 border-t border-slate-800 p-3 shadow-xl z-40 max-h-48 flex flex-col font-mono text-xs backdrop-blur">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              Telemetry Event Stream
            </span>
            <button
              onClick={() => setShowLogDrawer(false)}
              className="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 text-[10px]"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pt-1.5 text-[11px]">
            {logs.map((log, idx) => (
              <div key={idx} className="flex space-x-2 text-slate-300">
                <span className="text-slate-600 shrink-0">[{log.ts}]</span>
                <span className="text-slate-300">{log.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- FOOTER ---------------- */}
      <footer className="border-t border-slate-800/80 bg-[#090d16] px-4 py-2 text-xs font-mono text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span>AquaSkim Ground Station</span>
          <span>&bull;</span>
          <span>Grid: 96&times;96</span>
          <span>&bull;</span>
          <span>Deadband: [38, 58]</span>
        </div>
        <div className="flex items-center space-x-2 text-slate-400">
          <span>Flight Controller: ESP32 30-Pin</span>
          <span>&bull;</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Standby
          </span>
        </div>
      </footer>
    </div>
  );
}
