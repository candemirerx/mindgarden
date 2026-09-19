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

/** Çevrimdışı bilgi ekranı — tarayıcı hatası yerine uygulama içi tasarım. */
export function OfflineOverlay({ onRetry }: { onRetry?: () => void }) {
    return (
        <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-5 bg-paper p-8 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-clay-100 text-clay-700">
                <WifiOff size={36} />
            </span>
            <div>
                <h2 className="text-xl font-semibold text-sand-900">Bağlantı Yok</h2>
                <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-sand-600">
                    Notlarını görmek için internet gerekmiyor; ancak Drive yedekleme ve yapay zeka özellikleri için bağlantı gerekiyor.
                </p>
            </div>
            {onRetry && (
                <button
                    onClick={() => { void hapticTick(); onRetry(); }}
                    className="btn btn-primary px-6 py-3"
                >
                    <RefreshCw size={18} />
                    <span>Tekrar Dene</span>
                </button>
            )}
        </div>
    );
}
