/**
 * Arayüz tercihleri: editördeki bölümlerin gösterilip gösterilmeyeceği.
 *
 * Kullanıcı ayarlardan "Yapay zekâ" veya "Araçlar" bölümünü kapatabilir;
 * kapalı bölüm metin editöründe hiç görünmez, böylece arayüz sade kalır.
 */
import { bildir } from './degisim';

export type Bolum = 'yapayzeka' | 'araclar';

const ANAHTARLAR: Record<Bolum, string> = {
    yapayzeka: 'nb-ai-section',
    araclar: 'nb-tools-section'
};

/** Bölüm açık mı? Kayıt yoksa açıktır. */
export function bolumAcik(bolum: Bolum): boolean {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(ANAHTARLAR[bolum]) !== '0';
}

export function bolumAcikliginiAyarla(bolum: Bolum, acik: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ANAHTARLAR[bolum], acik ? '1' : '0');
    bildir('bolumler');
}
