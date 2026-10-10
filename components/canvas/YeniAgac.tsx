'use client';

/**
 * Tuvalin ağaç çizimi: Organik, Klasik ve Yatay akış.
 *
 * Kartlar CSS ile dizilir; bağlantılar kartlar yerleştikten sonra ölçülüp SVG
 * ile çizilir (kökten uca doğru incelen kavisli dallar). Böylece kartların
 * yüksekliği önizleme satırına göre değişse de çizgiler hep doğru yere gider.
 *
 * - Organik: kökten dallar yan yana açılır; dalın altındaki yapraklar dalın
 *   ortasından inen sapa asılır. Daha derin notlar girintili listelenir.
 * - Yatay: soldan sağa kök → dal → yaprak.
 *
 * Dokunma: kısa dokunuş menüyü açar; ardından uzun basıp sürüklemek taşır.
 * İlk uzun basış seçenekleri açar; kaydırıp bırakınca seçilen işlem uygulanır.
 */
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ClipboardList, Copy, CornerDownLeft, GitBranch, Keyboard, Leaf, Pencil, Plus, Scissors, Move, SlidersHorizontal, Sparkles, Sprout, TreePine, Wand2 } from 'lucide-react';
import { useKartHareketi } from './useKartHareketi';
import { MindNode } from '@/lib/types';
import { useStore } from '@/lib/store/useStore';
import { VARSAYILAN_KART_DUGMELERI } from '@/lib/tuvalTercihleri';
import { makroHazir, sendKey, sendToComputerClipboard, typeOnComputer } from '@/lib/remoteTools';
import { useRemotePrefs } from '@/lib/useRemotePrefs';
import { makroCalisiyor, makroyuBaslat, makroyuDurdur } from '@/lib/makroCalistirici';
import { readEnabledMacros } from '@/lib/aiMacro';
import { readActiveProvider, readCustomUrl, readProviderKey, readProviderModel, providerHazir } from '@/lib/aiProvider';
import { runCustomProviderDirect } from '@/lib/customProvider';
import { runLocalInference } from '@/lib/localLlm';
import { splitIntoChunks } from '@/lib/aiChunks';
import { Capacitor } from '@capacitor/core';
import { basHarf } from './KartAracEkle';
import type { KartAiMakrolari, KartMakrolari } from '@/lib/tuvalTercihleri';
import type { KartDugmeleri, KartIslevi, TuvalEylem, TuvalKart, TuvalOnizleme, TuvalGosterim } from '@/lib/tuvalTercihleri';

type Duzen = TuvalGosterim;
type Ortak = {
    duzen: Duzen;
    onizleme: TuvalOnizleme;
    /** Kart çevresinde üç tasarım; panel ve yüzen düğme sayfa düzeyinde çizilir. */
    eylem?: TuvalEylem;
    /** Kart tasarımı; verilmezse bahçe. */
    kart?: TuvalKart;
    onAddChild: (parentId: string, direction?: 'left' | 'right') => void;
    onAddTree?: (rootId: string, direction?: 'left' | 'right') => void;
    onAddSiblingBefore?: (siblingId: string) => void;
    dugmeler?: KartDugmeleri;
    /** "Makro çalıştır" işlevine bağlanan makro kimlikleri (yer -> makro). */
    kartMakrolari?: KartMakrolari;
    /** "Yapay zekâ makrosu" işlevine bağlanan görev kimlikleri (yer -> görev). */
    kartAiMakrolari?: KartAiMakrolari;
    onSettings?: () => void;
    /** Yan not: notun hemen yanına (sonrasına) kardeş ekler. */
    onAddSiblingAfter?: (siblingId: string) => void;
    onEdit: (node: MindNode) => void;
};

