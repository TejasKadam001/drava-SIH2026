"""
Synthetic telemetry for the three Baghewala demo wells.

Every frame carries the data-honesty watermark required by SIH26120:
"SIMULATED / SYNTHETIC - NOT OIL INDIA FIELD DATA".

The signals are coupled the way the physics couples them: steam raises reservoir
temperature, viscosity falls, inflow rises; as the reservoir cools viscosity climbs,
annular drag grows, rod loads distort and rod-float / impact hazards rise.
"""

import copy
import math
import os
import random
import sys
import time
from typing import Any, Dict, List

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from wellphysics.viscosity import CrudeViscosity
from wellphysics.reservoir_heat import ReservoirHeat
from wellphysics.rod_pump import RodPump
from wellphysics.wellbore import WellboreColumn

_WATERMARK = "SIMULATED / SYNTHETIC - NOT OIL INDIA FIELD DATA"
_DEFAULT_WELL = "BW-DEMO-001"

_DEMO_WELLS: Dict[str, Dict[str, Any]] = {
    # mid-to-late cycle, cooling in progress
    "BW-DEMO-001": {
        "name": "Baghewala Demo Well 001",
        "depth_m": 950.0, "pump_depth_m": 900.0, "cycle_number": 3,
        "steam_injected_tons": 2400.0, "soak_days": 6.0, "peak_temperature_c": 192.0,
        "days_in_production": 68, "spm": 6.8, "stroke_length_m": 2.4, "vfd_hz": 44.0,
        "bottomhole_pressure_bar": 52.0, "wellhead_pressure_bar": 4.5,
        "cumulative_oil_bbl": 7450.0, "sor": 3.8,
    },
    # early cycle: hot, high rate
    "BW-DEMO-002": {
        "name": "Baghewala Demo Well 002 (Early Flush Cycle)",
        "depth_m": 960.0, "pump_depth_m": 910.0, "cycle_number": 4,
        "steam_injected_tons": 2800.0, "soak_days": 7.0, "peak_temperature_c": 215.0,
        "days_in_production": 14, "spm": 7.2, "stroke_length_m": 2.6, "vfd_hz": 46.5,
        "bottomhole_pressure_bar": 58.0, "wellhead_pressure_bar": 6.2,
        "cumulative_oil_bbl": 2450.0, "sor": 2.6,
    },
    # late cycle: cold reservoir, pumping too fast -> severe rod-float threat
    "BW-DEMO-003": {
        "name": "Baghewala Demo Well 003 (Critical Cooling Stage)",
        "depth_m": 940.0, "pump_depth_m": 890.0, "cycle_number": 2,
        "steam_injected_tons": 2100.0, "soak_days": 5.0, "peak_temperature_c": 178.0,
        "days_in_production": 105, "spm": 7.8, "stroke_length_m": 2.4, "vfd_hz": 50.4,
        "bottomhole_pressure_bar": 44.0, "wellhead_pressure_bar": 3.8,
        "cumulative_oil_bbl": 8800.0, "sor": 5.1,
    },
}


