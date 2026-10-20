'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, Check, Hand, Hourglass, PartyPopper, X } from 'lucide-react';
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
const EKRAN_ADLARI: Record<GorevEkrani, string> = { ana: 'Ana ekran', liste: 'Liste', tuval: 'Tuval', editor: 'Editör' };

function kalin(metin: string): ReactNode[] {
    return metin.split('**').map((parca, i) => (i % 2 === 1 ? <strong key={i} className="font-semibold text-sand-900">{parca}</strong> : parca));
}

/** Sırayla denenen seçicilerden ekranda görünen ilk öğe. */
function hedefBul(secicler: string[]): Element | null {
    for (const secici of secicler) {
        const el = document.querySelector(secici);
        const r = el?.getBoundingClientRect();
        if (el && r && (r.width > 0 || r.height > 0)) return el;
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
    // Ekranın görünen kısmı: telefon klavyesi açılınca küçülür (visualViewport).
    const [gorunen, setGorunen] = useState<{ ust: number; yukseklik: number } | null>(null);
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;
        const olc = () => setGorunen((g) => (g && g.ust === vv.offsetTop && g.yukseklik === vv.height ? g : { ust: vv.offsetTop, yukseklik: vv.height }));
        olc();
        vv.addEventListener('resize', olc);
        vv.addEventListener('scroll', olc);
        return () => { vv.removeEventListener('resize', olc); vv.removeEventListener('scroll', olc); };
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
            setAktif((e as CustomEvent<AktifGorev | null>).detail);
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
        if (simdiki.adim + 1 < g.adimlar.length) {
            aktifGorevYaz({ id: g.id, adim: simdiki.adim + 1 });
            return;
        }
        gorevTamamlandi(g.id);
        aktifGorevYaz(null);
        setBiten(g);
    }, []);

    const birak = useCallback(() => aktifGorevYaz(null), []);

    // Hedefi bekle, bulununca izle (kaydırma, açılan menü, klavye konumu değiştirir).
    useLayoutEffect(() => {
        setKutu(null);
        setHedefYok(false);
        hedefRef.current = null;
        if (!aktif || hedefler.length === 0) return;
        const baslangic = Date.now();
        let kaydirildi = false;
        const olc = () => {
            const el = hedefBul(hedefler);
            hedefRef.current = el;
            if (!el) {
                if (Date.now() - baslangic > HEDEF_BEKLEME_MS) setHedefYok(true);
                setKutu(null);
                return;
            }
            if (!kaydirildi) {
                kaydirildi = true;
                el.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
            setHedefYok(false);
            const r = el.getBoundingClientRect();
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
            const dokunus = (e: PointerEvent) => {
                const el = hedefRef.current ?? hedefBul(adim.hedef ?? []);
                if (el && e.target instanceof Node && el.contains(e.target)) window.setTimeout(ilerle, 0);
            };
            document.addEventListener('pointerdown', dokunus, true);
            return () => document.removeEventListener('pointerdown', dokunus, true);
        }
        if (typeof gecis === 'object') {
            const eylem = (e: Event) => { if ((e as CustomEvent<{ id: string }>).detail.id === gecis.eylem) ilerle(); };
            window.addEventListener(EYLEM_OLAYI, eylem);
            return () => window.removeEventListener(EYLEM_OLAYI, eylem);
        }
    }, [adim, yon, ilerle]);

    if (!hazir) return null;

    if (biten) {
        const bitenler = bitenGorevler();
        const sonraki = GOREVLER.find((g) => !bitenler.includes(g.id));
        return createPortal(
            <div role="dialog" aria-modal="false" aria-labelledby="gorev-bitti-baslik" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] z-[460] mx-auto max-w-md rounded-3xl border border-moss-200 bg-white p-5 shadow-lift">
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
    // Hedef aranıyor (en çok birkaç saniye); bulunca ya da bulunamayınca kart çıkar.
    if (hedefler.length > 0 && !kutu && !hedefYok) return null;

    const toplam = gorev.adimlar.length;
    const sira = aktif!.adim;
    const pay = 6;
    const KART = 230;
    const SERIT = 56;
    // Görünen alan: klavye açıksa ekranın yalnız klavye üstündeki kısmı.
    const gorunenUst = gorunen?.ust ?? 0;
    const gorunenAlt = gorunenUst + (gorunen?.yukseklik ?? window.innerHeight);
    // Görünen alan sayfanın belirgin kısmından küçükse telefon klavyesi açıktır.
    const klavyeAcik = gorunenAlt - gorunenUst < window.innerHeight * 0.8;
    let kucuk = false;
    let kartStil: CSSProperties = { top: (gorunenUst + gorunenAlt) / 2, transform: 'translateY(-50%)' };
    if (kutu) {
        const ustBosluk = kutu.y - pay - gorunenUst;
        const altBosluk = gorunenAlt - (kutu.y + kutu.h + pay);
        if (altBosluk >= KART + 10) kartStil = { top: kutu.y + kutu.h + pay + 10 };
        else if (ustBosluk >= KART + 10) kartStil = { bottom: window.innerHeight - (kutu.y - pay - 10) };
        else if (!klavyeAcik) {
            // Hedef ekranın çoğunu kaplıyor (ör. editörün yazı alanı): kart görünen alanın altına biner.
            kartStil = { bottom: window.innerHeight - gorunenAlt + 8 };
        } else {
            // Klavye açık ve kart sığmıyor (ör. ad penceresi): tek satırlık şerit.
            kucuk = true;
            kartStil = ustBosluk >= SERIT || ustBosluk >= altBosluk
                ? { top: Math.max(gorunenUst + 8, kutu.y - pay - SERIT) }
                : { top: kutu.y + kutu.h + pay + 8 };
            if (ustBosluk < SERIT && altBosluk < SERIT) kartStil = { top: gorunenUst + 8 };
        }
    }
    const metin = yon ? yon.metin : hedefYok && adim.yoksa ? adim.yoksa : adim.metin;
    const gecis = adim.gecis;

    return createPortal(
        <div className="pointer-events-none fixed inset-0 z-[450]">
            {kutu ? (
                <>
                    <div aria-hidden="true" className="absolute rounded-2xl transition-all duration-200" style={{ left: kutu.x - pay, top: kutu.y - pay, width: kutu.w + pay * 2, height: kutu.h + pay * 2, boxShadow: '0 0 0 9999px rgba(28,25,20,.5)' }} />
                    <div aria-hidden="true" className="absolute rounded-2xl ring-[3px] ring-clay-400 transition-all duration-200 motion-safe:animate-pulse" style={{ left: kutu.x - pay, top: kutu.y - pay, width: kutu.w + pay * 2, height: kutu.h + pay * 2 }} />
                </>
            ) : (
                <div aria-hidden="true" className="absolute inset-0" style={{ background: 'rgba(28,25,20,.5)' }} />
            )}
            <div
                role="dialog"
                aria-modal="false"
                aria-live="polite"
                aria-label={`${gorev.baslik}, adım ${sira + 1} / ${toplam}`}
                data-gorev-karti=""
                data-gorev-kucuk={kucuk ? '' : undefined}
                className={'pointer-events-auto absolute inset-x-3 mx-auto max-w-sm rounded-2xl bg-white shadow-lift ' + (kucuk ? 'py-2 pl-3.5 pr-1.5' : 'p-4')}
                style={kartStil}
            >
                {kucuk ? (
                    <div className="flex items-center gap-2.5">
                        <span className="shrink-0 rounded-full bg-moss-100 px-2 py-0.5 text-[11px] font-semibold text-moss-800"><span className="sr-only">Adım </span>{sira + 1}/{toplam}</span>
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-sand-900">{yon ? 'Önce doğru ekrana geçin' : adim.baslik}</p>
                        <button type="button" onClick={birak} aria-label="Görevi bırak" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sand-600 hover:bg-sand-100"><X size={17} aria-hidden="true" /></button>
                    </div>
                ) : (<>
                <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-moss-700">
                            {gorev.baslik} · Adım {sira + 1}/{toplam}
                        </p>
                        <div className="mt-1.5 flex gap-1" aria-hidden="true">
                            {gorev.adimlar.map((_, i) => (
                                <span key={i} className={'h-1 flex-1 rounded-full transition-colors ' + (i < sira ? 'bg-moss-600' : i === sira ? 'bg-clay-400' : 'bg-sand-200')} />
                            ))}
                        </div>
                    </div>
                    <button type="button" onClick={birak} aria-label="Görevi bırak" className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sand-600 hover:bg-sand-100"><X size={17} aria-hidden="true" /></button>
                </div>
                <p className="mt-2.5 font-semibold text-sand-900">{yon ? 'Önce doğru ekrana geçin' : adim.baslik}</p>
                <p className="mt-1 text-sm leading-relaxed text-sand-700">{kalin(metin)}</p>
                {!yon && hedefYok && !adim.yoksa && (
                    <p className="mt-1.5 text-xs text-sand-600">Vurgulanacak öğe şu an ekranda yok. Ekranı kaydırmayı deneyin ya da bu adımı geçin.</p>
                )}

                <div className="mt-3 flex items-center gap-2">
                    {yon ? (
                        yon.git ? (
                            <button type="button" onClick={() => router.push(yon.git!)} className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-moss-700 px-4 text-sm font-semibold text-white hover:bg-moss-800">
                                {EKRAN_ADLARI[adim.ekran]} ekranına git <ArrowRight size={16} aria-hidden="true" />
                            </button>
                        ) : null
                    ) : gecis === 'ileri' ? (
                        <button type="button" onClick={ilerle} className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-moss-700 px-4 text-sm font-semibold text-white hover:bg-moss-800">
                            {sira + 1 === toplam ? 'Bitir' : 'İleri'} {sira + 1 < toplam && <ArrowRight size={16} aria-hidden="true" />}
                        </button>
                    ) : (
                        <>
                            <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-sand-600">
                                {gecis === 'dokun' ? <Hand size={14} className="shrink-0 text-clay-600" aria-hidden="true" /> : <Hourglass size={14} className="shrink-0 text-clay-600" aria-hidden="true" />}
                                {gecis === 'dokun' ? 'Vurgulanan yere dokunun' : 'Yaptığınızda devam eder'}
                            </span>
                            <button type="button" onClick={ilerle} className="ml-auto min-h-10 shrink-0 rounded-lg px-2 text-xs font-semibold text-sand-600 underline-offset-2 hover:text-sand-800 hover:underline">
                                Adımı geç
                            </button>
                        </>
                    )}
                </div>
                </>)}
            </div>
        </div>,
        document.body
    );
}
