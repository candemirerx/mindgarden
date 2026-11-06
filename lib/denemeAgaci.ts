/**
 * Ayarlardan "deneme ağacı"na geçiş.
 *
 * Bağlantı ya da yapay zekâ kurulduktan sonra kullanıcı ayarlardan tek
 * dokunuşla bir notta denesin diye editör "deneme" modunda açılır
 * (/editor?deneme=baglanti). Deneme notu normal bahçelerden ayrı, bu cihazda
 * saklanır; bahçe listesine veya Drive yedeğine karışmaz. Yalnız son metin
 * uygulama yeniden başlayınca da korunur. Editör ilgili araç bölümü açık
 * ve o sekme seçili açılır.
 */
import { aracSekmesiniKaydet, bolumAcikliginiAyarla } from './uiPrefs';
import { useSyncExternalStore } from 'react';

export type DenemeTuru = 'baglanti' | 'yapayzeka' | 'hepsi' | 'bilge';

export const DENEME_AGACLARI: Record<DenemeTuru, { baslik: string; metin: string; bolum?: 'bilgisayar' | 'yapayzeka'; sekme: 'tools' | 'computer' | 'ai' }> = {
    bilge: { baslik: 'Bilge Ağaç notu', metin: '', sekme: 'tools' },
    hepsi: {
        baslik: 'Deneme ağacı',
        metin: 'Bu not her şeyi denemek içindir. Son bıraktığınız metin bu cihazda korunur. Üstteki sekmelerde tüm araçlar açık: yerel araçlar, bilgisayar araçları ve yapay zekâ.\n\nyarın sabah toplanti saat dokuzda başlıcak, herkezin raporunu getirmesi gerekiyo.\n\nYerel araçlarla metni düzenleyin, yapay zekâ ile yukarıdaki hatalı cümleyi düzeltin, bilgisayar araçlarıyla bu metni bilgisayara yazdırın ya da panoya gönderin. Sol alttaki simgelerle mini galeriyi deneyin.\n\nTürkçe karakter denemesi: çğıöşü ÇĞİÖŞÜ',
        sekme: 'tools'
    },
    baglanti: {
        baslik: 'Bağlantı deneme',
        metin: 'Bu not bilgisayar araçlarını denemek içindir. Son bıraktığınız metin bu cihazda korunur.\n\nBilgisayarda Not Defteri gibi bir yazı alanına tıklayın, sonra aşağıdaki araçlardan Bilgisayara yaz ya da PC panosu ile bu metni gönderin. Fare, kısayollar ve Köprü Dikte de buradan denenebilir.\n\nTürkçe karakter denemesi: çğıöşü ÇĞİÖŞÜ',
        bolum: 'bilgisayar',
        sekme: 'computer'
    },
    yapayzeka: {
        baslik: 'Yapay zekâ deneme',
        metin: 'Bu not yapay zekâ makrolarını denemek içindir. Son bıraktığınız metin bu cihazda korunur.\n\nyarın sabah toplanti saat dokuzda başlıcak, herkezin raporunu getirmesi gerekiyo. ayrıca bütçe konusuda konuşulucak ve yeni proje için görev dağılımı yapılıcak.\n\nYukarıdaki paragrafta bilerek yazım hataları var. AI satırından İmla Düzelt, Özetle ya da Resmileştir makrosuna dokunun; sonucu Onayla ile kabul edin, Geri Al ile vazgeçin.',
        bolum: 'yapayzeka',
        sekme: 'ai'
    }
};

