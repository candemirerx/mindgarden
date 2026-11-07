'use client';

/**
 * Ayarlar → Geri dönüşüm kutusu: çöpe atılan notlar, geri alma, kalıcı silme
 * ve otomatik temizleme süresi.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, BookOpen, Check, ChevronRight, Clock3, Copy, Eye, FileText, GitBranch, Leaf, Loader2, MessageCircle, RotateCcw, Sparkles, Trash2, TreePine, Undo2, X } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import { sohbetOku, yzAyar } from '@/lib/yzAgaci';
import {
    COP_BILDIRIM_OLAYI, COP_SURELERI, copListesi, copSuresi, copSuresiKaydet, copuBosalt, geriAl, kaliciSil, kalanGun,
    sureEtiketi, useCopSayisi, type CopKaydi
} from '@/lib/copKutusu';

const tarih = (t: number) => {
    const d = new Date(t), simdi = new Date();
    const gun = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const fark = Math.round((gun(simdi) - gun(d)) / 86_400_000);
    const saat = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return fark === 0 ? 'Bugün ' + saat : fark === 1 ? 'Dün ' + saat : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
};

export default function CopKutusu() {
    const [liste, setListe] = useState<CopKaydi[] | null>(null);
    const [sure, setSure] = useState(30);
    const [mesgul, setMesgul] = useState<string | null>(null);
    const [bildiri, setBildiri] = useState<{ ton: 'ok' | 'hata'; metin: string } | null>(null);
    const [acik, setAcik] = useState<CopKaydi | null>(null);
    const sayi = useCopSayisi();
    const yukle = useCallback(async () => { setListe(await copListesi().catch(() => [])); }, []);
    useEffect(() => { setSure(copSuresi()); void yukle(); }, [yukle]);
    useEffect(() => { void yukle(); }, [sayi, yukle]);

    const gruplar = useMemo(() => {
        const m = new Map<string, CopKaydi[]>();
        for (const k of liste ?? []) m.set(k.bahceAdi, [...(m.get(k.bahceAdi) ?? []), k]);
        return Array.from(m.entries());
    }, [liste]);
    const bildir = (ton: 'ok' | 'hata', metin: string) => { setBildiri({ ton, metin }); setTimeout(() => setBildiri(b => (b?.metin === metin ? null : b)), 4000); };

    const geriAlKayit = async (k: CopKaydi) => {
        setMesgul(k.id);
        try { const { ustYok } = await geriAl(k.id); bildir('ok', ustYok ? `"${k.baslik}" geri alındı; üst dalı olmadığı için ayrı bir ağaç oldu.` : `"${k.baslik}" yerine geri döndü.`); }
        catch (e) { bildir('hata', e instanceof Error ? e.message : 'Geri alınamadı.'); }
        finally { setMesgul(null); setAcik(null); void yukle(); }
    };
    const sil = async (k: CopKaydi) => {
        if (!window.confirm(`"${k.baslik}"${k.satirlar.length > 1 ? ` ve ${k.satirlar.length - 1} alt notu` : ''} kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return;
        setMesgul(k.id);
        await kaliciSil(k.id).catch(() => bildir('hata', 'Silinemedi.'));
        setMesgul(null); setAcik(null); void yukle();
    };
    const bosalt = async () => {
        if (!liste?.length || !window.confirm(`Geri dönüşüm kutusundaki ${liste.length} kayıt kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return;
        setMesgul('hepsi');
        await copuBosalt().catch(() => bildir('hata', 'Kutu boşaltılamadı.'));
        setMesgul(null); void yukle();
    };

    return <div className="flex flex-col gap-4">
        <section className="rounded-[22px] border border-sand-200 bg-white p-4 shadow-soft sm:p-5" aria-labelledby="cop-sure-baslik">
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-clay-100 text-clay-700"><Clock3 size={19} /></span>
                <div className="min-w-0 flex-1">
                    <h3 id="cop-sure-baslik" className="text-[15px] font-semibold text-sand-900">Otomatik temizleme</h3>
                    <p className="mt-0.5 text-[13px] leading-5 text-sand-600">{sure ? `Çöpe atılan notlar ${sureEtiketi(sure)} sonra kalıcı olarak silinir ve yer kaplamaz.` : 'Notlar siz silene kadar kutuda kalır.'}</p>
                </div>
            </div>
            <div role="radiogroup" aria-label="Kalıcı silme süresi" className="mt-3.5 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                {COP_SURELERI.map(g => <button key={g} type="button" role="radio" aria-checked={sure === g} onClick={() => { setSure(g); copSuresiKaydet(g); }}
                    className={'min-h-11 rounded-xl px-1 text-[12.5px] font-semibold transition-colors ' + (sure === g ? 'bg-moss-600 text-white shadow-soft' : 'bg-sand-100 text-sand-700 hover:bg-sand-200')}>{g === 0 ? 'Asla' : sureEtiketi(g)}</button>)}
            </div>
        </section>

        {bildiri && <p role="status" className={'rounded-2xl px-4 py-3 text-[13px] leading-5 ' + (bildiri.ton === 'ok' ? 'bg-moss-50 text-moss-800' : 'bg-berry-50 text-berry-800')}>{bildiri.metin}</p>}

        {liste === null ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-sand-400" /></div>
            : !liste.length ? <div className="flex flex-col items-center rounded-[22px] border border-dashed border-sand-300 bg-white/60 px-6 py-12 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-sand-100 text-sand-400"><Trash2 size={28} /></span>
                <p className="mt-4 text-[15px] font-semibold text-sand-800">Geri dönüşüm kutusu boş</p>
                <p className="mt-1 max-w-xs text-[13px] leading-5 text-sand-500">Bir notu çöpe attığınızda burada görünür; süresi dolana kadar geri alabilirsiniz.</p>
            </div>
                : <>
                    <div className="flex items-center justify-between px-1">
                        <p className="text-[13px] text-sand-600">{liste.length} kayıt · {liste.reduce((t, k) => t + k.satirlar.length, 0)} not</p>
                        <button type="button" onClick={() => void bosalt()} disabled={!!mesgul} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-berry-600 hover:bg-berry-50 disabled:opacity-40">{mesgul === 'hepsi' ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}Kutuyu boşalt</button>
                    </div>
                    {gruplar.map(([bahce, kayitlar]) => <section key={bahce} aria-label={bahce + ' bahçesinden silinenler'}>
                        <h4 className="mb-2 px-1 text-[11.5px] font-semibold uppercase tracking-[.08em] text-sand-500">{bahce}</h4>
                        <ul className="flex flex-col gap-2">
                            {kayitlar.map(k => {
                                const kalan = kalanGun(k);
                                const kok = k.satirlar.find(n => n.id === k.id);
                                const Ikon = k.yzSayisi && k.satirlar.length === 1 ? Sparkles : !kok?.parent_id ? TreePine : k.satirlar.length > 1 ? GitBranch : Leaf;
                                return <li key={k.id} className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-white p-3 shadow-soft">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-sand-600"><Ikon size={18} /></span>
                                    <button type="button" onClick={() => setAcik(k)} aria-label={k.baslik + ' notunu geri almadan aç'} className="group flex min-w-0 flex-1 items-center gap-1 rounded-xl text-left">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-sand-900 group-hover:text-moss-700">{k.baslik}</p>
                                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-sand-500">
                                            <span>{tarih(k.silinme)}</span>
                                            {k.satirlar.length > 1 && <span>· {k.satirlar.length - 1} alt not</span>}
                                            {kalan !== null && <span className={kalan <= 2 ? 'font-semibold text-berry-600' : ''}>· {kalan === 0 ? 'bugün silinecek' : `${kalan} gün kaldı`}</span>}
                                        </p>
                                    </div>
                                    <ChevronRight size={16} className="shrink-0 text-sand-400" aria-hidden="true" />
                                    </button>
                                    <button type="button" onClick={() => void geriAlKayit(k)} disabled={!!mesgul} aria-label={k.baslik + ' notunu geri al'}
                                        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-moss-50 px-3 text-[13px] font-semibold text-moss-800 ring-1 ring-moss-200 hover:bg-moss-100 disabled:opacity-40">{mesgul === k.id ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}<span className="hidden sm:inline">Geri al</span></button>
                                    <button type="button" onClick={() => void sil(k)} disabled={!!mesgul} aria-label={k.baslik + ' notunu kalıcı sil'} title="Kalıcı sil"
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sand-500 hover:bg-berry-50 hover:text-berry-600 disabled:opacity-40"><Trash2 size={17} /></button>
                                </li>;
                            })}
                        </ul>
                    </section>)}
                </>}
        {acik && <CopOnizleme kayit={acik} mesgul={mesgul === acik.id} onKapat={() => setAcik(null)} onGeriAl={() => void geriAlKayit(acik)} onSil={() => void sil(acik)} />}
        <p className="px-1 text-[11.5px] leading-5 text-sand-500">Bir kayda dokunarak geri almadan açabilir, içeriğini okuyup kopyalayabilirsiniz. Çöpe atılan notların kopyası yalnız bu cihazda tutulur. Drive yedeğine ve diğer cihazlarınıza not silinmiş olarak yansır; geri alınca yeniden eşitlenir.</p>
    </div>;
}

/* ---------------- Önizleme: geri almadan aç ---------------- */

