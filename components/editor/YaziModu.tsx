'use client';

/**
 * Yazı modu (Cep Köprü'deki gibi).
 *
 * Not metni ekranı dolduran tek bir kutuda yazılır; klavyenin hemen üstünde
 * düğme şeridi durur. Şeritteki düğmeler ve sıraları Ayarlar → Bilgisayar
 * araçları → Yazı modu dişlisinden düzenlenir. Fare ve Makrolar düğmeleri
 * kutunun yerine dokunmatik yüzeyi ya da makro ızgarasını açar; aynı düğmeye
 * yeniden dokununca kutuya dönülür. Canlı yazma açıkken kutuda yazılan her
 * değişiklik bilgisayardaki odaklı alana da yansır.
 */
import { useEffect, useRef, useState } from 'react';
import {
    Check, Clipboard, ClipboardCopy, ClipboardPaste, Copy, CornerDownLeft, Eraser, Keyboard, Loader2, Mic, MonitorUp,
    MousePointer2, Radio, Send, Settings2, SpellCheck, Sparkles, TextCursorInput, Wand2
} from 'lucide-react';
import {
    dictate, makroHazir, metinFarkiAktar, sendCommand, sendKey, sendToComputerClipboard, telefonPanosunaYaz, telefonPanosunuBilgisayaraGonder,
    telefonPanosunuOku, typeOnComputer, type YaziAraci, type YaziDugmesi
} from '@/lib/remoteTools';
import { BULUT_SAGLAYICILAR, SesKaydedici, sesiYaziyaCevir } from '@/lib/bulutDikte';
import { makroCalismasi, makroCalisiyor, makroyuBaslat, makroyuDurdur } from '@/lib/makroCalistirici';
import { useRemotePrefs } from '@/lib/useRemotePrefs';
import { useKeyboardInset } from '@/lib/useKeyboardInset';
import { cx } from '@/components/ui/settings';
import FareYuzeyi from './FareYuzeyi';
import MakroDugmesi from './MakroDugmesi';

const ARAC_SIMGESI: Record<YaziAraci, typeof Send> = {
    enter: CornerDownLeft, mouse: MousePointer2, macros: Wand2, live: Radio, send: Send, dictation: Mic, pano: Clipboard,
    copy: Copy, paste: ClipboardPaste, clear: Eraser, ai_correct: SpellCheck, computer_clipboard: MonitorUp
};

export function yaziDugmesiSimgesi(d: YaziDugmesi): typeof Send {
    if (d.kind === 'builtin') return ARAC_SIMGESI[d.id as YaziAraci] ?? Send;
    if (d.kind === 'text') return TextCursorInput;
    if (d.kind === 'shortcut') return Keyboard;
    if (d.kind === 'ai') return Sparkles;
    return ClipboardCopy;
}

type Bildirim = { metin: string; ton: 'sending' | 'ok' | 'error' };

