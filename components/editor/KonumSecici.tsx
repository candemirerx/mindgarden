'use client';

/**
 * Konum seçici.
 *
 * Bilgisayarda tıklanacak mutlak konumu (0–32767 aralığında x,y) belirlemek
 * için açılan tam ekran ekran. Haritaya dokunulduğunda nokta oraya taşınır ve
 * bağlantı varsa bilgisayarın imleci eş zamanlı olarak aynı yere gider.
 * "Merkeze al" hem noktayı hem imleci ortaya getirir; sağ alttaki yönlük
 * İnce/Orta/Kaba adımlarla noktayı kaydırır. "Bu noktayı kullan" seçimi
 * kaydeder.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Crosshair, MousePointerClick, X } from 'lucide-react';
import { KONUM_MAX, KONUM_MERKEZ, konumYuzdesi, previewPosition, runRemoteMacro, type RemoteMacro, type RemotePrefs } from '@/lib/remoteTools';

/** Yönlük adımları: kaba ayardan ince ayara. */
const ADIMLAR = [
    { id: 'ince', ad: 'İnce', deger: 150 },
    { id: 'orta', ad: 'Orta', deger: 500 },
    { id: 'kaba', ad: 'Kaba', deger: 1600 }
] as const;

type AdimId = typeof ADIMLAR[number]['id'];

function sinirla(deger: number): number {
    return Math.max(0, Math.min(KONUM_MAX, Math.round(deger) || 0));
}

