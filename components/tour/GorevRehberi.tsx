'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Hand, Hourglass, Loader2, PartyPopper, X } from 'lucide-react';
import { GOREVLER, type GorevAdimi, type GorevEkrani, type KilavuzGorevi } from '@/lib/kilavuzGorevleri';
import {
    EYLEM_OLAYI,
    GOREV_OLAYI,
    GOSTER_OLAYI,
    aktifGorev,
    aktifGorevYaz,
    bahceAdresi,
    bitenGorevler,
    ekranAdi,
    gorevBaslat,
    gorevTamamlandi,
    type AktifGorev,
} from '@/lib/kilavuzIlerleme';
import { hapticTick } from '@/components/mobile/MobileShell';
import { hedefiGoster, tamGorunur } from './hedefiGoster';

/**
 * Uygulamalı öğrenim rehberi: kılavuzdaki görevi gerçek ekranlarda adım adım yürütür.
 *
 * - Her adımda hedef öğe vurgulanır, yanında "Adım 2/5" kartı çıkar.
 * - Karartma dokunmaları engellemez; kullanıcı işi gerçekten yapar ve adım
 *   kendiliğinden ilerler (dokunuş ya da uygulamadan gelen eylem olayı).
 * - Görev oturum deposunda durur: Liste'den editöre geçmek gibi ekran
 *   değişikliklerinde kaldığı adımdan sürer.
 * - Kullanıcı başka ekrana saparsa kart doğru ekrana dönüş yolunu gösterir.
 * - Bitince "Görev tamamlandı" kartı ve sıradaki görev önerisi çıkar.
 * - Kart ekranın görünen kısmına (klavye açıksa onun üstüne) yerleşir; hedefin
 *   üstünde ya da altında kartı sığdıracak yer yoksa tek satırlık şeride küçülür.
 */

type Kutu = { x: number; y: number; w: number; h: number };

/** Hedef bu sürede belirmezse kart yardım metniyle ortada çıkar (menü kapanmış olabilir). */
const HEDEF_BEKLEME_MS = 2500;
/** Ekran geçişi sürerken "yanlış ekran" kartı yanıp sönmesin. */
const EKRAN_GECIS_PAYI_MS = 1200;
/** Geri'de önce kapatılan geçici katmanlar: ad penceresi, açılır menü, kart düğmeleri, ayarlar. */
const ACIK_KATMAN = '[role="dialog"]:not([data-gorev-karti]):not([data-gorev-bitti]), [role="menu"], [data-kart-aktif]';
const GIZLI_ANAHTARI = 'nb-kilavuz-kart-gizli';
/** Kartın hedefi gösteren okunun yarı boyu. */
const OK = 7;
/** Hedef bu sürede bulunamazsa kart, vurgusuz olarak "bekleniyor" durumunda görünür. */
const ARAMA_GOSTER_MS = 450;
const EKRAN_ADLARI: Record<GorevEkrani, string> = { ana: 'Ana ekran', liste: 'Liste', tuval: 'Tuval', editor: 'Editör' };

function kalin(metin: string): ReactNode[] {
    return metin.split('**').map((parca, i) => (i % 2 === 1 ? <strong key={i} className="font-semibold text-sand-900">{parca}</strong> : parca));
}

/** Öğenin görünen alanla kesişip kesişmediği. */
function ekrandaMi(r: DOMRect): boolean {
    const h = window.visualViewport?.height ?? window.innerHeight;
    return r.bottom > 0 && r.right > 0 && r.top < h && r.left < window.innerWidth;
}

/**
 * Sırayla denenen seçicilerden çizilmiş ilk öğe. Bir seçici birden çok öğeye uyuyorsa
 * (ör. tuvaldeki kartlar) tamamen görünen, yoksa kısmen görünen, yoksa ilki seçilir.
 */
function hedefBul(secicler: string[]): Element | null {
    for (const secici of secicler) {
        let kismen: Element | null = null;
        let yedek: Element | null = null;
        for (const el of Array.from(document.querySelectorAll(secici))) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;
            if (tamGorunur(el)) return el;
            if (ekrandaMi(r)) kismen ??= el;
            yedek ??= el;
        }
        if (kismen || yedek) return kismen ?? yedek;
    }
    return null;
}

