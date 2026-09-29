# Validation status

A frank list of what has been checked, how, and what has not. Updated for v2.0.0 (2026-09-30).

## Verified

| Area | How it was checked | Result |
|---|---|---|
| Physics invariants | `tests/test_reservoir_pump.py` — viscosity falls with temperature; peak-then-monotone cool-down that never drops below native; wellbore gradients; rod float appears for cold, fast pumping only; 40-point dyno card with positive loads | 5 / 5 |
| Learners, planner, copilot | `tests/test_learners.py` — forecast horizons with widening bands; cold fast well is high risk; anomaly detector passes healthy frame and flags overload; planner returns a converged plan with a frontier; copilot cites the tools it ran | 6 / 6 |
| Decline-curve analysis | `tests/test_decline.py` — fit recovers known parameters; monotone forecast; insufficient data reported explicitly | 3 / 3 |
| Gateway | `mvn test` boots the Spring context and applies both Flyway migrations on H2 | pass |
| Console | `tsc -b`, `vite build`, `oxlint` | clean |
| Behaviour after the v2.0 rewrite | old-vs-new regression comparison on physics, ML, planner, simulator, copilot, training data, client-side physics and 38 API calls | identical (see `V2_0_RESTRUCTURE_RUN_REPORT.md` §4.2) |
| Live-data switch | posting a rig frame flips `data-mode` to `LIVE_HARDWARE`; after 5 s of silence it returns to `SIMULATION` by design | works |
| UI | manual pass through every screen against the live backend, no console errors | works |

## Not verified

| Area | Status |
|---|---|
| Docker Compose end to end | Images not built in the latest run |
| Gateway on PostgreSQL | Tests use H2; compose does not set the driver and dialect variables |
| Firmware on real hardware | Code exists; not exercised in the latest run |
| Edge bridge against a real broker | Not exercised in the latest run |
| Accuracy on real wells | No field data available; all ML metrics are on synthetic data |
| Input-quality checks (timestamps, spikes, frozen sensors) | Designed, not implemented |
| Load / performance testing | Not done |

## How to reproduce

```bash
python scripts/check_all.py
cd gateway && mvn test
cd frontend && npm run build && npm run lint
python scripts/retrain.py        # regenerates twin_api/artefacts/training_metrics.json
```

## Reading the ML metrics correctly

All numbers in `docs/evaluation.md` and `docs/model-card.md` come from a dataset the project generated itself using the same physics the models consume. They show the training signal is learnable and the pipeline is deterministic. They do **not** show accuracy on Baghewala wells, and should not be quoted as such.
