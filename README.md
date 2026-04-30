# 🌍 Akıllı Deprem İzleme ve Uyarı Sistemi

Bu proje iki ana katmandan oluşur:
- **Backend (IoT Bridge):** Sensörlerden gelen verileri işler, Firebase'e yazar ve MQTT üzerinden dashboard'a iletir.
- **Frontend (React Dashboard):** Gerçek zamanlı MQTT akışını ve Firebase geçmiş verilerini görüntüler.

---

## 🏗️ Proje Yapısı

```
dts/
├── bridge_backend.py        # Backend giriş noktası
├── config/                  # MQTT ve Firebase ayarları
├── core/                    # MQTT istemcisi, mesaj handler, kuyruk, watchdog
├── services/                # Firebase Admin SDK servisi
├── mock/                    # Sensör simülatörleri (test için)
├── docs/                    # Analiz raporları ve mimari dökümanlar
├── requirements.txt         # Backend Python bağımlılıkları
├── .env                     # Backend ortam değişkenleri (Firebase)
│
└── frontend/                # React + Vite dashboard
    ├── src/
    │   ├── firebase.js              # Firebase SDK v10 başlatma
    │   ├── App.jsx                  # Router + global sağlayıcılar
    │   ├── index.css                # Dark tema, animasyonlar
    │   ├── context/
    │   │   └── EarthquakeContext.jsx  # Global state (MQTT + Firebase + Alarm)
    │   ├── services/
    │   │   ├── mqttService.js         # HiveMQ WebSocket istemcisi
    │   │   ├── firebaseService.js     # Firebase okuma servisi
    │   │   └── notificationService.js # Push bildirim + ayarlar
    │   ├── components/              # Navbar, AlarmBanner, HealthWidget vb.
    │   └── pages/
    │       ├── LiveMonitor.jsx      # Canlı izleme ekranı
    │       ├── EventHistory.jsx     # Geçmiş kayıtlar (filtrelenebilir)
    │       ├── Statistics.jsx       # Grafiksel analiz
    │       └── NotificationSettings.jsx  # Bildirim ayarları
    └── .env                         # Frontend ortam değişkenleri (Firebase)
```

---

## 🔌 Donanım (Hardware) Entegrasyon Rehberi

Donanım ekibinin (NodeMCU / MPU6050) Bridge katmanı ile sorunsuz haberleşmesi için aşağıdaki standartlara uyması gerekmektedir:

### 📡 Bağlantı Ayarları

- **Broker:** `broker.hivemq.com`
- **Port:** `1883`
- **Format:** JSON

### 📤 Veri Gönderimi (Sensör → Bridge)

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

Dashboard, sensörleri doğrudan dinlemek yerine **Bridge'in süzgecinden geçmiş** kanalı dinler.

- **MQTT Topic (WebSocket):** `cloud/earthquake_events`
- **WebSocket Broker:** `wss://broker.hivemq.com:8884/mqtt`
- **Throttling (Veri Seyreltme):** Sensör saniyede 100 veri yollasa bile, Bridge tarayıcı çökmesin diye bunu **saniyede 5 pakete (5Hz)** düşürür. *Ancak `deprem_flag: true` olduğu an bu sınır kalkar ve veriler anında iletilir.*
- **Zenginleştirilmiş Veri:** Bridge, gelen paketin içine kendi mühürlediği `server_timestamp` verisini ekler. Zaman kayması ihtimaline karşı her zaman `server_timestamp` referans alınmalıdır.
- **Timeout Alarmı:** Eğer bir sensör 10 saniye susarsa, Bridge bu kanala şu hata JSON'ını basar:
  `{"device_id": "SENSOR_01", "status": "TIMEOUT", "error": "Veri akisi kesildi", "server_timestamp": "..."}`

### 2. Sistem Sağlığı (Sunucu Telemetrisi)

Bridge her 60 saniyede bir kendi sağlığını aşağıdaki kanaldan yayınlar:

- **MQTT Topic:** `system/health`
- **Telemetri Şeması:**
  ```json
  {
    "cpu_percent": 1.2,
    "ram_mb": 45.6,
    "uptime_hours": 2.5,
    "active_threads": 6,
    "queue_size": 0,
    "active_sensors": 3,
    "network_latency_ms": 42,
    "status": "HEALTHY"
  }
  ```

### 3. Geçmiş Kayıtlar (Firebase)

Kalıcı veriler ve geçmiş deprem listesi doğrudan Firebase'den okunur.

- **Firebase Node:** `/earthquake_events`

---

## 🛠️ Kurulum ve Çalıştırma

### Adım 1 — Firebase Projesi Oluştur

> Hem backend hem frontend aynı Firebase projesini kullanır.

