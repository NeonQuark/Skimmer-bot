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
  RefreshCw,
  Terminal,
  Cpu,
  Layers,
  ChevronRight,
  Play,
  Pause,
  Info,
  CheckCircle2,
  Volume2,
  Anchor,
  Maximize2,
  Zap
} from 'lucide-react';

export default function App() {
  // --- Connection & Simulation State ---
  const [espIp, setEspIp] = useState('192.168.4.1:81');
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(14);
  const [simulationMode, setSimulationMode] = useState(true);
  const [showTuningDrawer, setShowTuningDrawer] = useState(false);
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [logs, setLogs] = useState([
    { ts: new Date().toLocaleTimeString(), text: 'System initialized. Ready to interface with ESP32 Flight Controller.' },
    { ts: new Date().toLocaleTimeString(), text: 'Simulation mode active. Generating 10Hz synthetic telemetry stream.' }
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
      leftPwm: 150,
      rightPwm: 140,
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
  const [controlMode, setControlMode] = useState('AUTO'); // 'AUTO' | 'MANUAL'

  // Ref for WebSocket
  const wsRef = useRef(null);
  const pingStartRef = useRef(0);

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
      addLog(`TX ➔ ${jsonStr}`);
    } else {
      addLog(`[Local/Sim] TX ➔ ${jsonStr}`);
    }
  }, [addLog]);

  const handleConnect = () => {
    if (isConnected) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setIsConnected(false);
      addLog('Disconnected from ESP32 Flight Controller.');
      return;
    }

    try {
      const url = espIp.startsWith('ws://') ? espIp : `ws://${espIp}`;
      addLog(`Connecting to WebSocket at ${url}...`);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        addLog(`WebSocket connection established with ESP32.`);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setTelemetry((prev) => ({
            ...prev,
            ...data
          }));
          if (data.state) {
            if (data.state === 'MANUAL') setControlMode('MANUAL');
            else setControlMode('AUTO');
          }
        } catch (err) {
          console.error('Failed to parse telemetry JSON:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        addLog('WebSocket connection closed.');
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        addLog(`WebSocket error encountered.`);
      };
    } catch (e) {
      addLog(`Connection error: ${e.message}`);
    }
  };

  // --- Realistic Simulation Generator (10Hz) ---
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

      // Simulate state progression or manual control
      if (controlMode === 'MANUAL') {
        simState = 'MANUAL';
      } else {
        // Autonomous cycle
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

      // Drift heading towards targetHeading with slight wave sway
      const headingDiff = (targetAngle - simHeading);
      simHeading += headingDiff * 0.08 + (Math.sin(stepCount * 0.2) * 0.4);
      if (simHeading >= 360) simHeading -= 360;
      if (simHeading < 0) simHeading += 360;

      // Realistic target movement in FOMO camera field of view (96x96)
      if (simState === 'TRACK' || simState === 'COLLECT') {
        // Target moves toward collection zone at bottom center
        fomoY += 0.45;
        // Sway in current
        fomoX += (48 - fomoX) * 0.06 + Math.sin(stepCount * 0.3) * 0.8;
        if (fomoY > 88) {
          // Reset simulated detected trash
          fomoDetected = Math.random() > 0.2;
          fomoX = Math.floor(25 + Math.random() * 46);
          fomoY = 18;
        }
      } else if (simState === 'SEARCH') {
        fomoX = (fomoX + 1.2) % 96;
        fomoY = 30 + Math.sin(stepCount * 0.1) * 15;
        if (Math.random() < 0.04) {
          fomoDetected = true;
        }
      }

      // Ultrasonic sensor distance simulation with occasional obstacle
      if (simState === 'AVOID') {
        ultraDist = Math.min(130, ultraDist + 4.5);
      } else {
        ultraDist = Math.max(18, 115 + Math.sin(stepCount * 0.08) * 45 + (Math.random() * 4 - 2));
      }

      // Motor PWM simulation based on current state
      let leftPwm = 0;
      let rightPwm = 0;
      let conveyor = true;

      if (simState === 'MANUAL') {
        // Determined by manual inputs or idle
        leftPwm = telemetry.motors.leftPwm;
        rightPwm = telemetry.motors.rightPwm;
        conveyor = telemetry.motors.conveyorOn;
      } else if (simState === 'SEARCH') {
        leftPwm = 130;
        rightPwm = -110; // slow sweep rotate
        conveyor = false;
      } else if (simState === 'TRACK') {
        const errorX = fomoX - 48; // deadband offset
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

      // Fluctuate latency slightly
      setLatency(Math.floor(12 + Math.random() * 7));
    }, 100);

    return () => clearInterval(interval);
  }, [simulationMode, isConnected, controlMode, tuningParams, telemetry.motors]);

  // --- Keyboard Control (WASD) in MANUAL mode ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (controlMode !== 'MANUAL') return;
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
      }

      let newKeys = { ...activeKeys };
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
      let newKeys = { ...activeKeys };
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

    // Update local state if simulation or directly send
    setTelemetry((prev) => ({
      ...prev,
      motors: {
        ...prev.motors,
        leftPwm: left,
        rightPwm: right
      }
    }));

    sendCommand({
      cmd: 'DRIVE',
      left,
      right
    });
  };

  // --- Handlers for User Actions ---
  const handleToggleMode = (newMode) => {
    setControlMode(newMode);
    sendCommand({
      cmd: 'SET_MODE',
      mode: newMode
    });
    addLog(`Operating mode switched to ${newMode}.`);
  };

  const handleToggleConveyor = () => {
    const newState = !telemetry.motors.conveyorOn;
    setTelemetry((prev) => ({
      ...prev,
      motors: {
        ...prev.motors,
        conveyorOn: newState
      }
    }));
    sendCommand({
      cmd: 'CONVEYOR',
      enable: newState
    });
    addLog(`Conveyor belt turned ${newState ? 'ON' : 'OFF'}.`);
  };

  const handleEmergencyStop = () => {
    setTelemetry((prev) => ({
      ...prev,
      state: 'MANUAL',
      motors: {
        leftPwm: 0,
        rightPwm: 0,
        conveyorOn: false
      }
    }));
    setControlMode('MANUAL');
    sendCommand({ cmd: 'ESTOP' });
    addLog('🚨 [ESTOP TRIGGERED] All thrusters and conveyor halted immediately.');
  };

  const handlePushTuning = (newParams) => {
    setTuningParams(newParams);
    sendCommand({
      cmd: 'TUNE',
      ...newParams
    });
    addLog(`Updated PID & Thresholds: Base=${newParams.baseSpeed}, TrackGain=${newParams.trackGain}, GyroKp=${newParams.gyroKp}, AvoidDist=${newParams.avoidDist}cm`);
  };

  // Status badge styling helper
  const getStateBadge = (state) => {
    switch (state) {
      case 'SEARCH':
        return {
          label: 'SEARCH PATTERN',
          bg: 'bg-cyan-950/70 border-cyan-500/50 text-cyan-400',
          glow: 'shadow-[0_0_12px_rgba(6,182,212,0.4)]',
          dot: 'bg-cyan-400'
        };
      case 'TRACK':
        return {
          label: 'FOMO TARGET TRACK',
          bg: 'bg-emerald-950/70 border-emerald-500/50 text-emerald-400',
          glow: 'shadow-[0_0_12px_rgba(16,185,129,0.4)]',
          dot: 'bg-emerald-400'
        };
      case 'COLLECT':
        return {
          label: 'COLLECTION ENGAGED',
          bg: 'bg-teal-950/70 border-teal-500/50 text-teal-300',
          glow: 'shadow-[0_0_12px_rgba(20,184,166,0.4)]',
          dot: 'bg-teal-300'
        };
      case 'AVOID':
        return {
          label: 'COLLISION AVOIDANCE',
          bg: 'bg-rose-950/70 border-rose-500/50 text-rose-400 animate-pulse',
          glow: 'shadow-[0_0_15px_rgba(244,63,94,0.5)]',
          dot: 'bg-rose-400'
        };
      case 'MANUAL':
        return {
          label: 'MANUAL OVERRIDE',
          bg: 'bg-amber-950/70 border-amber-500/50 text-amber-400',
          glow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]',
          dot: 'bg-amber-400'
        };
      default:
        return {
          label: state || 'STANDBY',
          bg: 'bg-slate-800 border-slate-600 text-slate-300',
          glow: '',
          dot: 'bg-slate-400'
        };
    }
  };

  const stateInfo = getStateBadge(telemetry.state);

  // Heading drift calculation (-180 to +180)
  let headingError = telemetry.heading - telemetry.targetHeading;
  if (headingError > 180) headingError -= 360;
  if (headingError < -180) headingError += 360;

  // Obstacle alarm check
  const isObstacleWarning = telemetry.ultrasonicCm < tuningParams.avoidDist;

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ---------------- 1. TOP CONNECTION & STATUS BAR ---------------- */}
      <header className="border-b border-cyan-900/40 bg-[#0b111e]/90 backdrop-blur-md sticky top-0 z-40 px-4 py-2.5">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Callout */}
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40">
              <Anchor className="w-5 h-5 text-cyan-400 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold tracking-wider text-slate-100 uppercase font-mono">
                  AQUASKIM <span className="text-cyan-400 font-extrabold">GCS</span>
                </h1>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  ESP32 DEVKIT-30P
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Autonomy Skimmer v2.4 • Edge Impulse FOMO
              </p>
            </div>
          </div>

          {/* IP Input & Connect Button */}
          <div className="flex items-center space-x-2 bg-slate-900/90 p-1.5 rounded-lg border border-slate-700/60 shadow-inner">
            <div className="flex items-center pl-2 text-slate-400 font-mono text-xs">
              <Radio className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
              <span className="text-slate-500 hidden sm:inline mr-1">ws://</span>
              <input
                type="text"
                value={espIp}
                onChange={(e) => setEspIp(e.target.value)}
                placeholder="192.168.4.1:81"
                className="bg-transparent text-slate-200 outline-none w-32 sm:w-40 text-xs font-mono placeholder-slate-600 focus:text-cyan-300"
              />
            </div>
            <button
              onClick={handleConnect}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-all flex items-center space-x-1.5 ${
                isConnected
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-600/50'
              }`}
            >
              {isConnected ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Disconnect</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Connect</span>
                </>
              )}
            </button>
          </div>

          {/* Connection Status Badge & Latency */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected || simulationMode ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-rose-500'
                  }`}
                ></span>
                <span className="text-slate-300 font-semibold">
                  {isConnected ? 'ONLINE' : simulationMode ? 'SIMULATED' : 'DISCONNECTED'}
                </span>
              </div>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-400 font-bold">{latency}ms</span>
            </div>

            {/* Simulation Toggle Switch */}
            <div className="flex items-center space-x-2 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
              <label htmlFor="sim-toggle" className="text-slate-400 font-mono text-[11px] cursor-pointer select-none">
                Sim Mode:
              </label>
              <button
                id="sim-toggle"
                onClick={() => setSimulationMode(!simulationMode)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  simulationMode ? 'bg-cyan-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    simulationMode ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Tuning Drawer Trigger */}
            <button
              onClick={() => setShowTuningDrawer(!showTuningDrawer)}
              className={`p-2 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
                showTuningDrawer
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-900/90 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
              title="Toggle Live PID & Threshold Tuner"
            >
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="hidden md:inline">PID Tuner</span>
            </button>

            {/* Emergency Stop Button */}
            <button
              onClick={handleEmergencyStop}
              className="px-4 py-2 rounded-lg font-mono font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-[0_0_18px_rgba(239,68,68,0.55)] border border-red-400 active:scale-95 transition-all flex items-center space-x-2 animate-pulse"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>EMERGENCY STOP</span>
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- 2. MAIN DASHBOARD CONTENT AREA ---------------- */}
      <main className="max-w-[1600px] w-full mx-auto p-4 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ================= LEFT COLUMN: VISION & TARGETING (Cols 1-5) ================= */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          {/* FOMO Vision Matrix 96x96 Grid View */}
          <div className="bg-[#0c1421] rounded-xl border border-cyan-900/50 p-4 shadow-lg relative flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center space-x-2">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold tracking-wide font-mono text-slate-200 uppercase">
                  FOMO Vision Matrix (96x96 Grid)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                  ESP32-CAM OV2640
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    telemetry.fomo.detected
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  {telemetry.fomo.detected ? 'PLASTIC LOCKED' : 'SEARCHING...'}
                </span>
              </div>
            </div>

            {/* 96x96 Logical Coordinate Viewport */}
            <div className="relative w-full aspect-square max-w-[400px] mx-auto bg-slate-950 rounded-lg border-2 border-cyan-950 overflow-hidden shadow-inner flex items-center justify-center">
              {/* Synthetic grid lines for 96x96 logical pixels */}
              <svg
                viewBox="0 0 96 96"
                className="w-full h-full select-none"
                style={{ imageRendering: 'pixelated' }}
              >
                <defs>
                  {/* Subtle matrix grid pattern */}
                  <pattern id="grid" width="12" height="12" patternUnits="userSpaceOnUse">
                    <path d="M 12 0 L 0 0 0 12" fill="none" stroke="rgba(30, 41, 59, 0.4)" strokeWidth="0.5" />
                  </pattern>
                  <radialGradient id="camVignette" cx="50%" cy="50%" r="50%">
                    <stop offset="60%" stopColor="transparent" />
                    <stop offset="100%" stopColor="rgba(6, 18, 36, 0.8)" />
                  </radialGradient>
                </defs>

                {/* Background Grid & Vignette */}
                <rect width="96" height="96" fill="#040810" />
                <rect width="96" height="96" fill="url(#grid)" />
                <rect width="96" height="96" fill="url(#camVignette)" />

                {/* Radar Sweep Arc Animation */}
                <g className="origin-center animate-[spin_6s_linear_infinite]" style={{ transformOrigin: '48px 48px' }}>
                  <line x1="48" y1="48" x2="48" y2="2" stroke="rgba(6, 182, 212, 0.25)" strokeWidth="0.8" />
                  <polygon
                    points="48,48 48,0 32,4"
                    fill="url(#radarGrad)"
                    opacity="0.12"
                  />
                </g>

                {/* Deadband Center Corridor (X = 38 to 58) */}
                <rect
                  x="38"
                  y="0"
                  width="20"
                  height="96"
                  fill="rgba(6, 182, 212, 0.08)"
                  stroke="rgba(6, 182, 212, 0.3)"
                  strokeDasharray="2,2"
                  strokeWidth="0.6"
                />
                <text x="48" y="10" fill="rgba(6, 182, 212, 0.6)" fontSize="3.5" textAnchor="middle" fontFamily="monospace">
                  DEADBAND (38-58)
                </text>

                {/* Horizontal Collection Line (Y = 68) */}
                <line
                  x1="0"
                  y1="68"
                  x2="96"
                  y2="68"
                  stroke="rgba(245, 158, 11, 0.75)"
                  strokeWidth="0.8"
                  strokeDasharray="2.5,1.5"
                />
                <text x="4" y="66" fill="rgba(245, 158, 11, 0.85)" fontSize="3.2" fontFamily="monospace">
                  COLLECT TRIGGER (Y=68)
                </text>

                {/* Skimmer Intake Boat Bow Outline at Bottom */}
                <path
                  d="M 28 96 L 38 82 L 58 82 L 68 96 Z"
                  fill="rgba(59, 130, 246, 0.2)"
                  stroke="rgba(59, 130, 246, 0.6)"
                  strokeWidth="0.8"
                />
                <text x="48" y="91" fill="rgba(147, 197, 253, 0.8)" fontSize="3.2" textAnchor="middle" fontFamily="monospace">
                  INTAKE CONVEYOR
                </text>

                {/* Target Plastic Bounding Box Centroid (fomo.x, fomo.y) */}
                {telemetry.fomo.detected && (
                  <g className="transition-all duration-100 ease-out">
                    {/* Pulsing Target Halo */}
                    <circle
                      cx={telemetry.fomo.x}
                      cy={telemetry.fomo.y}
                      r="8"
                      fill="none"
                      stroke={telemetry.fomo.y >= 68 ? '#10b981' : '#06b6d4'}
                      strokeWidth="0.6"
                      strokeDasharray="2,2"
                      className="fomo-pulse"
                      style={{ transformOrigin: `${telemetry.fomo.x}px ${telemetry.fomo.y}px` }}
                    />
                    {/* Bounding Box 8x8 representation */}
                    <rect
                      x={telemetry.fomo.x - 4}
                      y={telemetry.fomo.y - 4}
                      width="8"
                      height="8"
                      fill="rgba(6, 182, 212, 0.25)"
                      stroke={telemetry.fomo.y >= 68 ? '#34d399' : '#22d3ee'}
                      strokeWidth="0.8"
                    />
                    {/* Precise Center Reticle */}
                    <circle cx={telemetry.fomo.x} cy={telemetry.fomo.y} r="1" fill="#ef4444" />
                    <line
                      x1={telemetry.fomo.x - 6}
                      y1={telemetry.fomo.y}
                      x2={telemetry.fomo.x + 6}
                      y2={telemetry.fomo.y}
                      stroke="#ef4444"
                      strokeWidth="0.5"
                    />
                    <line
                      x1={telemetry.fomo.x}
                      y1={telemetry.fomo.y - 6}
                      x2={telemetry.fomo.x}
                      y2={telemetry.fomo.y + 6}
                      stroke="#ef4444"
                      strokeWidth="0.5"
                    />
                    {/* Coordinate Tag */}
                    <text
                      x={Math.min(76, telemetry.fomo.x + 6)}
                      y={Math.max(8, telemetry.fomo.y - 3)}
                      fill="#e2e8f0"
                      fontSize="3.2"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      [{telemetry.fomo.x}, {telemetry.fomo.y}]
                    </text>
                  </g>
                )}
              </svg>

              {/* Water Scanning CRT Scanline effect */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent h-12 w-full animate-[pulse_3s_ease-in-out_infinite]" />
            </div>

            {/* Matrix Metadata telemetry bar */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 font-mono text-xs">
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">TARGET CENTROID</span>
                <span className="text-cyan-300 font-bold">
                  {telemetry.fomo.detected ? `X:${telemetry.fomo.x}  Y:${telemetry.fomo.y}` : 'NONE'}
                </span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">CORRIDOR DRIFT</span>
                <span
                  className={`font-bold ${
                    !telemetry.fomo.detected
                      ? 'text-slate-500'
                      : telemetry.fomo.x >= 38 && telemetry.fomo.x <= 58
                      ? 'text-emerald-400'
                      : telemetry.fomo.x < 38
                      ? 'text-amber-400'
                      : 'text-cyan-400'
                  }`}
                >
                  {!telemetry.fomo.detected
                    ? '---'
                    : telemetry.fomo.x >= 38 && telemetry.fomo.x <= 58
                    ? 'ALIGNED'
                    : telemetry.fomo.x < 38
                    ? `STEER L (${38 - telemetry.fomo.x})`
                    : `STEER R (${telemetry.fomo.x - 58})`}
                </span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">COLLECTION DIST</span>
                <span
                  className={`font-bold ${
                    !telemetry.fomo.detected
                      ? 'text-slate-500'
                      : telemetry.fomo.y >= 68
                      ? 'text-emerald-400 animate-pulse'
                      : 'text-slate-200'
                  }`}
                >
                  {!telemetry.fomo.detected ? '---' : `${Math.max(0, 68 - telemetry.fomo.y)}px to scoop`}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Marine Robotics Telemetry Digest */}
          <div className="bg-[#0c1421] rounded-xl border border-cyan-900/50 p-3.5 shadow-lg flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-400">Firmware:</span>
              <span className="text-cyan-300 font-semibold">SkimmerBot-ESP32-v2</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-400">Stream Rate:</span>
              <span className="text-emerald-300 font-semibold">10.0 Hz</span>
            </div>
            <button
              onClick={() => setShowLogDrawer(!showLogDrawer)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
            >
              <Terminal className="w-3.5 h-3.5" />
              {showLogDrawer ? 'Hide Raw Logs' : 'View Raw Logs'}
            </button>
          </div>
        </section>

        {/* ================= CENTER COLUMN: NAVIGATION & STATE HUD (Cols 6-8) ================= */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          {/* Active State Machine Pill */}
          <div className="bg-[#0c1421] rounded-xl border border-cyan-900/50 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                Active State Machine
              </span>
              {/* Mode Selector Toggle */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
                <button
                  onClick={() => handleToggleMode('AUTO')}
                  className={`px-2.5 py-1 rounded transition-all ${
                    controlMode === 'AUTO'
                      ? 'bg-cyan-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  AUTO
                </button>
                <button
                  onClick={() => handleToggleMode('MANUAL')}
                  className={`px-2.5 py-1 rounded transition-all ${
                    controlMode === 'MANUAL'
                      ? 'bg-amber-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  MANUAL
                </button>
              </div>
            </div>

            {/* Glowing State Banner */}
            <div
              className={`p-3.5 rounded-lg border flex items-center justify-between ${stateInfo.bg} ${stateInfo.glow} transition-all duration-300`}
            >
              <div className="flex items-center space-x-3">
                <span className={`w-3 h-3 rounded-full ${stateInfo.dot} animate-ping`} />
                <div>
                  <h3 className="text-sm font-bold font-mono tracking-wider">{stateInfo.label}</h3>
                  <p className="text-[11px] text-slate-300/80 font-mono">
                    {telemetry.state === 'SEARCH' && 'Sweeping harbor zone for floating plastics'}
                    {telemetry.state === 'TRACK' && 'PID centering target in deadband corridor'}
                    {telemetry.state === 'COLLECT' && 'NEMA 17 active. Pulling debris into hopper'}
                    {telemetry.state === 'AVOID' && 'Obstacle detected within safety perimeter!'}
                    {telemetry.state === 'MANUAL' && 'Remote pilot WASD manual thrust active'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-2 py-1 rounded bg-black/40 border border-white/10">
                STATE_{telemetry.state}
              </span>
            </div>
          </div>

          {/* Compass / Heading Drift Indicator (MPU6050) */}
          <div className="bg-[#0c1421] rounded-xl border border-cyan-900/50 p-4 shadow-lg flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center space-x-2">
                <CompassIcon className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold tracking-wide font-mono text-slate-200 uppercase">
                  MPU6050 Heading HUD
                </h2>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                GYRO KP: {tuningParams.gyroKp}
              </span>
            </div>

            {/* Compass Dial & Gyro Visualizer */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative w-44 h-44 rounded-full border-2 border-slate-800 bg-slate-950/90 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center">
                {/* Fixed Cardinal Markers */}
                <span className="absolute top-1 text-[11px] font-mono font-bold text-cyan-400">N (0°)</span>
                <span className="absolute bottom-1 text-[11px] font-mono font-bold text-slate-500">S (180°)</span>
                <span className="absolute left-1.5 text-[11px] font-mono font-bold text-slate-500">W (270°)</span>
                <span className="absolute right-1.5 text-[11px] font-mono font-bold text-slate-500">E (90°)</span>

                {/* Concentric rings */}
                <div className="absolute inset-4 rounded-full border border-slate-800/60" />
                <div className="absolute inset-9 rounded-full border border-dashed border-cyan-900/40" />

                {/* Target Heading Marker (Cyan pointer) */}
                <div
                  className="absolute w-full h-full flex items-center justify-center transition-transform duration-300"
                  style={{ transform: `rotate(${telemetry.targetHeading}deg)` }}
                >
                  <div className="w-0.5 h-18 bg-cyan-500/40 mb-18 rounded" />
                  <div className="absolute top-2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                </div>

                {/* Current Boat Heading Needle (Rotating boat hull symbol) */}
                <div
                  className="absolute w-full h-full flex items-center justify-center transition-transform duration-100 ease-out"
                  style={{ transform: `rotate(${telemetry.heading}deg)` }}
                >
                  {/* Boat hull icon indicator */}
                  <div className="relative flex flex-col items-center">
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[24px] border-b-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.8)] -mt-10" />
                    <div className="w-1.5 h-8 bg-slate-600 rounded-b mt-[-2px]" />
                  </div>
                </div>

                {/* Center Heading Readout */}
                <div className="z-10 bg-slate-900/90 border border-slate-700/80 px-2 py-1 rounded-md text-center shadow-lg">
                  <span className="text-base font-bold font-mono text-slate-100">
                    {telemetry.heading.toFixed(1)}°
                  </span>
                </div>
              </div>

              {/* Drift Angle Telemetry */}
              <div className="w-full grid grid-cols-2 gap-2 mt-4 text-xs font-mono">
                <div className="bg-slate-900/70 p-2 rounded border border-slate-800/80 text-center">
                  <span className="text-slate-500 text-[10px] block">LOCKED TARGET</span>
                  <span className="text-cyan-400 font-bold">{telemetry.targetHeading.toFixed(1)}°</span>
                </div>
                <div className="bg-slate-900/70 p-2 rounded border border-slate-800/80 text-center">
                  <span className="text-slate-500 text-[10px] block">DRIFT ERROR</span>
                  <span
                    className={`font-bold ${
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

          {/* HC-SR04 Ultrasonic Sonar Radar Bar */}
          <div
            className={`rounded-xl border p-4 shadow-lg transition-colors duration-300 ${
              isObstacleWarning
                ? 'bg-rose-950/30 border-rose-500/60'
                : 'bg-[#0c1421] border-cyan-900/50'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center space-x-2">
                <Gauge className={`w-4 h-4 ${isObstacleWarning ? 'text-rose-400 animate-bounce' : 'text-cyan-400'}`} />
                <h2 className="text-sm font-semibold tracking-wide font-mono text-slate-200 uppercase">
                  Bow Ultrasonic Sonar (HC-SR04)
                </h2>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  isObstacleWarning
                    ? 'bg-rose-900 text-rose-300 border border-rose-500'
                    : 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                }`}
              >
                {isObstacleWarning ? 'OBSTACLE PROXIMITY' : 'PATH CLEAR'}
              </span>
            </div>

            {/* Distance Readout & Warning Banner */}
            <div className="flex items-baseline justify-between mb-2 font-mono">
              <span className="text-2xl font-bold text-slate-100 flex items-baseline gap-1">
                {telemetry.ultrasonicCm} <span className="text-xs text-slate-400 font-normal">cm</span>
              </span>
              <span className="text-xs text-slate-400">
                Trigger Threshold: <span className="text-amber-400 font-semibold">{tuningParams.avoidDist} cm</span>
              </span>
            </div>

            {/* Radar Proximity Progress Bar */}
            <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
              {/* Threshold mark line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
                style={{ left: `${Math.min(100, (tuningParams.avoidDist / 200) * 100)}%` }}
                title={`Threshold ${tuningParams.avoidDist}cm`}
              />
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  isObstacleWarning
                    ? 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]'
                    : 'bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                }`}
                style={{
                  width: `${Math.max(5, Math.min(100, (telemetry.ultrasonicCm / 200) * 100))}%`
                }}
              />
            </div>

            {/* Safety status footer */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2">
              <span>0 cm (Collision)</span>
              <span>100 cm</span>
              <span>200+ cm (Max Range)</span>
            </div>
          </div>
        </section>

        {/* ================= RIGHT COLUMN: PROPULSION & MANUAL CONTROLS (Cols 9-12) ================= */}
        <section className="lg:col-span-3 flex flex-col gap-4">
          {/* Dual Vertical Thruster PWM Gauges */}
          <div className="bg-[#0c1421] rounded-xl border border-cyan-900/50 p-4 shadow-lg flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center space-x-2">
                <RotateCw className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold tracking-wide font-mono text-slate-200 uppercase">
                  Thruster PWM Gauges
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400">(-255 to +255)</span>
            </div>

            {/* Dual Thruster Vertical Bars */}
            <div className="grid grid-cols-2 gap-4 py-2">
              {/* Left Thruster Bar */}
              <div className="flex flex-col items-center">
                <span className="text-xs font-mono text-slate-400 mb-1 font-semibold">PORT (LEFT)</span>
                <div className="relative w-12 h-44 bg-slate-950 rounded-lg border border-slate-800 p-1 flex flex-col justify-center items-center shadow-inner">
                  {/* Zero Center Line */}
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-700 z-10" />

                  {/* Positive PWM (Forward) */}
                  <div className="absolute bottom-1/2 left-1.5 right-1.5 flex flex-col-reverse items-center overflow-hidden">
                    <div
                      className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t transition-all duration-100 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                      style={{
                        height: `${Math.max(0, Math.min(100, (telemetry.motors.leftPwm / 255) * 88))}px`
                      }}
                    />
                  </div>

                  {/* Negative PWM (Reverse) */}
                  <div className="absolute top-1/2 left-1.5 right-1.5 flex flex-col items-center overflow-hidden">
                    <div
                      className="w-full bg-gradient-to-b from-rose-600 to-rose-400 rounded-b transition-all duration-100 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                      style={{
                        height: `${Math.max(0, Math.min(100, (-telemetry.motors.leftPwm / 255) * 88))}px`
                      }}
                    />
                  </div>
                </div>

                <div className="mt-2 text-center font-mono">
                  <span
                    className={`text-sm font-bold ${
                      telemetry.motors.leftPwm > 0
                        ? 'text-cyan-400'
                        : telemetry.motors.leftPwm < 0
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {telemetry.motors.leftPwm > 0 ? `+${telemetry.motors.leftPwm}` : telemetry.motors.leftPwm}
                  </span>
                  <span className="text-[10px] text-slate-500 block uppercase">
                    {telemetry.motors.leftPwm > 0 ? 'FWD' : telemetry.motors.leftPwm < 0 ? 'REV' : 'IDLE'}
                  </span>
                </div>
              </div>

              {/* Right Thruster Bar */}
              <div className="flex flex-col items-center">
                <span className="text-xs font-mono text-slate-400 mb-1 font-semibold">STBD (RIGHT)</span>
                <div className="relative w-12 h-44 bg-slate-950 rounded-lg border border-slate-800 p-1 flex flex-col justify-center items-center shadow-inner">
                  {/* Zero Center Line */}
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-700 z-10" />

                  {/* Positive PWM (Forward) */}
                  <div className="absolute bottom-1/2 left-1.5 right-1.5 flex flex-col-reverse items-center overflow-hidden">
                    <div
                      className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t transition-all duration-100 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                      style={{
                        height: `${Math.max(0, Math.min(100, (telemetry.motors.rightPwm / 255) * 88))}px`
                      }}
                    />
                  </div>

                  {/* Negative PWM (Reverse) */}
                  <div className="absolute top-1/2 left-1.5 right-1.5 flex flex-col items-center overflow-hidden">
                    <div
                      className="w-full bg-gradient-to-b from-rose-600 to-rose-400 rounded-b transition-all duration-100 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                      style={{
                        height: `${Math.max(0, Math.min(100, (-telemetry.motors.rightPwm / 255) * 88))}px`
                      }}
                    />
                  </div>
                </div>

                <div className="mt-2 text-center font-mono">
                  <span
                    className={`text-sm font-bold ${
                      telemetry.motors.rightPwm > 0
                        ? 'text-cyan-400'
                        : telemetry.motors.rightPwm < 0
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {telemetry.motors.rightPwm > 0 ? `+${telemetry.motors.rightPwm}` : telemetry.motors.rightPwm}
                  </span>
                  <span className="text-[10px] text-slate-500 block uppercase">
                    {telemetry.motors.rightPwm > 0 ? 'FWD' : telemetry.motors.rightPwm < 0 ? 'REV' : 'IDLE'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* NEMA 17 Stepper Conveyor Belt Deck */}
          <div className="bg-[#0c1421] rounded-xl border border-cyan-900/50 p-4 shadow-lg flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold tracking-wide font-mono text-slate-200 uppercase">
                  NEMA 17 Conveyor (A4988)
                </h2>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  telemetry.motors.conveyorOn
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {telemetry.motors.conveyorOn ? 'ACTIVE' : 'STOPPED'}
              </span>
            </div>

            {/* Conveyor Belt Visualization */}
            <div
              className={`w-full h-14 rounded-lg border flex items-center justify-center transition-all ${
                telemetry.motors.conveyorOn
                  ? 'border-emerald-500/60 conveyor-running shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : 'border-slate-800 bg-slate-950'
              }`}
            >
              <span className="text-xs font-mono font-bold tracking-wider text-slate-300 bg-slate-900/80 px-3 py-1 rounded border border-slate-700/60">
                {telemetry.motors.conveyorOn ? 'SKIMMER BELT ADVANCING ➔' : 'CONVEYOR IDLE'}
              </span>
            </div>

            {/* Conveyor Toggle Button */}
            <button
              onClick={handleToggleConveyor}
              className={`mt-3 w-full py-2 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                telemetry.motors.conveyorOn
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-600/40'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{telemetry.motors.conveyorOn ? 'STOP CONVEYOR' : 'START CONVEYOR'}</span>
            </button>
          </div>

          {/* Interactive D-Pad / WASD Driving Cockpit */}
          <div className="bg-[#0c1421] rounded-xl border border-cyan-900/50 p-4 shadow-lg flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                Manual Drive Deck
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  controlMode === 'MANUAL'
                    ? 'bg-amber-950 text-amber-400 border border-amber-500/50 animate-pulse'
                    : 'bg-slate-900 text-slate-500'
                }`}
              >
                {controlMode === 'MANUAL' ? 'KEYS ACTIVE (WASD)' : 'DISABLED IN AUTO'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-mono mb-2">
              {controlMode === 'MANUAL'
                ? 'Use on-screen buttons or keyboard W, A, S, D to pilot thrusters.'
                : 'Switch mode to MANUAL above to unlock manual piloting.'}
            </p>

            {/* On-Screen D-Pad Buttons */}
            <div className="flex flex-col items-center gap-1.5 py-1">
              {/* Up (W) */}
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
                className={`w-12 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-xs border transition-all ${
                  controlMode !== 'MANUAL'
                    ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                    : activeKeys.w
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_12px_#06b6d4]'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 active:scale-95'
                }`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>

              {/* Left, Neutral/Stop, Right (A, S, D) */}
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
                  className={`w-12 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-xs border transition-all ${
                    controlMode !== 'MANUAL'
                      ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                      : activeKeys.a
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_12px_#06b6d4]'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 active:scale-95'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
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
                  className={`w-12 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-xs border transition-all ${
                    controlMode !== 'MANUAL'
                      ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                      : activeKeys.s
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_12px_#06b6d4]'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 active:scale-95'
                  }`}
                >
                  <ArrowDown className="w-4 h-4" />
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
                  className={`w-12 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-xs border transition-all ${
                    controlMode !== 'MANUAL'
                      ? 'opacity-30 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                      : activeKeys.d
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_12px_#06b6d4]'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 active:scale-95'
                  }`}
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------- 3. LIVE PID & THRESHOLD TUNING SLIDE-OVER DRAWER ---------------- */}
      {showTuningDrawer && (
        <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-[#0b121e] border-l border-cyan-900/80 shadow-2xl z-50 p-6 flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold font-mono text-slate-100">ESP32 PID & Tuners</h2>
            </div>
            <button
              onClick={() => setShowTuningDrawer(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-slate-400 font-mono mb-4">
            Live updates transmitted over WebSocket <code className="text-cyan-300 font-bold">`cmd: TUNE`</code>{' '}
            without reflashing firmware.
          </p>

          <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-1">
            {/* Base Speed Slider */}
            <div className="bg-slate-900/90 p-3.5 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
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
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 font-mono">Standard cruising PWM (80 - 255)</span>
            </div>

            {/* Visual Track Gain */}
            <div className="bg-slate-900/90 p-3.5 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
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
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 font-mono">
                FOMO centroid error multiplier for differential steer
              </span>
            </div>

            {/* Gyro Kp */}
            <div className="bg-slate-900/90 p-3.5 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
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
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 font-mono">
                MPU6050 proportional heading correction constant
              </span>
            </div>

            {/* Obstacle Avoidance Threshold */}
            <div className="bg-slate-900/90 p-3.5 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-300 font-semibold">Obstacle Avoidance Dist</span>
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
                className="w-full accent-amber-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 font-mono">
                Sonar threshold to trip STATE_AVOID evasive reverse
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => setShowTuningDrawer(false)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold font-mono text-xs rounded-lg transition-colors"
            >
              Done Tuning
            </button>
          </div>
        </div>
      )}

      {/* ---------------- 4. RAW WEBSOCKET LOGS DRAWER ---------------- */}
      {showLogDrawer && (
        <div className="fixed bottom-0 inset-x-0 bg-[#060b13]/95 border-t border-cyan-900/60 p-4 shadow-2xl z-40 max-h-56 flex flex-col font-mono text-xs backdrop-blur-md">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-cyan-400 font-semibold">
              <Terminal className="w-4 h-4" />
              <span>ESP32 WebSocket Bidirectional Packet Stream</span>
            </div>
            <button
              onClick={() => setShowLogDrawer(false)}
              className="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 text-[11px]"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pt-2 text-[11px]">
            {logs.map((log, idx) => (
              <div key={idx} className="flex space-x-3 text-slate-300">
                <span className="text-slate-500 shrink-0">[{log.ts}]</span>
                <span className="font-mono text-slate-200">{log.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- 5. TECHNICAL FOOTER ---------------- */}
      <footer className="border-t border-slate-800/80 bg-[#080d18] px-4 py-2.5 text-xs font-mono text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <span>SkimmerBot Marine Autonomy Platform</span>
          <span>•</span>
          <span className="text-cyan-400">Target Grid: 96x96</span>
          <span>•</span>
          <span className="text-amber-400">Deadband: X(38-58)</span>
          <span>•</span>
          <span className="text-emerald-400">Trigger: Y(68)</span>
        </div>
        <div className="flex items-center space-x-2 text-slate-400">
          <span>Flight Controller: ESP32 DevKit 30-Pin</span>
          <span>•</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ready
          </span>
        </div>
      </footer>
    </div>
  );
}
