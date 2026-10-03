'use client';

/**
 * Ekran düzenleri ayar bölümü.
 *
 * Bir düzen yan yana sütunlardan, her sütun alt alta bölmelerden oluşur. Sütun
 * ve bölme eklenip silinebilir; her bölmeye fare, yön tuşları, metin, klavye
 * veya kısayollar konur. Genişlik/yükseklikler göreli paydır, bölmeler arası ve
 * bölme içi boşluk piksel olarak yazılır; küçük önizleme anında güncellenir.
 */
import { useState } from 'react';
import { LayoutDashboard, Plus, Trash2 } from 'lucide-react';
import {
    DEFAULT_NAVIGATION_SHORTCUTS, EKRAN_SINIRLARI, VARSAYILAN_BOLME_BOSLUGU, VARSAYILAN_IC_BOSLUK,
    normalizeNavigationShortcuts, saveRemotePrefs
} from '@/lib/remoteTools';
import type { NavigationShortcutPosition, RemotePane, RemotePaneKind, RemoteScreenColumn, RemoteScreenLayout } from '@/lib/remoteTools';
import { useRemotePrefs } from '@/lib/useRemotePrefs';
import { SettingsRow, cx, settingsFieldClass } from '@/components/ui/settings';

const TURLER: { id: RemotePaneKind; ad: string }[] = [
    { id: 'mouse', ad: 'Fare' },
    { id: 'keys', ad: 'Yön tuşları' },
    { id: 'text', ad: 'Metin yazma' },
    { id: 'liveKeyboard', ad: 'Canlı klavye (simge)' },
    { id: 'phoneKeyboard', ad: 'Telefon klavyesi (görünen)' },
    { id: 'computerKeyboard', ad: 'Bilgisayar klavyesi (görünen)' },
    { id: 'shortcuts', ad: 'Kısayollar' },
    { id: 'bridgeDictation', ad: 'Köprü Dikte' },
    { id: 'empty', ad: 'Boş' }
];
const ONIZLEME_RENGI: Record<RemotePaneKind, string> = {
    mouse: 'bg-moss-200 text-moss-900', keys: 'bg-clay-200 text-clay-900', text: 'bg-sand-300 text-sand-900', liveKeyboard: 'bg-sand-200 text-sand-900',
    phoneKeyboard: 'bg-sand-200 text-sand-900', computerKeyboard: 'bg-sand-300 text-sand-900',
    shortcuts: 'bg-berry-100 text-berry-900', bridgeDictation: 'bg-moss-100 text-moss-900', empty: 'bg-transparent text-sand-500'
};
const BOSLUK_ONERILERI = [0, 2, 4, 8, 12, 16, 24, 32];
const [PAY_ALT, PAY_UST] = EKRAN_SINIRLARI.pay;

function yeniKimlik(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'ekran-' + Date.now();
}
const yuzde = (pay: number, toplam: number) => Math.round((pay / (toplam || 1)) * 100);

const ekleDugmesi = 'flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-dashed border-sand-300 px-4 py-3 text-sm font-medium text-sand-600 transition-colors duration-200 hover:border-moss-500/50 hover:text-moss-700';
const kucukEkleDugmesi = 'flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-dashed border-sand-300 px-3 text-xs font-medium text-sand-600 hover:border-moss-500/50 hover:text-moss-700 disabled:opacity-50';
const silDugmesi = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sand-600 hover:bg-berry-50 hover:text-berry-600 disabled:opacity-40';

/** Piksel ölçüsü kutusu: istenen değer yazılır, hazır ölçüler listeden seçilir. */
function OlcuKutusu({ id, etiket, deger, varsayilan, enFazla, onDegis }: { id: string; etiket: string; deger: number | undefined; varsayilan: number; enFazla: number; onDegis: (px: number) => void }) {
    const gecerli = deger ?? varsayilan;
    return <label className="block text-xs font-medium text-sand-700">
        {etiket}
        <div className="mt-1 flex items-center gap-2">
            <input type="number" id={id} list={id + '-liste'} inputMode="numeric" min={0} max={enFazla} step={1} value={gecerli}
                onChange={e => {
                    const sayi = Math.round(Number(e.target.value));
                    if (e.target.value !== '' && Number.isFinite(sayi)) onDegis(Math.min(enFazla, Math.max(0, sayi)));
                }}
                className={settingsFieldClass + ' min-h-[44px]'} />
            <span className="text-sand-600">px</span>
        </div>
        <datalist id={id + '-liste'}>{BOSLUK_ONERILERI.filter(n => n <= enFazla).map(n => <option key={n} value={n} />)}</datalist>
    </label>;
}

