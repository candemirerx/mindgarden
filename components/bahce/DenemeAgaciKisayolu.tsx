'use client';

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { ArrowUpRight, Check, Copy, Loader2, Pencil, Plus, SlidersHorizontal, TreePine } from 'lucide-react';
import { denemeAgaciAdresi, denemeNotuOku, denemeNotuYaz } from '@/lib/denemeAgaci';
import { useDenemeTercihleri } from '@/lib/denemeTercihleri';
import { KART_BASILI_TUT_KAYMA_ESIGI } from '@/lib/canvasGesture';
import { useKoyuTema, useTuvalTercihleri } from '@/lib/tuvalTercihleri';
import { SIMGE, islevAdi } from '@/components/canvas/KartAracEkle';
import { useRemotePrefs } from '@/lib/useRemotePrefs';
import { useKartDikte } from '@/components/canvas/useKartDikte';
import { makroHazir, sendKey, sendToComputerClipboard, telefonPanosunuBilgisayaraGonder, typeOnComputer } from '@/lib/remoteTools';
import { makroCalisiyor, makroyuBaslat, makroyuDurdur } from '@/lib/makroCalistirici';
import { readEnabledMacros } from '@/lib/aiMacro';
import AiResultDialog from '@/components/ai/AiResultDialog';

const PcHizliYaz = lazy(() => import('@/components/canvas/PcHizliYaz'));

