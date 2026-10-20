'use client';

import type { ReactNode } from 'react';
import {
    ArrowLeft,
    ArrowLeftRight,
    Bluetooth,
    Cable,
    ChevronDown,
    ChevronRight,
    Cloud,
    Copy,
    Cpu,
    Download,
    Globe,
    Laptop,
    Layout,
    List,
    MoreHorizontal,
    PenLine,
    Plus,
    Scissors,
    Search,
    Smartphone,
    TreePine,
    Wifi,
} from 'lucide-react';
import { cx } from '@/components/ui/settings';
import type { KilavuzGorseli as GorselAdi } from '@/lib/kilavuzIcerik';

/**
 * Kılavuz derslerindeki şematik çizimler.
 *
 * Gerçek ekranın sadeleştirilmiş bir taslağıdır: yalnız dersin anlattığı
 * öğeleri gösterir, renkler tema ölçeklerinden gelir (koyu temada kendiliğinden
 * tersine döner). Ekran okuyucular için her çizimin altında kısa bir açıklama
 * vardır; çizimin kendisi aria-hidden'dır.
 */

const ACIKLAMALAR: Record<GorselAdi, string> = {
    kavram: 'Bahçe bir konudur; içinde ağaçlar, ağaçların altında dallar ve yapraklar vardır.',
    giris: 'İlk açılış ekranı: Giriş Yap notları bütün cihazlarda eşitler, Yerel Modda Gir yalnız bu cihazda tutar.',
    anaEkran: 'Ana ekrandaki bahçe kartı: ad, tarih, ağaç sayısı, üç nokta menüsü ve altta Liste ile Tuval düğmeleri.',
    ikiEkran: 'Aynı notlar solda Liste olarak, sağda Tuval olarak görünür.',
    liste: 'Liste ekranı: üstte geri, arama, Tuval ve artı; satırlarda aç-kapat oku, renk, kopyala, editörde aç ve üç nokta menüsü.',
    kart: 'Tuvalde seçili kart: üstte Kopyala, Düzenle, Buda; iki yanda Yanına; altta Altına düğmesi.',
    editor: 'Editör: üstte başlık, altında içerik, en altta Otomatik kaydetme ve kelime sayısı.',
    yedek: 'Telefon, bilgisayar ve web sitesi aynı Google hesabıyla notlarını Drive üzerinden eşitler.',
    yollar: 'Telefon bilgisayara Bluetooth, USB, Wi‑Fi ya da Tailscale ile doğrudan; ya da bilgisayara takılı Not Bahçesi kartı üzerinden bağlanır.',
};

function Cerceve({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div aria-hidden="true" className={cx('relative overflow-hidden rounded-xl border border-sand-200 bg-sand-50 p-3', className)}>
            {children}
        </div>
    );
}

/** Çizimdeki bir öğeye iliştirilen küçük etiket. */
function Etiket({ children, ton = 'clay' }: { children: ReactNode; ton?: 'clay' | 'moss' }) {
    return (
        <span className={cx(
            'inline-flex items-center rounded-full px-1.5 py-px text-[9.5px] font-semibold leading-4',
            ton === 'clay' ? 'bg-clay-100 text-clay-800' : 'bg-moss-100 text-moss-800'
        )}>
            {children}
        </span>
    );
}

function Kavram() {
    const satirlar = [
        { girinti: 0, tur: 'Bahçe', ad: 'Ders notları', ton: 'bg-clay-500' },
        { girinti: 1, tur: 'Ağaç', ad: 'Matematik', ton: 'bg-moss-700' },
        { girinti: 2, tur: 'Dal', ad: 'Türev', ton: 'bg-moss-500' },
        { girinti: 3, tur: 'Yaprak', ad: 'Örnek sorular', ton: 'bg-moss-300' },
        { girinti: 3, tur: 'Yaprak', ad: 'Formüller', ton: 'bg-moss-300' },
        { girinti: 1, tur: 'Ağaç', ad: 'Tarih', ton: 'bg-moss-700' },
    ];
    return (
        <Cerceve>
            <ul className="space-y-1">
                {satirlar.map((s, i) => (
                    <li key={i} className="flex items-center gap-2" style={{ paddingLeft: s.girinti * 16 }}>
                        {s.girinti > 0 && <span className="h-px w-2.5 shrink-0 bg-sand-300" />}
                        <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', s.ton)} />
                        <span className="min-w-0 truncate text-[12px] font-medium text-sand-900">{s.ad}</span>
                        <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wide text-sand-600">{s.tur}</span>
                    </li>
                ))}
            </ul>
        </Cerceve>
    );
}

