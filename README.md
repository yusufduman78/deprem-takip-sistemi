# 🌍 Akıllı Deprem İzleme ve Uyarı Sistemi - IoT Bridge Backend

Bu modül, sistemin **"Merkezi Sinir Sistemi"** görevini görür. Sensörlerden gelen yüksek frekanslı ham verileri işler, hızını dengeler (throttling), hata toleranslı bir şekilde Firebase bulutuna aktarır ve sistemin sağlık durumunu canlı olarak arayüze sunar.

---

## 🏗️ Katmanlı Mimari (Layered Architecture)

Proje, temiz kod prensiplerine uygun olarak şu katmanlara ayrılmıştır:

- **`core/`**: MQTT iletişimi, mesaj filtreleme, RAM kuyruğu ve Watchdog (Telemetri).
- **`services/`**: Firebase Admin SDK entegrasyonu ve kalıcı depolama.
- **`config/`**: Merkezi ayarlar ve MQTT topic yönetimi.
- **`docs/`**: Analiz raporları ve mimari dökümantasyon.
- **`mock/`**: Sistem testleri için sensör simülatörleri.

---

## 🔌 Donanım (Hardware) Entegrasyon Rehberi

Donanım ekibinin (NodeMCU / MPU6050) Bridge katmanı ile sorunsuz haberleşmesi için aşağıdaki standartlara uyması gerekmektedir:

### 📡 Bağlantı Ayarları

- **Broker:** `broker.hivemq.com`
- **Port:** `1883`
- **Format:** JSON

### 📤 Veri Gönderimi (Sensör -> Bridge)

Sensörler, deprem olmasa dahi **sürekli olarak (kalp atışı gibi)** veri yollamalıdır (Örn: 5Hz - 50Hz arası).

- **Topic:** `sensors/{DEVICE_ID}/data` (Örn: `sensors/SENSOR_01/data`)
- **Beklenen Şema:**
  ```json
  {
    "device_id": "SENSOR_01",
    "timestamp": "2026-03-26T15:30:45",
    "richter": 4.2,
    "pga": 0.85,
    "deprem_flag": true,
    "accel_x": 0.45,
    "accel_y": -0.12,
    "accel_z": 9.81
  }
  ```

### ⚠️ Hata Yönetimi & LWT (Son Vasiyet)

Bridge katmanı, donanımın çökmesi ihtimaline karşı 2 katmanlı güvenlik uygular:

1. **LWT (Anlık Kopma):** Sensör MQTT'ye bağlanırken vasiyet olarak `sensors/{DEVICE_ID}/status` kanalına `OFFLINE` mesajını kurmalıdır. Elektrik kesilirse Bridge anında uyarılır.
2. **10 Saniye Kuralı (Timeout):** İnternet kopmasa bile sensör donup 10 saniye boyunca veri göndermezse, Bridge otomatik olarak `TIMEOUT` alarmı üretir.

---

## 🖥️ Arayüz (Frontend) Entegrasyon Rehberi

Dashboard'un yüksek performanslı çalışması ve tarayıcıyı dondurmaması için veri akışı Bridge tarafından özel işlemlerden geçirilir.

### 1. Canlı Grafik ve Olaylar (Anlık Akış)

Dashboard, sensörleri doğrudan dinlemek yerine **Bridge'in süzgecinden geçmiş** kanalı dinlemelidir.

- **MQTT Topic:** `cloud/earthquake_events`
- **Throttling (Veri Seyreltme):** Sensör saniyede 100 veri yollasa bile, Bridge tarayıcı çökmesin diye bunu **saniyede 5 pakete (5Hz)** düşürür. *Ancak `deprem_flag: true` olduğu an bu sınır kalkar ve veriler anında iletilir.*
- **Zenginleştirilmiş Veri:** Bridge, gelen paketin içine kendi mühürlediği `server_timestamp` verisini ekler. Zaman kayması ihtimaline karşı her zaman `server_timestamp` referans alınmalıdır.
- **Timeout Alarmı:** Eğer bir sensör 10 saniye susarsa, Bridge bu kanala şu hata JSON'ını basar:
  `{"device_id": "SENSOR_01", "status": "TIMEOUT", "error": "Veri akisi kesildi", "server_timestamp": "..."}`

### 2. Sistem Sağlığı (Sunucu Telemetrisi)

Dashboard, sağ alt köşeye bir "Sistem Durumu" widget'ı ekleyebilir. Bridge her 60 saniyede bir kendi sağlığını aşağıdaki kanaldan yayınlar:

- **MQTT Topic:** `system/health`
- **Telemetri Şeması:**
  ```json
  {
    "cpu_percent": 1.2,
    "ram_mb": 45.6,
    "uptime_hours": 2.5,
    "active_threads": 6,
    "queue_size": 0,           // İnternet koptuğunda Firebase'e yazılmayı bekleyen veri sayısı
    "active_sensors": 3,       // Son 10 saniye içinde veri yollayan sensör sayısı
    "network_latency_ms": 42,  // Sunucu bulut gecikmesi (Ping)
    "status": "HEALTHY"
  }
  ```

### 3. Geçmiş Kayıtlar (Firebase)

Kalıcı veriler ve geçmiş deprem listesi doğrudan Firebase'den okunmalıdır.

- **Firebase Node:** `/earthquake_events`

---

## 🛠️ Kurulum ve Çalıştırma

1. **Ortam Kurulumu:** `conda activate depremenv`
2. **Bağımlılıklar:** `pip install -r requirements.txt`
3. **Yapılandırma:** `.env` dosyasını oluşturun ve `FIREBASE_DATABASE_URL` değerini girin.
4. **Başlatma:**
   ```bash
   python bridge_backend.py
   ```
