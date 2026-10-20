'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
    ArrowRight,
    Award,
    BookA,
    BookOpen,
    Check,
    ChevronDown,
    ChevronRight,
    Clock,
    Cloud,
    Cpu,
    Download,
    HelpCircle,
    Hand,
    Keyboard,
    LayoutDashboard,
    Layers,
    Lightbulb,
    Link2,
    ListOrdered,
    ListTree,
    LogIn,
    MonitorSmartphone,
    MousePointer2,
    MousePointerClick,
    Palette,
    PenLine,
    Search,
    Settings,
    Sparkles,
    Sprout,
    Target,
    TreePine,
    Wand2,
    Wrench,
    X,
    type LucideIcon,
} from 'lucide-react';
import { SettingsHint, cx } from '@/components/ui/settings';
import type { SettingsSectionId } from './SettingsHome';
import KilavuzGorseli from './KilavuzGorseli';
import UygulamaliOgrenim from './UygulamaliOgrenim';
import { SEVIYELER, SOZLUK, SSS, TUM_DERSLER, YOLLAR, type KilavuzDersi, type KilavuzIkonu, type KilavuzSorusu } from '@/lib/kilavuzIcerik';
import { ILERLEME_OLAYI, KILAVUZ_MOD_ANAHTARI as MOD_ANAHTARI, dersDurumu, ogrenmeOturumuBaslat, type KilavuzModu, ogrenilenler, type KilavuzGoster } from '@/lib/kilavuzIlerleme';
import { KILAVUZ_ACILDI_ANAHTARI } from '@/components/tour/KilavuzKatmani';
import { GOREVLER, derseAitGorev, type KilavuzGorevi } from '@/lib/kilavuzGorevleri';

/**
 * Ayarlar içindeki kullanım kılavuzu. İki sekmesi vardır:
 *
 * - Teorik öğrenim: okunan dersler (aşağıdaki öğrenme tasarımı).
 * - Uygulamalı öğrenim: gerçek ekranlarda adım adım görevler (UygulamaliOgrenim,
 *   GorevRehberi). Bir görevi uygulayan dersin kartı o görevi başlatabilir.
 *
 * Teorik öğrenme tasarımı:
 * - Kaldığınız yerden devam: sıradaki öğrenilmemiş ders tek dokunuşla açılır.
 * - İki giriş: seviyeler (Başlangıç → Uzman, her biri öncekinin üstüne kurulur)
 *   ya da amaca göre yollar ("Notlarım kaybolmasın" gibi, yalnız gereken dersler).
 * - Her ders aynı kalıbı izler: hedef → şema → adımlar → Şimdi deneyin →
 *   Akılda kalsın → Kendinizi sınayın. Doğru yanıt dersi öğrenildi sayar.
 * - Kılavuz genelinde arama, sözlük ve sık sorulanlar.
 *
 * İlerleme bu cihazda saklanır; kayıp olursa yalnız işaretler sıfırlanır.
 * Metinlerde **kalın** yazım metinParcalari ile kalın gösterilir.
 */

interface UsageGuideProps {
    /** Kılavuzdan ilgili ayar bölümüne geçmek için. */
    onNavigate?: (id: SettingsSectionId) => void;
    /** Uygulamalı turu başlatır (ayarlar kapanır, tur ana ekranda çalışır). */
    onTurBaslat?: () => void;
    /** "Bana göster": ayarlar kapanır, dersin ekranı açılır ve öğe vurgulanır. */
    onGoster?: (goster: KilavuzGoster) => void;
    /** Uygulamalı görev: ayarlar kapanır, görev ilk ekranında adım adım başlar. */
    onGorevBaslat?: (gorev: KilavuzGorevi) => void;
}

type Mod = KilavuzModu;

type Ders = (typeof TUM_DERSLER)[number];
type Gorunum = { tur: 'seviye' } | { tur: 'yol'; id: string };

/** Veri dosyasındaki simge adlarının bileşenleri. */
const IKONLAR: Record<KilavuzIkonu, LucideIcon> = { Award, Cloud, Cpu, Download, HelpCircle, Keyboard, Layers, LayoutDashboard, Link2, ListOrdered, ListTree, LogIn, MonitorSmartphone, MousePointer2, Palette, PenLine, Settings, Sparkles, Sprout, TreePine, Wand2, Wrench };

const SEVIYE_ANAHTARI = 'nb-kilavuz-seviye-v1';

function oku<T>(anahtar: string, yedek: T): T {
    try {
        const ham = localStorage.getItem(anahtar);
        return ham ? (JSON.parse(ham) as T) : yedek;
    } catch {
        return yedek;
    }
}
function yaz(anahtar: string, deger: unknown) {
    try { localStorage.setItem(anahtar, JSON.stringify(deger)); } catch { /* yalnız işaretler kaybolur */ }
}

/** **kalın** işaretlerini kalın metne çevirir. */
function metinParcalari(metin: string): ReactNode[] {
    return metin.split('**').map((parca, index) =>
        index % 2 === 1 ? (
            <strong key={index} className="font-semibold text-sand-900">
                {parca}
            </strong>
        ) : (
            parca
        )
    );
}

