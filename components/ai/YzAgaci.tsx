'use client';

/**
 * YZ ağacı ekranları: sohbet ve ayarlar (sistem talimatı, eğitim belgeleri).
 *
 * Kartlar ve liste satırları yalnız `yzAc(id)` olayını yollar; bu katman
 * sayfada bir kez bulunur ve ilgili ekranı açar. Böylece tuval, liste ve
 * seçili not paneli aynı ekranı kullanır.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, BookOpen, Check, ClipboardPaste, Copy, FileText, FileUp, Loader2, MessageCircle, RotateCcw, Settings2, Sparkles, Square, Trash2, X } from 'lucide-react';
import AiDialog from './AiDialog';
import BilgeMarkdown from './BilgeMarkdown';
import { RENKLER, SIMGELER, YzRozet, dugumDerinligi, yzIkon, yzTema } from './yzProfil';
import { useStore } from '@/lib/store/useStore';
import { aiChatPaylasimOnayi, readAiMode } from '@/lib/aiMode';
import {
    BELGE_SINIRI, TALIMAT_SINIRI, TOPLAM_BELGE_SINIRI, YZ_AC_OLAYI, belgeEkle, belgeSil, dosyaMetni, sohbetOku, sohbetYaz,
    useYzAgaclari, yzAyarKaydet, yzSor, type YzAyar, type YzMesaj
} from '@/lib/yzAgaci';

type Acik = { id: string; ekran: 'sohbet' | 'ayarlar' };

export { YzRozet } from './yzProfil';

const binler = (n: number) => n >= 1000 ? (n / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' bin' : String(n);

/** Sayfaya bir kez yerleştirilir; `yzAc` ile açılır. */
export default function YzAgaciKatmani() {
    const [acik, setAcik] = useState<Acik | null>(null);
    useEffect(() => {
        const ac = (e: Event) => setAcik((e as CustomEvent<Acik>).detail);
        window.addEventListener(YZ_AC_OLAYI, ac);
        return () => window.removeEventListener(YZ_AC_OLAYI, ac);
    }, []);
    const nodes = useStore(s => s.nodes);
    const node = acik ? nodes.find(n => n.id === acik.id && !n.deleted_at) : undefined;
    // Not silinirse ekran kendiliğinden kapanır.
    useEffect(() => { if (acik && !node) setAcik(null); }, [acik, node]);
    if (!acik || !node) return null;
    const ad = node.content.split('\n')[0] || 'YZ ağacı';
    const derinlik = dugumDerinligi(node.id, nodes);
    return acik.ekran === 'ayarlar'
        ? <YzAyarlari key={'a' + node.id} derinlik={derinlik} id={node.id} ad={ad} icerik={node.content} onKapat={() => setAcik(null)} onSohbet={() => setAcik({ id: node.id, ekran: 'sohbet' })} />
        : <YzSohbet key={'s' + node.id} derinlik={derinlik} id={node.id} ad={ad} onKapat={() => setAcik(null)} onAyarlar={() => setAcik({ id: node.id, ekran: 'ayarlar' })} />;
}

const ikonDugme = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sand-700 transition-colors hover:bg-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40 disabled:opacity-35';

