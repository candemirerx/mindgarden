/**
 * Makro düğmelerinin ortak çalıştırıcısı.
 *
 * Sıralı makronun çalışma biçimine göre (tek, sayılı, anahtar, basılı tut)
 * makroyu bir ya da birçok tur çalıştırır. Çalışan makrolar modül düzeyinde
 * tutulur: aynı makronun düğmesi panoda, ekran düzeninde ve ayarlarda aynı
 * durumu (çalışıyor, kaçıncı tur) gösterir; herhangi birinden durdurulabilir.
 */
import { useSyncExternalStore } from 'react';
import { TEKRAR_SINIRI, TUR_ARASI_SINIRI, durdurulabilirBekle, runRemoteMacro, type MakroCalisma, type RemoteMacro, type RemotePrefs } from './remoteTools';

export type MakroDurumu = { tur: number; toplam: number | null; calisma: MakroCalisma };

/** Turlar arası en kısa ara: bekleme verilmemiş anahtar/basılı makro bilgisayarı boğmasın. */
const EN_KISA_TUR_ARASI = 150;

const calisanlar = new Map<string, MakroDurumu & { durdur: boolean }>();
const dinleyiciler = new Set<() => void>();
let anlik: ReadonlyMap<string, MakroDurumu> = new Map();
function haberVer() {
    anlik = new Map([...calisanlar].map(([id, d]) => [id, { tur: d.tur, toplam: d.toplam, calisma: d.calisma }]));
    dinleyiciler.forEach(f => f());
}

export function makroCalismasi(makro: RemoteMacro): MakroCalisma {
    return makro.type === 'sequence' ? makro.calisma ?? 'tek' : 'tek';
}
export function makroTekrari(makro: RemoteMacro): number {
    const n = Math.round(Number(makro.tekrar ?? 3));
    return Number.isFinite(n) ? Math.min(TEKRAR_SINIRI.max, Math.max(TEKRAR_SINIRI.min, n)) : 3;
}
function turArasi(makro: RemoteMacro): number {
    const ms = Math.round(Number(makro.turArasi ?? 0));
    return Math.max(EN_KISA_TUR_ARASI, Number.isFinite(ms) ? Math.min(TUR_ARASI_SINIRI.max, ms) : 0);
}

export function makroCalisiyor(id: string): boolean { return calisanlar.has(id); }

/** Çalışan makroyu bir sonraki adım sınırında durdurur (bekleme varsa hemen). */
export function makroyuDurdur(id: string) {
    const d = calisanlar.get(id);
    if (d) d.durdur = true;
}
export function tumMakrolariDurdur() { calisanlar.forEach(d => { d.durdur = true; }); }

/**
 * Makroyu çalışma biçimine göre başlatır ve bitene (ya da durdurulana) kadar
 * bekler. Aynı makro zaten çalışıyorsa yeniden başlatmaz.
 * tek: bir tur · sayili: tekrar kadar · anahtar/basili: durdurulana kadar.
 */
export async function makroyuBaslat(makro: RemoteMacro, prefs: RemotePrefs): Promise<void> {
    if (calisanlar.has(makro.id)) return;
    const calisma = makroCalismasi(makro);
    const toplam = calisma === 'tek' ? 1 : calisma === 'sayili' ? makroTekrari(makro) : null;
    const durum = { tur: 0, toplam, calisma, durdur: false };
    calisanlar.set(makro.id, durum);
    haberVer();
    const durdu = () => durum.durdur;
    try {
        while (!durum.durdur && (toplam === null || durum.tur < toplam)) {
            if (durum.tur > 0) {
                await durdurulabilirBekle(turArasi(makro), durdu);
                if (durum.durdur) break;
            }
            durum.tur++;
            haberVer();
            await runRemoteMacro(makro, prefs, [], durdu);
        }
    } finally {
        calisanlar.delete(makro.id);
        haberVer();
    }
}

function abone(f: () => void) { dinleyiciler.add(f); return () => { dinleyiciler.delete(f); }; }
const bos: ReadonlyMap<string, MakroDurumu> = new Map();

/** Makronun canlı durumu; çalışmıyorsa null. */
export function useMakroDurumu(id: string): MakroDurumu | null {
    const harita = useSyncExternalStore(abone, () => anlik, () => bos);
    return harita.get(id) ?? null;
}

/** Çalışma biçiminin kısa adı (düğme ipucu ve ayar özetinde). */
export function calismaMetni(makro: RemoteMacro): string {
    const c = makroCalismasi(makro);
    return c === 'sayili' ? makroTekrari(makro) + ' kez' : c === 'anahtar' ? 'aç/kapa' : c === 'basili' ? 'basılı tut' : '';
}
