"""
Drava: Core API & Machine Learning Microservice
======================================================
FastAPI service exposing physics models, hybrid ML predictors, multi-objective Pareto optimizer,
real-time telemetry simulation, and WebSocket channels.
"""

import asyncio
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml_service.config import config
from ml_service.simulator.telemetry_simulator import TelemetrySimulator
from ml_service.models.production_forecaster import ProductionForecaster
from ml_service.models.failure_predictor import FailurePredictor
from ml_service.models.anomaly_detector import AnomalyDetector
from ml_service.optimizer.pareto_optimizer import ParetoOptimizer
from ml_service.live_data_manager import live_data_manager
from physics.viscosity_model import ViscosityModel
from physics.thermal_model import ThermalModel
from physics.srp_model import SRPModel
from physics.decline_curve import DeclineCurveAnalyzer
from agent.agent_supervisor import AgentSupervisor

app = FastAPI(
    title="Drava: Well-to-Surface Digital Twin API",
    description="SIH 2026 Problem SIH26120: AI-Enabled Digital Twin for CSS + SRP Joint Optimization (Baghewala Field, Oil India Limited)",
    version=config.version,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singletons
simulator = TelemetrySimulator()
prod_forecaster = ProductionForecaster()
failure_predictor = FailurePredictor()
anomaly_detector = AnomalyDetector()
optimizer = ParetoOptimizer()
visc_model = ViscosityModel()
thermal_model = ThermalModel()
srp_model = SRPModel()
decline_curve = DeclineCurveAnalyzer()
agent = AgentSupervisor()


# --- Pydantic Request Models ---
class ProductionPredictRequest(BaseModel):
    temperature_c: float = 78.0
    pressure_bar: float = 52.0
    spm: float = 6.5
    stroke_length_m: float = 2.4
    days_since_injection: int = 50
    recent_oil_rate_bpd: float = 95.0


class FailurePredictRequest(BaseModel):
    stroke_length_m: float = 2.4
    spm: float = 7.0
    temperature_c: float = 70.0
    pressure_bar: float = 52.0
    days_in_production: int = 60


class AnomalyDetectRequest(BaseModel):
    temperature_c: float = 75.0
    pressure_bar: float = 50.0
    pprl_lbs: float = 14500.0
    mprl_lbs: float = 3200.0
    oil_rate_bpd: float = 90.0
    motor_power_kw: float = 18.0


class ViscosityPredictRequest(BaseModel):
    temperature_c: float = 47.0
    pressure_bar: float = 55.0


class TemperaturePredictRequest(BaseModel):
    peak_temperature_c: float = 195.0
    day: int = 45


class CSSSimulateRequest(BaseModel):
    steam_mass_tons: float = 2400.0
    soak_days: float = 6.0


class SRPSimulateRequest(BaseModel):
    stroke_length_m: float = 2.4
    spm: float = 6.5
    avg_viscosity_cp: float = 250.0


class ScenarioRequest(BaseModel):
    steam_volume: float = 2400.0
    injection_pressure: float = 80.0
    soak_time: float = 6.0
    production_cutoff: float = 115.0
    stroke_length: float = 2.4
    spm: float = 6.5
    vfd: float = 42.0


class OptimizeRequest(BaseModel):
    well_id: str = "BW-DEMO-001"
    weight_production: float = 0.40
    weight_sor: float = 0.25
    weight_energy: float = 0.15
    weight_risk: float = 0.20


class CopilotQueryRequest(BaseModel):
    query: str
    well_id: str = "BW-DEMO-001"


class LiveTelemetryIngest(BaseModel):
    rig_id: str
    source: str = "LIVE_HARDWARE"
    timestamp_ms: int
    load_n: float
    fluid_temp_c: float
    spm_actual: float
    spm_target: float
    heater_phase: str
    rod_floating_detected: bool


class LiveDynoCardIngest(BaseModel):
    rig_id: str
    source: str = "LIVE_HARDWARE"
    card_points: List[Dict[str, Any]]


class DeclineCurveRequest(BaseModel):
    days: List[float]
    rates_bpd: List[float]
    economic_limit_bpd: float = 5.0


# --- REST Endpoints ---

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "UP",
        "service": config.service_name,
        "version": config.version,
        "data_mode": "SIMULATION / RESEARCH BENCHMARK",
        "disclaimer": "SIMULATED / SYNTHETIC - NOT OIL INDIA FIELD DATA"
    }


