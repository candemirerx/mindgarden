/**
 * Tema yönetimi: Açık / Koyu / Sistem.
 *
 * Koyu tema, app/globals.css içindeki renk ölçeklerinin (.dark) ters
 * çevrilmesiyle çalışır; burada yalnızca <html> üzerindeki sınıf, tarayıcı
 * renk şeması, tema rengi meta etiketi ve Android durum çubuğu yönetilir.
 */

export type Tema = 'acik' | 'koyu' | 'sistem';

export const TEMA_ANAHTARI = 'nb-tema';

/** Açık/koyu tema için zemin renkleri (durum çubuğu ve tema rengi). */
export const ACIK_ZEMIN = '#F6F3EE';
export const KOYU_ZEMIN = '#14110E';

/**
 * İlk boyamadan önce çalışan betik. Tema tercihini localStorage'dan okur ve
 * <html> üzerine uygular; böylece koyu temada beyaz ekran parlaması olmaz.
 */
export const temaBaslatmaBetigi =
    "(function(){try{var a=localStorage.getItem('nb-tema');" +
    "var k=a==='koyu'||(a!=='acik'&&window.matchMedia('(prefers-color-scheme: dark)').matches);" +
    "var r=document.documentElement;if(k){r.classList.add('dark');}" +
    "r.style.colorScheme=k?'dark':'light';" +
    "var m=document.querySelector('meta[name=\"theme-color\"]');" +
    "if(m){m.setAttribute('content',k?'" + KOYU_ZEMIN + "':'" + ACIK_ZEMIN + "');}}catch(e){}})();";

const aboneler = new Set<(koyu: boolean) => void>();

/** Kayıtlı tercih; kayıt yoksa 'sistem'. */
export function temaOku(): Tema {
    if (typeof window === 'undefined') return 'sistem';
    const deger = window.localStorage.getItem(TEMA_ANAHTARI);
    return deger === 'acik' || deger === 'koyu' ? deger : 'sistem';
}

/** İşletim sistemi koyu tema mı istiyor? */
export function sistemKoyuMu(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Verilen tercihe göre koyu tema etkin mi? */
export function koyuMu(tema: Tema = temaOku()): boolean {
    return tema === 'koyu' || (tema === 'sistem' && sistemKoyuMu());
}

/**
 * Temayı belgeye uygular ve abonelere haber verir.
 * @returns koyu tema etkinse true
 */
export function temaUygula(tema: Tema = temaOku()): boolean {
    if (typeof window === 'undefined') return false;
    const koyu = koyuMu(tema);
    const kok = document.documentElement;
    kok.classList.toggle('dark', koyu);
    kok.style.colorScheme = koyu ? 'dark' : 'light';

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', koyu ? KOYU_ZEMIN : ACIK_ZEMIN);

    void durumCubuguGuncelle(koyu);
    aboneler.forEach((bildir) => bildir(koyu));
    return koyu;
}

/** Tercihi kaydeder ve hemen uygular. */
export function temaAyarla(tema: Tema): void {
    if (typeof window === 'undefined') return;
    if (tema === 'sistem') window.localStorage.removeItem(TEMA_ANAHTARI);
    else window.localStorage.setItem(TEMA_ANAHTARI, tema);
    temaUygula(tema);
}

/**
 * Sistem teması değişimini ve diğer sekmelerdeki tercih değişikliklerini
 * izler. Dönen fonksiyon izlemeyi bırakır.
 */
export function temaDegisiminiIzle(): () => void {
    if (typeof window === 'undefined') return () => {};
    const sorgu = window.matchMedia('(prefers-color-scheme: dark)');
    const sistemDegisti = () => {
        if (temaOku() === 'sistem') temaUygula('sistem');
    };
    const depoDegisti = (olay: StorageEvent) => {
        if (olay.key === TEMA_ANAHTARI || olay.key === null) temaUygula();
    };
    sorgu.addEventListener('change', sistemDegisti);
    window.addEventListener('storage', depoDegisti);
    return () => {
        sorgu.removeEventListener('change', sistemDegisti);
        window.removeEventListener('storage', depoDegisti);
    };
}

/** Tema değişimlerine abone olur; dönen fonksiyon aboneliği kaldırır. */
export function temaAboneGec(geriCagri: (koyu: boolean) => void): () => void {
    aboneler.add(geriCagri);
    return () => {
        aboneler.delete(geriCagri);
    };
}

/**
 * Android durum çubuğunu tema ile eşitler. Capacitor yoksa (tarayıcı)
 * sessizce atlanır.
 */
async function durumCubuguGuncelle(koyu: boolean): Promise<void> {
    try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.getPlatform() !== 'android') return;
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        // Capacitor'da Style.Dark = koyu zemin üzerine açık içerik.
        await StatusBar.setStyle({ style: koyu ? Style.Dark : Style.Light });
        await StatusBar.setBackgroundColor({ color: koyu ? KOYU_ZEMIN : ACIK_ZEMIN });
    } catch {
        /* Tarayıcıda veya eklenti yoksa yoksay */
    }
}

