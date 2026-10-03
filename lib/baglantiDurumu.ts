'use client';

/**
 * Bilgisayar bağlantısının CANLI durumu.
 *
 * "Bilgiler kayıtlı" ile "bağlantı çalışıyor" aynı şey değildir: ayarlarda
 * eşleşme bitmiş olsa da yardımcı kapanmış, kart ağdan düşmüş ya da editör
 * başka bir yolu kullanıyor olabilir. Burada seçili yol, editörün kullandığı
 * fonksiyonların aynısıyla gerçekten yoklanır; ayarlar ve editör aynı sonucu
 * gösterir. Yoklama hiçbir tuş/metin göndermez (yalnız ping ve durum).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    bilgisayarlaEslestirBluetooth, bilgisayarlaEslestirWifi, bilgisayarlariBul, bleDurumu, bluetoothKlavyeBagla, bluetoothKlavyeDurumu, connectCard, kartiWifidaBul,
    kayitliKartAdresi, remotePrefs, saveRemotePrefs, sendCommand, sendKey, sendToComputerClipboard, testCard, testHelper, typeOnComputer
} from './remoteTools';
import type { ConnectionMode, RemotePrefs } from './remoteTools';
import { bildir, dinle } from './degisim';

export type DurumTuru = 'ok' | 'hata' | 'kurulmadi' | 'bakiliyor';
export type BaglantiDurumu = { tur: DurumTuru; mesaj: string; yol: ConnectionMode; zaman: number };

export const YOL_ADI: Record<ConnectionMode, string> = {
    'pc-wifi': 'Bilgisayar · Wi‑Fi',
    'pc-bluetooth': 'Bilgisayar · Bluetooth',
    wifi: 'Kart · Wi‑Fi',
    bluetooth: 'Kart · Bluetooth'
};

function sureli<T>(is: Promise<T>, ms: number, mesaj: string): Promise<T> {
    return new Promise((coz, reddet) => {
        const z = setTimeout(() => reddet(new Error(mesaj)), ms);
        is.then(v => { clearTimeout(z); coz(v); }, h => { clearTimeout(z); reddet(h); });
    });
}

/** Seçili yolu yoklar. Kurulum eksikse ağa hiç çıkılmaz. */
export async function baglantiyiYokla(prefs: RemotePrefs): Promise<BaglantiDurumu> {
    const yol = prefs.connection;
    const sonuc = (tur: DurumTuru, mesaj: string): BaglantiDurumu => ({ tur, mesaj, yol, zaman: Date.now() });
    const ad = prefs.helperName || 'bilgisayar';
    try {
        if (yol === 'pc-wifi') {
            if (!prefs.helperUrl || !prefs.helperToken) return sonuc('kurulmadi', 'Bilgisayar eşleştirilmedi.');
            await sureli(testHelper(prefs), 9000, 'Bilgisayar yanıt vermedi.');
            return sonuc('ok', ad + ' ile bağlı (Wi‑Fi).');
        }
        if (yol === 'pc-bluetooth') {
            if (!prefs.helperBluetoothAddress) return sonuc('kurulmadi', 'Bilgisayar seçilmedi.');
            await sureli(testHelper(prefs), 20000, 'Bilgisayar Bluetooth klavye bağlantısını kabul etmedi.');
            return sonuc('ok', (prefs.helperName || 'Bilgisayar') + ' ile Bluetooth klavye/fare olarak bağlı.');
        }
        if (yol === 'wifi') {
            if (!prefs.cardUrl.trim()) return sonuc('kurulmadi', 'Kart adresi yok.');
            await sureli(testCard(prefs), 9000, 'Kart yanıt vermedi.');
            return sonuc('ok', 'Karta bağlı · ' + prefs.cardUrl.replace(/^https?:\/\//, '') + '.');
        }
        const ble = await bleDurumu();
        if (ble.connected) return sonuc('ok', 'Karta Bluetooth ile bağlı.');
        const adres = kayitliKartAdresi();
        if (!adres) return sonuc('kurulmadi', 'Kart seçilmedi; Ayarlar → Bilgisayar bağlantısı → Kart · Bluetooth.');
        // Editör ilk komutta da böyle yapar: kayıtlı karta yeniden bağlanılır.
        await sureli(connectCard(adres), 14000, 'Karta Bluetooth ile bağlanılamadı.');
        return sonuc('ok', 'Karta Bluetooth ile bağlı.');
    } catch (hata) {
        return sonuc('hata', hata instanceof Error ? hata.message : 'Bağlantı kurulamadı.');
    }
}

/** Son bilinen durum: ayarlar ve editör aynı değeri paylaşır. */
let sonDurum: BaglantiDurumu | null = null;
let suren: Promise<BaglantiDurumu> | null = null;

export function sonBaglantiDurumu(): BaglantiDurumu | null { return sonDurum; }

/** Aynı anda tek yoklama yapılır; sonucu herkese duyurulur. */
export function durumuTazele(prefs: RemotePrefs): Promise<BaglantiDurumu> {
    if (suren) return suren;
    suren = baglantiyiYokla(prefs).then(d => { sonDurum = d; bildir('baglanti-durumu'); return d; }).finally(() => { suren = null; });
    return suren;
}

/**
 * Seçili yolun durumunu izler: açılışta ve `aralikMs`'de bir yoklar; yol
 * değişince eski sonuç gösterilmez. `etkin` false iken yoklama yapılmaz.
 */
export function useBaglantiDurumu(prefs: RemotePrefs, { aralikMs = 30000, etkin = true }: { aralikMs?: number; etkin?: boolean } = {}) {
    const [durum, setDurum] = useState<BaglantiDurumu | null>(() => sonDurum && sonDurum.yol === prefs.connection ? sonDurum : null);
    const [bakiliyor, setBakiliyor] = useState(false);
    const guncel = useRef(prefs);
    guncel.current = prefs;
    const tazele = useCallback(async () => {
        setBakiliyor(true);
        try { setDurum(await durumuTazele(guncel.current)); } finally { setBakiliyor(false); }
    }, []);
    useEffect(() => dinle('baglanti-durumu', () => {
        if (sonDurum && sonDurum.yol === guncel.current.connection) setDurum(sonDurum);
    }), []);
    // Yol ya da kurulum bilgisi değişince yeniden yokla.
    const anahtar = [prefs.connection, prefs.helperUrl, prefs.helperToken, prefs.helperBluetoothAddress, prefs.cardUrl].join('|');
    useEffect(() => {
        if (!etkin) return;
        setDurum(d => (d && d.yol === prefs.connection ? d : null));
        void tazele();
        const z = setInterval(() => { if (document.visibilityState === 'visible') void tazele(); }, aralikMs);
        return () => clearInterval(z);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anahtar, etkin, aralikMs]);
    const gorunen: BaglantiDurumu | null = durum && durum.yol === prefs.connection ? durum : null;
    return { durum: gorunen, bakiliyor, tazele };
}

/**
 * Cihaz testi kancası: editörün kullandığı fonksiyonların aynısını, kayıtlı
 * tercihlerle çalıştırır (yazma, tuş, pano, yoklama, eşleştirme, kart bulma).
 * Arayüzde zaten yapılabilen işleri açar; yeni bir yetki vermez.
 * Kullanım: CardBleDeviceTest#editorPathsEndToEnd.
 */
if (typeof window !== 'undefined') {
    (window as unknown as { __nbUzak: unknown }).__nbUzak = {
        prefs: () => remotePrefs(),
        ayarla: (p: RemotePrefs) => { saveRemotePrefs(p); return remotePrefs(); },
        yokla: () => baglantiyiYokla(remotePrefs()),
        yaz: (metin: string) => typeOnComputer(metin, remotePrefs()),
        tus: (tuslar: string) => sendKey(tuslar, remotePrefs()),
        pano: (metin: string) => sendToComputerClipboard(metin, remotePrefs()),
        bul: () => bilgisayarlariBul(),
        eslestirWifi: (url: string, kod: string) => bilgisayarlaEslestirWifi(url, kod),
        eslestirBluetooth: (adres: string, kod: string) => bilgisayarlaEslestirBluetooth(adres, kod),
        btKlavye: (adres: string) => bluetoothKlavyeBagla(adres),
        btKlavyeDurumu: () => bluetoothKlavyeDurumu(),
        komut: (komut: string) => sendCommand(komut, remotePrefs()),
        kartBul: () => kartiWifidaBul()
    };
}
