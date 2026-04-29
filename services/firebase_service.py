"""
Firebase Realtime Database Service

Handles initialization of the Firebase Admin SDK and provides
a write interface for persisting earthquake event data. This
module is storage-only; it has no knowledge of MQTT or message
routing. Data is written exactly as received, with no
additional transformation.
"""

import logging

import firebase_admin
from firebase_admin import credentials, db

from config.settings import (
    FIREBASE_CREDENTIALS_PATH,
    FIREBASE_DATABASE_URL,
    FIREBASE_DB_NODE,
)

logger = logging.getLogger("FirebaseService")


class FirebaseService:
    """Manages connection and write operations to Firebase Realtime Database."""

    def __init__(self):
        self._connected = False
        self._ref = None

    def connect(self):
        """
        Initialize the Firebase Admin SDK and obtain a database reference.
        Called once at application startup.
        """
        if not FIREBASE_DATABASE_URL:
            logger.error("FIREBASE_DATABASE_URL is empty. Check .env file.")
            return

        try:
            cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred, {
                "databaseURL": FIREBASE_DATABASE_URL,
            })
            self._ref = db.reference(FIREBASE_DB_NODE)
            self._connected = True
            logger.info(
                "Firebase connected | URL: %s | Node: /%s",
                FIREBASE_DATABASE_URL, FIREBASE_DB_NODE,
            )
        except FileNotFoundError:
            logger.critical(
                "Credentials file not found: %s", FIREBASE_CREDENTIALS_PATH
            )
        except Exception as e:
            logger.critical("Firebase initialization failed: %s", e)

    def write_event(self, data: dict) -> bool:
        """
        Push an earthquake/sensor event to Firebase Realtime Database.
        Each record is assigned a unique auto-generated key under
        the configured database node.

        Args:
            data: Sensor event dictionary (device_id, richter, pga, etc.)

        Returns:
            True if the write succeeded, False otherwise.
        """
        if not self._connected or self._ref is None:
            logger.warning("Firebase not connected. Write skipped.")
            return False

        try:
            new_ref = self._ref.push(data)
            logger.info(
                "Written to Firebase | ID: %s | Device: %s | Richter: %s",
                new_ref.key,
                data.get("device_id", "?"),
                data.get("richter", "?"),
            )
            return True

        except Exception as e:
            logger.error("Firebase write error: %s", e)
            return False

    @property
    def is_connected(self):
        return self._connected
