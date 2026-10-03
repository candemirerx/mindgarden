'use client';

/**
 * Ekran aracı: kullanıcının Ayarlar'da tasarladığı bölmeli yüzey.
 *
 * Ekran yan yana sütunlara, her sütun alt alta bölmelere ayrılır; sayıları,
 * oranları ve aralarındaki boşluğu kullanıcı belirler. Her bölme bir iş görür:
 * fare yüzeyi, yön/gezinme tuşları, metin yazma, klavye veya bir profilin
 * kısayolları. Boş bırakılan bölme gizlenir ve komşusu alanı doldurur.
 */
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { AudioLines, Keyboard, ListOrdered, MousePointer2, Send, Settings2, TextCursorInput } from 'lucide-react';
import { DEFAULT_NAVIGATION_SHORTCUTS, VARSAYILAN_BOLME_BOSLUGU, VARSAYILAN_IC_BOSLUK, bridgeDictate, dinleKopruDikte, makroHazir, metinFarkiAktar, normalizeNavigationShortcuts, runRemoteMacro, sendCommand, sendKey, stopBridgeDictation, typeOnComputer } from '@/lib/remoteTools';
import type { NavigationShortcutPosition, RemoteMacro, RemotePane, RemotePrefs, RemoteScreenLayout } from '@/lib/remoteTools';
import { useRemotePrefs } from '@/lib/useRemotePrefs';
import FareYuzeyi from './FareYuzeyi';
import { BilgisayarKlavyesi, TelefonKlavyesi } from './GorunenKlavye';

const GEZINME: { tus: string; etiket: string; konum: string; shortcut?: NavigationShortcutPosition }[] = [
    { shortcut: 'topLeft', tus: 'ESC', etiket: 'Esc', konum: 'col-start-1 row-start-1' },
    { tus: 'UP', etiket: '↑', konum: 'col-start-2 row-start-1' },
    { shortcut: 'topRight', tus: 'BACKSPACE', etiket: '⌫', konum: 'col-start-3 row-start-1' },
    { tus: 'LEFT', etiket: '←', konum: 'col-start-1 row-start-2' },
    { shortcut: 'center', tus: 'ENTER', etiket: 'Enter', konum: 'col-start-2 row-start-2' },
    { tus: 'RIGHT', etiket: '→', konum: 'col-start-3 row-start-2' },
    { shortcut: 'bottomLeft', tus: 'TAB', etiket: 'Tab', konum: 'col-start-1 row-start-3' },
    { tus: 'DOWN', etiket: '↓', konum: 'col-start-2 row-start-3' },
    { shortcut: 'bottomRight', tus: 'SPACE', etiket: 'Boşluk', konum: 'col-start-3 row-start-3' }
];

const BOLME = 'ekran-bolme flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white p-[var(--ekran-ic,8px)] shadow-soft';
const TUS = 'flex min-h-[44px] items-center justify-center rounded-xl border border-sand-200 bg-sand-50 text-sm font-semibold text-sand-800 active:scale-[0.97] active:bg-moss-100 disabled:opacity-50 touch-manipulation';

/**
 * Köprü Dikte bölmesi: editördeki araçla aynı akış; konuşma sürerken tanınan
 * metnin değişen kuyruğu bilgisayara yazılır, not değişmez.
 */
