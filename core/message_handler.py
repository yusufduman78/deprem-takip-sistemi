"""
Mesaj Yonlendirici (Message Handler / Router)

Sorumluluk: Gelen ham MQTT mesajlarini JSON olarak parse eder,
dogrular (validation), ve icerigine gore dogru servise yonlendirir.
MQTT veya Firebase'den habersizdir; sadece veriyi isler.
"""

import json
import logging

from config.settings import REQUIRED_SENSOR_FIELDS

logger = logging.getLogger("MessageHandler")


class MessageHandler:
    """
    Gelen MQTT mesajlarini isleyen ve yonlendiren sinif.

    Dis servisler (Firebase, Alert vb.) callback olarak kaydedilir.
    Boylece MessageHandler hicbir servise dogrudan bagimli degildir.
    """

    def __init__(self):
        # Deprem verisi geldiginde cagrilacak callback listesi
        self._on_sensor_data_callbacks = []
        # Deprem alarmi geldiginde cagrilacak callback listesi
        self._on_earthquake_callbacks = []
        # Komut geldiginde cagrilacak callback listesi
        self._on_command_callbacks = []

    # ----------------------------------------------------------
    # CALLBACK KAYIT METODLARI
    # ----------------------------------------------------------

    def register_sensor_data_handler(self, callback):
        """Her sensor verisi geldiginde cagrilacak fonksiyonu kaydeder.
        Imza: callback(data: dict)"""
        self._on_sensor_data_callbacks.append(callback)

    def register_earthquake_handler(self, callback):
        """Deprem alarmi tetiklendiginde cagrilacak fonksiyonu kaydeder.
        Imza: callback(data: dict)"""
        self._on_earthquake_callbacks.append(callback)

    def register_command_handler(self, callback):
        """Komut mesaji geldiginde cagrilacak fonksiyonu kaydeder.
        Imza: callback(data: dict)"""
        self._on_command_callbacks.append(callback)

    # ----------------------------------------------------------
    # ANA YONLENDIRME (ROUTER)
    # ----------------------------------------------------------

    def handle_message(self, topic: str, raw_payload: str):
        """
        MQTT'den gelen ham mesaji topic'e gore dogru isleyiciye yonlendirir.
        Bu metod MQTTClient'in on_message callback'i olarak kaydedilir.
        """
        if topic.startswith("sensors/") and topic.endswith("/data"):
            self._process_sensor_data(topic, raw_payload)
        elif topic == "commands/main":
            self._process_command(raw_payload)
        else:
            logger.debug("Bilinmeyen topic: %s", topic)

    # ----------------------------------------------------------
    # SENSOR VERISI ISLEME
    # ----------------------------------------------------------

    def _process_sensor_data(self, topic: str, raw_payload: str):
        """Sensor verisini parse eder, dogrular ve callback'leri tetikler."""

        # 1. JSON Parse
        data = self._safe_parse_json(raw_payload)
        if data is None:
            return

        # 2. Alan dogrulama (validation)
        if not self._validate_fields(data, REQUIRED_SENSOR_FIELDS):
            return

        # 3. Veriyi logla
        device_id = data["device_id"]
        deprem_flag = data["deprem_flag"]
        richter = data["richter"]
        pga = data["pga"]
        timestamp = data["timestamp"]

        if deprem_flag:
            logger.warning(
                "DEPREM ALARMI! | Cihaz: %s | Richter: %.1f | PGA: %.2f | Zaman: %s",
                device_id, richter, pga, timestamp,
            )
            # Deprem callback'lerini tetikle
            for cb in self._on_earthquake_callbacks:
                try:
                    cb(data)
                except Exception as e:
                    logger.error("Earthquake callback hatasi: %s", e)
        else:
            logger.info(
                "Normal veri   | Cihaz: %s | Richter: %.1f | PGA: %.2f | Zaman: %s",
                device_id, richter, pga, timestamp,
            )

        # 4. Genel sensor verisi callback'lerini tetikle (her durumda)
        for cb in self._on_sensor_data_callbacks:
            try:
                cb(data)
            except Exception as e:
                logger.error("Sensor data callback hatasi: %s", e)

    # ----------------------------------------------------------
    # KOMUT ISLEME
    # ----------------------------------------------------------

    def _process_command(self, raw_payload: str):
        """Ana Istasyondan gelen komutlari isler."""
        data = self._safe_parse_json(raw_payload)
        if data is None:
            return

        command = data.get("command", "bilinmiyor")
        logger.info("Komut alindi: %s | Detay: %s", command, data)

        for cb in self._on_command_callbacks:
            try:
                cb(data)
            except Exception as e:
                logger.error("Command callback hatasi: %s", e)

    # ----------------------------------------------------------
    # YARDIMCI METODLAR
    # ----------------------------------------------------------

    @staticmethod
    def _safe_parse_json(raw: str):
        """JSON parse eder, hata olursa None doner. Sistem cokmez."""
        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            logger.error("Hatali JSON paketi atildi: %s | Hata: %s", raw[:100], e)
            return None

    @staticmethod
    def _validate_fields(data: dict, required: list) -> bool:
        """Gerekli alanlarin JSON icinde var olup olmadigini kontrol eder."""
        missing = [f for f in required if f not in data]
        if missing:
            logger.error("Eksik alanlar: %s | Paket: %s", missing, data)
            return False
        return True
