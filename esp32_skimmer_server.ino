/*
 * AquaSkim Autonomous USV - ESP32 Web Server Example
 * Serves the offline single-file mission control portal from PROGMEM
 */

#include <WiFi.h>
#include <WebServer.h>
#include "skimmer_portal.h"

// Access Point Credentials
const char* ssid = "TrashBoat_AP";
const char* password = "password123";

WebServer server(80);

// Simulated / Live boat state variables
String currentState = "SEARCH";
String currentTarget = "YES (48)";
float currentDist = 120.5;
float currentYaw = 14.2;
float currentPh = 7.21;
int currentTurb = 45;
bool conveyorActive = false;

void handleRoot() {
  server.send_P(200, "text/html", index_html);
}

void handleStatus() {
  String json = "{";
  json += "\"state\":\"" + currentState + "\",";
  json += "\"target\":\"" + currentTarget + "\",";
  json += "\"dist\":" + String(currentDist, 1) + ",";
  json += "\"yaw\":" + String(currentYaw, 1) + ",";
  json += "\"ph\":" + String(currentPh, 2) + ",";
  json += "\"turb\":" + String(currentTurb) + ",";
  json += "\"conveyor\":" + String(conveyorActive ? "true" : "false");
  json += "}";
  server.send(200, "application/json", json);
}

void handleCmd() {
  if (server.hasArg("c")) {
    String cmd = server.arg("c");
    Serial.print("[CMD RECEIVED]: ");
    Serial.println(cmd);

    if (cmd == "conv") {
      conveyorActive = !conveyorActive;
      Serial.println(conveyorActive ? "Conveyor: ON" : "Conveyor: OFF");
    } else if (cmd == "auto") {
      currentState = "SEARCH";
    } else if (cmd == "stop") {
      currentState = "IDLE";
      conveyorActive = false;
      // Halt all motor PWMs here
    } else if (cmd == "fwd") {
      currentState = "MANUAL";
      // Left PWM = 200, Right PWM = 200
    } else if (cmd == "left") {
      currentState = "MANUAL";
      // Left PWM = -150, Right PWM = 150
    } else if (cmd == "right") {
      currentState = "MANUAL";
      // Left PWM = 150, Right PWM = -150
    } else if (cmd == "rev") {
      currentState = "MANUAL";
      // Left PWM = -180, Right PWM = -180
    }
    server.send(200, "text/plain", "OK: " + cmd);
  } else {
    server.send(400, "text/plain", "Missing c parameter");
  }
}

void setup() {
  Serial.begin(115200);

  // Setup SoftAP
  WiFi.softAP(ssid, password);
  Serial.println("Access Point Started.");
  Serial.print("IP Address: ");
  Serial.println(WiFi.softAPIP()); // Usually 192.168.4.1

  // Routes
  server.on("/", HTTP_GET, handleRoot);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/cmd", HTTP_GET, handleCmd);

  server.begin();
  Serial.println("HTTP Web Server running.");
}

void loop() {
  server.handleClient();
  
  // Simulated dynamic sensor updates (replace with real sensor reads)
  // currentDist = readUltrasonic();
  // currentYaw = readMPU6050();
}