function YzSohbet({ id, ad, derinlik, onKapat, onAyarlar }: { id: string; ad: string; derinlik: number; onKapat: () => void; onAyarlar: () => void }) {
    const ayar: YzAyar | undefined = useYzAgaclari()[id];
    const [mesajlar, setMesajlar] = useState<YzMesaj[]>(() => sohbetOku(id));
    const [girdi, setGirdi] = useState('');
    const [bekliyor, setBekliyor] = useState(false);
    const [hata, setHata] = useState('');
    const [kopyalanan, setKopyalanan] = useState<number | null>(null);
    const kontrol = useRef<AbortController | null>(null);
    const akis = useRef<HTMLDivElement>(null);
    const girdiRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => () => kontrol.current?.abort(), []);
    useEffect(() => { akis.current?.scrollTo({ top: akis.current.scrollHeight, behavior: 'smooth' }); }, [mesajlar, bekliyor, hata]);
    useEffect(() => {
        const el = girdiRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 132) + 'px';
    }, [girdi]);

    const belgeSayisi = ayar?.belgeler.length ?? 0;
    const egitilmis = belgeSayisi > 0 || !!ayar?.talimat.trim();
    const altBaslik = [belgeSayisi ? `${belgeSayisi} belge` : 'Belge yok', ayar?.talimat.trim() ? 'talimatlı' : '', readAiMode() === 'personal' ? 'Kişisel AI' : 'Hazır AI'].filter(Boolean).join(' · ');
    const oneriler = belgeSayisi ? ['Belgeleri kısaca özetle', 'Bu belgelerde hangi konular var?', 'En önemli 5 noktayı maddele'] : ['Kendini tanıt', 'Bana nasıl yardımcı olabilirsin?'];

    const gonder = async (metin = girdi) => {
        const soru = metin.trim();
        if (!soru || bekliyor) return;
        if (!aiChatPaylasimOnayi()) return;
        const onceki = mesajlar;
        const yeni = [...onceki, { rol: 'kullanici' as const, metin: soru, zaman: Date.now() }];
        setMesajlar(yeni); sohbetYaz(id, yeni); setGirdi(''); setHata(''); setBekliyor(true);
        const iptal = new AbortController(); kontrol.current = iptal;
        try {
            const yanit = await yzSor(id, ad, onceki, soru, iptal.signal);
            const son = [...yeni, { rol: 'asistan' as const, metin: yanit.metin, zaman: Date.now(), ...(yanit.kaynaklar.length ? { kaynaklar: yanit.kaynaklar } : {}) }];
            setMesajlar(son); sohbetYaz(id, son);
        } catch (e) {
            if (!iptal.signal.aborted) setHata(e instanceof Error ? e.message : 'Yanıt alınamadı.');
        } finally { setBekliyor(false); kontrol.current = null; }
    };
    const yenidenDene = () => {
        const sonSoru = [...mesajlar].reverse().find(m => m.rol === 'kullanici');
        if (!sonSoru) return;
        const kalan = mesajlar.slice(0, mesajlar.lastIndexOf(sonSoru));
        setMesajlar(kalan); sohbetYaz(id, kalan);
        void gonder(sonSoru.metin);
    };
    const kopyala = (i: number, metin: string) => { void navigator.clipboard.writeText(metin); setKopyalanan(i); setTimeout(() => setKopyalanan(null), 1400); };

    return <AiDialog fullscreen label={ad + ' sohbeti'} onClose={onKapat}><div className="contents" style={yzTema(ayar?.renk)}>
        <header className="flex shrink-0 items-center gap-2 border-b border-sand-200 bg-white/90 px-2 pb-2 pt-[calc(env(safe-area-inset-top,0px)+8px)] backdrop-blur sm:pt-2">
            <button type="button" onClick={onKapat} aria-label="Kapat" className={ikonDugme}><X size={20} /></button>
            <YzRozet ayar={ayar} derinlik={derinlik} boyut={38} />
            <div className="min-w-0 flex-1 pl-1">
                <h2 className="truncate text-[15px] font-semibold text-sand-900">{ad}</h2>
                <p className="truncate text-[11.5px] text-sand-500">{altBaslik}</p>
            </div>
            <button type="button" onClick={() => { kontrol.current?.abort(); setMesajlar([]); sohbetYaz(id, []); setHata(''); }} disabled={!mesajlar.length || bekliyor} aria-label="Sohbeti temizle" title="Sohbeti temizle" className={ikonDugme}><RotateCcw size={18} /></button>
            <button type="button" onClick={onAyarlar} aria-label="YZ ayarları" title="YZ ayarları" className={ikonDugme}><Settings2 size={19} /></button>
        </header>

        <div ref={akis} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
            <div className="mx-auto flex max-w-2xl flex-col gap-4">
                {!mesajlar.length && <div className="flex flex-col items-center pt-6 text-center">
                    <YzRozet ayar={ayar} derinlik={derinlik} boyut={72} />
                    <h3 className="mt-4 font-serif text-2xl text-sand-900">{ad}</h3>
                    <p className="mt-1.5 max-w-sm text-sm leading-6 text-sand-600">{egitilmis ? 'Talimatına ve yüklediğin belgelere göre yanıt veririm. Bir soru sor.' : 'Henüz eğitilmedim. Bana bir rol ver ve belgelerini yükle; sonra yalnız senin içeriğinle konuşayım.'}</p>
                    {!egitilmis && <button type="button" onClick={onAyarlar} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[linear-gradient(135deg,rgb(var(--yz-1)),rgb(var(--yz-2)))] px-5 text-sm font-semibold text-[rgb(var(--yz-yazi))] shadow-[0_10px_24px_-12px_rgb(var(--yz-2))] active:scale-[.98]"><BookOpen size={16} />Eğitim belgesi ve talimat ekle</button>}
                    <div className="mt-6 flex w-full max-w-md flex-wrap justify-center gap-2">
                        {oneriler.map(o => <button key={o} type="button" onClick={() => void gonder(o)} className="min-h-10 rounded-full border border-sand-200 bg-white px-3.5 text-[13px] text-sand-800 shadow-soft transition-colors hover:border-[rgb(var(--yz-1)/.4)] hover:bg-[rgb(var(--yz-acik))]">{o}</button>)}
                    </div>
                </div>}

                {mesajlar.map((m, i) => m.rol === 'kullanici'
                    ? <div key={i} className="flex justify-end pl-10"><p className="whitespace-pre-wrap break-words rounded-[20px] rounded-br-md bg-[linear-gradient(135deg,rgb(var(--yz-1)),rgb(var(--yz-2)))] px-4 py-2.5 text-[14.5px] leading-6 text-[rgb(var(--yz-yazi))] shadow-[0_8px_18px_-12px_rgb(var(--yz-2))]">{m.metin}</p></div>
                    : <article key={i} className="flex gap-2.5 pr-2" aria-label={ad + ' yanıtı'}>
                        <YzRozet ayar={ayar} derinlik={derinlik} boyut={28} className="mt-1" />
                        <div className="min-w-0 flex-1">
                            <div className="rounded-[20px] rounded-tl-md border border-sand-200 bg-white px-4 py-3 text-sand-800 shadow-soft"><BilgeMarkdown text={m.metin} /></div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-1">
                                <button type="button" onClick={() => kopyala(i, m.metin)} className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-[11.5px] text-sand-500 hover:bg-sand-100 hover:text-sand-800">{kopyalanan === i ? <Check size={13} /> : <Copy size={13} />}{kopyalanan === i ? 'Kopyalandı' : 'Kopyala'}</button>
                                {m.kaynaklar?.map(k => <span key={k} className="inline-flex max-w-[180px] items-center gap-1 rounded-full bg-[rgb(var(--yz-acik))] px-2 py-0.5 text-[11px] font-medium text-[rgb(var(--yz-koyu))]"><FileText size={11} className="shrink-0" /><span className="truncate">{k}</span></span>)}
                            </div>
                        </div>
                    </article>)}

                {bekliyor && <div className="flex items-center gap-2.5" role="status"><YzRozet ayar={ayar} derinlik={derinlik} boyut={28} /><span className="inline-flex items-center gap-1 rounded-full border border-sand-200 bg-white px-4 py-3 shadow-soft"><Loader2 size={15} className="animate-spin text-[rgb(var(--yz-1))]" /><span className="text-[13px] text-[rgb(var(--yz-koyu))]">Bir fikir filizleniyor…</span></span></div>}
                {hata && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-berry-200 bg-berry-50 px-4 py-3 text-sm text-berry-800">
                    <span className="min-w-0 flex-1 leading-6">{hata}</span>
                    <button type="button" onClick={yenidenDene} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-white px-3 text-xs font-semibold text-berry-700 ring-1 ring-berry-200"><RotateCcw size={13} />Tekrar</button>
                </div>}
            </div>
        </div>

        <form onSubmit={e => { e.preventDefault(); void gonder(); }} className="shrink-0 border-t border-sand-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] pt-2.5 backdrop-blur">
            <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-[24px] border border-sand-200 bg-sand-50 p-1.5 pl-4 focus-within:border-[rgb(var(--yz-1)/.5)] focus-within:ring-4 focus-within:ring-[rgb(var(--yz-1)/.12)]">
                <label htmlFor="yz-girdi" className="sr-only">{ad} için mesaj</label>
                <textarea id="yz-girdi" ref={girdiRef} data-autofocus value={girdi} onChange={e => setGirdi(e.target.value)} rows={1} maxLength={4000} placeholder={`${ad} ağacına sor…`}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) { e.preventDefault(); void gonder(); } }}
                    className="max-h-[132px] min-h-11 min-w-0 flex-1 resize-none bg-transparent py-2.5 text-base leading-6 text-sand-900 outline-none placeholder:text-sand-400" />
                {bekliyor
                    ? <button type="button" onClick={() => kontrol.current?.abort()} aria-label="Durdur" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sand-200 text-sand-800"><Square size={15} fill="currentColor" /></button>
                    : <button type="submit" disabled={!girdi.trim()} aria-label="Gönder" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgb(var(--yz-1)),rgb(var(--yz-2)))] text-[rgb(var(--yz-yazi))] shadow-[0_8px_18px_-10px_rgb(var(--yz-2))] transition-opacity disabled:opacity-35"><ArrowUp size={19} /></button>}
            </div>
            <p className="mx-auto mt-1.5 max-w-2xl px-2 text-center text-[10.5px] text-sand-500">Yapay zekâ yanılabilir. Sorunla ilgili belge bölümleri seçili yapay zekâ sağlayıcısına gönderilir.</p>
        </form>
    </div></AiDialog>;
}

