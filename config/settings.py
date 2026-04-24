"""
Proje Ayarlari (Configuration)

Tum yapilandirma degerleri tek bir yerde toplanir.
Broker degisse, topic eklense sadece bu dosya degisir.
"""

import os
from dotenv import load_dotenv

# .env dosyasindaki degerleri yukle
load_dotenv()

# ============================================================
# FIREBASE AYARLARI
# ============================================================
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-credentials.json")
FIREBASE_DATABASE_URL = os.getenv("FIREBASE_DATABASE_URL", "")
FIREBASE_DB_NODE = "earthquake_events"  # Verilerin yazilacagi ana dugum

# ============================================================
# MQTT AYARLARI
# ============================================================
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
MQTT_KEEPALIVE = 60  # saniye
MQTT_CLIENT_ID = "bridge-backend-01"

# Yeniden baglanma ayarlari
MQTT_RECONNECT_MIN_DELAY = 1   # saniye
MQTT_RECONNECT_MAX_DELAY = 30  # saniye

# ============================================================
# MQTT TOPIC YAPISI
# ============================================================
TOPICS = {
    "sensor_data": "sensors/+/data",           # Tum sensorlerden gelen veri
    "sensor_status": "sensors/+/status",       # (Opsiyonel) Sensor arıza/lwt takibi
    "commands": "commands/main",                # Ana Istasyondan gelen komutlar
    "cloud_events": "cloud/earthquake_events",  # Bulut kanalina yonlendirme
}

# ============================================================
# JSON DOGRULAMA
# ============================================================
REQUIRED_SENSOR_FIELDS = [
    "device_id",
    "timestamp",
    "pga",
    "richter",
    "deprem_flag",
]

# ============================================================
# MESAJ KUYRUGU (MESSAGE QUEUE)
# ============================================================
MESSAGE_QUEUE_MAX_SIZE = 50  # Baglanti koptiginda RAM'de tutulacak maks mesaj

# ============================================================
# LOGLAMA AYARLARI
# ============================================================
LOG_LEVEL = "INFO"
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s - %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
LOG_FILE = "bridge.log"  # Dosyaya da log yazilacak
