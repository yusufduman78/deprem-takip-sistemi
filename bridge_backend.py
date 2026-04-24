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
import time
from datetime import datetime, timezone

from config.settings import LOG_LEVEL, LOG_FORMAT, LOG_DATE_FORMAT, LOG_FILE, TOPICS
from core.mqtt_client import MQTTClient
from core.message_handler import MessageHandler
from core.message_queue import MessageQueue
from core.watchdog import watchdog_loop
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


def start_sensor_timeout_loop(last_seen_times, mqtt_client, stop_event):
    """
    Arka planda calisarak 10 saniyeden uzun suredir 
    veri gondermeyen sensorleri tespit eder ve alarm uretir.
    """
    logger = logging.getLogger("TimeoutMonitor")
    alerted_sensors = set()
    
    while not stop_event.is_set():
        stop_event.wait(2.0)  # Her 2 saniyede bir kontrol et
        if stop_event.is_set():
            break
            
        now = time.time()
        for device_id, last_seen in list(last_seen_times.items()):
            if now - last_seen > 10.0:
                if device_id not in alerted_sensors:
                    logger.warning("!!! SENSOR TIMEOUT !!! %s cihazindan 10 saniyedir veri alinamiyor!", device_id)
                    
                    # Frontend'in gorebilmesi icin bulut kanalina uyari bas
                    payload = json.dumps({
                        "device_id": device_id, 
                        "status": "TIMEOUT", 
                        "error": "Veri akisi kesildi",
                        "server_timestamp": datetime.now(timezone.utc).isoformat()
                    })
                    mqtt_client.publish(TOPICS["cloud_events"], payload)
                    alerted_sensors.add(device_id)
            else:
                if device_id in alerted_sensors:
                    logger.info("Sensor baglantisi geri geldi: %s", device_id)
                    alerted_sensors.remove(device_id)


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

    # State Tracking (Durum Takipleri)
    last_publish_times = {}  # Throttling icin
    last_seen_times = {}     # Timeout takibi icin
    
    PUBLISH_INTERVAL = 0.2   # Saniyede 5 paket (1 / 5 = 0.2)

    # 3. Mesaj isleyiciyi olustur ve callback'leri kaydet
    handler = MessageHandler()

    # Her sensor verisi geldiginde -> Throttling uygula -> cloud topic'ine yonlendir
    def on_sensor_data(data: dict):
        device_id = data.get("device_id", "UNKNOWN")
        now = time.time()
        
        # Son gorulme zamanini guncelle (Timeout sistemi icin)
        last_seen_times[device_id] = now
        
        # Saniyede 5 paket sinirlamasi (Throttling)
        last_pub = last_publish_times.get(device_id, 0)
        if now - last_pub >= PUBLISH_INTERVAL:
            payload = json.dumps(data)
            mqtt_client.publish(TOPICS["cloud_events"], payload)
            last_publish_times[device_id] = now
            # Yogun akista log ekranini kirletmemek icin INFO logunu kapattik/kisitik
            # Sadece DEBUG olarak kalabilir veya sessizce gonderilebilir.

    # Deprem alarmi geldiginde -> Firebase'e yaz
    def on_earthquake(data: dict):
        device_id = data.get("device_id", "UNKNOWN")
        last_seen_times[device_id] = time.time()  # Depremde de aktifligini korur
        
        # server_timestamp zaten MessageHandler icinde eklendi
        success = firebase.write_event(data)
        if not success:
            # Firebase'e yazilamazsa kuyrukla (zaman damgasi paketin icinde sakli)
            message_queue.enqueue(TOPICS["cloud_events"], data)
            logger.warning("Firebase'e yazilamadi, kuyruga eklendi.")
            
        # Deprem alarmi Throttling (Seyreltme) KURALLARINI DELER! Aninda MQTT'ye de basilmali.
        payload = json.dumps(data)
        mqtt_client.publish(TOPICS["cloud_events"], payload)

    # Komut geldiginde -> logla (ileride sensor'e iletilecek)
    def on_command(data: dict):
        logger.info("Komut islendi: %s", data.get("command", "bilinmiyor"))

    # Sensor baglantisi koptugunda -> logla ve (opsiyonel) Firebase'e yaz
    def on_sensor_status(device_id: str, status: str):
        if status == "OFFLINE":
            logger.critical("MQTT'den LWT mesaji alindi. %s cihazinin elektrigi veya interneti kesilmis olabilir!", device_id)
            # Istersen ileride bunu Firebase'e yazabilirsin
            # firebase.write_event({"device_id": device_id, "deprem_flag": False, "error": "OFFLINE"})

    handler.register_sensor_data_handler(on_sensor_data)
    handler.register_earthquake_handler(on_earthquake)
    handler.register_command_handler(on_command)
    handler.register_sensor_status_handler(on_sensor_status)

    # 4. MQTT client'i olustur ve mesaj isleyiciyi bagla
    mqtt_client = MQTTClient(on_message_callback=handler.handle_message)

    # 5. Arka plan servislerini (Thread) baslat
    stop_event = threading.Event()
    start_time = time.time()
    
    # 5.a Kuyruk Bosaltici (Retry Mechanism)
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

    # 5.b Performans Izleyici (Watchdog) - Artik MQTT Client, Queue ve Last Seen yolluyoruz
    watchdog_t = threading.Thread(
        target=watchdog_loop,
        args=(stop_event, start_time, mqtt_client, TOPICS.get("system_health"), message_queue, last_seen_times),
        daemon=True,
        name="WatchdogThread",
    )
    watchdog_t.start()
    
    # 5.c Sensor Timeout (Kopma) Takipcisi
    timeout_t = threading.Thread(
        target=start_sensor_timeout_loop,
        args=(last_seen_times, mqtt_client, stop_event),
        daemon=True,
        name="TimeoutThread",
    )
    timeout_t.start()

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