export type DenemeYazisi = { baslik: string; metin: string; zaman: number };
const NOT_ANAHTARI = 'nb-deneme-notu-v1:';
const denemeNotlari = new Map<DenemeTuru, { baslik: string; metin: string }>();
const kayitHatalari = new Map<DenemeTuru, string>();
const dinleyiciler = new Set<() => void>();
function gecerliYazi(v: unknown): v is DenemeYazisi {
    if (!v || typeof v !== 'object') return false;
    const y = v as DenemeYazisi;
    return typeof y.baslik === 'string' && typeof y.metin === 'string' && typeof y.zaman === 'number' && Number.isFinite(y.zaman);
}
export function denemeNotuOku(tur: DenemeTuru = 'hepsi') {
    if (typeof window === 'undefined') return DENEME_AGACLARI[tur];
    if (!denemeNotlari.has(tur)) {
        try {
            const kayit: unknown = JSON.parse(localStorage.getItem(NOT_ANAHTARI + tur) || 'null');
            if (gecerliYazi(kayit)) denemeNotlari.set(tur, kayit);
        } catch { /* Bellek ve diğer notlar korunur. */ }
    }
    return denemeNotlari.get(tur) ?? DENEME_AGACLARI[tur];
}
export function denemeKayitHatasi(tur: DenemeTuru): string { return kayitHatalari.get(tur) || ''; }
export function denemeNotuYaz(tur: DenemeTuru, baslik: string, metin: string): void {
    const eski = denemeNotuOku(tur);
    if (eski.baslik === baslik && eski.metin === metin && !kayitHatalari.has(tur)) return;
    kayitHatalari.delete(tur);
    denemeNotlari.set(tur, { baslik, metin });
    try {
        localStorage.setItem(NOT_ANAHTARI + tur, JSON.stringify({ baslik, metin, zaman: Date.now() }));
    } catch { kayitHatalari.set(tur, 'Son yazınız yalnızca bellekte: cihazda saklanamadı. Çıkmadan önce metni kopyalayın.'); }
    for (const dinle of dinleyiciler) dinle();
}
const aboneOl = (dinle: () => void) => { dinleyiciler.add(dinle); return () => { dinleyiciler.delete(dinle); }; };
export function useDenemeNotu(tur: DenemeTuru = 'hepsi') { return useSyncExternalStore(aboneOl, () => denemeNotuOku(tur), () => DENEME_AGACLARI[tur]); }

/** Adres parametresindeki deneme türü geçerliyse döndürür. */
export function denemeTuru(deger: string | null | undefined): DenemeTuru | null {
    return deger === 'baglanti' || deger === 'yapayzeka' || deger === 'hepsi' || deger === 'bilge' ? deger : null;
}

/** Deneme modunda açılacak editör adresini hazırlar (ilgili bölüm ve sekme açılır). */
export async function denemeAgaciAdresi(tur: DenemeTuru): Promise<string> {
    const agac = DENEME_AGACLARI[tur];
    // "Tüm araçlar" denemesi ayarları kalıcı değiştirmez; bölümler yalnız deneme notunda açılır.
    if (agac.bolum) bolumAcikliginiAyarla(agac.bolum, true);
    aracSekmesiniKaydet(agac.sekme);
    return `/editor?deneme=${tur}`;
}

const DONUS_ANAHTARI = 'nb-ayarlara-don';

/**
 * Ayarlardan deneme ağacına geçerken hangi ayar sayfasında olunduğunu saklar;
 * deneme editöründen geri dönülünce ayarlar o sayfada yeniden açılır (ana sayfaya değil).
 */
export function ayarlaraDonSakla(bolum: string): void {
    try { sessionStorage.setItem(DONUS_ANAHTARI, JSON.stringify({ bolum, zaman: Date.now() })); } catch { /* depolama kapalı */ }
}

/** Saklanan dönüş bölümünü bir kez okur ve siler; yoksa ya da bayatsa (30 dk) null. */
export function ayarlaraDonOku(): string | null {
    try {
        const ham = sessionStorage.getItem(DONUS_ANAHTARI);
        if (!ham) return null;
        sessionStorage.removeItem(DONUS_ANAHTARI);
        const k = JSON.parse(ham) as { bolum?: string; zaman?: number };
        return k.bolum && Date.now() - (k.zaman ?? 0) < 30 * 60 * 1000 ? k.bolum : null;
    } catch { return null; }
}
