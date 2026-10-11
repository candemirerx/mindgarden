'use client';

/**
 * Kart menüsü "Araç ekle" sayfası: bir düğme konumuna verilecek her şey tek yerde.
 * Hazır işlevler, bilgisayar araçları, makrolar ve yapay zekâ görevleri sekmelerle
 * listelenir; makro ve görevler baş harf rozetiyle görünür. Tek dokunuş seçimi
 * kaydeder ve sayfayı kapatır.
 */
import { Fragment, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { createPortal } from 'react-dom';
import { AudioLines, Ban, Check, ClipboardList, ClipboardPaste, Copy, Mic, Smartphone, CornerDownLeft, Keyboard, Move, Pencil, Plus, Scissors, SlidersHorizontal, Sparkles, Wand2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '@/components/ui/settings';
import { useRemotePrefs } from '@/lib/useRemotePrefs';
import { makroHazir } from '@/lib/remoteTools';
import { readEnabledMacros } from '@/lib/aiMacro';
import { KART_ISLEVLERI, KART_YERLERI, tuvalTercihleri, tuvalTercihleriniKaydet } from '@/lib/tuvalTercihleri';
import type { KartIslevi } from '@/lib/tuvalTercihleri';
import type { RemoteMacro } from '@/lib/remoteTools';

const TUR_ADI: Record<RemoteMacro['type'], string> = {
    text: 'Hazır metin', shortcut: 'Klavye kısayolu', position: 'Fare konumu', sequence: 'Sıralı makro'
};

/** Adın ilk görsel harfi (Türkçe büyük harf dönüşümüyle). */
export function basHarf(ad: string): string {
    const harf = ad.trim().toLocaleUpperCase('tr').match(/[A-ZÇĞİÖŞÜQWX]/);
    return harf?.[0] ?? '•';
}

const ACIKLAMA: Partial<Record<KartIslevi, string>> = {
    yok: 'Bu konumda düğme gösterme', editor: 'Metin editörünü açar', kopya: 'Not içeriğini panoya kopyalar',
    buda: 'Notu buda ya da geri al', sol: 'Sol yanına yeni not ekler', yan: 'Sağ yanına yeni not ekler',
    alt: 'Altına yeni not ekler', tasi: 'Ağacı sürükleyerek taşır', ayarlar: 'Ağaç ayarlarını açar',
    pcYaz: 'Notu bilgisayarda yazar', pcPano: 'Notu bilgisayar panosuna gönderir', pcEnter: 'Bilgisayara Enter tuşu yollar',
    pcDikte: 'Konuşun, söyledikleriniz bu kartın içeriğine yazılsın', pcKopru: 'Konuşun, söyledikleriniz doğrudan bilgisayara yazılsın', pcKlavye: 'Telefon klavyesiyle yazın, bilgisayara gönderin', pcTelPano: 'Telefon panosundaki metin ya da görseli bilgisayara yollar'
};
export const SIMGE: Partial<Record<KartIslevi, ReactNode>> = {
    yok: <Ban size={18} />, editor: <Pencil size={18} />, kopya: <Copy size={18} />, buda: <Scissors size={18} />,
    sol: <Plus size={18} />, yan: <Plus size={18} />, alt: <Plus size={18} />, tasi: <Move size={18} />,
    ayarlar: <SlidersHorizontal size={18} />, pcYaz: <Keyboard size={18} />, pcPano: <ClipboardList size={18} />, pcEnter: <CornerDownLeft size={18} />,
    pcDikte: <Mic size={18} />, pcKopru: <AudioLines size={18} />, pcKlavye: <Smartphone size={18} />, pcTelPano: <ClipboardPaste size={18} />
};

type Sekme = 'hazir' | 'bilgisayar' | 'makro' | 'ai';
const SEKMELER: { id: Sekme; ad: string }[] = [
    { id: 'hazir', ad: 'Hazır' }, { id: 'bilgisayar', ad: 'Bilgisayar' }, { id: 'makro', ad: 'Makrolar' }, { id: 'ai', ad: 'Yapay zekâ' }
];
const HAZIR: KartIslevi[] = ['editor', 'kopya', 'buda', 'sol', 'yan', 'alt', 'tasi', 'ayarlar', 'yok'];
const BILGISAYAR: KartIslevi[] = ['pcDikte', 'pcKopru', 'pcKlavye', 'pcYaz', 'pcPano', 'pcTelPano', 'pcEnter'];
const BILGISAYAR_GRUP: Partial<Record<KartIslevi, string>> = { pcDikte: 'Dikte', pcKopru: 'Dikte', pcKlavye: 'Bilgisayara yaz', pcYaz: 'Bilgisayara yaz', pcPano: 'Pano', pcTelPano: 'Pano', pcEnter: 'Tuşlar' };

type Oge = { anahtar: string; islev: KartIslevi; kimlik?: string; ad: string; aciklama: string; simge: ReactNode; grup?: string };

/** Bir konumun şu anki işlevinin okunur adı (ayarlar satırında gösterilir). */
export function islevAdi(islev: KartIslevi, kimlik: string | undefined, macros: RemoteMacro[]): { ad: string; harf?: string } {
    if (islev === 'makro') { const m = macros.find(x => x.id === kimlik); return m ? { ad: m.name.trim() || 'Makro', harf: basHarf(m.name) } : { ad: 'Makro seçilmedi' }; }
    if (islev === 'aiMakro') { const m = readEnabledMacros().find(x => x.id === kimlik); return m ? { ad: m.title.trim() || 'Görev', harf: basHarf(m.title) } : { ad: 'Görev seçilmedi' }; }
    return { ad: KART_ISLEVLERI[islev] };
}

export default function KartAracEkle({ yerKey, onKapat }: { yerKey: string; onKapat: () => void }) {
    const prefs = useRemotePrefs();
    const t0 = tuvalTercihleri();
    const simdiki = t0.dugmeler[yerKey as keyof typeof t0.dugmeler];
    const simdikiKimlik = simdiki === 'makro' ? t0.kartMakrolari[yerKey as keyof typeof t0.kartMakrolari] : simdiki === 'aiMakro' ? t0.kartAiMakrolari[yerKey as keyof typeof t0.kartAiMakrolari] : undefined;
    const [sekme, setSekme] = useState<Sekme>(simdiki === 'makro' ? 'makro' : simdiki === 'aiMakro' ? 'ai' : BILGISAYAR.includes(simdiki) ? 'bilgisayar' : 'hazir');
    const [secili, setSecili] = useState<string>(simdiki + ':' + (simdikiKimlik ?? ''));

    const hazirOge = (islev: KartIslevi): Oge => ({ anahtar: islev + ':', islev, ad: KART_ISLEVLERI[islev], aciklama: ACIKLAMA[islev] ?? '', simge: SIMGE[islev], grup: sekme === 'bilgisayar' ? BILGISAYAR_GRUP[islev] : undefined });
    const ogeler: Oge[] = sekme === 'hazir' ? HAZIR.map(hazirOge)
        : sekme === 'bilgisayar' ? BILGISAYAR.map(hazirOge)
        : sekme === 'makro' ? prefs.macros.filter(makroHazir).map(m => ({ anahtar: 'makro:' + m.id, islev: 'makro' as const, kimlik: m.id, ad: m.name.trim() || 'Adsız makro', aciklama: TUR_ADI[m.type], simge: <span className="text-sm font-bold">{basHarf(m.name)}</span> }))
        : readEnabledMacros().map(m => ({ anahtar: 'aiMakro:' + m.id, islev: 'aiMakro' as const, kimlik: m.id, ad: m.title.trim() || 'Adsız görev', aciklama: m.subtitle?.trim() || 'Yapay zekâ görevi', simge: <span className="text-sm font-bold">{basHarf(m.title)}</span> }));

    useEffect(() => {
        const esc = (olay: KeyboardEvent) => { if (olay.key === 'Escape') onKapat(); };
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
    }, [onKapat]);

    // Android geri tuşu: bu sayfa üstteyken yalnız sayfayı kapatır.
    const kapatRef = useRef(onKapat);
    kapatRef.current = onKapat;
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

    const sec = (oge: Oge) => {
        const t = tuvalTercihleri();
        const kartMakrolari = { ...t.kartMakrolari };
        const kartAiMakrolari = { ...t.kartAiMakrolari };
        delete kartMakrolari[yerKey as keyof typeof kartMakrolari];
        delete kartAiMakrolari[yerKey as keyof typeof kartAiMakrolari];
        if (oge.islev === 'makro' && oge.kimlik) (kartMakrolari as Record<string, string>)[yerKey] = oge.kimlik;
        if (oge.islev === 'aiMakro' && oge.kimlik) (kartAiMakrolari as Record<string, string>)[yerKey] = oge.kimlik;
        tuvalTercihleriniKaydet({ ...t, dugmeler: { ...t.dugmeler, [yerKey]: oge.islev }, kartMakrolari, kartAiMakrolari });
        setSecili(oge.anahtar);
        setTimeout(onKapat, 220);
    };

    if (typeof document === 'undefined') return null;
    const yer = KART_YERLERI[yerKey as keyof typeof KART_YERLERI];
    return createPortal(
        <div id="kart-arac-ekle" data-geri-yonetir="" data-ust-katman="" role="dialog" aria-modal="true" aria-label={yer + ' düğmesine araç ekle'} className="fixed inset-0 z-[130] flex flex-col bg-sand-50">
            <header className="shrink-0 border-b border-sand-200 bg-white pt-[env(safe-area-inset-top,0px)]">
                <div className="flex h-14 items-center gap-1 px-2">
                    <button type="button" onClick={onKapat} aria-label="Sayfayı kapat" className="flex h-11 w-11 items-center justify-center rounded-full text-sand-700 hover:bg-sand-100"><X size={20} /></button>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-sand-900">Araç ekle</p>
                        <p className="text-[11px] text-sand-500">{yer} düğmesi · dokununca onaylanır</p>
                    </div>
                </div>
                <div role="tablist" aria-label="Araç türleri" className="flex gap-1.5 overflow-x-auto px-3 pb-2.5">
                    {SEKMELER.map(s => <button key={s.id} type="button" role="tab" id={'kart-arac-sekme-' + s.id} aria-selected={sekme === s.id} onClick={() => setSekme(s.id)}
                        className={cx('min-h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition-colors', sekme === s.id ? 'bg-moss-600 text-white' : 'bg-sand-100 text-sand-700 hover:bg-sand-200')}>{s.ad}</button>)}
                </div>
            </header>
            <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                {sekme === 'bilgisayar' && <p className="mb-3 rounded-2xl bg-moss-50 px-3 py-2 text-xs leading-snug text-moss-800">Bu araçlar bağlı bilgisayarda çalışır. Bağlantı yoksa düğmeye dokununca uyarı görürsünüz.</p>}
                {ogeler.length ? <div role="radiogroup" aria-label="Araçlar" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {ogeler.map((oge, i) => {
                        const act = secili === oge.anahtar;
                        return <Fragment key={oge.anahtar}>{oge.grup && oge.grup !== ogeler[i - 1]?.grup && <p className="col-span-full mt-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-sand-500">{oge.grup}</p>}<button type="button" role="radio" aria-checked={act} data-arac={oge.anahtar} onClick={() => sec(oge)}
                            className={cx('flex items-center gap-3 rounded-2xl border bg-white p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40', act ? 'border-moss-500 bg-moss-50' : 'border-sand-200 hover:border-sand-300')}>
                            <span aria-hidden="true" className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', act ? 'bg-moss-600 text-white' : 'bg-moss-100 text-moss-700')}>{oge.simge}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-sand-900">{oge.ad}</span>
                                <span className="block truncate text-[11px] text-sand-500">{oge.aciklama}</span>
                            </span>
                            {act && <Check size={18} className="shrink-0 text-moss-600" aria-hidden="true" />}
                        </button></Fragment>;
                    })}
                </div>
                    : <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                        <Wand2 size={22} className="text-sand-400" aria-hidden="true" />
                        {sekme === 'ai' ? <>
                            <p className="text-sm font-medium text-sand-800">Açık yapay zekâ görevi yok</p>
                            <p className="text-xs text-sand-600">Metin editörü → Yapay zekâ bölümünden görev ekleyin ve açık bırakın.</p>
                        </> : <>
                            <p className="text-sm font-medium text-sand-800">Henüz makro yok</p>
                            <p className="text-xs text-sand-600">Ayarlar → Kısayollar ve ekranlar bölümünden makro ekleyin.</p>
                        </>}
                    </div>}
            </main>
        </div>, document.body);
}