function KopruDikteBolmesi({ prefs, durum }: { prefs: RemotePrefs; durum: (m: string) => void }) {
    const [dinliyor, setDinliyor] = useState(false);
    const [bitiriliyor, setBitiriliyor] = useState(false);
    const guncelPrefs = useRef(prefs);
    guncelPrefs.current = prefs;
    const akis = useRef({ yazilan: '', hedef: '', calisiyor: false, durdu: false, coz: null as null | (() => void) });
    const baslat = async () => {
        const a = akis.current;
        a.yazilan = ''; a.hedef = ''; a.durdu = false; a.calisiyor = false; a.coz = null;
        setDinliyor(true);
        durum('Dinleniyor: konuştuklarınız bilgisayara yazılıyor.');
        const dongu = async (): Promise<void> => {
            if (a.calisiyor || a.durdu) return;
            a.calisiyor = true;
            try {
                while (!a.durdu && a.yazilan !== a.hedef) {
                    await metinFarkiAktar(a.hedef, a.yazilan, guncelPrefs.current, yazilan => { a.yazilan = yazilan; });
                }
            } catch (error) {
                a.durdu = true;
                durum('Aktarım durdu: ' + (error instanceof Error ? error.message : 'Bağlantı hatası.'));
            } finally {
                a.calisiyor = false;
                if (!a.durdu && a.yazilan !== a.hedef) void dongu();
                else if (a.coz) { const bitir = a.coz; a.coz = null; bitir(); }
            }
        };
        const bosal = (): Promise<void> => (a.calisiyor || (a.yazilan !== a.hedef && !a.durdu))
            ? new Promise<void>(cozum => { a.coz = cozum; })
            : Promise.resolve();
        const tanitici = await dinleKopruDikte(olay => {
            a.hedef = guncelPrefs.current.bridgeDictationLive ? olay.text : olay.kesin;
            void dongu();
        });
        try {
            a.hedef = await bridgeDictate(prefs.dictationLanguage, prefs.bridgeDictationUnlimited ? 0 : prefs.bridgeDictationSeconds, prefs.dictationEngine);
            void dongu();
            await bosal();
            durum(a.durdu ? 'Köprü Dikte bitti ancak aktarım tamamlanamadı.' : 'Köprü Dikte bitti; konuşma bilgisayara yazıldı.');
        } catch (error) { durum(error instanceof Error ? error.message : 'Köprü Dikte başarısız.'); }
        finally {
            if (tanitici) await tanitici.remove();
            setDinliyor(false); setBitiriliyor(false);
        }
    };
    return <div className={BOLME}>
        <button type="button" disabled={bitiriliyor} aria-pressed={dinliyor}
            onClick={() => {
                if (dinliyor) { setBitiriliyor(true); void stopBridgeDictation().catch(error => { setBitiriliyor(false); durum(error.message); }); }
                else void baslat();
            }}
            className={`${TUS} h-full min-h-0 flex-1 flex-col gap-1.5 text-sm ${dinliyor ? 'border-berry-300 bg-berry-50 text-berry-700' : ''}`}>
            <AudioLines size={24} aria-hidden="true" className={dinliyor ? '' : 'text-moss-700'} />
            {dinliyor ? (bitiriliyor ? 'Bitiriliyor…' : 'Dikteyi bitir') : 'Köprü Dikte'}
        </button>
    </div>;
}

/**
 * Canlı yazım: verilen metnin önceki hâline göre farkı (silmeler dahil)
 * bilgisayara aktarılır; aktarım sürerken gelen değişiklikler kuyrukta yetişir.
 */
function useCanliYazim(prefs: RemotePrefs, durum: (m: string) => void) {
    const [canli, setCanli] = useState(false);
    const guncelPrefs = useRef(prefs);
    guncelPrefs.current = prefs;
    const aktarim = useRef({ son: '', hedef: '', calisiyor: false, durdu: true });
    const aktar = async () => {
        const a = aktarim.current;
        if (a.calisiyor || a.durdu) return;
        a.calisiyor = true;
        try {
            while (!a.durdu && a.son !== a.hedef) {
                a.son = await metinFarkiAktar(a.hedef, a.son, guncelPrefs.current, yazilan => { a.son = yazilan; });
            }
        } catch (error) {
            a.durdu = true;
            setCanli(false);
            durum('Canlı yazım durdu: ' + (error instanceof Error ? error.message : 'Bağlantı hatası.'));
        } finally {
            a.calisiyor = false;
            if (!a.durdu && a.son !== a.hedef) void aktar();
        }
    };
    useEffect(() => {
        const a = aktarim.current;
        return () => { a.durdu = true; };
    }, []);
    /** Başlangıç metni gönderilmez; yalnızca bundan sonraki değişiklikler aktarılır. */
    const ac = (baslangic: string) => {
        const a = aktarim.current;
        a.son = baslangic; a.hedef = baslangic; a.durdu = false;
        setCanli(true);
        durum('Canlı yazım açık: yazdıklarınız bilgisayara anında yazılıyor.');
    };
    const kapat = () => {
        if (aktarim.current.durdu) return;
        aktarim.current.durdu = true;
        setCanli(false);
        durum('Canlı yazım kapandı.');
    };
    const guncelle = (yeni: string) => {
        aktarim.current.hedef = yeni;
        void aktar();
    };
    /** Aktarılmış metni unutur (ör. Enter sonrası); bilgisayardaki yazı silinmez. */
    const sifirla = () => {
        const a = aktarim.current;
        if (a.son === a.hedef) { a.son = ''; a.hedef = ''; }
    };
    return { canli, ac, kapat, guncelle, sifirla };
}

