'use client';

/**
 * Ekran düzeninde bölme olarak görünen klavyeler.
 *
 * Telefon klavyesi: harf/rakam sayfaları, Shift ve Enter ile telefon düzeni.
 * Bilgisayar klavyesi: F tuşları, Ctrl/Alt/Shift/Win değiştiricileri ve yön
 * tuşlarıyla tam bilgisayar düzeni.
 *
 * Harf ve rakamlar metin olarak gider (Türkçe karakterler ve her bağlantı
 * türü için çalışır); değiştirici ile birleşen tuşlar ve özel tuşlar kısayol
 * olarak gider.
 */
import { useRef, useState } from 'react';
import { Delete, CornerDownLeft, ArrowBigUp } from 'lucide-react';
import { kartinYazamadiklari, sendKey, typeOnComputer } from '@/lib/remoteTools';
import type { RemotePrefs } from '@/lib/remoteTools';

type Durum = (mesaj: string) => void;
type Is = { metin: string } | { calistir: () => Promise<void> };

/**
 * Tuşları sırayla gönderir. Bir istek sürerken basılan harfler birleştirilip
 * tek istekte gider: kart Wi‑Fi'da tek istek ~0,5 sn sürdüğü için harf harf
 * göndermek hızlı yazımda gecikme biriktirirdi. Hata olursa bekleyen kuyruk
 * atılır; bağlantı kopukken tuşlar üst üste hata üretmez.
 */
function useTusKuyrugu(prefs: RemotePrefs, durum: Durum) {
    const kuyruk = useRef<Is[]>([]);
    const calisiyor = useRef(false);
    const guncelPrefs = useRef(prefs);
    guncelPrefs.current = prefs;
    const isle = async () => {
        if (calisiyor.current) return;
        calisiyor.current = true;
        try {
            while (kuyruk.current.length) {
                const is = kuyruk.current.shift()!;
                try {
                    if ('metin' in is) await typeOnComputer(is.metin, guncelPrefs.current);
                    else await is.calistir();
                } catch (hata) {
                    kuyruk.current = [];
                    durum(hata instanceof Error ? hata.message : 'Tuş gönderilemedi.');
                }
            }
        } finally {
            calisiyor.current = false;
        }
    };
    return {
        metin(metin: string) {
            const yazilamaz = kartinYazamadiklari(metin, guncelPrefs.current);
            if (yazilamaz.length) {
                durum('"' + yazilamaz.join(' ') + '" kartla yazılamaz (kart yalnız Türkçe Q klavyedeki temel karakterleri yazar). Doğrudan PC bağlantısında çalışır.');
                return;
            }
            const son = kuyruk.current[kuyruk.current.length - 1];
            if (son && 'metin' in son) son.metin += metin;
            else kuyruk.current.push({ metin });
            void isle();
        },
        tus(keys: string) {
            kuyruk.current.push({ calistir: () => sendKey(keys, guncelPrefs.current) });
            void isle();
        }
    };
}

const BUYUK = (harf: string) => harf.toLocaleUpperCase('tr-TR');
const TUS = 'flex min-h-0 min-w-0 flex-1 items-center justify-center rounded-lg border border-sand-300 bg-white px-0.5 text-sm font-semibold text-sand-800 touch-manipulation select-none active:bg-moss-100';
const AKTIF = '!border-moss-600 !bg-moss-100 !text-moss-800';
const SATIR = 'flex min-h-[30px] flex-1 gap-1';

/* ---------------------------- Telefon klavyesi ---------------------------- */

const TR_HARF_SATIRLARI = ['qwertyuıopğü', 'asdfghjklşi'];
const TR_SON_SATIR = 'zxcvbnmöç';
const SAYI_SATIRLARI = ['1234567890', '@#₺_&-+()/', '*"\':;!?%='];

type ShiftDurumu = 'kapali' | 'tek' | 'kilit';

