'use client';

/**
 * Yazı modunun klavye üstü düğmelerini düzenler (araç satırındaki dişliden açılır).
 *
 * Düğmeler eklenir, adı ve işi değiştirilir, sırası yukarı/aşağı oklarıyla
 * değiştirilir ya da kaldırılır. Bir düğme uygulamanın hazır işlerinden biri
 * (Enter, Fare, Canlı yazma…), bilgisayara yazılacak bir metin, bir klavye
 * kısayolu, kayıtlı bir makro ya da bir yapay zekâ makrosu olabilir.
 */
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import {
    makroHazir, saveRemotePrefs, VARSAYILAN_YAZI_DUGMELERI, YAZI_ARACLARI, YAZI_DUGMESI_SINIRI,
    type RemotePrefs, type YaziAraci, type YaziDugmesi, type YaziDugmesiTuru
} from '@/lib/remoteTools';
import { readAiMacros, type AiMacro } from '@/lib/aiMacro';
import { cx, settingsFieldClass } from '@/components/ui/settings';
import { yaziDugmesiSimgesi } from './YaziModu';

const TURLER: Array<{ id: YaziDugmesiTuru; ad: string }> = [
    { id: 'builtin', ad: 'Araç' },
    { id: 'text', ad: 'Metin' },
    { id: 'shortcut', ad: 'Kısayol' },
    { id: 'macro', ad: 'Makro' },
    { id: 'ai', ad: 'AI makro' }
];
const TUR_ACIKLAMASI: Record<YaziDugmesiTuru, string> = {
    builtin: 'Uygulamanın hazır işi: Enter, fare, canlı yazma, dikte, pano…',
    text: 'Dokununca bu metin bilgisayardaki odaklı alana yazılır.',
    shortcut: 'Dokununca bu tuş ya da kısayol bilgisayara gönderilir (ör. CTRL+S, ALT+TAB, ESC).',
    macro: 'Kısayollar bölümünde kaydettiğiniz bir makroyu çalıştırır.',
    ai: 'Kutudaki metni (ya da seçimi) bu yapay zekâ makrosuyla işler; sonucu onaylarsınız.'
};
const HAZIR_KISAYOLLAR = ['CTRL+S', 'CTRL+Z', 'CTRL+A', 'ALT+TAB', 'ESC', 'TAB', 'BACKSPACE', 'WIN+D'];

type Taslak = { duzenlenen: string | null; kind: YaziDugmesiTuru; title: string; value: string };
const BOS_TASLAK: Taslak = { duzenlenen: null, kind: 'builtin', title: '', value: '' };

