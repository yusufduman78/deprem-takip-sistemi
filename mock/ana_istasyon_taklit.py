"""
Ana Istasyon Taklit Scripti (Mock Main Station)

Bu script, evdeki alarm unitesini (Buzzer + LED) taklit eder.
MQTT uzerinden dogrudan sensorun yayinladigi veriyi dinler.
Python sunucusuna (Bridge) hic ugramadan, cihazlar arasi
dogrudan haberlesmesi (Device-to-Device) sayesinde sifir
gecikmeyle alarm verir.

Kullanim:
    conda activate depremenv
    python -m mock.ana_istasyon_taklit
"""

import json
import logging
import paho.mqtt.client as mqtt

# ============================================================
# YAPILANDIRMA
# ============================================================
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
STATION_ID = "ANA_ISTASYON_01"
TOPIC_SENSOR = "sensors/+/data"  # Tum sensorleri dinle

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("AnaIstasyon")


# ============================================================
# ALARM SIMULASYONU
# ============================================================

def trigger_alarm(data: dict):
    """Buzzer ve LED simulasyonu. Gercek donanim olsaydi GPIO pinleri tetiklenirdi."""
    richter = data.get("richter", 0)
    pga = data.get("pga", 0)
    device = data.get("device_id", "?")
    timestamp = data.get("timestamp", "?")

    logger.warning(
        "!!! DEPREM ALARMI !!! | Sensor: %s | Richter: %s | PGA: %s | Zaman: %s | BUZZER: AKTIF | LED: KIRMIZI",
        device, richter, pga, timestamp,
    )
    print()
    print("!" * 60)
    print("!!! DEPREM ALARMI - BUZZER CALISIYOR !!!")
    print("!" * 60)
    print(f"  Kaynak Sensor : {device}")
    print(f"  Richter        : {richter}")
    print(f"  PGA            : {pga}")
    print(f"  Zaman          : {timestamp}")
    print(f"  [BUZZER]  BIIIIP BIIIIP BIIIIP")
    print(f"  [LED]     KIRMIZI LED YANIP SONUYOR")
    print("!" * 60)
    print()


def show_normal_status(data: dict):
    """Normal veri geldiginde durum gosterir."""
    logger.info(
        "[LED: YESIL] Normal | Sensor: %s | Richter: %.1f | PGA: %.3f",
        data.get("device_id", "?"),
        data.get("richter", 0),
        data.get("pga", 0),
    )


# ============================================================
# MQTT CALLBACK'LERI
# ============================================================

def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        logger.info("MQTT Broker'a baglandi: %s:%d", MQTT_BROKER, MQTT_PORT)
        client.subscribe(TOPIC_SENSOR)
        logger.info("Dinleniyor: %s", TOPIC_SENSOR)
        print()
        print("=" * 60)
        print("  ANA ISTASYON HAZIR - Sensor verileri bekleniyor...")
        print("  (Deprem algilandiginda alarm otomatik calacak)")
        print("=" * 60)
        print()
    else:
        logger.error("Baglanti hatasi: %s", reason_code)


def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode("utf-8", errors="replace"))
    except json.JSONDecodeError:
        logger.warning("Hatali JSON paketi, atiliyor.")
        return

    deprem_flag = data.get("deprem_flag", False)

    if deprem_flag:
        trigger_alarm(data)
    else:
        show_normal_status(data)


# ============================================================
# ANA FONKSIYON
# ============================================================

def main():
    print("=" * 60)
    print("  Ana Istasyon Taklit Scripti Baslatiliyor")
    print(f"  Broker: {MQTT_BROKER}:{MQTT_PORT}")
    print(f"  Cihaz:  {STATION_ID}")
    print("=" * 60)

    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id=STATION_ID,
        protocol=mqtt.MQTTv311,
    )
    client.on_connect = on_connect
    client.on_message = on_message

    client.connect(MQTT_BROKER, MQTT_PORT, 60)

    try:
        client.loop_forever()
    except KeyboardInterrupt:
        print("\n[KAPANIYOR] Ana Istasyon kapatildi.")
        client.disconnect()


if __name__ == "__main__":
    main()
