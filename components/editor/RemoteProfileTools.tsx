'use client';

/**
 * Profiller ve kısayol düğmeleri ayar bölümü.
 *
 * Profil, kısayol panosunda birlikte görünecek makroların sıralı listesidir.
 * Kısayol düğmesi editörün bilgisayar şeridinde ayrı bir düğme olarak durur ve
 * dokunulduğunda bağlı olduğu profilin makrolarını panoda açar. Kullanıcı
 * istediği kadar profil ve düğme ekleyebilir; hepsi burada listelenir.
 */
import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, FolderKanban, Plus, Trash2, Wand2 } from 'lucide-react';
import { saveRemotePrefs, type RemoteProfile, type RemoteShortcutButton } from '@/lib/remoteTools';
import { useRemotePrefs } from '@/lib/useRemotePrefs';
import { SettingsGroupLabel, SettingsRow, cx, settingsFieldClass } from '@/components/ui/settings';

function yeniKimlik(onek: string): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : onek + '-' + Date.now();
}

const ikonDugmesi = 'flex h-11 w-11 items-center justify-center rounded-xl text-sand-600 transition-colors duration-200 hover:bg-sand-100 hover:text-sand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40 disabled:opacity-30';
const ekleDugmesi = 'flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-dashed border-sand-300 px-4 py-3 text-sm font-medium text-sand-600 transition-colors duration-200 hover:border-moss-500/50 hover:text-moss-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40';

