"""
Message Handler / Router

Parses incoming raw MQTT payloads into JSON, validates required fields,
stamps each packet with a server-side UTC timestamp, and dispatches
the data to the appropriate registered callbacks based on topic.

This module has no knowledge of MQTT transport or Firebase storage;
it operates purely on data transformation and routing.
"""

import json
import logging
from datetime import datetime, timezone

from config.settings import REQUIRED_SENSOR_FIELDS, ALLOWED_DEVICE_PREFIX

logger = logging.getLogger("MessageHandler")


class MessageHandler:
    """
    Central message router for incoming MQTT messages.

    External services (Firebase, alerting, etc.) register themselves
    as callbacks. This decouples the handler from any specific service
    implementation.
    """

    def __init__(self):
        self._on_sensor_data_callbacks = []
        self._on_earthquake_callbacks = []
        self._on_command_callbacks = []
        self._on_sensor_status_callbacks = []

    # ----------------------------------------------------------
    # CALLBACK REGISTRATION
    # ----------------------------------------------------------

    def register_sensor_data_handler(self, callback):
        """Register a callback for normal sensor data. Signature: callback(data: dict)"""
        self._on_sensor_data_callbacks.append(callback)

    def register_earthquake_handler(self, callback):
        """Register a callback for earthquake alarm events. Signature: callback(data: dict)"""
        self._on_earthquake_callbacks.append(callback)

    def register_command_handler(self, callback):
        """Register a callback for control commands. Signature: callback(data: dict)"""
        self._on_command_callbacks.append(callback)

    def register_sensor_status_handler(self, callback):
        """Register a callback for LWT status changes. Signature: callback(device_id: str, status: str)"""
        self._on_sensor_status_callbacks.append(callback)

    # ----------------------------------------------------------
    # MAIN ROUTER
    # ----------------------------------------------------------

    def handle_message(self, topic: str, raw_payload: str):
        """
        Entry point for all incoming MQTT messages.
        Routes to the appropriate processor based on topic pattern.
        Filters out devices that don't match ALLOWED_DEVICE_PREFIX.
        Registered as the on_message callback for MQTTClient.
        """
        # Extract device_id from topic (sensors/{device_id}/data or /status)
        if topic.startswith("sensors/") and "/" in topic[8:]:
            device_id = topic.split("/")[1]
            if not device_id.upper().startswith(ALLOWED_DEVICE_PREFIX):
                return  # Silently ignore non-project devices

        if topic.startswith("sensors/") and topic.endswith("/data"):
            self._process_sensor_data(topic, raw_payload)
        elif topic.startswith("sensors/") and topic.endswith("/status"):
            self._process_sensor_status(topic, raw_payload)
        elif topic == "commands/main":
            self._process_command(raw_payload)
        else:
            logger.debug("Unrecognized topic: %s", topic)

    # ----------------------------------------------------------
    # SENSOR DATA PROCESSING
    # ----------------------------------------------------------

    def _process_sensor_data(self, topic: str, raw_payload: str):
        """
        Processes incoming sensor data packets:
        1. Parses JSON payload
        2. Stamps with server-side UTC timestamp (authoritative time source)
        3. Validates required fields
        4. Dispatches to earthquake or normal-data callbacks
        """

        # 1. Parse JSON
        data = self._safe_parse_json(raw_payload)
        if data is None:
            return

        # 2. Inject server timestamp at the earliest possible stage
        data["server_timestamp"] = datetime.now(timezone.utc).isoformat()

        # 3. Validate required fields
        if not self._validate_fields(data, REQUIRED_SENSOR_FIELDS):
            return

        # 4. Extract key fields for logging and routing
        device_id = data["device_id"]
        deprem_flag = data["deprem_flag"]
        richter = data["richter"]
        pga = data["pga"]
        timestamp = data["timestamp"]

        if deprem_flag:
            logger.warning(
                "EARTHQUAKE ALARM | Device: %s | Richter: %.1f | PGA: %.2f | Time: %s",
                device_id, richter, pga, timestamp,
            )
            # Dispatch to earthquake-specific callbacks
            for cb in self._on_earthquake_callbacks:
                try:
                    cb(data)
                except Exception as e:
                    logger.error("Earthquake callback error: %s", e)
        else:
            logger.info(
                "Normal data    | Device: %s | Richter: %.1f | PGA: %.2f | Time: %s",
                device_id, richter, pga, timestamp,
            )

        # Dispatch to general sensor data callbacks (runs for both normal and alarm)
        for cb in self._on_sensor_data_callbacks:
            try:
                cb(data)
            except Exception as e:
                logger.error("Sensor data callback error: %s", e)

    # ----------------------------------------------------------
    # SENSOR STATUS (LWT) PROCESSING
    # ----------------------------------------------------------

    def _process_sensor_status(self, topic: str, raw_payload: str):
        """
        Processes LWT (Last Will and Testament) messages.
        Topic format: sensors/{device_id}/status
        Payload: plain text status string (e.g., "OFFLINE", "ONLINE")
        """
        try:
            device_id = topic.split("/")[1]
            status = raw_payload.strip().upper()

            if status == "OFFLINE":
                logger.critical("SENSOR DISCONNECTED: %s", device_id)
            else:
                logger.info("Sensor status update: %s -> %s", device_id, status)

            for cb in self._on_sensor_status_callbacks:
                cb(device_id, status)
        except Exception as e:
            logger.error("Error processing sensor status: %s", e)

    # ----------------------------------------------------------
    # COMMAND PROCESSING
    # ----------------------------------------------------------

    def _process_command(self, raw_payload: str):
        """Processes control commands from the main station (e.g., silence, acknowledge)."""
        data = self._safe_parse_json(raw_payload)
        if data is None:
            return

        command = data.get("command", "unknown")
        logger.info("Command received: %s | Detail: %s", command, data)

        for cb in self._on_command_callbacks:
            try:
                cb(data)
            except Exception as e:
                logger.error("Command callback error: %s", e)

    # ----------------------------------------------------------
    # UTILITY METHODS
    # ----------------------------------------------------------

    @staticmethod
    def _safe_parse_json(raw: str):
        """Parse JSON safely. Returns None on failure without crashing the system."""
        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            logger.error("Malformed JSON discarded: %s | Error: %s", raw[:100], e)
            return None

    @staticmethod
    def _validate_fields(data: dict, required: list) -> bool:
        """Verify that all required fields are present in the parsed data."""
        missing = [f for f in required if f not in data]
        if missing:
            logger.error("Missing required fields: %s | Packet: %s", missing, data)
            return False
        return True
