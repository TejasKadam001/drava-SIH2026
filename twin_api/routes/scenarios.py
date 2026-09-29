"""What-if simulation, joint optimisation, copilot and the telemetry websocket."""

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from twin_api.instances import agent, optimizer, simulator, rod_pump, reservoir_heat
from twin_api.payloads import (
    CopilotQueryRequest, CSSSimulateRequest, OptimizeRequest,
    ScenarioRequest, SRPSimulateRequest,
)

router = APIRouter()

_STREAM_INTERVAL_S = 2.0


@router.post("/v1/sim/steam", tags=["Simulation"])
def simulate_css(req: CSSSimulateRequest):
    peak = reservoir_heat.calculate_peak_temperature(req.steam_mass_tons, req.soak_days)
    return {
        "peak_metrics": peak,
        "cooling_projection": reservoir_heat.generate_cooling_curve(
            peak["peak_temperature_c"], max_days=180, step_days=10),
    }


@router.post("/v1/sim/pump", tags=["Simulation"])
def simulate_srp(req: SRPSimulateRequest):
    args = (req.stroke_length_m, req.spm, req.avg_viscosity_cp)
    return {
        "performance": rod_pump.evaluate_srp_performance(*args),
        "dynamometer_card": rod_pump.generate_dynamometer_card(*args),
    }


@router.post("/v1/sim/scenario", tags=["Simulation"])
def simulate_scenario(req: ScenarioRequest):
    return optimizer.evaluate_candidate(req.steam_volume, req.soak_time, req.stroke_length, req.spm)


@router.post("/v1/plan/joint", tags=["Optimization"])
def optimise_joint(req: OptimizeRequest):
    return agent.optimize_operations(
        req.well_id, req.weight_production, req.weight_sor, req.weight_energy, req.weight_risk)


@router.post("/v1/assistant/ask", tags=["Agentic AI"])
def copilot_query(req: CopilotQueryRequest):
    return agent.handle_user_query(req.query, req.well_id)


@router.websocket("/v1/stream/{well_id}")
async def telemetry_stream(websocket: WebSocket, well_id: str):
    await websocket.accept()
    try:
        while True:
            await websocket.send_json(simulator.generate_current_telemetry(well_id))
            await asyncio.sleep(_STREAM_INTERVAL_S)
    except WebSocketDisconnect:
        pass
