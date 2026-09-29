'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store/useStore';
import { initDriveAutoSync } from '@/lib/driveSync';
import ModelSettingsModal from '@/components/editor/ModelSettingsModal';
import { OfflineOverlay, useMobileShell } from '@/components/mobile/MobileShell';

/** Ağaç düğmesi uygulama tercihlerini doğrudan tam ekran açar. */
export default function Sidebar({ initialSection = 'home' }: { initialSection?: 'home' | 'account' }) {
    const { isSidebarOpen, setSidebarOpen } = useStore();
    const isOffline = useMobileShell();

    useEffect(() => {
        initDriveAutoSync(useStore);
    }, []);

    return (
        <>
            {isOffline && <OfflineOverlay />}
            <ModelSettingsModal isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} initialSection={initialSection} />
        </>
    );
}
