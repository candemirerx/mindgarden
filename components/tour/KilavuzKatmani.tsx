'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Check, Lightbulb, X } from 'lucide-react';
import {
    GOREV_OLAYI,
    GOSTER_OLAYI,
    ILERLEME_OLAYI,
    bekleyenGoster,
    gorevYuruyor,
    ogrenmeOturumuAcik,
    type IlerlemeOlayi,
    type KilavuzGoster,
} from '@/lib/kilavuzIlerleme';

/**
 * Kılavuzun uygulama genelindeki katmanı (her ekranda, kök bileşende çalışır):
 *
 * 1. "Bana göster" vurgusu: kılavuzdan gelen istekte hedef öğe ekranda
 *    belirince çevresi karartılır ve yanında kısa bir açıklama kartı çıkar.
 *    Karartma dokunmaları engellemez: kullanıcı vurgulanan öğeye doğrudan
 *    dokunabilir, dokununca vurgu kapanır. Hedef birkaç saniyede bulunamazsa
 *    açıklama ekranın ortasında gösterilir.
 *    Uygulamalı görev (GorevRehberi) başlarsa vurgu kapanır.
 * 2. "Ders tamamlandı" bildirimi: kullanıcı bir işi uygulamada yaptığı için
 *    ders kendiliğinden tamamlandığında altta kısa bir bildirim belirir.
 *    Gündelik kullanımda araya girmesin diye yalnız öğrenme oturumunda
 *    (kılavuzu açtıktan sonraki birkaç dakika) ve yalnız kullanıcının kendi
 *    dokunuşuyla olan işlerde çıkar; açılıştaki eşitleme ya da arka plandaki
 *    bağlantı denetimi gibi kendiliğinden işler dersi sessizce tamamlar.
 */

export const KILAVUZ_ACILDI_ANAHTARI = 'nb-kilavuz-acildi';
const HEDEF_BEKLEME_MS = 6000;

type Kutu = { x: number; y: number; w: number; h: number };

/** Kullanıcının son dokunuşu ya da tuşu: bu süre içinde biten iş kullanıcının işidir. */
const KULLANICI_ISI_MS = 4000;

