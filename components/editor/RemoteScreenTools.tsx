'use client';

/**
 * Ekran düzenleri ayar bölümü.
 *
 * Her düzen dört bölmeden oluşur (sol üst, sol alt, sağ üst, sağ alt). Bölmeye
 * fare, yön tuşları, metin veya kısayollar konur; oranlar kaydırıcılarla
 * ayarlanır ve küçük önizleme anında güncellenir.
 */
import { useState } from 'react';
import { LayoutDashboard, Plus, Trash2 } from 'lucide-react';
import { saveRemotePrefs } from '@/lib/remoteTools';
import type { RemotePane, RemotePaneKind, RemoteScreenLayout } from '@/lib/remoteTools';
import { useRemotePrefs } from '@/lib/useRemotePrefs';
import { SettingsRow, cx, settingsFieldClass } from '@/components/ui/settings';

const TURLER: { id: RemotePaneKind; ad: string }[] = [
    { id: 'mouse', ad: 'Fare' },
    { id: 'keys', ad: 'Yön tuşları' },
    { id: 'text', ad: 'Metin yazma' },
    { id: 'shortcuts', ad: 'Kısayollar' },
    { id: 'empty', ad: 'Boş' }
];
const BOLME_ADLARI = ['Sol üst', 'Sol alt', 'Sağ üst', 'Sağ alt'];
const ONIZLEME_RENGI: Record<RemotePaneKind, string> = {
    mouse: 'bg-moss-200 text-moss-900', keys: 'bg-clay-200 text-clay-900', text: 'bg-sand-300 text-sand-900',
    shortcuts: 'bg-berry-100 text-berry-900', empty: 'bg-transparent text-sand-500'
};

function yeniKimlik(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'ekran-' + Date.now();
}

const ekleDugmesi = 'flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-dashed border-sand-300 px-4 py-3 text-sm font-medium text-sand-600 transition-colors duration-200 hover:border-moss-500/50 hover:text-moss-700';

