# DTS Frontend — Geliştirme Dokümantasyonu

> Bu doküman, `main` branch'inden klonlanarak oluşturulan **frontend branch'inde** yapılan tüm geliştirmeleri, eklenen özellikleri ve mimari kararları kapsamlı şekilde açıklar.

---

## 📦 Proje Teknoloji Yığını

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| Framework | React 18 | ^18.x |
| Bundler | Vite | ^6.x |
| Stil | Vanilla CSS (CSS Variables) | — |
| İkon | Lucide React | ^0.x |
| Animasyon | GSAP (GreenSock) | ^3.x |
| Grafikler | Recharts | ^2.x |
| MQTT | mqtt.js (WebSocket) | ^5.x |
| Veritabanı | Firebase Realtime DB | — |
| E-posta | EmailJS (@emailjs/browser) | ^4.x |
| Bildirimler | Web Notifications API | — |
| State | React Context API | — |

---

## 🏗️ Mimari Genel Bakış

```
dts/
├── bridge_backend.py           # Python IoT köprü servisi (backend — değiştirilmedi)
├── firebase-credentials.json   # Firebase service account (gitignore'da)
├── .env                        # Backend ortam değişkenleri
├── Frontend.md                 # Bu dosya
├── README.md                   # Proje genel dökümantasyonu
├── mock/
│   └── sensor_taklit.py        # Mock sensör veri üretici
└── frontend/
    ├── .env                    # Frontend ortam değişkenleri (Firebase + MQTT + EmailJS)
    ├── vite.config.js          # Vite yapılandırması (LAN erişimi açık)
    ├── package.json
    └── src/
        ├── components/
        │   ├── Navbar.jsx              # Üst navigasyon + tema toggle + hamburger menü
        │   ├── AlarmBanner.jsx         # Deprem uyarı bandı (GSAP animasyonlu)
        │   ├── OfflineBanner.jsx       # MQTT kopukluk uyarısı
        │   └── SystemHealthWidget.jsx  # Bridge sağlık telemetrisi (CPU, RAM, Uptime vb.)
        ├── context/
        │   └── EarthquakeContext.jsx   # Global state yönetimi (MQTT + Firebase + Alarm + E-posta)
        ├── pages/
        │   ├── LiveMonitor.jsx         # Canlı izleme dashboard'u
        │   ├── EventHistory.jsx        # Geçmiş deprem verileri tablosu
        │   ├── Statistics.jsx          # İstatistik grafikleri
        │   └── NotificationSettings.jsx # Bildirim ve e-posta ayarları
        ├── services/
        │   ├── mqttService.js          # MQTT bağlantı + offline mesaj kuyruğu
        │   ├── firebaseService.js      # Firebase Realtime DB okuma
        │   ├── notificationService.js  # Push notification + kullanıcı ayarları yönetimi
        │   └── emailService.js         # EmailJS e-posta gönderim servisi
        ├── App.jsx                     # Router, layout ve alarm modu
        ├── main.jsx                    # Entry point
        ├── firebase.js                 # Firebase config
        └── index.css                   # Global stil sistemi (~1000 satır)
```

---

## ✅ Uygulanan Özellikler

### 1. Canlı İzleme Sayfası (`LiveMonitor.jsx`)

MQTT üzerinden gerçek zamanlı sensör verilerini izleyen ana dashboard:

- **8 adet stat kartı** (4×4 grid düzeni):
  - Sistem Durumu (NORMAL / DEPREM ALARMI)
  - Son PGA (cm/s²)
  - Son Olay Zamanı
  - Cihaz ID
  - Son Richter Büyüklüğü
  - Accel X — Yatay ivme (m/s²)
  - Accel Y — Yanal ivme (m/s²)
  - Accel Z — Dikey ivme (m/s²)
- **Canlı ivmeölçer grafiği**: Recharts ile X, Y, Z eksen ivmeleri + Richter değeri (4 çizgi, gerçek zamanlı akış, son 60 nokta)
- **Son MQTT Paketi kartı**: Ham JSON verisini key-value tablo formatında gösterme
- **Sistem Sağlığı Widget'ı**: CPU, RAM, Uptime, Aktif Thread, Kuyruk boyutu, Aktif Sensör sayısı, Ağ gecikmesi (ms)

