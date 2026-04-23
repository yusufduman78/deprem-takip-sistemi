# Faz 1: Python IoT Köprüsü'nün (Backend) Kurulması

## Hedefler
1. Python proje klasörünün ve sanal ortamın (Virtual Environment) oluşturulması.
2. Gerekli kütüphanelerin (`paho-mqtt`) yüklenmesi.
3. HiveMQ genel broker'ı üzerinden MQTT bağlantısının sağlanması.
4. `sensors/+/data` kanalından gelen JSON paketlerinin yakalanıp parse (çözümlenmesi) edilmesi.

## Adım Adım Yapılacaklar

### Adım 1: Proje Ortamının Hazırlanması
- Proje dizininde bir Python sanal ortamı (`venv`) oluşturulacak. Böylece kütüphaneler bilgisayarınıza değil, sadece bu projeye özel yüklenecek.
- `requirements.txt` dosyası oluşturulacak ve içine MQTT haberleşmesi için `paho-mqtt` yazılacak.
- Kütüphaneler kurulacak.

### Adım 2: `bridge_backend.py` Dosyasının Oluşturulması
- Bu dosya backend mimarimizin ana dosyası olacak.
- Broker adresi olarak `broker.hivemq.com` (Port: 1883) tanımlanacak.
- `on_connect` fonksiyonu yazılacak: Sistem broker'a bağlandığı anda otomatik olarak `sensors/+/data` topic'ine abone (subscribe) olacak. (Buradaki `+` işareti, `SENSOR_01`, `SENSOR_02` gibi tüm sensör cihazlarını dinleyebilmemizi sağlar).

### Adım 3: JSON Veri Yakalama ve İşleme (`on_message`)
- Herhangi bir sensörden MQTT'ye mesaj düştüğünde anında tetiklenecek `on_message` fonksiyonu yazılacak.
- Gelen ham mesaj (payload), Python `json` kütüphanesi ile bir sözlüğe (dictionary) dönüştürülecek.
- JSON içindeki `deprem_flag`, `pga`, `richter` değerleri ayrıştırılıp konsola basılacak.
- (Hata Yönetimi): Hatalı veya eksik JSON gelirse sistemin çökmemesi için `try-except` (Try-Catch) bloğu ile koruma sağlanacak.

### Adım 4: İlk Testin Yapılması
- `bridge_backend.py` çalıştırılarak dinleme moduna (loop_forever) geçirilecek.
- Kodumuzun çalıştığını kanıtlamak için, terminalden ufak bir komutla sisteme raporumuzdaki örnek JSON paketini yollayacağız ve kodumuzun bunu saniyesinde nasıl parse ettiğini göreceğiz.
