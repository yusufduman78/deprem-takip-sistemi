"""
Sistem Performans Izleyicisi (Watchdog)

Sorumluluk: Uygulamanin aylar boyunca kesintisiz calisabilmesi icin
RAM, CPU ve is parcacigi (Thread) kullanimlarini anlik olarak izler.
Eger tehlikeli bir artis veya 'memory leak' (bellek sizintisi) fark ederse
loglara kritik uyari birakir.
"""

import os
import time
import logging
import psutil

logger = logging.getLogger("Watchdog")

# Yapilandirma
WATCHDOG_INTERVAL = 60  # Her 60 saniyede bir kontrol et
MAX_RAM_PERCENT = 80.0  # RAM kullanimi bu yuzdeyi asarsa uyar
MAX_CPU_PERCENT = 90.0  # CPU kullanimi bu yuzdeyi asarsa uyar


def get_process_metrics():
    """Mevcut Python surecinin (process) RAM ve CPU degerlerini alir."""
    process = psutil.Process(os.getpid())
    
    # Process-specific metrics
    mem_info = process.memory_info()
    ram_mb = mem_info.rss / (1024 * 1024)
    cpu_percent = process.cpu_percent(interval=0.1)
    threads = process.num_threads()
    
    # System-wide metrics
    system_mem = psutil.virtual_memory()
    
    return {
        "ram_mb": ram_mb,
        "cpu_percent": cpu_percent,
        "threads": threads,
        "sys_ram_percent": system_mem.percent
    }


def watchdog_loop(stop_event, start_time):
    """
    Arka planda sonsuz dongude calisan izleyici.
    stop_event tetiklenmedigi surece sistemi analiz eder.
    """
    logger.info("Watchdog servisi baslatildi. Sistem sagligi izleniyor...")
    
    while not stop_event.is_set():
        # Uyuma suresini parcalara bol ki stop_event hizli algilansin
        stop_event.wait(WATCHDOG_INTERVAL)
        if stop_event.is_set():
            break

        try:
            metrics = get_process_metrics()
            uptime_seconds = time.time() - start_time
            uptime_hours = uptime_seconds / 3600.0

            log_msg = (
                f"Sistem Sagligi | Uptime: {uptime_hours:.1f} saat | "
                f"RAM (App): {metrics['ram_mb']:.1f} MB | "
                f"Threads: {metrics['threads']} | "
                f"CPU: {metrics['cpu_percent']}%"
            )

            # Eger her sey normalse sadece INFO seviyesinde yaz (veya DEBUG da yapilabilir)
            if metrics['sys_ram_percent'] > MAX_RAM_PERCENT:
                logger.critical("!!! TEHLIKE: SISTEM RAM KULLANIMI %%%.1f !!!", metrics['sys_ram_percent'])
            elif metrics['cpu_percent'] > MAX_CPU_PERCENT:
                logger.warning("! UYARI: YUKSEK CPU KULLANIMI %%%.1f", metrics['cpu_percent'])
            else:
                logger.info(log_msg)

        except Exception as e:
            logger.error("Watchdog metrikleri okurken hata aldi: %s", e)
