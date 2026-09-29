"""
Sucker-rod pump (SRP) mechanics for a viscous-oil producer.

Covers crank kinematics, viscous resistance on the downstroke, polished-rod loads,
a rod-float risk score and a synthetic surface / downhole dynamometer card.

Symbols: S stroke [m], N strokes per minute, omega = 2*pi*N/60.
    v_max = S*omega/2          a_max = S*omega^2/2
    PPRL  = W_rf + W_fluid + inertia + drag       (upstroke peak)
    MPRL  = W_rf - inertia - drag                 (downstroke trough)
Rod floating occurs when the string cannot sink as fast as the polished rod
descends, which is what the velocity-ratio and sinking-margin tests below capture.
"""

import math
from typing import Any, Dict, List

_G = 9.81
_N_TO_LBF = 0.224809
_M_TO_IN = 39.3701
_M3_TO_BBL = 6.28981
_SINKER_FRACTION = 0.30  # share of buoyant rod weight carried by bottom sinker bars
_VALVE_PORT_RADIUS_M = 0.015
_PLUNGER_LENGTH_M = 1.2
_MOTOR_EFFICIENCY = 0.82


def _mean_speed(stroke_m: float, spm: float) -> float:
    """Average polished-rod speed in m/s."""
    return 2.0 * stroke_m * spm / 60.0


