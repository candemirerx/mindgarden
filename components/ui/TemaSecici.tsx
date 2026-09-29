'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { temaAboneGec, temaAyarla, temaOku, temaUygula, type Tema } from '@/lib/tema';

const SECENEKLER: { deger: Tema; etiket: string; Ikon: typeof Sun }[] = [
    { deger: 'acik', etiket: 'Açık', Ikon: Sun },
    { deger: 'koyu', etiket: 'Koyu', Ikon: Moon },
    { deger: 'sistem', etiket: 'Sistem', Ikon: Monitor },
];

/**
 * Görünüm seçici: Açık / Koyu / Sistem.
 *
 * Dokunma hedefleri 44 px'in üzerinde; seçim klavyeyle de yapılabilir
 * (gerçek radio girdileri kullanılır, ekran okuyucu seçili seçeneği bildirir).
 */
export default function TemaSecici({ className = '' }: { className?: string }) {
    const [secili, setSecili] = useState<Tema>('sistem');

    useEffect(() => {
        setSecili(temaOku());
        temaUygula();
        return temaAboneGec(() => setSecili(temaOku()));
    }, []);

    return (
        <fieldset className={className}>
            <legend className="label">Görünüm</legend>
            <div className="grid grid-cols-3 gap-2">
                {SECENEKLER.map(({ deger, etiket, Ikon }) => (
                    <label key={deger} className="relative block">
                        <input
                            type="radio"
                            name="nb-tema-secimi"
                            value={deger}
                            checked={secili === deger}
                            onChange={() => temaAyarla(deger)}
                            className="peer sr-only"
                        />
                        <span
                            className="flex min-h-[48px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-sand-300 bg-white px-2 py-2
                                       text-xs font-semibold text-bark-700 transition-colors
                                       hover:bg-sand-100
                                       peer-checked:border-moss-600 peer-checked:bg-moss-100 peer-checked:text-moss-800
                                       peer-focus-visible:ring-2 peer-focus-visible:ring-moss-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-sand-100"
                        >
                            <Ikon size={18} aria-hidden="true" />
                            {etiket}
                        </span>
                    </label>
                ))}
            </div>
            <p className="mt-2 text-xs text-sand-600">
                Sistem seçildiğinde tema, telefonunuzun gece moduna göre otomatik değişir.
            </p>
        </fieldset>
    );
}

