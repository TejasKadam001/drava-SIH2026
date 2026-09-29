import { WELL_PARAMS, reservoirTempAtDay, waltherViscosityCp, evaluateSrp } from './api';

export const MAX_DAY = 150;
export const FLOAT_LIMIT = 0.4;
// BHT-phased control: the phase caps SPM, the rod-float model caps it further
export const PHASES = [
  { id: 'HOT', min: 120, cap: 9.5, rule: 'Oil mobile, run at max safe SPM' },
  { id: 'WARM', min: 80, cap: 9.5, rule: 'SPM tracks rising viscous drag' },
  { id: 'COLD', min: -Infinity, cap: 9.5, rule: 'Float-limited SPM, next steam cycle evaluated' }
] as const;
export const phaseOf = (t: number) => PHASES.find((p) => t >= p.min)!;

// Economics (stated on-screen as assumptions)
export const OIL_INR_PER_BBL = 70 * 84;      // $70 Brent-linked, ₹84/$
export const STEAM_INR_PER_T = 2600;         // fuel + water treatment
export const WORKOVER_INR = 1500000;         // rod-part workover incl. deferred oil
export const FAIL_WINDOW_DAYS = 30;          // float risk ≈ probability of a rod part within 30 days
export const DEFERRED_DAYS = 14;             // well down waiting on a workover rig

// Above float onset the rods cannot fall faster than terminal velocity,
// so extra SPM adds impact loading, not plunger stroke.
export function floatOnsetSpm(stroke: number, visc: number) {
  let s = 9.5;
  while (s > 2 && evaluateSrp(stroke, s, visc).floating) s = +(s - 0.1).toFixed(1);
  return s;
}

export function dayState(well: string, day: number) {
  const p = WELL_PARAMS[well];
  const temp = reservoirTempAtDay(day, p.peakTemp);
  const visc = waltherViscosityCp(temp);
  const phase = phaseOf(temp);
  const onset = floatOnsetSpm(p.stroke, visc);
  const value = (s: number, risk: number) => {
    const bpd = evaluateSrp(p.stroke, Math.min(s, onset), visc).productionBpd;
    const revenue = bpd * OIL_INR_PER_BBL;
    const failure = (risk / FAIL_WINDOW_DAYS) * (WORKOVER_INR + DEFERRED_DAYS * revenue);
    return revenue - (p.steamTons * STEAM_INR_PER_T) / MAX_DAY - failure;
  };
  // Value-maximising SPM subject to the hard rod-float limit
  let spm = 2.0;
  let best = -Infinity;
  for (let s = 2.0; s <= phase.cap + 1e-9; s = +(s + 0.1).toFixed(1)) {
    const r = evaluateSrp(p.stroke, s, visc);
    if (r.risk > FLOAT_LIMIT) continue;
    const v = value(s, r.risk);
    if (v > best + 1) { best = v; spm = s; }
  }
  const auto = evaluateSrp(p.stroke, spm, visc);
  const manual = evaluateSrp(p.stroke, p.spm, visc);
  return { day, temp, visc, phase, spm, auto, manual, npvAuto: value(spm, auto.risk), npvManual: value(p.spm, manual.risk) };
}

export const inrCr = (v: number) => `₹${(v / 1e7).toFixed(2)} Cr`;

