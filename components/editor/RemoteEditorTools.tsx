'use client';

import { useEffect, useRef, useState } from 'react';
import { AudioLines, Clipboard, Keyboard, Mic, MousePointer2, Send, Wand2 } from 'lucide-react';
import { bridgeDictate, dictate, dinleKopruDikte, metinFarkiAktar, sendCommand, sendToComputerClipboard, stopBridgeDictation, typeOnComputer } from '@/lib/remoteTools';
import type { RemoteMode } from '@/lib/remoteTools';
import { useRemotePrefs } from '@/lib/useRemotePrefs';

export default function RemoteEditorTools({ content, onContentChange, mode, onModeChange, placement }: {
    content: string; onContentChange: (text: string) => void;
    mode: RemoteMode; onModeChange: (mode: RemoteMode) => void;
    placement: 'toolbar' | 'surface';
}) {
    const prefs = useRemotePrefs();
    const [busy, setBusy] = useState(false);
    const [bridgeListening, setBridgeListening] = useState(false);
    const [bridgeStopping, setBridgeStopping] = useState(false);
    const [kopruYaz, setKopruYaz] = useState(false);
    const [kopruDurum, setKopruDurum] = useState('');
    const [kopruHata, setKopruHata] = useState(false);
    const [notice, setNotice] = useState('');
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
    const start = useRef<{ id: number; x: number; y: number; originX: number; originY: number; time: number; moved: boolean } | null>(null);
    const movement = useRef<Promise<void>>(Promise.resolve());
    const pendingMove = useRef({ x: 0, y: 0 });
    const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (kopruYaz && (!prefs.enabledTools.bridgeWrite || (mode !== 'write' && mode !== 'dictation'))) {
            setKopruYaz(false); setKopruDurum(''); setKopruHata(false);
        }
    }, [kopruYaz, mode, prefs.enabledTools.bridgeWrite]);
    useEffect(() => {
        if (
            (mode === 'mouse' && !prefs.enabledTools.mouse) ||
            (mode === 'dictation' && !prefs.enabledTools.dictation) ||
            (mode === 'shortcuts' && !prefs.enabledTools.shortcuts)
        ) onModeChange('write');
    }, [mode, onModeChange, prefs.enabledTools.mouse, prefs.enabledTools.dictation, prefs.enabledTools.shortcuts]);
    useEffect(() => () => { if (moveTimer.current) clearTimeout(moveTimer.current); }, []);
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
            const metin = await bridgeDictate(prefs.dictationLanguage, prefs.bridgeDictationUnlimited ? 0 : prefs.bridgeDictationSeconds);
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

    const flushMove = () => {
        if (moveTimer.current) { clearTimeout(moveTimer.current); moveTimer.current = null; }
        const dx = Math.max(-127, Math.min(127, pendingMove.current.x));
        const dy = Math.max(-127, Math.min(127, pendingMove.current.y));
        pendingMove.current.x -= dx;
        pendingMove.current.y -= dy;
        if (dx || dy) movement.current = movement.current.catch(() => {}).then(() => sendCommand(`mm:${dx},${dy}`, prefs)).catch(error => setNotice(error.message));
        if (pendingMove.current.x || pendingMove.current.y) moveTimer.current = setTimeout(flushMove, 35);
    };
    const move = (x: number, y: number) => {
        const point = start.current;
        if (!point) return;
        const dx = x - point.x, dy = y - point.y;
        if (Math.hypot(x - point.originX, y - point.originY) > 8) point.moved = true;
        point.x = x; point.y = y;
        pendingMove.current.x += Math.round(dx * prefs.mouseSensitivity);
        pendingMove.current.y += Math.round(dy * prefs.mouseSensitivity);
        if (!moveTimer.current) moveTimer.current = setTimeout(flushMove, 35);
    };
    if (placement === 'toolbar') return <>
            {prefs.enabledTools.shortcuts && <button id="studio-kisayollar" type="button" aria-pressed={mode === 'shortcuts'} onClick={() => onModeChange(mode === 'shortcuts' ? 'write' : 'shortcuts')}
                title="Kısayollar: makro panosu"
                className={`btn min-h-11 shrink-0 gap-1.5 px-3 text-sm ${mode === 'shortcuts' ? 'border border-moss-700 bg-moss-100 text-moss-800 hover:bg-moss-200' : 'btn-primary'}`}>
                <Wand2 size={16} /> {mode === 'shortcuts' ? 'Yazıya dön' : 'Kısayollar'}</button>}
            {prefs.enabledTools.mouse && <button id="studio-fare" type="button" aria-pressed={mode === 'mouse'} onClick={() => onModeChange(mode === 'mouse' ? 'write' : 'mouse')}
                className={`btn min-h-11 shrink-0 gap-1.5 px-3 text-sm ${mode === 'mouse' ? 'border border-moss-700 bg-moss-100 text-moss-800 hover:bg-moss-200' : 'btn-primary'}`}>
                {mode === 'mouse' ? <Keyboard size={16} /> : <MousePointer2 size={16} />}{mode === 'mouse' ? 'Yazıya dön' : 'Fare'}</button>}
            {prefs.enabledTools.dictation && <button id="studio-dikte" type="button" disabled={busy} onClick={() => void act(async () => {
                const text = await dictate(prefs.dictationLanguage);
                if (prefs.dictationTarget === 'computer') await typeOnComputer(text, prefs);
                else onContentChange(prefs.appendDictation && content ? `${content}${/\s$/.test(content) ? '' : ' '}${text}` : text);
            }, prefs.dictationTarget === 'computer' ? 'Dikte bilgisayara yazıldı; not değişmedi.' : 'Dikte nota eklendi.')}
                className="btn btn-primary min-h-11 shrink-0 gap-1.5 px-3 text-sm"><Mic size={16} /> Dikte</button>}
            {prefs.enabledTools.bridgeDictation && <button id="studio-kopru-dikte" type="button" disabled={bridgeStopping || (busy && !bridgeListening)}
                onClick={() => {
                    if (bridgeListening) { setBridgeStopping(true); void stopBridgeDictation().catch(error => { setBridgeStopping(false); setNotice(error.message); }); }
                    else void runBridgeDictation();
                }} className={`btn min-h-11 shrink-0 gap-1.5 px-3 text-sm ${bridgeListening ? 'border border-berry-300 bg-berry-50 text-berry-700 hover:bg-berry-100' : 'btn-primary'}`}>
                <AudioLines size={16} /> {bridgeListening ? (bridgeStopping ? 'Bitiriliyor…' : 'Dikteyi bitir') : 'Köprü Dikte'}
            </button>}
            {prefs.enabledTools.bridgeWrite && <button id="studio-kopru-yaz" type="button" aria-pressed={kopruYaz} onClick={kopruYazDegistir}
                className={`btn min-h-11 shrink-0 gap-1.5 px-3 text-sm ${kopruYaz ? 'border border-moss-700 bg-moss-100 text-moss-800 hover:bg-moss-200' : 'btn-primary'}`}>
                <Keyboard size={16} /> {kopruYaz ? 'Köprü Yaz açık' : 'Köprü Yaz'}
            </button>}
            {kopruYaz && <span id="studio-kopru-yaz-durum" role="status" className={`max-w-56 shrink-0 text-xs ${kopruHata ? 'text-berry-700' : 'text-moss-700'}`}>{kopruDurum}</span>}
            {kopruYaz && kopruHata && <button type="button" id="studio-kopru-yaz-yeniden" onClick={() => { kopruDurdu.current = false; setKopruHata(false); kopruHedef.current = guncelIcerik.current; void kopruAktar(); }}
                className="btn btn-secondary min-h-11 shrink-0 px-3 text-sm">Yeniden dene</button>}
            {prefs.enabledTools.computerWrite && <button id="studio-bilgisayara-yaz" type="button" disabled={busy || !content.trim()} onClick={() => void act(() => typeOnComputer(content, prefs), 'Metin bilgisayara yazıldı.')}
                className="btn btn-primary min-h-11 shrink-0 gap-1.5 px-3 text-sm"><Send size={16} /> Bilgisayara yaz</button>}
            {prefs.enabledTools.clipboard && <button id="studio-pc-panosu" type="button" disabled={busy || !content.trim()} onClick={() => void act(() => sendToComputerClipboard(content, prefs), 'Metin bilgisayar panosuna aktarıldı.')}
                className="btn btn-primary min-h-11 shrink-0 gap-1.5 px-3 text-sm"><Clipboard size={16} /> PC panosu</button>}
            {notice && <span role="status" className="max-w-48 shrink-0 text-xs text-sand-700">{notice}</span>}
        </>;
    if (mode !== 'mouse' || !prefs.enabledTools.mouse) return null;
    return <div className="flex min-h-0 flex-1 flex-col overflow-auto px-4 py-4 sm:px-6">
        <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div role="application" aria-label="Fare dokunmatik yüzeyi" className="flex min-h-[46dvh] flex-1 touch-none select-none items-center justify-center rounded-2xl border border-moss-200 bg-gradient-to-br from-moss-50 to-sand-50 p-6 text-center text-sm text-sand-600"
                onPointerDown={e => { if (!e.isPrimary || start.current) return; e.currentTarget.setPointerCapture(e.pointerId); start.current = { id: e.pointerId, x: e.clientX, y: e.clientY, originX: e.clientX, originY: e.clientY, time: Date.now(), moved: false }; }}
                onPointerMove={e => { if (start.current?.id === e.pointerId && e.buttons) move(e.clientX, e.clientY); }}
                onPointerUp={e => {
                    const point = start.current;
                    if (!point || point.id !== e.pointerId) return;
                    if (point && !point.moved && Math.hypot(e.clientX - point.originX, e.clientY - point.originY) < 8 && Date.now() - point.time < 450) {
                        flushMove();
                        movement.current = movement.current.catch(() => {}).then(() => sendCommand('mc:1', prefs)).catch(error => setNotice(error.message));
                    }
                    start.current = null;
                }} onPointerCancel={e => { if (start.current?.id === e.pointerId) start.current = null; }}>
                Sürükle: imleci hareket ettir · Bir kez dokun: sol tık
            </div>
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
