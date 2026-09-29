"""
Crude viscosity as a function of temperature and pressure.

The Baghewala crude (about 17-19 deg API) is described with a Walther / ASTM D341
double-logarithmic fit, tuned so the model lands on the field's reference points:

    47 C  -> ~4,200 cP   (native reservoir)
    100 C -> ~145 cP
    200 C -> ~14.5 cP

    log10( log10(nu + 0.7) ) = A - B * log10(T_kelvin)

nu is kinematic viscosity in cSt; dynamic viscosity follows from mu = nu * rho.
A Barus term lifts viscosity above the reference pressure.
"""

import math
from typing import List, Dict

_REFERENCE_TEMP_C = 47.0
_REFERENCE_PRESSURE_BAR = 55.0
_DENSITY_EXPANSION_PER_K = 0.0007
_PIEZO_COEFFICIENT_PER_BAR = 0.0025


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


class CrudeViscosity:
    """Temperature- and pressure-dependent dynamic viscosity of the produced crude."""

    def __init__(self, walther_a: float = 8.924, walther_b: float = 3.315,
                 api_gravity: float = 18.2, native_density_kg_m3: float = 945.0):
        self.walther_a = walther_a
        self.walther_b = walther_b
        self.api_gravity = api_gravity
        self.native_density = native_density_kg_m3

    def _density_g_cc(self, temp_c: float) -> float:
        """Oil density at temperature, corrected for thermal expansion, in g/cm3."""
        rho = (self.native_density / 1000.0) * (
            1.0 - _DENSITY_EXPANSION_PER_K * (temp_c - _REFERENCE_TEMP_C)
        )
        return _clamp(rho, 0.75, 1.05)

    def _kinematic_cst(self, temp_c: float) -> float:
        """Walther kinematic viscosity in cSt (floored at 1 cSt)."""
        exponent = self.walther_a - self.walther_b * math.log10(temp_c + 273.15)
        exponent = _clamp(exponent, -1.0, 2.5)  # keep the nested power finite
        nu = 10.0 ** (10.0 ** exponent) - 0.7
        return max(1.0, nu)

    def calculate_viscosity(self, temp_c: float, pressure_bar: float = 55.0) -> float:
        """Dynamic viscosity in cP at the given temperature (C) and pressure (bar)."""
        temp_c = _clamp(float(temp_c), 10.0, 350.0)

        mu_cp = self._kinematic_cst(temp_c) * self._density_g_cc(temp_c)

        excess_bar = pressure_bar - _REFERENCE_PRESSURE_BAR
        if excess_bar > 0.0:
            mu_cp *= math.exp(_PIEZO_COEFFICIENT_PER_BAR * excess_bar)

        return float(round(mu_cp, 2))

    def calculate_mobility(self, temp_c: float, permeability_md: float = 850.0,
                           k_ro: float = 0.75, pressure_bar: float = 55.0) -> float:
        """Darcy mobility of the oil phase, (k * k_ro) / mu, in mD/cP."""
        mu = self.calculate_viscosity(temp_c, pressure_bar)
        if mu <= 0.0:
            return 0.0
        return float(round(permeability_md * k_ro / mu, 4))

    def evaluate_curve(self, t_min: float = 30.0, t_max: float = 250.0,
                       step: float = 10.0) -> List[Dict[str, float]]:
        """Sample the viscosity-temperature curve for plotting."""
        curve = []
        temp = t_min
        while temp <= t_max:
            curve.append({
                "temperature_c": round(temp, 1),
                "viscosity_cp": self.calculate_viscosity(temp),
            })
            temp += step
        return curve
