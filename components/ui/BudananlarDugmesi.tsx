'use client';

import { useEffect, useState } from 'react';
import { Scissors } from 'lucide-react';
import { budananlariGoster, budananlariGosterAyarla } from '@/lib/uiPrefs';
import { dinle } from '@/lib/degisim';

/** Budanmış notların gösterilip gösterilmeyeceğini okur ve değişiklikleri izler. */
export function useBudananlariGoster(): boolean {
    const [goster, setGoster] = useState(true);
    useEffect(() => {
        const oku = () => setGoster(budananlariGoster());
        oku();
        return dinle('budananlar', oku);
    }, []);
    return goster;
}

/** Üst çubukta budanmış notları gösterme/gizleme anahtarı. */
export function BudananlarDugmesi({ className = '' }: { className?: string }) {
    const goster = useBudananlariGoster();
    const etiket = goster ? 'Budananlar gösteriliyor; gizlemek için dokunun' : 'Budananlar gizli; göstermek için dokunun';
    return (
        <button
            type="button"
            role="switch"
            aria-checked={goster}
            aria-label="Budananları göster"
            title={etiket}
            onClick={() => budananlariGosterAyarla(!goster)}
            className={`inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40 ${
                goster ? 'bg-sand-200 text-sand-800 hover:bg-sand-300' : 'text-sand-500 hover:bg-sand-100 hover:text-sand-800'
            } ${className}`}
        >
            <Scissors size={19} className={goster ? '' : 'opacity-60'} />
        </button>
    );
}
