'use client';

/**
 * Bilgisayar araçlarının açma/kapama listesi.
 *
 * Kart ve başlık üretmez; Ayarlar → Araçlar sekmesindeki "Bilgisayar
 * araçları" bölümünün içinde yalnızca satırları döndürür. Böylece tüm ayar
 * listeleri aynı satır görünümünü paylaşır.
 */
import { AudioLines, Clipboard, Keyboard, LayoutDashboard, Mic, MousePointer2, Wand2 } from 'lucide-react';
import { REMOTE_TOOL_IDS, saveRemotePrefs } from '@/lib/remoteTools';
import type { RemoteToolId } from '@/lib/remoteTools';
import { useRemotePrefs } from '@/lib/useRemotePrefs';
import { SettingsRow, SettingsSwitch } from '@/components/ui/settings';

const items = {
    mouse: { title: 'Fare', subtitle: 'Dokunarak sol tık, sürükleyerek fare hareketi ve kaydırma.', Icon: MousePointer2 },
    dictation: { title: 'Dikte', subtitle: 'Sesi nota veya doğrudan bilgisayara yaz; hedefi bağlantı ayarlarında seç.', Icon: Mic },
    bridgeDictation: { title: 'Köprü Dikte', subtitle: 'Belirlenen süre konuş; notu değiştirmeden bilgisayara yaz.', Icon: AudioLines },
    bridgeWrite: { title: 'Köprü Yaz', subtitle: 'Notta yazarken aynı metin bilgisayara da yazılır; açıp kapatmak için editördeki düğmeyi kullan.', Icon: Keyboard },
    computerWrite: { title: 'Bilgisayara Yaz', subtitle: 'Not metnini kartın klavyesiyle bilgisayardaki odaklı alana yaz.', Icon: Keyboard },
    clipboard: { title: 'Bilgisayar Panosuna Gönder', subtitle: 'Not metnini PC pano yardımcısına gönder.', Icon: Clipboard },
    shortcuts: { title: 'Kısayollar', subtitle: 'Kişisel klavye, metin ve konum makrolarını editördeki panodan çalıştır.', Icon: Wand2 },
    screen: { title: 'Ekran', subtitle: 'Kendi tasarladığın bölmeli ekran: fare, yön tuşları, metin ve kısayollar bir arada.', Icon: LayoutDashboard }
} satisfies Record<RemoteToolId, { title: string; subtitle: string; Icon: typeof MousePointer2 }>;

export default function RemoteToolCards() {
    const prefs = useRemotePrefs();

    const toggle = (id: RemoteToolId) => {
        saveRemotePrefs({ ...prefs, enabledTools: { ...prefs.enabledTools, [id]: !prefs.enabledTools[id] } });
    };

    return <div className="space-y-2.5">
        {REMOTE_TOOL_IDS.map(id => {
            const { title, subtitle, Icon } = items[id];
            const enabled = prefs.enabledTools[id];
            return (
                <SettingsRow key={id} icon={Icon} dimmed={!enabled} title={title} description={subtitle}>
                    <SettingsSwitch
                        checked={enabled}
                        onChange={() => toggle(id)}
                        label={title + ' aracını ' + (enabled ? 'kapat' : 'aç')}
                    />
                </SettingsRow>
            );
        })}
    </div>;
}

