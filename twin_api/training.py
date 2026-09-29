"""
Model training pipeline for Drava.

Builds a physics-consistent synthetic dataset for the Baghewala field, trains four
models and writes the artefacts plus a metrics report to twin_api/artefacts/:

    production_forecaster_residual.joblib   GradientBoostingRegressor (residual on physics)
    rod_floating_classifier.joblib          RandomForestClassifier
    parted_rod_classifier.joblib            GradientBoostingClassifier
    anomaly_watch.joblib                 IsolationForest
"""

import json
import math
import os
import sys
from datetime import datetime

import joblib
import numpy as np
from sklearn.ensemble import (
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    IsolationForest,
    RandomForestClassifier,
)
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    r2_score,
    roc_auc_score,
    root_mean_squared_error,
)
from sklearn.model_selection import cross_val_score, train_test_split

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from wellphysics.viscosity import CrudeViscosity
from wellphysics.reservoir_heat import ReservoirHeat
from wellphysics.rod_pump import RodPump

FEATURE_NAMES = [
    "temp_c", "viscosity_cp", "spm", "stroke_length_m", "day",
    "recent_oil_bpd", "lag_1", "lag_7", "darcy_inflow_bpd", "q_pump_bpd",
]

# Reservoir constants used for the Darcy inflow term.
_PERMEABILITY_M2 = 850.0 * 9.869233e-16
_PAY_M = 18.0
_DRAINAGE_R_M = 120.0
_WELLBORE_R_M = 0.108


# ============================================================================ data

def generate_training_dataset(n_samples: int = 3500, random_seed: int = 42):
    """
    Build the labelled dataset.

    Returns (features, actual_rate, residual, rod_float_label, parted_rod_label, anomaly_label).
    The feature columns follow FEATURE_NAMES.
    """
    np.random.seed(random_seed)
    visc = CrudeViscosity()
    srp = RodPump()
    thermal = ReservoirHeat()

    print(f"[*] Generating {n_samples} physics-consistent operational records for Baghewala Field...")

    features, rates, residuals = [], [], []
    rod_float_y, parted_y, anomaly_y = [], [], []

    for _ in range(n_samples):
        # -- cycle state and reservoir temperature
        day = np.random.uniform(1.0, 120.0)
        _cycle = np.random.randint(1, 9)  # drawn to keep the random stream unchanged
        steam_slug = np.random.uniform(1200.0, 1800.0)

        heating = thermal.calculate_peak_temperature(
            steam_slug, soak_days=float(np.random.uniform(5.0, 9.0)))
        base_temp = thermal.predict_temperature_at_day(
            day, heating["peak_temperature_c"], avg_daily_prod_bbl=90.0)
        temp_c = max(47.0, min(240.0, float(base_temp + np.random.normal(0, 1.2))))

        pressure_bar = float(55.0 - (day / 120.0) * 32.0 + np.random.normal(0, 1.2))
        pressure_bar = max(15.0, min(65.0, pressure_bar))

        viscosity_cp = float(visc.calculate_viscosity(temp_c, pressure_bar))

        # -- pump settings
        spm = float(np.random.uniform(3.5, 7.5))
        stroke_m = float(np.random.choice([1.8, 2.1, 2.4, 2.8]))

        # -- inflow vs lift
        drawdown_pa = max(5.0, pressure_bar - 8.0) * 1e5
        mu_pa_s = max(0.005, viscosity_cp * 0.001)
        radial = math.log(_DRAINAGE_R_M / _WELLBORE_R_M)
        inflow_bpd = (2.0 * math.pi * _PERMEABILITY_M2 * _PAY_M * drawdown_pa
                      / (mu_pa_s * radial)) * 86400.0 * 6.28981 * 0.75

        perf = srp.evaluate_srp_performance(stroke_m, spm, viscosity_cp)
        pump_bpd = perf["estimated_production_bpd"]

        baseline = min(pump_bpd, max(8.0, inflow_bpd))
        actual = max(3.0, baseline + np.random.normal(0.0, 2.8))  # skin, emulsion, gas slip

        recent = actual * np.random.uniform(0.92, 1.08)
        lag_1 = recent * np.random.uniform(0.97, 1.03)
        lag_7 = recent * np.random.uniform(0.93, 1.07)

        # -- failure labels
        rod_float = int(perf["rod_floating_detected"] or perf["rod_floating_risk"] > 0.50)

        pprl, mprl = perf["pprl_lbs"], perf["mprl_lbs"]
        fatigue_psi = (pprl - mprl) * 4.0 / (math.pi * 0.875 ** 2)
        parted = int((fatigue_psi > 21500.0 and perf["impact_loading_risk"] > 0.6)
                     or pprl > 23000.0
                     or (rod_float and day > 90 and np.random.rand() < 0.25))

        anomaly = int(pprl > 21500.0 or mprl < 650.0 or actual < 6.0 or temp_c < 46.0)

        features.append([temp_c, viscosity_cp, spm, stroke_m, day,
                         recent, lag_1, lag_7, inflow_bpd, pump_bpd])
        rates.append(actual)
        residuals.append(actual - baseline)
        rod_float_y.append(rod_float)
        parted_y.append(parted)
        anomaly_y.append(anomaly)

    return (np.array(features), np.array(rates), np.array(residuals),
            np.array(rod_float_y), np.array(parted_y), np.array(anomaly_y))