export function TelefonKlavyesi({ prefs, durum }: { prefs: RemotePrefs; durum: Durum }) {
    const kuyruk = useTusKuyrugu(prefs, durum);
    const [sayfa, setSayfa] = useState<'harf' | 'sayi'>('harf');
    const [shift, setShift] = useState<ShiftDurumu>('kapali');
    const yaz = (metin: string) => {
        kuyruk.metin(metin);
        if (shift === 'tek') setShift('kapali');
    };
    const harfTusu = (harf: string) => {
        const gorunen = sayfa === 'harf' && shift !== 'kapali' ? BUYUK(harf) : harf;
        return <button key={harf} type="button" aria-label={gorunen} onClick={() => yaz(gorunen)} className={TUS}>{gorunen}</button>;
    };
    const geri = <button type="button" aria-label="Geri sil" onClick={() => kuyruk.tus('BACKSPACE')} className={TUS + ' flex-[1.5]'}><Delete size={18} aria-hidden="true" /></button>;
    return <div className="min-h-0 flex-1 overflow-auto"><div className="flex h-full min-h-[170px] min-w-[260px] flex-col gap-1" role="group" aria-label="Telefon klavyesi">
        {sayfa === 'harf'
            ? <>
                {TR_HARF_SATIRLARI.map(satir => <div key={satir} className={SATIR}>{[...satir].map(harfTusu)}</div>)}
                <div className={SATIR}>
                    <button type="button" aria-label="Shift" aria-pressed={shift !== 'kapali'}
                        onClick={() => setShift(onceki => onceki === 'kapali' ? 'tek' : onceki === 'tek' ? 'kilit' : 'kapali')}
                        title={shift === 'kilit' ? 'Büyük harf kilidi açık' : shift === 'tek' ? 'Sonraki harf büyük' : 'Shift'}
                        className={`${TUS} flex-[1.5] ${shift !== 'kapali' ? AKTIF : ''}`}>
                        <ArrowBigUp size={18} aria-hidden="true" fill={shift === 'kilit' ? 'currentColor' : 'none'} />
                    </button>
                    {[...TR_SON_SATIR].map(harfTusu)}
                    {geri}
                </div>
            </>
            : <>
                {SAYI_SATIRLARI.map((satir, i) => <div key={satir} className={SATIR}>
                    {[...satir].map(karakter => <button key={karakter} type="button" aria-label={karakter} onClick={() => yaz(karakter)} className={TUS}>{karakter}</button>)}
                    {i === SAYI_SATIRLARI.length - 1 && geri}
                </div>)}
            </>}
        <div className={SATIR}>
            <button type="button" aria-label={sayfa === 'harf' ? 'Sayı ve simge sayfası' : 'Harf sayfası'} onClick={() => setSayfa(sayfa === 'harf' ? 'sayi' : 'harf')} className={TUS + ' flex-[1.5] text-xs'}>
                {sayfa === 'harf' ? '?123' : 'ABC'}
            </button>
            <button type="button" aria-label="Virgül" onClick={() => yaz(',')} className={TUS}>,</button>
            <button type="button" aria-label="Boşluk" onClick={() => yaz(' ')} className={TUS + ' flex-[4] text-xs font-normal text-sand-600'}>Boşluk</button>
            <button type="button" aria-label="Nokta" onClick={() => yaz('.')} className={TUS}>.</button>
            <button type="button" aria-label="Enter" onClick={() => kuyruk.tus('ENTER')} className={`${TUS} flex-[1.5] !border-moss-600 !bg-moss-600 !text-white active:!bg-moss-700`}><CornerDownLeft size={18} aria-hidden="true" /></button>
        </div>
    </div></div>;
}

/* -------------------------- Bilgisayar klavyesi -------------------------- */

const DEGISTIRICILER = ['CTRL', 'ALT', 'SHIFT', 'WIN'] as const;
type Degistirici = typeof DEGISTIRICILER[number];

/** metin: yazılacak karakter; kod: PC yardımcısının tanıdığı tuş adı (Türkçe harflerde yok); ad: özel tuş. */
type Tus = { etiket: string; metin?: string; kod?: string; ad?: string; shift?: string; genis?: number };
const harf = (karakter: string, ascii = true): Tus => ({ etiket: BUYUK(karakter), metin: karakter, ...(ascii ? { kod: karakter.toUpperCase() } : {}) });
const rakam = (karakter: string, shift: string): Tus => ({ etiket: karakter, metin: karakter, kod: karakter, shift });
const ozel = (ad: string, etiket: string, genis = 1.5): Tus => ({ etiket, ad, genis });

