'use client';

/**
 * Makro düzenleyici.
 *
 * Kişisel kısayolun türünü (konum, klavye kısayolu, metin) buradan seçersiniz.
 * Konum türünde "Konum seç" düğmesi tam ekran konum seçiciyi açar; kısayol
 * türünde sık kullanılan kombinasyonlar tek dokunuşla doldurulur. Ayarlar
 * listesi ve editördeki kısayol panosu aynı pencereyi kullanır.
 *
 * Sıralı türde birden çok adım (metin, klavye kısayolu, tıklama, başka bir
 * makro veya bekleme) art arda dizilir; adımlar listedeki sırayla çalışır.
 * İki adımın arasına tek dokunuşla bekleme eklenebilir. Sıralı makronun
 * düğmeye basınca nasıl çalışacağı da burada seçilir: bir kez (normal),
 * belirlenen sayı kadar, anahtar gibi kapatılana kadar ya da basılı tutuldukça.
 *
 * Pencere telefonda da tam ekran açılır: arkada ayarlar ekranının göründüğü
 * şeffaf bir şerit kalmaz, başlık ve düğmeler güvenli alanın içinde durur.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, Check, Hand, Keyboard, ListOrdered, MousePointer2, Play, Plus, Repeat, TextCursorInput, Timer, ToggleRight, Trash2, Wand2, X } from 'lucide-react';
import { BEKLEME_SINIRI, KONUM_MERKEZ, TEKRAR_SINIRI, TUR_ARASI_SINIRI, beklemeGecerli, beklemeMetni, konumYuzdesi, type MakroCalisma, type RemoteMacro, type RemoteMacroStep, type RemotePrefs } from '@/lib/remoteTools';
import KonumSecici from './KonumSecici';
import { settingsFieldClass } from '@/components/ui/settings';
import SanalKlavye from './SanalKlavye';

type MakroTuru = RemoteMacro['type'];

const TURLER: Array<{ id: MakroTuru; anahtar: string; ad: string; Icon: typeof Keyboard }> = [
    { id: 'position', anahtar: 'konum', ad: 'Konum', Icon: MousePointer2 },
    { id: 'shortcut', anahtar: 'kisayol', ad: 'Kısayol', Icon: Keyboard },
    { id: 'text', anahtar: 'metin', ad: 'Metin', Icon: TextCursorInput },
    { id: 'sequence', anahtar: 'sirali', ad: 'Sıralı', Icon: ListOrdered }
];

const TUR_ADI: Record<MakroTuru, string> = {
    position: 'Fare konumu',
    shortcut: 'Klavye kısayolu',
    text: 'Hazır metin',
    sequence: 'Sıralı makro'
};

const ADIM_TURLERI: Array<{ id: RemoteMacroStep['type']; ad: string; Icon: typeof Keyboard }> = [
    { id: 'text', ad: 'Metin', Icon: TextCursorInput },
    { id: 'shortcut', ad: 'Kısayol', Icon: Keyboard },
    { id: 'position', ad: 'Tıklama', Icon: MousePointer2 },
    { id: 'macro', ad: 'Makro', Icon: Wand2 },
    { id: 'wait', ad: 'Bekle', Icon: Timer }
];

/** Sıralı makronun düğmeye basınca çalışma biçimleri. */
const CALISMALAR: Array<{ id: MakroCalisma; ad: string; aciklama: string; Icon: typeof Keyboard }> = [
    { id: 'tek', ad: 'Normal', aciklama: 'Dokununca bir kez çalışır (bilgisayar tuşu gibi).', Icon: Play },
    { id: 'sayili', ad: 'Sayılı', aciklama: 'Dokununca aşağıdaki sayı kadar art arda çalışır. Çalışırken yeniden dokunmak durdurur.', Icon: Repeat },
    { id: 'anahtar', ad: 'Anahtar', aciklama: 'İlk dokunuş açar; makro siz yeniden dokunup kapatana kadar baştan tekrar eder.', Icon: ToggleRight },
    { id: 'basili', ad: 'Basılı tut', aciklama: 'Düğmeyi basılı tuttuğunuz sürece tekrar eder; bırakınca durur.', Icon: Hand }
];

