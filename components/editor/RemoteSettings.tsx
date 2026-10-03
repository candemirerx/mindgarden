'use client';

import { useEffect, useState } from 'react';
import { MonitorSmartphone, MousePointer2, Radio } from 'lucide-react';
import { remotePrefs, saveRemotePrefs, dictationEngines } from '@/lib/remoteTools';
import type { RemotePrefs } from '@/lib/remoteTools';
import {
    SettingsField,
    SettingsGroupLabel,
    SettingsPageHeader,
    SettingsPill,
    SettingsRow,
    SettingsSection,
    SettingsSwitch,
    settingsFieldClass
} from '@/components/ui/settings';
import BaglantiKurulumu, { PcBluetoothPano, PcWifiEslestirme } from './BaglantiKurulumu';

/** Bağlantı yolunun kısa adı; sekme başlığındaki rozette gösterilir. */
const CONNECTION_LABELS: Record<RemotePrefs['connection'], string> = {
    'pc-wifi': 'Bilgisayar · Wi‑Fi',
    'pc-bluetooth': 'Bilgisayar · Bluetooth',
    wifi: 'Kart · Wi‑Fi',
    bluetooth: 'Kart · Bluetooth'
};

export default function RemoteSettings() {
    const [prefs, setPrefs] = useState<RemotePrefs>(remotePrefs);
    const [motorlar, setMotorlar] = useState<{ onDevice: boolean; system: boolean } | null>(null);
    useEffect(() => { setPrefs(remotePrefs()); void dictationEngines().then(setMotorlar); }, []);
    const update = (next: RemotePrefs) => { setPrefs(next); saveRemotePrefs(next); };
    const kartKipi = prefs.connection === 'wifi' || prefs.connection === 'bluetooth';
    const pcEslesmis = !!(prefs.helperToken && (prefs.helperUrl || prefs.helperBluetoothAddress));
    /** Kart kipinde pano için PC'ye hangi yoldan bağlanılacağı (görünüm tercihi). */
    const [panoYolu, setPanoYolu] = useState<'bluetooth' | 'wifi'>(() => (prefs.helperUrl ? 'wifi' : 'bluetooth'));
    return <div className="space-y-4">
        <SettingsPageHeader
            icon={Radio}
            title="Bilgisayar bağlantısı"
            badge={<SettingsPill tone={kartKipi ? 'clay' : 'moss'}>{CONNECTION_LABELS[prefs.connection]}</SettingsPill>}
        />

        <SettingsSection icon={Radio} title="Bağlantı yolu" description="Bir yol seçin ve adımları sırayla izleyin. Bilgisayar yolları için kart gerekmez; kart yolları için kartın USB kablosu bilgisayara takılı olmalı.">
            <BaglantiKurulumu prefs={prefs} update={update} />
        </SettingsSection>

        {(kartKipi || prefs.connection === 'pc-bluetooth') && <SettingsSection
            icon={MonitorSmartphone}
            title="PC panosu (isteğe bağlı)"
            description={(kartKipi ? 'Kart' : 'Bluetooth klavye') + ' yazar ve fareyi oynatır ama bilgisayarın panosuna erişemez. Pano düğmesini kullanacaksanız bilgisayarda Not Bahçesi PC Yardımcısı açıkken bir kez bağlanın: Bluetooth ile kod gerekmez, Wi‑Fi ile 6 haneli kod gerekir. Yazma ve fare bundan etkilenmez.'}
            action={<SettingsPill tone={pcEslesmis ? 'moss' : 'sand'}>{pcEslesmis ? 'Eşleşmiş' : 'Kurulum'}</SettingsPill>}
        >
            <div className="space-y-3">
                <div role="radiogroup" aria-label="Pano bağlantısı" className="grid grid-cols-2 gap-1.5">
                    {([['bluetooth', 'Bluetooth ile', 'Kod gerekmez'], ['wifi', 'Wi‑Fi ile', '6 haneli kod']] as const).map(([id, ad, alt]) => (
                        <button key={id} type="button" role="radio" aria-checked={panoYolu === id} id={'pano-yolu-' + id} onClick={() => setPanoYolu(id)}
                            className={'min-h-[44px] rounded-xl border px-3 py-2 text-left ' + (panoYolu === id ? 'border-moss-600 bg-moss-100 text-moss-800' : 'border-sand-200 bg-white text-sand-700')}>
                            <span className="block text-sm font-semibold">{ad}</span><span className="block text-[11px] opacity-80">{alt}</span>
                        </button>
                    ))}
                </div>
                {panoYolu === 'bluetooth'
                    ? <PcBluetoothPano prefs={prefs} update={update} yoluSec={false} />
                    : <PcWifiEslestirme prefs={prefs} update={update} yoluSec={false} />}
            </div>
        </SettingsSection>}

        <SettingsSection icon={MousePointer2} title="Araç davranışı">
            <div className="space-y-4">
                <SettingsField label={'Fare hassasiyeti: ' + prefs.mouseSensitivity.toFixed(1) + '×'} htmlFor="remote-hassasiyet">
                    <input id="remote-hassasiyet" className="w-full accent-moss-600" type="range" min="0.4" max="2.5" step="0.1" value={prefs.mouseSensitivity} onChange={e => update({ ...prefs, mouseSensitivity: Number(e.target.value) })} />
                </SettingsField>
                <SettingsField label="Dikte dili" htmlFor="remote-dikte-dili">
                    <input id="remote-dikte-dili" className={settingsFieldClass} value={prefs.dictationLanguage} onChange={e => update({ ...prefs, dictationLanguage: e.target.value })} placeholder="tr-TR" />
                </SettingsField>
                {motorlar && (motorlar.onDevice || motorlar.system) && (
                    <SettingsField label="Köprü Dikte ses tanıma motoru" htmlFor="remote-dikte-motoru"
                        hint={motorlar.onDevice
                            ? 'Cihaz içi motor internet gerektirmez ve çevrimiçi servisin kesintilerinden etkilenmez. Otomatik: cihaz içi motor varsa o kullanılır.'
                            : 'Bu telefon cihaz içi ses tanımayı desteklemiyor; çevrimiçi sistem tanıyıcısı kullanılır.'}>
                        <select id="remote-dikte-motoru" className={settingsFieldClass} value={motorlar.onDevice ? prefs.dictationEngine : 'system'} disabled={!motorlar.onDevice}
                            onChange={e => update({ ...prefs, dictationEngine: e.target.value as RemotePrefs['dictationEngine'] })}>
                            <option value="auto">Otomatik (önerilen)</option>
                            <option value="device">Yalnızca cihaz içi</option>
                            <option value="system">Çevrimiçi (sistem)</option>
                        </select>
                    </SettingsField>
                )}
                <SettingsField label="Köprü Dikte süresi (saniye)" htmlFor="remote-kopru-sure" hint="5–3600 saniye. Süre bitmeden araç düğmesine tekrar basarak durdurabilirsiniz.">
                    <input id="remote-kopru-sure" className={settingsFieldClass} type="number" inputMode="numeric" min="5" max="3600" step="1" disabled={prefs.bridgeDictationUnlimited} value={prefs.bridgeDictationSeconds}
                        onChange={e => update({ ...prefs, bridgeDictationSeconds: Math.max(5, Math.min(3600, Number(e.target.value) || 5)) })} />
                </SettingsField>
                <SettingsRow title="Köprü Dikte'de konuşurken anında yaz" description="Açıkken söz, cümle sonu beklenmeden yazılır ve yanlış tanınan kelime bilgisayarda düzeltilir. Kapalıyken dikte bitince tek seferde yazılır.">
                    <SettingsSwitch checked={prefs.bridgeDictationLive} onChange={v => update({ ...prefs, bridgeDictationLive: v })} label="Köprü Dikte'de konuşurken anında yaz" />
                </SettingsRow>
                <SettingsRow title="Ben durdurana kadar dinle">
                    <SettingsSwitch checked={prefs.bridgeDictationUnlimited} onChange={v => update({ ...prefs, bridgeDictationUnlimited: v })} label="Ben durdurana kadar dinle" />
                </SettingsRow>
                <div className="space-y-2.5" role="radiogroup" aria-labelledby="remote-dikte-hedefi">
                    <SettingsGroupLabel><span id="remote-dikte-hedefi">Dikte hedefi</span></SettingsGroupLabel>
                    <label className="flex items-center gap-2.5 text-sm text-sand-800"><input type="radio" className="accent-moss-600" name="dictation-target" checked={prefs.dictationTarget === 'editor'} onChange={() => update({ ...prefs, dictationTarget: 'editor' })} /> Not metnine yaz</label>
                    <label className="flex items-center gap-2.5 text-sm text-sand-800"><input type="radio" className="accent-moss-600" name="dictation-target" checked={prefs.dictationTarget === 'computer'} onChange={() => update({ ...prefs, dictationTarget: 'computer' })} /> Doğrudan bilgisayara yaz (nota dokunma)</label>
                </div>
                {prefs.dictationTarget === 'editor' && <SettingsRow title="Dikte sonucunu mevcut metnin sonuna ekle">
                    <SettingsSwitch checked={prefs.appendDictation} onChange={v => update({ ...prefs, appendDictation: v })} label="Dikte sonucunu mevcut metnin sonuna ekle" />
                </SettingsRow>}
            </div>
        </SettingsSection>

    </div>;
}