# ============================================================================ models

def _train_forecaster(X, y_residual, y_actual, out_dir):
    print("\n[1/4] Training Production Forecaster Residual Model (GradientBoostingRegressor)...")
    X_tr, X_te, res_tr, res_te, _act_tr, act_te = train_test_split(
        X, y_residual, y_actual, test_size=0.20, random_state=42)

    model = GradientBoostingRegressor(
        n_estimators=120, learning_rate=0.08, max_depth=4, subsample=0.85, random_state=42)
    model.fit(X_tr, res_tr)

    pred = model.predict(X_te)
    mae = mean_absolute_error(res_te, pred)
    rmse = root_mean_squared_error(res_te, pred)
    r2 = r2_score(res_te, pred)
    cv_mae = -cross_val_score(model, X_tr, res_tr, cv=5, scoring="neg_mean_absolute_error").mean()

    # hybrid = physics baseline + learned residual (column 9 = pump rate, 8 = inflow)
    baseline = np.minimum(X_te[:, 9], np.maximum(8.0, X_te[:, 8]))
    hybrid = baseline + pred
    hybrid_mae = mean_absolute_error(act_te, hybrid)
    hybrid_r2 = r2_score(act_te, hybrid)

    print(f"      -> Residual MAE: {mae:.3f} bbl/d | RMSE: {rmse:.3f} bbl/d | R2: {r2:.4f}")
    print(f"      -> 5-Fold Cross-Validation MAE: {cv_mae:.3f} bbl/d")
    print(f"      -> Net Hybrid Oil Rate MAE: {hybrid_mae:.3f} bbl/d | Hybrid R2: {hybrid_r2:.4f}")

    joblib.dump(model, os.path.join(out_dir, "production_forecaster_residual.joblib"))
    return {
        "model_type": "GradientBoostingRegressor",
        "residual_mae_bpd": round(float(mae), 3),
        "residual_rmse_bpd": round(float(rmse), 3),
        "residual_r2": round(float(r2), 4),
        "cv_mae_bpd": round(float(cv_mae), 3),
        "hybrid_oil_mae_bpd": round(float(hybrid_mae), 3),
        "hybrid_oil_r2": round(float(hybrid_r2), 4),
    }


