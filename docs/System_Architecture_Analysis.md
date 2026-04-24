# Akıllı Deprem İzleme ve Uyarı Sistemi - Çapraz Kontrol ve Mimari Analiz Raporu

**Hazırlayan:** Kıdemli Sistem Mimarı
**İncelenen Belgeler:** Genel Ekip Raporu (Combined Report) ve Bireysel Rapor (IoT Communication & Data Bridge)

Bu rapor, yazılım ve donanım gereksinim belgeleri arasındaki entegrasyon uçurumlarını, potansiyel darboğazları ve donanımsal riskleri tespit etmek amacıyla hazırlanmıştır.

---

## 1. Entegrasyon ve Uyumsuzluklar (Darboğazlar)

### A. Zaman Damgası (Timestamp) Çelişkisi
*   **Sensör Katmanı (Talha ve Berkant):** MPU6050'den okunan veriler için `uint32_t timestamp_ms; // millis()` formatı belirlenmiş (cihazın açıldığından beri geçen milisaniye).
*   **Köprü Katmanı (Yusuf):** JSON formatında `"2026-03-26T15:30:45"` gibi ISO-8601 gerçek zamanlı tarih formatı beklenmektedir.
*   **💥 Kritik Hata:** ESP8266'nın içinde dahili bir saat (RTC) pili yoktur. İnternete bağlanıp bir NTP (Network Time Protocol) sunucusundan saat çekmezse, asla beklenen ISO tarihini üretemez.
*   **Çözüm:** Sensör katmanına "Wi-Fi bağlandıktan sonra NTP sunucusundan saat senkronizasyonu yapılmalı" şartı eklenmeli veya köprü (Gateway) katmanı gelen `millis()` değerini alıp, veriyi Firebase'e yollamadan hemen önce kendi işletim sistemi saatiyle değiştirmelidir.

### B. Gerçek Zamanlı Grafik vs. 45 Saniye Kilit (Debounce) Çelişkisi
*   **Sinyal İşleme (Talha):** *"Tetiklenme sonrası 45 saniyelik bir kilitlenme (lockout) periyodu uygulanır."*
*   **Dashboard (Ahmet Emir):** *"Canlı ivmeölçer grafiği (accel_x, y, z) zamanla çizilir."*
*   **💥 Kritik Hata:** Sensör deprem anında veya sadece 45 saniyede bir paket yollayacaksa, Dashboard'da "canlı grafik" akamaz. Eğer grafik aksın diye sensör 125 Hz (saniyede 125 paket) hızında veri yollarsa, MQTT Bridge katmanı saniyede 125 paketi Firebase'e yollamaya çalışır ve Firebase anında "Rate Limit" (Sınır Aşımı) verip sistemi kilitler.
*   **Çözüm:** İki farklı MQTT Topic açılmalıdır: 
    1. `sensors/01/live`: (Saniyede 1 paket) Sadece canlı grafik için, MQTT'de kalır, Firebase'e gitmez.
    2. `sensors/01/alarm`: Sadece deprem anında fırlar ve Firebase'e yazılır.

---

## 2. Donanım ve Yazılım Kısıtlamaları (Facia Riski)

### A. ESP8266 (NodeMCU) RAM Çökmesi (Exception 29)
*   **Rapordaki İfade:** *"Ana İstasyon NodeMCU'su hem MQTT broker'a bağlanacak hem de FirebaseClient kütüphanesi ile verileri Firebase'e yazacak."*
*   **💥 Kritik Hata:** NodeMCU'nun kullanıcıya ayrılan RAM'i topu topu **~40-50 KB**'dir. MQTT (PubSubClient) çalışırken, Firebase'e SSL/TLS şifreli HTTPS bağlantısı açmak ortalama 30-40 KB RAM tüketir. Üstüne bir de "LCD Ekran", "Keypad ISR" ve "PWM Buzzer" kodları aynı işlemcide çalışırsa, NodeMCU bu yükü gördüğü an `Hardware Watchdog Reset (WDT)` yiyip sürekli çöker (Boot-loop).
*   **Çözüm:** Ana istasyon NodeMCU'suna asla Firebase'e yazma görevi verilmemelidir. Firebase işi; 7/24 çalışan bir Raspberry Pi, yerel bilgisayar veya bulut sunucu (Python scripti) üzerinden yapılmalıdır. *(Not: Mevcut Python kodlamamızda bu sorunu tam da bu şekilde, bir `bridge_backend.py` Gateway yazılımıyla çözdük. Raporda da NodeMCU yerine bu Gateway mantığı vurgulanmalıdır.)*

