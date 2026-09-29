'use client';

/**
 * Makro düzenleyici.
 *
 * Kişisel kısayolun türünü (konum, klavye kısayolu, metin) buradan seçersiniz.
 * Konum türünde "Konum seç" düğmesi tam ekran konum seçiciyi açar; kısayol
 * türünde sık kullanılan kombinasyonlar tek dokunuşla doldurulur. Ayarlar
 * listesi ve editördeki kısayol panosu aynı pencereyi kullanır.
 *
 * Pencere telefonda da tam ekran açılır: arkada ayarlar ekranının göründüğü
 * şeffaf bir şerit kalmaz, başlık ve düğmeler güvenli alanın içinde durur.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Keyboard, MousePointer2, TextCursorInput, X } from 'lucide-react';
import { KONUM_MERKEZ, konumYuzdesi, type RemoteMacro, type RemotePrefs } from '@/lib/remoteTools';
import KonumSecici from './KonumSecici';
import { settingsFieldClass } from '@/components/ui/settings';

type MakroTuru = RemoteMacro['type'];

const TURLER: Array<{ id: MakroTuru; anahtar: string; ad: string; Icon: typeof Keyboard }> = [
    { id: 'position', anahtar: 'konum', ad: 'Konum', Icon: MousePointer2 },
    { id: 'shortcut', anahtar: 'kisayol', ad: 'Kısayol', Icon: Keyboard },
    { id: 'text', anahtar: 'metin', ad: 'Metin', Icon: TextCursorInput }
];

const TUR_ADI: Record<MakroTuru, string> = {
    position: 'Fare konumu',
    shortcut: 'Klavye kısayolu',
    text: 'Hazır metin'
};

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
    const [konumAcik, setKonumAcik] = useState(false);
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
        if (sonraki !== 'position') setDeger(makro?.type === sonraki ? makro.value : '');
    };

    const kaydet = () => {
        const ham = tur === 'position' ? konum.x + ',' + konum.y : deger.trim();
        if (tur === 'shortcut' && !/^[A-Za-z0-9+_ -]{1,60}$/.test(ham)) {
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
                                onClick={() => setKonumAcik(true)}
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
                    baslangicX={konum.x}
                    baslangicY={konum.y}
                    prefs={prefs}
                    onKaydet={(x, y) => { setKonum({ x, y }); setKonumAcik(false); }}
                    onKapat={() => setKonumAcik(false)}
                />
            )}
        </div>,
        document.body
    );
}
