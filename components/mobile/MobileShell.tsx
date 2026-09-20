'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/**
 * Mobil deneyim yardımcıları:
 * - @capacitor/app geri tuşunu yönetir (kapı kapatma/yığında geri gitme).
 * - @capacitor/network ile çevrimdışıyken şık bir bilgi ekranı gösterir.
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

/** Yerel notları engellemeden bağlantı durumunu bildiren küçük banner. */
export function OfflineOverlay({ onRetry }: { onRetry?: () => void }) {
    return (
        <div className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-[300] flex justify-center">
            <div className="pointer-events-auto flex max-w-xl items-start gap-3 rounded-2xl border border-clay-300 bg-clay-50/95 px-4 py-3 text-left shadow-pop backdrop-blur">
                <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-clay-100 text-clay-700">
                    <WifiOff size={19} />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-sand-900">Çevrimdışısınız</h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-sand-600">
                        Yerel notlarınızı kullanabilirsiniz. Drive senkronizasyonu ve yapay zekâ bağlantı gelene kadar bekler.
                    </p>
                </div>
                {onRetry && (
                    <button
                        onClick={() => { void hapticTick(); onRetry(); }}
                        aria-label="Bağlantıyı yeniden dene"
                        className="rounded-lg p-2 text-clay-700 transition-colors hover:bg-clay-100"
                    >
                        <RefreshCw size={17} />
                    </button>
                )}
            </div>
        </div>
    );
}
