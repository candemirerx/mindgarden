'use client';

/**
 * Konum makrolarının çalışacağı (hedef) bilgisayarın ekranı.
 *
 * Köşeye sabitlenmiş konumlar (ör. sağ üstteki sekme kapatma) bu ekranın
 * boyutuna göre yeniden hesaplanır. Otomatik: bağlı PC yardımcısından okunur.
 * Kartla çalışırken yardımcı olmayabilir; o zaman ekran buradan seçilir.
 */
import { useEffect, useState } from 'react';
import { Monitor } from 'lucide-react';
import { YAYGIN_EKRANLAR, bilgisayarEkrani, saveRemotePrefs } from '@/lib/remoteTools';
import { useRemotePrefs } from '@/lib/useRemotePrefs';

export default function HedefEkranAyari() {
    const prefs = useRemotePrefs();
    const [okunan, setOkunan] = useState<{ w: number; h: number } | null | 'bekliyor'>('bekliyor');
    useEffect(() => {
        let iptal = false;
        void bilgisayarEkrani(prefs).then(b => { if (!iptal) setOkunan(b); });
        return () => { iptal = true; };
    }, [prefs]);
    const deger = prefs.hedefEkran ? prefs.hedefEkran.w + 'x' + prefs.hedefEkran.h : 'oto';
    const listede = deger === 'oto' || YAYGIN_EKRANLAR.some(e => e.w + 'x' + e.h === deger);
    const sec = (v: string) => {
        if (v === 'oto') { saveRemotePrefs({ ...prefs, hedefEkran: null }); return; }
        const [w, h] = v.split('x').map(Number);
        saveRemotePrefs({ ...prefs, hedefEkran: { w, h } });
    };
    return (
        <div id="hedef-ekran-ayari" className="rounded-2xl border border-sand-200 bg-white p-4 shadow-soft">
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bark-50 text-bark-700 ring-1 ring-inset ring-bark-200/70"><Monitor size={19} /></span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-sand-900">Bu bilgisayarın ekranı</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-sand-600">Köşeye sabitlenen konum makroları (ör. sekme kapatma) bu ekrana göre uyarlanır. Evde kaydettiğiniz konum işteki farklı ekranda da doğru yere tıklar.</p>
                    <select value={listede ? deger : 'ozel'} onChange={e => sec(e.target.value)} aria-label="Hedef ekran boyutu"
                        className="mt-3 min-h-11 w-full rounded-xl border border-sand-200 bg-white px-3 text-sm">
                        <option value="oto">Otomatik{okunan === 'bekliyor' ? ' (okunuyor…)' : okunan ? ` · ${okunan.w} × ${okunan.h} (PC yardımcısından)` : ' · yardımcıdan okunamadı'}</option>
                        {YAYGIN_EKRANLAR.map(e => <option key={e.w + 'x' + e.h} value={e.w + 'x' + e.h}>{e.ad}</option>)}
                        {!listede && <option value="ozel">{deger.replace('x', ' × ')} (özel)</option>}
                    </select>
                    {deger === 'oto' && !okunan && okunan !== 'bekliyor' && (
                        <p className="mt-2 text-xs text-clay-700">Yardımcı yokken köşeye sabitli konumlar kaydedildikleri ekrana göre çalışır; farklı ekranda doğru yere tıklaması için boyutu buradan seçin.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
