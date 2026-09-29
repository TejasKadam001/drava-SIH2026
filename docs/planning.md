# Joint optimisation

`twin_api/planner/plan_search.py` picks steam and pump settings together.

## Objectives

| # | Objective | Direction |
| --- | --- | --- |
| 1 | oil rate | maximise |
| 2 | steam-oil ratio | minimise |
| 3 | energy per barrel | minimise |
| 4 | failure (rod-float) risk | minimise |

Decision variables: steam mass, soak days, stroke length and strokes per minute. Injection pressure is fixed at 80 bar and the plan reports a 115-day production cutoff.

## Search

The optimiser enumerates a grid: 4 steam volumes (1,800-3,000 t) x 3 soak times (4, 6, 8 d) x 3 strokes (2.0, 2.4, 2.8 m) x 6 speeds (3.5-8.5 SPM), 216 candidates in all. Each one goes through the thermal, viscosity and pump models at the well's real cycle day (never earlier than day 40). This matters: rod floating is a late-cycle, cold-reservoir failure, so judging a cold well as if it were hot would approve speeds that float the rods today.

## Constraints

A candidate is rejected if it breaks any of these:

- SPM above 9.5 or below 2.0
- stroke above 3.0 m
- PPRL above 22,000 lbf
- rod-float risk above 40 %
- soak shorter than 2 days

## Ranking

Feasible candidates get a weighted score from four normalised terms (defaults 0.40 / 0.25 / 0.15 / 0.20 for production, SOR, energy, risk; the API accepts other weights). The highest score wins; the top 35 form the frontier returned to the UI, along with five sample rejected plans and the reason each failed.

## Output

The response compares the winning plan with the well's present state (production, SOR, energy and risk as percentage changes), lists which constraints passed, and ends with a reminder that a field engineer must approve any VFD setpoint change.