const SABLONLAR: { ad: string; metin: string }[] = [
    { ad: 'Öğretmen', metin: 'Sabırlı bir öğretmensin. Konuları yüklenen ders notlarına göre basitten zora anlat, her yanıtın sonunda kısa bir soru sorarak öğrenip öğrenmediğimi yokla.' },
    { ad: 'Destek uzmanı', metin: 'Bir müşteri destek uzmanısın. Yalnızca yüklenen ürün belgelerine göre kibar, net ve adım adım çözüm öner. Bilmediğin konuda yetkiliye yönlendir.' },
    { ad: 'Özetleyici', metin: 'Belgeleri okuyup özünü çıkaran bir editörsün. Yanıtlarını başlıklar ve kısa maddelerle ver, önemli sayıları ve tarihleri koru.' },
    { ad: 'Sınav koçu', metin: 'Bir sınav koçusun. Belgelerden çoktan seçmeli ve açık uçlu sorular hazırla; cevabımı değerlendirip doğrusunu açıkla.' }
];

function YzAyarlari({ id, ad, derinlik, icerik, onKapat, onSohbet }: { id: string; ad: string; derinlik: number; icerik: string; onKapat: () => void; onSohbet: () => void }) {
    const ayar: YzAyar | undefined = useYzAgaclari()[id];
    const updateNode = useStore(s => s.updateNode);
    const [isim, setIsim] = useState(ad);
    const [talimat, setTalimat] = useState(ayar?.talimat ?? '');
    const [yapistir, setYapistir] = useState<{ ad: string; metin: string } | null>(null);
    const [mesgul, setMesgul] = useState(false);
    const [bildiri, setBildiri] = useState<{ ton: 'ok' | 'hata'; metin: string } | null>(null);
    const dosyaRef = useRef<HTMLInputElement>(null);
    const belgeler = useMemo(() => [...(ayar?.belgeler ?? [])].sort((a, b) => b.eklenme - a.eklenme), [ayar?.belgeler]);
    const kullanim = belgeler.reduce((t, b) => t + b.karakter, 0);

    // Talimat yazarken kısa aralıkla kaydedilir; pencere kapanırken de.
    useEffect(() => {
        if (talimat === (ayar?.talimat ?? '')) return;
        const t = setTimeout(() => yzAyarKaydet(id, { talimat }), 400);
        return () => clearTimeout(t);
    }, [talimat, id, ayar?.talimat]);
    const adKaydet = () => {
        const yeni = isim.trim() || 'YZ ağacı';
        if (yeni === ad) return;
        const satirlar = icerik.split('\n'); satirlar[0] = yeni;
        void updateNode(id, satirlar.join('\n'));
    };
    const kapat = () => { yzAyarKaydet(id, { talimat }); adKaydet(); onKapat(); };
    const sohbeteGec = () => { yzAyarKaydet(id, { talimat }); adKaydet(); onSohbet(); };
    const bildir = (ton: 'ok' | 'hata', metin: string) => { setBildiri({ ton, metin }); setTimeout(() => setBildiri(b => (b?.metin === metin ? null : b)), 4200); };

    const dosyalar = async (liste: FileList | null) => {
        if (!liste?.length) return;
        setMesgul(true);
        let eklenen = 0; const hatalar: string[] = [];
        for (const dosya of Array.from(liste)) {
            try { await belgeEkle(id, dosya.name.replace(/\.[^.]+$/, ''), await dosyaMetni(dosya)); eklenen++; }
            catch (e) { hatalar.push(e instanceof Error ? e.message : `"${dosya.name}" eklenemedi.`); }
        }
        setMesgul(false);
        if (dosyaRef.current) dosyaRef.current.value = '';
        if (hatalar.length) bildir('hata', hatalar.join(' '));
        else bildir('ok', eklenen === 1 ? 'Belge eklendi.' : `${eklenen} belge eklendi.`);
    };
    const metinEkle = async () => {
        if (!yapistir) return;
        setMesgul(true);
        try { await belgeEkle(id, yapistir.ad || 'Yapıştırılan metin', yapistir.metin); setYapistir(null); bildir('ok', 'Metin belge olarak eklendi.'); }
        catch (e) { bildir('hata', e instanceof Error ? e.message : 'Metin eklenemedi.'); }
        finally { setMesgul(false); }
    };

    const kart = 'rounded-[22px] border border-sand-200 bg-white p-4 shadow-soft sm:p-5';
    const baslik = 'flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[.07em] text-sand-500';
    return <AiDialog fullscreen label={ad + ' YZ ayarları'} onClose={kapat}><div className="contents" style={yzTema(ayar?.renk)}>
        <header className="relative shrink-0 overflow-hidden bg-[linear-gradient(150deg,rgb(var(--yz-1)),rgb(var(--yz-2))_55%,rgb(var(--yz-3)))] px-3 pb-5 pt-[calc(env(safe-area-inset-top,0px)+8px)] text-[rgb(var(--yz-yazi))] sm:pt-3">
            <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-[rgb(var(--yz-isik)/.22)] blur-3xl" />
            <Sparkles aria-hidden="true" size={120} strokeWidth={1} className="pointer-events-none absolute -bottom-8 right-2 text-white/[.06]" />
            <div className="relative flex items-center gap-1">
                <button type="button" onClick={kapat} aria-label="Kapat" className="flex h-11 w-11 items-center justify-center rounded-full text-[rgb(var(--yz-yazi))] hover:bg-white/10"><X size={20} /></button>
                <p className="flex-1 text-[12px] font-semibold uppercase tracking-[.12em] text-[rgb(var(--yz-soluk))]">YZ ağacı ayarları</p>
                <button type="button" onClick={sohbeteGec} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/10 px-4 text-[13px] font-semibold ring-1 ring-white/20 hover:bg-white/20"><MessageCircle size={15} />Sohbet</button>
            </div>
            <div className="relative mt-3 flex items-center gap-3 px-2">
                <YzRozet ayar={ayar} derinlik={derinlik} boyut={54} className="ring-1 ring-white/20" />
                <div className="min-w-0 flex-1">
                    <label htmlFor="yz-ad" className="text-[11px] font-medium text-[rgb(var(--yz-soluk))]">Ağacın adı</label>
                    <input id="yz-ad" value={isim} onChange={e => setIsim(e.target.value)} onBlur={adKaydet} maxLength={80}
                        className="mt-0.5 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 font-serif text-xl font-semibold text-[rgb(var(--yz-yazi))] outline-none placeholder:text-white/40 focus:border-white/40 focus:bg-white/15" placeholder="Örn. Hukuk Asistanı" />
                </div>
            </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-paper px-3 py-4 sm:px-5">
            <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-6">
                <section className={kart} aria-labelledby="yz-profil-baslik">
                    <h3 id="yz-profil-baslik" className={baslik}><Sparkles size={15} />Profil</h3>
                    <p className="mt-1.5 text-[13px] leading-5 text-sand-600">Simge seçmezseniz yerine göre gelir: kökte ağaç, dalda dal, daha derinde yaprak.</p>
                    <div role="radiogroup" aria-label="Profil simgesi" className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-9">
                        {[{ id: '', ad: 'Otomatik', Ikon: yzIkon(undefined, derinlik) }, ...SIMGELER].map(({ id: sid, ad: sad, Ikon }) => {
                            const secili = (ayar?.simge ?? '') === sid;
                            return <button key={sid || 'oto'} type="button" role="radio" aria-checked={secili} aria-label={sad} title={sad} onClick={() => yzAyarKaydet(id, { simge: sid || undefined })}
                                className={'relative flex aspect-square items-center justify-center rounded-2xl transition-all ' + (secili ? 'bg-[linear-gradient(145deg,rgb(var(--yz-1)),rgb(var(--yz-2)))] text-[rgb(var(--yz-yazi))] shadow-[0_8px_18px_-10px_rgb(var(--yz-2))] ring-2 ring-[rgb(var(--yz-isik))]' : 'bg-[rgb(var(--yz-acik))] text-[rgb(var(--yz-koyu))] hover:brightness-95')}>
                                <Ikon size={20} strokeWidth={1.9} />
                                {!sid && <span className="absolute bottom-0.5 text-[8px] font-bold uppercase tracking-wide opacity-80">oto</span>}
                            </button>;
                        })}
                    </div>
                    <p className="mt-4 text-sm font-medium text-sand-900">Renk</p>
                    <div role="radiogroup" aria-label="Profil rengi" className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {RENKLER.map(rk => {
                            const secili = (ayar?.renk ?? 'gece') === rk.id;
                            return <button key={rk.id} type="button" role="radio" aria-checked={secili} onClick={() => yzAyarKaydet(id, { renk: rk.id })}
                                className={'flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border px-1.5 text-[12.5px] font-semibold transition-colors ' + (secili ? 'border-[rgb(var(--yz-1))] bg-[rgb(var(--yz-acik))] text-[rgb(var(--yz-koyu))]' : 'border-sand-200 bg-white text-sand-700 hover:border-sand-300')}>
                                <span aria-hidden="true" style={yzTema(rk.id)} className="h-5 w-5 shrink-0 rounded-full bg-[linear-gradient(145deg,rgb(var(--yz-1)),rgb(var(--yz-3)))] ring-2 ring-white" />{rk.ad}
                            </button>;
                        })}
                    </div>
                </section>


                <section className={kart} aria-labelledby="yz-talimat-baslik">
                    <h3 id="yz-talimat-baslik" className={baslik}><Settings2 size={15} />Sistem talimatı</h3>
                    <p className="mt-1.5 text-[13px] leading-5 text-sand-600">Bu ağacın kim olduğunu, nasıl konuşacağını ve hangi kurallara uyacağını yazın.</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {SABLONLAR.map(s => <button key={s.ad} type="button" onClick={() => setTalimat(s.metin)} className="min-h-9 rounded-full bg-[rgb(var(--yz-acik))] px-3 text-[12.5px] font-medium text-[rgb(var(--yz-koyu))] transition-transform active:scale-95">{s.ad}</button>)}
                    </div>
                    <textarea value={talimat} onChange={e => setTalimat(e.target.value.slice(0, TALIMAT_SINIRI))} rows={6} aria-label="Sistem talimatı"
                        placeholder="Örn. Sen bir beslenme uzmanısın. Yalnızca yüklediğim menü ve tarif belgelerine göre öneri ver, kalori bilgisini her zaman belirt."
                        className="mt-3 w-full resize-y rounded-2xl border border-sand-200 bg-sand-50 px-3.5 py-3 text-[14.5px] leading-6 text-sand-900 outline-none placeholder:text-sand-400 focus:border-[rgb(var(--yz-1)/.5)] focus:bg-white focus:ring-4 focus:ring-[rgb(var(--yz-1)/.1)]" />
                    <p className="mt-1 text-right text-[11px] text-sand-500">{talimat.length} / {TALIMAT_SINIRI}</p>
                </section>

                <section className={kart} aria-labelledby="yz-belge-baslik">
                    <div className="flex items-center gap-2">
                        <h3 id="yz-belge-baslik" className={baslik + ' flex-1'}><BookOpen size={15} />Eğitim belgeleri</h3>
                        <span className="text-[11.5px] text-sand-500">{belgeler.length} belge</span>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-5 text-sand-600">Ağaç sorulara bu belgelere dayanarak yanıt verir. Her soruda belgelerin yalnız ilgili bölümleri kullanılır.</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <button type="button" disabled={mesgul} onClick={() => dosyaRef.current?.click()} className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[rgb(var(--yz-1)/.35)] bg-[rgb(var(--yz-acik)/.6)] text-[13.5px] font-semibold text-[rgb(var(--yz-koyu))] transition-colors hover:bg-[rgb(var(--yz-acik))] disabled:opacity-50">{mesgul ? <Loader2 size={17} className="animate-spin" /> : <FileUp size={17} />}Dosya yükle</button>
                        <button type="button" disabled={mesgul} onClick={() => setYapistir({ ad: '', metin: '' })} className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-sand-200 bg-sand-50 text-[13.5px] font-semibold text-sand-800 hover:bg-sand-100 disabled:opacity-50"><ClipboardPaste size={17} />Metin yapıştır</button>
                    </div>
                    <input ref={dosyaRef} type="file" multiple hidden accept=".pdf,.docx,application/pdf,.txt,.md,.markdown,.csv,.tsv,.json,.html,.htm,.xml,.log,.srt,.yaml,.yml,text/*" onChange={e => void dosyalar(e.target.files)} />
                    <p className="mt-1.5 text-[11px] text-sand-500">PDF, Word (.docx), .txt, .md, .csv, .json · belge başına {binler(BELGE_SINIRI)} karakter.</p>

                    {yapistir && <div className="mt-3 rounded-2xl border border-[rgb(var(--yz-1)/.3)] bg-[rgb(var(--yz-acik)/.5)] p-3">
                        <input value={yapistir.ad} onChange={e => setYapistir({ ...yapistir, ad: e.target.value })} placeholder="Belge adı (örn. Ürün kataloğu)" maxLength={80} aria-label="Belge adı"
                            className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2.5 text-sm text-sand-900 outline-none focus:border-[rgb(var(--yz-1)/.5)]" />
                        <textarea value={yapistir.metin} onChange={e => setYapistir({ ...yapistir, metin: e.target.value })} rows={6} placeholder="Metni buraya yapıştırın…" aria-label="Belge metni" autoFocus
                            className="mt-2 w-full resize-y rounded-xl border border-sand-200 bg-white px-3 py-2.5 text-sm leading-6 text-sand-900 outline-none focus:border-[rgb(var(--yz-1)/.5)]" />
                        <div className="mt-2 flex items-center justify-end gap-2">
                            <span className="mr-auto text-[11px] text-sand-500">{binler(yapistir.metin.length)} karakter</span>
                            <button type="button" onClick={() => setYapistir(null)} className="min-h-10 rounded-full px-4 text-sm text-sand-700 hover:bg-sand-100">Vazgeç</button>
                            <button type="button" disabled={!yapistir.metin.trim() || mesgul} onClick={() => void metinEkle()} className="min-h-10 rounded-full bg-[rgb(var(--yz-2))] px-4 text-sm font-semibold text-[rgb(var(--yz-yazi))] disabled:opacity-40">Ekle</button>
                        </div>
                    </div>}

                    {bildiri && <p role="status" className={'mt-3 rounded-xl px-3 py-2 text-[13px] leading-5 ' + (bildiri.ton === 'ok' ? 'bg-moss-50 text-moss-800' : 'bg-berry-50 text-berry-800')}>{bildiri.metin}</p>}

                    {belgeler.length > 0 && <>
                        <ul className="mt-3 divide-y divide-sand-100 overflow-hidden rounded-2xl border border-sand-200">
                            {belgeler.map(b => <li key={b.id} className="flex items-center gap-3 bg-white py-2.5 pl-3 pr-1">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--yz-acik))] text-[rgb(var(--yz-koyu))]"><FileText size={17} /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-sand-900">{b.ad}</span>
                                    <span className="block text-[11.5px] text-sand-500">{binler(b.karakter)} karakter · {new Date(b.eklenme).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                                </span>
                                <button type="button" onClick={() => { if (window.confirm(`"${b.ad}" belgesi silinsin mi?`)) void belgeSil(id, b.id); }} aria-label={b.ad + ' belgesini sil'} className="flex h-11 w-11 items-center justify-center rounded-full text-sand-500 hover:bg-berry-50 hover:text-berry-600"><Trash2 size={17} /></button>
                            </li>)}
                        </ul>
                        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-sand-500">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand-100"><span className="block h-full rounded-full bg-[linear-gradient(90deg,rgb(var(--yz-1)),rgb(var(--yz-isik)))]" style={{ width: Math.min(100, (kullanim / TOPLAM_BELGE_SINIRI) * 100) + '%' }} /></span>
                            {binler(kullanim)} / {binler(TOPLAM_BELGE_SINIRI)}
                        </div>
                    </>}
                </section>

                <section className={kart} aria-labelledby="yz-davranis-baslik">
                    <h3 id="yz-davranis-baslik" className={baslik}><Sparkles size={15} />Yanıt davranışı</h3>
                    <label className="mt-3 flex min-h-12 cursor-pointer items-center gap-3">
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-sand-900">Yalnız belgelere dayan</span>
                            <span className="block text-[12px] leading-5 text-sand-500">Belgede olmayan konularda “bilmiyorum” der, tahmin yürütmez.</span>
                        </span>
                        <input type="checkbox" checked={ayar?.yalnizBelge ?? false} onChange={e => yzAyarKaydet(id, { yalnizBelge: e.target.checked })} className="peer sr-only" />
                        <span aria-hidden="true" className="relative h-7 w-12 shrink-0 rounded-full bg-sand-300 transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-[rgb(var(--yz-2))] peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-[rgb(var(--yz-1)/.5)]" />
                    </label>
                    <p className="mt-3 text-sm font-medium text-sand-900">Yanıt uzunluğu</p>
                    <div role="radiogroup" aria-label="Yanıt uzunluğu" className="mt-2 grid grid-cols-3 gap-1 rounded-2xl bg-sand-100 p-1">
                        {(['kisa', 'orta', 'uzun'] as const).map(u => <button key={u} type="button" role="radio" aria-checked={(ayar?.uzunluk ?? 'orta') === u} onClick={() => yzAyarKaydet(id, { uzunluk: u })}
                            className={'min-h-10 rounded-xl text-[13px] font-semibold transition-colors ' + ((ayar?.uzunluk ?? 'orta') === u ? 'bg-white text-[rgb(var(--yz-2))] shadow-soft' : 'text-sand-600')}>{u === 'kisa' ? 'Kısa' : u === 'orta' ? 'Orta' : 'Ayrıntılı'}</button>)}
                    </div>
                </section>

                <p className="px-2 text-[11.5px] leading-5 text-sand-500">Profil, talimat ve belgeler Google Drive yedeği açıksa diğer cihazlarınızla eşitlenir; sohbet geçmişi yalnız bu cihazda kalır. Soru sorduğunuzda talimat ve belgelerin ilgili bölümleri, Ayarlar → Yapay zekâ bölümünde seçili sağlayıcıya gönderilir.</p>
                <button type="button" onClick={sohbeteGec} className="mx-auto inline-flex min-h-12 items-center gap-2 rounded-full bg-[linear-gradient(135deg,rgb(var(--yz-1)),rgb(var(--yz-2)))] px-7 text-[15px] font-semibold text-[rgb(var(--yz-yazi))] shadow-[0_12px_28px_-14px_rgb(var(--yz-2))] active:scale-[.98]"><MessageCircle size={18} />Sohbete başla</button>
            </div>
        </div>
    </div></AiDialog>;
}
