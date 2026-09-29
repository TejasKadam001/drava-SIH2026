"""ML and physics point predictions."""

from fastapi import APIRouter

from twin_api.instances import (
    anomaly_watch, decline, failure_scorer,
    prod_forecaster, reservoir_heat, visc_model,
)
from twin_api.payloads import (
    AnomalyDetectRequest, DeclineCurveRequest, FailurePredictRequest,
    ProductionPredictRequest, TemperaturePredictRequest, ViscosityPredictRequest,
)

router = APIRouter()


@router.post("/v1/forecast/rate", tags=["ML Predictions"])
def predict_production(req: ProductionPredictRequest):
    return prod_forecaster.predict(
        req.temperature_c, req.pressure_bar, req.spm, req.stroke_length_m,
        req.days_since_injection, req.recent_oil_rate_bpd)


@router.post("/v1/risk/failure", tags=["ML Predictions"])
def predict_failure(req: FailurePredictRequest):
    return failure_scorer.predict_failure_risks(
        req.stroke_length_m, req.spm, req.temperature_c, req.pressure_bar, req.days_in_production)


@router.post("/v1/fluid/viscosity", tags=["ML Predictions"])
def predict_viscosity(req: ViscosityPredictRequest):
    return {
        "temperature_c": req.temperature_c,
        "viscosity_cp": visc_model.calculate_viscosity(req.temperature_c, req.pressure_bar),
        "darcy_mobility_md_cp": visc_model.calculate_mobility(
            req.temperature_c, pressure_bar=req.pressure_bar),
        "formulation": "Walther / ASTM D341 calibrated on Baghewala crude",
    }


@router.post("/v1/reservoir/temperature", tags=["ML Predictions"])
def predict_temperature(req: TemperaturePredictRequest):
    return {
        "peak_temperature_c": req.peak_temperature_c,
        "day": req.day,
        "predicted_reservoir_temperature_c": reservoir_heat.predict_temperature_at_day(
            float(req.day), req.peak_temperature_c),
    }


@router.post("/v1/forecast/decline", tags=["ML Predictions"])
def predict_decline_curve(req: DeclineCurveRequest):
    """Arps decline fit on a rate history: EUR and time to the economic limit."""
    return decline.analyze(req.days, req.rates_bpd, req.economic_limit_bpd)


@router.post("/v1/risk/anomaly", tags=["ML Predictions"])
def detect_anomaly(req: AnomalyDetectRequest):
    return anomaly_watch.detect(
        req.temperature_c, req.pressure_bar, req.pprl_lbs, req.mprl_lbs,
        req.oil_rate_bpd, req.motor_power_kw)
