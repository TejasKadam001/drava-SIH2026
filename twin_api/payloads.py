"""Request bodies accepted by the Drava inference API."""

from typing import Any, Dict, List

from pydantic import BaseModel


# ---- model inference ---------------------------------------------------------

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


class DeclineCurveRequest(BaseModel):
    days: List[float]
    rates_bpd: List[float]
    economic_limit_bpd: float = 5.0


# ---- simulation --------------------------------------------------------------

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


# ---- optimisation and copilot ------------------------------------------------

class OptimizeRequest(BaseModel):
    well_id: str = "BW-DEMO-001"
    weight_production: float = 0.40
    weight_sor: float = 0.25
    weight_energy: float = 0.15
    weight_risk: float = 0.20


class CopilotQueryRequest(BaseModel):
    query: str
    well_id: str = "BW-DEMO-001"


# ---- hardware ingestion ------------------------------------------------------

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
