// Client-side port of the backend physics, used when the API is unreachable and by the
// what-if screens. It follows wellphysics/reservoir_heat.py, viscosity.py and rod_pump.py
// step for step so every tab reports the same temperature, viscosity, load and rate.

export interface WellParams {
  peakTemp: number; spm: number; stroke: number; cycle: number; steamTons: number;
  currentDay: number; cumOilBbl: number; sor: number; bhpBar: number; whpBar: number; vfdHz: number;
}

// Operating parameters per demo well (first three mirror twin_api/synthetic/synthetic_feed.py).
export const WELL_PARAMS: Record<string, WellParams> = {
  'BW-DEMO-001': { peakTemp: 192.0, spm: 6.8, stroke: 2.4, cycle: 3, steamTons: 2400, currentDay: 68,  cumOilBbl: 7450, sor: 3.8, bhpBar: 52.0, whpBar: 4.5, vfdHz: 44.0 },
  'BW-DEMO-002': { peakTemp: 215.0, spm: 7.2, stroke: 2.6, cycle: 4, steamTons: 2800, currentDay: 14,  cumOilBbl: 2450, sor: 2.6, bhpBar: 58.0, whpBar: 6.2, vfdHz: 46.5 },
  'BW-DEMO-003': { peakTemp: 178.0, spm: 7.8, stroke: 2.4, cycle: 2, steamTons: 2100, currentDay: 105, cumOilBbl: 8800, sor: 5.1, bhpBar: 44.0, whpBar: 3.8, vfdHz: 50.4 },
  'BW-DEMO-004': { peakTemp: 205.0, spm: 7.0, stroke: 2.6, cycle: 3, steamTons: 2600, currentDay: 42,  cumOilBbl: 6100, sor: 3.4, bhpBar: 54.0, whpBar: 5.1, vfdHz: 45.2 },
  'BW-DEMO-005': { peakTemp: 188.0, spm: 8.2, stroke: 2.4, cycle: 2, steamTons: 2200, currentDay: 88,  cumOilBbl: 9100, sor: 4.6, bhpBar: 47.0, whpBar: 4.0, vfdHz: 53.0 },
  'BW-DEMO-006': { peakTemp: 221.0, spm: 6.5, stroke: 2.8, cycle: 5, steamTons: 3000, currentDay: 9,   cumOilBbl: 1400, sor: 2.4, bhpBar: 60.0, whpBar: 6.6, vfdHz: 42.0 },
  'BW-DEMO-007': { peakTemp: 182.0, spm: 7.6, stroke: 2.4, cycle: 2, steamTons: 2100, currentDay: 121, cumOilBbl: 9800, sor: 5.6, bhpBar: 43.0, whpBar: 3.6, vfdHz: 49.1 },
  'BW-DEMO-008': { peakTemp: 198.0, spm: 6.9, stroke: 2.6, cycle: 3, steamTons: 2500, currentDay: 55,  cumOilBbl: 6900, sor: 3.9, bhpBar: 51.0, whpBar: 4.8, vfdHz: 44.6 },
  'BW-DEMO-009': { peakTemp: 210.0, spm: 8.0, stroke: 2.4, cycle: 4, steamTons: 2700, currentDay: 27,  cumOilBbl: 3900, sor: 3.0, bhpBar: 56.0, whpBar: 5.7, vfdHz: 51.7 },
  'BW-DEMO-010': { peakTemp: 176.0, spm: 7.4, stroke: 2.4, cycle: 1, steamTons: 1900, currentDay: 97,  cumOilBbl: 8200, sor: 5.3, bhpBar: 45.0, whpBar: 3.9, vfdHz: 47.8 },
  'BW-DEMO-011': { peakTemp: 194.0, spm: 6.2, stroke: 2.6, cycle: 3, steamTons: 2400, currentDay: 74,  cumOilBbl: 7600, sor: 4.1, bhpBar: 49.0, whpBar: 4.4, vfdHz: 40.1 },
  'BW-DEMO-012': { peakTemp: 185.0, spm: 8.4, stroke: 2.4, cycle: 2, steamTons: 2200, currentDay: 63,  cumOilBbl: 7200, sor: 4.4, bhpBar: 48.0, whpBar: 4.2, vfdHz: 54.3 },
};

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

// ---- thermal ----------------------------------------------------------------

const NATIVE_TEMP_C = 47.0;
const CONDUCTION_PER_DAY = 0.0135;
const CONVECTION_PER_BBL = 0.00008;
const TYPICAL_RATE_BPD = 90.0;

/** reservoir_heat.predict_temperature_at_day with the default production rate. */
export function reservoirTempAtDay(day: number, peakTempC: number): number {
  if (day <= 0) return peakTempC;
  const decay = CONDUCTION_PER_DAY + CONVECTION_PER_BBL * TYPICAL_RATE_BPD;
  const temp = NATIVE_TEMP_C + (peakTempC - NATIVE_TEMP_C) * Math.exp(-decay * day);
  return Math.max(NATIVE_TEMP_C, temp);
}

