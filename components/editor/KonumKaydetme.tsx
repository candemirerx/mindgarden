'use client';

/**
 * Konum makrosu kaydedilmeden önce: konum hangi ekrana göre ve hangi köşeye
 * sabitlenerek saklansın?
 *
 * Örnek: evdeki bilgisayarda sekme kapatma düğmesine gidip "sağ üst köşeye"
 * sabitleyerek kaydedersiniz; işteki farklı boyuttaki ekranda da konum sağ
 * üstten aynı uzaklıkta kalır ve yine sekme kapatmaya tıklar.
 */
import { useEffect, useState } from 'react';
import { Check, Loader2, Monitor } from 'lucide-react';
import { CAPA_ADI, YAYGIN_EKRANLAR, bilgisayarEkrani, enYakinCapa, konumPikseli, type KonumCapasi, type KonumEkrani, type RemotePrefs } from '@/lib/remoteTools';

const CAPALAR: KonumCapasi[] = ['sol-ust', 'sag-ust', 'sol-alt', 'sag-alt', 'oran'];

export default function KonumKaydetme({ x, y, prefs, baslangic, onKaydet, onGeri }: {
    x: number; y: number; prefs: RemotePrefs;
    /** Makronun önceki ekran bilgisi (düzenlemede). */
    baslangic?: KonumEkrani;
    onKaydet: (ekran: KonumEkrani) => void;
    onGeri: () => void;
}) {
    const [bagli, setBagli] = useState<{ w: number; h: number } | null | 'bekliyor'>('bekliyor');
    const [kaynak, setKaynak] = useState<'bagli' | 'liste' | 'ozel'>(baslangic ? 'liste' : 'bagli');
    const [secili, setSecili] = useState(() => baslangic ? baslangic.w + 'x' + baslangic.h : '1920x1080');
    const [ozelW, setOzelW] = useState(String(baslangic?.w ?? 1920));
    const [ozelH, setOzelH] = useState(String(baslangic?.h ?? 1080));
    const onerilen = enYakinCapa(x, y);
    const [capa, setCapa] = useState<KonumCapasi>(baslangic?.capa ?? onerilen);

    useEffect(() => {
        let iptal = false;
        void bilgisayarEkrani(prefs).then(b => {
            if (iptal) return;
            setBagli(b);
            // Bağlı bilgisayarın ekranı okunamazsa listeden seçime geçilir.
            if (!b && !baslangic) setKaynak('liste');
            if (b && baslangic && b.w === baslangic.w && b.h === baslangic.h) setKaynak('bagli');
        });
        return () => { iptal = true; };
    }, [prefs, baslangic]);

    // Listede olmayan kayıtlı boyut "özel" sayılır.
    useEffect(() => {
        if (baslangic && !YAYGIN_EKRANLAR.some(e => e.w === baslangic.w && e.h === baslangic.h)) setKaynak(k => k === 'liste' ? 'ozel' : k);
    }, [baslangic]);

    const boyut = (() => {
        if (kaynak === 'bagli' && bagli && bagli !== 'bekliyor') return bagli;
        if (kaynak === 'ozel') { const w = Number(ozelW), h = Number(ozelH); return w >= 320 && h >= 240 && w <= 10000 && h <= 10000 ? { w, h } : null; }
        const [w, h] = secili.split('x').map(Number);
        return { w, h };
    })();
    const px = boyut ? konumPikseli(x, y, boyut) : null;
    const aciklama = (() => {
        if (!boyut || !px) return 'Geçerli bir ekran boyutu girin.';
        if (capa === 'oran') return `Ekranın %${Math.round(x / 327.67)} sağında, %${Math.round(y / 327.67)} aşağısında; her ekranda aynı oran.`;
        const yatay = capa.startsWith('sag') ? `sağ kenardan ${boyut.w - px.x} px` : `sol kenardan ${px.x} px`;
        const dikey = capa.endsWith('alt') ? `alt kenardan ${boyut.h - px.y} px` : `üst kenardan ${px.y} px`;
        return `${yatay}, ${dikey} uzakta; başka boyuttaki ekranda da bu uzaklık korunur.`;
    })();
    const satir = 'flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left text-sm transition-colors';

    return (
        <div id="konum-kaydetme" className="mt-4 space-y-4 rounded-2xl border border-sand-200 bg-white p-4 shadow-soft">
            <div>
                <p className="text-sm font-semibold text-sand-900">Bu konum hangi ekrana göre?</p>
                <p className="mt-0.5 text-xs text-sand-600">Konumu belirlediğiniz bilgisayarın ekranı. İşteki ekran farklıysa uyarlanır.</p>
                <div role="radiogroup" aria-label="Ekran" className="mt-2.5 space-y-2">
                    <button type="button" role="radio" aria-checked={kaynak === 'bagli'} disabled={!bagli || bagli === 'bekliyor'} onClick={() => setKaynak('bagli')}
                        className={`${satir} ${kaynak === 'bagli' ? 'border-moss-500 bg-moss-50' : 'border-sand-200 hover:border-sand-300'} disabled:opacity-60`}>
                        {bagli === 'bekliyor' ? <Loader2 size={17} className="animate-spin text-sand-500" /> : <Monitor size={17} className="text-moss-700" />}
                        <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-sand-900">Bağlı bilgisayarın ekranı</span>
                            <span className="block text-xs text-sand-600">{bagli === 'bekliyor' ? 'Okunuyor…' : bagli ? `${bagli.w} × ${bagli.h} (PC yardımcısından)` : 'Okunamadı: PC yardımcısı Wi‑Fi ile bağlı değil'}</span>
                        </span>
                        {kaynak === 'bagli' && <Check size={17} className="text-moss-700" />}
                    </button>
                    <div className={`${satir} ${kaynak === 'liste' ? 'border-moss-500 bg-moss-50' : 'border-sand-200'}`}>
                        <input type="radio" name="konum-ekran" aria-label="Listeden ekran boyutu" checked={kaynak === 'liste'} onChange={() => setKaynak('liste')} className="h-4 w-4 accent-moss-600" />
                        <select value={secili} onChange={e => { setSecili(e.target.value); setKaynak('liste'); }} aria-label="Ekran boyutu"
                            className="min-h-10 min-w-0 flex-1 rounded-lg border border-sand-200 bg-white px-2 text-sm">
                            {YAYGIN_EKRANLAR.map(e => <option key={e.w + 'x' + e.h} value={e.w + 'x' + e.h}>{e.ad}</option>)}
                        </select>
                    </div>
                    <div className={`${satir} ${kaynak === 'ozel' ? 'border-moss-500 bg-moss-50' : 'border-sand-200'}`}>
                        <input type="radio" name="konum-ekran" aria-label="Özel ekran boyutu" checked={kaynak === 'ozel'} onChange={() => setKaynak('ozel')} className="h-4 w-4 accent-moss-600" />
                        <span className="text-sand-700">Özel</span>
                        <input inputMode="numeric" value={ozelW} onChange={e => { setOzelW(e.target.value.replace(/\D/g, '')); setKaynak('ozel'); }} aria-label="Genişlik" className="min-h-10 w-20 rounded-lg border border-sand-200 px-2 text-sm" />
                        <span className="text-sand-500">×</span>
                        <input inputMode="numeric" value={ozelH} onChange={e => { setOzelH(e.target.value.replace(/\D/g, '')); setKaynak('ozel'); }} aria-label="Yükseklik" className="min-h-10 w-20 rounded-lg border border-sand-200 px-2 text-sm" />
                    </div>
                </div>
            </div>

            <div>
                <p className="text-sm font-semibold text-sand-900">Nereye sabitlensin?</p>
                <div role="radiogroup" aria-label="Sabitleme" className="mt-2.5 flex flex-wrap gap-2">
                    {CAPALAR.map(c => (
                        <button key={c} type="button" role="radio" aria-checked={capa === c} onClick={() => setCapa(c)}
                            className={`min-h-10 rounded-full px-3.5 text-xs font-semibold transition-colors ${capa === c ? 'bg-moss-600 text-white' : 'bg-sand-100 text-sand-700 hover:bg-sand-200'}`}>
                            {CAPA_ADI[c]}{c === onerilen ? ' · önerilen' : ''}
                        </button>
                    ))}
                </div>
                <p id="konum-kaydetme-aciklama" className="mt-2.5 rounded-xl bg-sand-50 px-3 py-2.5 text-xs leading-relaxed text-sand-700">{aciklama}</p>
            </div>

            <div className="flex gap-2">
                <button type="button" onClick={onGeri} className="btn btn-ghost min-h-[44px] px-4 text-sm">Geri</button>
                <button type="button" id="konum-kaydet" disabled={!boyut} onClick={() => boyut && onKaydet({ w: boyut.w, h: boyut.h, capa })} className="btn btn-primary min-h-[44px] flex-1 px-4 text-sm">
                    <Check size={16} /> Kaydet
                </button>
            </div>
        </div>
    );
}
