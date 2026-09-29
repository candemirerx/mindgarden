'use client';

import { useEffect, useState } from 'react';
import { Bluetooth, Check, MonitorSmartphone, MousePointer2, Radio, Wifi } from 'lucide-react';
import { baglantiSatiriniCoz, connectCard, connectComputerBluetooth, disconnectCard, discoverCards, remotePrefs, saveRemotePrefs, scanCards, scanPairedComputers, sendToComputerClipboard, testCard, testHelper } from '@/lib/remoteTools';
import type { RemotePrefs } from '@/lib/remoteTools';
import {
    SettingsField,
    SettingsGroupLabel,
    SettingsHint,
    SettingsNote,
    SettingsPageHeader,
    SettingsPill,
    SettingsRow,
    SettingsSection,
    SettingsSwitch,
    cx,
    settingsFieldClass
} from '@/components/ui/settings';

type Device = { address: string; name: string; rssi: number };

/** Bağlantı yolunun kısa adı; sekme başlığındaki rozette gösterilir. */
const CONNECTION_LABELS: Record<RemotePrefs['connection'], string> = {
    'pc-wifi': 'Doğrudan PC',
    'pc-bluetooth': 'PC Bluetooth',
    wifi: 'Kart Wi‑Fi',
    bluetooth: 'Kart BLE'
};

/** Yol seçtiren kutuların ortak görünümü. */
const linkCard = 'flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40';

/** Cihaz ve kart listesi satırlarının ortak görünümü. */
const listRow = 'block w-full rounded-xl border border-sand-200 bg-white p-2.5 text-left text-sm transition-colors duration-200 hover:border-sand-300 hover:bg-sand-50';

/**
 * PC yardımcısının üç adımlı kurulumu.
 *
 * Bilgiler eskiden tek bir numaralı liste ve üst üste paragraflar içinde
 * veriliyordu; adımlar burada her biri tek işi anlatan kutulara bölündü.
 */
const PC_ADIMLARI = [
    {
        baslik: 'Yardımcıyı bilgisayarda aç',
        aciklama: 'Masaüstündeki Not Bahçesi PC Yardımcısı kısayoluna çift tıklayın; kısayol yoksa projedeki scripts/pc_yardimcisi_baslat.cmd dosyasını çalıştırın.'
    },
    {
        baslik: 'Yönetici iznini bir kez ver',
        aciklama: 'Windows izin sorarsa Evet deyin. Bu izin güvenlik duvarına TCP 8765 kapısını yalnız Özel ağ için ekler; bu adım atlanırsa telefon PC’ye ulaşamaz.'
    },
    {
        baslik: 'Bağlantı satırını yapıştır',
        aciklama: 'Pencereyi kapatmayın; adres ve anahtarı panonuza tek satır olarak kopyalar. Aşağıdaki alana yapıştırıp Yapıştır ve uygula düğmesine dokunun. Telefon ve PC aynı güvenilen ağda olmalı.'
    }
];

