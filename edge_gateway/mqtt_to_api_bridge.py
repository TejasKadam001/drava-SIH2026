"""
Drava Edge Gateway
======================
The wire between the physical rig and the digital twin. The ESP32
(firmware/rig_controller) publishes real sensor readings over MQTT; this
process subscribes, and forwards each reading into twin_api's ingestion
endpoints (/v1/rig/{well_id}/telemetry, /v1/rig/{well_id}/dynocard).

Run this alongside twin_api during a demo:
    python edge_gateway/mqtt_to_api_bridge.py

Everything downstream (the dashboard, the failure detector, the decline
curve forecast) then automatically prefers this live data over the
simulator, see twin_api/rig_link.py for the freshness switch.
"""

import json
import logging
import time

import paho.mqtt.client as mqtt
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("edge_gateway")

# --- Configuration (must match firmware/rig_controller/include/config.h) ---
MQTT_BROKER_HOST = "192.168.1.50"
MQTT_BROKER_PORT = 1883
RIG_ID = "BW-RIG-001"

TELEMETRY_TOPIC = f"drava/rig/{RIG_ID}/telemetry"
DYNOCARD_TOPIC = f"drava/rig/{RIG_ID}/dynocard"
COMMAND_TOPIC = f"drava/rig/{RIG_ID}/command"

ML_SERVICE_BASE_URL = "http://127.0.0.1:8000"
# Which digital-twin well this physical rig stands in for
TARGET_WELL_ID = "BW-DEMO-001"


def forward_telemetry(payload: dict) -> None:
    try:
        resp = requests.post(
            f"{ML_SERVICE_BASE_URL}/v1/rig/{TARGET_WELL_ID}/telemetry",
            json=payload,
            timeout=2.0,
        )
        if resp.status_code != 200:
            log.warning("twin_api rejected telemetry: %s %s", resp.status_code, resp.text)
    except requests.RequestException as e:
        log.warning("could not reach twin_api (telemetry): %s", e)


def forward_dynocard(card_points: list) -> None:
    try:
        resp = requests.post(
            f"{ML_SERVICE_BASE_URL}/v1/rig/{TARGET_WELL_ID}/dynocard",
            json={"rig_id": RIG_ID, "source": "LIVE_HARDWARE", "card_points": card_points},
            timeout=2.0,
        )
        if resp.status_code != 200:
            log.warning("twin_api rejected dyno card: %s %s", resp.status_code, resp.text)
    except requests.RequestException as e:
        log.warning("could not reach twin_api (dynocard): %s", e)


def on_connect(client, userdata, flags, reason_code, properties=None):
    log.info("connected to MQTT broker (rc=%s)", reason_code)
    client.subscribe(TELEMETRY_TOPIC)
    client.subscribe(DYNOCARD_TOPIC)
    log.info("subscribed to %s and %s", TELEMETRY_TOPIC, DYNOCARD_TOPIC)


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
    except json.JSONDecodeError:
        log.warning("dropped malformed message on %s", msg.topic)
        return

    if msg.topic == TELEMETRY_TOPIC:
        log.info(
            "telemetry: load=%.2fN temp=%.1fC spm=%.2f floating=%s",
            payload.get("load_n", 0.0),
            payload.get("fluid_temp_c", 0.0),
            payload.get("spm_actual", 0.0),
            payload.get("rod_floating_detected", False),
        )
        forward_telemetry(payload)
    elif msg.topic == DYNOCARD_TOPIC:
        points = payload.get("card_points", [])
        log.info("dyno card: %d points", len(points))
        forward_dynocard(points)


def send_command(client: mqtt.Client, target_spm: float = None, target_temp_c: float = None,
                  cool_down_demo: bool = None) -> None:
    """
    Sends a command down to the rig. This is the hook the twin_api
    optimizer (or a jury-demo "trigger fault" button) would call: 'reduce
    stroke speed', 'reinject steam', or the live-fault trigger used on stage.
    """
    cmd = {}
    if target_spm is not None:
        cmd["target_spm"] = target_spm
    if target_temp_c is not None:
        cmd["target_temp_c"] = target_temp_c
    if cool_down_demo is not None:
        cmd["cool_down_demo"] = cool_down_demo
    if cmd:
        client.publish(COMMAND_TOPIC, json.dumps(cmd))
        log.info("sent command: %s", cmd)


def main():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="drava-edge-gateway")
    client.on_connect = on_connect
    client.on_message = on_message

    while True:
        try:
            client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, keepalive=30)
            client.loop_forever()
        except (ConnectionRefusedError, OSError) as e:
            log.warning("MQTT broker unreachable (%s), retrying in 3s", e)
            time.sleep(3)


if __name__ == "__main__":
    main()
