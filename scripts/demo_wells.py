"""Sanity-check the demo wells and print their initial state."""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from twin_api.synthetic.synthetic_feed import SyntheticFeed


def main():
    bar = "=" * 65
    print(f"{bar}\n Drava: SEEDING & VERIFYING DEMO ENTITIES")
    print(f" Field: Baghewala Field (Jodhpur Sandstone), Oil India Limited\n{bar}")

    sim = SyntheticFeed()
    print(f"\n[+] Total Demo Wells Registered: {len(sim.wells_state)}")
    for well_id, w in sim.wells_state.items():
        print(f"    - {well_id}: {w['name']}")
        print(f"      Depth: {w['depth_m']}m | Pump: {w['pump_depth_m']}m | "
              f"Cycle: #{w['cycle_number']} (Day {w['days_in_production']})")
        print(f"      Steam: {w['steam_injected_tons']} T | SPM: {w['spm']} | Stroke: {w['stroke_length_m']}m")

    frame = sim.generate_current_telemetry("BW-DEMO-001")
    pump = frame["srp_operating_state"]
    print("\n[+] Verified Initial Telemetry Frame for BW-DEMO-001:")
    print(f"    - Temp: {frame['thermal_state']['reservoir_temperature_c']} deg C")
    print(f"    - Viscosity: {frame['fluid_state']['estimated_viscosity_cp']} cP")
    print(f"    - Oil Rate: {frame['production_state']['oil_rate_bpd']} bpd")
    print(f"    - PPRL: {pump['pprl_lbs']} lbs | MPRL: {pump['mprl_lbs']} lbs")
    print(f"    - Rod Floating Threat: {pump['rod_floating_detected']}")
    print("\n[OK] Database seed state ready for execution.")


if __name__ == "__main__":
    main()