function Giris() {
    return (
        <Cerceve className="flex justify-center">
            <div className="w-full max-w-[220px] rounded-xl border border-sand-200 bg-white p-3 text-center shadow-soft">
                <p className="text-[13px] font-semibold text-sand-900">Hoş geldiniz</p>
                <p className="mt-0.5 text-[10px] text-sand-600">Notlarınızı kaydetmek için giriş yapın.</p>
                <div className="mt-2.5 space-y-1.5">
                    <div className="relative rounded-lg bg-moss-600 py-1.5 text-[11px] font-semibold text-white">
                        Giriş Yap
                        <span className="absolute -right-1.5 -top-2"><Etiket ton="moss">Tüm cihazlar</Etiket></span>
                    </div>
                    <div className="relative rounded-lg border border-sand-300 py-1.5 text-[11px] font-semibold text-sand-800">
                        Yerel Modda Gir
                        <span className="absolute -right-1.5 -top-2"><Etiket>Yalnız bu cihaz</Etiket></span>
                    </div>
                </div>
            </div>
        </Cerceve>
    );
}

function AnaEkran() {
    return (
        <Cerceve className="flex justify-center">
            <div className="w-full max-w-[250px] rounded-xl border border-sand-200 bg-white shadow-soft">
                <div className="h-0.5 rounded-t-xl bg-gradient-to-r from-moss-600 via-moss-400 to-clay-300" />
                <div className="p-2.5">
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-moss-100 text-moss-700"><TreePine size={14} /></span>
                        <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-sand-900">Ders notları</span>
                        <span className="relative rounded-md p-0.5 ring-2 ring-clay-400"><MoreHorizontal size={13} className="text-sand-600" /></span>
                    </div>
                    <p className="mt-1.5 text-[10px] text-sand-600">12 Ekim 2026 · 3 ağaç</p>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <div className="flex items-center justify-center gap-1 rounded-lg border-2 border-moss-500 py-1 text-[11px] font-semibold text-sand-800"><List size={11} /> Liste</div>
                        <div className="flex items-center justify-center gap-1 rounded-lg border-2 border-moss-500 py-1 text-[11px] font-semibold text-sand-800"><Layout size={11} /> Tuval</div>
                    </div>
                </div>
            </div>
            <div className="ml-2 hidden flex-col justify-between py-1 text-left sm:flex">
                <Etiket>Adlandır · Sil</Etiket>
                <Etiket ton="moss">İki ekran</Etiket>
            </div>
        </Cerceve>
    );
}

function MiniListe() {
    const satirlar = [
        { g: 0, ad: 'Alışveriş', acik: true },
        { g: 1, ad: 'Meyve' },
        { g: 1, ad: 'Sebze' },
        { g: 0, ad: 'Projeler', acik: false },
    ];
    return (
        <div className="space-y-1">
            {satirlar.map((s, i) => (
                <div key={i} className="flex items-center gap-1 rounded-md bg-white px-1.5 py-1 shadow-soft" style={{ marginLeft: s.g * 10 }}>
                    {s.g === 0 ? (s.acik ? <ChevronDown size={10} className="text-sand-600" /> : <ChevronRight size={10} className="text-sand-600" />) : <span className="w-2.5" />}
                    <span className="truncate text-[10px] font-medium text-sand-900">{s.ad}</span>
                </div>
            ))}
        </div>
    );
}

function MiniTuval() {
    return (
        <svg viewBox="0 0 120 84" className="h-full w-full">
            <path d="M44 24 C 60 24, 60 14, 74 14 M44 24 C 60 24, 60 42, 74 42 M44 24 C 56 24, 56 66, 74 66" fill="none" stroke="rgb(var(--sand-300))" strokeWidth="1.5" />
            <rect x="4" y="14" width="40" height="20" rx="6" fill="rgb(var(--moss-600))" />
            <text x="24" y="27" textAnchor="middle" fontSize="7" fontWeight="600" fill="rgb(var(--surface))">Alışveriş</text>
            {[{ y: 4, t: 'Meyve' }, { y: 32, t: 'Sebze' }, { y: 56, t: 'Ekmek' }].map((k) => (
                <g key={k.t}>
                    <rect x="74" y={k.y} width="42" height="20" rx="6" fill="rgb(var(--surface))" stroke="rgb(var(--sand-300))" />
                    <text x="95" y={k.y + 13} textAnchor="middle" fontSize="7" fill="rgb(var(--sand-900))">{k.t}</text>
                </g>
            ))}
        </svg>
    );
}

