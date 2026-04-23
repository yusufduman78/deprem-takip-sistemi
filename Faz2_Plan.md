# Faz 2: Firebase Entegrasyonu (Cloud Bridge)

## Hedefler
1. `firebase-admin` kütüphanesinin projeye dahil edilmesi.
2. Firebase Service Account (Hizmet Hesabı) kimlik bilgilerinin sisteme güvenli bir şekilde entegre edilmesi.
3. `services/firebase_service.py` modülünün gerçek Firebase Realtime Database'e yazacak şekilde güncellenmesi.
4. Sistemin uçtan uca çalıştırılıp verilerin buluta gittiğinin test edilmesi.

## Adım Adım Yapılacaklar

### Adım 1: Kütüphane Kurulumu ve Güvenlik
- `firebase-admin` ve `.env` dosyalarını okumak için `python-dotenv` kütüphaneleri kurulacak.
- `requirements.txt` dosyası güncellenecek.
- Hassas bilgileri (Database URL ve Kimlik dosya yolu) saklamak için bir `.env` dosyası oluşturulacak.

### Adım 2: Firebase Kimlik Dosyası (Sizin Adımınız)
Kodların gerçek bir veritabanına yazabilmesi için Firebase'den bir yetki dosyası almamız gerekiyor:
1. Firebase Console'a girin.
2. Projenizi seçin (veya yeni oluşturun).
3. **Project Settings** (Proje Ayarları) > **Service Accounts** (Hizmet Hesapları) sekmesine gidin.
4. **Generate new private key** (Yeni özel anahtar oluştur) butonuna basıp inen `.json` dosyasını proje klasörüne (örneğin `firebase-credentials.json` adıyla) kopyalayın.
5. Sol menüden **Realtime Database**'i oluşturun ve kurallarını (Rules) şimdilik test için `true` (herkes yazabilir/okuyabilir) yapın veya sadece admin yazacak şekilde ayarlayın (biz admin SDK kullanacağız, kurallar sorun olmaz).

### Adım 3: `firebase_service.py` Modülünün Güncellenmesi
- Şu anki "Placeholder" (yer tutucu) log basan kod silinecek.
- Yerine `firebase_admin` kütüphanesini kullanarak `connect()` ve `write_event()` metodları yazılacak.
- Veriler `earthquake_events` düğümü (node) altına bir liste (push) olarak eklenecek.

### Adım 4: Canlı Uçtan Uca Test
- Backend yeniden başlatılacak.
- `sensor_taklit.py` ile veri yollanacak.
- Siz de web tarayıcınızdan Firebase konsoluna bakarak verilerin anında buluta düşüp düşmediğini kendi gözlerinizle göreceksiniz.
