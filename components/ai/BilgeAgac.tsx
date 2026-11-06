'use client';
/* eslint-disable @next/next/no-img-element -- Local re-encoded data URLs; no remote optimizer or network image loads. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowRight, BookOpen, History, Info, Loader2, MessageCircle, Search, Send, Settings2, Square, PenSquare, Trash2, X } from 'lucide-react';
import AiDialog from './AiDialog';
import BilgeFace from './BilgeFace';
import BilgeMarkdown from './BilgeMarkdown';
import BilgeMessageActions from './BilgeMessageActions';
import BilgeSpeechSettings from './BilgeSpeechSettings';
import { ImagePlus } from 'lucide-react';
import { bilgeDestination } from '@/lib/bilgeLinks';
import { readActiveProvider } from '@/lib/aiProvider';
import { bilgePlainText, prepareBilgeImage } from '@/lib/bilgeMedia';
import { stopBilgeSpeech } from '@/lib/bilgeSpeech';
import ImagePreview from '@/components/editor/ImagePreview';
import { denemeNotuOku, denemeNotuYaz, denemeKayitHatasi } from '@/lib/denemeAgaci';
import { klavyeGorselleriniDinle } from '@/lib/remoteTools';
import { BILGE_INTRO, bilgeSystemPrompt } from '@/lib/bilgeKnowledge';
import { readAiMode, aiChatPaylasimOnayi } from '@/lib/aiMode';
import { hostedAiRequest, hostedAiStatus, type AiAllowance, type ChatMessage, type HostedAiStatus } from '@/lib/hostedAiClient';
import { kartAiCalistir } from '@/lib/kartAiCalistir';
import type { SettingsSectionId } from '@/components/editor/SettingsHome';
import { BILGE_LENGTHS, BILGE_LENGTH_LABELS, bilgeLengthInstruction, readBilgeLength, saveBilgeLength, type BilgeLength } from '@/lib/bilgePreferences';

const starters = ['Not Bahçesi’ni bana tanıt', 'İlk ağacımı nasıl oluştururum?', 'AI makrolarını nasıl kullanırım?', 'Bana ilginç bir bilgi ver'];

/** Sohbetler yalnız bu cihazda (localStorage) saklanır; sunucuya yedeklenmez. */
type Sohbet = { id: string; title: string; updatedAt: number; messages: ChatMessage[] };
const GECMIS_ANAHTARI = 'bilge-sohbetler-v1';
const EN_FAZLA_SOHBET = 40;
const EN_FAZLA_MESAJ = 60;

