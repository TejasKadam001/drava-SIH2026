# Cloud deployment: Render + Vercel

Layout: the inference service runs on Render, the console on Vercel, and the console calls the service over HTTPS through `VITE_API_URL`.

```text
Vercel  (React console)  --HTTPS-->  Render  (FastAPI inference service)
   VITE_API_URL = https://<service>.onrender.com
```

Replace `<repo>` below with your own GitHub `owner/name`.

## 1. Inference service on Render

### Dashboard route
1. Sign in at render.com with GitHub.
2. **New +** > **Web Service** > *Build and deploy from a Git repository* > pick `<repo>`.
3. Settings:

   | Field | Value |
   | --- | --- |
   | Name | `drava-ml-service` (any unique name) |
   | Region | nearest to you |
   | Branch | `main` |
   | Root directory | blank |
   | Runtime | Python 3 |
   | Build command | `pip install -r twin_api/requirements.txt` |
   | Start command | `uvicorn twin_api.main:app --host 0.0.0.0 --port $PORT` |
   | Instance | Free |

4. Under **Environment**, add `PYTHON_VERSION = 3.12.0`.
5. Create the service (about 2-3 minutes). When it shows **Live**, open `https://<service>.onrender.com/docs` to confirm the API is up.

### Blueprint route
The repository's `render.yaml` describes both the inference service and the Spring gateway. In Render choose **New +** > **Blueprint**, select `<repo>`, and apply. Remove the gateway block if you only want the Python service.

## 2. Console on Vercel

1. Sign in at vercel.com with GitHub.
2. **Add New...** > **Project** > import `<repo>`.
3. Framework preset **Vite**; set **Root Directory** to `frontend`; keep the default build (`npm run build`) and output (`dist`).
4. Add an environment variable `VITE_API_URL` with your Render URL, no trailing slash.
5. Deploy (under a minute). Vercel gives you the production URL.

`frontend/vercel.json` rewrites every path to `index.html`, so refreshing a deep link does not 404.

## 3. Smoke test

- The navbar shows the live-stream indicator.
- Dynamometer view draws a card.
- Digital-twin slider recomputes temperature and viscosity.
- Optimiser button returns a plan.
- Copilot answers a question such as "Why did failure risk increase?".
- In browser dev tools > Network, requests go to your Render host.

## Tips

- **Cold starts.** Render's free tier sleeps after 15 minutes idle; the first request can take 30-50 seconds. The console has offline fallbacks so it stays usable. To keep the service warm, ping `/v1/status` every 10 minutes with a free uptime monitor.
- **CORS.** The service allows all origins, so any Vercel domain works.
- **Wrong data?** If the console shows no data, check `VITE_API_URL` first (it is read at build time, so redeploy after changing it).