@app.get("/models", tags=["System"])
def list_models():
    return {
        "models": [
            {
                "name": "hybrid_production_forecaster",
                "version": "v1.4.0",
                "type": "Darcy/API11L Physics + Ridge Residual",
                "status": "HEALTHY",
                "mae": 4.2
            },
            {
                "name": "failure_intelligence_risk",
                "version": "v1.4.0",
                "type": "API 11L Kinematics + Goodman Fatigue Stress",
                "status": "HEALTHY",
                "calibration": "CALIBRATED"
            },
            {
                "name": "telemetry_anomaly_detector",
                "version": "v1.4.0",
                "type": "Isolation Forest + Multi-variate Z-Score",
                "status": "HEALTHY"
            },
            {
                "name": "thermal_dissipation_model",
                "version": "v1.4.0",
                "type": "Marx-Langenheim Energy Balance",
                "status": "HEALTHY"
            }
        ]
    }


# --- Well State & Telemetry Endpoints ---

@app.get("/api/wells", tags=["Wells"])
def get_wells():
    wells_list = []
    for wid, w in simulator.wells_state.items():
        wells_list.append({
            "well_id": wid,
            "name": w["name"],
            "depth_m": w["depth_m"],
            "pump_depth_m": w["pump_depth_m"],
            "cycle_number": w["cycle_number"],
            "days_in_production": w["days_in_production"],
            "status": "ACTIVE_PRODUCTION"
        })
    return {"wells": wells_list}


@app.get("/api/wells/{well_id}", tags=["Wells"])
def get_well_details(well_id: str):
    if well_id not in simulator.wells_state:
        raise HTTPException(status_code=404, detail="Well not found")
    return {"well": simulator.wells_state[well_id]}


@app.get("/api/wells/{well_id}/state", tags=["Wells"])
def get_well_digital_twin_state(well_id: str):
    return get_latest_telemetry(well_id)


@app.get("/api/wells/{well_id}/telemetry", tags=["Telemetry"])
def get_latest_telemetry(well_id: str):
    """
    Live-hardware-first telemetry. If the rig has published within the last
    few seconds (via edge_gateway -> /ingest/telemetry), that real reading is
    served, clearly tagged LIVE_HARDWARE. Otherwise this falls back to the
    physics simulator, tagged SIMULATION, same shape either way so the
    frontend never has to know which one it's looking at, but the badge
    always tells the truth.
    """
    frame = simulator.generate_current_telemetry(well_id)
    if live_data_manager.is_live(well_id):
        # Overlay the rig's measured values onto a full frame, so the response
        # keeps the exact same shape the frontend expects. Fields the rig can't
        # measure (reservoir pressure, cumulative oil, ...) stay model-derived.
        rig = live_data_manager.get_telemetry(well_id)
        frame["data_source_mode"] = "LIVE_HARDWARE"
        frame["scientific_honesty_disclaimer"] = (
            "Rod load, stroke speed, temperature and rod-floating flag measured on the "
            "physical benchtop rig; remaining fields are model-derived."
        )
        frame["srp_operating_state"]["spm"] = rig["spm_actual"]
        frame["srp_operating_state"]["spm_target"] = rig["spm_target"]
        frame["srp_operating_state"]["load_n"] = rig["load_n"]
        frame["srp_operating_state"]["rod_floating_detected"] = rig["rod_floating_detected"]
        frame["thermal_state"]["reservoir_temperature_c"] = rig["fluid_temp_c"]
        frame["thermal_state"]["heater_phase"] = rig["heater_phase"]
    return frame


@app.get("/api/wells/{well_id}/data-mode", tags=["Telemetry"])
def get_data_mode(well_id: str):
    """Quick check: is this well currently reporting from the physical rig or the simulator?"""
    live = live_data_manager.is_live(well_id)
    return {
        "well_id": well_id,
        "mode": "LIVE_HARDWARE" if live else "SIMULATION",
        "rig_last_seen_recently": live,
    }


