# Drava operator console

Single-page React 19 + TypeScript + Vite application. It talks to the Drava API gateway
(`VITE_API_URL`) and to the inference service for live telemetry, dynamometer cards,
optimisation runs and the copilot drawer.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | install dependencies |
| `npm run dev` | dev server with hot reload |
| `npm run build` | type-check (`tsc -b`) and produce `dist/` |
| `npm run lint` | run oxlint |
| `npm run preview` | serve the production bundle locally |

## Layout

- `src/views/` - one file per screen or widget (overview, digital twin, optimisers, copilot, ...)
- `src/lib/` - API client and field model helpers
- `src/contracts/domain.ts` - shared TypeScript contracts mirroring the backend payloads
- `.env.example` - documents the deploy-time API URL
