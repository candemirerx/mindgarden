/**
 * Arayüz tercihleri: editördeki bölümlerin gösterilip gösterilmeyeceği.
 *
 * Uygulama sade bir yazı ekranıyla açılsın diye "Yapay zekâ" ve "Araçlar"
 * bölümleri varsayılan olarak kapalıdır. Kullanıcı bunları Ayarlar →
 * Düzenleme araçları bölümünden açar; kapalı bölüm editörde hiç görünmez.
 */
import { bildir } from './degisim';

export type Bolum = 'yapayzeka' | 'araclar';

const ANAHTARLAR: Record<Bolum, string> = {
    yapayzeka: 'nb-ai-section',
    araclar: 'nb-tools-section'
};

/** Bölüm açık mı? Kayıt yoksa kapalıdır; editör sade açılır. */
export function bolumAcik(bolum: Bolum): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(ANAHTARLAR[bolum]) === '1';
}

export function bolumAcikliginiAyarla(bolum: Bolum, acik: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ANAHTARLAR[bolum], acik ? '1' : '0');
    bildir('bolumler');
}
