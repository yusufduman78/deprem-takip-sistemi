"""
Akilli Deprem Izleme ve Uyari Sistemi
IoT Iletisim ve Veri Koprusu - Ana Giris Noktasi

Bu dosya tum modulleri bir orkestra sefi gibi birlestiren
tek giris noktasidir. Kendisi hicbir is mantigi icermez;
sadece parcalari olusturur, birbirine baglar ve baslatir.

Kullanim:
    conda activate depremenv
    python bridge_backend.py
"""

import logging
import json

from config.settings import LOG_LEVEL, LOG_FORMAT, LOG_DATE_FORMAT, LOG_FILE, TOPICS
from core.mqtt_client import MQTTClient
from core.message_handler import MessageHandler
from core.message_queue import MessageQueue
from services.firebase_service import FirebaseService


def setup_logging():
    """Loglama sistemini kurar: hem konsola hem dosyaya yazar."""
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))

    formatter = logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT)

    # Konsol handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # Dosya handler
    file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)


def main():
    # 1. Loglama sistemini kur
    setup_logging()
    logger = logging.getLogger("Main")

    logger.info("=" * 60)
    logger.info("Deprem Izleme Sistemi - IoT Bridge Backend Baslatiliyor")
    logger.info("=" * 60)

    # 2. Servisleri olustur
    firebase = FirebaseService()
    firebase.connect()

    message_queue = MessageQueue()

    # 3. Mesaj isleyiciyi olustur ve callback'leri kaydet
    handler = MessageHandler()

    # Her sensor verisi geldiginde -> cloud topic'ine yonlendir
    def on_sensor_data(data: dict):
        payload = json.dumps(data)
        mqtt_client.publish(TOPICS["cloud_events"], payload)
        logger.info("Bulut kanalina yonlendirildi: %s", TOPICS["cloud_events"])

    # Deprem alarmi geldiginde -> Firebase'e yaz (Faz 2'de gercek yazim)
    def on_earthquake(data: dict):
        success = firebase.write_event(data)
        if not success:
            # Firebase'e yazilamazsa kuyrukla
            message_queue.enqueue(TOPICS["cloud_events"], data)
            logger.warning("Firebase'e yazilamadi, kuyruga eklendi.")

    # Komut geldiginde -> logla (ileride sensor'e iletilecek)
    def on_command(data: dict):
        logger.info("Komut islendi: %s", data.get("command", "bilinmiyor"))

    handler.register_sensor_data_handler(on_sensor_data)
    handler.register_earthquake_handler(on_earthquake)
    handler.register_command_handler(on_command)

    # 4. MQTT client'i olustur ve mesaj isleyiciyi bagla
    mqtt_client = MQTTClient(on_message_callback=handler.handle_message)

    # 5. Baglan ve dinlemeye basla
    try:
        mqtt_client.connect()
        mqtt_client.start()  # loop_forever - Ctrl+C ile durdurulur
    except KeyboardInterrupt:
        logger.info("Bridge Backend kapatiliyor...")
    except Exception as e:
        logger.critical("Beklenmeyen hata: %s", e)
    finally:
        mqtt_client.stop()
        logger.info("Sistem kapatildi. Gule gule!")


if __name__ == "__main__":
    main()
