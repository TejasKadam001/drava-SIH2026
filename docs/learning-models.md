# Machine-learning models

## Approach: physics first, ML for what is left over

Pure ML extrapolates badly and can break energy balance; pure physics ignores wax, sand and friction. Drava predicts

$$\hat y = f_{physics}(u) + g_{ML}(x)$$

where the physics term enforces thermodynamics, Darcy flow and pump mechanics, and the ML term learns the residual. All four models are trained by `twin_api/training.py` on a physics-consistent synthetic dataset (3,500 rows) and saved to `twin_api/artefacts/`. If an artefact is missing, each model falls back to a physics-only or Ridge version so the service still starts.

## 1. Production forecaster

- Baseline rate = min(pump capacity, Darcy inflow).
- A GradientBoostingRegressor adds a residual, trained on temperature, viscosity, SPM, stroke, days since injection, recent-rate lags, inflow and pump capacity.
- Output at t+1, t+7 and t+30 days with bands of +/-5 %, +/-8 % and +/-14 %.

## 2. Failure model

Scores rod floating, impact loading, parted rod and pump unseating.

- Rod float and impact come straight from the pump model.
- Parted rod combines a Goodman stress ratio (7/8 in rod, 24,000 psi allowable) with impact risk and well age.
- A RandomForest (rod float) and a GradientBoosting classifier (parted rod) are blended 50/50 with the physics numbers.
- A normalised table shows how much viscosity, speed and stroke contribute to the score.

## 3. Anomaly detector

An Isolation Forest scores six signals (temperature, pressure, PPRL, MPRL, oil rate, motor power). Rule checks add readable reasons: load above 21,000 lbf, MPRL under 600 lbf, high power with almost no oil, and temperature below native.

## 4. Decline-curve analysis

`wellphysics/decline.py` fits an Arps hyperbolic or exponential decline and reports estimated ultimate recovery and time to the economic limit.
