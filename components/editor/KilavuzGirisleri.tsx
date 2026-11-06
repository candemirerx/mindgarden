'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Check, Hand } from 'lucide-react';
import { siradakiGorev, yolGorevleri, type KilavuzGorevi } from '@/lib/kilavuzGorevleri';
import { TUM_DERSLER } from '@/lib/kilavuzIcerik';
import { GOREV_OLAYI, ILERLEME_OLAYI, YOL_OLAYI, bitenGorevler, ogrenilenler, ogrenmeYolu, type OgrenmeYolu } from '@/lib/kilavuzIlerleme';

/**
 * Ayarlar ana sayfasının başındaki "Öğrenme alanı": yan yana iki ayrı kart.
 * - Kullanım kılavuzu: okunan dersler (Teorik öğrenim) açılır.
 * - Uygulamalı öğrenim: liste açılmadan sıradaki görev hemen başlar;
 *   hepsi bittiyse görev listesi açılır.
 * Görevler kullanıcının öğrenme yolundan (Liste ya da Tuval) gelir.
 * Her kart kendi ilerlemesini gösterir; kullanıcı nerede kaldığını görür.
 */

function Cubuk({ oran, dolu, bos }: { oran: number; dolu: string; bos: string }) {
    return (
        <span aria-hidden="true" className={'block h-1.5 w-full overflow-hidden rounded-full ' + bos}>
            <span className={'block h-full rounded-full transition-all duration-500 ' + dolu} style={{ width: Math.round(Math.min(1, Math.max(0, oran)) * 100) + '%' }} />
        </span>
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
    const dersBitti = bitenDers >= TUM_DERSLER.length;

    const kart = 'group relative isolate flex min-h-[168px] w-full flex-col overflow-hidden rounded-2xl p-3.5 text-left transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

    return (
        <section aria-labelledby="ogrenme-alani-baslik">
            <div className="mb-2.5 flex items-baseline justify-between gap-3 px-1">
                <h3 id="ogrenme-alani-baslik" className="text-[13px] font-bold uppercase tracking-[0.12em] text-sand-700">Öğrenme alanı</h3>
                <p className="truncate text-xs text-sand-500">Okuyun ya da yaparak öğrenin</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
                {/* Okuyarak: kitapçık */}
                <button
                    type="button"
                    id="kilavuz-kitapcik"
                    onClick={onKitapcik}
                    aria-label={'Kullanım kılavuzunu aç: ' + bitenDers + ' / ' + TUM_DERSLER.length + ' ders okundu'}
                    className={kart + ' border border-sand-200 bg-white text-sand-900 shadow-soft hover:border-moss-300 hover:shadow-card focus-visible:ring-moss-500'}
                >
                    <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-xl bg-moss-50 text-moss-700 ring-1 ring-inset ring-moss-200">
                        <BookOpen size={21} strokeWidth={1.8} />
                    </span>
                    <span className="mt-3 block text-[15px] font-semibold leading-tight">Kullanım kılavuzu</span>
                    <span className="mt-1 block text-xs leading-snug text-sand-600">Okuyarak öğrenin: kısa dersler, sözlük, sorular</span>
                    <span className="mt-auto block pt-3">
                        <span className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-sand-600">
                            <span>{bitenDers}/{TUM_DERSLER.length} ders</span>
                            {dersBitti && <Check size={13} aria-hidden="true" className="text-moss-600" />}
                        </span>
                        <Cubuk oran={bitenDers / TUM_DERSLER.length} dolu="bg-moss-500" bos="bg-sand-100" />
                    </span>
                </button>

                {/* Yaparak: sıradaki görev tek dokunuşla başlar */}
                <button
                    type="button"
                    id="kilavuz-uygulamali"
                    onClick={() => (sonraki ? onGorevBaslat(sonraki) : onGorevler())}
                    aria-label={sonraki ? 'Uygulamalı öğrenimi başlat: ' + sonraki.baslik : 'Uygulamalı görevleri aç'}
                    className={kart + ' bg-moss-900 text-white shadow-card focus-visible:ring-clay-300'}
                >
                    <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 -z-10 h-32 w-32 rounded-full bg-clay-400/15 blur-2xl" />
                    <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-xl bg-clay-500 text-white shadow-[0_8px_18px_-8px_rgba(170,104,20,.9)] transition-transform group-hover:scale-105">
                        <Hand size={21} strokeWidth={1.8} />
                    </span>
                    <span className="mt-3 block text-[15px] font-semibold leading-tight">Uygulamalı öğrenim</span>
                    <span className="mt-1 line-clamp-2 text-xs leading-snug text-moss-200">
                        {sonraki ? <>Sıradaki: <span className="text-moss-50">{sonraki.baslik}</span></> : 'Tüm görevler tamam; yeniden yapın'}
                    </span>
                    <span className="mt-auto block pt-3">
                        <span className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-moss-200">
                            <span>{bitenGorev}/{gorevler.length} görev</span>
                            <span>{yol === 'tuval' ? 'Tuval' : 'Liste'}</span>
                        </span>
                        <Cubuk oran={bitenGorev / gorevler.length} dolu="bg-clay-400" bos="bg-white/10" />
                    </span>
                </button>
            </div>
        </section>
    );
}
