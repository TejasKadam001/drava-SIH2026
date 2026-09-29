# Domain primer: heavy oil at Baghewala

Background a reader needs before the models make sense.

## The reservoir

Baghewala sits in the Bikaner-Nagaur Basin of western Rajasthan and is India's main onshore heavy-oil accumulation.

| Property | Value |
| --- | --- |
| Formation | Jodhpur Sandstone (Late Proterozoic / Early Cambrian) |
| Depth | 900-1,100 m TVD |
| Rock | friable, fine-to-medium quartzose sandstone with thin shale and silt beds |
| Porosity | 24-28 % (mean about 26 %) |
| Permeability | 450-1,800 mD (mean about 850 mD) |
| Pore pressure | depleted, roughly 45-65 bar |
| Temperature | 46-48 C |

## The crude

- 17-19 deg API, density about 0.94-0.95 g/cm3.
- Dead-oil viscosity falls steeply with heat: **1,800-6,500+ cP at 46 C**, 120-180 cP at 100 C, 12-18 cP at 200 C.
- Rich in asphaltenes (16-22.5 wt %), wax (8-12 wt %) and sulfur (above 2.5 wt %).
- Below about 70 C the asphaltenes flocculate and gel, which chokes flow in the rock next to the well.

## Why steam is needed

Radial Darcy inflow is

$$q_o = \frac{2\pi\,k\,k_{ro}\,h\,(P_{res}-P_{wf})}{\mu_o\,[\ln(r_e/r_w)+S]}$$

With mu near 4,200 cP and only about 55 bar of pressure, the well delivers under 2 bbl/day, which is not economic. **Cyclic Steam Stimulation (CSS)** fixes the viscosity term:

1. Steam at 280-310 C and 70-80 bar goes down the well; condensing it releases about 1,420 kJ/kg of latent heat.
2. The heat spreads 15-35 m into the sandstone.
3. Viscosity collapses from about 4,200 cP to about 15 cP - a factor near 280.
4. Mobility rises by a similar factor, so the first weeks flow at 80-220 bbl/day.

## Why the pump then struggles

The oil is lifted by a sucker-rod pump set near 900 m. Over the 90-150 day production window the rock hands its heat to the shale above and below, and the reservoir drifts back toward 50 C. As viscosity climbs again, a chain of mechanical problems follows:

1. Couette shear between rods and tubing grows.
2. Oil is throttled through the plunger valves.
3. The rods stop sinking freely on the downstroke - **rod floating**.
4. The polished-rod bridle goes slack and the unit hits the string on the turnaround - **impact loading**.
5. Cyclic stress breaks a rod at its threads - **parted rod**.
6. Upward hydraulic thrust can lift the pump off its seat - **pump unseating**.

Steam timing and pump speed are usually tuned separately. Drava tunes them together.
