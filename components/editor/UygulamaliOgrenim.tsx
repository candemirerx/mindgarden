'use client';

import { useEffect, useId, useState } from 'react';
import {
    ArrowRight,
    Check,
    ChevronDown,
    Compass,
    Hand,
    LayoutDashboard,
    Palette,
    PenLine,
    Layers,
    MousePointer2,
    Play,
    PlayCircle,
    RotateCcw,
    Settings,
    Sprout,
    TreePine,
    type LucideIcon,
} from 'lucide-react';
import { cx } from '@/components/ui/settings';
import { GOREVLER, baslanabilirAdim, type KilavuzGorevi } from '@/lib/kilavuzGorevleri';
import { GOREV_OLAYI, bitenGorevler, sonBahce } from '@/lib/kilavuzIlerleme';

/**
 * Kılavuzun "Uygulamalı öğrenim" sekmesi: gerçek ekranlarda adım adım görevler.
 * Görev başlayınca ayarlar kapanır; GorevRehberi her adımı ekranda yürütür.
 */

const IKONLAR: Partial<Record<KilavuzGorevi['ikon'], LucideIcon>> = { Layers, LayoutDashboard, MousePointer2, Palette, PenLine, Settings, Sprout, TreePine };

interface UygulamaliOgrenimProps {
    onGorevBaslat?: (gorev: KilavuzGorevi, adim?: number) => void;
    onTurBaslat?: () => void;
}

