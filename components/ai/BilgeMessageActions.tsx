'use client';
import { useEffect, useRef, useState } from 'react';
import { Copy, Check, Volume2, Square, PenSquare, Menu, Monitor, Clipboard, Settings2 } from 'lucide-react';
import AiReportButton from './AiReportButton';
import { bilgePlainText } from '@/lib/bilgeMedia';
import { speakBilge, stopBilgeSpeech } from '@/lib/bilgeSpeech';
import { remotePrefs, sendToComputerClipboard, typeOnComputer, telefonPanosunaYaz } from '@/lib/remoteTools';

export default function BilgeMessageActions({ text, openEditor, remoteSettings }: { text: string; openEditor: () => void; remoteSettings: () => void }) {
    const [copied, setCopied] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [menu, setMenu] = useState(false);
    const [editing, setEditing] = useState(false);
    const [pins, setPins] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const panel = useRef<HTMLDivElement>(null);
    const active = useRef(false);
    const operationLock = useRef(false);
    const speechToken = useRef(0);
    const plain = bilgePlainText(text);
    useEffect(() => {
        const token = speechToken, speaking = active;
        const read = () => { try { const p = JSON.parse(localStorage.getItem('nb-bilge-pins') || '[]'); setPins(Array.isArray(p) ? p.filter(x => x === 'write' || x === 'clipboard') : []); } catch { setPins([]); } };
        read(); window.addEventListener('nb-bilge-pins', read);
        return () => { window.removeEventListener('nb-bilge-pins', read); token.current++; if (speaking.current) void stopBilgeSpeech().catch(() => {}); };
    }, []);
    useEffect(() => {
        if (!menu) return;
        const outside = (e: PointerEvent) => { if (!panel.current?.contains(e.target as Node)) { setMenu(false); setEditing(false); } };
        const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenu(false); setEditing(false); } };
        document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
    }, [menu]);
    const run = async (action: 'copy' | 'write' | 'clipboard') => {
        if (operationLock.current) return;
        operationLock.current = true;
        setBusy(true); setNotice('');
        try {
            if (action === 'copy') { await telefonPanosunaYaz({ metin: plain }); setCopied(true); }
            else {
                if (!window.confirm(action === 'write' ? 'Bu yanıt eşleştirilmiş bilgisayarın odaktaki alanına yazılacak. Bilgisayarda doğru metin alanını seçtiğinizden emin misiniz?' : 'Bu yanıt eşleştirilmiş bilgisayarın panosuna gönderilsin mi?')) return;
                if (action === 'write') await typeOnComputer(plain, remotePrefs());
                else await sendToComputerClipboard(plain, remotePrefs());
                setNotice(action === 'write' ? 'Bilgisayara gönderildi.' : 'PC panosuna gönderildi.');
            }
            setMenu(false);
        } catch (e) { setNotice(e instanceof Error ? e.message : 'İşlem tamamlanamadı.'); }
        finally { operationLock.current = false; setBusy(false); }
    };
    const speech = async () => {
        if (playing) { speechToken.current++; active.current = false; setPlaying(false); await stopBilgeSpeech().catch(() => {}); return; }
        const token = ++speechToken.current; active.current = true; setPlaying(true); setNotice('');
        try { await speakBilge(text); }
        catch (e) { if (token === speechToken.current) setNotice(e instanceof Error ? e.message : 'Seslendirilemedi.'); }
        finally { if (token === speechToken.current) { active.current = false; setPlaying(false); } }
    };
    const pin = (id: string) => {
        const next = pins.includes(id) ? pins.filter(p => p !== id) : [...pins, id];
        try { localStorage.setItem('nb-bilge-pins', JSON.stringify(next)); setPins(next); window.dispatchEvent(new Event('nb-bilge-pins')); }
        catch { setNotice('Kısayol tercihi kaydedilemedi.'); }
    };
    const cls = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sand-500 hover:bg-sand-100 disabled:opacity-40';
    return <div ref={panel} className="relative mt-1">
        <div className="flex flex-wrap items-center gap-0.5">
            <button type="button" disabled={busy} aria-label={copied ? 'Yanıt kopyalandı' : 'Yanıtı kopyala'} title="Kopyala" className={cls} onClick={() => void run('copy')}>{copied ? <Check size={17} /> : <Copy size={17} />}</button>
            <button type="button" aria-label={playing ? 'Seslendirmeyi durdur' : 'Yanıtı seslendir'} title="Seslendir" className={cls} onClick={() => void speech()}>{playing ? <Square size={17} /> : <Volume2 size={18} />}</button>
            <button type="button" aria-label="Metin işlemcisinde aç" title="Metin işlemcisinde aç" className={cls} onClick={openEditor}><PenSquare size={17} /></button>
            {pins.includes('write') && <button type="button" disabled={busy} aria-label="Bilgisayara yaz" className={cls} onClick={() => void run('write')}><Monitor size={17} /></button>}
            {pins.includes('clipboard') && <button type="button" disabled={busy} aria-label="PC panosuna gönder" className={cls} onClick={() => void run('clipboard')}><Clipboard size={17} /></button>}
            <button type="button" aria-label="Diğer yanıt işlemleri ve kısayollar" aria-expanded={menu} className={cls} onClick={() => setMenu(!menu)}><Menu size={19} /></button>
        </div>
        {menu && <div aria-label="Yanıt işlemleri" className="my-2 w-full max-w-sm space-y-1 rounded-2xl border border-sand-200 bg-paper p-2 shadow-sm">
            {editing ? <><p className="px-2 py-2 text-xs text-sand-600">Mesaj altına eklemek istediğin kısayollar:</p>{[['write', 'Bilgisayara yaz'], ['clipboard', 'PC panosuna gönder']].map(([id, label]) => <label key={id} className="flex min-h-11 items-center gap-3 px-2 text-sm"><input type="checkbox" checked={pins.includes(id)} onChange={() => pin(id)} />{label}</label>)}<button type="button" onClick={() => setEditing(false)} className="btn btn-ghost min-h-11 text-xs">Tamam</button></> : <>
                <button type="button" disabled={busy} onClick={() => void run('write')} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-sand-100"><Monitor size={17} />Bilgisayara yaz</button>
                <button type="button" disabled={busy} onClick={() => void run('clipboard')} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-sand-100"><Clipboard size={17} />PC panosuna gönder</button>
                <button type="button" onClick={() => setEditing(true)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-sand-100"><Settings2 size={17} />Kısayolları düzenle</button>
                <button type="button" onClick={remoteSettings} className="min-h-11 px-3 text-xs text-moss-800">Bilgisayar bağlantısı ayarları</button>
                <div className="border-t border-sand-200 px-2"><AiReportButton response={text} source="chat" /></div>
            </>}
        </div>}
        {notice && <p role="status" className="max-w-sm px-2 text-xs leading-5 text-sand-600">{notice}</p>}
    </div>;
}