/** Adımın ekranında değilken gösterilen yönlendirme: nereye dokunulacağı ya da hangi düğmeyle gidileceği. */
function yonlendirme(adim: GorevAdimi, ekran: string): { hedef?: string; metin: string; git?: string } {
    if (ekran === 'ana' && (adim.ekran === 'liste' || adim.ekran === 'tuval')) {
        return document.querySelector('[data-kilavuz="bahce-gorunumleri"]')
            ? { hedef: '[data-kilavuz="bahce-gorunumleri"]', metin: `Bu adım bir bahçenin içinde yapılır. Bir bahçenin **${EKRAN_ADLARI[adim.ekran]}** düğmesine dokunun.` }
            : { hedef: '[data-tur="yeni-bahce"]', metin: 'Bu görev için bir bahçe gerekiyor. Önce **Yeni Bahçe** ile bir tane oluşturun.' };
    }
    if (adim.ekran === 'liste' || adim.ekran === 'tuval') {
        const adres = bahceAdresi(adim.ekran);
        if (adres) return { metin: `Bu adım **${EKRAN_ADLARI[adim.ekran]}** ekranında yapılır.`, git: adres };
    }
    if (adim.ekran === 'ana') return { metin: 'Bu adım **ana ekranda** yapılır.', git: '/' };
    return { metin: `Bu adım **${EKRAN_ADLARI[adim.ekran]}** ekranında yapılır. Oraya dönün ya da görevi bırakın.` };
}

