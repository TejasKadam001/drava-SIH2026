# Five-minute demo script

**Minute 1 - the problem.** Baghewala crude is 18 deg API and over 4,000 cP at 47 C. Oil India injects steam (CSS) to thin it, but over about 100 days the reservoir cools and the oil thickens again. The rod pump cannot sink through it, rods float, then slam, then snap. *Show:* Overview dashboard with viscosity, temperature and rod-float risk, and the data-mode badge that says SIMULATION.

**Minute 2 - live data and the dynamometer card.** *Show:* the live rig if it is connected (badge flips to LIVE_HARDWARE); otherwise the simulated stream. Open the dynamometer view and point at the distorted downstroke that signals rod lag.

**Minute 3 - digital twin and time machine.** *Show:* the Digital Twin tab; drag the slider from day 10 to day 110. Temperature falls, viscosity climbs from tens to thousands of cP, and the risk badge moves from safe to critical.

**Minute 4 - joint optimisation.** Steam scheduling and pump speed are normally tuned by different teams; here they are searched together. *Show:* the optimiser view; lower the SPM, run the search, read the recommended plan, the Pareto frontier and the rejected alternatives with their reasons.

**Minute 5 - copilot and takeaway.** *Show:* the copilot drawer; ask "Why did failure risk increase and what do you recommend for BW-DEMO-001?". The answer lists the tools it called and cites their numbers. *Close:* Drava moves operations from reacting to failures to steering the well before the rods float.

## Backup plan

If the rig is unplugged the console falls back to simulation automatically. If the inference service is down the gateway answers with labelled fallback payloads instead of errors.
