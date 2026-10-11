'use client';

/**
 * Kart menüsünden açılan "Telefon klavyesiyle bilgisayara yaz" penceresi.
 * Metin telefonun klavyesiyle yazılır; tek dokunuşla bağlı bilgisayara yazılır,
 * Enter ile bitirilir ya da bilgisayarın panosuna gönderilir.
 */
import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { createPortal } from 'react-dom';
import { ClipboardList, CornerDownLeft, Keyboard, Loader2, X } from 'lucide-react';
import { sendKey, sendToComputerClipboard, typeOnComputer } from '@/lib/remoteTools';
import type { RemotePrefs } from '@/lib/remoteTools';

export default function PcHizliYaz({ prefs, onKapat }: { prefs: RemotePrefs; onKapat: () => void }) {
    const [metin, setMetin] = useState('');
    const [mesgul, setMesgul] = useState(false);
    const [hata, setHata] = useState('');
    const alan = useRef<HTMLTextAreaElement>(null);
    const kapatRef = useRef(onKapat);
    kapatRef.current = onKapat;

    useEffect(() => { alan.current?.focus(); }, []);
    useEffect(() => {
        const esc = (olay: KeyboardEvent) => { if (olay.key === 'Escape') kapatRef.current(); };
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
    }, []);
    // Android geri tuşu: önce bu pencereyi kapatır.
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        let bitti = false;
        let kaldir: (() => void) | undefined;
        void import('@capacitor/app').then(async ({ App }) => {
            const dinleyici = await App.addListener('backButton', () => kapatRef.current());
            if (bitti) void dinleyici.remove(); else kaldir = () => { void dinleyici.remove(); };
        });
        return () => { bitti = true; kaldir?.(); };
    }, []);

    const calistir = async (islem: () => Promise<void>) => {
        if (!metin.trim() || mesgul) return;
        setMesgul(true); setHata('');
        try { await islem(); onKapat(); }
        catch (e) { setHata(e instanceof Error ? e.message : 'Bilgisayar bağlantısı gerekli.'); setMesgul(false); }
    };

    if (typeof document === 'undefined') return null;
    const bos = !metin.trim();
    return createPortal(
        <div id="pc-hizli-yaz" data-geri-yonetir="" data-ust-katman="" role="dialog" aria-modal="true" aria-label="Bilgisayara yaz"
            className="fixed inset-0 z-[140] flex items-end bg-sand-950/40 sm:items-center sm:justify-center"
            onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); if (e.target === e.currentTarget) onKapat(); }}>
            <div className="w-full rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] shadow-2xl sm:max-w-md sm:rounded-3xl">
                <div className="mb-3 flex items-center gap-3">
                    <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-moss-100 text-moss-700"><Keyboard size={20} /></span>
                    <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-sand-900">Bilgisayara yaz</p>
                        <p className="text-xs text-sand-500">Telefon klavyesiyle yazın, bilgisayardaki imlece gönderin.</p>
                    </div>
                    <button type="button" onClick={onKapat} aria-label="Kapat" className="flex h-11 w-11 items-center justify-center rounded-full text-sand-700 hover:bg-sand-100"><X size={20} /></button>
                </div>
                <textarea ref={alan} id="pc-hizli-yaz-metin" value={metin} onChange={e => setMetin(e.target.value)} rows={4} placeholder="Göndermek istediğiniz metin"
                    className="w-full resize-none rounded-2xl border border-sand-200 bg-sand-50 p-3 text-[15px] text-sand-900 outline-none focus:border-moss-500 focus:ring-2 focus:ring-moss-500/20" />
                {hata && <p role="alert" className="mt-2 text-xs text-clay-700">{hata}</p>}
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" id="pc-hizli-yaz-gonder" disabled={bos || mesgul} onClick={() => void calistir(() => typeOnComputer(metin, prefs))}
                        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-moss-600 text-sm font-semibold text-white disabled:opacity-40">
                        {mesgul ? <Loader2 size={17} className="animate-spin" /> : <Keyboard size={17} />} Yaz
                    </button>
                    <button type="button" id="pc-hizli-yaz-enter" disabled={bos || mesgul} onClick={() => void calistir(async () => { await typeOnComputer(metin, prefs); await sendKey('ENTER', prefs); })}
                        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-moss-100 text-sm font-semibold text-moss-800 disabled:opacity-40">
                        <CornerDownLeft size={17} /> Yaz ve Enter
                    </button>
                    <button type="button" id="pc-hizli-yaz-pano" disabled={bos || mesgul} onClick={() => void calistir(() => sendToComputerClipboard(metin, prefs))}
                        className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-sand-200 text-sm font-medium text-sand-800 disabled:opacity-40">
                        <ClipboardList size={17} /> Bilgisayar panosuna gönder
                    </button>
                </div>
            </div>
        </div>, document.body);
}

