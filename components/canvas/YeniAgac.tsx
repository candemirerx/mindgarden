'use client';

/**
 * Tuvalin yeni ağaç çizimi: Organik ve Yatay akış.
 *
 * Kartlar CSS ile dizilir; bağlantılar kartlar yerleştikten sonra ölçülüp SVG
 * ile çizilir (kökten uca doğru incelen kavisli dallar). Böylece kartların
 * yüksekliği önizleme satırına göre değişse de çizgiler hep doğru yere gider.
 *
 * - Organik: kökten dallar yan yana açılır; dalın altındaki yapraklar dalın
 *   ortasından inen sapa asılır. Daha derin notlar girintili listelenir.
 * - Yatay: soldan sağa kök → dal → yaprak.
 *
 * Dokunma: tek dokunuş seçer (araç çubuğu çıkar), çift dokunuş metin
 * editörünü açar, uzun basma ağacı taşır (SuruklenebilirAgac). Alttaki "+"
 * yalnız altı boş kartta görünür; dolu dala yan ekle ile eklenir.
 */
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, GitBranch, Leaf, Pencil, Plus, Scissors, Sprout, TreePine } from 'lucide-react';
import { MindNode } from '@/lib/types';
import { useStore } from '@/lib/store/useStore';
import type { TuvalEylem, TuvalOnizleme } from '@/lib/tuvalTercihleri';

type Duzen = 'organik' | 'yatay';
type Ortak = {
    duzen: Duzen;
    onizleme: TuvalOnizleme;
    /** Eylem düğmeleri: 'hap' kart üstünde; 'panel' ve 'yuzen' sayfa düzeyinde çizilir (kartta düğme yok). */
    eylem?: TuvalEylem;
    onAddChild: (parentId: string, direction?: 'left' | 'right') => void;
    onAddTree?: (rootId: string) => void;
    /** Yan not: notun hemen yanına (sonrasına) kardeş ekler. */
    onAddSiblingAfter?: (siblingId: string) => void;
    onEdit: (node: MindNode) => void;
};

/** Koyu, küçük hap araç çubuğunun düğmesi (dokunma alanı 40 px). */
const ARAC = 'flex h-10 w-10 items-center justify-center rounded-full text-white/85 transition-colors duration-150 hover:bg-white/12 hover:text-white active:scale-95 touch-manipulation outline-none focus-visible:bg-white/15';