@app.post("/ingest/telemetry/{well_id}", tags=["Hardware Ingestion"])
def ingest_live_telemetry(well_id: str, payload: LiveTelemetryIngest):
    """Called by edge_gateway/mqtt_to_api_bridge.py, never by the frontend directly."""
    live_data_manager.ingest_telemetry(well_id, payload.dict())
    return {"accepted": True, "well_id": well_id}


@app.post("/ingest/dynocard/{well_id}", tags=["Hardware Ingestion"])
def ingest_live_dynocard(well_id: str, payload: LiveDynoCardIngest):
    """Called by edge_gateway/mqtt_to_api_bridge.py, never by the frontend directly."""
    live_data_manager.ingest_dynocard(well_id, payload.card_points)
    return {"accepted": True, "well_id": well_id, "points": len(payload.card_points)}


@app.get("/api/wells/{well_id}/production", tags=["Telemetry"])
def get_well_production_history(well_id: str, days: int = Query(60, ge=10, le=180)):
    return {"history": simulator.generate_historical_time_series(well_id, days)}


@app.get("/api/wells/{well_id}/css", tags=["CSS"])
def get_well_css_history(well_id: str):
    return agent.get_css_history(well_id)


@app.get("/api/wells/{well_id}/srp", tags=["SRP"])
def get_well_srp_history(well_id: str):
    return agent.get_srp_history(well_id)


@app.get("/api/wells/{well_id}/srp/dyno-card", tags=["SRP"])
def get_dynamometer_card(well_id: str):
    if live_data_manager.is_dynocard_live(well_id):
        return {
            "well_id": well_id,
            "data_source_mode": "LIVE_HARDWARE",
            "card_points": live_data_manager.get_dynocard(well_id),
        }

    state = simulator.generate_current_telemetry(well_id)
    stroke_m = state["srp_operating_state"]["stroke_length_m"]
    spm = state["srp_operating_state"]["spm"]
    visc = state["fluid_state"]["estimated_viscosity_cp"]
    card_points = srp_model.generate_dynamometer_card(stroke_m, spm, visc)
    return {
        "well_id": well_id,
        "data_source_mode": "SIMULATION",
        "stroke_length_m": stroke_m,
        "spm": spm,
        "viscosity_cp": visc,
        "rod_floating_detected": state["srp_operating_state"]["rod_floating_detected"],
        "card_points": card_points
    }


# --- Prediction Endpoints ---

@app.post("/predict/production", tags=["ML Predictions"])
def predict_production_endpoint(req: ProductionPredictRequest):
    return prod_forecaster.predict(
        req.temperature_c, req.pressure_bar, req.spm, req.stroke_length_m,
        req.days_since_injection, req.recent_oil_rate_bpd
    )


@app.post("/predict/failure", tags=["ML Predictions"])
def predict_failure_endpoint(req: FailurePredictRequest):
    return failure_predictor.predict_failure_risks(
        req.stroke_length_m, req.spm, req.temperature_c, req.pressure_bar, req.days_in_production
    )


@app.post("/predict/viscosity", tags=["ML Predictions"])
def predict_viscosity_endpoint(req: ViscosityPredictRequest):
    visc = visc_model.calculate_viscosity(req.temperature_c, req.pressure_bar)
    mob = visc_model.calculate_mobility(req.temperature_c, pressure_bar=req.pressure_bar)
    return {
        "temperature_c": req.temperature_c,
        "viscosity_cp": visc,
        "darcy_mobility_md_cp": mob,
        "formulation": "Walther / ASTM D341 calibrated on Baghewala crude"
    }


@app.post("/predict/temperature", tags=["ML Predictions"])
def predict_temperature_endpoint(req: TemperaturePredictRequest):
    temp = thermal_model.predict_temperature_at_day(float(req.day), req.peak_temperature_c)
    return {
        "peak_temperature_c": req.peak_temperature_c,
        "day": req.day,
        "predicted_reservoir_temperature_c": temp
    }


@app.post("/predict/decline-curve", tags=["ML Predictions"])
def predict_decline_curve_endpoint(req: DeclineCurveRequest):
    """
    Arps Decline Curve Analysis (industry standard, not a custom model):
    fits a hyperbolic/exponential decline to a rate-vs-time history and
    returns Estimated Ultimate Recovery (EUR) and time to economic limit.
    """
    return decline_curve.analyze(req.days, req.rates_bpd, req.economic_limit_bpd)


