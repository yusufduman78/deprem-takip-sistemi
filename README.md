# Akıllı Deprem İzleme ve Uyarı Sistemi - IoT Bridge Backend

Bu proje, deprem sensörleri (NodeMCU/C++), ana uyarı istasyonları ve bulut sunucuları (Firebase) arasında **sıfır gecikmeli, hata toleranslı ve hibrit** bir iletişim köprüsü kurmak amacıyla geliştirilmiştir.

## Mimari Özeti (Clean Architecture)
Sistem **Hibrit** olarak tasarlanmıştır. Cihazlar (Sensör ve Ana İstasyon) saniyelik tepki vermek için kendi aralarında MQTT üzerinden doğrudan konuşurlar (Sunucudan bağımsızdırlar). 
Python tabanlı "Bridge Backend" ise bu konuşmaları görünmez bir şekilde dinleyip, istatistikleri ve deprem verilerini Firebase Realtime Database'e kaydeder. İnternet kesilse bile veriler kaybolmaz, RAM'de kuyruklanıp internet gelince buluta iletilir.

## Kurulum ve Çalıştırma

1. **Gereksinimler:**
   - Python 3.11+
   - `conda activate depremenv` ortamının aktif olması.
   - Proje dizininde `firebase-credentials.json` kimlik dosyasının bulunması.
   - Proje dizininde ayarların tutulduğu `.env` dosyasının oluşturulması (Örnek `FIREBASE_DATABASE_URL=...`).

2. **Bağımlılıkların Yüklenmesi:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Ana Sunucunun Başlatılması:**
   ```bash
   python bridge_backend.py
   ```

## Test Etme (Donanım Olmadan)
Fiziksel sensörleriniz yoksa, sistemi test etmek için 3 terminal açın ve şu komutları sırayla çalıştırın:
1. `python bridge_backend.py` (Görünmez Yönetici / Sunucu)
2. `python -m mock.ana_istasyon_taklit` (Alarm Ünitesi Simülatörü)
3. `python -m mock.sensor_taklit` (Deprem Tetikleyici - *Enter tuşuna basarak deprem yollayabilirsiniz*)

## Modüller
- `core/mqtt_client.py`: Ağ iletişimini yönetir.
- `core/message_handler.py`: Gelen verileri işler, doğrulamasını (timestamp, richter vs.) yapar.
- `core/message_queue.py`: İnternet kesintilerinde veri kaybını önler (50 mesajlık RAM tamponu).
- `core/watchdog.py`: Uygulamanın aylarca açık kalabilmesi için RAM/CPU sağlığını izler.
- `services/firebase_service.py`: Google Firebase bağlantısını kurar.

## Hata Toleransı (Fail-Safe)
Sistem `QueueRetryThread` sayesinde her 10 saniyede bir bağlantıyı denetler. Eğer sunucuda internet kesilirse, gelen veriler atılmaz. Bağlantı tekrar kurulduğu an veriler geriye dönük olarak Firebase'e kaydedilir.