"""
MQTT Client Yonetimi

Sorumluluk: Sadece MQTT broker baglantisi, subscribe/publish islemleri
ve otomatik yeniden baglanma (reconnect). JSON'in ne oldugunu bilmez,
sadece ham mesajlari alir ve kayitli callback'e iletir.
"""

import logging

import paho.mqtt.client as mqtt

from config.settings import (
    MQTT_BROKER,
    MQTT_PORT,
    MQTT_KEEPALIVE,
    MQTT_CLIENT_ID,
    MQTT_RECONNECT_MIN_DELAY,
    MQTT_RECONNECT_MAX_DELAY,
    TOPICS,
)

logger = logging.getLogger("MQTTClient")


class MQTTClient:
    """MQTT broker ile tum iletisimi yoneten sinif."""

    def __init__(self, on_message_callback=None):
        """
        Args:
            on_message_callback: Mesaj geldiginde cagrilacak dis fonksiyon.
                Imzasi: callback(topic: str, payload: str) seklinde olmali.
        """
        self._external_callback = on_message_callback

        self._client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            client_id=MQTT_CLIENT_ID,
            protocol=mqtt.MQTTv311,
        )

        # Dahili callback'leri bagla
        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message = self._on_message

        # Otomatik yeniden baglanma ayarlari
        self._client.reconnect_delay_set(
            min_delay=MQTT_RECONNECT_MIN_DELAY,
            max_delay=MQTT_RECONNECT_MAX_DELAY,
        )

    # ----------------------------------------------------------
    # PUBLIC METODLAR
    # ----------------------------------------------------------

    def connect(self):
        """Broker'a baglanir."""
        logger.info("Baglaniliyor: %s:%d ...", MQTT_BROKER, MQTT_PORT)
        try:
            self._client.connect(MQTT_BROKER, MQTT_PORT, MQTT_KEEPALIVE)
        except Exception as e:
            logger.critical("Broker'a baglanilamadi: %s", e)
            raise

    def start(self):
        """Sonsuz dongude mesajlari dinlemeye baslar (blocking)."""
        logger.info("Dinleme dongusu baslatiliyor (loop_forever)...")
        self._client.loop_forever()

    def stop(self):
        """Baglantilari duzgunce kapatir."""
        self._client.disconnect()
        logger.info("MQTT baglantisi kapatildi.")

    def publish(self, topic: str, payload: str):
        """Belirtilen topic'e mesaj yayinlar."""
        result = self._client.publish(topic, payload)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.debug("Publish basarili -> %s", topic)
        else:
            logger.warning("Publish basarisiz -> %s (rc=%s)", topic, result.rc)
        return result

    # ----------------------------------------------------------
    # DAHILI CALLBACK'LER
    # ----------------------------------------------------------

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        """Broker'a baglanildiginda cagrilir. Topic aboneliklerini kurar."""
        if reason_code == 0:
            logger.info("MQTT Broker'a baglanti basarili: %s:%d", MQTT_BROKER, MQTT_PORT)
            # Tum dinlenecek topic'lere abone ol
            for name, topic in TOPICS.items():
                if name != "cloud_events":  # cloud_events'e biz yaziyoruz, dinlemiyoruz
                    client.subscribe(topic)
                    logger.info("Abone olundu: %s", topic)
        else:
            logger.error("Broker baglanti hatasi! Kod: %s", reason_code)

    def _on_disconnect(self, client, userdata, flags, reason_code, properties):
        """Baglanti kesildiginde cagrilir."""
        if reason_code != 0:
            logger.warning(
                "Broker baglantisi kesildi (Kod: %s). Yeniden baglaniliyor...",
                reason_code,
            )

    def _on_message(self, client, userdata, msg):
        """
        Ham mesaji alir ve kayitli dis callback'e iletir.
        Bu sinif JSON parse YAPMAZ, sadece topic ve payload'u iletir.
        """
        topic = msg.topic
        payload = msg.payload.decode("utf-8", errors="replace")
        logger.debug("Ham mesaj alindi | Topic: %s", topic)

        if self._external_callback:
            self._external_callback(topic, payload)
