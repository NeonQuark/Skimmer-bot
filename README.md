# AquaSkim Ground Control Station (GCS) - Autonomous Marine Robot

A dark-mode marine robotics Ground Control Station (GCS) and ESP32 telemetry control dashboard for an autonomous water trash-skimming boat (**AquaSkim USV**).

---

## 🚀 Features

- **Top Status & Telemetry Bar:** Live link status, ping latency, ESP32 IP configuration, Simulation Mode toggle (10Hz synthetic stream), and Emergency Stop (ESTOP).
- **FOMO Vision Matrix (96x96 Grid):** Scaled coordinate representation matching Edge Impulse FOMO target outputs from the ESP32-CAM, with deadband bounds (`X=38-58`), collection trigger (`Y=68`), and live pulsing target centroid reticle.
- **Navigation HUD:** MPU6050 360° gyro compass needle, heading readout, locked angle drift, and HC-SR04 ultrasonic sonar bar with automated collision warnings.
- **Propulsion & Conveyor Control:** Dual bipolar PWM thruster gauges (-255 to +255), animated NEMA 17 stepper conveyor deck with manual override, and on-screen D-Pad + WASD keyboard bindings in `MANUAL` mode.
- **Live PID & Threshold Tuning:** Real-time sliders for base thruster speed, visual tracking gain, gyro Kp, and obstacle avoidance thresholds pushed dynamically via WebSocket.
- **Embedded Offline Portal (`skimmer_portal.h`):** Zero-CDN self-contained PROGMEM web portal for direct phone/laptop operation over the boat's Wi-Fi Access Point (`TrashBoat_AP`).

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Tailwind CSS v4, Lucide React, Vite
- **Firmware:** ESP32 Arduino Core (`WebServer` / `ESPAsyncWebServer`), Edge Impulse FOMO

---

## 🚢 Local Development

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Build production bundle
npm run build
```

---

## 📡 Hardware Deployment

- Flash `esp32_skimmer_server.ino` and `skimmer_portal.h` to your ESP32 Flight Controller using the Arduino IDE or PlatformIO.
- Connect your device to the boat's Access Point:
  - **SSID:** `TrashBoat_AP`
  - **Password:** `password123`
- Open `http://192.168.4.1/` or launch this web GCS connected to `ws://192.168.4.1:81`.
