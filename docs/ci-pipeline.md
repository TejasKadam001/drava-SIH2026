# CI/CD pipeline

Defined in `.github/workflows/ci-cd.yml` and run by GitHub Actions on every push or pull request to `main` (and on demand). A new push cancels the previous run of the same branch.

```text
console ─┐
inference ├─> images ─> release-note   (main only)
gateway ─┘
```

| Job | What it does |
| --- | --- |
| `console` | Node 20; `npm install`; `npm run build` (type-check + Vite bundle); uploads `dist/` as the `console-bundle` artifact for 7 days |
| `inference` | Python 3.12; installs `twin_api/requirements.txt`; runs `python scripts/check_all.py`; boots the FastAPI app in a `TestClient` and asserts `GET /v1/status` returns 200 |
| `gateway` | Java 21 (Temurin); `mvn -B clean test`, which also boots the Spring context and applies the Flyway migrations |
| `images` | after the three jobs above pass, builds `Dockerfile.inference` and `Dockerfile.gateway` (matrix, no push) |
| `release-note` | on `main` only: prints a summary and, if the `RENDER_DEPLOY_HOOK_URL` secret is set, pings the Render deploy hook |

Vercel and Render deploy from the repository on their own; the workflow does not push to them.

## Optional Render deploy hook

1. In Render, open the service and copy its **Deploy Hook** URL.
2. In GitHub: **Settings > Secrets and variables > Actions > New repository secret**.
3. Name it `RENDER_DEPLOY_HOOK_URL` and paste the URL.

From then on a green run on `main` triggers a Render deploy.
