'use client';

/**
 * Ağaç Yönetimi → Görünüm sekmesi: düzen, kart tasarımı (açık/koyu tema için
 * ayrı), not düğmeleri ve ayrıntılar (önizleme, gezinme, budanan notlar).
 * Ana Ayarlar ekranıyla aynı yapı taşları (SettingsSection) kullanılır.
 * Tercihler cihazda tutulur.
 */
import { useEffect, useState } from 'react';
import { GitFork, MousePointerClick, Palette, SlidersHorizontal } from 'lucide-react';
import { BudananlarDugmesi } from '@/components/ui/BudananlarDugmesi';
import { SettingsSection, cx } from '@/components/ui/settings';
import { tuvalTercihleriniKaydet, useKoyuTema, useTuvalTercihleri } from '@/lib/tuvalTercihleri';
import type { TuvalEylem, TuvalGezinme, TuvalGosterim, TuvalKart, TuvalOnizleme } from '@/lib/tuvalTercihleri';

const GOSTERIMLER: { id: TuvalGosterim; ad: string; aciklama: string; resim: React.ReactNode }[] = [
    {
        id: 'organik', ad: 'Organik', aciklama: 'Kökten dallar açılır, yapraklar dalın ortasından asılır',
        resim: <svg viewBox="0 0 120 64" aria-hidden="true"><rect x="44" y="5" width="32" height="10" rx="4" fill="rgb(var(--moss-700))" /><path d="M60 15 C60 24 22 20 22 29M60 15V29M60 15 C60 24 98 20 98 29" stroke="rgb(var(--moss-600))" strokeWidth="2.4" fill="none" /><rect x="10" y="29" width="24" height="9" rx="3" fill="rgb(var(--clay-200))" /><rect x="48" y="29" width="24" height="9" rx="3" fill="rgb(var(--clay-200))" /><rect x="86" y="29" width="24" height="9" rx="3" fill="rgb(var(--clay-200))" /><path d="M22 38V44M22 50V52M60 38V44M98 38V44" stroke="rgb(var(--moss-400))" strokeWidth="1.6" /><rect x="12" y="44" width="20" height="6" rx="2" fill="rgb(var(--moss-200))" /><rect x="12" y="52" width="20" height="6" rx="2" fill="rgb(var(--moss-200))" /><rect x="50" y="44" width="20" height="6" rx="2" fill="rgb(var(--moss-200))" /><rect x="88" y="44" width="20" height="6" rx="2" fill="rgb(var(--moss-200))" /></svg>
    },
    {
        id: 'yatay', ad: 'Yatay akış', aciklama: 'Soldan sağa; ağaçlar alt alta',
        resim: <svg viewBox="0 0 120 64" aria-hidden="true"><rect x="6" y="24" width="22" height="16" rx="4" fill="rgb(var(--moss-700))" /><path d="M28 32C38 32 36 14 46 14M28 32H46M28 32C38 32 36 50 46 50" stroke="rgb(var(--moss-600))" strokeWidth="2.2" fill="none" /><rect x="46" y="10" width="24" height="8" rx="3" fill="rgb(var(--clay-200))" /><rect x="46" y="28" width="24" height="8" rx="3" fill="rgb(var(--clay-200))" /><rect x="46" y="46" width="24" height="8" rx="3" fill="rgb(var(--clay-200))" /><path d="M70 14C78 14 76 8 84 8M70 14C78 14 76 20 84 20M70 32H84M70 50H84" stroke="rgb(var(--moss-400))" strokeWidth="1.5" fill="none" /><rect x="84" y="5" width="30" height="6" rx="2" fill="rgb(var(--moss-200))" /><rect x="84" y="17" width="30" height="6" rx="2" fill="rgb(var(--moss-200))" /><rect x="84" y="29" width="30" height="6" rx="2" fill="rgb(var(--moss-200))" /><rect x="84" y="47" width="30" height="6" rx="2" fill="rgb(var(--moss-200))" /></svg>
    },
    {
        id: 'klasik', ad: 'Klasik', aciklama: 'Önceki düzen: yalnız başlıklı kartlar',
        resim: <svg viewBox="0 0 120 64" aria-hidden="true"><rect x="42" y="6" width="36" height="12" rx="4" fill="rgb(var(--moss-700))" /><path d="M60 18V26M24 26H96M24 26V32M60 26V32M96 26V32" stroke="rgb(var(--sand-400))" strokeWidth="1.6" fill="none" /><rect x="8" y="32" width="32" height="9" rx="3" fill="#fff" stroke="rgb(var(--clay-400))" /><rect x="44" y="32" width="32" height="9" rx="3" fill="#fff" stroke="rgb(var(--clay-400))" /><rect x="80" y="32" width="32" height="9" rx="3" fill="#fff" stroke="rgb(var(--clay-400))" /><path d="M24 41V48M14 48H34M14 48V52M34 48V52" stroke="rgb(var(--sand-400))" strokeWidth="1.4" fill="none" /><rect x="4" y="52" width="20" height="7" rx="2" fill="#fff" stroke="rgb(var(--sand-300))" /><rect x="26" y="52" width="20" height="7" rx="2" fill="#fff" stroke="rgb(var(--sand-300))" /></svg>
    }
];
const EYLEMLER: { id: TuvalEylem; ad: string; aciklama: string; resim: React.ReactNode }[] = [
    {
        id: 'hap', ad: 'Kart üstünde', aciklama: 'Üstte küçük hap, kenarlarda + Yan ve + Alt',
        resim: <svg viewBox="0 0 120 64" aria-hidden="true"><rect x="38" y="6" width="44" height="12" rx="6" fill="rgb(var(--sand-900))" /><circle cx="50" cy="12" r="2" fill="#fff" /><circle cx="60" cy="12" r="2" fill="#fff" /><circle cx="70" cy="12" r="2" fill="#fff" /><rect x="34" y="24" width="52" height="22" rx="6" fill="#fff" stroke="rgb(var(--moss-500))" strokeWidth="2" /><circle cx="86" cy="35" r="6" fill="rgb(var(--moss-600))" /><circle cx="60" cy="46" r="6" fill="rgb(var(--moss-600))" /><path d="M86 32v6M83 35h6M60 43v6M57 46h6" stroke="#fff" strokeWidth="1.6" /></svg>
    },
    {
        id: 'panel', ad: 'Alttan panel', aciklama: 'Dokununca alttan büyük, yazılı düğmeler',
        resim: <svg viewBox="0 0 120 64" aria-hidden="true"><rect x="34" y="6" width="52" height="16" rx="5" fill="#fff" stroke="rgb(var(--moss-500))" strokeWidth="2" /><rect x="6" y="30" width="108" height="34" rx="8" fill="#fff" stroke="rgb(var(--sand-200))" /><rect x="14" y="36" width="92" height="8" rx="3" fill="rgb(var(--moss-600))" /><rect x="14" y="48" width="44" height="8" rx="3" fill="rgb(var(--moss-600))" /><rect x="62" y="48" width="44" height="8" rx="3" fill="rgb(var(--sand-200))" /></svg>
    },
    {
        id: 'yuzen', ad: 'Yüzen düğme', aciklama: 'Sağ altta düğme; açılınca yazılı seçenekler',
        resim: <svg viewBox="0 0 120 64" aria-hidden="true"><rect x="10" y="10" width="44" height="16" rx="5" fill="#fff" stroke="rgb(var(--moss-500))" strokeWidth="2" /><rect x="58" y="10" width="30" height="7" rx="3" fill="#fff" stroke="rgb(var(--sand-200))" /><circle cx="100" cy="13" r="6" fill="rgb(var(--moss-600))" /><rect x="58" y="24" width="30" height="7" rx="3" fill="#fff" stroke="rgb(var(--sand-200))" /><circle cx="100" cy="27" r="6" fill="#fff" stroke="rgb(var(--sand-200))" /><rect x="91" y="40" width="18" height="18" rx="6" fill="rgb(var(--moss-700))" /><path d="M100 44v10M95 49h10" stroke="#fff" strokeWidth="2" /></svg>
    }
];
// Önizlemeler: üstte kök, altta dal, en altta iki yaprak
const KARTLAR: { id: TuvalKart; ad: string; aciklama: string; resim: React.ReactNode }[] = [
    {
        id: 'bahce', ad: 'Bahçe', aciklama: 'Gölgeli, katmanlı; kökte ağaç filigranı',
        resim: <svg viewBox="0 0 120 64" aria-hidden="true"><rect x="36" y="4" width="48" height="16" rx="6" fill="rgb(var(--kok-2))" /><rect x="40" y="8" width="18" height="3" rx="1.5" fill="rgb(var(--kok-soluk))" /><rect x="40" y="13" width="30" height="4" rx="2" fill="rgb(var(--kok-yazi))" /><path d="M60 20V26" stroke="rgb(var(--moss-600))" strokeWidth="2" /><rect x="40" y="26" width="40" height="14" rx="5" fill="rgb(var(--surface))" stroke="rgb(var(--clay-200))" /><rect x="40" y="26" width="40" height="6" rx="5" fill="rgb(var(--clay-50))" /><rect x="43" y="27.5" width="5" height="3" rx="1" fill="rgb(var(--clay-400))" /><path d="M60 40C60 44 36 42 36 48M60 40C60 44 84 42 84 48" stroke="rgb(var(--moss-400))" strokeWidth="1.5" fill="none" /><rect x="20" y="48" width="32" height="11" rx="4" fill="rgb(var(--surface))" stroke="rgb(var(--sand-200))" /><rect x="68" y="48" width="32" height="11" rx="4" fill="rgb(var(--surface))" stroke="rgb(var(--sand-200))" /><rect x="20" y="50" width="2" height="7" rx="1" fill="rgb(var(--moss-400))" /><rect x="68" y="50" width="2" height="7" rx="1" fill="rgb(var(--moss-400))" /></svg>
    },
    {
        id: 'sade', ad: 'Sade', aciklama: 'Gölgesiz, ince çerçeve; seviye küçük etiketle',
        resim: <svg viewBox="0 0 120 64" aria-hidden="true"><rect x="36" y="4" width="48" height="16" rx="4" fill="rgb(var(--surface))" stroke="rgb(var(--moss-600))" strokeWidth="1.8" /><circle cx="41" cy="9" r="1.5" fill="rgb(var(--moss-600))" /><rect x="40" y="13" width="30" height="3.5" rx="1.5" fill="rgb(var(--sand-700))" /><path d="M60 20V26" stroke="rgb(var(--moss-600))" strokeWidth="2" /><rect x="40" y="26" width="40" height="14" rx="4" fill="rgb(var(--surface))" stroke="rgb(var(--sand-300))" /><circle cx="44" cy="30" r="1.4" fill="rgb(var(--clay-500))" /><rect x="43" y="33.5" width="24" height="3" rx="1.5" fill="rgb(var(--sand-600))" /><path d="M60 40C60 44 36 42 36 48M60 40C60 44 84 42 84 48" stroke="rgb(var(--moss-400))" strokeWidth="1.5" fill="none" /><rect x="20" y="48" width="32" height="11" rx="4" fill="rgb(var(--surface))" stroke="rgb(var(--sand-300))" /><rect x="68" y="48" width="32" height="11" rx="4" fill="rgb(var(--surface))" stroke="rgb(var(--sand-300))" /><rect x="24" y="52" width="18" height="3" rx="1.5" fill="rgb(var(--sand-600))" /><rect x="72" y="52" width="18" height="3" rx="1.5" fill="rgb(var(--sand-600))" /></svg>
    },
    {
        id: 'renkli', ad: 'Renkli', aciklama: 'Seviyeye göre dolu renk: kök, dal, yaprak',
        resim: <svg viewBox="0 0 120 64" aria-hidden="true"><rect x="36" y="4" width="48" height="16" rx="5" fill="rgb(var(--kok-1))" /><rect x="40" y="10" width="30" height="4" rx="2" fill="rgb(var(--kok-yazi))" /><path d="M60 20V26" stroke="rgb(var(--moss-600))" strokeWidth="2" /><rect x="40" y="26" width="40" height="14" rx="5" fill="rgb(var(--clay-100))" stroke="rgb(var(--clay-300))" /><rect x="44" y="31" width="24" height="3.5" rx="1.5" fill="rgb(var(--clay-700))" /><path d="M60 40C60 44 36 42 36 48M60 40C60 44 84 42 84 48" stroke="rgb(var(--moss-400))" strokeWidth="1.5" fill="none" /><rect x="20" y="48" width="32" height="11" rx="5" fill="rgb(var(--moss-100))" stroke="rgb(var(--moss-200))" /><rect x="68" y="48" width="32" height="11" rx="5" fill="rgb(var(--moss-100))" stroke="rgb(var(--moss-200))" /><rect x="24" y="52" width="18" height="3" rx="1.5" fill="rgb(var(--moss-700))" /><rect x="72" y="52" width="18" height="3" rx="1.5" fill="rgb(var(--moss-700))" /></svg>
    },
    {
        id: 'hap', ad: 'Hap', aciklama: 'Tek satır, yuvarlak; kalabalık ağaçlarda az yer',
        resim: <svg viewBox="0 0 120 64" aria-hidden="true"><rect x="38" y="6" width="44" height="12" rx="6" fill="rgb(var(--kok-2))" /><circle cx="44" cy="12" r="3.5" fill="rgb(var(--kok-yazi) / .2)" /><rect x="50" y="10.5" width="24" height="3" rx="1.5" fill="rgb(var(--kok-yazi))" /><path d="M60 18V26" stroke="rgb(var(--moss-600))" strokeWidth="2" /><rect x="40" y="26" width="40" height="11" rx="5.5" fill="rgb(var(--surface))" stroke="rgb(var(--clay-300))" strokeWidth="1.4" /><circle cx="45.5" cy="31.5" r="3" fill="rgb(var(--clay-100))" /><rect x="51" y="30" width="22" height="3" rx="1.5" fill="rgb(var(--sand-700))" /><path d="M60 37C60 42 36 40 36 47M60 37C60 42 84 40 84 47" stroke="rgb(var(--moss-400))" strokeWidth="1.5" fill="none" /><rect x="20" y="47" width="32" height="10" rx="5" fill="rgb(var(--surface))" stroke="rgb(var(--moss-200))" strokeWidth="1.4" /><rect x="68" y="47" width="32" height="10" rx="5" fill="rgb(var(--surface))" stroke="rgb(var(--moss-200))" strokeWidth="1.4" /><circle cx="25" cy="52" r="2.6" fill="rgb(var(--moss-100))" /><circle cx="73" cy="52" r="2.6" fill="rgb(var(--moss-100))" /><rect x="30" y="50.5" width="16" height="3" rx="1.5" fill="rgb(var(--sand-700))" /><rect x="78" y="50.5" width="16" height="3" rx="1.5" fill="rgb(var(--sand-700))" /></svg>
    }
];
const TEMALAR: { id: 'acik' | 'koyu'; ad: string }[] = [{ id: 'acik', ad: 'Açık tema' }, { id: 'koyu', ad: 'Koyu tema' }];
const GEZINMELER: { id: TuvalGezinme; ad: string }[] = [
    { id: 'cubuk', ad: 'Çubuklar' }, { id: 'sekme', ad: 'Sekmeler' }, { id: 'yok', ad: 'Hiçbiri' }
];
const ONIZLEMELER: { id: TuvalOnizleme; ad: string }[] = [
    { id: 0, ad: 'Başlık' }, { id: 2, ad: '2 satır' }, { id: 3, ad: '3 satır' }
];

