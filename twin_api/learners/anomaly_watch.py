"""
Telemetry anomaly detection.

An Isolation Forest scores each six-signal frame; a handful of engineering rules
add named reasons (overload, rod float, parted rod, sensor / cold-injection fault).
The forest is loaded from disk when a trained artefact exists, otherwise it is
fitted on a synthetic "healthy well" baseline at start-up.
"""

import os
from typing import Any, Dict, List

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

_ARTEFACT = os.path.join(os.path.dirname(__file__), "..", "artefacts", "anomaly_watch.joblib")

_PPRL_LIMIT_LBS = 21000.0
_PPRL_CRITICAL_LBS = 22000.0
_MPRL_FLOOR_LBS = 600.0
_NATIVE_TEMP_C = 45.0


class FrameWatch:
    """Scores telemetry frames and explains why a frame looks abnormal."""

    def __init__(self, contamination: float = 0.05):
        self.model = self._load_trained()
        if self.model is not None:
            self.model_status = "TRAINED (Pre-trained IsolationForest)"
            return

        self.model = IsolationForest(contamination=contamination, random_state=42)
        self._fit_baseline()
        self.model_status = "ONLINE_CALIBRATED (IsolationForest)"

    @staticmethod
    def _load_trained():
        if not os.path.exists(_ARTEFACT):
            return None
        try:
            return joblib.load(_ARTEFACT)
        except Exception:
            return None

    def _fit_baseline(self):
        """Fit on synthetic healthy behaviour: temp, pressure, PPRL, MPRL, rate, power."""
        np.random.seed(42)
        n = 400
        healthy = np.column_stack([
            np.random.normal(85.0, 15.0, n),
            np.random.normal(48.0, 5.0, n),
            np.random.normal(14500.0, 1200.0, n),
            np.random.normal(3200.0, 500.0, n),
            np.random.normal(95.0, 15.0, n),
            np.random.normal(18.5, 3.0, n),
        ])
        self.model.fit(healthy)

    @staticmethod
    def _rule_findings(temp_c: float, pprl_lbs: float, mprl_lbs: float,
                       oil_rate_bpd: float, motor_power_kw: float) -> List[str]:
        findings = []
        if pprl_lbs > _PPRL_LIMIT_LBS:
            findings.append("Extreme Peak Polished Rod Load exceeding structural safety limits")
        if mprl_lbs < _MPRL_FLOOR_LBS:
            findings.append("Severe load drop on downstroke indicating probable rod floating")
        if oil_rate_bpd < 5.0 and motor_power_kw > 10.0:
            findings.append("High motor power with near-zero production (possible parted rod or pump unseating)")
        if temp_c < _NATIVE_TEMP_C:
            findings.append("Wellbore temperature below native geothermal equilibrium (sensor failure or cold injection)")
        return findings

    def detect(self, temp_c: float, pressure_bar: float, pprl_lbs: float, mprl_lbs: float,
               oil_rate_bpd: float, motor_power_kw: float) -> Dict[str, Any]:
        """Assess one telemetry frame."""
        frame = np.array([[temp_c, pressure_bar, pprl_lbs, mprl_lbs, oil_rate_bpd, motor_power_kw]])
        score = float(self.model.decision_function(frame)[0])
        forest_flag = int(self.model.predict(frame)[0]) == -1 or score < -0.02

        findings = self._rule_findings(temp_c, pprl_lbs, mprl_lbs, oil_rate_bpd, motor_power_kw)
        abnormal = forest_flag or bool(findings)

        severity = "NORMAL"
        if abnormal:
            severity = "CRITICAL" if len(findings) > 1 or pprl_lbs > _PPRL_CRITICAL_LBS else "WARNING"

        return {
            "model_status": self.model_status,
            "is_anomaly": abnormal,
            "anomaly_score": round(score, 4),
            "severity": severity,
            "flagged_issues": findings,
            "isolation_forest_verdict": "ANOMALOUS" if forest_flag else "NORMAL",
            "data_quality_status": "REQUIRES_ATTENTION" if forest_flag else "GOOD",
        }