def _train_classifier(title, model, X, y, artefact, out_dir, zero_division=None):
    print(title)
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.20, random_state=42)
    model.fit(X_tr, y_tr)

    label = model.predict(X_te)
    prob = model.predict_proba(X_te)[:, 1]
    acc = accuracy_score(y_te, label)
    f1 = f1_score(y_te, label) if zero_division is None else f1_score(y_te, label, zero_division=zero_division)
    auc = roc_auc_score(y_te, prob)

    print(f"      -> Accuracy: {acc*100:.2f}% | F1-Score: {f1:.4f} | ROC-AUC: {auc:.4f}")

    joblib.dump(model, os.path.join(out_dir, artefact))
    return {
        "model_type": type(model).__name__,
        "accuracy": round(float(acc), 4),
        "f1_score": round(float(f1), 4),
        "roc_auc": round(float(auc), 4),
    }


def _train_anomaly_detector(out_dir):
    print("\n[4/4] Fitting Telemetry Anomaly Detector (IsolationForest)...")
    np.random.seed(42)
    n = 3000
    # columns: temp_c, pressure_bar, pprl_lbs, mprl_lbs, oil_rate_bpd, motor_power_kw
    X_normal = np.column_stack([
        np.random.normal(85.0, 16.0, n),
        np.random.normal(48.0, 5.0, n),
        np.random.normal(14500.0, 1200.0, n),
        np.random.normal(3200.0, 500.0, n),
        np.random.normal(95.0, 15.0, n),
        np.random.normal(18.5, 3.0, n),
    ])

    forest = IsolationForest(n_estimators=150, contamination=0.04, random_state=42)
    forest.fit(X_normal)

    inliers = float((forest.predict(X_normal) == 1).mean())
    print(f"      -> Isolation Forest fitted: Nominal Inlier Coverage = {inliers*100:.1f}%")

    joblib.dump(forest, os.path.join(out_dir, "anomaly_watch.joblib"))
    return {
        "model_type": "IsolationForest",
        "contamination": 0.04,
        "n_estimators": 150,
        "inlier_ratio": round(inliers, 4),
    }


# ============================================================================ driver

def train_and_evaluate_all():
    """Generate data, train every model, write artefacts and return the metrics report."""
    print("=" * 75)
    print("  Drava: TRAINING SUITE FOR SMART INDIA HACKATHON 2026")
    print("  Baghewala Field CSS + SRP Optimization Models")
    print("=" * 75)

    out_dir = os.path.join(ROOT_DIR, "twin_api", "artefacts")
    os.makedirs(out_dir, exist_ok=True)

    X, y_actual, y_residual, y_float, y_parted, _y_anomaly = generate_training_dataset(3500)

    report = {
        "timestamp": datetime.now().isoformat(),
        "training_dataset_samples": int(X.shape[0]),
        "features": FEATURE_NAMES,
    }
    report["rate_forecaster"] = _train_forecaster(X, y_residual, y_actual, out_dir)

    X_failure = X[:, :5]  # temp, viscosity, spm, stroke, day
    report["rod_floating_classifier"] = _train_classifier(
        "\n[2/4] Training Rod Floating Hazard Classifier (RandomForestClassifier)...",
        RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42),
        X_failure, y_float, "rod_floating_classifier.joblib", out_dir)
    report["parted_rod_classifier"] = _train_classifier(
        "\n[3/4] Training Parted Rod Fatigue Hazard Predictor (GradientBoostingClassifier)...",
        GradientBoostingClassifier(n_estimators=100, max_depth=4, random_state=42),
        X_failure, y_parted, "parted_rod_classifier.joblib", out_dir, zero_division=0)
    report["anomaly_watch"] = _train_anomaly_detector(out_dir)

    metrics_path = os.path.join(out_dir, "training_metrics.json")
    with open(metrics_path, "w") as fh:
        json.dump(report, fh, indent=2)

    print("\n" + "=" * 75)
    print(" [OK] ALL MODELS TRAINED AND SAVED SUCCESSFULLY!")
    print(f" Saved Model Directory: {out_dir}")
    print(f" Metrics Report: {metrics_path}")
    print("=" * 75)
    return report


if __name__ == "__main__":
    train_and_evaluate_all()
