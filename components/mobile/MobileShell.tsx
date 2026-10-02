'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/**
 * Mobil deneyim yardımcıları:
 * - @capacitor/app geri tuşunu yönetir (kapı kapatma/yığında geri gitme).
 * - @capacitor/network ile bağlantı değişimini izler.
 * - Önemli düğmelere hafif titreşim geri bildirimi verir.
 */
export function useMobileShell(): boolean {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        let cleanupBack: (() => void) | null = null;
        let cleanupNetwork: (() => void) | null = null;
        let cancelled = false;

        (async () => {
            // Geri tuşu: WebView'i kapatmak yerine yığını geri al;
            // ana sayfadaysa çift basışla uygulamayı küçült.
            try {
                const { App } = await import('@capacitor/app');
                const listener = await App.addListener('backButton', () => {
                    // Tam ekran ayarlar kendi bölüm → liste → kapat sırasını yönetir.
                    if (document.querySelector('[data-settings-screen]')) return;
                    // Editör tam ekrandaysa geri tuşu yalnızca tam ekrandan çıkar.
                    if (document.querySelector('[data-tam-ekran]')) return;
                    if (window.history.length > 1) {
                        window.history.back();
                    } else {
                        void App.exitApp();
                    }
                });
                if (cancelled) {
                    void listener.remove();
                } else {
                    cleanupBack = () => { void listener.remove(); };
                }
            } catch {
                // @capacitor/app yoksa varsayılan davranış sürer
            }

            // Çevrimdışı durumu
            try {
                const { Network } = await import('@capacitor/network');
                const status = await Network.getStatus();
                if (!cancelled) setIsOffline(!status.connected);
                const listener = await Network.addListener('networkStatusChange', (s) => {
                    setIsOffline(!s.connected);
                });
                if (cancelled) {
                    void listener.remove();
                } else {
                    cleanupNetwork = () => { void listener.remove(); };
                }
            } catch {
                // @capacitor/network yoksa ekran gösterilmez
            }
        })();

        return () => {
            cancelled = true;
            cleanupBack?.();
            cleanupNetwork?.();
        };
    }, []);

    return isOffline;
}

/** Kısa tık geri bildirimi: native'de hafif titreşim, web'de sessiz. */
export async function hapticTick(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
        await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
        // Titreşim desteklenmiyorsa sessiz geç
    }
}

/** Dokunmaları engellemeyen, kısa süreli bağlantı bildirimi. */
export function OfflineOverlay() {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timeout = window.setTimeout(() => setVisible(false), 2500);
        return () => window.clearTimeout(timeout);
    }, []);

    if (!visible) return null;

    return (
        <div data-offline-notice role="status" aria-live="polite" className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+0.5rem)] z-[300] flex justify-center">
            <div className="flex max-w-full items-center gap-2 rounded-full border border-sand-300 bg-sand-50/95 px-3 py-2 text-xs text-sand-800 shadow-sm backdrop-blur">
                <WifiOff size={14} className="shrink-0" aria-hidden />
                <span>Çevrimdışı · Yerel notlar hazır</span>
            </div>
        </div>
    );
}