/** Kart aracı: eşit bölmeli üst şerit ve kenar boyunca geniş, kısa hedefler. */
const ARAC = 'kart-eylem flex items-center justify-center rounded-full outline-none touch-manipulation';

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
            if (ortak.duzen === 'klasik') {
                const sx = e.x + e.w / 2, sy = e.y + e.h;
                const ara = sy + (Math.min(...ck.map(c => c.y)) - sy) / 2;
                ck.forEach(c => {
                    const cx = c.x + c.w / 2;
                    yollar.push({ d: `M${sx} ${sy}V${ara}H${cx}V${c.y}`, renk: 'rgb(var(--sand-400))', dolu: false, k: 2 });
                });
                return;
            }
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
            // Daldan yapraklara (ve yapraktan alt yapraklara): kartın altının ortasından
            // yan yana dizilen kardeşlerin tepesine dallanan incelen saplar; tepede boğum
            const sx = e.x + e.w / 2, sy = e.y + e.h, ilk = e.derinlik === 1;
            ck.forEach(c => {
                const cx = c.x + c.w / 2, ara = Math.max(12, (c.y - sy) / 2);
                yollar.push({ d: incelenYol(sx, sy - 2, sx, sy + ara, cx, c.y - ara, cx, c.y + 1, ilk ? 3.2 : 2.4, ilk ? 2 : 1.6), renk: ilk ? 'rgb(var(--moss-400))' : 'rgb(var(--moss-300))', dolu: true });
                noktalar.push({ x: cx, y: c.y - 1 });
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
    // Dal ve yapraklar: kardeşler üstlerinin altında yan yana dallanır (dümdüz alt alta değil).
    return (
        <div className="flex flex-col items-center">
            {kart}
            {gorunur && <div className={`${derinlik === 1 ? 'mt-12' : 'mt-10'} flex items-start gap-5`}>{cocuklar}</div>}
        </div>
    );
}

function Kart({ node, derinlik, ebeveynId, acik, setAcik, duzen, onizleme, kart = 'bahce', eylem = 'hap', dugmeler = VARSAYILAN_KART_DUGMELERI, kartMakrolari, kartAiMakrolari, onSettings, onAddChild, onAddTree, onAddSiblingAfter, onAddSiblingBefore, onEdit }: {
    node: MindNode; derinlik: number; ebeveynId: string; acik: boolean; setAcik: (a: boolean) => void;
} & Ortak) {
    const { selectedNodeId, setSelectedNode, toggleNodeExpansion, setNodePruned } = useStore();
    const [kopyalandi, setKopyalandi] = useState(false);
    const prefs = useRemotePrefs();
    const disMenu = eylem === 'panel' || eylem === 'yuzen';
    const hareket = useKartHareketi(disMenu ? () => setSelectedNode(node.id) : undefined);
    const secili = selectedNodeId === node.id;
    const budandi = node.isPruned ?? false;
    const cocukSayisi = node.children.length;
    // Tek dokunuşta sabit, ilk uzun basışta kaydırarak seçim menüsü.
    const araclar = hareket.acik;
    const tur = derinlik === 0 ? 'kok' : (node.nodeType && node.nodeType !== 'auto' ? node.nodeType : derinlik === 1 ? 'branch' : 'leaf');
    const metin = onizleme > 0 ? onizlemeMetni(node.content) : '';
    const satir: React.CSSProperties = { display: '-webkit-box', WebkitLineClamp: onizleme, WebkitBoxOrient: 'vertical', overflow: 'hidden' };

    const kopyala = () => {
        const govde = node.content.split('\n').slice(1).join('\n').trim();
        void navigator.clipboard.writeText(govde || node.title);
        setKopyalandi(true); setTimeout(() => setKopyalandi(false), 1500);
    };
    const acKapa = (e: React.MouseEvent) => { e.stopPropagation(); setAcik(!acik); toggleNodeExpansion(node.id, !acik); };
    const genislik = duzen === 'yatay'
        ? (tur === 'kok' ? 'w-[210px]' : 'w-[216px]')
        : (tur === 'kok' ? 'w-[272px]' : derinlik === 1 ? 'w-[208px]' : 'w-[196px]');

    let govde: React.ReactNode;
    const turAdi = tur === 'kok' ? 'Kök' : tur === 'branch' ? 'Dal' : 'Yaprak';
    const TurSimge = tur === 'kok' ? TreePine : tur === 'branch' ? GitBranch : Leaf;
    const sayac = cocukSayisi > 0 && <span className="inline-flex items-center gap-1"><TurSimge size={10} />{tur === 'kok' ? `${cocukSayisi} dal` : `${cocukSayisi} yaprak`}</span>;
    if (kart === 'sade') {
        // Sade: gölgesiz, ince çerçeve; seviye yalnız küçük etiket ve renkli noktayla belli olur
        const nokta = tur === 'kok' ? 'bg-moss-600' : tur === 'branch' ? 'bg-clay-500' : 'bg-moss-400';
        govde = (
            <div className={`rounded-xl border bg-white px-3 py-2.5 ring-1 ring-[color:var(--kart-kenar)] ${tur === 'kok' ? 'border-2 border-moss-600' : 'border-sand-200'} ${budandi ? 'border-dashed opacity-60' : ''}`}>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-sand-500">
                    <span className={`h-1.5 w-1.5 rounded-full ${nokta}`} />{budandi ? 'Budandı' : turAdi}
                    {sayac && <span className="ml-auto normal-case tracking-normal text-sand-400">{sayac}</span>}
                </div>
                <p className={`mt-1 font-semibold leading-snug text-sand-900 ${tur === 'kok' ? 'text-[17px]' : 'text-[13.5px]'} ${budandi ? 'line-through' : ''}`} style={{ ...satir, WebkitLineClamp: 2 }}>{node.title}</p>
                {metin && <p className="mt-0.5 text-xs leading-[1.45] text-sand-500" style={satir}>{metin}</p>}
            </div>
        );
    } else if (kart === 'renkli') {
        // Renkli: seviyeye göre dolu renk; kök koyu yeşil, dal kehribar, yaprak açık yeşil
        const renk = tur === 'kok' ? 'bg-[rgb(var(--kok-1))] text-[rgb(var(--kok-yazi))] border-[rgb(var(--kok-2))]' : tur === 'branch' ? 'bg-clay-100 text-clay-900 border-clay-300' : 'bg-moss-50 text-moss-900 border-moss-200';
        const ikincil = tur === 'kok' ? 'text-[rgb(var(--kok-soluk))]' : tur === 'branch' ? 'text-clay-700' : 'text-moss-700';
        govde = (
            <div className={`rounded-2xl border px-3.5 py-3 shadow-[0_10px_22px_-18px_rgba(30,24,19,.6)] ring-1 ring-[color:var(--kart-kenar)] ${renk} ${budandi ? 'border-dashed opacity-60' : ''}`}>
                <div className="flex items-center gap-2">
                    <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg ${tur === 'kok' ? 'bg-[rgb(var(--kok-yazi)/.15)]' : 'bg-white/70'}`}>{budandi ? <Scissors size={12} /> : <TurSimge size={13} />}</span>
                    <span className={`min-w-0 flex-1 font-semibold leading-tight ${tur === 'kok' ? 'font-serif text-[18px]' : 'text-[13.5px]'} ${budandi ? 'line-through' : ''}`} style={{ ...satir, WebkitLineClamp: 2 }}>{node.title}</span>
                </div>
                {metin && <p className={`mt-1.5 text-xs leading-[1.45] ${ikincil}`} style={satir}>{metin}</p>}
                {sayac && <div className={`mt-2 text-[10.5px] font-semibold ${ikincil}`}>{sayac}</div>}
            </div>
        );
    } else if (kart === 'hap') {
        // Hap: tek satır, yuvarlak; kalabalık ağaçlarda en az yer kaplar (önizleme gösterilmez;
        // alt sayısını sağ alttaki aç/kapa düğmesi gösterir)
        const renk = tur === 'kok' ? 'bg-[rgb(var(--kok-2))] text-[rgb(var(--kok-yazi))] border-[rgb(var(--kok-3))]' : tur === 'branch' ? 'bg-white text-sand-900 border-clay-300' : 'bg-white text-sand-900 border-moss-200';
        govde = (
            <div className={`flex items-center gap-2 rounded-full border-[1.5px] py-1.5 pl-1.5 pr-3 shadow-[0_6px_14px_-12px_rgba(30,24,19,.7)] ring-1 ring-[color:var(--kart-kenar)] ${renk} ${budandi ? 'border-dashed opacity-60' : ''}`}>
                <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${tur === 'kok' ? 'bg-[rgb(var(--kok-yazi)/.15)]' : tur === 'branch' ? 'bg-clay-100 text-clay-700' : 'bg-moss-50 text-moss-600'}`}>{budandi ? <Scissors size={12} /> : <TurSimge size={13} />}</span>
                <span className={`min-w-0 flex-1 truncate font-semibold ${tur === 'kok' ? 'font-serif text-[16px]' : 'text-[13px]'} ${budandi ? 'line-through' : ''}`}>{node.title}</span>
            </div>
        );
    } else if (tur === 'kok') {
        govde = (
            <div className={`relative overflow-hidden rounded-[24px] bg-[linear-gradient(150deg,rgb(var(--kok-1))_0%,rgb(var(--kok-2))_55%,rgb(var(--kok-3))_100%)] px-4 pb-3.5 pt-3.5 text-[rgb(var(--kok-yazi))] ring-1 ring-[color:var(--kart-kenar)] shadow-[0_1px_0_rgba(255,255,255,.14)_inset,0_22px_40px_-22px_rgba(18,40,27,.85)] ${budandi ? 'opacity-60' : ''}`}>
                {/* köşede silik ağaç filigranı */}
                <TreePine aria-hidden="true" size={96} strokeWidth={1.2} className="pointer-events-none absolute -right-5 -top-3 text-[rgb(var(--kok-yazi)/.07)]" />
                <span className="relative inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--kok-yazi)/.12)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.08em] text-[rgb(var(--kok-soluk))]">
                    {budandi ? <Scissors size={10} /> : <TreePine size={10} />}{budandi ? 'Budandı' : 'Kök not'}
                </span>
                <p className={`relative mt-1.5 font-serif text-[21px] font-semibold leading-tight tracking-tight ${budandi ? 'line-through' : ''}`} style={{ ...satir, WebkitLineClamp: 2 }}>{node.title}</p>
                {metin && <p className="relative mt-1 text-[12.5px] leading-snug text-[rgb(var(--kok-soluk)/.9)]" style={satir}>{metin}</p>}
                {cocukSayisi > 0 && <div className="relative mt-3 flex flex-wrap gap-1.5 border-t border-[rgb(var(--kok-yazi)/.1)] pt-2.5 text-[10.5px] font-semibold text-[rgb(var(--kok-yazi)/.92)]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--kok-yazi)/.12)] px-2 py-0.5"><GitBranch size={10} />{cocukSayisi} dal</span>
                    {altSayisi(node) - cocukSayisi > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--kok-yazi)/.12)] px-2 py-0.5"><Leaf size={10} />{altSayisi(node) - cocukSayisi} yaprak</span>}
                </div>}
            </div>
        );
    } else if (tur === 'branch') {
        govde = (
            <div className={`overflow-hidden rounded-[18px] border border-clay-200/70 bg-white shadow-[0_1px_2px_rgba(30,24,19,.05),0_14px_28px_-20px_rgba(120,72,14,.45)] ring-1 ring-[color:var(--kart-kenar)] ${budandi ? 'border-dashed opacity-60' : ''}`}>
                <div className="flex items-center gap-2 bg-[linear-gradient(180deg,rgb(var(--clay-50)),rgb(var(--clay-50)/.4))] px-3 pb-2 pt-2.5">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-clay-300 to-clay-500 text-[rgb(var(--kok-yazi))] shadow-[0_2px_6px_-2px_rgba(170,104,20,.6)]"><GitBranch size={13} /></span>
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
            <div className={`relative overflow-hidden rounded-2xl border border-sand-200/90 bg-white/95 ring-1 ring-[color:var(--kart-kenar)] py-2.5 pl-3.5 pr-3 shadow-[0_1px_2px_rgba(30,24,19,.04),0_12px_24px_-20px_rgba(27,58,40,.45)] ${budandi ? 'border-dashed opacity-60' : ''}`}>
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

    const ekleAdi = tur === 'kok' ? 'Altına dal ekle' : 'Altına yaprak ekle';
    const yanAdi = tur === 'kok' ? 'Yanına ağaç ekle' : derinlik === 1 ? 'Yanına dal ekle' : 'Yanına yaprak ekle';
    const yaricap = kart === 'hap' ? 9999 : kart === 'sade' ? 12 : kart === 'renkli' ? 16 : tur === 'kok' ? 24 : tur === 'branch' ? 18 : 16;
    const dugme = (id: string, ana = false) => `${ARAC} ${ana ? 'kart-eylem--ana' : ''} ${hareket.hedef === id ? 'kart-eylem--hedef' : ''}`;
    const tasi = () => hareket.kap.current?.dispatchEvent(new CustomEvent('nb-agac-tasi', { bubbles: true }));
    const etiketler: Record<string, string> = { editor: 'Düzenle', kopya: 'İçeriği kopyala', buda: budandi ? 'Budamayı geri al' : 'Buda', tasi: 'Ağacı taşı', sol: 'Sol ' + yanAdi.toLocaleLowerCase('tr'), yan: yanAdi, alt: ekleAdi, ayarlar: 'Ağaç ayarları', makro: 'Makro seçilmedi', pcYaz: 'Bilgisayara yaz', pcPano: 'Bilgisayar panosuna gönder', pcEnter: 'Bilgisayarda Enter' };
    const makrolar = prefs.macros.filter(makroHazir);
    const makro = (yer: keyof KartDugmeleri) => dugmeler[yer] === 'makro' ? makrolar.find(m => m.id === (kartMakrolari ?? {})[yer]) ?? null : null;
    const makroBilgisi = (yer: keyof KartDugmeleri) => {
        const m = makro(yer);
        return m ? { makro: m, ad: m.name.trim() || 'Makro', harf: basHarf(m.name) } : null;
    };
    const makroCalistir = (yer: keyof KartDugmeleri) => {
        const bilgi = makroBilgisi(yer);
        if (!bilgi) return;
        if (makroCalisiyor(bilgi.makro.id)) makroyuDurdur(bilgi.makro.id);
        else void makroyuBaslat(bilgi.makro, prefs).catch(() => { try { navigator.vibrate?.(30); } catch { } });
    };
    const notGovdesi = () => node.content.split('\n').slice(1).join('\n').trim() || node.title;
    const aiGorevleri = readEnabledMacros();
    const aiGorev = (yer: keyof KartDugmeleri) => dugmeler[yer] === 'aiMakro' ? aiGorevleri.find(m => m.id === (kartAiMakrolari ?? {})[yer]) ?? null : null;
    const aiGorevBilgisi = (yer: keyof KartDugmeleri) => {
        const m = aiGorev(yer);
        return m ? { makro: m, ad: m.title.trim() || 'Görev', harf: basHarf(m.title) } : null;
    };
    /** Editördeki AI çağrısıyla aynı yol: sunucu uç noktası, özel sunucuda cihazdan doğrudan istek, yerel model. */
    const aiMakroCalistir = async (gorev: { id: string; title: string; instruction: string }) => {
        const metin = notGovdesi();
        if (!metin.trim()) throw new Error('Not içeriği boş.');
        const provider = readActiveProvider();
        if (!providerHazir(provider)) throw new Error('Yapay zekâ ayarlanmadı: editör → Yapay zekâ bölümünden sağlayıcı ve anahtar ekleyin.');
        const calistirParca = async (parca: string): Promise<string> => {
            if (provider === 'local') {
                const yanit = await runLocalInference(gorev.instruction + '\n\nİNCELENECEK METİN:\n' + parca + '\n\nYANIT (Yalnızca işlenmiş nihai metni ver):');
                return typeof yanit.text === 'string' && yanit.text.trim() ? yanit.text.trim() : parca;
            }
            if (provider === 'custom' && Capacitor.isNativePlatform()) {
                return runCustomProviderDirect({ baseUrl: readCustomUrl(), apiKey: readProviderKey(provider), model: readProviderModel(provider), instruction: gorev.instruction, text: parca });
            }
            const adres = Capacitor.isNativePlatform() ? 'https://mindgarden-neon.vercel.app/api/spellcheck' : '/api/spellcheck';
            const yanit = await fetch(adres, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: parca, clientApiKey: readProviderKey(provider), provider, customUrl: readCustomUrl(), customModel: readProviderModel(provider), macro: gorev.instruction }) });
            if (!yanit.ok) { const h = await yanit.json().catch(() => null); throw new Error(h?.error || 'Yapay zekâ isteği başarısız oldu.'); }
            const veri = await yanit.json();
            return typeof veri.correctedText === 'string' ? veri.correctedText : parca;
        };
        const parcalar = splitIntoChunks(metin);
        let sonuc = '';
        for (const parca of parcalar) sonuc += (await calistirParca(parca.text)).trim() + parca.after;
        if (parcalar.length === 1 && sonuc.trim() === metin.trim()) throw new Error('Model bir değişiklik döndürmedi.');
        await useStore.getState().updateNode(node.id, sonuc.trimEnd());
    };
    const pcAktar = (islem: () => Promise<void>) => {
        void islem().catch(hata => {
            console.error('PC aktarımı başarısız:', hata);
            try { navigator.vibrate?.(30); } catch { }
            alert(hata instanceof Error ? hata.message : 'Bilgisayar bağlantısı gerekli.');
        });
    };
    const uygula = (id: KartIslevi) => {
        if (id === 'editor') onEdit(node);
        else if (id === 'kopya') void kopyala();
        else if (id === 'buda') void setNodePruned(node.id, !budandi);
        else if (id === 'tasi') tasi();
        else if (id === 'ayarlar') onSettings?.();
        else if (id === 'alt') onAddChild(node.id, 'right');
        else if (id === 'sol' || id === 'yan') {
            if (tur === 'kok') onAddTree?.(node.id, id === 'sol' ? 'left' : 'right');
            else if (id === 'sol' && onAddSiblingBefore) onAddSiblingBefore(node.id);
            else if (onAddSiblingAfter) onAddSiblingAfter(node.id);
            else onAddChild(ebeveynId, id === 'sol' ? 'left' : 'right');
        }
        else if (id === 'pcYaz') pcAktar(() => typeOnComputer(notGovdesi(), prefs));
        else if (id === 'pcPano') pcAktar(() => sendToComputerClipboard(notGovdesi(), prefs));
        else if (id === 'pcEnter') pcAktar(() => sendKey('ENTER', prefs));
    };
    const simge = (id: KartIslevi) => {
        if (id === 'editor') return <Pencil size={18} />;
        if (id === 'kopya') return kopyalandi ? <Check size={17} /> : <Copy size={17} />;
        if (id === 'buda') return <Scissors size={17} />;
        if (id === 'tasi') return <Move size={17} />;
        if (id === 'ayarlar') return <SlidersHorizontal size={16} />;
        if (id === 'pcYaz') return <Keyboard size={17} />;
        if (id === 'pcPano') return <ClipboardList size={17} />;
        if (id === 'pcEnter') return <CornerDownLeft size={17} />;
        if (id === 'aiMakro') return <Sparkles size={17} />;
        return <Plus size={17} />;
    };
    const buton = (yer: keyof KartDugmeleri, sinif = '') => {
        const id = dugmeler[yer];
        if (id === 'yok') return null;
        const ust = yer.startsWith('ust');
        const bilgi = makroBilgisi(yer);
        const aiBilgi = aiGorevBilgisi(yer);
        const yazi = id === 'sol' || id === 'yan' ? 'Yanına' : id === 'alt' ? 'Altına' : id === 'kopya' ? 'Kopyala' : id === 'buda' ? 'Buda' : id === 'tasi' ? 'Taşı' : id === 'ayarlar' ? 'Ayarlar' : id === 'makro' ? 'Makro' : id === 'pcYaz' ? 'PC yaz' : id === 'pcPano' ? 'PC pano' : id === 'pcEnter' ? 'Enter' : id === 'aiMakro' ? 'Yapay zekâ' : 'Düzenle';
        return <button key={yer} data-kart-yer={yer} data-kart-eylem={id} type="button"
            onClick={e => {
                e.stopPropagation();
                // Gerçek dokunuşta capture aşamasında menüyü kaldırmak click işlevini yutuyor.
                // Önce düğmenin işlevi çalışsın, ardından menü kapansın.
                if (bilgi) makroCalistir(yer); else if (aiBilgi) void aiMakroCalistir(aiBilgi.makro).catch(hata => { try { navigator.vibrate?.(30); } catch { } alert(hata instanceof Error ? hata.message : 'Yapay zekâ görevi çalıştırılamadı.'); }); else uygula(id);
                hareket.kapat();
            }} title={bilgi ? bilgi.ad + ' makrosu' : aiBilgi ? aiBilgi.ad + ' görevi' : etiketler[id]} aria-label={bilgi ? bilgi.ad + ' makrosu' : aiBilgi ? aiBilgi.ad + ' görevi' : etiketler[id]}
            aria-pressed={id === 'buda' ? budandi : undefined}
            className={dugme(id, ust && yer === 'ustOrta') + ' ' + sinif}>
            {bilgi ? <span aria-hidden="true" className="kart-makro-harf">{bilgi.harf}</span> : aiBilgi ? <span aria-hidden="true" className="kart-makro-harf">{aiBilgi.harf}</span> : id === 'makro' ? <Wand2 size={17} /> : simge(id)}
            {!yer.startsWith('altS') && <span className="kart-eylem-yazi">{bilgi ? bilgi.ad : aiBilgi ? aiBilgi.ad : yazi}</span>}
        </button>;
    };

    return (
        <div ref={hareket.kap} data-kart-kap data-kart-aktif={araclar ? '1' : undefined}
            data-kart-model={eylem}
            onKeyDown={e => { if (e.key === 'Escape') { hareket.kapat(); hareket.kap.current?.querySelector<HTMLElement>('.dugum-karti')?.focus(); } }}
            className={`relative flex-shrink-0 ${genislik} ${araclar ? 'z-50' : ''}`}>
            {araclar && <>
                {[dugmeler.ustSol, dugmeler.ustOrta, dugmeler.ustSag].some(id => id !== 'yok') &&
                    <div role="toolbar" aria-label={`${node.title} araçları`} className="kart-araclar">
                        {buton('ustSol')}{buton('ustOrta')}{buton('ustSag')}
                    </div>}
                {buton('sol', 'kart-sol')}{buton('sag', 'kart-yan')}{buton('alt', 'kart-alt')}
                {buton('altSol', 'kart-kose kart-kose--sol')}{buton('altSag', 'kart-kose kart-kose--sag')}
                {hareket.hedef && <span className="kart-eylem-etiket" aria-live="polite">{etiketler[hareket.hedef]}</span>}
            </>}
            <div role="button" tabIndex={0} aria-label={node.title} aria-pressed={secili}
                data-node-id={node.id} data-yk-id={node.id} data-yk-derinlik={derinlik} data-yk-ebeveyn={ebeveynId} data-yk-acik={acik ? '1' : '0'}
                {...hareket.events}
                onKeyDown={e => {
                    if (e.target !== e.currentTarget) return;
                    if (['Enter', ' '].includes(e.key)) { e.preventDefault(); hareket.klavyeAc(); }
                    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); hareket.klavyeAc(); }
                }}
                className={`dugum-karti relative z-10 cursor-pointer select-none outline-none transition-[box-shadow,transform] duration-200 ${araclar || secili ? 'shadow-[0_0_0_2px_rgb(var(--sand-50)),0_0_0_4.5px_rgb(var(--moss-500))]' : ''}`}
                style={{ borderRadius: yaricap, touchAction: 'none' }}>
                {govde}
            </div>
            {cocukSayisi > 0 && !araclar && (
                <button type="button" onClick={acKapa} aria-expanded={acik} title={acik ? 'Dalları kapat' : 'Dalları aç'} aria-label={acik ? 'Dalları kapat' : 'Dalları aç'}
                    className="absolute bottom-0 right-0 z-30 flex h-10 w-10 translate-x-1/3 translate-y-1/3 items-center justify-center touch-manipulation">
                    <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-bold ring-2 ring-white ${acik ? 'bg-sand-100 text-sand-500 shadow-soft' : 'bg-moss-600 text-white shadow-soft'}`}>
                        {acik ? <ChevronDown size={14} /> : cocukSayisi}
                    </span>
                </button>
            )}
        </div>
    );
}
