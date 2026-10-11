'use client';

/**
 * Kart menüsündeki iki dikte düğmesi.
 * - Dikte: konuşulanlar kartın içeriğine eklenir.
 * - Köprü dikte: konuşulanlar doğrudan bağlı bilgisayara yazılır.
 * Motor, dil ve süre Uzaktan araçlar ayarlarından gelir. Aynı düğmeye tekrar
 * dokunmak dinlemeyi durdurur.
 */
import { useRef, useState } from 'react';
import { BULUT_SAGLAYICILAR, SesKaydedici, sesiYaziyaCevir } from '@/lib/bulutDikte';
import { bridgeDictate, dinleKopruDikte, metinFarkiAktar, stopBridgeDictation } from '@/lib/remoteTools';
import type { RemotePrefs } from '@/lib/remoteTools';

export type DikteDurumu = null | 'dikte' | 'kopru' | 'bitiyor';

export function useKartDikte(prefs: RemotePrefs, icerikAl: () => string, icerikYaz: (metin: string) => Promise<void>, hataGoster: (mesaj: string) => void) {
    const [durum, setDurum] = useState<DikteDurumu>(null);
    const durdur = useRef<(() => void) | null>(null);
    const prefsRef = useRef(prefs); prefsRef.current = prefs;

    const notaEkle = async (metin: string) => {
        const m = metin.trim();
        if (!m) throw new Error('Konuşma duyulmadı.');
        const eski = icerikAl();
        const ayrac = !eski ? '' : /\s$/.test(eski) ? '' : eski.includes('\n') ? ' ' : '\n';
        await icerikYaz(eski + ayrac + m);
    };

    const dikteBaslat = async () => {
        const p = prefsRef.current;
        if (p.dictationEngine === 'cloud') {
            const kaydedici = new SesKaydedici({ bolumle: false });
            await kaydedici.baslat();
            await new Promise<void>(cozum => { durdur.current = cozum; });
            setDurum('bitiyor');
            const wav = await kaydedici.bitir();
            if (!wav) throw new Error('Konuşma duyulmadı.');
            await notaEkle(await sesiYaziyaCevir(wav, p.dictationCloud, p.dictationLanguage));
            return;
        }
        durdur.current = () => { void stopBridgeDictation().catch(() => null); };
        await notaEkle(await bridgeDictate(p.dictationLanguage, p.bridgeDictationUnlimited ? 0 : p.bridgeDictationSeconds, p.dictationEngine));
    };

    const kopruBaslat = async () => {
        const p = prefsRef.current;
        const akis = { hedef: '', yazilan: '', durdu: false, calisiyor: false, coz: null as null | (() => void) };
        const dongu = async (): Promise<void> => {
            if (akis.calisiyor || akis.durdu) return;
            akis.calisiyor = true;
            try {
                while (!akis.durdu && akis.yazilan !== akis.hedef) {
                    await metinFarkiAktar(akis.hedef, akis.yazilan, prefsRef.current, yazilan => { akis.yazilan = yazilan; });
                }
            } catch (hata) {
                akis.durdu = true;
                hataGoster('Aktarım durdu: ' + (hata instanceof Error ? hata.message : 'Bağlantı hatası.'));
            } finally {
                akis.calisiyor = false;
                if (!akis.durdu && akis.yazilan !== akis.hedef) void dongu();
                else if (akis.coz) { const bitir = akis.coz; akis.coz = null; bitir(); }
            }
        };
        const hedefYaz = (yeni: string) => { akis.hedef = yeni; void dongu(); };
        const bosal = (): Promise<void> => (akis.calisiyor || (akis.yazilan !== akis.hedef && !akis.durdu))
            ? new Promise<void>(cozum => { akis.coz = cozum; }) : Promise.resolve();

        if (p.dictationEngine === 'cloud') {
            let kuyruk: Promise<void> = Promise.resolve();
            const ad = BULUT_SAGLAYICILAR.find(b => b.id === p.dictationCloud)?.ad ?? 'Bulut';
            const kaydedici = new SesKaydedici({
                bolumle: true,
                onParca: wav => {
                    kuyruk = kuyruk.then(async () => {
                        const metin = await sesiYaziyaCevir(wav, p.dictationCloud, p.dictationLanguage);
                        if (metin) hedefYaz(akis.hedef ? akis.hedef + (/\s$/.test(akis.hedef) ? '' : ' ') + metin : metin);
                    }).catch(hata => hataGoster(hata instanceof Error ? hata.message : ad + ' hatası.'));
                }
            });
            await kaydedici.baslat();
            await new Promise<void>(cozum => {
                durdur.current = cozum;
                if (!p.bridgeDictationUnlimited) setTimeout(cozum, p.bridgeDictationSeconds * 1000);
            });
            setDurum('bitiyor');
            await kaydedici.bitir().catch(() => null);
            await kuyruk;
            await bosal();
            return;
        }
        const tanitici = await dinleKopruDikte(olay => hedefYaz(prefsRef.current.bridgeDictationLive ? olay.text : olay.kesin));
        durdur.current = () => { void stopBridgeDictation().catch(() => null); };
        try {
            hedefYaz(await bridgeDictate(p.dictationLanguage, p.bridgeDictationUnlimited ? 0 : p.bridgeDictationSeconds, p.dictationEngine));
            await bosal();
        } finally { if (tanitici) await tanitici.remove(); }
    };

    /** Düğmeye dokunuş: kapalıysa başlatır, açıksa durdurur. */
    const degistir = (mod: 'dikte' | 'kopru') => {
        if (durum === 'bitiyor') return;
        if (durum) { durdur.current?.(); setDurum('bitiyor'); return; }
        setDurum(mod);
        void (mod === 'dikte' ? dikteBaslat() : kopruBaslat())
            .catch(hata => { try { navigator.vibrate?.(30); } catch { } hataGoster(hata instanceof Error ? hata.message : 'Dikte başlatılamadı.'); })
            .finally(() => { durdur.current = null; setDurum(null); });
    };
    return { durum, degistir };
}

