# Limitations

1. **Not a full-field reservoir simulator.** Drava models one well from the near-wellbore rock to the surface using semi-analytical heat balance and a 1-D wellbore. It does not replace CMG STARS or ECLIPSE.
2. **Simulated field data.** Oil India's SCADA feeds are not public. The demo runs on a simulator calibrated to published Baghewala literature, and every simulated frame is labelled as such.
3. **One real data source.** The ESP32 benchtop rig provides real rod load, speed and temperature; it is a scaled stand-in for a pumping unit, not field equipment.
4. **Synthetic training labels.** ML metrics come from wellphysics-generated data (see `evaluation.md`).
5. **Rule-based copilot.** It routes questions by keyword; it is not a general language model.
6. **Decision support only.** Plans are recommendations for a production engineer to approve; nothing is sent to a VFD automatically.
7. **Adapters unproven on real feeds.** The CSV, REST, MQTT and PostgreSQL interfaces are ready but untested against Oil India data.
