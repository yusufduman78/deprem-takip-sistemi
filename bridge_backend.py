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
import threading

from config.settings import LOG_LEVEL, LOG_FORMAT, LOG_DATE_FORMAT, LOG_FILE, TOPICS
from core.mqtt_client import MQTTClient
from core.message_handler import MessageHandler
from core.message_queue import MessageQueue
from services.firebase_service import FirebaseService

# Kuyruk bosaltma araligi (saniye)
QUEUE_RETRY_INTERVAL = 10


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


def start_queue_retry_loop(message_queue, firebase, stop_event):
    """
    Arka planda calisarak kuyruktaki mesajlari periyodik olarak
    Firebase'e gondermeyi dener. Internet kesildiginde biriken
    veriler, baglanti geldiginde otomatik olarak bosaltilir.
    """
    logger = logging.getLogger("RetryLoop")

    while not stop_event.is_set():
        # Belirtilen sure kadar bekle (veya stop_event gelirse erken cik)
        stop_event.wait(QUEUE_RETRY_INTERVAL)

        if stop_event.is_set():
            break

        if message_queue.is_empty:
            continue

        logger.info(
            "Kuyruk kontrol ediliyor... (%d mesaj bekliyor)",
            message_queue.size,
        )

        # Kuyruktaki her mesaji Firebase'e yazmayi dene
        def retry_publish(topic, payload):
            data = json.loads(payload)
            success = firebase.write_event(data)
            if not success:
                raise ConnectionError("Firebase'e yazilamadi")

        sent = message_queue.flush(retry_publish)
        if sent > 0:
            logger.info("Kuyruk basariyla bosaltildi: %d mesaj gonderildi.", sent)


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

    # Deprem alarmi geldiginde -> Firebase'e yaz
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

    # 5. Arka planda kuyruk bosaltma dongusunu baslat
    stop_event = threading.Event()
    retry_thread = threading.Thread(
        target=start_queue_retry_loop,
        args=(message_queue, firebase, stop_event),
        daemon=True,
        name="QueueRetryThread",
    )
    retry_thread.start()
    logger.info(
        "Kuyruk bosaltma dongusu baslatildi (her %d saniyede kontrol)",
        QUEUE_RETRY_INTERVAL,
    )

    # 6. Baglan ve dinlemeye basla
    try:
        mqtt_client.connect()
        mqtt_client.start()  # loop_forever - Ctrl+C ile durdurulur
    except KeyboardInterrupt:
        logger.info("Bridge Backend kapatiliyor...")
    except Exception as e:
        logger.critical("Beklenmeyen hata: %s", e)
    finally:
        stop_event.set()
        retry_thread.join(timeout=3)
        mqtt_client.stop()
        logger.info("Sistem kapatildi. Gule gule!")


if __name__ == "__main__":
    main()
