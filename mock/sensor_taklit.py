"""
Sensor Taklit Scripti (Mock Sensor) - Interaktif Mod

Bu script, fiziksel NodeMCU ve MPU6050 sensoru olmadan sistemi test etmek icin
sahte deprem verisi ureterek MQTT broker'a gonderir.

Interaktif Mod:
  - Calistirdiginda otomatik olarak 3 saniyede bir normal veri yollar.
  - ENTER tusuna bastiginizda aninda deprem verisi tetiklenir.
  - Ctrl+C ile kapatilir.

Kullanim:
    conda activate depremenv
    python -m mock.sensor_taklit
"""

import json
import time
import random
import threading
from datetime import datetime

import paho.mqtt.client as mqtt

# ============================================================
# YAPILANDIRMA
# ============================================================
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
DEVICE_ID = "SENSOR_01"
TOPIC = f"sensors/{DEVICE_ID}/data"
NORMAL_INTERVAL = 3  # saniye - normal veri gonderme araligi


# ============================================================
# SAHTE VERI URETICI
# ============================================================

def generate_normal_data():
    """Normal (deprem yok) durumda sensorden gelecek tipik veri."""
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
    """Deprem algilandiginda sensorden gelecek alarm verisi."""
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
# NORMAL VERI GONDERICI (Arka Plan Threadi)
# ============================================================

def normal_data_loop(client, stop_event):
    """Arka planda belirli araliklarla normal veri gonderir."""
    count = 0
    while not stop_event.is_set():
        count += 1
        data = generate_normal_data()
        payload = json.dumps(data)
        client.publish(TOPIC, payload)
        print(
            f"  [NORMAL #{count}] PGA: {data['pga']:.3f} | "
            f"Richter: {data['richter']:.1f} | "
            f"Zaman: {data['timestamp']}"
        )
        stop_event.wait(NORMAL_INTERVAL)


# ============================================================
# ANA FONKSIYON
# ============================================================

def main():
    print("=" * 60)
    print("  Sensor Taklit Scripti - Interaktif Mod")
    print(f"  Broker : {MQTT_BROKER}:{MQTT_PORT}")
    print(f"  Topic  : {TOPIC}")
    print(f"  Aralik : Her {NORMAL_INTERVAL} saniyede normal veri")
    print("=" * 60)

    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id="mock-sensor-01",
        protocol=mqtt.MQTTv311,
    )
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()

    # Arka planda normal veri gonderimini baslat
    stop_event = threading.Event()
    bg_thread = threading.Thread(
        target=normal_data_loop,
        args=(client, stop_event),
        daemon=True,
    )
    bg_thread.start()

    print()
    print("  >> ENTER tusuna basarak DEPREM tetikleyin")
    print("  >> Ctrl+C ile cikis yapin")
    print()

    try:
        while True:
            input()  # ENTER bekle
            eq_data = generate_earthquake_data()
            eq_payload = json.dumps(eq_data)
            client.publish(TOPIC, eq_payload)
            print()
            print("*" * 60)
            print(
                f"  [DEPREM!] Richter: {eq_data['richter']:.1f} | "
                f"PGA: {eq_data['pga']:.2f} | "
                f"Zaman: {eq_data['timestamp']}"
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
        print("\n[KAPANIYOR] Sensor kapatildi.")


if __name__ == "__main__":
    main()