/**
 * Canlı klavye bölmesi: tek bir klavye düğmesi. Basınca telefon klavyesi açılır
 * ve basılan her tuş bilgisayara anında yazılır; metin kutusu görünmez.
 */
function CanliKlavyeBolmesi({ prefs, durum }: { prefs: RemotePrefs; durum: (m: string) => void }) {
    const yazim = useCanliYazim(prefs, durum);
    const giris = useRef<HTMLInputElement>(null);
    const [metin, setMetin] = useState('');
    const degistir = () => {
        if (yazim.canli) { giris.current?.blur(); return; }
        setMetin('');
        yazim.ac('');
        giris.current?.focus();
    };
    return <div className={BOLME + ' relative'}>
        <button type="button" aria-pressed={yazim.canli} onClick={degistir}
            onMouseDown={e => { if (yazim.canli) e.preventDefault(); }}
            title={yazim.canli ? 'Canlı klavyeyi kapat' : 'Canlı klavye: yazdıkların bilgisayara anında gitsin'}
            className={`${TUS} relative h-full min-h-0 flex-1 flex-col gap-1.5 overflow-hidden text-sm ${yazim.canli ? 'border-moss-600 bg-moss-100 text-moss-800' : ''}`}>
            <Keyboard size={24} aria-hidden="true" className={yazim.canli ? '' : 'text-moss-700'} />
            <span>{yazim.canli ? 'Yazılıyor…' : 'Canlı klavye'}</span>
            {yazim.canli && metin && <span className="max-w-full truncate px-2 text-xs font-normal opacity-80" dir="rtl">{metin}</span>}
        </button>
        {/* Görünmez giriş: telefon klavyesini açmak ve tuşları yakalamak için. */}
        <input ref={giris} value={metin} aria-label="Canlı klavye girişi" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
            enterKeyHint="enter" tabIndex={-1}
            onChange={e => { setMetin(e.target.value); if (yazim.canli) yazim.guncelle(e.target.value); }}
            onKeyDown={e => {
                if (!yazim.canli) return;
                if (e.key === 'Enter') {
                    e.preventDefault();
                    void sendCommand('k:ENTER', prefs).catch(error => durum(error instanceof Error ? error.message : 'Enter gönderilemedi.'));
                    yazim.sifirla(); setMetin('');
                } else if (e.key === 'Backspace' && !metin) {
                    void sendCommand('k:BACKSPACE', prefs).catch(() => undefined);
                }
            }}
            onBlur={() => yazim.kapat()}
            className="pointer-events-none absolute h-px w-px opacity-0" />
    </div>;
}

/**
 * Metin bölmesi. Klavye simgesi canlı yazımı açar: kutuya yazılan her değişiklik
 * (silmeler dahil) bilgisayara aktarılır. Kapalıyken metin Gönder ile tek seferde yazılır.
 */
