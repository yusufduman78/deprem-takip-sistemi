"""
System Health Watchdog

Monitors process-level CPU, RAM, and thread usage at regular intervals.
Publishes telemetry data (including network latency, active sensor count,
and pending queue size) to the system/health MQTT channel for dashboard
visualization. Raises critical log alerts on resource exhaustion.
"""

import os
import time
import logging
import psutil
import json
import socket

logger = logging.getLogger("Watchdog")

# Configuration
WATCHDOG_INTERVAL = 60  # Health check interval in seconds
MAX_RAM_PERCENT = 80.0  # System RAM usage threshold for critical alert
MAX_CPU_PERCENT = 90.0  # Process CPU usage threshold for warning


def get_process_metrics():
    """Collect CPU, RAM, and thread metrics for the current Python process."""
    process = psutil.Process(os.getpid())

    mem_info = process.memory_info()
    ram_mb = mem_info.rss / (1024 * 1024)
    cpu_percent = process.cpu_percent(interval=0.1)
    threads = process.num_threads()

    system_mem = psutil.virtual_memory()

    return {
        "ram_mb": ram_mb,
        "cpu_percent": cpu_percent,
        "threads": threads,
        "sys_ram_percent": system_mem.percent
    }

def measure_latency(host="broker.hivemq.com", port=1883, timeout=3):
    """Measure TCP connection latency to the MQTT broker in milliseconds."""
    start = time.time()
    try:
        socket.create_connection((host, port), timeout=timeout).close()
        return int((time.time() - start) * 1000)
    except Exception:
        return -1


def watchdog_loop(stop_event, start_time, mqtt_client=None, health_topic=None, message_queue=None, last_seen_times=None):
    """
    Background loop that periodically collects system metrics and
    publishes a JSON telemetry payload to the health MQTT channel.
    Runs until stop_event is set.
    """
    logger.info("Watchdog service started. Monitoring system health...")

    while not stop_event.is_set():
        stop_event.wait(WATCHDOG_INTERVAL)
        if stop_event.is_set():
            break

        try:
            metrics = get_process_metrics()
            uptime_seconds = time.time() - start_time
            uptime_hours = uptime_seconds / 3600.0

            log_msg = (
                f"Health Check | Uptime: {uptime_hours:.1f}h | "
                f"RAM: {metrics['ram_mb']:.1f} MB | "
                f"Threads: {metrics['threads']} | "
                f"CPU: {metrics['cpu_percent']}%"
            )

            # Log level based on resource thresholds
            if metrics['sys_ram_percent'] > MAX_RAM_PERCENT:
                logger.critical("CRITICAL: System RAM usage at %.1f%%", metrics['sys_ram_percent'])
            elif metrics['cpu_percent'] > MAX_CPU_PERCENT:
                logger.warning("WARNING: High CPU usage at %.1f%%", metrics['cpu_percent'])
            else:
                logger.info(log_msg)

            # Publish telemetry JSON to MQTT for dashboard consumption
            if mqtt_client and health_topic:
                q_size = message_queue.size if message_queue else 0

                # Count sensors active within the last 10 seconds
                active_count = 0
                if last_seen_times:
                    now = time.time()
                    active_count = sum(1 for t in last_seen_times.values() if now - t <= 10.0)

                # Measure network latency to MQTT broker
                latency = measure_latency()

                payload = json.dumps({
                    "cpu_percent": round(metrics['cpu_percent'], 1),
                    "ram_mb": round(metrics['ram_mb'], 1),
                    "sys_ram_percent": round(metrics['sys_ram_percent'], 1),
                    "threads": metrics['threads'],
                    "uptime_hours": round(uptime_hours, 2),
                    "queue_size": q_size,
                    "active_sensors": active_count,
                    "network_latency_ms": latency,
                    "status": "CRITICAL" if metrics['sys_ram_percent'] > MAX_RAM_PERCENT else "HEALTHY"
                })
                mqtt_client.publish(health_topic, payload)

        except Exception as e:
            logger.error("Watchdog metrics collection failed: %s", e)
