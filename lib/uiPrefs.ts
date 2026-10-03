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

/** Tuvalde ve proje listesinde budanmış notların nasıl gösterileceği. */
export type BudamaModu = 'dahil' | 'gizle' | 'sadece';

/** Kayıt yoksa budananlar dahil gösterilir; eski '1'/'0' kayıtları dahil/gizle olarak okunur. */
export function budamaModu(): BudamaModu {
    if (typeof window === 'undefined') return 'dahil';
    const kayit = localStorage.getItem(BUDANANLAR_ANAHTARI);
    return kayit === '0' ? 'gizle' : kayit === 'sadece' ? 'sadece' : 'dahil';
}

export function budamaModuAyarla(mod: BudamaModu): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(BUDANANLAR_ANAHTARI, mod === 'gizle' ? '0' : mod === 'sadece' ? 'sadece' : '1');
    bildir('budananlar');
}

/** Budanmış notları, alt dallarıyla birlikte ağaçtan çıkarır; veriye dokunmaz. */
export function budananlariAyikla<T extends { isPruned?: boolean; children: T[] }>(agaclar: T[]): T[] {
    return agaclar
        .filter(dugum => !dugum.isPruned)
        .map(dugum => ({ ...dugum, children: budananlariAyikla(dugum.children) }));
}

/**
 * Yalnızca budanmış notları bırakır. Budanan not alt dallarıyla birlikte kalır;
 * yerinin görünmesi için ataları da korunur, budanan içermeyen dallar çıkar.
 */
export function yalnizBudananlar<T extends { isPruned?: boolean; children: T[] }>(agaclar: T[]): T[] {
    return agaclar.flatMap(dugum => {
        if (dugum.isPruned) return [dugum];
        const children = yalnizBudananlar(dugum.children);
        return children.length > 0 ? [{ ...dugum, children }] : [];
    });
}

export function budamaFiltresi<T extends { isPruned?: boolean; children: T[] }>(agaclar: T[], mod: BudamaModu): T[] {
    return mod === 'gizle' ? budananlariAyikla(agaclar) : mod === 'sadece' ? yalnizBudananlar(agaclar) : agaclar;
}
