'use client';

import { useEffect, useState } from 'react';
import { Download, MonitorSmartphone, MousePointer2, Radio } from 'lucide-react';
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
import { Capacitor } from '@capacitor/core';
import DikteMotoruAyari from './DikteMotoruAyari';
import BaglantiKurulumu, { PcBluetoothPano, PcWifiEslestirme, YardimciIndir } from './BaglantiKurulumu';
import YardimciKlasorleri from '@/components/ui/YardimciKlasorleri';

/** Bağlantı yolunun kısa adı; sekme başlığındaki rozette gösterilir. */
const CONNECTION_LABELS: Record<RemotePrefs['connection'], string> = {
    'pc-wifi': 'Bilgisayar · Wi‑Fi',
    'pc-bluetooth': 'Bilgisayar · Bluetooth',
    wifi: 'Kart · Wi‑Fi',
    bluetooth: 'Kart · Bluetooth'
};

export default function RemoteSettings() {
    const [prefs, setPrefs] = useState<RemotePrefs>(remotePrefs);
    const [motorlar, setMotorlar] = useState<{ onDevice: boolean; system: boolean; google?: boolean } | null>(null);
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

        <SettingsSection icon={Radio} title="Bağlantı yolu" description="Yolu seçin ve adımları sırayla izleyin. Bilgisayar yolları için kart gerekmez; kart yolları için kartın USB kablosu hedef bilgisayarda olmalı. Açılışta otomatik bağlan açıkken uygulama her açılışta seçili yolu kendisi kurar.">
            <BaglantiKurulumu prefs={prefs} update={update} />
        </SettingsSection>

        <SettingsSection icon={Download} tone="clay" title="PC yardımcısı" description="Pano, dosya aktarımı ve doğrudan PC Wi-Fi için tek program. Bluetooth klavye/fare ve kartla yazma yardımcı olmadan çalışır.">
            <div className="space-y-3">
                <YardimciIndir prefs={prefs} />
                <YardimciKlasorleri />
            </div>
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
                <SettingsField label="Dikte motoru" htmlFor="dikte-motoru">
                    <DikteMotoruAyari prefs={prefs} update={update} motorlar={motorlar} telefon={Capacitor.isNativePlatform()} />
                </SettingsField>
                <p className="rounded-xl border border-sand-200 bg-sand-50/70 px-3.5 py-3 text-xs leading-relaxed text-sand-700">
                    <strong className="font-semibold text-sand-900">Dikte ve Köprü Dikte ayarları</strong> (nereye yazılacağı, süre, anında yazma):
                    Ayarlar → Düzenleme araçları → Bilgisayar araçları listesinde, ilgili aracın yanındaki <strong>dişli</strong> simgesinde.
                </p>
            </div>
        </SettingsSection>

    </div>;
}
