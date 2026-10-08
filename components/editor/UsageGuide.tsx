'use client';

import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import {
    Award,
    BookOpen,
    Check,
    ChevronDown,
    ChevronRight,
    Cloud,
    Cpu,
    Download,
    GraduationCap,
    HelpCircle,
    Keyboard,
    LayoutDashboard,
    Layers,
    Link2,
    ListOrdered,
    ListTree,
    MonitorSmartphone,
    MousePointer2,
    Palette,
    PenLine,
    Settings,
    Sparkles,
    Sprout,
    TreePine,
    Wand2,
    Wrench,
    type LucideIcon,
} from 'lucide-react';
import { SettingsHint, cx } from '@/components/ui/settings';
import { APP_VERSION } from '@/lib/config';
import type { SettingsSectionId } from './SettingsHome';
import { SEVIYELER, SSS, type KilavuzIkonu, type KilavuzSeviyesi } from '@/lib/kilavuzIcerik';

/**
 * Ayarlar içindeki kullanım kılavuzu: seviyeli öğretim.
 *
 * Beş seviye (Başlangıç → Uzman) vardır; her seviye kısa derslerden oluşur.
 * Kullanıcı istediği kadarını öğrenir: Başlangıç yalnız uygulamayı tanıtır,
 * sonraki seviyeler bir öncekinin üstüne kurulur. Okunan dersler "Öğrendim"
 * ile işaretlenir; ilerleme bu cihazda saklanır (kayıp olursa yalnız işaretler
 * sıfırlanır). Metinlerde **kalın** yazım metinParcalari ile kalın gösterilir.
 */

interface UsageGuideProps {
    /** Kılavuzdan ilgili ayar bölümüne geçmek için. */
    onNavigate?: (id: SettingsSectionId) => void;
}

/** Veri dosyasındaki simge adlarının bileşenleri. */
const IKONLAR: Record<KilavuzIkonu, LucideIcon> = { Award, Cloud, Cpu, Download, HelpCircle, Keyboard, Layers, LayoutDashboard, Link2, ListOrdered, ListTree, MonitorSmartphone, MousePointer2, Palette, PenLine, Settings, Sparkles, Sprout, TreePine, Wand2, Wrench };

const ILERLEME_ANAHTARI = 'nb-kilavuz-ilerleme-v1';
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