### 2. Geçmiş Veriler Sayfası (`EventHistory.jsx`)

Firebase `/earthquake_events` node'undan çekilen tarihsel deprem kayıtları:

- **Gelişmiş filtreleme sistemi**:
  - Cihaz ID arama (arama ikonu ile)
  - Minimum Richter eşiği
  - Tarih aralığı (başlangıç — bitiş)
  - "Sadece Alarmlar" toggle'ı
  - Filtre sıfırlama butonu
- **Renk kodlu Richter değerleri**: ≥4 kırmızı (tehlikeli), ≥2 turuncu (orta), <2 beyaz (hafif)
- **Kayıt sayacı**: Filtrelenmiş / Toplam kayıt gösterimi
- Tüm sütunlar monospace fontla hizalı

### 3. İstatistik Sayfası (`Statistics.jsx`)

Firebase kayıtlarına dayalı grafiksel analiz:

- **4 özet kartı**: Toplam kayıt sayısı, deprem (alarm) sayısı, en büyük Richter, son 7 günlük ortalama Richter
- **Richter Zaman Serisi Grafiği**: Son 100 olayın kronolojik çizgi grafiği
- **PGA Zaman Serisi Grafiği**: Son 100 olayın PGA değer çizgisi
- **Richter Histogram Dağılımı**: 0–1, 1–2, 2–3, 3–4, 4–5, 5+ aralıklarında bar chart

### 4. Ayarlar Sayfası (`NotificationSettings.jsx`)

Bildirim tercihleri ve sistem konfigürasyonu:

- **Push Bildirim toggle'ı**: Tarayıcı bildirimleri açma/kapama
- **E-posta Bildirim toggle'ı**: Deprem anında e-posta gönderme (EmailJS)
- **E-posta adresi giriş alanı** (toggle açıkken görünür)
- **Sessiz Mod toggle'ı**: Bildirim göster ama ses çıkarma
- **Minimum Richter eşiği**: Bu değerin altı için uyarı verilmez
- **Tarayıcı İzni kartı**: İzin durumu gösterimi + izin isteme butonu
- **Sistem Bilgisi kartı**: MQTT broker, topic'ler, throttle, timeout, watchdog bilgileri
- **EmailJS Durum kartı**: Yapılandırılmış/yapılandırılmamış durumunu gösterir

### 5. Deprem Alarm Modu

`deprem_flag` verisi algılandığında otomatik devreye giren görsel alarm sistemi:

