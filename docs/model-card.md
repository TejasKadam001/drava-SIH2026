# Model card

Summary of the three learned models and the physics they sit on. Metrics are from `twin_api/artefacts/training_metrics.json`, written by `python scripts/retrain.py`.

## Shared facts

| Item | Value |
|---|---|
| Training data | 3,500 synthetic rows generated from the project's own physics (`twin_api/training.py`, seed 42) |
| Split | 80 / 20, random seed 42 |
| Features (production model) | temperature, viscosity, SPM, stroke, cycle day, recent rate, lag 1, lag 7, Darcy inflow, pump capacity |
| Features (failure models) | temperature, viscosity, SPM, stroke, cycle day |
| Version string | v1.4.0 |
| Intended use | decision support for a production engineer on the Baghewala demo wells |
| Not intended for | autonomous control, or any use that treats the metrics as field accuracy |

## 1. Rate forecaster (`twin_api/learners/rate_forecaster.py`)

- **Design:** physics baseline `min(pump lift capacity, Darcy radial inflow)` plus a GradientBoostingRegressor residual (120 trees, depth 4, learning rate 0.08, subsample 0.85). Falls back to a small Ridge fit if the artefact is missing.
- **Output:** t+1, t+7, t+30 day rates with ±5 %, ±8 %, ±14 % bands.
- **Metrics (synthetic):** residual MAE 1.59 bbl/d, RMSE 2.25 bbl/d, R² 0.32; 5-fold CV MAE 1.61 bbl/d; hybrid rate MAE 1.59 bbl/d, R² 0.9996.
- **Reading:** hybrid R² is high because physics already explains most of the synthetic rate; the residual model has little left to learn.
- **Known limits:** bands are fixed percentages, not calibrated intervals; no real production history was used.

## 2. Failure scorer (`twin_api/learners/failure_scorer.py`)

- **Hazards:** rod floating, impact loading, parted rod, pump unseating.
- **Design:** physics scores (from the rod-pump model; Goodman stress ratio on a 7/8 in rod with 24,000 psi allowable for parted rod; drag-to-seating-limit ratio for unseating). A RandomForest (100 trees, depth 6) and a GradientBoostingClassifier (100 trees, depth 4) are blended 50/50 with the physics rod-float and parted-rod scores.
- **Output:** probability and band (LOW < 0.15 ≤ MEDIUM < 0.45 ≤ HIGH < 0.75 ≤ CRITICAL) per hazard, a 5–100 health score, mechanical loads, and a normalised attribution table over viscosity, speed and stroke.
- **Metrics (synthetic):**

| Classifier | Accuracy | F1 | ROC-AUC |
|---|---|---|---|
| Rod floating | 0.990 | 0.720 | 0.953 |
| Parted rod | 0.993 | 0.286 | 0.882 |

- **Reading:** parted-rod events are rare in the generated data, so accuracy is high and F1 is low — the reason for the physics blend.
- **Known limits:** labels come from the same physics the features do; the attribution table is a simple weighting, not SHAP values, despite the response key name `feature_attribution_shap`.

## 3. Anomaly watch (`twin_api/learners/anomaly_watch.py`)

- **Design:** IsolationForest (150 trees, contamination 0.04) on temperature, pressure, PPRL, MPRL, oil rate and motor power, plus rules: PPRL above 21,000 lbf, MPRL below 600 lbf, high power with near-zero production, temperature below native.
- **Severity:** CRITICAL if more than one rule fires or PPRL exceeds 22,000 lbf; WARNING for any other anomaly; otherwise NORMAL.
- **Metric (synthetic):** 96.0 % of healthy training points classed as inliers.
- **Known limits:** trained on a synthetic "healthy well" distribution; no real fault examples.

## Physics the models depend on

| Module | Reference basis |
|---|---|
| `wellphysics/viscosity.py` | Walther / ASTM D341 |
| `wellphysics/reservoir_heat.py` | heat-balance approach in the Marx-Langenheim lineage |
| `wellphysics/rod_pump.py` | API RP 11L style loads with Couette and valve drag (an approximation of the fuller wave-equation treatment) |
| `wellphysics/decline.py` | Arps (1945) decline curves |

## Reproducibility

`python scripts/retrain.py` regenerates the dataset and all artefacts deterministically; the metrics file also records a timestamp. Loading falls back gracefully (`model_status` reports `TRAINED …`, `ONLINE_CALIBRATED …` or `PHYSICS_CALIBRATED …`), so check that field in `/v1/risk/failure` and `/v1/risk/anomaly` responses to confirm which path is active.
