'use client';

import { useState } from 'react';
import { ChevronRight, SlidersHorizontal, TreePine } from 'lucide-react';
import { SettingsSection } from '@/components/ui/settings';
import { TuvalAyarlari } from './TuvalAyarlari';
import KartAracEkle, { islevAdi, SIMGE } from './KartAracEkle';
import DenemeAgaciKisayolu from '@/components/bahce/DenemeAgaciKisayolu';
import { DENEME_ARACLARI, denemeTercihleriniKaydet, useDenemeTercihleri } from '@/lib/denemeTercihleri';
import { useRemotePrefs } from '@/lib/useRemotePrefs';

export default function GenelTuvalAyarlari() {
    const [sekme, setSekme] = useState<'genel' | 'deneme'>('genel');
    const [arac, setArac] = useState(false);
    const t = useDenemeTercihleri();
    const prefs = useRemotePrefs();
    const bilgi = islevAdi(t.sol.islev, t.sol.kimlik, prefs.macros);
    return <div className="space-y-4">
        <div role="tablist" aria-label="Tuval ayarları kapsamı" className="flex rounded-2xl bg-sand-200/60 p-1">
            {([{ id: 'genel', ad: 'Tüm bahçeler' }, { id: 'deneme', ad: 'Deneme ağacı' }] as const).map(s => <button key={s.id} type="button" role="tab" id={'genel-tuval-' + s.id} aria-selected={sekme === s.id} aria-controls="genel-tuval-icerik" onClick={() => setSekme(s.id)} className={`min-h-12 flex-1 rounded-xl px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-moss-500 ${sekme === s.id ? 'bg-white text-moss-800 shadow-soft' : 'text-sand-600'}`}>{s.ad}</button>)}
        </div>
        <div role="tabpanel" id="genel-tuval-icerik" aria-labelledby={'genel-tuval-' + sekme}>
            {sekme === 'genel' ? <TuvalAyarlari /> : <div className="space-y-4">
                <SettingsSection icon={TreePine} title="Deneme ağacının görünümü" description="Ana sayfanın sağ üstündeki kart. Solda seçtiğiniz araç, ortada editör, sağda her zaman kopyalama bulunur.">
                    <div className="mb-5 flex justify-center rounded-2xl bg-sand-100 px-2 py-6"><DenemeAgaciKisayolu onizleme /></div>
                    <div role="radiogroup" aria-label="Deneme ağacı kart tasarımı" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {([{ id: 'varsayilan', ad: 'Genel ayarı izle' }, { id: 'bahce', ad: 'Kök · Bahçe' }, { id: 'sade', ad: 'Sade' }, { id: 'renkli', ad: 'Renkli' }, { id: 'hap', ad: 'Hap' }] as const).map(k => <button key={k.id} type="button" role="radio" aria-checked={t.kart === k.id} data-deneme-tasarim={k.id} onClick={() => denemeTercihleriniKaydet({ ...t, kart: k.id })} className={`min-h-12 rounded-xl border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-moss-500 ${t.kart === k.id ? 'border-moss-500 bg-moss-50 text-moss-900' : 'border-sand-200 bg-white text-sand-700'}`}>{k.ad}</button>)}
                    </div>
                </SettingsSection>
                <SettingsSection icon={SlidersHorizontal} title="Sol bölmedeki araç" description="Bilgisayar araçları, köprü dikte, makrolar veya yapay zekâ görevi seçin. Sağdaki Kopyala düğmesi değişmez.">
                    <button type="button" id="deneme-sol-arac-sec" onClick={() => setArac(true)} className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-moss-200 bg-moss-50 px-4 py-3 text-left text-moss-900 focus-visible:ring-2 focus-visible:ring-moss-500">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-moss-700">{bilgi.harf || SIMGE[t.sol.islev]}</span>
                        <span className="flex-1"><span className="block text-sm font-semibold">{bilgi.ad}</span><span className="text-xs text-moss-700">Aracı değiştir</span></span><ChevronRight size={18} />
                    </button>
                </SettingsSection>
                <p className="px-1 text-xs leading-relaxed text-sand-600">Deneme metni uygulama açıkken bellekte tutulur. Notlarınıza ve yedeklerinize eklenmez; uygulama yeniden başlatılınca temizlenir.</p>
                {arac && <KartAracEkle yerKey="sol" ozelSecim={t.sol} izinli={DENEME_ARACLARI} onSec={sol => denemeTercihleriniKaydet({ ...t, sol })} onKapat={() => setArac(false)} />}
            </div>}
        </div>
    </div>;
}
