'use client';

/**
 * Bilgisayar bağlantısı kurulum sihirbazı.
 *
 * Dört yolun her biri numaralı adımlarla kurulur; her adım tamamlanınca onay
 * işareti alır, hata olursa ne yapılacağı aynı yerde yazar.
 *  - Doğrudan PC (Wi‑Fi): yardımcı ağda bulunur, pencerede görünen 6 haneli
 *    kodla eşleşilir; uzun erişim anahtarı elle taşınmaz.
 *  - PC Bluetooth: telefon bilgisayara Bluetooth klavye/fare olarak bağlanır;
 *    bilgisayara program kurulmaz (pano isteğe bağlı olarak yardımcıyla).
 *  - Kart Wi‑Fi: telefon kartın kendi ağındaysa adres kendiliğinden bulunur,
 *    değilse ev ağı taranır.
 *  - Kart BLE: kartlar önce listelenir, diğer cihazlar katlanır.
 */
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Bluetooth, Check, Copy, Download, ExternalLink, Globe, Loader2, MonitorSmartphone, Radio, Search, Share2, Wifi } from 'lucide-react';
import { PC_YARDIMCISI_SAYFASI, PC_YARDIMCISI_ZIP } from '@/lib/config';
import {
    KART_AP_ADRESI, KART_AP_AGI, baglantiSatiriniCoz, baglantiTuru, baglantiTuruSec, bilgisayarAdresiniSina, wifiAyarlariniAc, bilgisayarlaEslestirBluetooth, bilgisayarlaEslestirWifi, bilgisayarlariBul,
    bluetoothAyarlariniAc, bluetoothKlavyeBagla, bluetoothKlavyeyiBaslat, connectCard, telefonuGorunurYap, disconnectCard, kartAginda, kartiWifidaBul, scanCards, scanPairedComputers,
    sendToComputerClipboard, telefonWifiAdresi, testCard, testHelper
} from '@/lib/remoteTools';
import type { BaglantiTuru, BulunanBilgisayar, Device, RemotePrefs } from '@/lib/remoteTools';
import { SettingsField, SettingsNote, cx, settingsFieldClass } from '@/components/ui/settings';
import { durumuTazele, useBaglantiDurumu, yolAdi } from '@/lib/baglantiDurumu';
import BaglantiGostergesi from './BaglantiGostergesi';
import DenemeAgaciDugmesi from './DenemeAgaciDugmesi';

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

/**
 * PC yardımcısını indirme kartı. Yardımcı Windows programı olduğu için asıl
 * hedef bilgisayardır:
 *  - Telefonda: indirme sayfasını bilgisayara gönder (paylaş), adresi kopyala
 *    ya da zip'i telefona indirip Quick Share/USB ile aktar.
 *  - Bilgisayarın tarayıcısında: doğrudan "İndir".
 * Yardımcı henüz kurulmamışsa açık ve belirgin durur; kurulduktan sonra
 * küçük bir "Yardımcıyı indir" satırına katlanır.
 */
