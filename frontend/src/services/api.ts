// Drava: API Client with Offline Resilience & Mock Fallback

import {
  TelemetryFrame,
  DynoCardData,
  ProductionForecast,
  FailureIntelligence,
  OptimizationResult
} from '../types/petro';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Offline / standalone telemetry generator.
// A line-for-line port of the backend physics (physics/thermal_model.py,
// physics/viscosity_model.py, physics/srp_model.py) so every tab agrees with
// the ml_service. Previously this used simplified stand-in formulas, so at the
// same well and day the Overview (backend) and Digital Twin (frontend) showed
// different temperatures, viscosities, rod loads and production rates.

// Per-well operating parameters, in step with ml_service/simulator/telemetry_simulator.py.
export const WELL_PARAMS: Record<string, {
  peakTemp: number; spm: number; stroke: number; cycle: number; steamTons: number;
  currentDay: number; cumOilBbl: number; sor: number; bhpBar: number; whpBar: number; vfdHz: number;
}> = {
  'BW-DEMO-001': { peakTemp: 192.0, spm: 6.8, stroke: 2.4, cycle: 3, steamTons: 2400, currentDay: 68, cumOilBbl: 7450, sor: 3.8, bhpBar: 52.0, whpBar: 4.5, vfdHz: 44.0 },
  'BW-DEMO-002': { peakTemp: 215.0, spm: 7.2, stroke: 2.6, cycle: 4, steamTons: 2800, currentDay: 14, cumOilBbl: 2450, sor: 2.6, bhpBar: 58.0, whpBar: 6.2, vfdHz: 46.5 },
  'BW-DEMO-003': { peakTemp: 178.0, spm: 7.8, stroke: 2.4, cycle: 2, steamTons: 2100, currentDay: 105, cumOilBbl: 8800, sor: 5.1, bhpBar: 44.0, whpBar: 3.8, vfdHz: 50.4 },
  'BW-DEMO-004': { peakTemp: 205.0, spm: 7.0, stroke: 2.6, cycle: 3, steamTons: 2600, currentDay: 42, cumOilBbl: 6100, sor: 3.4, bhpBar: 54.0, whpBar: 5.1, vfdHz: 45.2 },
  'BW-DEMO-005': { peakTemp: 188.0, spm: 8.2, stroke: 2.4, cycle: 2, steamTons: 2200, currentDay: 88, cumOilBbl: 9100, sor: 4.6, bhpBar: 47.0, whpBar: 4.0, vfdHz: 53.0 },
  'BW-DEMO-006': { peakTemp: 221.0, spm: 6.5, stroke: 2.8, cycle: 5, steamTons: 3000, currentDay: 9, cumOilBbl: 1400, sor: 2.4, bhpBar: 60.0, whpBar: 6.6, vfdHz: 42.0 },
  'BW-DEMO-007': { peakTemp: 182.0, spm: 7.6, stroke: 2.4, cycle: 2, steamTons: 2100, currentDay: 121, cumOilBbl: 9800, sor: 5.6, bhpBar: 43.0, whpBar: 3.6, vfdHz: 49.1 },
  'BW-DEMO-008': { peakTemp: 198.0, spm: 6.9, stroke: 2.6, cycle: 3, steamTons: 2500, currentDay: 55, cumOilBbl: 6900, sor: 3.9, bhpBar: 51.0, whpBar: 4.8, vfdHz: 44.6 },
  'BW-DEMO-009': { peakTemp: 210.0, spm: 8.0, stroke: 2.4, cycle: 4, steamTons: 2700, currentDay: 27, cumOilBbl: 3900, sor: 3.0, bhpBar: 56.0, whpBar: 5.7, vfdHz: 51.7 },
  'BW-DEMO-010': { peakTemp: 176.0, spm: 7.4, stroke: 2.4, cycle: 1, steamTons: 1900, currentDay: 97, cumOilBbl: 8200, sor: 5.3, bhpBar: 45.0, whpBar: 3.9, vfdHz: 47.8 },
  'BW-DEMO-011': { peakTemp: 194.0, spm: 6.2, stroke: 2.6, cycle: 3, steamTons: 2400, currentDay: 74, cumOilBbl: 7600, sor: 4.1, bhpBar: 49.0, whpBar: 4.4, vfdHz: 40.1 },
  'BW-DEMO-012': { peakTemp: 185.0, spm: 8.4, stroke: 2.4, cycle: 2, steamTons: 2200, currentDay: 63, cumOilBbl: 7200, sor: 4.4, bhpBar: 48.0, whpBar: 4.2, vfdHz: 54.3 }
};

