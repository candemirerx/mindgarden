'use client';

import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, RotateCcw, Settings2, Trash2, X } from 'lucide-react';
import { FARE_DUGME_SINIRI, FARE_EYLEMLERI, FARE_KONUMLARI, fareDugmeleriniDuzelt, fareDugmesiniTasi, fareHiziniDuzelt, varsayilanFareDugmeleri, type FareDugmesi, type FareKonumu } from '@/lib/fareDuzeni';
import { makroHazir, remotePrefs, saveRemotePrefs, sendCommand, sendKey, type RemotePrefs } from '@/lib/remoteTools';
import { settingsFieldClass } from '@/components/ui/settings';
import FareYuzeyi from './FareYuzeyi';
import MakroDugmesi from './MakroDugmesi';

const konumSinifi: Record<Exclude<FareKonumu, 'alt'>, string> = {
    solUst: 'left-2 top-2', sagUst: 'right-2 top-2', solAlt: 'bottom-2 left-2', sagAlt: 'bottom-2 right-2'
};
const koseler = Object.keys(konumSinifi) as Array<Exclude<FareKonumu, 'alt'>>;
const turler = { fare: 'Tıklama / kaydırma', kisayol: 'Klavye / navigasyon', makro: 'Kayıtlı makro', hiz: 'Fare hızı' };
const kisayollar = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'ENTER', 'ESC', 'TAB', 'BACKSPACE', 'HOME', 'END', 'CTRL+C', 'CTRL+V', 'CTRL+Z', 'ALT+TAB'];
const dugmeSinifi = 'min-h-11 min-w-11 rounded-xl border border-sand-200 bg-white/95 px-3 py-2 text-xs font-medium text-sand-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 disabled:opacity-40';
const yuzeyYuksekligi = (liste: FareDugmesi[]) => Math.max(256, 76 + Math.max(
    liste.filter(d => d.konum === 'solUst' || d.konum === 'solAlt').length,
    liste.filter(d => d.konum === 'sagUst' || d.konum === 'sagAlt').length) * 52);

function FareDuzeni({ dugmeler, calistir, mesgul = false, onizleme = false, render }: { dugmeler: FareDugmesi[]; calistir: (d: FareDugmesi) => void; mesgul?: boolean; onizleme?: boolean; render?: (d: FareDugmesi) => React.ReactNode }) {
    const buton = (d: FareDugmesi) => <button key={d.id} type="button" disabled={mesgul} onClick={() => calistir(d)} title={turler[d.tur] + ': ' + d.deger}
        aria-label={(onizleme ? 'Önizleme: ' : '') + d.ad} className={dugmeSinifi + ' max-w-full truncate'}>{d.ad}</button>;
    return <>{koseler.map(konum => <div key={konum} data-fare-konum={konum} className={'pointer-events-auto absolute flex max-w-[46%] flex-col gap-1.5 ' + konumSinifi[konum]}>{dugmeler.filter(d => d.konum === konum).map(render ?? buton)}</div>)}</>;
}