export default function UsageGuide({ onNavigate }: UsageGuideProps) {
    const [seviyeId, setSeviyeId] = useState(SEVIYELER[0].id);
    const [ogrenilen, setOgrenilen] = useState<string[]>([]);
    const [acikDers, setAcikDers] = useState<string | null>(null);
    const baseId = useId();

    // Kaldığı seviye ve işaretler cihazdan okunur (sunucu çiziminde yoktur).
    useEffect(() => {
        const kayitli = oku<string>(SEVIYE_ANAHTARI, SEVIYELER[0].id);
        if (SEVIYELER.some((s) => s.id === kayitli)) setSeviyeId(kayitli);
        const liste = oku<unknown>(ILERLEME_ANAHTARI, []);
        if (Array.isArray(liste)) setOgrenilen(liste.filter((x): x is string => typeof x === 'string'));
    }, []);

    const seviyeSira = Math.max(0, SEVIYELER.findIndex((s) => s.id === seviyeId));
    const seviye = SEVIYELER[seviyeSira];
    const sonraki = SEVIYELER[seviyeSira + 1];
    const tamamlanan = (s: KilavuzSeviyesi) => s.dersler.filter((d) => ogrenilen.includes(d.id)).length;
    const seviyeBitti = tamamlanan(seviye) === seviye.dersler.length;

    const seviyeSec = (id: string) => {
        setSeviyeId(id);
        setAcikDers(null);
        yaz(SEVIYE_ANAHTARI, id);
    };
    const isaretle = (id: string) => {
        setOgrenilen((liste) => {
            const yeni = liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id];
            yaz(ILERLEME_ANAHTARI, yeni);
            return yeni;
        });
    };
    const SeviyeIkonu = IKONLAR[seviye.ikon];

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-moss-200 bg-moss-50/60 p-4">
                <p className="mb-2 text-xs font-semibold text-moss-700">Güncel kılavuz · {APP_VERSION}</p>
                <div className="flex items-start gap-3">
                    <GraduationCap size={20} className="mt-0.5 shrink-0 text-moss-700" aria-hidden="true" />
                    <p className="text-sm leading-relaxed text-sand-800">
                        Kılavuz beş seviyedir. <strong className="font-semibold">Başlangıç</strong> yalnız uygulamayı tanıtır; her seviye bir öncekinin
                        üstüne kurulur. İstediğiniz kadarını öğrenin: okuduğunuz dersi <strong className="font-semibold">Öğrendim</strong> ile işaretleyin, kılavuz kaldığınız yeri hatırlar.
                    </p>
                </div>
            </div>

            <div role="tablist" aria-label="Öğrenme seviyesi" className="grid grid-cols-5 gap-1 rounded-2xl border border-sand-200 bg-sand-100 p-1">
                {SEVIYELER.map((s, i) => {
                    const Ikon = IKONLAR[s.ikon];
                    const secili = s.id === seviye.id;
                    const bitti = tamamlanan(s) === s.dersler.length;
                    return (
                        <button
                            key={s.id}
                            type="button"
                            role="tab"
                            id={'kilavuz-seviye-' + s.id}
                            aria-selected={secili}
                            aria-label={(i + 1) + '. seviye: ' + s.ad + (bitti ? ' (tamamlandı)' : '')}
                            onClick={() => seviyeSec(s.id)}
                            className={cx(
                                'relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500',
                                secili ? 'bg-white text-moss-800 shadow-soft ring-1 ring-sand-200' : 'text-sand-600 hover:text-sand-800'
                            )}
                        >
                            <Ikon size={16} aria-hidden="true" />
                            <span className="w-full truncate text-center">{s.ad}</span>
                            {bitti && <Check size={12} aria-hidden="true" className="absolute right-1 top-1 text-moss-600" />}
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
                        <p className="mt-1 text-sm leading-relaxed text-sand-700">{seviye.ozet}</p>
                        <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand-200" aria-hidden="true">
                                <div className="h-full rounded-full bg-moss-600 transition-all" style={{ width: (tamamlanan(seviye) / seviye.dersler.length) * 100 + '%' }} />
                            </div>
                            <span className="shrink-0 text-xs font-medium text-sand-600">
                                {tamamlanan(seviye)}/{seviye.dersler.length} ders
                            </span>
                        </div>
                    </div>
                </div>

                {seviye.dersler.map((ders, index) => {
                    const isOpen = acikDers === ders.id;
                    const ogrenildi = ogrenilen.includes(ders.id);
                    const panelId = baseId + '-' + ders.id;
                    const Ikon = IKONLAR[ders.ikon];
                    return (
                        <div key={ders.id} className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-soft">
                            <button
                                type="button"
                                onClick={() => setAcikDers(isOpen ? null : ders.id)}
                                aria-expanded={isOpen}
                                aria-controls={panelId}
                                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-moss-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-moss-500"
                            >
                                <span
                                    aria-hidden="true"
                                    className={cx(
                                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                                        ogrenildi ? 'bg-moss-600 text-white' : isOpen ? 'bg-moss-100 text-moss-800' : 'bg-sand-100 text-sand-700'
                                    )}
                                >
                                    {ogrenildi ? <Check size={17} /> : <Ikon size={17} />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold leading-5 text-sand-900">
                                        {index + 1}. {ders.title}
                                        {ogrenildi && <span className="sr-only"> (öğrenildi)</span>}
                                    </span>
                                    <span className="mt-0.5 block text-xs leading-relaxed text-sand-600">{ders.description}</span>
                                </span>
                                <ChevronDown
                                    size={18}
                                    aria-hidden="true"
                                    className={cx('shrink-0 text-sand-600 transition-transform duration-200', isOpen && 'rotate-180')}
                                />
                            </button>
                            {isOpen && (
                                <div id={panelId} className="border-t border-sand-100 px-4 py-4">
                                    <ol className="space-y-3">
                                        {ders.adimlar.map((adim, sira) => (
                                            <li key={adim} className="flex gap-3 text-sm leading-relaxed text-sand-700">
                                                <span
                                                    aria-hidden="true"
                                                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sand-100 text-xs font-semibold text-sand-600"
                                                >
                                                    {sira + 1}
                                                </span>
                                                <span className="min-w-0">{metinParcalari(adim)}</span>
                                            </li>
                                        ))}
                                    </ol>
                                    {ders.ipucu && (
                                        <p className="mt-3 rounded-xl bg-sand-50 px-3 py-2.5 text-xs leading-relaxed text-sand-700">
                                            <strong className="font-semibold text-sand-800">İpucu: </strong>
                                            {metinParcalari(ders.ipucu)}
                                        </p>
                                    )}
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => isaretle(ders.id)}
                                            aria-pressed={ogrenildi}
                                            className={cx(
                                                'inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500',
                                                ogrenildi ? 'bg-moss-600 text-white hover:bg-moss-700' : 'border border-sand-300 bg-white text-sand-800 hover:border-moss-500/60'
                                            )}
                                        >
                                            <Check size={16} aria-hidden="true" /> {ogrenildi ? 'Öğrenildi' : 'Öğrendim'}
                                        </button>
                                        {ders.ayarId && onNavigate && (
                                            <button
                                                type="button"
                                                onClick={() => onNavigate(ders.ayarId as SettingsSectionId)}
                                                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-moss-50 px-3.5 text-sm font-semibold text-moss-800 transition-colors hover:bg-moss-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500"
                                            >
                                                {ders.ayarEtiketi || 'İlgili ayarları aç'}
                                                <ChevronRight size={16} aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {sonraki && (
                    <button
                        type="button"
                        onClick={() => seviyeSec(sonraki.id)}
                        className={cx(
                            'flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500',
                            seviyeBitti ? 'bg-moss-700 text-white hover:bg-moss-800' : 'border border-dashed border-sand-300 text-sand-700 hover:border-moss-500/50'
                        )}
                    >
                        {seviyeBitti ? 'Tebrikler! Sonraki seviye: ' : 'Sonraki seviyeye geç: '}{sonraki.ad}
                        <ChevronRight size={16} aria-hidden="true" />
                    </button>
                )}
                {!sonraki && seviyeBitti && (
                    <p className="rounded-2xl bg-moss-50 px-4 py-3 text-center text-sm font-semibold text-moss-800">
                        Tüm seviyeleri tamamladınız. Artık Not Bahçesi uzmanısınız!
                    </p>
                )}
            </section>

            <div className="space-y-2.5">
                <h3 className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-sand-600">
                    <BookOpen size={13} aria-hidden="true" /> Sık sorulan sorular
                </h3>
                {SSS.map(({ soru, cevap }) => (
                    <details key={soru} className="group overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-soft">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm font-semibold text-sand-900 transition-colors hover:bg-moss-50/60 [&::-webkit-details-marker]:hidden">
                            <HelpCircle size={17} className="shrink-0 text-moss-700" aria-hidden="true" />
                            <span className="min-w-0 flex-1">{soru}</span>
                            <ChevronDown
                                size={17}
                                aria-hidden="true"
                                className="shrink-0 text-sand-600 transition-transform duration-200 group-open:rotate-180"
                            />
                        </summary>
                        <p className="border-t border-sand-100 px-4 py-3.5 text-sm leading-relaxed text-sand-700">{metinParcalari(cevap)}</p>
                    </details>
                ))}
            </div>

            <SettingsHint>
                Bir şey takılırsa bu sayfaya dönün: Ayarlar → Kullanım kılavuzu. Ayarlarda yaptığınız değişiklikler anında kaydedilir.
            </SettingsHint>
        </div>
    );
}
