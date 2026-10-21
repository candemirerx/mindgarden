/**
 * Kullanım kılavuzunun ilerlemesi ve "Bana göster" istekleri.
 *
 * Yaparak öğrenme: dersler, kullanıcı o işi uygulamada gerçekten yaptığında
 * kendiliğinden tamamlanır (bahçe oluşturmak, Tuval'e geçmek, not eklemek…).
 * Bu modül bağımlılıksızdır; depo, tema, tuval tercihleri ve bağlantı
 * modülleri başarı anında `dersTamamla` çağırır. Kılavuz ve bildirim katmanı
 * ILERLEME_OLAYI'nı dinleyerek güncellenir.
 *
 * Uygulamalı öğrenim: görevler (bkz. kilavuzGorevleri) kullanıcıyı gerçek
 * ekranlarda adım adım yürütür. Bir adım, kullanıcı o işi yaptığında ilerler;
 * bunu EYLEM_OLAYI'ndan anlar. Bu olay ders zaten tamamlanmış olsa da her
 * başarılı işte yayınlanır (ikinci bahçeyi kurmak da görevi ilerletmeli).
 *
 * İlerleme bu cihazda (localStorage) saklanır; depolama yoksa sessizce atlanır.
 */

export const ILERLEME_ANAHTARI = 'nb-kilavuz-ilerleme-v1';
export const ILERLEME_OLAYI = 'nb-kilavuz-ilerleme';
export const GOSTER_ANAHTARI = 'nb-kilavuz-goster';
export const GOSTER_OLAYI = 'nb-kilavuz-goster';
const SON_BAHCE_ANAHTARI = 'nb-son-bahce';
const GORULEN_EKRANLAR_ANAHTARI = 'nb-kilavuz-ekranlar';
export const EYLEM_OLAYI = 'nb-kilavuz-eylem';
/** Yürüyen görev oturum deposunda durur: ekran değişse de (tam yenilemede bile) kaldığı adımdan sürer. */
const AKTIF_GOREV_ANAHTARI = 'nb-kilavuz-gorev';
export const GOREV_OLAYI = 'nb-kilavuz-gorev';
const BITEN_GOREVLER_ANAHTARI = 'nb-kilavuz-gorevler-v1';

export type IlerlemeOlayi = { id: string; tamam: boolean; otomatik: boolean };
export type AktifGorev = { id: string; adim: number };

/** Ders, "Bana göster" ile açılan ekran ve o ekranda vurgulanacak öğe. */
export type KilavuzGoster = {
    ekran: 'ana' | 'liste' | 'tuval';
    /** CSS seçici; bulunamazsa açıklama kartı ekranın ortasında çıkar. */
    hedef: string;
    baslik: string;
    metin: string;
};

