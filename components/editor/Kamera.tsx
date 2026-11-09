'use client';

/**
 * Mini galerinin uygulama içi kamerası.
 *
 * Telefonun kamera uygulaması ön kamerada önizlemeyi ayna gibi gösterip
 * fotoğrafı ters kaydediyordu (sağa bakan sola bakıyor görünüyordu). Burada
 * ön kamerada önizleme ayna gibi gösterilir ve fotoğraf da önizlemede
 * göründüğü gibi kaydedilir. Ön/arka kamera değiştirilebilir, peş peşe çekim
 * yapılabilir. Kamera açılamazsa telefonun kamera uygulamasına geçilir.
 *
 * Hızlı açılış: seçilen kameranın kimliği hatırlanır (yönüne göre aramak
 * yerine doğrudan o kamera istenir), açılırken son karenin bulanık hâli
 * gösterilir ve kamera kapatıldıktan sonra kısa bir süre açık tutulur; hemen
 * geri dönülürse beklemeden açılır.
 *
 * Yakınlaştırma: telefon destekliyorsa kameranın kendi yakınlaştırması
 * (zoom yeteneği) kullanılır; desteklemiyorsa görüntü kırpılarak dijital
 * yakınlaştırma yapılır. İki parmakla sıkıştırma, kaydırma çubuğu ve hızlı
 * 1×/2×/5× düğmeleri vardır.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { Camera, Check, Loader2, RefreshCcw, X } from 'lucide-react';

type Yon = 'user' | 'environment';
const YON_ANAHTARI = 'nb-kamera-yon';
const CIHAZ_ANAHTARI = 'nb-kamera-cihaz-';
/** Kapatınca kameranın açık tutulduğu süre (hızlı yeniden açılış için). */
const SICAK_TUTMA_MS = 8000;
const DIJITAL_EN_COK = 8;

type Yetenek = { min: number; max: number; step: number; donanim: boolean };

/* Sayfa ömrü boyunca paylaşılan durum: açık tutulan akış ve son kare. */
let sicak: { akis: MediaStream; yon: Yon; zaman: ReturnType<typeof setTimeout> } | null = null;
let sonKare: { yon: Yon; url: string } | null = null;

function sicakBirak() {
    if (!sicak) return;
    clearTimeout(sicak.zaman);
    sicak.akis.getTracks().forEach(t => t.stop());
    sicak = null;
}
function sicakAl(yon: Yon): MediaStream | null {
    if (!sicak || sicak.yon !== yon || !sicak.akis.getVideoTracks().some(t => t.readyState === 'live')) { sicakBirak(); return null; }
    clearTimeout(sicak.zaman);
    const akis = sicak.akis;
    sicak = null;
    return akis;
}
// Uygulama arka plana geçince açık tutulan kamera hemen kapanır.
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden) sicakBirak(); });

let isindi = false;
/**
 * Kamerayı açmadan medya katmanını ısıtır (cihaz listesini okur); kamera ışığı
 * yanmaz, izin sorulmaz. Editör açılınca çağrılır; ilk açılıştaki gecikmeyi kısaltır.
 */
