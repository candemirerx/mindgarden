'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { KART_BASILI_TUT_KAYMA_ESIGI, kartMenusunuAyarla } from '@/lib/canvasGesture';

/** Tek dokunuş menüyü sabit açar; sonraki uzun basış taşır. İlk uzun basış seçim yapar. */
export function useKartHareketi(disMenu?: () => void) {
    const [acik, setAcik] = useState(false);
    const [hedef, setHedef] = useState<string | null>(null);
    const kap = useRef<HTMLDivElement>(null);
    const sahip = useRef(false);
    const sabit = useRef(false);
    const bas = useRef<{ x: number; y: number; id: number; uzun: boolean; kaydi: boolean; tasima: boolean; ikinci: boolean } | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout>>();
    const tikYut = useRef(false);

    const tasi = useCallback((evre: 'basla' | 'hareket' | 'bitir' | 'iptal', x: number, y: number) =>
        kap.current?.dispatchEvent(new CustomEvent('nb-agac-surukle', { bubbles: true, detail: { evre, x, y } })), []);
    const kapat = useCallback(() => {
        clearTimeout(timer.current);
        if (bas.current?.tasima) tasi('iptal', bas.current.x, bas.current.y);
        bas.current = null;
        sabit.current = false;
        if (sahip.current) { sahip.current = false; kartMenusunuAyarla(false); }
        setAcik(false);
        setHedef(null);
    }, [tasi]);
    const ac = (kalici: boolean) => {
        if (disMenu) { disMenu(); return; }
        // Diğer kartın menüsünü kapat; aynı anda yalnız bir kart sahibi olabilir.
        document.dispatchEvent(new CustomEvent('nb-kart-menu-ac', { detail: kap.current }));
        sahip.current = true;
        sabit.current = kalici;
        kartMenusunuAyarla(true);
        setAcik(true);
    };

    const hariciMenu = Boolean(disMenu);
    useEffect(() => { kapat(); }, [hariciMenu, kapat]);

    useEffect(() => {
        const digeri = (e: Event) => { if ((e as CustomEvent).detail !== kap.current) kapat(); };
        const disari = (e: PointerEvent) => {
            if (sahip.current && e.target instanceof Node && !kap.current?.contains(e.target)) kapat();
        };
        const klavye = (e: KeyboardEvent) => { if (e.key === 'Escape') kapat(); };
        document.addEventListener('nb-kart-menu-ac', digeri);
        document.addEventListener('pointerdown', disari);
        document.addEventListener('keydown', klavye);
        return () => {
            clearTimeout(timer.current);
            if (bas.current?.tasima) tasi('iptal', bas.current.x, bas.current.y);
            if (sahip.current) kartMenusunuAyarla(false);
            document.removeEventListener('nb-kart-menu-ac', digeri);
            document.removeEventListener('pointerdown', disari);
            document.removeEventListener('keydown', klavye);
        };
    }, [kapat, tasi]);

    const bul = (x: number, y: number) => {
        const liste = Array.from(kap.current?.querySelectorAll<HTMLButtonElement>('[data-kart-eylem]') ?? []);
        let enYakin: HTMLButtonElement | undefined;
        let enKisa = 12;
        for (const d of liste) {
            const r = d.getBoundingClientRect();
            const uzaklik = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
            if (uzaklik === 0) return d;
            if (uzaklik < enKisa) { enKisa = uzaklik; enYakin = d; }
        }
        return enYakin;
    };
    return {
        kap, acik, hedef, kapat,
        klavyeAc() {
            ac(true);
            requestAnimationFrame(() => kap.current?.querySelector<HTMLButtonElement>('[data-kart-eylem]')?.focus());
        },
        events: {
            onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
                if ((e.target as Element).closest('button, [data-agac-tasima="1"]') || e.button !== 0 || !e.isPrimary) return;
                tikYut.current = false;
                const b = { x: e.clientX, y: e.clientY, id: e.pointerId, uzun: false, kaydi: false, tasima: false, ikinci: sabit.current };
                bas.current = b;
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* dokunuş bitmiş olabilir */ }
                if (b.ikinci) e.stopPropagation();
                timer.current = setTimeout(() => {
                    if (bas.current !== b || b.kaydi) return;
                    b.uzun = true;
                    if (b.ikinci) {
                        b.tasima = true;
                        setHedef(null);
                        tasi('basla', b.x, b.y);
                    } else if (!hariciMenu) ac(false);
                    else ac(true);
                }, 320);
            },
            onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
                const b = bas.current;
                if (!b || b.id !== e.pointerId) return;
                if (b.tasima) { e.stopPropagation(); tasi('hareket', e.clientX, e.clientY); return; }
                if (!b.uzun && Math.hypot(e.clientX - b.x, e.clientY - b.y) > KART_BASILI_TUT_KAYMA_ESIGI) {
                    b.kaydi = true;
                    clearTimeout(timer.current);
                }
                if (b.ikinci || b.uzun) e.stopPropagation();
                if (b.uzun && !hariciMenu) setHedef(bul(e.clientX, e.clientY)?.dataset.kartEylem ?? null);
            },
            onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
                const b = bas.current;
                if (!b || b.id !== e.pointerId) return;
                tikYut.current = true;
                clearTimeout(timer.current);
                const secim = b.uzun && !b.tasima && !hariciMenu ? bul(e.clientX, e.clientY) : undefined;
                bas.current = null;
                if (b.tasima) { e.stopPropagation(); tasi('bitir', e.clientX, e.clientY); kapat(); }
                else if (b.uzun) {
                    e.stopPropagation();
                    // Düğme kaldırılmadan işlevi çalıştır; React tıklaması menüyü kapatır.
                    if (!hariciMenu) { secim?.click(); kapat(); }
                } else if (!b.kaydi) { e.stopPropagation(); ac(true); }
                if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
            },
            onPointerCancel() { tikYut.current = true; kapat(); },
            // Alt öğeden gelen capture kaybı hareketi iptal etmez.
            onLostPointerCapture(e: React.PointerEvent<HTMLDivElement>) {
                if (e.target === e.currentTarget && bas.current) { tikYut.current = true; kapat(); }
            },
            onContextMenu(e: React.MouseEvent) { e.preventDefault(); },
            onClick(e: React.MouseEvent) {
                e.stopPropagation();
                if (tikYut.current) { tikYut.current = false; return; }
                ac(true);
            }
        }
    };
}
