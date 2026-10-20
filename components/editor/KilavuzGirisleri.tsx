'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Check, Hand, Play, TreePine } from 'lucide-react';
import { GOREVLER, type KilavuzGorevi } from '@/lib/kilavuzGorevleri';
import { TUM_DERSLER } from '@/lib/kilavuzIcerik';
import { GOREV_OLAYI, ILERLEME_OLAYI, bitenGorevler, ogrenilenler } from '@/lib/kilavuzIlerleme';

/**
 * Ayarlar ana sayfasının başındaki iki kılavuz girişi, yan yana:
 * - Kullanım kılavuzu kitapçığı: okunan dersler (Teorik öğrenim) açılır.
 * - Uygulamalı öğrenim: liste açılmadan sıradaki görev hemen başlar; hepsi
 *   bittiyse görev listesi açılır.
 * İkisi de ilerlemeyi gösterir; böylece kullanıcı nerede kaldığını görür.
 */
export default function KilavuzGirisleri({ onKitapcik, onGorevBaslat, onGorevler }: {
    onKitapcik: () => void;
    onGorevBaslat: (gorev: KilavuzGorevi) => void;
    /** Tüm görevler bittiyse: görev listesini açar. */
    onGorevler: () => void;
}) {
    const [bitenDers, setBitenDers] = useState(0);
    const [biten, setBiten] = useState<string[]>([]);

    useEffect(() => {
        const guncelle = () => {
            setBitenDers(ogrenilenler().filter((id) => TUM_DERSLER.some((d) => d.id === id)).length);
            setBiten(bitenGorevler());
        };
        guncelle();
        window.addEventListener(ILERLEME_OLAYI, guncelle);
        window.addEventListener(GOREV_OLAYI, guncelle);
        return () => {
            window.removeEventListener(ILERLEME_OLAYI, guncelle);
            window.removeEventListener(GOREV_OLAYI, guncelle);
        };
    }, []);

    const dersOrani = bitenDers / TUM_DERSLER.length;
    const sonraki = GOREVLER.find((g) => !biten.includes(g.id));
    const bitenGorev = GOREVLER.filter((g) => biten.includes(g.id)).length;

    return (
        <div className="grid grid-cols-2 gap-3">
            {/* Kitapçık: okuyarak öğrenme */}
            <button
                type="button"
                id="kilavuz-kitapcik"
                onClick={onKitapcik}
                className="group relative isolate flex min-h-[176px] flex-col overflow-hidden rounded-3xl bg-moss-900 p-4 text-left text-white shadow-card transition-transform hover:-translate-y-0.5 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 focus-visible:ring-offset-2"
            >
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <span className="absolute -right-14 -top-16 h-40 w-40 rounded-full border border-moss-200/10" />
                    <TreePine className="absolute -bottom-6 -right-4 h-24 w-24 -rotate-12 text-moss-200/[0.08]" strokeWidth={1} />
                </span>
                <span className="flex items-start justify-between gap-2">
                    <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-moss-200/15 text-moss-100 ring-1 ring-inset ring-moss-200/20">
                        <BookOpen size={19} />
                    </span>
                    <span className="rounded-full bg-moss-200/15 px-2 py-0.5 text-[10.5px] font-semibold text-moss-100">{TUM_DERSLER.length} ders</span>
                </span>
                <span className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.14em] text-moss-200">Kitapçık</span>
                <span className="mt-0.5 block font-display text-lg leading-tight tracking-tight">Kullanım kılavuzu</span>
                <span className="mt-1 block text-xs leading-snug text-moss-100/85">Okuyarak öğrenin: seviyeler, sözlük, sorular.</span>
                <span className="mt-auto flex items-center gap-2 pt-3">
                    <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-moss-200/15">
                        <span className="block h-full rounded-full bg-moss-300 transition-all" style={{ width: Math.round(dersOrani * 100) + '%' }} />
                    </span>
                    <span className="text-[11px] font-semibold text-moss-100">%{Math.round(dersOrani * 100)}</span>
                </span>
            </button>

            {/* Uygulamalı: sıradaki görev tek dokunuşla başlar */}
            <button
                type="button"
                id="kilavuz-uygulamali"
                onClick={() => (sonraki ? onGorevBaslat(sonraki) : onGorevler())}
                aria-label={sonraki ? 'Uygulamalı öğrenimi başlat: ' + sonraki.baslik : 'Uygulamalı görevleri aç'}
                className="group relative isolate flex min-h-[176px] flex-col overflow-hidden rounded-3xl border border-clay-200 bg-clay-50 p-4 text-left text-sand-900 shadow-card transition-transform hover:-translate-y-0.5 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 focus-visible:ring-offset-2"
            >
                <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 -z-10 h-32 w-32 rounded-full bg-clay-200/50 blur-2xl" />
                <span className="flex items-start justify-between gap-2">
                    <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-clay-500 text-white shadow-soft">
                        <Hand size={19} />
                    </span>
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10.5px] font-semibold text-clay-800 ring-1 ring-inset ring-clay-200">{bitenGorev}/{GOREVLER.length} görev</span>
                </span>
                <span className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.14em] text-clay-700">Uygulamalı</span>
                <span className="mt-0.5 block font-display text-lg leading-tight tracking-tight">Yaparak öğrenin</span>
                <span className="mt-1 line-clamp-2 block text-xs leading-snug text-sand-700">
                    {sonraki ? <>Sıradaki: <strong className="font-semibold text-sand-900">{sonraki.baslik}</strong> · {sonraki.sure} dk</> : 'Tüm görevleri tamamladınız. Yeniden yapmak için açın.'}
                </span>
                <span className="mt-auto flex items-center gap-2 pt-3">
                    <span aria-hidden="true" className="flex flex-1 gap-1">
                        {GOREVLER.map((g) => (
                            <span key={g.id} className={'h-1.5 flex-1 rounded-full ' + (biten.includes(g.id) ? 'bg-clay-500' : 'bg-clay-200')} />
                        ))}
                    </span>
                    <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand-900 text-white transition-transform group-hover:translate-x-0.5">
                        {sonraki ? <Play size={14} className="translate-x-px" fill="currentColor" /> : bitenGorev ? <Check size={15} /> : <ArrowRight size={15} />}
                    </span>
                </span>
            </button>
        </div>
    );
}
