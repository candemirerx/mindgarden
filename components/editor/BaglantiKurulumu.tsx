'use client';

/**
 * Bilgisayar bağlantısı kurulum sihirbazı.
 *
 * Dört yolun her biri numaralı adımlarla kurulur; her adım tamamlanınca onay
 * işareti alır, hata olursa ne yapılacağı aynı yerde yazar.
 *  - Doğrudan PC (Wi‑Fi): yardımcı ağda bulunur, pencerede görünen 6 haneli
 *    kodla eşleşilir; uzun erişim anahtarı elle taşınmaz.
 *  - PC Bluetooth: eşleşmiş bilgisayar seçilir, aynı 6 haneli kod Bluetooth
 *    üzerinden gönderilir.
 *  - Kart Wi‑Fi: telefon kartın kendi ağındaysa adres kendiliğinden bulunur,
 *    değilse ev ağı taranır.
 *  - Kart BLE: kartlar önce listelenir, diğer cihazlar katlanır.
 */
import { useEffect, useState } from 'react';
import { Bluetooth, Check, Loader2, MonitorSmartphone, Search, Wifi } from 'lucide-react';
import {
    baglantiSatiriniCoz, bilgisayarAdresiniSina, bilgisayarlaEslestirBluetooth, bilgisayarlaEslestirWifi, bilgisayarlariBul,
    bluetoothAyarlariniAc, connectCard, disconnectCard, kartAginda, kartiWifidaBul, scanCards, scanPairedComputers,
    sendToComputerClipboard, telefonWifiAdresi, testCard, testHelper
} from '@/lib/remoteTools';
import type { BulunanBilgisayar, Device, RemotePrefs } from '@/lib/remoteTools';
import { SettingsField, SettingsNote, cx, settingsFieldClass } from '@/components/ui/settings';

type Mesaj = { tone: 'ok' | 'error' | 'info'; text: string } | null;
type Guncelle = (next: RemotePrefs) => void;

/** Her kurulum bölümünün ortak meşgul/mesaj durumu. */
function useIslem() {
    const [mesgul, setMesgul] = useState('');
    const [mesaj, setMesaj] = useState<Mesaj>(null);
    const calistir = async (ad: string, is: () => Promise<string | void>) => {
        setMesgul(ad); setMesaj(null);
        try { const sonuc = await is(); if (sonuc) setMesaj({ tone: 'ok', text: sonuc }); }
        catch (hata) { setMesaj({ tone: 'error', text: hata instanceof Error ? hata.message : 'İşlem başarısız.' }); }
        finally { setMesgul(''); }
    };
    return { mesgul, mesaj, setMesaj, calistir };
}

const anaDugme = 'btn btn-primary min-h-[44px] gap-1.5 px-4 text-sm';
const ikinciDugme = 'btn btn-secondary min-h-[44px] gap-1.5 px-4 text-sm';
const satir = 'flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors duration-200';

function Bekliyor({ goster, children }: { goster: boolean; children: React.ReactNode }) {
    return <>{goster ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null}{children}</>;
}

