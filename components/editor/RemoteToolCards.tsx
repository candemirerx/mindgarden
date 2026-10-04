'use client';

/**
 * Bilgisayar araçlarının açma/kapama listesi.
 *
 * Kart ve başlık üretmez; Ayarlar → Araçlar sekmesindeki "Bilgisayar
 * araçları" bölümünün içinde yalnızca satırları döndürür. Böylece tüm ayar
 * listeleri aynı satır görünümünü paylaşır.
 */
import { useState } from 'react';
import { AudioLines, Clipboard, CornerDownLeft, Keyboard, LayoutDashboard, Mic, MousePointer2, Settings2, Wand2 } from 'lucide-react';
import { REMOTE_TOOL_IDS, saveRemotePrefs } from '@/lib/remoteTools';
import type { RemoteToolId } from '@/lib/remoteTools';
import { useRemotePrefs } from '@/lib/useRemotePrefs';
import { SettingsRow, SettingsSwitch, cx } from '@/components/ui/settings';
import DikteAracAyarlari from './DikteAracAyarlari';

const items = {
    mouse: { title: 'Fare', subtitle: 'Dokunarak sol tık, sürükleyerek fare hareketi ve kaydırma.', Icon: MousePointer2 },
    dictation: { title: 'Dikte', subtitle: 'Sesi nota, bilgisayara ya da ikisine birden yaz; hedefi dişliden seç.', Icon: Mic },
    bridgeDictation: { title: 'Köprü Dikte', subtitle: 'Belirlenen süre konuş; söz nota, bilgisayara ya da ikisine birden yazılır. Süre ve hedef dişlide.', Icon: AudioLines },
    computerWrite: { title: 'Bilgisayara Yaz', subtitle: 'Notu bilgisayardaki odaklı alana yazar: düğmeye basınca bir kerede ya da yazdıkça canlı. Biçim ve hedef dişlide.', Icon: Keyboard },
    enter: { title: 'Enter', subtitle: 'Bilgisayara yalnızca Enter tuşunu gönderir; yazdırdığınız metinden sonra satırı bitirmek için.', Icon: CornerDownLeft },
    clipboard: { title: 'Bilgisayar Panosuna Gönder', subtitle: 'Not metnini PC pano yardımcısına gönder.', Icon: Clipboard },
    shortcuts: { title: 'Kısayollar', subtitle: 'Kişisel klavye, metin ve konum makrolarını editördeki panodan çalıştır.', Icon: Wand2 },
    screen: { title: 'Ekran', subtitle: 'Kendi tasarladığın bölmeli ekran: fare, yön tuşları, metin ve kısayollar bir arada.', Icon: LayoutDashboard }
} satisfies Record<RemoteToolId, { title: string; subtitle: string; Icon: typeof MousePointer2 }>;

/** Kendi ayarı olan araçlar: satırdaki dişli, ayar panelini açar. */
const AYARLI = ['dictation', 'bridgeDictation', 'computerWrite'] as const;
type AyarliArac = typeof AYARLI[number];
const ayarli = (id: RemoteToolId): id is AyarliArac => (AYARLI as readonly string[]).includes(id);

export default function RemoteToolCards() {
    const prefs = useRemotePrefs();
    const [acik, setAcik] = useState<AyarliArac | null>(null);

    const toggle = (id: RemoteToolId) => {
        saveRemotePrefs({ ...prefs, enabledTools: { ...prefs.enabledTools, [id]: !prefs.enabledTools[id] } });
    };

    return <div className="space-y-2.5">
        {REMOTE_TOOL_IDS.map(id => {
            const { title, subtitle, Icon } = items[id];
            const enabled = prefs.enabledTools[id];
            const dugmeAcik = ayarli(id) && acik === id;
            return (
                <div key={id} className="space-y-2">
                    <SettingsRow icon={Icon} dimmed={!enabled} title={title} description={subtitle}>
                        {ayarli(id) && <button type="button" id={'arac-ayar-' + id} aria-expanded={dugmeAcik} aria-label={title + ' ayarları'} title={title + ' ayarları'}
                            onClick={() => setAcik(dugmeAcik ? null : id)}
                            className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40',
                                dugmeAcik ? 'bg-moss-100 text-moss-800' : 'text-sand-600 hover:bg-sand-100 hover:text-sand-800')}>
                            <Settings2 size={18} aria-hidden="true" />
                        </button>}
                        <SettingsSwitch
                            checked={enabled}
                            onChange={() => toggle(id)}
                            label={title + ' aracını ' + (enabled ? 'kapat' : 'aç')}
                        />
                    </SettingsRow>
                    {ayarli(id) && dugmeAcik && <DikteAracAyarlari arac={id} prefs={prefs} />}
                </div>
            );
        })}
    </div>;
}

