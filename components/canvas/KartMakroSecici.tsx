'use client';

/**
 * Kart menüsündeki makro seçim sayfası.
 *
 * Ayarlardaki bir düğme konumunun "Makro" işlevi seçildikten sonra
 * "Makro seç" düğmesiyle tam ekran açılır; kayıtlı ve açık makrolar
 * baş harf rozetleriyle listelenir. Tek dokunuş seçimi onaylar.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { cx } from '@/components/ui/settings';
import { useRemotePrefs } from '@/lib/useRemotePrefs';
import { makroHazir } from '@/lib/remoteTools';
import { tuvalTercihleri, tuvalTercihleriniKaydet } from '@/lib/tuvalTercihleri';
import type { RemoteMacro } from '@/lib/remoteTools';

const TUR_IKONU_ADI: Record<RemoteMacro['type'], string> = {
    text: 'Hazır metin', shortcut: 'Klavye kısayolu', position: 'Fare konumu', sequence: 'Sıralı makro'
};

/** Makro adının ilk görsel harfi (Türkçe büyük harf dönüşümüyle). */
export function basHarf(ad: string): string {
    const harf = ad.trim().toLocaleUpperCase('tr').match(/[A-ZÇĞİÖŞÜQWX]/);
    return harf?.[0] ?? '•';
}

export default function KartMakroSecici({ yerKey, yer, onKapat }: { yerKey: string; yer: string; onKapat: () => void }) {
    const prefs = useRemotePrefs();
    const [secili, setSecili] = useState<string | null>(null);
    const makrolar = prefs.macros.filter(makroHazir);

    useEffect(() => {
        const esc = (olay: KeyboardEvent) => { if (olay.key === 'Escape') onKapat(); };
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
    }, [onKapat]);

    if (typeof document === 'undefined') return null;
    return createPortal(
        <div id="kart-makro-secici" role="dialog" aria-modal="true" aria-label="Düğmeye makro seç"
            className="fixed inset-0 z-[130] flex flex-col bg-sand-50">
            <header className="flex h-14 shrink-0 items-center gap-1 border-b border-sand-200 bg-white px-2 pt-[env(safe-area-inset-top,0px)]">
                <button type="button" onClick={onKapat} aria-label="Seçimi kapat" className="flex h-11 w-11 items-center justify-center rounded-full text-sand-700 hover:bg-sand-100"><X size={20} /></button>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-sand-900">Makro seç</p>
                    <p className="text-[11px] text-sand-500">{yer} düğmesi · dokununca onaylanır</p>
                </div>
            </header>
            <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                {makrolar.length ? <div role="radiogroup" aria-label="Makrolar" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {makrolar.map(makro => {
                        const ad = makro.name.trim() || 'Adsız makro';
                        return <button key={makro.id} type="button" role="radio" aria-checked={secili === makro.id}
                            onClick={() => {
                                const t = tuvalTercihleri();
                                tuvalTercihleriniKaydet({ ...t, dugmeler: { ...t.dugmeler, [yerKey]: 'makro' }, kartMakrolari: { ...t.kartMakrolari, [yerKey]: makro.id } });
                                setSecili(makro.id);
                                setTimeout(onKapat, 220);
                            }}
                            className={cx('flex items-center gap-3 rounded-2xl border bg-white p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40',
                                secili === makro.id ? 'border-moss-500 bg-moss-50' : 'border-sand-200 hover:border-sand-300')}>
                            <span aria-hidden="true" className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                                secili === makro.id ? 'bg-moss-600 text-white' : 'bg-moss-100 text-moss-700')}>{basHarf(ad)}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-sand-900">{ad}</span>
                                <span className="block text-[11px] text-sand-500">{TUR_IKONU_ADI[makro.type]}</span>
                            </span>
                            {secili === makro.id && <Check size={18} className="shrink-0 text-moss-600" aria-hidden="true" />}
                        </button>;
                    })}
                </div>
                    : <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                        <p className="text-sm font-medium text-sand-800">Henüz makro yok</p>
                        <p className="text-xs text-sand-600">Ayarlar → Kısayollar ve ekranlar bölümünden makro ekleyin.</p>
                    </div>}
            </main>
        </div>, document.body);
}
