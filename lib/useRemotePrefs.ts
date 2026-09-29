'use client';

/**
 * Bilgisayar aracı tercihlerini ekranlara taşır.
 *
 * Ayarlar modalı kaydederken 'remote-prefs' kanalıyla haber verir; kullanıcı
 * başka bir ekrandan dönüp sayfa yeniden görünür olduğunda ise focus ve
 * visibilitychange olayları tazeler. İki yol da dinlendiği için araç çubuğu ile
 * sayfanın geri kalanı aynı anda güncellenir; kapatılan bir araç hiçbir ekranda
 * yarı açık kalmaz.
 */
import { useEffect, useState } from 'react';
import { dinle } from './degisim';
import { remotePrefs, type RemotePrefs } from './remoteTools';

export function useRemotePrefs(): RemotePrefs {
    const [prefs, setPrefs] = useState<RemotePrefs>(remotePrefs);
    useEffect(() => {
        const tazele = () => setPrefs(remotePrefs());
        tazele();
        const birak = dinle('remote-prefs', tazele);
        const gorunurluk = () => { if (document.visibilityState === 'visible') tazele(); };
        window.addEventListener('focus', tazele);
        document.addEventListener('visibilitychange', gorunurluk);
        return () => {
            birak();
            window.removeEventListener('focus', tazele);
            document.removeEventListener('visibilitychange', gorunurluk);
        };
    }, []);
    return prefs;
}
