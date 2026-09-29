"""
Drava: Live Hardware Data Manager
======================================
This is the switch that makes the whole "real hardware, not simulated" claim
literal rather than rhetorical. The edge_gateway bridges MQTT telemetry from
the physical rig (see /firmware/rig_controller) into the two ingestion
endpoints this module backs. Whenever live data has arrived recently for a
well, the API serves that instead of the physics simulator, and tags every
response with which mode it's actually in, so nothing gets shown to a judge
mislabeled as live when it's actually synthetic, or vice versa.
"""

import time
from typing import Dict, Any, Optional, List

LIVE_DATA_FRESHNESS_SECONDS = 5.0


class LiveDataManager:
    def __init__(self):
        self._latest_telemetry: Dict[str, Dict[str, Any]] = {}
        self._latest_telemetry_ts: Dict[str, float] = {}
        self._latest_dynocard: Dict[str, List[Dict[str, Any]]] = {}
        self._latest_dynocard_ts: Dict[str, float] = {}
        self._stroke_log: Dict[str, List[Dict[str, Any]]] = {}

    # --- Ingestion (called by the edge_gateway bridge) ---
    def ingest_telemetry(self, well_id: str, payload: Dict[str, Any]) -> None:
        self._latest_telemetry[well_id] = payload
        self._latest_telemetry_ts[well_id] = time.time()
        self._stroke_log.setdefault(well_id, []).append({
            "t": time.time(),
            "load_n": payload.get("load_n"),
            "spm_actual": payload.get("spm_actual"),
        })
        # keep the in-memory log bounded for a hackathon-length demo session
        if len(self._stroke_log[well_id]) > 20000:
            self._stroke_log[well_id] = self._stroke_log[well_id][-20000:]

    def ingest_dynocard(self, well_id: str, card_points: List[Dict[str, Any]]) -> None:
        self._latest_dynocard[well_id] = card_points
        self._latest_dynocard_ts[well_id] = time.time()

    # --- Freshness ---
    def is_live(self, well_id: str, max_age_s: float = LIVE_DATA_FRESHNESS_SECONDS) -> bool:
        ts = self._latest_telemetry_ts.get(well_id)
        return ts is not None and (time.time() - ts) <= max_age_s

    def is_dynocard_live(self, well_id: str, max_age_s: float = LIVE_DATA_FRESHNESS_SECONDS) -> bool:
        ts = self._latest_dynocard_ts.get(well_id)
        return ts is not None and (time.time() - ts) <= max_age_s

    # --- Reads ---
    def get_telemetry(self, well_id: str) -> Optional[Dict[str, Any]]:
        return self._latest_telemetry.get(well_id)

    def get_dynocard(self, well_id: str) -> Optional[List[Dict[str, Any]]]:
        return self._latest_dynocard.get(well_id)

    def get_stroke_log(self, well_id: str) -> List[Dict[str, Any]]:
        return self._stroke_log.get(well_id, [])


live_data_manager = LiveDataManager()
