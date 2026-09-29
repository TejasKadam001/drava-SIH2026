"""
One-dimensional wellbore model.

The well is cut into equal depth slices. For every node the model reports the
fluid temperature, pressure, viscosity and density, and flags the node that
sits at the pump. A Couette-flow integral over those nodes gives the viscous
drag the moving rod string has to overcome.
"""

import math
from typing import Any, Dict, List

from .viscosity import CrudeViscosity

_NATIVE_DENSITY_KG_M3 = 945.0
_DENSITY_EXPANSION_PER_K = 0.0007
_REFERENCE_TEMP_C = 47.0
_COOLING_EXPONENT = 0.65  # fluid loses heat fastest near surface


class WellboreColumn:
    """Depth-discretised temperature / pressure / viscosity profile of a producer."""

    def __init__(self,
                 total_depth_m: float = 950.0,
                 pump_depth_m: float = 900.0,
                 tubing_id_mm: float = 62.0,
                 casing_id_mm: float = 152.4,
                 surface_ambient_temp_c: float = 32.0,
                 viscosity: CrudeViscosity = None):
        self.td = total_depth_m
        self.pump_depth = pump_depth_m
        self.tubing_id = tubing_id_mm / 1000.0
        self.casing_id = casing_id_mm / 1000.0
        self.t_ambient_surf = surface_ambient_temp_c
        self.visc_model = viscosity or CrudeViscosity()

    def discretize_profile(self, bottomhole_temp_c: float, bottomhole_pressure_bar: float = 45.0,
                           wellhead_backpressure_bar: float = 4.0,
                           num_segments: int = 10) -> List[Dict[str, Any]]:
        """Return one record per depth node from surface (0 m) to total depth."""
        step = self.td / float(num_segments)
        temp_span = bottomhole_temp_c - self.t_ambient_surf
        press_span = bottomhole_pressure_bar - wellhead_backpressure_bar

        nodes = []
        for idx in range(num_segments + 1):
            depth = idx * step
            frac = depth / self.td

            temp_c = self.t_ambient_surf + temp_span * frac ** _COOLING_EXPONENT
            press_bar = wellhead_backpressure_bar + press_span * frac
            mu_cp = self.visc_model.calculate_viscosity(temp_c, press_bar)
            rho = _NATIVE_DENSITY_KG_M3 * (
                1.0 - _DENSITY_EXPANSION_PER_K * (temp_c - _REFERENCE_TEMP_C)
            )

            nodes.append({
                "segment_index": idx,
                "depth_m": round(depth, 1),
                "temperature_c": round(temp_c, 2),
                "pressure_bar": round(press_bar, 2),
                "viscosity_cp": round(mu_cp, 1),
                "density_kg_m3": round(rho, 1),
                "is_pump_zone": abs(depth - self.pump_depth) <= step / 2.0,
            })
        return nodes

    def calculate_integrated_viscous_drag(self, profile: List[Dict[str, Any]], rod_diameter_mm: float,
                                         rod_velocity_m_s: float) -> float:
        """
        Viscous shear on the rod string, in newtons.

        Each slice contributes  2*pi*mu*v*dz / ln(r_tubing / r_rod)  using the mean
        viscosity of its two bounding nodes.
        """
        rod_radius = rod_diameter_mm / 2000.0
        tubing_radius = self.tubing_id / 2.0
        geometry = 2.0 * math.pi / math.log(tubing_radius / rod_radius)
        speed = abs(rod_velocity_m_s)

        drag_n = 0.0
        for upper, lower in zip(profile, profile[1:]):
            dz = lower["depth_m"] - upper["depth_m"]
            mu_pa_s = 0.5 * (upper["viscosity_cp"] + lower["viscosity_cp"]) * 1e-3
            drag_n += geometry * mu_pa_s * speed * dz

        return float(round(drag_n, 2))
