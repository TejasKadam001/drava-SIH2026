# DRAVA — Installation & Run Guide

How to get every part of DRAVA running: the inference service, the operator console, the Spring Boot gateway, Docker, and the physical rig.

**Minimum to see the project working:** Part 1 + Part 2 (Python and Node only). Parts 3–5 are optional.

---

## 0. Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| Python | 3.12 or newer (3.13 tested) | inference service, tests, edge gateway |
| Node.js | 20 or newer (25 tested) + npm | operator console |
| Java JDK | 21 | Spring Boot gateway (optional) |
| Maven | 3.9 | gateway build (optional; the project has no wrapper) |
| Docker + Compose | recent | one-command stack (optional) |
| PlatformIO | recent | flashing the ESP32 rig (optional) |
| MQTT broker (e.g. Mosquitto) | any | rig → edge gateway (optional) |

Check versions:

```bash
python3 --version && node --version && java -version && mvn -version
```

---

## 1. Inference Service (Python)

```bash
# from the repository root
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt      # pulls twin_api/requirements.txt
```

### 1.1 Run the tests first

```bash
python scripts/check_all.py
```

Expected: `Ran 14 tests ... OK` and the banner `ALL Drava TESTS PASSED SUCCESSFULLY!`.

### 1.2 Start the service

```bash
uvicorn twin_api.main:app --host 127.0.0.1 --port 8000 --reload
```

| URL | What it is |
|---|---|
| http://127.0.0.1:8000/docs | Swagger UI |
| http://127.0.0.1:8000/v1/status | Health and data mode |
| http://127.0.0.1:8000/v1/models | Model catalogue |
| http://127.0.0.1:8000/v1/wells | The demo wells |

Quick smoke test:

```bash
curl http://127.0.0.1:8000/v1/wells/BW-DEMO-003/telemetry
curl -X POST http://127.0.0.1:8000/v1/plan/joint -H 'Content-Type: application/json' -d '{"well_id":"BW-DEMO-003"}'
```

### 1.3 Retrain the models (optional)

The trained artefacts are already in `twin_api/artefacts/`. To regenerate them and the metrics report:

```bash
python scripts/retrain.py            # about 30–60 seconds
```

Training is deterministic (seed 42), so the same metrics come out each time. If an artefact is missing, each model falls back to a physics-only or Ridge version and the service still starts.

---

## 2. Operator Console (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints. It prefers port 3000; if that is taken it uses the next free one (3001, …).

The console reads its API address from `VITE_API_URL` (default `http://localhost:8000`). To point it elsewhere:

```bash
cp .env.example .env.local
# edit VITE_API_URL=https://your-backend.example.com   (no trailing slash)
```

If the API is not running, the console still works using a client-side port of the physics, so you can develop the UI without the backend.

Other commands:

```bash
npm run build       # type-check (tsc -b) + production bundle in dist/
npm run lint        # oxlint
npm run preview     # serve the production bundle
```

---

## 3. Spring Boot Gateway (optional)

```bash
cd gateway
mvn test                              # boots the context and applies the Flyway migrations
mvn spring-boot:run                   # serves on :8080 (H2 in-memory database by default)
```

* Swagger UI: http://localhost:8080/swagger-ui.html
* Gateway routes: `/gw/wells/{id}/state`, `/gw/wells/{id}/srp/dyno-card`, `/gw/plan/run`, `/gw/assistant/query`
* The gateway calls the inference service at `ML_SERVICE_URL` (default `http://localhost:8000`).

To use PostgreSQL instead of H2, set `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.postgresql.Driver` and `SPRING_JPA_DATABASE_PLATFORM=org.hibernate.dialect.PostgreSQLDialect`. `application.yml` defaults both of the last two to H2, and the current `docker-compose.yml` does not set them, so add them to the `springboot` service before relying on the Postgres path. The Postgres route has not been exercised in this repository's tests, which run on H2.

---

## 4. Everything in Docker (optional)

```bash
docker compose up --build
```

| Service | Port | Image built from |
|---|---|---|
| console | 3000 | `deploy/Dockerfile.console` (nginx serves the bundle and proxies `/gw/` and `/v1/`) |
| springboot (gateway) | 8080 | `deploy/Dockerfile.gateway` |
| ml-service (inference) | 8000 | `deploy/Dockerfile.inference` |
| postgres (TimescaleDB, PG 16) | 5432 | `timescale/timescaledb:latest-pg16` |

The gateway waits for Postgres and the inference service to report healthy before starting. Default database credentials in `docker-compose.yml` (`drava_user` / `drava_dev_pw`) are **development-only** — change them for anything shared.

---

## 5. Physical Rig (optional)

### 5.1 Hardware to assemble

See [docs/hardware-rig.md](docs/hardware-rig.md) for the wiring table. In short: ESP32 + HX711 load cell, 600 PPR rotary encoder on the crank, DS18B20 in the fluid reservoir, SSR-driven heater band, and an H-bridge-driven DC motor.

### 5.2 Configure and flash

Edit `firmware/rig_controller/include/config.h`:

```c
#define WIFI_SSID        "your_wifi_name"
#define WIFI_PASSWORD    "your_wifi_password"
#define MQTT_BROKER_HOST "192.168.1.50"      // your broker's IP
```

Calibrate the load cell (`HX711_OFFSET`, `HX711_SCALE_FACTOR`) by hanging a known weight on the rod and dividing (raw − offset) by the force in newtons. Then:

```bash
cd firmware/rig_controller
pio run -t upload
pio device monitor        # 115200 baud
```

### 5.3 Run the bridge

```bash
cd edge_gateway
pip install -r requirements.txt
# make sure MQTT_BROKER_HOST in mqtt_to_api_bridge.py matches config.h
python mqtt_to_api_bridge.py
```

### 5.4 Confirm it is live

```bash
curl http://127.0.0.1:8000/v1/wells/BW-DEMO-001/data-mode
# {"well_id":"BW-DEMO-001","mode":"LIVE_HARDWARE","rig_last_seen_recently":true}
```

Live data goes stale after 5 seconds, at which point the API returns to `SIMULATION` automatically.

### 5.5 Trigger the demo fault

Publish to `drava/rig/BW-RIG-001/command`:

```json
{"cool_down_demo": true}
```

The heater target drops to the cooling floor, viscosity rises, and the rod-float flag appears on the dynamometer card within a few strokes. Publish `{"cool_down_demo": false}` to heat again, or `{"target_spm": 4.5}` to change the speed.

---

## 6. Windows Shortcut

```powershell
.\scripts\start_local.ps1
```

Runs the tests, starts the inference service minimised, then starts the console.

---

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| `ModuleNotFoundError: twin_api` | Run commands from the repository root with the virtualenv active |
| Console shows "offline" fallback numbers | The API is not reachable — check `uvicorn` is running and `VITE_API_URL` is right (it is read at build time, so rebuild after changing it) |
| Vite says "Port 3000 is in use" | It picked another port; use the URL it prints |
| `mvn: command not found` | Install Maven 3.9; the project does not ship a Maven wrapper |
| Model status says `ONLINE_CALIBRATED` | A `.joblib` file is missing from `twin_api/artefacts/` — run `python scripts/retrain.py` |
| Docker healthcheck keeps failing | Check the inference service log; the health URL is `/v1/status` |
| Rig stays `SIMULATION` | Broker address mismatch, bridge not running, or rig not publishing; watch the bridge log for "subscribed to …" |