/** Notun gövdesinden kısa önizleme: başlık satırı atlanır, işaretler sadeleşir. */
function onizlemeMetni(icerik: string): string {
    return icerik.split('\n').slice(1).join(' ')
        .replace(/[#>*_`~]+/g, ' ').replace(/^\s*[-•]\s+/g, '').replace(/\s+/g, ' ').trim();
}
const altSayisi = (n: MindNode): number => n.children.reduce((t, c) => t + 1 + altSayisi(c), 0);

/** Kökten uca incelen kübik eğri: dolu bir şekil olarak çizilir. */
function incelenYol(x1: number, y1: number, c1x: number, c1y: number, c2x: number, c2y: number, x2: number, y2: number, k1: number, k2: number): string {
    const N = 22, sol: string[] = [], sag: string[] = [];
    const P = (t: number) => { const u = 1 - t; return [u * u * u * x1 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x2, u * u * u * y1 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y2]; };
    for (let i = 0; i <= N; i++) {
        const t = i / N, [x, y] = P(t), [xa, ya] = P(Math.max(0, t - 0.01)), [xb, yb] = P(Math.min(1, t + 0.01));
        let nx = -(yb - ya), ny = xb - xa; const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
        const w = (k1 + (k2 - k1) * t) / 2;
        sol.push((x + nx * w).toFixed(1) + ' ' + (y + ny * w).toFixed(1));
        sag.push((x - nx * w).toFixed(1) + ' ' + (y - ny * w).toFixed(1));
    }
    return 'M' + sol.join(' L') + ' L' + sag.reverse().join(' L') + ' Z';
}

type Cizim = { yollar: { d: string; renk: string; dolu: boolean; k?: number }[]; noktalar: { x: number; y: number }[] };

/** Bir ağacın tamamı: kartlar + ölçülerek çizilen bağlantılar. */
export function YeniAgac({ node, ...ortak }: { node: MindNode } & Ortak) {
    const kapRef = useRef<HTMLDivElement>(null);
    const [cizim, setCizim] = useState<Cizim>({ yollar: [], noktalar: [] });

    const ciz = useCallback(() => {
        const kap = kapRef.current;
        if (!kap) return;
        const r0 = kap.getBoundingClientRect();
        const olcek = kap.offsetWidth ? r0.width / kap.offsetWidth : 1;
        if (!olcek) return;
        const kutular = new Map<string, { x: number; y: number; w: number; h: number; derinlik: number; ebeveyn: string; ac: boolean }>();
        kap.querySelectorAll<HTMLElement>('[data-yk-id]').forEach(el => {
            const r = el.getBoundingClientRect();
            kutular.set(el.dataset.ykId!, {
                x: (r.left - r0.left) / olcek, y: (r.top - r0.top) / olcek, w: r.width / olcek, h: r.height / olcek,
                derinlik: Number(el.dataset.ykDerinlik), ebeveyn: el.dataset.ykEbeveyn || '', ac: el.dataset.ykAcik === '1'
            });
        });
        const yollar: Cizim['yollar'] = [], noktalar: Cizim['noktalar'] = [];
        // Ebeveyn → çocuklar grupları
        const gruplar = new Map<string, string[]>();
        kutular.forEach((k, id) => { if (k.ebeveyn && kutular.has(k.ebeveyn)) gruplar.set(k.ebeveyn, [...(gruplar.get(k.ebeveyn) ?? []), id]); });
        gruplar.forEach((cocuklar, eid) => {
            const e = kutular.get(eid)!;
            const ck = cocuklar.map(id => kutular.get(id)!);
            if (ortak.duzen === 'yatay') {
                const sx = e.x + e.w, sy = e.y + e.h / 2;
                ck.forEach(c => {
                    const cy = c.y + c.h / 2, dx = Math.max(14, (c.x - sx) / 2);
                    yollar.push({ d: incelenYol(sx - 2, sy, sx + dx, sy, c.x - dx, cy, c.x + 1, cy, e.derinlik === 0 ? 6 : 3, e.derinlik === 0 ? 2.6 : 1.8), renk: e.derinlik === 0 ? 'rgb(var(--moss-600))' : 'rgb(var(--moss-400))', dolu: true });
                });
                if (e.derinlik > 0) noktalar.push({ x: sx, y: sy });
                return;
            }
            if (e.derinlik === 0) {
                // Kökten dallara: kökün altının ortasından dalın tepesinin ortasına incelen gövde
                const kx = e.x + e.w / 2, ky = e.y + e.h;
                ck.forEach(c => {
                    const cx = c.x + c.w / 2;
                    yollar.push({ d: incelenYol(kx, ky - 4, kx, ky + 36, cx, c.y - 36, cx, c.y + 2, 7, 3), renk: 'rgb(var(--moss-600))', dolu: true });
                });
                return;
            }
            if (e.derinlik === 1) {
                // Daldan yapraklara: dalın ortasından inen tek sap; her yaprağın tepesinde boğum
                const sx = e.x + e.w / 2, son = ck.reduce((m, c) => Math.max(m, c.y), 0);
                yollar.push({ d: incelenYol(sx, e.y + e.h - 2, sx, e.y + e.h + 20, sx, son - 20, sx, son + 2, 3.2, 2), renk: 'rgb(var(--moss-400))', dolu: true });
                ck.forEach(c => noktalar.push({ x: sx, y: c.y - 1 }));
                return;
            }
            // Daha derin notlar: kartın sol tarafından inen ince köşeli kol
            const ox = e.x + 16;
            ck.forEach(c => {
                const cy = c.y + Math.min(20, c.h / 2);
                yollar.push({ d: `M${ox} ${e.y + e.h} V${cy - 8} Q${ox} ${cy} ${ox + 8} ${cy} H${c.x}`, renk: 'rgb(var(--moss-300))', dolu: false, k: 2 });
            });
        });
        setCizim({ yollar, noktalar });
    }, [ortak.duzen]);

    useLayoutEffect(() => {
        ciz();
        const kap = kapRef.current;
        if (!kap || typeof ResizeObserver === 'undefined') return;
        let istek = 0;
        const ro = new ResizeObserver(() => { cancelAnimationFrame(istek); istek = requestAnimationFrame(ciz); });
        ro.observe(kap);
        kap.querySelectorAll('[data-yk-id]').forEach(el => ro.observe(el));
        return () => { ro.disconnect(); cancelAnimationFrame(istek); };
    }, [ciz, node, ortak.onizleme]);

    return (
        <div ref={kapRef} className={`yeni-agac yeni-agac--${ortak.duzen} relative text-left`}>
            <svg className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-visible" aria-hidden="true">
                {cizim.yollar.map((y, i) => y.dolu
                    ? <path key={i} d={y.d} fill={y.renk} />
                    : <path key={i} d={y.d} fill="none" stroke={y.renk} strokeWidth={y.k ?? 2} strokeLinecap="round" strokeLinejoin="round" />)}
                {cizim.noktalar.map((n, i) => <circle key={'n' + i} cx={n.x} cy={n.y} r={3.4} fill="#fff" stroke="rgb(var(--moss-400))" strokeWidth={2} />)}
            </svg>
            <Alt node={node} derinlik={0} ebeveynId="" {...ortak} />
        </div>
    );
}

/** Bir not ve (açıksa) altındakiler. */
function Alt({ node, derinlik, ebeveynId, ...ortak }: { node: MindNode; derinlik: number; ebeveynId: string } & Ortak) {
    const [acik, setAcik] = useState(node.isExpanded ?? true);
    const cocuklarVar = node.children.length > 0;
    const gorunur = cocuklarVar && acik;
    const kart = <Kart node={node} derinlik={derinlik} ebeveynId={ebeveynId} acik={acik} setAcik={setAcik} {...ortak} />;
    const cocuklar = gorunur && node.children.map(c => <Alt key={c.id} node={c} derinlik={derinlik + 1} ebeveynId={node.id} {...ortak} />);

    if (ortak.duzen === 'yatay') {
        return (
            <div className="flex items-center">
                {kart}
                {gorunur && <div className="ml-14 flex flex-col gap-3 py-1">{cocuklar}</div>}
            </div>
        );
    }
    if (derinlik === 0) {
        return (
            <div className="flex flex-col items-center">
                {kart}
                {gorunur && <div className="mt-[76px] flex items-start gap-7">{cocuklar}</div>}
            </div>
        );
    }
    if (derinlik === 1) {
        return (
            <div className="flex flex-col items-center">
                {kart}
                {gorunur && <div className="mt-7 flex flex-col items-center gap-[22px]">{cocuklar}</div>}
            </div>
        );
    }
    return (
        <div className="flex flex-col items-start">
            {kart}
            {gorunur && <div className="mt-2.5 flex flex-col gap-2.5 pl-8">{cocuklar}</div>}
        </div>
    );
}

function Kart({ node, derinlik, ebeveynId, acik, setAcik, duzen, onizleme, eylem = 'hap', onAddChild, onAddTree, onAddSiblingAfter, onEdit }: {
    node: MindNode; derinlik: number; ebeveynId: string; acik: boolean; setAcik: (a: boolean) => void;
} & Ortak) {
    const { selectedNodeId, setSelectedNode, toggleNodeExpansion, setNodePruned } = useStore();
    const [kopyalandi, setKopyalandi] = useState(false);
    const [uzerinde, setUzerinde] = useState(false);
    const sonDokunus = useRef(0);
    const secili = selectedNodeId === node.id;
    const budandi = node.isPruned ?? false;
    const cocukSayisi = node.children.length;
    // Panel ve yüzen düğme kiplerinde eylemler kartın üstünde değil, sayfada gösterilir.
    const araclar = eylem === 'hap' && (secili || uzerinde);
    const tur = derinlik === 0 ? 'kok' : (node.nodeType && node.nodeType !== 'auto' ? node.nodeType : derinlik === 1 ? 'branch' : 'leaf');
    const metin = onizleme > 0 ? onizlemeMetni(node.content) : '';
    const satir: React.CSSProperties = { display: '-webkit-box', WebkitLineClamp: onizleme, WebkitBoxOrient: 'vertical', overflow: 'hidden' };

    const dokun = (e: React.MouseEvent) => {
        e.stopPropagation();
        const simdi = Date.now();
        // Çift dokunuş: metin editörü. Tek dokunuş: seç (araçlar çıkar).
        if (simdi - sonDokunus.current < 380) { sonDokunus.current = 0; onEdit(node); return; }
        sonDokunus.current = simdi;
        setSelectedNode(node.id);
    };
    const kopyala = (e: React.MouseEvent) => {
        e.stopPropagation();
        const govde = node.content.split('\n').slice(1).join('\n').trim();
        void navigator.clipboard.writeText(govde || node.title);
        setKopyalandi(true); setTimeout(() => setKopyalandi(false), 1500);
    };
    const acKapa = (e: React.MouseEvent) => { e.stopPropagation(); setAcik(!acik); toggleNodeExpansion(node.id, !acik); };
    const genislik = duzen === 'yatay'
        ? (tur === 'kok' ? 'w-[210px]' : 'w-[216px]')
        : (tur === 'kok' ? 'w-[272px]' : derinlik === 1 ? 'w-[208px]' : 'w-[196px]');

    let govde: React.ReactNode;
    if (tur === 'kok') {
        govde = (
            <div className={`relative overflow-hidden rounded-[24px] bg-[linear-gradient(150deg,#3b7a52_0%,#22492f_55%,#122a1c_100%)] px-4 pb-3.5 pt-3.5 text-white shadow-[0_1px_0_rgba(255,255,255,.14)_inset,0_22px_40px_-22px_rgba(18,40,27,.85)] ${budandi ? 'opacity-60' : ''}`}>
                {/* köşede silik ağaç filigranı */}
                <TreePine aria-hidden="true" size={96} strokeWidth={1.2} className="pointer-events-none absolute -right-5 -top-3 text-white/[.07]" />
                <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.08em] text-moss-100">
                    {budandi ? <Scissors size={10} /> : <TreePine size={10} />}{budandi ? 'Budandı' : 'Kök not'}
                </span>
                <p className={`relative mt-1.5 font-serif text-[21px] font-semibold leading-tight tracking-tight ${budandi ? 'line-through' : ''}`} style={{ ...satir, WebkitLineClamp: 2 }}>{node.title}</p>
                {metin && <p className="relative mt-1 text-[12.5px] leading-snug text-moss-100/85" style={satir}>{metin}</p>}
                {cocukSayisi > 0 && <div className="relative mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-2.5 text-[10.5px] font-semibold text-moss-50">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2 py-0.5"><GitBranch size={10} />{cocukSayisi} dal</span>
                    {altSayisi(node) - cocukSayisi > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2 py-0.5"><Leaf size={10} />{altSayisi(node) - cocukSayisi} yaprak</span>}
                </div>}
            </div>
        );
    } else if (tur === 'branch') {
        govde = (
            <div className={`overflow-hidden rounded-[18px] border border-clay-200/70 bg-white shadow-[0_1px_2px_rgba(30,24,19,.05),0_14px_28px_-20px_rgba(120,72,14,.45)] ${budandi ? 'border-dashed opacity-60' : ''}`}>
                <div className="flex items-center gap-2 bg-[linear-gradient(180deg,rgb(var(--clay-50)),rgb(var(--clay-50)/.4))] px-3 pb-2 pt-2.5">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-clay-300 to-clay-500 text-white shadow-[0_2px_6px_-2px_rgba(170,104,20,.6)]"><GitBranch size={13} /></span>
                    <span className={`min-w-0 flex-1 truncate text-[13.5px] font-semibold text-sand-900 ${budandi ? 'line-through' : ''}`}>{node.title}</span>
                </div>
                {(metin || cocukSayisi > 0 || budandi) && <div className="px-3 pb-3 pt-1.5">
                    {metin && <p className="text-xs leading-[1.45] text-sand-600" style={satir}>{metin}</p>}
                    {(cocukSayisi > 0 || budandi) && <div className="mt-2 flex gap-1.5 text-[10.5px] font-semibold">
                        {cocukSayisi > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-moss-50 px-2 py-0.5 text-moss-700 ring-1 ring-moss-100"><Leaf size={10} />{cocukSayisi} yaprak</span>}
                        {budandi && <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2 py-0.5 text-sand-600"><Scissors size={9} />Budandı</span>}
                    </div>}
                </div>}
            </div>
        );
    } else {
        govde = (
            <div className={`relative overflow-hidden rounded-2xl border border-sand-200/90 bg-white/95 py-2.5 pl-3.5 pr-3 shadow-[0_1px_2px_rgba(30,24,19,.04),0_12px_24px_-20px_rgba(27,58,40,.45)] ${budandi ? 'border-dashed opacity-60' : ''}`}>
                {/* solda ince yaprak yeşili şerit */}
                <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-gradient-to-b from-moss-300 to-moss-500" />
                <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-moss-50 text-moss-600 ring-1 ring-moss-100"><Leaf size={11} /></span>
                    <span className={`min-w-0 flex-1 truncate text-[13px] font-semibold text-sand-900 ${budandi ? 'line-through text-sand-600' : ''}`}>{node.title}</span>
                </div>
                {metin && <p className="mt-1 pl-7 text-xs leading-[1.45] text-sand-500" style={satir}>{metin}</p>}
                {budandi && <span className="ml-7 mt-1.5 inline-flex items-center gap-1 rounded-full bg-sand-100 px-2 py-px text-[10.5px] font-semibold text-sand-600"><Scissors size={9} />Budandı</span>}
            </div>
        );
    }

    // Kenar artıları: "alt" çocuk ekler (yalnız altı boşken), "yan" hemen yanına kardeş ekler.
    // Organikte kardeşler alt alta dizildiği için yan artı sağ kenarda, alt artı alt kenardadır;
    // yatay akışta tersine: çocuklar sağa açılır, kardeşler alt alta.
    const ekleAdi = tur === 'kok' ? 'Dal ekle' : 'Altına yaprak ekle';
    const yanAdi = derinlik === 1 ? 'Yanına dal ekle' : 'Yanına yaprak ekle';
    const altKenar = 'left-1/2 top-full -translate-x-1/2 -translate-y-1/2', sagKenar = 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2';
    const eklePos = duzen === 'yatay' ? sagKenar : altKenar;
    const yanPos = duzen === 'yatay' ? altKenar : sagKenar;
    const yaricap = tur === 'kok' ? 24 : tur === 'branch' ? 18 : 16;

    return (
        <div className={`relative flex-shrink-0 ${genislik}`} onMouseEnter={() => setUzerinde(window.matchMedia('(hover: hover)').matches)} onMouseLeave={() => setUzerinde(false)}>
            {/* Araç çubuğu: koyu küçük hap; editör, kopyala, yan ekle (kökte ağaç ekle), buda */}
            <div role="toolbar" aria-label={`${node.title} araçları`}
                className={`absolute bottom-full left-1/2 z-40 mb-3 flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap rounded-full bg-sand-900/95 p-1 shadow-[0_14px_30px_-12px_rgba(20,16,12,.6)] ring-1 ring-black/10 backdrop-blur transition-all duration-200
                    after:absolute after:left-1/2 after:top-full after:-ml-[6px] after:border-x-[6px] after:border-t-[6px] after:border-x-transparent after:border-t-sand-900/95
                    ${araclar ? 'translate-y-0 opacity-100' : 'pointer-events-none invisible translate-y-1.5 opacity-0'}`}>
                <button type="button" onClick={e => { e.stopPropagation(); onEdit(node); }} className={ARAC} title="Metin editörünü aç" aria-label="Metin editörünü aç"><Pencil size={16} /></button>
                <button type="button" onClick={kopyala} className={ARAC} title={kopyalandi ? 'Kopyalandı!' : 'İçeriği kopyala'} aria-label="İçeriği kopyala">{kopyalandi ? <Check size={16} className="text-moss-300" /> : <Copy size={16} />}</button>
                {tur === 'kok'
                    ? onAddTree && <button type="button" onClick={e => { e.stopPropagation(); onAddTree(node.id); }} title="Bu ağacın yanına yeni ağaç ekle" aria-label="Ağaç ekle"
                        className="flex h-10 items-center gap-1.5 rounded-full bg-moss-600 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-moss-500 active:scale-95 touch-manipulation"><Sprout size={16} />Ağaç ekle</button>
                    : null}
                <button type="button" onClick={e => { e.stopPropagation(); void setNodePruned(node.id, !budandi); }} aria-pressed={budandi}
                    className={`${ARAC} ${budandi ? 'bg-white/15 text-clay-300' : ''}`} title={budandi ? 'Budamayı geri al' : 'Buda'} aria-label={budandi ? 'Budamayı geri al' : 'Buda'}><Scissors size={16} /></button>
            </div>

            <div role="button" tabIndex={0} aria-label={node.title} aria-pressed={secili}
                data-node-id={node.id} data-yk-id={node.id} data-yk-derinlik={derinlik} data-yk-ebeveyn={ebeveynId} data-yk-acik={acik ? '1' : '0'}
                onClick={dokun}
                onKeyDown={e => {
                    if (e.target !== e.currentTarget || !['Enter', ' '].includes(e.key)) return;
                    e.preventDefault();
                    if (secili) onEdit(node); else setSelectedNode(node.id);
                }}
                className={`dugum-karti relative z-10 cursor-pointer select-none outline-none transition-[box-shadow,transform] duration-200 active:scale-[.99] ${secili ? 'shadow-[0_0_0_2px_rgb(var(--sand-50)),0_0_0_4.5px_rgb(var(--moss-500))]' : ''}`}
                style={{ borderRadius: yaricap }}>
                {govde}
            </div>

            {tur !== 'kok' && (
                <button type="button" onClick={e => { e.stopPropagation(); if (onAddSiblingAfter) onAddSiblingAfter(node.id); else onAddChild(ebeveynId, 'right'); }} title={yanAdi} aria-label={yanAdi}
                    className={`absolute z-30 flex h-10 items-center justify-center gap-1 touch-manipulation transition-opacity duration-200 ${yanPos} ${araclar ? 'opacity-100' : 'pointer-events-none invisible opacity-0'}`}>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-moss-600 text-white shadow-[0_4px_10px_-3px_rgba(27,58,40,.6)] ring-2 ring-white"><Plus size={15} /></span>
                    <span className="whitespace-nowrap rounded-full border border-moss-200 bg-moss-50/95 px-2 py-0.5 text-[10px] font-bold text-moss-800">Yan</span>
                </button>
            )}
            {cocukSayisi === 0 && (
                <button type="button" onClick={e => { e.stopPropagation(); onAddChild(node.id, 'right'); }} title={ekleAdi} aria-label={ekleAdi}
                    className={`absolute z-30 flex h-10 min-w-10 items-center justify-center touch-manipulation transition-opacity duration-200 ${eklePos} ${araclar ? 'opacity-100' : 'pointer-events-none invisible opacity-0'}`}>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-moss-600 text-white shadow-[0_4px_10px_-3px_rgba(27,58,40,.6)] ring-2 ring-white"><Plus size={15} /></span>
                    {tur !== 'kok' && <span className="ml-1 whitespace-nowrap rounded-full border border-moss-200 bg-moss-50/95 px-2 py-0.5 text-[10px] font-bold text-moss-800">Alt</span>}
                </button>
            )}
            {cocukSayisi > 0 && (
                <button type="button" onClick={acKapa} aria-expanded={acik} title={acik ? 'Dalları kapat' : 'Dalları aç'} aria-label={acik ? 'Dalları kapat' : 'Dalları aç'}
                    className="absolute bottom-0 right-0 z-30 flex h-10 w-10 translate-x-1/3 translate-y-1/3 items-center justify-center touch-manipulation">
                    <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-bold ring-2 ring-white ${acik ? 'bg-sand-100 text-sand-500 shadow-soft' : 'bg-moss-600 text-white shadow-[0_4px_10px_-3px_rgba(27,58,40,.6)]'}`}>
                        {acik ? <ChevronDown size={14} /> : cocukSayisi}
                    </span>
                </button>
            )}
        </div>
    );
}
