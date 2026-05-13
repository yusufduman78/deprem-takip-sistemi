# DTS - Smart Earthquake Monitoring and Alert System

<details open>
<summary><strong>[TR] Türkçe</strong></summary>

## Genel Bakış

DTS, sensörlerden gelen deprem verilerini MQTT ile toplayan, olayları Firebase Realtime Database'e yazan ve React tabanlı bir panelde canlı olarak gösteren bir deprem izleme sistemidir.

Proje iki ana parçadan oluşur:

| Katman | Görev |
|---|---|
| Backend / IoT Bridge | Sensör MQTT mesajlarını dinler, doğrular, zenginleştirir, Firebase'e yazar ve dashboard'a yayınlar. |
| Frontend / Dashboard | Canlı sensör akışını, sistem sağlığını, geçmiş olayları, istatistikleri ve bildirim ayarlarını gösterir. |

## Özellikler

- MQTT üzerinden canlı sensör verisi izleme
- Deprem algılandığında anlık alarm modu
- Firebase Realtime Database üzerinden geçmiş olay listesi
- Richter ve PGA grafiği, histogram ve özet istatistikler
- Bridge sistem sağlığı: CPU, RAM, uptime, aktif sensör, kuyruk ve ağ gecikmesi
- Tarayıcı bildirimi ve EmailJS ile e-posta uyarısı
- Karanlık / aydınlık tema ve mobil uyumlu arayüz
- Sensör timeout kontrolü ve Firebase yazma hatalarına karşı retry kuyruğu

## Teknolojiler

| Bölüm | Teknoloji |
|---|---|
| Backend | Python, paho-mqtt, firebase-admin, python-dotenv, psutil |
| Frontend | React, Vite, React Router, CSS Variables |
| Realtime | MQTT / HiveMQ public broker |
| Veritabanı | Firebase Realtime Database |
| Grafik | Recharts |
| UI | Lucide React, React Toastify, GSAP |
| E-posta | EmailJS (`@emailjs/browser`) |

## Proje Yapısı

```text
dts/
├── bridge_backend.py              # Backend giriş noktası
├── config/settings.py             # MQTT, Firebase, topic ve log ayarları
├── core/
│   ├── mqtt_client.py             # MQTT bağlantı, subscribe, publish
│   ├── message_handler.py         # JSON parse, validasyon, routing
│   ├── message_queue.py           # Firebase retry kuyruğu
│   └── watchdog.py                # Sistem sağlığı telemetrisi
├── services/firebase_service.py   # Firebase Admin SDK yazma servisi
├── mock/
│   ├── sensor_taklit.py           # Mock sensör
│   └── ana_istasyon_taklit.py     # Mock ana istasyon
├── requirements.txt               # Python bağımlılıkları
├── README.md                      # Tek dokümantasyon dosyası
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── public/
    └── src/
        ├── App.jsx
        ├── firebase.js
        ├── context/EarthquakeContext.jsx
        ├── components/
        │   ├── AlarmBanner.jsx
        │   ├── Navbar.jsx
        │   ├── OfflineBanner.jsx
        │   └── SystemHealthWidget.jsx
        ├── pages/
        │   ├── LiveMonitor.jsx
        │   ├── EventHistory.jsx
        │   ├── Statistics.jsx
        │   └── NotificationSettings.jsx
        └── services/
            ├── mqttService.js
            ├── firebaseService.js
            ├── notificationService.js
            └── emailService.js
```

## Sistem Akışı

```text
NodeMCU / MPU6050
      │
      │ MQTT - sensors/{DEVICE_ID}/data
      ▼
Python IoT Bridge
      ├── JSON doğrulama
      ├── server_timestamp ekleme
      ├── normal veride 5Hz throttle
      ├── deprem alarmında anlık yayın
      ├── Firebase'e kalıcı kayıt
      └── watchdog / timeout kontrolü
      │
      ├── Firebase Realtime Database: /earthquake_events
      └── MQTT WebSocket: cloud/earthquake_events, system/health
              │
              ▼
        React Dashboard
```

## MQTT Mesajları

### Sensör verisi

Sensörler şu topic'e JSON gönderir:

```text
sensors/{DEVICE_ID}/data
```

Örnek mesaj:

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

Notlar:

