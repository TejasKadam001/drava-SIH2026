"""
Reservoir heat balance for Cyclic Steam Stimulation.

Three stages are modelled:

1. Heat injected      Q = m * [ cp_w * (T_steam - T_native) + x * L_v ]
2. Peak temperature   heat left after soak losses is spread over a heated cylinder
                      whose radius is sized from the retained enthalpy
3. Cool-down          exponential decay towards native temperature, with a
                      conduction term (scaled by heated radius) plus a convective
                      term from produced fluid replacing hot oil
"""

import math
from typing import Any, Dict, List, Optional

_OIL_CP_KJ_KG_K = 2.1
_OIL_DENSITY_KG_M3 = 945.0
_SOAK_LOSS_PER_DAY = 0.012
_REFERENCE_RADIUS_M = 11.8  # radius of a 2200 t / 5-day soak job: decay rate unchanged there
_CONVECTION_PER_BBL = 0.00008


class ReservoirHeat:
    """CSS heating and post-injection thermal decay."""

    def __init__(self,
                 native_temp_c: float = 47.0,
                 steam_temp_c: float = 295.0,
                 steam_quality: float = 0.78,
                 latent_heat_kj_kg: float = 1420.0,
                 water_cp_kj_kg_k: float = 4.184,
                 formation_thickness_m: float = 18.0,
                 porosity: float = 0.26,
                 rock_density_kg_m3: float = 2450.0,
                 rock_cp_kj_kg_k: float = 0.92,
                 conduction_decay_rate: float = 0.0135):
        self.native_temp = native_temp_c
        self.steam_temp = steam_temp_c
        self.steam_quality = steam_quality
        self.latent_heat = latent_heat_kj_kg
        self.water_cp = water_cp_kj_kg_k
        self.h = formation_thickness_m
        self.porosity = porosity
        self.rock_density = rock_density_kg_m3
        self.rock_cp = rock_cp_kj_kg_k
        self.lambda_cond = conduction_decay_rate

        # Volumetric heat capacity of oil-saturated rock, kJ / (m3 K)
        rock_part = (1.0 - porosity) * rock_density_kg_m3 * rock_cp_kj_kg_k
        fluid_part = porosity * _OIL_DENSITY_KG_M3 * _OIL_CP_KJ_KG_K
        self.bulk_volumetric_cp = rock_part + fluid_part

    def calculate_injection_heat(self, steam_mass_tons: float, steam_quality: float = None) -> float:
        """Total enthalpy delivered to the formation, in kJ."""
        quality = self.steam_quality if steam_quality is None else steam_quality
        sensible = self.water_cp * (self.steam_temp - self.native_temp)
        latent = quality * self.latent_heat
        return steam_mass_tons * 1000.0 * (sensible + latent)

    def calculate_peak_temperature(self, steam_mass_tons: float, soak_days: float,
                                  thermal_efficiency: float = 0.72) -> Dict[str, float]:
        """Peak reservoir temperature and heated radius once the soak period ends."""
        injected_kj = self.calculate_injection_heat(steam_mass_tons)
        retained_kj = injected_kj * thermal_efficiency * math.exp(-_SOAK_LOSS_PER_DAY * soak_days)

        # Size the heated cylinder assuming it warms by 75% of the steam-to-native gap.
        design_rise = 0.75 * (self.steam_temp - self.native_temp)
        volume_m3 = retained_kj / (self.bulk_volumetric_cp * design_rise)
        radius_m = min(45.0, math.sqrt(max(4.0, volume_m3 / (math.pi * self.h))))

        cylinder_capacity = math.pi * radius_m ** 2 * self.h * self.bulk_volumetric_cp
        peak = self.native_temp + retained_kj / cylinder_capacity
        peak = min(self.steam_temp - 25.0, max(self.native_temp + 15.0, peak))

        return {
            "peak_temperature_c": float(round(peak, 2)),
            "heated_radius_m": float(round(radius_m, 2)),
            "total_heat_injected_gj": float(round(injected_kj / 1e6, 2)),
            "heat_retained_post_soak_gj": float(round(retained_kj / 1e6, 2)),
        }

    def predict_temperature_at_day(self, day_in_production: float, peak_temp_c: float,
                                   avg_daily_prod_bbl: float = 90.0,
                                   heated_radius_m: Optional[float] = None) -> float:
        """
        Reservoir temperature on a given production day.

        When a heated radius is supplied, conductive loss is scaled by the
        zone's surface-to-volume ratio: bigger steam slugs cool more slowly.
        """
        if day_in_production <= 0:
            return peak_temp_c

        conduction = self.lambda_cond
        if heated_radius_m:
            conduction *= math.sqrt(_REFERENCE_RADIUS_M / max(4.0, heated_radius_m))

        decay = conduction + _CONVECTION_PER_BBL * avg_daily_prod_bbl
        excess = (peak_temp_c - self.native_temp) * math.exp(-decay * day_in_production)

        return float(round(max(self.native_temp, self.native_temp + excess), 2))

    def generate_cooling_curve(self, peak_temp_c: float, max_days: int = 180,
                               step_days: int = 5) -> List[Dict[str, Any]]:
        """Time series of the cool-down, used by the digital-twin time slider."""
        span = peak_temp_c - self.native_temp + 1e-5
        points = []
        for day in range(0, max_days + 1, step_days):
            temp = self.predict_temperature_at_day(float(day), peak_temp_c)
            points.append({
                "day": day,
                "reservoir_temperature_c": temp,
                "thermal_decay_fraction": round(1.0 - (temp - self.native_temp) / span, 3),
            })
        return points
