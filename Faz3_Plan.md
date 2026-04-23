# Faz 3: Taklit (Mock) Sistemlerin Genişletilmesi ve Yerel İletişim Testi

## Hedefler
Fiziksel donanım (NodeMCU vb.) henüz elimizde olmadığı için, tasarladığımız **Hibrit Mimarinin** (cihazların sunucudan bağımsız kendi aralarında konuşabilmesi) kusursuz çalıştığını kanıtlamamız gerekiyor. Bu fazda, "Ana İstasyon" görevini görecek ikinci bir sahte cihaz oluşturacağız.

## Adım Adım Yapılacaklar

### Adım 1: Ana İstasyon Taklidinin (`ana_istasyon_taklit.py`) Yazılması
- `mock` klasörü altına evdeki alarm ünitesini taklit eden bir script eklenecek.
- Bu cihaz, Python (Bridge) sunucusuna hiç uğramadan **doğrudan** `sensors/+/data` MQTT kanalını dinleyecek.
- Gelen JSON paketini anında okuyup, `deprem_flag == True` olduğu anda ekrana (sanki Buzzer çalıyormuş ve Kırmızı LED yanıyormuş gibi) alarm çıktıları basacak.

### Adım 2: Sensör Taklidinin (`sensor_taklit.py`) İyileştirilmesi
- Önceden yazdığımız sensör taklidini biraz daha "etkileşimli" hale getireceğiz. Kodu çalıştırdığımızda otomatik olarak 5 saniye sonra bitmesi yerine; "Normal veri yollanıyor... Deprem tetiklemek için ENTER'a basın" gibi bir manuel kontrol ekleyeceğiz. Böylece testi biz yöneteceğiz.

### Adım 3: Büyük "Hibrit" Test (Mimari Kanıtı)
Bilgisayarında 3 ayrı terminal penceresi açacağız:
1. **Terminal 1 (Görünmez Yönetici - Bridge):** Sistemi dinleyecek ve gelen verileri Firebase'e atacak.
2. **Terminal 2 (Ana İstasyon):** Evdeki uyarı ünitesi gibi sessizce bekleyecek.
3. **Terminal 3 (Sensör):** "Deprem yap" tuşuna basacağız.

**Beklenen Sonuç (Kanıt):**
Biz sensörden depremi tetiklediğimiz milisaniye içerisinde, **Ana İstasyon (Terminal 2) anında alarm verecek**. Aynı süre zarfında Bridge Backend (Terminal 1) bu durumu fark edip veriyi **Firebase'e kaydedecek**. 
Bu test sayesinde projenin temel savı olan *"Sunucu veya internet çökse bile evdeki alarm cihazlar arası iletişimle kesin çalar"* kuralını simüle etmiş olacağız.