function gecmisiOku(): Sohbet[] {
    try {
        const raw = JSON.parse(localStorage.getItem(GECMIS_ANAHTARI) || '[]');
        if (!Array.isArray(raw)) return [];
        return raw.filter((s): s is Sohbet => !!s && typeof s.id === 'string' && typeof s.title === 'string' && Number.isFinite(s.updatedAt) && Array.isArray(s.messages) && s.messages.every((m: ChatMessage) => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, EN_FAZLA_SOHBET);
    } catch { return []; }
}
function gecmisiYaz(list: Sohbet[]) {
    try { localStorage.setItem(GECMIS_ANAHTARI, JSON.stringify(list.slice(0, EN_FAZLA_SOHBET))); } catch { /* depolama dolu olabilir; sohbet bellekte sürer */ }
}
function zamanEtiketi(t: number) {
    const d = new Date(t), now = new Date();
    const gun = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const fark = Math.round((gun(now) - gun(d)) / 86400000);
    const saat = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    if (fark === 0) return 'Bugün ' + saat;
    if (fark === 1) return 'Dün ' + saat;
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}

export default function BilgeAgac({ onSettings }: { onSettings: (section: SettingsSectionId | 'home') => void }) {
    const router = useRouter();
    const [image, setImage] = useState('');
    const [imagePreview, setImagePreview] = useState('');
    const photoPreflight = useRef(false);
    const [imageBusy, setImageBusy] = useState(false);
    const imageGeneration = useRef(0);
    const fileRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [answerLength, setAnswerLength] = useState<BilgeLength>('short');
    const [scrollState, setScrollState] = useState({ up: false, down: false });
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<Sohbet[]>([]);
    const [query, setQuery] = useState('');
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [pending, setPending] = useState('');
    // Gönderilen fotoğraf yanıt beklenirken de kullanıcının balonunda durur.
    const [pendingImage, setPendingImage] = useState('');
    const [error, setError] = useState('');
    const [status, setStatus] = useState<HostedAiStatus | null>(null);
    const [allowance, setAllowance] = useState<AiAllowance | null>(null);
    const [mode, setMode] = useState<'hosted' | 'personal'>('hosted');
    const controller = useRef<AbortController | null>(null);
    const transcript = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const followLatest = useRef(true);

    useEffect(() => {
        const hidden = () => { if (document.hidden) void stopBilgeSpeech().catch(() => {}); };
        document.addEventListener('visibilitychange', hidden);
        return () => { controller.current?.abort(); document.removeEventListener('visibilitychange', hidden); void stopBilgeSpeech().catch(() => {}); };
    }, []);
    const attach = async (file: Blob) => {
        if (controller.current) return;
        const token = ++imageGeneration.current; setImageBusy(true); setError('');
        try { const prepared = await prepareBilgeImage(file); if (token === imageGeneration.current) setImage(prepared); }
        catch (e) { if (token === imageGeneration.current) setError(e instanceof Error ? e.message : 'Fotoğraf eklenemedi.'); }
        finally { if (token === imageGeneration.current) setImageBusy(false); }
    };
    useEffect(() => {
        if (!open) return;
        const generation = imageGeneration;
        let disposed = false; let cleanup: (() => void) | undefined;
        void klavyeGorselleriniDinle(blob => { if (!disposed) void attach(blob); }).then(stop => { if (disposed) stop(); else cleanup = stop; }).catch(() => {});
        return () => { disposed = true; cleanup?.(); generation.current++; };
    }, [open]);
    useEffect(() => {
        if (!open) return;
        setMode(readAiMode());
        setAnswerLength(readBilgeLength());
        setHistory(gecmisiOku());
        const abort = new AbortController();
        setStatus(null);
        void hostedAiStatus(abort.signal).then(setStatus).catch(() => { if (!abort.signal.aborted) setStatus({ available: false, dailyRequests: 0, dailyUnits: 0, maxTextLength: 12000, notice: 'Hazır AI durumuna ulaşılamadı. Bağlantınızı kontrol edin.' }); });
        return () => abort.abort();
    }, [open]);
    const updateScroll = () => {
        const el = transcript.current;
        if (el) {
            const down = el.scrollHeight - el.clientHeight - el.scrollTop > 30;
            followLatest.current = !down;
            setScrollState({ up: el.scrollTop > 30, down });
        }
    };
    useEffect(() => {
        const el = transcript.current;
        if (!el) return;
        // Kullanıcı eski mesajları okurken yeni yanıt onu aşağı çekmez.
        if (followLatest.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        const observer = new ResizeObserver(updateScroll);
        observer.observe(el);
        const child = el.firstElementChild; if (child) observer.observe(child);
        updateScroll();
        return () => observer.disconnect();
    }, [messages, pending, error, showHistory, showSettings, open]);
    useEffect(() => {
        const field = inputRef.current;
        if (!field) return;
        field.style.height = '44px';
        field.style.height = Math.min(112, field.scrollHeight) + 'px';
    }, [input, open, showHistory]);

    const filtered = useMemo(() => {
        const q = query.trim().toLocaleLowerCase('tr');
        return q ? history.filter(s => (s.title + ' ' + s.messages.map(m => m.content).join(' ')).toLocaleLowerCase('tr').includes(q)) : history;
    }, [history, query]);

    const close = () => { controller.current?.abort(); imageGeneration.current++; setImageBusy(false); setImagePreview(''); void stopBilgeSpeech().catch(() => {}); setOpen(false); };
    const openInEditor = (text: string) => {
        const plain = bilgePlainText(text);
        const old = denemeNotuOku('bilge');
        if (old.metin && old.metin !== text && !window.confirm('Metin işlemcisindeki önceki Bilge taslağı değiştirilecek. Önemli düzenlemelerinizi önce Aktar ile bahçeye kaydedin. Yeni yanıt açılsın mı?')) return;
        const title = plain.split('\n').find(line => line.trim())?.slice(0, 80) || 'Bilge Ağaç notu';
        denemeNotuYaz('bilge', title, text);
        if (denemeKayitHatasi('bilge')) { setError(denemeKayitHatasi('bilge')); return; }
        close(); router.push('/editor?deneme=bilge');
    };
    const settings = (section: SettingsSectionId | 'home') => { close(); onSettings(section); };
    const navigate = (href: string) => {
        const target = bilgeDestination(href);
        if (!target) return;
        if ('panel' in target) { setShowSettings(true); setShowHistory(false); setShowInfo(false); }
        else if ('section' in target) settings(target.section);
        else { close(); router.push(target.route); }
    };
    const newChat = () => { controller.current?.abort(); imageGeneration.current++; setImage(''); setPendingImage(''); setImageBusy(false); followLatest.current = true; setMessages([]); setCurrentId(null); setError(''); setInput(''); setShowHistory(false); setShowInfo(false); setShowSettings(false); };
    const restore = (s: Sohbet) => { controller.current?.abort(); imageGeneration.current++; setImage(''); setPendingImage(''); setImageBusy(false); followLatest.current = true; setMessages(s.messages); setCurrentId(s.id); setError(''); setInput(''); setShowHistory(false); setShowInfo(false); setShowSettings(false); };
    const remove = (id: string) => {
        const next = gecmisiOku().filter(s => s.id !== id);
        gecmisiYaz(next); setHistory(next);
        if (id === currentId) { setMessages([]); setCurrentId(null); }
    };
    const save = (all: ChatMessage[]) => {
        const id = currentId ?? Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        const firstUser = all.find(m => m.role === 'user')?.content.replace(/\s+/g, ' ').trim() || 'Yeni sohbet';
        const entry: Sohbet = { id, title: firstUser.length > 52 ? firstUser.slice(0, 50) + '…' : firstUser, updatedAt: Date.now(), messages: all.slice(-EN_FAZLA_MESAJ) };
        const next = [entry, ...gecmisiOku().filter(s => s.id !== id)].slice(0, EN_FAZLA_SOHBET);
        // Fotoğraflar geçmiş deposuna yazılmaz; yalnızca bu açık sohbette kalır.
        const safe = next.map(s => ({ ...s, messages: s.messages.map(({ role, content, image, hadImage }) => ({ role, content, ...(image || hadImage ? { hadImage: true } : {}) })) }));
        gecmisiYaz(safe); setHistory(safe); setCurrentId(id);
    };

    const send = async (value = input) => {
        const content = value.trim() || (image ? 'Bu görseli incele.' : '');
        if (!content || controller.current || photoPreflight.current || imageBusy || content.length > 4000) return;
        const requestMode = readAiMode();
        if (image && requestMode === 'personal' && readActiveProvider() === 'local') { setError('Cihaz içi metin modeli fotoğraf okuyamıyor. Yapay zekâ ayarlarından görsel destekleyen bir sağlayıcı veya Özel API seçin.'); return; }
        if (image && requestMode === 'hosted' && !status?.supportsImages) {
            // A failed/late initial status fetch is not proof vision is disabled.
            photoPreflight.current = true; const generation = imageGeneration.current;
            try {
                const fresh = await hostedAiStatus(); setStatus(fresh);
                if (generation !== imageGeneration.current) return;
                if (!fresh.supportsImages || !fresh.available) { setError('Hazır AI görsel desteği şu an kullanılamıyor. AI ayarlarından kişisel sağlayıcı seçebilir veya daha sonra deneyebilirsin.'); return; }
            } catch { setError('AI sunucusuna ulaşılamadı. Bağlantını kontrol et; fotoğrafın burada korunuyor.'); return; }
            finally { photoPreflight.current = false; }
        }
        if (!aiChatPaylasimOnayi()) return;
        if (image && !window.confirm(requestMode === 'hosted' ? 'Bu fotoğraf Not Bahçesi sunucusu üzerinden Hazır AI sağlayıcısına gönderilecek ve ek kullanım hakkı tüketecek. Hassas bilgi içermediğinden emin misiniz?' : 'Bu fotoğraf seçtiğiniz kişisel AI sağlayıcısına gönderilecek. Web bağlantıları Not Bahçesi sunucusundan geçer; Android Özel API doğrudan sağlayıcıya gider. Sağlayıcınız ücretlendirebilir. Devam edilsin mi?')) return;
        const abort = new AbortController(); controller.current = abort;
        followLatest.current = true;
        // Modele yalnız son mesajlar gider; tam sohbet cihazda saklanır.
        const attached = image;
        // Fotoğraf gönderildiği anda mesaj kutusundan çıkıp gönderilen mesaja
        // geçer; istek başarısız olursa geri konur, kullanıcı kaybetmez.
        setPending(content); setPendingImage(attached); setImage(''); setError('');
        const all: ChatMessage[] = [...messages, { role: 'user', content, ...(attached ? { image: attached, hadImage: true } : {}) }];
        // Eski görseller otomatik yeniden gönderilmez; en fazla son mesaja eklenen görsel.
        let context: ChatMessage[] = all.slice(-11).map((m, i, a) => ({ role: m.role, content: (m.content + (m.hadImage && i !== a.length - 1 ? '\n[Önceki görsel bu isteğe eklenmedi.]' : '')).slice(0, 4000), ...(i === a.length - 1 && attached ? { image: attached } : {}) }));
        while (context.length > 1 && context.reduce((sum, m) => sum + m.content.length, 0) > 11000) context = context.slice(2);
        try {
            let answer: string;
            if (requestMode === 'hosted') {
                const result = await hostedAiRequest({ kind: 'chat', messages: context, answerLength }, abort.signal);
                answer = result.text; setAllowance(result.allowance);
            } else {
                const request = kartAiCalistir(context.map(m => (m.role === 'user' ? 'Kullanıcı' : 'Bilge Ağaç') + ': ' + m.content).join('\n\n'), bilgeSystemPrompt(content) + '\n' + bilgeLengthInstruction(answerLength) + '\nYukarıdaki sohbetin son kullanıcı mesajını yanıtla. Sadece asistan yanıtını yaz.', false, abort.signal, attached || undefined);
                // Cihaz modeli/native sağlayıcı çıkarımı durdurulamasa da panel
                // iptali hemen tamamlanır ve geç gelen sonuç konuşmaya eklenmez.
                answer = await new Promise<string>((resolve, reject) => {
                    const cancel = () => reject(new DOMException('İstek iptal edildi.', 'AbortError'));
                    abort.signal.addEventListener('abort', cancel, { once: true });
                    if (abort.signal.aborted) cancel();
                    void request.then(resolve, reject).finally(() => abort.signal.removeEventListener('abort', cancel));
                });
            }
            if (abort.signal.aborted) return;
            const next: ChatMessage[] = [...all, { role: 'assistant', content: answer }];
            setMessages(next.slice(-EN_FAZLA_MESAJ)); save(next);
            setInput('');
        } catch (e) {
            if (!abort.signal.aborted) { setInput(content); if (attached) setImage(attached); setError(e instanceof Error && e.name === 'AbortError' ? 'Yanıt zaman aşımına uğradı. Tekrar deneyebilirsiniz.' : e instanceof Error ? e.message : 'Yanıt alınamadı.'); }
        } finally {
            if (controller.current === abort) { controller.current = null; setPending(''); setPendingImage(''); }
            if (!abort.signal.aborted && window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus({ preventScroll: true });
        }
    };

    const iconBtn = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-moss-800 hover:bg-moss-100';
    const usage = !status ? 'AI durumu kontrol ediliyor…' : !status.available ? status.notice : allowance
        ? 'Bugün ' + allowance.remainingRequests + ' istek · ' + allowance.remainingUnits.toLocaleString('tr-TR') + ' kullanım birimi kaldı. Sohbet ve makrolar ortaktır.'
        : 'Günlük ' + status.dailyRequests + ' isteğe kadar; metin uzunluğu da kullanım hakkından düşer.';

    return <>
        <button type="button" onClick={() => { setShowInfo(false); setShowHistory(false); setShowSettings(false); setOpen(true); }} aria-haspopup="dialog" aria-expanded={open} aria-label="Bilge Ağaç (Yapay Zeka) sohbetini aç" className="flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-2xl border border-sand-200 bg-white py-1 pl-1 pr-3 text-left shadow-sm transition-colors hover:bg-moss-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 active:scale-[.98]">
            <BilgeFace size={40} />
            <span className="leading-tight"><span className="block whitespace-nowrap text-sm font-semibold text-moss-900">Bilge Ağaç</span><span className="block whitespace-nowrap text-[11px] text-sand-500">(Yapay Zeka)</span></span>
        </button>
        {open && <AiDialog fullscreen label="Bilge Ağaç sohbeti" onClose={close} className="max-w-[720px]">
            <header className="flex shrink-0 items-center gap-0.5 border-b border-sand-200 bg-paper px-2 pb-2 pt-[max(8px,env(safe-area-inset-top))] sm:px-4">
                <button type="button" aria-label="Sohbeti kapat" onClick={close} className={iconBtn}><X size={20} /></button>
                <BilgeFace size={34} />
                <div className="min-w-0 flex-1 pl-1.5"><h2 className="truncate text-base font-semibold text-moss-900">Bilge Ağaç</h2><p className="truncate text-[11px] text-sand-500">Yapay Zeka · {mode === 'personal' ? 'Kişisel AI' : status?.available ? 'Erken erişim' : 'Not Bahçesi rehberin'}</p></div>
                <button type="button" aria-label="Sohbet geçmişi" aria-pressed={showHistory} onClick={() => { setShowHistory(!showHistory); setShowInfo(false); setShowSettings(false); setHistory(gecmisiOku()); }} className={iconBtn + (showHistory ? ' bg-moss-100' : '')}><History size={20} /></button>
                <button type="button" disabled={!!pending || (!messages.length && !showHistory)} aria-label="Yeni sohbet" onClick={newChat} className={iconBtn + ' disabled:opacity-30'}><PenSquare size={19} /></button>
                <button type="button" aria-label="Bilge Ağaç ayarları" aria-expanded={showSettings} aria-controls="bilge-settings" onClick={() => { setShowSettings(!showSettings); setShowHistory(false); }} className={iconBtn + (showSettings ? ' bg-moss-100' : '')}><Settings2 size={19} /></button>
            </header>
            {showSettings ? <section id="bilge-settings" aria-label="Bilge Ağaç ayarları" className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
                <div><h3 className="text-lg text-moss-900">Bilge Ağaç ayarları</h3><p className="mt-1 text-sm text-sand-600">Sohbeti kendine göre düzenle.</p></div>
                <fieldset disabled={!!pending}><legend className="mb-2 text-sm font-semibold text-sand-900">Yanıt uzunluğu</legend>
                    <div className="grid grid-cols-3 gap-2">{BILGE_LENGTHS.map(length => <button key={length} type="button" aria-pressed={answerLength === length} onClick={() => { if (saveBilgeLength(length)) setAnswerLength(length); else setError('Tercih kaydedilemedi. Cihaz depolamasını kontrol edin.'); }} className={'min-h-11 rounded-xl border px-2 py-2 text-sm disabled:opacity-50 ' + (answerLength === length ? 'border-moss-400 bg-moss-100 font-semibold text-moss-900' : 'border-sand-200 bg-white text-sand-700')}>{BILGE_LENGTH_LABELS[length]}</button>)}</div>
                    <p className="mt-2 text-xs leading-5 text-sand-500">Kısa: doğrudan cevap. Dengeli: kısa açıklama ve adımlar. Ayrıntılı: örnekli anlatım. Sonraki yanıtlara uygulanır; gerekirse mesajında daha fazlasını isteyebilirsin.</p>
                </fieldset>
                <BilgeSpeechSettings />
                {error && <p role="alert" className="text-sm text-berry-700">{error}</p>}
                <button type="button" onClick={() => settings('models')} className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-sand-200 bg-white px-4 py-3 text-left text-sm text-moss-900"><Settings2 size={18} /><span className="flex-1">Sağlayıcı ve model ayarları</span><ArrowRight size={16} /></button>
                <button type="button" aria-expanded={showInfo} aria-controls="bilge-info" onClick={() => setShowInfo(!showInfo)} className="inline-flex min-h-11 items-center gap-2 text-sm text-sand-600"><Info size={17} />Gizlilik ve kullanım bilgileri</button>
                {showInfo && <div id="bilge-info" className="space-y-3 rounded-2xl border border-sand-200 bg-white p-4 text-xs leading-6 text-sand-600"><p>{mode === 'personal' && readAiMode() === 'personal' ? 'Bulut modeli seçiliyse mesajların sağlayıcıya iletilir; cihaz içi yerel modelde cihazında işlenir.' : 'Mesajların AI sağlayıcısına gönderilir.'} Notların otomatik paylaşılmaz. Sohbet geçmişi yalnız bu cihazda saklanır; geçmişten silebilirsin. AI yanılabilir.</p>{mode === 'hosted' && <p>{usage}</p>}<button type="button" onClick={() => settings('usage')} className="inline-flex min-h-11 items-center gap-2 text-moss-800"><BookOpen size={16} />Uygulama rehberi</button></div>}
                <button type="button" onClick={() => setShowSettings(false)} className="btn btn-primary w-full">Sohbete dön</button>
            </section> : showHistory ? <div role="region" aria-label="Sohbet geçmişi" className="bilge-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
                <h3 className="text-base font-semibold text-moss-900">Sohbet geçmişi</h3>
                <p className="mb-3 text-xs text-sand-500">Bu cihazda saklanır · dokun, kaldığın yerden devam et</p>
                {history.length > 0 && <label className="mb-3 flex min-h-11 items-center gap-2 rounded-2xl border border-sand-200 bg-white px-3 text-sand-500"><Search size={16} aria-hidden /><span className="sr-only">Sohbetlerde ara</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Sohbetlerde ara" className="min-w-0 flex-1 bg-transparent py-2 text-base text-sand-900 outline-none placeholder:text-sand-500" /></label>}
                {!history.length && <p className="py-10 text-center text-sm text-sand-500">Henüz kayıtlı sohbet yok. İlk sorunu sor, burada filizlensin 🌱</p>}
                {history.length > 0 && !filtered.length && <p className="py-6 text-center text-sm text-sand-500">Aramana uyan sohbet bulunamadı.</p>}
                <ul className="space-y-2">{filtered.map(s => <li key={s.id} className={'flex items-center gap-1 rounded-2xl border bg-white ' + (s.id === currentId ? 'border-moss-400' : 'border-sand-200')}>
                    <button type="button" onClick={() => restore(s)} className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-moss-50 text-moss-700"><MessageCircle size={17} /></span>
                        <span className="min-w-0"><span className="block truncate text-sm text-sand-900">{s.title}</span><span className="block text-xs text-sand-500">{zamanEtiketi(s.updatedAt)} · {s.messages.length} mesaj</span></span>
                    </button>
                    <button type="button" aria-label={'Sohbeti sil: ' + s.title} onClick={() => remove(s.id)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sand-500 hover:bg-berry-50 hover:text-berry-700"><Trash2 size={16} /></button>
                </li>)}</ul>
            </div> : <div className="relative flex min-h-0 flex-1">
            <div ref={transcript} onScroll={updateScroll} role="log" aria-label="Sohbet mesajları" aria-live="polite" className="bilge-scroll min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
                {!messages.length && <div className="pt-3 text-center"><span className="flex justify-center"><BilgeFace size={72} /></span><h3 className="mt-3 text-xl text-moss-900">Merhaba, ben Bilge Ağaç 🌳</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-sand-600">{BILGE_INTRO}</p></div>}
                {!messages.length && !pending && <div className="mx-auto grid max-w-md gap-2 sm:grid-cols-2">{starters.map(s => <button key={s} type="button" onClick={() => { setInput(s); inputRef.current?.focus(); }} className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-sand-200 px-3 py-2 text-left text-xs text-moss-900 hover:bg-moss-50"><span>{s}</span><ArrowRight size={14} className="shrink-0" /></button>)}</div>}
                {messages.map((m, index) => <article key={index} className={'flex ' + (m.role === 'user' ? 'justify-end pl-9' : 'justify-start')} aria-label={m.role === 'assistant' ? 'Bilge Ağaç yanıtı' : 'Mesajın'}><div className="min-w-0 max-w-full">
                    {m.role === 'assistant' && <div className="mb-1 flex items-center gap-2"><BilgeFace size={30} /><span className="text-xs font-semibold text-moss-900">Bilge Ağaç<span className="ml-2 text-[10px] font-normal text-sand-500">Yapay zekâ</span></span></div>}
                    <div className={'min-w-0 break-words rounded-[22px] px-4 py-3 text-sm leading-7 ' + (m.role === 'user' ? 'whitespace-pre-wrap rounded-br-md bg-moss-700 text-white' : 'rounded-bl-md text-sand-800')}>
                        {m.image && <button type="button" aria-label="Gönderilen fotoğrafı büyüt" onClick={() => setImagePreview(m.image!)} className="mb-2 block overflow-hidden rounded-2xl ring-1 ring-white/25"><img src={m.image} alt="Sohbete eklediğin fotoğraf" className="h-[60px] w-[72px] object-cover" /></button>}
                        {m.hadImage && !m.image && <span className="mb-1 block text-xs opacity-75">Fotoğraf eklenmişti · görsel geçmişte saklanmaz</span>}
                        {m.role === 'assistant' ? <BilgeMarkdown text={m.content} onNavigate={navigate} /> : m.content}
                    </div>
                    {m.role === 'assistant' && <BilgeMessageActions text={m.content} openEditor={() => openInEditor(m.content)} remoteSettings={() => settings('remote')} />}
                </div></article>)}
                {pending && <><article className="flex justify-end pl-9" aria-label="Mesajın"><div className="min-w-0 max-w-full whitespace-pre-wrap break-words rounded-[22px] rounded-br-md bg-moss-700 px-4 py-3 text-sm leading-7 text-white">
                    {pendingImage && <button type="button" aria-label="Gönderilen fotoğrafı büyüt" onClick={() => setImagePreview(pendingImage)} className="mb-2 block overflow-hidden rounded-2xl ring-1 ring-white/25"><img src={pendingImage} alt="Sohbete eklediğin fotoğraf" className="h-[60px] w-[72px] object-cover" /></button>}
                    {pending}
                </div></article><p role="status" className="flex items-center gap-2 pl-2 text-xs text-moss-700"><Loader2 size={15} className="animate-spin" />Bir fikir filizleniyor…</p></>}
                {error && <div role="alert" className="rounded-2xl border border-berry-200 bg-berry-50 p-3 text-sm leading-relaxed text-berry-800">{error}<button type="button" onClick={() => settings('models')} className="mt-2 block min-h-11 font-semibold underline underline-offset-4">AI ayarlarını aç</button></div>}
            </div>
            {(scrollState.up || scrollState.down) && <nav aria-label="Sohbette gezin" className="absolute bottom-2 right-2 flex gap-1 rounded-full border border-sand-200 bg-paper p-0.5 shadow-sm">
                {scrollState.up && <button type="button" aria-label="Sohbetin başına git" onClick={() => transcript.current?.scrollTo({ top: 0, behavior: 'smooth' })} className="flex h-11 w-11 items-center justify-center rounded-full text-moss-800"><ArrowUp size={17} /></button>}
                {scrollState.down && <button type="button" aria-label="Son mesaja git" onClick={() => transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: 'smooth' })} className="flex h-11 w-11 items-center justify-center rounded-full text-moss-800"><ArrowDown size={17} /></button>}
            </nav>}
            </div>}
            {!showHistory && !showSettings && <footer className="shrink-0 border-t border-sand-200 bg-paper px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 sm:px-5">
                <input ref={fileRef} type="file" accept="image/*" aria-label="Sohbete fotoğraf seç" className="hidden" onChange={event => { const f = event.target.files?.[0]; if (f) void attach(f); event.target.value = ''; }} />
                {mode === 'hosted' && status?.available === false && <button type="button" onClick={() => settings('models')} className="mb-2 block text-left text-xs text-sand-600 underline underline-offset-4">Hazır AI şu an kapalı · AI ayarları</button>}
                {/* Fotoğraf kartı mesaj kutusunun içinde durur: kutu tek parça
                    kalır, yazarken yukarı zıplamaz. */}
                <form onSubmit={event => { event.preventDefault(); void send(); }} className="rounded-[22px] border border-moss-200 bg-sand-50 p-2 focus-within:ring-2 focus-within:ring-moss-400">
                    {(image || imageBusy) && <div className="mb-1.5 flex items-center gap-2.5 rounded-2xl border border-moss-200/70 bg-white p-1.5 pr-1 shadow-sm">
                        {image
                            ? <button type="button" aria-label="Gönderilecek fotoğrafı büyüt" onClick={() => setImagePreview(image)} className="shrink-0 overflow-hidden rounded-xl ring-1 ring-sand-200"><img src={image} alt="Gönderilecek fotoğraf önizlemesi" className="h-12 w-12 object-cover" /></button>
                            : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-moss-50 text-moss-700"><Loader2 size={18} className="animate-spin" /></span>}
                        <span className="min-w-0 flex-1 leading-tight">
                            <span className="block truncate text-sm font-semibold text-moss-900">{imageBusy ? 'Fotoğraf hazırlanıyor…' : 'Fotoğraf eklendi'}</span>
                            <span className="block truncate text-[11px] text-sand-500">{imageBusy ? 'Küçültülüyor, birazdan hazır' : 'Büyütmek için dokun · mesajınla birlikte gider'}</span>
                        </span>
                        <button type="button" disabled={!!pending} aria-label="Fotoğrafı kaldır" title="Fotoğrafı kaldır" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sand-600 hover:bg-sand-100 disabled:opacity-40" onClick={() => { imageGeneration.current++; setImage(''); setImageBusy(false); }}><X size={17} /></button>
                    </div>}
                    <div className="flex items-end gap-2">
                    <button type="button" disabled={!!pending || imageBusy} aria-label="Fotoğraf ekle" title="Fotoğraf ekle veya yapıştır" className={`${iconBtn} ${image ? 'bg-moss-100 text-moss-900' : ''}`} onClick={() => fileRef.current?.click()}><ImagePlus size={21} /></button>
                    <label htmlFor="bilge-message" className="sr-only">Bilge Ağaç’a mesajın</label><textarea ref={inputRef} data-autofocus id="bilge-message" value={input} onChange={event => setInput(event.target.value)} onPaste={event => { const f = Array.from(event.clipboardData.items).find(item => item.type.startsWith('image/'))?.getAsFile(); if (f) { event.preventDefault(); void attach(f); } }} maxLength={4000} rows={1} placeholder="Bilge’ye yaz…" disabled={!!pending} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) { event.preventDefault(); void send(); } }} className="max-h-28 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-base leading-6 text-sand-900 outline-none placeholder:text-sand-500 disabled:opacity-60" />
                    {pending ? <button type="button" aria-label="Yanıtı durdur" onClick={() => { controller.current?.abort(); setPending(''); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sand-200 text-sand-800"><Square size={16} /></button> : <button type="submit" disabled={(!input.trim() && !image) || imageBusy || (mode === 'hosted' && status?.available === false && !image)} aria-label="Mesajı gönder" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-moss-700 text-white hover:bg-moss-800 disabled:opacity-40"><Send size={17} /></button>}
                    </div>
                </form>
            </footer>}
        </AiDialog>}
        {open && imagePreview && <ImagePreview src={imagePreview} onClose={() => setImagePreview('')} />}
    </>;
}