- Tüm arayüz alarm renklerine (kırmızı/bordo) geçer
- Ekranın tepesinden GSAP animasyonuyla kayan kırmızı uyarı bandı
- Richter, PGA ve saat bilgisi banner'da anlık gösterilir
- 30 saniye yeni alarm gelmezse otomatik normal moda döner
- **Karanlık modda**: Siyah-kırmızı nabız efekti (#0a0000 → #1a0000)
- **Aydınlık modda**: Gül kurusu nabız efekti (#fff1f2 → #ffe4e6)

### 6. Karanlık / Aydınlık Tema (Dark / Light Mode)

- Navbar'daki **Güneş (☀) / Ay (☽) ikonu** ile tek tıkla geçiş
- `localStorage` ile kalıcı tercih kaydı — sayfa yenilendiğinde korunur
- CSS Variables (`--bg-primary`, `--text-primary` vb.) ile anında tüm bileşenler güncellenir

| Tema | Arka Plan | Aksan | Cam Efekti |
|------|-----------|-------|------------|
| Karanlık | #050505 (deep space) | Cyber Blue (#00f0ff), Neon Purple (#7000ff) | blur(24px) koyu cam |
| Aydınlık | #f8fafc (slate white) | Ocean Blue (#0ea5e9), Soft Purple (#8b5cf6) | blur(24px) beyaz cam |

### 7. Profesyonel İkon Sistemi (Lucide React)

Tüm emojiler (🌍, 📡, 📊, ⚙️, 🚨 vb.) kaldırılıp profesyonel **Lucide SVG ikonları** ile değiştirildi:

| Eski (Emoji) | Yeni (Lucide) | Kullanım |
|------|---------------|----------|
| 🌍 | `Globe2` | Navbar brand |
| 📡 | `Activity` | Canlı İzleme |
| 📋 | `History` | Geçmiş |
| 📊 | `BarChart3` | İstatistik |
| ⚙️ | `Settings` | Ayarlar |
| 🚨 | `AlertTriangle` | Alarm uyarıları |
| ✅ | `CheckCircle2` | Normal durum |
| 🔌 | `Plug` | Cihaz ID |
| 📏 | `Ruler` | Richter |
| 🕐 | `Clock` | Zaman |
| ⬆️⬇️➡️ | `ArrowUpCircle`, `ArrowDownCircle`, `ArrowRightCircle` | İvme eksenleri |
| ☀️🌙 | `Sun`, `Moon` | Tema geçişi |
| ☰ ✕ | `Menu`, `X` | Hamburger menü |

### 8. GSAP Animasyonları

- **Sayfa giriş animasyonu**: `.reveal-el` class'ına sahip elemanlar staggered (ardışık gecikmeli) olarak aşağıdan yukarı kayarak belirir
  - `duration: 0.8s`, `stagger: 0.08s`, `ease: power3.out`
- **Alarm banner**: `back.out(1.7)` ease ile yukarıdan fiziksel sıçrama animasyonu

### 9. E-posta Bildirimi (EmailJS — Ücretsiz)

Deprem algılandığında otomatik e-posta uyarısı gönderen sistem:

- **Tamamen ücretsiz**: EmailJS free tier, ayda 200 e-posta
- **Backend'e dokunmaz**: Tamamen frontend tarafında çalışır
- **Otomatik tetikleme**: `deprem_flag` algılandığında ve ayarlarda e-posta açıksa anında gönderir
- **Gönderilen bilgiler**: Richter, PGA, Cihaz ID, 3 eksen ivme, zaman damgası
- **Durum bildirimi**: Başarılı gönderimde toast mesajı, hata durumunda konsol logu

#### E-posta Şablon Yapılandırması (EmailJS Dashboard)

Template ayarlarında:
```
To Email:  {{to_email}}
Subject:   {{subject}}
```

Template body:
```
🔴 DEPREM UYARISI — DTS Deprem Takip Sistemi

Richter Büyüklüğü: {{richter}}
PGA: {{pga}} cm/s²
Cihaz ID: {{device_id}}

İvme Değerleri:
  X (Yatay): {{accel_x}} m/s²
  Y (Yanal): {{accel_y}} m/s²
  Z (Dikey): {{accel_z}} m/s²

Zaman: {{timestamp}}

{{message}}
```

### 10. Mesaj Kuyruğu (Offline Queue)

MQTT bağlantısı koptuğunda veri kaybını önleyen sistem:

- **İnternet kesildiğinde**: Gelen mesajlar `localStorage`'da kuyruğa alınır
- **Bağlantı döndüğünde**: Tüm kuyruk otomatik flush edilir ve işlenir
- **Kapasite**: Maksimum 200 mesaj (FIFO — en eski silinir)
- **Kalıcılık**: Tarayıcı kapatılsa bile kuyruk korunur (`localStorage` key: `dts_offline_queue`)

### 11. Mobil Uyumluluk (Responsive Design)

#### Hamburger Menü
- 768px altında masaüstü navigasyon gizlenir
- Sağ üstte hamburger (☰) / kapatma (✕) ikonu belirir
- Sağdan kayan **drawer menü** açılır (blur efektli glassmorphism arka plan)
- Menü dışına tıklayınca veya link seçilince otomatik kapanır
- MQTT bağlantı durumu drawer içinde gösterilir

#### Responsive Breakpoint'ler

| Breakpoint | Grid | Navbar | Kartlar |
|------------|------|--------|---------|
| `> 1024px` | 4 sütun | Masaüstü nav | Tam boyut |
| `768px – 1024px` | 2 sütun | Masaüstü nav | Tablet uyumu |
| `480px – 768px` | 2 sütun | Hamburger | Küçültülmüş |
| `< 480px` | 2 sütun (kompakt) | Hamburger | Minimum padding |

#### Mobil Test Yöntemleri
1. **PC'den (Chrome DevTools)**: `F12` → Toggle Device Toolbar (`Ctrl+Shift+M`) → iPhone/Pixel seç
2. **Telefondan (Gerçek Cihaz)**: Aynı WiFi'de `http://<PC-IP>:5173` adresine git
   - `vite.config.js`'te `server.host: true` ayarı LAN erişimini açar
   - Vite terminalde LAN IP'sini gösterir

---

## 🔧 Ortam Değişkenleri

### Frontend (`frontend/.env`)
```env
# Firebase Web Configuration
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# MQTT Configuration
VITE_MQTT_BROKER_URL=wss://broker.hivemq.com:8884/mqtt
VITE_MQTT_TOPIC_CLOUD_EVENTS=cloud/earthquake_events
VITE_MQTT_TOPIC_SYSTEM_HEALTH=system/health

# EmailJS Configuration (Free email alerts)
VITE_EMAILJS_SERVICE_ID=service_xxx
VITE_EMAILJS_TEMPLATE_ID=template_xxx
VITE_EMAILJS_PUBLIC_KEY=xxx
```

### Backend (`dts/.env`)
```env
FIREBASE_DATABASE_URL=https://xxx.firebasedatabase.app
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json
```

---

## 📦 Bu Branch'te Eklenen Bağımlılıklar

```bash
npm install lucide-react gsap @emailjs/browser
```

| Paket | Amaç |
|-------|------|
| `lucide-react` | Profesyonel vektörel SVG ikon kütüphanesi |
| `gsap` | GreenSock animasyon motoru (sayfa geçişleri, alarm efektleri) |
| `@emailjs/browser` | Frontend'den ücretsiz e-posta gönderimi |

> Mevcut bağımlılıklar (react, recharts, mqtt, firebase, react-router-dom, react-toastify) main branch'ten gelir.

---

## 🚀 Projeyi Çalıştırma

```bash
# 1. Backend köprüyü başlat
cd dts
python bridge_backend.py

# 2. (Opsiyonel) Mock sensör verisi gönder
cd dts/mock
python sensor_taklit.py

# 3. Frontend'i başlat
cd dts/frontend
npm run dev
```

| Erişim | Adres |
|--------|-------|
| Masaüstü | `http://localhost:5173` |
| Mobil (LAN) | `http://<bilgisayar-ip>:5173` |

---

## 📊 Özellik Durumu Tablosu

| Özellik | Durum | Açıklama |
|---------|-------|----------|
| Canlı İzleme (MQTT) | ✅ Çalışıyor | 8 stat kartı + canlı grafik + MQTT paketi + sistem sağlığı |
| Geçmiş Veriler (Firebase) | ✅ Çalışıyor | Filtreleme, arama, renk kodlu tablo |
| İstatistik Grafikleri | ✅ Çalışıyor | Zaman serisi + histogram |
| Push Bildirimleri | ✅ Çalışıyor | Web Notifications API |
| E-posta Bildirimleri | ✅ Çalışıyor | EmailJS ücretsiz (ayda 200) |
| Karanlık / Aydınlık Tema | ✅ Çalışıyor | localStorage ile kalıcı |
| Deprem Alarm Modu | ✅ Çalışıyor | Her iki temada özel stiller + animasyonlar |
| Mobil Uyumluluk | ✅ Çalışıyor | Hamburger menü, 3 breakpoint |
| Mesaj Kuyruğu | ✅ Çalışıyor | localStorage, max 200 mesaj, otomatik flush |
| GSAP Animasyonları | ✅ Çalışıyor | Sayfa giriş + alarm banner |
| Lucide İkonları | ✅ Çalışıyor | Tüm emojiler SVG ikonlarla değiştirildi |
| PWA (Çevrimdışı) | ❌ Henüz yok | `vite-plugin-pwa` ile eklenebilir |