export default function YaziDugmeleriAyari({ prefs }: { prefs: RemotePrefs }) {
    const dugmeler = prefs.yaziDugmeleri;
    const [taslak, setTaslak] = useState<Taslak | null>(null);
    const [aiMakrolari, setAiMakrolari] = useState<AiMacro[]>([]);
    useEffect(() => { setAiMakrolari(readAiMacros().filter(m => m.instruction.trim())); }, [taslak?.kind]);

    const kaydet = (liste: YaziDugmesi[]) => saveRemotePrefs({ ...prefs, yaziDugmeleri: liste });
    const tasi = (i: number, yon: -1 | 1) => {
        const j = i + yon;
        if (j < 0 || j >= dugmeler.length) return;
        const liste = [...dugmeler];
        [liste[i], liste[j]] = [liste[j], liste[i]];
        kaydet(liste);
    };
    const kaldir = (id: string) => kaydet(dugmeler.filter(d => d.id !== id));

    const kullanilanAraclar = new Set(dugmeler.filter(d => d.kind === 'builtin' && d.id !== taslak?.duzenlenen).map(d => d.id));
    const bosAraclar = (Object.keys(YAZI_ARACLARI) as YaziAraci[]).filter(id => !kullanilanAraclar.has(id));
    const makrolar = prefs.macros.filter(makroHazir);

    const taslakGecerli = (t: Taslak) => t.kind === 'builtin' ? (t.value in YAZI_ARACLARI) && !kullanilanAraclar.has(t.value) : !!t.value.trim();
    const varsayilanAd = (t: Taslak) => t.kind === 'builtin' ? YAZI_ARACLARI[t.value as YaziAraci] ?? ''
        : t.kind === 'macro' ? prefs.macros.find(m => m.id === t.value)?.name.trim() ?? ''
            : t.kind === 'ai' ? aiMakrolari.find(m => m.id === t.value)?.title ?? ''
                : t.value.trim().slice(0, 16);
    const taslakKaydet = () => {
        if (!taslak || !taslakGecerli(taslak)) return;
        const title = (taslak.title.trim() || varsayilanAd(taslak) || 'Düğme').slice(0, 40);
        const id = taslak.kind === 'builtin' ? taslak.value : taslak.duzenlenen && !(taslak.duzenlenen in YAZI_ARACLARI) ? taslak.duzenlenen : 'y-' + Date.now().toString(36);
        const yeni: YaziDugmesi = { id, title, kind: taslak.kind, value: taslak.kind === 'builtin' ? '' : taslak.value.trim() };
        if (taslak.duzenlenen) kaydet(dugmeler.map(d => d.id === taslak.duzenlenen ? yeni : d));
        else kaydet([...dugmeler, yeni]);
        setTaslak(null);
    };
    const duzenle = (d: YaziDugmesi) => setTaslak({ duzenlenen: d.id, kind: d.kind, title: d.title, value: d.kind === 'builtin' ? d.id : d.value });
    const turSec = (kind: YaziDugmesiTuru) => setTaslak(t => t && ({ ...t, kind, value: kind === 'builtin' ? bosAraclar[0] ?? '' : kind === 'macro' ? makrolar[0]?.id ?? '' : kind === 'ai' ? aiMakrolari[0]?.id ?? '' : '' }));

    const dolu = dugmeler.length >= YAZI_DUGMESI_SINIRI;

    return <div id="yazi-dugmeleri-ayari" className="space-y-3 rounded-xl border border-sand-200 bg-sand-50/70 p-3.5">
        <div>
            <span className="block text-xs font-medium text-sand-700">Klavye üstü düğmeler</span>
            <p className="mt-0.5 text-xs leading-relaxed text-sand-600">Yazı modunda klavyenin hemen üstünde bu sırayla görünür. En çok {YAZI_DUGMESI_SINIRI} düğme.</p>
        </div>
        {dugmeler.length === 0 && <p className="rounded-lg border border-dashed border-sand-300 px-3 py-4 text-center text-xs text-sand-600">Düğme yok. Aşağıdan ekleyin ya da varsayılana dönün.</p>}
        <ol className="space-y-1.5" aria-label="Yazı modu düğmeleri">
            {dugmeler.map((d, i) => {
                const Icon = yaziDugmesiSimgesi(d);
                const tur = TURLER.find(t => t.id === d.kind)!.ad;
                const ipucu = d.kind === 'builtin' ? (YAZI_ARACLARI[d.id as YaziAraci] !== d.title ? YAZI_ARACLARI[d.id as YaziAraci] : '')
                    : d.kind === 'macro' ? prefs.macros.find(m => m.id === d.value)?.name ?? 'Makro silinmiş'
                        : d.kind === 'ai' ? aiMakrolari.find(m => m.id === d.value)?.title ?? readAiMacros().find(m => m.id === d.value)?.title ?? 'AI makrosu silinmiş'
                            : d.value.replace(/\s+/g, ' ').slice(0, 30);
                return <li key={d.id} className="flex min-h-[48px] items-center gap-1 rounded-xl border border-sand-200 bg-white py-1 pl-2.5 pr-1">
                    <Icon size={16} className={cx('shrink-0', d.id === 'clear' ? 'text-berry-600' : 'text-moss-700')} aria-hidden="true" />
                    <div className="min-w-0 flex-1 pl-1">
                        <span className="block truncate text-sm font-medium text-sand-800">{d.title}</span>
                        <span className="block truncate text-[11px] text-sand-500">{tur}{ipucu ? ' · ' + ipucu : ''}</span>
                    </div>
                    <button type="button" aria-label={d.title + ' yukarı taşı'} title="Yukarı" disabled={i === 0} onClick={() => tasi(i, -1)} className="flex h-10 w-9 items-center justify-center rounded-lg text-sand-600 hover:bg-sand-100 disabled:opacity-30"><ArrowUp size={16} /></button>
                    <button type="button" aria-label={d.title + ' aşağı taşı'} title="Aşağı" disabled={i === dugmeler.length - 1} onClick={() => tasi(i, 1)} className="flex h-10 w-9 items-center justify-center rounded-lg text-sand-600 hover:bg-sand-100 disabled:opacity-30"><ArrowDown size={16} /></button>
                    <button type="button" aria-label={d.title + ' düzenle'} title="Düzenle" onClick={() => duzenle(d)} className="flex h-10 w-9 items-center justify-center rounded-lg text-sand-600 hover:bg-sand-100"><Pencil size={15} /></button>
                    <button type="button" aria-label={d.title + ' kaldır'} title="Kaldır" onClick={() => kaldir(d.id)} className="flex h-10 w-9 items-center justify-center rounded-lg text-berry-600 hover:bg-berry-50"><Trash2 size={15} /></button>
                </li>;
            })}
        </ol>

        {taslak ? <div className="space-y-2.5 rounded-xl border border-moss-300 bg-white p-3" role="group" aria-label={taslak.duzenlenen ? 'Düğmeyi düzenle' : 'Yeni düğme'}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-sand-800">{taslak.duzenlenen ? 'Düğmeyi düzenle' : 'Yeni düğme'}</span>
                <button type="button" aria-label="Vazgeç" onClick={() => setTaslak(null)} className="flex h-9 w-9 items-center justify-center rounded-lg text-sand-600 hover:bg-sand-100"><X size={16} /></button>
            </div>
            <div role="radiogroup" aria-label="Düğme türü" className="grid grid-cols-5 gap-1">
                {TURLER.map(t => <button key={t.id} type="button" role="radio" aria-checked={taslak.kind === t.id} onClick={() => turSec(t.id)}
                    className={cx('min-h-[40px] rounded-lg border px-0.5 text-[11px] font-semibold', taslak.kind === t.id ? 'border-moss-400 bg-moss-50 text-moss-800' : 'border-sand-200 bg-white text-sand-700')}>{t.ad}</button>)}
            </div>
            <p className="text-xs leading-relaxed text-sand-600">{TUR_ACIKLAMASI[taslak.kind]}</p>

            {taslak.kind === 'builtin' && (bosAraclar.length
                ? <select aria-label="Araç" className={settingsFieldClass + ' min-h-[44px]'} value={taslak.value} onChange={e => setTaslak({ ...taslak, value: e.target.value })}>
                    {bosAraclar.map(id => <option key={id} value={id}>{YAZI_ARACLARI[id]}</option>)}
                </select>
                : <p className="text-xs text-sand-600">Bütün hazır araçlar zaten şeritte.</p>)}
            {taslak.kind === 'text' && <textarea aria-label="Yazılacak metin" rows={3} className={settingsFieldClass} placeholder="Bilgisayara yazılacak metin"
                value={taslak.value} onChange={e => setTaslak({ ...taslak, value: e.target.value })} />}
            {taslak.kind === 'shortcut' && <div className="space-y-1.5">
                <input aria-label="Kısayol" className={settingsFieldClass + ' min-h-[44px] font-mono uppercase'} placeholder="CTRL+S" autoCapitalize="characters"
                    value={taslak.value} onChange={e => setTaslak({ ...taslak, value: e.target.value.toUpperCase() })} />
                <div className="flex flex-wrap gap-1">
                    {HAZIR_KISAYOLLAR.map(k => <button key={k} type="button" onClick={() => setTaslak({ ...taslak, value: k })}
                        className={cx('min-h-[32px] rounded-lg border px-2 font-mono text-[11px]', taslak.value === k ? 'border-moss-400 bg-moss-50 text-moss-800' : 'border-sand-200 bg-white text-sand-700')}>{k}</button>)}
                </div>
            </div>}
            {taslak.kind === 'macro' && (makrolar.length
                ? <select aria-label="Makro" className={settingsFieldClass + ' min-h-[44px]'} value={taslak.value} onChange={e => setTaslak({ ...taslak, value: e.target.value })}>
                    {makrolar.map(m => <option key={m.id} value={m.id}>{m.name.trim() || 'Makro'}</option>)}
                </select>
                : <p className="text-xs text-sand-600">Kayıtlı makro yok. Makrolar Ayarlar → Kısayollar ve ekranlar bölümünden eklenir.</p>)}
            {taslak.kind === 'ai' && (aiMakrolari.length
                ? <select aria-label="Yapay zekâ makrosu" className={settingsFieldClass + ' min-h-[44px]'} value={taslak.value} onChange={e => setTaslak({ ...taslak, value: e.target.value })}>
                    {aiMakrolari.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
                : <p className="text-xs text-sand-600">Yapay zekâ makrosu yok. Ayarlar → Düzenleme araçları bölümünden eklenir.</p>)}

            <label className="block text-xs font-medium text-sand-700">Düğmede görünen ad
                <input className={settingsFieldClass + ' mt-1 min-h-[44px]'} maxLength={40} placeholder={varsayilanAd(taslak) || 'Ad'}
                    value={taslak.title} onChange={e => setTaslak({ ...taslak, title: e.target.value })} />
            </label>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setTaslak(null)} className="btn btn-secondary min-h-[44px] px-4 text-sm">Vazgeç</button>
                <button type="button" id="yazi-dugme-kaydet" disabled={!taslakGecerli(taslak)} onClick={taslakKaydet} className="btn btn-primary min-h-[44px] px-4 text-sm">{taslak.duzenlenen ? 'Kaydet' : 'Ekle'}</button>
            </div>
        </div>
            : <div className="flex flex-wrap gap-2">
                <button type="button" id="yazi-dugme-ekle" disabled={dolu} onClick={() => setTaslak({ ...BOS_TASLAK, value: bosAraclar[0] ?? '', kind: bosAraclar.length ? 'builtin' : 'text' })}
                    className="btn btn-secondary min-h-[44px] flex-1 px-3 text-sm"><Plus size={16} aria-hidden="true" /> {dolu ? 'En çok ' + YAZI_DUGMESI_SINIRI + ' düğme' : 'Düğme ekle'}</button>
                <button type="button" id="yazi-dugme-varsayilan" onClick={() => kaydet(VARSAYILAN_YAZI_DUGMELERI.map(d => ({ ...d })))}
                    className="btn btn-secondary min-h-[44px] px-3 text-sm"><RotateCcw size={15} aria-hidden="true" /> Varsayılana dön</button>
            </div>}
    </div>;
}
