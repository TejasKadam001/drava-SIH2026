"""Drava inference service: application assembly.

Routes live in twin_api/routes/*, request bodies in payloads.py and the shared model
instances in instances.py. This module only wires them into a FastAPI app.
"""

import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from twin_api.config import config
from twin_api.routes import estimates, fleet, scenarios, status

app = FastAPI(
    title="Drava: Well-to-Surface Digital Twin API",
    description=("SIH 2026 Problem SIH26120: AI-Enabled Digital Twin for CSS + SRP Joint "
                 "Optimization (Baghewala Field, Oil India Limited)"),
    version=config.version,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (status, fleet, estimates, scenarios):
    app.include_router(module.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=config.host, port=config.port, reload=False)
