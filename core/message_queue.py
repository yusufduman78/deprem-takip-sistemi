"""
Mesaj Kuyrugu (Message Queue)

Sorumluluk: Internet veya MQTT baglantisi koptiginda mesajlari
RAM'de guvenle saklar. Baglanti geldiginde kuyruktaki mesajlari
FIFO (First In, First Out) sirasina gore bosaltir.
"""

import json
import logging
from collections import deque

from config.settings import MESSAGE_QUEUE_MAX_SIZE

logger = logging.getLogger("MessageQueue")


class MessageQueue:
    """
    Thread-safe olmayan, hafif bir FIFO kuyrugu.
    Maksimum boyutu astiginda en eski mesaji otomatik olarak atar (deque maxlen).
    """

    def __init__(self, max_size: int = MESSAGE_QUEUE_MAX_SIZE):
        self._queue = deque(maxlen=max_size)
        self._max_size = max_size

    def enqueue(self, topic: str, data: dict):
        """Mesaji kuyruga ekler. Kuyruk doluysa en eski mesaj atilir."""
        entry = {
            "topic": topic,
            "payload": json.dumps(data),
        }
        self._queue.append(entry)
        logger.info(
            "Kuyruga eklendi (%d/%d) | Topic: %s",
            len(self._queue), self._max_size, topic,
        )

    def dequeue(self):
        """Kuyruktaki en eski mesaji cikarir ve doner. Kuyruk bossa None doner."""
        if self._queue:
            return self._queue.popleft()
        return None

    def flush(self, publish_fn):
        """
        Tum kuyruktaki mesajlari sirayla publish_fn ile gonderir.
        publish_fn imzasi: publish_fn(topic: str, payload: str)

        Returns:
            int: Basariyla gonderilen mesaj sayisi.
        """
        sent_count = 0
        while self._queue:
            entry = self._queue.popleft()
            try:
                publish_fn(entry["topic"], entry["payload"])
                sent_count += 1
                logger.info("Kuyruktan gonderildi -> %s", entry["topic"])
            except Exception as e:
                # Gonderilemedi, tekrar kuyruga koy (basa ekle)
                self._queue.appendleft(entry)
                logger.error("Kuyruk bosaltma hatasi, durduruluyor: %s", e)
                break
        if sent_count > 0:
            logger.info("Kuyruk bosaltildi: %d mesaj gonderildi.", sent_count)
        return sent_count

    @property
    def size(self):
        """Kuyruktaki mevcut mesaj sayisi."""
        return len(self._queue)

    @property
    def is_empty(self):
        """Kuyruk bos mu?"""
        return len(self._queue) == 0
