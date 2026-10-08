'use client';

import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { KART_BASILI_TUT_KAYMA_ESIGI, kartMenusuAcikMi, kartMenusunuAyarla } from '@/lib/canvasGesture';

/**
 * Parmak 42 px'lik düğmeyi tam tutturmazsa da en yakın düğme seçilsin.
 * 12 px, kısa kartlarda kartın ortasındayken yanlışlıkla bir düğmeye
 * basılmayacak kadar küçük, parmağın kaçırmasını affedecek kadar büyük.
 */
const DUGME_YAKINLIK_ESIGI = 12;

/** Basılı tutup kaydırma sırasında pointer capture kartta kalır; hedef ekran koordinatıyla ölçülür. */
export function useKartHareketi(onTap: () => void) {
    const [acik, setAcik] = useState(false);
    const [hedef, setHedef] = useState<string | null>(null);
    const kap = useRef<HTMLDivElement>(null);
    const bas = useRef<{ x: number; y: number; id: number; uzun: boolean; kaydi: boolean } | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout>>();
    const tikYut = useRef(false);
    const temizle = () => {
        clearTimeout(timer.current);
        if (bas.current?.uzun) kartMenusunuAyarla(false);
        bas.current = null;
        setAcik(false);
        setHedef(null);
    };
    useEffect(() => () => {
        clearTimeout(timer.current);
        if (bas.current?.uzun) kartMenusunuAyarla(false);
    }, []);
    const bul = (x: number, y: number) => {
        const dugmeler = kap.current?.querySelectorAll<HTMLButtonElement>('[data-kart-eylem]');
        const liste = Array.from(dugmeler ?? []);
        const ustunde = liste.find(d => {
            const r = d.getBoundingClientRect();
            return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
        });
        if (ustunde) return ustunde;
        // Bırakılan nokta düğmenin hemen yanındaysa da o düğme seçilir; parmakla
        // küçük bir hedefi tam tutturmak zor, kaydırıp bırakma bu yüzden kaçıyordu.
        let enYakin: HTMLButtonElement | undefined;
        let enKisa = DUGME_YAKINLIK_ESIGI;
        for (const d of liste) {
            const r = d.getBoundingClientRect();
            const dx = Math.max(r.left - x, 0, x - r.right);
            const dy = Math.max(r.top - y, 0, y - r.bottom);
            const uzaklik = Math.hypot(dx, dy);
            if (uzaklik < enKisa) { enKisa = uzaklik; enYakin = d; }
        }
        return enYakin;
    };
    return {
        kap, acik, hedef,
        klavyeAc() {
            kartMenusunuAyarla(true);
            bas.current = { x: 0, y: 0, id: -1, uzun: true, kaydi: false };
            setAcik(true);
            requestAnimationFrame(() => kap.current?.querySelector<HTMLButtonElement>('[data-kart-eylem="editor"]')?.focus());
        },
        kapat: temizle,
        events: {
            onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
                if ((e.target as Element).closest('button, [data-agac-tasima="1"]') || e.button !== 0) return;
                if (!e.isPrimary || kartMenusuAcikMi()) { temizle(); return; }
                tikYut.current = false;
                bas.current = { x: e.clientX, y: e.clientY, id: e.pointerId, uzun: false, kaydi: false };
                const el = e.currentTarget;
                // Parmak kartın içindeki bir yazıya denk gelirse tarayıcı örtük
                // yakalamayı o alt öğeye veriyor; alt öğe yakalamayı bıraktığında
                // React'in lostpointercapture'ı uzun basmayı yarıda kesiyordu.
                // Yakalamayı hemen kartın kendisine alıyoruz.
                try { el.setPointerCapture(e.pointerId); } catch { /* yok sayılır */ }
                timer.current = setTimeout(() => {
                    if (!bas.current || bas.current.kaydi) return;
                    bas.current.uzun = true;
                    kartMenusunuAyarla(true);
                    setAcik(true);
                }, 320);
            },
            onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
                const b = bas.current;
                if (!b || b.id !== e.pointerId) return;
                if (!b.uzun && Math.hypot(e.clientX - b.x, e.clientY - b.y) > KART_BASILI_TUT_KAYMA_ESIGI) {
                    b.kaydi = true;
                    clearTimeout(timer.current);
                }
                if (b.uzun) {
                    e.stopPropagation();
                    setHedef(bul(e.clientX, e.clientY)?.dataset.kartEylem ?? null);
                }
            },
            onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
                const b = bas.current;
                if (!b || b.id !== e.pointerId) return;
                tikYut.current = true;
                const secim = b.uzun ? bul(e.clientX, e.clientY) : undefined;
                temizle();
                if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
                if (b.uzun) { e.stopPropagation(); secim?.click(); }
                else if (!b.kaydi) onTap();
            },
            onPointerCancel() { tikYut.current = true; temizle(); },
            // Tarayıcı, parmak hafifçe oynadığında alt öğedeki örtük yakalamayı
            // bırakabiliyor. Menü henüz açılmadıysa bu, basılı tutmayı bitirmemeli;
            // parmağın kalkışı zaten onPointerUp/onPointerCancel ile gelir.
            onLostPointerCapture() { if (bas.current?.uzun) temizle(); },
            onContextMenu(e: React.MouseEvent) { e.preventDefault(); },
            onClick(e: React.MouseEvent) {
                e.stopPropagation();
                if (tikYut.current) { tikYut.current = false; return; }
                onTap();
            }
        }
    };
}
