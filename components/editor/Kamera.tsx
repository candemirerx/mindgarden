'use client';

/**
 * Mini galerinin uygulama içi kamerası.
 *
 * Telefonun kamera uygulaması ön kamerada önizlemeyi ayna gibi gösterip
 * fotoğrafı ters kaydediyordu (sağa bakan sola bakıyor görünüyordu). Burada
 * ön kamerada önizleme ayna gibi gösterilir ve fotoğraf da önizlemede
 * göründüğü gibi kaydedilir. Ön/arka kamera değiştirilebilir, peş peşe çekim
 * yapılabilir. Kamera açılamazsa telefonun kamera uygulamasına geçilir.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { Camera, Check, RefreshCcw, X } from 'lucide-react';

type Yon = 'user' | 'environment';
const YON_ANAHTARI = 'nb-kamera-yon';

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
    const [hazir, setHazir] = useState(false);
    const [hata, setHata] = useState('');
    const [sayi, setSayi] = useState(0);
    const [son, setSon] = useState<string | null>(null);
    const [flas, setFlas] = useState(false);

    const durdur = () => { akisRef.current?.getTracks().forEach(t => t.stop()); akisRef.current = null; };

    useEffect(() => {
        let iptal = false;
        setHazir(false); setHata('');
        (async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) throw new Error('desteklenmiyor');
                durdur();
                const akis = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: { facingMode: { ideal: yon }, width: { ideal: 1920 }, height: { ideal: 1440 } }
                });
                if (iptal) { akis.getTracks().forEach(t => t.stop()); return; }
                akisRef.current = akis;
                const v = videoRef.current;
                if (v) { v.srcObject = akis; await v.play().catch(() => { }); }
                setHazir(true);
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

    useEffect(() => () => { durdur(); if (son) URL.revokeObjectURL(son); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

    const cek = useCallback(() => {
        const v = videoRef.current;
        if (!v || !v.videoWidth) return;
        const tuval = document.createElement('canvas');
        tuval.width = v.videoWidth; tuval.height = v.videoHeight;
        const g = tuval.getContext('2d')!;
        // Ön kamera: önizlemede göründüğü gibi (ayna) kaydedilir.
        if (yon === 'user') { g.translate(tuval.width, 0); g.scale(-1, 1); }
        g.drawImage(v, 0, 0, tuval.width, tuval.height);
        setFlas(true); setTimeout(() => setFlas(false), 140);
        try { navigator.vibrate?.(15); } catch { /* yok */ }
        tuval.toBlob(b => {
            if (!b) return;
            onCek(b);
            setSayi(s => s + 1);
            setSon(eski => { if (eski) URL.revokeObjectURL(eski); return URL.createObjectURL(b); });
        }, 'image/jpeg', 0.9);
    }, [yon, onCek]);

    const yonDegistir = () => {
        const yeni: Yon = yon === 'user' ? 'environment' : 'user';
        try { localStorage.setItem(YON_ANAHTARI, yeni); } catch { /* depolama kapalı */ }
        setYon(yeni);
    };

    if (typeof document === 'undefined') return null;
    return createPortal(
        <div id="mini-kamera" data-geri-yonetir="" role="dialog" aria-modal="true" aria-label="Kamera" className="fixed inset-0 z-[130] flex flex-col bg-black text-white">
            <div className="flex shrink-0 items-center justify-between px-3 pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-2">
                <button type="button" onClick={onKapat} aria-label="Kamerayı kapat" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><X size={22} /></button>
                <span className="text-sm font-medium text-white/80">{sayi > 0 ? sayi + ' fotoğraf galeriye eklendi' : yon === 'user' ? 'Ön kamera' : 'Arka kamera'}</span>
                <span className="w-11" />
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden">
                <video ref={videoRef} playsInline muted autoPlay
                    className="absolute inset-0 h-full w-full object-contain"
                    style={{ transform: yon === 'user' ? 'scaleX(-1)' : undefined }} />
                {flas && <div className="absolute inset-0 bg-white/70" />}
                {!hazir && !hata && <p className="absolute inset-0 flex items-center justify-center text-sm text-white/70">Kamera açılıyor…</p>}
                {hata && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
                    <p className="text-sm leading-relaxed text-white/85">{hata}</p>
                    <button type="button" onClick={onSistemKamerasi} className="flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-sand-900"><Camera size={17} /> Telefonun kamerasını aç</button>
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