export function YardimciIndir({ kurulu = false }: { kurulu?: boolean }) {
    const [bilgi, setBilgi] = useState('');
    const telefon = Capacitor.isNativePlatform();
    const kisaAdres = PC_YARDIMCISI_SAYFASI.replace(/^https?:\/\//, '');
    const kopyala = async () => {
        try { await navigator.clipboard.writeText(PC_YARDIMCISI_SAYFASI); setBilgi('Adres kopyalandı. Bilgisayarın tarayıcısına yapıştırın.'); }
        catch { setBilgi('Adresi bilgisayarda elle yazın: ' + kisaAdres); }
    };
    const paylas = async () => {
        try {
            const { Share } = await import('@capacitor/share');
            await Share.share({ title: 'Not Bahçesi PC Yardımcısı', text: 'Not Bahçesi PC Yardımcısı (Windows). Bilgisayarda açıp "Yardımcıyı indir"e basın:', url: PC_YARDIMCISI_SAYFASI, dialogTitle: 'Bilgisayara gönder' });
            setBilgi('');
        } catch (hata) {
            // Kullanıcı paylaşımı iptal ettiyse sessiz kal; paylaşım yoksa adresi kopyala.
            if (!/cancel/i.test(String((hata as Error)?.message ?? ''))) await kopyala();
        }
    };
    const telefonaIndir = async () => {
        try {
            const { Browser } = await import('@capacitor/browser');
            await Browser.open({ url: PC_YARDIMCISI_ZIP });
            setBilgi('İndirme tarayıcıda başladı. Dosyayı Quick Share, e-posta ya da USB ile bilgisayara aktarın.');
        } catch { window.open(PC_YARDIMCISI_ZIP, '_blank'); }
    };
    const icerik = <div className="space-y-2.5">
        <Aciklama>
            Yardımcı küçük bir <strong>Windows</strong> programıdır (~0,2 MB), kurulum istemez ve yönetici izni gerektirmez.
            {telefon ? <> Bilgisayarda şu adresi açıp <strong>Yardımcıyı indir</strong>'e basın: <strong className="select-all break-all text-sand-900">{kisaAdres}</strong></> : <> İndirip zip'i bir klasöre çıkarın, içindeki <strong>pc_yardimcisi_baslat</strong> dosyasına çift tıklayın.</>}
        </Aciklama>
        <div className="flex flex-wrap gap-2">
            {telefon ? <>
                <button type="button" id="yardimci-bilgisayara-gonder" className={anaDugme} onClick={() => void paylas()}><Share2 size={15} aria-hidden="true" /> Bilgisayara gönder</button>
                <button type="button" className={ikinciDugme} onClick={() => void kopyala()}><Copy size={15} aria-hidden="true" /> Adresi kopyala</button>
                <button type="button" className={ikinciDugme} onClick={() => void telefonaIndir()}><Download size={15} aria-hidden="true" /> Telefona indir</button>
            </> : <>
                <a id="yardimci-indir" href={PC_YARDIMCISI_ZIP} download className={anaDugme}><Download size={15} aria-hidden="true" /> Yardımcıyı indir (Windows)</a>
                <a href={PC_YARDIMCISI_SAYFASI} target="_blank" rel="noopener" className={ikinciDugme}>Kurulum adımları</a>
            </>}
        </div>
        {telefon && <p className="text-[11px] leading-relaxed text-sand-500">"Bilgisayara gönder" ile bağlantıyı kendinize WhatsApp, e-posta ya da Quick Share ile gönderip bilgisayarda açın.</p>}
        {bilgi && <p role="status" className="text-xs text-moss-700">{bilgi}</p>}
    </div>;
    if (kurulu) return <details className="rounded-xl border border-sand-200 bg-white">
        <summary className="min-h-11 cursor-pointer px-3 py-3 text-xs font-medium text-sand-700"><Download size={13} className="mr-1 inline" aria-hidden="true" /> Yardımcıyı indir (başka bilgisayar için)</summary>
        <div className="px-3 pb-3">{icerik}</div>
    </details>;
    return <div id="yardimci-indir-karti" className="rounded-xl border border-moss-200 bg-moss-50/60 p-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-moss-800"><Download size={14} aria-hidden="true" /> Yardımcı bilgisayarda yok mu? İndirin</p>
        {icerik}
    </div>;
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
                <Aciklama>Bilgisayarda <strong>Not Bahçesi PC Yardımcısı</strong>nı açın (<code>pc_yardimcisi_baslat</code>). Pencerede <strong>6 haneli eşleştirme kodu</strong> görünür. Telefon ve bilgisayar aynı Wi‑Fi ağında olmalı.</Aciklama>
                <YardimciIndir kurulu={eslesmis} />
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
                        await testHelper({ ...prefs, connection: 'pc-wifi' }); if (prefs.connection === 'pc-wifi') void durumuTazele(prefs); return 'Bilgisayara bağlanıldı; araçlar hazır.';
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

/**
 * PC Bluetooth: eşleşmiş bilgisayarı seç → bağlan. Kod gerekmez; yardımcı yalnız
 * Windows'la eşleşmiş cihazları kabul eder ve anahtarı bu bağlantıdan verir.
 */
export function PcBluetoothPano({ prefs, update, yoluSec = true }: { prefs: RemotePrefs; update: Guncelle; yoluSec?: boolean }) {
    const { mesgul, mesaj, calistir } = useIslem();
    const [cihazlar, setCihazlar] = useState<Device[] | null>(null);
    const [kod, setKod] = useState('');
    const bilgisayarlar = (cihazlar ?? []).filter(d => d.computer);
    const digerleri = (cihazlar ?? []).filter(d => !d.computer);
    const secili = prefs.helperBluetoothAddress;
    const bagli = !!(secili && prefs.helperToken);
    /** Seçilen bilgisayara bağlanır, anahtarı alır, yolu seçer ve göstergeyi tazeler. */
    const baglan = (ilkAdres: string, ad: string, pin = '') => void calistir('baglan-' + ilkAdres, async () => {
        // Aynı adlı başka kayıtlar (ör. bilgisayarın eski/bozuk iç Bluetooth'u ile
        // yeni USB adaptörü) varsa seçilen yanıt vermezse onlar sırayla denenir.
        const ayniAdlilar = bilgisayarlar.filter(d => d.name === ad && d.address !== ilkAdres).map(d => d.address);
        let adres = ilkAdres;
        let sonuc: Awaited<ReturnType<typeof bilgisayarlaEslestirBluetooth>> | null = null;
        let ilkHata: unknown = null;
        for (const aday of [ilkAdres, ...ayniAdlilar]) {
            try { sonuc = await bilgisayarlaEslestirBluetooth(aday, pin); adres = aday; break; }
            catch (hata) { ilkHata ??= hata; }
        }
        if (!sonuc) {
            if (ayniAdlilar.length && ilkHata instanceof Error) throw new Error(ilkHata.message + ' "' + ad + '" adlı ' + (ayniAdlilar.length + 1) + ' kaydın hiçbiri yanıt vermedi.');
            throw ilkHata;
        }
        const yeni = { ...prefs, ...sonuc, helperBluetoothAddress: adres, ...(yoluSec ? { connection: 'pc-bluetooth' as const } : {}) };
        update(yeni); if (yoluSec) void durumuTazele(yeni); setKod('');
        return (sonuc.helperName || ad) + ' ile Bluetooth üzerinden bağlanıldı. Yazma, fare, kısayollar ve pano hazır.';
    });
    const cihazSatiri = (d: Device) => {
        const sec = secili === d.address && bagli;
        const suruyor = mesgul === 'baglan-' + d.address;
        return <div key={d.address} className={cx(satir, sec ? 'border-moss-400 bg-moss-50' : 'border-sand-200 bg-white')}>
            {d.computer ? <MonitorSmartphone size={18} className="shrink-0 text-moss-700" aria-hidden="true" /> : <Bluetooth size={18} className="shrink-0 text-sand-500" aria-hidden="true" />}
            <span className="min-w-0 flex-1"><span className="block font-medium text-sand-900">{d.name}</span><span className="block truncate text-xs text-sand-600">{d.address}</span></span>
            {sec
                ? <span className="flex min-h-[44px] shrink-0 items-center gap-1.5 px-2 font-medium text-moss-700"><Check size={16} aria-hidden="true" /> Bağlı</span>
                : <button type="button" disabled={!!mesgul} onClick={() => baglan(d.address, d.name)} aria-label={d.name + ' bilgisayarına bağlan'} className={anaDugme + ' shrink-0'}>
                    <Bekliyor goster={suruyor}>{suruyor ? 'Bağlanıyor…' : 'Bağlan'}</Bekliyor>
                </button>}
        </div>;
    };
    return <div className="space-y-3">
        <ol className="space-y-4">
            <Adim no={1} baslik="Bilgisayarda Bluetooth'u ve yardımcıyı açın">
                <Aciklama>Bilgisayarda Bluetooth açık olmalı ve <strong>Not Bahçesi PC Yardımcısı</strong> çalışmalı. Telefon bu bilgisayarla daha önce eşleşmediyse önce Bluetooth ayarlarından eşleştirin. <strong>Kod gerekmez.</strong></Aciklama>
                <YardimciIndir kurulu={bagli} />
                <button type="button" className={ikinciDugme} onClick={() => void calistir('ayar', async () => { await bluetoothAyarlariniAc(); })}>
                    <Bluetooth size={15} aria-hidden="true" /> Bluetooth ayarlarını aç
                </button>
            </Adim>
            <Adim no={2} baslik="Bilgisayarınızı seçip bağlanın" tamam={bagli}>
                <button type="button" disabled={!!mesgul} className={ikinciDugme} onClick={() => void calistir('liste', async () => {
                    const liste = await scanPairedComputers(); setCihazlar(liste);
                    return liste.some(d => d.computer) ? '' : 'Eşleşmiş bilgisayar görünmüyor. Bilgisayarınız "Diğer eşleşmiş cihazlar" altında olabilir ya da önce eşleştirmeniz gerekir.';
                })}><Bekliyor goster={mesgul === 'liste'}>Eşleşmiş bilgisayarları göster</Bekliyor></button>
                {bilgisayarlar.map(cihazSatiri)}
                {digerleri.length > 0 && <details className="rounded-xl border border-sand-200">
                    <summary className="min-h-11 cursor-pointer px-3 py-3 text-xs font-medium text-sand-700">Diğer eşleşmiş cihazlar ({digerleri.length})</summary>
                    <div className="space-y-2 px-3 pb-3">{digerleri.map(cihazSatiri)}</div>
                </details>}
                {bagli && !cihazlar && <p className="text-xs text-moss-700">Bağlı: <strong>{prefs.helperName || 'Bilgisayar'}</strong> · {secili}</p>}
            </Adim>
            <Adim no={3} baslik="Deneyin">
                <button type="button" disabled={!!mesgul || !bagli} className={anaDugme} onClick={() => void calistir('dene', async () => {
                    const deneme = { ...prefs, connection: 'pc-bluetooth' as const }; await testHelper(deneme); if (yoluSec) { update(deneme); void durumuTazele(deneme); } return 'Bilgisayara Bluetooth ile ulaşıldı.';
                })}><Bekliyor goster={mesgul === 'dene'}>Bağlantıyı dene</Bekliyor></button>
            </Adim>
        </ol>
        {mesaj && <SettingsNote tone={mesaj.tone}>{mesaj.text}</SettingsNote>}
        {secili && <details className="rounded-xl border border-sand-200">
            <summary className="min-h-11 cursor-pointer px-3 py-3 text-xs font-medium text-sand-700">Eski yardımcı sürümü mü? Kodla bağlan</summary>
            <div className="space-y-2 px-3 pb-3">
                <Aciklama>Yardımcı eskiyse kodsuz bağlanma çalışmaz; penceredeki 6 haneli kodu yazın ya da güncel yardımcıyı indirin.</Aciklama>
                <KodAlani id="pc-bt-kod" deger={kod} onDegis={setKod} mesgul={mesgul === 'baglan-' + secili} dugmeMetni="Kodla bağlan"
                    onGonder={() => baglan(secili, prefs.helperName || 'Bilgisayar', kod)} />
            </div>
        </details>}
    </div>;
}

/**
 * Bilgisayar · Bluetooth: telefon, bilgisayara doğrudan Bluetooth klavye ve fare
 * olarak bağlanır (HID). Bilgisayara program kurulmaz; Windows telefonu
 * "Not Bahçesi Klavye" adıyla gerçek bir klavye gibi görür.
 */
function BilgisayarBluetoothKlavye({ prefs, update }: { prefs: RemotePrefs; update: Guncelle }) {
    const { mesgul, mesaj, calistir } = useIslem();
    const [cihazlar, setCihazlar] = useState<Device[] | null>(null);
    const [rehber, setRehber] = useState(false);
    const bilgisayarlar = (cihazlar ?? []).filter(d => d.computer);
    const digerleri = (cihazlar ?? []).filter(d => !d.computer);
    const secili = prefs.helperBluetoothAddress;
    const baglan = (d: Device) => void calistir('baglan-' + d.address, async () => {
        try { await bluetoothKlavyeBagla(d.address); }
        catch (hata) { setRehber(true); throw hata; }
        const yeni = { ...prefs, helperBluetoothAddress: d.address, helperName: d.name, connection: 'pc-bluetooth' as const };
        update(yeni); void durumuTazele(yeni); setRehber(false);
        return d.name + ' ile bağlandı: telefon artık bu bilgisayarın Bluetooth klavyesi ve faresi.';
    });
    const cihazSatiri = (d: Device) => {
        const sec = secili === d.address;
        const suruyor = mesgul === 'baglan-' + d.address;
        return <div key={d.address} className={cx(satir, sec ? 'border-moss-400 bg-moss-50' : 'border-sand-200 bg-white')}>
            {d.computer ? <MonitorSmartphone size={18} className="shrink-0 text-moss-700" aria-hidden="true" /> : <Bluetooth size={18} className="shrink-0 text-sand-500" aria-hidden="true" />}
            <span className="min-w-0 flex-1"><span className="block font-medium text-sand-900">{d.name}</span><span className="block truncate text-xs text-sand-600">{d.address}{sec ? ' · seçili' : ''}</span></span>
            <button type="button" disabled={!!mesgul} onClick={() => baglan(d)} aria-label={d.name + ' bilgisayarına bağlan'} className={(sec ? ikinciDugme : anaDugme) + ' shrink-0'}>
                <Bekliyor goster={suruyor}>{suruyor ? 'Bağlanıyor…' : sec ? 'Yeniden bağlan' : 'Bağlan'}</Bekliyor>
            </button>
        </div>;
    };
    return <div className="space-y-3">
        <ol className="space-y-4">
            <Adim no={1} baslik="Bilgisayarın Bluetooth'unu açın">
                <Aciklama>Bilgisayara <strong>program kurmanız gerekmez</strong>. Telefon bilgisayara <strong>“Not Bahçesi Klavye”</strong> adıyla Bluetooth klavye ve fare olarak bağlanır; yazma, Türkçe karakterler, kısayollar ve fare çalışır. (Pano için aşağıdaki isteğe bağlı bölüme bakın.)</Aciklama>
            </Adim>
            <Adim no={2} baslik="Bilgisayarınızı seçip bağlanın" tamam={!!secili}>
                <button type="button" disabled={!!mesgul} className={ikinciDugme} onClick={() => void calistir('liste', async () => {
                    const liste = await scanPairedComputers(); setCihazlar(liste);
                    if (!liste.some(d => d.computer)) setRehber(true);
                    return liste.some(d => d.computer) ? '' : 'Eşleşmiş bilgisayar görünmüyor. Aşağıdaki adımlarla bilgisayarı bir kez eşleştirin.';
                })}><Bekliyor goster={mesgul === 'liste'}>Eşleşmiş bilgisayarları göster</Bekliyor></button>
                {bilgisayarlar.map(cihazSatiri)}
                {digerleri.length > 0 && <details className="rounded-xl border border-sand-200">
                    <summary className="min-h-11 cursor-pointer px-3 py-3 text-xs font-medium text-sand-700">Diğer eşleşmiş cihazlar ({digerleri.length})</summary>
                    <div className="space-y-2 px-3 pb-3">{digerleri.map(cihazSatiri)}</div>
                </details>}
                {secili && !cihazlar && <p className="text-xs text-moss-700">Seçili: <strong>{prefs.helperName || 'Bilgisayar'}</strong> · {secili}</p>}
                <details open={rehber} className="rounded-xl border border-sand-200 bg-white">
                    <summary className="min-h-11 cursor-pointer px-3 py-3 text-xs font-medium text-sand-700">İlk kez mi, ya da bağlanmıyor mu?</summary>
                    <div className="space-y-2 px-3 pb-3">
                        <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed text-sand-700">
                            <li>Bilgisayar bu telefonu daha önce eşleştirdiyse, bilgisayarın Bluetooth ayarlarında telefonu <strong>kaldırın</strong> (klavye olarak yeniden tanınması için).</li>
                            <li>Aşağıdan <strong>Telefonu görünür yap</strong>'a dokunun ve izin verin.</li>
                            <li>Bilgisayarda: <strong>Ayarlar → Bluetooth ve cihazlar → Cihaz ekle → Bluetooth</strong> → telefonunuzun adını seçin, iki cihazdaki kodu onaylayın.</li>
                            <li>Buraya dönüp <strong>Eşleşmiş bilgisayarları göster</strong> → <strong>Bağlan</strong>.</li>
                        </ol>
                        <button type="button" disabled={!!mesgul} className={ikinciDugme} onClick={() => void calistir('gorunur', async () => {
                            await bluetoothKlavyeyiBaslat();
                            await telefonuGorunurYap();
                            return 'Telefon 2 dakika görünür. Bilgisayarda “Cihaz ekle → Bluetooth” ile telefonu seçin.';
                        })}><Bekliyor goster={mesgul === 'gorunur'}><Bluetooth size={15} aria-hidden="true" /> Telefonu görünür yap</Bekliyor></button>
                    </div>
                </details>
            </Adim>
            <Adim no={3} baslik="Deneyin">
                <button type="button" disabled={!!mesgul || !secili} className={anaDugme} onClick={() => void calistir('dene', async () => {
                    const yeni = { ...prefs, connection: 'pc-bluetooth' as const }; await testHelper(yeni); update(yeni); void durumuTazele(yeni);
                    return 'Bluetooth klavye bağlı; editördeki araçlar bu bilgisayara yazar.';
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
                    const yeni = { ...prefs, connection: 'wifi' as const };
                    update(yeni); setDogrulandi(true); void durumuTazele(yeni);
                    const ev = durum?.wifi?.ip && durum.wifi.ip !== '-' ? ' · ev ağı adresi ' + durum.wifi.ip : '';
                    return 'Karta erişildi' + (durum?.fw ? ' · yazılım ' + durum.fw : '') + ev + '.';
                })}><Bekliyor goster={mesgul === 'dene'}>Kart bağlantısını dene</Bekliyor></button>
            </Adim>
        </ol>
        {mesaj && <SettingsNote tone={mesaj.tone}>{mesaj.text}</SettingsNote>}
    </div>;
}

/**
 * Kart · AP: telefon, kartın KENDİ Wi‑Fi ağına (can bellek s3) bağlanır; ev
 * router'ı ya da internet gerekmez. Kart USB ile bilgisayara takılıdır; yazma,
 * fare, kısayol ve (PC Yardımcısı açıksa) pano karttan geçer.
 */
function KartApKurulumu({ prefs, update }: { prefs: RemotePrefs; update: Guncelle }) {
    const { mesgul, mesaj, calistir } = useIslem();
    const [telefonAdresi, setTelefonAdresi] = useState<string | null>(null);
    const [dogrulandi, setDogrulandi] = useState(false);
    const yenile = () => void telefonWifiAdresi().then(setTelefonAdresi);
    useEffect(() => { yenile(); const z = setInterval(yenile, 4000); return () => clearInterval(z); }, []);
    const apde = telefonAdresi ? kartAginda(telefonAdresi) : false;
    return <div className="space-y-3">
        <ol className="space-y-4">
            <Adim no={1} baslik={'Telefonu kartın ağına bağlayın'} tamam={apde}>
                <Aciklama>Kartın USB kablosu bilgisayara takılı olsun. Telefonun Wi‑Fi ayarlarında <strong>{KART_AP_AGI}</strong> ağını seçip bağlanın; ev router'ı gerekmez. Telefon "bu ağda internet yok" derse <strong>bağlı kal</strong>'ı seçin; internet gerektiren işler (yapay zekâ, yedekleme) mobil veriyle sürer, kart trafiği kartın ağından gider.</Aciklama>
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" id="kart-ap-wifi-ayarlari" className={ikinciDugme} onClick={() => void calistir('ayar', async () => { await wifiAyarlariniAc(); })}>
                        <Wifi size={15} aria-hidden="true" /> Wi‑Fi ayarlarını aç
                    </button>
                </div>
                <p className={cx('text-xs', apde ? 'text-moss-700' : 'text-sand-600')}>
                    {telefonAdresi === null ? 'Telefonun ağı denetleniyor…' : !telefonAdresi ? 'Telefon şu an bir Wi‑Fi ağına bağlı değil.' : apde ? 'Telefon kartın ağında (' + telefonAdresi + '). Kart adresi: 192.168.4.1' : 'Telefon başka bir ağda (' + telefonAdresi + '). Kartın ağına geçin.'}
                </p>
            </Adim>
            <Adim no={2} baslik="Deneyin" tamam={dogrulandi}>
                <button type="button" id="kart-ap-dene" disabled={!!mesgul} className={anaDugme} onClick={() => void calistir('dene', async () => {
                    const yeni = { ...prefs, connection: 'wifi' as const, agTuru: 'kart-ap' as const, cardUrl: KART_AP_ADRESI };
                    const durum = await testCard(yeni);
                    update(yeni); setDogrulandi(true); void durumuTazele(yeni);
                    return 'Kartın ağından karta erişildi' + (durum?.fw ? ' · yazılım ' + durum.fw : '') + '.';
                })}><Bekliyor goster={mesgul === 'dene'}>Kart bağlantısını dene</Bekliyor></button>
                <Aciklama>Kartın bilgisayardaki USB bağlantısı ve PC Yardımcısı açıksa <strong>PC panosu</strong> da bu yoldan çalışır; bilgisayarla ayrıca eşleşmeniz gerekmez.</Aciklama>
            </Adim>
        </ol>
        {mesaj && <SettingsNote tone={mesaj.tone}>{mesaj.text}</SettingsNote>}
    </div>;
}

const TAILSCALE_PLAY = 'https://play.google.com/store/apps/details?id=com.tailscale.ipn';

/**
 * Tailscale: telefon ve bilgisayar aynı Tailscale hesabındaysa PC Yardımcısına
 * Tailscale adresiyle bağlanılır; telefon başka bir şehirde, mobil veride bile olabilir.
 * Trafik Tailscale'in şifreli tüneli içinden gider.
 */
function TailscaleKurulumu({ prefs, update }: { prefs: RemotePrefs; update: Guncelle }) {
    const { mesgul, mesaj, calistir } = useIslem();
    const [adres, setAdres] = useState(() => prefs.agTuru === 'tailscale' ? prefs.helperUrl.replace(/^https?:\/\//, '').replace(/:8765$/, '') : '');
    const [pc, setPc] = useState<BulunanBilgisayar | null>(null);
    const [kod, setKod] = useState('');
    const eslesmis = !!(prefs.agTuru === 'tailscale' && prefs.helperUrl && prefs.helperToken);
    const playAc = async () => {
        try { const { Browser } = await import('@capacitor/browser'); await Browser.open({ url: TAILSCALE_PLAY }); }
        catch { window.open(TAILSCALE_PLAY, '_blank'); }
    };
    return <div className="space-y-3">
        <ol className="space-y-4">
            <Adim no={1} baslik="Telefona ve bilgisayara Tailscale kurun" tamam={eslesmis}>
                <Aciklama>İkisinde de aynı <strong>Tailscale hesabıyla</strong> giriş yapın (tailscale.com, ücretsiz). Telefonda uygulamayı açıp bağlı olduğundan emin olun; bilgisayarda Tailscale simgesi bağlı görünmeli. Bilgisayarın Windows ile başlaması için Tailscale'de <strong>Run on startup</strong> açık kalsın.</Aciklama>
                <button type="button" className={ikinciDugme} onClick={() => void playAc()}><ExternalLink size={15} aria-hidden="true" /> Telefon için Tailscale (Play Store)</button>
            </Adim>
            <Adim no={2} baslik="Bilgisayarda PC Yardımcısını açın" tamam={eslesmis}>
                <Aciklama>Yardımcının penceresinde <strong>Tailscale adresi: http://100.x.x.x:8765</strong> satırı ve <strong>6 haneli eşleştirme kodu</strong> görünür. Başka şehirde olacaksanız yardımcının ve Tailscale'in bilgisayarda açık kalması gerekir. <strong>Bilgisayarda bir kez</strong> yardımcı klasöründeki <strong>pc_tailscale_izni.cmd</strong> dosyasına çift tıklayın (Windows yönetici izni sorar; güvenlik duvarında yalnız Tailscale ağından yardımcıya izin verir). Yardımcı penceresi izin yoksa bunu sarı bir satırla hatırlatır.</Aciklama>
                <YardimciIndir kurulu={eslesmis} />
            </Adim>
            <Adim no={3} baslik="Bilgisayarın Tailscale adresini yazın" tamam={!!pc || eslesmis}>
                <Aciklama>Yardımcı penceresindeki ya da Tailscale uygulamasındaki <strong>100.x.x.x</strong> adresini (ya da bilgisayarın Tailscale adını, ör. <code>pc.tailnet.ts.net</code>) yazın.</Aciklama>
                <div className="flex flex-wrap gap-2">
                    <input id="tailscale-adresi" aria-label="Bilgisayarın Tailscale adresi" className={settingsFieldClass + ' min-h-[44px] min-w-0 flex-1'} inputMode="url" placeholder="100.101.102.103" value={adres} onChange={e => { setAdres(e.target.value); setPc(null); }} />
                    <button type="button" id="tailscale-bul" disabled={!!mesgul || !adres.trim()} className={ikinciDugme} onClick={() => void calistir('bul', async () => {
                        const bulunan = await bilgisayarAdresiniSina(adres); setPc(bulunan);
                        return bulunan.name + ' bulundu (Tailscale üzerinden). Şimdi kodu yazın.';
                    })}><Bekliyor goster={mesgul === 'bul'}><Search size={15} aria-hidden="true" /> Bul</Bekliyor></button>
                </div>
            </Adim>
            <Adim no={4} baslik="Eşleştirme kodunu yazın" tamam={eslesmis && !pc}>
                {pc || eslesmis
                    ? <KodAlani id="tailscale-kod" deger={kod} onDegis={setKod} mesgul={mesgul === 'eslestir'} dugmeMetni="Eşleştir"
                        onGonder={() => void calistir('eslestir', async () => {
                            const hedefUrl = pc?.url || prefs.helperUrl;
                            const sonuc = await bilgisayarlaEslestirWifi(hedefUrl, kod);
                            update({ ...prefs, ...sonuc, connection: 'pc-wifi', agTuru: 'tailscale', helperUrlTs: sonuc.helperUrl });
                            setKod(''); setPc(null);
                            return sonuc.helperName + ' ile Tailscale üzerinden eşleşildi; artık başka şehirden de bağlanabilirsiniz.';
                        })} />
                    : <Aciklama>Önce adresi yazıp bilgisayarı bulun.</Aciklama>}
                {eslesmis && <p className="text-xs text-moss-700">Eşleşmiş: <strong>{prefs.helperName || 'Bilgisayar'}</strong> · {prefs.helperUrl.replace('http://', '')}</p>}
            </Adim>
            <Adim no={5} baslik="Deneyin">
                <div className="flex flex-wrap gap-2">
                    <button type="button" id="tailscale-dene" disabled={!!mesgul || !eslesmis} className={anaDugme} onClick={() => void calistir('dene', async () => {
                        await testHelper({ ...prefs, connection: 'pc-wifi' }); void durumuTazele(prefs); return 'Tailscale üzerinden bilgisayara bağlanıldı; araçlar hazır.';
                    })}><Bekliyor goster={mesgul === 'dene'}>Bağlantıyı dene</Bekliyor></button>
                    <button type="button" disabled={!!mesgul || !eslesmis} className={ikinciDugme} onClick={() => void calistir('pano', async () => {
                        await sendToComputerClipboard('Not Bahçesi Tailscale pano denemesi', prefs);
                        return 'Panoya gönderildi. Bilgisayarda Ctrl+V ile kontrol edin.';
                    })}><Bekliyor goster={mesgul === 'pano'}>Panoyu dene</Bekliyor></button>
                </div>
            </Adim>
        </ol>
        {mesaj && <SettingsNote tone={mesaj.tone}>{mesaj.text}</SettingsNote>}
        <details className="rounded-xl border border-sand-200">
            <summary className="min-h-11 cursor-pointer px-3 py-3 text-xs font-medium text-sand-700">Bağlanamıyorsanız</summary>
            <ul className="list-disc space-y-1.5 px-6 pb-3 text-xs leading-relaxed text-sand-600">
                <li>Telefonda Tailscale <strong>bağlı</strong> mı? (Uygulamada anahtar açık, VPN simgesi görünür.)</li>
                <li>İki cihaz <strong>aynı hesapta</strong> ve Tailscale'de görünüyor mu?</li>
                <li>Bilgisayarda PC Yardımcısı penceresi <strong>açık</strong> mı?</li>
                <li>Bilgisayarda <strong>pc_tailscale_izni.cmd</strong> bir kez çalıştırıldı mı? Güvenlik duvarı bu izin olmadan Tailscale'den gelen bağlantıyı sessizce engeller (zaman aşımı).</li>
                <li>Windows güvenlik duvarı Tailscale ağını "Genel" sayıyorsa yardımcıyı engelleyebilir; Windows ayarlarından Tailscale ağını <strong>Özel</strong> yapın.</li>
            </ul>
        </details>
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
                    await connectCard(d.address); setBagli(d.address); const yeni = { ...prefs, connection: 'bluetooth' as const }; update(yeni); void durumuTazele(yeni);
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

const YOLLAR: { id: BaglantiTuru; label: string; detail: string; Icon: typeof Wifi }[] = [
    { id: 'pc-wifi', label: 'Bilgisayar · Wi‑Fi', detail: 'Aynı ağda; PC yardımcısı + kod', Icon: Wifi },
    { id: 'tailscale', label: 'Tailscale', detail: 'Başka şehirden de; PC yardımcısı', Icon: Globe },
    { id: 'pc-bluetooth', label: 'Bilgisayar · Bluetooth', detail: 'Program gerekmez', Icon: Bluetooth },
    { id: 'wifi', label: 'Kart · Wi‑Fi', detail: 'Kart ev ağında', Icon: Wifi },
    { id: 'kart-ap', label: 'Kart · AP', detail: 'Kartın kendi ağı (router yok)', Icon: Radio },
    { id: 'bluetooth', label: 'Kart · Bluetooth', detail: 'Düşük enerji (BLE)', Icon: Bluetooth }
];

/** Yol hazır mı? (kayıtlı bilgilere göre; canlı bağlantıyı "Dene" doğrular). */
function yolHazir(id: BaglantiTuru, prefs: RemotePrefs): boolean {
    if (id === 'pc-wifi') return !!((prefs.agTuru === 'tailscale' ? prefs.helperUrlLan : prefs.helperUrl) && prefs.helperToken);
    if (id === 'tailscale') return !!((prefs.agTuru === 'tailscale' ? prefs.helperUrl : prefs.helperUrlTs) && prefs.helperToken);
    if (id === 'pc-bluetooth') return !!prefs.helperBluetoothAddress;
    if (id === 'wifi') return !!((prefs.agTuru === 'kart-ap' ? prefs.cardUrlEv : prefs.cardUrl) || '').trim();
    return true;
}

export default function BaglantiKurulumu({ prefs, update }: { prefs: RemotePrefs; update: Guncelle }) {
    const { durum, bakiliyor, tazele } = useBaglantiDurumu(prefs, { aralikMs: 20000 });
    return <div className="space-y-4">
        <BaglantiGostergesi id="baglanti-canli-durum" yol={prefs.connection} ad={yolAdi(prefs)} durum={durum} bakiliyor={bakiliyor} onTazele={() => void tazele()} />
        {/* Bağlantı kurulunca: tek dokunuşla gerçek bir notta deneme. */}
        {durum?.tur === 'ok' && <DenemeAgaciDugmesi tur="baglanti" vurgulu />}
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Bağlantı yolu">
            {YOLLAR.map(({ id, label, detail, Icon }) => {
                const secili = baglantiTuru(prefs) === id;
                const hazir = yolHazir(id, prefs);
                return <button key={id} type="button" role="radio" aria-checked={secili} id={'baglanti-yolu-' + id} onClick={() => update(baglantiTuruSec(prefs, id))}
                    className={cx('relative flex min-h-14 items-center gap-2.5 rounded-xl border p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40',
                        secili ? 'border-moss-400 bg-moss-50 text-moss-800 ring-1 ring-moss-500/25' : 'border-sand-200 bg-white text-sand-600 hover:border-sand-300 hover:text-sand-900')}>
                    <Icon size={20} className="shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                        <span className={cx('block text-sm font-semibold', secili ? 'text-moss-800' : 'text-sand-800')}>{label}</span>
                        <span className={cx('block text-xs', secili ? 'text-moss-700' : 'text-sand-600')}>{detail}</span>
                    </span>
                    {secili
                        ? <span className={cx('absolute right-2 top-1.5 rounded-full px-1.5 text-[10px] font-bold',
                            durum?.tur === 'ok' ? 'bg-moss-600 text-white' : durum?.tur === 'hata' ? 'bg-berry-600 text-white' : 'bg-sand-200 text-sand-700')}>
                            {durum?.tur === 'ok' ? 'Bağlı' : durum?.tur === 'hata' ? 'Bağlantı yok' : 'Kullanılıyor'}</span>
                        : hazir && id !== 'bluetooth' && <span className="absolute right-2 top-1.5 text-[10px] font-medium text-sand-500">kurulu</span>}
                </button>;
            })}
        </div>
        <div className="rounded-xl border border-sand-200 bg-sand-50/60 p-3">
            {baglantiTuru(prefs) === 'pc-wifi' && <PcWifiEslestirme prefs={prefs} update={update} yoluSec />}
            {baglantiTuru(prefs) === 'tailscale' && <TailscaleKurulumu prefs={prefs} update={update} />}
            {baglantiTuru(prefs) === 'pc-bluetooth' && <BilgisayarBluetoothKlavye prefs={prefs} update={update} />}
            {baglantiTuru(prefs) === 'wifi' && <KartWifiKurulumu prefs={prefs} update={update} />}
            {baglantiTuru(prefs) === 'kart-ap' && <KartApKurulumu prefs={prefs} update={update} />}
            {baglantiTuru(prefs) === 'bluetooth' && <KartBleKurulumu prefs={prefs} update={update} />}
        </div>
    </div>;
}