export default function YaziModu({ content, onContentChange, kutuRef, onAiMakro, aiCalisiyor, onAyarlarAc }: {
    content: string;
    onContentChange: (text: string) => void;
    /** Yapay zekâ makroları seçimi bu kutudan okusun diye editöre verilir. */
    kutuRef: React.RefObject<HTMLTextAreaElement>;
    /** null: imla düzeltme makrosu. */
    onAiMakro: (makroId: string | null) => void;
    aiCalisiyor: boolean;
    onAyarlarAc: () => void;
}) {
    const prefs = useRemotePrefs();
    const [panel, setPanel] = useState<'kutu' | 'fare' | 'makro'>('kutu');
    const [canli, setCanli] = useState(false);
    const [canliHata, setCanliHata] = useState(false);
    const [mesgul, setMesgul] = useState<string | null>(null);
    const [bulutDikte, setBulutDikte] = useState<'kayit' | 'gonder' | null>(null);
    const bulutKaydedici = useRef<SesKaydedici | null>(null);
    const [bildirim, setBildirim] = useState<Bildirim | null>(null);
    const [basarili, setBasarili] = useState<string | null>(null);
    const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [klavyeAcik, setKlavyeAcik] = useState(false);
    const altBosluk = useKeyboardInset(klavyeAcik);

    const guncelIcerik = useRef(content);
    guncelIcerik.current = content;
    const guncelPrefs = useRef(prefs);
    guncelPrefs.current = prefs;
    /** Canlı yazma: bilgisayara yazılmış metin, yazılacak son metin ve kilitler. */
    const canliSon = useRef('');
    const canliHedef = useRef('');
    const canliCalisiyor = useRef(false);
    const canliDurdu = useRef(true);

    useEffect(() => () => {
        canliDurdu.current = true;
        if (zamanlayici.current) clearTimeout(zamanlayici.current);
        void bulutKaydedici.current?.bitir().catch(() => null);
    }, []);

    const bildir = (b: Bildirim, dugmeId?: string) => {
        if (zamanlayici.current) clearTimeout(zamanlayici.current);
        setBildirim(b);
        setBasarili(b.ton === 'ok' && dugmeId ? dugmeId : null);
        if (b.ton !== 'sending') zamanlayici.current = setTimeout(() => { setBildirim(null); setBasarili(null); }, b.ton === 'error' ? 5000 : 2500);
    };
    const hataMetni = (e: unknown) => {
        const m = e instanceof Error ? e.message : '';
        return !m || /fetch|network|load failed|failed to/i.test(m) ? 'Bilgisayara ulaşılamadı; bağlantıyı Ayarlar → Bilgisayar bölümünden deneyin.' : m;
    };
    /** İşi çalıştırır, sürerken ve bitince şeridin üstünde kısa bilgi gösterir. */
    const calistir = async (dugmeId: string, is: () => Promise<void | string>, suruyor: string, basari: string) => {
        if (mesgul) return;
        setMesgul(dugmeId);
        bildir({ metin: suruyor, ton: 'sending' });
        try {
            const ileti = await is();
            bildir({ metin: ileti || basari, ton: 'ok' }, dugmeId);
        } catch (e) {
            bildir({ metin: hataMetni(e), ton: 'error' });
        } finally { setMesgul(null); }
    };

    const canliAktar = async () => {
        if (canliCalisiyor.current || canliDurdu.current) return;
        canliCalisiyor.current = true;
        try {
            while (!canliDurdu.current && canliSon.current !== canliHedef.current) {
                canliSon.current = await metinFarkiAktar(canliHedef.current, canliSon.current, guncelPrefs.current, yazilan => { canliSon.current = yazilan; });
            }
            setCanliHata(false);
        } catch (e) {
            canliDurdu.current = true;
            setCanliHata(true);
            bildir({ metin: 'Canlı yazma durdu: ' + hataMetni(e) + ' Canlı yazma düğmesine dokunarak yeniden başlatın.', ton: 'error' });
        } finally {
            canliCalisiyor.current = false;
            if (!canliDurdu.current && canliSon.current !== canliHedef.current) void canliAktar();
        }
    };
    useEffect(() => {
        if (!canli || canliDurdu.current) return;
        canliHedef.current = content;
        void canliAktar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content, canli]);
    const canliDegistir = () => {
        if (canli && !canliHata) {
            canliDurdu.current = true;
            setCanli(false);
            bildir({ metin: 'Canlı yazma kapandı.', ton: 'ok' });
            return;
        }
        // Açılırken kutudaki metin gönderilmez; bundan sonra yazılanlar aktarılır.
        canliDurdu.current = false;
        canliSon.current = guncelIcerik.current;
        canliHedef.current = guncelIcerik.current;
        setCanliHata(false);
        setCanli(true);
        bildir({ metin: 'Canlı yazma açık: yazdıklarınız bilgisayara da yazılıyor.', ton: 'ok' });
    };

    /** Kutudaki seçim (yoksa tüm metin). */
    const secim = () => {
        const kutu = kutuRef.current;
        if (kutu && kutu.selectionStart !== kutu.selectionEnd) return content.slice(kutu.selectionStart, kutu.selectionEnd);
        return content;
    };
    /** İmlecin olduğu yere metin ekler; kutu yoksa sona. */
    const imleceEkle = (metin: string) => {
        const kutu = kutuRef.current;
        const bas = kutu && panel === 'kutu' ? kutu.selectionStart : content.length;
        const son = kutu && panel === 'kutu' ? kutu.selectionEnd : content.length;
        const yeni = content.slice(0, bas) + metin + content.slice(son);
        onContentChange(yeni);
        requestAnimationFrame(() => {
            const k = kutuRef.current;
            if (k) { k.selectionStart = k.selectionEnd = bas + metin.length; }
        });
    };
    const dikteEkle = (metin: string) => {
        const onceki = guncelIcerik.current;
        onContentChange(onceki && !/\s$/.test(onceki) ? onceki + ' ' + metin : onceki + metin);
    };
    const dikteBaslat = () => {
        if (prefs.dictationEngine !== 'cloud') {
            void calistir('dictation', async () => { const metin = await dictate(prefs.dictationLanguage); if (metin) dikteEkle(metin); }, 'Dinleniyor…', 'Dikte kutuya eklendi.');
            return;
        }
        const ad = BULUT_SAGLAYICILAR.find(b => b.id === prefs.dictationCloud)?.ad ?? 'Bulut';
        if (bulutDikte === 'kayit' && bulutKaydedici.current) {
            const kaydedici = bulutKaydedici.current; bulutKaydedici.current = null;
            setBulutDikte('gonder');
            void calistir('dictation', async () => {
                try {
                    const wav = await kaydedici.bitir();
                    if (!wav) throw new Error('Konuşma duyulmadı.');
                    const metin = await sesiYaziyaCevir(wav, prefs.dictationCloud, prefs.dictationLanguage);
                    if (!metin) throw new Error('Konuşma anlaşılamadı.');
                    dikteEkle(metin);
                } finally { setBulutDikte(null); }
            }, ad + ' yazıya döküyor…', 'Dikte kutuya eklendi.');
            return;
        }
        const kaydedici = new SesKaydedici({ bolumle: false });
        void kaydedici.baslat().then(() => {
            bulutKaydedici.current = kaydedici; setBulutDikte('kayit');
            bildir({ metin: 'Dinleniyor (' + ad + '): bitirince Dikte düğmesine yeniden dokunun.', ton: 'sending' });
        }).catch(e => bildir({ metin: e instanceof Error ? e.message : 'Mikrofon açılamadı.', ton: 'error' }));
    };

    const bas = (d: YaziDugmesi) => {
        if (d.kind === 'text') { void calistir(d.id, () => typeOnComputer(d.value, prefs), 'Yazılıyor…', '"' + d.title + '" bilgisayara yazıldı.'); return; }
        if (d.kind === 'shortcut') { void calistir(d.id, () => sendKey(d.value, prefs), 'Gönderiliyor…', d.value + ' gönderildi.'); return; }
        if (d.kind === 'macro') {
            const makro = prefs.macros.find(m => m.id === d.value);
            if (!makro || !makroHazir(makro)) { bildir({ metin: 'Bu düğmenin makrosu bulunamadı; düğmeyi ayarlardan düzenleyin.', ton: 'error' }); return; }
            // Tekrarlayan makrolar şeridi kilitlemez; ikinci dokunuş durdurur.
            if (makroCalisiyor(makro.id)) { makroyuDurdur(makro.id); bildir({ metin: '"' + d.title + '" durduruldu.', ton: 'ok' }); return; }
            const ad = makro.name.trim() || d.title;
            if (makroCalismasi(makro) !== 'tek') bildir({ metin: '"' + ad + '" çalışıyor; durdurmak için yeniden dokunun.', ton: 'sending' });
            void makroyuBaslat(makro, prefs)
                .then(() => bildir({ metin: '"' + ad + '" çalıştırıldı.', ton: 'ok' }, d.id))
                .catch(e => bildir({ metin: hataMetni(e), ton: 'error' }));
            return;
        }
        if (d.kind === 'ai' || d.id === 'ai_correct') {
            if (!content.trim()) { bildir({ metin: 'Kutu boş; önce metin yazın.', ton: 'error' }); return; }
            const makroId = d.kind === 'ai' ? d.value : null;
            // Yapay zekâ seçimi kutudan okur; fare ya da makro paneli açıksa önce kutuya dönülür.
            if (panel !== 'kutu') { setPanel('kutu'); requestAnimationFrame(() => onAiMakro(makroId)); } else onAiMakro(makroId);
            return;
        }
        switch (d.id as YaziAraci) {
            case 'enter': void calistir(d.id, () => sendKey('ENTER', prefs), 'Enter gönderiliyor…', 'Enter gönderildi.'); break;
            case 'mouse': setPanel(panel === 'fare' ? 'kutu' : 'fare'); break;
            case 'macros': setPanel(panel === 'makro' ? 'kutu' : 'makro'); break;
            case 'live': canliDegistir(); break;
            case 'send':
                if (!content.trim()) { bildir({ metin: 'Gönderilecek metin yok.', ton: 'error' }); break; }
                void calistir(d.id, () => typeOnComputer(content, prefs), 'Bilgisayara yazılıyor…', 'Metin bilgisayara yazıldı.');
                break;
            case 'dictation': dikteBaslat(); break;
            case 'pano':
                if (!content.trim()) { bildir({ metin: 'Panoya gönderilecek metin yok.', ton: 'error' }); break; }
                void calistir(d.id, () => sendToComputerClipboard(secim(), prefs), 'Bilgisayar panosuna gönderiliyor…', 'Bilgisayar panosuna gönderildi; Ctrl+V ile yapıştırabilirsiniz.');
                break;
            case 'computer_clipboard':
                void calistir(d.id, () => telefonPanosunuBilgisayaraGonder(prefs), 'Telefon panosu gönderiliyor…', 'Telefon panosu bilgisayar panosuna gönderildi.');
                break;
            case 'copy': {
                const metin = secim();
                if (!metin) { bildir({ metin: 'Kopyalanacak metin yok.', ton: 'error' }); break; }
                void calistir(d.id, () => telefonPanosunaYaz({ metin }), 'Kopyalanıyor…', 'Telefon panosuna kopyalandı.');
                break;
            }
            case 'paste':
                void calistir(d.id, async () => {
                    const pano = await telefonPanosunuOku();
                    if (!pano.metin) throw new Error(pano.gorsel ? 'Panoda metin değil görsel var.' : 'Panoda metin yok.');
                    imleceEkle(pano.metin);
                }, 'Yapıştırılıyor…', 'Panodaki metin kutuya eklendi.');
                break;
            case 'clear':
                if (!content) break;
                // Canlı yazmada temizlemek bilgisayardaki metni silmesin: başlangıç sıfırlanır.
                canliSon.current = ''; canliHedef.current = '';
                onContentChange('');
                bildir({ metin: 'Kutu temizlendi.', ton: 'ok' });
                break;
        }
    };

    const aktifMi = (d: YaziDugmesi) => d.kind === 'builtin' && (
        (d.id === 'live' && canli) || (d.id === 'mouse' && panel === 'fare') || (d.id === 'macros' && panel === 'makro') || (d.id === 'dictation' && bulutDikte === 'kayit'));
    const makrolar = prefs.macros.filter(makroHazir);
    const dugmeler = prefs.yaziDugmeleri;

    return <div id="yazi-modu" data-yazi-modu className="flex min-h-0 flex-1 flex-col" style={altBosluk ? { paddingBottom: altBosluk } : undefined}>
        <div className="flex min-h-0 flex-1 flex-col px-2 pt-2 sm:px-6 sm:pt-4">
            <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col">
                {panel === 'kutu' && <textarea id="yazi-modu-kutu" ref={kutuRef} value={content} onChange={e => onContentChange(e.target.value)}
                    onFocus={() => setKlavyeAcik(true)} onBlur={() => setKlavyeAcik(false)}
                    placeholder={canli ? 'Yazdıklarınız bilgisayara da yazılıyor…' : 'Yazın; düğmelerle bilgisayara gönderin.'}
                    aria-label="Yazı modu metni" readOnly={aiCalisiyor}
                    className={cx('min-h-0 w-full flex-1 resize-none rounded-2xl border bg-white px-4 py-3 text-base leading-relaxed text-sand-800 outline-none placeholder:text-sand-400 focus:border-moss-400',
                        canli ? 'border-moss-400' : 'border-sand-200')} />}
                {panel === 'fare' && <div className="flex min-h-0 flex-1 flex-col gap-2">
                    <FareYuzeyi prefs={prefs} onHata={m => bildir({ metin: m, ton: 'error' })} className="flex min-h-[30dvh] flex-1 touch-none select-none items-center justify-center rounded-2xl border border-moss-200 bg-gradient-to-br from-moss-50 to-sand-50 p-6 text-center text-sm text-sand-600">
                        Sürükle: imleci hareket ettir · Bir kez dokun: sol tık
                    </FareYuzeyi>
                    <div className="grid shrink-0 grid-cols-4 gap-1.5">
                        <button type="button" className="btn btn-secondary min-h-11 px-1 text-xs" onClick={() => void calistir('fare-sol', () => sendCommand('mc:1', prefs), 'Gönderiliyor…', 'Sol tık gönderildi.')}>Sol tık</button>
                        <button type="button" className="btn btn-secondary min-h-11 px-1 text-xs" onClick={() => void calistir('fare-yukari', () => sendCommand('ms:3', prefs), 'Gönderiliyor…', 'Yukarı kaydırıldı.')}>↑ Kaydır</button>
                        <button type="button" className="btn btn-secondary min-h-11 px-1 text-xs" onClick={() => void calistir('fare-asagi', () => sendCommand('ms:-3', prefs), 'Gönderiliyor…', 'Aşağı kaydırıldı.')}>↓ Kaydır</button>
                        <button type="button" className="btn btn-secondary min-h-11 px-1 text-xs" onClick={() => void calistir('fare-sag', () => sendCommand('mc:2', prefs), 'Gönderiliyor…', 'Sağ tık gönderildi.')}>Sağ tık</button>
                    </div>
                </div>}
                {panel === 'makro' && <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-sand-200 bg-white p-2">
                    {makrolar.length === 0
                        ? <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-3 px-4 text-center text-xs text-sand-600">
                            Henüz makro yok. Makrolar Ayarlar → Kısayollar ve ekranlar bölümünden eklenir.
                        </div>
                        : <div className="grid grid-cols-3 content-start gap-1.5 sm:grid-cols-4">
                            {makrolar.map(m => <MakroDugmesi key={m.id} makro={m} prefs={prefs} hataMetni={hataMetni}
                                onSonuc={(metin, hata) => bildir({ metin, ton: hata ? 'error' : 'ok' })}
                                className="flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl border border-sand-200 bg-white px-1.5 py-2 text-center text-xs font-semibold text-sand-800 hover:border-moss-500/50 hover:bg-moss-50 active:scale-[0.98]">
                                <Wand2 size={16} className="text-moss-700" aria-hidden="true" />
                                <span className="w-full truncate">{m.name.trim()}</span>
                            </MakroDugmesi>)}
                        </div>}
                </div>}
            </div>
        </div>
        <div className="shrink-0 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.375rem)] pt-1.5 sm:px-6">
            <div className="mx-auto w-full max-w-4xl">
                {bildirim && <p id="yazi-modu-bildirim" role="status" aria-live="polite"
                    className={cx('mb-1.5 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium',
                        bildirim.ton === 'error' ? 'bg-berry-50 text-berry-700' : bildirim.ton === 'ok' ? 'bg-moss-50 text-moss-800' : 'bg-sand-100 text-sand-700')}>
                    {bildirim.ton === 'sending' ? <Loader2 size={13} className="shrink-0 animate-spin" aria-hidden="true" /> : bildirim.ton === 'ok' ? <Check size={13} className="shrink-0" aria-hidden="true" /> : null}
                    <span className="min-w-0">{bildirim.metin}</span>
                </p>}
                {dugmeler.length === 0
                    ? <button type="button" onClick={onAyarlarAc} className="btn btn-secondary min-h-11 w-full text-sm"><Settings2 size={16} aria-hidden="true" /> Yazı modu düğmelerini ekle</button>
                    : <div id="yazi-modu-serit" role="group" aria-label="Yazı modu düğmeleri"
                        className="grid grid-cols-4 gap-1 min-[320px]:grid-cols-5 min-[350px]:grid-cols-6 sm:grid-cols-8 lg:grid-cols-12">
                        {dugmeler.map(d => {
                            const Icon = yaziDugmesiSimgesi(d);
                            const aktif = aktifMi(d);
                            const calisiyor = mesgul === d.id || (d.id === 'dictation' && bulutDikte === 'gonder') || (aiCalisiyor && (d.kind === 'ai' || d.id === 'ai_correct'));
                            const temizle = d.kind === 'builtin' && d.id === 'clear';
                            return <button key={d.id} type="button" id={'yazi-dugme-' + d.id} aria-pressed={d.kind === 'builtin' && ['live', 'mouse', 'macros', 'dictation'].includes(d.id) ? aktif : undefined}
                                title={d.title} disabled={!!mesgul && mesgul !== d.id && !['mouse', 'macros', 'clear', 'live'].includes(d.id)}
                                // Klavye açıkken dokunuş kutudan odağı almasın; klavye kapanmasın.
                                onPointerDown={e => { if (panel === 'kutu') e.preventDefault(); }}
                                onClick={() => bas(d)}
                                className={cx('flex min-h-[48px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-0.5 py-1 text-[10px] font-semibold leading-tight transition-colors disabled:opacity-50',
                                    aktif ? 'border-moss-600 bg-moss-100 text-moss-800'
                                        : temizle ? 'border-berry-200 bg-white text-berry-700 hover:bg-berry-50'
                                            : 'border-sand-200 bg-white text-sand-700 hover:border-moss-400/60 hover:bg-moss-50')}>
                                {calisiyor ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : basarili === d.id ? <Check size={16} aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}
                                <span className="w-full truncate text-center">{d.id === 'live' && canli ? 'Canlı açık' : d.id === 'dictation' && bulutDikte === 'kayit' ? 'Bitir' : d.title}</span>
                            </button>;
                        })}
                    </div>}
            </div>
        </div>
    </div>;
}