/** Üç bölmeli kök kartı: seçilebilir araç · editör · kopyala. */
export default function DenemeAgaciKisayolu({ onAyarlar, onizleme = false }: { onAyarlar?: () => void; onizleme?: boolean }) {
    const router = useRouter();
    const tercih = useDenemeTercihleri();
    const genel = useTuvalTercihleri();
    const koyu = useKoyuTema();
    const prefs = useRemotePrefs();
    const kart = tercih.kart === 'varsayilan' ? koyu ? genel.kartKoyu : genel.kart : tercih.kart;
    const [menu, setMenu] = useState(false);
    const [hedef, setHedef] = useState<string | null>(null);
    const [kopyalandi, setKopyalandi] = useState(false);
    const [mesgul, setMesgul] = useState(false);
    const [hata, setHata] = useState('');
    const [klavye, setKlavye] = useState(false);
    const [aiResult, setAiResult] = useState<{ title: string; original: string; result: string; snapshot: string } | null>(null);
    const kap = useRef<HTMLDivElement>(null);
    const dugme = useRef<HTMLButtonElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout>>();
    const kopyaTimer = useRef<ReturnType<typeof setTimeout>>();
    const bas = useRef<{ id: number; x: number; y: number; uzun: boolean; kaydi: boolean } | null>(null);
    const tikYut = useRef(false);
    const dikte = useKartDikte(prefs, () => { const n = denemeNotuOku(); return n.baslik + '\n' + n.metin; }, async metin => {
        const [baslik, ...satirlar] = metin.split('\n'); denemeNotuYaz('hepsi', baslik, satirlar.join('\n'));
    }, setHata);
    const bilgi = islevAdi(tercih.sol.islev, tercih.sol.kimlik, prefs.macros);
    const aktifDikte = tercih.sol.islev === 'pcKopru' ? dikte.durum === 'kopru' : tercih.sol.islev === 'pcDikte' && dikte.durum === 'dikte';
    const kapat = () => { clearTimeout(timer.current); bas.current = null; setMenu(false); setHedef(null); };
    const editorAc = () => {
        if (onizleme) return;
        kapat(); window.dispatchEvent(new Event('nb-ayarlari-kapat'));
        void denemeAgaciAdresi('hepsi').then(adres => router.push(adres));
    };
    const ayarlarAc = () => { kapat(); onAyarlar?.(); };
    const kopyala = async () => {
        if (onizleme) return;
        try {
            setHata(''); const n = denemeNotuOku(); await navigator.clipboard.writeText(n.metin || n.baslik);
            setKopyalandi(true); clearTimeout(kopyaTimer.current); kopyaTimer.current = setTimeout(() => setKopyalandi(false), 1800);
        } catch { setHata('Panoya kopyalanamadı. Lütfen yeniden deneyin.'); }
    };
    const solArac = async () => {
        if (onizleme || (mesgul && tercih.sol.islev !== 'makro')) return;
        kapat(); setHata('');
        const { islev, kimlik } = tercih.sol;
        if (islev === 'yok' || islev === 'tuvalAyarlari') { ayarlarAc(); return; }
        if (islev === 'editor') { editorAc(); return; }
        if (islev === 'kopya') { await kopyala(); return; }
        if (islev === 'pcKlavye') { setKlavye(true); return; }
        if (islev === 'pcDikte' || islev === 'pcKopru') { dikte.degistir(islev === 'pcKopru' ? 'kopru' : 'dikte'); return; }
        setMesgul(true);
        try {
            const n = denemeNotuOku(); const metin = n.metin || n.baslik;
            if (islev === 'pcYaz') await typeOnComputer(metin, prefs);
            else if (islev === 'pcPano') await sendToComputerClipboard(metin, prefs);
            else if (islev === 'pcTelPano') await telefonPanosunuBilgisayaraGonder(prefs);
            else if (islev === 'pcEnter') await sendKey('ENTER', prefs);
            else if (islev === 'makro') {
                const m = prefs.macros.find(m => m.id === kimlik && makroHazir(m));
                if (!m) throw new Error('Bu makro artık bulunamıyor. Sol araca yeni bir makro seçin.');
                if (makroCalisiyor(m.id)) makroyuDurdur(m.id); else await makroyuBaslat(m, prefs);
            } else if (islev === 'aiMakro') {
                const m = readEnabledMacros().find(m => m.id === kimlik);
                if (!m) throw new Error('Bu yapay zekâ görevi artık bulunamıyor. Yeni bir görev seçin.');
                const { kartAiCalistir } = await import('@/lib/kartAiCalistir');
                const result = await kartAiCalistir(metin, m.instruction);
                setAiResult({ title: m.title, original: metin, result, snapshot: JSON.stringify(n) });
            }
        } catch (e) { setHata(e instanceof Error ? e.message : 'Araç çalıştırılamadı.'); }
        finally { setMesgul(false); }
    };
    useEffect(() => () => { clearTimeout(timer.current); clearTimeout(kopyaTimer.current); }, []);
    useEffect(() => {
        if (!menu) return;
        const disari = (e: PointerEvent) => { if (e.target instanceof Node && !kap.current?.contains(e.target)) kapat(); };
        document.addEventListener('pointerdown', disari);
        let iptal = false; let kaldir: (() => Promise<void>) | undefined;
        if (Capacitor.isNativePlatform()) void import('@capacitor/app').then(async ({ App }) => {
            const dinleyici = await App.addListener('backButton', kapat);
            if (iptal) await dinleyici.remove(); else kaldir = () => dinleyici.remove();
        });
        return () => { iptal = true; void kaldir?.(); document.removeEventListener('pointerdown', disari); };
    }, [menu]);
    const secimBul = (x: number, y: number) => Array.from(kap.current?.querySelectorAll<HTMLButtonElement>('[data-deneme-eylem]') ?? []).find(el => {
        const r = el.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
    const secimUygula = (secim?: string) => { if (secim === 'editor') editorAc(); else if (secim === 'tuval') ayarlarAc(); else if (secim === 'sol') void solArac(); else if (secim === 'kopya') void kopyala(); };
    const renk = kart === 'sade' ? 'border-moss-300 bg-white text-moss-900 shadow-soft' : kart === 'renkli' ? 'border-moss-400 bg-moss-100 text-moss-900 shadow-soft' : 'border-[rgb(var(--kok-3))] bg-[linear-gradient(135deg,rgb(var(--kok-1)),rgb(var(--kok-2))_65%,rgb(var(--kok-3)))] text-[rgb(var(--kok-yazi))] shadow-[0_12px_24px_-16px_rgba(18,40,27,.7)]';
    const kenar = 'flex w-11 shrink-0 items-center justify-center outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-moss-400 disabled:opacity-60';
    const ayirici = kart === 'sade' || kart === 'renkli' ? 'border-moss-300/70' : 'border-[rgb(var(--kok-yazi)/.18)]';
    return <>
        <div ref={kap} data-deneme-kart={kart} className="relative z-50 w-[188px] shrink-0 sm:w-[228px]" onKeyDown={e => {
            if (e.key === 'Escape') { kapat(); setHata(''); dugme.current?.focus(); }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                if (onizleme) return;
                e.preventDefault(); setMenu(true);
                requestAnimationFrame(() => {
                    const ogeler = Array.from(kap.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]') ?? []);
                    const i = ogeler.findIndex(el => el === document.activeElement); const yon = e.key === 'ArrowDown' ? 1 : -1;
                    ogeler[i < 0 ? yon === 1 ? 0 : ogeler.length - 1 : (i + yon + ogeler.length) % ogeler.length]?.focus();
                });
            }
        }}>
            <div className={`relative flex min-h-16 items-stretch overflow-hidden border ${kart === 'hap' ? 'rounded-full' : 'rounded-[22px]'} ${renk}`}>
                <TreePine size={76} strokeWidth={1} aria-hidden className="pointer-events-none absolute -right-2 -top-3 opacity-[.07]" />
                <button type="button" disabled={onizleme || (mesgul && tercih.sol.islev !== 'makro')} aria-label={tercih.sol.islev === 'yok' ? 'Deneme ağacına sol araç ekle' : bilgi.ad} title={tercih.sol.islev === 'yok' ? 'Sol araç ekle' : bilgi.ad}
                    onClick={() => void solArac()} className={`${kenar} ${ayirici} relative border-r ${aktifDikte ? 'bg-berry-600 text-white' : ''}`}>
                    {mesgul || dikte.durum === 'bitiyor' ? <Loader2 size={18} className="animate-spin" /> : bilgi.harf ? <span className="text-base font-bold">{bilgi.harf}</span> : tercih.sol.islev === 'yok' ? <Plus size={18} /> : SIMGE[tercih.sol.islev]}
                    {aktifDikte && <span className="absolute bottom-2 h-1 w-1 rounded-full bg-white" />}
                </button>
                <button ref={dugme} type="button" disabled={onizleme} aria-label="Deneme ağacını metin editöründe aç" aria-describedby={onizleme ? undefined : 'deneme-ipucu'}
                    className="relative flex min-w-0 flex-1 touch-none select-none flex-col items-start justify-center px-2.5 text-left outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-moss-400 sm:px-3"
                    style={{ WebkitTouchCallout: 'none' }} onContextMenu={e => e.preventDefault()}
                    onPointerDown={e => {
                        if (e.button !== 0 || !e.isPrimary) return;
                        clearTimeout(timer.current); tikYut.current = false;
                        const b = { id: e.pointerId, x: e.clientX, y: e.clientY, uzun: false, kaydi: false }; bas.current = b;
                        e.currentTarget.setPointerCapture(e.pointerId);
                        timer.current = setTimeout(() => { if (bas.current === b && !b.kaydi) { b.uzun = true; setMenu(true); setHedef(null); } }, 320);
                    }}
                    onPointerMove={e => {
                        const b = bas.current; if (!b || b.id !== e.pointerId) return;
                        if (!b.uzun && Math.hypot(e.clientX - b.x, e.clientY - b.y) > KART_BASILI_TUT_KAYMA_ESIGI) { b.kaydi = true; clearTimeout(timer.current); }
                        if (b.uzun) setHedef(secimBul(e.clientX, e.clientY)?.dataset.denemeEylem ?? null);
                    }}
                    onPointerUp={e => {
                        const b = bas.current; if (!b || b.id !== e.pointerId) return;
                        clearTimeout(timer.current); bas.current = null; tikYut.current = true;
                        if (b.uzun) {
                            const secim = secimBul(e.clientX, e.clientY)?.dataset.denemeEylem;
                            if (secim) { secimUygula(secim); kapat(); }
                            else if (Math.hypot(e.clientX - b.x, e.clientY - b.y) > KART_BASILI_TUT_KAYMA_ESIGI) kapat();
                        } else if (!b.kaydi) editorAc();
                        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
                    }} onPointerCancel={() => { tikYut.current = true; kapat(); }}
                    onLostPointerCapture={() => { if (bas.current) { tikYut.current = true; kapat(); } }}
                    onClick={() => { if (tikYut.current) { tikYut.current = false; return; } editorAc(); }}>
                    <span className="block w-full font-serif text-[13px] font-semibold leading-tight sm:text-base">Deneme ağacı</span>
                    <span className="mt-1 flex items-center gap-1 text-[10px] opacity-75">Hemen dene <ArrowUpRight size={10} aria-hidden /></span>
                </button>
                <button type="button" disabled={onizleme} aria-label="Deneme ağacının içeriğini kopyala" title="İçeriği kopyala" onClick={() => void kopyala()} className={`${kenar} ${ayirici} relative border-l`}>
                    {kopyalandi ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
                </button>
            </div>
            {!onizleme && <>
                <span id="deneme-ipucu" className="sr-only">Dokununca editör açılır. Basılı tutup kaydırarak işlem seçin. Solda seçtiğiniz araç, sağda içerik kopyalama düğmesi bulunur.</span>
                <span role="status" className="sr-only">{kopyalandi ? 'Deneme içeriği kopyalandı' : ''}</span>
                {hata && <div role="alert" className="absolute right-0 top-full mt-2 w-[min(284px,calc(100vw-32px))] rounded-2xl border border-berry-200 bg-white p-3 text-xs text-berry-700 shadow-lift"><p>{hata}</p><button type="button" className="mt-2 min-h-11 px-2 font-semibold" onClick={() => setHata('')}>Kapat</button></div>}
                {menu && <div id="deneme-menusu" role="menu" aria-label="Deneme ağacı" className="absolute right-0 top-full mt-2 w-[min(284px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-sand-200 bg-white p-1.5 shadow-lift">
                    <p className="px-3 pb-2 pt-2 text-[11px] text-sand-500">Basılı tut · kaydır · bırak</p>
                    {[
                        { id: 'editor', ad: 'Metin editörünü aç', Icon: Pencil }, { id: 'kopya', ad: 'İçeriği kopyala', Icon: Copy },
                        { id: 'sol', ad: tercih.sol.islev === 'yok' ? 'Sol araç ekle' : bilgi.ad, Icon: Plus }, { id: 'tuval', ad: 'Tuval ayarlarını aç', Icon: SlidersHorizontal }
                    ].map(({ id, ad, Icon }) => <button key={id} type="button" role="menuitem" data-deneme-eylem={id} onClick={() => { secimUygula(id); kapat(); }}
                        className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-semibold outline-none focus-visible:bg-moss-100 ${hedef === id ? 'bg-moss-100 text-moss-900 ring-1 ring-inset ring-moss-300' : 'text-sand-800 hover:bg-moss-50'}`}><Icon size={17} aria-hidden />{ad}</button>)}
                </div>}
            </>}
        </div>
        {klavye && <Suspense fallback={null}><PcHizliYaz prefs={prefs} onKapat={() => setKlavye(false)} /></Suspense>}
        {aiResult && <AiResultDialog title={aiResult.title} original={aiResult.original} result={aiResult.result} onClose={() => setAiResult(null)} onApply={async () => {
            const current = denemeNotuOku();
            if (JSON.stringify(current) !== aiResult.snapshot) throw new Error('Deneme notu beklerken değişti. Sonucu kopyalayabilir veya yeniden çalıştırabilirsiniz.');
            denemeNotuYaz('hepsi', current.baslik, aiResult.result);
        }} />}
    </>;
}
