import { FileCode2, ShieldCheck, ShieldAlert, ChevronDown } from 'lucide-react';
import { YARDIMCI_KLASORLERI } from '@/lib/yardimciProgramlar';

/**
 * Zip içindeki yardımcı programlar, "yönetici izni isteyen / istemeyen" iki
 * klasör olarak. Uygulamadaki PC yardımcısı kartında ve sitedeki /pc
 * sayfasında aynen kullanılır (durumsuz; sunucuda da çizilir).
 */
export default function YardimciKlasorleri() {
    return (
        <div className="space-y-2.5">
            {YARDIMCI_KLASORLERI.map(klasor => {
                const izinli = klasor.id === 'izinli';
                const Simge = izinli ? ShieldAlert : ShieldCheck;
                return (
                    <details key={klasor.id} open={!izinli} id={'yardimci-klasor-' + klasor.id} className="group overflow-hidden rounded-2xl border border-sand-200 bg-white">
                        <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-3 px-3.5 py-3 transition-colors hover:bg-sand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-moss-500 [&::-webkit-details-marker]:hidden">
                            <span aria-hidden="true" className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ' + (izinli ? 'bg-clay-100 text-clay-700' : 'bg-moss-100 text-moss-700')}>
                                <Simge size={18} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold leading-snug text-sand-900">{klasor.baslik}</span>
                                <span className="mt-0.5 block text-[11.5px] font-normal leading-snug text-sand-600">{klasor.dosyalar.length} dosya</span>
                            </span>
                            <ChevronDown size={17} aria-hidden="true" className="shrink-0 text-sand-500 transition-transform duration-200 group-open:rotate-180" />
                        </summary>
                        <div className="border-t border-sand-100 bg-sand-50/50 px-3.5 py-3">
                            <p className="mb-2.5 text-xs leading-relaxed text-sand-600">{klasor.aciklama}</p>
                            <ul className="space-y-2">
                                {klasor.dosyalar.map(d => (
                                    <li key={d.dosya} className="flex gap-2.5 rounded-xl border border-sand-200 bg-white p-2.5">
                                        <FileCode2 size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-sand-500" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13px] font-semibold leading-snug text-sand-900">{d.ad}</p>
                                            <p className="mt-0.5 break-all font-mono text-[11px] leading-snug text-sand-500">scripts\{d.dosya}</p>
                                            <p className="mt-1 text-xs leading-relaxed text-sand-600">{d.aciklama}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </details>
                );
            })}
        </div>
    );
}
