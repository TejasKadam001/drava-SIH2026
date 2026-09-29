// Everything the console shows when the API cannot be reached: a telemetry frame built from the
// client-side physics, plus canned payloads that match the API's response shapes.

import {
  DynoCardData, FailureIntelligence, OptimizationResult, ProductionForecast, TelemetryFrame,
} from '../contracts/domain';
import { WELL_PARAMS, evaluateSrp, reservoirTempAtDay, waltherViscosityCp } from './physics';

const round = (v: number, dp = 1) => parseFloat(v.toFixed(dp));
const DEFAULT_WELL = 'BW-DEMO-001';

export function offlineTelemetry(wellId: string, dayOverride?: number): TelemetryFrame {
  const params = WELL_PARAMS[wellId] ?? WELL_PARAMS[DEFAULT_WELL];
  const day = dayOverride !== undefined ? dayOverride : params.currentDay;

  const temp = reservoirTempAtDay(day, params.peakTemp);
  const visc = waltherViscosityCp(temp, params.bhpBar);
  const pump = evaluateSrp(params.stroke, params.spm, visc);

  // Fluid cools from reservoir temperature towards 32 C at surface; viscosity follows the same curve.
  const along = (fraction: number) => 32 + (temp - 32) * fraction;
  const wellbore = [
    { depth_m: 0,   t: 32.0,          p: params.whpBar },
    { depth_m: 300, t: along(0.45),   p: 19.8 },
    { depth_m: 600, t: along(0.75),   p: 35.2 },
    { depth_m: 900, t: temp,          p: 48.0 },
    { depth_m: 950, t: temp + 1.5,    p: params.bhpBar },
  ].map((n) => ({
    depth_m: n.depth_m,
    temperature_c: round(n.t),
    pressure_bar: n.p,
    viscosity_cp: Math.round(waltherViscosityCp(n.t, n.p)),
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
      sor_cumulative: params.sor,
    },
    thermal_state: {
      reservoir_temperature_c: round(temp, 2),
      peak_cycle_temperature_c: params.peakTemp,
      cooling_rate_deg_per_week: round(2.8 * Math.exp(-0.015 * day), 2),
    },
    fluid_state: {
      estimated_viscosity_cp: round(visc),
      darcy_mobility_md_cp: round((850.0 * 0.75) / visc, 4),
      oil_density_kg_m3: 945.0,
    },
    production_state: {
      oil_rate_bpd: round(pump.productionBpd),
      water_rate_bpd: round(pump.productionBpd * 0.35),
      cumulative_oil_bbl: params.cumOilBbl,
      pump_volumetric_efficiency_pct: round(pump.pumpEfficiencyPct),
    },
    srp_operating_state: {
      spm: params.spm,
      stroke_length_m: params.stroke,
      vfd_frequency_hz: params.vfdHz,
      pprl_lbs: round(pump.pprlLbs),
      mprl_lbs: round(pump.mprlLbs),
      motor_power_kw: round(pump.electricalKw, 2),
      kwh_per_barrel: round(pump.kwhPerBarrel, 2),
      rod_floating_detected: pump.floating,
      rod_floating_risk: round(pump.risk, 3),
      impact_loading_risk: round(pump.impactRisk, 3),
    },
    pressure_state: {
      bottomhole_pressure_bar: params.bhpBar,
      wellhead_pressure_bar: params.whpBar,
    },
    wellbore_profile_summary: wellbore,
    data_quality_score: 'GOOD',
  };
}

/** A plausible 40-point card: linear load build on the upstroke, release on the downstroke. */
export function offlineDynoCard(wellId: string): DynoCardData {
  const strokeM = 2.4;
  const strokeIn = strokeM * 39.3701;
  const count = 40;

  const card_points = Array.from({ length: count }, (_, i) => {
    const theta = (2 * Math.PI * i) / count;
    const posIn = (strokeIn / 2) * (1 - Math.cos(theta));
    const surface = theta <= Math.PI
      ? 3500 + 11500 * Math.min(1.0, theta / 0.45)
      : 15000 - 11500 * Math.min(1.0, (theta - Math.PI) / 0.45);
    return {
      crank_angle_deg: Math.round((theta * 180) / Math.PI),
      position_in: parseFloat(posIn.toFixed(1)),
      position_m: parseFloat((posIn / 39.3701).toFixed(2)),
      surface_load_lbs: Math.round(surface),
      downhole_load_lbs: Math.round(surface * 0.85),
    };
  });

  return {
    well_id: wellId,
    stroke_length_m: strokeM,
    spm: 6.8,
    viscosity_cp: 1450.0,
    rod_floating_detected: false,
    card_points,
  };
}

export const OFFLINE_FORECAST: ProductionForecast = {
  model_name: 'hybrid_production_forecaster',
  model_version: 'v1.4.0',
  training_dataset: 'Tier-A Volve + Tier-B Baghewala Literature',
  current_viscosity_cp: 1240.0,
  physics_baseline_bpd: 84.5,
  ml_residual_bpd: -2.3,
  forecast_horizons: {
    t_plus_1:  { day: 1,  prediction_bpd: 82.2, lower_95_bpd: 78.1, upper_95_bpd: 86.3, uncertainty_pct: 5.0 },
    t_plus_7:  { day: 7,  prediction_bpd: 79.5, lower_95_bpd: 73.1, upper_95_bpd: 85.9, uncertainty_pct: 8.0 },
    t_plus_30: { day: 30, prediction_bpd: 71.8, lower_95_bpd: 61.7, upper_95_bpd: 81.9, uncertainty_pct: 14.0 },
  },
  data_quality: 'GOOD',
  confidence: 'HIGH',
};

export const OFFLINE_FAILURE: FailureIntelligence = {
  model_version: 'v1.4.0',
  overall_health_score: 72.4,
  current_viscosity_cp: 1240.0,
  risks: {
    rod_floating:   { probability: 0.385, level: 'MEDIUM', is_active_threat: false },
    impact_loading: { probability: 0.431, level: 'MEDIUM', is_active_threat: false },
    parted_rod:     { probability: 0.142, level: 'LOW',    is_active_threat: false },
    pump_unseating: { probability: 0.082, level: 'LOW',    is_active_threat: false },
  },
  mechanical_loads: {
    pprl_lbs: 14850.0,
    mprl_lbs: 2650.0,
    viscous_drag_lbf: 2320.0,
    net_downstroke_force_lbs: 1420.0,
  },
  feature_attribution_shap: [
    { feature: 'Fluid Viscosity (Thermal Decay)', contribution_pct: 48.5 },
    { feature: 'Pumping Speed (SPM)', contribution_pct: 32.1 },
    { feature: 'Stroke Length & Inertia', contribution_pct: 19.4 },
  ],
  proactive_action_recommended: false,
  recommended_action: 'Monitor thermal decay closely; if temperature drops below 58C, reduce SPM by 1.5',
};

export const OFFLINE_OPTIMIZATION: OptimizationResult = {
  status: 'OPTIMIZATION_CONVERGED',
  algorithm: 'Constrained Multi-Objective Pareto Grid Search',
  recommended_plan: {
    css: { steam_volume_tons: 2400.0, soak_time_days: 6.0, injection_pressure_bar: 80.0, target_cutoff_days: 115 },
    srp: { stroke_length_m: 2.8, spm: 5.5, vfd_frequency_hz: 35.5, operating_mode: 'THERMAL_TRACKING_CONTINUOUS' },
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
    confidence_pct: 91.5,
  },
  constraint_verification: {
    formation_fracture_safety: 'PASSED (80.0 bar < 110.0 bar limit)',
    rod_floating_margin: 'PASSED (8.5% risk < 40% threshold)',
    gearbox_peak_torque: 'PASSED (Well below 320,000 in-lbs rating)',
    api_allowable_stress: 'PASSED (Goodman ratio < 0.65)',
  },
  pareto_frontier: [
    { production_bpd: 118.5, sor: 4.85, energy_kwh_bbl: 2.45, failure_risk: 0.32,  spm: 7.5, stroke_m: 2.8, steam_tons: 3000, composite_score: 0.742 },
    { production_bpd: 110.2, sor: 4.10, energy_kwh_bbl: 2.10, failure_risk: 0.22,  spm: 6.5, stroke_m: 2.8, steam_tons: 2600, composite_score: 0.815 },
    { production_bpd: 104.2, sor: 3.42, energy_kwh_bbl: 1.65, failure_risk: 0.085, spm: 5.5, stroke_m: 2.8, steam_tons: 2400, composite_score: 0.884 },
    { production_bpd: 94.6,  sor: 2.95, energy_kwh_bbl: 1.42, failure_risk: 0.045, spm: 4.5, stroke_m: 2.4, steam_tons: 2200, composite_score: 0.862 },
    { production_bpd: 81.0,  sor: 2.65, energy_kwh_bbl: 1.25, failure_risk: 0.021, spm: 3.5, stroke_m: 2.4, steam_tons: 1800, composite_score: 0.795 },
  ],
  rejected_alternatives_sample: [
    { spm: 8.5, stroke_m: 2.8, steam_tons: 3000, production_bpd: 126.0, rejection_reason: 'Rod floating risk (82%) exceeds safety threshold; carrier bar downstroke outruns rod sinking speed' },
    { spm: 7.5, stroke_m: 3.2, steam_tons: 2600, production_bpd: 115.0, rejection_reason: 'Peak polished rod load exceeds 22,000 lbs API beam rating' },
  ],
  decision_support_disclaimer: 'RECOMMENDATION REPRESENTS MODEL DECISION SUPPORT; REQUIRES FIELD PRODUCTION ENGINEER CONCURRENCE PRIOR TO VFD SETPOINT ADJUSTMENT.',
};

export function offlineCopilotReply(wellId: string) {
  return {
    answer: `### Drava Agent Copilot Briefing for ${wellId}\n\n**Current State Analysis:**\n- Operating at Day 68 of Cycle 3.\n- Reservoir temperature is **58.4°C**; crude viscosity has risen to **1,240 cP**.\n- SRP operates at **6.8 SPM** with a peak polished rod load of **14,850 lbs**.\n\n**Predictive Assessment:**\n- Downstroke rod sinking velocity margin is narrowing (**38.5% Rod Floating Risk**).\n- If unadjusted, continuing at 6.8 SPM through Day 90 will trigger severe impact pounding and rod-parting fatigue.\n\n**Joint Optimization Recommendation:**\n- Lower SRP VFD to **5.5 SPM** (35.5 Hz) and extend stroke to **2.8 m**.\n- Schedule Cycle 4 CSS steam injection of **2,400 tons** at Day 115.\n- Projected outcome: **+18.4% clean oil, -22% SOR, Zero Rod Floating Risk**.\n\n*All recommendations are verified against API 11L limits and formation fracture bounds.*`,
    tools_used: ['get_well_state', 'predict_failure', 'optimize_operations', 'check_constraints'],
  };
}
