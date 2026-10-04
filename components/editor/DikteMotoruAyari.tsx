'use client';

/**
 * Dikte motoru seçimi: Yapay zekâ ayarlarındaki gibi üç sekme.
 *  - Telefon: ücretsiz, anahtarsız (Google – Gboard ile aynı, cihaz içi, varsayılan).
 *  - Bulut: kendi API anahtarıyla OpenAI / Gemini / Groq; OpenAI ve Gemini,
 *    yapay zekâdaki anahtarı kullanır.
 *  - Yerel: indirilebilir Whisper modeli (sonraki sürüm).
 * Seçilen motoru Köprü Dikte kullanır; Bulut seçiliyse Dikte düğmesi de.
 */
import { useEffect, useState } from 'react';
import { Check, Cloud, Cpu, ExternalLink, Eye, EyeOff, Loader2, Mic, Smartphone } from 'lucide-react';
import { BULUT_SAGLAYICILAR, SesKaydedici, bulutAnahtari, bulutAnahtariKaydet, bulutModeli, bulutModeliKaydet, sesiYaziyaCevir, type BulutSaglayici } from '@/lib/bulutDikte';
import type { RemotePrefs } from '@/lib/remoteTools';
import { SettingsField, SettingsNote, cx, settingsFieldClass } from '@/components/ui/settings';

type Sekme = 'telefon' | 'bulut' | 'yerel';
type Motorlar = { onDevice: boolean; system: boolean; google?: boolean } | null;

const TELEFON_MOTORLARI: Array<{ id: RemotePrefs['dictationEngine']; ad: string; aciklama: string; kosul?: keyof NonNullable<Motorlar> }> = [
    { id: 'auto', ad: 'Otomatik (önerilen)', aciklama: 'Önce Google, internet yoksa cihaz içi.' },
    { id: 'google', ad: 'Google – Gboard ile aynı', aciklama: 'Çevrimiçi, ücretsiz, Türkçede çok isabetli.', kosul: 'google' },
    { id: 'device', ad: 'Yalnızca cihaz içi', aciklama: 'İnternetsiz, hızlı; daha az isabetli.', kosul: 'onDevice' },
    { id: 'system', ad: 'Telefonun varsayılanı', aciklama: 'Telefon ayarlarındaki ses tanıma servisi.' }
];

