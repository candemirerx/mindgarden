'use client';

/**
 * Çok ağaçlı bahçede hızlı gezinme: kaydırma çubukları ya da ağaç sekmeleri.
 *
 * Tuvalin görünüm durumu (kaydırma ve ölçek) GardenCanvas'ta tutulur; bu
 * bileşen yalnızca okur ve `kaydir` ile yeni konum ister. İçeriğin dünya
 * koordinatlarındaki sınırları ve ağaç köklerinin yeri `dunya` ile gelir.
 */
import React, { useRef, useState } from 'react';
import type { TuvalGezinme as GezinmeTuru } from '@/lib/tuvalTercihleri';

export type DunyaOlcusu = {
    minX: number; minY: number; maxX: number; maxY: number;
    kokler: { id: string; ad: string; sayi: number; x: number; y: number; w: number; h: number }[];
};
type Gorunum = { scale: number; offset: { x: number; y: number } };

/** Dokunuşların tuvale geçip onu kaydırmasını/seçimi kaldırmasını engeller. */
const yut = {
    onMouseDown: (e: React.SyntheticEvent) => e.stopPropagation(),
    onTouchStart: (e: React.SyntheticEvent) => e.stopPropagation(),
    onTouchMove: (e: React.SyntheticEvent) => e.stopPropagation(),
    onClick: (e: React.SyntheticEvent) => e.stopPropagation()
};

export function TuvalGezinme({ tur, dunya, gorunum, boyut, kaydir, ortala }: {
    tur: GezinmeTuru;
    dunya: DunyaOlcusu | null;
    gorunum: Gorunum;
    boyut: { w: number; h: number };
    /** Görünür alanın sol/üst dünya koordinatını ayarlar (yalnız verilen eksen). */
    kaydir: (eksen: 'x' | 'y', dunyaKoordinati: number) => void;
    /** Ağacın köküne gider. */
    ortala: (kokId: string) => void;
}) {
    if (!dunya || tur === 'yok' || !boyut.w) return null;
    const vx = -gorunum.offset.x / gorunum.scale, vy = -gorunum.offset.y / gorunum.scale;
    const vw = boyut.w / gorunum.scale, vh = boyut.h / gorunum.scale;
    // Görünür alanın ortasına en yakın ağaç: sekmede vurgulanır, çubukta balonda yazar.
    const ortaX = vx + vw / 2, ortaY = vy + vh / 2;
    const enYakin = dunya.kokler.reduce<DunyaOlcusu['kokler'][number] | null>((en, k) => {
        const d = Math.hypot(k.x + k.w / 2 - ortaX, (k.y + k.h / 2 - ortaY) * 0.6);
        return !en || d < Math.hypot(en.x + en.w / 2 - ortaX, (en.y + en.h / 2 - ortaY) * 0.6) ? k : en;
    }, null);

    if (tur === 'sekme') {
        if (dunya.kokler.length < 2) return null;
        return (
            <nav aria-label="Ağaçlar" className="tuval-sekmeleri" {...yut}>
                {dunya.kokler.map(k => (
                    <button key={k.id} type="button" onClick={() => ortala(k.id)} aria-current={enYakin?.id === k.id}
                        className={`tuval-sekme ${enYakin?.id === k.id ? 'tuval-sekme--aktif' : ''}`}>
                        <span className="truncate">{k.ad}</span>
                        <b>{k.sayi}</b>
                    </button>
                ))}
            </nav>
        );
    }
    return (
        <>
            <Cubuk eksen="x" en={vx} boy={vw} min={dunya.minX} max={dunya.maxX} kokler={dunya.kokler} kaydir={kaydir} enYakin={enYakin?.ad} />
            <Cubuk eksen="y" en={vy} boy={vh} min={dunya.minY} max={dunya.maxY} kokler={dunya.kokler} kaydir={kaydir} enYakin={enYakin?.ad} />
        </>
    );
}

function Cubuk({ eksen, en, boy, min, max, kokler, kaydir, enYakin }: {
    eksen: 'x' | 'y'; en: number; boy: number; min: number; max: number;
    kokler: DunyaOlcusu['kokler']; kaydir: (eksen: 'x' | 'y', v: number) => void; enYakin?: string;
}) {
    const izRef = useRef<HTMLDivElement>(null);
    const surukle = useRef<{ lo: number; hi: number; tutma: number } | null>(null);
    const [suruklu, setSuruklu] = useState(false);
    const pay = 60;
    // İçerik görünür alana sığıyorsa bu yönde çubuk gerekmez.
    if (max - min + pay * 2 <= boy) return null;
    const lo = Math.min(min - pay, en), hi = Math.max(max + pay, en + boy);
    const sinir = surukle.current ?? { lo, hi };
    const toplam = sinir.hi - sinir.lo;
    const bas = (en - sinir.lo) / toplam, uzunluk = Math.max(0.08, boy / toplam);
    const oran = (e: React.PointerEvent) => {
        const r = izRef.current!.getBoundingClientRect();
        return eksen === 'x' ? (e.clientX - r.left) / r.width : (e.clientY - r.top) / r.height;
    };
    const indir = (e: React.PointerEvent) => {
        e.stopPropagation();
        const o = oran(e);
        // Tutamağın üstünden tutulduysa tutulan nokta korunur; boş yere dokunulduysa tutamak oraya ortalanır.
        const tutma = o >= bas && o <= bas + uzunluk ? o - bas : uzunluk / 2;
        surukle.current = { lo, hi, tutma };
        setSuruklu(true);
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* yok */ }
        kaydir(eksen, lo + (o - tutma) * (hi - lo));
    };
    const tasi = (e: React.PointerEvent) => {
        const s = surukle.current;
        if (!s) return;
        e.stopPropagation();
        kaydir(eksen, s.lo + (oran(e) - s.tutma) * (s.hi - s.lo));
    };
    const birak = () => { surukle.current = null; setSuruklu(false); };
    const yatay = eksen === 'x';
    return (
        <div className={`tuval-cubuk tuval-cubuk--${eksen} ${suruklu ? 'tuval-cubuk--suruklu' : ''}`} {...yut}
            role="slider" aria-orientation={yatay ? 'horizontal' : 'vertical'} aria-label={yatay ? 'Yatay kaydırma' : 'Dikey kaydırma'}
            aria-valuenow={Math.round(bas * 100)} aria-valuemin={0} aria-valuemax={100}
            onPointerDown={indir} onPointerMove={tasi} onPointerUp={birak} onPointerCancel={birak}>
            <div ref={izRef} className="tuval-cubuk__iz">
                {kokler.map(k => {
                    const p = ((yatay ? k.x + k.w / 2 : k.y + k.h / 2) - sinir.lo) / toplam;
                    return p > 0 && p < 1 ? <i key={k.id} style={yatay ? { left: `${p * 100}%` } : { top: `${p * 100}%` }} /> : null;
                })}
                <span className="tuval-cubuk__tutamak" style={yatay ? { left: `${bas * 100}%`, width: `${uzunluk * 100}%` } : { top: `${bas * 100}%`, height: `${uzunluk * 100}%` }} />
            </div>
            {suruklu && enYakin && <div className="tuval-cubuk__balon" style={yatay ? { left: `${Math.min(80, Math.max(0, bas * 100))}%` } : { top: `${Math.min(85, Math.max(0, bas * 100))}%` }}>{enYakin}</div>}
        </div>
    );
}
