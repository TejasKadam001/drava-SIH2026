# DRAVA — Changelog

All notable changes to DRAVA are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Repository history: one commit so far (`db21529`, 2026-09-29, "first commit") holds v1.0.0 and v1.1.0 together. The v2.0.0 work below is applied to the working tree and is the next push — see [PUSH_LOG.md](./PUSH_LOG.md).

---

## [2.0.0] - 2026-09-30

### Original structure, new naming, new `/v1` API
- Renamed every top-level package and folder: `physics/` → `wellphysics/`, `ml_service/` → `twin_api/`, `agent/` → `copilot/`, `backend/springboot/` → `gateway/`, `docker/` → `deploy/`, `config/` → `params/`, `data/sources/` → `datasets/`.
- Renamed modules and classes (`RodPump`, `CrudeViscosity`, `ReservoirHeat`, `WellboreColumn`, `RateForecaster`, `FailureScorer`, `FrameWatch`, `PlanSearch`, `SyntheticFeed`, `CopilotRouter`) and frontend folders (`views/`, `lib/`, `contracts/`).
- Moved the whole HTTP surface to a versioned scheme: `/v1/forecast/*`, `/v1/risk/*`, `/v1/sim/*`, `/v1/plan/joint`, `/v1/assistant/ask`, `/v1/rig/{id}/*`, `/v1/stream/{id}`, `/v1/status`, `/v1/models`; the Java gateway now lives under `/gw/…`. Duplicate route aliases were removed.
- Docs renamed from numbered files to topic names.

### Code rewritten, behaviour preserved
- Rewrote the physics, ML, planner, simulator, copilot and training code with new structure and comments; formulas and constants are unchanged.
- Split the FastAPI app into `main.py` + `routes/` (`status`, `fleet`, `estimates`, `scenarios`) + `payloads.py` + `instances.py`.
- Rewrote the Spring Boot layer (`InferenceClient` with a single guarded-call helper, `StompBrokerSetup`, three thin controllers) and the SQL migrations (named constraints, regrouped tables, lookup indexes).
- Rewrote the CI workflow, Dockerfiles, nginx config, Compose credentials and gitignore files.
- Frontend: rewrote the copilot drawer, tour, failure, dynamometer, scenario lab, Pareto, SRP and CSS views; extracted shared `ui.tsx`; split the client into `physics.ts`, `offline.ts` and `api.ts`.
- Regression check: old and new builds produce identical outputs across the physics, ML, planner, simulator, copilot and API layers (the only intended differences are route paths and one label).

### Corrections to earlier claims
- Optimizer is a constrained **grid search**; labels that said "NSGA-II" / "SLSQP" now say so honestly.
- Removed an unmeasured benchmark table; `docs/evaluation.md` now reports only metrics produced by `scripts/retrain.py` on synthetic data.
- Copilot is documented as **rule-based**, not LLM-driven.
- README no longer lists Tailwind (not used).

### Fixed
- Java: the gateway client read its upstream URL from a config key whose prefix did not match the one defined in `application.yml`; both now use `drava.ml-service.url`.
- Renaming a model artefact inside a path string briefly caused a silent fallback to an untrained anomaly model; caught by the regression comparison and fixed (`anomaly_watch.joblib`).

### Added
- `README.md`, `INSTALL.md`, `CHANGELOG.md`, `PUSH_LOG.md`, `SIH26120_PROJECT_REPORT.md`, `V2_0_RESTRUCTURE_RUN_REPORT.md`, `docs/validation-status.md`, `docs/model-card.md`, `docs/hardware-rig.md`.
- Test suite grew from 13 to 14 tests.

---

## [1.1.0] - 2026-09-29

### Physical rig and live-data switch
- **ESP32 firmware** (`firmware/rig_controller`): HX711 load cell, 600 PPR crank encoder, DS18B20 fluid sensor, heater SSR PID, motor PWM PID, rod-floating heuristic, 500 ms MQTT telemetry, dyno-card publishing, and a command topic (`target_spm`, `target_temp_c`, `cool_down_demo`).
- **Edge gateway** (`edge_gateway/mqtt_to_api_bridge.py`): MQTT → REST bridge into the inference service.
- **Live data manager**: 5-second freshness switch between `LIVE_HARDWARE` and `SIMULATION`; every telemetry response reports which one it is; a stroke log feeds decline analysis.
- **Decline-curve analysis** (`decline_curve.py` → now `wellphysics/decline.py`): Arps hyperbolic/exponential fit, EUR and time-to-economic-limit, with tests.
- Data-mode endpoint, live-rig overlay on telemetry, live dyno card passthrough.

### Console
- New **Autopilot** view (Autonomous / Advisory modes, Sense → Predict → Decide → Act loop, decision log with undo), **Field** ranking view and **Agents** interlock panel, plus wellbore schematic, range bars and sub-tabs.
- Client-side port of the physics so every tab agrees with the backend, with an offline fallback when the API is unreachable.

---

## [1.0.0] - 2026-09-29

### Baseline well-to-surface twin
- Reservoir heat, viscosity, wellbore and rod-pump physics; production forecaster, failure model, anomaly detector; constrained Pareto planner; correlated telemetry simulator.
- FastAPI service, Spring Boot gateway with Flyway schema, React console, Docker Compose, Render/Vercel configs, GitHub Actions CI, technical docs.
- Built on an open reference design shared by a fellow SIH26120 team and used with the author's permission; the code has since been rewritten (v2.0.0).