function MetinBolmesi({ prefs, durum }: { prefs: RemotePrefs; durum: (m: string) => void }) {
    const [metin, setMetin] = useState('');
    const [busy, setBusy] = useState(false);
    const kutu = useRef<HTMLTextAreaElement>(null);
    const { canli, ac, kapat, guncelle } = useCanliYazim(prefs, durum);
    const canliDegistir = () => {
        if (canli) { kapat(); return; }
        ac(metin);
        kutu.current?.focus();
    };
    const degisti = (yeni: string) => {
        setMetin(yeni);
        if (canli) guncelle(yeni);
    };
    const gonder = async () => {
        setBusy(true);
        try { await typeOnComputer(metin, prefs); setMetin(''); durum('Metin bilgisayara yazıldı.'); }
        catch (error) { durum(error instanceof Error ? error.message : 'İşlem başarısız.'); }
        finally { setBusy(false); }
    };
    return <div className={BOLME}>
        <div className="relative flex min-h-0 flex-1">
            <textarea ref={kutu} value={metin} onChange={e => degisti(e.target.value)} placeholder={canli ? 'Yazdıklarınız bilgisayara canlı gider' : 'Bilgisayara yazılacak metin'}
                aria-label="Bilgisayara yazılacak metin"
                className={`min-h-0 flex-1 resize-none rounded-xl border bg-sand-50 p-2 pr-12 text-sm text-sand-900 outline-none focus:border-moss-400 ${canli ? 'border-moss-500' : 'border-sand-200'}`} />
            <button type="button" aria-pressed={canli} onClick={canliDegistir}
                title={canli ? 'Canlı yazımı kapat' : 'Canlı yaz: yazdıkların bilgisayara anında gitsin'}
                aria-label={canli ? 'Canlı yazımı kapat' : 'Canlı yazımı aç'}
                className={`absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-lg border ${canli ? 'border-moss-600 bg-moss-100 text-moss-800' : 'border-sand-200 bg-white text-sand-700'}`}>
                <Keyboard size={18} aria-hidden="true" />
            </button>
        </div>
        {!canli && <button type="button" disabled={busy || !metin} onClick={() => void gonder()}
            className="btn btn-primary mt-2 min-h-[44px] shrink-0 gap-1.5 text-sm"><Send size={16} /> Gönder</button>}
    </div>;
}

function Bolme({ pane, prefs, durum }: { pane: RemotePane; prefs: RemotePrefs; durum: (m: string) => void }) {
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
        const shortcuts = normalizeNavigationShortcuts(pane.navigationShortcuts);
        return <div className={BOLME}>
            <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-3 gap-1.5">
                {GEZINME.map(({ tus, etiket, konum, shortcut }) => {
                    const komut = shortcut ? shortcuts[shortcut] : tus;
                    const ad = shortcut && komut !== DEFAULT_NAVIGATION_SHORTCUTS[shortcut] ? komut : etiket;
                    return <button key={tus} type="button" aria-label={komut} title={komut} className={`${TUS} ${konum} min-h-0 min-w-0 h-full px-1`} onClick={() => void calistir(() => sendKey(komut, prefs))}><span className="truncate">{ad}</span></button>;
                })}
            </div>
        </div>;
    }
    if (pane.kind === 'text') return <MetinBolmesi prefs={prefs} durum={durum} />;
    if (pane.kind === 'bridgeDictation') return <KopruDikteBolmesi prefs={prefs} durum={durum} />;
    if (pane.kind === 'liveKeyboard') return <CanliKlavyeBolmesi prefs={prefs} durum={durum} />;
    if (pane.kind === 'phoneKeyboard') return <div className={BOLME}><TelefonKlavyesi prefs={prefs} durum={durum} /></div>;
    if (pane.kind === 'computerKeyboard') return <div className={BOLME}><BilgisayarKlavyesi prefs={prefs} durum={durum} /></div>;
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