export default function RemoteScreenTools() {
    const prefs = useRemotePrefs();
    const [acik, setAcik] = useState<string | null>(null);
    const kaydet = (screenLayouts: RemoteScreenLayout[]) => saveRemotePrefs({ ...prefs, screenLayouts });
    const guncelle = (id: string, degisim: Partial<RemoteScreenLayout>) => kaydet(prefs.screenLayouts.map(d => d.id === id ? { ...d, ...degisim } : d));
    const ekle = () => {
        const duzen: RemoteScreenLayout = {
            id: yeniKimlik(), name: 'Ekran ' + (prefs.screenLayouts.length + 1),
            columns: [
                { weight: 50, panes: [{ kind: 'mouse', weight: 50 }, { kind: 'text', weight: 50 }] },
                { weight: 50, panes: [{ kind: 'shortcuts', weight: 50 }, { kind: 'keys', weight: 50 }] }
            ]
        };
        kaydet([...prefs.screenLayouts, duzen]);
        setAcik(duzen.id);
    };

    return <div className="space-y-2.5">
        <p className="text-xs leading-relaxed text-sand-600">Editördeki <strong>Ekran</strong> düğmesi ilk düzeni açar; birden çok düzen varsa ekranın üstünden seçilir.</p>
        {prefs.screenLayouts.map((duzen, index) => {
            const duzenAcik = acik === duzen.id;
            const sutunlariGuncelle = (columns: RemoteScreenColumn[]) => guncelle(duzen.id, { columns });
            const sutunGuncelle = (sutunSira: number, degisim: Partial<RemoteScreenColumn>) =>
                sutunlariGuncelle(duzen.columns.map((s, i) => i === sutunSira ? { ...s, ...degisim } : s));
            const bolmeGuncelle = (sutunSira: number, bolmeSira: number, pane: RemotePane) =>
                sutunGuncelle(sutunSira, { panes: duzen.columns[sutunSira].panes.map((p, i) => i === bolmeSira ? pane : p) });
            const toplamGenislik = duzen.columns.reduce((t, s) => t + s.weight, 0);
            const bolmeSayisi = duzen.columns.reduce((t, s) => t + s.panes.filter(p => p.kind !== 'empty').length, 0);
            return <div key={duzen.id} className="space-y-2">
                <SettingsRow icon={LayoutDashboard} title={duzen.name.trim() || 'Adsız ekran'} description={bolmeSayisi + ' bölme · ' + duzen.columns.length + ' sütun'}>
                    <button type="button" id={'ekran-duzenle-' + index} aria-expanded={duzenAcik} onClick={() => setAcik(duzenAcik ? null : duzen.id)}
                        className="btn btn-secondary min-h-[44px] px-3 text-sm">{duzenAcik ? 'Kapat' : 'Düzenle'}</button>
                    <button type="button" aria-label={duzen.name + ' ekranını sil'} onClick={() => kaydet(prefs.screenLayouts.filter(d => d.id !== duzen.id))} className={silDugmesi}><Trash2 size={16} /></button>
                </SettingsRow>
                {duzenAcik && <div className="space-y-3 rounded-xl border border-sand-200 bg-sand-50/70 p-3">
                    <label className="block text-xs font-medium text-sand-700">
                        Ekran adı
                        <input type="text" id={'ekran-ad-' + index} value={duzen.name} onChange={e => guncelle(duzen.id, { name: e.target.value })} className={settingsFieldClass + ' mt-1.5 min-h-[44px]'} />
                    </label>

                    <div role="radiogroup" aria-label="Bölme görünümü" className="grid grid-cols-2 gap-1.5">
                        {([[false, 'Kutulu', 'Ayrı kutular, çerçeveli'], [true, 'Kenarsız', 'Çerçevesiz, tek yüzey']] as const).map(([deger, ad, aciklama]) => {
                            const secili = !!duzen.borderless === deger;
                            return <button key={ad} type="button" role="radio" aria-checked={secili} id={'ekran-gorunum-' + (deger ? 'kenarsiz' : 'kutulu') + '-' + index}
                                onClick={() => guncelle(duzen.id, { borderless: deger })}
                                className={cx('min-h-[44px] rounded-xl border px-3 py-2 text-left', secili ? 'border-moss-600 bg-moss-100 text-moss-800' : 'border-sand-200 bg-white text-sand-700')}>
                                <span className="block text-sm font-semibold">{ad}</span>
                                <span className="block text-[11px] opacity-80">{aciklama}</span>
                            </button>;
                        })}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                        <OlcuKutusu id={'ekran-bosluk-' + index} etiket="Bölmeler arası boşluk" deger={duzen.gap} varsayilan={duzen.borderless ? 0 : VARSAYILAN_BOLME_BOSLUGU}
                            enFazla={EKRAN_SINIRLARI.bosluk} onDegis={gap => guncelle(duzen.id, { gap })} />
                        <OlcuKutusu id={'ekran-ic-bosluk-' + index} etiket="Bölme içi boşluk" deger={duzen.innerPadding} varsayilan={VARSAYILAN_IC_BOSLUK}
                            enFazla={EKRAN_SINIRLARI.icBosluk} onDegis={innerPadding => guncelle(duzen.id, { innerPadding })} />
                    </div>

                    <div aria-hidden="true" className="flex h-40 rounded-xl border border-sand-300 bg-white"
                        style={{ gap: Math.min(duzen.gap ?? (duzen.borderless ? 0 : VARSAYILAN_BOLME_BOSLUGU), 16) / 2, padding: duzen.borderless ? 0 : 4, overflow: 'hidden' }}>
                        {duzen.columns.map((sutun, sutunSira) => {
                            const gorunenler = sutun.panes;
                            const toplam = gorunenler.reduce((t, p) => t + (p.weight ?? 50), 0);
                            return <div key={sutunSira} className="flex min-w-0 flex-col" style={{ flex: sutun.weight + ' 1 0%', gap: Math.min(duzen.gap ?? (duzen.borderless ? 0 : VARSAYILAN_BOLME_BOSLUGU), 16) / 2 }}>
                                {gorunenler.map((pane, bolmeSira) => <div key={bolmeSira}
                                    className={cx('flex min-h-0 items-center justify-center overflow-hidden px-1 text-center text-[10px] font-semibold leading-tight', duzen.borderless ? '' : 'rounded-md border border-sand-200', ONIZLEME_RENGI[pane.kind])}
                                    style={{ flex: (toplam ? (pane.weight ?? 50) : 1) + ' 1 0%' }}>
                                    {TURLER.find(t => t.id === pane.kind)?.ad}
                                </div>)}
                            </div>;
                        })}
                    </div>

                    <div className="space-y-2">
                        {duzen.columns.map((sutun, sutunSira) => {
                            const toplamYukseklik = sutun.panes.reduce((t, p) => t + (p.weight ?? 50), 0);
                            return <fieldset key={sutunSira} className="space-y-2 rounded-lg border border-sand-200 bg-white p-2">
                                <legend className="px-1 text-xs font-semibold text-sand-800">Sütun {sutunSira + 1}</legend>
                                <div className="flex items-end gap-2">
                                    <label className="block flex-1 text-xs font-medium text-sand-700">
                                        Genişlik: %{yuzde(sutun.weight, toplamGenislik)}
                                        <input type="range" min={PAY_ALT} max={PAY_UST} step="5" value={sutun.weight} id={'ekran-sutun-genislik-' + index + '-' + sutunSira}
                                            onChange={e => sutunGuncelle(sutunSira, { weight: Number(e.target.value) })} className="mt-1 w-full accent-moss-600" />
                                    </label>
                                    <button type="button" aria-label={'Sütun ' + (sutunSira + 1) + ' sil'} disabled={duzen.columns.length <= 1} className={silDugmesi}
                                        onClick={() => sutunlariGuncelle(duzen.columns.filter((_, i) => i !== sutunSira))}><Trash2 size={16} /></button>
                                </div>

                                <div className="grid gap-2 sm:grid-cols-2">
                                    {sutun.panes.map((pane, bolmeSira) => <div key={bolmeSira} className="space-y-1.5 rounded-lg border border-sand-200 bg-sand-50/60 p-2">
                                        <div className="flex items-end gap-1.5">
                                            <label className="block min-w-0 flex-1 text-xs font-medium text-sand-700">
                                                Bölme {bolmeSira + 1}
                                                <select id={'ekran-bolme-' + index + '-' + sutunSira + '-' + bolmeSira} value={pane.kind}
                                                    onChange={e => bolmeGuncelle(sutunSira, bolmeSira, { ...pane, kind: e.target.value as RemotePaneKind })}
                                                    className={settingsFieldClass + ' mt-1 min-h-[44px]'}>
                                                    {TURLER.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
                                                </select>
                                            </label>
                                            <button type="button" aria-label={'Sütun ' + (sutunSira + 1) + ' bölme ' + (bolmeSira + 1) + ' sil'} disabled={sutun.panes.length <= 1} className={silDugmesi}
                                                onClick={() => sutunGuncelle(sutunSira, { panes: sutun.panes.filter((_, i) => i !== bolmeSira) })}><Trash2 size={16} /></button>
                                        </div>
                                        {sutun.panes.length > 1 && <label className="block text-xs text-sand-700">
                                            Yükseklik: %{yuzde(pane.weight ?? 50, toplamYukseklik)}
                                            <input type="range" min={PAY_ALT} max={PAY_UST} step="5" value={pane.weight ?? 50} id={'ekran-bolme-yukseklik-' + index + '-' + sutunSira + '-' + bolmeSira}
                                                onChange={e => bolmeGuncelle(sutunSira, bolmeSira, { ...pane, weight: Number(e.target.value) })} className="mt-1 w-full accent-moss-600" />
                                        </label>}
                                        {pane.kind === 'keys' && <div className="space-y-1.5">
                                            <p className="text-[11px] text-sand-600">Kısayol biçimi: ESC veya CTRL+C (en fazla 60 karakter).</p>
                                            {(['topLeft', 'topRight', 'center', 'bottomLeft', 'bottomRight'] as NavigationShortcutPosition[]).map((position, i) => (
                                                <label key={position} className="block text-xs text-sand-700">
                                                    {['Sol üst', 'Sağ üst', 'Orta', 'Sol alt', 'Sağ alt'][i]}
                                                    <input type="text" aria-label={'Sütun ' + (sutunSira + 1) + ' bölme ' + (bolmeSira + 1) + ' gezinme ' + position} defaultValue={normalizeNavigationShortcuts(pane.navigationShortcuts)[position]}
                                                        placeholder={DEFAULT_NAVIGATION_SHORTCUTS[position]} maxLength={60} pattern="[A-Za-z0-9\+_ \-]{1,60}"
                                                        onBlur={e => {
                                                            if (!e.target.reportValidity()) return;
                                                            const navigationShortcuts = normalizeNavigationShortcuts({ ...pane.navigationShortcuts, [position]: e.target.value });
                                                            e.target.value = navigationShortcuts[position];
                                                            bolmeGuncelle(sutunSira, bolmeSira, { ...pane, navigationShortcuts });
                                                        }} className={settingsFieldClass + ' mt-1 min-h-[44px]'} />
                                                </label>
                                            ))}
                                        </div>}
                                        {pane.kind === 'shortcuts' && <select aria-label={'Sütun ' + (sutunSira + 1) + ' bölme ' + (bolmeSira + 1) + ' kısayol profili'} value={pane.profileId ?? ''}
                                            onChange={e => bolmeGuncelle(sutunSira, bolmeSira, { ...pane, kind: 'shortcuts', profileId: e.target.value || undefined })}
                                            className={settingsFieldClass + ' min-h-[44px]'}>
                                            <option value="">Tüm makrolar</option>
                                            {prefs.profiles.map(p => <option key={p.id} value={p.id}>{p.name || 'Adsız profil'}</option>)}
                                        </select>}
                                    </div>)}
                                </div>
                                <button type="button" id={'ekran-bolme-ekle-' + index + '-' + sutunSira} disabled={sutun.panes.length >= EKRAN_SINIRLARI.bolme} className={kucukEkleDugmesi}
                                    onClick={() => sutunGuncelle(sutunSira, { panes: [...sutun.panes, { kind: 'mouse', weight: 50 }] })}>
                                    <Plus size={14} /> Bölme ekle{sutun.panes.length >= EKRAN_SINIRLARI.bolme ? ' (en fazla ' + EKRAN_SINIRLARI.bolme + ')' : ''}
                                </button>
                            </fieldset>;
                        })}
                        <button type="button" id={'ekran-sutun-ekle-' + index} disabled={duzen.columns.length >= EKRAN_SINIRLARI.sutun} className={kucukEkleDugmesi + ' w-full'}
                            onClick={() => sutunlariGuncelle([...duzen.columns, { weight: 50, panes: [{ kind: 'mouse', weight: 50 }] }])}>
                            <Plus size={14} /> Sütun ekle{duzen.columns.length >= EKRAN_SINIRLARI.sutun ? ' (en fazla ' + EKRAN_SINIRLARI.sutun + ')' : ''}
                        </button>
                    </div>
                </div>}
            </div>;
        })}
        <button type="button" id="ekran-ekle" onClick={ekle} className={ekleDugmesi}><Plus size={16} /> Ekran düzeni ekle</button>
    </div>;
}
