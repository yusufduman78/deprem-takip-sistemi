# Faz 5: Performans İzleme (Watchdog) ve Sistem Optimizasyonu

## Hedefler
IoT sistemleri doğası gereği 7/24 kesintisiz (7 gün 24 saat) çalışmalıdır. Haftalarca açık kalan bir Python sunucusunda RAM sızıntısı (memory leak) veya donmalar yaşanabilir. Bu fazda, sistemin kendi sağlığını anlık olarak izleyip raporlayan bir "Watchdog" (Gözetmen) servisi ekleyeceğiz.

## Yapılacaklar

### Adım 1: Watchdog Servisinin Yazılması (`core/watchdog.py`)
- Sistemin ne kadar RAM ve CPU tükettiğini ölçecek bir arka plan işçisi oluşturacağız.
- Uygulamanın ne kadar süredir çalıştığını (Uptime) takip edecek.
- Eğer RAM kullanımı tehlikeli boyutlara ulaşırsa veya sistemde bir tıkanıklık olursa loglara uyarı bırakacak (ileride bu uyarılar da Firebase'e veya Telegram'a atılabilir).

### Adım 2: Bridge Backend'e Entegre Edilmesi
- Yazdığımız bu izleme mekanizmasını `bridge_backend.py`'nin orkestra şefi yapısına dahil edeceğiz. Tıpkı `QueueRetryThread` gibi, `WatchdogThread` de arka planda sessizce sistemi koruyacak.

### Adım 3: Final Uzun Süreli Test
- Tüm sistem ayağa kaldırılacak.
- Watchdog'un sistem kaynaklarını (CPU/RAM/Uptime) düzenli olarak log dosyasına yazıp yazmadığı kontrol edilecek.

### Adım 4: Dokümantasyon
- Sistemin nasıl çalıştırılacağı, test edileceği ve Firebase'in nasıl izleneceği ile ilgili kısa bir `README.md` hazırlanıp kod geliştirme süreci sonlandırılacak.
