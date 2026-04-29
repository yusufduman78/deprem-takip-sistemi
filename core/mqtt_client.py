"""
MQTT Client Manager

Manages the connection lifecycle with the MQTT broker: connect,
subscribe, publish, and automatic reconnection with exponential
backoff. This module is transport-only; it has no knowledge of
JSON structure or message semantics. Raw payloads are forwarded
to the registered external callback for processing.
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
    """Encapsulates all MQTT broker communication."""

    def __init__(self, on_message_callback=None):
        """
        Args:
            on_message_callback: External function invoked on every incoming message.
                Expected signature: callback(topic: str, payload: str)
        """
        self._external_callback = on_message_callback

        self._client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            client_id=MQTT_CLIENT_ID,
            protocol=mqtt.MQTTv311,
        )

        # Bind internal event handlers
        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message = self._on_message

        # Configure automatic reconnection with exponential backoff
        self._client.reconnect_delay_set(
            min_delay=MQTT_RECONNECT_MIN_DELAY,
            max_delay=MQTT_RECONNECT_MAX_DELAY,
        )

    # ----------------------------------------------------------
    # PUBLIC API
    # ----------------------------------------------------------

    def connect(self):
        """Establish connection to the MQTT broker."""
        logger.info("Connecting to %s:%d ...", MQTT_BROKER, MQTT_PORT)
        try:
            self._client.connect(MQTT_BROKER, MQTT_PORT, MQTT_KEEPALIVE)
        except Exception as e:
            logger.critical("Failed to connect to broker: %s", e)
            raise

    def start(self):
        """Enter the blocking event loop. Processes messages until interrupted."""
        logger.info("Starting blocking event loop (loop_forever)...")
        self._client.loop_forever()

    def stop(self):
        """Gracefully disconnect from the broker."""
        self._client.disconnect()
        logger.info("MQTT connection closed.")

    def publish(self, topic: str, payload: str):
        """Publish a message to the specified topic."""
        result = self._client.publish(topic, payload)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.debug("Published -> %s", topic)
        else:
            logger.warning("Publish failed -> %s (rc=%s)", topic, result.rc)
        return result

    # ----------------------------------------------------------
    # INTERNAL EVENT HANDLERS
    # ----------------------------------------------------------

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        """Called when connection to the broker is established. Subscribes to all configured topics."""
        if reason_code == 0:
            logger.info("Connected to MQTT broker: %s:%d", MQTT_BROKER, MQTT_PORT)
            # Subscribe to all topics except cloud_events (outbound-only channel)
            for name, topic in TOPICS.items():
                if name not in ("cloud_events", "system_health"):
                    client.subscribe(topic)
                    logger.info("Subscribed: %s", topic)
        else:
            logger.error("Broker connection failed. Code: %s", reason_code)

    def _on_disconnect(self, client, userdata, flags, reason_code, properties):
        """Called when the broker connection is lost. Paho handles automatic reconnection."""
        if reason_code != 0:
            logger.warning(
                "Broker connection lost (code: %s). Auto-reconnecting...",
                reason_code,
            )

    def _on_message(self, client, userdata, msg):
        """
        Called for every incoming message. Decodes the payload and
        forwards it to the registered external callback. No JSON
        parsing is performed at this layer.
        """
        topic = msg.topic
        payload = msg.payload.decode("utf-8", errors="replace")
        logger.debug("Raw message received | Topic: %s", topic)

        if self._external_callback:
            self._external_callback(topic, payload)
