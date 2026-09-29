# API reference

Two services expose HTTP. The **inference service** (FastAPI, port 8000) owns the models; the **gateway** (Spring Boot, port 8080) proxies a subset and falls back to labelled placeholder payloads if the inference service is down. Interactive docs: `http://localhost:8000/docs` and `http://localhost:8080/swagger-ui.html`.

## Inference service

### System
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v1/status` | liveness, version, data mode |
| GET | `/v1/models` | model catalogue |

### Wells and telemetry
| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v1/wells` | list wells |
| GET | `/v1/wells/{id}` | static well data |
| GET | `/v1/wells/{id}/telemetry` | latest frame, live rig first |
| GET | `/v1/wells/{id}/state` | same frame, digital-twin view |
| GET | `/v1/wells/{id}/data-mode` | `LIVE_HARDWARE` or `SIMULATION` |
| GET | `/v1/wells/{id}/production?days=60` | daily history (10-180 days) |
| GET | `/v1/wells/{id}/css` | steam-cycle history |
| GET | `/v1/wells/{id}/srp` | pump history |
| GET | `/v1/wells/{id}/srp/dyno-card` | dynamometer card |
| GET | `/v1/wells/{id}/decline-curve` | Arps decline analysis |
| POST | `/v1/rig/{id}/telemetry` | rig telemetry (used by the edge gateway) |
| POST | `/v1/rig/{id}/dynocard` | rig dynamometer card |

### Predictions
| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/v1/forecast/rate` | 1 / 7 / 30-day forecast |
| POST | `/v1/risk/failure` | four failure risks plus attribution |
| POST | `/v1/fluid/viscosity` | viscosity and mobility |
| POST | `/v1/reservoir/temperature` | reservoir temperature on a day |
| POST | `/v1/forecast/decline` | decline fit on supplied data |
| POST | `/v1/risk/anomaly` | anomaly verdict for one frame |

### Simulation, optimisation, copilot
| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/v1/sim/steam` | peak temperature and cooling curve |
| POST | `/v1/sim/pump` | pump performance and card |
| POST | `/v1/sim/scenario` | one what-if plan |
| POST | `/v1/plan/joint` | joint Pareto search |
| POST | `/v1/assistant/ask` | copilot question |
| WS | `/v1/stream/{id}` | frame every 2 seconds |

## Gateway (Spring Boot)

| Method | Path | Forwards to |
| --- | --- | --- |
| GET | `/gw/wells/{id}/state` | `/v1/wells/{id}/state` |
| GET | `/gw/wells/{id}/srp/dyno-card` | `/v1/wells/{id}/srp/dyno-card` |
| POST | `/gw/plan/run` | `/v1/plan/joint` |
| POST | `/gw/assistant/query` | `/v1/assistant/ask` |

The gateway also configures a STOMP broker (`/ws-stomp` with SockJS, `/ws-native` raw) with `/topic` for broadcasts and `/app` for inbound messages.
