#pragma once

// Fill in for your network / MQTT broker before flashing.
// The edge_gateway (see /edge_gateway) subscribes on RIG_TELEMETRY_TOPIC
// and republishes into the twin_api ingestion endpoint.

#define WIFI_SSID        "your_wifi_name"
#define WIFI_PASSWORD    "your_wifi_password"

#define MQTT_BROKER_HOST "192.168.1.50"
#define MQTT_BROKER_PORT 1883
#define RIG_ID           "BW-RIG-001"

#define RIG_TELEMETRY_TOPIC   "drava/rig/BW-RIG-001/telemetry"
#define RIG_DYNOCARD_TOPIC    "drava/rig/BW-RIG-001/dynocard"
#define RIG_COMMAND_TOPIC     "drava/rig/BW-RIG-001/command"

// Load cell calibration: raw HX711 counts -> Newtons.
// Determine SCALE_FACTOR empirically: hang a known weight on the rod,
// read raw counts, divide (raw - OFFSET) by the known force in Newtons.
#define HX711_OFFSET       8_450_000L
#define HX711_SCALE_FACTOR 21500.0f

// Encoder: pulses per crank revolution (check your specific encoder's PPR x4 quadrature)
#define ENCODER_PPR        600

// Heater / fluid temperature targets (deg C), standing in for the CSS heat/soak/cool cycle
#define TEMP_HEATING_TARGET_C   85.0f
#define TEMP_COOLING_FLOOR_C    35.0f

// Stroke speed control range (motor PWM duty, 0-255) and default target SPM
#define MOTOR_PWM_MIN      40
#define MOTOR_PWM_MAX      220
#define DEFAULT_TARGET_SPM 6.5f

// Telemetry publish interval
#define TELEMETRY_INTERVAL_MS 500