type Sekme = 'not' | 'sohbet' | 'talimat';

/** Çöpteki bir notu geri almadan açar: içerik, alt notlar ve YZ ağacıysa sohbet geçmişi salt okunur görünür. */
function CopOnizleme({ kayit, mesgul, onKapat, onGeriAl, onSil }: { kayit: CopKaydi; mesgul: boolean; onKapat: () => void; onGeriAl: () => void; onSil: () => void }) {
    const [seciliId, setSeciliId] = useState(kayit.id);
    const [sekme, setSekme] = useState<Sekme>('not');
    const [kopyalandi, setKopyalandi] = useState(false);
    const not = kayit.satirlar.find(n => n.id === seciliId) ?? kayit.satirlar[0];
    const ayar = not ? yzAyar(not.id) : null;
    const sohbet = useMemo(() => (not && ayar ? sohbetOku(not.id) : []), [not, ayar]);
    const baslik = not?.content.split('\n')[0] || 'Başlıksız';
    const govde = not ? not.content.split('\n').slice(1).join('\n').trim() : '';
    const derinlik = (id: string) => {
        let d = 0;
        let n = kayit.satirlar.find(x => x.id === id);
        while (n && n.id !== kayit.id && n.parent_id && d < 50) { d++; const u = n.parent_id; n = kayit.satirlar.find(x => x.id === u); }
        return d;
    };
    const sirali = useMemo(() => {
        const cikti: CopKaydi['satirlar'] = [];
        const gez = (id: string) => {
            const n = kayit.satirlar.find(x => x.id === id);
            if (!n) return;
            cikti.push(n);
            kayit.satirlar.filter(x => x.parent_id === id).forEach(c => gez(c.id));
        };
        gez(kayit.id);
        return cikti.length ? cikti : kayit.satirlar;
    }, [kayit]);
    useEffect(() => { setSekme('not'); }, [seciliId]);
    const kapatRef = useRef(onKapat);
    kapatRef.current = onKapat;
    useEffect(() => {
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') kapatRef.current(); };
        window.addEventListener('keydown', esc);
        let bitti = false;
        let kaldir: (() => void) | undefined;
        if (Capacitor.isNativePlatform()) void import('@capacitor/app').then(async ({ App }) => {
            const d = await App.addListener('backButton', () => kapatRef.current());
            if (bitti) void d.remove(); else kaldir = () => { void d.remove(); };
        });
        return () => { window.removeEventListener('keydown', esc); bitti = true; kaldir?.(); };
    }, []);
    const kopyala = () => { void navigator.clipboard.writeText(govde || baslik); setKopyalandi(true); setTimeout(() => setKopyalandi(false), 1500); };
    if (typeof document === 'undefined' || !not) return null;
    const Ikon = ayar ? Sparkles : !not.parent_id ? TreePine : kayit.satirlar.some(x => x.parent_id === not.id) ? GitBranch : Leaf;
    const sekmeler: { id: Sekme; ad: string; Ikon: typeof FileText }[] = ayar
        ? [{ id: 'not', ad: 'Not', Ikon: FileText }, { id: 'sohbet', ad: 'Sohbet', Ikon: MessageCircle }, { id: 'talimat', ad: 'Talimat', Ikon: BookOpen }]
        : [];
    const altBilgi = ayar ? 'Yapay zekâ ağacı' : not.id === kayit.id ? (kayit.satirlar.length > 1 ? `${kayit.satirlar.length - 1} alt not` : 'Tek not') : 'Alt not';

    return createPortal(<div data-geri-yonetir="" data-ust-katman="" role="dialog" aria-modal="true" aria-label={kayit.baslik + ' önizlemesi'} className="fixed inset-0 z-[140] flex flex-col bg-sand-50">
        <header className="shrink-0 border-b border-sand-200 bg-white pt-[env(safe-area-inset-top,0px)]">
            <div className="flex h-14 items-center gap-1 px-2">
                <button type="button" onClick={onKapat} aria-label="Önizlemeyi kapat" className="flex h-11 w-11 items-center justify-center rounded-full text-sand-700 hover:bg-sand-100"><ArrowLeft size={20} /></button>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-sand-900">{kayit.baslik}</p>
                    <p className="flex items-center gap-1 truncate text-[11px] text-sand-500"><Eye size={12} className="shrink-0" />Salt okunur · {kayit.bahceAdi} · {tarih(kayit.silinme)}</p>
                </div>
                <button type="button" onClick={kopyala} aria-label="İçeriği kopyala" title="İçeriği kopyala" className="flex h-11 w-11 items-center justify-center rounded-full text-sand-600 hover:bg-sand-100">{kopyalandi ? <Check size={18} className="text-moss-600" /> : <Copy size={18} />}</button>
            </div>
            {sirali.length > 1 && <div className="flex gap-1.5 overflow-x-auto px-3 pb-2.5" role="tablist" aria-label="Notlar">
                {sirali.map(n => {
                    const d = derinlik(n.id);
                    const ad = n.content.split('\n')[0] || 'Başlıksız';
                    const sec = n.id === not.id;
                    return <button key={n.id} type="button" role="tab" aria-selected={sec} onClick={() => setSeciliId(n.id)}
                        className={'inline-flex min-h-9 max-w-[200px] shrink-0 items-center gap-1 rounded-full px-3 text-[12.5px] font-semibold transition-colors ' + (sec ? 'bg-moss-600 text-white' : 'bg-sand-100 text-sand-700 hover:bg-sand-200')}>
                        {d > 0 && <span className="opacity-60">{'›'.repeat(Math.min(d, 3))}</span>}
                        {yzAyar(n.id) && <Sparkles size={12} className="shrink-0" />}
                        <span className="truncate">{ad}</span>
                    </button>;
                })}
            </div>}
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="mx-auto flex max-w-2xl flex-col gap-3">
                <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sand-100 text-sand-600"><Ikon size={20} /></span>
                    <div className="min-w-0 flex-1">
                        <h3 className="break-words text-lg font-semibold leading-snug text-sand-900">{baslik}</h3>
                        <p className="mt-0.5 text-[12px] text-sand-500">{altBilgi}</p>
                    </div>
                </div>
                {sekmeler.length > 0 && <div role="tablist" aria-label="Görünüm" className="grid grid-cols-3 gap-1 rounded-2xl bg-sand-100 p-1">
                    {sekmeler.map(s => <button key={s.id} type="button" role="tab" aria-selected={sekme === s.id} onClick={() => setSekme(s.id)}
                        className={'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-[12.5px] font-semibold ' + (sekme === s.id ? 'bg-white text-sand-900 shadow-soft' : 'text-sand-600')}>
                        <s.Ikon size={14} /><span className="truncate">{s.ad}</span>
                    </button>)}
                </div>}

                {sekme === 'not' && <section className="rounded-[22px] border border-sand-200 bg-white p-4 shadow-soft">
                    {govde ? <RichTextEditor key={not.id} value={govde} onChange={() => { }} readOnly /> : <p className="py-6 text-center text-[13px] text-sand-500">Bu notun içeriği boş.</p>}
                </section>}

                {sekme === 'sohbet' && <section className="flex flex-col gap-2">
                    {sohbet.length ? sohbet.map((m, i) => <div key={i}
                        className={'max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-6 ' + (m.rol === 'kullanici' ? 'self-end rounded-br-md bg-moss-600 text-white' : 'self-start rounded-bl-md border border-sand-200 bg-white text-sand-900')}>{m.metin}</div>)
                        : <p className="rounded-2xl border border-dashed border-sand-300 bg-white/60 py-8 text-center text-[13px] text-sand-500">Bu ağaçla henüz sohbet edilmemiş.</p>}
                </section>}

                {sekme === 'talimat' && ayar && <section className="flex flex-col gap-3">
                    <div className="rounded-[22px] border border-sand-200 bg-white p-4 shadow-soft">
                        <p className="text-[11.5px] font-semibold uppercase tracking-[.08em] text-sand-500">Sistem talimatı</p>
                        <p className="mt-1.5 whitespace-pre-wrap break-words text-[13.5px] leading-6 text-sand-800">{ayar.talimat.trim() || 'Talimat yazılmamış.'}</p>
                    </div>
                    <div className="rounded-[22px] border border-sand-200 bg-white p-4 shadow-soft">
                        <p className="text-[11.5px] font-semibold uppercase tracking-[.08em] text-sand-500">Eğitim belgeleri · {ayar.belgeler.length}</p>
                        {ayar.belgeler.length ? <ul className="mt-2 flex flex-col gap-1.5">
                            {ayar.belgeler.map(b => <li key={b.id} className="flex items-center gap-2 text-[13px] text-sand-800">
                                <FileText size={15} className="shrink-0 text-sand-500" /><span className="min-w-0 flex-1 truncate">{b.ad}</span>
                                <span className="shrink-0 text-[11.5px] text-sand-500">{b.karakter.toLocaleString('tr-TR')} kr.</span>
                            </li>)}
                        </ul> : <p className="mt-1.5 text-[13px] text-sand-500">Belge eklenmemiş.</p>}
                    </div>
                </section>}
            </div>
        </main>
        <footer className="shrink-0 border-t border-sand-200 bg-white px-3 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] pt-2.5">
            <div className="mx-auto flex max-w-2xl gap-2">
                <button type="button" onClick={onSil} disabled={mesgul} className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl px-4 text-[14px] font-semibold text-berry-600 ring-1 ring-berry-200 hover:bg-berry-50 disabled:opacity-40"><Trash2 size={17} />Kalıcı sil</button>
                <button type="button" onClick={onGeriAl} disabled={mesgul} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-moss-600 px-4 text-[14.5px] font-semibold text-white shadow-soft hover:bg-moss-700 disabled:opacity-60">{mesgul ? <Loader2 size={17} className="animate-spin" /> : <RotateCcw size={17} />}Geri al</button>
            </div>
        </footer>
    </div>, document.body);
}

