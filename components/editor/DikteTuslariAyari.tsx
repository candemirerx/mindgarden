'use client';

/**
 * Dikte tuşları: kulaklık ve telefon tuşlarını dikteye atama.
 *
 * Cep Köprü'deki "Kulaklık tuşları" düzeninin Not Bahçesi uyarlaması:
 *  - Kulaklık komutları (Oynat/duraklat, Sonraki, Önceki): kulaklığın kendi
 *    uygulamasında bu komutlardan birini basışa atayın, burada dikteye bağlayın.
 *  - Telefon ses tuşları: uygulama öndeyken; "basılı tutarken dikte" (bas-konuş) desteklenir.
 *  - Kulaklık ses seviyesi: Bluetooth kulaklıkta ses artınca / azalınca.
 * Atamalar yalnızca Android uygulamasında çalışır ve editör açıkken geçerlidir.
 */
import { Check, Headphones, Info, SkipBack, SkipForward, Play, Smartphone, Volume2, Volume1, type LucideIcon } from 'lucide-react';
import { saveRemotePrefs, type DikteTusEylemi, type DikteTuslari, type RemotePrefs } from '@/lib/remoteTools';
import { SettingsNote, SettingsSection, cx } from '@/components/ui/settings';

const EYLEMLER: Array<{ id: DikteTusEylemi; ad: string }> = [
    { id: 'none', ad: 'Atama yok' },
    { id: 'start', ad: 'Dikteyi başlat' },
    { id: 'stop', ad: 'Dikteyi durdur' },
    { id: 'toggle', ad: 'Başlat / durdur' },
    { id: 'hold', ad: 'Basılı tutarken dikte' }
];

type Yuva = { id: keyof Omit<DikteTuslari, 'tool'>; ad: string; Icon: LucideIcon };

const KULAKLIK: Yuva[] = [
    { id: 'play', ad: 'Oynat / duraklat komutu', Icon: Play },
    { id: 'next', ad: 'Sonraki parça komutu', Icon: SkipForward },
    { id: 'prev', ad: 'Önceki parça komutu', Icon: SkipBack }
];
const TELEFON: Yuva[] = [
    { id: 'volUp', ad: 'Ses artır tuşu', Icon: Volume2 },
    { id: 'volDown', ad: 'Ses azalt tuşu', Icon: Volume1 }
];
const KULAKLIK_SES: Yuva[] = [
    { id: 'btVolUp', ad: 'Kulaklıkta ses artınca', Icon: Volume2 },
    { id: 'btVolDown', ad: 'Kulaklıkta ses azalınca', Icon: Volume1 }
];

function YuvaSecici({ yuva, deger, basilTutma, onSec }: { yuva: Yuva; deger: DikteTusEylemi; basilTutma: boolean; onSec: (e: DikteTusEylemi) => void }) {
    const { Icon } = yuva;
    return <div className="rounded-xl border border-sand-200 bg-sand-50/60 p-3">
        <div className="mb-2 flex items-center gap-2">
            <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', deger === 'none' ? 'bg-sand-100 text-sand-600' : 'bg-moss-100 text-moss-700')} aria-hidden="true"><Icon size={14} /></span>
            <span className="text-sm font-medium text-sand-900">{yuva.ad}</span>
        </div>
        <div role="radiogroup" aria-label={yuva.ad} className="flex flex-wrap gap-1.5">
            {EYLEMLER.filter(e => e.id !== 'hold' || basilTutma).map(e => {
                const secili = deger === e.id;
                return <button key={e.id} type="button" role="radio" aria-checked={secili} id={'dikte-tus-' + yuva.id + '-' + e.id} onClick={() => onSec(e.id)}
                    className={cx('inline-flex min-h-[40px] items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors',
                        secili ? 'border-moss-500 bg-moss-100 text-moss-800' : 'border-sand-200 bg-white text-sand-700 hover:border-sand-300')}>
                    {secili && <Check size={13} aria-hidden="true" />}{e.ad}
                </button>;
            })}
        </div>
    </div>;
}

