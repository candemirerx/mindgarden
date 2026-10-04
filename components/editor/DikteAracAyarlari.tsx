'use client';

/**
 * Dikte ve Köprü Dikte araçlarının kendi ayarları (araç satırındaki dişliden açılır).
 *
 * Tek yerde toplanır: yazılacak yer (not metni, bilgisayar ya da ikisi birden)
 * ve Köprü Dikte için süre, "durdurana kadar dinle" ve anında yazma. Araç
 * kapalıyken de açılır; böylece açmadan önce hazırlanabilir.
 */
import { Check, Monitor, PenLine, Columns } from 'lucide-react';
import { saveRemotePrefs, type DikteHedefi, type RemotePrefs, type YazBicimi } from '@/lib/remoteTools';
import { SettingsRow, SettingsSwitch, cx, settingsFieldClass } from '@/components/ui/settings';

const HEDEFLER: Array<{ id: DikteHedefi; ad: string; aciklama: string; Icon: typeof Monitor }> = [
    { id: 'editor', ad: 'Not metni', aciklama: 'Yalnız editördeki nota yazılır.', Icon: PenLine },
    { id: 'computer', ad: 'Bilgisayar', aciklama: 'Yalnız bilgisayardaki odaklı alana yazılır; not değişmez.', Icon: Monitor },
    { id: 'both', ad: 'İkisi birden', aciklama: 'Hem nota hem bilgisayara yazılır.', Icon: Columns }
];

function HedefSecici({ deger, onSec, ad, onek, notlar }: { deger: DikteHedefi; onSec: (h: DikteHedefi) => void; ad: string; onek: string; notlar?: Partial<Record<DikteHedefi, string>> }) {
    const secili = HEDEFLER.find(h => h.id === deger)!;
    return <div className="space-y-2">
        <span className="block text-xs font-medium text-sand-700">Nereye yazılsın?</span>
        <div role="radiogroup" aria-label={ad + ' hedefi'} className="grid grid-cols-3 gap-1.5">
            {HEDEFLER.map(({ id, ad: hedefAdi, Icon }) => {
                const aktif = deger === id;
                return <button key={id} type="button" role="radio" aria-checked={aktif} id={`dikte-hedef-${onek}-${id}`} onClick={() => onSec(id)}
                    className={cx('flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-xs font-semibold transition-colors',
                        aktif ? 'border-moss-400 bg-moss-50 text-moss-800' : 'border-sand-200 bg-white text-sand-700 hover:border-sand-300')}>
                    {aktif ? <Check size={15} aria-hidden="true" /> : <Icon size={15} aria-hidden="true" />}
                    <span>{hedefAdi}</span>
                </button>;
            })}
        </div>
        <p className="text-xs leading-relaxed text-sand-600">{notlar?.[deger] ?? secili.aciklama}</p>
    </div>;
}

const BICIMLER: Array<{ id: YazBicimi; ad: string; aciklama: string }> = [
    { id: 'dugme', ad: 'Düğmeyle', aciklama: 'Düğmeye basınca notun tamamı bir kerede bilgisayara yazılır.' },
    { id: 'canli', ad: 'Yazdıkça canlı', aciklama: 'Açtıktan sonra notta yazdığınız her şey anında bilgisayara da yazılır (eski Köprü Yaz). Düğmeye tekrar basınca durur.' }
];

