'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Check, ChevronRight, GraduationCap, Play, RotateCcw } from 'lucide-react';
import { siradakiGorev, yolGorevleri, type KilavuzGorevi } from '@/lib/kilavuzGorevleri';
import { TUM_DERSLER } from '@/lib/kilavuzIcerik';
import { GOREV_OLAYI, ILERLEME_OLAYI, YOL_OLAYI, bitenGorevler, ogrenilenler, ogrenmeYolu, type OgrenmeYolu } from '@/lib/kilavuzIlerleme';

/**
 * Ayarlar ana sayfasının başındaki "Öğrenme alanı" paneli:
 * - Yaparak öğrenin (asıl eylem): liste açılmadan sıradaki görev hemen başlar;
 *   hepsi bittiyse görev listesi açılır.
 * - Kullanım kılavuzu kitapçığı: okunan dersler (Teorik öğrenim) açılır.
 * Görevler kullanıcının öğrenme yolundan (Liste ya da Tuval) gelir.
 * Üstteki halka iki yolun toplam ilerlemesini gösterir; kullanıcı nerede kaldığını görür.
 */

function Halka({ oran }: { oran: number }) {
    const r = 17;
    const cevre = 2 * Math.PI * r;
    return (
        <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true" className="-rotate-90">
            <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" className="stroke-moss-200/15" />
            <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-clay-300 transition-all duration-500"
                strokeDasharray={cevre} strokeDashoffset={cevre * (1 - Math.min(1, Math.max(0, oran)))} />
        </svg>
    );
}

export default function KilavuzGirisleri({ onKitapcik, onGorevBaslat, onGorevler }: {
    onKitapcik: () => void;
    onGorevBaslat: (gorev: KilavuzGorevi) => void;
    /** Tüm görevler bittiyse: görev listesini açar. */
    onGorevler: () => void;
}) {
    const [bitenDers, setBitenDers] = useState(0);
    const [biten, setBiten] = useState<string[]>([]);
    const [yol, setYol] = useState<OgrenmeYolu>('liste');

    useEffect(() => {
        const guncelle = () => {
            setBitenDers(ogrenilenler().filter((id) => TUM_DERSLER.some((d) => d.id === id)).length);
            setBiten(bitenGorevler());
            setYol(ogrenmeYolu());
        };
        guncelle();
        window.addEventListener(ILERLEME_OLAYI, guncelle);
        window.addEventListener(GOREV_OLAYI, guncelle);
        window.addEventListener(YOL_OLAYI, guncelle);
        return () => {
            window.removeEventListener(ILERLEME_OLAYI, guncelle);
            window.removeEventListener(GOREV_OLAYI, guncelle);
            window.removeEventListener(YOL_OLAYI, guncelle);
        };
    }, []);

    const gorevler = yolGorevleri(yol);
    const sonraki = siradakiGorev(yol, biten);
    const bitenGorev = gorevler.filter((g) => biten.includes(g.id)).length;
    const dersYuzde = Math.round((bitenDers / TUM_DERSLER.length) * 100);
    // Görevler ve dersler eşit ağırlıkta.
    const genel = (bitenGorev / gorevler.length + bitenDers / TUM_DERSLER.length) / 2;

    return (
        <section aria-labelledby="ogrenme-alani-baslik" className="relative isolate overflow-hidden rounded-3xl bg-moss-900 p-3 text-white shadow-card">
            <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 -z-10 h-52 w-52 rounded-full bg-clay-400/10 blur-2xl" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-10 -z-10 h-48 w-48 rounded-full bg-moss-400/10 blur-2xl" />

            {/* Başlık ve genel ilerleme */}
            <div className="flex items-center gap-3 px-1.5 pb-3 pt-1">
                <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-moss-200/15 text-moss-100 ring-1 ring-inset ring-moss-200/20">
                    <GraduationCap size={18} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-moss-200">Kullanım kılavuzu</p>
                    <h3 id="ogrenme-alani-baslik" className="truncate font-display text-lg leading-tight tracking-tight">Öğrenme alanı</h3>
                </div>
                <div className="relative shrink-0" title="Toplam ilerleme">
                    <Halka oran={genel} />
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-moss-50">%{Math.round(genel * 100)}</span>
                </div>
            </div>

            {/* Asıl eylem: sıradaki görev tek dokunuşla başlar */}
            <button
                type="button"
                id="kilavuz-uygulamali"
                onClick={() => (sonraki ? onGorevBaslat(sonraki) : onGorevler())}
                aria-label={sonraki ? 'Uygulamalı öğrenimi başlat: ' + sonraki.baslik : 'Uygulamalı görevleri aç'}
                className="group flex w-full items-center gap-3.5 rounded-2xl bg-sand-50 p-3.5 text-left text-sand-900 shadow-soft transition-transform hover:-translate-y-px active:scale-[.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-300 focus-visible:ring-offset-2 focus-visible:ring-offset-moss-900"
            >
                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-clay-500 text-white shadow-[0_8px_18px_-8px_rgba(170,104,20,.9)] transition-transform group-hover:scale-105">
                    {sonraki ? <Play size={20} className="translate-x-px" fill="currentColor" /> : <RotateCcw size={19} />}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-clay-700">Yaparak öğrenin · {yol === 'tuval' ? 'Tuval' : 'Liste'}</span>
                        <span className="rounded-full bg-clay-100 px-1.5 py-px text-[10.5px] font-semibold text-clay-800">{bitenGorev}/{gorevler.length}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[15px] font-semibold leading-snug">
                        {sonraki ? sonraki.baslik : 'Tüm görevler tamam'}
                    </span>
                    <span className="mt-1.5 flex items-center gap-2">
                        <span aria-hidden="true" className="flex flex-1 gap-1">
                            {gorevler.map((g) => (
                                <span key={g.id} className={'h-1.5 flex-1 rounded-full ' + (biten.includes(g.id) ? 'bg-clay-500' : g.id === sonraki?.id ? 'bg-clay-300' : 'bg-sand-200')} />
                            ))}
                        </span>
                        <span className="shrink-0 text-[11px] font-medium text-sand-600">{sonraki ? sonraki.sure + ' dk · ' + sonraki.adimlar.length + ' adım' : 'Yeniden yapın'}</span>
                    </span>
                </span>
            </button>

            {/* İkinci yol: kitapçık */}
            <button
                type="button"
                id="kilavuz-kitapcik"
                onClick={onKitapcik}
                className="group mt-2 flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors hover:bg-white/5 active:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-300"
            >
                <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-moss-200/15 text-moss-100">
                    <BookOpen size={17} />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-tight">Okuyarak öğrenin: kitapçık</span>
                    <span className="mt-0.5 block truncate text-xs text-moss-200">{TUM_DERSLER.length} kısa ders · sözlük · sorular</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-moss-100">
                    {dersYuzde === 100 ? <Check size={14} aria-hidden="true" /> : <>%{dersYuzde}</>}
                    <ChevronRight size={17} aria-hidden="true" className="text-moss-300 transition-transform group-hover:translate-x-0.5" />
                </span>
            </button>
        </section>
    );
}