export default function RemoteScreenTools() {
    const prefs = useRemotePrefs();
    const [acik, setAcik] = useState<string | null>(null);
    const kaydet = (screenLayouts: RemoteScreenLayout[]) => saveRemotePrefs({ ...prefs, screenLayouts });
    const guncelle = (id: string, degisim: Partial<RemoteScreenLayout>) => kaydet(prefs.screenLayouts.map(d => d.id === id ? { ...d, ...degisim } : d));
    const ekle = () => {
        const duzen: RemoteScreenLayout = {
            id: yeniKimlik(), name: 'Ekran ' + (prefs.screenLayouts.length + 1), split: 50, leftSplit: 50, rightSplit: 50,
            panes: [{ kind: 'mouse' }, { kind: 'text' }, { kind: 'shortcuts' }, { kind: 'keys' }]
        };
        kaydet([...prefs.screenLayouts, duzen]);
        setAcik(duzen.id);
    };

    return <div className="space-y-2.5">
        <p className="text-xs leading-relaxed text-sand-600">Editördeki <strong>Ekran</strong> düğmesi ilk düzeni açar; birden çok düzen varsa ekranın üstünden seçilir.</p>
        {prefs.screenLayouts.map((duzen, index) => {
            const duzenAcik = acik === duzen.id;
            const bolmeGuncelle = (sira: number, pane: RemotePane) => {
                const panes = [...duzen.panes] as RemoteScreenLayout['panes'];
                panes[sira] = pane;
                guncelle(duzen.id, { panes });
            };
            return <div key={duzen.id} className="space-y-2">
                <SettingsRow icon={LayoutDashboard} title={duzen.name.trim() || 'Adsız ekran'} description={duzen.panes.filter(p => p.kind !== 'empty').length + ' bölme'}>
                    <button type="button" id={'ekran-duzenle-' + index} aria-expanded={duzenAcik} onClick={() => setAcik(duzenAcik ? null : duzen.id)}
                        className="btn btn-secondary min-h-[44px] px-3 text-sm">{duzenAcik ? 'Kapat' : 'Düzenle'}</button>
                    <button type="button" aria-label={duzen.name + ' ekranını sil'} onClick={() => kaydet(prefs.screenLayouts.filter(d => d.id !== duzen.id))}
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-sand-600 hover:bg-berry-50 hover:text-berry-600"><Trash2 size={16} /></button>
                </SettingsRow>
                {duzenAcik && <div className="space-y-3 rounded-xl border border-sand-200 bg-sand-50/70 p-3">
                    <label className="block text-xs font-medium text-sand-700">
                        Ekran adı
                        <input type="text" id={'ekran-ad-' + index} value={duzen.name} onChange={e => guncelle(duzen.id, { name: e.target.value })} className={settingsFieldClass + ' mt-1.5 min-h-[44px]'} />
                    </label>

                    <div aria-hidden="true" className="flex h-36 gap-1 rounded-xl border border-sand-300 bg-white p-1">
                        {[[0, 1, duzen.leftSplit, duzen.split], [2, 3, duzen.rightSplit, 100 - duzen.split]].map(([ust, alt, oran, genislik]) => (
                            <div key={ust} className="flex min-w-0 flex-col gap-1" style={{ flex: genislik }}>
                                {[[ust, oran], [alt, 100 - oran]].map(([sira, yukseklik]) => (
                                    <div key={sira} className={cx('flex min-h-0 items-center justify-center rounded-md border border-sand-200 text-[10px] font-semibold', ONIZLEME_RENGI[duzen.panes[sira].kind])} style={{ flex: yukseklik }}>
                                        {TURLER.find(t => t.id === duzen.panes[sira].kind)?.ad}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {([['split', 'Sol sütun genişliği'], ['leftSplit', 'Sol üst bölme yüksekliği'], ['rightSplit', 'Sağ üst bölme yüksekliği']] as const).map(([alan, etiket]) => (
                        <label key={alan} className="block text-xs font-medium text-sand-700">
                            {etiket}: %{duzen[alan]}
                            <input type="range" min="20" max="80" step="5" value={duzen[alan]} id={'ekran-' + alan + '-' + index}
                                onChange={e => guncelle(duzen.id, { [alan]: Number(e.target.value) })} className="mt-1 w-full accent-moss-600" />
                        </label>
                    ))}

                    <div className="grid gap-2 sm:grid-cols-2">
                        {duzen.panes.map((pane, sira) => (
                            <div key={sira} className="space-y-1.5 rounded-lg border border-sand-200 bg-white p-2">
                                <label className="block text-xs font-medium text-sand-700">
                                    {BOLME_ADLARI[sira]}
                                    <select id={'ekran-bolme-' + index + '-' + sira} value={pane.kind} onChange={e => bolmeGuncelle(sira, { kind: e.target.value as RemotePaneKind })}
                                        className={settingsFieldClass + ' mt-1 min-h-[44px]'}>
                                        {TURLER.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
                                    </select>
                                </label>
                                {pane.kind === 'shortcuts' && <select aria-label={BOLME_ADLARI[sira] + ' kısayol profili'} value={pane.profileId ?? ''}
                                    onChange={e => bolmeGuncelle(sira, { kind: 'shortcuts', profileId: e.target.value || undefined })}
                                    className={settingsFieldClass + ' min-h-[44px]'}>
                                    <option value="">Tüm makrolar</option>
                                    {prefs.profiles.map(p => <option key={p.id} value={p.id}>{p.name || 'Adsız profil'}</option>)}
                                </select>}
                            </div>
                        ))}
                    </div>
                </div>}
            </div>;
        })}
        <button type="button" id="ekran-ekle" onClick={ekle} className={ekleDugmesi}><Plus size={16} /> Ekran düzeni ekle</button>
    </div>;
}
