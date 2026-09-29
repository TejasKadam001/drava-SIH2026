"""Model-layer checks: forecaster, failure model, anomaly detector, optimiser and copilot."""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from twin_api.learners.rate_forecaster import RateForecaster
from twin_api.learners.failure_scorer import FailureScorer
from twin_api.learners.anomaly_watch import FrameWatch
from twin_api.planner.plan_search import PlanSearch
from copilot.router import CopilotRouter


class ForecasterTests(unittest.TestCase):
    def test_horizons_and_widening_bands(self):
        out = RateForecaster().predict(
            temp_c=80.0, pressure_bar=50.0, spm=6.5, stroke_length_m=2.4, days_since_injection=45)
        hz = out["forecast_horizons"]
        day1 = hz["t_plus_1"]

        self.assertEqual(set(hz), {"t_plus_1", "t_plus_7", "t_plus_30"})
        self.assertGreater(day1["prediction_bpd"], 0)
        self.assertLess(day1["lower_95_bpd"], day1["prediction_bpd"])
        self.assertGreater(day1["upper_95_bpd"], day1["prediction_bpd"])
        self.assertGreater(hz["t_plus_30"]["uncertainty_pct"], day1["uncertainty_pct"])


class FailureModelTests(unittest.TestCase):
    def test_cold_fast_well_is_high_risk(self):
        out = FailureScorer().predict_failure_risks(stroke_length_m=2.4, spm=8.5, temp_c=50.0)

        for hazard in ("rod_floating", "impact_loading", "parted_rod", "pump_unseating"):
            self.assertIn(hazard, out["risks"])
        self.assertGreater(out["risks"]["rod_floating"]["probability"], 0.40)
        self.assertTrue(out["feature_attribution_shap"])


class AnomalyTests(unittest.TestCase):
    def setUp(self):
        self.detector = FrameWatch()

    def test_healthy_frame_passes(self):
        frame = self.detector.detect(temp_c=85.0, pressure_bar=48.0, pprl_lbs=14500.0,
                                     mprl_lbs=3200.0, oil_rate_bpd=95.0, motor_power_kw=18.0)
        self.assertFalse(frame["is_anomaly"])

    def test_overload_frame_is_flagged(self):
        frame = self.detector.detect(temp_c=85.0, pressure_bar=48.0, pprl_lbs=24000.0,
                                     mprl_lbs=200.0, oil_rate_bpd=2.0, motor_power_kw=32.0)
        self.assertTrue(frame["is_anomaly"])
        self.assertIn(frame["severity"], ("WARNING", "CRITICAL"))


class PlanningTests(unittest.TestCase):
    def test_optimiser_returns_feasible_plan_and_frontier(self):
        result = PlanSearch().run_optimization(
            {"oil_rate_bpd": 80.0, "sor": 4.5, "energy_kwh_bbl": 2.2, "failure_risk": 0.42})

        self.assertEqual(result["status"], "OPTIMIZATION_CONVERGED")
        self.assertGreater(len(result["pareto_frontier"]), 5)
        self.assertTrue(2.0 < result["recommended_plan"]["srp"]["spm"] < 10.0)

    def test_copilot_cites_the_tools_it_ran(self):
        reply = CopilotRouter().handle_user_query("What do you recommend for next CSS cycle?")

        self.assertTrue({"answer", "tools_used", "evidence_data"} <= set(reply))
        self.assertTrue({"get_well_state", "optimize_operations"} <= set(reply["tools_used"]))


if __name__ == "__main__":
    unittest.main()