export default function GorevRehberi() {
    const router = useRouter();
    const pathname = usePathname();
    const [aktif, setAktif] = useState<AktifGorev | null>(null);
    const [biten, setBiten] = useState<KilavuzGorevi | null>(null);
    const [ekran, setEkran] = useState<string>('diger');
    const [ekranOturdu, setEkranOturdu] = useState(false);
    const [kutu, setKutu] = useState<Kutu | null>(null);
    const [hedefYok, setHedefYok] = useState(false);
    const [hazir, setHazir] = useState(false);
    const hedefRef = useRef<Element | null>(null);
    // Tam kartın ölçülen yüksekliği (metin uzunluğuna göre değişir); yerleşim bununla hesaplanır.
    const kartRef = useRef<HTMLDivElement | null>(null);
    const [kartYuk, setKartYuk] = useState(230);
    // Son ilerlemenin zamanı: kartta kısa bir "tamam" işareti gösterilir.
    const [tamamIsareti, setTamamIsareti] = useState(0);
    const [araniyor, setAraniyor] = useState(false);
    // Kullanıcı bilgi kartını gizleyebilir: kart, adım numarası ve başlığıyla tek satırlık
    // şeride iner; tercih görev boyunca (sonraki adımlarda da) korunur.
    const [gizli, setGizli] = useState(false);
    const gizliYaz = useCallback((deger: boolean) => {
        setGizli(deger);
        try { if (deger) sessionStorage.setItem(GIZLI_ANAHTARI, '1'); else sessionStorage.removeItem(GIZLI_ANAHTARI); } catch { /* yalnız bu ekranda geçerli kalır */ }
    }, []);
    useEffect(() => { try { setGizli(sessionStorage.getItem(GIZLI_ANAHTARI) === '1'); } catch { /* varsayılan: açık */ } }, []);
    // Ekranın görünen kısmı: telefon klavyesi açılınca küçülür (visualViewport).
    // Android uygulaması adjustResize kullanır: klavye açılınca tüm sayfa (innerHeight) küçülür,
    // tarayıcıda ise yalnız visualViewport. Klavye, aynı genişlikte görülen en büyük yüksekliğe
    // göre belirgin küçülmeyle anlaşılır.
    // Uç uca çizimde (Android 15) sayfa durum ve gezinme çubuklarının altına uzanır; kart
    // güvenli alanın (safe-area-inset) içinde kalır, düğmeleri sistem çubuğunun altına girmez.
    const [gorunen, setGorunen] = useState<{ ust: number; yukseklik: number; klavye: boolean } | null>(null);
    useEffect(() => {
        const vv = window.visualViewport;
        const olcu = document.createElement('div');
        olcu.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';
        document.body.appendChild(olcu);
        let genislik = 0;
        let enBuyuk = 0;
        const olc = () => {
            const stil = getComputedStyle(olcu);
            const guvenliUst = parseFloat(stil.paddingTop) || 0;
            const guvenliAlt = parseFloat(stil.paddingBottom) || 0;
            const vvUst = vv?.offsetTop ?? 0;
            const vvYuk = vv?.height ?? window.innerHeight;
            if (window.innerWidth !== genislik) { genislik = window.innerWidth; enBuyuk = 0; }
            enBuyuk = Math.max(enBuyuk, window.innerHeight, vvYuk);
            const klavye = vvYuk < enBuyuk * 0.8;
            // Klavye açıkken alt sınır klavyenin üstüdür; kapalıyken gezinme çubuğunun üstü.
            const ust = Math.max(vvUst, guvenliUst);
            const yukseklik = vvUst + vvYuk - (klavye ? 0 : guvenliAlt) - ust;
            setGorunen((g) => (g && g.ust === ust && g.yukseklik === yukseklik && g.klavye === klavye ? g : { ust, yukseklik, klavye }));
        };
        olc();
        vv?.addEventListener('resize', olc);
        vv?.addEventListener('scroll', olc);
        window.addEventListener('resize', olc);
        return () => { vv?.removeEventListener('resize', olc); vv?.removeEventListener('scroll', olc); window.removeEventListener('resize', olc); olcu.remove(); };
    }, []);

    const gorev = aktif ? GOREVLER.find((g) => g.id === aktif.id) : undefined;
    const adim = gorev?.adimlar[aktif!.adim];
    const yanlisEkran = !!adim && adim.ekran !== ekran;
    const yon = adim && yanlisEkran && ekranOturdu ? yonlendirme(adim, ekran) : null;
    const hedefler = yon ? (yon.hedef ? [yon.hedef] : []) : adim?.hedef ?? [];
    const hedefAnahtari = hedefler.join('|') + '#' + (aktif?.id ?? '') + (aktif?.adim ?? '');

    useEffect(() => {
        setHazir(true);
        setAktif(aktifGorev());
        const dinle = (e: Event) => {
            const yeni = (e as CustomEvent<AktifGorev | null>).detail;
            if (!yeni || yeni.adim === 0) { setGizli(false); try { sessionStorage.removeItem(GIZLI_ANAHTARI); } catch { /* sessiz */ } }
            setAktif(yeni);
            setBiten(null);
        };
        // "Bana göster" vurgusu açılırsa görev bırakılır; iki katman üst üste binmesin.
        const gosterGeldi = () => { if (aktifGorev()) aktifGorevYaz(null); };
        window.addEventListener(GOREV_OLAYI, dinle);
        window.addEventListener(GOSTER_OLAYI, gosterGeldi);
        return () => {
            window.removeEventListener(GOREV_OLAYI, dinle);
            window.removeEventListener(GOSTER_OLAYI, gosterGeldi);
        };
    }, []);

    // Ekran değişince kısa bir süre bekle: geçiş sırasında yanlış ekran kartı yanıp sönmesin.
    useEffect(() => {
        setEkran(ekranAdi());
        setEkranOturdu(false);
        const t = window.setTimeout(() => setEkranOturdu(true), EKRAN_GECIS_PAYI_MS);
        return () => window.clearTimeout(t);
    }, [pathname]);

    const ilerle = useCallback(() => {
        const simdiki = aktifGorev();
        const g = simdiki && GOREVLER.find((x) => x.id === simdiki.id);
        if (!simdiki || !g) return;
        void hapticTick();
        if (simdiki.adim + 1 < g.adimlar.length) {
            setTamamIsareti(Date.now());
            aktifGorevYaz({ id: g.id, adim: simdiki.adim + 1 });
            return;
        }
        gorevTamamlandi(g.id);
        aktifGorevYaz(null);
        setBiten(g);
    }, []);

    const birak = useCallback(() => aktifGorevYaz(null), []);

    // Geri: önce açık pencere ya da menü kapanır (görevi bitirmeyen işaretli Escape), sonra
    // yapılabilir ilk önceki adıma dönülür. Hedefi artık ekranda olmayan adımlar (kapanan
    // menünün öğesi, ad penceresi) atlanır; kullanıcı o işi baştan, açan düğmeden yapar.
    const geri = useCallback(() => {
        const simdiki = aktifGorev();
        const g = simdiki && GOREVLER.find((x) => x.id === simdiki.id);
        if (!simdiki || !g || simdiki.adim === 0) return;
        if (document.querySelector(ACIK_KATMAN)) {
            const esc = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true });
            (esc as KeyboardEvent & { nbGorevGeri?: boolean }).nbGorevGeri = true;
            document.dispatchEvent(esc);
        }
        window.setTimeout(() => {
            const ekr = ekranAdi();
            let i = simdiki.adim - 1;
            while (i > 0) {
                const a = g.adimlar[i];
                if (a.ekran !== ekr || !a.hedef || hedefBul(a.hedef)) break;
                i--;
            }
            aktifGorevYaz({ id: g.id, adim: i });
        }, 250);
    }, []);

    // Android geri tuşu ve Escape görevi bitirir; ekran değiştirmez, açık pencereyi kapatmaz.
    // (MobileShell ve ayarlar penceresi data-gorev-karti / data-ust-katman varken geri tuşuna karışmaz.)
    const gorevAcik = !!aktif || !!biten;
    useEffect(() => {
        if (!gorevAcik) return;
        const bitir = () => { aktifGorevYaz(null); setBiten(null); };
        const tus = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || (e as KeyboardEvent & { nbGorevGeri?: boolean }).nbGorevGeri) return;
            e.stopImmediatePropagation();
            bitir();
        };
        document.addEventListener('keydown', tus, true);
        let kaldir: (() => void) | null = null;
        let iptal = false;
        if (Capacitor.isNativePlatform()) {
            void import('@capacitor/app').then(async ({ App }) => {
                const d = await App.addListener('backButton', bitir);
                if (iptal) void d.remove(); else kaldir = () => { void d.remove(); };
            }).catch(() => { /* @capacitor/app yoksa Escape yeter */ });
        }
        return () => {
            iptal = true;
            document.removeEventListener('keydown', tus, true);
            kaldir?.();
        };
    }, [gorevAcik]);

    // Hedefi bekle, bulununca izle (kaydırma, açılan menü, klavye konumu değiştirir).
    useLayoutEffect(() => {
        setKutu(null);
        setHedefYok(false);
        hedefRef.current = null;
        if (!aktif || hedefler.length === 0) return;
        const baslangic = Date.now();
        let kaydirma = 0;
        let disaridaSince = 0;
        const olc = () => {
            const el = hedefBul(hedefler);
            hedefRef.current = el;
            if (!el) {
                if (Date.now() - baslangic > HEDEF_BEKLEME_MS) setHedefYok(true);
                setKutu(null);
                return;
            }
            setHedefYok(false);
            const r = el.getBoundingClientRect();
            // İlk bulunuşta ve hedef bir saniyeden uzun tam görünmezse (ör. liste yeniden dizildi,
            // klavye açıldı, tuval yeni nota kaydı) görünür yere getir; kullanıcıyla inatlaşmamak için en çok 3 kez.
            const disarida = !tamGorunur(el);
            if (!disarida) disaridaSince = 0;
            else if (!disaridaSince) disaridaSince = Date.now();
            if (kaydirma === 0 || (disarida && kaydirma < 3 && Date.now() - disaridaSince > 1000)) {
                kaydirma++;
                disaridaSince = 0;
                hedefiGoster(el, kaydirma === 1);
            }
            setKutu((k) => (k && k.x === r.left && k.y === r.top && k.w === r.width && k.h === r.height ? k : { x: r.left, y: r.top, w: r.width, h: r.height }));
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
        // hedefAnahtari seçicileri ve adımı birlikte temsil eder.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hedefAnahtari]);

    // Geçiş: vurgulanan öğeye dokunuş ya da uygulamadan gelen eylem.
    useEffect(() => {
        if (!adim || yon) return;
        const gecis = adim.gecis;
        if (gecis === 'dokun') {
            // Tıklama (parmak kaymadan kalktı) sayılır; kayan dokunuş adımı ilerletmez.
            // Hedef yeniden çizilmiş olabilir (eski öğe DOM'dan düşer): dokunulan öğe
            // seçicilerle de eşleştirilir.
            const dokunus = (e: MouseEvent) => {
                if (!(e.target instanceof Element)) return;
                const t = e.target;
                const el = hedefRef.current;
                const isabet = (el && el.isConnected && el.contains(t)) || (adim.hedef ?? []).some((s) => t.closest(s));
                if (isabet) window.setTimeout(ilerle, 0);
            };
            document.addEventListener('click', dokunus, true);
            return () => document.removeEventListener('click', dokunus, true);
        }
        if (typeof gecis === 'object' && 'gorunce' in gecis) {
            // Dokunuşun sonucu (menü, pencere, kart düğmeleri) iki ölçümde üst üste görününce ilerler.
            let ardisik = 0;
            const t = window.setInterval(() => {
                ardisik = hedefBul([gecis.gorunce]) ? ardisik + 1 : 0;
                if (ardisik >= 2) { window.clearInterval(t); ilerle(); }
            }, 150);
            return () => window.clearInterval(t);
        }
        if (typeof gecis === 'object') {
            const eylem = (e: Event) => { if ((e as CustomEvent<{ id: string }>).detail.id === gecis.eylem) ilerle(); };
            window.addEventListener(EYLEM_OLAYI, eylem);
            return () => window.removeEventListener(EYLEM_OLAYI, eylem);
        }
    }, [adim, yon, ilerle]);

    // Her çizimden sonra ölçülür (metin adımla değişir); 4 px eşiği döngüyü önler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useLayoutEffect(() => {
        const el = kartRef.current;
        if (!el || el.hasAttribute('data-gorev-kucuk')) return;
        const h = el.offsetHeight;
        if (Math.abs(h - kartYuk) > 4) setKartYuk(h);
    });

    // Hedef birkaç yüz milisaniyede bulunamazsa (pencere açılıyor, ekran değişiyor) kart
    // vurgusuz görünür; kullanıcı rehberin kaybolduğunu sanmaz.
    const hedefBekleniyor = !!aktif && hedefler.length > 0 && !kutu && !hedefYok;
    useEffect(() => {
        if (!hedefBekleniyor) { setAraniyor(false); return; }
        const t = window.setTimeout(() => setAraniyor(true), ARAMA_GOSTER_MS);
        return () => window.clearTimeout(t);
    }, [hedefBekleniyor, hedefAnahtari]);

    useEffect(() => {
        if (!tamamIsareti) return;
        const t = window.setTimeout(() => setTamamIsareti(0), 1100);
        return () => window.clearTimeout(t);
    }, [tamamIsareti]);

    if (!hazir) return null;

    if (biten) {
        const bitenler = bitenGorevler();
        const sonraki = GOREVLER.find((g) => !bitenler.includes(g.id));
        return createPortal(
            <div role="dialog" aria-modal="false" aria-labelledby="gorev-bitti-baslik" data-gorev-bitti="" data-ust-katman="" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] z-[460] mx-auto max-w-md rounded-3xl border border-moss-200 bg-white p-5 shadow-lift">
                <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-moss-600 text-white"><PartyPopper size={21} aria-hidden="true" /></span>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-moss-700">Görev tamamlandı</p>
                        <h2 id="gorev-bitti-baslik" className="text-lg font-semibold leading-snug text-sand-900">{biten.baslik}</h2>
                    </div>
                    <button type="button" onClick={() => setBiten(null)} aria-label="Kapat" className="-mr-1 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sand-600 hover:bg-sand-100"><X size={18} aria-hidden="true" /></button>
                </div>
                <ul className="mt-3 space-y-1.5">
                    {biten.kazanimlar.map((k) => (
                        <li key={k} className="flex gap-2 text-sm leading-relaxed text-sand-700">
                            <Check size={16} className="mt-0.5 shrink-0 text-moss-600" aria-hidden="true" />{k}
                        </li>
                    ))}
                </ul>
                <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => setBiten(null)} className="min-h-11 rounded-xl border border-sand-300 px-4 text-sm font-semibold text-sand-800 hover:bg-sand-50">Kapat</button>
                    {sonraki && (
                        <button
                            type="button"
                            onClick={() => router.push(gorevBaslat(sonraki.id, sonraki.baslangic))}
                            className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-moss-700 px-3 text-sm font-semibold text-white hover:bg-moss-800"
                        >
                            <span className="truncate">Sıradaki: {sonraki.baslik}</span><ArrowRight size={16} aria-hidden="true" className="shrink-0" />
                        </button>
                    )}
                </div>
            </div>,
            document.body
        );
    }

    if (!gorev || !adim) return null;
    // Ekran geçişi sürüyor: hedef yeni ekranda belirene kadar bekle.
    if (yanlisEkran && !ekranOturdu) return null;
    // Hedef aranıyor: kısa beklemede önceki görüntü kalır, uzarsa kart vurgusuz çıkar.
    if (hedefBekleniyor && !araniyor) return null;

    const toplam = gorev.adimlar.length;
    const sira = aktif!.adim;
    const pay = 6;
    const KART = kartYuk;
    const SERIT = 56;
    // Görünen alan: klavye açıksa ekranın yalnız klavye üstündeki kısmı.
    const gorunenUst = gorunen?.ust ?? 0;
    const gorunenAlt = gorunenUst + (gorunen?.yukseklik ?? window.innerHeight);
    const klavyeAcik = !!gorunen?.klavye;
    let kucuk = false;
    let kartStil: CSSProperties = { top: (gorunenUst + gorunenAlt) / 2, transform: 'translateY(-50%)' };
    // Vurgu çerçevesi: hedef ± pay, görünen alanın içine kırpılır (köşedeki düğmede taşmasın).
    let vurgu = kutu && {
        sol: Math.max(2, kutu.x - pay),
        ust: Math.max(gorunenUst + 2, kutu.y - pay),
        sag: Math.min(window.innerWidth - 2, kutu.x + kutu.w + pay),
        alt: Math.min(gorunenAlt - 2, kutu.y + kutu.h + pay),
    };
    // Kart hedefin hemen altında ya da üstündeyse bir okla hedefe bağlanır.
    let ok: { y: number; yon: 'yukari' | 'asagi' } | null = null;
    if (kutu && vurgu && gizli) {
        // Gizlenmiş kart: hedefi örtmeyen tek satırlık şerit, sığan tarafta.
        const ustBosluk = kutu.y - pay - gorunenUst;
        const altBosluk = gorunenAlt - (kutu.y + kutu.h + pay);
        kucuk = true;
        if (altBosluk >= SERIT + 14) { kartStil = { top: kutu.y + kutu.h + pay + 12 }; ok = { y: kutu.y + kutu.h + pay + 12, yon: 'yukari' }; }
        else if (ustBosluk >= SERIT + 14) { kartStil = { top: kutu.y - pay - 12 - SERIT }; ok = { y: kutu.y - pay - 12, yon: 'asagi' }; }
        else kartStil = { top: gorunenUst + 8 };
    } else if (kutu && vurgu) {
        const ustBosluk = kutu.y - pay - gorunenUst;
        const altBosluk = gorunenAlt - (kutu.y + kutu.h + pay);
        if (altBosluk >= KART + 14) { kartStil = { top: kutu.y + kutu.h + pay + 12 }; ok = { y: kutu.y + kutu.h + pay + 12, yon: 'yukari' }; }
        else if (ustBosluk >= KART + 14) { kartStil = { bottom: window.innerHeight - (kutu.y - pay - 12) }; ok = { y: kutu.y - pay - 12, yon: 'asagi' }; }
        else if (!klavyeAcik && kutu.h > (gorunenAlt - gorunenUst) * 0.6) {
            // Hedef ekranın çoğunu kaplıyor (ör. editörün yazı alanı): kart görünen alanın
            // altına biner, vurgu kartın üstünde biter; dokunuş kartın altında kalmaz.
            kartStil = { bottom: window.innerHeight - gorunenAlt + 8 };
            vurgu = { ...vurgu, alt: Math.min(vurgu.alt, gorunenAlt - 8 - KART - 6) };
        } else {
            // Kart sığmıyor (ör. ad penceresi, klavye açık): hedefi örtmeyen tek satırlık şerit.
            kucuk = true;
            kartStil = ustBosluk >= SERIT || ustBosluk >= altBosluk
                ? { top: Math.max(gorunenUst + 8, kutu.y - pay - SERIT) }
                : { top: kutu.y + kutu.h + pay + 8 };
            if (ustBosluk < SERIT && altBosluk < SERIT) kartStil = { top: gorunenUst + 8 };
        }
    }
    const metin = yon ? yon.metin : hedefYok && adim.yoksa ? adim.yoksa : adim.metin;
    const gecis = adim.gecis;
    // Hedefsiz eylem adımı (ör. tuvali kaydırın) ve hedef bekleme: ekran karartılmaz,
    // kart alta yerleşir; kullanıcı ekranın tamamını kullanır.
    const serbest = !vurgu && (araniyor || (!yon && hedefler.length === 0 && gecis !== 'ileri'));
    if (serbest) { kartStil = { bottom: window.innerHeight - gorunenAlt + 12 }; kucuk = gizli; ok = null; }
    // Gizli kart hedefsiz adımda da şerittir.
    if (!vurgu && gizli && !kucuk) { kucuk = true; kartStil = { bottom: window.innerHeight - gorunenAlt + 12 }; }
    // Ok, hedefin ortasını gösterir; kartın köşelerine taşmaz.
    const kartGenislik = Math.min(window.innerWidth - 24, 384);
    const kartSol = (window.innerWidth - kartGenislik) / 2;
    const okX = kutu ? Math.min(kartSol + kartGenislik - 22, Math.max(kartSol + 22, kutu.x + kutu.w / 2)) : 0;
    const dokunmaAdimi = gecis === 'dokun' || (typeof gecis === 'object' && 'gorunce' in gecis);
    const ipucu = yon ? null
        : araniyor ? { Ikon: Loader2, metin: 'Ekran hazırlanıyor…', don: true }
            : gecis === 'ileri' ? null
                : dokunmaAdimi && vurgu ? { Ikon: Hand, metin: 'Parlayan yere dokunun', don: false }
                    : { Ikon: Hourglass, metin: 'Yaptığınızda kendiliğinden ilerler', don: false };
    const tamamGoster = tamamIsareti > 0;
    const adimAnahtari = `${aktif!.id}-${sira}-${yon ? 'yon' : 'adim'}`;

    return createPortal(
        <div className="pointer-events-none fixed inset-0 z-[450]">
            {vurgu ? (
                <>
                    <div aria-hidden="true" className="absolute rounded-2xl transition-all duration-300 ease-out" style={{ left: vurgu.sol, top: vurgu.ust, width: vurgu.sag - vurgu.sol, height: Math.max(0, vurgu.alt - vurgu.ust), boxShadow: '0 0 0 9999px rgba(28,25,20,.55)' }} />
                    <div aria-hidden="true" data-gorev-vurgu="" className="gorev-vurgu absolute rounded-2xl transition-all duration-300 ease-out" style={{ left: vurgu.sol, top: vurgu.ust, width: vurgu.sag - vurgu.sol, height: Math.max(0, vurgu.alt - vurgu.ust) }} />
                </>
            ) : !serbest ? (
                <div aria-hidden="true" className="absolute inset-0 transition-opacity" style={{ background: 'rgba(28,25,20,.55)' }} />
            ) : null}
            {ok && (
                <span aria-hidden="true" data-gorev-ok="" className="absolute h-3.5 w-3.5 rotate-45 rounded-[3px] border border-sand-200/70 bg-white transition-all duration-300 ease-out"
                    style={{ left: okX - OK, top: ok.y - OK }} />
            )}
            <div
                role="dialog"
                aria-modal="false"
                aria-live="polite"
                aria-label={`${gorev.baslik}, adım ${sira + 1} / ${toplam}`}
                ref={kartRef}
                data-gorev-karti=""
                data-ust-katman=""
                data-gorev-kucuk={kucuk ? '' : undefined}
                className={'pointer-events-auto absolute inset-x-3 mx-auto max-w-sm overflow-hidden rounded-2xl border border-sand-200/70 bg-white shadow-lift ' + (kucuk ? 'py-2 pl-3.5 pr-1.5' : '')}
                style={kartStil}
            >
                {kucuk ? (
                    <div key={adimAnahtari} className="gorev-adim-gir flex items-center gap-2.5">
                        {sira > 0 && (
                            <button type="button" onClick={geri} aria-label="Geri: önceki adım" className="-ml-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sand-600 hover:bg-sand-100"><ArrowLeft size={17} aria-hidden="true" /></button>
                        )}
                        <span className={'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ' + (tamamGoster ? 'bg-moss-600 text-white' : 'bg-moss-100 text-moss-800')}>
                            {tamamGoster ? <Check size={12} className="inline" aria-hidden="true" /> : null}<span className="sr-only">Adım </span>{sira + 1}/{toplam}
                        </span>
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-sand-900">{yon ? 'Önce doğru ekrana geçin' : adim.baslik}</p>
                        {gizli && (
                            <button type="button" onClick={() => gizliYaz(false)} aria-label="Bilgiyi göster" title="Bilgiyi göster" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-moss-700 hover:bg-moss-50"><ChevronUp size={18} aria-hidden="true" /></button>
                        )}
                        <button type="button" onClick={birak} aria-label="Görevi bırak" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sand-600 hover:bg-sand-100"><X size={17} aria-hidden="true" /></button>
                    </div>
                ) : (<>
                {/* İlerleme şeridi: biten adımlar yeşil, şimdiki adım dolarak ilerler */}
                <div className="flex gap-1 px-4 pt-3.5" aria-hidden="true">
                    {gorev.adimlar.map((_, i) => (
                        <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand-200">
                            <span className={'block h-full rounded-full transition-all duration-500 ease-out ' + (i < sira ? 'w-full bg-moss-600' : i === sira ? 'w-1/2 bg-clay-400' : 'w-0')} />
                        </span>
                    ))}
                </div>
                <div className="flex items-center gap-2 px-4 pt-2.5">
                    <span className={'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors duration-300 ' + (tamamGoster ? 'bg-moss-600 text-white' : 'bg-moss-100 text-moss-800')}>
                        {tamamGoster ? <><Check size={12} aria-hidden="true" />Tamam</> : <>Adım {sira + 1}/{toplam}</>}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-sand-500">{gorev.baslik}</p>
                    <button type="button" onClick={() => gizliYaz(true)} aria-label="Bilgiyi gizle" title="Bilgiyi gizle" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sand-500 hover:bg-sand-100 hover:text-sand-800"><ChevronDown size={18} aria-hidden="true" /></button>
                    <button type="button" onClick={birak} aria-label="Görevi bırak" className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sand-500 hover:bg-sand-100 hover:text-sand-800"><X size={17} aria-hidden="true" /></button>
                </div>
                <div key={adimAnahtari} className="gorev-adim-gir px-4">
                    <p className="mt-1 text-[17px] font-semibold leading-snug text-sand-900">{yon ? 'Önce doğru ekrana geçin' : adim.baslik}</p>
                    <p className="mt-1 text-sm leading-relaxed text-sand-700">{kalin(metin)}</p>
                    {!yon && hedefYok && !adim.yoksa && (
                        <p className="mt-1.5 text-xs text-sand-600">Vurgulanacak öğe şu an ekranda yok. Geri ile bir önceki adıma dönün ya da bu adımı geçin.</p>
                    )}
                    {ipucu && (
                        <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-clay-50 px-2.5 py-1 text-xs font-semibold text-clay-800 ring-1 ring-inset ring-clay-200/70">
                            <ipucu.Ikon size={14} className={'shrink-0 ' + (ipucu.don ? 'animate-spin' : '')} aria-hidden="true" />
                            {ipucu.metin}
                        </p>
                    )}
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-sand-100 bg-sand-50/60 px-3 py-2.5">
                    {sira > 0 ? (
                        <button type="button" onClick={geri} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl px-2.5 text-sm font-semibold text-sand-700 hover:bg-white hover:shadow-soft">
                            <ArrowLeft size={15} aria-hidden="true" />Geri
                        </button>
                    ) : <span />}
                    {yon ? (
                        yon.git ? (
                            <button type="button" onClick={() => router.push(yon.git!)} className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-moss-700 px-4 text-sm font-semibold text-white hover:bg-moss-800">
                                {EKRAN_ADLARI[adim.ekran]} ekranına git <ArrowRight size={16} aria-hidden="true" />
                            </button>
                        ) : null
                    ) : gecis === 'ileri' ? (
                        <button type="button" onClick={ilerle} className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-moss-700 px-4 text-sm font-semibold text-white hover:bg-moss-800">
                            {sira + 1 === toplam ? 'Bitir' : 'İleri'} {sira + 1 < toplam && <ArrowRight size={16} aria-hidden="true" />}
                        </button>
                    ) : (
                        <button type="button" onClick={ilerle} className="ml-auto min-h-10 shrink-0 rounded-xl px-2.5 text-xs font-semibold text-sand-500 hover:bg-white hover:text-sand-800">
                            Adımı geç
                        </button>
                    )}
                </div>
                </>)}
            </div>
        </div>,
        document.body
    );
}