export default function DikteAracAyarlari({ arac, prefs }: { arac: 'dictation' | 'bridgeDictation' | 'computerWrite'; prefs: RemotePrefs }) {
    const guncelle = (parca: Partial<RemotePrefs>) => saveRemotePrefs({ ...prefs, ...parca });
    if (arac === 'computerWrite') {
        const bicim = BICIMLER.find(b => b.id === prefs.writeMode)!;
        return <div className="space-y-3 rounded-xl border border-sand-200 bg-sand-50/70 p-3.5">
            <div className="space-y-2">
                <span className="block text-xs font-medium text-sand-700">Nasıl yazılsın?</span>
                <div role="radiogroup" aria-label="Bilgisayara Yaz biçimi" className="grid grid-cols-2 gap-1.5">
                    {BICIMLER.map(b => {
                        const aktif = prefs.writeMode === b.id;
                        return <button key={b.id} type="button" role="radio" aria-checked={aktif} id={'yaz-bicim-' + b.id} onClick={() => guncelle({ writeMode: b.id })}
                            className={cx('flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition-colors',
                                aktif ? 'border-moss-400 bg-moss-50 text-moss-800' : 'border-sand-200 bg-white text-sand-700 hover:border-sand-300')}>
                            {aktif && <Check size={14} aria-hidden="true" />}{b.ad}
                        </button>;
                    })}
                </div>
                <p className="text-xs leading-relaxed text-sand-600">{bicim.aciklama}</p>
            </div>
            <HedefSecici ad="Bilgisayara Yaz" onek="yaz" deger={prefs.writeTarget} onSec={h => guncelle({ writeTarget: h })} notlar={{
                editor: 'Yalnız not metni seçili: bu araç bilgisayara hiçbir şey göndermez. Bilgisayara yazmak için Bilgisayar ya da İkisi birden seçin.',
                computer: prefs.writeMode === 'canli' ? 'Yazdıkça bilgisayara gider; aracı kapatınca not açıldığı hâline döner.' : 'Not bilgisayara yazılır; not değişmez.',
                both: prefs.writeMode === 'canli' ? 'Notta yazdığınız kalır ve aynı anda bilgisayara da yazılır.' : 'Not bilgisayara yazılır; notta zaten durduğu için not değişmez.'
            }} />
        </div>;
    }
    if (arac === 'dictation') {
        return <div className="space-y-3 rounded-xl border border-sand-200 bg-sand-50/70 p-3.5">
            <HedefSecici ad="Dikte" onek="dikte" deger={prefs.dictationTarget} onSec={h => guncelle({ dictationTarget: h })} />
            {prefs.dictationTarget !== 'computer' && <SettingsRow title="Mevcut metnin sonuna ekle" description="Kapalıyken dikte, notun içeriğini değiştirir.">
                <SettingsSwitch checked={prefs.appendDictation} onChange={v => guncelle({ appendDictation: v })} label="Dikte sonucunu mevcut metnin sonuna ekle" />
            </SettingsRow>}
        </div>;
    }
    return <div className="space-y-3 rounded-xl border border-sand-200 bg-sand-50/70 p-3.5">
        <HedefSecici ad="Köprü Dikte" onek="kopru" deger={prefs.bridgeDictationTarget} onSec={h => guncelle({ bridgeDictationTarget: h })} />
        <label className="block text-xs font-medium text-sand-700">Dinleme süresi (saniye)
            <input id="kopru-dikte-sure" className={settingsFieldClass + ' mt-1.5 min-h-[44px]'} type="number" inputMode="numeric" min="5" max="3600" step="1"
                disabled={prefs.bridgeDictationUnlimited} value={prefs.bridgeDictationSeconds}
                onChange={e => guncelle({ bridgeDictationSeconds: Math.max(5, Math.min(3600, Number(e.target.value) || 5)) })} />
            <span className="mt-1 block font-normal text-sand-600">5–3600 saniye. Süre bitmeden araç düğmesine tekrar basarak durdurabilirsiniz.</span>
        </label>
        <SettingsRow title="Ben durdurana kadar dinle" description="Süre sınırı olmadan, düğmeye tekrar basana kadar.">
            <SettingsSwitch checked={prefs.bridgeDictationUnlimited} onChange={v => guncelle({ bridgeDictationUnlimited: v })} label="Ben durdurana kadar dinle" />
        </SettingsRow>
        <SettingsRow title="Konuşurken anında yaz" description="Açıkken söz, cümle sonu beklenmeden yazılır ve yanlış tanınan kelime düzeltilir. Kapalıyken yalnız bitmiş cümleler yazılır.">
            <SettingsSwitch checked={prefs.bridgeDictationLive} onChange={v => guncelle({ bridgeDictationLive: v })} label="Köprü Dikte'de konuşurken anında yaz" />
        </SettingsRow>
    </div>;
}
