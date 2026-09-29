"""Well registry, telemetry (live rig first, simulator otherwise) and hardware ingestion."""

from fastapi import APIRouter, HTTPException, Query

from twin_api.rig_link import rig_link
from twin_api.instances import agent, decline, simulator, rod_pump
from twin_api.payloads import LiveDynoCardIngest, LiveTelemetryIngest

router = APIRouter()

_RIG_NOTE = (
    "Rod load, stroke speed, temperature and rod-floating flag measured on the "
    "physical benchtop rig; remaining fields are model-derived."
)


@router.get("/v1/wells", tags=["Wells"])
def list_wells():
    return {"wells": [
        {
            "well_id": well_id,
            "name": w["name"],
            "depth_m": w["depth_m"],
            "pump_depth_m": w["pump_depth_m"],
            "cycle_number": w["cycle_number"],
            "days_in_production": w["days_in_production"],
            "status": "ACTIVE_PRODUCTION",
        }
        for well_id, w in simulator.wells_state.items()
    ]}


@router.get("/v1/wells/{well_id}", tags=["Wells"])
def well_details(well_id: str):
    if well_id not in simulator.wells_state:
        raise HTTPException(status_code=404, detail="Well not found")
    return {"well": simulator.wells_state[well_id]}


@router.get("/v1/wells/{well_id}/telemetry", tags=["Telemetry"])
def latest_telemetry(well_id: str):
    """
    Live-hardware-first telemetry.

    When the rig has published within the last few seconds (edge_gateway ->
    /v1/rig/{id}/telemetry) its measurements are overlaid on a full frame and the frame
    is tagged LIVE_HARDWARE. Otherwise the physics simulator answers, tagged
    SIMULATION. The shape is identical either way; only the badge differs.
    """
    frame = simulator.generate_current_telemetry(well_id)
    if not rig_link.is_live(well_id):
        return frame

    rig = rig_link.get_telemetry(well_id)
    frame["data_source_mode"] = "LIVE_HARDWARE"
    frame["scientific_honesty_disclaimer"] = _RIG_NOTE

    pump = frame["srp_operating_state"]
    pump["spm"] = rig["spm_actual"]
    pump["spm_target"] = rig["spm_target"]
    pump["load_n"] = rig["load_n"]
    pump["rod_floating_detected"] = rig["rod_floating_detected"]

    frame["thermal_state"]["reservoir_temperature_c"] = rig["fluid_temp_c"]
    frame["thermal_state"]["heater_phase"] = rig["heater_phase"]
    return frame


@router.get("/v1/wells/{well_id}/state", tags=["Wells"])
def digital_twin_state(well_id: str):
    return latest_telemetry(well_id)


@router.get("/v1/wells/{well_id}/data-mode", tags=["Telemetry"])
def data_mode(well_id: str):
    """Is this well currently fed by the physical rig or by the simulator?"""
    live = rig_link.is_live(well_id)
    return {
        "well_id": well_id,
        "mode": "LIVE_HARDWARE" if live else "SIMULATION",
        "rig_last_seen_recently": live,
    }


@router.post("/v1/rig/{well_id}/telemetry", tags=["Hardware Ingestion"])
def ingest_telemetry(well_id: str, payload: LiveTelemetryIngest):
    """Posted by edge_gateway/mqtt_to_api_bridge.py, never by the browser."""
    rig_link.ingest_telemetry(well_id, payload.dict())
    return {"accepted": True, "well_id": well_id}


@router.post("/v1/rig/{well_id}/dynocard", tags=["Hardware Ingestion"])
def ingest_dynocard(well_id: str, payload: LiveDynoCardIngest):
    """Posted by edge_gateway/mqtt_to_api_bridge.py, never by the browser."""
    rig_link.ingest_dynocard(well_id, payload.card_points)
    return {"accepted": True, "well_id": well_id, "points": len(payload.card_points)}


@router.get("/v1/wells/{well_id}/production", tags=["Telemetry"])
def production_history(well_id: str, days: int = Query(60, ge=10, le=180)):
    return {"history": simulator.generate_historical_time_series(well_id, days)}


@router.get("/v1/wells/{well_id}/css", tags=["CSS"])
def css_history(well_id: str):
    return agent.get_css_history(well_id)


@router.get("/v1/wells/{well_id}/srp", tags=["SRP"])
def srp_history(well_id: str):
    return agent.get_srp_history(well_id)


@router.get("/v1/wells/{well_id}/srp/dyno-card", tags=["SRP"])
def dynamometer_card(well_id: str):
    if rig_link.is_dynocard_live(well_id):
        return {
            "well_id": well_id,
            "data_source_mode": "LIVE_HARDWARE",
            "card_points": rig_link.get_dynocard(well_id),
        }

    pump = simulator.generate_current_telemetry(well_id)
    op = pump["srp_operating_state"]
    viscosity = pump["fluid_state"]["estimated_viscosity_cp"]
    return {
        "well_id": well_id,
        "data_source_mode": "SIMULATION",
        "stroke_length_m": op["stroke_length_m"],
        "spm": op["spm"],
        "viscosity_cp": viscosity,
        "rod_floating_detected": op["rod_floating_detected"],
        "card_points": rod_pump.generate_dynamometer_card(
            op["stroke_length_m"], op["spm"], viscosity),
    }


@router.get("/v1/wells/{well_id}/decline-curve", tags=["ML Predictions"])
def well_decline_curve(well_id: str, days: int = Query(90, ge=10, le=365),
                       economic_limit_bpd: float = Query(5.0, ge=0.1, le=100.0)):
    """
    Arps decline analysis on this well's own history: the live-rig stroke log when
    the rig has been running, otherwise the simulator's production history.
    """
    strokes = rig_link.get_stroke_log(well_id)
    if len(strokes) >= 30:
        # Measured strokes: elapsed seconds -> days, spm_actual as the demo rate signal.
        t0 = strokes[0]["t"]
        x = [(s["t"] - t0) / 86400.0 for s in strokes]
        y = [float(s.get("spm_actual") or 0.0) for s in strokes]
        source = "LIVE_HARDWARE_STROKE_LOG"
    else:
        history = simulator.generate_historical_time_series(well_id, days)
        x = [row["day"] for row in history]
        y = [row["oil_rate_bpd"] for row in history]
        source = "SIMULATION"

    result = decline.analyze(x, y, economic_limit_bpd)
    result["data_source_mode"] = source
    return result
