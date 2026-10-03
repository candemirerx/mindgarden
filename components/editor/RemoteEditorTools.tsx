'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AudioLines, Check, Clipboard, FolderKanban, LayoutDashboard, Loader2, Keyboard, Mic, MousePointer2, Send, Wand2 } from 'lucide-react';
import { bridgeDictate, dictate, dinleKopruDikte, metinFarkiAktar, sendCommand, sendToComputerClipboard, stopBridgeDictation, typeOnComputer } from '@/lib/remoteTools';
import type { RemoteMode } from '@/lib/remoteTools';
import { useRemotePrefs } from '@/lib/useRemotePrefs';
import FareYuzeyi from './FareYuzeyi';

export default function RemoteEditorTools({ content, onContentChange, mode, onModeChange, placement, profilId = null, onProfilChange }: {
    content: string; onContentChange: (text: string) => void;
    mode: RemoteMode; onModeChange: (mode: RemoteMode) => void;
    placement: 'toolbar' | 'surface';
    /** Kısayol panosunda açık profil; null → tüm makrolar. */
    profilId?: string | null; onProfilChange?: (profilId: string | null) => void;
}) {
    const prefs = useRemotePrefs();
    const [busy, setBusy] = useState(false);
    const [bridgeListening, setBridgeListening] = useState(false);
    const [bridgeStopping, setBridgeStopping] = useState(false);
    const [kopruYaz, setKopruYaz] = useState(false);
    const [kopruDurum, setKopruDurum] = useState('');
    const [kopruHata, setKopruHata] = useState(false);
    const [notice, setNotice] = useState('');
    const [panoBildirim, setPanoBildirim] = useState<{ metin: string; ton: 'sending' | 'ok' | 'error' } | null>(null);
    const panoZamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
    /** Köprü Yaz: bilgisayara gönderilmiş metin, gönderilecek son metin ve kilitler. */
    const kopruSon = useRef('');
    const kopruHedef = useRef('');
    const kopruCalisiyor = useRef(false);
    const kopruDurdu = useRef(false);
    /** Köprü Dikte akan aktarımı: PC'ye yazılan metin, hedef metin ve kilitler. */
    const dikteAkis = useRef({ yazilan: '', hedef: '', calisiyor: false, durdu: false, coz: null as null | (() => void) });
    /** Aktarım sürerken bayat değer kullanılmaması için güncel içerik ve tercihler. */
    const guncelIcerik = useRef(content);
    guncelIcerik.current = content;
    const guncelPrefs = useRef(prefs);
    guncelPrefs.current = prefs;
    useEffect(() => {
        if (kopruYaz && (!prefs.enabledTools.bridgeWrite || (mode !== 'write' && mode !== 'dictation'))) {
            setKopruYaz(false); setKopruDurum(''); setKopruHata(false);
        }
    }, [kopruYaz, mode, prefs.enabledTools.bridgeWrite]);
    useEffect(() => {
        if (
            (mode === 'mouse' && !prefs.enabledTools.mouse) ||
            (mode === 'dictation' && !prefs.enabledTools.dictation) ||
            (mode === 'shortcuts' && !prefs.enabledTools.shortcuts) ||
            (mode === 'screen' && !prefs.enabledTools.screen)
        ) onModeChange('write');
    }, [mode, onModeChange, prefs.enabledTools.mouse, prefs.enabledTools.dictation, prefs.enabledTools.shortcuts, prefs.enabledTools.screen]);
    useEffect(() => () => { if (panoZamanlayici.current) clearTimeout(panoZamanlayici.current); }, []);
    const panoyaGonder = async () => {
        if (panoZamanlayici.current) clearTimeout(panoZamanlayici.current);
        setPanoBildirim({ metin: 'Bilgisayar panosuna gönderiliyor…', ton: 'sending' });
        let tamam = false;
        await act(async () => { await sendToComputerClipboard(content, prefs); tamam = true; }, 'Metin bilgisayar panosuna aktarıldı.');
        setPanoBildirim(tamam ? { metin: 'Bilgisayar panosuna gönderildi', ton: 'ok' } : { metin: 'Panoya gönderilemedi; ayrıntı araç çubuğunda.', ton: 'error' });
        panoZamanlayici.current = setTimeout(() => setPanoBildirim(null), tamam ? 2500 : 4000);
    };
    const act = async (action: () => Promise<void>, success: string) => {
        setBusy(true); setNotice('');
        try { await action(); setNotice(success); }
        catch (error) { setNotice(error instanceof Error ? error.message : 'İşlem başarısız.'); }
        finally { setBusy(false); }
    };
    /**
     * Köprü Dikte: konuşma sürerken bilgisayara akan aktarım.
     *
     * Android tarafı tanınan metnin son hâlini her değişimde bildirir; burada
     * yalnızca değişen kuyruk yazılır. Aktarım sürerken gelen yenilikler kuyruğa
     * girer ve tek seferde yetişir. Bağlantı koparsa durum yazısı nedeni gösterir.
     */
    const runBridgeDictation = async () => {
        setBusy(true); setBridgeListening(true); setNotice('Dinleniyor: konuştuklarınız bilgisayara yazılıyor.');
        const akis = dikteAkis.current;
        akis.yazilan = ''; akis.hedef = ''; akis.durdu = false; akis.calisiyor = false; akis.coz = null;
        const dongu = async (): Promise<void> => {
            if (akis.calisiyor || akis.durdu) return;
            akis.calisiyor = true;
            try {
                while (!akis.durdu && akis.yazilan !== akis.hedef) {
                    await metinFarkiAktar(akis.hedef, akis.yazilan, guncelPrefs.current, yazilan => {
                        akis.yazilan = yazilan;
                        // Aktarımın gerçekten konuşurken sürdüğü görünsün diye durum
                        // yazısı bilgisayara yazılan karakter sayısını gösterir.
                        setNotice('Dinleniyor · ' + Array.from(yazilan).length + ' karakter yazıldı');
                    });
                }
            } catch (error) {
                akis.durdu = true;
                setNotice('Aktarım durdu: ' + (error instanceof Error ? error.message : 'Bağlantı hatası.'));
            } finally {
                akis.calisiyor = false;
                if (!akis.durdu && akis.yazilan !== akis.hedef) void dongu();
                else if (akis.coz) { const bitir = akis.coz; akis.coz = null; bitir(); }
            }
        };
        // Aktarım bir hata yüzünden durduysa kuyruğun boşalmasını beklemek
        // anlamsızdır: hedefe hiç ulaşılamayacağı için bekleme hiç bitmiyor ve
        // düğme "Bitiriliyor…" durumunda kilitli kalıyordu.
        const bosal = (): Promise<void> => (akis.calisiyor || (akis.yazilan !== akis.hedef && !akis.durdu))
            ? new Promise<void>(cozum => { akis.coz = cozum; })
            : Promise.resolve();
        // Varsayılanda konuşulmakta olan parça da hedefe girer: söz, cümle
        // bitmeden bilgisayarda görünür. Tercih kapatıldığında yalnızca
        // kesinleşmiş cümleler aktarılır.
        const tanitici = await dinleKopruDikte(olay => {
            akis.hedef = guncelPrefs.current.bridgeDictationLive ? olay.text : olay.kesin;
            void dongu();
        });
        try {
            const metin = await bridgeDictate(prefs.dictationLanguage, prefs.bridgeDictationUnlimited ? 0 : prefs.bridgeDictationSeconds, prefs.dictationEngine);
            akis.hedef = metin;
            void dongu();
            await bosal();
            setNotice(akis.durdu
                ? 'Köprü Dikte bitti ancak aktarım tamamlanamadı; bağlantıyı kontrol edin.'
                : 'Köprü Dikte bitti; konuşma bilgisayara yazıldı, not değişmedi.');
        } catch (error) { setNotice(error instanceof Error ? error.message : 'Köprü Dikte başarısız.'); }
        finally {
            if (tanitici) await tanitici.remove();
            setBridgeListening(false); setBridgeStopping(false); setBusy(false);
        }
    };
    /**
     * Köprü Yaz: notta yazılanı bilgisayara aktarır.
     *
     * Metin ortak önekten sonraki fark kadar güncellenir; silinen karakterler
     * bilgisayarda da silinir. Aktarım sürerken yeni yazılanlar kuyruğa girer ve
     * tek seferde yetişir; bağlantı koparsa not yazılmaya devam eder.
     */
    const kopruAktar = async () => {
        if (kopruCalisiyor.current || kopruDurdu.current) return;
        kopruCalisiyor.current = true;
        try {
            while (!kopruDurdu.current && kopruSon.current !== kopruHedef.current) {
                kopruSon.current = await metinFarkiAktar(kopruHedef.current, kopruSon.current, guncelPrefs.current, yazilan => { kopruSon.current = yazilan; });
            }
            setKopruHata(false);
            setKopruDurum('Köprü Yaz açık: notta yazdıklarınız bilgisayara da yazılıyor.');
        } catch (error) {
            kopruDurdu.current = true;
            setKopruHata(true);
            setKopruDurum('Aktarım durdu: ' + (error instanceof Error ? error.message : 'Bağlantı hatası.') + ' Not çalışmaya devam eder; bağlantıyı düzeltip yeniden deneyin.');
        } finally {
            kopruCalisiyor.current = false;
            if (!kopruDurdu.current && kopruSon.current !== kopruHedef.current) void kopruAktar();
        }
    };

    /** Köprü Yaz düğmesi: açılırken o anki not gönderilmez, sonrası aktarılır. */
    const kopruYazDegistir = () => {
        setNotice('');
        setKopruHata(false);
        kopruDurdu.current = false;
        if (kopruYaz) {
            setKopruYaz(false);
            setKopruDurum('');
            return;
        }
        kopruSon.current = guncelIcerik.current;
        kopruHedef.current = guncelIcerik.current;
        setKopruYaz(true);
        setKopruDurum('Köprü Yaz açık: notta yazdıklarınız bilgisayara da yazılıyor.');
    };

    useEffect(() => {
        if (!kopruYaz) return;
        if (guncelIcerik.current === kopruSon.current) return;
        kopruHedef.current = guncelIcerik.current;
        void kopruAktar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content, kopruYaz]);

    if (placement === 'toolbar') return <>
            {prefs.enabledTools.shortcuts && (() => {
                const tumuAcik = mode === 'shortcuts' && !profilId;
                return <button id="studio-kisayollar" type="button" aria-pressed={tumuAcik} onClick={() => { onProfilChange?.(null); onModeChange(tumuAcik ? 'write' : 'shortcuts'); }}
                    title={tumuAcik ? 'Yazıya dön' : 'Kısayollar: makro panosu'} aria-label={tumuAcik ? 'Yazıya dön' : 'Kısayollar'}
                    className={`btn h-11 w-11 shrink-0 p-0 ${tumuAcik ? 'border border-moss-700 bg-moss-100 text-moss-800 hover:bg-moss-200' : 'btn-primary'}`}>
                    {tumuAcik ? <Keyboard size={17} aria-hidden="true" /> : <Wand2 size={17} aria-hidden="true" />}</button>;
            })()}
            {prefs.enabledTools.shortcuts && prefs.shortcutButtons.filter(dugme => prefs.profiles.some(p => p.id === dugme.profileId)).map((dugme, index) => {
                const acik = mode === 'shortcuts' && profilId === dugme.profileId;
                const ad = dugme.name.trim() || prefs.profiles.find(p => p.id === dugme.profileId)?.name || 'Profil';
                return <button key={dugme.id} id={'studio-kisayol-dugmesi-' + index} type="button" aria-pressed={acik} title={acik ? 'Yazıya dön' : ad + ' profilinin makroları'} aria-label={acik ? 'Yazıya dön' : ad + ' profili'}
                    onClick={() => { if (acik) onModeChange('write'); else { onProfilChange?.(dugme.profileId); onModeChange('shortcuts'); } }}
                    className={`btn relative h-11 w-11 shrink-0 p-0 ${acik ? 'border border-moss-700 bg-moss-100 text-moss-800 hover:bg-moss-200' : 'btn-secondary'}`}>
                    {acik ? <Keyboard size={17} aria-hidden="true" /> : <FolderKanban size={17} aria-hidden="true" />}
                    <span aria-hidden="true" className="pointer-events-none absolute bottom-0.5 right-1 text-[10px] font-bold leading-none">{ad.charAt(0).toLocaleUpperCase('tr')}</span></button>;
            })}
            {prefs.enabledTools.screen && <button id="studio-ekran" type="button" aria-pressed={mode === 'screen'} onClick={() => onModeChange(mode === 'screen' ? 'write' : 'screen')}
                title="Ekran: tasarladığın bölmeli düzen"
                className={`btn min-h-11 min-w-[44px] shrink-0 gap-1.5 px-3 text-sm ${mode === 'screen' ? 'border border-moss-700 bg-moss-100 text-moss-800 hover:bg-moss-200' : 'btn-primary'}`}>
                {mode === 'screen' ? <Keyboard size={16} /> : <LayoutDashboard size={16} />}<span className="sr-only sm:not-sr-only">{mode === 'screen' ? ' Yazıya dön' : ' Ekran'}</span></button>}
            {prefs.enabledTools.mouse && <button id="studio-fare" type="button" aria-pressed={mode === 'mouse'} onClick={() => onModeChange(mode === 'mouse' ? 'write' : 'mouse')}
                className={`btn min-h-11 min-w-[44px] shrink-0 gap-1.5 px-3 text-sm ${mode === 'mouse' ? 'border border-moss-700 bg-moss-100 text-moss-800 hover:bg-moss-200' : 'btn-primary'}`}>
                {mode === 'mouse' ? <Keyboard size={16} /> : <MousePointer2 size={16} />}<span className="sr-only sm:not-sr-only">{mode === 'mouse' ? ' Yazıya dön' : ' Fare'}</span></button>}
            {prefs.enabledTools.dictation && <button id="studio-dikte" type="button" disabled={busy} onClick={() => void act(async () => {
                const text = await dictate(prefs.dictationLanguage);
                if (prefs.dictationTarget === 'computer') await typeOnComputer(text, prefs);
                else onContentChange(prefs.appendDictation && content ? `${content}${/\s$/.test(content) ? '' : ' '}${text}` : text);
            }, prefs.dictationTarget === 'computer' ? 'Dikte bilgisayara yazıldı; not değişmedi.' : 'Dikte nota eklendi.')}
                className="btn btn-primary min-h-11 min-w-[44px] shrink-0 gap-1.5 px-3 text-sm"><Mic size={16} /><span className="sr-only sm:not-sr-only"> Dikte</span></button>}
            {prefs.enabledTools.bridgeDictation && <button id="studio-kopru-dikte" type="button" disabled={bridgeStopping || (busy && !bridgeListening)}
                onClick={() => {
                    if (bridgeListening) { setBridgeStopping(true); void stopBridgeDictation().catch(error => { setBridgeStopping(false); setNotice(error.message); }); }
                    else void runBridgeDictation();
                }} className={`btn min-h-11 min-w-[44px] shrink-0 gap-1.5 px-3 text-sm ${bridgeListening ? 'border border-berry-300 bg-berry-50 text-berry-700 hover:bg-berry-100' : 'btn-primary'}`}>
                <AudioLines size={16} /><span className="sr-only sm:not-sr-only">{bridgeListening ? (bridgeStopping ? ' Bitiriliyor…' : ' Dikteyi bitir') : ' Köprü Dikte'}</span>
            </button>}
            {prefs.enabledTools.bridgeWrite && <button id="studio-kopru-yaz" type="button" aria-pressed={kopruYaz} onClick={kopruYazDegistir}
                className={`btn min-h-11 min-w-[44px] shrink-0 gap-1.5 px-3 text-sm ${kopruYaz ? 'border border-moss-700 bg-moss-100 text-moss-800 hover:bg-moss-200' : 'btn-primary'}`}>
                <Keyboard size={16} /><span className="sr-only sm:not-sr-only">{kopruYaz ? ' Köprü Yaz açık' : ' Köprü Yaz'}</span>
            </button>}
            {kopruYaz && kopruHata && <button type="button" id="studio-kopru-yaz-yeniden" onClick={() => { kopruDurdu.current = false; setKopruHata(false); kopruHedef.current = guncelIcerik.current; void kopruAktar(); }}
                className="btn btn-secondary min-h-11 shrink-0 px-3 text-sm">Yeniden dene</button>}
            {prefs.enabledTools.computerWrite && <button id="studio-bilgisayara-yaz" type="button" disabled={busy || !content.trim()} onClick={() => void act(() => typeOnComputer(content, prefs), 'Metin bilgisayara yazıldı.')}
                className="btn btn-primary min-h-11 min-w-[44px] shrink-0 gap-1.5 px-3 text-sm"><Send size={16} /><span className="sr-only sm:not-sr-only"> Bilgisayara yaz</span></button>}
            {prefs.enabledTools.clipboard && <button id="studio-pc-panosu" type="button" disabled={busy || !content.trim()} onClick={() => void panoyaGonder()}
                className="btn btn-primary min-h-11 min-w-[44px] shrink-0 gap-1.5 px-3 text-sm"><Clipboard size={16} /><span className="sr-only sm:not-sr-only"> PC panosu</span></button>}
            {kopruYaz && <span id="studio-kopru-yaz-durum" role="status" className={`max-w-56 shrink-0 text-xs ${kopruHata ? 'text-berry-700' : 'text-moss-700'}`}>{kopruDurum}</span>}
            {notice && <span role="status" className="max-w-48 shrink-0 text-xs text-sand-700">{notice}</span>}
            {panoBildirim && typeof document !== 'undefined' && createPortal(
                <div id="studio-pano-bildirim" role="status" aria-live="polite"
                    className={`pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+16px)] left-1/2 z-[120] flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg ${panoBildirim.ton === 'error' ? 'bg-berry-700 text-berry-50' : 'bg-moss-800 text-moss-50'}`}>
                    {panoBildirim.ton === 'sending' ? <Loader2 size={16} className="animate-spin" /> : panoBildirim.ton === 'ok' ? <Check size={16} /> : <Clipboard size={16} />}
                    <span>{panoBildirim.metin}</span>
                </div>, document.body)}
        </>;
    if (mode !== 'mouse' || !prefs.enabledTools.mouse) return null;
    return <div className="flex min-h-0 flex-1 flex-col overflow-auto px-4 py-4 sm:px-6">
        <div className="flex min-h-0 flex-1 flex-col gap-2">
            <FareYuzeyi prefs={prefs} onHata={setNotice} className="flex min-h-[46dvh] flex-1 touch-none select-none items-center justify-center rounded-2xl border border-moss-200 bg-gradient-to-br from-moss-50 to-sand-50 p-6 text-center text-sm text-sand-600">
                Sürükle: imleci hareket ettir · Bir kez dokun: sol tık
            </FareYuzeyi>
            <div className="grid shrink-0 grid-cols-3 gap-2">
                <button className="btn btn-secondary min-h-11 py-2.5 text-sm" onClick={() => void act(() => sendCommand('mc:1', prefs), 'Sol tık gönderildi.')}>Sol tık</button>
                <button className="btn btn-secondary min-h-11 py-2.5 text-sm" onClick={() => void act(() => sendCommand('ms:3', prefs), 'Yukarı kaydırıldı.')}>↑ Kaydır</button>
                <button className="btn btn-secondary min-h-11 py-2.5 text-sm" onClick={() => void act(() => sendCommand('mc:2', prefs), 'Sağ tık gönderildi.')}>Sağ tık</button>
                <button className="btn btn-secondary col-start-2 min-h-11 py-2.5 text-sm" onClick={() => void act(() => sendCommand('ms:-3', prefs), 'Aşağı kaydırıldı.')}>↓ Kaydır</button>
            </div>
        </div>
        {notice && <p role="status" className="shrink-0 text-xs text-sand-700">{notice}</p>}
    </div>;
}