export function kameraHazirla(): void {
    if (isindi || typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    isindi = true;
    void navigator.mediaDevices.enumerateDevices().catch(() => { });
}

async function kameraAc(yon: Yon): Promise<MediaStream> {
    const hazir = sicakAl(yon);
    if (hazir) return hazir;
    let kimlik: string | null = null;
    try { kimlik = localStorage.getItem(CIHAZ_ANAHTARI + yon); } catch { /* yok */ }
    const boyut = { width: { ideal: 1920 }, height: { ideal: 1440 } };
    // zoom: true, tarayıcıdan kameranın yakınlaştırma yeteneğini de ister; desteklenmezse yok sayılır.
    const denemeler: MediaTrackConstraints[] = [
        ...(kimlik ? [{ deviceId: { exact: kimlik }, ...boyut, zoom: true } as MediaTrackConstraints] : []),
        { facingMode: { ideal: yon }, ...boyut, zoom: true } as MediaTrackConstraints,
        { facingMode: { ideal: yon }, ...boyut }
    ];
    let sonHata: unknown;
    for (const video of denemeler) {
        try {
            const akis = await navigator.mediaDevices.getUserMedia({ audio: false, video });
            const id = akis.getVideoTracks()[0]?.getSettings().deviceId;
            try { if (id) localStorage.setItem(CIHAZ_ANAHTARI + yon, id); } catch { /* yok */ }
            return akis;
        } catch (e) {
            sonHata = e;
            const ad = e instanceof DOMException ? e.name : '';
            if (ad === 'NotAllowedError' || ad === 'SecurityError') throw e;
            if (ad === 'NotFoundError' || ad === 'OverconstrainedError') try { localStorage.removeItem(CIHAZ_ANAHTARI + yon); } catch { /* yok */ }
        }
    }
    throw sonHata;
}

const yuvarla = (v: number, adim: number) => Math.round(v / adim) * adim;
const etiket = (z: number) => (z >= 10 ? Math.round(z) : Math.round(z * 10) / 10).toString().replace('.', ',') + '×';

export default function Kamera({ onCek, onKapat, onSistemKamerasi, geriTusu = true }: {
    /** Çekilen her fotoğraf (JPEG). */
    onCek: (foto: Blob) => void;
    onKapat: () => void;
    /** Uygulama içi kamera açılamazsa telefonun kamera uygulamasını açar. */
    onSistemKamerasi: () => void;
    /** Android geri tuşunu kamera mı dinlesin (galerinin içinden açılınca galeri yönetir). */
    geriTusu?: boolean;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const akisRef = useRef<MediaStream | null>(null);
    const [yon, setYon] = useState<Yon>(() => {
        try { return localStorage.getItem(YON_ANAHTARI) === 'user' ? 'user' : 'environment'; } catch { return 'environment'; }
    });
    const yonRef = useRef(yon);
    yonRef.current = yon;
    const [hazir, setHazir] = useState(false);
    const [hata, setHata] = useState('');
    const [sayi, setSayi] = useState(0);
    const [son, setSon] = useState<string | null>(null);
    const [flas, setFlas] = useState(false);
    const [yetenek, setYetenek] = useState<Yetenek>({ min: 1, max: DIJITAL_EN_COK, step: 0.1, donanim: false });
    const [zoom, setZoom] = useState(1);
    const zoomRef = useRef(1);
    const [zoomGoster, setZoomGoster] = useState(false);
    const gosterZaman = useRef<ReturnType<typeof setTimeout>>(undefined);

    /** Son karenin küçük bir kopyası: bir dahaki açılışta bekleme ekranında gösterilir. */
    const kareSakla = () => {
        const v = videoRef.current;
        if (!v || !v.videoWidth) return;
        try {
            const t = document.createElement('canvas');
            const o = 160 / v.videoWidth;
            t.width = 160; t.height = Math.round(v.videoHeight * o);
            t.getContext('2d')!.drawImage(v, 0, 0, t.width, t.height);
            sonKare = { yon: yonRef.current, url: t.toDataURL('image/jpeg', 0.6) };
        } catch { /* yok */ }
    };
    /** Akışı bırakır; sicak ise kısa süre açık tutar ki hemen geri dönünce beklemeden açılsın. */
    const birak = (sicakTut: boolean) => {
        const akis = akisRef.current;
        akisRef.current = null;
        if (!akis) return;
        if (sicakTut && !document.hidden) {
            sicakBirak();
            sicak = { akis, yon: yonRef.current, zaman: setTimeout(sicakBirak, SICAK_TUTMA_MS) };
        } else akis.getTracks().forEach(t => t.stop());
    };

    useEffect(() => {
        let iptal = false;
        setHazir(false); setHata('');
        (async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) throw new Error('desteklenmiyor');
                const akis = await kameraAc(yon);
                if (iptal) { akis.getTracks().forEach(t => t.stop()); return; }
                akisRef.current = akis;
                const iz = akis.getVideoTracks()[0];
                const yet = (iz?.getCapabilities?.() as MediaTrackCapabilities & { zoom?: { min: number; max: number; step?: number } } | undefined)?.zoom;
                const donanim = !!yet && yet.max > yet.min;
                setYetenek(donanim ? { min: yet!.min, max: yet!.max, step: yet!.step || 0.1, donanim: true } : { min: 1, max: DIJITAL_EN_COK, step: 0.1, donanim: false });
                const baslangic = donanim ? Math.max(yet!.min, Math.min(yet!.max, 1)) : 1;
                zoomRef.current = baslangic; setZoom(baslangic);
                if (donanim) void iz.applyConstraints({ advanced: [{ zoom: baslangic } as MediaTrackConstraintSet] }).catch(() => { });
                const v = videoRef.current;
                if (v) {
                    v.srcObject = akis;
                    // İlk kare gelir gelmez göster; play() sözünü beklemek gecikme yaratıyordu.
                    v.onloadeddata = () => { if (!iptal) setHazir(true); };
                    void v.play().catch(() => { });
                    if (v.readyState >= 2) setHazir(true);
                }
            } catch (e) {
                if (iptal) return;
                const ad = e instanceof DOMException ? e.name : '';
                setHata(ad === 'NotAllowedError' || ad === 'SecurityError'
                    ? 'Kamera izni verilmedi. Telefon ayarlarından Not Bahçesi’ne kamera izni verin ya da telefonun kamera uygulamasını kullanın.'
                    : 'Kamera açılamadı. Telefonun kamera uygulamasıyla çekebilirsiniz.');
            }
        })();
        return () => { iptal = true; };
    }, [yon]);

    useEffect(() => () => { kareSakla(); birak(true); if (son) URL.revokeObjectURL(son); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Android geri tuşu ve Esc kamerayı kapatır.
    const kapatRef = useRef(onKapat);
    kapatRef.current = onKapat;
    useEffect(() => {
        const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') kapatRef.current(); };
        window.addEventListener('keydown', tus);
        let kaldir: (() => void) | undefined; let bitti = false;
        if (geriTusu && Capacitor.isNativePlatform()) void import('@capacitor/app').then(async ({ App }) => {
            const d = await App.addListener('backButton', () => kapatRef.current());
            if (bitti) void d.remove(); else kaldir = () => void d.remove();
        });
        return () => { bitti = true; window.removeEventListener('keydown', tus); kaldir?.(); };
    }, [geriTusu]);

    /** Yakınlaştırmayı uygular: donanım varsa kameraya, yoksa önizlemeye (dijital). */
    const zoomAyarla = useCallback((deger: number) => {
        const z = Math.max(yetenek.min, Math.min(yetenek.max, yuvarla(deger, yetenek.step)));
        if (Math.abs(z - zoomRef.current) < 1e-6) return;
        zoomRef.current = z; setZoom(z);
        setZoomGoster(true); clearTimeout(gosterZaman.current); gosterZaman.current = setTimeout(() => setZoomGoster(false), 1600);
        if (yetenek.donanim) {
            const iz = akisRef.current?.getVideoTracks()[0];
            void iz?.applyConstraints({ advanced: [{ zoom: z } as MediaTrackConstraintSet] }).catch(() => { });
        }
    }, [yetenek]);

    // İki parmakla sıkıştırarak yakınlaştırma.
    const parmaklar = useRef(new Map<number, { x: number; y: number }>());
    const sikistirma = useRef<{ mesafe: number; zoom: number } | null>(null);
    const mesafe = () => { const [a, b] = [...parmaklar.current.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0; };
    const parmakBas = (e: React.PointerEvent) => {
        parmaklar.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (parmaklar.current.size === 2) sikistirma.current = { mesafe: mesafe(), zoom: zoomRef.current };
    };
    const parmakOynat = (e: React.PointerEvent) => {
        if (!parmaklar.current.has(e.pointerId)) return;
        parmaklar.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const s = sikistirma.current;
        if (s && parmaklar.current.size === 2 && s.mesafe > 0) zoomAyarla(s.zoom * (mesafe() / s.mesafe));
    };
    const parmakKaldir = (e: React.PointerEvent) => {
        parmaklar.current.delete(e.pointerId);
        if (parmaklar.current.size < 2) sikistirma.current = null;
    };

    const cek = useCallback(() => {
        const v = videoRef.current;
        if (!v || !v.videoWidth) return;
        // Dijital yakınlaştırmada görüntünün ortası kırpılır; donanımda kare zaten yakın.
        const d = yetenek.donanim ? 1 : zoomRef.current;
        const kw = v.videoWidth / d, kh = v.videoHeight / d;
        const kx = (v.videoWidth - kw) / 2, ky = (v.videoHeight - kh) / 2;
        const tuval = document.createElement('canvas');
        tuval.width = Math.round(kw); tuval.height = Math.round(kh);
        const g = tuval.getContext('2d')!;
        // Ön kamera: önizlemede göründüğü gibi (ayna) kaydedilir.
        if (yon === 'user') { g.translate(tuval.width, 0); g.scale(-1, 1); }
        g.drawImage(v, kx, ky, kw, kh, 0, 0, tuval.width, tuval.height);
        setFlas(true); setTimeout(() => setFlas(false), 140);
        try { navigator.vibrate?.(15); } catch { /* yok */ }
        tuval.toBlob(b => {
            if (!b) return;
            onCek(b);
            setSayi(s => s + 1);
            setSon(eski => { if (eski) URL.revokeObjectURL(eski); return URL.createObjectURL(b); });
        }, 'image/jpeg', 0.9);
    }, [yon, onCek, yetenek.donanim]);

    const yonDegistir = () => {
        const yeni: Yon = yon === 'user' ? 'environment' : 'user';
        try { localStorage.setItem(YON_ANAHTARI, yeni); } catch { /* depolama kapalı */ }
        kareSakla();
        birak(false);
        setYon(yeni);
    };

    // Hızlı yakınlaştırma düğmeleri: kameranın sınırları içindeki 1×, 2×, 5× (ve en yakın).
    const hizli = [yetenek.min < 1 ? yetenek.min : null, 1, 2, 5, 10].filter((z): z is number => z !== null && z >= yetenek.min - 1e-6 && z <= yetenek.max + 1e-6);
    const dijitalOlcek = yetenek.donanim ? 1 : zoom;
    const bekleme = sonKare && sonKare.yon === yon ? sonKare.url : null;

    if (typeof document === 'undefined') return null;
    return createPortal(
        <div id="mini-kamera" data-geri-yonetir="" role="dialog" aria-modal="true" aria-label="Kamera" className="fixed inset-0 z-[130] flex flex-col bg-black text-white">
            <div className="flex shrink-0 items-center justify-between px-3 pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-2">
                <button type="button" onClick={onKapat} aria-label="Kamerayı kapat" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><X size={22} /></button>
                <span className="text-sm font-medium text-white/80">{sayi > 0 ? sayi + ' fotoğraf galeriye eklendi' : yon === 'user' ? 'Ön kamera' : 'Arka kamera'}</span>
                <span className="w-11" />
            </div>
            <div className="relative min-h-0 flex-1 touch-none overflow-hidden"
                onPointerDown={parmakBas} onPointerMove={parmakOynat} onPointerUp={parmakKaldir} onPointerCancel={parmakKaldir}>
                {/* Açılırken son karenin bulanık hâli: siyah ekranda beklemek yerine. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {!hazir && bekleme && <img src={bekleme} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-contain opacity-60 blur-xl" style={{ transform: yon === 'user' ? 'scaleX(-1)' : undefined }} />}
                <video ref={videoRef} playsInline muted autoPlay
                    className={'absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ' + (hazir ? 'opacity-100' : 'opacity-0')}
                    style={{ transform: (yon === 'user' ? 'scaleX(-1) ' : '') + (dijitalOlcek !== 1 ? `scale(${dijitalOlcek})` : '') || undefined }} />
                {flas && <div className="absolute inset-0 bg-white/70" />}
                {!hazir && !hata && <p className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-white/80"><Loader2 size={18} className="animate-spin" /> Kamera açılıyor…</p>}
                {hata && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
                    <p className="text-sm leading-relaxed text-white/85">{hata}</p>
                    <button type="button" onClick={onSistemKamerasi} className="flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-sand-900"><Camera size={17} /> Telefonun kamerasını aç</button>
                </div>}

                {hazir && !hata && <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-2.5">
                    {zoomGoster && <span className="rounded-full bg-black/55 px-3 py-1 text-sm font-semibold tabular-nums">{etiket(zoom)}</span>}
                    <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/45 p-1 backdrop-blur" role="group" aria-label="Yakınlaştırma">
                        {hizli.map(z => {
                            // Seçili düğme: şu anki yakınlaştırmanın ulaştığı en büyük basamak.
                            const secili = z === [...hizli].reverse().find(h => zoom >= h - 0.05);
                            return <button key={z} type="button" onClick={() => zoomAyarla(z)} aria-label={etiket(z) + ' yakınlaştır'} aria-pressed={secili}
                                className={'flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-[13px] font-semibold tabular-nums transition-colors ' + (secili ? 'bg-white text-black' : 'text-white/90')}>
                                {secili ? etiket(zoom) : etiket(z)}
                            </button>;
                        })}
                    </div>
                    <input type="range" aria-label="Yakınlaştırma düzeyi" min={yetenek.min} max={yetenek.max} step={yetenek.step} value={zoom}
                        onChange={e => zoomAyarla(Number(e.target.value))}
                        className="pointer-events-auto h-8 w-[min(78%,320px)] accent-white" />
                </div>}
            </div>
            <div className="flex shrink-0 items-center justify-between px-8 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-5">
                {/* Son çekilen fotoğraf */}
                <span className="h-12 w-12 overflow-hidden rounded-xl border-2 border-white/40 bg-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {son && <img src={son} alt="Son çekilen" className="h-full w-full object-cover" />}
                </span>
                <button type="button" id="kamera-cek" onClick={cek} disabled={!hazir} aria-label="Fotoğraf çek"
                    className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-4 border-white/90 disabled:opacity-40">
                    <span className="h-[58px] w-[58px] rounded-full bg-white transition-transform active:scale-90" />
                </button>
                {sayi > 0
                    ? <button type="button" onClick={onKapat} aria-label="Bitti" className="flex h-12 w-12 items-center justify-center rounded-full bg-moss-600"><Check size={22} /></button>
                    : <button type="button" onClick={yonDegistir} disabled={!!hata} aria-label="Ön ve arka kamera arasında geç" className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 disabled:opacity-40"><RefreshCcw size={20} /></button>}
            </div>
            {sayi > 0 && <button type="button" onClick={yonDegistir} aria-label="Ön ve arka kamera arasında geç"
                className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+64px)] flex h-11 w-11 items-center justify-center rounded-full bg-white/15"><RefreshCcw size={19} /></button>}
        </div>,
        document.body
    );
}