export function ogrenilenler(): string[] {
    try {
        const ham = JSON.parse(localStorage.getItem(ILERLEME_ANAHTARI) || '[]');
        return Array.isArray(ham) ? ham.filter((x): x is string => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

/**
 * Dersin tamamlanma durumunu yazar. Durum değişmediyse hiçbir şey yapmaz;
 * böylece aynı işi tekrar yapmak bildirimi yinelemez.
 * @param otomatik Kullanıcı işi uygulamada yaptığı için mi tamamlandı (bildirim gösterilir)?
 */
export function dersDurumu(id: string, tamam: boolean, otomatik = false): void {
    if (typeof window === 'undefined') return;
    const liste = ogrenilenler();
    if (liste.includes(id) === tamam) return;
    const yeni = tamam ? [...liste, id] : liste.filter((x) => x !== id);
    try { localStorage.setItem(ILERLEME_ANAHTARI, JSON.stringify(yeni)); } catch { return; }
    window.dispatchEvent(new CustomEvent<IlerlemeOlayi>(ILERLEME_OLAYI, { detail: { id, tamam, otomatik } }));
}

/** Uygulamada bir iş başarıyla yapıldığında ilgili dersi tamamlar. */
export function dersTamamla(id: string): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<{ id: string }>(EYLEM_OLAYI, { detail: { id } }));
    dersDurumu(id, true, true);
}

/**
 * Derse bağlı olmayan bir işi uygulamalı göreve bildirir (ör. tuvali kaydırmak).
 * İlerleme yazılmaz; yalnız yürüyen görevin adımı ilerleyebilir.
 */
export function kilavuzEylemi(id: string): void {
    if (typeof window === 'undefined' || !gorevYuruyor()) return;
    window.dispatchEvent(new CustomEvent<{ id: string }>(EYLEM_OLAYI, { detail: { id } }));
}

/** Rehber, ekran dışındaki bir kartı tuvalin ortasına getirmesini ister (detail: not kimliği). */
export const TUVAL_ORTALA_OLAYI = 'nb-tuval-ortala';

/** Şu anki ekran (yol adı); statik pakette `/projeler.html` gibi uzantılar da olabilir. */
export function ekranAdi(): 'ana' | 'liste' | 'tuval' | 'editor' | 'diger' {
    if (typeof window === 'undefined') return 'diger';
    const yol = window.location.pathname.replace(/\.html$/, '').replace(/\/+$/, '');
    if (yol === '' || yol === '/index') return 'ana';
    if (yol.endsWith('/projeler')) return 'liste';
    if (yol.endsWith('/bahce_view')) return 'tuval';
    if (yol.endsWith('/editor')) return 'editor';
    return 'diger';
}

/** Liste ya da Tuval açıldığında çağrılır: son bahçeyi hatırlar, iki ekranı da gören kullanıcının dersini tamamlar. */
export function bahceEkraniAcildi(ekran: 'liste' | 'tuval', bahceId: string): void {
    try {
        localStorage.setItem(SON_BAHCE_ANAHTARI, bahceId);
        const gorulen = new Set<string>(JSON.parse(localStorage.getItem(GORULEN_EKRANLAR_ANAHTARI) || '[]'));
        gorulen.add(ekran);
        localStorage.setItem(GORULEN_EKRANLAR_ANAHTARI, JSON.stringify([...gorulen]));
        if (gorulen.has('liste') && gorulen.has('tuval')) dersTamamla('b-iki-ekran');
    } catch { /* depolama yoksa yalnız ilerleme kaydedilmez */ }
}

export function sonBahce(): string | null {
    try { return localStorage.getItem(SON_BAHCE_ANAHTARI); } catch { return null; }
}

/** Son açılan bahçenin Liste ya da Tuval adresi; henüz bahçe açılmadıysa null. */
export function bahceAdresi(ekran: 'liste' | 'tuval'): string | null {
    const bahce = sonBahce();
    return bahce ? (ekran === 'liste' ? '/projeler?id=' : '/bahce_view?id=') + encodeURIComponent(bahce) : null;
}

/** "Bana göster": hangi adrese gidileceğini döndürür ve vurgu isteğini bırakır. */
export function gosterIstegi(goster: KilavuzGoster): string {
    ogrenmeOturumuBaslat();
    let istek = goster;
    let adres = '/';
    if (goster.ekran !== 'ana') {
        const bahceEkrani = bahceAdresi(goster.ekran);
        if (bahceEkrani) {
            adres = bahceEkrani;
        } else {
            // Henüz açılmış bir bahçe yok: önce bahçe oluşturmayı göster.
            istek = {
                ekran: 'ana',
                hedef: '[data-tur="yeni-bahce"]',
                baslik: 'Önce bir bahçe oluşturun',
                metin: 'Bu dersi göstermek için bir bahçe gerekiyor. Yeni Bahçe ile bir tane açın, sonra kılavuzdaki Bana göster\'e yeniden dokunun.',
            };
        }
    }
    try { sessionStorage.setItem(GOSTER_ANAHTARI, JSON.stringify(istek)); } catch { /* olay yine taşır */ }
    window.dispatchEvent(new CustomEvent<KilavuzGoster>(GOSTER_OLAYI, { detail: istek }));
    return adres;
}

/** Bekleyen vurgu isteğini bir kez okur ve siler. */
export function bekleyenGoster(): KilavuzGoster | null {
    try {
        const ham = sessionStorage.getItem(GOSTER_ANAHTARI);
        sessionStorage.removeItem(GOSTER_ANAHTARI);
        return ham ? (JSON.parse(ham) as KilavuzGoster) : null;
    } catch {
        return null;
    }
}

export function aktifGorev(): AktifGorev | null {
    try {
        const ham = JSON.parse(sessionStorage.getItem(AKTIF_GOREV_ANAHTARI) || 'null');
        return ham && typeof ham.id === 'string' && Number.isInteger(ham.adim) ? ham : null;
    } catch {
        return null;
    }
}

/** Yürüyen görevi yazar (null: görev bitti ya da bırakıldı) ve rehbere haber verir. */
export function aktifGorevYaz(gorev: AktifGorev | null): void {
    try {
        if (gorev) sessionStorage.setItem(AKTIF_GOREV_ANAHTARI, JSON.stringify(gorev));
        else sessionStorage.removeItem(AKTIF_GOREV_ANAHTARI);
    } catch { /* olay yine taşır */ }
    window.dispatchEvent(new CustomEvent<AktifGorev | null>(GOREV_OLAYI, { detail: gorev }));
}

/**
 * Görevi başlatır ve gidilecek adresi döndürür. Liste/Tuval görevinde henüz
 * açılmış bahçe yoksa ana ekrana döner; rehber orada bahçe açmayı gösterir.
 */
export function gorevBaslat(id: string, baslangic: 'ana' | 'liste' | 'tuval'): string {
    ogrenmeOturumuBaslat();
    aktifGorevYaz({ id, adim: 0 });
    return (baslangic === 'ana' ? null : bahceAdresi(baslangic)) ?? '/';
}

export function bitenGorevler(): string[] {
    try {
        const ham = JSON.parse(localStorage.getItem(BITEN_GOREVLER_ANAHTARI) || '[]');
        return Array.isArray(ham) ? ham.filter((x): x is string => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

export function gorevTamamlandi(id: string): void {
    const liste = bitenGorevler();
    if (liste.includes(id)) return;
    try { localStorage.setItem(BITEN_GOREVLER_ANAHTARI, JSON.stringify([...liste, id])); } catch { /* yalnız işaret kaybolur */ }
}

/** Bir görev yürüyor mu? O sırada ders bildirimleri görev kartıyla çakışmasın. */
export const gorevYuruyor = () => aktifGorev() !== null;

export type KilavuzModu = 'teori' | 'uygulama';
/** Kılavuzun son açık sekmesi (Teorik / Uygulamalı); kılavuz açılınca buradan okunur. */
export const KILAVUZ_MOD_ANAHTARI = 'nb-kilavuz-mod-v1';

/** Kılavuz bir sonraki açılışta bu sekmede açılır (ör. ayarlardaki "Uygulamalı" düğmesi). */
export function kilavuzModunuSec(mod: KilavuzModu): void {
    try { localStorage.setItem(KILAVUZ_MOD_ANAHTARI, JSON.stringify(mod)); } catch { /* kılavuz Teorik sekmede açılır */ }
}

/**
 * Öğrenme oturumu: kullanıcı kılavuzu açtı, "Bana göster"e ya da bir göreve
 * dokundu. "Ders tamamlandı" bildirimi yalnız bu oturumda (10 dakika) çıkar;
 * gündelik kullanımda dersler sessizce tamamlanır, ilerleme kılavuzda görünür.
 */
const OGRENME_OTURUMU_ANAHTARI = 'nb-kilavuz-oturum';
const OGRENME_OTURUMU_MS = 10 * 60 * 1000;

export function ogrenmeOturumuBaslat(): void {
    try { sessionStorage.setItem(OGRENME_OTURUMU_ANAHTARI, String(Date.now())); } catch { /* bildirim çıkmaz */ }
}

export function ogrenmeOturumuAcik(): boolean {
    try { return Date.now() - Number(sessionStorage.getItem(OGRENME_OTURUMU_ANAHTARI) || 0) < OGRENME_OTURUMU_MS; } catch { return false; }
}
