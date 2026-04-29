"""
Project Configuration

Centralizes all configurable parameters: MQTT broker settings,
Firebase credentials, topic definitions, validation rules,
queue limits, and logging format. Changing infrastructure
(broker, database, etc.) requires editing only this file.
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ============================================================
# FIREBASE SETTINGS
# ============================================================
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-credentials.json")
FIREBASE_DATABASE_URL = os.getenv("FIREBASE_DATABASE_URL", "")
FIREBASE_DB_NODE = "earthquake_events"  # Root node for event storage

# ============================================================
# MQTT BROKER SETTINGS
# ============================================================
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
MQTT_KEEPALIVE = 60  # seconds
MQTT_CLIENT_ID = "bridge-backend-01"

# Reconnection policy (exponential backoff)
MQTT_RECONNECT_MIN_DELAY = 1   # seconds
MQTT_RECONNECT_MAX_DELAY = 30  # seconds

# ============================================================
# MQTT TOPIC STRUCTURE
# ============================================================
TOPICS = {
    "sensor_data": "sensors/+/data",           # Inbound: all sensor data (wildcard)
    "sensor_status": "sensors/+/status",       # Inbound: LWT / sensor health status
    "commands": "commands/main",                # Inbound: control commands from main station
    "cloud_events": "cloud/earthquake_events",  # Outbound: processed data for dashboard
    "system_health": "system/health",           # Outbound: watchdog telemetry for dashboard
}

# ============================================================
# JSON VALIDATION
# ============================================================
REQUIRED_SENSOR_FIELDS = [
    "device_id",
    "timestamp",
    "pga",
    "richter",
    "deprem_flag",
]

# ============================================================
# MESSAGE QUEUE (FAULT TOLERANCE)
# ============================================================
MESSAGE_QUEUE_MAX_SIZE = 50  # Max buffered messages during connectivity loss

# ============================================================
# LOGGING
# ============================================================
LOG_LEVEL = "INFO"
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s - %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
LOG_FILE = "bridge.log"
