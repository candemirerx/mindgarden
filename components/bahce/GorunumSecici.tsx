'use client';

import { useRouter } from 'next/navigation';
import { Layout, List } from 'lucide-react';

/**
 * Bahçenin iki ekranı arasında geçiş: "Liste | Tuval".
 *
 * Liste ve Tuval başlığında aynı yerde, yazısıyla birlikte durur; kullanıcı
 * hangi ekranda olduğunu ve ötekine nasıl geçeceğini her zaman görür. Geçiş
 * geçmişe yeni kayıt eklemez (replace): geri tuşu iki ekran arasında gidip
 * gelmek yerine ana ekrana döner.
 */
export function GorunumSecici({ gardenId, aktif }: { gardenId: string; aktif: 'liste' | 'tuval' }) {
    const router = useRouter();
    const secenekler = [
        { id: 'liste' as const, ad: 'Liste', Icon: List, adres: `/projeler?id=${encodeURIComponent(gardenId)}` },
        { id: 'tuval' as const, ad: 'Tuval', Icon: Layout, adres: `/bahce_view?id=${encodeURIComponent(gardenId)}` },
    ];
    return (
        <nav aria-label="Bahçe görünümü" className="inline-flex flex-shrink-0 items-center gap-0.5 rounded-xl border border-sand-200 bg-sand-100 p-0.5">
            {secenekler.map(({ id, ad, Icon, adres }) => {
                const secili = aktif === id;
                return (
                    <button
                        key={id}
                        type="button"
                        data-kilavuz={'gorunum-' + id}
                        aria-current={secili ? 'page' : undefined}
                        aria-label={ad + ' görünümü'}
                        onClick={() => { if (!secili) router.replace(adres); }}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] font-semibold transition-all duration-200 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40 ${
                            secili ? 'bg-white text-moss-800 shadow-soft' : 'text-sand-600 hover:text-sand-900'
                        }`}
                    >
                        <Icon size={15} aria-hidden="true" />
                        {ad}
                    </button>
                );
            })}
        </nav>
    );
}
