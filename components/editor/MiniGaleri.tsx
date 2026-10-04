'use client';

/**
 * Editöre özel mini galeri: tam sayfa açılır.
 *
 * Üstte dört bilgisayar aracı (seçilenleri bilgisayara, seçilenleri PC
 * panosuna, not metnini PC panosuna, telefon panosunu PC panosuna); ortada
 * görseller ve metin kartları. Bir öğeye basılı tutunca seçim başlar, sonra
 * dokunuşlar seçimi değiştirir; "Tümünü seç" hepsini seçer. Altta WhatsApp'taki
 * gibi küçük bir yazma kutusu: telefon panosundaki görsel ya da metin
 * yapıştırılıp galeriye gönderilir.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, Camera, Check, CheckCheck, ClipboardCopy, ClipboardPaste, FileText, ImagePlus, GalleryThumbnails, Loader2, Monitor, SendHorizontal, Trash2, X } from 'lucide-react';
import { dosyalariBilgisayaraGonder, sendToComputerClipboard, telefonPanosunuBilgisayaraGonder, telefonPanosunuOku } from '@/lib/remoteTools';
import { useRemotePrefs } from '@/lib/useRemotePrefs';
import { dosyalariGaleriyeEkle, galeridenSil, galeriyeEkle, gorseliHazirla, metinKarti, useMiniGaleri } from '@/lib/miniGaleri';
import type { GaleriOgesi } from '@/lib/miniGaleri';
import { cx } from '@/components/ui/settings';

type Durum = { metin: string; ton: 'sending' | 'ok' | 'error' } | null;

/** Öğenin önizleme adresi: görseller için nesne adresi, kapanınca bırakılır. */
function useOnizlemeler(ogeler: GaleriOgesi[]) {
    const [adresler, setAdresler] = useState<Record<string, string>>({});
    useEffect(() => {
        const yeni: Record<string, string> = {};
        ogeler.forEach(o => { if (o.tur === 'gorsel' && o.veri) yeni[o.id] = URL.createObjectURL(o.veri); });
        setAdresler(yeni);
        return () => Object.values(yeni).forEach(a => URL.revokeObjectURL(a));
    }, [ogeler]);
    return adresler;
}

