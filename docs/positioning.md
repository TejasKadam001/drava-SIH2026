# Positioning

What Drava does that a typical digital-twin submission for this problem statement leaves out, and where it is still limited.

| Dimension | Common approach | Drava |
| --- | --- | --- |
| Scope | Steam injection and pump lift handled as separate problems | One search over steam volume, soak time, stroke and speed, linked through viscosity |
| Twin | Charts driven by random or static data | Heat balance, 1-D wellbore, and pump mechanics recomputed from state; time slider and what-if lab |
| Data honesty | Synthetic values presented as field data | Three-tier registry; every simulated frame watermarked; each response states its source |
| Modelling | Black-box ML on uncalibrated data | Physics baseline plus a learned residual; metrics reported on synthetic data and labelled as such |
| Failure model | Generic classifier | Rod sinking speed versus polished-rod speed, Couette and valve drag, Goodman fatigue ratio |
| Optimisation | Sliders with no constraints | Weighted multi-objective ranking of a constrained grid; rejected plans shown with reasons |
| Assistant | A chat wrapper that can invent numbers | Rule-based router over 14 tools; quotes only tool output, lists the tools it ran |
| Autonomy | Claims of automatic control | Recommendations only; an engineer approves any setpoint |
| Hardware | None | ESP32 benchtop rig with load cell and encoder feeding the same pipeline |

## Why coupling matters

Over a 90-100 day cycle viscosity can move from tens of cP to several thousand as the reservoir cools. A pump speed that is safe on day 10 floats the rods on day 90. Tools that treat the reservoir and the pump separately cannot see that feedback.

## Limits to be upfront about

- Metrics come from a synthetic dataset, not Oil India wells.
- The optimiser is a grid search, not a genetic algorithm; it is easy to explain and fast enough for 216 candidates.
- The copilot is rule-based and does not understand free-form language beyond keyword routing.
- The rig is a scaled stand-in, not field hardware.