@app.get("/api/wells/{well_id}/decline-curve", tags=["ML Predictions"])
def get_well_decline_curve(well_id: str, days: int = Query(90, ge=10, le=365),
                            economic_limit_bpd: float = Query(5.0, ge=0.1, le=100.0)):
    """
    Convenience wrapper: pulls this well's own production history (live-rig
    stroke log if the rig has been running, otherwise the simulator's
    history) and runs Decline Curve Analysis on it directly.
    """
    stroke_log = live_data_manager.get_stroke_log(well_id)
    if len(stroke_log) >= 30:
        # Real measured strokes: convert elapsed time to days and use spm_actual
        # as a stand-in production-rate signal for the demo session.
        t0 = stroke_log[0]["t"]
        history_days = [(s["t"] - t0) / 86400.0 for s in stroke_log]
        history_rates = [float(s.get("spm_actual") or 0.0) for s in stroke_log]
        source = "LIVE_HARDWARE_STROKE_LOG"
    else:
        history = simulator.generate_historical_time_series(well_id, days)
        history_days = [h["day"] for h in history]
        history_rates = [h["oil_rate_bpd"] for h in history]
        source = "SIMULATION"

    result = decline_curve.analyze(history_days, history_rates, economic_limit_bpd)
    result["data_source_mode"] = source
    return result


@app.post("/detect/anomaly", tags=["ML Predictions"])
def detect_anomaly_endpoint(req: AnomalyDetectRequest):
    return anomaly_detector.detect(
        req.temperature_c, req.pressure_bar, req.pprl_lbs, req.mprl_lbs,
        req.oil_rate_bpd, req.motor_power_kw
    )


# --- Simulation & What-If Endpoints ---

@app.post("/simulate/css", tags=["Simulation"])
def simulate_css_endpoint(req: CSSSimulateRequest):
    res = thermal_model.calculate_peak_temperature(req.steam_mass_tons, req.soak_days)
    cooling_curve = thermal_model.generate_cooling_curve(res["peak_temperature_c"], max_days=180, step_days=10)
    return {
        "peak_metrics": res,
        "cooling_projection": cooling_curve
    }


@app.post("/simulate/srp", tags=["Simulation"])
def simulate_srp_endpoint(req: SRPSimulateRequest):
    perf = srp_model.evaluate_srp_performance(req.stroke_length_m, req.spm, req.avg_viscosity_cp)
    dyno = srp_model.generate_dynamometer_card(req.stroke_length_m, req.spm, req.avg_viscosity_cp)
    return {
        "performance": perf,
        "dynamometer_card": dyno
    }


@app.post("/simulate/scenario", tags=["Simulation"])
def simulate_scenario_endpoint(req: ScenarioRequest):
    return optimizer.evaluate_candidate(
        req.steam_volume, req.soak_time, req.stroke_length, req.spm
    )


# --- Optimization Endpoints ---

@app.post("/optimize", tags=["Optimization"])
@app.post("/optimize/joint", tags=["Optimization"])
def run_optimization_endpoint(req: OptimizeRequest):
    return agent.optimize_operations(
        req.well_id, req.weight_production, req.weight_sor, req.weight_energy, req.weight_risk
    )


# --- Agentic AI Copilot Endpoint ---

@app.post("/api/copilot/query", tags=["Agentic AI"])
@app.post("/agent/query", tags=["Agentic AI"])
def query_copilot(req: CopilotQueryRequest):
    return agent.handle_user_query(req.query, req.well_id)


# --- WebSocket Streaming Endpoint ---

@app.websocket("/ws/telemetry/{well_id}")
async def websocket_telemetry_stream(websocket: WebSocket, well_id: str):
    await websocket.accept()
    try:
        while True:
            data = simulator.generate_current_telemetry(well_id)
            await websocket.send_json(data)
            await asyncio.sleep(2.0)  # Stream tick every 2 seconds
    except WebSocketDisconnect:
        pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=config.host, port=config.port, reload=False)
