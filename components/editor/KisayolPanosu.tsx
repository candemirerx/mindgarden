'use client';

/**
 * Kısayol panosu.
 *
 * Editörde "Kısayollar" aracına dokunulduğunda yazı alanının yerine tek bir kutu
 * açılır; içine yalnızca eklenen makrolar numpad düzeninde, eklendikleri sırayla
 * dizilir. Makrolar Ayarlar > Düzenleme araçları bölümünden tanımlanır. Her kutu
 * tek dokunuşla çalışır: konum ve klavye makroları bilgisayarda iş görür, hazır
 * metin makrosu bilgisayarın odaklı alanına yazılır.
 *
 * Bir kısayol düğmesiyle açıldığında yalnızca o düğmeye bağlı profilin
 * makroları, profildeki sırayla gösterilir.
 *
 * Nota dönmek için araç çubuğundaki Kısayollar düğmesine yeniden dokunulur; bu
 * yüzden panoda ayrıca bir geri düğmesi yok.
 */
import { useState } from 'react';
import { Keyboard, ListOrdered, MousePointer2, Settings2, TextCursorInput } from 'lucide-react';
import { konumYuzdesi, makroHazir, runRemoteMacro, type RemoteMacro } from '@/lib/remoteTools';
import { useRemotePrefs } from '@/lib/useRemotePrefs';

/** Panelde makro adının altında görünen kısa ipucu. */
function makroIpucu(makro: RemoteMacro): string {
    if (makro.type === 'position') {
        const [x, y] = makro.value.split(',').map((parca) => Number(parca.trim()));
        return '%' + Math.round(konumYuzdesi(x)) + ' · %' + Math.round(konumYuzdesi(y)) + (makro.click === 2 ? ' · çift' : '');
    }
    if (makro.type === 'sequence') return (makro.steps?.length ?? 0) + ' adım';
    if (makro.type === 'shortcut') return makro.value.trim();
    const tekSatir = makro.value.trim().replace(/\s+/g, ' ');
    return tekSatir.length > 26 ? tekSatir.slice(0, 26) + '…' : tekSatir;
}

const TUR_ETIKETI: Record<RemoteMacro['type'], string> = {
    position: 'Konum makrosu',
    shortcut: 'Klavye kısayolu',
    text: 'Hazır metin',
    sequence: 'Sıralı makro'
};

/** Ağ kaynaklı hataları kullanıcıya anlaşılır biçimde anlatır. */
function makroHatasi(hata: unknown): string {
    const mesaj = hata instanceof Error ? hata.message : '';
    if (!mesaj || /fetch|network|load failed|failed to/i.test(mesaj)) {
        return 'Bilgisayara ulaşılamadı; bağlantıyı Ayarlar → Bilgisayar bölümünden deneyin.';
    }
    return mesaj;
}

export default function KisayolPanosu({ onAyarlarAc, profilId = null }: { onAyarlarAc: () => void; profilId?: string | null }) {
    const prefs = useRemotePrefs();
    const [durum, setDurum] = useState('');
    const [busy, setBusy] = useState(false);

    const makroCalistir = async (makro: RemoteMacro) => {
        setBusy(true);
        setDurum('');
        try {
            await runRemoteMacro(makro, prefs);
            const ad = makro.name.trim() || TUR_ETIKETI[makro.type];
            setDurum(makro.type === 'text' ? '"' + ad + '" bilgisayara yazıldı.' : '"' + ad + '" bilgisayarda çalıştırıldı.');
        } catch (error) {
            setDurum(makroHatasi(error));
        } finally {
            setBusy(false);
        }
    };

    const profil = profilId ? prefs.profiles.find((p) => p.id === profilId) ?? null : null;
    const etkinMakrolar = (profil
        ? profil.macroIds.map((id) => prefs.macros.find((makro) => makro.id === id)).filter((makro): makro is RemoteMacro => !!makro)
        : prefs.macros).filter(makroHazir);

    return (
        <div data-kisayol-panosu className="studio-workspace flex min-h-0 flex-1 flex-col py-4 sm:py-8" role="region" aria-label="Kısayol panosu">
            <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 px-3 sm:px-6">
                <section className="pano-karti flex min-h-0 flex-1 flex-col p-3 sm:p-5" aria-label={profil ? profil.name + ' profili' : 'Makro panosu'}>
                    {profil && <h2 id="kisayol-profil-adi" className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-moss-700">{profil.name}</h2>}
                    {etkinMakrolar.length === 0 ? (
                        <div id="kisayol-bos" className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-sand-300 px-4 py-10 text-center">
                            <span className="text-xs leading-relaxed text-sand-600">
                                {profil ? 'Bu profilde çalıştırılabilir makro yok. Profili Ayarlar → Düzenleme araçları bölümünden düzenleyin.' : 'Henüz makro yok. Makrolar Ayarlar → Düzenleme araçları bölümünden eklenir.'}
                            </span>
                            <button type="button" id="kisayol-ayarlar" onClick={onAyarlarAc} className="btn btn-secondary min-h-[44px] px-4 text-sm">
                                <Settings2 size={16} /> Makroları düzenle
                            </button>
                        </div>
                    ) : (
                        <>
                            <div id="kisayol-izgarasi" className="grid min-h-0 flex-1 grid-cols-3 content-start gap-2 overflow-y-auto sm:grid-cols-4">
                                {etkinMakrolar.map((makro, indeks) => {
                                    const Icon = makro.type === 'position' ? MousePointer2 : makro.type === 'shortcut' ? Keyboard : makro.type === 'sequence' ? ListOrdered : TextCursorInput;
                                    const etiket = makro.name + ' · ' + TUR_ETIKETI[makro.type];
                                    return (
                                        <button
                                            key={makro.id}
                                            id={'kisayol-makro-' + indeks}
                                            data-makro-id={makro.id}
                                            data-makro-tur={makro.type}
                                            type="button"
                                            disabled={busy}
                                            onClick={() => void makroCalistir(makro)}
                                            aria-label={etiket}
                                            title={etiket}
                                            className="flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-sand-200 bg-white px-2 py-3 text-center shadow-soft transition-colors duration-200 hover:border-moss-500/50 hover:bg-moss-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40 active:scale-[0.98] disabled:opacity-60"
                                        >
                                            <Icon size={20} className="text-moss-700" aria-hidden="true" />
                                            <span className="w-full truncate text-xs font-semibold text-sand-800">{makro.name.trim()}</span>
                                            <span className="w-full truncate text-[10px] text-sand-500">{makroIpucu(makro)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                    {durum && <p id="kisayol-durum" role="status" className="mt-3 shrink-0 text-xs leading-relaxed text-sand-700">{durum}</p>}
                </section>
            </div>
        </div>
    );
}
