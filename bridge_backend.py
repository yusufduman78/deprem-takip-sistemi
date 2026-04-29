"""
IoT Communication and Data Bridge - Main Entry Point

Orchestrates all system modules: MQTT client, message handler,
Firebase service, message queue, sensor timeout monitor, and
system health watchdog. Contains no business logic; only wires
components together and manages their lifecycle.

Usage:
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


# Interval (seconds) between queue retry attempts
QUEUE_RETRY_INTERVAL = 10


def setup_logging():
    """Configure dual-output logging: console and rotating log file."""
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))

    formatter = logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT)

    # Console output
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # Persistent file output
    file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)


def start_queue_retry_loop(message_queue, firebase, stop_event):
    """
    Background thread: periodically flushes queued messages to Firebase.

    When the internet connection drops, sensor data accumulates in the
    in-memory queue. This loop retries delivery every QUEUE_RETRY_INTERVAL
    seconds, ensuring zero data loss once connectivity is restored.
    """
    logger = logging.getLogger("RetryLoop")

    while not stop_event.is_set():
        stop_event.wait(QUEUE_RETRY_INTERVAL)

        if stop_event.is_set():
            break

        if message_queue.is_empty:
            continue

        logger.info(
            "Checking queue... (%d messages pending)",
            message_queue.size,
        )

        def retry_publish(topic, payload):
            data = json.loads(payload)
            success = firebase.write_event(data)
            if not success:
                raise ConnectionError("Firebase write failed")

        sent = message_queue.flush(retry_publish)
        if sent > 0:
            logger.info("Queue flushed successfully: %d messages delivered.", sent)


def start_sensor_timeout_loop(last_seen_times, mqtt_client, stop_event):
    """
    Background thread: monitors sensor heartbeat and raises timeout alarms.

    Checks every 2 seconds whether any registered sensor has been silent
    for more than 10 seconds. On timeout, publishes a TIMEOUT event to
    the cloud channel so the dashboard can display a connectivity warning.
    Automatically clears the alarm when data flow resumes.
    """
    logger = logging.getLogger("TimeoutMonitor")
    alerted_sensors = set()

    while not stop_event.is_set():
        stop_event.wait(2.0)
        if stop_event.is_set():
            break

        now = time.time()
        for device_id, last_seen in list(last_seen_times.items()):
            if now - last_seen > 10.0:
                if device_id not in alerted_sensors:
                    logger.warning(
                        "SENSOR TIMEOUT: No data from %s for 10+ seconds.", device_id
                    )

                    # Publish timeout event to cloud channel for dashboard visibility
                    payload = json.dumps({
                        "device_id": device_id,
                        "status": "TIMEOUT",
                        "error": "Data stream interrupted",
                        "server_timestamp": datetime.now(timezone.utc).isoformat()
                    })
                    mqtt_client.publish(TOPICS["cloud_events"], payload)
                    alerted_sensors.add(device_id)
            else:
                if device_id in alerted_sensors:
                    logger.info("Sensor reconnected: %s", device_id)
                    alerted_sensors.remove(device_id)


def main():
    # 1. Initialize logging subsystem
    setup_logging()
    logger = logging.getLogger("Main")

    logger.info("=" * 60)
    logger.info("Earthquake Monitoring System - IoT Bridge Backend Starting")
    logger.info("=" * 60)

    # 2. Initialize services
    firebase = FirebaseService()
    firebase.connect()

    message_queue = MessageQueue()

    # State tracking dictionaries (shared across threads)
    last_publish_times = {}  # Per-sensor throttle timestamps
    last_seen_times = {}     # Per-sensor heartbeat timestamps

    # Throttle rate: max 5 packets/sec per sensor (1/5 = 0.2s interval)
    PUBLISH_INTERVAL = 0.2

    # 3. Configure message handler and register event callbacks
    handler = MessageHandler()

    def on_sensor_data(data: dict):
        """
        Callback for normal sensor data. Applies per-device throttling
        (5 Hz) before forwarding to the cloud MQTT channel. Updates
        the heartbeat timestamp for timeout monitoring.
        """
        device_id = data.get("device_id", "UNKNOWN")
        now = time.time()

        # Update heartbeat for timeout monitor
        last_seen_times[device_id] = now

        # Enforce 5 Hz publish rate per device
        last_pub = last_publish_times.get(device_id, 0)
        if now - last_pub >= PUBLISH_INTERVAL:
            payload = json.dumps(data)
            mqtt_client.publish(TOPICS["cloud_events"], payload)
            last_publish_times[device_id] = now

    def on_earthquake(data: dict):
        """
        Callback for earthquake alarm events. Bypasses throttling entirely
        and publishes immediately to both Firebase (persistent storage)
        and the cloud MQTT channel (real-time dashboard).
        Falls back to in-memory queue if Firebase is unreachable.
        """
        device_id = data.get("device_id", "UNKNOWN")
        last_seen_times[device_id] = time.time()

        # Persist to Firebase (server_timestamp already set by MessageHandler)
        success = firebase.write_event(data)
        if not success:
            message_queue.enqueue(TOPICS["cloud_events"], data)
            logger.warning("Firebase unreachable, event queued for retry.")

        # Earthquake events bypass throttling - publish immediately
        payload = json.dumps(data)
        mqtt_client.publish(TOPICS["cloud_events"], payload)

    def on_command(data: dict):
        """Callback for control commands from the main station."""
        logger.info("Command received: %s", data.get("command", "unknown"))

    def on_sensor_status(device_id: str, status: str):
        """Callback for LWT (Last Will and Testament) sensor status changes."""
        if status == "OFFLINE":
            logger.critical(
                "LWT received: Device %s has gone offline (power or network failure).",
                device_id
            )

    handler.register_sensor_data_handler(on_sensor_data)
    handler.register_earthquake_handler(on_earthquake)
    handler.register_command_handler(on_command)
    handler.register_sensor_status_handler(on_sensor_status)

    # 4. Create MQTT client and bind message handler
    mqtt_client = MQTTClient(on_message_callback=handler.handle_message)

    # 5. Start background service threads
    stop_event = threading.Event()
    start_time = time.time()

    # 5.a Queue retry loop (fault-tolerant delivery)
    retry_thread = threading.Thread(
        target=start_queue_retry_loop,
        args=(message_queue, firebase, stop_event),
        daemon=True,
        name="QueueRetryThread",
    )
    retry_thread.start()
    logger.info(
        "Queue retry loop started (interval: %ds).",
        QUEUE_RETRY_INTERVAL,
    )

    # 5.b System health watchdog (publishes telemetry via MQTT)
    watchdog_t = threading.Thread(
        target=watchdog_loop,
        args=(stop_event, start_time, mqtt_client, TOPICS.get("system_health"), message_queue, last_seen_times),
        daemon=True,
        name="WatchdogThread",
    )
    watchdog_t.start()

    # 5.c Sensor timeout monitor (10-second heartbeat rule)
    timeout_t = threading.Thread(
        target=start_sensor_timeout_loop,
        args=(last_seen_times, mqtt_client, stop_event),
        daemon=True,
        name="TimeoutThread",
    )
    timeout_t.start()

    # 6. Connect and enter blocking listen loop
    try:
        mqtt_client.connect()
        mqtt_client.start()  # loop_forever - blocks until Ctrl+C
    except KeyboardInterrupt:
        logger.info("Shutdown requested by user.")
    except Exception as e:
        logger.critical("Unexpected error: %s", e)
    finally:
        stop_event.set()
        retry_thread.join(timeout=3)
        mqtt_client.stop()
        logger.info("System shut down gracefully.")


if __name__ == "__main__":
    main()
