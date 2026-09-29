# Digital twin

## State the twin carries

For each well the twin tracks reservoir temperature and pressure, fluid viscosity and mobility, the wellbore temperature and pressure profile, polished-rod loads, downstroke margin, rod-float probability, oil rate and cumulative SOR.

## How a reading flows through

```text
telemetry (rig or simulator)
        -> quality checks
        -> physics reconciliation (heat / mass balance)
        -> ML residual correction
        -> state update, pushed to the console (WebSocket)
        -> anomaly and rod-float check
        -> forecast (1, 7 and 30 days)
        -> optimiser, when the state has drifted
        -> decision card for the engineer, with audit trail
```

In this build the first step has two sources. `twin_api/rig_link.py` serves the physical benchtop rig when it has published within the last few seconds; otherwise `synthetic_feed.py` answers. Both return the same JSON shape and the response is tagged `LIVE_HARDWARE` or `SIMULATION`.

## Time machine

The console lets an engineer drag a slider across a 0-180 day production window and watch the cooling front, the viscosity rebound and the polished-rod load rise. Rod-float risk moves from safe (under 15 %) through warning (over 45 %) to critical (over 85 %).