- `device_id`, `timestamp`, `pga`, `richter`, `deprem_flag` zorunludur.
- Bridge sadece `SENSOR_` ile başlayan cihazları işler.
- Bridge her pakete `server_timestamp` ekler.
- Normal veriler dashboard'a sensör başına en fazla 5Hz yayınlanır.
- `deprem_flag: true` olan veriler throttle'a takılmaz, anında yayınlanır ve Firebase'e kaydedilir.

### Sensör durum mesajı

Sensörler MQTT LWT için şu topic'i kullanmalıdır:

```text
sensors/{DEVICE_ID}/status
```

Örnek payload:

```text
OFFLINE
```

Bridge ayrıca 10 saniye veri alamadığı sensör için dashboard'a `TIMEOUT` olayı yayınlar.

### Dashboard topic'leri

| Amaç | Topic / URL |
|---|---|
| Frontend MQTT broker | `wss://broker.hivemq.com:8884/mqtt` |
| Canlı olaylar | `cloud/earthquake_events` |
| Sistem sağlığı | `system/health` |
| Backend MQTT broker | `broker.hivemq.com:1883` |

## Kurulum

### 1. Repoyu hazırla

```bash
git clone <repo-url>
cd dts
```

### 2. Firebase projesi oluştur

1. [Firebase Console](https://console.firebase.google.com) üzerinden yeni proje oluştur.
2. Realtime Database'i aç ve database URL'ini kopyala.
3. Project Settings > Service accounts alanından yeni private key indir.
4. İndirilen JSON dosyasını proje köküne şu adla koy:

```text
firebase-credentials.json
```

### 3. Backend `.env` dosyası

Proje kökünde `.env` dosyası oluştur:

```env
FIREBASE_DATABASE_URL=https://<project-id>-default-rtdb.firebaseio.com
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json
```

### 4. Frontend `.env` dosyası

Firebase Console > Project Settings > General > Your apps alanından Web App config değerlerini al. Sonra `frontend/.env` dosyasını oluştur:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=https://<project-id>-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_MQTT_BROKER_URL=wss://broker.hivemq.com:8884/mqtt
VITE_MQTT_TOPIC_CLOUD_EVENTS=cloud/earthquake_events
VITE_MQTT_TOPIC_SYSTEM_HEALTH=system/health

VITE_EMAILJS_SERVICE_ID=service_xxx
VITE_EMAILJS_TEMPLATE_ID=template_xxx
VITE_EMAILJS_PUBLIC_KEY=xxx
```

### 5. Firebase rules

Realtime Database > Rules alanına temel okuma kuralını ekleyebilirsin:

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

Yazma işlemini frontend değil, backend Firebase Admin SDK yaptığı için `.write` kapalı kalabilir.

## Çalıştırma

Backend:

```bash
pip install -r requirements.txt
python bridge_backend.py
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Varsayılan adres:

```text
http://localhost:5173
```

Mock sensör ile test:

```bash
python mock/sensor_taklit.py
```

## Frontend Ekranları

| Sayfa | İçerik |
|---|---|
| Live Monitor | Canlı MQTT verisi, stat kartları, ivme grafiği, son paket ve sistem sağlığı |
| Event History | Firebase geçmiş kayıtları, cihaz/richter/tarih/alarm filtreleri |
| Statistics | Toplam olay, alarm sayısı, en büyük Richter, zaman serileri ve histogram |
| Notification Settings | Push bildirim, e-posta bildirimi, eşik değeri ve EmailJS durumu |

## EmailJS Kurulumu

Bu projede e-posta gönderimi backend üzerinden değil, frontend tarafında EmailJS ile yapılır. Repoyu indiren kişinin e-posta uyarılarını kullanabilmesi için kendi EmailJS hesabını ve `.env` değerlerini ayarlaması gerekir.

### 1. EmailJS hesabı ve servis

1. [emailjs.com](https://www.emailjs.com) adresinde hesap oluştur.
2. Email Services bölümünden Gmail, Outlook veya kullanacağın servis sağlayıcısını bağla.
3. Oluşan Service ID değerini kopyala. Örnek: `service_abcd123`.

### 2. Template oluştur

Email Templates bölümünde yeni template oluştur. Template ayarlarında:

```text
To Email: {{to_email}}
Subject: {{subject}}
```

Template body alanına şunu yapıştırabilirsin:

```text
DTS DEPREM UYARISI

Richter Büyüklüğü: {{richter}}
PGA: {{pga}} cm/s2
Cihaz ID: {{device_id}}

İvme Değerleri:
X: {{accel_x}} m/s2
Y: {{accel_y}} m/s2
Z: {{accel_z}} m/s2

Zaman: {{timestamp}}

{{message}}
```

Template'i kaydet ve Template ID değerini kopyala. Örnek: `template_xyz789`.

### 3. Public key al

EmailJS Dashboard > Account > API Keys alanından Public Key değerini kopyala.

### 4. Değerleri nereye yapıştıracaksın?

Kopyaladığın üç değeri `frontend/.env` dosyasına yapıştır:

```env
VITE_EMAILJS_SERVICE_ID=service_abcd123
VITE_EMAILJS_TEMPLATE_ID=template_xyz789
VITE_EMAILJS_PUBLIC_KEY=public_key_değeri
```

Bu değişiklikten sonra frontend dev server'ı yeniden başlat:

```bash
cd frontend
npm run dev
```

### 5. Kodda nerede kullanılıyor?

| Dosya | Görev |
|---|---|
| `frontend/src/services/emailService.js` | `.env` değerlerini okur, EmailJS'i başlatır ve mail gönderir. |
| `frontend/src/context/EarthquakeContext.jsx` | `deprem_flag` yakalandığında kullanıcı ayarları uygunsa `sendEarthquakeEmail` çağırır. |
| `frontend/src/pages/NotificationSettings.jsx` | Kullanıcıya e-posta bildirimi açma/kapama ve alıcı e-posta girme arayüzünü verir. |

Kullanıcı panelde Notification Settings sayfasından e-posta bildirimini açmalı ve alıcı e-posta adresini girmelidir. EmailJS `.env` değerleri yoksa sistem mail göndermez, sadece konsola uyarı yazar.

## Güvenlik Notları

- `.env`, `frontend/.env` ve `firebase-credentials.json` repoya commit edilmemelidir.
- Firebase service account dosyası sadece backend tarafında kullanılır.
- `VITE_` ile başlayan değerler frontend bundle içinde görünebilir; bu yüzden gizli server anahtarı gibi davranılmamalıdır.
- EmailJS Public Key frontend için tasarlanmıştır, ancak servis kotası ve template ayarları EmailJS panelinden sınırlandırılmalıdır.
- Public MQTT broker test için uygundur; canlı ortamda private broker veya kimlik doğrulamalı broker tercih edilmelidir.

## Kısa Sorun Giderme

| Problem | Kontrol |
|---|---|
| Backend Firebase'e yazmıyor | `.env`, `FIREBASE_DATABASE_URL`, `firebase-credentials.json` dosya yolu |
| Dashboard veri almıyor | Backend çalışıyor mu, MQTT topic'leri aynı mı, cihaz ID `SENSOR_` ile başlıyor mu |
| Geçmiş kayıtlar boş | Firebase rules ve `/earthquake_events` node'u |
| E-posta gitmiyor | EmailJS `.env` değerleri, template değişkenleri, panelde e-posta bildirimi ve alıcı adresi |
| Mobil cihaz açamıyor | Vite LAN adresi, aynı Wi-Fi, firewall ve `vite.config.js` host ayarı |

</details>

<details>
<summary><strong>[EN] English</strong></summary>

## Overview

DTS is an earthquake monitoring system that collects sensor data over MQTT, writes earthquake events to Firebase Realtime Database, and displays live system activity in a React dashboard.

The project has two main parts:

| Layer | Responsibility |
|---|---|
| Backend / IoT Bridge | Listens to sensor MQTT messages, validates and enriches them, writes events to Firebase, and publishes data to the dashboard. |
| Frontend / Dashboard | Shows live sensor data, system health, event history, statistics, and notification settings. |

## Features

- Live sensor monitoring over MQTT
- Instant alarm mode when an earthquake is detected
- Historical event list from Firebase Realtime Database
- Richter and PGA charts, histogram, and summary statistics
- Bridge health telemetry: CPU, RAM, uptime, active sensors, queue, and network latency
- Browser notifications and EmailJS email alerts
- Dark / light theme and responsive interface
- Sensor timeout detection and retry queue for Firebase write failures

## Technologies

| Area | Technology |
|---|---|
| Backend | Python, paho-mqtt, firebase-admin, python-dotenv, psutil |
| Frontend | React, Vite, React Router, CSS Variables |
| Realtime | MQTT / HiveMQ public broker |
| Database | Firebase Realtime Database |
| Charts | Recharts |
| UI | Lucide React, React Toastify, GSAP |
| Email | EmailJS (`@emailjs/browser`) |

## Project Structure

```text
dts/
├── bridge_backend.py              # Backend entry point
├── config/settings.py             # MQTT, Firebase, topic, and log settings
├── core/
│   ├── mqtt_client.py             # MQTT connect, subscribe, publish
│   ├── message_handler.py         # JSON parsing, validation, routing
│   ├── message_queue.py           # Firebase retry queue
│   └── watchdog.py                # System health telemetry
├── services/firebase_service.py   # Firebase Admin SDK writer
├── mock/
│   ├── sensor_taklit.py           # Mock sensor
│   └── ana_istasyon_taklit.py     # Mock main station
├── requirements.txt               # Python dependencies
├── README.md                      # Single documentation file
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── public/
    └── src/
        ├── App.jsx
        ├── firebase.js
        ├── context/EarthquakeContext.jsx
        ├── components/
        │   ├── AlarmBanner.jsx
        │   ├── Navbar.jsx
        │   ├── OfflineBanner.jsx
        │   └── SystemHealthWidget.jsx
        ├── pages/
        │   ├── LiveMonitor.jsx
        │   ├── EventHistory.jsx
        │   ├── Statistics.jsx
        │   └── NotificationSettings.jsx
        └── services/
            ├── mqttService.js
            ├── firebaseService.js
            ├── notificationService.js
            └── emailService.js
```

## System Flow

```text
NodeMCU / MPU6050
      │
      │ MQTT - sensors/{DEVICE_ID}/data
      ▼
Python IoT Bridge
      ├── JSON validation
      ├── server_timestamp injection
      ├── 5Hz throttle for normal data
      ├── immediate publish for earthquake alarms
      ├── persistent Firebase writes
      └── watchdog / timeout monitoring
      │
      ├── Firebase Realtime Database: /earthquake_events
      └── MQTT WebSocket: cloud/earthquake_events, system/health
              │
              ▼
        React Dashboard
```

## MQTT Messages

### Sensor data

Sensors publish JSON to:

```text
sensors/{DEVICE_ID}/data
```

Example message:

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

Notes:

- `device_id`, `timestamp`, `pga`, `richter`, and `deprem_flag` are required.
- The bridge only processes devices whose ID starts with `SENSOR_`.
- The bridge adds `server_timestamp` to every packet.
- Normal data is published to the dashboard at up to 5Hz per sensor.
- Data with `deprem_flag: true` bypasses throttling, is published immediately, and is stored in Firebase.

### Sensor status message

Sensors should use this topic for MQTT LWT:

```text
sensors/{DEVICE_ID}/status
```

Example payload:

```text
OFFLINE
```

The bridge also publishes a `TIMEOUT` event to the dashboard if no data is received from a sensor for 10 seconds.

### Dashboard topics

| Purpose | Topic / URL |
|---|---|
| Frontend MQTT broker | `wss://broker.hivemq.com:8884/mqtt` |
| Live events | `cloud/earthquake_events` |
| System health | `system/health` |
| Backend MQTT broker | `broker.hivemq.com:1883` |

## Setup

### 1. Prepare the repository

```bash
git clone <repo-url>
cd dts
```

### 2. Create a Firebase project

1. Create a new project in [Firebase Console](https://console.firebase.google.com).
2. Enable Realtime Database and copy the database URL.
3. Go to Project Settings > Service accounts and generate a new private key.
4. Put the downloaded JSON file in the project root with this name:

```text
firebase-credentials.json
```

### 3. Backend `.env` file

Create `.env` in the project root:

```env
FIREBASE_DATABASE_URL=https://<project-id>-default-rtdb.firebaseio.com
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json
```

### 4. Frontend `.env` file

Get the Web App config values from Firebase Console > Project Settings > General > Your apps. Then create `frontend/.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=https://<project-id>-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_MQTT_BROKER_URL=wss://broker.hivemq.com:8884/mqtt
VITE_MQTT_TOPIC_CLOUD_EVENTS=cloud/earthquake_events
VITE_MQTT_TOPIC_SYSTEM_HEALTH=system/health

VITE_EMAILJS_SERVICE_ID=service_xxx
VITE_EMAILJS_TEMPLATE_ID=template_xxx
VITE_EMAILJS_PUBLIC_KEY=xxx
```

### 5. Firebase rules

You can add this basic read rule in Realtime Database > Rules:

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

Writes can stay disabled for clients because the backend writes through the Firebase Admin SDK.

## Running

Backend:

```bash
pip install -r requirements.txt
python bridge_backend.py
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Default URL:

```text
http://localhost:5173
```

Test with the mock sensor:

```bash
python mock/sensor_taklit.py
```

## Frontend Screens

| Page | Content |
|---|---|
| Live Monitor | Live MQTT data, stat cards, acceleration chart, latest packet, and system health |
| Event History | Firebase history with device, Richter, date, and alarm filters |
| Statistics | Total events, alarm count, max Richter, time series, and histogram |
| Notification Settings | Push notifications, email notifications, threshold value, and EmailJS status |

## EmailJS Setup

This project sends email alerts from the frontend using EmailJS, not from the backend. Anyone cloning the repository must configure their own EmailJS account and `.env` values to enable email alerts.

### 1. EmailJS account and service

1. Create an account at [emailjs.com](https://www.emailjs.com).
2. In Email Services, connect Gmail, Outlook, or another provider.
3. Copy the generated Service ID. Example: `service_abcd123`.

### 2. Create a template

Create a new template in Email Templates. In the template settings:

```text
To Email: {{to_email}}
Subject: {{subject}}
```

You can paste this into the template body:

```text
DTS EARTHQUAKE ALERT

Richter Magnitude: {{richter}}
PGA: {{pga}} cm/s2
Device ID: {{device_id}}

Acceleration Values:
X: {{accel_x}} m/s2
Y: {{accel_y}} m/s2
Z: {{accel_z}} m/s2

Time: {{timestamp}}

{{message}}
```

Save the template and copy the Template ID. Example: `template_xyz789`.

### 3. Get the public key

Copy the Public Key from EmailJS Dashboard > Account > API Keys.

### 4. Where should these values be pasted?

Paste the three copied values into `frontend/.env`:

```env
VITE_EMAILJS_SERVICE_ID=service_abcd123
VITE_EMAILJS_TEMPLATE_ID=template_xyz789
VITE_EMAILJS_PUBLIC_KEY=public_key_value
```

Restart the frontend dev server after changing `.env`:

```bash
cd frontend
npm run dev
```

### 5. Where is it used in the code?

| File | Purpose |
|---|---|
| `frontend/src/services/emailService.js` | Reads `.env` values, initializes EmailJS, and sends emails. |
| `frontend/src/context/EarthquakeContext.jsx` | Calls `sendEarthquakeEmail` when `deprem_flag` is detected and user settings allow email alerts. |
| `frontend/src/pages/NotificationSettings.jsx` | Lets the user enable email alerts and enter the recipient email address. |

The user must enable email notifications and enter a recipient email address in the Notification Settings page. If the EmailJS `.env` values are missing, the app will not send email and will only log a warning to the console.

## Security Notes

- `.env`, `frontend/.env`, and `firebase-credentials.json` must not be committed.
- The Firebase service account file is used only by the backend.
- Values prefixed with `VITE_` are visible in the frontend bundle, so they should not be treated as private server secrets.
- EmailJS Public Key is designed for frontend use, but quotas and template restrictions should be managed from the EmailJS dashboard.
- The public MQTT broker is fine for testing; use a private or authenticated broker for production.

## Quick Troubleshooting

| Problem | Check |
|---|---|
| Backend does not write to Firebase | `.env`, `FIREBASE_DATABASE_URL`, `firebase-credentials.json` path |
| Dashboard receives no data | Backend running, MQTT topics match, device ID starts with `SENSOR_` |
| History is empty | Firebase rules and `/earthquake_events` node |
| Email is not sent | EmailJS `.env` values, template variables, email toggle, and recipient address |
| Mobile device cannot open app | Vite LAN URL, same Wi-Fi, firewall, and `vite.config.js` host setting |

</details>
