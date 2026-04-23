"""
Firebase Servisi (Placeholder)

Sorumluluk: Firebase Realtime Database'e veri yazma/okuma islemleri.
Faz 2'de firebase-admin veya REST API ile doldurulacaktir.
Su an sadece arayuzu (interface) tanimlar.
"""

import json
import logging

logger = logging.getLogger("FirebaseService")


class FirebaseService:
    """Firebase Realtime Database ile iletisimi yoneten sinif."""

    def __init__(self):
        self._connected = False
        logger.info("FirebaseService olusturuldu (Faz 2'de aktif edilecek).")

    def connect(self):
        """Firebase baglantisini kurar. Faz 2'de implemente edilecek."""
        logger.info("[PLACEHOLDER] Firebase baglantisi kurulacak.")
        self._connected = True

    def write_event(self, data: dict):
        """
        Deprem/sensor verisini Firebase'e yazar.
        Faz 2'de gercek Firebase SDK cagrisi yapilacak.
        """
        if not self._connected:
            logger.warning("Firebase bagli degil, veri yazilamadi.")
            return False

        logger.info(
            "[PLACEHOLDER] Firebase'e yazildi -> device: %s | richter: %s",
            data.get("device_id", "?"),
            data.get("richter", "?"),
        )
        return True

    @property
    def is_connected(self):
        return self._connected
