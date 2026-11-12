/**
 * PC yardımcısı zip'inin içeriği: hangi dosya ne işe yarar, yönetici izni ister mi.
 * Uygulamadaki "PC yardımcısı" kartı ve sitedeki /pc sayfası aynı listeyi gösterir;
 * zip'e dosya eklenir ya da çıkarılırsa (scripts/yardimci-zip.mjs) burası da güncellenir.
 */
export type YardimciDosya = {
    /** Kullanıcıya gösterilen ad. */
    ad: string;
    /** Zip ana klasörüne göre dosya yolu. */
    dosya: string;
    aciklama: string;
};

export type YardimciKlasor = {
    id: 'izinsiz' | 'otomatik' | 'izinli';
    baslik: string;
    aciklama: string;
    dosyalar: YardimciDosya[];
};

export const YARDIMCI_KLASORLERI: YardimciKlasor[] = [
    {
        id: 'izinsiz',
        baslik: 'Sizin açacağınız dosyalar',
        aciklama: 'İkisi de aynı programı açar; aynı anda çalıştırmayın. Bluetooth veya kart için yalnız BASLAT.cmd yeterli. Başlatıcılar admin istemez; kurumun betik ve cihaz izinleri yine geçerlidir.',
        dosyalar: [
            { ad: 'Telefonu USB kablosuyla bağla', dosya: 'TELEFON-USB-OTOMATIK-KUR.cmd', aciklama: 'Bir kez açın; ortak USB köprüsünü Windows oturumunuzla başlatır. Cep Köprü ve Not Bahçesi aynı köprüyü kullanır. Telefonda USB hata ayıklama ve bilgisayar onayı gerekir; yönetici izni istemez.' },
            { ad: 'Önerilen: Bluetooth / kart', dosya: 'BASLAT.cmd', aciklama: 'Çift tıklayın, pencereyi açık bırakın. Pano, dosya ve destekleyen kartla USB internet bileşenlerini başlatır. Tailscale zaten kurulu ve izinliyse onu da kullanabilir; yeni kurulum yapmaz.' },
            { ad: 'Alternatif: aynı ağda PC Wi‑Fi', dosya: 'WIFI.cmd', aciklama: 'Yalnız doğrudan PC Wi-Fi kullanacaksanız açın. Mevcut güvenlik duvarı izni gerekir; iş yerinde engelleniyorsa Bluetooth/kart yolunu kullanın.' }
        ]
    },
    {
        id: 'otomatik',
        baslik: 'Otomatik çalışan bileşenler — elle açmayın',
        aciklama: 'scripts klasörü ve içindeki vendor birlikte kalsın. Bunlar ayrı kurulumlar değildir; BASLAT.cmd gerekli parçaları yükler. Python veya Node kurulumu gerekmez.',
        dosyalar: [
            { ad: 'Başlatıcı ve ortak PC alıcısı', dosya: 'scripts/pc_clipboard_helper.ps1', aciklama: 'Cep Köprü ile aynı güncel motoru kullanır. Tek yardımcı iki uygulamaya da hizmet verir; bağlantı isteğini bilgisayardaki pencereden onaylayın. Teknik dosyaları tek tek açmayın.' },
            { ad: 'Bağlantı onayı ve ortak USB motoru', dosya: 'Ortak-USB/', aciklama: 'USB köprüsü, bağlantı onayı ve otomatik başlangıç bileşenleri. scripts içindeki alıcıyla aynı sürümdür; klasörü birlikte tutun.' },
            { ad: 'Klavye ve fare', dosya: 'scripts/RemoteInput.cs', aciklama: 'PC Wi-Fi yolunda yazma, fare ve kısayol isteklerini Windows’a uygular.' },
            { ad: 'Telefon belleği', dosya: 'scripts/PhoneDrive.cs', aciklama: 'Telefon dosyalarını açar. Sürücü harfi için WebClient hizmeti gerekir; engelliyse bağlı paylaşımın tarayıcı erişimini kullanın.' },
            { ad: 'Kart USB internet köprüsü', dosya: 'scripts/UsbInternetRelay.cs', aciklama: 'Destekleyen kartın USB seri portundan gelen internet isteklerini taşır. Kurumun USB ve ağ izinleri geçerlidir.' },
            { ad: 'Bluetooth kitaplığı', dosya: 'scripts/vendor/', aciklama: 'Bluetooth alıcısının hazır bileşenleri ve lisansı. Silmeyin, ayrı açmayın.' },
            { ad: 'Mevcut Tailscale yönlendirmesi', dosya: 'scripts/pc_tailscale_izin.ps1', aciklama: 'Ana başlatıcı zaten çağırır; pc_tailscale_izni.cmd ile elle tekrar açmak gerekmez. Yeni Tailscale kurulumu genellikle admin ister; hizmet politikası yönlendirmeyi reddedebilir.' }
        ]
    },
    {
        id: 'izinli',
        baslik: 'Yöneticiye özel — günlük kullanım için değil',
        aciklama: 'ileri klasöründedir. Admin kullanamıyorsanız açmayın; izinli Bluetooth/kart yolunu tercih edin. Kurum kısıtlarını aşmak için kullanılmaz.',
        dosyalar: [
            { ad: 'Wi-Fi güvenlik duvarı kuralı', dosya: 'ileri/pc_guvenlik_duvari.ps1', aciklama: 'Windows güvenlik duvarı kurallarını değiştirir ve yönetici yetkisi gerektirir. Normal başlatıcı bunu çalıştırmaz.' }
        ]
    }
];
