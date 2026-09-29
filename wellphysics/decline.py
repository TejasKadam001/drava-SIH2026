"""
Drava: Decline Curve Analysis (DCA)
========================================
Standard petroleum-engineering forecasting, Arps' equations, not something
invented for this project. Given a production-rate history, fits a decline
curve and extrapolates forward to answer: "how much oil can we still get,
and for how long is it worth pumping?"

Reference: Arps, J.J. (1945), "Analysis of Decline Curves," Trans. AIME.
Hyperbolic decline (0 < b < 1) is the industry default for most wells and is
what this module uses unless the fit clearly prefers an exponential edge case.
"""

import math
from typing import Dict, Any, List, Tuple

import numpy as np
from scipy.optimize import curve_fit


def _hyperbolic_rate(t: np.ndarray, qi: float, di: float, b: float) -> np.ndarray:
    # Arps hyperbolic: q(t) = qi / (1 + b * di * t)^(1/b)
    b_safe = max(b, 1e-4)
    return qi / np.power(1.0 + b_safe * di * t, 1.0 / b_safe)


def _exponential_rate(t: np.ndarray, qi: float, di: float) -> np.ndarray:
    # Arps exponential: q(t) = qi * exp(-di * t)   (the b -> 0 limit)
    return qi * np.exp(-di * t)


class DeclineCurveAnalyzer:
    """
    Fits an Arps decline curve to a measured or simulated production-rate
    history and forecasts Estimated Ultimate Recovery (EUR) and time to an
    economic-limit rate.
    """

    def fit(self, days: List[float], rates_bpd: List[float]) -> Dict[str, Any]:
        t = np.asarray(days, dtype=float)
        q = np.asarray(rates_bpd, dtype=float)
        if len(t) < 5 or np.all(q <= 0):
            return {"fit_status": "INSUFFICIENT_DATA", "points_supplied": len(t)}

        qi0 = float(q[0]) if q[0] > 0 else float(np.max(q))
        try:
            popt, _ = curve_fit(
                _hyperbolic_rate, t, q,
                p0=[qi0, 0.01, 0.5],
                bounds=([1e-3, 1e-6, 1e-4], [qi0 * 3, 1.0, 1.0]),
                maxfev=8000,
            )
            qi, di, b = popt
            model = "hyperbolic"
        except Exception:
            popt, _ = curve_fit(
                _exponential_rate, t, q,
                p0=[qi0, 0.005],
                bounds=([1e-3, 1e-6], [qi0 * 3, 1.0]),
                maxfev=8000,
            )
            qi, di = popt
            b = 0.0
            model = "exponential"

        return {
            "fit_status": "OK",
            "model": model,
            "qi_bpd": round(float(qi), 2),
            "di_per_day": round(float(di), 6),
            "b_exponent": round(float(b), 4),
        }

    def forecast(self, fit: Dict[str, Any], economic_limit_bpd: float = 5.0,
                 max_horizon_days: int = 3650) -> Dict[str, Any]:
        """
        Given a fit from `fit()`, projects forward to the economic limit and
        integrates the rate curve to get Estimated Ultimate Recovery (EUR).
        """
        if fit.get("fit_status") != "OK":
            return {"forecast_status": "NO_FIT_AVAILABLE"}

        qi, di, b = fit["qi_bpd"], fit["di_per_day"], fit["b_exponent"]
        model = fit["model"]

        # Time to economic limit (closed form for both cases)
        if model == "hyperbolic" and b > 1e-4:
            if qi <= economic_limit_bpd:
                t_limit = 0.0
            else:
                t_limit = ((qi / economic_limit_bpd) ** b - 1.0) / (b * di)
        else:
            if qi <= economic_limit_bpd:
                t_limit = 0.0
            else:
                t_limit = math.log(qi / economic_limit_bpd) / max(di, 1e-9)

        t_limit = float(min(t_limit, max_horizon_days))

        # Numerically integrate q(t) from 0 to t_limit for cumulative recovery (EUR)
        t_grid = np.linspace(0.0, t_limit, max(50, int(t_limit)))
        if model == "hyperbolic" and b > 1e-4:
            q_grid = _hyperbolic_rate(t_grid, qi, di, b)
        else:
            q_grid = _exponential_rate(t_grid, qi, di)
        trapz_fn = getattr(np, "trapezoid", None) or np.trapz
        eur_bbl = float(trapz_fn(q_grid, t_grid))

        return {
            "forecast_status": "OK",
            "model": model,
            "days_to_economic_limit": round(t_limit, 1),
            "years_to_economic_limit": round(t_limit / 365.0, 2),
            "estimated_ultimate_recovery_bbl": round(eur_bbl, 1),
            "economic_limit_bpd": economic_limit_bpd,
            "curve_preview": [
                {"day": round(float(d), 1), "rate_bpd": round(float(r), 2)}
                for d, r in zip(t_grid[::max(1, len(t_grid) // 24)], q_grid[::max(1, len(t_grid) // 24)])
            ],
        }

    def analyze(self, days: List[float], rates_bpd: List[float],
                economic_limit_bpd: float = 5.0) -> Dict[str, Any]:
        fit = self.fit(days, rates_bpd)
        forecast = self.forecast(fit, economic_limit_bpd)
        return {"fit": fit, "forecast": forecast}