export default function KilavuzKatmani() {
    const pathname = usePathname();
    const [istek, setIstek] = useState<KilavuzGoster | null>(null);
    const [kutu, setKutu] = useState<Kutu | null>(null);
    const [hedefYok, setHedefYok] = useState(false);
    const [bildirim, setBildirim] = useState<{ id: string; baslik: string } | null>(null);
    const gosterildigiYol = useRef<string | null>(null);
    // Portal yalnız tarayıcıda, ilk çizimden sonra açılır (sunucu HTML'i ile uyuşmazlık olmasın).
    const [hazir, setHazir] = useState(false);
    useEffect(() => setHazir(true), []);

    const kapat = useCallback(() => {
        setIstek(null);
        setKutu(null);
        setHedefYok(false);
        gosterildigiYol.current = null;
    }, []);

    // İstek: kılavuzdan olay olarak gelir; tam sayfa yenilemesinde oturum deposundan okunur.
    useEffect(() => {
        const ilk = bekleyenGoster();
        if (ilk) setIstek(ilk);
        const dinle = (e: Event) => {
            bekleyenGoster();
            setKutu(null);
            setHedefYok(false);
            gosterildigiYol.current = null;
            setIstek((e as CustomEvent<KilavuzGoster>).detail);
        };
        window.addEventListener(GOSTER_OLAYI, dinle);
        // Uygulamalı görev başlarsa vurgu kapanır; görev rehberi kendi vurgusunu çizer.
        const gorevGeldi = (e: Event) => { if ((e as CustomEvent<unknown>).detail) kapat(); };
        window.addEventListener(GOREV_OLAYI, gorevGeldi);
        return () => {
            window.removeEventListener(GOSTER_OLAYI, dinle);
            window.removeEventListener(GOREV_OLAYI, gorevGeldi);
        };
    }, [kapat]);

    // Hedefi bekle, bulununca izle (konum değişir: kaydırma, yükleme, yeniden boyutlama).
    useLayoutEffect(() => {
        if (!istek) return;
        const baslangic = Date.now();
        let kaydirildi = false;
        const olc = () => {
            const el = document.querySelector(istek.hedef);
            const r = el?.getBoundingClientRect();
            if (!el || !r || (r.width === 0 && r.height === 0)) {
                if (Date.now() - baslangic > HEDEF_BEKLEME_MS) setHedefYok(true);
                setKutu(null);
                return;
            }
            if (!kaydirildi) {
                kaydirildi = true;
                el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                gosterildigiYol.current = window.location.pathname;
            }
            setHedefYok(false);
            setKutu({ x: r.left, y: r.top, w: r.width, h: r.height });
        };
        olc();
        const aralik = window.setInterval(olc, 200);
        window.addEventListener('resize', olc);
        window.addEventListener('scroll', olc, true);
        return () => {
            window.clearInterval(aralik);
            window.removeEventListener('resize', olc);
            window.removeEventListener('scroll', olc, true);
        };
    }, [istek]);

    // Vurgulanan öğeye dokunmak ya da Escape (Android geri) vurguyu kapatır.
    useEffect(() => {
        if (!istek) return;
        const dokunus = (e: PointerEvent) => {
            const el = document.querySelector(istek.hedef);
            if (el && e.target instanceof Node && el.contains(e.target)) window.setTimeout(kapat, 0);
        };
        const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); kapat(); } };
        document.addEventListener('pointerdown', dokunus, true);
        document.addEventListener('keydown', tus, true);
        return () => {
            document.removeEventListener('pointerdown', dokunus, true);
            document.removeEventListener('keydown', tus, true);
        };
    }, [istek, kapat]);

    // Vurgu gösterildikten sonra başka ekrana geçilirse kapanır.
    useEffect(() => {
        if (gosterildigiYol.current && gosterildigiYol.current !== window.location.pathname) kapat();
    }, [pathname, kapat]);

    // Kendiliğinden tamamlanan ders için kısa bildirim.
    useEffect(() => {
        let zaman: number | undefined;
        let sonEtkilesim = 0;
        const etkilesim = () => { sonEtkilesim = Date.now(); };
        document.addEventListener('pointerdown', etkilesim, true);
        document.addEventListener('keydown', etkilesim, true);
        const dinle = (e: Event) => {
            const { id, tamam, otomatik } = (e as CustomEvent<IlerlemeOlayi>).detail;
            // Görev yürürken bildirim görev kartıyla çakışmasın; görev zaten adım adım ilerliyor.
            if (!tamam || !otomatik || gorevYuruyor() || !ogrenmeOturumuAcik() || Date.now() - sonEtkilesim > KULLANICI_ISI_MS) return;
            // Ders metinleri büyük; her sayfanın paketine girmesin diye yalnız gerektiğinde yüklenir.
            void import('@/lib/kilavuzIcerik').then(({ TUM_DERSLER }) => {
                const ders = TUM_DERSLER.find((d) => d.id === id);
                if (!ders) return;
                setBildirim({ id, baslik: ders.title });
                window.clearTimeout(zaman);
                zaman = window.setTimeout(() => setBildirim(null), 4000);
            });
        };
        window.addEventListener(ILERLEME_OLAYI, dinle);
        return () => {
            window.removeEventListener(ILERLEME_OLAYI, dinle);
            document.removeEventListener('pointerdown', etkilesim, true);
            document.removeEventListener('keydown', etkilesim, true);
            window.clearTimeout(zaman);
        };
    }, []);

    if (!hazir) return null;

    const bildirimKatmani = bildirim && (
        <div
            role="status"
            className="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] z-[460] mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-moss-300 bg-white px-4 py-3 shadow-lift"
        >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-moss-600 text-white"><Check size={16} aria-hidden="true" /></span>
            <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-moss-700">Ders tamamlandı</span>
                <span className="block truncate text-sm font-semibold text-sand-900">{bildirim.baslik}</span>
            </span>
        </div>
    );

    const vurguGorunur = istek && (kutu || hedefYok);
    let vurguKatmani = null;
    if (istek && vurguGorunur) {
        const pay = 6;
        const vh = window.innerHeight;
        const altta = kutu ? kutu.y + kutu.h / 2 < vh / 2 : false;
        const kartStil: CSSProperties = kutu
            ? altta
                ? { top: Math.min(kutu.y + kutu.h + pay + 12, vh - 200) }
                : { bottom: Math.min(vh - kutu.y + pay + 12, vh - 200) }
            : { top: '50%', transform: 'translateY(-50%)' };
        vurguKatmani = (
            <div className="pointer-events-none fixed inset-0 z-[450]">
                {kutu ? (
                    <>
                        {/* Karartma sabit kalır; yalnız çerçeve nabız gibi atar (hareketi azalt açıksa durur). */}
                        <div
                            aria-hidden="true"
                            className="absolute rounded-2xl transition-all duration-200"
                            style={{ left: kutu.x - pay, top: kutu.y - pay, width: kutu.w + pay * 2, height: kutu.h + pay * 2, boxShadow: '0 0 0 9999px rgba(28,25,20,.55)' }}
                        />
                        <div
                            aria-hidden="true"
                            className="absolute rounded-2xl ring-[3px] ring-clay-400 transition-all duration-200 motion-safe:animate-pulse"
                            style={{ left: kutu.x - pay, top: kutu.y - pay, width: kutu.w + pay * 2, height: kutu.h + pay * 2 }}
                        />
                    </>
                ) : (
                    <div aria-hidden="true" className="absolute inset-0" style={{ background: 'rgba(28,25,20,.55)' }} />
                )}
                <div
                    role="dialog"
                    aria-live="polite"
                    aria-label={istek.baslik}
                    className="pointer-events-auto absolute inset-x-3 mx-auto max-w-sm rounded-2xl bg-white p-4 shadow-lift"
                    style={kartStil}
                >
                    <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-moss-100 text-moss-700"><Lightbulb size={18} aria-hidden="true" /></span>
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sand-900">{istek.baslik}</p>
                            <p className="mt-1 text-sm leading-relaxed text-sand-700">{istek.metin}</p>
                            {hedefYok && <p className="mt-1.5 text-xs text-sand-600">Bu öğe şu an ekranda yok; önce bu ekranda biraz içerik oluşturmanız gerekebilir.</p>}
                        </div>
                        <button type="button" onClick={kapat} aria-label="Kapat" className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sand-600 hover:bg-sand-100"><X size={17} aria-hidden="true" /></button>
                    </div>
                    <button type="button" onClick={kapat} className="mt-3 min-h-11 w-full rounded-xl bg-moss-700 px-3 text-sm font-semibold text-white hover:bg-moss-800">Anladım</button>
                </div>
            </div>
        );
    }

    return createPortal(<>{vurguKatmani}{bildirimKatmani}</>, document.body);
}
