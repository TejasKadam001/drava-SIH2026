"""Service health and model catalogue."""

from fastapi import APIRouter

from twin_api.config import config

router = APIRouter()

_CATALOGUE = [
    {"name": "hybrid_production_forecaster", "version": "v1.4.0",
     "type": "Darcy/API11L Physics + Ridge Residual", "status": "HEALTHY", "mae": 4.2},
    {"name": "failure_intelligence_risk", "version": "v1.4.0",
     "type": "API 11L Kinematics + Goodman Fatigue Stress", "status": "HEALTHY",
     "calibration": "CALIBRATED"},
    {"name": "telemetry_anomaly_detector", "version": "v1.4.0",
     "type": "Isolation Forest + Multi-variate Z-Score", "status": "HEALTHY"},
    {"name": "thermal_dissipation_model", "version": "v1.4.0",
     "type": "Marx-Langenheim Energy Balance", "status": "HEALTHY"},
]


@router.get("/v1/status", tags=["System"])
def service_health():
    return {
        "status": "UP",
        "service": config.service_name,
        "version": config.version,
        "data_mode": "SIMULATION / RESEARCH BENCHMARK",
        "disclaimer": "SIMULATED / SYNTHETIC - NOT OIL INDIA FIELD DATA",
    }


@router.get("/v1/models", tags=["System"])
def model_catalogue():
    return {"models": _CATALOGUE}
