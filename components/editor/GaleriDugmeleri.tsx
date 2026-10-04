'use client';

/**
 * Editörün sol altındaki üç simge: mini galeri, kamera (çekilen fotoğraf
 * doğrudan galeriye) ve telefon galerisinden aktarım. Kayıt durumu artık burada
 * yazmaz; yalnız kayıt başarısızsa küçük bir uyarı noktası görünür.
 */
import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, GalleryThumbnails } from 'lucide-react';
import { dosyalariGaleriyeEkle, useMiniGaleri } from '@/lib/miniGaleri';
import MiniGaleri from './MiniGaleri';

const SIMGE = 'relative flex h-11 w-11 items-center justify-center rounded-xl text-sand-600 transition-colors hover:bg-sand-100 hover:text-sand-800 active:scale-95 disabled:opacity-40';

export default function GaleriDugmeleri({ notId, editorMetni, uyari }: { notId: string; editorMetni: string; uyari?: string }) {
    const { ogeler } = useMiniGaleri(notId);
    const [acik, setAcik] = useState(false);
    const [ileti, setIleti] = useState('');
    const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
    const kameraRef = useRef<HTMLInputElement>(null);
    const galeriRef = useRef<HTMLInputElement>(null);
    useEffect(() => () => { if (zamanlayici.current) clearTimeout(zamanlayici.current); }, []);

    const goster = (metin: string) => {
        if (zamanlayici.current) clearTimeout(zamanlayici.current);
        setIleti(metin);
        zamanlayici.current = setTimeout(() => setIleti(''), 2500);
    };
    const ekle = async (dosyalar: FileList | null) => {
        if (!dosyalar?.length) return;
        try {
            const n = await dosyalariGaleriyeEkle(notId, Array.from(dosyalar));
            goster(n ? n + ' görsel mini galeriye eklendi' : 'Görsel bulunamadı');
        } catch (e) { goster(e instanceof Error ? e.message : 'Eklenemedi'); }
    };

    return <div className="studio-galeri flex min-w-0 items-center gap-0.5 -ml-2">
        <button type="button" id="studio-mini-galeri" onClick={() => setAcik(true)} disabled={!notId} aria-label={'Mini galeri' + (ogeler.length ? ' (' + ogeler.length + ' öğe)' : '')} title="Mini galeri" className={SIMGE}>
            <GalleryThumbnails size={19} />
            {ogeler.length > 0 && <span aria-hidden="true" className="absolute right-0.5 top-1 min-w-[1.05rem] rounded-full bg-moss-600 px-1 text-center text-[10px] font-semibold leading-[1.05rem] text-white">{ogeler.length > 99 ? '99+' : ogeler.length}</span>}
        </button>
        <button type="button" id="studio-kamera" onClick={() => kameraRef.current?.click()} disabled={!notId} aria-label="Fotoğraf çek ve mini galeriye ekle" title="Fotoğraf çek" className={SIMGE}>
            <Camera size={19} />
        </button>
        <button type="button" id="studio-telefon-galerisi" onClick={() => galeriRef.current?.click()} disabled={!notId} aria-label="Telefon galerisinden mini galeriye aktar" title="Telefon galerisinden aktar" className={SIMGE}>
            <ImagePlus size={19} />
        </button>
        {(ileti || uyari) && <span role="status" className={'ml-1 truncate text-xs ' + (ileti ? 'text-moss-700' : 'text-berry-700')}>{ileti || uyari}</span>}
        <input ref={kameraRef} type="file" accept="image/*" capture="environment" hidden onChange={e => { void ekle(e.target.files); e.target.value = ''; }} />
        <input ref={galeriRef} type="file" accept="image/*" multiple hidden onChange={e => { void ekle(e.target.files); e.target.value = ''; }} />
        {acik && <MiniGaleri notId={notId} editorMetni={editorMetni} onKapat={() => setAcik(false)} />}
    </div>;
}
