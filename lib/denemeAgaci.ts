/**
 * Ayarlardan "deneme ağacı"na geçiş.
 *
 * Bağlantı ya da yapay zekâ kurulduktan sonra kullanıcı ayarlardan tek
 * dokunuşla bir notta denesin diye editör "deneme" modunda açılır
 * (/editor?deneme=baglanti). Deneme notu hiçbir bahçeye yazılmaz: bellekte
 * durur, bahçe listesinde, dışa aktarmada ve Drive yedeğinde görünmez, çıkınca
 * kaybolur ve her açılışta temiz metinle başlar. Editör ilgili araç bölümü açık
 * ve o sekme seçili açılır.
 */
import { aracSekmesiniKaydet, bolumAcikliginiAyarla } from './uiPrefs';

export type DenemeTuru = 'baglanti' | 'yapayzeka' | 'hepsi';

export const DENEME_AGACLARI: Record<DenemeTuru, { baslik: string; metin: string; bolum?: 'bilgisayar' | 'yapayzeka'; sekme: 'tools' | 'computer' | 'ai' }> = {
    hepsi: {
        baslik: 'Deneme ağacı',
        metin: 'Bu not her şeyi denemek içindir; kaydedilmez, çıkınca kaybolur. Üstteki sekmelerde tüm araçlar açık: yerel araçlar, bilgisayar araçları ve yapay zekâ.\n\nyarın sabah toplanti saat dokuzda başlıcak, herkezin raporunu getirmesi gerekiyo.\n\nYerel araçlarla metni düzenleyin, yapay zekâ ile yukarıdaki hatalı cümleyi düzeltin, bilgisayar araçlarıyla bu metni bilgisayara yazdırın ya da panoya gönderin. Sol alttaki simgelerle mini galeriyi deneyin.\n\nTürkçe karakter denemesi: çğıöşü ÇĞİÖŞÜ',
        sekme: 'tools'
    },
    baglanti: {
        baslik: 'Bağlantı deneme',
        metin: 'Bu not bilgisayar araçlarını denemek içindir; kaydedilmez, çıkınca kaybolur.\n\nBilgisayarda Not Defteri gibi bir yazı alanına tıklayın, sonra aşağıdaki araçlardan Bilgisayara yaz ya da PC panosu ile bu metni gönderin. Fare, kısayollar ve Köprü Dikte de buradan denenebilir.\n\nTürkçe karakter denemesi: çğıöşü ÇĞİÖŞÜ',
        bolum: 'bilgisayar',
        sekme: 'computer'
    },
    yapayzeka: {
        baslik: 'Yapay zekâ deneme',
        metin: 'Bu not yapay zekâ makrolarını denemek içindir; kaydedilmez, çıkınca kaybolur.\n\nyarın sabah toplanti saat dokuzda başlıcak, herkezin raporunu getirmesi gerekiyo. ayrıca bütçe konusuda konuşulucak ve yeni proje için görev dağılımı yapılıcak.\n\nYukarıdaki paragrafta bilerek yazım hataları var. AI satırından İmla Düzelt, Özetle ya da Resmileştir makrosuna dokunun; sonucu Onayla ile kabul edin, Geri Al ile vazgeçin.',
        bolum: 'yapayzeka',
        sekme: 'ai'
    }
};

/** Adres parametresindeki deneme türü geçerliyse döndürür. */
export function denemeTuru(deger: string | null | undefined): DenemeTuru | null {
    return deger === 'baglanti' || deger === 'yapayzeka' || deger === 'hepsi' ? deger : null;
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