/** Bölmeli seçici (segmented control): iki ya da üç kısa seçenek. */
function Parcali<T extends string | number>({ secenekler, secili, sec, etiket, className }: { secenekler: { id: T; ad: string }[]; secili: T; sec: (v: T) => void; etiket: string; className?: string }) {
    return (
        <div role="radiogroup" aria-label={etiket} className={cx('grid gap-0.5 rounded-xl bg-sand-100 p-0.5', className)} style={{ gridTemplateColumns: `repeat(${secenekler.length}, minmax(0, 1fr))` }}>
            {secenekler.map(s => (
                <button key={String(s.id)} type="button" role="radio" aria-checked={secili === s.id} onClick={() => sec(s.id)}
                    className={cx('min-h-10 rounded-[10px] px-2 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40',
                        secili === s.id ? 'bg-white text-sand-900 shadow-soft' : 'text-sand-600 hover:text-sand-900')}>
                    {s.ad}
                </button>
            ))}
        </div>
    );
}

/** Önizlemeli seçenek kartı; seçili olanın köşesinde dolu radyo işareti. */
function SecenekKarti({ id, secik, onSec, ad, aciklama, resim }: { id?: string; secik: boolean; onSec: () => void; ad: string; aciklama: string; resim: React.ReactNode }) {
    return (
        <button type="button" role="radio" aria-checked={secik} id={id} onClick={onSec}
            className={cx('flex flex-col rounded-2xl border bg-white p-1.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/50',
                secik ? 'border-moss-500 shadow-[0_0_0_3px_rgb(var(--moss-500)/.15)]' : 'border-sand-200 hover:border-sand-300 hover:shadow-soft')}>
            <span className="relative block overflow-hidden rounded-xl bg-[var(--paper)] ring-1 ring-inset ring-sand-200/70 [&>svg]:block [&>svg]:h-14 [&>svg]:w-full">
                {resim}
                <span aria-hidden="true" className={cx('absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
                    secik ? 'border-moss-600 bg-moss-600' : 'border-sand-300 bg-white')}>
                    {secik && <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--kok-yazi))]" />}
                </span>
            </span>
            <span className="px-1 pt-2 text-[13px] font-semibold leading-tight text-sand-900">{ad}</span>
            <span className="px-1 pb-1 pt-0.5 text-[11px] leading-snug text-sand-600">{aciklama}</span>
        </button>
    );
}

