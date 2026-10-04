'use client';

/**
 * "Deneme ağacında dene" kartı: bağlantı ya da yapay zekâ kurulduktan sonra
 * ayarlardan tek dokunuşla "Deneme" bahçesindeki sabit adlı ağaca geçer;
 * editör ilgili araç bölümü açık ve seçili açılır. Ayarlar penceresi kapanır.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, TreePine } from 'lucide-react';
import { denemeAgaciAdresi, type DenemeTuru } from '@/lib/denemeAgaci';
import { cx } from '@/components/ui/settings';

const METIN: Record<DenemeTuru, { baslik: string; aciklama: string; dugme: string }> = {
    baglanti: {
        baslik: 'Bağlantıyı bir notta deneyin',
        aciklama: '"Deneme" bahçesindeki "Bağlantı deneme" ağacı, bilgisayar araçları açık olarak metin editöründe açılır.',
        dugme: 'Bağlantı deneme ağacını aç'
    },
    yapayzeka: {
        baslik: 'Yapay zekâyı bir notta deneyin',
        aciklama: '"Deneme" bahçesindeki "Yapay zekâ deneme" ağacı, yapay zekâ bölümü açık olarak metin editöründe açılır. İçinde bilerek yazım hataları olan bir paragraf vardır.',
        dugme: 'Yapay zekâ deneme ağacını aç'
    }
};

export default function DenemeAgaciDugmesi({ tur, vurgulu = false }: { tur: DenemeTuru; vurgulu?: boolean }) {
    const router = useRouter();
    const [mesgul, setMesgul] = useState(false);
    const [hata, setHata] = useState('');
    const m = METIN[tur];
    const ac = async () => {
        setMesgul(true); setHata('');
        try {
            const adres = await denemeAgaciAdresi(tur);
            window.dispatchEvent(new Event('nb-ayarlari-kapat'));
            router.push(adres);
        } catch (e) {
            setHata(e instanceof Error ? e.message : 'Deneme ağacı açılamadı.');
        } finally { setMesgul(false); }
    };
    return <div id={'deneme-agaci-' + tur} className={cx('rounded-2xl border p-4', vurgulu ? 'border-moss-300 bg-moss-50' : 'border-sand-200 bg-white')}>
        <div className="flex items-start gap-3">
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-moss-100 text-moss-700"><TreePine size={18} /></span>
            <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-semibold text-sand-900">{m.baslik}</p>
                <p className="text-xs leading-relaxed text-sand-600">{m.aciklama}</p>
                <button type="button" disabled={mesgul} onClick={() => void ac()}
                    className={cx('btn min-h-[44px] gap-1.5 px-4 text-sm', vurgulu ? 'btn-primary' : 'btn-secondary')}>
                    {mesgul ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={15} aria-hidden="true" />} {m.dugme}
                </button>
                {hata && <p role="alert" className="text-xs text-berry-700">{hata}</p>}
            </div>
        </div>
    </div>;
}