/** Numaralı adım: tamamlanınca numara yerine onay işareti. */
function Adim({ no, baslik, tamam, children }: { no: number; baslik: string; tamam?: boolean; children: React.ReactNode }) {
    return <li className="flex gap-3">
        <span aria-hidden="true" className={cx('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            tamam ? 'bg-moss-600 text-white' : 'border border-sand-300 bg-white text-sand-700')}>
            {tamam ? <Check size={15} /> : no}
        </span>
        <div className="min-w-0 flex-1 space-y-2 pb-1">
            <p className="text-sm font-semibold text-sand-900">{baslik}{tamam && <span className="sr-only"> (tamamlandı)</span>}</p>
            {children}
        </div>
    </li>;
}

function Aciklama({ children }: { children: React.ReactNode }) {
    return <p className="text-xs leading-relaxed text-sand-600">{children}</p>;
}

/** Bilgisayardaki 6 haneli eşleştirme kodu alanı. */
function KodAlani({ id, deger, onDegis, onGonder, mesgul, dugmeMetni }: { id: string; deger: string; onDegis: (v: string) => void; onGonder: () => void; mesgul: boolean; dugmeMetni: string }) {
    return <div className="flex flex-wrap items-stretch gap-2">
        <input id={id} aria-label="6 haneli eşleştirme kodu" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123 456"
            value={deger} onChange={e => onDegis(e.target.value.replace(/[^\d ]/g, ''))}
            onKeyDown={e => { if (e.key === 'Enter') onGonder(); }}
            className={settingsFieldClass + ' min-h-[44px] w-36 text-center text-lg font-semibold tracking-[0.2em]'} />
        <button type="button" disabled={mesgul || deger.replace(/\D/g, '').length !== 6} onClick={onGonder} className={anaDugme}>
            <Bekliyor goster={mesgul}>{dugmeMetni}</Bekliyor>
        </button>
    </div>;
}

/**
 * Wi‑Fi üzerinden PC yardımcısıyla eşleştirme (bul + kod). Doğrudan PC yolunda
 * ve kart kiplerinde PC panosu için ortak kullanılır.
 */
export function PcWifiEslestirme({ prefs, update, yoluSec }: { prefs: RemotePrefs; update: Guncelle; yoluSec: boolean }) {
    const { mesgul, mesaj, setMesaj, calistir } = useIslem();
    const [bulunan, setBulunan] = useState<BulunanBilgisayar[] | null>(null);
    const [secili, setSecili] = useState<BulunanBilgisayar | null>(null);
    const [elleAdres, setElleAdres] = useState('');
    const [kod, setKod] = useState('');
    const [satirKodu, setSatirKodu] = useState('');
    const eslesmis = !!(prefs.helperUrl && prefs.helperToken);
    const hedef = secili ?? (prefs.helperUrl ? { url: prefs.helperUrl, name: prefs.helperName || 'Bilgisayar' } : null);
    return <div className="space-y-3">
        <ol className="space-y-4">
            <Adim no={1} baslik="Bilgisayarda yardımcıyı açın" tamam={eslesmis}>
                <Aciklama>Bilgisayarda masaüstündeki <strong>Not Bahçesi PC Yardımcısı</strong> kısayolunu açın (ilk kurulumda <code>pc_yardimcisi_baslat.cmd</code>). Pencerede <strong>6 haneli eşleştirme kodu</strong> görünür. Telefon ve bilgisayar aynı Wi‑Fi ağında olmalı.</Aciklama>
            </Adim>
            <Adim no={2} baslik="Bilgisayarı bulun" tamam={!!hedef}>
                <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={!!mesgul} className={ikinciDugme} onClick={() => void calistir('ara', async () => {
                        setBulunan(null);
                        const liste = await bilgisayarlariBul();
                        setBulunan(liste);
                        if (!liste.length) throw new Error('Ağda yardımcı bulunamadı. Yardımcı penceresi açık mı, telefon aynı Wi‑Fi ağında mı? Adresi aşağıya elle de yazabilirsiniz.');
                        if (liste.length === 1) { setSecili(liste[0]); return liste[0].name + ' bulundu. Şimdi kodu yazın.'; }
                        return liste.length + ' bilgisayar bulundu; birini seçin.';
                    })}>
                        <Bekliyor goster={mesgul === 'ara'}><Search size={15} aria-hidden="true" /> {mesgul === 'ara' ? 'Aranıyor (~15 sn)…' : 'Ağda bilgisayar ara'}</Bekliyor>
                    </button>
                </div>
                {bulunan && bulunan.map(pc => {
                    const sec = hedef?.url === pc.url;
                    return <button key={pc.url} type="button" aria-pressed={sec} onClick={() => setSecili(pc)}
                        className={cx(satir, sec ? 'border-moss-400 bg-moss-50' : 'border-sand-200 bg-white hover:border-sand-300')}>
                        <MonitorSmartphone size={18} className="shrink-0 text-moss-700" aria-hidden="true" />
                        <span className="min-w-0 flex-1"><span className="block font-medium text-sand-900">{pc.name}</span><span className="block truncate text-xs text-sand-600">{pc.url.replace('http://', '')}</span></span>
                        {sec && <Check size={16} className="text-moss-700" aria-hidden="true" />}
                    </button>;
                })}
                {hedef && !bulunan && <p className="text-xs text-sand-700">Seçili: <strong>{hedef.name}</strong> · {hedef.url.replace('http://', '')}</p>}
                <details className="rounded-xl border border-sand-200">
                    <summary className="min-h-11 cursor-pointer px-3 py-3 text-xs font-medium text-sand-700">Adresi elle yaz</summary>
                    <div className="flex flex-wrap gap-2 px-3 pb-3">
                        <input aria-label="Bilgisayar adresi" className={settingsFieldClass + ' min-h-[44px] min-w-0 flex-1'} inputMode="url" placeholder="192.168.1.20" value={elleAdres} onChange={e => setElleAdres(e.target.value)} />
                        <button type="button" disabled={!!mesgul || !elleAdres.trim()} className={ikinciDugme} onClick={() => void calistir('elle', async () => {
                            const pc = await bilgisayarAdresiniSina(elleAdres); setSecili(pc); return pc.name + ' bulundu. Şimdi kodu yazın.';
                        })}><Bekliyor goster={mesgul === 'elle'}>Bu adresi kullan</Bekliyor></button>
                    </div>
                </details>
            </Adim>
            <Adim no={3} baslik="Eşleştirme kodunu yazın" tamam={eslesmis && (!secili || secili.url === prefs.helperUrl)}>
                {hedef
                    ? <KodAlani id={'pc-wifi-kod' + (yoluSec ? '' : '-pano')} deger={kod} onDegis={setKod} mesgul={mesgul === 'eslestir'} dugmeMetni="Eşleştir"
                        onGonder={() => void calistir('eslestir', async () => {
                            const sonuc = await bilgisayarlaEslestirWifi(hedef.url, kod);
                            update({ ...prefs, ...sonuc, ...(yoluSec ? { connection: 'pc-wifi' as const } : {}) });
                            setKod(''); setSecili(null); setBulunan(null);
                            return sonuc.helperName + ' ile eşleşildi.';
                        })} />
                    : <Aciklama>Önce bilgisayarı bulun.</Aciklama>}
                {eslesmis && <p className="text-xs text-moss-700">Eşleşmiş: <strong>{prefs.helperName || 'Bilgisayar'}</strong> · {prefs.helperUrl.replace('http://', '')}</p>}
            </Adim>
            <Adim no={4} baslik="Deneyin">
                <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={!!mesgul || !eslesmis} className={anaDugme} onClick={() => void calistir('dene', async () => {
                        await testHelper({ ...prefs, connection: 'pc-wifi' }); return 'Bilgisayara bağlanıldı; araçlar hazır.';
                    })}><Bekliyor goster={mesgul === 'dene'}>Bağlantıyı dene</Bekliyor></button>
                    <button type="button" disabled={!!mesgul || !eslesmis} className={ikinciDugme} onClick={() => void calistir('pano', async () => {
                        await sendToComputerClipboard('Not Bahçesi pano denemesi', { ...prefs, ...(yoluSec ? { connection: 'pc-wifi' as const } : {}) });
                        return 'Panoya gönderildi. Bilgisayarda Ctrl+V ile kontrol edin.';
                    })}><Bekliyor goster={mesgul === 'pano'}>Panoyu dene</Bekliyor></button>
                </div>
            </Adim>
        </ol>
        {mesaj && <SettingsNote tone={mesaj.tone}>{mesaj.text}</SettingsNote>}
        <details className="rounded-xl border border-sand-200">
            <summary className="min-h-11 cursor-pointer px-3 py-3 text-xs font-medium text-sand-700">Gelişmiş: bağlantı satırıyla ya da elle kur</summary>
            <div className="space-y-3 px-3 pb-3">
                <Aciklama>Yardımcının panoya kopyaladığı <code>adres|anahtar</code> satırını yapıştırabilirsiniz.</Aciklama>
                <div className="flex flex-wrap gap-2">
                    <input aria-label="Bağlantı satırı" type="password" autoComplete="off" className={settingsFieldClass + ' min-h-[44px] min-w-0 flex-1'} value={satirKodu} onChange={e => setSatirKodu(e.target.value)} placeholder="Satırı yapıştırın" />
                    <button type="button" disabled={!satirKodu.trim()} className={ikinciDugme} onClick={() => {
                        const c = baglantiSatiriniCoz(satirKodu);
                        if (!c) { setMesaj({ tone: 'error', text: 'Satır okunamadı. Yardımcıdan yeniden kopyalayın.' }); return; }
                        update({ ...prefs, ...c, ...(yoluSec ? { connection: 'pc-wifi' as const } : {}) }); setSatirKodu('');
                        setMesaj({ tone: 'ok', text: 'Bağlantı bilgileri kaydedildi.' });
                    }}>Kaydet</button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <SettingsField label="Adres" htmlFor={'pc-yardimci-adresi' + (yoluSec ? '' : '-pano')}>
                        <input id={'pc-yardimci-adresi' + (yoluSec ? '' : '-pano')} className={settingsFieldClass} inputMode="url" placeholder="http://192.168.1.20:8765" value={prefs.helperUrl} onChange={e => update({ ...prefs, helperUrl: e.target.value })} />
                    </SettingsField>
                    <SettingsField label="Erişim anahtarı" htmlFor={'pc-yardimci-anahtari' + (yoluSec ? '' : '-pano')}>
                        <input id={'pc-yardimci-anahtari' + (yoluSec ? '' : '-pano')} className={settingsFieldClass} type="password" autoComplete="off" value={prefs.helperToken} onChange={e => update({ ...prefs, helperToken: e.target.value })} />
                    </SettingsField>
                </div>
            </div>
        </details>
    </div>;
}

/** PC Bluetooth: eşleşmiş bilgisayarı seç, kodla eşleş, dene. */
function PcBluetoothKurulumu({ prefs, update }: { prefs: RemotePrefs; update: Guncelle }) {
    const { mesgul, mesaj, calistir } = useIslem();
    const [cihazlar, setCihazlar] = useState<Device[] | null>(null);
    const [kod, setKod] = useState('');
    const bilgisayarlar = (cihazlar ?? []).filter(d => d.computer);
    const digerleri = (cihazlar ?? []).filter(d => !d.computer);
    const secili = prefs.helperBluetoothAddress;
    const anahtarVar = !!prefs.helperToken;
    const cihazSatiri = (d: Device) => {
        const sec = secili === d.address;
        return <button key={d.address} type="button" aria-pressed={sec} onClick={() => update({ ...prefs, helperBluetoothAddress: d.address, connection: 'pc-bluetooth' })}
            className={cx(satir, sec ? 'border-moss-400 bg-moss-50' : 'border-sand-200 bg-white hover:border-sand-300')}>
            {d.computer ? <MonitorSmartphone size={18} className="shrink-0 text-moss-700" aria-hidden="true" /> : <Bluetooth size={18} className="shrink-0 text-sand-500" aria-hidden="true" />}
            <span className="min-w-0 flex-1"><span className="block font-medium text-sand-900">{d.name}</span><span className="block truncate text-xs text-sand-600">{d.address}</span></span>
            {sec && <Check size={16} className="text-moss-700" aria-hidden="true" />}
        </button>;
    };
    return <div className="space-y-3">
        <ol className="space-y-4">
            <Adim no={1} baslik="Bilgisayarda Bluetooth'u ve yardımcıyı açın">
                <Aciklama>Bilgisayarda Bluetooth açık olmalı ve <strong>Not Bahçesi PC Yardımcısı</strong> çalışmalı. Telefon bilgisayarla daha önce eşleşmediyse önce Android Bluetooth ayarlarından eşleştirin.</Aciklama>
                <button type="button" className={ikinciDugme} onClick={() => void calistir('ayar', async () => { await bluetoothAyarlariniAc(); })}>
                    <Bluetooth size={15} aria-hidden="true" /> Bluetooth ayarlarını aç
                </button>
            </Adim>
            <Adim no={2} baslik="Bilgisayarınızı seçin" tamam={!!secili}>
                <button type="button" disabled={!!mesgul} className={ikinciDugme} onClick={() => void calistir('liste', async () => {
                    const liste = await scanPairedComputers(); setCihazlar(liste);
                    return liste.some(d => d.computer) ? '' : 'Eşleşmiş bilgisayar görünmüyor. Bilgisayarınız "Diğer cihazlar" altında olabilir ya da önce eşleştirmeniz gerekir.';
                })}><Bekliyor goster={mesgul === 'liste'}>Eşleşmiş bilgisayarları göster</Bekliyor></button>
                {bilgisayarlar.map(cihazSatiri)}
                {digerleri.length > 0 && <details className="rounded-xl border border-sand-200">
                    <summary className="min-h-11 cursor-pointer px-3 py-3 text-xs font-medium text-sand-700">Diğer eşleşmiş cihazlar ({digerleri.length})</summary>
                    <div className="space-y-2 px-3 pb-3">{digerleri.map(cihazSatiri)}</div>
                </details>}
                {secili && !cihazlar && <p className="text-xs text-sand-700">Seçili: {secili}</p>}
            </Adim>
            <Adim no={3} baslik="Eşleştirme kodunu yazın" tamam={anahtarVar}>
                {anahtarVar && <p className="text-xs text-moss-700">Anahtar kayıtlı{prefs.helperName ? ' (' + prefs.helperName + ')' : ''}. Aynı bilgisayarla Wi‑Fi'dan eşleştiyseniz kod gerekmez.</p>}
                {secili
                    ? <KodAlani id="pc-bt-kod" deger={kod} onDegis={setKod} mesgul={mesgul === 'eslestir'} dugmeMetni={anahtarVar ? 'Yeniden eşleştir' : 'Eşleştir'}
                        onGonder={() => void calistir('eslestir', async () => {
                            const sonuc = await bilgisayarlaEslestirBluetooth(secili, kod);
                            update({ ...prefs, ...sonuc, connection: 'pc-bluetooth' }); setKod('');
                            return sonuc.helperName + ' ile Bluetooth üzerinden eşleşildi.';
                        })} />
                    : <Aciklama>Önce bilgisayarınızı seçin.</Aciklama>}
            </Adim>
            <Adim no={4} baslik="Deneyin">
                <button type="button" disabled={!!mesgul || !secili || !anahtarVar} className={anaDugme} onClick={() => void calistir('dene', async () => {
                    await testHelper({ ...prefs, connection: 'pc-bluetooth' }); return 'Bilgisayara Bluetooth ile bağlanıldı; araçlar hazır.';
                })}><Bekliyor goster={mesgul === 'dene'}>Bağlantıyı dene</Bekliyor></button>
            </Adim>
        </ol>
        {mesaj && <SettingsNote tone={mesaj.tone}>{mesaj.text}</SettingsNote>}
    </div>;
}

/** Kart Wi‑Fi: ağ algılama, kartı bulma, deneme. */
function KartWifiKurulumu({ prefs, update }: { prefs: RemotePrefs; update: Guncelle }) {
    const { mesgul, mesaj, calistir } = useIslem();
    const [telefonAdresi, setTelefonAdresi] = useState<string | null>(null);
    const [kartlar, setKartlar] = useState<string[] | null>(null);
    const [dogrulandi, setDogrulandi] = useState(false);
    useEffect(() => { void telefonWifiAdresi().then(setTelefonAdresi); }, []);
    const apde = telefonAdresi ? kartAginda(telefonAdresi) : false;
    return <div className="space-y-3">
        <ol className="space-y-4">
            <Adim no={1} baslik="Telefonu kartın ağına ya da ev ağına bağlayın" tamam={!!telefonAdresi}>
                <Aciklama>İki yol var: kart ve telefon <strong>aynı ev Wi‑Fi'ında</strong> olabilir ya da telefonu kartın kendi ağına (<strong>can bellek s3</strong>) bağlayabilirsiniz. Kartın USB kablosu bilgisayara takılı olmalı.</Aciklama>
                {telefonAdresi !== null && <p className={cx('text-xs', telefonAdresi ? 'text-moss-700' : 'text-berry-700')}>
                    {!telefonAdresi ? 'Telefon şu an bir Wi‑Fi ağına bağlı değil.' : apde ? 'Telefon kartın kendi ağında (' + telefonAdresi + '). Kart adresi: 192.168.4.1' : 'Telefon ev ağında (' + telefonAdresi + '). Kart bu ağda aranacak.'}
                </p>}
            </Adim>
            <Adim no={2} baslik="Kartı bulun" tamam={dogrulandi}>
                <button type="button" disabled={!!mesgul} className={ikinciDugme} onClick={() => void calistir('bul', async () => {
                    setKartlar(null); setDogrulandi(false);
                    const { urls, kartAgi } = await kartiWifidaBul();
                    setKartlar(urls);
                    if (urls.length === 1) {
                        const durum = await testCard({ ...prefs, cardUrl: urls[0] });
                        update({ ...prefs, cardUrl: urls[0], connection: 'wifi' }); setDogrulandi(true);
                        return 'Kart bulundu: ' + urls[0].replace('http://', '') + (durum?.fw ? ' · yazılım ' + durum.fw : '') + (kartAgi ? ' (kartın kendi ağı)' : '');
                    }
                    if (!urls.length) throw new Error('Bu ağda kart bulunamadı. Kart açık mı, aynı ağda mı? Kartın web arayüzündeki ya da ekranındaki adresi aşağıya elle yazabilirsiniz.');
                    return urls.length + ' kart bulundu; birini seçin.';
                })}><Bekliyor goster={mesgul === 'bul'}><Search size={15} aria-hidden="true" /> {mesgul === 'bul' ? 'Aranıyor (~15 sn)…' : 'Kartı bul'}</Bekliyor></button>
                {kartlar && kartlar.length > 1 && kartlar.map(url => <button key={url} type="button" aria-pressed={prefs.cardUrl === url}
                    onClick={() => { update({ ...prefs, cardUrl: url, connection: 'wifi' }); setDogrulandi(false); }}
                    className={cx(satir, prefs.cardUrl === url ? 'border-moss-400 bg-moss-50' : 'border-sand-200 bg-white hover:border-sand-300')}>
                    <Wifi size={18} className="shrink-0 text-moss-700" aria-hidden="true" /><span className="flex-1">{url.replace('http://', '')}</span>
                </button>)}
                <SettingsField label="Kart adresi" htmlFor="remote-kart-adresi">
                    <input id="remote-kart-adresi" className={settingsFieldClass} inputMode="url" value={prefs.cardUrl} onChange={e => { update({ ...prefs, cardUrl: e.target.value }); setDogrulandi(false); }} placeholder="http://192.168.4.1" />
                </SettingsField>
            </Adim>
            <Adim no={3} baslik="Deneyin" tamam={dogrulandi}>
                <button type="button" disabled={!!mesgul || !prefs.cardUrl.trim()} className={anaDugme} onClick={() => void calistir('dene', async () => {
                    const durum = await testCard(prefs);
                    update({ ...prefs, connection: 'wifi' }); setDogrulandi(true);
                    const ev = durum?.wifi?.ip && durum.wifi.ip !== '-' ? ' · ev ağı adresi ' + durum.wifi.ip : '';
                    return 'Karta erişildi' + (durum?.fw ? ' · yazılım ' + durum.fw : '') + ev + '.';
                })}><Bekliyor goster={mesgul === 'dene'}>Kart bağlantısını dene</Bekliyor></button>
            </Adim>
        </ol>
        {mesaj && <SettingsNote tone={mesaj.tone}>{mesaj.text}</SettingsNote>}
    </div>;
}

/** Kart adı mı? (yeni ve eski bellenim adları). */
const kartAdi = (d: Device) => /kablosuz|bellek|usb hid|can00/i.test(d.name) || !!d.connected;

/** Kart BLE: tara, kartlar önce; bağlan. */
function KartBleKurulumu({ prefs, update }: { prefs: RemotePrefs; update: Guncelle }) {
    const { mesgul, mesaj, calistir } = useIslem();
    const [cihazlar, setCihazlar] = useState<Device[]>([]);
    const [baglaniyor, setBaglaniyor] = useState('');
    const [bagli, setBagli] = useState('');
    const kartlar = cihazlar.filter(kartAdi);
    const digerleri = cihazlar.filter(d => !kartAdi(d));
    const cihazSatiri = (d: Device) => <div key={d.address} className={cx(satir, bagli === d.address ? 'border-moss-400 bg-moss-50' : 'border-sand-200 bg-white')}>
        <Bluetooth size={18} className={cx('shrink-0', kartAdi(d) ? 'text-moss-700' : 'text-sand-500')} aria-hidden="true" />
        <span className="min-w-0 flex-1"><span className="block truncate font-medium text-sand-900">{d.name || 'Adsız cihaz'}</span>
            <span className="block truncate text-xs text-sand-600">{d.address}{d.connected ? ' · telefona bağlı' : d.rssi ? ' · ' + d.rssi + ' dBm' : ''}</span></span>
        {bagli === d.address
            ? <span className="flex min-h-[44px] shrink-0 items-center gap-1.5 px-2 font-medium text-moss-700"><Check size={16} aria-hidden="true" /> Bağlı</span>
            : <button type="button" disabled={!!baglaniyor} className={anaDugme + ' shrink-0'} aria-label={(d.name || d.address) + ' cihazına bağlan'}
                onClick={() => { setBaglaniyor(d.address); void calistir('baglan', async () => {
                    await connectCard(d.address); setBagli(d.address); update({ ...prefs, connection: 'bluetooth' });
                    return (d.name || 'Kart') + ' bağlandı.';
                }).finally(() => setBaglaniyor('')); }}>
                <Bekliyor goster={baglaniyor === d.address}>{baglaniyor === d.address ? 'Bağlanıyor…' : 'Bağlan'}</Bekliyor>
            </button>}
    </div>;
    return <div className="space-y-3">
        <ol className="space-y-4">
            <Adim no={1} baslik="Kartı bilgisayara takın">
                <Aciklama>Kartın USB kablosu bilgisayarda olmalı; kart BLE yayınını açık tutar. Telefondaki başka bir uygulama karta bağlıysa Not Bahçesi aynı bağlantıyı paylaşır.</Aciklama>
            </Adim>
            <Adim no={2} baslik="Kartı bulup bağlanın" tamam={!!bagli}>
                <button type="button" disabled={!!mesgul} className={ikinciDugme} onClick={() => void calistir('tara', async () => {
                    setCihazlar([]); const liste = await scanCards(setCihazlar); setCihazlar(liste);
                    return liste.some(kartAdi) ? '' : 'Kart görünmedi. Kart açık ve yakında mı? Tekrar tarayın.';
                })}><Bekliyor goster={mesgul === 'tara'}><Search size={15} aria-hidden="true" /> {mesgul === 'tara' ? 'Taranıyor…' : 'Kartı tara'}</Bekliyor></button>
                {kartlar.map(cihazSatiri)}
                {digerleri.length > 0 && <details className="rounded-xl border border-sand-200">
                    <summary className="min-h-11 cursor-pointer px-3 py-3 text-xs font-medium text-sand-700">Diğer Bluetooth cihazları ({digerleri.length})</summary>
                    <div className="space-y-2 px-3 pb-3">{digerleri.map(cihazSatiri)}</div>
                </details>}
                {bagli && <button type="button" className="btn btn-ghost min-h-[44px] px-3 text-sm text-berry-600 hover:bg-berry-50" onClick={() => void calistir('kes', async () => { await disconnectCard(); setBagli(''); return 'BLE bağlantısı kesildi.'; })}>Bağlantıyı kes</button>}
            </Adim>
        </ol>
        {mesaj && <SettingsNote tone={mesaj.tone}>{mesaj.text}</SettingsNote>}
    </div>;
}

const YOLLAR = [
    { id: 'pc-wifi', label: 'Bilgisayar · Wi‑Fi', detail: 'Aynı ağ · kart gerekmez', Icon: Wifi },
    { id: 'pc-bluetooth', label: 'Bilgisayar · Bluetooth', detail: 'Eşleşmiş PC · kart gerekmez', Icon: Bluetooth },
    { id: 'wifi', label: 'Kart · Wi‑Fi', detail: 'Ev ağı ya da kartın ağı', Icon: Wifi },
    { id: 'bluetooth', label: 'Kart · Bluetooth', detail: 'Düşük enerji (BLE)', Icon: Bluetooth }
] as const;

/** Yol hazır mı? (kayıtlı bilgilere göre; canlı bağlantıyı "Dene" doğrular). */
function yolHazir(id: RemotePrefs['connection'], prefs: RemotePrefs): boolean {
    if (id === 'pc-wifi') return !!(prefs.helperUrl && prefs.helperToken);
    if (id === 'pc-bluetooth') return !!(prefs.helperBluetoothAddress && prefs.helperToken);
    if (id === 'wifi') return !!prefs.cardUrl.trim();
    return true;
}

export default function BaglantiKurulumu({ prefs, update }: { prefs: RemotePrefs; update: Guncelle }) {
    return <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Bağlantı yolu">
            {YOLLAR.map(({ id, label, detail, Icon }) => {
                const secili = prefs.connection === id;
                const hazir = yolHazir(id, prefs);
                return <button key={id} type="button" role="radio" aria-checked={secili} id={'baglanti-yolu-' + id} onClick={() => update({ ...prefs, connection: id })}
                    className={cx('relative flex min-h-14 items-center gap-2.5 rounded-xl border p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40',
                        secili ? 'border-moss-400 bg-moss-50 text-moss-800 ring-1 ring-moss-500/25' : 'border-sand-200 bg-white text-sand-600 hover:border-sand-300 hover:text-sand-900')}>
                    <Icon size={20} className="shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                        <span className={cx('block text-sm font-semibold', secili ? 'text-moss-800' : 'text-sand-800')}>{label}</span>
                        <span className={cx('block text-xs', secili ? 'text-moss-700' : 'text-sand-600')}>{detail}</span>
                    </span>
                    {hazir && id !== 'bluetooth' && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-moss-500" title="Kurulum bilgileri kayıtlı" aria-label="kurulum kayıtlı" />}
                </button>;
            })}
        </div>
        <div className="rounded-xl border border-sand-200 bg-sand-50/60 p-3">
            {prefs.connection === 'pc-wifi' && <PcWifiEslestirme prefs={prefs} update={update} yoluSec />}
            {prefs.connection === 'pc-bluetooth' && <PcBluetoothKurulumu prefs={prefs} update={update} />}
            {prefs.connection === 'wifi' && <KartWifiKurulumu prefs={prefs} update={update} />}
            {prefs.connection === 'bluetooth' && <KartBleKurulumu prefs={prefs} update={update} />}
        </div>
    </div>;
}