export default function UygulamaliOgrenim({ onGorevBaslat, onTurBaslat }: UygulamaliOgrenimProps) {
    const [biten, setBiten] = useState<string[]>([]);
    const [bahceVar, setBahceVar] = useState(true);
    const [acik, setAcik] = useState<string | null>(null);
    const baseId = useId();

    useEffect(() => {
        const guncelle = () => setBiten(bitenGorevler());
        guncelle();
        setBahceVar(!!sonBahce());
        window.addEventListener(GOREV_OLAYI, guncelle);
        return () => window.removeEventListener(GOREV_OLAYI, guncelle);
    }, []);

    const onerilen = GOREVLER.find((g) => !biten.includes(g.id));
    const bitenSayi = GOREVLER.filter((g) => biten.includes(g.id)).length;

    return (
        <div className="space-y-4">
            {/* Nasıl çalışır: tek satır; asıl iş görevlerde. */}
            <p className="flex items-center gap-2 rounded-xl bg-clay-50 px-3 py-2.5 text-xs leading-relaxed text-sand-700">
                <Hand size={15} className="shrink-0 text-clay-700" aria-hidden="true" />
                Görevi başlatın: parlayan yere dokundukça kendiliğinden ilerler.
            </p>

            <div className="flex items-center gap-2 px-1">
                <h3 className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wider text-sand-600">Görevler</h3>
                <span className="shrink-0 text-xs font-medium text-sand-600">{bitenSayi}/{GOREVLER.length} tamamlandı</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-sand-200" aria-hidden="true">
                <div className="h-full rounded-full bg-moss-600 transition-all" style={{ width: (bitenSayi / GOREVLER.length) * 100 + '%' }} />
            </div>

            {onTurBaslat && (
                <button
                    type="button"
                    onClick={onTurBaslat}
                    className="flex w-full items-center gap-3 rounded-2xl border border-sand-200 bg-white px-4 py-3.5 text-left shadow-soft transition-colors hover:border-moss-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500"
                >
                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-moss-100 text-moss-700"><Compass size={19} /></span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-sand-900">Hızlı tur: ana ekranı tanıyın</span>
                        <span className="block text-xs leading-relaxed text-sand-600">Düğmeleri sırayla gösterir · 1 dk</span>
                    </span>
                    <PlayCircle size={20} className="shrink-0 text-moss-700" aria-hidden="true" />
                </button>
            )}

            <ol className="space-y-3">
                {GOREVLER.map((g, i) => {
                    const Ikon = IKONLAR[g.ikon] ?? Sprout;
                    const tamam = biten.includes(g.id);
                    const oneri = onerilen?.id === g.id;
                    const adimlarAcik = acik === g.id;
                    const panelId = baseId + '-adim-' + g.id;
                    return (
                        <li key={g.id} className={cx('overflow-hidden rounded-2xl border bg-white shadow-soft', oneri ? 'border-moss-300' : 'border-sand-200')}>
                            <div className="flex items-start gap-3 px-4 pt-3.5">
                                <span
                                    aria-hidden="true"
                                    className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tamam ? 'bg-moss-600 text-white' : oneri ? 'bg-moss-100 text-moss-800' : 'bg-sand-100 text-sand-700')}
                                >
                                    {tamam ? <Check size={18} /> : <Ikon size={18} />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                        <span className="text-sm font-semibold text-sand-900">{i + 1}. {g.baslik}</span>
                                        {tamam && <span className="rounded-full bg-moss-100 px-1.5 text-[10.5px] font-semibold text-moss-800">Tamamlandı</span>}
                                        {oneri && !tamam && <span className="rounded-full bg-clay-100 px-1.5 text-[10.5px] font-semibold text-clay-800">Sıradaki</span>}
                                    </p>
                                    <p className="mt-0.5 text-xs leading-relaxed text-sand-600">{g.aciklama}</p>
                                    <p className="mt-0.5 text-[11px] font-medium text-sand-500">{g.adimlar.length} adım · {g.sure} dk</p>
                                </div>
                            </div>
                            {g.baslangic !== 'ana' && !bahceVar && (
                                <p className="mx-4 mt-2 rounded-lg bg-sand-50 px-2.5 py-1.5 text-xs leading-relaxed text-sand-600">
                                    Bir bahçenin içinde yapılır; bahçeniz yoksa rehber önce bahçe açmayı gösterir.
                                </p>
                            )}
                            <div className="flex items-center gap-2 px-4 pb-3.5 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setAcik(adimlarAcik ? null : g.id)}
                                    aria-expanded={adimlarAcik}
                                    aria-controls={panelId}
                                    className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-sand-700 hover:bg-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500"
                                >
                                    Adımlar <ChevronDown size={15} aria-hidden="true" className={cx('transition-transform', adimlarAcik && 'rotate-180')} />
                                </button>
                                {onGorevBaslat && (
                                    <button
                                        type="button"
                                        onClick={() => onGorevBaslat(g)}
                                        aria-label={(tamam ? 'Yeniden yap: ' : 'Başla: ') + g.baslik}
                                        className={cx(
                                            'ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 focus-visible:ring-offset-2',
                                            tamam ? 'border border-sand-300 text-sand-800 hover:bg-sand-50' : 'bg-moss-700 text-white hover:bg-moss-800'
                                        )}
                                    >
                                        {tamam ? <><RotateCcw size={15} aria-hidden="true" /> Yeniden yap</> : <>Başla <ArrowRight size={16} aria-hidden="true" /></>}
                                    </button>
                                )}
                            </div>
                            {adimlarAcik && (
                                <ol id={panelId} className="space-y-0.5 border-t border-sand-100 px-2 py-2">
                                    {/* Her adım bir bölüm: dokununca görev o adımdan başlar (bağımlı adımda onu açan adımdan). */}
                                    {g.adimlar.map((a, n) => (
                                        <li key={a.baslik + n}>
                                            <button
                                                type="button"
                                                disabled={!onGorevBaslat}
                                                onClick={() => onGorevBaslat?.(g, baslanabilirAdim(g, n))}
                                                aria-label={`Adım ${n + 1}'den başla: ${a.baslik}`}
                                                className="group flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2 text-left text-sm text-sand-700 transition-colors hover:bg-moss-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 disabled:hover:bg-transparent"
                                            >
                                                <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sand-100 text-[11px] font-semibold text-sand-600 group-hover:bg-moss-600 group-hover:text-white">{n + 1}</span>
                                                <span className="min-w-0 flex-1">{a.baslik}</span>
                                                {onGorevBaslat && <Play size={13} aria-hidden="true" className="shrink-0 text-moss-600 opacity-60 group-hover:opacity-100" />}
                                            </button>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