export default function KonumSecici({ baslangicX, baslangicY, prefs, onKaydet, onKapat }: {
    baslangicX: number;
    baslangicY: number;
    prefs: RemotePrefs;
    onKaydet: (x: number, y: number) => void;
    onKapat: () => void;
}) {
    const [x, setX] = useState(() => sinirla(baslangicX));
    const [y, setY] = useState(() => sinirla(baslangicY));
    const [mod, setMod] = useState<'harita' | 'cubuklar'>('harita');
    const [adim, setAdim] = useState<AdimId>('orta');
    const [busy, setBusy] = useState(false);
    /** İmleç önizlemesi yalnızca BLE ya da doğrudan PC bağlantısında çalışır. */
    const onizlemeKapali = prefs.connection === 'wifi';
    const [durum, setDurum] = useState(() => onizlemeKapali
        ? 'İmleç izleme için Bluetooth ya da doğrudan PC bağlantısı gerekli; konumu yine de kaydedebilirsiniz.'
        : '');
    const bekleyen = useRef<{ x: number; y: number } | null>(null);
    const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
    const surukleme = useRef(false);
    /** Yönlük düğmesinde basılı tutma: gecikmeli başlangıç ve tekrar aralığı. */
    const tekrarBekleme = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tekrarAralik = useRef<ReturnType<typeof setInterval> | null>(null);
    /** Güncel konum ref'te tutulur; basılı tutulan tekrarlar bayat state'e düşmez. */
    const konumRef = useRef({ x: sinirla(baslangicX), y: sinirla(baslangicY) });

    useEffect(() => {
        const esc = (olay: KeyboardEvent) => { if (olay.key === 'Escape') onKapat(); };
        window.addEventListener('keydown', esc);
        const eski = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', esc);
            document.body.style.overflow = eski;
            if (zamanlayici.current) clearTimeout(zamanlayici.current);
            if (tekrarBekleme.current) clearTimeout(tekrarBekleme.current);
            if (tekrarAralik.current) clearInterval(tekrarAralik.current);
        };
    }, [onKapat]);

    /** Komut yağmurunu önlemek için bekleyen konum en çok 70 ms'de bir gönderilir. */
    const gonder = useCallback(() => {
        zamanlayici.current = null;
        const hedef = bekleyen.current;
        bekleyen.current = null;
        if (!hedef || onizlemeKapali) return;
        void previewPosition(hedef.x, hedef.y, prefs)
            .catch((hata) => setDurum(hata instanceof Error ? hata.message : 'İmleç taşınamadı.'));
    }, [onizlemeKapali, prefs]);

    const onizle = useCallback((sx: number, sy: number) => {
        if (onizlemeKapali) return;
        bekleyen.current = { x: sx, y: sy };
        if (!zamanlayici.current) zamanlayici.current = setTimeout(gonder, 70);
    }, [gonder, onizlemeKapali]);

    const tasi = (sx: number, sy: number) => {
        const yeniX = sinirla(sx), yeniY = sinirla(sy);
        konumRef.current = { x: yeniX, y: yeniY };
        setX(yeniX);
        setY(yeniY);
        onizle(yeniX, yeniY);
    };

    const haritadan = (olay: React.PointerEvent<HTMLDivElement>) => {
        const kutu = olay.currentTarget.getBoundingClientRect();
        tasi(((olay.clientX - kutu.left) / kutu.width) * KONUM_MAX, ((olay.clientY - kutu.top) / kutu.height) * KONUM_MAX);
    };

    const kaydir = (dx: number, dy: number) => {
        const adimDegeri = ADIMLAR.find((secenek) => secenek.id === adim)?.deger ?? 500;
        tasi(konumRef.current.x + dx * adimDegeri, konumRef.current.y + dy * adimDegeri);
    };

    const merkezeAl = () => {
        tasi(KONUM_MERKEZ, KONUM_MERKEZ);
        setDurum('Nokta ve imleç merkeze alındı.');
    };

    const tekrariDurdur = () => {
        if (tekrarBekleme.current) { clearTimeout(tekrarBekleme.current); tekrarBekleme.current = null; }
        if (tekrarAralik.current) { clearInterval(tekrarAralik.current); tekrarAralik.current = null; }
    };

    /**
     * Parmak kaldırılmadan sürekli kaydırma: ilk adım hemen gider, 320 ms sonra
     * tekrar başlar ve 90 ms'de bir yinelenir. Tek dokunuşta tek adım atılır.
     */
    const tekrarBaslat = (dx: number, dy: number) => {
        tekrariDurdur();
        kaydir(dx, dy);
        tekrarBekleme.current = setTimeout(() => {
            tekrarBekleme.current = null;
            tekrarAralik.current = setInterval(() => kaydir(dx, dy), 90);
        }, 320);
    };

    const testTikla = async () => {
        setBusy(true);
        setDurum('');
        try {
            const makro: RemoteMacro = { id: 'konum-testi', name: 'Konum testi', type: 'position', value: x + ',' + y };
            await runRemoteMacro(makro, prefs);
            setDurum('Bilgisayarda bu konuma tıklandı.');
        } catch (hata) {
            setDurum(hata instanceof Error ? hata.message : 'Tıklama gönderilemedi.');
        } finally {
            setBusy(false);
        }
    };

    const yonDugmesi = (id: string, etiket: string, Icon: typeof ChevronUp, dx: number, dy: number) => (
        <button
            type="button"
            id={id}
            aria-label={etiket + ' · basılı tutunca sürekli kaydırır'}
            title={etiket}
            onPointerDown={(olay) => {
                if (!olay.isPrimary || (olay.pointerType === 'mouse' && olay.button !== 0)) return;
                olay.preventDefault();
                // Parmak düğmenin dışına kaysa da basılı tutma sürsün.
                try { olay.currentTarget.setPointerCapture(olay.pointerId); } catch { /* işaretçi yakalama desteklenmiyorsa geç */ }
                tekrarBaslat(dx, dy);
            }}
            onPointerUp={tekrariDurdur}
            onPointerCancel={tekrariDurdur}
            onLostPointerCapture={tekrariDurdur}
            onBlur={tekrariDurdur}
            onContextMenu={(olay) => olay.preventDefault()}
            onClick={(olay) => { if (olay.detail === 0) kaydir(dx, dy); }}
            className="flex h-11 w-11 touch-none select-none items-center justify-center rounded-full border border-sand-200 bg-white text-sand-700 shadow-soft transition-colors duration-200 hover:border-moss-500/50 hover:text-moss-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40"
        >
            <Icon size={18} aria-hidden="true" />
        </button>
    );

    return (
        <div
            data-konum-secici
            role="dialog"
            aria-modal="true"
            aria-labelledby="konum-secici-basligi"
            className="fixed inset-0 z-[120] overflow-y-auto bg-sand-100"
        >
            <div className="mx-auto w-full max-w-2xl px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-[calc(env(safe-area-inset-top,0px)+1rem)] sm:px-6 sm:py-6">
                <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <h2 id="konum-secici-basligi" className="text-lg font-semibold text-sand-900">Makro konumunu ayarla</h2>
                        <p className="mt-1 text-xs leading-relaxed text-sand-600">
                            Konumu haritaya dokunarak ya da yön düğmeleriyle ayarlayın. Bağlantı varsa imleç eş zamanlı izler.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onKapat}
                        aria-label="Konum seçiciyi kapat"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sand-600 transition-colors hover:bg-sand-200 hover:text-sand-800"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="mt-3 flex gap-1 rounded-xl border border-sand-200 bg-white p-1" role="group" aria-label="Konum ayar biçimi">
                    {([['harita', 'Harita'], ['cubuklar', 'Çubuklar']] as const).map(([id, etiket]) => (
                        <button
                            key={id}
                            id={'konum-mod-' + id}
                            type="button"
                            aria-pressed={mod === id}
                            onClick={() => setMod(id)}
                            className={'min-h-[44px] flex-1 rounded-lg px-3 text-sm font-medium transition-colors ' + (mod === id ? 'bg-moss-700 text-sand-50' : 'text-sand-600 hover:text-sand-800')}
                        >
                            {etiket}
                        </button>
                    ))}
                </div>

                {mod === 'harita' ? (
                    <div
                        id="konum-haritasi"
                        role="application"
                        aria-label="Konum haritası"
                        onPointerDown={(olay) => {
                            if (!olay.isPrimary) return;
                            olay.currentTarget.setPointerCapture(olay.pointerId);
                            surukleme.current = true;
                            haritadan(olay);
                        }}
                        onPointerMove={(olay) => { if (surukleme.current && olay.buttons) haritadan(olay); }}
                        onPointerUp={() => { surukleme.current = false; }}
                        onPointerCancel={() => { surukleme.current = false; }}
                        className="relative mt-3 aspect-[16/10] w-full touch-none overflow-hidden rounded-2xl border border-moss-200 bg-moss-50"
                        style={{
                            backgroundImage:
                                'linear-gradient(to right, rgb(var(--moss-300) / .35) 1px, transparent 1px),' +
                                'linear-gradient(to bottom, rgb(var(--moss-300) / .35) 1px, transparent 1px)',
                            backgroundSize: '16.6667% 25%'
                        }}
                    >
                        <span
                            id="konum-noktasi"
                            aria-hidden="true"
                            className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-moss-700 shadow-card"
                            style={{ left: (x / KONUM_MAX * 100) + '%', top: (y / KONUM_MAX * 100) + '%' }}
                        />
                    </div>
                ) : (
                    <div className="mt-3 space-y-4 rounded-2xl border border-sand-200 bg-white p-4">
                        <label className="block text-xs font-medium text-sand-700">
                            Yatay · {konumYuzdesi(x).toFixed(1)}%
                            <input
                                id="konum-cubuk-x"
                                type="range"
                                min={0}
                                max={KONUM_MAX}
                                value={x}
                                onChange={(olay) => tasi(Number(olay.target.value), konumRef.current.y)}
                                className="mt-2 min-h-[44px] w-full accent-moss-600"
                            />
                        </label>
                        <label className="block text-xs font-medium text-sand-700">
                            Dikey · {konumYuzdesi(y).toFixed(1)}%
                            <input
                                id="konum-cubuk-y"
                                type="range"
                                min={0}
                                max={KONUM_MAX}
                                value={y}
                                onChange={(olay) => tasi(konumRef.current.x, Number(olay.target.value))}
                                className="mt-2 min-h-[44px] w-full accent-moss-600"
                            />
                        </label>
                    </div>
                )}

                <p id="konum-deger" className="mt-3 text-sm font-medium text-sand-800">X %{konumYuzdesi(x).toFixed(1)} · Y %{konumYuzdesi(y).toFixed(1)}</p>

                <div className="mt-3 flex flex-wrap items-start gap-4">
                    <div className="min-w-0 flex-1 space-y-3">
                        <button type="button" id="konum-merkez" onClick={merkezeAl} className="btn btn-secondary min-h-[44px] px-4 text-sm">
                            <Crosshair size={16} /> Merkeze al
                        </button>
                        <div className="flex gap-1 rounded-xl border border-sand-200 bg-white p-1" role="group" aria-label="Adım büyüklüğü">
                            {ADIMLAR.map((secenek) => (
                                <button
                                    key={secenek.id}
                                    id={'konum-adim-' + secenek.id}
                                    type="button"
                                    aria-pressed={adim === secenek.id}
                                    onClick={() => setAdim(secenek.id)}
                                    className={'min-h-[44px] flex-1 rounded-lg px-2 text-sm font-medium transition-colors ' + (adim === secenek.id ? 'bg-moss-700 text-sand-50' : 'text-sand-600 hover:text-sand-800')}
                                >
                                    {secenek.ad}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs leading-relaxed text-sand-600">
                            Yönlük noktayı ve imleci birlikte kaydırır; düğmeyi <span className="font-medium text-sand-700">basılı tutunca sürekli</span> kayar,
                            adım seçimi {ADIMLAR.find((secenek) => secenek.id === adim)?.deger} birim.
                        </p>
                    </div>

                    <div id="konum-yonluk" className="grid h-[168px] w-[168px] shrink-0 grid-cols-3 grid-rows-3 place-items-center rounded-full border border-sand-200 bg-sand-50 p-2">
                        <span aria-hidden="true" />
                        {yonDugmesi('konum-yon-yukari', 'Noktayı yukarı kaydır', ChevronUp, 0, -1)}
                        <span aria-hidden="true" />
                        {yonDugmesi('konum-yon-sol', 'Noktayı sola kaydır', ChevronLeft, -1, 0)}
                        <span aria-hidden="true" className="h-11 w-11 rounded-full bg-sand-200/60" />
                        {yonDugmesi('konum-yon-sag', 'Noktayı sağa kaydır', ChevronRight, 1, 0)}
                        <span aria-hidden="true" />
                        {yonDugmesi('konum-yon-asagi', 'Noktayı aşağı kaydır', ChevronDown, 0, 1)}
                        <span aria-hidden="true" />
                    </div>
                </div>

                <button
                    type="button"
                    id="konum-test-tikla"
                    disabled={busy}
                    onClick={() => void testTikla()}
                    className="btn btn-secondary mt-3 min-h-[44px] w-full px-4 text-sm"
                >
                    <MousePointerClick size={16} /> PC'de bu konuma tıkla
                </button>

                {durum && <p id="konum-durum" role="status" className="mt-3 text-xs leading-relaxed text-sand-700">{durum}</p>}

                <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" id="konum-vazgec" onClick={onKapat} className="btn btn-ghost min-h-[44px] px-4 text-sm">
                        Vazgeç
                    </button>
                    <button type="button" id="konum-kullan" onClick={() => onKaydet(x, y)} className="btn btn-primary min-h-[44px] flex-1 px-4 text-sm">
                        <Check size={16} /> Bu noktayı kullan
                    </button>
                </div>
            </div>
        </div>
    );
}
