# Data sources and honesty policy

## Three tiers

| Tier | What it is | Status |
| --- | --- | --- |
| A - public | Equinor Volve (CC BY 4.0), PetroBench dynamometer cards (MIT), SPE papers 39535 / 129198 / 165364 | used for baselines and validation |
| B - simulated | Drava's calibrated reservoir-wellbore-pump simulator | powers the demo |
| C - field adapters | CSV, PostgreSQL, REST and MQTT connectors for Oil India data | interfaces in place, waiting for authorised data |

The machine-readable registry is `datasets/registry.yaml`.

## The labelling rule

Simulated data is never presented as Oil India data. Every simulated frame carries

> SIMULATED / SYNTHETIC - NOT OIL INDIA FIELD DATA

and every telemetry response states its `data_source_mode`: `SIMULATION`, `LIVE_HARDWARE` (the physical benchtop rig) or `FALLBACK_OFFLINE` (backend could not reach the inference service).

## Where real measurements come from today

The ESP32 rig in `firmware/rig_controller` measures rod load, stroke speed and fluid temperature. `edge_gateway/mqtt_to_api_bridge.py` forwards them to `/v1/rig/{well_id}/telemetry`, and `twin_api/rig_link.py` serves them while they are fresh. Those fields are measured; everything else in the frame is still model-derived, and the response says so.

## Checks planned for incoming data

Timestamp order, physical range, spike detection, frozen-sensor detection, and unit consistency, ending in a GOOD / WARNING / REJECT quality flag. The simulator currently reports `data_quality_score: GOOD`; the checks themselves are not yet implemented.
