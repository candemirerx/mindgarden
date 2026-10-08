'use client';

/**
 * Uygulama açıldığında (ve uygulama arka plandan öne geldiğinde) seçili bağlantı
 * yoluna kendiliğinden bağlanma.
 *
 * Kullanıcı bir yolu bir kez kurduysa telefonda her seferinde Ayarlar'ı açıp
 * "Bağlan" demek zorunda kalmamalı. Kurallar:
 *  - Yalnız Android paketinde çalışır (tarayıcıda Bluetooth/ağ yoklaması yok).
 *  - Ayarlar → "Açılışta otomatik bağlan" kapalıysa hiç denenmez.
 *  - Aynı oturumda iki deneme arası en az BEKLEME_MS; arka plandan dönüş bu
 *    süreyi beklemez ama süren bir deneme varsa ona katılır.
 *  - Hata sessizdir: açılışta kullanıcıya ileti penceresi gösterilmez; durum
 *    şeridi (Ayarlar ve editör) gerçek sonucu zaten yazar.
 *
 * Kayıtlı adres yanıt vermezse kart yeniden taranır ve adı kart adına benzeyen
 * en güçlü aday seçilir (KablosuzBellek, can00 ...). Böylece kartın adresi
 * değişse de uygulama kendi kendine toparlanır.
 */
import { Capacitor } from '@capacitor/core';
import {
    KART_AP_ADRESI, baglantiTuru, bleDurumu, bluetoothKlavyeBagla, connectCard, enIyiKartAdayi,
    kartAginda, kayitliKartAdresi, remotePrefs, saveRemotePrefs, scanCards, scanPairedComputers,
    telefonWifiAdresi, testCard, testHelper
} from './remoteTools';
import type { BaglantiTuru, Device, RemotePrefs } from './remoteTools';
import { durumuTazele } from './baglantiDurumu';

export type OtomatikSonuc = { yol: BaglantiTuru; ok: boolean; mesaj: string; zaman: number };

/** Aynı oturumdaki iki otomatik deneme arasındaki en kısa süre. */
const BEKLEME_MS = 90_000;

let sonDeneme = 0;
let suren: Promise<OtomatikSonuc | null> | null = null;
let sonSonuc: OtomatikSonuc | null = null;

/** En son otomatik bağlanma sonucu (arayüz rozetleri için). */
export const sonOtomatikSonuc = (): OtomatikSonuc | null => sonSonuc;

const sonuc = (yol: BaglantiTuru, ok: boolean, mesaj: string): OtomatikSonuc => ({ yol, ok, mesaj, zaman: Date.now() });
const yazilim = (durum: { fw?: string } | null | undefined) => durum?.fw ? ' · yazılım ' + durum.fw : '';

/** Kart BLE: açıksa biter; değilse kayıtlı adres, o da olmazsa yeniden tarama. */
async function kartBle(): Promise<OtomatikSonuc> {
    if ((await bleDurumu()).connected) return sonuc('bluetooth', true, 'Kart Bluetooth bağlantısı zaten açıktı.');
    const kayitli = kayitliKartAdresi();
    if (kayitli) {
        try {
            await connectCard(kayitli);
            return sonuc('bluetooth', true, 'Kayıtlı karta Bluetooth ile bağlanıldı.');
        } catch { /* kart adresi değişmiş olabilir: aşağıda taranır */ }
    }
    // Tarama bazen boş döner (Android tarama sınırı, ekran kapalıyken) ve kart
    // reklam yayınını kesmiş olabilir; bu durumda telefonun eşleşmiş
    // cihazları arasında kart adına benzeyen aday doğrudan denenir.
    const bulunanlar = await scanCards().catch(() => [] as Device[]);
    const kart = enIyiKartAdayi(bulunanlar) ?? enIyiKartAdayi(await scanPairedComputers().catch(() => [] as Device[]));
    if (!kart) return sonuc('bluetooth', false, 'Yakında kart bulunamadı. Kart açık ve menzilde mi?');
    try {
        await connectCard(kart.address);
    } catch (hata) {
        return sonuc('bluetooth', false, 'Kart bağlantısı kurulamadı (kart açık ve menzilde mi?): ' + (hata instanceof Error ? hata.message : 'bilinmeyen hata'));
    }
    return sonuc('bluetooth', true, (kart.name || 'Kart') + ' ile Bluetooth bağlantısı kuruldu.');
}

