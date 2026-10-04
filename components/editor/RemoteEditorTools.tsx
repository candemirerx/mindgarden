'use client';

import { useBaglantiDurumu } from '@/lib/baglantiDurumu';
import BaglantiGostergesi from './BaglantiGostergesi';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AudioLines, Check, Clipboard, ClipboardCopy, ClipboardPaste, CornerDownLeft, MonitorUp, FolderKanban, LayoutDashboard, Loader2, Keyboard, Mic, MousePointer2, Send, Wand2 } from 'lucide-react';
import { BULUT_SAGLAYICILAR, SesKaydedici, sesiYaziyaCevir } from '@/lib/bulutDikte';
import { dosyalariBilgisayaraGonder, telefonPanosunuBilgisayaraGonder, hedefBilgisayara, hedefNota, sendKey, bridgeDictate, dictate, dinleKopruDikte, metinFarkiAktar, sendCommand, sendToComputerClipboard, stopBridgeDictation, typeOnComputer } from '@/lib/remoteTools';
import type { RemoteMode } from '@/lib/remoteTools';
import { useRemotePrefs } from '@/lib/useRemotePrefs';
import FareYuzeyi from './FareYuzeyi';

export default function RemoteEditorTools({ content, onContentChange, mode, onModeChange, placement, profilId = null, onProfilChange, aktif = true, onBaglantiAyarlari }: {
    content: string; onContentChange: (text: string) => void;
    mode: RemoteMode; onModeChange: (mode: RemoteMode) => void;
    placement: 'toolbar' | 'surface';
    /** Kısayol panosunda açık profil; null → tüm makrolar. */
    profilId?: string | null; onProfilChange?: (profilId: string | null) => void;
    /** Araç satırı ekranda mı? Değilse bağlantı yoklanmaz. */
    aktif?: boolean;
    /** Kurulum eksikken göstergeye dokununca bağlantı ayarlarını açar. */
    onBaglantiAyarlari?: () => void;
}) {
    const prefs = useRemotePrefs();
    const baglanti = useBaglantiDurumu(prefs, { aralikMs: 30000, etkin: placement === 'toolbar' && aktif });
    const [busy, setBusy] = useState(false);
    const [bridgeListening, setBridgeListening] = useState(false);
    const [bridgeStopping, setBridgeStopping] = useState(false);
    /** Bulut motoruyla Dikte: ilk dokunuş kaydı başlatır, ikincisi bitirip yazıya döker. */
    const [bulutDikte, setBulutDikte] = useState<'kayit' | 'gonder' | null>(null);
    const bulutKaydedici = useRef<SesKaydedici | null>(null);
    /** Bulut Köprü Dikte'yi durdurma işlevi (çalışırken dolu). */
    const bulutKopruDurdur = useRef<(() => void) | null>(null);
    const [kopruYaz, setKopruYaz] = useState(false);
    const [kopruDurum, setKopruDurum] = useState('');
    const [kopruHata, setKopruHata] = useState(false);
    const [notice, setNotice] = useState('');
    const [panoBildirim, setPanoBildirim] = useState<{ metin: string; ton: 'sending' | 'ok' | 'error' } | null>(null);
    const panoZamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
    /** Son başarılı gönderimin düğmesi: birkaç saniye yeşil tik gösterir. */
    const [basariliDugme, setBasariliDugme] = useState<'pano' | 'yaz' | 'enter' | 'gorsel' | 'gorselPano' | 'telefonPanosu' | null>(null);
    /** Köprü Yaz: bilgisayara gönderilmiş metin, gönderilecek son metin ve kilitler. */
    const kopruSon = useRef('');
    /** Canlı yazma açıldığındaki not (hedef yalnız bilgisayarsa kapanınca geri yüklenir). */
    const kopruIlk = useRef<string | null>(null);
    const kopruMesaji = (hedef: string) => hedef === 'computer'
        ? 'Canlı yazma açık: yazdıklarınız bilgisayara yazılıyor; kapatınca not eski hâline döner.'
        : 'Canlı yazma açık: notta yazdıklarınız bilgisayara da yazılıyor.';
    const kopruHedef = useRef('');
    const kopruCalisiyor = useRef(false);
    const kopruDurdu = useRef(false);
    /** Köprü Dikte akan aktarımı: PC'ye yazılan metin, hedef metin ve kilitler. */
    const dikteAkis = useRef({ yazilan: '', hedef: '', calisiyor: false, durdu: false, coz: null as null | (() => void) });
    /** Aktarım sürerken bayat değer kullanılmaması için güncel içerik ve tercihler. */
    const guncelIcerik = useRef(content);
    guncelIcerik.current = content;
    const guncelPrefs = useRef(prefs);
    guncelPrefs.current = prefs;
    useEffect(() => {
        // Canlı yazma yalnız araç açık, biçim canlı ve hedef bilgisayarı içeriyorken sürer.
        if (kopruYaz && (!(prefs.enabledTools.computerWrite && prefs.writeMode === 'canli' && hedefBilgisayara(prefs.writeTarget)) || (mode !== 'write' && mode !== 'dictation'))) {
            kopruKapat();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kopruYaz, mode, prefs.enabledTools.computerWrite, prefs.writeMode, prefs.writeTarget]);
    useEffect(() => {
        if (
            (mode === 'mouse' && !prefs.enabledTools.mouse) ||
            (mode === 'dictation' && !prefs.enabledTools.dictation) ||
            (mode === 'shortcuts' && !prefs.enabledTools.shortcuts) ||
            (mode === 'screen' && !prefs.enabledTools.screen)
        ) onModeChange('write');
    }, [mode, onModeChange, prefs.enabledTools.mouse, prefs.enabledTools.dictation, prefs.enabledTools.shortcuts, prefs.enabledTools.screen]);
    useEffect(() => () => { if (panoZamanlayici.current) clearTimeout(panoZamanlayici.current); }, []);
    /**
     * Kısa süreli bildirimle gönderim: sürerken "gönderiliyor", bitince başarı ya
     * da hatanın kendisi. Bildirim ekranın üstünde çıkar (altta klavyenin
     * arkasında kalıyordu); düğme de birkaç saniye yeşil tik gösterir.
     */
    const bildirimliGonder = async (tur: 'pano' | 'yaz' | 'enter' | 'gorsel' | 'gorselPano' | 'telefonPanosu', is: () => Promise<void | string>, gonderiliyor: string, basari: string) => {
        if (panoZamanlayici.current) clearTimeout(panoZamanlayici.current);
        setPanoBildirim({ metin: gonderiliyor, ton: 'sending' });
        setBasariliDugme(null);
        let hata = '';
        await act(async () => {
            // İş kendi başarı iletisini döndürebilir (ör. panoda metin mi görsel mi vardı).
            try { const ileti = await is(); if (ileti) basari = ileti; } catch (e) { hata = e instanceof Error ? e.message : 'Gönderilemedi.'; throw e; }
        }, basari);
        setPanoBildirim(hata ? { metin: hata, ton: 'error' } : { metin: basari, ton: 'ok' });
        if (!hata) setBasariliDugme(tur);
        panoZamanlayici.current = setTimeout(() => { setPanoBildirim(null); setBasariliDugme(null); }, hata ? 5000 : 3000);
    };
    /** Telefondan görsel seçtirip bilgisayara (dosya ya da pano) gönderir. */
    const gorselSecici = useRef<HTMLInputElement>(null);
    const gorselHedefi = useRef<'dosya' | 'pano'>('dosya');
    const gorselSec = (hedef: 'dosya' | 'pano') => { gorselHedefi.current = hedef; gorselSecici.current?.click(); };
    const gorselleriGonder = (dosyalar: FileList | null) => {
        const liste = Array.from(dosyalar ?? []).filter(d => d.type.startsWith('image/'));
        if (!liste.length) return;
        const hedef = gorselHedefi.current;
        const ad = (d: File, i: number) => d.name && /\.(jpe?g|png|webp|gif)$/i.test(d.name) ? d.name : 'not-bahcesi-' + Date.now() + '-' + (i + 1) + '.jpg';
        void bildirimliGonder(hedef === 'dosya' ? 'gorsel' : 'gorselPano',
            () => dosyalariBilgisayaraGonder(liste.map((d, i) => ({ ad: ad(d, i), veri: d })), hedef, prefs,
                oran => setPanoBildirim({ metin: (hedef === 'dosya' ? 'Bilgisayara gönderiliyor… %' : 'Panoya gönderiliyor… %') + Math.round(oran * 100), ton: 'sending' })),
            liste.length + ' görsel gönderiliyor…',
            hedef === 'dosya' ? liste.length + ' görsel bilgisayarda Resimler › Not Bahçesi klasörüne kaydedildi ✓' : 'Görsel bilgisayar panosuna gönderildi ✓ Ctrl+V ile yapıştırabilirsiniz');
    };
    const panoyaGonder = () => bildirimliGonder('pano', () => sendToComputerClipboard(content, prefs), 'Bilgisayar panosuna gönderiliyor…', 'Bilgisayar panosuna gönderildi ✓ Ctrl+V ile yapıştırabilirsiniz');
    const act = async (action: () => Promise<void>, success: string) => {
        setBusy(true); setNotice('');
        try { await action(); setNotice(success); }
        catch (error) { setNotice(error instanceof Error ? error.message : 'İşlem başarısız.'); void baglanti.tazele(); }
        finally { setBusy(false); }
    };
    /**
     * Köprü Dikte: konuşma sürerken bilgisayara akan aktarım.
     *
     * Android tarafı tanınan metnin son hâlini her değişimde bildirir; burada
     * yalnızca değişen kuyruk yazılır. Aktarım sürerken gelen yenilikler kuyruğa
     * girer ve tek seferde yetişir. Bağlantı koparsa durum yazısı nedeni gösterir.
     */
    const runBridgeDictation = async () => {
        setBusy(true); setBridgeListening(true); setNotice('Dinleniyor: konuştuklarınız ' + (prefs.bridgeDictationTarget === 'editor' ? 'nota' : prefs.bridgeDictationTarget === 'both' ? 'nota ve bilgisayara' : 'bilgisayara') + ' yazılıyor.');
        const akis = dikteAkis.current;
        akis.yazilan = ''; akis.hedef = ''; akis.durdu = false; akis.calisiyor = false; akis.coz = null;
        // Hedef (ayarlardaki dişliden): not metni, bilgisayar ya da ikisi birden.
        const kHedef = prefs.bridgeDictationTarget;
        const notaYaz = hedefNota(kHedef), pcYaz = hedefBilgisayara(kHedef);
        const ilkIcerik = guncelIcerik.current;
        /** Konuşulan metnin son hâlini hedefe işler. */
        const hedefYaz = (yeni: string) => {
            akis.hedef = yeni;
            if (notaYaz) onContentChange(ilkIcerik && yeni ? ilkIcerik + (/\s$/.test(ilkIcerik) ? '' : ' ') + yeni : (ilkIcerik || yeni));
            if (pcYaz) void dongu(); else akis.yazilan = yeni;
        };
        const yerAdi = kHedef === 'editor' ? 'nota' : kHedef === 'both' ? 'nota ve bilgisayara' : 'bilgisayara';
        const dongu = async (): Promise<void> => {
            if (akis.calisiyor || akis.durdu) return;
            akis.calisiyor = true;
            try {
                while (!akis.durdu && akis.yazilan !== akis.hedef) {
                    await metinFarkiAktar(akis.hedef, akis.yazilan, guncelPrefs.current, yazilan => {
                        akis.yazilan = yazilan;
                        // Aktarımın gerçekten konuşurken sürdüğü görünsün diye durum
                        // yazısı bilgisayara yazılan karakter sayısını gösterir.
                        setNotice('Dinleniyor · ' + Array.from(yazilan).length + ' karakter yazıldı');
                    });
                }
            } catch (error) {
                akis.durdu = true;
                setNotice('Aktarım durdu: ' + (error instanceof Error ? error.message : 'Bağlantı hatası.'));
            } finally {
                akis.calisiyor = false;
                if (!akis.durdu && akis.yazilan !== akis.hedef) void dongu();
                else if (akis.coz) { const bitir = akis.coz; akis.coz = null; bitir(); }
            }
        };
        // Aktarım bir hata yüzünden durduysa kuyruğun boşalmasını beklemek
        // anlamsızdır: hedefe hiç ulaşılamayacağı için bekleme hiç bitmiyor ve
        // düğme "Bitiriliyor…" durumunda kilitli kalıyordu.
        const bosal = (): Promise<void> => (akis.calisiyor || (akis.yazilan !== akis.hedef && !akis.durdu))
            ? new Promise<void>(cozum => { akis.coz = cozum; })
            : Promise.resolve();
        // Varsayılanda konuşulmakta olan parça da hedefe girer: söz, cümle
        // bitmeden bilgisayarda görünür. Tercih kapatıldığında yalnızca
        // kesinleşmiş cümleler aktarılır.
        if (prefs.dictationEngine === 'cloud') {
            // Bulut motoru: konuşma duraklayınca cümle servise gider, dönen metin
            // biriken hedefe eklenir ve aynı aktarım döngüsüyle bilgisayara yazılır.
            const saglayici = prefs.dictationCloud;
            const ad = BULUT_SAGLAYICILAR.find(b => b.id === saglayici)?.ad ?? 'Bulut';
            let kuyruk: Promise<void> = Promise.resolve();
            let parca = 0;
            const kaydedici = new SesKaydedici({
                bolumle: true,
                onParca: wav => {
                    kuyruk = kuyruk.then(async () => {
                        const metin = await sesiYaziyaCevir(wav, saglayici, prefs.dictationLanguage);
                        if (!metin) return;
                        hedefYaz(akis.hedef ? akis.hedef + (/\s$/.test(akis.hedef) ? '' : ' ') + metin : metin);
                        parca++;
                        setNotice('Dinleniyor (' + ad + ') · ' + parca + ' cümle yazıldı');
                    }).catch(error => setNotice(error instanceof Error ? error.message : ad + ' hatası.'));
                }
            });
            try {
                await kaydedici.baslat();
                setNotice('Dinleniyor (' + ad + '): konuşun; her cümle duraklayınca ' + yerAdi + ' yazılır.');
                await new Promise<void>(cozum => {
                    bulutKopruDurdur.current = cozum;
                    if (!prefs.bridgeDictationUnlimited) setTimeout(cozum, prefs.bridgeDictationSeconds * 1000);
                });
                setBridgeStopping(true);
                await kaydedici.bitir();
                await kuyruk;
                if (pcYaz) void dongu();
                await bosal();
                setNotice(akis.durdu ? 'Köprü Dikte bitti ancak bilgisayara aktarım tamamlanamadı; bağlantıyı kontrol edin.'
                    : parca ? 'Köprü Dikte bitti; ' + parca + ' cümle ' + yerAdi + ' yazıldı.' : 'Konuşma duyulmadı.');
            } catch (error) {
                await kaydedici.bitir().catch(() => null);
                setNotice(error instanceof Error ? error.message : 'Köprü Dikte başarısız.');
            } finally {
                bulutKopruDurdur.current = null;
                setBridgeListening(false); setBridgeStopping(false); setBusy(false);
            }
            return;
        }
        const tanitici = await dinleKopruDikte(olay => {
            hedefYaz(guncelPrefs.current.bridgeDictationLive ? olay.text : olay.kesin);
        });
        try {
            const metin = await bridgeDictate(prefs.dictationLanguage, prefs.bridgeDictationUnlimited ? 0 : prefs.bridgeDictationSeconds, prefs.dictationEngine);
            hedefYaz(metin);
            await bosal();
            setNotice(akis.durdu
                ? 'Köprü Dikte bitti ancak bilgisayara aktarım tamamlanamadı; bağlantıyı kontrol edin.'
                : 'Köprü Dikte bitti; konuşma ' + yerAdi + ' yazıldı' + (notaYaz ? '.' : ', not değişmedi.'));
        } catch (error) { setNotice(error instanceof Error ? error.message : 'Köprü Dikte başarısız.'); }
        finally {
            if (tanitici) await tanitici.remove();
            setBridgeListening(false); setBridgeStopping(false); setBusy(false);
        }
    };
    /**
     * Köprü Yaz: notta yazılanı bilgisayara aktarır.
     *
     * Metin ortak önekten sonraki fark kadar güncellenir; silinen karakterler
     * bilgisayarda da silinir. Aktarım sürerken yeni yazılanlar kuyruğa girer ve
     * tek seferde yetişir; bağlantı koparsa not yazılmaya devam eder.
     */
    const kopruAktar = async () => {
        if (kopruCalisiyor.current || kopruDurdu.current) return;
        kopruCalisiyor.current = true;
        try {
            while (!kopruDurdu.current && kopruSon.current !== kopruHedef.current) {
                kopruSon.current = await metinFarkiAktar(kopruHedef.current, kopruSon.current, guncelPrefs.current, yazilan => { kopruSon.current = yazilan; });
            }
            setKopruHata(false);
            setKopruDurum(kopruMesaji(guncelPrefs.current.writeTarget));
        } catch (error) {
            kopruDurdu.current = true;
            setKopruHata(true);
            setKopruDurum('Aktarım durdu: ' + (error instanceof Error ? error.message : 'Bağlantı hatası.') + ' Not çalışmaya devam eder; bağlantıyı düzeltip yeniden deneyin.');
        } finally {
            kopruCalisiyor.current = false;
            if (!kopruDurdu.current && kopruSon.current !== kopruHedef.current) void kopruAktar();
        }
    };

    /** Canlı yazmayı kapatır; hedef yalnız bilgisayarsa not açıldığı hâline döner. */
    function kopruKapat() {
        kopruDurdu.current = true;
        setKopruYaz(false); setKopruDurum(''); setKopruHata(false);
        if (guncelPrefs.current.writeTarget === 'computer' && kopruIlk.current !== null) onContentChange(kopruIlk.current);
        kopruIlk.current = null;
    }
    /** Bilgisayara Yaz'ın canlı biçimi: açılırken o anki not gönderilmez, sonrası aktarılır. */
    const kopruYazDegistir = () => {
        setNotice('');
        setKopruHata(false);
        if (kopruYaz) { kopruKapat(); return; }
        kopruDurdu.current = false;
        kopruIlk.current = guncelIcerik.current;
        kopruSon.current = guncelIcerik.current;
        kopruHedef.current = guncelIcerik.current;
        setKopruYaz(true);
        setKopruDurum(kopruMesaji(guncelPrefs.current.writeTarget));
    };

    useEffect(() => {
        if (!kopruYaz) return;
        if (guncelIcerik.current === kopruSon.current) return;
        kopruHedef.current = guncelIcerik.current;
        void kopruAktar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content, kopruYaz]);

    if (placement === 'toolbar') return <>
            <BaglantiGostergesi kompakt id="studio-baglanti-durumu" yol={prefs.connection} durum={baglanti.durum} bakiliyor={baglanti.bakiliyor}
                onTazele={() => { if (onBaglantiAyarlari) onBaglantiAyarlari(); else void baglanti.tazele(); }} />
            {prefs.enabledTools.shortcuts && (() => {
                const tumuAcik = mode === 'shortcuts' && !profilId;
                return <button id="studio-kisayollar" type="button" aria-pressed={tumuAcik} onClick={() => { onProfilChange?.(null); onModeChange(tumuAcik ? 'write' : 'shortcuts'); }}
                    title={tumuAcik ? 'Yazıya dön' : 'Kısayollar: makro panosu'} aria-label={tumuAcik ? 'Yazıya dön' : 'Kısayollar'}
                    className={`btn h-11 w-11 shrink-0 p-0 ${tumuAcik ? 'border border-moss-700 bg-moss-100 text-moss-800 hover:bg-moss-200' : 'btn-primary'}`}>
                    {tumuAcik ? <Keyboard size={17} aria-hidden="true" /> : <Wand2 size={17} aria-hidden="true" />}</button>;
            })()}
            {prefs.enabledTools.shortcuts && prefs.shortcutButtons.filter(dugme => prefs.profiles.some(p => p.id === dugme.profileId)).map((dugme, index) => {
                const acik = mode === 'shortcuts' && profilId === dugme.profileId;
                const ad = dugme.name.trim() || prefs.profiles.find(p => p.id === dugme.profileId)?.name || 'Profil';
                return <button key={dugme.id} id={'studio-kisayol-dugmesi-' + index} type="button" aria-pressed={acik} title={acik ? 'Yazıya dön' : ad + ' profilinin makroları'} aria-label={acik ? 'Yazıya dön' : ad + ' profili'}
                    onClick={() => { if (acik) onModeChange('write'); else { onProfilChange?.(dugme.profileId); onModeChange('shortcuts'); } }}
                    className={`btn relative h-11 w-11 shrink-0 p-0 ${acik ? 'border border-moss-700 bg-moss-100 text-moss-800 hover:bg-moss-200' : 'btn-secondary'}`}>
                    {acik ? <Keyboard size={17} aria-hidden="true" /> : <FolderKanban size={17} aria-hidden="true" />}
                    <span aria-hidden="true" className="pointer-events-none absolute bottom-0.5 right-1 text-[10px] font-bold leading-none">{ad.charAt(0).toLocaleUpperCase('tr')}</span></button>;
            })}
            {prefs.enabledTools.screen && <button id="studio-ekran" type="button" aria-pressed={mode === 'screen'} onClick={() => onModeChange(mode === 'screen' ? 'write' : 'screen')}
                title="Ekran: tasarladığın bölmeli düzen"
                className={`btn min-h-11 min-w-[44px] shrink-0 gap-1.5 px-3 text-sm ${mode === 'screen' ? 'border border-moss-700 bg-moss-100 text-moss-800 hover:bg-moss-200' : 'btn-primary'}`}>
                {mode === 'screen' ? <Keyboard size={16} /> : <LayoutDashboard size={16} />}<span className="sr-only sm:not-sr-only">{mode === 'screen' ? ' Yazıya dön' : ' Ekran'}</span></button>}
            {prefs.enabledTools.mouse && <button id="studio-fare" type="button" aria-pressed={mode === 'mouse'} onClick={() => onModeChange(mode === 'mouse' ? 'write' : 'mouse')}
                className={`btn min-h-11 min-w-[44px] shrink-0 gap-1.5 px-3 text-sm ${mode === 'mouse' ? 'border border-moss-700 bg-moss-100 text-moss-800 hover:bg-moss-200' : 'btn-primary'}`}>
                {mode === 'mouse' ? <Keyboard size={16} /> : <MousePointer2 size={16} />}<span className="sr-only sm:not-sr-only">{mode === 'mouse' ? ' Yazıya dön' : ' Fare'}</span></button>}
            {prefs.enabledTools.dictation && <button id="studio-dikte" type="button" disabled={(busy && bulutDikte !== 'kayit') || bulutDikte === 'gonder'} aria-pressed={bulutDikte === 'kayit'} onClick={() => {
                const yaz = async (text: string) => {
                    if (hedefNota(prefs.dictationTarget)) onContentChange(prefs.appendDictation && content ? `${content}${/\s$/.test(content) ? '' : ' '}${text}` : text);
                    if (hedefBilgisayara(prefs.dictationTarget)) await typeOnComputer(text, prefs);
                };
                const basari = prefs.dictationTarget === 'computer' ? 'Dikte bilgisayara yazıldı; not değişmedi.'
                    : prefs.dictationTarget === 'both' ? 'Dikte nota ve bilgisayara yazıldı.' : 'Dikte nota eklendi.';
                if (prefs.dictationEngine !== 'cloud') { void act(async () => yaz(await dictate(prefs.dictationLanguage)), basari); return; }
                const ad = BULUT_SAGLAYICILAR.find(b => b.id === prefs.dictationCloud)?.ad ?? 'Bulut';
                if (bulutDikte === 'kayit' && bulutKaydedici.current) {
                    const kaydedici = bulutKaydedici.current; bulutKaydedici.current = null;
                    setBulutDikte('gonder');
                    void act(async () => {
                        try {
                            const wav = await kaydedici.bitir();
                            if (!wav) throw new Error('Konuşma duyulmadı.');
                            setNotice(ad + ' yazıya döküyor…');
                            const metin = await sesiYaziyaCevir(wav, prefs.dictationCloud, prefs.dictationLanguage);
                            if (!metin) throw new Error('Konuşma anlaşılamadı.');
                            await yaz(metin);
                        } finally { setBulutDikte(null); }
                    }, basari);
                    return;
                }
                const kaydedici = new SesKaydedici({ bolumle: false });
                void kaydedici.baslat().then(() => {
                    bulutKaydedici.current = kaydedici; setBulutDikte('kayit');
                    setNotice('Dinleniyor (' + ad + '): bitirince Dikte düğmesine tekrar dokunun.');
                }).catch(error => setNotice(error instanceof Error ? error.message : 'Mikrofon açılamadı.'));
            }}
                className={`btn min-h-11 min-w-[44px] shrink-0 gap-1.5 px-3 text-sm ${bulutDikte ? 'border border-berry-300 bg-berry-50 text-berry-700 hover:bg-berry-100' : 'btn-primary'}`}>
                {bulutDikte === 'gonder' ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}<span className="sr-only sm:not-sr-only">{bulutDikte === 'kayit' ? ' Dikteyi bitir' : bulutDikte === 'gonder' ? ' Yazıya dökülüyor…' : ' Dikte'}</span></button>}
            {prefs.enabledTools.bridgeDictation && <button id="studio-kopru-dikte" type="button" disabled={bridgeStopping || (busy && !bridgeListening)}
                onClick={() => {
                    if (bridgeListening && bulutKopruDurdur.current) { setBridgeStopping(true); bulutKopruDurdur.current(); }
                    else if (bridgeListening) { setBridgeStopping(true); void stopBridgeDictation().catch(error => { setBridgeStopping(false); setNotice(error.message); }); }
                    else void runBridgeDictation();
                }} className={`btn min-h-11 min-w-[44px] shrink-0 gap-1.5 px-3 text-sm ${bridgeListening ? 'border border-berry-300 bg-berry-50 text-berry-700 hover:bg-berry-100' : 'btn-primary'}`}>
                <AudioLines size={16} /><span className="sr-only sm:not-sr-only">{bridgeListening ? (bridgeStopping ? ' Bitiriliyor…' : ' Dikteyi bitir') : ' Köprü Dikte'}</span>
            </button>}
            {prefs.enabledTools.computerWrite && (() => {
                const pcDisi = !hedefBilgisayara(prefs.writeTarget);
                const ipucu = pcDisi ? 'Hedef yalnız not metni: bilgisayara gönderilmez (ayar: dişli)' : prefs.writeMode === 'canli' ? 'Canlı: notta yazdıkça bilgisayara yazılır' : 'Notu bilgisayara yaz';
                if (prefs.writeMode === 'canli') return <button id="studio-bilgisayara-yaz" type="button" aria-pressed={kopruYaz} disabled={pcDisi} title={ipucu} onClick={kopruYazDegistir}
                    className={`btn min-h-11 min-w-[44px] shrink-0 gap-1.5 px-3 text-sm ${kopruYaz ? 'border border-moss-700 bg-moss-100 text-moss-800 hover:bg-moss-200' : 'btn-primary'}`}>
                    <Keyboard size={16} /><span className="sr-only sm:not-sr-only">{kopruYaz ? ' Canlı yazma açık' : ' Bilgisayara yaz (canlı)'}</span>
                </button>;
                return <button id="studio-bilgisayara-yaz" type="button" disabled={busy || !content.trim() || pcDisi} title={ipucu} onClick={() => void bildirimliGonder('yaz', () => typeOnComputer(content, prefs), 'Bilgisayara yazılıyor…', 'Metin bilgisayara yazıldı ✓')}
                    className="btn btn-primary min-h-11 min-w-[44px] shrink-0 gap-1.5 px-3 text-sm">{basariliDugme === 'yaz' ? <Check size={16} /> : <Send size={16} />}<span className="sr-only sm:not-sr-only"> Bilgisayara yaz</span></button>;
            })()}
            {kopruYaz && kopruHata && <button type="button" id="studio-kopru-yaz-yeniden" onClick={() => { kopruDurdu.current = false; setKopruHata(false); kopruHedef.current = guncelIcerik.current; void kopruAktar(); }}
                className="btn btn-secondary min-h-11 shrink-0 px-3 text-sm">Yeniden dene</button>}
            {kopruYaz && <span id="studio-kopru-yaz-durum" role="status" className={`max-w-56 shrink-0 text-xs ${kopruHata ? 'text-berry-700' : 'text-moss-700'}`}>{kopruDurum}</span>}
            {prefs.enabledTools.enter && <button id="studio-enter" type="button" disabled={busy} title="Bilgisayara Enter tuşunu gönder" aria-label="Bilgisayara Enter gönder"
                onClick={() => void bildirimliGonder('enter', () => sendKey('ENTER', prefs), 'Enter gönderiliyor…', 'Enter bilgisayara gönderildi ✓')}
                className="btn btn-primary min-h-11 min-w-[44px] shrink-0 gap-1.5 px-3 text-sm">{basariliDugme === 'enter' ? <Check size={16} /> : <CornerDownLeft size={16} />}<span className="sr-only sm:not-sr-only"> Enter</span></button>}
            {prefs.enabledTools.clipboard && <button id="studio-pc-panosu" type="button" disabled={busy || !content.trim()} onClick={() => void panoyaGonder()}
                className="btn btn-primary min-h-11 min-w-[44px] shrink-0 gap-1.5 px-3 text-sm">{basariliDugme === 'pano' ? <Check size={16} /> : <Clipboard size={16} />}<span className="sr-only sm:not-sr-only"> PC panosu</span></button>}
            {prefs.enabledTools.imageToComputer && <button id="studio-gorsel-bilgisayara" type="button" disabled={busy} title="Telefondan görsel seçip bilgisayara gönder (Resimler › Not Bahçesi)" aria-label="Görselleri bilgisayara gönder"
                onClick={() => gorselSec('dosya')}
                className="btn btn-primary min-h-11 min-w-[44px] shrink-0 gap-1.5 px-3 text-sm">{basariliDugme === 'gorsel' ? <Check size={16} /> : <MonitorUp size={16} />}<span className="sr-only sm:not-sr-only"> Görsel → PC</span></button>}
            {prefs.enabledTools.imageToClipboard && <button id="studio-gorsel-panoya" type="button" disabled={busy} title="Telefondan görsel seçip bilgisayar panosuna gönder" aria-label="Görseli bilgisayar panosuna gönder"
                onClick={() => gorselSec('pano')}
                className="btn btn-primary min-h-11 min-w-[44px] shrink-0 gap-1.5 px-3 text-sm">{basariliDugme === 'gorselPano' ? <Check size={16} /> : <ClipboardCopy size={16} />}<span className="sr-only sm:not-sr-only"> Görsel → pano</span></button>}
            {prefs.enabledTools.phoneClipboard && <button id="studio-telefon-panosu" type="button" disabled={busy} title="Telefon panosundaki metni ya da görseli bilgisayar panosuna gönder" aria-label="Telefon panosunu bilgisayar panosuna gönder"
                onClick={() => void bildirimliGonder('telefonPanosu', () => telefonPanosunuBilgisayaraGonder(prefs), 'Telefon panosu bilgisayara gönderiliyor…', 'Telefon panosu bilgisayar panosuna gönderildi ✓')}
                className="btn btn-primary min-h-11 min-w-[44px] shrink-0 gap-1.5 px-3 text-sm">{basariliDugme === 'telefonPanosu' ? <Check size={16} /> : <ClipboardPaste size={16} />}<span className="sr-only sm:not-sr-only"> Telefon panosu</span></button>}
            {(prefs.enabledTools.imageToComputer || prefs.enabledTools.imageToClipboard) && <input ref={gorselSecici} type="file" accept="image/*" multiple hidden
                onChange={e => { gorselleriGonder(e.target.files); e.target.value = ''; }} />}
            {notice && <span role="status" className="max-w-48 shrink-0 text-xs text-sand-700">{notice}</span>}
            {panoBildirim && typeof document !== 'undefined' && createPortal(
                <div id="studio-pano-bildirim" role="status" aria-live="polite"
                    className={`pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top,0px)+7.5rem)] z-[120] flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium shadow-lg ${panoBildirim.ton === 'error' ? 'bg-berry-700 text-berry-50' : 'bg-moss-800 text-moss-50'}`}>
                    {panoBildirim.ton === 'sending' ? <Loader2 size={16} className="animate-spin" /> : panoBildirim.ton === 'ok' ? <Check size={16} className="shrink-0" /> : <Clipboard size={16} className="shrink-0" />}
                    <span>{panoBildirim.metin}</span>
                </div>, document.body)}
        </>;
    if (mode !== 'mouse' || !prefs.enabledTools.mouse) return null;
    return <div className="flex min-h-0 flex-1 flex-col overflow-auto px-4 py-4 sm:px-6">
        <div className="flex min-h-0 flex-1 flex-col gap-2">
            <FareYuzeyi prefs={prefs} onHata={setNotice} className="flex min-h-[46dvh] flex-1 touch-none select-none items-center justify-center rounded-2xl border border-moss-200 bg-gradient-to-br from-moss-50 to-sand-50 p-6 text-center text-sm text-sand-600">
                Sürükle: imleci hareket ettir · Bir kez dokun: sol tık
            </FareYuzeyi>
            <div className="grid shrink-0 grid-cols-3 gap-2">
                <button className="btn btn-secondary min-h-11 py-2.5 text-sm" onClick={() => void act(() => sendCommand('mc:1', prefs), 'Sol tık gönderildi.')}>Sol tık</button>
                <button className="btn btn-secondary min-h-11 py-2.5 text-sm" onClick={() => void act(() => sendCommand('ms:3', prefs), 'Yukarı kaydırıldı.')}>↑ Kaydır</button>
                <button className="btn btn-secondary min-h-11 py-2.5 text-sm" onClick={() => void act(() => sendCommand('mc:2', prefs), 'Sağ tık gönderildi.')}>Sağ tık</button>
                <button className="btn btn-secondary col-start-2 min-h-11 py-2.5 text-sm" onClick={() => void act(() => sendCommand('ms:-3', prefs), 'Aşağı kaydırıldı.')}>↓ Kaydır</button>
            </div>
        </div>
        {notice && <p role="status" className="shrink-0 text-xs text-sand-700">{notice}</p>}
    </div>;
}