function IkiEkran() {
    return (
        <Cerceve>
            <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
                <div className="min-w-0">
                    <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-sand-600">Liste</p>
                    <MiniListe />
                </div>
                <div className="flex flex-col items-center justify-center gap-1 text-moss-700">
                    <ArrowLeftRight size={16} />
                    <span className="text-[9px] font-semibold text-sand-600">aynı<br />notlar</span>
                </div>
                <div className="min-w-0">
                    <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-sand-600">Tuval</p>
                    <div className="h-[92px] rounded-md bg-white p-1 shadow-soft"><MiniTuval /></div>
                </div>
            </div>
        </Cerceve>
    );
}

function Liste() {
    const satirlar = [
        { g: 0, ad: 'Alışveriş', renk: 'bg-clay-500', ok: 'acik' },
        { g: 1, ad: 'Meyve', renk: 'bg-moss-500' },
        { g: 1, ad: 'Sebze', renk: 'bg-moss-500', vurgu: true },
        { g: 0, ad: 'Projeler', renk: 'bg-bark-500', ok: 'kapali' },
    ];
    return (
        <Cerceve>
            <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 shadow-soft">
                <ArrowLeft size={12} className="text-sand-700" />
                <span className="flex min-w-0 flex-1 items-center gap-1 rounded-md bg-sand-100 px-1.5 py-0.5 text-[10px] text-sand-600"><Search size={10} /> Düşüncelerde ara…</span>
                <Layout size={12} className="text-sand-700" />
                <span className="rounded-md bg-moss-600 p-0.5 text-white"><Plus size={11} /></span>
            </div>
            <div className="space-y-1">
                {satirlar.map((s, i) => (
                    <div key={i} className={cx('flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 shadow-soft', s.vurgu && 'ring-2 ring-clay-400')} style={{ marginLeft: s.g * 14 }}>
                        {s.ok === 'acik' ? <ChevronDown size={11} className="text-sand-600" /> : s.ok === 'kapali' ? <ChevronRight size={11} className="text-sand-600" /> : <span className="w-[11px]" />}
                        <span className={cx('h-2 w-2 shrink-0 rounded-full', s.renk)} />
                        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-sand-900">{s.ad}</span>
                        <Copy size={10} className="text-sand-500" />
                        <PenLine size={10} className="text-sand-500" />
                        <MoreHorizontal size={12} className={s.vurgu ? 'text-clay-700' : 'text-sand-500'} />
                    </div>
                ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
                <Etiket>⋯ menü: alt not ekle · adlandır · sil</Etiket>
                <Etiket ton="moss">✎ editörde aç</Etiket>
            </div>
        </Cerceve>
    );
}

function Kart() {
    const ust = [
        { ad: 'Kopyala', Ikon: Copy },
        { ad: 'Düzenle', Ikon: PenLine },
        { ad: 'Buda', Ikon: Scissors },
    ];
    return (
        <Cerceve className="flex justify-center py-4">
            <div className="grid grid-cols-[auto_minmax(0,170px)_auto] grid-rows-[auto_auto_auto]">
                <div />
                <div className="grid grid-cols-3 overflow-hidden rounded-t-lg">
                    {ust.map(({ ad, Ikon }) => (
                        <div key={ad} className="flex flex-col items-center gap-0.5 bg-moss-600 py-1 text-white">
                            <Ikon size={11} />
                            <span className="text-[8.5px] font-semibold">{ad}</span>
                        </div>
                    ))}
                </div>
                <div />
                <div className="flex items-center rounded-l-lg bg-moss-500 px-1 text-[8.5px] font-semibold text-white [writing-mode:vertical-rl] rotate-180">Yanına</div>
                <div className="border-2 border-moss-600 bg-white px-3 py-3 text-center">
                    <p className="text-[12px] font-semibold text-sand-900">Meyve</p>
                    <p className="mt-0.5 text-[9.5px] text-sand-600">elma, armut, muz</p>
                </div>
                <div className="flex items-center rounded-r-lg bg-moss-500 px-1 text-[8.5px] font-semibold text-white [writing-mode:vertical-rl]">Yanına</div>
                <div />
                <div className="flex items-center justify-center gap-1 rounded-b-lg bg-moss-500 py-1 text-[9px] font-semibold text-white">
                    <Plus size={10} /> Altına
                </div>
                <div />
            </div>
        </Cerceve>
    );
}

function Editor() {
    return (
        <Cerceve>
            <div className="overflow-hidden rounded-lg bg-white shadow-soft">
                <div className="flex items-center gap-2 border-b border-sand-100 px-2 py-1.5">
                    <ArrowLeft size={12} className="text-sand-700" />
                    <span className="flex-1" />
                    <Copy size={11} className="text-sand-500" />
                    <Download size={11} className="text-sand-500" />
                </div>
                <div className="px-2.5 py-2">
                    <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-semibold text-sand-900">Meyve</p>
                        <Etiket>Başlık</Etiket>
                    </div>
                    <div className="mt-1.5 rounded-md border border-dashed border-sand-300 p-1.5">
                        <p className="text-[10.5px] text-sand-700">elma, armut, muz</p>
                        <div className="mt-1 h-1 w-3/4 rounded bg-sand-200" />
                        <div className="mt-1 h-1 w-1/2 rounded bg-sand-200" />
                        <div className="mt-1"><Etiket ton="moss">İçerik</Etiket></div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 border-t border-sand-100 px-2.5 py-1.5 text-[10px] text-sand-600">
                    <span className="flex h-3 w-3 items-center justify-center rounded-sm bg-moss-600 text-[8px] text-white">✓</span>
                    <span className="font-semibold text-sand-800">Otomatik</span>
                    <span className="ml-auto">3 kelime</span>
                </div>
            </div>
        </Cerceve>
    );
}

function Dugum({ children, ad }: { children: ReactNode; ad: string }) {
    return (
        <div className="flex flex-col items-center gap-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-moss-700 shadow-soft">{children}</span>
            <span className="text-[10px] font-semibold text-sand-700">{ad}</span>
        </div>
    );
}

function Yedek() {
    return (
        <Cerceve className="flex items-center justify-around py-4">
            <Dugum ad="Telefon"><Smartphone size={18} /></Dugum>
            <ArrowLeftRight size={16} className="text-sand-500" />
            <div className="flex flex-col items-center gap-1">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-moss-600 text-white shadow-soft"><Cloud size={20} /></span>
                <span className="text-[10px] font-semibold text-sand-700">Drive'ınız</span>
                <Etiket ton="moss">aynı Google hesabı</Etiket>
            </div>
            <ArrowLeftRight size={16} className="text-sand-500" />
            <div className="flex flex-col items-center gap-1.5">
                <Dugum ad="Bilgisayar"><Laptop size={18} /></Dugum>
                <Dugum ad="Web sitesi"><Globe size={18} /></Dugum>
            </div>
        </Cerceve>
    );
}

function Yollar() {
    const dogrudan = [
        { ad: 'Bluetooth', not: 'program yok', Ikon: Bluetooth },
        { ad: 'USB', not: 'kablo', Ikon: Cable },
        { ad: 'Wi‑Fi', not: 'aynı ağ', Ikon: Wifi },
        { ad: 'Tailscale', not: 'uzaktan', Ikon: Globe },
    ];
    return (
        <Cerceve>
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                <Dugum ad="Telefon"><Smartphone size={18} /></Dugum>
                <div className="space-y-1">
                    {dogrudan.map(({ ad, not, Ikon }) => (
                        <div key={ad} className="flex items-center gap-1.5 rounded-md bg-white px-2 py-1 shadow-soft">
                            <Ikon size={11} className="shrink-0 text-moss-700" />
                            <span className="text-[10.5px] font-semibold text-sand-900">{ad}</span>
                            <span className="ml-auto truncate text-[9.5px] text-sand-600">{not}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-1.5 rounded-md border border-dashed border-sand-300 px-2 py-1">
                        <Cpu size={11} className="shrink-0 text-clay-700" />
                        <span className="text-[10.5px] font-semibold text-sand-900">Kart yolları</span>
                        <span className="ml-auto truncate text-[9.5px] text-sand-600">donanım kartı ile</span>
                    </div>
                </div>
                <Dugum ad="Bilgisayar"><Laptop size={18} /></Dugum>
            </div>
        </Cerceve>
    );
}

const CIZIMLER: Record<GorselAdi, () => JSX.Element> = {
    kavram: Kavram,
    giris: Giris,
    anaEkran: AnaEkran,
    ikiEkran: IkiEkran,
    liste: Liste,
    kart: Kart,
    editor: Editor,
    yedek: Yedek,
    yollar: Yollar,
};

export default function KilavuzGorseli({ ad }: { ad: GorselAdi }) {
    const Cizim = CIZIMLER[ad];
    return (
        <figure className="space-y-1.5">
            <Cizim />
            <figcaption className="px-0.5 text-[11.5px] leading-relaxed text-sand-600">{ACIKLAMALAR[ad]}</figcaption>
        </figure>
    );
}