/** Editörün araç satırında, araçların yerine gösterilen ekran seçimi ve yazıya dönüş. */
export function EkranSecici({ duzenId, onDuzenChange, onYaziyaDon }: { duzenId: string | null; onDuzenChange: (id: string) => void; onYaziyaDon: () => void }) {
    const prefs = useRemotePrefs();
    const seciliId = (prefs.screenLayouts.find(d => d.id === duzenId) ?? prefs.screenLayouts[0])?.id;
    return <div className="ekran-secici flex min-w-0 items-center gap-1">
        <div className="flex min-w-0 flex-1 gap-1" role="tablist" aria-label="Ekran düzenleri">
            {prefs.screenLayouts.map(d => <button key={d.id} type="button" role="tab" title={d.name || 'Ekran'} aria-selected={d.id === seciliId} onClick={() => onDuzenChange(d.id)}
                className={`min-w-0 flex-1 truncate ${d.id === seciliId ? 'border-moss-600 bg-moss-100 font-semibold text-moss-800' : 'bg-white text-sand-700'}`}>{d.name || 'Ekran'}</button>)}
        </div>
        <button type="button" id="ekran-yaziya-don" onClick={onYaziyaDon} title="Yazıya dön" aria-label="Yazıya dön" className="shrink-0 bg-white text-sand-700"><Keyboard size={16} aria-hidden="true" /></button>
    </div>;
}

export default function EkranDuzeni({ duzenId, onDuzenChange, onAyarlarAc, onYaziyaDon }: { duzenId: string | null; onDuzenChange: (id: string) => void; onAyarlarAc: () => void; onYaziyaDon: () => void }) {
    const prefs = useRemotePrefs();
    const [durum, setDurum] = useState('');
    const duzen: RemoteScreenLayout | undefined = prefs.screenLayouts.find(d => d.id === duzenId) ?? prefs.screenLayouts[0];
    if (!duzen) {
        return <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <button type="button" onClick={onYaziyaDon} className="btn btn-secondary min-h-[44px]">Yazıya dön</button>
            <p className="max-w-sm text-sm text-sand-600">Henüz ekran düzeni yok. Ayarlar → Düzenleme araçları → Ekran düzenleri bölümünden bölmeleri ve oranlarını tasarlayın.</p>
            <button type="button" id="ekran-ayarlar" onClick={onAyarlarAc} className="btn btn-secondary min-h-[44px] gap-1.5 px-4 text-sm"><Settings2 size={16} /> Ekranı tasarla</button>
        </div>;
    }
    const bosluk = duzen.gap ?? (duzen.borderless ? 0 : VARSAYILAN_BOLME_BOSLUGU);
    const icBosluk = duzen.innerPadding ?? VARSAYILAN_IC_BOSLUK;
    /** Boş bölmeler gizlenir; hiç dolu bölmesi kalmayan sütun da kaybolur. */
    const sutunlar = duzen.columns
        .map(sutun => ({ ...sutun, panes: sutun.panes.filter(p => p.kind !== 'empty') }))
        .filter(sutun => sutun.panes.length > 0);
    return <div id="ekran-duzeni" data-kenarsiz={duzen.borderless ? '' : undefined} className={`flex min-h-0 flex-1 flex-col ${duzen.borderless ? 'p-0' : 'p-2 sm:p-4'}`}
        style={{ gap: bosluk, '--ekran-ic': icBosluk + 'px' } as CSSProperties} role="region" aria-label={duzen.name + ' ekranı'}>
        <div className="flex min-h-0 flex-1" style={{ gap: bosluk }}>
            {sutunlar.map((sutun, sira) => <div key={sira} className="flex min-h-0 min-w-0 flex-col" style={{ flex: sutun.weight + ' 1 0%', gap: bosluk }}>
                {sutun.panes.map((pane, bolmeSira) => <div key={bolmeSira} className="flex min-h-0" style={{ flex: (pane.weight ?? 50) + ' 1 0%' }}>
                    <Bolme pane={pane} prefs={prefs} durum={setDurum} />
                </div>)}
            </div>)}
        </div>
        {durum && <p role="status" className={`shrink-0 truncate text-xs text-sand-700 ${duzen.borderless ? 'px-2 py-1' : ''}`}>{durum}</p>}
    </div>;
}