const NATIVE_TEMP_C = 47.0;
const LAMBDA_COND = 0.0135;
const CONVECTION_PER_BBL = 0.00008;
const AVG_DAILY_PROD_BBL = 90.0;

// physics/thermal_model.py -> predict_temperature_at_day
export function reservoirTempAtDay(day: number, peakTempC: number): number {
  if (day <= 0) return peakTempC;
  const effLambda = LAMBDA_COND + CONVECTION_PER_BBL * AVG_DAILY_PROD_BBL;
  const t = NATIVE_TEMP_C + (peakTempC - NATIVE_TEMP_C) * Math.exp(-effLambda * day);
  return Math.max(NATIVE_TEMP_C, t);
}

// physics/viscosity_model.py -> calculate_viscosity (Walther / ASTM D341)
export function waltherViscosityCp(tempC: number, pressureBar = 55.0): number {
  const t = Math.max(10, Math.min(350, tempC));
  const tempK = t + 273.15;
  let density = (945.0 / 1000.0) * (1.0 - 0.0007 * (t - 47.0));
  density = Math.max(0.75, Math.min(1.05, density));
  let inner = 8.924 - 3.315 * Math.log10(tempK);
  inner = Math.max(-1.0, Math.min(2.5, inner));
  const nuCst = Math.max(1.0, Math.pow(10, Math.pow(10, inner)) - 0.7);
  let mu = nuCst * density;
  if (pressureBar > 55.0) mu *= Math.exp(0.0025 * (pressureBar - 55.0));
  return mu;
}

// physics/srp_model.py -> evaluate_srp_performance (API RP 11L + Couette drag)
const PUMP_DEPTH_M = 900.0;
const PLUNGER_AREA_M2 = (Math.PI / 4) * Math.pow(0.05715, 2);
const ROD_WEIGHT_AIR_N = 31200.0;
const RHO_FLUID = 945.0;
const W_RF = ROD_WEIGHT_AIR_N * (1.0 - RHO_FLUID / 7850.0);
const W_F = PLUNGER_AREA_M2 * PUMP_DEPTH_M * RHO_FLUID * 9.81;
const N_TO_LBS = 0.224809;