### B. Halka Açık (Public) MQTT Broker Kullanımı
*   **Rapordaki İfade:** `broker.hivemq.com` gibi public bir sunucu kullanılacağı belirtilmiş.
*   **💥 Kritik Hata:** Dünyadaki herkes bu sunucuya erişebilir. Kötü niyetli biri "sensors/SENSOR_01/data" kanalına sahte bir "DEPREM: TRUE" mesajı atarsa sistem bunu gerçek sanıp alarmları çaldırır.
*   **Çözüm:** Rapora *"Üretim aşamasında TLS sertifikalı ve kullanıcı adı/şifre korumalı özel (Private) bir MQTT broker kullanılacaktır"* ibaresi eklenmelidir.

---

## 3. Mantıksal Boşluklar ve Hata Yönetimi (Recovery)

### A. Tek Nokta Hatası (Single Point of Failure): Wi-Fi Router
*   Bütün iletişim Wi-Fi tabanlı MQTT üzerinden geçiyor.
*   **💥 Kritik Hata:** Deprem başladığı an (P dalgası ile) evdeki veya bölgedeki elektrikler kesilirse, **Modem (Router) anında kapanır.** Modem kapandığı için sensör ile ana istasyon arasındaki haberleşme saniyeler içinde ölür ve sistem alarm veremez.
*   **Çözüm:** Sensör ve Ana istasyon modeme ihtiyaç duymadan **ESP-NOW (MAC'ten MAC'e doğrudan Wi-Fi iletişimi)** ile konuşmalıdır. Ana istasyon (veya Bridge) interneti bulursa Firebase'e veriyi yollamalıdır. Elektrik gitse dahi cihazlar ESP-NOW ile 1-2 milisaniyede haberleşebilir. (Ayrıca sistem UPS/Powerbank ile beslenmelidir).

### B. Sensörün Çöktüğünün Anlaşılamaması
*   Sensörün fişi çekilirse veya arızalanırsa, Dashboard veya Bridge kodu bunu anlamaz, sürekli "Deprem yok" zannedilir.
*   **Çözüm:** MQTT'nin **LWT (Last Will and Testament)** özelliğinin rapora eklenmesi gerekir. Sensör koptuğu an Broker otomatik olarak `sensors/01/status` kanalına "OFFLINE" basmalı, Bridge bunu yakalayıp sisteme hata logu düşmelidir.

---

## Sonuç ve Tavsiye

Sevgili Meslektaşım (Yusuf), senin "IoT Bridge" vizyonun teoride çok doğru. İnternet kesintisi için planladığın "RAM içi kuyruklama (Message Queue)" harika bir detay ve sistemin dayanıklılığını muazzam artırıyor. 

Ancak **dokümandaki en büyük risk**, Python'da (veya ayrı bir bilgisayarda) yapılması gereken ağır işlerin (Firebase SSL bağlantısı, uzun JSON parse işlemleri) NodeMCU gibi ufacık bir işlemciye yıkılmış gibi görünmesidir. 

**Tavsiye Edilen Güncelleme:** Raporunu güncellerken şu cümleyi eklemelisin: *"Firebase'e veri aktarımı, NodeMCU'nun RAM kısıtlamaları nedeniyle Ana İstasyon donanımından bağımsız, ayrı bir Gateway Yazılımı (Örn: Python Bridge) tarafından üstlenilecektir."* Bu revizyon, projeyi okuyan bir jürinin veya mühendisin teknik hakimiyetine şapka çıkarmasını sağlayacaktır.
