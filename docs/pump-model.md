# Rod-pump model

Implemented in `wellphysics/rod_pump.py`. It answers one question: at this stroke, speed and oil viscosity, do the rods still sink fast enough?

## Kinematics

With stroke S and speed N (strokes/min), omega = 2 pi N / 60:

- position: x(t) = (S/2)(1 - cos(omega t))
- peak velocity: v_max = S omega / 2
- peak acceleration: a_max = S omega^2 / 2

## Loads (API RP 11L style)

| Term | Formula |
| --- | --- |
| buoyant rod weight | W_rf = W_r (1 - rho_fluid / rho_steel) |
| fluid on plunger | W_f = A_plunger x H_pump x rho_fluid x g |
| inertia | F_i = (W_r / g) x a_max |
| peak polished-rod load | PPRL = W_rf + W_f + F_i + F_drag |
| minimum polished-rod load | MPRL = W_rf - F_i - F_drag |

## Viscous resistance

Two terms make up the drag on the downstroke.

**Couette shear** in the annulus between rods and tubing:

$$F_{rod} = \frac{2\pi\,\mu\,v_{avg}\,H_{pump}}{\ln(r_{tubing}/r_{rod})}$$

**Valve throttling** as oil squeezes through the traveling valve (Hagen-Poiseuille):

$$\Delta P = \frac{8\,\mu\,L_{plunger}\,v_{avg}}{r_{port}^2},\qquad F_{valve} = 0.65\,\Delta P\,A_{plunger}$$

## Rod floating

Rods cannot push, so on the downstroke they fall under gravity, pulled mainly by the sinker bars (about 30 % of the buoyant string weight). The model compares the polished rod's peak speed with the string's terminal sinking speed:

- velocity ratio = v_max / v_terminal
- sinking margin = sinker pull - (0.5 x drag + inertia)
- **float flag:** ratio >= 0.80 or margin < 200 lbf
- **risk score:** a logistic curve centred on ratio 0.75, kept within 1 %-99 %

When the string lags, the bridle slackens and the unit strikes it on the turnaround. Impact risk is taken as 1.12 x float risk (capped at 1). Repeated impacts push rod stress past the 32,000 psi Grade D limit and rods part within weeks.

## Other outputs

Displacement, pump efficiency (reduced as viscosity rises), electrical power, kWh per barrel, gearbox torque, and a 40-point surface and downhole dynamometer card. A floating well shows a sagging trough and an end-of-stroke spike on the card.
