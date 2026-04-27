"""
Firebase Servisi

Sorumluluk: Firebase Realtime Database'e deprem/sensor verisi yazma.
MQTT'den veya JSON'dan habersizdir; sadece kendisine verilen
Python dict'i Firebase'e push eder.
"""

import logging
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, db

from config.settings import (
    FIREBASE_CREDENTIALS_PATH,
    FIREBASE_DATABASE_URL,
    FIREBASE_DB_NODE,
)

logger = logging.getLogger("FirebaseService")


class FirebaseService:
    """Firebase Realtime Database ile iletisimi yoneten sinif."""

    def __init__(self):
        self._connected = False
        self._ref = None  # database referansi

    def connect(self):
        """
        Firebase Admin SDK'yi baslatir ve veritabani referansini olusturur.
        Bu metod uygulama baslatildiginda bir kez cagrilir.
        """
        if not FIREBASE_DATABASE_URL:
            logger.error("FIREBASE_DATABASE_URL bos! .env dosyasini kontrol edin.")
            return

        try:
            cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred, {
                "databaseURL": FIREBASE_DATABASE_URL,
            })
            self._ref = db.reference(FIREBASE_DB_NODE)
            self._connected = True
            logger.info(
                "Firebase baglantisi basarili | DB: %s | Node: /%s",
                FIREBASE_DATABASE_URL, FIREBASE_DB_NODE,
            )
        except FileNotFoundError:
            logger.critical(
                "Kimlik dosyasi bulunamadi: %s", FIREBASE_CREDENTIALS_PATH
            )
        except Exception as e:
            logger.critical("Firebase baslatilamadi: %s", e)

    def write_event(self, data: dict) -> bool:
        """
        Deprem/sensor verisini Firebase Realtime Database'e push eder.
        Her kayit benzersiz bir ID ile /earthquake_events altina eklenir.

        Args:
            data: Sensor verisini iceren dict (device_id, richter, pga, vb.)

        Returns:
            bool: Yazma basarili ise True, degilse False.
        """
        if not self._connected or self._ref is None:
            logger.warning("Firebase bagli degil, veri yazilamadi.")
            return False

        try:
            # push() her kayda benzersiz bir ID atar (ornek: -NxYz123...)
            new_ref = self._ref.push(data)
            logger.info(
                "Firebase'e yazildi | ID: %s | Cihaz: %s | Richter: %s",
                new_ref.key,
                data.get("device_id", "?"),
                data.get("richter", "?"),
            )
            return True

        except Exception as e:
            logger.error("Firebase yazma hatasi: %s", e)
            return False

    @property
    def is_connected(self):
        return self._connected