/** Çöpe atınca alttan çıkan kısa bildirim: "Geri al" ile hemen geri döner. */
export function CopBildirimi() {
    const [kayit, setKayit] = useState<CopKaydi | null>(null);
    const [mesgul, setMesgul] = useState(false);
    useEffect(() => {
        let zaman: ReturnType<typeof setTimeout>;
        const goster = (e: Event) => { setKayit((e as CustomEvent<CopKaydi>).detail); clearTimeout(zaman); zaman = setTimeout(() => setKayit(null), 6000); };
        window.addEventListener(COP_BILDIRIM_OLAYI, goster);
        return () => { window.removeEventListener(COP_BILDIRIM_OLAYI, goster); clearTimeout(zaman); };
    }, []);
    if (!kayit || typeof document === 'undefined') return null;
    return createPortal(<div role="status" className="pointer-events-none fixed inset-x-0 bottom-0 z-[260] flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom,0px)+18px)]">
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-2.5 rounded-2xl bg-[#26291f] py-2 pl-3 pr-1.5 text-[#f3f1e8] shadow-pop ring-1 ring-white/10 animate-scale-in">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#e6e2d3]"><Trash2 size={16} /></span>
            <p className="min-w-0 flex-1 text-[13.5px] leading-5"><span className="block truncate font-semibold">“{kayit.baslik}”</span><span className="block text-[12px] text-[#c9c6b8]">Çöp kutusuna taşındı{kayit.satirlar.length > 1 ? ` · ${kayit.satirlar.length} not` : ''}</span></p>
            <button type="button" disabled={mesgul} onClick={async () => { setMesgul(true); try { await geriAl(kayit.id); setKayit(null); } catch (e) { alert(e instanceof Error ? e.message : 'Geri alınamadı.'); } finally { setMesgul(false); } }}
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#dcebcf] px-3.5 text-[13.5px] font-bold text-[#1e2a17] shadow-sm hover:bg-[#e8f3dd] active:scale-[.97] disabled:opacity-70">{mesgul ? <Loader2 size={15} className="animate-spin" /> : <Undo2 size={15} />}Geri al</button>
            <button type="button" onClick={() => setKayit(null)} aria-label="Bildirimi kapat" className="flex h-10 w-9 shrink-0 items-center justify-center rounded-xl text-[#c9c6b8] hover:bg-white/10"><X size={16} /></button>
        </div>
    </div>, document.body);
}
