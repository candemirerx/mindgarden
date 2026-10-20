'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Compass, X } from 'lucide-react';
import {
    BASLANGIC_TURU,
    TUR_ANAHTARI,
    TUR_BASLAT_OLAYI,
    TUR_BEKLIYOR_ANAHTARI,
} from '@/lib/turAdimlari';
import { dersTamamla } from '@/lib/kilavuzIlerleme';
import { KILAVUZ_ACILDI_ANAHTARI } from './KilavuzKatmani';

const TUR_ONERILDI_ANAHTARI = 'nb-tur-onerildi';

/**
 * Başlangıç seviyesi için uygulamalı tur: hedefi vurgulayan karartma + açıklama kartı.
 * - Kılavuzdaki "Hızlı tur" düğmesi ya da ilk açılıştaki öneri başlatır.
 * - İleri / Geri / Atla; Escape ve Android geri tuşu turu kapatır.
 * - Tamamlanınca ya da atlanınca nb-tur-v1 yazılır, öneri bir daha çıkmaz.
 */

type Kutu = { x: number; y: number; w: number; h: number };

function isaretle(durum: 'bitti' | 'atlandi') {
    try { localStorage.setItem(TUR_ANAHTARI, durum); } catch { /* sessiz */ }
}

export default function UygulamaliTur() {
    const [oneri, setOneri] = useState(false);
    const [aktif, setAktif] = useState(false);
    const [sira, setSira] = useState(0);
    const [kutu, setKutu] = useState<Kutu | null>(null);

    const adim = BASLANGIC_TURU[sira];
    const son = sira === BASLANGIC_TURU.length - 1;

    const kapat = useCallback((durum: 'bitti' | 'atlandi') => {
        isaretle(durum);
        // Kılavuz: turu sonuna kadar izleyen kullanıcı ilk dersi uygulamış olur.
        if (durum === 'bitti') dersTamamla('b-fikir');
        setAktif(false);
        setOneri(false);
        setSira(0);
    }, []);

    const baslat = useCallback(() => {
        setOneri(false);
        setSira(0);
        setAktif(true);
    }, []);

    // Kılavuzdan gelen istek (olay ya da ana ekrana dönüşte bekleyen bayrak).
    useEffect(() => {
        const bekleyen = () => {
            try {
                if (localStorage.getItem(TUR_BEKLIYOR_ANAHTARI)) {
                    localStorage.removeItem(TUR_BEKLIYOR_ANAHTARI);
                    window.setTimeout(baslat, 400);
                }
            } catch { /* sessiz */ }
        };
        bekleyen();
        const olay = () => { try { localStorage.removeItem(TUR_BEKLIYOR_ANAHTARI); } catch { /* sessiz */ } window.setTimeout(baslat, 300); };
        window.addEventListener(TUR_BASLAT_OLAYI, olay);
        return () => window.removeEventListener(TUR_BASLAT_OLAYI, olay);
    }, [baslat]);

    // İlk kullanım: henüz bahçesi olmayan, turu ve kılavuzu hiç görmemiş kullanıcıya
    // ömründe bir kez öneri. Gösterildiği an işaretlenir; yanıtsız kalsa da bir daha çıkmaz.
    useEffect(() => {
        let gorulmus = true;
        try {
            gorulmus = !!localStorage.getItem(TUR_ANAHTARI) || !!localStorage.getItem(TUR_BEKLIYOR_ANAHTARI)
                || !!localStorage.getItem(TUR_ONERILDI_ANAHTARI) || !!localStorage.getItem(KILAVUZ_ACILDI_ANAHTARI);
        } catch { /* sessiz */ }
        if (gorulmus) return;
        // Uygulama giriş ekranıyla açılabilir: ana ekran ilk hazır olduğunda (Yeni Bahçe
        // göründüğünde) kısa bir bekleyişle önerilir. Bahçesi olan ya da başka bir pencere
        // açık olan kullanıcıya hiç önerilmez; birkaç dakikada uygun an gelmezse vazgeçilir.
        const baslangic = Date.now();
        let hazirSince = 0;
        const t = window.setInterval(() => {
            if (Date.now() - baslangic > 3 * 60 * 1000) { window.clearInterval(t); return; }
            if (document.querySelector('[data-tur="bahce-karti"]')) { window.clearInterval(t); return; }
            const hazir = !!document.querySelector('[data-tur="yeni-bahce"]') && !document.querySelector('[role="dialog"]');
            if (!hazir) { hazirSince = 0; return; }
            if (!hazirSince) { hazirSince = Date.now(); return; }
            if (Date.now() - hazirSince < 1500) return;
            window.clearInterval(t);
            try { localStorage.setItem(TUR_ONERILDI_ANAHTARI, '1'); } catch { /* sessiz */ }
            setOneri(true);
        }, 300);
        return () => window.clearInterval(t);
    }, []);

    // Hedefin konumunu izle.
    useLayoutEffect(() => {
        if (!aktif || !adim.hedef) { setKutu(null); return; }
        const hedef = adim.hedef;
        const olc = () => {
            const el = document.querySelector(hedef);
            if (!el) { setKutu(null); return; }
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) { setKutu(null); return; }
            setKutu({ x: r.left, y: r.top, w: r.width, h: r.height });
        };
        document.querySelector(hedef)?.scrollIntoView({ block: 'center', behavior: 'auto' });
        olc();
        const aralik = window.setInterval(olc, 250);
        window.addEventListener('resize', olc);
        window.addEventListener('scroll', olc, true);
        return () => {
            window.clearInterval(aralik);
            window.removeEventListener('resize', olc);
            window.removeEventListener('scroll', olc, true);
        };
    }, [aktif, adim]);

    // Escape (Android geri tuşu da bunu üretir) turu ya da öneriyi kapatır.
    useEffect(() => {
        if (!aktif && !oneri) return;
        const tus = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.stopPropagation(); kapat('atlandi'); }
        };
        document.addEventListener('keydown', tus, true);
        return () => document.removeEventListener('keydown', tus, true);
    }, [aktif, oneri, kapat]);

    if (typeof document === 'undefined') return null;

    if (oneri) {
        return createPortal(
            <div role="dialog" aria-modal="true" aria-label="Uygulama turu" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] z-[400] mx-auto max-w-md rounded-2xl border border-moss-200 bg-white p-4 shadow-lift">
                <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-moss-100 text-moss-700"><Compass size={20} aria-hidden="true" /></span>
                    <div className="min-w-0">
                        <p className="font-semibold text-sand-900">Uygulamayı gezelim mi?</p>
                        <p className="mt-0.5 text-sm text-sand-600">Bir dakikadan kısa sürer, istediğiniz an atlayabilirsiniz.</p>
                    </div>
                </div>
                <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => kapat('atlandi')} className="min-h-11 flex-1 rounded-xl border border-sand-300 px-3 text-sm font-semibold text-sand-800">Şimdi değil</button>
                    <button type="button" onClick={baslat} className="min-h-11 flex-1 rounded-xl bg-moss-700 px-3 text-sm font-semibold text-white">Başlayalım</button>
                </div>
            </div>,
            document.body
        );
    }

    if (!aktif) return null;

    const pay = 6;
    const vh = window.innerHeight;
    const altta = kutu ? kutu.y + kutu.h / 2 < vh / 2 : false;
    const kartStil: CSSProperties = kutu
        ? altta
            ? { top: Math.min(kutu.y + kutu.h + pay + 12, vh - 220) }
            : { bottom: Math.min(vh - kutu.y + pay + 12, vh - 220) }
        : { top: '50%', transform: 'translateY(-50%)' };

    return createPortal(
        <div role="dialog" aria-modal="true" aria-label={'Uygulamalı tur: ' + adim.baslik} className="fixed inset-0 z-[400]">
            {/* Dokunmaları engelleyen katman; hedef yoksa tüm ekranı karartır. */}
            <div className="absolute inset-0" style={kutu ? undefined : { background: 'rgba(28,25,20,.6)' }} />
            {kutu && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute rounded-2xl ring-2 ring-moss-300 transition-all duration-200"
                    style={{ left: kutu.x - pay, top: kutu.y - pay, width: kutu.w + pay * 2, height: kutu.h + pay * 2, boxShadow: '0 0 0 9999px rgba(28,25,20,.6)' }}
                />
            )}
            <div className="absolute inset-x-3 mx-auto max-w-md rounded-2xl bg-white p-4 shadow-lift" style={kartStil}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-moss-700">Adım {sira + 1} / {BASLANGIC_TURU.length}</p>
                        <h2 className="mt-0.5 text-lg font-semibold text-sand-900">{adim.baslik}</h2>
                    </div>
                    <button type="button" onClick={() => kapat('atlandi')} aria-label="Turu kapat" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sand-600 hover:bg-sand-100"><X size={18} aria-hidden="true" /></button>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-sand-700">{adim.metin}</p>
                <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden="true">
                    {BASLANGIC_TURU.map((a, i) => (
                        <span key={a.id} className={'h-1.5 rounded-full transition-all ' + (i === sira ? 'w-5 bg-moss-600' : 'w-1.5 bg-sand-300')} />
                    ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                    {sira === 0 ? (
                        <button type="button" onClick={() => kapat('atlandi')} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-sand-600">Atla</button>
                    ) : (
                        <button type="button" onClick={() => setSira((s) => Math.max(0, s - 1))} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-sand-300 px-3 text-sm font-semibold text-sand-800"><ChevronLeft size={16} aria-hidden="true" />Geri</button>
                    )}
                    <button type="button" onClick={() => (son ? kapat('bitti') : setSira((s) => s + 1))} className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-xl bg-moss-700 px-4 text-sm font-semibold text-white">
                        {son ? 'Bitir' : 'İleri'}{!son && <ChevronRight size={16} aria-hidden="true" />}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
