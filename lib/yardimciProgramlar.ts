/**
 * PC yardımcısı zip'inin içeriği: hangi dosya ne işe yarar, yönetici izni ister mi.
 * Uygulamadaki "PC yardımcısı" kartı ve sitedeki /pc sayfası aynı listeyi gösterir;
 * zip'e dosya eklenir ya da çıkarılırsa (scripts/yardimci-zip.mjs) burası da güncellenir.
 */
export type YardimciDosya = {
    /** Kullanıcıya gösterilen ad. */
    ad: string;
    /** Zip içindeki dosya adı (scripts klasöründe). */
    dosya: string;
    aciklama: string;
};

export type YardimciKlasor = {
    id: 'izinsiz' | 'izinli';
    baslik: string;
    aciklama: string;
    dosyalar: YardimciDosya[];
};

export const YARDIMCI_KLASORLERI: YardimciKlasor[] = [
    {
        id: 'izinsiz',
        baslik: 'Yönetici izni istemeyen yardımcı programlar',
        aciklama: 'Çift tıklayınca doğrudan çalışır, Windows izin penceresi açmaz. Çoğu kullanım için yalnız “Yardımcıyı başlat” yeterlidir.',
        dosyalar: [
            { ad: 'Yardımcıyı başlat', dosya: 'pc_yardimcisi_baslat.cmd', aciklama: 'Tailscale (başka şehirden), kart USB ve Bluetooth için. Pencere açık kaldıkça çalışır.' },
            { ad: 'Yardımcıyı başlat (Wi‑Fi)', dosya: 'pc_yardimcisi_wifi.cmd', aciklama: 'Telefon ve bilgisayar aynı Wi‑Fi ağındaysa. Windows gelen bağlantıyı engelliyorsa aşağıdaki güvenlik duvarı iznini bir kez verin.' },
            { ad: 'Tailscale izni', dosya: 'pc_tailscale_izni.cmd', aciklama: 'Yardımcının 8765 portunu Tailscale ağınıza açar. “Yardımcıyı başlat” bunu kendisi de yapar; elle çalıştırmanız gerekmez.' }
        ]
    },
    {
        id: 'izinli',
        baslik: 'Yönetici izni isteyen yardımcı programlar',
        aciklama: 'Yalnız gerektiğinde, bir kez çalıştırılır. Dosyaya sağ tıklayıp “PowerShell ile çalıştır” yerine yönetici PowerShell penceresinde açın.',
        dosyalar: [
            { ad: 'Güvenlik duvarı izni', dosya: 'pc_guvenlik_duvari.ps1', aciklama: 'Yalnız Wi‑Fi bağlantısında, telefon bilgisayara ulaşamıyorsa gerekir. Yerel ağ için TCP 8765 izni ekler; başka bir şeye dokunmaz.' }
        ]
    }
];