/** "Ayrıntılar" kartında açıklama solda, seçici sağda (telefonda alt alta). */
function AyrintiSatiri({ baslik, aciklama, children }: { baslik: string; aciklama: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2.5 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-sand-900">{baslik}</p>
                <p className="mt-0.5 text-xs leading-snug text-sand-600">{aciklama}</p>
            </div>
            {children}
        </div>
    );
}

export function TuvalAyarlari() {
    const t = useTuvalTercihleri();
    const koyu = useKoyuTema();
    // Hangi temanın kart tasarımı düzenleniyor; açılışta uygulamanın o anki teması
    const [kartTemasi, setKartTemasi] = useState<'acik' | 'koyu'>('acik');
    useEffect(() => { setKartTemasi(koyu ? 'koyu' : 'acik'); }, [koyu]);
    const klasik = t.gosterim === 'klasik';
    return (
        <div id="tuval-ayarlari" className="space-y-4">
            <SettingsSection icon={GitFork} title="Düzen" description="Ağaçların tuvalde nasıl dizileceği; notlarınız değişmez.">
                <div role="radiogroup" aria-label="Gösterim şekli" className="grid grid-cols-3 gap-2">
                    {GOSTERIMLER.map(g => <SecenekKarti key={g.id} secik={t.gosterim === g.id} onSec={() => tuvalTercihleriniKaydet({ ...t, gosterim: g.id })} ad={g.ad} aciklama={g.aciklama} resim={g.resim} />)}
                </div>
            </SettingsSection>

            <SettingsSection icon={Palette} tone="clay" title="Kart tasarımı"
                description={klasik ? 'Klasik düzende kullanılmaz; Organik ya da Yatay akışta uygulanır.' : 'Kök, dal ve yaprak kartları. Açık ve koyu tema için ayrı seçilir.'}>
                <Parcali etiket="Tasarımı seçilen tema" secenekler={TEMALAR} secili={kartTemasi} sec={setKartTemasi} className="mb-3 sm:w-[240px]" />
                {/* Önizlemeler seçilen temanın renkleriyle çizilir (uygulamanın o anki temasından bağımsız). */}
                <div role="radiogroup" aria-label={'Kart tasarımı (' + (kartTemasi === 'koyu' ? 'koyu' : 'açık') + ' tema)'}
                    className={cx('grid grid-cols-2 gap-2 rounded-2xl bg-sand-100 p-1.5 sm:grid-cols-4', kartTemasi === 'koyu' ? 'dark' : 'acik-tema')}>
                    {KARTLAR.map(g => <SecenekKarti key={g.id} id={'tuval-kart-' + g.id} secik={(kartTemasi === 'koyu' ? t.kartKoyu : t.kart) === g.id}
                        onSec={() => tuvalTercihleriniKaydet(kartTemasi === 'koyu' ? { ...t, kartKoyu: g.id } : { ...t, kart: g.id })} ad={g.ad} aciklama={g.aciklama} resim={g.resim} />)}
                </div>
            </SettingsSection>

            <SettingsSection icon={MousePointerClick} tone="sand" title="Not düğmeleri"
                description={klasik ? 'Klasik düzende kullanılmaz.' : 'Seçili notta düzenle, kopyala, ekle ve buda düğmeleri nerede görünsün.'}>
                <div role="radiogroup" aria-label="Not düğmelerinin görünümü" className="grid grid-cols-3 gap-2">
                    {EYLEMLER.map(g => <SecenekKarti key={g.id} id={'tuval-eylem-' + g.id} secik={t.eylem === g.id} onSec={() => tuvalTercihleriniKaydet({ ...t, eylem: g.id })} ad={g.ad} aciklama={g.aciklama} resim={g.resim} />)}
                </div>
            </SettingsSection>

            <SettingsSection icon={SlidersHorizontal} tone="moss" title="Ayrıntılar" flush>
                <div className="divide-y divide-sand-100">
                    <AyrintiSatiri baslik="Kart önizlemesi" aciklama="Kartta başlığın altında içeriğin kaç satırı görünsün.">
                        <Parcali etiket="Kart önizlemesi" secenekler={ONIZLEMELER} secili={t.onizleme} sec={v => tuvalTercihleriniKaydet({ ...t, onizleme: v })} className="sm:w-[264px]" />
                    </AyrintiSatiri>
                    <AyrintiSatiri baslik="Ağaçlar arası gezinme" aciklama="Çok ağaçta hızlı geçiş: kaydırma çubukları ya da üstte ağaç sekmeleri.">
                        <Parcali etiket="Ağaçlar arası gezinme" secenekler={GEZINMELER} secili={t.gezinme} sec={v => tuvalTercihleriniKaydet({ ...t, gezinme: v })} className="sm:w-[264px]" />
                    </AyrintiSatiri>
                    <AyrintiSatiri baslik="Budanan notlar" aciklama="Tuvalde ve listede nasıl görünsünler.">
                        <BudananlarDugmesi etiketli className="self-start sm:self-auto" />
                    </AyrintiSatiri>
                </div>
            </SettingsSection>
        </div>
    );
}
