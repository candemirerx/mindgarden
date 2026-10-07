'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store/useStore';
import { initDriveAutoSync } from '@/lib/driveSync';
import ModelSettingsModal from '@/components/editor/ModelSettingsModal';
import type { SettingsSectionId } from '@/components/editor/SettingsHome';
import { ayarlaraDonOku } from '@/lib/denemeAgaci';
import { OfflineOverlay, useMobileShell } from '@/components/mobile/MobileShell';

/** Ağaç düğmesi uygulama tercihlerini doğrudan tam ekran açar. */
export default function Sidebar({ initialSection = 'home' }: { initialSection?: 'home' | 'account' }) {
    const { isSidebarOpen, setSidebarOpen } = useStore();
    const isOffline = useMobileShell();

    useEffect(() => {
        initDriveAutoSync(useStore);
    }, []);

    // Deneme ağacından geri dönüldüğünde ayarlar, deneme ağacına geçilen sayfada yeniden açılır.
    const [donus, setDonus] = useState<SettingsSectionId | null>(null);
    useEffect(() => {
        const bolum = ayarlaraDonOku();
        if (bolum) { setDonus(bolum as SettingsSectionId); setSidebarOpen(true); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            {isOffline && <OfflineOverlay />}
            <ModelSettingsModal isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} initialSection={donus ?? initialSection} />
        </>
    );
}
