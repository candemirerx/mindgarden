/**
 * Ayarlardan "deneme ağacı"na geçiş.
 *
 * Bağlantı ya da yapay zekâ kurulduktan sonra kullanıcı ayarlardan tek
 * dokunuşla gerçek bir notta denesin diye "Deneme" bahçesinde sabit adlı bir
 * ağaç açılır (yoksa oluşturulur, varsa aynısı kullanılır). Editör ilgili araç
 * bölümü açık ve o sekme seçili olarak açılır.
 */
import { supabase } from './supabaseClient';
import { aracSekmesiniKaydet, bolumAcikliginiAyarla } from './uiPrefs';

export type DenemeTuru = 'baglanti' | 'yapayzeka';

const BAHCE_ADI = 'Deneme';

const AGACLAR: Record<DenemeTuru, { baslik: string; metin: string; bolum: 'bilgisayar' | 'yapayzeka'; sekme: 'computer' | 'ai' }> = {
    baglanti: {
        baslik: 'Bağlantı deneme',
        metin: 'Bu not bilgisayar araçlarını denemek içindir.\n\nBilgisayarda Not Defteri gibi bir yazı alanına tıklayın, sonra aşağıdaki araçlardan Bilgisayara yaz ya da PC panosu ile bu metni gönderin. Fare, kısayollar ve Köprü Dikte de buradan denenebilir.\n\nTürkçe karakter denemesi: çğıöşü ÇĞİÖŞÜ',
        bolum: 'bilgisayar',
        sekme: 'computer'
    },
    yapayzeka: {
        baslik: 'Yapay zekâ deneme',
        metin: 'Bu not yapay zekâ makrolarını denemek içindir.\n\nyarın sabah toplanti saat dokuzda başlıcak, herkezin raporunu getirmesi gerekiyo. ayrıca bütçe konusuda konuşulucak ve yeni proje için görev dağılımı yapılıcak.\n\nYukarıdaki paragrafta bilerek yazım hataları var. AI satırından İmla Düzelt, Özetle ya da Resmileştir makrosuna dokunun; sonucu Onayla ile kabul edin, Geri Al ile vazgeçin.',
        bolum: 'yapayzeka',
        sekme: 'ai'
    }
};

/**
 * Deneme ağacını hazırlar ve editör adresini döndürür. Oturum yoksa (giriş
 * yapılmamış, yerel moda da girilmemiş) açıklayıcı bir hata verir.
 */
export async function denemeAgaciAdresi(tur: DenemeTuru): Promise<string> {
    const agac = AGACLAR[tur];
    const { data: oturum } = await supabase.auth.getSession();
    const kullanici = oturum.session?.user;
    if (!kullanici) throw new Error('Önce giriş yapın ya da "Yerel Modda Gir" ile uygulamaya girin.');

    const simdi = new Date().toISOString();
    const { data: bahceler, error: bahceHata } = await supabase.from('gardens').select('*').eq('name', BAHCE_ADI).is('deleted_at', null);
    if (bahceHata) throw new Error('Deneme bahçesi okunamadı: ' + bahceHata.message);
    let bahceId = (bahceler as Array<{ id: string }> | null)?.[0]?.id;
    if (!bahceId) {
        const { data, error } = await supabase.from('gardens')
            .insert([{ name: BAHCE_ADI, user_id: kullanici.id, updated_at: simdi, deleted_at: null }]).select().single();
        if (error || !data) throw new Error('Deneme bahçesi oluşturulamadı: ' + (error?.message ?? 'bilinmeyen hata'));
        bahceId = (data as { id: string }).id;
    }

    const { data: dugumler, error: dugumHata } = await supabase.from('nodes').select('*').eq('garden_id', bahceId).is('deleted_at', null);
    if (dugumHata) throw new Error('Deneme ağacı okunamadı: ' + dugumHata.message);
    let dugumId = (dugumler as Array<{ id: string; content: string; parent_id: string | null }> | null)
        ?.find(d => !d.parent_id && (d.content ?? '').split('\n')[0].trim() === agac.baslik)?.id;
    if (!dugumId) {
        const { data, error } = await supabase.from('nodes').insert([{
            garden_id: bahceId, parent_id: null, content: agac.baslik + '\n' + agac.metin,
            position_x: tur === 'baglanti' ? 120 : 420, position_y: 160, is_expanded: true, updated_at: simdi, deleted_at: null
        }]).select().single();
        if (error || !data) throw new Error('Deneme ağacı oluşturulamadı: ' + (error?.message ?? 'bilinmeyen hata'));
        dugumId = (data as { id: string }).id;
    }

    // Editör ilgili bölüm açık ve o sekme seçili açılsın.
    bolumAcikliginiAyarla(agac.bolum, true);
    aracSekmesiniKaydet(agac.sekme);
    return `/editor?id=${encodeURIComponent(bahceId)}&nodeId=${encodeURIComponent(dugumId)}`;
}
