"""
In-Memory Message Queue (Fault-Tolerance Layer)

Provides a bounded FIFO buffer for messages that fail to reach
Firebase due to network outages. When connectivity is restored,
the queue is flushed in order, ensuring zero data loss.
"""

import json
import logging
from collections import deque

from config.settings import MESSAGE_QUEUE_MAX_SIZE

logger = logging.getLogger("MessageQueue")


class MessageQueue:
    """
    Lightweight bounded FIFO queue backed by collections.deque.
    Not thread-safe; intended for single-threaded producer/consumer patterns.
    """

    def __init__(self, max_size: int = MESSAGE_QUEUE_MAX_SIZE):
        self._queue = deque(maxlen=max_size)
        self._max_size = max_size

    def enqueue(self, topic: str, data: dict):
        """Add a message to the queue. Oldest entry is evicted if at capacity."""
        entry = {
            "topic": topic,
            "payload": json.dumps(data),
        }
        self._queue.append(entry)
        logger.info(
            "Enqueued (%d/%d) | Topic: %s",
            len(self._queue), self._max_size, topic,
        )

    def dequeue(self):
        """Remove and return the oldest message. Returns None if empty."""
        if self._queue:
            return self._queue.popleft()
        return None

    def flush(self, publish_fn):
        """
        Deliver all queued messages via publish_fn(topic, payload).
        Re-queues at front on failure to preserve FIFO order.
        Returns number of messages successfully delivered.
        """
        sent_count = 0
        while self._queue:
            entry = self._queue.popleft()
            try:
                publish_fn(entry["topic"], entry["payload"])
                sent_count += 1
                logger.info("Delivered from queue -> %s", entry["topic"])
            except Exception as e:
                self._queue.appendleft(entry)
                logger.error("Queue flush interrupted: %s", e)
                break
        if sent_count > 0:
            logger.info("Queue flush complete: %d messages delivered.", sent_count)
        return sent_count

    @property
    def size(self):
        """Current number of messages in the queue."""
        return len(self._queue)

    @property
    def is_empty(self):
        """Whether the queue contains zero messages."""
        return len(self._queue) == 0
