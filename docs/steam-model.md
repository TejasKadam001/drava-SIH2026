# Thermal model (Cyclic Steam Stimulation)

Implemented in `wellphysics/reservoir_heat.py`. Three stages: heat in, peak temperature, cool-down.

## 1. Heat injected

$$Q_{inj} = M_{steam}\,\big[\,C_w (T_{steam}-T_{native}) + x\,L_v\,\big]$$

| Symbol | Meaning | Value used |
| --- | --- | --- |
| M | steam mass (cold-water equivalent) | tons -> kg |
| C_w | water heat capacity | 4.184 kJ/(kg K) |
| T_steam | saturated steam temperature | about 295 C at 80 bar |
| T_native | reservoir temperature | 47 C |
| x | steam dryness | 0.78 |
| L_v | latent heat | 1,420 kJ/kg |

## 2. Peak temperature after the soak

The saturated rock stores heat at about 2,500 kJ/(m3 K):

$$(\rho C_p)_{bulk} = (1-\phi)\,\rho_{rock}C_{p,rock} + \phi\,\rho_{oil}C_{p,oil}$$

Some heat leaks to the overburden while the well soaks, and only a fraction of the rest is captured:

$$Q_{ret} = Q_{inj}\,\eta\,e^{-0.012\,t_{soak}}\qquad (\eta = 0.72)$$

The heated cylinder is sized so it warms by 75 % of the steam-to-native gap; its radius (capped at 45 m) then sets the peak:

$$T_{peak} = T_{native} + \frac{Q_{ret}}{\pi R^2 h\,(\rho C_p)_{bulk}}$$

The result is clamped between native + 15 C and steam - 25 C.

## 3. Cool-down while producing

$$T(t) = T_{native} + (T_{peak}-T_{native})\,e^{-(\lambda_{cond}+\lambda_{conv} q)\,t}$$

- lambda_cond = 0.0135 per day: conduction into cap and base rock. Passing the heated radius scales it by sqrt(11.8 / R), so a bigger steam slug cools more slowly (11.8 m is the reference job, 2,200 t and a 5-day soak).
- lambda_conv = 0.00008 per day per bbl/day: heat carried out by produced fluid (default 90 bbl/day).
- The temperature never falls below native.

## Steam-oil ratio

The optimizer scores each plan by SOR = steam (bbl water) / cycle oil (bbl). Plans that need more than about 6.5-8 steam barrels per oil barrel are unattractive.