export default function RemoteProfileTools() {
    const prefs = useRemotePrefs();
    const [acikProfil, setAcikProfil] = useState<string | null>(null);

    const profilleriKaydet = (profiles: RemoteProfile[]) => saveRemotePrefs({ ...prefs, profiles });
    const dugmeleriKaydet = (shortcutButtons: RemoteShortcutButton[]) => saveRemotePrefs({ ...prefs, shortcutButtons });
    const profilGuncelle = (id: string, degisim: Partial<RemoteProfile>) =>
        profilleriKaydet(prefs.profiles.map((p) => (p.id === id ? { ...p, ...degisim } : p)));

    const profilEkle = () => {
        const profil: RemoteProfile = { id: yeniKimlik('profil'), name: 'Profil ' + (prefs.profiles.length + 1), macroIds: [] };
        profilleriKaydet([...prefs.profiles, profil]);
        setAcikProfil(profil.id);
    };
    /** Profil silinince ona bağlı düğmeler de kaldırılır; bağsız düğme hiçbir şey açamaz. */
    const profilSil = (id: string) => saveRemotePrefs({
        ...prefs,
        profiles: prefs.profiles.filter((p) => p.id !== id),
        shortcutButtons: prefs.shortcutButtons.filter((d) => d.profileId !== id)
    });

    return <div className="space-y-5">
        <div className="space-y-2.5">
            <SettingsGroupLabel>Profiller</SettingsGroupLabel>
            {prefs.profiles.length === 0 && (
                <p className="rounded-xl border border-dashed border-sand-300 bg-sand-50/60 px-4 py-3 text-xs leading-relaxed text-sand-600">
                    Profil, panoda birlikte görünecek makroları gruplar. Örneğin “Sunum” profiline yalnızca sunum makrolarını koyun.
                </p>
            )}
            {prefs.profiles.map((profil, index) => {
                const acik = acikProfil === profil.id;
                const secili = new Set(profil.macroIds);
                const sirali = profil.macroIds.map((id) => prefs.macros.find((m) => m.id === id)).filter((m) => !!m);
                return (
                    <div key={profil.id} className="space-y-2">
                        <SettingsRow icon={FolderKanban} title={profil.name.trim() || 'Adsız profil'} description={sirali.length + ' makro'}>
                            <button type="button" id={'profil-duzenle-' + index} aria-expanded={acik} onClick={() => setAcikProfil(acik ? null : profil.id)}
                                className="btn btn-secondary min-h-[44px] px-3 text-sm">{acik ? 'Kapat' : 'Düzenle'}</button>
                            <button type="button" aria-label={profil.name + ' profilini sil'} onClick={() => profilSil(profil.id)}
                                className={cx(ikonDugmesi, 'hover:bg-berry-50 hover:text-berry-600')}><Trash2 size={16} /></button>
                        </SettingsRow>
                        {acik && (
                            <div className="space-y-3 rounded-xl border border-sand-200 bg-sand-50/70 p-3.5">
                                <label className="block text-xs font-medium text-sand-700">
                                    Profil adı
                                    <input type="text" id={'profil-ad-' + index} value={profil.name} onChange={(olay) => profilGuncelle(profil.id, { name: olay.target.value })}
                                        className={settingsFieldClass + ' mt-1.5 min-h-[44px]'} />
                                </label>
                                <div className="space-y-1.5">
                                    <span className="block text-xs font-medium text-sand-700">Panoda gösterilecek makrolar (sıra panodaki sıradır)</span>
                                    {sirali.map((makro, sira) => (
                                        <div key={makro.id} className="flex items-center gap-1 rounded-lg border border-moss-200 bg-white py-0.5 pl-3 pr-1">
                                            <span className="min-w-0 flex-1 truncate text-sm text-sand-800">{sira + 1}. {makro.name}</span>
                                            {([[-1, ArrowUp, 'yukarı'], [1, ArrowDown, 'aşağı']] as const).map(([yon, Ok, ad]) => (
                                                <button key={ad} type="button" aria-label={makro.name + ' makrosunu ' + ad + ' taşı'} disabled={sira + yon < 0 || sira + yon >= sirali.length}
                                                    onClick={() => {
                                                        const ids = sirali.map((m) => m.id);
                                                        [ids[sira], ids[sira + yon]] = [ids[sira + yon], ids[sira]];
                                                        profilGuncelle(profil.id, { macroIds: ids });
                                                    }} className={ikonDugmesi}><Ok size={15} /></button>
                                            ))}
                                        </div>
                                    ))}
                                    {prefs.macros.length === 0 && <p className="text-xs text-sand-600">Önce aşağıdaki Kişisel kısayollar bölümünden makro ekleyin.</p>}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {prefs.macros.map((makro) => {
                                            const var_ = secili.has(makro.id);
                                            return (
                                                <button key={makro.id} type="button" aria-pressed={var_}
                                                    onClick={() => profilGuncelle(profil.id, { macroIds: var_ ? profil.macroIds.filter((id) => id !== makro.id) : [...profil.macroIds, makro.id] })}
                                                    className={cx('flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors',
                                                        var_ ? 'border-moss-500 bg-moss-50 text-moss-800' : 'border-sand-300 bg-white text-sand-700 hover:border-moss-500/50')}>
                                                    {var_ ? <Check size={14} /> : <Plus size={14} />} {makro.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
            <button type="button" id="profil-ekle" onClick={profilEkle} className={ekleDugmesi}><Plus size={16} /> Profil ekle</button>
        </div>

        <div className="space-y-2.5">
            <SettingsGroupLabel>Kısayol düğmeleri</SettingsGroupLabel>
            <p className="text-xs leading-relaxed text-sand-600">
                Her düğme editörün bilgisayar şeridinde görünür; dokununca bağlı profilin makroları panoda açılır.
            </p>
            {prefs.shortcutButtons.map((dugme, index) => (
                <div key={dugme.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-sand-200 bg-white p-3">
                    <Wand2 size={18} className="shrink-0 text-moss-700" aria-hidden="true" />
                    <input type="text" id={'kisayol-dugme-ad-' + index} aria-label="Düğme adı" value={dugme.name} placeholder="Düğme adı"
                        onChange={(olay) => dugmeleriKaydet(prefs.shortcutButtons.map((d) => (d.id === dugme.id ? { ...d, name: olay.target.value } : d)))}
                        className={settingsFieldClass + ' min-h-[44px] min-w-0 flex-1 basis-32'} />
                    <select id={'kisayol-dugme-profil-' + index} aria-label={(dugme.name || 'Düğme') + ' için profil'} value={dugme.profileId}
                        onChange={(olay) => dugmeleriKaydet(prefs.shortcutButtons.map((d) => (d.id === dugme.id ? { ...d, profileId: olay.target.value } : d)))}
                        className={settingsFieldClass + ' min-h-[44px] min-w-0 flex-1 basis-32'}>
                        {prefs.profiles.map((p) => <option key={p.id} value={p.id}>{p.name || 'Adsız profil'}</option>)}
                    </select>
                    <button type="button" aria-label={(dugme.name || 'Düğme') + ' düğmesini sil'}
                        onClick={() => dugmeleriKaydet(prefs.shortcutButtons.filter((d) => d.id !== dugme.id))}
                        className={cx(ikonDugmesi, 'hover:bg-berry-50 hover:text-berry-600')}><Trash2 size={16} /></button>
                </div>
            ))}
            {prefs.profiles.length === 0
                ? <p className="text-xs text-sand-600">Düğme eklemek için önce bir profil oluşturun.</p>
                : <button type="button" id="kisayol-dugme-ekle" className={ekleDugmesi}
                    onClick={() => dugmeleriKaydet([...prefs.shortcutButtons, { id: yeniKimlik('dugme'), name: prefs.profiles[0].name, profileId: prefs.profiles[0].id }])}>
                    <Plus size={16} /> Kısayol düğmesi ekle
                </button>}
        </div>
    </div>;
}
