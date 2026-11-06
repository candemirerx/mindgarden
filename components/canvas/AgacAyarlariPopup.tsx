'use client';

/**
 * Ağacın kendi ayarları penceresi (Ağaç Yönetimi → Ağaçlar → kalem düğmesi).
 *
 * Ağacı yeniden adlandırma burada; "Yenileri numaralandır" bölümü bu ağaçta
 * adı boş bırakılarak eklenen dal ve yaprakların adını belirler. Kurallar
 * cihazda tutulur (bkz. lib/agacAyarlari.ts); her ağacın kuralı ayrıdır.
 */
import { useEffect, useRef, useState } from 'react';
import { Hash, Pencil, X } from 'lucide-react';
import { cx } from '@/components/ui/settings';
import type { MindNode } from '@/lib/types';
import { agacAyarlariKaydet, useAgacAyarlari, type AdKurali, type AgacAyarlari } from '@/lib/agacAyarlari';

const AD_BICIMLERI: { id: 'numarali' | 'sabit'; ad: string }[] = [{ id: 'numarali', ad: 'Numaralı' }, { id: 'sabit', ad: 'Sabit' }];
const AD_ORNEKLERI: Record<'dal' | 'yaprak', string> = { dal: 'İş yeri', yaprak: 'Görev' };

/** Bölmeli seçici: Numaralı / Sabit. Tuval ayarlarındakiyle aynı görünüm. */
function BicimSecici({ tur, numarali, sec }: { tur: 'dal' | 'yaprak'; numarali: boolean; sec: (v: 'numarali' | 'sabit') => void }) {
    return (
        <div role="radiogroup" aria-label={tur + ' adı biçimi'} className="grid shrink-0 grid-cols-2 gap-0.5 rounded-xl bg-sand-100 p-0.5"
            style={{ width: 160 }}>
            {AD_BICIMLERI.map(s => (
                <button key={s.id} type="button" role="radio" aria-checked={numarali === (s.id === 'numarali')} onClick={() => sec(s.id)}
                    className={cx('min-h-10 rounded-[10px] px-2 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40',
                        numarali === (s.id === 'numarali') ? 'bg-white text-sand-900 shadow-soft' : 'text-sand-600 hover:text-sand-900')}>
                    {s.ad}
                </button>
            ))}
        </div>
    );
}

/**
 * Boş ad kuralı satırı: bu ağaçta adı boş bırakılarak eklenen notun adı.
 * Numaralı seçilirse aynı seviyedeki notlara bakılarak "İş yeri 1",
 * "İş yeri 2"... diye devam eder.
 */
function KuralSatiri({ tur, agacId, ayarlar }: { tur: 'dal' | 'yaprak'; agacId: string; ayarlar: AgacAyarlari }) {
    const kural = ayarlar[tur] ?? { metin: '', numarali: true };
    const kaydet = (degisim: Partial<AdKurali>) => {
        const yeni = { ...kural, ...degisim };
        const yenileri = { ...ayarlar };
        if (!yeni.metin && yeni.numarali) delete yenileri[tur]; else yenileri[tur] = yeni;
        agacAyarlariKaydet(agacId, yenileri);
    };
    const metin = kural.metin.trim();
    const ornek = metin
        ? (kural.numarali ? `${metin} 1, ${metin} 2, ${metin} 3…` : `${metin}, ${metin}…`)
        : `Uygulamanın varsayılanı (sıra numarası ya da "Yeni ${tur === 'dal' ? 'Dal' : 'Yaprak'}")`;
    const id = 'agac-bos-ad-' + tur;
    return (
        <div className="flex flex-col gap-2 py-3.5">
            <label htmlFor={id} className="text-sm font-semibold text-sand-900">{tur === 'dal' ? 'Dal' : 'Yaprak'}</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input id={id} type="text" value={kural.metin} maxLength={60} placeholder={'Örn. ' + AD_ORNEKLERI[tur]}
                    onChange={e => kaydet({ metin: e.target.value })}
                    className="min-h-[44px] w-full min-w-0 flex-1 rounded-xl border border-sand-200 bg-white px-3 text-sm text-sand-900 placeholder:text-sand-400 focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-500/30" />
                <BicimSecici tur={tur} numarali={kural.numarali} sec={v => kaydet({ numarali: v === 'numarali' })} />
            </div>
            <p className="text-xs leading-snug text-sand-600" aria-live="polite">Boş bırakınca: {ornek}</p>
        </div>
    );
}

