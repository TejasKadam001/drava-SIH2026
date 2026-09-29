# Running and deploying Drava

## Services

| Service | Port | Stack | Role |
| --- | --- | --- | --- |
| frontend | 3000 | React, Vite, nginx | operator console |
| springboot | 8080 | Spring Boot 3, Java 21 | API gateway and WebSocket broker |
| ml-service | 8000 | FastAPI, Uvicorn | physics, ML, optimiser, copilot |
| postgres | 5432 | TimescaleDB on PostgreSQL 16 | relational data and audit |

`docker-compose.yml` defines all four. The gateway waits for Postgres and the inference service to report healthy before it starts.

## With Docker

```bash
docker compose up --build
```

Then open `http://localhost:3000`.

## Without Docker (demo laptop, no internet)

```powershell
.\scripts\start_local.ps1      # Windows: tests, inference service, Vite console
```

On macOS or Linux see `run.md` for the equivalent commands.

## Cloud

`render.yaml` describes the two Render services and `frontend/vercel.json` the Vercel rewrite; `docs/cloud-hosting.md` walks through it.
