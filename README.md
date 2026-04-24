# Akıllı Deprem İzleme ve Uyarı Sistemi - IoT Bridge Backend

Bu modül, sistemin "Merkezi Sinir Sistemi" görevini görür. Sensörlerden gelen ham verileri işler, hata toleranslı bir şekilde Firebase bulutuna aktarır ve sistem sağlığını izler.

---

## 🏗️ Katmanlı Mimari (Layered Architecture)

Proje, temiz kod prensiplerine uygun olarak şu katmanlara ayrılmıştır:

- **`core/`**: MQTT iletişimi, mesaj işleme, RAM kuyruğu ve Watchdog (Sistem sağlığı).
- **`services/`**: Firebase Admin SDK entegrasyonu.
- **`config/`**: Merkezi ayarlar ve MQTT topic yönetimi.
- **`docs/`**: Analiz raporları ve sistem dökümantasyonu.
- **`mock/`**: Test simülatörleri.

---

## 🔌 Donanım Entegrasyon Rehberi

Donanım modüllerinin sisteme bağlanması için aşağıdaki MQTT standartlarını takip etmesi gerekir:

### 📡 Bağlantı Ayarları

- **Broker:** `broker.hivemq.com`
- **Port:** `1883`
- **Format:** JSON

### 📤 Veri Gönderimi (Sensör -> Bridge)

Sensörler verilerini şu kanala (topic) push etmelidir:

- **Topic:** `sensors/SENSOR_ID/data` (Örn: `sensors/SENSOR_01/data`)
- **JSON Şeması:**

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

### 🪦 Durum Takibi (LWT - Opsiyonel)

Sensörün koptuğunu anlamamız için bağlantı sırasında şu "Vasiyet" (Will) ayarlanabilir:

- **LWT Topic:** `sensors/SENSOR_ID/status`
- **LWT Mesajı:** `OFFLINE`

---

## 🖥️ Arayüz Entegrasyon Rehberi

Dashboard'un yüksek performanslı çalışması için **Hibrit Model** tasarlanmıştır:

### 1. Canlı Grafik Verisi (Anlık Sarsıntı Akışı)

Dashboard, veriyi Firebase yerine doğrudan MQTT üzerinden almalıdır. Bu, gecikmeyi (latency) minimize eder ve Firebase kotasını korur.

- **MQTT Topic:** `cloud/earthquake_events`
- **Kullanım:** Dashboard bu kanalı dinleyerek gelen her veriyi anlık grafiğe döker.

### 2. Geçmiş Kayıtlar ve İstatistikler

Kalıcı veriler ve geçmiş deprem listesi Firebase üzerinden okunmalıdır.

- **Firebase Node:** `/earthquake_events`
- **Kullanım:** Bridge, sadece `deprem_flag: true` olan kritik verileri buraya kalıcı olarak yazar.

---

## 🛠️ Kurulum ve Çalıştırma

1. **Bağımlılıklar:** `pip install -r requirements.txt`
2. **Yapılandırma:** `.env` dosyasını oluşturun ve `FIREBASE_DATABASE_URL` değerini girin.
3. **Başlatma:**
   ```bash
   python bridge_backend.py
   ```

## 🛡️ Gelişmiş Özellikler

- **Fail-Safe Queue:** İnternet koptuğunda veriler RAM'de saklanır, bağlantı gelince Firebase'e otomatik basılır.
- **System Watchdog:** RAM ve CPU kullanımını izler, sistem kilitlenmelerini önceden raporlar.
- **LWT Monitoring:** Cihazların çevrimdışı kalma durumlarını anlık olarak loglar.