export function AgacAyarlariPopup({ agac, onKapat, onYenidenAdlandir }: {
    agac: MindNode;
    onKapat: () => void;
    onYenidenAdlandir: (agacId: string, yeniAd: string) => void;
}) {
    const ayarlar = useAgacAyarlari(agac.id);
    const [ad, setAd] = useState(agac.title);
    const kartRef = useRef<HTMLDivElement>(null);

    // Odağı pencerede tut; Tab arka plandaki arayüze kaçmasın.
    useEffect(() => {
        const klavye = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            const odaklanabilir = kartRef.current?.querySelectorAll<HTMLElement>('button, input');
            if (!odaklanabilir || odaklanabilir.length === 0) return;
            const ilk = odaklanabilir[0], son = odaklanabilir[odaklanabilir.length - 1];
            if (e.shiftKey && document.activeElement === ilk) { e.preventDefault(); son.focus(); }
            else if (!e.shiftKey && document.activeElement === son) { e.preventDefault(); ilk.focus(); }
        };
        window.addEventListener('keydown', klavye);
        return () => window.removeEventListener('keydown', klavye);
    }, []);

    const adKaydet = () => {
        const yeni = ad.trim();
        if (yeni && yeni !== agac.title) onYenidenAdlandir(agac.id, yeni);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-bark-950/45 p-4 backdrop-blur-sm animate-fade-in" onClick={onKapat}>
            <div ref={kartRef} role="dialog" aria-modal="true" aria-labelledby="agac-ayarlari-basligi"
                className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-pop animate-scale-in"
                onClick={e => e.stopPropagation()}>
                <div className="flex shrink-0 items-center gap-3 border-b border-sand-200 px-5 py-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay-100 text-clay-600" aria-hidden="true">
                        <Pencil size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h3 id="agac-ayarlari-basligi" className="text-[15px] font-semibold leading-tight text-sand-900">Ağaç ayarları</h3>
                        <p className="truncate text-xs text-sand-600">{agac.title || 'Başlıksız'}</p>
                    </div>
                    <button type="button" onClick={onKapat} aria-label="Ağaç ayarlarını kapat"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sand-500 transition-colors hover:bg-sand-100 hover:text-sand-800">
                        <X size={19} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                    <label htmlFor="agac-adi" className="text-sm font-semibold text-sand-900">Ağacın adı</label>
                    <input id="agac-adi" type="text" value={ad} maxLength={120} autoFocus
                        onChange={e => setAd(e.target.value)}
                        onBlur={adKaydet}
                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        className="mt-2 min-h-[44px] w-full rounded-xl border border-sand-200 bg-white px-3 text-sm text-sand-900 focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-500/30" />

                    <div className="mt-5 rounded-2xl border border-sand-200 bg-sand-50 px-4">
                        <div className="flex items-start gap-3 py-3.5">
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-moss-100 text-moss-700" aria-hidden="true">
                                <Hash size={15} />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-sand-900">Yenileri numaralandır</p>
                                <p className="mt-0.5 text-xs leading-snug text-sand-600">
                                    Bu ağaçta dal ya da yaprak eklerken adı boş bırakırsanız verilecek ad. Numaralı seçilirse
                                    aynı yerdeki notlara bakılarak 1, 2, 3… diye devam eder; Sabit seçilirse ad hep aynı kalır.
                                    Boş kutu uygulamanın varsayılanını kullanır.
                                </p>
                            </div>
                        </div>
                        <div className="divide-y divide-sand-200 border-t border-sand-200">
                            <KuralSatiri tur="dal" agacId={agac.id} ayarlar={ayarlar} />
                            <KuralSatiri tur="yaprak" agacId={agac.id} ayarlar={ayarlar} />
                        </div>
                    </div>
                </div>

                <div className="shrink-0 border-t border-sand-200 px-5 py-3.5 pb-[max(env(safe-area-inset-bottom,0px),0.875rem)]">
                    <button type="button" onClick={() => { adKaydet(); onKapat(); }} className="btn btn-primary min-h-[44px] w-full text-sm">Tamam</button>
                </div>
            </div>
        </div>
    );
}
