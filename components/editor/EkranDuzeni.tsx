'use client';

/**
 * Ekran aracı: kullanıcının Ayarlar'da tasarladığı bölmeli yüzey.
 *
 * Ekran iki sütuna, her sütun üst ve alt bölmeye ayrılır; oranları kullanıcı
 * belirler. Her bölme bir iş görür: fare yüzeyi, yön/gezinme tuşları, metin
 * yazma veya bir profilin kısayolları. Boş bırakılan bölme gizlenir ve
 * komşusu alanı doldurur.
 */
import { useState } from 'react';
import { Keyboard, ListOrdered, MousePointer2, Send, Settings2, TextCursorInput } from 'lucide-react';
import { makroHazir, runRemoteMacro, sendCommand, typeOnComputer } from '@/lib/remoteTools';
import type { RemoteMacro, RemotePane, RemotePrefs, RemoteScreenLayout } from '@/lib/remoteTools';
import { useRemotePrefs } from '@/lib/useRemotePrefs';
import FareYuzeyi from './FareYuzeyi';

const GEZINME: { tus: string; etiket: string; konum: string }[] = [
    { tus: 'ESC', etiket: 'Esc', konum: 'col-start-1 row-start-1' },
    { tus: 'UP', etiket: '↑', konum: 'col-start-2 row-start-1' },
    { tus: 'BACKSPACE', etiket: '⌫', konum: 'col-start-3 row-start-1' },
    { tus: 'LEFT', etiket: '←', konum: 'col-start-1 row-start-2' },
    { tus: 'ENTER', etiket: 'Enter', konum: 'col-start-2 row-start-2' },
    { tus: 'RIGHT', etiket: '→', konum: 'col-start-3 row-start-2' },
    { tus: 'TAB', etiket: 'Tab', konum: 'col-start-1 row-start-3' },
    { tus: 'DOWN', etiket: '↓', konum: 'col-start-2 row-start-3' },
    { tus: 'SPACE', etiket: 'Boşluk', konum: 'col-start-3 row-start-3' }
];

const BOLME = 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white p-2 shadow-soft';
const TUS = 'flex min-h-[44px] items-center justify-center rounded-xl border border-sand-200 bg-sand-50 text-sm font-semibold text-sand-800 active:scale-[0.97] active:bg-moss-100 disabled:opacity-50 touch-manipulation';

function Bolme({ pane, prefs, durum }: { pane: RemotePane; prefs: RemotePrefs; durum: (m: string) => void }) {
    const [metin, setMetin] = useState('');
    const [busy, setBusy] = useState(false);
    const calistir = async (is: () => Promise<void>, basari?: string) => {
        setBusy(true);
        try { await is(); if (basari) durum(basari); }
        catch (error) { durum(error instanceof Error ? error.message : 'İşlem başarısız.'); }
        finally { setBusy(false); }
    };
    if (pane.kind === 'mouse') {
        return <div className={BOLME}>
            <FareYuzeyi prefs={prefs} onHata={durum} className="flex min-h-0 flex-1 touch-none select-none items-center justify-center rounded-xl bg-gradient-to-br from-moss-50 to-sand-50 p-2 text-center text-xs text-sand-600">
                <span className="flex items-center gap-1"><MousePointer2 size={14} /> Sürükle · dokun: tık</span>
            </FareYuzeyi>
            <div className="mt-2 grid shrink-0 grid-cols-4 gap-1.5">
                {([['mc:1', 'Sol'], ['ms:3', '↑'], ['ms:-3', '↓'], ['mc:2', 'Sağ']] as const).map(([komut, ad]) => (
                    <button key={komut} type="button" className={TUS} onClick={() => void calistir(() => sendCommand(komut, prefs))}>{ad}</button>
                ))}
            </div>
        </div>;
    }
    if (pane.kind === 'keys') {
        return <div className={BOLME}>
            <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-3 gap-1.5">
                {GEZINME.map(({ tus, etiket, konum }) => (
                    <button key={tus} type="button" aria-label={tus} className={`${TUS} ${konum} h-full`} onClick={() => void calistir(() => sendCommand('k:' + tus, prefs))}>{etiket}</button>
                ))}
            </div>
        </div>;
    }
    if (pane.kind === 'text') {
        return <div className={BOLME}>
            <textarea value={metin} onChange={e => setMetin(e.target.value)} placeholder="Bilgisayara yazılacak metin"
                aria-label="Bilgisayara yazılacak metin"
                className="min-h-0 flex-1 resize-none rounded-xl border border-sand-200 bg-sand-50 p-2 text-sm text-sand-900 outline-none focus:border-moss-400" />
            <button type="button" disabled={busy || !metin} onClick={() => void calistir(async () => { await typeOnComputer(metin, prefs); setMetin(''); }, 'Metin bilgisayara yazıldı.')}
                className="btn btn-primary mt-2 min-h-[44px] shrink-0 gap-1.5 text-sm"><Send size={16} /> Gönder</button>
        </div>;
    }
    const profil = pane.profileId ? prefs.profiles.find(p => p.id === pane.profileId) : undefined;
    const makrolar = (profil
        ? profil.macroIds.map(id => prefs.macros.find(m => m.id === id)).filter((m): m is RemoteMacro => !!m)
        : prefs.macros).filter(makroHazir);
    return <div className={BOLME}>
        {profil && <span className="mb-1 shrink-0 truncate text-[11px] font-semibold uppercase tracking-wide text-moss-700">{profil.name}</span>}
        {makrolar.length === 0
            ? <p className="m-auto px-2 text-center text-xs text-sand-600">Kısayol yok. Ayarlar → Profiller bölümünden ekleyin.</p>
            : <div className="grid min-h-0 flex-1 auto-rows-[minmax(44px,1fr)] grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-1.5 overflow-y-auto">
                {makrolar.map(makro => {
                    const Icon = makro.type === 'position' ? MousePointer2 : makro.type === 'shortcut' ? Keyboard : makro.type === 'sequence' ? ListOrdered : TextCursorInput;
                    return <button key={makro.id} type="button" disabled={busy} title={makro.name} onClick={() => void calistir(() => runRemoteMacro(makro, prefs), '"' + makro.name + '" çalıştırıldı.')}
                        className={`${TUS} flex-col gap-0.5 px-1 text-xs`}>
                        <Icon size={16} className="text-moss-700" aria-hidden="true" />
                        <span className="w-full truncate">{makro.name}</span>
                    </button>;
                })}
            </div>}
    </div>;
}