class RodPump:
    """Kinematics, load and dynamometer model of a beam-pumped well."""

    def __init__(self,
                 pump_depth_m: float = 900.0,
                 plunger_diameter_mm: float = 57.15,
                 rod_weight_air_n: float = 31200.0,
                 tubing_id_mm: float = 62.0,
                 rod_outer_diameter_mm: float = 22.22,
                 fluid_density_kg_m3: float = 945.0,
                 steel_density_kg_m3: float = 7850.0):
        self.pump_depth_m = pump_depth_m
        self.plunger_diameter_m = plunger_diameter_mm / 1000.0
        self.plunger_area_m2 = math.pi / 4.0 * self.plunger_diameter_m ** 2
        self.w_r = rod_weight_air_n
        self.tubing_id_m = tubing_id_mm / 1000.0
        self.rod_od_m = rod_outer_diameter_mm / 1000.0
        self.rho_f = fluid_density_kg_m3
        self.rho_s = steel_density_kg_m3

        self.buoyancy_factor = 1.0 - self.rho_f / self.rho_s
        self.w_rf = self.w_r * self.buoyancy_factor
        self.w_f = self.plunger_area_m2 * self.pump_depth_m * self.rho_f * _G

    # ------------------------------------------------------------------ kinematics

    def calculate_kinematics(self, stroke_length_m: float, spm: float) -> Dict[str, float]:
        """Crank angular speed, peak rod velocity / acceleration and inertial load."""
        omega = 2.0 * math.pi * (spm / 60.0)
        v_peak = stroke_length_m * omega / 2.0
        a_peak = stroke_length_m * omega ** 2 / 2.0
        return {
            "omega_rad_s": round(omega, 3),
            "v_max_m_s": round(v_peak, 3),
            "a_max_m_s2": round(a_peak, 3),
            "inertial_force_n": round(self.w_r / _G * a_peak, 1),
        }

    # ------------------------------------------------------------------ resistance

    def calculate_viscous_drag(self, stroke_length_m: float, spm: float, avg_viscosity_cp: float) -> float:
        """
        Upward resistance on the downstroke, in newtons.

        Sum of annular Couette shear along the rods and the Hagen-Poiseuille
        pressure drop as oil squeezes through the traveling valve.
        """
        speed = _mean_speed(stroke_length_m, spm)
        mu = avg_viscosity_cp * 0.001

        rod_radius = self.rod_od_m / 2.0
        tubing_radius = self.tubing_id_m / 2.0
        shear_geometry = 2.0 * math.pi / math.log(max(1.05, tubing_radius / rod_radius))
        rod_shear_n = shear_geometry * mu * speed * self.pump_depth_m

        valve_dp_pa = 8.0 * mu * _PLUNGER_LENGTH_M * speed / _VALVE_PORT_RADIUS_M ** 2
        valve_thrust_n = valve_dp_pa * self.plunger_area_m2 * 0.65

        return float(round(rod_shear_n + valve_thrust_n, 1))

    # ------------------------------------------------------------------ performance

    def evaluate_srp_performance(self, stroke_length_m: float, spm: float, avg_viscosity_cp: float,
                                 pump_fillage: float = 0.88) -> Dict[str, Any]:
        """Loads, float risk, production and power for one operating point."""
        kin = self.calculate_kinematics(stroke_length_m, spm)
        drag_n = self.calculate_viscous_drag(stroke_length_m, spm, avg_viscosity_cp)
        inertia_n = kin["inertial_force_n"]

        pprl_lbs = (self.w_rf + self.w_f + inertia_n + drag_n) * _N_TO_LBF
        mprl_lbs = (self.w_rf - inertia_n - drag_n) * _N_TO_LBF
        net_down_lbs = (self.w_rf - drag_n - inertia_n) * _N_TO_LBF

        # Only the sinker bars pull the string down; the upper rods fight Couette drag.
        sinker_pull_n = self.w_rf * _SINKER_FRACTION
        margin_lbs = (sinker_pull_n - (drag_n * 0.5 + inertia_n)) * _N_TO_LBF

        speed = _mean_speed(stroke_length_m, spm)
        drag_per_speed = drag_n / max(0.001, speed)
        terminal_speed = sinker_pull_n / max(1.0, drag_per_speed * 0.5)
        velocity_ratio = kin["v_max_m_s"] / max(0.05, terminal_speed)

        # Logistic risk curve centred on 75% of terminal sinking speed.
        risk = 1.0 / (1.0 + math.exp(-6.5 * (velocity_ratio - 0.75)))
        risk = float(round(max(0.01, min(0.99, risk)), 3))
        floating = velocity_ratio >= 0.80 or margin_lbs < 200.0
        impact_risk = float(round(min(1.0, risk * 1.12), 3))

        # Displacement and volumetric efficiency (viscosity slows valve action).
        disp_m3_day = self.plunger_area_m2 * stroke_length_m * spm * 1440.0
        disp_bbl_day = disp_m3_day * _M3_TO_BBL
        fillage = min(1.0, pump_fillage * max(0.55, 1.0 - 0.000045 * avg_viscosity_cp))
        production_bbl = disp_bbl_day * fillage

        # Power: hydraulic lift plus rod-drag work, divided by motor efficiency.
        hydraulic_kw = disp_m3_day * self.rho_f * _G * self.pump_depth_m / (86400.0 * 1000.0)
        shaft_kw = hydraulic_kw + drag_n * kin["v_max_m_s"] / 1000.0
        electrical_kw = shaft_kw / _MOTOR_EFFICIENCY
        kwh_bbl = electrical_kw * 24.0 / max(1.0, production_bbl)

        return {
            "stroke_length_m": stroke_length_m,
            "spm": spm,
            "v_max_m_s": kin["v_max_m_s"],
            "pprl_lbs": round(pprl_lbs, 1),
            "mprl_lbs": round(mprl_lbs, 1),
            "net_downstroke_force_lbs": round(net_down_lbs, 1),
            "viscous_drag_lbf": round(drag_n * _N_TO_LBF, 1),
            "rod_floating_detected": floating,
            "rod_floating_risk": round(risk, 3),
            "impact_loading_risk": impact_risk,
            "theoretical_displacement_bpd": round(disp_bbl_day, 1),
            "estimated_production_bpd": round(production_bbl, 1),
            "pump_efficiency_pct": round(fillage * 100.0, 1),
            "electrical_power_kw": round(electrical_kw, 2),
            "kwh_per_barrel": round(kwh_bbl, 2),
            "gearbox_peak_torque_in_lbs": round(pprl_lbs * (stroke_length_m * _M_TO_IN / 2.0) * 0.95, 0),
        }

    # ------------------------------------------------------------------ dyno card

    def generate_dynamometer_card(self, stroke_length_m: float, spm: float, avg_viscosity_cp: float,
                                  num_points: int = 40) -> List[Dict[str, Any]]:
        """
        Load-versus-position card sampled at equal crank-angle steps.

        The surface trace shows the upstroke load ramp and either a smooth
        downstroke or, when the rods float, a sagging trough followed by an
        impact spike as the unit catches the string.
        """
        perf = self.evaluate_srp_performance(stroke_length_m, spm, avg_viscosity_cp)
        pprl, mprl = perf["pprl_lbs"], perf["mprl_lbs"]
        drag_lbs = perf["viscous_drag_lbf"]
        floating = perf["rod_floating_detected"]

        rod_lbs = self.w_rf * _N_TO_LBF
        fluid_lbs = self.w_f * _N_TO_LBF
        half_stroke = stroke_length_m / 2.0

        card = []
        for k in range(num_points):
            theta = 2.0 * math.pi * k / num_points
            pos_m = half_stroke * (1.0 - math.cos(theta))

            if theta <= math.pi:  # upstroke: standing valve open, fluid load picked up
                ramp = min(1.0, theta / 0.5)
                surface = mprl + (pprl - mprl) * ramp + 0.15 * drag_lbs * math.sin(theta)
                downhole = rod_lbs + fluid_lbs * ramp
            else:  # downstroke: traveling valve open
                ramp = min(1.0, (theta - math.pi) / 0.5)
                if floating:
                    surface = mprl - drag_lbs * 0.6
                    if theta > 1.8 * math.pi:
                        surface += pprl * 0.45 * ((theta - 1.8 * math.pi) / (0.2 * math.pi))
                else:
                    surface = pprl - (pprl - mprl) * ramp - 0.12 * drag_lbs * math.sin(theta - math.pi)
                downhole = rod_lbs - fluid_lbs * (1.0 - ramp)

            card.append({
                "crank_angle_deg": round(math.degrees(theta), 1),
                "position_in": round(pos_m * _M_TO_IN, 2),
                "position_m": round(pos_m, 3),
                "surface_load_lbs": round(max(200.0, surface), 1),
                "downhole_load_lbs": round(max(100.0, downhole), 1),
            })
        return card