/** Bekleme adımında tek dokunuşla seçilen süreler (ms). */
const HAZIR_BEKLEMELER = [250, 500, 1000, 2000, 3000, 5000, 10000];
/** Yeni bekleme adımının varsayılan süresi. */
const VARSAYILAN_BEKLEME = '1000';

const KISAYOL_BICIMI = /^[A-Za-z0-9+_ -]{1,60}$/;

/** Klavye kısayolunda tek dokunuşla doldurulabilen hazır kombinasyonlar. */
const HAZIR_KISAYOLLAR = ['CTRL+C', 'CTRL+V', 'CTRL+Z', 'CTRL+S', 'ALT+TAB', 'WIN+D', 'ENTER', 'ESC'];

function yeniKimlik(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'makro-' + Date.now();
}

export default function MakroDuzenleyici({ makro, prefs, onKaydet, onKapat }: {
    /** Düzenlenen makro; yeni kayıt için null. */
    makro: RemoteMacro | null;
    prefs: RemotePrefs;
    onKaydet: (makro: RemoteMacro) => void;
    onKapat: () => void;
}) {
    const [ad, setAd] = useState(makro?.name ?? '');
    const [tur, setTur] = useState<MakroTuru>(makro?.type ?? 'shortcut');
    const [deger, setDeger] = useState(makro?.type === 'position' ? '' : makro?.value ?? '');
    const [tik, setTik] = useState<1 | 2>(makro?.click === 2 ? 2 : 1);
    const [konum, setKonum] = useState(() => {
        const [x, y] = (makro?.type === 'position' ? makro.value : '').split(',');
        const gecerli = /^\d{1,5}\s*,\s*\d{1,5}$/.test((makro?.value ?? '').trim());
        return gecerli ? { x: Number(x), y: Number(y) } : { x: KONUM_MERKEZ, y: KONUM_MERKEZ };
    });
    const [adimlar, setAdimlar] = useState<RemoteMacroStep[]>(() => makro?.steps?.map((adim) => ({ ...adim })) ?? []);
    const [calisma, setCalisma] = useState<MakroCalisma>(makro?.calisma ?? 'tek');
    const [tekrar, setTekrar] = useState(String(makro?.tekrar ?? 3));
    /** Turlar arası bekleme, saniye olarak yazılır. */
    const [turArasi, setTurArasi] = useState(makro?.turArasi ? String(makro.turArasi / 1000) : '0');
    /** Konum seçicinin yazacağı yer: tekil konum makrosu veya bir adımın sırası. */
    const [konumHedefi, setKonumHedefi] = useState<'tekil' | number | null>(null);
    const konumAcik = konumHedefi !== null;
    /** Adımda çağrılabilecek makrolar: kendisi hariç kayıtlı tüm makrolar. */
    const cagrilabilir = prefs.macros.filter((m) => m.id !== makro?.id);
    const [uyari, setUyari] = useState('');

    useEffect(() => {
        const esc = (olay: KeyboardEvent) => { if (olay.key === 'Escape' && !konumAcik) onKapat(); };
        window.addEventListener('keydown', esc);
        const eski = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', esc);
            document.body.style.overflow = eski;
        };
    }, [konumAcik, onKapat]);

    /** Tür değişince önceki türün değeri taşınmaz; her tür kendi alanını kullanır. */
    const turuDegistir = (sonraki: MakroTuru) => {
        setTur(sonraki);
        setUyari('');
        if (sonraki !== 'position' && sonraki !== 'sequence') setDeger(makro?.type === sonraki ? makro.value : '');
    };

    const kaydet = () => {
        const ham = tur === 'position' ? konum.x + ',' + konum.y : deger.trim();
        if (tur === 'sequence') {
            if (!adimlar.length) { setUyari('En az bir adım ekleyin.'); return; }
            const hatali = adimlar.findIndex((adim) =>
                adim.type === 'shortcut' ? !KISAYOL_BICIMI.test(adim.value.trim())
                    : adim.type === 'wait' ? !beklemeGecerli(adim.value)
                    : adim.type === 'text' ? !adim.value
                        : adim.type === 'macro' ? !cagrilabilir.some((m) => m.id === adim.value)
                            : !/^\d{1,5},\d{1,5}$/.test(adim.value));
            if (hatali >= 0) { setUyari((hatali + 1) + '. adım eksik: değerini girin veya seçin.'); return; }
            const kez = Number(tekrar);
            if (calisma === 'sayili' && !(Number.isInteger(kez) && kez >= TEKRAR_SINIRI.min && kez <= TEKRAR_SINIRI.max)) {
                setUyari('Tekrar sayısı ' + TEKRAR_SINIRI.min + '–' + TEKRAR_SINIRI.max + ' arasında tam sayı olmalı.'); return;
            }
            const araMs = Math.round(Number(turArasi.replace(',', '.') || '0') * 1000);
            if (calisma !== 'tek' && !(Number.isFinite(araMs) && araMs >= TUR_ARASI_SINIRI.min && araMs <= TUR_ARASI_SINIRI.max)) {
                setUyari('Turlar arası bekleme 0 – 600 saniye olmalı.'); return;
            }
            onKaydet({
                id: makro?.id ?? yeniKimlik(),
                name: ad.trim() || TUR_ADI[tur],
                type: tur,
                value: adimlar.length + ' adım',
                enabled: makro?.enabled ?? true,
                steps: adimlar.map((adim) => (adim.type === 'shortcut' ? { ...adim, value: adim.value.trim() } : adim)),
                calisma,
                ...(calisma === 'sayili' ? { tekrar: kez } : {}),
                ...(calisma !== 'tek' && araMs > 0 ? { turArasi: araMs } : {})
            });
            return;
        }
        if (tur === 'shortcut' && !KISAYOL_BICIMI.test(ham)) {
            setUyari('Klavye kısayolunu CTRL+C biçiminde yazın.');
            return;
        }
        if (tur === 'text' && !ham) {
            setUyari('Gönderilecek metni yazın.');
            return;
        }
        onKaydet({
            id: makro?.id ?? yeniKimlik(),
            name: ad.trim() || TUR_ADI[tur],
            type: tur,
            value: ham,
            enabled: makro?.enabled ?? true,
            ...(tur === 'position' ? { click: tik } : {})
        });
    };

    // Pencere gövdeye taşınır: ayar listesinin boşluk kuralları (space-y) ve
    // kaydırma kutusu tam ekran pencereyi etkilemez.
    if (typeof document === 'undefined') return null;
    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-stretch justify-center bg-white p-0 sm:items-center sm:bg-bark-950/50 sm:p-4" role="presentation">
            <div
                data-makro-duzenleyici
                role="dialog"
                aria-modal="true"
                aria-labelledby="makro-duzenleyici-basligi"
                className="flex h-[100dvh] w-full max-w-none flex-col overflow-hidden bg-white pb-[env(safe-area-inset-bottom,0px)] sm:h-auto sm:max-h-[92dvh] sm:max-w-xl sm:rounded-3xl sm:border sm:border-sand-200 sm:shadow-pop"
            >
                <div className="flex items-start gap-3 border-b border-sand-200 px-5 pb-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] sm:pt-4">
                    <div className="min-w-0 flex-1">
                        <h2 id="makro-duzenleyici-basligi" className="text-lg font-semibold text-sand-900">
                            {makro ? 'Makro ayarla' : 'Yeni makro'}
                        </h2>
                        <p className="mt-1 text-xs leading-relaxed text-sand-600">
                            Türü seçin; konum makrosunda noktayı haritadan belirleyin.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onKapat}
                        aria-label="Makro penceresini kapat"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sand-600 transition-colors hover:bg-sand-100 hover:text-sand-800"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                    <label className="block text-xs font-medium text-sand-700">
                        Makro adı
                        <input
                            id="makro-ad"
                            type="text"
                            value={ad}
                            onChange={(olay) => setAd(olay.target.value)}
                            placeholder="Örn. Kaydet düğmesi"
                            className={settingsFieldClass + ' mt-1.5 min-h-[44px]'}
                        />
                    </label>

                    <div className="space-y-2">
                        <span className="block text-xs font-medium text-sand-700">Tür</span>
                        <div className="flex gap-1 rounded-xl border border-sand-200 bg-sand-100 p-1" role="group" aria-label="Makro türü">
                            {TURLER.map(({ id, anahtar, ad: turAdi, Icon }) => (
                                <button
                                    key={id}
                                    id={'makro-tur-' + anahtar}
                                    type="button"
                                    aria-pressed={tur === id}
                                    onClick={() => turuDegistir(id)}
                                    className={'flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-colors ' + (tur === id ? 'bg-white text-moss-800 shadow-soft ring-1 ring-sand-200' : 'text-sand-600 hover:text-sand-800')}
                                >
                                    <Icon size={15} aria-hidden="true" />
                                    {turAdi}
                                </button>
                            ))}
                        </div>
                    </div>

                    {tur === 'position' && (
                        <div className="space-y-3 rounded-2xl border border-sand-200 bg-sand-50/70 p-4">
                            <p className="text-xs leading-relaxed text-sand-600">
                                Bilgisayar ekranındaki konumu haritadan seçin. Bağlantı varsa imleç seçtiğiniz noktaya gider.
                            </p>
                            <p id="makro-konum-deger" className="text-sm font-medium text-sand-800">
                                X %{konumYuzdesi(konum.x).toFixed(1)} · Y %{konumYuzdesi(konum.y).toFixed(1)}
                            </p>
                            <button
                                type="button"
                                id="makro-konum-sec"
                                onClick={() => setKonumHedefi('tekil')}
                                className="btn btn-secondary min-h-[44px] w-full px-4 text-sm"
                            >
                                <MousePointer2 size={16} /> Konum seç
                            </button>
                            <div className="flex gap-1 rounded-xl border border-sand-200 bg-white p-1" role="group" aria-label="Tıklama biçimi">
                                {([[1, 'Tek tık'], [2, 'Çift tık']] as const).map(([degerTik, etiket]) => (
                                    <button
                                        key={degerTik}
                                        id={degerTik === 1 ? 'makro-tik-tek' : 'makro-tik-cift'}
                                        type="button"
                                        aria-pressed={tik === degerTik}
                                        onClick={() => setTik(degerTik)}
                                        className={'min-h-[44px] flex-1 rounded-lg px-3 text-sm font-medium transition-colors ' + (tik === degerTik ? 'bg-moss-700 text-sand-50' : 'text-sand-600 hover:text-sand-800')}
                                    >
                                        {etiket}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {tur === 'shortcut' && (
                        <div className="space-y-2">
                            <p className="text-xs leading-relaxed text-sand-600">
                                Örnek: CTRL+C, CTRL+V, ALT+TAB, WIN+D, ENTER
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {HAZIR_KISAYOLLAR.map((kisayol) => (
                                    <button
                                        key={kisayol}
                                        type="button"
                                        onClick={() => { setDeger(kisayol); setUyari(''); }}
                                        className="min-h-[40px] rounded-xl border border-sand-300 bg-white px-3 text-xs font-medium text-sand-700 transition-colors hover:border-moss-500/50 hover:text-moss-700"
                                    >
                                        {kisayol}
                                    </button>
                                ))}
                            </div>
                            <input
                                id="makro-deger"
                                type="text"
                                value={deger}
                                onChange={(olay) => { setDeger(olay.target.value); setUyari(''); }}
                                placeholder="Klavye kısayolu"
                                className={settingsFieldClass + ' min-h-[44px]'}
                            />
                            <SanalKlavye kimlik="makro-sanal-klavye" onSec={(kisayol) => { setDeger(kisayol); setUyari(''); }} />
                        </div>
                    )}

                    {tur === 'text' && (
                        <label className="block text-xs font-medium text-sand-700">
                            Gönderilecek metin
                            <textarea
                                id="makro-deger"
                                value={deger}
                                onChange={(olay) => { setDeger(olay.target.value); setUyari(''); }}
                                rows={4}
                                placeholder="Kısayola dokunulduğunda kullanılacak metin"
                                className={settingsFieldClass + ' mt-1.5 resize-y'}
                            />
                        </label>
                    )}

                    {tur === 'sequence' && (
                        <div className="space-y-3">
                            <p className="text-xs leading-relaxed text-sand-600">
                                Adımlar yukarıdan aşağıya sırayla çalışır: metin yazdırın, tıklatın, klavye kısayolu gönderin, kayıtlı bir makroyu çağırın ya da bekleyin. İki adımın arasındaki <strong>+ Bekleme</strong> ile araya süre koyabilirsiniz.
                            </p>
                            {adimlar.length === 0 && (
                                <p className="rounded-xl border border-dashed border-sand-300 px-4 py-3 text-xs text-sand-600">Henüz adım yok; aşağıdan ekleyin.</p>
                            )}
                            <ol id="makro-adimlar" className="space-y-2">
                                {adimlar.map((adim, sira) => {
                                    const degistir = (yeni: Partial<RemoteMacroStep>) => { setAdimlar((liste) => liste.map((a, i) => (i === sira ? { ...a, ...yeni } : a))); setUyari(''); };
                                    const tasi = (yon: -1 | 1) => setAdimlar((liste) => {
                                        const sonraki = [...liste];
                                        [sonraki[sira], sonraki[sira + yon]] = [sonraki[sira + yon], sonraki[sira]];
                                        return sonraki;
                                    });
                                    const turBilgisi = ADIM_TURLERI.find((t) => t.id === adim.type) ?? ADIM_TURLERI[0];
                                    const AdimIcon = turBilgisi.Icon;
                                    const [ax, ay] = adim.type === 'position' && adim.value ? adim.value.split(',').map(Number) : [0, 0];
                                    const etiket = (sira + 1) + '. adım';
                                    const araya = sira < adimlar.length - 1 && adim.type !== 'wait' && adimlar[sira + 1].type !== 'wait';
                                    return [
                                        <li key={sira} data-makro-adim={sira} className="space-y-2 rounded-2xl border border-sand-200 bg-sand-50/70 p-3">
                                            <div className="flex items-center gap-1">
                                                <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-semibold text-sand-800">
                                                    <AdimIcon size={14} className="text-moss-700" aria-hidden="true" /> {etiket} · {turBilgisi.ad}
                                                </span>
                                                <button type="button" aria-label={etiket + 'ı yukarı taşı'} disabled={sira === 0} onClick={() => tasi(-1)} className="flex h-10 w-10 items-center justify-center rounded-lg text-sand-600 hover:bg-sand-100 disabled:opacity-30"><ArrowUp size={16} /></button>
                                                <button type="button" aria-label={etiket + 'ı aşağı taşı'} disabled={sira === adimlar.length - 1} onClick={() => tasi(1)} className="flex h-10 w-10 items-center justify-center rounded-lg text-sand-600 hover:bg-sand-100 disabled:opacity-30"><ArrowDown size={16} /></button>
                                                <button type="button" aria-label={etiket + 'ı sil'} onClick={() => { setAdimlar((liste) => liste.filter((_, i) => i !== sira)); setUyari(''); }} className="flex h-10 w-10 items-center justify-center rounded-lg text-sand-600 hover:bg-berry-50 hover:text-berry-600"><Trash2 size={15} /></button>
                                            </div>
                                            {adim.type === 'text' && (
                                                <textarea aria-label={etiket + ' metni'} value={adim.value} rows={2} onChange={(olay) => degistir({ value: olay.target.value })}
                                                    placeholder="Yazılacak metin" className={settingsFieldClass + ' resize-y'} />
                                            )}
                                            {adim.type === 'shortcut' && (
                                                <div className="space-y-2">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {HAZIR_KISAYOLLAR.map((kisayol) => (
                                                            <button key={kisayol} type="button" aria-pressed={adim.value === kisayol} onClick={() => degistir({ value: kisayol })}
                                                                className={'min-h-[36px] rounded-lg border px-2.5 text-xs font-medium transition-colors ' + (adim.value === kisayol ? 'border-moss-500 bg-moss-50 text-moss-800' : 'border-sand-300 bg-white text-sand-700 hover:border-moss-500/50')}>
                                                                {kisayol}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <input aria-label={etiket + ' klavye kısayolu'} type="text" value={adim.value} onChange={(olay) => degistir({ value: olay.target.value })}
                                                        placeholder="CTRL+S" className={settingsFieldClass + ' min-h-[44px]'} />
                                                    <SanalKlavye kimlik={'makro-adim-klavye-' + sira} onSec={(kisayol) => degistir({ value: kisayol })} />
                                                </div>
                                            )}
                                            {adim.type === 'position' && (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button type="button" onClick={() => setKonumHedefi(sira)} className="btn btn-secondary min-h-[40px] px-3 text-xs">
                                                        <MousePointer2 size={14} /> {adim.value ? 'X %' + konumYuzdesi(ax).toFixed(1) + ' · Y %' + konumYuzdesi(ay).toFixed(1) : 'Konum seç'}
                                                    </button>
                                                    <div className="flex gap-1 rounded-lg border border-sand-200 bg-white p-0.5" role="group" aria-label={etiket + ' tıklama biçimi'}>
                                                        {([[1, 'Tek tık'], [2, 'Çift tık']] as const).map(([degerTik, tikAdi]) => (
                                                            <button key={degerTik} type="button" aria-pressed={(adim.click ?? 1) === degerTik} onClick={() => degistir({ click: degerTik })}
                                                                className={'min-h-[36px] rounded-md px-3 text-xs font-medium ' + ((adim.click ?? 1) === degerTik ? 'bg-moss-700 text-sand-50' : 'text-sand-600')}>
                                                                {tikAdi}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {adim.type === 'wait' && (
                                                <div className="space-y-2">
                                                    <div className="flex flex-wrap gap-1.5" role="group" aria-label={etiket + ' hazır süreler'}>
                                                        {HAZIR_BEKLEMELER.map((ms) => (
                                                            <button key={ms} type="button" aria-pressed={adim.value === String(ms)} onClick={() => degistir({ value: String(ms) })}
                                                                className={'min-h-[36px] rounded-lg border px-2.5 text-xs font-medium transition-colors ' + (adim.value === String(ms) ? 'border-moss-500 bg-moss-50 text-moss-800' : 'border-sand-300 bg-white text-sand-700 hover:border-moss-500/50')}>
                                                                {beklemeMetni(ms)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <label className="flex flex-wrap items-center gap-2 text-xs text-sand-700">
                                                        Süre
                                                        <input aria-label={etiket + ' bekleme süresi (saniye)'} type="number" inputMode="decimal" min={BEKLEME_SINIRI.min / 1000} max={BEKLEME_SINIRI.max / 1000} step="0.05"
                                                            value={adim.value === '' ? '' : Number(adim.value) / 1000}
                                                            onChange={(olay) => {
                                                                const sn = Number(olay.target.value.replace(',', '.'));
                                                                degistir({ value: olay.target.value === '' || !Number.isFinite(sn) ? '' : String(Math.round(sn * 1000)) });
                                                            }}
                                                            className={settingsFieldClass + ' min-h-[44px] w-28'} />
                                                        saniye
                                                        {adim.value !== '' && !beklemeGecerli(adim.value) && <span className="text-berry-600">0,05 sn – 10 dk</span>}
                                                    </label>
                                                </div>
                                            )}
                                            {adim.type === 'macro' && (cagrilabilir.length ? (
                                                <select aria-label={etiket + 'da çalışacak makro'} value={adim.value} onChange={(olay) => degistir({ value: olay.target.value })} className={settingsFieldClass}>
                                                    <option value="">Makro seçin…</option>
                                                    {cagrilabilir.map((m) => <option key={m.id} value={m.id}>{m.name} · {TUR_ADI[m.type]}</option>)}
                                                </select>
                                            ) : (
                                                <p className="text-xs text-sand-600">Çağrılacak başka makro yok; önce tekil makrolar ekleyin.</p>
                                            ))}
                                        </li>,
                                        araya && (
                                            <li key={'araya-' + sira} className="flex justify-center">
                                                <button type="button" aria-label={(sira + 1) + '. ve ' + (sira + 2) + '. adımın arasına bekleme ekle'}
                                                    onClick={() => { setAdimlar((liste) => [...liste.slice(0, sira + 1), { type: 'wait', value: VARSAYILAN_BEKLEME }, ...liste.slice(sira + 1)]); setUyari(''); }}
                                                    className="flex min-h-[36px] items-center gap-1 rounded-full border border-dashed border-sand-300 bg-white px-3 text-[11px] font-medium text-sand-600 hover:border-moss-500/50 hover:text-moss-700">
                                                    <Plus size={12} aria-hidden="true" /><Timer size={12} aria-hidden="true" /> Bekleme
                                                </button>
                                            </li>
                                        )
                                    ];
                                })}
                            </ol>
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="group" aria-label="Adım ekle">
                                {ADIM_TURLERI.map(({ id, ad: turAdi, Icon }) => (
                                    <button key={id} type="button" id={'makro-adim-ekle-' + id}
                                        onClick={() => { setAdimlar((liste) => [...liste, id === 'position' ? { type: id, value: '', click: 1 } : { type: id, value: id === 'wait' ? VARSAYILAN_BEKLEME : '' }]); setUyari(''); }}
                                        className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-dashed border-sand-300 px-2 text-xs font-medium text-sand-700 transition-colors hover:border-moss-500/50 hover:text-moss-700">
                                        <Plus size={14} /><Icon size={14} aria-hidden="true" /> {turAdi}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2.5 rounded-2xl border border-sand-200 bg-white p-3.5">
                                <span className="block text-xs font-semibold text-sand-800">Düğmeye basınca</span>
                                <div className="grid grid-cols-2 gap-1 rounded-xl border border-sand-200 bg-sand-100 p-1 sm:grid-cols-4" role="group" aria-label="Çalışma biçimi">
                                    {CALISMALAR.map(({ id, ad: calismaAdi, Icon }) => (
                                        <button key={id} type="button" id={'makro-calisma-' + id} aria-pressed={calisma === id}
                                            onClick={() => { setCalisma(id); setUyari(''); }}
                                            className={'flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors ' + (calisma === id ? 'bg-white text-moss-800 shadow-soft ring-1 ring-sand-200' : 'text-sand-600 hover:text-sand-800')}>
                                            <Icon size={14} aria-hidden="true" /> {calismaAdi}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs leading-relaxed text-sand-600">{CALISMALAR.find((c) => c.id === calisma)?.aciklama}</p>
                                {calisma !== 'tek' && (
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-sand-700">
                                        {calisma === 'sayili' && (
                                            <label className="flex items-center gap-2 whitespace-nowrap">
                                                Kaç kez
                                                <input id="makro-tekrar" type="number" inputMode="numeric" min={TEKRAR_SINIRI.min} max={TEKRAR_SINIRI.max} step={1}
                                                    value={tekrar} onChange={(olay) => { setTekrar(olay.target.value); setUyari(''); }}
                                                    className={settingsFieldClass + ' min-h-[44px] w-24'} />
                                            </label>
                                        )}
                                        <label className="flex items-center gap-2 whitespace-nowrap">
                                            Turlar arası
                                            <input id="makro-tur-arasi" type="number" inputMode="decimal" min={0} max={TUR_ARASI_SINIRI.max / 1000} step="0.1"
                                                value={turArasi} onChange={(olay) => { setTurArasi(olay.target.value); setUyari(''); }}
                                                className={settingsFieldClass + ' min-h-[44px] w-24'} />
                                            saniye
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {uyari && <p role="status" className="text-xs font-medium text-berry-700">{uyari}</p>}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-sand-200 px-5 py-4">
                    <button type="button" id="makro-vazgec" onClick={onKapat} className="btn btn-ghost min-h-[44px] px-4 text-sm">
                        Vazgeç
                    </button>
                    <button type="button" id="makro-kaydet" onClick={kaydet} className="btn btn-primary min-h-[44px] px-4 text-sm">
                        <Check size={16} /> Kaydet
                    </button>
                </div>
            </div>

            {konumAcik && (
                <KonumSecici
                    baslangicX={typeof konumHedefi === 'number' && adimlar[konumHedefi]?.value ? Number(adimlar[konumHedefi].value.split(',')[0]) : konum.x}
                    baslangicY={typeof konumHedefi === 'number' && adimlar[konumHedefi]?.value ? Number(adimlar[konumHedefi].value.split(',')[1]) : konum.y}
                    prefs={prefs}
                    onKaydet={(x, y) => {
                        if (typeof konumHedefi === 'number') {
                            const sira = konumHedefi;
                            setAdimlar((liste) => liste.map((a, i) => (i === sira ? { ...a, value: Math.round(x) + ',' + Math.round(y) } : a)));
                            setUyari('');
                        } else setKonum({ x, y });
                        setKonumHedefi(null);
                    }}
                    onKapat={() => setKonumHedefi(null)}
                />
            )}
        </div>,
        document.body
    );
}
