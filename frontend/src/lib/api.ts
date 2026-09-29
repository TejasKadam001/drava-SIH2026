// HTTP client for the Drava inference service. Every call falls back to the offline module,
// so the console stays usable if the service is asleep or unreachable.

import {
  DynoCardData, FailureIntelligence, OptimizationResult, ProductionForecast, TelemetryFrame,
} from '../contracts/domain';
import {
  OFFLINE_FAILURE, OFFLINE_FORECAST, OFFLINE_OPTIMIZATION,
  offlineCopilotReply, offlineDynoCard, offlineTelemetry,
} from './offline';

// Screens import the client-side physics from here, so re-export it.
export { WELL_PARAMS, reservoirTempAtDay, waltherViscosityCp, evaluateSrp } from './physics';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DEFAULT_WELL = 'BW-DEMO-001';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed`);
  return res.json();
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed`);
  return res.json();
}

/** Ask the API; on any failure return whatever `fallback` produces. */
async function withFallback<T>(request: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await request();
  } catch {
    return fallback();
  }
}

export const api = {
  getTelemetry(wellId: string = DEFAULT_WELL): Promise<TelemetryFrame> {
    return withFallback(
      () => getJson(`/v1/wells/${wellId}/telemetry`),
      () => offlineTelemetry(wellId));
  },

  getDynoCard(wellId: string = DEFAULT_WELL): Promise<DynoCardData> {
    return withFallback(
      () => getJson(`/v1/wells/${wellId}/srp/dyno-card`),
      () => offlineDynoCard(wellId));
  },

  getProductionForecast(wellId: string = DEFAULT_WELL): Promise<ProductionForecast> {
    // Send this well's own state rather than one fixed input set for every well.
    const state = offlineTelemetry(wellId);
    return withFallback(
      () => postJson('/v1/forecast/rate', {
        temperature_c: state.thermal_state.reservoir_temperature_c,
        pressure_bar: state.pressure_state.bottomhole_pressure_bar,
        spm: state.srp_operating_state.spm,
        stroke_length_m: state.srp_operating_state.stroke_length_m,
        days_since_injection: state.cycle_info.days_in_production,
        recent_oil_rate_bpd: state.production_state.oil_rate_bpd,
      }),
      () => OFFLINE_FORECAST);
  },

  getFailureIntelligence(wellId: string = DEFAULT_WELL): Promise<FailureIntelligence> {
    const state = offlineTelemetry(wellId);
    return withFallback(
      () => postJson('/v1/risk/failure', {
        stroke_length_m: state.srp_operating_state.stroke_length_m,
        spm: state.srp_operating_state.spm,
        temperature_c: state.thermal_state.reservoir_temperature_c,
        pressure_bar: state.pressure_state.bottomhole_pressure_bar,
        days_in_production: state.cycle_info.days_in_production,
      }),
      () => OFFLINE_FAILURE);
  },

  runOptimization(wellId: string = DEFAULT_WELL): Promise<OptimizationResult> {
    return withFallback(
      () => postJson('/v1/plan/joint', {
        well_id: wellId,
        weight_production: 0.4,
        weight_sor: 0.25,
        weight_energy: 0.15,
        weight_risk: 0.20,
      }),
      () => OFFLINE_OPTIMIZATION);
  },

  queryCopilot(query: string, wellId: string = DEFAULT_WELL): Promise<{ answer: string; tools_used: string[] }> {
    return withFallback(
      () => postJson('/v1/assistant/ask', { query, well_id: wellId }),
      () => offlineCopilotReply(wellId));
  },

  getTimeMachineState(wellId: string, day: number): TelemetryFrame {
    return offlineTelemetry(wellId, day);
  },
};