export default function DikteMotoruAyari({ prefs, update, motorlar, telefon }: { prefs: RemotePrefs; update: (p: RemotePrefs) => void; motorlar: Motorlar; telefon: boolean }) {
    const bulutSecili = prefs.dictationEngine === 'cloud';
    const [sekme, setSekme] = useState<Sekme>(bulutSecili ? 'bulut' : 'telefon');
    const [saglayici, setSaglayici] = useState<BulutSaglayici>(prefs.dictationCloud);
    const [anahtar, setAnahtar] = useState('');
    const [model, setModel] = useState('');
    const [goster, setGoster] = useState(false);
    const [deneme, setDeneme] = useState<{ durum: 'kayit' | 'gonder' | 'ok' | 'hata'; metin: string } | null>(null);
    useEffect(() => { setAnahtar(bulutAnahtari(saglayici)); setModel(bulutModeli(saglayici)); setDeneme(null); }, [saglayici]);

    const bilgi = BULUT_SAGLAYICILAR.find(b => b.id === saglayici)!;
    const kullanilan = bulutSecili
        ? 'Bulut · ' + (BULUT_SAGLAYICILAR.find(b => b.id === prefs.dictationCloud)?.ad ?? '')
        : (telefon ? 'Telefon · ' : 'Tarayıcı · ') + (TELEFON_MOTORLARI.find(m => m.id === prefs.dictationEngine)?.ad ?? 'Otomatik');

    const dene = async () => {
        bulutAnahtariKaydet(saglayici, anahtar); bulutModeliKaydet(saglayici, model);
        const kaydedici = new SesKaydedici({ bolumle: false });
        try {
            setDeneme({ durum: 'kayit', metin: '4 saniye konuşun…' });
            await kaydedici.baslat();
            await new Promise(r => setTimeout(r, 4000));
            const wav = await kaydedici.bitir();
            if (!wav) { setDeneme({ durum: 'hata', metin: 'Konuşma duyulmadı; daha yüksek sesle tekrar deneyin.' }); return; }
            setDeneme({ durum: 'gonder', metin: bilgi.ad + ' yazıya döküyor…' });
            const metin = await sesiYaziyaCevir(wav, saglayici, prefs.dictationLanguage);
            setDeneme({ durum: 'ok', metin: metin || '(boş sonuç)' });
        } catch (e) {
            await kaydedici.bitir().catch(() => null);
            setDeneme({ durum: 'hata', metin: e instanceof Error ? e.message : 'Deneme başarısız.' });
        }
    };

    const sekmeDugmesi = (id: Sekme, ad: string, Icon: typeof Cloud) => (
        <button key={id} type="button" role="tab" aria-selected={sekme === id} onClick={() => setSekme(id)}
            className={cx('flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold', sekme === id ? 'bg-white text-moss-800 shadow-sm' : 'text-sand-700 hover:bg-white/50')}>
            <Icon size={15} aria-hidden="true" /> {ad}
        </button>
    );

    return <div id="dikte-motoru" className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-moss-500/25 bg-moss-50 px-3 py-2.5">
            <Mic size={17} className="shrink-0 text-moss-700" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-xs text-sand-800"><span className="text-moss-700">Kullanılan dikte motoru: </span><strong>{kullanilan}</strong></p>
        </div>
        <div role="tablist" aria-label="Dikte motoru" className="grid grid-cols-3 gap-1 rounded-2xl border border-sand-200 bg-sand-200/50 p-1">
            {sekmeDugmesi('telefon', telefon ? 'Telefon' : 'Tarayıcı', Smartphone)}
            {sekmeDugmesi('bulut', 'Bulut', Cloud)}
            {sekmeDugmesi('yerel', 'Yerel', Cpu)}
        </div>

        {sekme === 'telefon' && <div role="tabpanel" className="space-y-2">
            {telefon ? <>
                <p className="text-xs leading-relaxed text-sand-600">Ücretsiz, anahtar gerekmez. Köprü Dikte seçtiğiniz motoru kullanır; Dikte düğmesi telefonun ses penceresini açar.</p>
                {TELEFON_MOTORLARI.filter(m => !m.kosul || motorlar?.[m.kosul]).map(m => {
                    const secili = prefs.dictationEngine === m.id;
                    return <button key={m.id} type="button" aria-pressed={secili} onClick={() => update({ ...prefs, dictationEngine: m.id })}
                        className={cx('flex w-full items-center gap-3 rounded-xl border p-3 text-left', secili ? 'border-moss-400 bg-moss-50' : 'border-sand-200 bg-white hover:border-sand-300')}>
                        <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-sand-900">{m.ad}</span><span className="block text-xs text-sand-600">{m.aciklama}</span></span>
                        {secili && <Check size={16} className="shrink-0 text-moss-700" aria-hidden="true" />}
                    </button>;
                })}
            </> : <>
                <p className="text-xs leading-relaxed text-sand-600">Tarayıcının kendi ses tanıması kullanılır (Chrome ve Edge'de Google'ın tanıması). Anahtar gerekmez.</p>
                <button type="button" aria-pressed={!bulutSecili} onClick={() => update({ ...prefs, dictationEngine: 'auto' })}
                    className={cx('flex w-full items-center gap-3 rounded-xl border p-3 text-left', !bulutSecili ? 'border-moss-400 bg-moss-50' : 'border-sand-200 bg-white')}>
                    <span className="min-w-0 flex-1 text-sm font-medium text-sand-900">Tarayıcının ses tanıması</span>
                    {!bulutSecili && <Check size={16} className="text-moss-700" aria-hidden="true" />}
                </button>
            </>}
        </div>}

        {sekme === 'bulut' && <div role="tabpanel" className="space-y-3">
            <p className="text-xs leading-relaxed text-sand-600">Kendi API anahtarınızla. Ses doğrudan seçtiğiniz servise gider; konuşma duraklayınca cümle cümle yazılır. Seçiliyken hem Dikte hem Köprü Dikte bu motoru kullanır.</p>
            <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Bulut ses tanıma servisi">
                {BULUT_SAGLAYICILAR.map(b => <button key={b.id} type="button" role="radio" aria-checked={saglayici === b.id} onClick={() => setSaglayici(b.id)}
                    className={cx('min-h-11 rounded-xl border px-2 text-xs font-semibold', saglayici === b.id ? 'border-moss-400 bg-moss-50 text-moss-800' : 'border-sand-200 bg-white text-sand-700')}>{b.ad}</button>)}
            </div>
            <p className="text-xs text-sand-600">{bilgi.not}</p>
            <SettingsField label={bilgi.ad + ' API anahtarı'} htmlFor="dikte-bulut-anahtar">
                <div className="flex gap-1.5">
                    <input id="dikte-bulut-anahtar" type={goster ? 'text' : 'password'} autoComplete="off" spellCheck={false} value={anahtar}
                        onChange={e => setAnahtar(e.target.value)} onBlur={() => bulutAnahtariKaydet(saglayici, anahtar)} placeholder="Anahtarı yapıştırın" className={settingsFieldClass + ' min-w-0 flex-1'} />
                    <button type="button" aria-label={goster ? 'Anahtarı gizle' : 'Anahtarı göster'} onClick={() => setGoster(!goster)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sand-300 bg-white text-sand-700">{goster ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
            </SettingsField>
            <a href={bilgi.anahtarSayfasi} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-moss-700 underline"><ExternalLink size={13} /> {bilgi.ad} anahtarı al</a>
            <SettingsField label="Model" htmlFor="dikte-bulut-model">
                <input id="dikte-bulut-model" value={model} spellCheck={false} autoCapitalize="none" onChange={e => setModel(e.target.value)} onBlur={() => bulutModeliKaydet(saglayici, model)} className={settingsFieldClass} />
            </SettingsField>
            <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!anahtar.trim() || deneme?.durum === 'kayit' || deneme?.durum === 'gonder'} onClick={() => void dene()} className="btn btn-secondary min-h-[44px] gap-1.5 px-4 text-sm">
                    {deneme?.durum === 'kayit' || deneme?.durum === 'gonder' ? <Loader2 size={15} className="animate-spin" /> : <Mic size={15} />} 4 saniye dene
                </button>
                <button type="button" disabled={!anahtar.trim()} onClick={() => { bulutAnahtariKaydet(saglayici, anahtar); bulutModeliKaydet(saglayici, model); update({ ...prefs, dictationEngine: 'cloud', dictationCloud: saglayici }); }}
                    className="btn btn-primary min-h-[44px] gap-1.5 px-4 text-sm">
                    {bulutSecili && prefs.dictationCloud === saglayici ? <><Check size={15} /> Bu motor kullanılıyor</> : <><Cloud size={15} /> {bilgi.ad} kullan</>}
                </button>
            </div>
            {deneme && <SettingsNote tone={deneme.durum === 'hata' ? 'error' : deneme.durum === 'ok' ? 'ok' : 'info'}>{deneme.durum === 'ok' ? 'Duyulan: ' : ''}{deneme.metin}</SettingsNote>}
        </div>}

        {sekme === 'yerel' && <div role="tabpanel" className="space-y-2">
            <p className="text-xs leading-relaxed text-sand-600">İndirip internetsiz kullanılan ses tanıma modeli: <strong>Whisper Türkçe</strong> (base ~160 MB, small ~375 MB). Bir sonraki sürümde buradan indirilebilecek.</p>
            <p className="text-xs leading-relaxed text-sand-600">O zamana kadar internetsiz dikte için <strong>Telefon → Yalnızca cihaz içi</strong> motorunu kullanabilirsiniz.</p>
        </div>}
    </div>;
}