/** Aramada Türkçe büyük/küçük harf ve kalın işaretlerinden bağımsız karşılaştırma. */
const sade = (metin: string) => metin.replace(/\*\*/g, '').toLocaleLowerCase('tr');
function eslesir(alanlar: Array<string | undefined>, sorgu: string): boolean {
    const kelimeler = sade(sorgu).split(/\s+/).filter(Boolean);
    if (kelimeler.length === 0) return false;
    const metin = sade(alanlar.filter(Boolean).join(' '));
    return kelimeler.every((k) => metin.includes(k));
}
const dersMetni = (d: KilavuzDersi) => [d.title, d.description, d.hedef, d.hatirla, d.ipucu, d.dene, ...d.adimlar];

const dakika = (dersler: KilavuzDersi[]) => dersler.reduce((n, d) => n + d.sure, 0);

/** Yüzdeyi gösteren küçük halka. */
function IlerlemeHalkasi({ oran }: { oran: number }) {
    const r = 22;
    const cevre = 2 * Math.PI * r;
    return (
        <svg viewBox="0 0 52 52" className="h-14 w-14 shrink-0 -rotate-90" aria-hidden="true">
            <circle cx="26" cy="26" r={r} fill="none" stroke="rgb(var(--sand-200))" strokeWidth="5" />
            <circle
                cx="26" cy="26" r={r} fill="none" stroke="rgb(var(--moss-600))" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={cevre} strokeDashoffset={cevre * (1 - oran)} className="transition-[stroke-dashoffset] duration-500"
            />
        </svg>
    );
}

