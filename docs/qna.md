# Anticipated questions

**Q1. Without Oil India's field data, why call this a digital twin?**
Because the twin is the physics, and the data path is honest about its source. Simulated frames are watermarked "SIMULATED / SYNTHETIC - NOT OIL INDIA FIELD DATA". The simulator is calibrated to published Baghewala papers using ASTM D341 viscosity, a heat-balance model and API RP 11L pump mechanics. A physical benchtop rig supplies real measured load, speed and temperature, and connectors for CSV, REST, MQTT and PostgreSQL are ready for authorised data.

**Q2. Why not a spreadsheet or nodal-analysis software?**
Nodal packages assume steady conditions. In CSS the viscosity changes by two orders of magnitude within one cycle, so the safe pumping speed changes with it. Drava recomputes rod sinking speed as the reservoir cools and optimises steam and pump settings together.

**Q3. What stops the copilot from suggesting something unsafe?**
It cannot invent numbers: it is rule-based and quotes only tool output. Every plan comes from the optimiser, which rejects candidates above 9.5 SPM, above 22,000 lbf peak load, with more than 40 % rod-float risk, or with under two days of soak. The recommendation is advisory; an engineer approves setpoints.

**Q4. Where is the economic gain of joint optimisation?**
Steam and pump are coupled through viscosity. If the steam team ignores the pump, the pump runs too fast in the cold half of the cycle and breaks rods; if the pump team ignores steam, heat is wasted. Searching both together lowers the pump speed as the well cools and picks the steam volume for the best mix of production, SOR, energy and risk. The size of the gain on real wells is not measured yet; the project reports only synthetic-data metrics.

**Q5. Are your accuracy numbers real?**
They are real for the synthetic dataset and labelled that way (see `evaluation.md`). We do not claim field accuracy.
