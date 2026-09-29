'use client';

/**
 * Kişisel kısayollar ayar bölümü.
 *
 * Kart ve başlık üretmez; Ayarlar → Düzenleme araçları içindeki "Kişisel
 * kısayollar" bölümünün satırlarını döndürür. Her satır kapalıyken yalnızca
 * özet gösterir; ayrıntılar chevron ile açılır. Makro ekleme ve düzenleme tek
 * bir pencerede (MakroDuzenleyici) yapılır; tür seçimi oradadır.
 */
import { useState } from 'react';
import { ChevronRight, Keyboard, MousePointer2, Pencil, Play, Plus, TextCursorInput, Trash2 } from 'lucide-react';
import { konumYuzdesi, runRemoteMacro, saveRemotePrefs, type RemoteMacro } from '@/lib/remoteTools';
import { useRemotePrefs } from '@/lib/useRemotePrefs';
import { SettingsNote, SettingsRow, SettingsSwitch } from '@/components/ui/settings';
import MakroDuzenleyici from './MakroDuzenleyici';

/** Kısayol türlerinin okunur adları. */
const TUR_ADI: Record<RemoteMacro['type'], string> = {
    text: 'Hazır metin',
    shortcut: 'Klavye kısayolu',
    position: 'Fare konumu ve tıkla'
};

/** Satırda ve özet alanında gösterilen kısa değer. */
function makroOzeti(makro: RemoteMacro): string {
    if (makro.type === 'position') {
        const [x, y] = makro.value.split(',').map((parca) => Number(parca.trim()));
        return 'X %' + konumYuzdesi(x).toFixed(1) + ' · Y %' + konumYuzdesi(y).toFixed(1) + ' · ' + (makro.click === 2 ? 'çift tık' : 'tek tık');
    }
    const tekSatir = makro.value.trim().replace(/\s+/g, ' ');
    if (makro.type === 'shortcut') return tekSatir;
    return tekSatir.length > 60 ? tekSatir.slice(0, 60) + '…' : tekSatir;
}

export default function RemoteMacroTools() {
    const prefs = useRemotePrefs();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [acikIndex, setAcikIndex] = useState<number | null>(null);
    /** null → kapalı; { makro: null } → yeni makro; { makro } → düzenleme. */
    const [duzenleyici, setDuzenleyici] = useState<{ makro: RemoteMacro | null } | null>(null);

    const kaydet = (makro: RemoteMacro) => {
        const liste = prefs.macros.some((mevcut) => mevcut.id === makro.id)
            ? prefs.macros.map((mevcut) => (mevcut.id === makro.id ? makro : mevcut))
            : [...prefs.macros, makro];
        saveRemotePrefs({ ...prefs, macros: liste });
        setDuzenleyici(null);
        setMessage('"' + makro.name + '" kaydedildi.');
    };

    const run = async (makro: RemoteMacro) => {
        setBusy(true); setMessage('');
        try {
            if (!prefs.enabledTools.shortcuts || makro.enabled === false) throw new Error('Kısayollar aracı kapalı.');
            await runRemoteMacro(makro, prefs);
            setMessage(makro.name + ' çalıştırıldı.');
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Kısayol çalıştırılamadı.'); }
        finally { setBusy(false); }
    };

    return <div className="space-y-2.5">
        {prefs.macros.length === 0 && (
            <p className="rounded-xl border border-dashed border-sand-300 bg-sand-50/60 px-4 py-3 text-xs leading-relaxed text-sand-600">
                Henüz makro yok. Aşağıdaki <span className="font-medium text-sand-700">Makro Ekle</span> düğmesiyle
                konum, klavye kısayolu ya da hazır metin tanımlayın.
            </p>
        )}
        {prefs.macros.map((makro, index) => {
            const acik = acikIndex === index;
            const etkin = makro.enabled !== false;
            return (
                <div key={makro.id} className="space-y-2">
                    <SettingsRow
                        icon={makro.type === 'position' ? MousePointer2 : makro.type === 'shortcut' ? Keyboard : TextCursorInput}
                        dimmed={!etkin}
                        title={makro.name.trim() || 'Yeni kısayol'}
                        description={'Bilgisayar · ' + TUR_ADI[makro.type]}
                    >
                        <SettingsSwitch
                            checked={etkin}
                            onChange={() => saveRemotePrefs({
                                ...prefs,
                                macros: prefs.macros.map((mevcut) => mevcut.id === makro.id ? { ...mevcut, enabled: makro.enabled === false } : mevcut)
                            })}
                            label={(makro.name || 'Kısayol') + ' aracını ' + (makro.enabled === false ? 'aç' : 'kapat')}
                        />
                        <button
                            type="button"
                            id={'kisayol-detay-' + index}
                            onClick={() => setAcikIndex(acik ? null : index)}
                            aria-expanded={acik}
                            aria-label={(makro.name || 'Kısayol') + ' ayrıntılarını ' + (acik ? 'kapat' : 'aç')}
                            className="flex h-11 w-11 items-center justify-center rounded-xl text-sand-600 transition-colors duration-200 hover:bg-sand-100 hover:text-sand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40"
                        >
                            <ChevronRight size={17} className={'transition-transform duration-200 ' + (acik ? 'rotate-90' : '')} />
                        </button>
                        <button
                            type="button"
                            aria-label="Kısayolu sil"
                            onClick={() => saveRemotePrefs({ ...prefs, macros: prefs.macros.filter((mevcut) => mevcut.id !== makro.id) })}
                            className="flex h-11 w-11 items-center justify-center rounded-xl text-sand-600 transition-colors duration-200 hover:bg-berry-50 hover:text-berry-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berry-500/40"
                        >
                            <Trash2 size={16} />
                        </button>
                    </SettingsRow>

                    {acik && (
                        <div className="space-y-3 rounded-xl border border-sand-200 bg-sand-50/70 p-3.5">
                            <p className="text-xs leading-relaxed text-sand-700">
                                <span id={'kisayol-ozet-' + index} className="font-medium text-sand-800">{makroOzeti(makro) || 'Değer girilmedi'}</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    id={'kisayol-duzenle-' + index}
                                    onClick={() => setDuzenleyici({ makro })}
                                    className="btn btn-secondary min-h-[44px] px-4 text-sm"
                                >
                                    <Pencil size={15} /> Düzenle
                                </button>
                                <button
                                    type="button"
                                    id={'kisayol-calistir-' + index}
                                    disabled={busy || !prefs.enabledTools.shortcuts || makro.enabled === false || !makro.name.trim() || !makro.value.trim()}
                                    onClick={() => void run(makro)}
                                    className="btn btn-primary min-h-[44px] px-4 text-sm"
                                >
                                    <Play size={15} /> Çalıştır
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            );
        })}

        <button
            type="button"
            id="makro-ekle"
            onClick={() => setDuzenleyici({ makro: null })}
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-dashed border-sand-300 px-4 py-3 text-sm font-medium text-sand-600 transition-colors duration-200 hover:border-moss-500/50 hover:text-moss-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40"
        >
            <Plus size={16} /> Makro Ekle
        </button>

        {message && <SettingsNote tone="ok">{message}</SettingsNote>}

        {duzenleyici && (
            <MakroDuzenleyici makro={duzenleyici.makro} prefs={prefs} onKaydet={kaydet} onKapat={() => setDuzenleyici(null)} />
        )}
    </div>;
}