// ---- viscosity --------------------------------------------------------------

/** viscosity.calculate_viscosity: Walther / ASTM D341 plus a Barus pressure term. */
export function waltherViscosityCp(tempC: number, pressureBar = 55.0): number {
  const t = clamp(tempC, 10, 350);
  const density = clamp((945.0 / 1000.0) * (1.0 - 0.0007 * (t - 47.0)), 0.75, 1.05);

  const exponent = clamp(8.924 - 3.315 * Math.log10(t + 273.15), -1.0, 2.5);
  const kinematic = Math.max(1.0, Math.pow(10, Math.pow(10, exponent)) - 0.7);

  let mu = kinematic * density;
  if (pressureBar > 55.0) mu *= Math.exp(0.0025 * (pressureBar - 55.0));
  return mu;
}

// ---- rod pump ---------------------------------------------------------------

const PUMP_DEPTH_M = 900.0;
const PLUNGER_AREA_M2 = (Math.PI / 4) * Math.pow(0.05715, 2);
const ROD_WEIGHT_AIR_N = 31200.0;
const FLUID_DENSITY = 945.0;
const BUOYANT_ROD_N = ROD_WEIGHT_AIR_N * (1.0 - FLUID_DENSITY / 7850.0);
const FLUID_LOAD_N = PLUNGER_AREA_M2 * PUMP_DEPTH_M * FLUID_DENSITY * 9.81;
const N_TO_LBF = 0.224809;

export interface SrpResult {
  pprlLbs: number;
  mprlLbs: number;
  risk: number;
  floating: boolean;
  velocityRatio: number;
  dispBblDay: number;
  impactRisk: number;
  productionBpd: number;
  pumpEfficiencyPct: number;
  electricalKw: number;
  kwhPerBarrel: number;
}

/** rod_pump.evaluate_srp_performance: API RP 11L loads, Couette + valve drag, rod-float score. */
export function evaluateSrp(strokeM: number, spm: number, viscCp: number): SrpResult {
  const omega = 2 * Math.PI * (spm / 60);
  const vPeak = (strokeM * omega) / 2;
  const aPeak = (strokeM * omega * omega) / 2;
  const inertiaN = (ROD_WEIGHT_AIR_N / 9.81) * aPeak;

  const vMean = (2 * strokeM * spm) / 60;
  const mu = viscCp * 0.001;
  const shearGeometry = (2 * Math.PI) / Math.log(Math.max(1.05, 0.031 / 0.01111));
  const rodShearN = shearGeometry * mu * vMean * PUMP_DEPTH_M;
  const valveDropPa = (8 * mu * 1.2 * vMean) / (0.015 * 0.015);
  const dragN = rodShearN + valveDropPa * PLUNGER_AREA_M2 * 0.65;

  const pprlLbs = (BUOYANT_ROD_N + FLUID_LOAD_N + inertiaN + dragN) * N_TO_LBF;
  const mprlLbs = (BUOYANT_ROD_N - inertiaN - dragN) * N_TO_LBF;

  const sinkerPullN = BUOYANT_ROD_N * 0.30;
  const marginLbs = (sinkerPullN - (dragN * 0.5 + inertiaN)) * N_TO_LBF;
  const terminalSpeed = sinkerPullN / Math.max(1.0, (dragN / Math.max(0.001, vMean)) * 0.5);
  const velocityRatio = vPeak / Math.max(0.05, terminalSpeed);

  const risk = clamp(1 / (1 + Math.exp(-6.5 * (velocityRatio - 0.75))), 0.01, 0.99);
  const floating = velocityRatio >= 0.80 || marginLbs < 200.0;

  const dispM3Day = PLUNGER_AREA_M2 * strokeM * spm * 1440;
  const dispBblDay = dispM3Day * 6.28981;
  const fillage = Math.min(1.0, 0.88 * Math.max(0.55, 1.0 - 0.000045 * viscCp));
  const productionBpd = dispBblDay * fillage;

  const hydraulicKw = (dispM3Day * FLUID_DENSITY * 9.81 * PUMP_DEPTH_M) / (86400 * 1000);
  const electricalKw = (hydraulicKw + (dragN * vPeak) / 1000) / 0.82;

  return {
    pprlLbs, mprlLbs, risk, floating, velocityRatio, dispBblDay,
    impactRisk: Math.min(1.0, risk * 1.12),
    productionBpd,
    pumpEfficiencyPct: fillage * 100,
    electricalKw,
    kwhPerBarrel: (electricalKw * 24) / Math.max(1.0, productionBpd),
  };
}