const BILGISAYAR_SATIRLARI: Tus[][] = [
    [ozel('ESC', 'Esc', 1.3), ...Array.from({ length: 12 }, (_, i) => ozel('F' + (i + 1), 'F' + (i + 1), 1))],
    [...[...'1234567890'].map((r, i) => rakam(r, "!'^+%&/()=".charAt(i))), ozel('BACKSPACE', '⌫', 1.6)],
    [ozel('TAB', 'Tab'), ...[...'qwertyu'].map(h => harf(h)), harf('ı', false), harf('o'), harf('p'), harf('ğ', false), harf('ü', false)],
    [...[...'asdfghjkl'].map(h => harf(h)), harf('ş', false), harf('i'), ozel('ENTER', 'Enter', 1.8)],
    [...[...'zxcvbnm'].map(h => harf(h)), harf('ö', false), harf('ç', false), { etiket: ',', metin: ',', shift: ';' }, { etiket: '.', metin: '.', shift: ':' }, ozel('DELETE', 'Del', 1.2)],
    [{ etiket: 'Boşluk', metin: ' ', kod: 'SPACE', genis: 5 }, ozel('HOME', 'Home', 1.2), ozel('END', 'End', 1.2), ozel('LEFT', '←', 1), ozel('UP', '↑', 1), ozel('DOWN', '↓', 1), ozel('RIGHT', '→', 1)]
];

export function BilgisayarKlavyesi({ prefs, durum }: { prefs: RemotePrefs; durum: Durum }) {
    const kuyruk = useTusKuyrugu(prefs, durum);
    const [basili, setBasili] = useState<Degistirici[]>([]);
    const degistir = (tus: Degistirici) => setBasili(liste => liste.includes(tus) ? liste.filter(t => t !== tus) : [...liste, tus]);
    const bas = (tus: Tus) => {
        const sirali = DEGISTIRICILER.filter(t => basili.includes(t));
        setBasili([]);
        const kisayolMu = sirali.some(t => t !== 'SHIFT');
        if (tus.metin !== undefined && !kisayolMu) {
            const buyuk = sirali.includes('SHIFT');
            kuyruk.metin(buyuk ? (tus.shift ?? BUYUK(tus.metin!)) : tus.metin!);
            return;
        }
        const kod = tus.ad ?? tus.kod;
        if (!kod) { durum('"' + tus.etiket + '" ile kısayol yapılamaz; yalnız Ctrl/Alt/Win ile birleşen harfler ve rakamlar gönderilir.'); return; }
        kuyruk.tus([...sirali, kod].join('+'));
    };
    return <div className="min-h-0 flex-1 overflow-auto"><div className="flex h-full min-h-[210px] min-w-[420px] flex-col gap-1" role="group" aria-label="Bilgisayar klavyesi">
        {BILGISAYAR_SATIRLARI.map((satir, i) => <div key={i} className={SATIR + (i === 0 ? ' text-[10px]' : '')}>
            {satir.map(tus => <button key={tus.etiket + (tus.ad ?? '')} type="button" aria-label={tus.ad ?? tus.etiket} onClick={() => bas(tus)}
                style={{ flex: tus.genis ?? 1 }} className={TUS + (tus.ad ? ' !bg-sand-50 text-xs' : '')}>{tus.etiket}</button>)}
        </div>)}
        <div className={SATIR}>
            {DEGISTIRICILER.map(tus => {
                const aktif = basili.includes(tus);
                return <button key={tus} type="button" aria-pressed={aktif} onClick={() => degistir(tus)} className={`${TUS} text-xs ${aktif ? AKTIF : 'bg-sand-50'}`}>{tus === 'WIN' ? 'Win' : tus[0] + tus.slice(1).toLowerCase()}</button>;
            })}
        </div>
    </div></div>;
}
