'use client';

/**
 * Kart menüsündeki seçim sayfası: bilgisayar makroları ve yapay zekâ görevleri.
 *
 * Ayarlardaki bir düğme konumuna "Makro çalıştır" ya da "Yapay zekâ makrosu"
 * işlevi verildikten sonra tam ekran açılır; kayıtlı ve açık ögeler baş harf
 * rozetleriyle listelenir. Tek dokunuş seçimi onaylar ve tercihi kaydeder.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { cx } from '@/components/ui/settings';
import { useRemotePrefs } from '@/lib/useRemotePrefs';
import { makroHazir } from '@/lib/remoteTools';
import { readEnabledMacros } from '@/lib/aiMacro';
import { tuvalTercihleri, tuvalTercihleriniKaydet } from '@/lib/tuvalTercihleri';
import type { KartIslevi } from '@/lib/tuvalTercihleri';
import type { RemoteMacro } from '@/lib/remoteTools';

const TUR_ADI: Record<RemoteMacro['type'], string> = {
    text: 'Hazır metin', shortcut: 'Klavye kısayolu', position: 'Fare konumu', sequence: 'Sıralı makro'
};

/** Adın ilk görsel harfi (Türkçe büyük harf dönüşümüyle). */
export function basHarf(ad: string): string {
    const harf = ad.trim().toLocaleUpperCase('tr').match(/[A-ZÇĞİÖŞÜQWX]/);
    return harf?.[0] ?? '•';
}

type Oge = { id: string; ad: string; tur: string };

export default function KartMakroSecici({ yerKey, yer, islev, onKapat }: { yerKey: string; yer: string; islev: KartIslevi; onKapat: () => void }) {
    const prefs = useRemotePrefs();
    const [secili, setSecili] = useState<string | null>(null);
    const aiKipi = islev === 'aiMakro';
    const aiMakrolari = aiKipi ? readEnabledMacros() : [];
    const bilgisayarMakrolari = aiKipi ? [] : prefs.macros.filter(makroHazir);
    const ogeler: Oge[] = aiKipi
        ? aiMakrolari.map(m => ({ id: m.id, ad: m.title.trim() || 'Adsız görev', tur: 'Yapay zekâ görevi' }))
        : bilgisayarMakrolari.map(m => ({ id: m.id, ad: m.name.trim() || 'Adsız makro', tur: TUR_ADI[m.type] }));

    useEffect(() => {
        const esc = (olay: KeyboardEvent) => { if (olay.key === 'Escape') onKapat(); };
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
    }, [onKapat]);

    if (typeof document === 'undefined') return null;
    return createPortal(
        <div id="kart-makro-secici" role="dialog" aria-modal="true" aria-label={aiKipi ? 'Düğmeye yapay zekâ görevi seç' : 'Düğmeye makro seç'}
            className="fixed inset-0 z-[130] flex flex-col bg-sand-50">
            <header className="flex h-14 shrink-0 items-center gap-1 border-b border-sand-200 bg-white px-2 pt-[env(safe-area-inset-top,0px)]">
                <button type="button" onClick={onKapat} aria-label="Seçimi kapat" className="flex h-11 w-11 items-center justify-center rounded-full text-sand-700 hover:bg-sand-100"><X size={20} /></button>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-sand-900">{aiKipi ? 'Yapay zekâ görevi seç' : 'Makro seç'}</p>
                    <p className="text-[11px] text-sand-500">{yer} düğmesi · dokununca onaylanır</p>
                </div>
            </header>
            <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                {ogeler.length ? <div role="radiogroup" aria-label={aiKipi ? 'Yapay zekâ görevleri' : 'Makrolar'} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {ogeler.map(oge => (
                        <button key={oge.id} type="button" role="radio" aria-checked={secili === oge.id}
                            onClick={() => {
                                const t = tuvalTercihleri();
                                const kartMakrolari = { ...t.kartMakrolari };
                                const kartAiMakrolari = { ...t.kartAiMakrolari };
                                if (aiKipi) { (kartAiMakrolari as Record<string, string>)[yerKey] = oge.id; delete (kartMakrolari as Record<string, string>)[yerKey]; }
                                else { (kartMakrolari as Record<string, string>)[yerKey] = oge.id; delete (kartAiMakrolari as Record<string, string>)[yerKey]; }
                                tuvalTercihleriniKaydet({ ...t, dugmeler: { ...t.dugmeler, [yerKey]: islev }, kartMakrolari, kartAiMakrolari });
                                setSecili(oge.id);
                                setTimeout(onKapat, 220);
                            }}
                            className={cx('flex items-center gap-3 rounded-2xl border bg-white p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40',
                                secili === oge.id ? 'border-moss-500 bg-moss-50' : 'border-sand-200 hover:border-sand-300')}>
                            <span aria-hidden="true" className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                                secili === oge.id ? 'bg-moss-600 text-white' : 'bg-moss-100 text-moss-700')}>{basHarf(oge.ad)}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-sand-900">{oge.ad}</span>
                                <span className="block text-[11px] text-sand-500">{oge.tur}</span>
                            </span>
                            {secili === oge.id && <Check size={18} className="shrink-0 text-moss-600" aria-hidden="true" />}
                        </button>
                    ))}
                </div>
                    : <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                        {aiKipi ? <>
                            <p className="text-sm font-medium text-sand-800">Açık yapay zekâ görevi yok</p>
                            <p className="text-xs text-sand-600">Metin editörü → Yapay zekâ bölümünden görev ekleyin ve açık bırakın.</p>
                        </> : <>
                            <p className="text-sm font-medium text-sand-800">Henüz makro yok</p>
                            <p className="text-xs text-sand-600">Ayarlar → Kısayollar ve ekranlar bölümünden makro ekleyin.</p>
                        </>}
                    </div>}
            </main>
        </div>, document.body);
}