export default function RemoteSettings() {
    const [prefs, setPrefs] = useState<RemotePrefs>(remotePrefs);
    const [devices, setDevices] = useState<Device[]>([]);
    const [paired, setPaired] = useState<Device[]>([]);
    const [cards, setCards] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [messageTone, setMessageTone] = useState<'ok' | 'error'>('ok');
    const [connected, setConnected] = useState('');
    /** PC penceresinden kopyalanan tek satırlık bağlantı bilgisi. */
    const [baglantiSatiri, setBaglantiSatiri] = useState('');
    useEffect(() => { setPrefs(remotePrefs()); }, []);
    const update = (next: RemotePrefs) => { setPrefs(next); saveRemotePrefs(next); };
    const act = async (action: () => Promise<void>) => {
        setBusy(true); setMessage('');
        try { await action(); setMessageTone('ok'); } catch (error) { setMessageTone('error'); setMessage(error instanceof Error ? error.message : 'Bağlantı hatası.'); }
        finally { setBusy(false); }
    };
    /**
     * PC penceresinin panoya kopyaladığı "adres|anahtar" satırını çözer.
     *
     * Kullanıcı iki alanı elle doldurmak zorunda kalmasın diye tek yapıştırma
     * yeter: satır okununca adres ve anahtar birlikte kaydedilir ve "Doğrudan
     * PC" bağlantı yolu seçilir.
     */
    const baglantiUygula = () => {
        const cozulen = baglantiSatiriniCoz(baglantiSatiri);
        if (!cozulen) {
            setMessageTone('error');
            setMessage('Satır okunamadı. PC penceresindeki satırı olduğu gibi yapıştırın: http://PC-IP:8765|anahtar');
            return;
        }
        update({ ...prefs, helperUrl: cozulen.helperUrl, helperToken: cozulen.helperToken, connection: 'pc-wifi' });
        setBaglantiSatiri('');
        setMessageTone('ok');
        setMessage('Adres ve anahtar alındı; "Doğrudan PC" bağlantısı seçildi. Şimdi PC bağlantısını dene ile sınayın.');
    };
    /** Yardımcı bağlantı bilgileri eksiksiz mi? Durum, kart başlığındaki rozette görünür. */
    const kurulumHazir = prefs.helperToken.trim() !== '' && (prefs.connection === 'pc-bluetooth' || prefs.helperUrl.trim() !== '');
    return <div className="space-y-4">
        <SettingsPageHeader
            icon={Radio}
            title="Bilgisayar bağlantısı"
            description="Önce bağlantı yolunu seçin. Notlarınız bağlantı olmadan da çalışır."
            badge={<SettingsPill tone={prefs.connection === 'wifi' || prefs.connection === 'bluetooth' ? 'clay' : 'moss'}>{CONNECTION_LABELS[prefs.connection]}</SettingsPill>}
        />

        <SettingsSection icon={Radio} title="Bağlantı yolu">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                    {([
                        { id: 'pc-wifi', label: 'Doğrudan PC', detail: 'Aynı Wi‑Fi · kart gerekmez', Icon: Wifi },
                        { id: 'pc-bluetooth', label: 'PC Bluetooth', detail: 'Klasik eşleşme · kart gerekmez', Icon: Bluetooth },
                        { id: 'wifi', label: 'Kart Wi‑Fi', detail: 'Kartın web bağlantısı', Icon: Wifi },
                        { id: 'bluetooth', label: 'Kart BLE', detail: 'Düşük enerji Bluetooth', Icon: Bluetooth }
                    ] as const).map(({ id, label, detail, Icon }) => {
                        const secili = prefs.connection === id;
                        return <button key={id} type="button" aria-pressed={secili} onClick={() => update({ ...prefs, connection: id })}
                            className={cx(linkCard, secili
                                ? 'border-moss-400 bg-moss-50 text-moss-800 ring-1 ring-moss-500/25'
                                : 'border-sand-200 bg-white text-sand-600 hover:border-sand-300 hover:text-sand-900')}>
                            <Icon size={20} className="shrink-0" />
                            <span>
                                <span className={cx('block text-sm font-semibold', secili ? 'text-moss-800' : 'text-sand-800')}>{label}</span>
                                <span className={cx('block text-xs', secili ? 'text-moss-700' : 'text-sand-600')}>{detail}</span>
                            </span>
                        </button>;
                    })}
                </div>

                {prefs.connection === 'pc-wifi' && <SettingsHint>Bilgisayarda aşağıdaki yardımcıyı açın. Telefonla PC aynı güvenilen Wi‑Fi ağında olmalı. Yazma, fare, makro ve pano doğrudan PC’ye gider.</SettingsHint>}

                {prefs.connection === 'pc-bluetooth' && <div className="space-y-3">
                    <SettingsHint>Windows ve telefonu sistem Bluetooth ayarlarından eşleştirin. PC yardımcısı gelen Bluetooth seri portunu açar; kart gerekmez. Önce yardımcının penceresinde “Klasik Bluetooth: gelen COM…” satırını kontrol edin.</SettingsHint>
                    <button type="button" disabled={busy} onClick={() => void act(async () => { setPaired(await scanPairedComputers()); setMessage('Eşleşmiş cihazlar listelendi. PC’nizi seçin.'); })} className="btn btn-secondary px-3 py-2 text-sm">Eşleşmiş cihazları göster</button>
                    {paired.map(device => <button key={device.address} type="button" disabled={busy} onClick={() => void act(async () => { await connectComputerBluetooth(device.address); setConnected(device.address); setMessage(device.name + ' seri Bluetooth bağlantısı kuruldu. Anahtarı girip bağlantıyı deneyin.'); })}
                        className={listRow}>{device.name} · {device.address}{connected === device.address ? ' ✓' : ''}</button>)}
                    {connected && <button type="button" onClick={() => void act(async () => { await disconnectCard(); setConnected(''); setMessage('Bağlantı kesildi.'); })} className="btn btn-ghost px-3 py-2 text-sm text-berry-600 hover:bg-berry-50">Bağlantıyı kes</button>}
                </div>}

                {prefs.connection === 'wifi' && <>
                    <p className="text-xs leading-relaxed text-sand-600">Telefon ve kart aynı ağda veya kart erişim noktasında olmalı; kartın USB kablosu hedef PC’de.</p>
                    <SettingsField label="Kart adresi (Wi‑Fi)" htmlFor="remote-kart-adresi">
                        <input id="remote-kart-adresi" className={settingsFieldClass} inputMode="url" value={prefs.cardUrl} onChange={e => update({ ...prefs, cardUrl: e.target.value })} placeholder="http://192.168.4.1" />
                    </SettingsField>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={busy} onClick={() => void act(async () => { await testCard(prefs); setMessage('Kablosuz Bellek kartına erişildi.'); })} className="btn btn-secondary px-4 py-2.5 text-sm">Kart bağlantısını dene</button>
                        <button type="button" disabled={busy} onClick={() => void act(async () => { const found = await discoverCards(); setCards(found); setMessage(found.length ? found.length + ' kart bulundu.' : 'Bu yerel ağda kart bulunamadı; IP adresini elle girebilirsiniz.'); })} className="btn btn-secondary px-4 py-2.5 text-sm">Yerel ağda kart ara</button>
                        <button type="button" onClick={() => update({ ...prefs, cardUrl: 'http://192.168.4.1' })} className="btn btn-ghost px-3 py-2.5 text-sm text-moss-700">Kart AP adresini kullan</button>
                    </div>
                    {cards.map(url => <button key={url} type="button" className={listRow + ' p-3'} onClick={() => update({ ...prefs, cardUrl: url, connection: 'wifi' })}>{url} — seç</button>)}
                </>}

                {prefs.connection === 'bluetooth' && <div className="space-y-3">
                    <p className="text-xs leading-relaxed text-sand-600">Kartın “USB HID Klavye” NUS yayınına bağlanın; kartın USB kablosu hedef PC’de olmalı.</p>
                    <button type="button" disabled={busy} onClick={() => void act(async () => { setDevices(await scanCards()); setMessage('Tarama tamamlandı.'); })} className="btn btn-secondary px-4 py-2.5 text-sm">{busy ? 'İşleniyor…' : 'BLE cihazlarını tara (8 sn)'}</button>
                    {devices.map(device => <button type="button" key={device.address} disabled={busy} onClick={() => void act(async () => { await connectCard(device.address); setConnected(device.address); update({ ...prefs, connection: 'bluetooth' }); setMessage(device.name + ' bağlandı.'); })}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-sand-200 bg-white p-3 text-left text-sm transition-colors duration-200 hover:border-sand-300 hover:bg-sand-50"><span className="truncate">{device.name} <span className="text-sand-600">{device.address}</span></span><span>{connected === device.address ? <Check size={18} /> : device.rssi + ' dBm'}</span></button>)}
                    {connected && <button type="button" onClick={() => void act(async () => { await disconnectCard(); setConnected(''); setMessage('BLE bağlantısı kesildi.'); })} className="btn btn-ghost px-3 py-2 text-sm text-berry-600 hover:bg-berry-50">BLE bağlantısını kes</button>}
                </div>}
            </div>
        </SettingsSection>

        <SettingsSection
            icon={MonitorSmartphone}
            title="PC yardımcısı"
            description="Bilgisayarda açık kalan küçük bir alıcıdır: telefondan gelen yazı, fare ve pano isteklerini uygular. Uygulamanın parçası değildir."
            action={<SettingsPill tone={kurulumHazir ? 'moss' : 'sand'}>{kurulumHazir ? 'Bağlantı hazır' : 'Bağlantı yok'}</SettingsPill>}
        >
            <div className="space-y-4">
                <ol className="space-y-2">
                    {PC_ADIMLARI.map((adim, sira) => (
                        <li key={adim.baslik} className="flex gap-3 rounded-xl border border-sand-200 bg-sand-50/70 p-3">
                            <span aria-hidden className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-moss-100 text-xs font-semibold text-moss-700">{sira + 1}</span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold leading-5 text-sand-900">{adim.baslik}</p>
                                <p className="mt-0.5 text-xs leading-relaxed text-sand-600">{adim.aciklama}</p>
                            </div>
                        </li>
                    ))}
                </ol>
                <SettingsHint>
                    Yardımcı penceresi kapanınca bağlantı biter; yeni oturumda kısayoldan başlatın. Başka bir bilgisayarda kullanmak için o PC’de yardımcıyı açıp kendi bağlantı satırını yapıştırın; telefonda yeniden kurulum gerekmez.
                </SettingsHint>
                <SettingsField label="Tek satır bağlantı bilgisi" htmlFor="pc-baglanti-satiri" hint="PC penceresinin kopyaladığı satırı buraya yapıştırın; adres ve anahtar birlikte dolar.">
                    <div className="flex flex-wrap items-stretch gap-2">
                        <input id="pc-baglanti-satiri" className={settingsFieldClass + ' min-w-0 flex-1'} value={baglantiSatiri} onChange={e => setBaglantiSatiri(e.target.value)} placeholder="http://192.168.1.20:8765|anahtar" />
                        <button type="button" id="pc-baglanti-uygula" disabled={busy || !baglantiSatiri.trim()} onClick={baglantiUygula} className="btn btn-primary min-h-[44px] shrink-0 px-4 text-sm">Yapıştır ve uygula</button>
                    </div>
                </SettingsField>
                <div className="grid gap-3 sm:grid-cols-2">
                    {prefs.connection !== 'pc-bluetooth' && <SettingsField label="Adres" htmlFor="pc-yardimci-adresi">
                        <input id="pc-yardimci-adresi" aria-label="PC yardımcı programı adresi" className={settingsFieldClass} inputMode="url" placeholder="http://192.168.1.20:8765" value={prefs.helperUrl} onChange={e => update({ ...prefs, helperUrl: e.target.value })} />
                    </SettingsField>}
                    <SettingsField label="Erişim anahtarı" htmlFor="pc-yardimci-anahtari" hint="Bağlantı satırı yapıştırıldığında iki alan da kendiliğinden dolar.">
                        <input id="pc-yardimci-anahtari" aria-label="PC yardımcı programı erişim anahtarı" className={settingsFieldClass} type="password" autoComplete="off" placeholder="Yardımcı programın erişim anahtarı" value={prefs.helperToken} onChange={e => update({ ...prefs, helperToken: e.target.value })} />
                    </SettingsField>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => void act(async () => { await testHelper(prefs); setMessage('PC yardımcısı hazır.'); })} className="btn btn-primary min-h-[44px] px-4 text-sm">PC bağlantısını dene</button>
                    <button type="button" id="pc-pano-test" disabled={busy} onClick={() => void act(async () => { await sendToComputerClipboard('Not Bahçesi pano denemesi', prefs); setMessage('Deneme metni bilgisayarın panosuna gönderildi; PC’de Ctrl+V ile yapıştırıp kontrol edin.'); })} className="btn btn-secondary min-h-[44px] px-4 text-sm">Pano aktarımını dene</button>
                </div>
                <SettingsHint>
                    Yardımcı; klasik Bluetooth seri ve Wi‑Fi bağlantısını alır. Doğrudan PC BLE (düşük enerji Bluetooth) Windows’ta ayrıca GATT alıcısı gerektirdiği için bu sürümde kullanılmaz.
                </SettingsHint>
            </div>
        </SettingsSection>

        <SettingsSection icon={MousePointer2} title="Araç davranışı">
            <div className="space-y-4">
                <SettingsField label={'Fare hassasiyeti: ' + prefs.mouseSensitivity.toFixed(1) + '×'} htmlFor="remote-hassasiyet">
                    <input id="remote-hassasiyet" className="w-full accent-moss-600" type="range" min="0.4" max="2.5" step="0.1" value={prefs.mouseSensitivity} onChange={e => update({ ...prefs, mouseSensitivity: Number(e.target.value) })} />
                </SettingsField>
                <SettingsField label="Dikte dili" htmlFor="remote-dikte-dili">
                    <input id="remote-dikte-dili" className={settingsFieldClass} value={prefs.dictationLanguage} onChange={e => update({ ...prefs, dictationLanguage: e.target.value })} placeholder="tr-TR" />
                </SettingsField>
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

        {message && <SettingsNote tone={messageTone}>{message}</SettingsNote>}
    </div>;
}

