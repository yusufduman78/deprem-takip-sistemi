# Faz 4: Hata Yönetimi ve Otomatik Kuyruk Boşaltma (Retry Mechanism)

## Hedefler
Sistemimizde `MessageQueue` halihazırda internet kesintilerinde mesajları RAM'de saklıyor. Ancak internet geri geldiğinde bu verileri **otomatik olarak** Firebase'e gönderecek "Yeniden Deneme" (Retry) mekanizmamız eksik. Bu fazda bunu tamamlayacağız.

## Adım Adım Yapılacaklar

### Adım 1: Arka Plan Döngüsü (Retry Thread)
- `bridge_backend.py` dosyasına arka planda çalışan bir `Thread` (İş Parçacığı) eklenecek.
- Bu işlem her 10 saniyede bir uyanıp `MessageQueue`'yu kontrol edecek.
- Eğer kuyrukta bekleyen veri varsa, bunları eski veriden yeni veriye (FIFO) doğru sırayla Firebase'e yazmayı deneyecek (`flush` işlemi).

### Adım 2: Çift Yönlü Komut Altyapısı (Hazırlık)
- `commands/main` topic'inden gelen komutların (örneğin "alarm_sustur") `message_handler.py` tarafında işlenmesi ve ileride sensörlere iletilmesi için altyapı güçlendirilecek.

### Adım 3: Gerçekçi İnternet Kesintisi Testi
Sistemin gücünü görmek için şu testi yapacağız:
1. `.env` dosyasındaki Firebase URL'ini bilerek **bozacağız** (Sanki internet kesilmiş gibi).
2. Sensörden birkaç tane deprem yollayacağız.
3. Ekranda "Firebase'e yazılamadı, kuyruğa eklendi (1/50), (2/50)" yazılarını göreceğiz.
4. Sunucu çalışırken URL'i tekrar **düzelteceğiz** (İnternet geldi).
5. 10 saniye içinde sistemin kendi kendine "Kuyruk boşaltıldı: 2 mesaj gönderildi" deyip Firebase'i güncellediğini canlı olarak izleyeceğiz.
