# Model evaluation

Everything below is measured on the project's **synthetic** dataset (3,500 physics-generated rows, 80/20 split, seed 42). It shows the models learn their training signal; it is not evidence of accuracy on real Oil India wells. Numbers come from `twin_api/artefacts/training_metrics.json`, written by `python scripts/retrain.py`.

| Model | Metric | Value |
| --- | --- | --- |
| Production residual (GradientBoosting) | MAE | 1.59 bbl/d |
| | RMSE | 2.25 bbl/d |
| | 5-fold CV MAE | 1.61 bbl/d |
| Hybrid rate (physics + residual) | MAE | 1.59 bbl/d |
| | R2 | 0.9996 |
| Rod-floating classifier (RandomForest) | accuracy / F1 / ROC-AUC | 0.990 / 0.720 / 0.953 |
| Parted-rod classifier (GradientBoosting) | accuracy / F1 / ROC-AUC | 0.993 / 0.286 / 0.882 |
| Anomaly detector (IsolationForest) | inlier coverage on healthy data | 96.0 % |

## Reading the numbers

- The hybrid R2 is near 1 because the physics baseline already explains almost all of the synthetic rate; the residual model has little left to learn (residual R2 is 0.32).
- Parted-rod events are rare in the generated data, so accuracy is high while F1 is low. The 50/50 blend with the physics score is there to compensate.
- The labels are produced by the same physics the models consume, so a real-data benchmark is still needed before quoting accuracy.

## Ablations not run

An earlier draft of this project quoted a five-strategy comparison. No such experiment exists in this repository, so it has been removed. A fair comparison would need field or independent data.
