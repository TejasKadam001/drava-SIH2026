# Understanding SIH26120

**Problem statement:** *AI-enabled well-to-surface digital twin for joint optimisation of Cyclic Steam Stimulation (CSS) and Sucker Rod Pump (SRP) operations on the heavy-oil wells of the Baghewala field (Oil India Limited).*

## At a glance

| Item | Baghewala |
| --- | --- |
| Operator | Oil India Limited, Bikaner-Nagaur Basin, Rajasthan |
| Formation | Jodhpur Sandstone, 900-1,100 m deep |
| Crude | 17-19 deg API, 1,500 to over 10,000 cP at reservoir temperature |
| Reservoir temperature | 46-48 C (cold for a thermal project) |
| Reservoir pressure | depleted, typically under 40-70 bar |
| Recovery method | CSS ("huff and puff") |
| Lift | beam pump (SRP) |
| Asphaltenes | 15-22 wt %, prone to flocculation when cooled |

## The problem in one loop

Steam heats the rock, so viscosity drops and production surges. The rock then cools, viscosity rises, the pump's rods stop sinking freely, and the string floats, pounds and parts. Steam scheduling and pump speed are decided by different teams, mostly after something breaks.

## Business impact

- **High steam-oil ratio.** Making steam in a desert costs gas and treated water; steam that does not reach productive rock is wasted.
- **Workovers.** A parted rod or unseated pump means a rig, lost production and heavy cost.
- **Reactive management.** Stroke length, speed and soak time are changed after production has already fallen.
- **Emissions.** Steam generation is the biggest carbon source; less steam and power per barrel matters.

## Key concepts

**CSS.** Three phases on one well: inject steam for 10-25 days, shut in to *soak* for 3-10 days while heat spreads, then *produce* for months until the reservoir has cooled and another cycle is needed.

**SRP.** A surface beam and crank move a rod string that drives a plunger in a downhole barrel with a standing valve and a traveling valve. On the upstroke the plunger lifts the fluid column; on the downstroke the rods must fall **under gravity alone**.

**Viscosity and mobility.** Viscosity follows the Walther law, log-log in temperature; heating from 46 C to about 180 C removes over 99 % of it. Mobility, k * k_ro / mu, is nearly zero in cold oil and jumps by hundreds of times once heated.

**SOR.** Steam-oil ratio is barrels of steam (as water) per barrel of oil. A healthy project runs 2-4; late, poorly timed cycles reach 8-12, where the fuel is worth more than the oil.

**Failure chain.**

1. *Rod floating* - viscous drag on the downstroke exceeds what gravity can overcome, so the string lags the polished rod.
2. *Impact loading* - the unit reverses and strikes the lagging string, sending a shock through the rods.
3. *Parted rod* - repeated shocks and fatigue crack a rod at a coupling; production stops until a workover rig pulls the string.
4. *Pump unseating* - friction and suction surges lift the pump off its seat, and the pump stops sealing.

## What a real digital twin must do

It ingests telemetry (real or simulated), keeps a physical state that respects mass and energy balance, predicts forward, answers what-if questions, prescribes setpoints, and reports its uncertainty. A dashboard of stored charts is not a twin.

## Why joint optimisation

If the soak is cut short the near-well fluid can still be hot enough to cause gas lock. If the pump stays at 8 SPM while viscosity climbs from about 40 to 3,000 cP, it floats the rods within days. The thermal state has to drive the pump speed, and the withdrawal pattern has to inform when to steam again.

## What the problem asks for

1. Monitoring and prediction for both CSS and SRP.
2. Reservoir heating and cool-down curves.
3. Multi-step production forecasts.
4. Pump settings that avoid rod floating and impact loading.
5. Steam volume and soak time that cut SOR and energy.
6. Early warnings for rod fatigue and pump unseating.
7. An interface for field engineers and asset managers.

## How Drava answers it

| Requirement | Where it is addressed |
| --- | --- |
| Heating and cooling | `wellphysics/reservoir_heat.py` heat balance and decay |
| Forecast | production forecaster: physics baseline plus gradient-boosted residual, 1 / 7 / 30 days |
| Pump safety | `wellphysics/rod_pump.py` rod-sinking analysis with a float flag and risk score |
| Joint optimisation | grid search over steam, soak, stroke and speed with constraints and weighted scoring |
| Early warning | failure model (four hazards) and an Isolation Forest anomaly detector |
| Interface | React console: twin with time slider, dynamometer card, scenario lab, copilot |
| Honesty | three data tiers, watermarks, and a source tag on every response |
| Hardware | an ESP32 benchtop rig that feeds real rod load, speed and temperature into the same pipeline |