class SyntheticFeed:
    """Produces correlated live frames and back-filled histories for the demo wells."""

    def __init__(self):
        self.visc_model = CrudeViscosity()
        self.reservoir_heat = ReservoirHeat()
        self.rod_pump = RodPump()
        self.wellbore = WellboreColumn(viscosity=self.visc_model)
        self.wells_state = copy.deepcopy(_DEMO_WELLS)

    def _well(self, well_id: str) -> Dict[str, Any]:
        return self.wells_state.get(well_id, self.wells_state[_DEFAULT_WELL])

    def generate_current_telemetry(self, well_id: str = _DEFAULT_WELL) -> Dict[str, Any]:
        """One thermodynamically consistent telemetry frame with light sensor noise."""
        w = self._well(well_id)
        day = w["days_in_production"]
        peak_t = w["peak_temperature_c"]

        res_temp_c = self.reservoir_heat.predict_temperature_at_day(float(day), peak_t)
        noisy_temp = res_temp_c + random.uniform(-0.35, 0.35)
        viscosity_cp = self.visc_model.calculate_viscosity(noisy_temp, w["bottomhole_pressure_bar"])

        srp = self.rod_pump.evaluate_srp_performance(w["stroke_length_m"], w["spm"], viscosity_cp)

        oil_rate = max(2.0, srp["estimated_production_bpd"] * (1.0 + random.uniform(-0.015, 0.015)))
        pprl = srp["pprl_lbs"] + random.uniform(-80.0, 80.0)
        mprl = srp["mprl_lbs"] + random.uniform(-40.0, 40.0)
        motor_kw = srp["electrical_power_kw"] + random.uniform(-0.25, 0.25)

        wellbore = self.wellbore.discretize_profile(res_temp_c, w["bottomhole_pressure_bar"])

        return {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "well_id": well_id,
            "data_source_mode": "SIMULATION",
            "scientific_honesty_disclaimer": _WATERMARK,
            "cycle_info": {
                "cycle_number": w["cycle_number"],
                "days_in_production": day,
                "steam_injected_tons": w["steam_injected_tons"],
                "soak_days": w["soak_days"],
                "sor_cumulative": w["sor"],
            },
            "thermal_state": {
                "reservoir_temperature_c": round(noisy_temp, 2),
                "peak_cycle_temperature_c": peak_t,
                "cooling_rate_deg_per_week": round(2.8 * math.exp(-0.015 * day), 2),
            },
            "fluid_state": {
                "estimated_viscosity_cp": round(viscosity_cp, 1),
                "darcy_mobility_md_cp": self.visc_model.calculate_mobility(noisy_temp),
                "oil_density_kg_m3": 945.0,
            },
            "production_state": {
                "oil_rate_bpd": round(oil_rate, 1),
                "water_rate_bpd": round(oil_rate * 0.35, 1),
                "cumulative_oil_bbl": round(w["cumulative_oil_bbl"], 1),
                "pump_volumetric_efficiency_pct": srp["pump_efficiency_pct"],
            },
            "srp_operating_state": {
                "spm": w["spm"],
                "stroke_length_m": w["stroke_length_m"],
                "vfd_frequency_hz": w["vfd_hz"],
                "pprl_lbs": round(pprl, 1),
                "mprl_lbs": round(mprl, 1),
                "motor_power_kw": round(motor_kw, 2),
                "kwh_per_barrel": srp["kwh_per_barrel"],
                "rod_floating_detected": srp["rod_floating_detected"],
                "rod_floating_risk": srp["rod_floating_risk"],
                "impact_loading_risk": srp["impact_loading_risk"],
            },
            "pressure_state": {
                "bottomhole_pressure_bar": w["bottomhole_pressure_bar"],
                "wellhead_pressure_bar": w["wellhead_pressure_bar"],
            },
            "wellbore_profile_summary": wellbore[::2],
            "data_quality_score": "GOOD",
        }

    def generate_historical_time_series(self, well_id: str = _DEFAULT_WELL, days: int = 90) -> List[Dict[str, Any]]:
        """Day-by-day history showing thermal decay and the resulting risk build-up."""
        w = self._well(well_id)
        peak_t = w["peak_temperature_c"]

        rows = []
        for day in range(1, days + 1):
            temp = self.reservoir_heat.predict_temperature_at_day(float(day), peak_t)
            mu = self.visc_model.calculate_viscosity(temp)
            srp = self.rod_pump.evaluate_srp_performance(w["stroke_length_m"], w["spm"], mu)
            rows.append({
                "day": day,
                "reservoir_temperature_c": round(temp, 1),
                "viscosity_cp": round(mu, 1),
                "oil_rate_bpd": round(srp["estimated_production_bpd"] * (1.0 + random.uniform(-0.02, 0.02)), 1),
                "pprl_lbs": round(srp["pprl_lbs"], 0),
                "mprl_lbs": round(srp["mprl_lbs"], 0),
                "rod_floating_risk": srp["rod_floating_risk"],
                "motor_power_kw": round(srp["electrical_power_kw"], 2),
                "rod_floating_flag": srp["rod_floating_detected"],
            })
        return rows
