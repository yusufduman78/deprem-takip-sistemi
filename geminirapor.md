
### Proje ve Mimari Analiz Raporu: Akıllı Deprem İzleme ve Uyarı Sistemi

**1. Proje Özeti ve Sistem Mimarisi**
Sistem, deprem verilerini işleyen, yerel alarmlar üreten ve bulut üzerinden bildirim gönderen dağıtık bir IoT projesidir. Sistem temel olarak 3 ana katmandan oluşur ve donanım olarak iki adet NodeMCU V3 (ESP8266) kullanılır:

* **Sensör İstasyonu (Grup 1):** MPU6050 sensöründen I2C üzerinden veri okur, DSP algoritmalarıyla ivme (PGA) ve Richter şiddeti hesaplar.
* **IoT İletişim ve Veri Köprüsü (Benim Rolüm):** Sensör istasyonundan gelen veriyi MQTT ile alır, yönlendirme yapar ve Firebase'e aktarır.
* **Ana İstasyon / Aktüatörler (Grup 2):** IoT katmanından gelen uyarıları alır; [cite_start]LCD, buzzer (PWM) ve RGB LED'leri donanımsal kesmeler (ISR) ve millis() tabanlı non-blocking yapı ile kontrol eder.

**2. Benim Rolüm: IoT İletişim ve Veri Köprüsü (Katman Sınırları)**
Görevim, sistemdeki veri akışını yöneten çift yönlü köprüyü (Bridge) kurmaktır.

* **Veri Alma:** Sensör İstasyonu'ndan gelen JSON formatlı ham deprem verilerini MQTT üzerinden dinlemek.
* **Veri Yönlendirme (Local):** `deprem_flag` true olduğunda, gecikmesiz olarak veriyi Ana İstasyon'a (yerel alarm için) iletmek.
* **Veri Yönlendirme (Cloud):** Veriyi Firebase Realtime Database'e yazarak web dashboard ve FCM/E-posta bildirimlerini tetiklemek.
* **Çift Yönlü İletişim:** Ana İstasyon'dan gelen (örn. alarm susturma) komutları Sensör İstasyonu'na geri iletmek.

**3. Ağ ve İletişim Protokolleri**
Protokoller, NodeMCU'nun kısıtlı kaynaklarına (yaklaşık 80 KB RAM) uygun olarak seçilmiştir.

* **MQTT Broker:** Cihazlar arası düşük gecikmeli haberleşme için genel bir broker (broker.hivemq.com) kullanılır. PubSubClient kütüphanesi tercih edilmelidir.
* **Cloud Entegrasyonu:** Firebase Realtime Database ile HTTP/WebSocket üzerinden haberleşilir (FirebaseClient kütüphanesi).
* **Gecikme Hedefi:** Uçtan uca maksimum gecikme normal Wi-Fi koşullarında ≤ 2 saniye olmalıdır.

**4. MQTT Topic Yapısı ve Yönlendirme Kuralları**
Sistemdeki mesajlaşma aşağıdaki hiyerarşik yapıya göre çalışır:

* `sensors/{device_id}/data`: Sensör İstasyonu yazar, Bridge okur. (Ham sismik veri)
* `alerts/main`: Bridge yazar, Ana İstasyon okur. (Yerel alarmı tetikleyen yönlendirilmiş paket)
* `cloud/earthquake_events`: Bridge yazar, Firebase okur. (Bulut depolama ve bildirim verisi)
* `commands/main`: Ana İstasyon yazar, Sensör İstasyonu okur. (Komutlar: `acknowledge`, `silence_alarm`)

**5. Veri Yapısı (JSON Payload Schema)**
Cihazlar arası tüm iletişim JSON formatında yapılır. Bridge katmanı veriyi değiştirmez, sadece yönlendirir. Örnek Payload:

```json
{
  "device_id": "SENSOR_01",
  "timestamp": "2026-03-26T15:30:45",
  "pga": 0.85,
  "richter": 4.2,
  "deprem_flag": true,
  "accel_x": 0.45,
  "accel_y": -0.12,
  "accel_z": 9.81
}
```

**6. Hata Yönetimi ve Tolerans (Fail-safes)**
Sensör düğümlerinin kitlenmemesi ve iletişimin kopmaması için aşağıdaki kurtarma mekanizmaları kodlanmalıdır:

* **Wi-Fi Kopması:** Sürekli izlenir. 3 saniyede bir yeniden bağlanma denenir (maksimum 10 deneme). Başarısız olursa Watchdog üzerinden sistem resetlenir.
* **MQTT / Firebase Bağlantı Kaybı:** Bağlantı koptuğunda, son 5 mesaj RAM üzerinde kuyruklanır. Bağlantı geldiğinde kuyruktaki mesajlar sırayla yayınlanır.
* **Watchdog Timer:** Yazılımsal kilitlenmelere karşı ana döngü 4 saniyede bir beslenmelidir (feed).
* **Hatalı JSON:** Parçalanamayan (malformed) paketler NodeMCU'yu çökertmemelidir; sadece loglanıp reddedilmeli ve dinlemeye devam edilmelidir.
