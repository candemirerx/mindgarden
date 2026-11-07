'use client';

/**
 * Ayarlar → Geri dönüşüm kutusu: çöpe atılan notlar, geri alma, kalıcı silme
 * ve otomatik temizleme süresi.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock3, GitBranch, Leaf, Loader2, RotateCcw, Sparkles, Trash2, TreePine, Undo2, X } from 'lucide-react';
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
        finally { setMesgul(null); void yukle(); }
    };
    const sil = async (k: CopKaydi) => {
        if (!window.confirm(`"${k.baslik}"${k.satirlar.length > 1 ? ` ve ${k.satirlar.length - 1} alt notu` : ''} kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return;
        setMesgul(k.id);
        await kaliciSil(k.id).catch(() => bildir('hata', 'Silinemedi.'));
        setMesgul(null); void yukle();
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
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-sand-900">{k.baslik}</p>
                                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-sand-500">
                                            <span>{tarih(k.silinme)}</span>
                                            {k.satirlar.length > 1 && <span>· {k.satirlar.length - 1} alt not</span>}
                                            {kalan !== null && <span className={kalan <= 2 ? 'font-semibold text-berry-600' : ''}>· {kalan === 0 ? 'bugün silinecek' : `${kalan} gün kaldı`}</span>}
                                        </p>
                                    </div>
                                    <button type="button" onClick={() => void geriAlKayit(k)} disabled={!!mesgul} aria-label={k.baslik + ' notunu geri al'}
                                        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-moss-50 px-3 text-[13px] font-semibold text-moss-800 ring-1 ring-moss-200 hover:bg-moss-100 disabled:opacity-40">{mesgul === k.id ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}<span className="hidden sm:inline">Geri al</span></button>
                                    <button type="button" onClick={() => void sil(k)} disabled={!!mesgul} aria-label={k.baslik + ' notunu kalıcı sil'} title="Kalıcı sil"
                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sand-500 hover:bg-berry-50 hover:text-berry-600 disabled:opacity-40"><Trash2 size={17} /></button>
                                </li>;
                            })}
                        </ul>
                    </section>)}
                </>}
        <p className="px-1 text-[11.5px] leading-5 text-sand-500">Çöpe atılan notların kopyası yalnız bu cihazda tutulur. Drive yedeğine ve diğer cihazlarınıza not silinmiş olarak yansır; geri alınca yeniden eşitlenir.</p>
    </div>;
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
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-bark-900 py-2 pl-4 pr-2 text-sand-50 shadow-pop animate-scale-in">
            <Trash2 size={17} className="shrink-0 text-sand-300" />
            <p className="min-w-0 flex-1 text-[13.5px] leading-5"><span className="font-semibold">“{kayit.baslik}”</span> çöp kutusuna taşındı{kayit.satirlar.length > 1 ? ` (${kayit.satirlar.length} not)` : ''}.</p>
            <button type="button" disabled={mesgul} onClick={async () => { setMesgul(true); try { await geriAl(kayit.id); setKayit(null); } catch (e) { alert(e instanceof Error ? e.message : 'Geri alınamadı.'); } finally { setMesgul(false); } }}
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-[13px] font-semibold text-[rgb(var(--yz-isik))] hover:bg-white/15">{mesgul ? <Loader2 size={15} className="animate-spin" /> : <Undo2 size={15} />}Geri al</button>
            <button type="button" onClick={() => setKayit(null)} aria-label="Bildirimi kapat" className="flex h-10 w-9 shrink-0 items-center justify-center rounded-xl text-sand-300 hover:bg-white/10"><X size={16} /></button>
        </div>
    </div>, document.body);
}