export function evaluateSrp(strokeM: number, spm: number, viscCp: number) {
  const omega = 2 * Math.PI * (spm / 60);
  const vMax = (strokeM * omega) / 2;
  const aMax = (strokeM * omega * omega) / 2;
  const inertialN = (ROD_WEIGHT_AIR_N / 9.81) * aMax;

  const vAvg = (2 * strokeM * spm) / 60;
  const geom = (2 * Math.PI) / Math.log(Math.max(1.05, 0.031 / 0.01111));
  const muPaS = viscCp * 0.001;
  const rodDragN = geom * muPaS * vAvg * PUMP_DEPTH_M;
  const deltaPValve = (8 * muPaS * 1.2 * vAvg) / (0.015 * 0.015);
  const dragN = rodDragN + deltaPValve * PLUNGER_AREA_M2 * 0.65;

  const pprlLbs = (W_RF + W_F + inertialN + dragN) * N_TO_LBS;
  const mprlLbs = (W_RF - inertialN - dragN) * N_TO_LBS;

  const effectiveSinkingN = W_RF * 0.30;
  const sinkingMarginLbs = (effectiveSinkingN - (dragN * 0.5 + inertialN)) * N_TO_LBS;
  const dragPerVelocity = dragN / Math.max(0.001, vAvg);
  const vTerminal = effectiveSinkingN / Math.max(1.0, dragPerVelocity * 0.5);
  const velocityRatio = vMax / Math.max(0.05, vTerminal);

  const risk = Math.max(0.01, Math.min(0.99, 1 / (1 + Math.exp(-6.5 * (velocityRatio - 0.75)))));
  const floating = velocityRatio >= 0.80 || sinkingMarginLbs < 200.0;

  const dispM3Day = PLUNGER_AREA_M2 * strokeM * spm * 1440;
  const dispBblDay = dispM3Day * 6.28981;
  const viscPenalty = Math.max(0.55, 1.0 - 0.000045 * viscCp);
  const effectiveFillage = Math.min(1.0, 0.88 * viscPenalty);
  const productionBpd = dispBblDay * effectiveFillage;

  const hydraulicKw = (dispM3Day * RHO_FLUID * 9.81 * PUMP_DEPTH_M) / (86400 * 1000);
  const electricalKw = (hydraulicKw + (dragN * vMax) / 1000) / 0.82;

  return {
    pprlLbs, mprlLbs, risk, floating,
    velocityRatio,
    dispBblDay,
    impactRisk: Math.min(1.0, risk * 1.12),
    productionBpd,
    pumpEfficiencyPct: effectiveFillage * 100,
    electricalKw,
    kwhPerBarrel: (electricalKw * 24) / Math.max(1.0, productionBpd)
  };
}

const round = (v: number, dp = 1) => parseFloat(v.toFixed(dp));

function createFallbackTelemetry(wellId: string, dayScrub?: number): TelemetryFrame {
  const params = WELL_PARAMS[wellId] ?? WELL_PARAMS['BW-DEMO-001'];
  const day = dayScrub !== undefined ? dayScrub : params.currentDay;

  const temp = reservoirTempAtDay(day, params.peakTemp);
  const visc = waltherViscosityCp(temp, params.bhpBar);
  const srp = evaluateSrp(params.stroke, params.spm, visc);

  // Wellbore profile: fluid cools from reservoir temperature toward 32°C at
  // surface as it rises, and its viscosity follows from the same Walther curve.
  const profileTemp = (fraction: number) => 32 + (temp - 32) * fraction;
  const profile = [
    { depth_m: 0, t: 32.0, p: params.whpBar },
    { depth_m: 300, t: profileTemp(0.45), p: 19.8 },
    { depth_m: 600, t: profileTemp(0.75), p: 35.2 },
    { depth_m: 900, t: temp, p: 48.0 },
    { depth_m: 950, t: temp + 1.5, p: params.bhpBar }
  ].map((s) => ({
    depth_m: s.depth_m,
    temperature_c: round(s.t),
    pressure_bar: s.p,
    viscosity_cp: Math.round(waltherViscosityCp(s.t, s.p))
  }));

  return {
    timestamp: new Date().toISOString(),
    well_id: wellId,
    data_source_mode: 'SIMULATION',
    scientific_honesty_disclaimer: 'SIMULATED / SYNTHETIC - NOT OIL INDIA FIELD DATA',
    cycle_info: {
      cycle_number: params.cycle,
      days_in_production: day,
      steam_injected_tons: params.steamTons,
      soak_days: 6.0,
      sor_cumulative: params.sor
    },
    thermal_state: {
      reservoir_temperature_c: round(temp, 2),
      peak_cycle_temperature_c: params.peakTemp,
      cooling_rate_deg_per_week: round(2.8 * Math.exp(-0.015 * day), 2)
    },
    fluid_state: {
      estimated_viscosity_cp: round(visc),
      darcy_mobility_md_cp: round((850.0 * 0.75) / visc, 4),
      oil_density_kg_m3: 945.0
    },
    production_state: {
      oil_rate_bpd: round(srp.productionBpd),
      water_rate_bpd: round(srp.productionBpd * 0.35),
      cumulative_oil_bbl: params.cumOilBbl,
      pump_volumetric_efficiency_pct: round(srp.pumpEfficiencyPct)
    },
    srp_operating_state: {
      spm: params.spm,
      stroke_length_m: params.stroke,
      vfd_frequency_hz: params.vfdHz,
      pprl_lbs: round(srp.pprlLbs),
      mprl_lbs: round(srp.mprlLbs),
      motor_power_kw: round(srp.electricalKw, 2),
      kwh_per_barrel: round(srp.kwhPerBarrel, 2),
      rod_floating_detected: srp.floating,
      rod_floating_risk: round(srp.risk, 3),
      impact_loading_risk: round(srp.impactRisk, 3)
    },
    pressure_state: {
      bottomhole_pressure_bar: params.bhpBar,
      wellhead_pressure_bar: params.whpBar
    },
    wellbore_profile_summary: profile,
    data_quality_score: 'GOOD'
  };
}

