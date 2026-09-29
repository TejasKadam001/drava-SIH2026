# DRAVA — Push Log

A plain record of **what each push to the repository did and why**. One entry per push, newest first. Long-form write-ups for bigger pushes live in the `*_RUN_REPORT.md` files; versioned release notes are in [CHANGELOG.md](./CHANGELOG.md).

Remote: `github.com/TejasKadam001/drava-sih2026` · Branch: `main`

| # | Commit | Date | Version | Summary |
|---|---|---|---|---|
| 2 | *(pending — commit after review)* | 2026-09-30 | v2.0.0 | Rewrite, restructure and rename; `/v1` API; honest docs; project documentation set |
| 1 | `db21529` | 2026-09-29 | v1.0.0 + v1.1.0 | First commit: full twin stack, physical rig, live-data switch |

---

## Push 2 — Rewrite, restructure and documentation (v2.0.0)

**Status:** prepared in the working tree, not yet committed. Suggested commit message:

```
v2.0.0: restructure packages, versioned /v1 API, rewrite internals, add project docs
```

**Scope:** ~155 changed paths (renames and rewrites) plus new documentation files. Run report: [V2_0_RESTRUCTURE_RUN_REPORT.md](./V2_0_RESTRUCTURE_RUN_REPORT.md).

### What changed and why

| Area | What was done | Why |
|---|---|---|
| Structure | `physics/`→`wellphysics/`, `ml_service/`→`twin_api/`, `agent/`→`copilot/`, `backend/springboot/`→`gateway/`, `docker/`→`deploy/`, `config/`→`params/`, `data/sources/`→`datasets/`; modules and classes renamed | The project should have its own identity and a clear, self-explanatory layout |
| API | Every route moved to `/v1/...`; Java gateway to `/gw/...`; duplicate aliases removed; nginx, Docker health checks, CI smoke test, edge bridge and frontend client all updated | One versioned, consistent surface instead of a mix of prefixes |
| Python | Physics, ML, planner, simulator, copilot and training rewritten with the same maths; FastAPI app split into routers, payloads and instances | Readability and ownership of the code |
| Java | Gateway rewritten: one guarded-call helper, thin controllers, `StompBrokerSetup`; fixed config-key mismatch | Less repetition; fixes a latent bug |
| SQL | Migrations regenerated: named constraints, grouped tables, indexes | Clearer schema and faster lookups |
| Frontend | Copilot, tour, failure, dynamometer, scenario, Pareto, SRP and CSS views rewritten; shared `ui.tsx`; client split into `physics.ts`, `offline.ts`, `api.ts` | Maintainability; removes duplicated markup |
| Honesty | Optimizer labelled as grid search; unmeasured benchmarks removed; copilot documented as rule-based | Claims in docs and UI now match the code |
| Docs | New README, INSTALL, CHANGELOG, PUSH_LOG, project report, run report, validation status, model card, hardware guide; all `docs/` rewritten and renamed | Judges and reviewers can follow the project without asking |

### How it was verified
- 14/14 Python tests; Spring context boots and Flyway applies both migrations; `tsc -b`, `vite build` and `oxlint` clean.
- Old-vs-new regression comparison: identical outputs from physics, ML, planner, simulator, copilot and all 38 API calls (paths mapped to the new scheme).
- Manual pass through every screen against the live backend: no console errors; network calls hit the new routes.
- Rig ingest tested end to end with a posted telemetry frame flipping `data-mode` to `LIVE_HARDWARE`.

### Known follow-ups
- Docker Compose has not been run end to end; the gateway's Postgres route needs the driver/dialect variables (see INSTALL.md §3).
- Firmware and edge bridge were not exercised against real hardware in this push.
- Metrics remain synthetic-data metrics; a real-data benchmark needs Oil India or independent data.

---

## Push 1 — First commit (`db21529`, v1.0.0 + v1.1.0)

**Date:** 2026-09-29 19:59 IST · **Size:** 126 files, 12,831 insertions.

### What went in

| Area | Files | Contents |
|---|---|---|
| Console | 42 | React 19 + Vite + TypeScript app: overview, autopilot, field ranking, agents panel, digital twin with wellbore schematic, failure watch, dynamometer, optimisers, what-if lab, copilot drawer, tour |
| Inference service | 16 | FastAPI app, config, live-data manager, forecaster, failure model, anomaly detector, Pareto optimizer, telemetry simulator, training pipeline, four trained artefacts + metrics |
| Gateway | 11 | Spring Boot 3 app: controllers, upstream client, STOMP config, application.yml, Flyway V1 schema and V2 seed data, test |
| Physics | 6 | Viscosity, thermal, wellbore, rod-pump and decline-curve models |
| Hardware | 5 | ESP32 firmware: `main.cpp`, `pins.h`, `config.h`, `pid.h`, `platformio.ini` |
| Edge gateway | 2 | MQTT → REST bridge and its requirements |
| Docs | 21 | Technical dossier (problem, architecture, models, API, schema, testing, deployment, Q&A …) |
| Tests | 4 | Physics, ML service and decline-curve tests |
| Scripts / deploy | 8 | Test runner, training launcher, demo seeding, PowerShell launcher, three Dockerfiles, nginx config |
| Copilot | 1 | Rule-based tool router |
| Config and root files | 10 | Compose file, Render blueprint, CI workflow, physics parameters, data registry, root requirements, run guide, README, gitignore and related |

### Why this push
- Get the whole system under version control in one place before splitting work across the team.
- Establish the two things that set the project apart: a **physical rig feeding the same pipeline** as the simulator, and a **live/simulation switch** that labels every response truthfully.

### State at this push
- Tests: the Python suite passed (13 tests at that point).
- Docs and UI still used the earlier structure and several unverified claims that Push 2 corrects.

---

## Template for the next entry

```markdown
## Push N — <short title> (<commit hash>, vX.Y.Z)

**Date:** YYYY-MM-DD HH:MM · **Size:** <files changed>, +<insertions> / −<deletions>

### What changed and why
| Area | What was done | Why |
|---|---|---|

### How it was verified
- <tests run, screens checked, comparisons made>

### Known follow-ups
- <what is not done or not verified>
```

Get the numbers with `git show --stat --format='%h %ad' HEAD`.
