"""
Unit tests for Drava's Decline Curve Analysis (Arps) module.
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from physics.decline_curve import DeclineCurveAnalyzer


class TestDeclineCurveAnalysis(unittest.TestCase):
    def setUp(self):
        self.dca = DeclineCurveAnalyzer()
        # Synthetic hyperbolic-decline rate series: qi=100, di=0.01/day, b=0.5
        self.days = [float(d) for d in range(0, 200, 2)]
        qi, di, b = 100.0, 0.01, 0.5
        self.rates = [qi / (1.0 + b * di * t) ** (1.0 / b) for t in self.days]

    def test_fit_recovers_known_parameters(self):
        fit = self.dca.fit(self.days, self.rates)
        self.assertEqual(fit["fit_status"], "OK")
        self.assertAlmostEqual(fit["qi_bpd"], 100.0, delta=5.0)
        self.assertGreater(fit["di_per_day"], 0.0)

    def test_forecast_monotonically_declines(self):
        fit = self.dca.fit(self.days, self.rates)
        forecast = self.dca.forecast(fit, economic_limit_bpd=5.0)
        self.assertEqual(forecast["forecast_status"], "OK")
        self.assertGreater(forecast["estimated_ultimate_recovery_bbl"], 0.0)
        self.assertGreater(forecast["days_to_economic_limit"], 0.0)

        preview = forecast["curve_preview"]
        rates_only = [p["rate_bpd"] for p in preview]
        self.assertTrue(all(rates_only[i] >= rates_only[i + 1] - 1e-6 for i in range(len(rates_only) - 1)),
                         "Decline curve preview must be non-increasing over time")

    def test_insufficient_data_is_reported_not_silently_ignored(self):
        fit = self.dca.fit([1.0, 2.0], [50.0, 48.0])
        self.assertEqual(fit["fit_status"], "INSUFFICIENT_DATA")


if __name__ == "__main__":
    unittest.main()
