"""
Mock Sensor Simulator - Interactive Mode

Generates synthetic seismic data and publishes it to the MQTT broker,
simulating a physical NodeMCU + MPU6050 sensor station. Supports
LWT (Last Will and Testament) for disconnect detection.

Normal data is published automatically at a configurable interval.
Press ENTER at any time to inject a simulated earthquake event.

Usage:
    conda activate depremenv
    python -m mock.sensor_taklit
"""

import json
import time
import random
import threading
import sys
from datetime import datetime

import paho.mqtt.client as mqtt

# ============================================================
# CONFIGURATION
# ============================================================
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
DEVICE_ID = sys.argv[1] if len(sys.argv) > 1 else "SENSOR_01"
TOPIC = f"sensors/{DEVICE_ID}/data"
NORMAL_INTERVAL = 3  # seconds between normal data packets


# ============================================================
# DATA GENERATORS
# ============================================================

def generate_normal_data():
    """Generate a typical non-earthquake sensor reading."""
    return {
        "device_id": DEVICE_ID,
        "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "pga": round(random.uniform(0.01, 0.05), 3),
        "richter": round(random.uniform(0.5, 2.0), 1),
        "deprem_flag": False,
        "accel_x": round(random.uniform(-0.05, 0.05), 3),
        "accel_y": round(random.uniform(-0.05, 0.05), 3),
        "accel_z": round(random.uniform(9.75, 9.85), 3),
    }


def generate_earthquake_data():
    """Generate a simulated earthquake alarm reading."""
    return {
        "device_id": DEVICE_ID,
        "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "pga": round(random.uniform(0.5, 2.0), 2),
        "richter": round(random.uniform(3.5, 7.0), 1),
        "deprem_flag": True,
        "accel_x": round(random.uniform(-1.5, 1.5), 3),
        "accel_y": round(random.uniform(-1.5, 1.5), 3),
        "accel_z": round(random.uniform(8.0, 11.0), 3),
    }


# ============================================================
# BACKGROUND DATA LOOP
# ============================================================

def normal_data_loop(client, stop_event):
    """Continuously publish normal sensor data at the configured interval."""
    count = 0
    while not stop_event.is_set():
        count += 1
        data = generate_normal_data()
        payload = json.dumps(data)
        client.publish(TOPIC, payload)
        print(
            f"  [NORMAL #{count}] PGA: {data['pga']:.3f} | "
            f"Richter: {data['richter']:.1f} | "
            f"Time: {data['timestamp']}"
        )
        stop_event.wait(NORMAL_INTERVAL)


# ============================================================
# MAIN ENTRY POINT
# ============================================================

def main():
    print("=" * 60)
    print("  Mock Sensor Simulator - Interactive Mode")
    print(f"  Broker : {MQTT_BROKER}:{MQTT_PORT}")
    print(f"  Topic  : {TOPIC}")
    print(f"  Rate   : Every {NORMAL_INTERVAL}s (normal data)")
    print("=" * 60)

    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id="mock-sensor-01",
        protocol=mqtt.MQTTv311,
    )

    # Configure LWT: broker publishes OFFLINE if this client disconnects unexpectedly
    client.will_set(f"sensors/{DEVICE_ID}/status", payload="OFFLINE", qos=1, retain=True)

    client.connect(MQTT_BROKER, MQTT_PORT, 60)

    # Announce ONLINE status on connect
    client.publish(f"sensors/{DEVICE_ID}/status", payload="ONLINE", qos=1, retain=True)

    client.loop_start()

    # Start background normal data generation
    stop_event = threading.Event()
    bg_thread = threading.Thread(
        target=normal_data_loop,
        args=(client, stop_event),
        daemon=True,
    )
    bg_thread.start()

    print()
    print("  >> Press ENTER to trigger an earthquake event")
    print("  >> Press Ctrl+C to exit")
    print()

    try:
        while True:
            input()
            eq_data = generate_earthquake_data()
            eq_payload = json.dumps(eq_data)
            client.publish(TOPIC, eq_payload)
            print()
            print("*" * 60)
            print(
                f"  [EARTHQUAKE] Richter: {eq_data['richter']:.1f} | "
                f"PGA: {eq_data['pga']:.2f} | "
                f"Time: {eq_data['timestamp']}"
            )
            print("*" * 60)
            print()
    except KeyboardInterrupt:
        pass
    finally:
        stop_event.set()
        bg_thread.join(timeout=2)
        client.loop_stop()
        client.disconnect()
        print("\n[SHUTDOWN] Sensor simulator stopped.")


if __name__ == "__main__":
    main()
