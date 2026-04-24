# IoT Bridge Proje Aksiyon ve Sonuç Raporu

**Proje:** Akıllı Deprem İzleme ve Uyarı Sistemi
**Sorumlu:** Yusuf Duman (IoT Communication & Data Bridge)

Bu rapor, sistem mimarisinde tespit edilen risklerin ve bu risklere karşı alınan teknik önlemlerin özetidir.

## 1. Tamamlanan ve Çözülen Problemler

### 1.1. Donanım Darboğazı (RAM Yönetimi)
- **Problem:** NodeMCU'nun Firebase SSL bağlantısını kaldıramayıp çökmesi.
- **Aksiyon:** "Edge Gateway" mimarisine geçildi. Ağır yükler Python Bridge yazılımına aktarıldı.
- **Sonuç:** NodeMCU sadece hafif MQTT protokolünü kullanarak kararlı hale getirildi.

### 1.2. Hata Toleransı (Fault Tolerance)
- **Problem:** İnternet kesildiğinde deprem verilerinin buluta ulaşamaması ve kaybolması.
- **Aksiyon:** `core/message_queue.py` geliştirildi. FIFO (First-In-First-Out) mantığıyla çalışan bir RAM kuyruğu eklendi.
- **Sonuç:** İnternet geldiği an sistem otomatik olarak biriken verileri Firebase'e "flush" eder hale getirildi.

### 1.3. Uzun Süreli Çalışma Kararlılığı
- **Problem:** Sistemin 7/24 açık kalacağı senaryoda oluşabilecek bellek sızıntıları.
- **Aksiyon:** `core/watchdog.py` eklendi. Uygulamanın RAM/CPU kullanımı izleniyor ve kritik eşiklerde log atıyor.
- **Sonuç:** Sistemin sağlığı yazılımsal olarak garanti altına alındı.

### 1.4. Cihaz İzleme (LWT - Last Will and Testament)
- **Problem:** Sensörün bozulması durumunda Dashboard'un "Sistem Normal" göstermeye devam etmesi.
- **Aksiyon:** Bridge tarafında LWT altyapısı kuruldu. `sensors/+/status` kanalı dinlemeye alındı.
- **Sonuç:** Sensör koptuğu an Bridge bunu saniyeler içinde fark edip "CRITICAL" log üretebilir hale geldi.

## 2. Tespit Edilen ve Gelecek Planına Alınan Maddeler

### 2.1. Zaman Doğruluğu (Offline Timestamping)
- **Durum:** İnternet kesikken kuyruğa giren verilerin sunucu tarafındaki saati (server_timestamp) kayabiliyor.
- **Plan:** Bir sonraki aşamada, verinin Bridge'e ulaştığı ilk ana ait zaman damgası kuyruğa dahil edilecek.

### 2.2. Haberleşme Güvenliği
- **Durum:** Testler için halka açık HiveMQ broker kullanılıyor.
- **Plan:** Üretim (Production) aşamasında TLS şifrelemeli, kullanıcı adı ve şifre korumalı özel bir broker'a geçiş yapılacak.

### 2.3. Altyapı Bağımlılığı (Wi-Fi/Modem)
- **Durum:** Elektrik kesilirse modemin kapanması sistemin haberleşmesini keser.
- **Öneri:** Modemin UPS/Powerbank ile beslenmesi veya cihazlar arası ESP-NOW yedek haberleşme hattının kurulması mimari raporlara eklendi.

---
*Bu doküman projenin teknik olgunluk seviyesini ve karşılaşılan mühendislik zorluklarına üretilen çözümleri temsil eder.*