export default function DikteTuslariAyari({ prefs, telefon }: { prefs: RemotePrefs; telefon: boolean }) {
    const tuslar = prefs.dictationKeys;
    const ata = (anahtar: Yuva['id'], eylem: DikteTusEylemi) => saveRemotePrefs({ ...prefs, dictationKeys: { ...tuslar, [anahtar]: eylem } });
    const aracSec = (tool: DikteTuslari['tool']) => saveRemotePrefs({ ...prefs, dictationKeys: { ...tuslar, tool } });
    const atamaSayisi = [...KULAKLIK, ...TELEFON, ...KULAKLIK_SES].filter(y => tuslar[y.id] !== 'none').length;
    const telefonMotoru = tuslar.tool === 'dictation' && prefs.dictationEngine !== 'cloud';

    return <SettingsSection icon={Headphones} tone="clay" title="Dikte tuşları"
        description="Kulaklığınızın ya da telefonun tuşlarıyla dikteyi başlatın ve durdurun."
        action={<span className={cx('rounded-full border px-2.5 py-1 text-[11px] font-semibold', atamaSayisi ? 'border-moss-500/30 bg-moss-500/10 text-moss-700' : 'border-sand-300 bg-sand-100 text-sand-600')}>{atamaSayisi ? atamaSayisi + ' atama' : 'Atama yok'}</span>}>
        {!telefon ? <SettingsNote tone="info">Tuş atamaları yalnızca Android uygulamasında çalışır.</SettingsNote> : <div className="space-y-4">
            <div className="space-y-2">
                <span className="block text-xs font-medium text-sand-700">Tuşlar hangi aracı çalıştırsın?</span>
                <div role="radiogroup" aria-label="Tuşların çalıştıracağı araç" className="grid grid-cols-2 gap-1.5">
                    {([['dictation', 'Dikte', 'Nota (ya da seçtiğiniz yere) yazar'], ['bridgeDictation', 'Köprü Dikte', 'Konuştukça bilgisayara yazar']] as const).map(([id, ad, alt]) => {
                        const secili = tuslar.tool === id;
                        return <button key={id} type="button" role="radio" aria-checked={secili} id={'dikte-tus-arac-' + id} onClick={() => aracSec(id)}
                            className={cx('min-h-[52px] rounded-xl border px-3 py-2 text-left transition-colors', secili ? 'border-moss-500 bg-moss-100 text-moss-800' : 'border-sand-200 bg-white text-sand-700 hover:border-sand-300')}>
                            <span className="flex items-center gap-1 text-sm font-semibold">{secili && <Check size={14} aria-hidden="true" />}{ad}</span>
                            <span className="block text-[11px] opacity-80">{alt}</span>
                        </button>;
                    })}
                </div>
                {telefonMotoru && atamaSayisi > 0 && <SettingsNote tone="info">Dikte aracı telefon motorundayken telefonun ses penceresini açar; kulaklık tuşuyla yalnızca başlatılır. Tuşla da durdurmak için bulut motorunu ya da Köprü Dikte'yi seçin.</SettingsNote>}
            </div>

            <div className="space-y-2">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-sand-600">Kulaklık tuşları</h5>
                <p className="flex gap-1.5 text-xs leading-relaxed text-sand-600"><Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" /><span>Önce kulaklığın kendi uygulamasında (Soundcore, QCY…) istediğiniz basışa Oynat-duraklat, Sonraki ya da Önceki parça komutunu atayın; sonra burada o komuta dikte işlemini bağlayın. Tek, çift ya da uzun basışın anlamını kulaklık belirler.</span></p>
                {KULAKLIK.map(y => <YuvaSecici key={y.id} yuva={y} deger={tuslar[y.id]} basilTutma={false} onSec={e => ata(y.id, e)} />)}
            </div>

            <div className="space-y-2">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-sand-600">Telefon ses tuşları</h5>
                <p className="flex gap-1.5 text-xs leading-relaxed text-sand-600"><Smartphone size={14} className="mt-0.5 shrink-0" aria-hidden="true" /><span>Uygulama öndeyken çalışır. Atama varken bu tuşlar sesi değiştirmez. "Basılı tutarken dikte" ile tuşu basılı tuttuğunuz sürece dinlenir.</span></p>
                {TELEFON.map(y => <YuvaSecici key={y.id} yuva={y} deger={tuslar[y.id]} basilTutma onSec={e => ata(y.id, e)} />)}
            </div>

            <details className="group rounded-xl border border-sand-200 bg-white">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3.5 text-sm font-medium text-sand-800">Kulaklık ses seviyesi (isteğe bağlı)<span className="text-xs text-sand-600 group-open:hidden">Aç</span></summary>
                <div className="space-y-2 px-3.5 pb-3.5">
                    <p className="text-xs leading-relaxed text-sand-600">Bluetooth kulaklık bağlı ve uygulama öndeyken medya sesindeki değişimi tuş olarak kullanır; ses seviyesi de değişir. En düşük ya da en yüksek seviyede değişim olmayacağı için çalışmaz; bazı telefonlar değişimi bildirmez.</p>
                    {KULAKLIK_SES.map(y => <YuvaSecici key={y.id} yuva={y} deger={tuslar[y.id]} basilTutma={false} onSec={e => ata(y.id, e)} />)}
                </div>
            </details>
        </div>}
    </SettingsSection>;
}