/** Tek soruluk hatırlama alıştırması. Doğru yanıt dersi öğrenildi sayar. */
function KendiniSina({ soru, onDogru }: { soru: KilavuzSorusu; onDogru: () => void }) {
    const [secim, setSecim] = useState<number | null>(null);
    const yanitlandi = secim !== null;
    const dogru = secim === soru.dogru;
    return (
        <div className="rounded-xl border border-sand-300 bg-white p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sand-600">
                <HelpCircle size={13} aria-hidden="true" /> Kendinizi sınayın
            </p>
            <p className="mt-1.5 text-sm font-semibold leading-relaxed text-sand-900">{soru.soru}</p>
            <div role="group" aria-label="Seçenekler" className="mt-2.5 space-y-1.5">
                {soru.secenekler.map((secenek, i) => {
                    const buDogru = i === soru.dogru;
                    const secildi = secim === i;
                    return (
                        <button
                            key={secenek}
                            type="button"
                            disabled={yanitlandi && dogru}
                            aria-pressed={secildi}
                            onClick={() => {
                                setSecim(i);
                                if (buDogru) onDogru();
                            }}
                            className={cx(
                                'flex min-h-11 w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500',
                                yanitlandi && buDogru && (secildi || dogru)
                                    ? 'border-moss-500 bg-moss-50 text-moss-900'
                                    : secildi
                                        ? 'border-berry-300 bg-berry-50 text-berry-800'
                                        : 'border-sand-300 bg-white text-sand-800 hover:border-moss-500/50 disabled:opacity-60'
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className={cx(
                                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                                    yanitlandi && buDogru && (secildi || dogru) ? 'border-moss-600 bg-moss-600 text-white' : secildi ? 'border-berry-500 bg-berry-500 text-white' : 'border-sand-300 text-sand-600'
                                )}
                            >
                                {yanitlandi && buDogru && (secildi || dogru) ? <Check size={12} /> : secildi ? <X size={12} /> : String.fromCharCode(65 + i)}
                            </span>
                            <span className="min-w-0">{secenek}</span>
                        </button>
                    );
                })}
            </div>
            <div aria-live="polite">
                {yanitlandi && (
                    <div className={cx('mt-2.5 rounded-lg px-3 py-2 text-sm leading-relaxed', dogru ? 'bg-moss-50 text-moss-900' : 'bg-berry-50 text-berry-800')}>
                        <strong className="font-semibold">{dogru ? 'Doğru! ' : 'Tam değil. '}</strong>
                        {dogru ? soru.aciklama + ' Ders öğrenildi olarak işaretlendi.' : 'Bir daha deneyin; adımlara yeniden göz atabilirsiniz.'}
                    </div>
                )}
            </div>
        </div>
    );
}

interface DersKartiProps {
    ders: Ders;
    sira: number;
    acik: boolean;
    ogrenildi: boolean;
    /** Yol ve arama görünümlerinde dersin seviyesini gösterir. */
    seviyeGoster: boolean;
    baslikId: string;
    panelId: string;
    sonraki?: Ders;
    onAcKapat: () => void;
    onIsaretle: (deger: boolean) => void;
    onSonraki: () => void;
    /** Dersin ekranını açıp ilgili öğeyi vurgular. */
    goster?: () => void;
    /** Ders ayarlarda öğreniliyorsa ilgili bölümü açar. */
    ayaraGit?: () => void;
    /** Dersi uygulayan görev varsa onu başlatır. */
    uygula?: { baslik: string; baslat: () => void };
}

function DersKarti({ ders, sira, acik, ogrenildi, seviyeGoster, baslikId, panelId, sonraki, onAcKapat, onIsaretle, onSonraki, goster, ayaraGit, uygula }: DersKartiProps) {
    const Ikon = IKONLAR[ders.ikon];
    return (
        <div className={cx('overflow-hidden rounded-2xl border bg-white shadow-soft transition-colors', acik ? 'border-moss-300' : 'border-sand-200')}>
            <button
                type="button"
                id={baslikId}
                onClick={onAcKapat}
                aria-expanded={acik}
                aria-controls={panelId}
                className="flex w-full scroll-mt-4 items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-moss-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-moss-500"
            >
                <span
                    aria-hidden="true"
                    className={cx(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                        ogrenildi ? 'bg-moss-600 text-white' : acik ? 'bg-moss-100 text-moss-800' : 'bg-sand-100 text-sand-700'
                    )}
                >
                    {ogrenildi ? <Check size={17} /> : <Ikon size={17} />}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-5 text-sand-900">
                        {sira}. {ders.title}
                        {ogrenildi && <span className="sr-only"> (öğrenildi)</span>}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs leading-relaxed text-sand-600">
                        <span>{ders.description}</span>
                        <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-sand-500">
                            <Clock size={11} aria-hidden="true" /> {ders.sure} dk
                        </span>
                        {seviyeGoster && <span className="whitespace-nowrap rounded-full bg-sand-100 px-1.5 text-[10.5px] font-semibold text-sand-700">{ders.seviyeAd}</span>}
                    </span>
                </span>
                <ChevronDown size={18} aria-hidden="true" className={cx('shrink-0 text-sand-600 transition-transform duration-200', acik && 'rotate-180')} />
            </button>
            {acik && (
                <div id={panelId} role="region" aria-labelledby={baslikId} className="space-y-4 border-t border-sand-100 px-4 py-4">
                    <p className="flex gap-2.5 rounded-xl bg-moss-50/70 px-3 py-2.5 text-sm leading-relaxed text-moss-900">
                        <Target size={16} className="mt-0.5 shrink-0 text-moss-700" aria-hidden="true" />
                        <span><strong className="block text-xs font-semibold uppercase tracking-wide text-moss-700">Bu dersin sonunda</strong>{ders.hedef}</span>
                    </p>

                    {ders.gorsel && <KilavuzGorseli ad={ders.gorsel} />}

                    <ol className="space-y-3">
                        {ders.adimlar.map((adim, i) => (
                            <li key={adim} className="flex gap-3 text-sm leading-relaxed text-sand-700">
                                <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sand-100 text-xs font-semibold text-sand-600">
                                    {i + 1}
                                </span>
                                <span className="min-w-0">{metinParcalari(adim)}</span>
                            </li>
                        ))}
                    </ol>

                    {ders.dene && (
                        <div className="flex gap-2.5 rounded-xl border border-dashed border-clay-300 bg-clay-50 px-3 py-2.5 text-sm leading-relaxed text-sand-800">
                            <Hand size={16} className="mt-0.5 shrink-0 text-clay-700" aria-hidden="true" />
                            <p><strong className="font-semibold text-sand-900">Şimdi deneyin: </strong>{metinParcalari(ders.dene)}</p>
                        </div>
                    )}

                    {ders.ipucu && (
                        <p className="flex gap-2.5 rounded-xl bg-sand-50 px-3 py-2.5 text-xs leading-relaxed text-sand-700">
                            <Lightbulb size={15} className="shrink-0 text-clay-600" aria-hidden="true" />
                            <span><strong className="font-semibold text-sand-800">İpucu: </strong>{metinParcalari(ders.ipucu)}</span>
                        </p>
                    )}

                    <div className="rounded-xl border-l-4 border-moss-500 bg-white px-3 py-2 shadow-soft">
                        <p className="text-xs font-semibold uppercase tracking-wide text-moss-700">Akılda kalsın</p>
                        <p className="mt-0.5 text-sm font-medium leading-relaxed text-sand-900">{ders.hatirla}</p>
                    </div>

                    {ders.soru && <KendiniSina soru={ders.soru} onDogru={() => onIsaretle(true)} />}

                    {/* Teoriden uygulamaya: dersi uygulayan görev varsa ana eylem odur; "Bana göster" yalnız yeri işaret eder. */}
                    {uygula && (
                        <button
                            type="button"
                            onClick={uygula.baslat}
                            className="flex w-full min-h-12 items-center gap-3 rounded-xl bg-moss-700 px-4 py-2 text-left text-white transition-colors hover:bg-moss-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 focus-visible:ring-offset-2"
                        >
                            <Hand size={17} aria-hidden="true" className="shrink-0" />
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold">Adım adım uygulayın</span>
                                <span className="block truncate text-xs text-moss-100">Uygulamalı görev: {uygula.baslik}</span>
                            </span>
                            <ArrowRight size={17} aria-hidden="true" className="shrink-0" />
                        </button>
                    )}
                    {(goster || ayaraGit) && (
                        <button
                            type="button"
                            onClick={goster ?? ayaraGit}
                            aria-label={'Bana göster: ' + (ders.goster?.baslik ?? ders.ayarEtiketi ?? ders.title)}
                            className={cx(
                                'flex w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 focus-visible:ring-offset-2',
                                uygula ? 'min-h-11 border border-moss-300 bg-white text-moss-800 hover:bg-moss-50' : 'min-h-12 bg-moss-700 text-white hover:bg-moss-800'
                            )}
                        >
                            <MousePointerClick size={17} aria-hidden="true" /> Bana göster
                            {!goster && ders.ayarEtiketi && <span className={cx('font-normal', uygula ? 'text-sand-600' : 'text-moss-100')}>· {ders.ayarEtiketi}</span>}
                        </button>
                    )}

                    {/* Durum: tamamlandı mı, değilse nasıl kendiliğinden tamamlanır. */}
                    <div className={cx('flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm leading-relaxed', ogrenildi ? 'bg-moss-50 text-moss-900' : 'bg-sand-50 text-sand-700')}>
                        {ogrenildi ? (
                            <>
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-moss-600 text-white"><Check size={12} aria-hidden="true" /></span>
                                <span className="min-w-0 flex-1 font-semibold">Ders tamamlandı</span>
                                <button type="button" onClick={() => onIsaretle(false)} className="shrink-0 text-xs font-semibold text-moss-700 underline-offset-2 hover:underline">Geri al</button>
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} className="mt-0.5 shrink-0 text-clay-600" aria-hidden="true" />
                                <span className="min-w-0">
                                    {ders.tamamlanma ?? (ders.soru ? 'Soruyu doğru yanıtladığınızda tamamlanır.' : 'Okuyup uyguladıktan sonra aşağıdan tamamlayın.')}
                                </span>
                            </>
                        )}
                    </div>
                    {!ogrenildi && (
                        ders.tamamlanma || ders.soru ? (
                            <button
                                type="button"
                                onClick={() => onIsaretle(true)}
                                className="-mt-2 block min-h-10 px-1 text-xs font-semibold text-sand-600 underline-offset-2 hover:text-sand-800 hover:underline"
                            >
                                Bunu zaten biliyorum
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => onIsaretle(true)}
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-sand-300 bg-white px-3.5 text-sm font-semibold text-sand-800 transition-colors hover:border-moss-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500"
                            >
                                <Check size={16} aria-hidden="true" /> Okudum, tamam
                            </button>
                        )
                    )}

                    {sonraki && (
                        <button
                            type="button"
                            onClick={onSonraki}
                            className="flex w-full min-h-12 items-center gap-3 rounded-xl border border-sand-200 bg-sand-50 px-3.5 py-2.5 text-left transition-colors hover:border-moss-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500"
                        >
                            <span className="min-w-0 flex-1">
                                <span className="block text-xs font-semibold uppercase tracking-wide text-sand-600">
                                    Sonraki ders{sonraki.seviyeId !== ders.seviyeId ? ' · ' + sonraki.seviyeAd : ''}
                                </span>
                                <span className="block truncate text-sm font-semibold text-sand-900">{sonraki.title}</span>
                            </span>
                            <ArrowRight size={17} className="shrink-0 text-moss-700" aria-hidden="true" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default function UsageGuide({ onNavigate, onTurBaslat, onGoster, onGorevBaslat }: UsageGuideProps) {
    const [mod, setMod] = useState<Mod>('teori');
    const [seviyeId, setSeviyeId] = useState(SEVIYELER[0].id);
    const [gorunum, setGorunum] = useState<Gorunum>({ tur: 'seviye' });
    const [ogrenilen, setOgrenilen] = useState<string[]>([]);
    const [acikDers, setAcikDers] = useState<string | null>(null);
    const [arama, setArama] = useState('');
    const kaydirilacak = useRef<string | null>(null);
    const baseId = useId();
    const baslikId = (id: string) => baseId + '-b-' + id;
    const panelId = (id: string) => baseId + '-p-' + id;

    // Kaldığı seviye ve işaretler cihazdan okunur (sunucu çiziminde yoktur).
    useEffect(() => {
        const kayitli = oku<string>(SEVIYE_ANAHTARI, SEVIYELER[0].id);
        if (SEVIYELER.some((s) => s.id === kayitli)) setSeviyeId(kayitli);
        if (oku<Mod>(MOD_ANAHTARI, 'teori') === 'uygulama') setMod('uygulama');
        setOgrenilen(ogrenilenler());
        // Uygulamada yapılan işler dersleri tamamlar; kılavuz açıkken de anında yansısın.
        const guncelle = () => setOgrenilen(ogrenilenler());
        window.addEventListener(ILERLEME_OLAYI, guncelle);
        // Kılavuzu açan kullanıcı artık turu biliyor; birkaç dakika "Ders tamamlandı" bildirimleri görür.
        yaz(KILAVUZ_ACILDI_ANAHTARI, 1);
        ogrenmeOturumuBaslat();
        return () => window.removeEventListener(ILERLEME_OLAYI, guncelle);
    }, []);

    // "Devam et" ve "Sonraki ders" ile açılan dersi görünür alana getirir.
    useEffect(() => {
        const id = kaydirilacak.current;
        if (!id || id !== acikDers) return;
        kaydirilacak.current = null;
        document.getElementById(baslikId(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    const seviyeSira = Math.max(0, SEVIYELER.findIndex((s) => s.id === seviyeId));
    const seviye = SEVIYELER[seviyeSira];
    const sonrakiSeviye = SEVIYELER[seviyeSira + 1];
    const yol = gorunum.tur === 'yol' ? YOLLAR.find((y) => y.id === gorunum.id) : undefined;
    const aramaVar = arama.trim().length > 0;

    const bitti = (id: string) => ogrenilen.includes(id);
    const toplamBiten = TUM_DERSLER.filter((d) => bitti(d.id)).length;
    const devamDersi = TUM_DERSLER.find((d) => !bitti(d.id));

    /** Ekranda listelenen dersler: arama, yol ya da seçili seviye. */
    const gorunenDersler: Ders[] = useMemo(() => {
        // Başlığında ya da açıklamasında geçen dersler önce, yalnız metninde geçenler sonra.
        if (aramaVar) {
            const bulunan = TUM_DERSLER.filter((d) => eslesir(dersMetni(d), arama));
            const basliktaGecen = bulunan.filter((d) => eslesir([d.title, d.description], arama));
            return [...basliktaGecen, ...bulunan.filter((d) => !basliktaGecen.includes(d))];
        }
        if (yol) return yol.dersler.map((id) => TUM_DERSLER.find((d) => d.id === id)).filter((d): d is Ders => !!d);
        return TUM_DERSLER.filter((d) => d.seviyeId === seviye.id);
    }, [aramaVar, arama, yol, seviye.id]);

    const sssSonuclari = aramaVar ? SSS.filter((s) => eslesir([s.soru, s.cevap], arama)) : [];
    const sozlukSonuclari = aramaVar ? SOZLUK.filter((s) => eslesir([s.terim, s.tanim], arama)) : [];

    const isaretle = (id: string, deger: boolean) => dersDurumu(id, deger);
    const modSec = (yeni: Mod) => {
        setMod(yeni);
        yaz(MOD_ANAHTARI, yeni);
    };
    const seviyeSec = (id: string) => {
        setSeviyeId(id);
        setAcikDers(null);
        yaz(SEVIYE_ANAHTARI, id);
    };
    const dersiAc = (ders: Ders, gorunumDegistir: boolean) => {
        if (gorunumDegistir) {
            setArama('');
            setGorunum({ tur: 'seviye' });
            setSeviyeId(ders.seviyeId);
            yaz(SEVIYE_ANAHTARI, ders.seviyeId);
        }
        kaydirilacak.current = ders.id;
        setAcikDers(ders.id);
    };
    /** Görünen listede sonraki ders; seviye görünümünde son dersten sonraki seviyeye geçer. */
    const sonrakiDers = (ders: Ders): { ders: Ders; seviyeDegisir: boolean } | undefined => {
        const i = gorunenDersler.findIndex((d) => d.id === ders.id);
        if (i >= 0 && i + 1 < gorunenDersler.length) return { ders: gorunenDersler[i + 1], seviyeDegisir: false };
        if (!aramaVar && !yol && sonrakiSeviye) return { ders: TUM_DERSLER.find((d) => d.seviyeId === sonrakiSeviye.id)!, seviyeDegisir: true };
        return undefined;
    };

    const seviyeBiten = seviye.dersler.filter((d) => bitti(d.id)).length;
    const seviyeBitti = seviyeBiten === seviye.dersler.length;
    const SeviyeIkonu = IKONLAR[seviye.ikon];

    const dersListesi = (
        <div className="space-y-3">
            {gorunenDersler.map((ders, i) => {
                const sonraki = sonrakiDers(ders);
                return (
                    <DersKarti
                        key={ders.id}
                        ders={ders}
                        sira={i + 1}
                        acik={acikDers === ders.id}
                        ogrenildi={bitti(ders.id)}
                        seviyeGoster={aramaVar || !!yol}
                        baslikId={baslikId(ders.id)}
                        panelId={panelId(ders.id)}
                        sonraki={sonraki?.ders}
                        onAcKapat={() => setAcikDers(acikDers === ders.id ? null : ders.id)}
                        onIsaretle={(deger) => isaretle(ders.id, deger)}
                        onSonraki={() => sonraki && dersiAc(sonraki.ders, sonraki.seviyeDegisir)}
                        goster={ders.goster && onGoster ? () => onGoster(ders.goster!) : undefined}
                        ayaraGit={ders.ayarId && onNavigate ? () => onNavigate(ders.ayarId as SettingsSectionId) : undefined}
                        uygula={(() => {
                            const gorev = derseAitGorev(ders.id);
                            return gorev && onGorevBaslat ? { baslik: gorev.baslik, baslat: () => onGorevBaslat(gorev) } : undefined;
                        })()}
                    />
                );
            })}
        </div>
    );

    const sekmeler: Array<{ id: Mod; Ikon: LucideIcon; baslik: string; alt: string }> = [
        { id: 'teori', Ikon: BookOpen, baslik: 'Teorik öğrenim', alt: TUM_DERSLER.length + ' ders · okuyun' },
        { id: 'uygulama', Ikon: Hand, baslik: 'Uygulamalı öğrenim', alt: GOREVLER.length + ' görev · yapın' },
    ];

    return (
        <div className="space-y-5">
            <div role="tablist" aria-label="Öğrenme biçimi" className="grid grid-cols-2 gap-1.5 rounded-2xl border border-sand-200 bg-sand-100 p-1.5">
                {sekmeler.map(({ id, Ikon, baslik, alt }) => {
                    const secili = mod === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            id={baseId + '-mod-' + id}
                            aria-selected={secili}
                            aria-controls={baseId + '-mod-panel'}
                            onClick={() => modSec(id)}
                            className={cx(
                                'flex min-h-[60px] items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500',
                                secili ? 'bg-white shadow-soft ring-1 ring-sand-200' : 'hover:bg-white/50'
                            )}
                        >
                            <span aria-hidden="true" className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', secili ? 'bg-moss-600 text-white' : 'bg-sand-200 text-sand-700')}>
                                <Ikon size={17} />
                            </span>
                            <span className="min-w-0">
                                <span className={cx('block text-sm font-semibold leading-tight', secili ? 'text-sand-900' : 'text-sand-700')}>{baslik}</span>
                                <span className="mt-0.5 block truncate text-[11px] text-sand-600">{alt}</span>
                            </span>
                        </button>
                    );
                })}
            </div>

            <div id={baseId + '-mod-panel'} role="tabpanel" aria-labelledby={baseId + '-mod-' + mod} className="space-y-5">
            {mod === 'uygulama' ? (
                <UygulamaliOgrenim onGorevBaslat={onGorevBaslat} onTurBaslat={onTurBaslat} />
            ) : (
            <>
            {/* Kaldığınız yerden devam */}
            <section aria-label="İlerlemeniz" className="rounded-2xl border border-moss-200 bg-moss-50/60 p-4">
                <div className="flex items-center gap-3.5">
                    <div className="relative">
                        <IlerlemeHalkasi oran={toplamBiten / TUM_DERSLER.length} />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-moss-800">
                            %{Math.round((toplamBiten / TUM_DERSLER.length) * 100)}
                        </span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-sand-900">
                            {toplamBiten === 0 ? 'Öğrenmeye hazır mısınız?' : devamDersi ? 'Kaldığınız yerden devam edin' : 'Tüm dersleri tamamladınız!'}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-sand-700">
                            {TUM_DERSLER.length} dersin {toplamBiten} tanesi tamam. Dersler kısa: çoğu 1–4 dakika.
                        </p>
                    </div>
                </div>
                {devamDersi && (
                    <button
                        type="button"
                        onClick={() => dersiAc(devamDersi, true)}
                        className="mt-3 flex w-full min-h-12 items-center gap-3 rounded-xl bg-moss-700 px-3.5 py-2.5 text-left text-white transition-colors hover:bg-moss-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 focus-visible:ring-offset-2"
                    >
                        <span className="min-w-0 flex-1">
                            <span className="block text-[11px] font-semibold uppercase tracking-wide text-moss-100">
                                {toplamBiten === 0 ? 'İlk ders' : 'Sıradaki'} · {devamDersi.seviyeAd} · {devamDersi.sure} dk
                            </span>
                            <span className="block truncate text-sm font-semibold">{devamDersi.title}</span>
                        </span>
                        <ArrowRight size={18} aria-hidden="true" className="shrink-0" />
                    </button>
                )}
            </section>

            {/* Arama */}
            <div className="relative">
                <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sand-500" />
                <input
                    type="search"
                    value={arama}
                    onChange={(e) => { setArama(e.target.value); setAcikDers(null); }}
                    placeholder="Kılavuzda ara: tuval, yedek, USB…"
                    aria-label="Kılavuzda ara"
                    className="w-full min-h-12 rounded-2xl border border-sand-300 bg-white pl-10 pr-11 text-sm text-sand-900 outline-none transition-shadow placeholder:text-sand-500 focus:border-moss-500 focus:ring-4 focus:ring-moss-500/15 [&::-webkit-search-cancel-button]:hidden"
                />
                {aramaVar && (
                    <button
                        type="button"
                        onClick={() => setArama('')}
                        aria-label="Aramayı temizle"
                        className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-sand-600 hover:bg-sand-100"
                    >
                        <X size={16} aria-hidden="true" />
                    </button>
                )}
            </div>

            {aramaVar ? (
                <section aria-label="Arama sonuçları" className="space-y-4">
                    <p className="px-1 text-xs font-semibold uppercase tracking-wider text-sand-600" aria-live="polite">
                        {gorunenDersler.length + sssSonuclari.length + sozlukSonuclari.length === 0
                            ? 'Sonuç yok. Başka bir kelime deneyin.'
                            : `${gorunenDersler.length} ders · ${sssSonuclari.length} soru · ${sozlukSonuclari.length} terim`}
                    </p>
                    {gorunenDersler.length > 0 && dersListesi}
                    {sozlukSonuclari.length > 0 && <h3 className="flex items-center gap-1.5 px-1 pt-1 text-xs font-semibold uppercase tracking-wider text-sand-600"><BookA size={13} aria-hidden="true" /> Sözlük</h3>}
                    {sozlukSonuclari.length > 0 && (
                        <dl className="space-y-2 rounded-2xl border border-sand-200 bg-white p-4 shadow-soft">
                            {sozlukSonuclari.map((s) => (
                                <div key={s.terim}>
                                    <dt className="text-sm font-semibold text-sand-900">{s.terim}</dt>
                                    <dd className="text-sm leading-relaxed text-sand-700">{s.tanim}</dd>
                                </div>
                            ))}
                        </dl>
                    )}
                    {sssSonuclari.length > 0 && <h3 className="flex items-center gap-1.5 px-1 pt-1 text-xs font-semibold uppercase tracking-wider text-sand-600"><BookOpen size={13} aria-hidden="true" /> Sık sorulan sorular</h3>}
                    {sssSonuclari.map(({ soru, cevap }) => (
                        <div key={soru} className="rounded-2xl border border-sand-200 bg-white p-4 shadow-soft">
                            <p className="flex items-start gap-2 text-sm font-semibold text-sand-900"><HelpCircle size={16} className="mt-0.5 shrink-0 text-moss-700" aria-hidden="true" />{soru}</p>
                            <p className="mt-1.5 text-sm leading-relaxed text-sand-700">{metinParcalari(cevap)}</p>
                        </div>
                    ))}
                </section>
            ) : (
                <>
                    {/* Amaca göre yollar */}
                    <section aria-labelledby={baseId + '-yollar'} className="space-y-2">
                        <h3 id={baseId + '-yollar'} className="px-1 text-xs font-semibold uppercase tracking-wider text-sand-600">Ne yapmak istiyorsunuz?</h3>
                        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
                            <button
                                type="button"
                                aria-pressed={gorunum.tur === 'seviye'}
                                onClick={() => { setGorunum({ tur: 'seviye' }); setAcikDers(null); }}
                                className={cx(
                                    'flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500',
                                    gorunum.tur === 'seviye' ? 'border-moss-600 bg-moss-600 text-white' : 'border-sand-300 bg-white text-sand-800 hover:border-moss-500/60'
                                )}
                            >
                                <Layers size={15} aria-hidden="true" /> Adım adım (seviyeler)
                            </button>
                            {YOLLAR.map((y) => {
                                const Ikon = IKONLAR[y.ikon];
                                const secili = yol?.id === y.id;
                                const tamam = y.dersler.every(bitti);
                                return (
                                    <button
                                        key={y.id}
                                        type="button"
                                        aria-pressed={secili}
                                        onClick={() => { setGorunum({ tur: 'yol', id: y.id }); setAcikDers(null); }}
                                        className={cx(
                                            'flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500',
                                            secili ? 'border-moss-600 bg-moss-600 text-white' : 'border-sand-300 bg-white text-sand-800 hover:border-moss-500/60'
                                        )}
                                    >
                                        {tamam ? <Check size={15} aria-hidden="true" /> : <Ikon size={15} aria-hidden="true" />} {y.baslik}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {yol ? (
                        <section aria-label={yol.baslik} className="space-y-3">
                            <div className="px-1">
                                <h3 className="text-base font-semibold text-sand-900">{yol.baslik}</h3>
                                <p className="mt-0.5 text-sm leading-relaxed text-sand-700">
                                    {yol.aciklama} Bunun için gereken {gorunenDersler.length} ders, doğru sırayla · yaklaşık {dakika(gorunenDersler)} dakika.
                                </p>
                                <IlerlemeCubugu biten={gorunenDersler.filter((d) => bitti(d.id)).length} toplam={gorunenDersler.length} />
                            </div>
                            {dersListesi}
                        </section>
                    ) : (
                        <>
                            <div role="tablist" aria-label="Öğrenme seviyesi" className="grid grid-cols-5 gap-1 rounded-2xl border border-sand-200 bg-sand-100 p-1">
                                {SEVIYELER.map((s, i) => {
                                    const Ikon = IKONLAR[s.ikon];
                                    const secili = s.id === seviye.id;
                                    const tamam = s.dersler.every((d) => bitti(d.id));
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            role="tab"
                                            id={'kilavuz-seviye-' + s.id}
                                            aria-selected={secili}
                                            aria-label={(i + 1) + '. seviye: ' + s.ad + (tamam ? ' (tamamlandı)' : '')}
                                            onClick={() => seviyeSec(s.id)}
                                            className={cx(
                                                'relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500',
                                                secili ? 'bg-white text-moss-800 shadow-soft ring-1 ring-sand-200' : 'text-sand-600 hover:text-sand-800'
                                            )}
                                        >
                                            <Ikon size={16} aria-hidden="true" />
                                            <span className="w-full truncate text-center">{s.ad}</span>
                                            {tamam && <Check size={12} aria-hidden="true" className="absolute right-1 top-1 text-moss-600" />}
                                        </button>
                                    );
                                })}
                            </div>

                            <section role="tabpanel" aria-labelledby={'kilavuz-seviye-' + seviye.id} className="space-y-3">
                                <div className="flex items-start gap-3 px-1">
                                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-moss-600 text-white">
                                        <SeviyeIkonu size={19} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-base font-semibold text-sand-900">
                                            {seviyeSira + 1}. seviye · {seviye.ad}
                                        </h3>
                                        <p className="mt-0.5 text-xs font-medium text-sand-600">{seviye.dersler.length} ders · yaklaşık {dakika(seviye.dersler)} dakika</p>
                                        <p className="mt-1 text-sm leading-relaxed text-sand-700">{seviye.ozet}</p>
                                        <IlerlemeCubugu biten={seviyeBiten} toplam={seviye.dersler.length} />
                                    </div>
                                </div>

                                {dersListesi}

                                {sonrakiSeviye && (
                                    <button
                                        type="button"
                                        onClick={() => seviyeSec(sonrakiSeviye.id)}
                                        className={cx(
                                            'flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500',
                                            seviyeBitti ? 'bg-moss-700 text-white hover:bg-moss-800' : 'border border-dashed border-sand-300 text-sand-700 hover:border-moss-500/50'
                                        )}
                                    >
                                        {seviyeBitti ? 'Tebrikler! Sonraki seviye: ' : 'Sonraki seviyeye geç: '}{sonrakiSeviye.ad}
                                        <ChevronRight size={16} aria-hidden="true" />
                                    </button>
                                )}
                                {!sonrakiSeviye && seviyeBitti && (
                                    <p className="rounded-2xl bg-moss-50 px-4 py-3 text-center text-sm font-semibold text-moss-800">
                                        Tüm seviyeleri tamamladınız. Artık Not Bahçesi uzmanısınız!
                                    </p>
                                )}
                            </section>
                        </>
                    )}

                    {/* Sözlük */}
                    <details className="group overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-soft">
                        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm font-semibold text-sand-900 transition-colors hover:bg-moss-50/60 [&::-webkit-details-marker]:hidden">
                            <BookA size={17} className="shrink-0 text-moss-700" aria-hidden="true" />
                            <span className="min-w-0 flex-1">Sözlük <span className="font-normal text-sand-600">· {SOZLUK.length} terim</span></span>
                            <ChevronDown size={17} aria-hidden="true" className="shrink-0 text-sand-600 transition-transform duration-200 group-open:rotate-180" />
                        </summary>
                        <dl className="divide-y divide-sand-100 border-t border-sand-100">
                            {SOZLUK.map((s) => (
                                <div key={s.terim} className="px-4 py-2.5">
                                    <dt className="text-sm font-semibold text-sand-900">{s.terim}</dt>
                                    <dd className="mt-0.5 text-sm leading-relaxed text-sand-700">{s.tanim}</dd>
                                </div>
                            ))}
                        </dl>
                    </details>

                    {/* Sık sorulanlar */}
                    <div className="space-y-2.5">
                        <h3 className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-sand-600">
                            <BookOpen size={13} aria-hidden="true" /> Sık sorulan sorular
                        </h3>
                        {SSS.map(({ soru, cevap }) => (
                            <details key={soru} className="group overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-soft">
                                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm font-semibold text-sand-900 transition-colors hover:bg-moss-50/60 [&::-webkit-details-marker]:hidden">
                                    <HelpCircle size={17} className="shrink-0 text-moss-700" aria-hidden="true" />
                                    <span className="min-w-0 flex-1">{soru}</span>
                                    <ChevronDown size={17} aria-hidden="true" className="shrink-0 text-sand-600 transition-transform duration-200 group-open:rotate-180" />
                                </summary>
                                <p className="border-t border-sand-100 px-4 py-3.5 text-sm leading-relaxed text-sand-700">{metinParcalari(cevap)}</p>
                            </details>
                        ))}
                    </div>
                </>
            )}
            </>
            )}
            </div>

            <SettingsHint>
                Bir şey takılırsa bu sayfaya dönün: Ayarlar → Kullanım kılavuzu. İlerlemeniz bu cihazda saklanır.
            </SettingsHint>
        </div>
    );
}

function IlerlemeCubugu({ biten, toplam }: { biten: number; toplam: number }) {
    return (
        <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand-200" aria-hidden="true">
                <div className="h-full rounded-full bg-moss-600 transition-all" style={{ width: (toplam ? (biten / toplam) * 100 : 0) + '%' }} />
            </div>
            <span className="shrink-0 text-xs font-medium text-sand-600">{biten}/{toplam} ders</span>
        </div>
    );
}
