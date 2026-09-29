# Testing

Run everything with one command:

```bash
python scripts/check_all.py
```

The runner discovers `tests/test_*.py` with `unittest` and exits non-zero on failure. There are currently **14 tests**.

## What is covered

| File | Tests | What they assert |
| --- | --- | --- |
| `tests/test_reservoir_pump.py` | 5 | viscosity falls as temperature rises; thermal peak then monotone cool-down that never drops below native; wellbore profile gradients; rod float appears for cold, fast pumping and not for calm pumping; the dynamometer card has 40 positive-load points |
| `tests/test_learners.py` | 6 | forecast horizons with widening bands; failure model flags a cold, fast well; anomaly detector passes a healthy frame and flags an overload; optimiser returns a converged plan with a frontier; the copilot reports which tools it ran |
| `tests/test_decline.py` | 3 | the Arps fit recovers known parameters, the forecast declines monotonically, and too little data is reported rather than ignored |

The tests check physical invariants (direction of change, bounds) rather than stored numbers, so they keep working when a model is retrained.

## Backend

```bash
cd gateway
mvn test
```

`DravaApplicationTests` boots the Spring context, which also proves the Flyway migrations apply cleanly.

## Frontend

```bash
cd frontend
npm run build     # tsc -b, then vite build
npm run lint
```

## Continuous integration

`.github/workflows/ci-cd.yml` runs the console build, the Python suite plus a `/v1/status` smoke test, the Maven tests, and a Docker build check for the two backend images.