export default function MiniGaleri({ notId, editorMetni, onKapat }: { notId: string; editorMetni: string; onKapat: () => void }) {
    const prefs = useRemotePrefs();
    const { ogeler, yukleniyor } = useMiniGaleri(notId);
    const onizleme = useOnizlemeler(ogeler);
    const [secili, setSecili] = useState<Set<string>>(new Set());
    const [buyuk, setBuyuk] = useState<GaleriOgesi | null>(null);
    const [durum, setDurum] = useState<Durum>(null);
    const [mesgul, setMesgul] = useState(false);
    const [taslak, setTaslak] = useState('');
    const [ekler, setEkler] = useState<{ id: string; veri: Blob; adres: string }[]>([]);
    const durumZamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
    const kameraRef = useRef<HTMLInputElement>(null);
    const galeriRef = useRef<HTMLInputElement>(null);
    const basili = useRef<{ zamanlayici: ReturnType<typeof setTimeout> | null; x: number; y: number; tetiklendi: boolean }>({ zamanlayici: null, x: 0, y: 0, tetiklendi: false });
    const secimKipi = secili.size > 0;

    // Silinen öğeler seçimden düşer.
    useEffect(() => {
        setSecili(s => { const kalan = new Set([...s].filter(id => ogeler.some(o => o.id === id))); return kalan.size === s.size ? s : kalan; });
    }, [ogeler]);
    // Geri tuşu / Esc: önce büyük görünüm, sonra seçim, en son galeri kapanır.
    const geri = useRef(() => { });
    geri.current = () => { if (buyuk) setBuyuk(null); else if (secimKipi) setSecili(new Set()); else onKapat(); };
    useEffect(() => {
        const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') geri.current(); };
        window.addEventListener('keydown', tus);
        let kaldir: (() => void) | undefined; let bitti = false;
        if (Capacitor.isNativePlatform()) void import('@capacitor/app').then(async ({ App }) => {
            const d = await App.addListener('backButton', () => geri.current());
            if (bitti) void d.remove(); else kaldir = () => void d.remove();
        });
        return () => { bitti = true; window.removeEventListener('keydown', tus); kaldir?.(); };
    }, []);
    const eklerRef = useRef(ekler);
    eklerRef.current = ekler;
    useEffect(() => () => {
        if (durumZamanlayici.current) clearTimeout(durumZamanlayici.current);
        eklerRef.current.forEach(e => URL.revokeObjectURL(e.adres));
    }, []);

    const bildir = (d: Durum, sure = 3000) => {
        if (durumZamanlayici.current) clearTimeout(durumZamanlayici.current);
        setDurum(d);
        if (d && d.ton !== 'sending') durumZamanlayici.current = setTimeout(() => setDurum(null), d.ton === 'error' ? 5000 : sure);
    };
    const calistir = async (gonderiliyor: string, is: () => Promise<string>) => {
        setMesgul(true); bildir({ metin: gonderiliyor, ton: 'sending' });
        try { bildir({ metin: await is(), ton: 'ok' }); }
        catch (e) { bildir({ metin: e instanceof Error ? e.message : 'İşlem başarısız.', ton: 'error' }); }
        finally { setMesgul(false); }
    };

    const seciliOgeler = useMemo(() => ogeler.filter(o => secili.has(o.id)), [ogeler, secili]);
    const dosyaya = (o: GaleriOgesi) => ({ ad: o.ad, veri: o.tur === 'gorsel' && o.veri ? o.veri : new Blob([o.metin ?? ''], { type: 'text/plain;charset=utf-8' }) });
    const secimGerekli = () => { bildir({ metin: 'Önce gönderilecekleri seçin: bir öğeye basılı tutun ya da Tümünü seç’e dokunun.', ton: 'error' }); };

    const araclar = [
        {
            id: 'galeri-bilgisayara', Icon: Monitor, ad: 'Bilgisayara', aciklama: 'Seçilenleri bilgisayara gönder',
            calis: () => {
                if (!seciliOgeler.length) return secimGerekli();
                void calistir(seciliOgeler.length + ' öğe bilgisayara gönderiliyor…', async () => {
                    await dosyalariBilgisayaraGonder(seciliOgeler.map(dosyaya), 'dosya', prefs, oran => setDurum({ metin: 'Bilgisayara gönderiliyor… %' + Math.round(oran * 100), ton: 'sending' }));
                    return seciliOgeler.length + ' öğe bilgisayarda Resimler › Not Bahçesi klasörüne kaydedildi ✓';
                });
            }
        },
        {
            id: 'galeri-pc-panosu', Icon: ClipboardCopy, ad: 'PC panosuna', aciklama: 'Seçilenleri bilgisayar panosuna gönder',
            calis: () => {
                if (!seciliOgeler.length) return secimGerekli();
                void calistir('Bilgisayar panosuna gönderiliyor…', async () => {
                    // Yalnız metin kartları seçiliyse pano düz metin olur.
                    if (seciliOgeler.every(o => o.tur === 'metin')) {
                        await sendToComputerClipboard(seciliOgeler.map(o => o.metin ?? '').join('\n\n'), prefs);
                    } else {
                        await dosyalariBilgisayaraGonder(seciliOgeler.map(dosyaya), 'pano', prefs, oran => setDurum({ metin: 'Panoya gönderiliyor… %' + Math.round(oran * 100), ton: 'sending' }));
                    }
                    return 'Bilgisayar panosuna gönderildi ✓ Ctrl+V ile yapıştırabilirsiniz';
                });
            }
        },
        {
            id: 'galeri-not-panoya', Icon: FileText, ad: 'Notu panoya', aciklama: 'Editördeki metni bilgisayar panosuna gönder',
            calis: () => {
                if (!editorMetni.trim()) { bildir({ metin: 'Editör metni boş.', ton: 'error' }); return; }
                void calistir('Not metni bilgisayar panosuna gönderiliyor…', async () => {
                    await sendToComputerClipboard(editorMetni, prefs);
                    return 'Not metni bilgisayar panosuna gönderildi ✓';
                });
            }
        },
        {
            id: 'galeri-telefon-panosu', Icon: ClipboardPaste, ad: 'Telefon panosu', aciklama: 'Telefon panosundakini bilgisayar panosuna gönder',
            calis: () => void calistir('Telefon panosu bilgisayara gönderiliyor…', () => telefonPanosunuBilgisayaraGonder(prefs))
        }
    ];

    const sec = (id: string) => setSecili(s => { const y = new Set(s); if (y.has(id)) y.delete(id); else y.add(id); return y; });
    const tumunuSec = () => setSecili(secili.size === ogeler.length ? new Set() : new Set(ogeler.map(o => o.id)));
    const sil = () => {
        const idler = [...secili];
        if (!idler.length) return;
        void galeridenSil(notId, idler).then(() => { setSecili(new Set()); bildir({ metin: idler.length + ' öğe galeriden silindi.', ton: 'ok' }); })
            .catch(e => bildir({ metin: e instanceof Error ? e.message : 'Silinemedi.', ton: 'error' }));
    };

    // Basılı tutma: 450 ms sonra seçer; parmak kayarsa (kaydırma) iptal.
    const basBasla = (id: string, e: React.PointerEvent) => {
        const b = basili.current;
        if (b.zamanlayici) clearTimeout(b.zamanlayici);
        b.x = e.clientX; b.y = e.clientY; b.tetiklendi = false;
        b.zamanlayici = setTimeout(() => {
            b.tetiklendi = true; b.zamanlayici = null;
            sec(id);
            try { navigator.vibrate?.(25); } catch { /* titreşim yok */ }
        }, 450);
    };
    const basIptal = () => { const b = basili.current; if (b.zamanlayici) { clearTimeout(b.zamanlayici); b.zamanlayici = null; } };
    const basHareket = (e: React.PointerEvent) => {
        const b = basili.current;
        if (b.zamanlayici && Math.hypot(e.clientX - b.x, e.clientY - b.y) > 10) basIptal();
    };
    const dokun = (o: GaleriOgesi) => {
        if (basili.current.tetiklendi) { basili.current.tetiklendi = false; return; }
        if (secimKipi) sec(o.id); else setBuyuk(o);
    };

    const dosyaEkle = async (dosyalar: FileList | null) => {
        if (!dosyalar?.length) return;
        try {
            const n = await dosyalariGaleriyeEkle(notId, Array.from(dosyalar));
            bildir(n ? { metin: n + ' görsel galeriye eklendi.', ton: 'ok' } : { metin: 'Görsel bulunamadı.', ton: 'error' });
        } catch (e) { bildir({ metin: e instanceof Error ? e.message : 'Eklenemedi.', ton: 'error' }); }
    };
    const ekEkle = (veri: Blob) => setEkler(e => [...e, { id: Math.random().toString(36).slice(2), veri, adres: URL.createObjectURL(veri) }]);
    const panodanYapistir = async () => {
        try {
            const pano = await telefonPanosunuOku();
            if (pano.gorsel) ekEkle(pano.gorsel);
            else if (pano.metin) setTaslak(t => t ? t + (t.endsWith(' ') ? '' : ' ') + pano.metin : pano.metin!);
            else bildir({ metin: 'Telefon panosu boş.', ton: 'error' });
        } catch (e) { bildir({ metin: e instanceof Error ? e.message : 'Pano okunamadı.', ton: 'error' }); }
    };
    const yapistirildi = (e: React.ClipboardEvent) => {
        const gorseller = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/'));
        if (!gorseller.length) return;
        e.preventDefault();
        gorseller.forEach(ekEkle);
    };
    const gonder = async () => {
        const metin = taslak.trim();
        if (!metin && !ekler.length) return;
        try {
            const yeni = [...await Promise.all(ekler.map((e, i) => gorseliHazirla(e.veri, i))), ...(metin ? [metinKarti(metin)] : [])];
            await galeriyeEkle(notId, yeni);
            ekler.forEach(e => URL.revokeObjectURL(e.adres));
            setEkler([]); setTaslak('');
        } catch (e) { bildir({ metin: e instanceof Error ? e.message : 'Gönderilemedi.', ton: 'error' }); }
    };

    if (typeof document === 'undefined') return null;
    return createPortal(<div id="mini-galeri" data-geri-yonetir="" role="dialog" aria-modal="true" aria-label="Mini galeri"
        className="fixed inset-0 z-[110] flex flex-col bg-sand-50">
        {/* Başlık */}
        <header className="shrink-0 border-b border-sand-200 bg-white/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
            <div className="flex h-14 items-center gap-1 px-2 sm:px-4">
                {secimKipi ? <>
                    <button type="button" onClick={() => setSecili(new Set())} aria-label="Seçimi kapat" className="flex h-11 w-11 items-center justify-center rounded-full text-sand-700 hover:bg-sand-100"><X size={20} /></button>
                    <p className="min-w-0 flex-1 truncate text-base font-semibold text-sand-900">{secili.size} seçildi</p>
                    <button type="button" id="galeri-sil" onClick={sil} aria-label="Seçilenleri sil" title="Seçilenleri sil" className="flex h-11 w-11 items-center justify-center rounded-full text-berry-700 hover:bg-berry-50"><Trash2 size={19} /></button>
                </> : <>
                    <button type="button" onClick={onKapat} aria-label="Galeriyi kapat" className="flex h-11 w-11 items-center justify-center rounded-full text-sand-700 hover:bg-sand-100"><ArrowLeft size={20} /></button>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-sand-900">Mini galeri</p>
                        <p className="text-[11px] leading-none text-sand-500">{ogeler.length ? ogeler.length + ' öğe · seçmek için basılı tutun' : 'Bu nota özel'}</p>
                    </div>
                </>}
                {ogeler.length > 0 && <button type="button" id="galeri-tumunu-sec" onClick={tumunuSec}
                    className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-moss-700 hover:bg-moss-50">
                    <CheckCheck size={17} />{secili.size === ogeler.length ? 'Seçimi kaldır' : 'Tümünü seç'}
                </button>}
            </div>
            {/* Bilgisayar araçları */}
            <div className="grid grid-cols-4 gap-1.5 px-2 pb-2.5 sm:gap-2 sm:px-4">
                {araclar.map(({ id, Icon, ad, aciklama, calis }) => {
                    const seceli = id === 'galeri-bilgisayara' || id === 'galeri-pc-panosu';
                    const pasif = seceli && !secimKipi;
                    return <button key={id} id={id} type="button" disabled={mesgul} onClick={calis} title={aciklama} aria-label={aciklama}
                        className={cx('flex min-w-0 flex-col items-center justify-start gap-1 rounded-2xl border px-1 py-2 text-[11px] font-medium leading-tight transition-colors disabled:opacity-60 sm:text-xs',
                            pasif ? 'border-sand-200 bg-white text-sand-500' : 'border-moss-200 bg-moss-50 text-moss-800 hover:bg-moss-100 active:scale-[0.98]')}>
                        <Icon size={19} aria-hidden="true" />
                        <span className="text-center">{ad}</span>
                    </button>;
                })}
            </div>
        </header>

        {/* Durum bildirimi */}
        {durum && <div id="galeri-durum" role="status" aria-live="polite"
            className={cx('pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top,0px)+8.5rem)] z-10 flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium shadow-lg',
                durum.ton === 'error' ? 'bg-berry-700 text-berry-50' : 'bg-moss-800 text-moss-50')}>
            {durum.ton === 'sending' ? <Loader2 size={16} className="shrink-0 animate-spin" /> : durum.ton === 'ok' ? <Check size={16} className="shrink-0" /> : <X size={16} className="shrink-0" />}
            <span>{durum.metin}</span>
        </div>}

        {/* Izgara */}
        <main className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-4 sm:py-4">
            {yukleniyor ? <div className="flex h-full items-center justify-center text-sand-500"><Loader2 className="animate-spin" /></div>
                : !ogeler.length ? <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-moss-100 text-moss-700"><GalleryThumbnails size={30} /></span>
                    <div className="space-y-1">
                        <p className="font-semibold text-sand-900">Galeri boş</p>
                        <p className="text-sm text-sand-600">Fotoğraf çekin, telefon galerisinden aktarın ya da aşağıdaki kutuya panodan yapıştırın.</p>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => kameraRef.current?.click()} className="btn btn-primary min-h-11 gap-1.5 px-4 text-sm"><Camera size={16} /> Fotoğraf çek</button>
                        <button type="button" onClick={() => galeriRef.current?.click()} className="btn btn-secondary min-h-11 gap-1.5 px-4 text-sm"><ImagePlus size={16} /> Galeriden</button>
                    </div>
                </div>
                    : <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:grid-cols-6" aria-label="Galeri öğeleri">
                        {ogeler.map(o => {
                            const s = secili.has(o.id);
                            return <li key={o.id} className="relative aspect-square">
                                <button type="button" aria-pressed={secimKipi ? s : undefined} aria-label={(o.tur === 'gorsel' ? 'Görsel ' : 'Metin ') + o.ad}
                                    data-galeri-oge={o.id}
                                    onPointerDown={e => basBasla(o.id, e)} onPointerMove={basHareket} onPointerUp={basIptal} onPointerLeave={basIptal} onPointerCancel={basIptal}
                                    onContextMenu={e => e.preventDefault()} onClick={() => dokun(o)}
                                    className={cx('group h-full w-full select-none overflow-hidden rounded-xl bg-sand-200 transition-transform duration-150 [-webkit-touch-callout:none]', s && 'scale-[0.92] ring-[3px] ring-moss-600')}>
                                    {o.tur === 'gorsel' && onizleme[o.id]
                                        // eslint-disable-next-line @next/next/no-img-element
                                        ? <img src={onizleme[o.id]} alt="" draggable={false} className="h-full w-full object-cover" />
                                        : <span className="flex h-full w-full flex-col gap-1 bg-white p-2 text-left">
                                            <FileText size={14} className="shrink-0 text-moss-600" aria-hidden="true" />
                                            <span className="line-clamp-5 whitespace-pre-wrap break-words text-[11px] leading-snug text-sand-800">{o.metin}</span>
                                        </span>}
                                </button>
                                {secimKipi && <span aria-hidden="true" className={cx('pointer-events-none absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 shadow',
                                    s ? 'border-white bg-moss-600 text-white' : 'border-white/90 bg-black/20')}>{s && <Check size={14} strokeWidth={3} />}</span>}
                            </li>;
                        })}
                    </ul>}
        </main>

        {/* WhatsApp benzeri yazma kutusu */}
        <footer className="shrink-0 border-t border-sand-200 bg-white px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-2 sm:px-4">
            {ekler.length > 0 && <div className="mb-2 flex gap-2 overflow-x-auto">
                {ekler.map(e => <div key={e.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-sand-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={e.adres} alt="Yapıştırılan görsel" className="h-full w-full object-cover" />
                    <button type="button" aria-label="Eki kaldır" onClick={() => { URL.revokeObjectURL(e.adres); setEkler(l => l.filter(x => x.id !== e.id)); }}
                        className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white"><X size={13} /></button>
                </div>)}
            </div>}
            <div className="flex items-end gap-1.5">
                <div className="flex shrink-0 items-center">
                    <button type="button" id="galeri-kamera" onClick={() => kameraRef.current?.click()} aria-label="Fotoğraf çek" title="Fotoğraf çek" className="flex h-11 w-10 items-center justify-center rounded-full text-sand-600 hover:bg-sand-100"><Camera size={20} /></button>
                    <button type="button" id="galeri-telefondan" onClick={() => galeriRef.current?.click()} aria-label="Telefon galerisinden ekle" title="Telefon galerisinden ekle" className="flex h-11 w-10 items-center justify-center rounded-full text-sand-600 hover:bg-sand-100"><ImagePlus size={20} /></button>
                </div>
                <div className="flex min-h-11 min-w-0 flex-1 items-end rounded-3xl border border-sand-200 bg-sand-50 pl-3.5 pr-1 focus-within:border-moss-400">
                    <textarea id="galeri-kutu" value={taslak} rows={1} onChange={e => setTaslak(e.target.value)} onPaste={yapistirildi}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) { e.preventDefault(); void gonder(); } }}
                        placeholder="Yaz ya da yapıştır…" aria-label="Galeriye metin veya görsel ekle"
                        className="max-h-28 min-h-[2.6rem] flex-1 resize-none bg-transparent py-2.5 text-sm text-sand-900 outline-none placeholder:text-sand-400"
                        style={{ fieldSizing: 'content' } as React.CSSProperties} />
                    <button type="button" id="galeri-yapistir" onClick={() => void panodanYapistir()} aria-label="Telefon panosundan yapıştır" title="Panodan yapıştır"
                        className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sand-600 hover:bg-sand-100"><ClipboardPaste size={18} /></button>
                </div>
                <button type="button" id="galeri-gonder" onClick={() => void gonder()} disabled={!taslak.trim() && !ekler.length} aria-label="Galeriye gönder"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-moss-600 text-white shadow-sm transition-opacity hover:bg-moss-700 disabled:opacity-40"><SendHorizontal size={18} /></button>
            </div>
        </footer>

        <input ref={kameraRef} type="file" accept="image/*" capture="environment" hidden onChange={e => { void dosyaEkle(e.target.files); e.target.value = ''; }} />
        <input ref={galeriRef} type="file" accept="image/*" multiple hidden onChange={e => { void dosyaEkle(e.target.files); e.target.value = ''; }} />

        {/* Büyük görünüm */}
        {buyuk && <div className="absolute inset-0 z-20 flex flex-col bg-black/95" role="dialog" aria-label="Önizleme">
            <div className="flex shrink-0 items-center justify-between px-2 pt-[env(safe-area-inset-top,0px)]">
                <button type="button" onClick={() => setBuyuk(null)} aria-label="Önizlemeyi kapat" className="flex h-12 w-12 items-center justify-center rounded-full text-white hover:bg-white/10"><X size={22} /></button>
                <div className="flex gap-1">
                    <button type="button" onClick={() => { sec(buyuk.id); setBuyuk(null); }} className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-white hover:bg-white/10"><Check size={17} /> Seç</button>
                    <button type="button" onClick={() => { void galeridenSil(notId, [buyuk.id]); setBuyuk(null); }} aria-label="Sil" className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10"><Trash2 size={18} /></button>
                </div>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center p-3" onClick={() => setBuyuk(null)}>
                {buyuk.tur === 'gorsel' && onizleme[buyuk.id]
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={onizleme[buyuk.id]} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
                    : <p className="max-h-full max-w-xl overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-5 text-sm text-sand-900" onClick={e => e.stopPropagation()}>{buyuk.metin}</p>}
            </div>
        </div>}
    </div>, document.body);
}