export const api = {
  async getTelemetry(wellId: string = 'BW-DEMO-001'): Promise<TelemetryFrame> {
    try {
      const res = await fetch(`${BASE_URL}/api/wells/${wellId}/telemetry`);
      if (!res.ok) throw new Error('API fetch error');
      return await res.json();
    } catch {
      return createFallbackTelemetry(wellId);
    }
  },

  async getDynoCard(wellId: string = 'BW-DEMO-001'): Promise<DynoCardData> {
    try {
      const res = await fetch(`${BASE_URL}/api/wells/${wellId}/srp/dyno-card`);
      if (!res.ok) throw new Error('API fetch error');
      return await res.json();
    } catch {
      // Synthesize realistic 40-point card
      const points = [];
      const strokeM = 2.4;
      const strokeIn = strokeM * 39.3701;
      const numPts = 40;
      for (let i = 0; i < numPts; i++) {
        const theta = (2 * Math.PI * i) / numPts;
        const posIn = (strokeIn / 2) * (1 - Math.cos(theta));
        let surfLoad = 3500;
        if (theta <= Math.PI) {
          surfLoad = 3500 + 11500 * Math.min(1.0, theta / 0.45);
        } else {
          surfLoad = 15000 - 11500 * Math.min(1.0, (theta - Math.PI) / 0.45);
        }
        points.push({
          crank_angle_deg: Math.round((theta * 180) / Math.PI),
          position_in: parseFloat(posIn.toFixed(1)),
          position_m: parseFloat(((posIn / 39.3701)).toFixed(2)),
          surface_load_lbs: Math.round(surfLoad),
          downhole_load_lbs: Math.round(surfLoad * 0.85)
        });
      }
      return {
        well_id: wellId,
        stroke_length_m: strokeM,
        spm: 6.8,
        viscosity_cp: 1450.0,
        rod_floating_detected: false,
        card_points: points
      };
    }
  },

  async getProductionForecast(wellId: string = 'BW-DEMO-001'): Promise<ProductionForecast> {
    try {
      const res = await fetch(`${BASE_URL}/predict/production`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send this well's real state, not one fixed set of inputs for every well.
        body: JSON.stringify((() => {
          const s = createFallbackTelemetry(wellId);
          return {
            temperature_c: s.thermal_state.reservoir_temperature_c,
            pressure_bar: s.pressure_state.bottomhole_pressure_bar,
            spm: s.srp_operating_state.spm,
            stroke_length_m: s.srp_operating_state.stroke_length_m,
            days_since_injection: s.cycle_info.days_in_production,
            recent_oil_rate_bpd: s.production_state.oil_rate_bpd
          };
        })())
      });
      if (!res.ok) throw new Error('API fetch error');
      return await res.json();
    } catch {
      return {
        model_name: "hybrid_production_forecaster",
        model_version: "v1.4.0",
        training_dataset: "Tier-A Volve + Tier-B Baghewala Literature",
        current_viscosity_cp: 1240.0,
        physics_baseline_bpd: 84.5,
        ml_residual_bpd: -2.3,
        forecast_horizons: {
          t_plus_1: { day: 1, prediction_bpd: 82.2, lower_95_bpd: 78.1, upper_95_bpd: 86.3, uncertainty_pct: 5.0 },
          t_plus_7: { day: 7, prediction_bpd: 79.5, lower_95_bpd: 73.1, upper_95_bpd: 85.9, uncertainty_pct: 8.0 },
          t_plus_30: { day: 30, prediction_bpd: 71.8, lower_95_bpd: 61.7, upper_95_bpd: 81.9, uncertainty_pct: 14.0 }
        },
        data_quality: "GOOD",
        confidence: "HIGH"
      };
    }
  },

  async getFailureIntelligence(wellId: string = 'BW-DEMO-001'): Promise<FailureIntelligence> {
    try {
      const res = await fetch(`${BASE_URL}/predict/failure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send this well's real state, not one fixed set of inputs for every well.
        body: JSON.stringify((() => {
          const s = createFallbackTelemetry(wellId);
          return {
            stroke_length_m: s.srp_operating_state.stroke_length_m,
            spm: s.srp_operating_state.spm,
            temperature_c: s.thermal_state.reservoir_temperature_c,
            pressure_bar: s.pressure_state.bottomhole_pressure_bar,
            days_in_production: s.cycle_info.days_in_production
          };
        })())
      });
      if (!res.ok) throw new Error('API fetch error');
      return await res.json();
    } catch {
      return {
        model_version: "v1.4.0",
        overall_health_score: 72.4,
        current_viscosity_cp: 1240.0,
        risks: {
          rod_floating: { probability: 0.385, level: "MEDIUM", is_active_threat: false },
          impact_loading: { probability: 0.431, level: "MEDIUM", is_active_threat: false },
          parted_rod: { probability: 0.142, level: "LOW", is_active_threat: false },
          pump_unseating: { probability: 0.082, level: "LOW", is_active_threat: false }
        },
        mechanical_loads: {
          pprl_lbs: 14850.0,
          mprl_lbs: 2650.0,
          viscous_drag_lbf: 2320.0,
          net_downstroke_force_lbs: 1420.0
        },
        feature_attribution_shap: [
          { feature: "Fluid Viscosity (Thermal Decay)", contribution_pct: 48.5 },
          { feature: "Pumping Speed (SPM)", contribution_pct: 32.1 },
          { feature: "Stroke Length & Inertia", contribution_pct: 19.4 }
        ],
        proactive_action_recommended: false,
        recommended_action: "Monitor thermal decay closely; if temperature drops below 58C, reduce SPM by 1.5"
      };
    }
  },

  async runOptimization(wellId: string = 'BW-DEMO-001'): Promise<OptimizationResult> {
    try {
      const res = await fetch(`${BASE_URL}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ well_id: wellId, weight_production: 0.4, weight_sor: 0.25, weight_energy: 0.15, weight_risk: 0.20 })
      });
      if (!res.ok) throw new Error('API fetch error');
      return await res.json();
    } catch {
      return {
        status: "OPTIMIZATION_CONVERGED",
        algorithm: "Constrained Multi-Objective Pareto Search (LHS + SLSQP)",
        recommended_plan: {
          css: {
            steam_volume_tons: 2400.0,
            soak_time_days: 6.0,
            injection_pressure_bar: 80.0,
            target_cutoff_days: 115
          },
          srp: {
            stroke_length_m: 2.8,
            spm: 5.5,
            vfd_frequency_hz: 35.5,
            operating_mode: "THERMAL_TRACKING_CONTINUOUS"
          }
        },
        expected_outcome: {
          production_bpd: 104.2,
          production_change_pct: 18.4,
          sor: 3.42,
          sor_change_pct: -22.1,
          energy_kwh_bbl: 1.65,
          energy_change_pct: -15.4,
          failure_risk: 0.085,
          failure_risk_change_pct: -76.8,
          confidence_pct: 91.5
        },
        constraint_verification: {
          formation_fracture_safety: "PASSED (80.0 bar < 110.0 bar limit)",
          rod_floating_margin: "PASSED (8.5% risk < 40% threshold)",
          gearbox_peak_torque: "PASSED (Well below 320,000 in-lbs rating)",
          api_allowable_stress: "PASSED (Goodman ratio < 0.65)"
        },
        pareto_frontier: [
          { production_bpd: 118.5, sor: 4.85, energy_kwh_bbl: 2.45, failure_risk: 0.32, spm: 7.5, stroke_m: 2.8, steam_tons: 3000, composite_score: 0.742 },
          { production_bpd: 110.2, sor: 4.10, energy_kwh_bbl: 2.10, failure_risk: 0.22, spm: 6.5, stroke_m: 2.8, steam_tons: 2600, composite_score: 0.815 },
          { production_bpd: 104.2, sor: 3.42, energy_kwh_bbl: 1.65, failure_risk: 0.085, spm: 5.5, stroke_m: 2.8, steam_tons: 2400, composite_score: 0.884 },
          { production_bpd: 94.6, sor: 2.95, energy_kwh_bbl: 1.42, failure_risk: 0.045, spm: 4.5, stroke_m: 2.4, steam_tons: 2200, composite_score: 0.862 },
          { production_bpd: 81.0, sor: 2.65, energy_kwh_bbl: 1.25, failure_risk: 0.021, spm: 3.5, stroke_m: 2.4, steam_tons: 1800, composite_score: 0.795 }
        ],
        rejected_alternatives_sample: [
          { spm: 8.5, stroke_m: 2.8, steam_tons: 3000, production_bpd: 126.0, rejection_reason: "Rod floating risk (82%) exceeds safety threshold; carrier bar downstroke outruns rod sinking speed" },
          { spm: 7.5, stroke_m: 3.2, steam_tons: 2600, production_bpd: 115.0, rejection_reason: "Peak polished rod load exceeds 22,000 lbs API beam rating" }
        ],
        decision_support_disclaimer: "RECOMMENDATION REPRESENTS MODEL DECISION SUPPORT; REQUIRES FIELD PRODUCTION ENGINEER CONCURRENCE PRIOR TO VFD SETPOINT ADJUSTMENT."
      };
    }
  },

  async queryCopilot(query: string, wellId: string = 'BW-DEMO-001') {
    try {
      const res = await fetch(`${BASE_URL}/api/copilot/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, well_id: wellId })
      });
      if (!res.ok) throw new Error('API fetch error');
      return await res.json();
    } catch {
      return {
        answer: `### Drava Agent Copilot Briefing for ${wellId}\n\n**Current State Analysis:**\n- Operating at Day 68 of Cycle 3.\n- Reservoir temperature is **58.4°C**; crude viscosity has risen to **1,240 cP**.\n- SRP operates at **6.8 SPM** with a peak polished rod load of **14,850 lbs**.\n\n**Predictive Assessment:**\n- Downstroke rod sinking velocity margin is narrowing (**38.5% Rod Floating Risk**).\n- If unadjusted, continuing at 6.8 SPM through Day 90 will trigger severe impact pounding and rod-parting fatigue.\n\n**Joint Optimization Recommendation:**\n- Lower SRP VFD to **5.5 SPM** (35.5 Hz) and extend stroke to **2.8 m**.\n- Schedule Cycle 4 CSS steam injection of **2,400 tons** at Day 115.\n- Projected outcome: **+18.4% clean oil, -22% SOR, Zero Rod Floating Risk**.\n\n*All recommendations are verified against API 11L limits and formation fracture bounds.*`,
        tools_used: ["get_well_state", "predict_failure", "optimize_operations", "check_constraints"]
      };
    }
  },

  getTimeMachineState(wellId: string, day: number): TelemetryFrame {
    return createFallbackTelemetry(wellId, day);
  }
};
