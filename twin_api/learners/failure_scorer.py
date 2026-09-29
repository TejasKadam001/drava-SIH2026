"""
Equipment failure risk model.

Four hazards are scored: rod floating, impact loading, parted rod (fatigue) and
pump unseating. Physics-derived probabilities are blended 50/50 with trained
classifiers when those artefacts are present. A normalised attribution table
explains which operating variable drives the risk.
"""

import math
import os
import sys
from typing import Any, Dict

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import joblib
import numpy as np

from wellphysics.rod_pump import RodPump
from wellphysics.viscosity import CrudeViscosity

_MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "artefacts")
_PHYSICS_ONLY = "PHYSICS_CALIBRATED (API RP 11L + Couette Shear)"
_THREAT_THRESHOLD = 0.45


def _band(probability: float) -> str:
    if probability < 0.15:
        return "LOW"
    if probability < 0.45:
        return "MEDIUM"
    if probability < 0.75:
        return "HIGH"
    return "CRITICAL"


def _risk_entry(probability: float) -> Dict[str, Any]:
    return {
        "probability": probability,
        "level": _band(probability),
        "is_active_threat": probability > _THREAT_THRESHOLD,
    }


class FailureScorer:
    """Multi-hazard failure intelligence for a rod-pumped well."""

    def __init__(self, version: str = "v1.4.0"):
        self.version = version
        self.rod_pump = RodPump()
        self.visc_model = CrudeViscosity()

        self.rf_classifier = None
        self.pr_classifier = None
        self.model_status = _PHYSICS_ONLY
        self._try_load_classifiers()

    def _try_load_classifiers(self) -> None:
        rf_path = os.path.join(_MODELS_DIR, "rod_floating_classifier.joblib")
        pr_path = os.path.join(_MODELS_DIR, "parted_rod_classifier.joblib")
        if not (os.path.exists(rf_path) and os.path.exists(pr_path)):
            return
        try:
            self.rf_classifier = joblib.load(rf_path)
            self.pr_classifier = joblib.load(pr_path)
            self.model_status = "TRAINED (Pre-trained RandomForest + GradientBoosting)"
        except Exception:
            self.model_status = _PHYSICS_ONLY

    def predict_failure_risks(self, stroke_length_m: float, spm: float, temp_c: float,
                              pressure_bar: float = 55.0, days_in_production: int = 45) -> Dict[str, Any]:
        """Failure probabilities, health score, loads and attribution for one operating point."""
        viscosity_cp = self.visc_model.calculate_viscosity(temp_c, pressure_bar)
        perf = self.rod_pump.evaluate_srp_performance(stroke_length_m, spm, viscosity_cp)

        float_risk = perf["rod_floating_risk"]
        impact_risk = perf["impact_loading_risk"]

        # Parted rod: Goodman stress ratio on a 7/8" rod, amplified by impact and well age.
        stress_psi = (perf["pprl_lbs"] - perf["mprl_lbs"]) * 4.0 / (math.pi * 0.875 ** 2)
        stress_ratio = stress_psi / 24000.0
        age_factor = 1.0 + min(0.6, days_in_production / 120.0 * 0.4)
        parted_raw = (stress_ratio * 0.4 + impact_risk * 0.6) * 0.18 * age_factor

        if self.rf_classifier is not None and self.pr_classifier is not None:
            try:
                x = np.array([[temp_c, viscosity_cp, spm, stroke_length_m, float(days_in_production)]])
                ml_float = float(self.rf_classifier.predict_proba(x)[0][1])
                ml_parted = float(self.pr_classifier.predict_proba(x)[0][1])
                float_risk = float(round(0.5 * float_risk + 0.5 * ml_float, 3))
                parted_raw = 0.5 * parted_raw + 0.5 * ml_parted
            except Exception:
                pass  # keep the physics-only numbers

        parted_risk = float(round(min(0.95, max(0.015, parted_raw)), 3))

        thrust_ratio = perf["viscous_drag_lbf"] / 4500.0  # seating-cup friction limit
        unseat_risk = float(round(min(0.85, max(0.01, thrust_ratio * 0.15)), 3))

        hazard = max(float_risk * 0.45, impact_risk * 0.35, parted_risk * 0.20)
        health = max(5.0, min(100.0, 100.0 * (1.0 - hazard)))

        drivers = {
            "Fluid Viscosity (Thermal Decay)": max(0.1, viscosity_cp / 3000.0),
            "Pumping Speed (SPM)": max(0.1, spm / 7.0),
            "Stroke Length & Inertia": max(0.1, stroke_length_m / 2.4),
        }
        total = sum(drivers.values())
        attribution = [
            {"feature": name, "contribution_pct": round(weight / total * 100.0, 1)}
            for name, weight in drivers.items()
        ]

        return {
            "model_version": self.version,
            "model_status": self.model_status,
            "overall_health_score": round(health, 1),
            "current_viscosity_cp": viscosity_cp,
            "risks": {
                "rod_floating": _risk_entry(float_risk),
                "impact_loading": _risk_entry(impact_risk),
                "parted_rod": _risk_entry(parted_risk),
                "pump_unseating": _risk_entry(unseat_risk),
            },
            "mechanical_loads": {
                "pprl_lbs": perf["pprl_lbs"],
                "mprl_lbs": perf["mprl_lbs"],
                "viscous_drag_lbf": perf["viscous_drag_lbf"],
                "net_downstroke_force_lbs": perf["net_downstroke_force_lbs"],
            },
            "feature_attribution_shap": attribution,
            "proactive_action_recommended": float_risk > _THREAT_THRESHOLD or parted_risk > 0.35,
            "recommended_action": (
                "Reduce VFD frequency / SPM by 1.5 - 2.5 to restore positive downstroke rod sinking margin"
                if float_risk > _THREAT_THRESHOLD
                else "Operating within safe mechanical envelope"
            ),
        }
