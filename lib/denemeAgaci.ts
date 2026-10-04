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

export type DenemeTuru = 'baglanti' | 'yapayzeka';

export const DENEME_AGACLARI: Record<DenemeTuru, { baslik: string; metin: string; bolum: 'bilgisayar' | 'yapayzeka'; sekme: 'computer' | 'ai' }> = {
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
    return deger === 'baglanti' || deger === 'yapayzeka' ? deger : null;
}

/** Deneme modunda açılacak editör adresini hazırlar (ilgili bölüm ve sekme açılır). */
export async function denemeAgaciAdresi(tur: DenemeTuru): Promise<string> {
    const agac = DENEME_AGACLARI[tur];
    bolumAcikliginiAyarla(agac.bolum, true);
    aracSekmesiniKaydet(agac.sekme);
    return `/editor?deneme=${tur}`;
}
