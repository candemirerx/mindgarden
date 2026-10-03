'use client';

import { useEffect, useState } from 'react';
import { EyeOff, Layers, Scissors } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { budamaModu, budamaModuAyarla } from '@/lib/uiPrefs';
import type { BudamaModu } from '@/lib/uiPrefs';
import { dinle } from '@/lib/degisim';

/** Budanmış notların gösterim modunu okur ve değişiklikleri izler. */
export function useBudamaModu(): BudamaModu {
    const [mod, setMod] = useState<BudamaModu>('dahil');
    useEffect(() => {
        const oku = () => setMod(budamaModu());
        oku();
        return dinle('budananlar', oku);
    }, []);
    return mod;
}

const SEKMELER: { mod: BudamaModu; ad: string; aciklama: string; Icon: LucideIcon }[] = [
    { mod: 'dahil', ad: 'Tümü', aciklama: 'Budananlar dahil tüm notları göster', Icon: Layers },
    { mod: 'gizle', ad: 'Gizle', aciklama: 'Budananları gizle', Icon: EyeOff },
    { mod: 'sadece', ad: 'Sadece budanan', aciklama: 'Sadece budananları göster', Icon: Scissors }
];

/** Üst çubukta budanmış notlar için üç sekme: tümü, budananları gizle, sadece budananlar. */
export function BudananlarDugmesi({ className = '', etiketli = false }: { className?: string; etiketli?: boolean }) {
    const secili = useBudamaModu();
    return (
        <div role="tablist" aria-label="Budanan notlar" className={`inline-flex flex-shrink-0 items-center gap-0.5 rounded-xl bg-sand-100 p-0.5 ${className}`}>
            {SEKMELER.map(({ mod, ad, aciklama, Icon }) => {
                const aktif = secili === mod;
                return (
                    <button
                        key={mod}
                        type="button"
                        role="tab"
                        aria-selected={aktif}
                        aria-label={aciklama}
                        title={aciklama}
                        onClick={() => budamaModuAyarla(mod)}
                        className={`inline-flex h-10 min-w-[40px] items-center justify-center gap-1 rounded-[10px] px-2 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40 ${
                            aktif ? 'bg-white text-sand-900 shadow-soft' : 'text-sand-600 hover:text-sand-900'
                        }`}
                    >
                        <Icon size={16} aria-hidden="true" />
                        <span className={etiketli ? '' : 'hidden lg:inline'}>{ad}</span>
                    </button>
                );
            })}
        </div>
    );
}