export default function EkranDuzeni({ duzenId, onDuzenChange, onAyarlarAc }: { duzenId: string | null; onDuzenChange: (id: string) => void; onAyarlarAc: () => void }) {
    const prefs = useRemotePrefs();
    const [durum, setDurum] = useState('');
    const duzen: RemoteScreenLayout | undefined = prefs.screenLayouts.find(d => d.id === duzenId) ?? prefs.screenLayouts[0];
    if (!duzen) {
        return <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="max-w-sm text-sm text-sand-600">Henüz ekran düzeni yok. Ayarlar → Düzenleme araçları → Ekran düzenleri bölümünden bölmeleri ve oranlarını tasarlayın.</p>
            <button type="button" id="ekran-ayarlar" onClick={onAyarlarAc} className="btn btn-secondary min-h-[44px] gap-1.5 px-4 text-sm"><Settings2 size={16} /> Ekranı tasarla</button>
        </div>;
    }
    const [solUst, solAlt, sagUst, sagAlt] = duzen.panes;
    const sutun = (ust: RemotePane, alt: RemotePane, oran: number) => {
        const ustVar = ust.kind !== 'empty', altVar = alt.kind !== 'empty';
        if (!ustVar && !altVar) return null;
        return <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
            {ustVar && <div className="flex min-h-0" style={{ flex: altVar ? oran : 100 }}><Bolme pane={ust} prefs={prefs} durum={setDurum} /></div>}
            {altVar && <div className="flex min-h-0" style={{ flex: ustVar ? 100 - oran : 100 }}><Bolme pane={alt} prefs={prefs} durum={setDurum} /></div>}
        </div>;
    };
    const sol = sutun(solUst, solAlt, duzen.leftSplit);
    const sag = sutun(sagUst, sagAlt, duzen.rightSplit);
    return <div id="ekran-duzeni" className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:p-4" role="region" aria-label={duzen.name + ' ekranı'}>
        {prefs.screenLayouts.length > 1 && <div className="flex shrink-0 gap-1.5 overflow-x-auto" role="tablist" aria-label="Ekran düzenleri">
            {prefs.screenLayouts.map(d => <button key={d.id} type="button" role="tab" aria-selected={d.id === duzen.id} onClick={() => onDuzenChange(d.id)}
                className={`min-h-[40px] shrink-0 rounded-xl border px-3 text-xs font-semibold ${d.id === duzen.id ? 'border-moss-600 bg-moss-100 text-moss-800' : 'border-sand-200 bg-white text-sand-700'}`}>{d.name || 'Ekran'}</button>)}
        </div>}
        <div className="flex min-h-0 flex-1 gap-2">
            {sol && <div className="flex min-h-0 min-w-0" style={{ flex: sag ? duzen.split : 100 }}>{sol}</div>}
            {sag && <div className="flex min-h-0 min-w-0" style={{ flex: sol ? 100 - duzen.split : 100 }}>{sag}</div>}
        </div>
        {durum && <p role="status" className="shrink-0 truncate text-xs text-sand-700">{durum}</p>}
    </div>;
}
