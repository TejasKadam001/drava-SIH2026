# Hardware rig guide

A benchtop stand-in for a beam-pumped heavy-oil well. It exists so the digital twin can be fed, and commanded, by something physical.

## What it represents

| Field concept | Rig stand-in |
|---|---|
| Polished-rod load | Load cell on a moving rod, read by an HX711 |
| Crank position / stroke | Rotary encoder on the crank (600 pulses per revolution) |
| Reservoir fluid heating (steam) and cooling | Heater band driven by a solid-state relay; fluid temperature from a DS18B20 |
| VFD driving the pumping unit | DC motor through an H-bridge, speed held by a PID loop |
| Rod floating on a cold well | Heater target dropped to the cooling floor so the fluid thickens |

It is a scaled demonstration, not field equipment.

## Pinout (ESP32, `include/pins.h`)

| Function | Pin |
|---|---|
| HX711 DOUT / SCK | 16 / 17 |
| Encoder A / B | 18 / 19 |
| DS18B20 (1-Wire) | 4 |
| Heater SSR (PWM) | 25 |
| Motor PWM / DIR | 26 / 27 |
| Fault LED / Run LED | 2 / 15 |

The DS18B20 needs the usual 4.7 kΩ pull-up on its data line. Power the heater band and motor from their own supplies, sharing ground with the ESP32.

## Configuration (`include/config.h`)

| Setting | Default | Meaning |
|---|---|---|
| `WIFI_SSID`, `WIFI_PASSWORD` | placeholders | your network |
| `MQTT_BROKER_HOST`, `MQTT_BROKER_PORT` | `192.168.1.50`, 1883 | your broker |
| `RIG_ID` | `BW-RIG-001` | rig identifier |
| `HX711_OFFSET`, `HX711_SCALE_FACTOR` | 8,450,000 and 21,500 | load-cell calibration (replace with your own) |
| `ENCODER_PPR` | 600 | pulses per crank revolution |
| `TEMP_HEATING_TARGET_C` / `TEMP_COOLING_FLOOR_C` | 85 / 35 | heating and cooling setpoints |
| `MOTOR_PWM_MIN` / `MOTOR_PWM_MAX` | 40 / 220 | motor duty range |
| `DEFAULT_TARGET_SPM` | 6.5 | starting stroke speed |
| `TELEMETRY_INTERVAL_MS` | 500 | publish period |

**Never commit real Wi-Fi credentials.** Keep the placeholders in the repository and edit a local copy before flashing.

### Load-cell calibration
1. With nothing hanging, read the raw counts and set `HX711_OFFSET` to that value.
2. Hang a known weight, read the raw counts, and compute `(raw − offset) / force_in_newtons`.
3. Put that ratio in `HX711_SCALE_FACTOR`, reflash, and check a second known weight.

## Control (on the ESP32)

- **Heater PID** holds fluid temperature at the commanded target.
- **Motor PID** holds stroke speed at the commanded SPM.
- **Rod-float heuristic:** flags a stroke whose total load swing is under 6 N (a healthy stroke swings much more) combined with a stroke period slower than expected for the target SPM (slower than 60 000 ms divided by 0.6 × target SPM).
- The decision of *what* the targets should be is made upstream by the planner; PID only holds them.

## MQTT contract

Base topic: `drava/rig/BW-RIG-001/`

| Topic | Direction | Payload |
|---|---|---|
| `telemetry` | rig → bridge | `rig_id`, `source`, `timestamp_ms`, `load_n`, `fluid_temp_c`, `spm_actual`, `spm_target`, `heater_phase` (`HEATING` or `COOLING_DEMO`), `rod_floating_detected` (every 500 ms) |
| `dynocard` | rig → bridge | `card_points`: list of `{angle_deg, load_n}` per stroke |
| `command` | bridge/operator → rig | any of `target_spm`, `target_temp_c`, `cool_down_demo` (boolean) |

The bridge (`edge_gateway/mqtt_to_api_bridge.py`) subscribes to the first two and posts to `/v1/rig/{well_id}/telemetry` and `/v1/rig/{well_id}/dynocard` on the inference service, mapping the rig to the demo well `BW-DEMO-001`.

## Bring-up checklist

1. Flash the firmware (`pio run -t upload`) and watch the serial monitor at 115200 baud.
2. Start the MQTT broker and confirm the rig's messages appear on `drava/rig/BW-RIG-001/telemetry`.
3. Start the inference service, then `python mqtt_to_api_bridge.py`.
4. `curl http://127.0.0.1:8000/v1/wells/BW-DEMO-001/data-mode` should report `LIVE_HARDWARE`.
5. Open the console; the data badge should read live and the dynamometer card should show measured points.
6. Publish `{"cool_down_demo": true}` to `command` and watch the card change over the next strokes.

## Safety notes

- Keep the heater band under a thermostat or fuse independent of the firmware.
- Guard the moving rod and crank; the motor can start from a remote command.
- If telemetry stops, the API returns to simulation after 5 seconds — treat the console badge as the source of truth for what you are looking at.

## Status

The firmware and bridge code are in the repository. They were not exercised against hardware in the v2.0 verification run (see `docs/validation-status.md`).
