"""Physics-layer checks: each test asserts a physical invariant, not a stored number."""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from wellphysics.viscosity import CrudeViscosity
from wellphysics.reservoir_heat import ReservoirHeat
from wellphysics.wellbore import WellboreColumn
from wellphysics.rod_pump import RodPump


class ViscosityTests(unittest.TestCase):
    def test_hotter_oil_flows_easier(self):
        model = CrudeViscosity()
        cold, warm, hot = (model.calculate_viscosity(t) for t in (47.0, 100.0, 200.0))

        self.assertGreater(cold, 1000.0)   # native crude is heavy
        self.assertLess(warm, 350.0)
        self.assertLess(hot, 30.0)
        self.assertGreater(cold, warm)
        self.assertGreater(warm, hot)


class ThermalTests(unittest.TestCase):
    def test_peak_then_monotone_cooldown(self):
        model = ReservoirHeat()
        peak = model.calculate_peak_temperature(steam_mass_tons=2500.0, soak_days=6.0)["peak_temperature_c"]
        self.assertTrue(120.0 < peak <= 280.0)

        temps = [model.predict_temperature_at_day(d, peak) for d in (10.0, 60.0, 120.0)]
        self.assertGreater(peak, temps[0])
        self.assertEqual(temps, sorted(temps, reverse=True))
        self.assertGreaterEqual(temps[-1], 47.0)  # never below native temperature


class WellboreTests(unittest.TestCase):
    def test_profile_gradients(self):
        nodes = WellboreColumn(viscosity=CrudeViscosity()).discretize_profile(
            bottomhole_temp_c=180.0, bottomhole_pressure_bar=60.0)
        top, bottom = nodes[0], nodes[-1]

        self.assertEqual(len(nodes), 11)
        self.assertLess(top["temperature_c"], bottom["temperature_c"])
        self.assertLess(top["pressure_bar"], bottom["pressure_bar"])
        self.assertGreater(top["viscosity_cp"], bottom["viscosity_cp"])  # cooler at surface


class PumpTests(unittest.TestCase):
    def setUp(self):
        self.pump = RodPump()

    def test_rod_float_appears_when_cold_and_fast(self):
        calm = self.pump.evaluate_srp_performance(stroke_length_m=2.4, spm=5.0, avg_viscosity_cp=80.0)
        self.assertFalse(calm["rod_floating_detected"])
        self.assertLess(calm["rod_floating_risk"], 0.3)

        harsh = self.pump.evaluate_srp_performance(stroke_length_m=2.4, spm=8.5, avg_viscosity_cp=3500.0)
        self.assertTrue(harsh["rod_floating_detected"])
        self.assertGreater(harsh["rod_floating_risk"], 0.7)

    def test_dynamometer_card_shape(self):
        card = self.pump.generate_dynamometer_card(stroke_length_m=2.4, spm=6.0, avg_viscosity_cp=200.0)

        self.assertEqual(len(card), 40)
        self.assertTrue(all(p["surface_load_lbs"] > 0 and p["position_m"] >= 0 for p in card))


if __name__ == "__main__":
    unittest.main()
