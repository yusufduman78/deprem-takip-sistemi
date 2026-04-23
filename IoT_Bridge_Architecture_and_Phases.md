# Akıllı Deprem İzleme ve Uyarı Sistemi
## IoT İletişim ve Veri Köprüsü (Backend) Mimari ve Analiz Raporu

Bu rapor, projedeki IoT İletişim ve Veri Köprüsü (Rol 5) katmanının teknik analizini, güncellenmiş "Hibrit (Python + NodeMCU)" sistem mimarisini ve adım adım geliştirme fazlarını içermektedir.

### 1. Sistem Mimarisi ve Rol Analizi (Güncel Hibrit Mimari)
Sistemin veri akışı, hatalara karşı toleranslı (fail-safe) ve bellek dostu olması için aşağıdaki **Hibrit Mimari** ile yeniden tasarlanmıştır:
1. **Sensör İstasyonu (Grup 1 - NodeMCU):** Depremi sezer, donanım seviyesinde işler ve MQTT `sensors/{device_id}/data` kanalına "Deprem Var" sinyalini anında (Broadcast) yayınlar.
2. **Ana İstasyon / Aktüatörler (Grup 2 - NodeMCU):** Sensörle aynı MQTT kanalını (`sensors/+/data`) dinler. Sensör yayın yaptığı an, Python sunucusuna hiç uğramadan saniyesinde mesajı duyar ve **sıfır gecikmeyle** yerel alarmı (Buzzer/LED) tetikler. (Cihazlar Arası Doğrudan Haberleşme)
3. **IoT Köprüsü / Python Sunucusu (Bizim Rolümüz):** Cihazların doğrudan konuştuğu bu MQTT ağını 7/24 dinleyen "Görünmez Yönetici"dir. Sensörden gelen veriyi MQTT'den yakalar, JSON paketini işler, Firebase Realtime Database'e kaydeder ve geçmişe dönük veritabanını günceller. NodeMCU'ların 80 KB'lık RAM'i Firebase işlemleriyle yorulmaz.

### 2. İletişim Protokolleri ve Veri Akışı
Sistem kaynaklarının verimli kullanılması ve güvenilirlik amacıyla MQTT Pub/Sub mimarisi temel alınmıştır.

* **MQTT (Message Queuing Telemetry Transport):** Cihazlar arası ve Python sunucusu ile düşük gecikmeli haberleşme için genel broker (`broker.hivemq.com`) kullanılacaktır. NodeMCU'lar `PubSubClient`, Python sunucusu ise `paho-mqtt` kütüphanesini kullanacaktır.
* **Firebase Realtime Database:** Bulut entegrasyonu Python sunucusu üzerinden `firebase-admin` (veya REST API) ile yapılacaktır. NodeMCU cihazları Firebase'e doğrudan bağlanmaz, RAM yükü tamamen Python sunucusuna devredilir.

#### MQTT Topic Hiyerarşisi
| Topic | Yön | Açıklama |
| :--- | :--- | :--- |
| `sensors/{device_id}/data` | Sensör ➔ Ana İstasyon & Python | Sensörden gelen ham deprem verisi. Ana İstasyon alarm çalar, Python buluta yazar. |
| `cloud/earthquake_events` | Python ➔ Firebase | Python sunucusu tarafından işlenen verinin buluta depolanması. |
| `commands/main` | Python/Ana İstasyon ➔ Sensör | `acknowledge`, `silence_alarm` gibi sistem komutları. |

#### JSON Veri Şeması (Payload)
Ağdaki tüm MQTT trafiği bu standart formatta akacaktır:
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

### 3. Hata Yönetimi ve Tolerans (Fail-safes)
* **NodeMCU Firebase Yükünden Kurtuldu:** Firebase SSL/TLS istekleri 80 KB RAM'i olan ESP8266'yı kilitliyordu. Bu yük Python sunucusuna alınarak donanımsal çökme (Out of Memory) riski %0'a indirildi.
* **Merkezi Çökme Toleransı (Single Point of Failure):** Python sunucusu (veya Firebase) çökse bile, Ana İstasyon ve Sensör MQTT üzerinden doğrudan konuştukları için **evdeki alarm her halükarda çalışacaktır.**
* **Python Message Queuing (Kuyruklama):** İnternet kopmalarında Python sunucusu verileri kendi geniş belleğinde kuyruklayacak, bağlantı geldiğinde Firebase'e sırayla push edecektir.

---

### 4. Proje Geliştirme Fazları (Python Mocking Odaklı)
Donanım parçalarının hazır olması beklenmeden, sistem mimarisinin tam test edilebilmesi için geliştirme süreci şu 5 faza bölünmüştür:

#### Faz 1: Python IoT Köprüsü'nün (Backend) Kurulması
* Python proje ortamının hazırlanması.
* `paho-mqtt` ile HiveMQ broker'a bağlanıp `sensors/+/data` topic'inin dinlenmesi (Subscribe).
* Python içerisinden JSON parse işlemlerinin yapılması.

#### Faz 2: Python ile Firebase Entegrasyonu
* `firebase-admin` (veya `requests`) ile Firebase Realtime Database'e bağlantı sağlanması.
* MQTT'den yakalanan "deprem_flag=true" paketlerinin otomatik olarak buluta (cloud/earthquake_events) kaydedilmesi.

#### Faz 3: Taklit (Mock) Sistemlerin Yazılması (Donanımsız Test)
* `sensor_taklit.py`: C++ kodlu donanım gelene kadar sahte deprem verisi üreten script.
* `ana_istasyon_taklit.py`: MQTT'den veriyi dinleyip ekrana "Alarm Çalıyor!" yazan script.
* Bu sayede tüm sistem uçtan uca çalıştırılıp test edilecektir.

#### Faz 4: Hata Yönetimi ve Loglama
* Python sunucusu üzerinde log dosyalarının (Local Logging) oluşturulması.
* Firebase erişimi kesildiğinde Python içinde mesajların kuyruklanması (Queueing) mekanizmasının yazılması.

#### Faz 5: Donanım C++ Entegrasyonu (Hardware Handoff)
* Python'da kusursuz çalışan bu mantık onaylandıktan sonra, Gömülü Yazılımcılara (Grup 1 ve 2) C++ için MQTT pub/sub entegrasyon bilgilerinin verilmesi.
* (Gerekirse) C++ `PubSubClient` taslak kodlarının hazırlanıp ekibe teslim edilmesi ve canlı uçtan uca birleştirme testleri.
