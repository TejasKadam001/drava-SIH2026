# DRAVA V2.0 — DEVELOPMENT RUN REPORT
## Internal Rewrite, Package Restructure, Versioned `/v1` API and Documentation Set

**Problem Statement:** SIH26120 — AI-Enabled Well-to-Surface Digital Twin for CSS + SRP Optimization (Oil India Limited)  
**Project:** DRAVA  
**Version:** V2.0.0  
**Date:** September 30, 2026  
**Status:** ALL CHECKS PASSING (Python 14/14 · Spring context boots, Flyway V1+V2 applied · TypeScript 0 errors · Vite build clean · regression comparison identical)

---

## 1. Executive Summary

This run took the working v1.x system and made it the project's own, without changing what it does. Seven pieces of work:

1. **Restructured the repository** — every top-level package and most modules were renamed so the layout describes this project (`wellphysics/`, `twin_api/`, `copilot/`, `gateway/`, `deploy/`, `params/`, `datasets/`).
2. **Moved to a versioned API** — every route now lives under `/v1/...` (Java gateway under `/gw/...`), with duplicate aliases removed and every caller updated.
3. **Rewrote the internals** — physics, ML, planner, simulator, copilot, training, Spring Boot layer, SQL migrations and most console views, keeping the same maths and outputs.
4. **Corrected claims to match the code** — the optimizer is a grid search, the copilot is rule-based, and unmeasured benchmark numbers were removed.
5. **Fixed two defects found on the way** — a config-key mismatch in the Java gateway and a silent untrained-model fallback introduced mid-rename.
6. **Proved behaviour was preserved** — an old-vs-new regression harness compared outputs across every layer.
7. **Wrote the project documentation set** — README, INSTALL, CHANGELOG, PUSH_LOG, project report, this report, and validation, model-card and hardware docs.

---

## 2. Detailed Implementation Breakdown

### 2.1 Repository restructure

| Before | After | Notes |
|---|---|---|
| `physics/` | `wellphysics/` | modules: `viscosity`, `reservoir_heat`, `wellbore`, `rod_pump`, `decline` |
| `ml_service/` | `twin_api/` | `models/`→`learners/`, `optimizer/`→`planner/`, `simulator/`→`synthetic/`, `saved_models/`→`artefacts/`, `api/`→`routes/` |
| `agent/agent_supervisor.py` | `copilot/router.py` | |
| `backend/springboot/` | `gateway/` | Java packages `web`, `upstream`, `messaging` |
| `docker/` | `deploy/` | Dockerfiles renamed `inference`, `gateway`, `console` |
| `config/physics.yaml` | `params/well.yaml` | |
| `data/sources/dataset_sources.yaml` | `datasets/registry.yaml` | |
| `frontend/src/{components,services,types}` | `frontend/src/{views,lib,contracts}` | |
| `scripts/{test_all,train_models,seed_database,run_all_local}` | `scripts/{check_all,retrain,demo_wells,start_local}` | |
| `docs/01-…19-*.md` | topic-named docs | e.g. `architecture.md`, `pump-model.md`, `qna.md` |

Classes: `RodPump`, `CrudeViscosity`, `ReservoirHeat`, `WellboreColumn`, `RateForecaster`, `FailureScorer`, `FrameWatch`, `PlanSearch`, `SyntheticFeed`, `CopilotRouter`.

The rename was scripted (`rename.py`: directory moves, then ordered regex substitutions across text files) and followed by manual fixes for things a text substitution cannot express — hard-coded path joins, Dockerfile `COPY` lines, nginx routing and the removal of duplicate route decorators.

### 2.2 Versioned API

| Old | New |
|---|---|
| `/health`, `/models` | `/v1/status`, `/v1/models` |
| `/api/wells/…` | `/v1/wells/…` |
| `/predict/production` · `/predict/failure` · `/predict/viscosity` · `/predict/temperature` · `/predict/decline-curve` | `/v1/forecast/rate` · `/v1/risk/failure` · `/v1/fluid/viscosity` · `/v1/reservoir/temperature` · `/v1/forecast/decline` |
| `/detect/anomaly` | `/v1/risk/anomaly` |
| `/simulate/css` · `/simulate/srp` · `/simulate/scenario` | `/v1/sim/steam` · `/v1/sim/pump` · `/v1/sim/scenario` |
| `/optimize`, `/optimize/joint` | `/v1/plan/joint` |
| `/api/copilot/query`, `/agent/query` | `/v1/assistant/ask` |
| `/ingest/telemetry/{id}`, `/ingest/dynocard/{id}` | `/v1/rig/{id}/telemetry`, `/v1/rig/{id}/dynocard` |
| `/ws/telemetry/{id}` | `/v1/stream/{id}` |
| Java `/api/wells`, `/api/optimization/run`, `/api/copilot/query` | `/gw/wells`, `/gw/plan/run`, `/gw/assistant/query` |

Updated in step: the Python routers, Java `InferenceClient` and controllers, nginx (`/gw/` and `/v1/` locations with WebSocket upgrade), Compose and CI health checks, the edge bridge, the frontend client and the docs.

### 2.3 Python rewrite
- **Physics:** shared helpers and named constants replace inline numbers; `RodPump` split into kinematics, resistance, performance and card generation.
- **Learners:** artefact loading isolated in small helpers; hazard entries built by one function; forecaster horizon bands built by one function.
- **Planner:** `itertools.product` over the same grid in the same order (tie-breaking preserved); constraint checks and scoring extracted into methods.
- **Simulator:** demo-well table moved to a module-level constant and deep-copied per instance; random draws kept in the original order so seeded output is unchanged.
- **Copilot:** four answer builders (`_answer_recommendation`, `_answer_failure`, `_answer_forecast`, `_answer_summary`) behind one router.
- **Training:** dataset generation, per-model trainers and the driver separated; the random stream is unchanged so the dataset and metrics reproduce exactly.
- **API:** `main.py` only assembles the app; routes, payloads and shared instances are separate modules.

