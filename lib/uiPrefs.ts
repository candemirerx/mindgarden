/**
 * Arayüz tercihleri: editördeki bölümlerin gösterilip gösterilmeyeceği.
 *
 * Uygulama sade bir yazı ekranıyla açılsın diye "Yapay zekâ" ve "Araçlar"
 * bölümleri varsayılan olarak kapalıdır. Kullanıcı bunları Ayarlar →
 * Düzenleme araçları bölümünden açar; kapalı bölüm editörde hiç görünmez.
 */
import { bildir } from './degisim';

export type Bolum = 'yapayzeka' | 'araclar' | 'bilgisayar';

const ANAHTARLAR: Record<Bolum, string> = {
    yapayzeka: 'nb-ai-section',
    araclar: 'nb-tools-section',
    bilgisayar: 'nb-computer-section'
};

/** Bölüm açık mı? Kayıt yoksa kapalıdır; editör sade açılır. */
export function bolumAcik(bolum: Bolum): boolean {
    if (typeof window === 'undefined') return false;
    const value = localStorage.getItem(ANAHTARLAR[bolum]);
    // Eski birleşik araç bölümünün tercihini bir kez taşı; sonraki seçimler bağımsızdır.
    if (bolum === 'bilgisayar' && value === null) {
        const previous = localStorage.getItem(ANAHTARLAR.araclar) === '1';
        localStorage.setItem(ANAHTARLAR.bilgisayar, previous ? '1' : '0');
        return previous;
    }
    return value === '1';
}

export function bolumAcikliginiAyarla(bolum: Bolum, acik: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ANAHTARLAR[bolum], acik ? '1' : '0');
    bildir('bolumler');
}

export type AracSekmesi = 'tools' | 'computer' | 'ai';

const SEKME_ANAHTARI = 'nb-editor-tool-tab';

/** Editörde en son seçilen araç sekmesi; kayıt yoksa Yerel araçlar. */
export function sonAracSekmesi(): AracSekmesi {
    if (typeof window === 'undefined') return 'tools';
    const value = localStorage.getItem(SEKME_ANAHTARI);
    return value === 'computer' || value === 'ai' ? value : 'tools';
}

export function aracSekmesiniKaydet(sekme: AracSekmesi): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SEKME_ANAHTARI, sekme);
}

const BUDANANLAR_ANAHTARI = 'nb-show-pruned';

/** Budanmış notlar tuvalde ve proje listesinde gösterilsin mi? Kayıt yoksa gösterilir. */
export function budananlariGoster(): boolean {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(BUDANANLAR_ANAHTARI) !== '0';
}

export function budananlariGosterAyarla(goster: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(BUDANANLAR_ANAHTARI, goster ? '1' : '0');
    bildir('budananlar');
}

/** Budanmış notları, alt dallarıyla birlikte ağaçtan çıkarır; veriye dokunmaz. */
export function budananlariAyikla<T extends { isPruned?: boolean; children: T[] }>(agaclar: T[]): T[] {
    return agaclar
        .filter(dugum => !dugum.isPruned)
        .map(dugum => ({ ...dugum, children: budananlariAyikla(dugum.children) }));
}