/** Bilgisayar · Bluetooth: telefon yine bu bilgisayarın klavyesi/faresi olur. */
async function bilgisayarBluetooth(prefs: RemotePrefs): Promise<OtomatikSonuc> {
    const adres = prefs.helperBluetoothAddress;
    if (!adres) return sonuc('pc-bluetooth', false, 'Bilgisayar seçilmemiş; Ayarlar → Bilgisayar bağlantısı.');
    await bluetoothKlavyeBagla(adres);
    return sonuc('pc-bluetooth', true, (prefs.helperName || 'Bilgisayar') + ' ile Bluetooth klavye bağlantısı kuruldu.');
}

/** Kart Wi‑Fi: kayıtlı adres; olmazsa telefon kartın kendi ağındaysa AP adresi denenir. */
async function kartWifi(prefs: RemotePrefs): Promise<OtomatikSonuc> {
    try {
        return sonuc('wifi', true, 'Karta Wi‑Fi ile bağlanıldı' + yazilim(await testCard(prefs)) + '.');
    } catch (ilkHata) {
        const ip = await telefonWifiAdresi();
        if (ip && kartAginda(ip) && !/192\.168\.4\./.test(prefs.cardUrl)) {
            // Telefon kartın kendi ağına geçmiş: kayıtlı adres tutmasa da kart 192.168.4.1'de.
            const ap = { ...prefs, cardUrl: KART_AP_ADRESI, agTuru: 'kart-ap' as const };
            const durum = await testCard(ap);
            saveRemotePrefs(ap);
            return sonuc('wifi', true, 'Kartın kendi ağından bağlanıldı' + yazilim(durum) + '.');
        }
        throw ilkHata;
    }
}

/** Bilgisayar · Wi‑Fi ve Tailscale: kayıtlı yardımcıya anahtarlı ping. */
async function bilgisayarWifi(prefs: RemotePrefs): Promise<OtomatikSonuc> {
    await testHelper(prefs);
    return sonuc(baglantiTuru(prefs), true, (prefs.helperName || 'Bilgisayar') + ' ile bağlantı kuruldu.');
}

async function dene(prefs: RemotePrefs): Promise<OtomatikSonuc> {
    const yol = baglantiTuru(prefs);
    try {
        if (yol === 'bluetooth') return await kartBle();
        if (yol === 'pc-bluetooth') return await bilgisayarBluetooth(prefs);
        if (yol === 'wifi' || yol === 'kart-ap') return await kartWifi(prefs);
        return await bilgisayarWifi(prefs);
    } catch (hata) {
        return sonuc(yol, false, hata instanceof Error ? hata.message : 'Bağlantı kurulamadı.');
    }
}

/**
 * Açılış/öne gelme bağlanması. `zorla` verilmezse "Açılışta otomatik bağlan"
 * tercihi ve BEKLEME_MS kuralı geçerlidir. Süren bir deneme varsa ona katılır.
 */
export async function otomatikBaglan(zorla = false): Promise<OtomatikSonuc | null> {
    if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return null;
    if (suren) return suren;
    const prefs = remotePrefs();
    if (!zorla && prefs.autoBaglan === false) return null;
    if (!zorla && Date.now() - sonDeneme < BEKLEME_MS) return null;
    sonDeneme = Date.now();
    suren = dene(prefs)
        .then(s => { sonSonuc = s; return s; })
        // Durum şeridi tek doğruluk kaynağıdır: gerçek yoklama sonucu yayınlanır.
        .finally(() => { suren = null; void durumuTazele(remotePrefs()); });
    return suren;
}

/** Cihaz testi kancası: seçim mantığı yerel olmadan da sınanabilsin. */
if (typeof window !== 'undefined') {
    (window as unknown as { __nbOtomatik: unknown }).__nbOtomatik = {
        baglan: (zorla = false) => otomatikBaglan(zorla),
        sonuc: () => sonOtomatikSonuc(),
        enIyi: (cihazlar: Device[]) => enIyiKartAdayi(cihazlar)
    };
}