1. [https://console.firebase.google.com](https://console.firebase.google.com) adresine git
2. **"Add project"** → proje adı ver (örn. `deprem-takip`)
3. Sol menüden **"Realtime Database"** → **"Create database"** → bölge seç → **"Start in test mode"**
4. Database URL'ini kopyala: `https://deprem-takip-default-rtdb.firebaseio.com`

### Adım 2 — Backend için Servis Hesabı Anahtarı Al

> Backend (Python bridge) Firebase Admin SDK kullanır, özel bir kimlik bilgisi dosyası gerektirir.

1. Firebase Console → ⚙️ **Project Settings** → **Service accounts** sekmesi
2. **"Generate new private key"** → JSON dosyasını indir
3. Dosyayı projenin köküne kopyala: `dts/firebase-credentials.json`

### Adım 3 — Backend `.env` Dosyasını Oluştur

`dts/` klasöründe `.env` dosyası oluştur:

```env
FIREBASE_DATABASE_URL=https://deprem-takip-default-rtdb.firebaseio.com
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json
```

### Adım 4 — Frontend Firebase Config Al

> Frontend, web SDK kullanır — servis hesabı değil, web app config gerekir.

1. Firebase Console → ⚙️ **Project Settings** → **General** sekmesi
2. "Your apps" bölümünde **"Add app"** → **`</>`** (Web) seç
3. App nickname gir → **Register app**
4. Ekranda gösterilen config'i kopyala:

```js
// Bu bilgileri aşağıdaki .env dosyasına yapıştır
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "deprem-takip.firebaseapp.com",
  databaseURL: "https://deprem-takip-default-rtdb.firebaseio.com",
  projectId: "deprem-takip",
  storageBucket: "deprem-takip.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### Adım 5 — Frontend `.env` Dosyasını Doldur

`dts/frontend/.env` dosyasını aç, yukarıdaki değerleri yapıştır:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=deprem-takip.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://deprem-takip-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=deprem-takip
VITE_FIREBASE_STORAGE_BUCKET=deprem-takip.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# MQTT ayarları (değiştirme)
VITE_MQTT_BROKER_URL=wss://broker.hivemq.com:8884/mqtt
VITE_MQTT_TOPIC_CLOUD_EVENTS=cloud/earthquake_events
VITE_MQTT_TOPIC_SYSTEM_HEALTH=system/health

# Push notification için (opsiyonel, FCM kurulduysa)
VITE_FIREBASE_VAPID_KEY=BHxyz...
```

> **VAPID Key nedir ve nasıl alınır?**
> Push notification (tarayıcı bildirimleri) için FCM kullanıyorsan gerekir.
> Firebase Console → ⚙️ Project Settings → **Cloud Messaging** → **Web Push certificates** → **"Generate key pair"** → kopyala.
> Şimdilik boş bırakabilirsin — bildirimler Browser Notification API ile yedek olarak çalışır.

### Adım 6 — Firebase Security Rules (Güvenlik)

Firebase Console → **Realtime Database** → **Rules** sekmesine git, şu kuralları yapıştır:

```json
{
  "rules": {
    "earthquake_events": {
      ".read": true,
      ".write": false
    }
  }
}
```

> Dashboard okuyabilir, sadece backend (Admin SDK) yazabilir.

---

## ▶️ Projeyi Çalıştırma

### Backend (IoT Bridge)

```bash
# Terminal 1
conda activate depremenv        # veya: source venv/bin/activate
pip install -r requirements.txt
python bridge_backend.py
```

Başarılı çıktı:
```
INFO  Firebase connected | URL: https://... | Node: /earthquake_events
INFO  Queue retry loop started (interval: 10s).
INFO  Watchdog started.
INFO  MQTT connected to broker.hivemq.com:1883
```

### Frontend (React Dashboard)

```bash
# Terminal 2
cd frontend
npm install        # ilk seferde
npm run dev
```

Tarayıcıda açılır: **http://localhost:5173**

### Simülatör ile Test (Opsiyonel)

Gerçek sensör yoksa mock simülatörü kullanabilirsin:

```bash
# Terminal 3 (backend çalışırken)
python mock/sensor_simulator.py   # dosya adı farklıysa ls mock/ ile kontrol et
```

Ya da HiveMQ WebSocket test istemcisini kullanabilirsin:

1. [https://www.hivemq.com/demos/websocket-client/](https://www.hivemq.com/demos/websocket-client/) adresine git
2. **Connect** butonuna bas (varsayılan broker zaten `broker.hivemq.com`)
3. Topic: `sensors/SENSOR_01/data`
4. Aşağıdaki JSON'u yapıştır ve **Publish** et:

```json
{
  "device_id": "SENSOR_01",
  "timestamp": "2026-04-30T12:00:00",
  "richter": 4.2,
  "pga": 0.85,
  "deprem_flag": true,
  "accel_x": 0.45,
  "accel_y": -0.12,
  "accel_z": 9.81
}
```

Dashboard'da alarm modu aktifleşir, kırmızı banner görünür.

---

## 🔒 Güvenlik Notları

| Ne | Nerede | Nasıl |
|----|--------|-------|
| Firebase Web Config (`apiKey` vb.) | `frontend/.env` | `VITE_` prefix ile, sadece okuma izinli |
| Firebase Servis Hesabı (`firebase-credentials.json`) | Proje kökü | **Git'e ekleme!** `.gitignore`'da olmalı |
| SMTP / e-posta şifresi | Firebase Cloud Functions | Hiçbir zaman frontend'e gelmiyor |
| VAPID key (private) | Yalnızca Cloud Functions | Frontend sadece public key'i kullanır |

> `firebase-credentials.json` ve `.env` dosyaları `.gitignore`'da zaten mevcut olmalı. Kontrol et!

---

## 🗺️ Sistem Mimarisi

```
NodeMCU/MPU6050
      │ MQTT (1883) sensors/SENSOR_01/data
      ▼
┌─────────────────────┐
│  Python IoT Bridge  │  ← bridge_backend.py
│  (bridge_backend)   │
│  - Throttle (5Hz)   │
│  - Validate JSON    │
│  - Retry Queue      │
│  - Watchdog         │
└──────────┬──────────┘
           │
     ┌─────┴──────┐
     │            │
     ▼            ▼
Firebase      MQTT Publish
Realtime   cloud/earthquake_events
Database   system/health
/earthquake_events
     │            │
     └─────┬──────┘
           ▼
┌─────────────────────┐
│  React Dashboard    │  ← frontend/ (localhost:5173)
│  - Canlı İzleme     │
│  - Geçmiş Kayıtlar  │
│  - İstatistikler    │
│  - Bildirim Ayarları│
└─────────────────────┘
```