export function FareAyarlari({ prefs }: { prefs: RemotePrefs }) {
    const dugmeler = fareDugmeleriniDuzelt(prefs.fareDugmeleri);
    const [secili, setSecili] = useState<string | null>(null);
    const [hata, setHata] = useState('');
    const [taslak, setTaslak] = useState<FareDugmesi | null>(null);
    const kaydet = (liste: FareDugmesi[]) => saveRemotePrefs({ ...remotePrefs(), fareDugmeleri: fareDugmeleriniDuzelt(liste) });
    const makrolar = prefs.macros.filter(makroHazir);
    const duzenle = (d: FareDugmesi) => { setTaslak({ ...d }); setSecili(d.id); setHata(''); };
    const ekle = () => { setHata(''); setTaslak({ id: 'fare-' + crypto.randomUUID(), ad: '', tur: 'kisayol', deger: 'ENTER', konum: 'alt' }); };
    const uygula = () => {
        if (!taslak) return;
        const ad = taslak.ad.trim() || (taslak.tur === 'fare' ? FARE_EYLEMLERI[taslak.deger] : taslak.tur === 'hiz' ? taslak.deger + '× hız' : taslak.tur === 'makro' ? makrolar.find(m => m.id === taslak.deger)?.name : taslak.deger) || 'Düğme';
        const yeni = { ...taslak, ad };
        if (fareDugmeleriniDuzelt([yeni]).length !== 1) { setHata('Geçerli bir eylem seçin. Hız 0,25–5 arasında; kısayol ENTER veya CTRL+S gibi olmalı.'); return; }
        kaydet(dugmeler.some(d => d.id === yeni.id) ? dugmeler.map(d => d.id === yeni.id ? yeni : d) : [...dugmeler, yeni]);
        setTaslak(null); setSecili(yeni.id);
    };
    return <section aria-label="Fare aracı ayarları" className="space-y-4 rounded-2xl border border-sand-200 bg-sand-50/70 p-3 sm:p-4">
        <div><h3 className="text-sm font-semibold text-sand-900">Elinin altında, senin düzenin</h3><p className="mt-1 text-xs leading-relaxed text-sand-600">Alt tuşları kaldırın veya ekleyin. Makro, navigasyon ve hız düğmelerini dört köşeye ya da alt sıraya yerleştirin. Değişiklikler kaydedilir.</p></div>
        <label className="block text-xs font-medium text-sand-800">Fare hızı · {prefs.mouseSensitivity}×<input aria-label="Fare hızı" type="range" min="0.25" max="5" step="0.25" value={prefs.mouseSensitivity}
            onChange={e => saveRemotePrefs({ ...remotePrefs(), mouseSensitivity: fareHiziniDuzelt(Number(e.target.value)) })} className="mt-2 block min-h-11 w-full accent-moss-700" /></label>
        <div aria-label="Fare düzeni önizlemesi" className="rounded-2xl border border-moss-200 bg-moss-50/40 p-2">
            <div style={{ minHeight: yuzeyYuksekligi(dugmeler) }} className="relative overflow-auto rounded-xl bg-gradient-to-br from-white to-sand-100">
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-20 text-center text-xs text-sand-500">Önizleme<br />Bilgisayara komut göndermez</div>
                <FareDuzeni dugmeler={dugmeler} onizleme calistir={duzenle} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">{dugmeler.filter(d => d.konum === 'alt').map(d => <button key={d.id} type="button" className={dugmeSinifi + ' truncate'} onClick={() => duzenle(d)}>{d.ad}</button>)}</div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium text-sand-700">Düğmeler · {dugmeler.length}/{FARE_DUGME_SINIRI}</span><button type="button" disabled={dugmeler.length >= FARE_DUGME_SINIRI} onClick={ekle} className="btn btn-secondary min-h-11 gap-1 px-3 text-xs"><Plus size={15} /> Düğme ekle</button></div>
        <ol className="space-y-2">{dugmeler.map(d => {
            const grup = dugmeler.filter(b => b.konum === d.konum); const i = grup.findIndex(b => b.id === d.id);
            return <li key={d.id} className={'flex items-center gap-1 rounded-xl border bg-white p-1.5 ' + (secili === d.id ? 'border-moss-500' : 'border-sand-200')}>
                <button type="button" onClick={() => duzenle(d)} className="min-h-11 min-w-0 flex-1 rounded-lg px-2 text-left"><span className="block truncate text-xs font-semibold text-sand-900">{d.ad}</span><span className="block text-[11px] text-sand-500">{FARE_KONUMLARI[d.konum]} · {turler[d.tur]}</span></button>
                <button type="button" disabled={i === 0} aria-label={d.ad + ' önceye taşı'} onClick={() => kaydet(fareDugmesiniTasi(dugmeler, d.id, -1))} className="btn btn-ghost min-h-11 min-w-11 p-2 disabled:opacity-30"><ArrowUp size={16} /></button>
                <button type="button" disabled={i === grup.length - 1} aria-label={d.ad + ' sonraya taşı'} onClick={() => kaydet(fareDugmesiniTasi(dugmeler, d.id, 1))} className="btn btn-ghost min-h-11 min-w-11 p-2 disabled:opacity-30"><ArrowDown size={16} /></button>
                <button type="button" aria-label={d.ad + ' kaldır'} onClick={() => { kaydet(dugmeler.filter(b => b.id !== d.id)); if (taslak?.id === d.id) setTaslak(null); }} className="btn btn-ghost min-h-11 min-w-11 p-2 text-berry-600"><Trash2 size={16} /></button>
            </li>;
        })}</ol>
        {!dugmeler.length && <p className="py-3 text-center text-xs text-sand-600">Yalnızca dokunmatik yüzey açık. İsterseniz yeni düğme ekleyin.</p>}
        {taslak && <div className="space-y-3 rounded-xl border border-moss-300 bg-white p-3" aria-label="Fare düğmesini düzenle">
            <div className="flex items-center justify-between"><h4 className="text-xs font-semibold">{dugmeler.some(d => d.id === taslak.id) ? 'Düğmeyi düzenle' : 'Yeni düğme'}</h4><button type="button" aria-label="Düğme düzenlemesini iptal et" onClick={() => setTaslak(null)} className="btn btn-ghost min-h-11 min-w-11"><X size={16} /></button></div>
            <label className="block text-xs">Düğme adı<input maxLength={40} className={settingsFieldClass + ' mt-1'} value={taslak.ad} placeholder="Eylemin adı kullanılır" onChange={e => setTaslak({ ...taslak, ad: e.target.value })} /></label>
            <label className="block text-xs">Konum<select className={settingsFieldClass + ' mt-1'} value={taslak.konum} onChange={e => setTaslak({ ...taslak, konum: e.target.value as FareKonumu })}>{Object.entries(FARE_KONUMLARI).map(([v, ad]) => <option key={v} value={v}>{ad}</option>)}</select></label>
            <label className="block text-xs">Yapacağı iş<select className={settingsFieldClass + ' mt-1'} value={taslak.tur} onChange={e => { const tur = e.target.value as FareDugmesi['tur']; setTaslak({ ...taslak, tur, deger: tur === 'fare' ? 'mc:1' : tur === 'kisayol' ? 'ENTER' : tur === 'hiz' ? '1' : makrolar[0]?.id || '' }); }}>{Object.entries(turler).map(([v, ad]) => <option key={v} value={v}>{ad}</option>)}</select></label>
            {taslak.tur === 'fare' && <label className="block text-xs">Fare eylemi<select className={settingsFieldClass + ' mt-1'} value={taslak.deger} onChange={e => setTaslak({ ...taslak, deger: e.target.value })}>{Object.entries(FARE_EYLEMLERI).map(([v, ad]) => <option key={v} value={v}>{ad}</option>)}</select></label>}
            {taslak.tur === 'kisayol' && <label className="block text-xs">Tuş / kısayol<input list="fare-kisayollar" maxLength={60} className={settingsFieldClass + ' mt-1'} value={taslak.deger} onChange={e => setTaslak({ ...taslak, deger: e.target.value.toUpperCase() })} /><datalist id="fare-kisayollar">{kisayollar.map(v => <option key={v} value={v} />)}</datalist></label>}
            {taslak.tur === 'makro' && <label className="block text-xs">Makro<select className={settingsFieldClass + ' mt-1'} value={taslak.deger} onChange={e => setTaslak({ ...taslak, deger: e.target.value })}><option value="" disabled>Makro seçin</option>{makrolar.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>{!makrolar.length && <span className="mt-1 block text-sand-600">Önce Kısayollar bölümünde bir makro oluşturun.</span>}</label>}
            {taslak.tur === 'hiz' && <label className="block text-xs">Bu düğmenin ayarlayacağı hız<input type="number" min="0.25" max="5" step="0.25" className={settingsFieldClass + ' mt-1'} value={taslak.deger} onChange={e => setTaslak({ ...taslak, deger: e.target.value })} /></label>}
            {hata && <p role="alert" className="text-xs text-berry-700">{hata}</p>}
            <button type="button" onClick={uygula} className="btn btn-primary min-h-11 w-full text-sm">Düğmeyi kaydet</button>
        </div>}
        <button type="button" onClick={() => { kaydet(varsayilanFareDugmeleri()); setTaslak(null); setSecili(null); }} className="btn btn-ghost min-h-11 gap-2 text-xs"><RotateCcw size={14} /> Varsayılan düğmelere dön</button>
    </section>;
}

export default function FareAraci({ prefs, onHata }: { prefs: RemotePrefs; onHata: (mesaj: string) => void }) {
    const [ayarlar, setAyarlar] = useState(false);
    const [mesgul, setMesgul] = useState(false);
    const yolda = useRef(false);
    const dugmeler = fareDugmeleriniDuzelt(prefs.fareDugmeleri);
    const calistir = async (d: FareDugmesi) => {
        if (yolda.current) return;
        if (d.tur === 'hiz') { saveRemotePrefs({ ...remotePrefs(), mouseSensitivity: fareHiziniDuzelt(Number(d.deger)) }); onHata('Fare hızı ' + d.deger + '×'); return; }
        yolda.current = true; setMesgul(true);
        try {
            const guncel = remotePrefs();
            if (d.tur === 'fare') await sendCommand(d.deger, guncel);
            else if (d.tur === 'kisayol') await sendKey(d.deger, guncel);
            else throw new Error('Makro bulunamadı; fare ayarlarından yeni bir makro seçin.');
            onHata(d.ad + ' gönderildi.');
        } catch (e) { onHata(e instanceof Error ? e.message : 'Komut gönderilemedi.'); }
        finally { yolda.current = false; setMesgul(false); }
    };
    const canliDugme = (d: FareDugmesi) => {
        const makro = d.tur === 'makro' ? prefs.macros.find(m => m.id === d.deger) : null;
        return makro && makroHazir(makro)
            ? <MakroDugmesi key={d.id} makro={makro} prefs={prefs} onSonuc={onHata} disabled={mesgul} className={dugmeSinifi + ' max-w-full truncate'}>{d.ad}</MakroDugmesi>
            : <button key={d.id} type="button" disabled={mesgul} className={dugmeSinifi + ' max-w-full truncate'} onClick={() => void calistir(d)}>{d.ad}</button>;
    };
    return <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-sand-600">Fare <span className="ml-1 rounded-full bg-moss-50 px-2 py-1 text-moss-800">{prefs.mouseSensitivity}×</span></span><button type="button" aria-expanded={ayarlar} aria-controls="fare-ayarlari" onClick={() => setAyarlar(!ayarlar)} className="btn btn-secondary min-h-11 gap-2 px-3 text-xs"><Settings2 size={16} /> {ayarlar ? 'Ayarları kapat' : 'Fare ayarları'}</button></div>
        {ayarlar ? <div id="fare-ayarlari"><FareAyarlari prefs={prefs} /></div> : <>
            <div style={{ minHeight: `max(46dvh, ${yuzeyYuksekligi(dugmeler)}px)` }} className="relative flex flex-1">
                <FareYuzeyi prefs={prefs} onHata={onHata} className="flex min-h-[46dvh] w-full flex-1 touch-none select-none items-center justify-center rounded-2xl border border-moss-200 bg-gradient-to-br from-moss-50 to-sand-50 p-16 text-center text-xs leading-relaxed text-sand-500">Sürükle: imleci hareket ettir<br />Bir kez dokun: sol tık</FareYuzeyi>
                <FareDuzeni dugmeler={dugmeler} mesgul={mesgul} calistir={d => void calistir(d)} render={canliDugme} />
            </div>
            <div data-fare-konum="alt" className="grid shrink-0 grid-cols-3 gap-2">{dugmeler.filter(d => d.konum === 'alt').map(canliDugme)}</div>
        </>}
    </div>;
}