### 2.4 Spring Boot rewrite
`InferenceClient` funnels every upstream call through one `guarded(call, fallback)` helper; the controllers shrink to a few lines each; `StompBrokerSetup` keeps the same two endpoints. SQL migrations are regenerated with named constraints (`pk_`, `fk_`, `uq_`), tables grouped by area and lookup indexes (`ix_…`).

### 2.5 Console rewrite
Shared `ui.tsx` (labelled slider, stat tile, page header) removes repeated markup; the copilot drawer auto-scrolls and uses a `Bubble` component; the tour is data-driven; the failure view renders its four hazard cards from one table. The API client is split into `physics.ts` (client-side physics), `offline.ts` (fallback payloads) and `api.ts` (HTTP + fallback wrapper), re-exporting the physics helpers so existing imports keep working.

### 2.6 Honesty corrections
| Was | Now |
|---|---|
| "NSGA-II" / "SLSQP" in the UI and API label | "Constrained Multi-Objective Pareto Grid Search" |
| Five-strategy benchmark with accuracy percentages | Only metrics produced by `retrain.py`, labelled synthetic (`docs/evaluation.md`) |
| Copilot described as LLM-planned | Documented as a rule-based tool router |
| Tailwind listed in the README stack | Removed (not used) |

### 2.7 Documentation set added
`README.md`, `INSTALL.md`, `CHANGELOG.md`, `PUSH_LOG.md`, `SIH26120_PROJECT_REPORT.md`, this report, `docs/validation-status.md`, `docs/model-card.md`, `docs/hardware-rig.md`; every file in `docs/` rewritten.

---

## 3. Issues Found and Fixed During the Run

| # | Issue | Cause | Fix |
|---|---|---|---|
| 1 | Java gateway would not have read its configured upstream URL | The client read a config key whose prefix differed from the one in `application.yml` | Both use `drava.ml-service.url` |
| 2 | After the rename, the anomaly model reported `ONLINE_CALIBRATED` instead of `TRAINED` | A text substitution also rewrote the artefact filename inside a path string; the file on disk kept the old name, so loading failed and the code silently fell back | Renamed the artefact to `anomaly_watch.joblib`; regression comparison now matches; all three models report `TRAINED` |
| 3 | Duplicate route decorators after path substitution | Aliases (`/optimize` + `/optimize/joint`, `/api/copilot/query` + `/agent/query`) mapped to one new path | Kept a single decorator per route |
| 4 | `docs` cross-references broken by file renames | Numbered file names were referenced from other docs | Substituted every reference; re-checked with a stale-name sweep |
| 5 | Port 3000 occupied by another local project during the browser check | Vite falls back to the next free port | Verified on 3001; console works on any port (`INSTALL.md`) |

Issue 2 is the reason silent fallbacks matter: the service still "worked" but on a different model. The regression comparison, not the test suite, caught it.

---

## 4. Verification Results

### 4.1 Automated
```
python scripts/check_all.py     -> Ran 14 tests ... OK
mvn test (gateway)              -> DravaApplicationTests started; Flyway applied 2 migrations
tsc -b                          -> 0 errors
npm run build (vite)            -> built in ~0.3 s
npm run lint (oxlint)           -> no findings
python scripts/retrain.py       -> completes; metrics identical to the previous run
```

### 4.2 Regression comparison (old build vs new build, same inputs)
| Layer | Points compared | Result |
|---|---|---|
| Viscosity, thermal, wellbore | 71 | identical |
| Rod pump (grid of strokes × speeds × viscosities, incl. dyno cards) | 421 | identical |
| Rate forecaster, failure scorer, anomaly watch | 1,225 | identical |
| Planner and simulator (seeded) | 16 | identical |
| Copilot answers and tools | 24 | identical |
| Training dataset (400 rows) | full arrays | identical |
| HTTP API, routes mapped old→new, incl. rig ingest and live overlay | 38 | identical |
| Client-side TypeScript physics and offline payloads | 61 KB of JSON | identical |

Intended differences only: route paths, and the optimizer's `algorithm` label text.

### 4.3 Manual pass in the browser (live backend)
Overview, Autopilot, Digital twin, all four Decisions sub-tabs, Failure watch, Dynamometer, tour (step navigation), and the copilot (suggestion chip → real answer, auto-scroll). Pump-speed sliders moved risk from 9.4 % to 98.7 % as expected. Network log showed only `/v1/...` calls returning 200; no console errors.

### 4.4 Rig path
A telemetry frame posted to `/v1/rig/BW-DEMO-001/telemetry` flipped `data-mode` to `LIVE_HARDWARE`; the retired `/health` route returns 404 as expected.

---

## 5. What Was Not Verified

- Docker Compose end to end (images not built in this run).
- The Postgres path of the gateway (tests run on H2; the compose file does not set the driver and dialect variables — see `INSTALL.md` §3).
- Firmware and edge bridge on physical hardware.
- Any accuracy claim on real Oil India data.

---

## 6. Files and Effort

| Metric | Value |
|---|---|
| Changed paths in working tree | ~155 (renames + rewrites) |
| New documentation files | 9 |
| Tests | 13 → 14 |
| Behavioural changes | none, other than route paths and one label |
