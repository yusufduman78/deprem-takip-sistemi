"""
Sensör Taklit Scripti (Mock Sensor)

Bu script, fiziksel NodeMCU ve MPU6050 sensörü olmadan sistemi test etmek için
sahte deprem verisi üreterek MQTT broker'a gönderir.

Kullanım:
  python sensor_taklit.py
"""

import json
import time
import random
from datetime import datetime

import paho.mqtt.client as mqtt

# ============================================================
# YAPILANDIRMA
# ============================================================
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
DEVICE_ID = "SENSOR_01"
TOPIC = f"sensors/{DEVICE_ID}/data"

# ============================================================
# SAHTE VERİ ÜRETİCİ
# ============================================================

def generate_normal_data():
    """Normal (deprem yok) durumda sensörden gelecek tipik veri."""
    return {
        "device_id": DEVICE_ID,
        "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "pga": round(random.uniform(0.01, 0.05), 3),
        "richter": round(random.uniform(0.5, 2.0), 1),
        "deprem_flag": False,
        "accel_x": round(random.uniform(-0.05, 0.05), 3),
        "accel_y": round(random.uniform(-0.05, 0.05), 3),
        "accel_z": round(random.uniform(9.75, 9.85), 3)
    }


def generate_earthquake_data():
    """Deprem algılandığında sensörden gelecek alarm verisi."""
    return {
        "device_id": DEVICE_ID,
        "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "pga": round(random.uniform(0.5, 2.0), 2),
        "richter": round(random.uniform(3.5, 7.0), 1),
        "deprem_flag": True,
        "accel_x": round(random.uniform(-1.5, 1.5), 3),
        "accel_y": round(random.uniform(-1.5, 1.5), 3),
        "accel_z": round(random.uniform(8.0, 11.0), 3)
    }


# ============================================================
# ANA FONKSİYON
# ============================================================

def main():
    print("=" * 50)
    print("[*] Sensor Taklit Scripti Baslatiliyor")
    print(f"[>] Broker: {MQTT_BROKER}:{MQTT_PORT}")
    print(f"[>] Topic:  {TOPIC}")
    print("=" * 50)

    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id="mock-sensor-01",
        protocol=mqtt.MQTTv311
    )
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()

    print("\n5 adet normal veri + 1 adet deprem verisi gonderilecek.\n")

    # 5 adet normal veri gönder (2 saniye aralıkla)
    for i in range(5):
        data = generate_normal_data()
        payload = json.dumps(data)
        client.publish(TOPIC, payload)
        print(f"[OK] [{i+1}/5] Normal veri gonderildi | PGA: {data['pga']} | Richter: {data['richter']}")
        time.sleep(2)

    # 1 adet DEPREM verisi gönder
    eq_data = generate_earthquake_data()
    eq_payload = json.dumps(eq_data)
    client.publish(TOPIC, eq_payload)
    print(f"\n[ALARM] DEPREM verisi gonderildi! | PGA: {eq_data['pga']} | Richter: {eq_data['richter']}")

    time.sleep(1)
    client.loop_stop()
    client.disconnect()
    print("\n[DONE] Tum veriler gonderildi. Taklit sensor kapatildi.")


if __name__ == "__main__":
    main()
