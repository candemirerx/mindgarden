'use client';

/**
 * Ağaç Yönetimi → Görünüm sekmesi: düzen, kart tasarımı (açık/koyu tema için
 * ayrı), not düğmeleri ve ayrıntılar (önizleme, gezinme, budanan notlar).
 * Ana Ayarlar ekranıyla aynı yapı taşları (SettingsSection) kullanılır.
 * Tercihler cihazda tutulur.
 */
import { GitFork, MousePointerClick, Palette, SlidersHorizontal } from 'lucide-react';
import { BudananlarDugmesi } from '@/components/ui/BudananlarDugmesi';
import { SettingsSection, cx } from '@/components/ui/settings';
import { KART_ISLEVLERI, KART_YERLERI, VARSAYILAN_KART_DUGMELERI, tuvalTercihleriniKaydet, useKoyuTema, useTuvalTercihleri } from '@/lib/tuvalTercihleri';
import type { KartDugmeleri, KartIslevi } from '@/lib/tuvalTercihleri';
import type { TuvalEylem, TuvalGezinme, TuvalGosterim, TuvalKart, TuvalOnizleme } from '@/lib/tuvalTercihleri';

/* Düzen önizlemeleri: kartlar bilerek hepsi aynı sade gri kutu; yalnız dizilim ve dalların gidişi görünür. */
const KUTU = 'rgb(var(--sand-300))';
const CIZGI = 'rgb(var(--moss-500))';
const GOSTERIMLER: { id: TuvalGosterim; ad: string; aciklama: string; resim: React.ReactNode }[] = [
    {
        id: 'klasik', ad: 'Klasik', aciklama: 'Üstten alta hiyerarşi; düz, köşeli bağlantılar ve yan yana ağaçlar',
        resim: <svg viewBox="0 0 120 64" aria-hidden="true"><path d="M60 15V23M22 32V23H98V32M60 23V32M22 41V49M12 56V49H32V56M98 41V56" stroke={CIZGI} strokeWidth="2" fill="none" /><rect x="45" y="4" width="30" height="11" rx="3" fill={KUTU} /><rect x="9" y="32" width="26" height="9" rx="3" fill={KUTU} /><rect x="47" y="32" width="26" height="9" rx="3" fill={KUTU} /><rect x="85" y="32" width="26" height="9" rx="3" fill={KUTU} /><rect x="4" y="56" width="16" height="7" rx="2" fill={KUTU} /><rect x="24" y="56" width="16" height="7" rx="2" fill={KUTU} /><rect x="90" y="56" width="16" height="7" rx="2" fill={KUTU} /></svg>
    },
    {
        id: 'organik', ad: 'Organik', aciklama: 'Kökten dallar yana açılır, yapraklar dalın altına asılır; ağaçlar yan yana',
        resim: <svg viewBox="0 0 120 64" aria-hidden="true"><path d="M60 13C60 22 24 18 24 27M60 13V27M60 13C60 22 96 18 96 27" stroke={CIZGI} strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M24 35V42M24 42C24 47 18 46 18 52M24 42C24 47 30 46 30 52M60 35V52M96 35V52" stroke={CIZGI} strokeWidth="1.5" fill="none" strokeLinecap="round" /><rect x="46" y="4" width="28" height="9" rx="3" fill={KUTU} /><rect x="12" y="27" width="24" height="8" rx="3" fill={KUTU} /><rect x="48" y="27" width="24" height="8" rx="3" fill={KUTU} /><rect x="84" y="27" width="24" height="8" rx="3" fill={KUTU} /><rect x="8" y="52" width="20" height="7" rx="2.5" fill={KUTU} /><rect x="32" y="52" width="20" height="7" rx="2.5" fill={KUTU} /><rect x="50" y="52" width="20" height="7" rx="2.5" fill={KUTU} /><rect x="86" y="52" width="20" height="7" rx="2.5" fill={KUTU} /></svg>
    },
    {
        id: 'yatay', ad: 'Yatay akış', aciklama: 'Soldan sağa genişler; ağaçlar alt alta',
        resim: <svg viewBox="0 0 120 64" aria-hidden="true"><path d="M28 32C38 32 36 16 46 16M28 32H46M28 32C38 32 36 48 46 48" stroke={CIZGI} strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M72 16C80 16 78 10 86 10M72 16C80 16 78 22 86 22M72 32H86M72 48H86" stroke={CIZGI} strokeWidth="1.5" fill="none" strokeLinecap="round" /><rect x="6" y="26" width="22" height="12" rx="3" fill={KUTU} /><rect x="46" y="12" width="26" height="8" rx="3" fill={KUTU} /><rect x="46" y="28" width="26" height="8" rx="3" fill={KUTU} /><rect x="46" y="44" width="26" height="8" rx="3" fill={KUTU} /><rect x="86" y="6" width="28" height="7" rx="2.5" fill={KUTU} /><rect x="86" y="18" width="28" height="7" rx="2.5" fill={KUTU} /><rect x="86" y="29" width="28" height="7" rx="2.5" fill={KUTU} /><rect x="86" y="45" width="28" height="7" rx="2.5" fill={KUTU} /></svg>
    }
];
function MenuOnizleme({ model }: { model: 'hap' | 'yumusak' | 'kapsul' }) {
    const kapsul = model === 'kapsul', yumusak = model === 'yumusak';
    const yesil = 'rgb(var(--moss-600))', yuzey = 'rgb(var(--surface))';
    return <svg viewBox="0 0 120 64" aria-hidden="true">
        <rect x="32" y="21" width="56" height="29" rx="8" fill={yesil} />
        <rect x="32" y={kapsul ? 4 : 7} width="56" height={kapsul ? 14 : 15} rx={kapsul || yumusak ? 7 : 3} fill={yuzey} stroke={yesil} />
        <path d="M51 8v12M69 8v12" stroke={yesil} opacity=".3" />
        <path d="M40 11h5v6h-5zM58 15l4-4M76 12l4 5M80 12l-4 5" stroke={yesil} fill="none" strokeWidth="1.5" />
        <rect x={kapsul ? 18 : 24} y="25" width={kapsul ? 11 : 8} height="22" rx={kapsul || yumusak ? 5 : 2} fill={yuzey} stroke={yesil} />
        <rect x={kapsul ? 91 : 88} y="25" width={kapsul ? 11 : 8} height="22" rx={kapsul || yumusak ? 5 : 2} fill={yuzey} stroke={yesil} />
        <rect x="47" y={kapsul ? 53 : 50} width="26" height="8" rx={kapsul || yumusak ? 4 : 2} fill={yuzey} stroke={yesil} />
        <path d="M26 36h4M28 34v4M90 36h4M92 34v4M58 54h4M60 52v4" stroke={yesil} strokeWidth="1.2" />
        <path d="M40 32h33M40 38h22" stroke={yuzey} opacity=".8" strokeLinecap="round" strokeWidth="2" />
    </svg>;
}
const EYLEMLER: { id: TuvalEylem; ad: string; aciklama: string; resim: React.ReactNode }[] = [
    {
        id: 'hap', ad: 'Bitişik', aciklama: 'Karta sıfır boşlukla oturan şerit; geniş, kısa kenar düğmeleri',
        resim: <MenuOnizleme model="hap" />
    },
    { id: 'yumusak', ad: 'Yumuşak', aciklama: 'Bitişik düğmeler, daha oval köşeler ve yumuşak yüzey', resim: <MenuOnizleme model="yumusak" /> },
    { id: 'kapsul', ad: 'Kapsül', aciklama: 'Kartın yakınında ayrı, yuvarlak düğmeler', resim: <MenuOnizleme model="kapsul" /> },
    {
        id: 'panel', ad: 'Alttan panel', aciklama: 'Dokununca alttan büyük, yazılı düğmeler',
        resim: <svg viewBox="0 0 120 64" aria-hidden="true"><rect x="34" y="6" width="52" height="16" rx="5" fill="#fff" stroke="rgb(var(--moss-500))" strokeWidth="2" /><rect x="6" y="30" width="108" height="34" rx="8" fill="#fff" stroke="rgb(var(--sand-200))" /><rect x="14" y="36" width="92" height="8" rx="3" fill="rgb(var(--moss-600))" /><rect x="14" y="48" width="44" height="8" rx="3" fill="rgb(var(--moss-600))" /><rect x="62" y="48" width="44" height="8" rx="3" fill="rgb(var(--sand-200))" /></svg>
    },
    {
        id: 'yuzen', ad: 'Yüzen düğme', aciklama: 'Sağ altta düğme; açılınca yazılı seçenekler',
        resim: <svg viewBox="0 0 120 64" aria-hidden="true"><rect x="10" y="10" width="44" height="16" rx="5" fill="#fff" stroke="rgb(var(--moss-500))" strokeWidth="2" /><rect x="58" y="10" width="30" height="7" rx="3" fill="#fff" stroke="rgb(var(--sand-200))" /><circle cx="100" cy="13" r="6" fill="rgb(var(--moss-600))" /><rect x="58" y="24" width="30" height="7" rx="3" fill="#fff" stroke="rgb(var(--sand-200))" /><circle cx="100" cy="27" r="6" fill="#fff" stroke="rgb(var(--sand-200))" /><rect x="91" y="40" width="18" height="18" rx="6" fill="rgb(var(--moss-700))" /><path d="M100 44v10M95 49h10" stroke="#fff" strokeWidth="2" /></svg>
    }
];
// Kart önizlemeleri: bağlantı ve dizilim yok; yalnız kök, dal ve yaprak kartı alt alta
const KARTLAR: { id: TuvalKart; ad: string; aciklama: string; resim: React.ReactNode }[] = [
    {
        id: 'bahce', ad: 'Bahçe', aciklama: 'Gölgeli, katmanlı; kökte ağaç filigranı',
        resim: <svg viewBox="0 0 120 64" aria-hidden="true"><rect x="20" y="3" width="80" height="19" rx="7" fill="rgb(var(--kok-2))" /><rect x="26" y="8" width="22" height="3" rx="1.5" fill="rgb(var(--kok-soluk))" /><rect x="26" y="13" width="44" height="4" rx="2" fill="rgb(var(--kok-yazi))" /><rect x="20" y="26" width="80" height="17" rx="6" fill="rgb(var(--surface))" stroke="rgb(var(--clay-200))" /><rect x="20.5" y="26.5" width="79" height="7" rx="6" fill="rgb(var(--clay-100))" /><rect x="25" y="28" width="6" height="4" rx="1.5" fill="rgb(var(--clay-400))" /><rect x="35" y="28.5" width="30" height="3" rx="1.5" fill="rgb(var(--sand-700))" /><rect x="20" y="47" width="80" height="14" rx="5" fill="rgb(var(--surface))" stroke="rgb(var(--sand-200))" /><rect x="22" y="49" width="2.5" height="10" rx="1.25" fill="rgb(var(--moss-400))" /><rect x="30" y="52" width="36" height="3.5" rx="1.75" fill="rgb(var(--sand-700))" /></svg>
    },
    {
        id: 'sade', ad: 'Sade', aciklama: 'Gölgesiz, ince çerçeve; seviye küçük etiketle',
        resim: <svg viewBox="0 0 120 64" aria-hidden="true"><rect x="20" y="3" width="80" height="19" rx="5" fill="rgb(var(--surface))" stroke="rgb(var(--moss-600))" strokeWidth="1.8" /><circle cx="26" cy="9" r="1.5" fill="rgb(var(--moss-600))" /><rect x="30" y="7.5" width="14" height="3" rx="1.5" fill="rgb(var(--sand-500))" /><rect x="26" y="14" width="44" height="4" rx="2" fill="rgb(var(--sand-800))" /><rect x="20" y="26" width="80" height="17" rx="5" fill="rgb(var(--surface))" stroke="rgb(var(--sand-300))" /><circle cx="26" cy="31" r="1.5" fill="rgb(var(--clay-500))" /><rect x="30" y="29.5" width="14" height="3" rx="1.5" fill="rgb(var(--sand-500))" /><rect x="26" y="35.5" width="40" height="3.5" rx="1.75" fill="rgb(var(--sand-800))" /><rect x="20" y="47" width="80" height="14" rx="5" fill="rgb(var(--surface))" stroke="rgb(var(--sand-300))" /><circle cx="26" cy="52" r="1.5" fill="rgb(var(--moss-400))" /><rect x="30" y="50.5" width="14" height="3" rx="1.5" fill="rgb(var(--sand-500))" /><rect x="26" y="55.5" width="36" height="3" rx="1.5" fill="rgb(var(--sand-800))" /></svg>
    },
    {
        id: 'renkli', ad: 'Renkli', aciklama: 'Seviyeye göre dolu renk: kök, dal, yaprak',
        resim: <svg viewBox="0 0 120 64" aria-hidden="true"><rect x="20" y="3" width="80" height="19" rx="6" fill="rgb(var(--kok-1))" /><rect x="26" y="7" width="8" height="8" rx="2.5" fill="rgb(var(--kok-yazi) / .2)" /><rect x="38" y="9.5" width="40" height="4" rx="2" fill="rgb(var(--kok-yazi))" /><rect x="20" y="26" width="80" height="17" rx="6" fill="rgb(var(--clay-100))" stroke="rgb(var(--clay-300))" /><rect x="26" y="30" width="8" height="8" rx="2.5" fill="rgb(var(--surface) / .7)" /><rect x="38" y="32" width="36" height="3.5" rx="1.75" fill="rgb(var(--clay-800))" /><rect x="20" y="47" width="80" height="14" rx="6" fill="rgb(var(--moss-100))" stroke="rgb(var(--moss-200))" /><rect x="26" y="50" width="8" height="8" rx="2.5" fill="rgb(var(--surface) / .7)" /><rect x="38" y="52" width="32" height="3.5" rx="1.75" fill="rgb(var(--moss-800))" /></svg>
    },
    {
        id: 'hap', ad: 'Hap', aciklama: 'Tek satır, yuvarlak; kalabalık ağaçlarda az yer',
        resim: <svg viewBox="0 0 120 64" aria-hidden="true"><rect x="20" y="4" width="80" height="16" rx="8" fill="rgb(var(--kok-2))" /><circle cx="29" cy="12" r="5" fill="rgb(var(--kok-yazi) / .2)" /><rect x="38" y="10" width="40" height="4" rx="2" fill="rgb(var(--kok-yazi))" /><rect x="20" y="25" width="80" height="16" rx="8" fill="rgb(var(--surface))" stroke="rgb(var(--clay-300))" strokeWidth="1.4" /><circle cx="29" cy="33" r="5" fill="rgb(var(--clay-100))" /><rect x="38" y="31" width="36" height="4" rx="2" fill="rgb(var(--sand-700))" /><rect x="20" y="46" width="80" height="14" rx="7" fill="rgb(var(--surface))" stroke="rgb(var(--moss-200))" strokeWidth="1.4" /><circle cx="28.5" cy="53" r="4" fill="rgb(var(--moss-100))" /><rect x="37" y="51.2" width="32" height="3.6" rx="1.8" fill="rgb(var(--sand-700))" /></svg>
    }
];
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
    return (
        <div id="tuval-ayarlari" className="space-y-4">
            <SettingsSection icon={GitFork} title="Düzen" description="Ağaçların ve dalların tuvalde nasıl dizileceği, dalların nasıl ilerleyeceği. Kartların görünümünden bağımsızdır; notlarınız değişmez.">
                <div role="radiogroup" aria-label="Düzen" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {GOSTERIMLER.map(g => <SecenekKarti key={g.id} secik={t.gosterim === g.id} onSec={() => tuvalTercihleriniKaydet({ ...t, gosterim: g.id })} ad={g.ad} aciklama={g.aciklama} resim={g.resim} />)}
                </div>
            </SettingsSection>

            <SettingsSection icon={Palette} tone="clay" title="Kart tasarımı"
                description="Kartların renk, çerçeve ve gölge görünümü. Seçiminiz kullandığınız tema için kaydedilir.">
                <div role="radiogroup" aria-label="Kart tasarımı"
                    className="grid grid-cols-2 gap-2 rounded-2xl bg-sand-100 p-1.5 sm:grid-cols-4">
                    {KARTLAR.map(g => <SecenekKarti key={g.id} id={'tuval-kart-' + g.id} secik={(koyu ? t.kartKoyu : t.kart) === g.id}
                        onSec={() => tuvalTercihleriniKaydet(koyu ? { ...t, kartKoyu: g.id } : { ...t, kart: g.id })} ad={g.ad} aciklama={g.aciklama} resim={g.resim} />)}
                </div>
            </SettingsSection>

            <SettingsSection icon={MousePointerClick} tone="sand" title="Not düğmeleri"
                description="Düğmelerin görünümünü seçin.">
                <div role="radiogroup" aria-label="Not düğmelerinin görünümü" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {EYLEMLER.map(g => <SecenekKarti key={g.id} id={'tuval-eylem-' + g.id} secik={t.eylem === g.id} onSec={() => tuvalTercihleriniKaydet({ ...t, eylem: g.id })} ad={g.ad} aciklama={g.aciklama} resim={g.resim} />)}
                </div>
            </SettingsSection>

            {t.eylem !== 'panel' && t.eylem !== 'yuzen' && <SettingsSection icon={MousePointerClick} title="Kart menüsü"
                description="Düğme yerlerini ve işlevlerini düzenleyin.">
                <div className="grid grid-cols-2 gap-3">
                    {Object.entries(KART_YERLERI).map(([yer, ad]) => (
                        <label key={yer} className="flex flex-col gap-1.5 text-sm text-sand-800">
                            <span>{ad}</span>
                            <select aria-label={ad + ' işlevi'} className="min-h-[44px] rounded-xl border border-sand-200 bg-sand-50 px-2 text-sm"
                                value={t.dugmeler[yer as keyof KartDugmeleri]}
                                onChange={e => tuvalTercihleriniKaydet({ ...t, dugmeler: { ...t.dugmeler, [yer]: e.target.value as KartIslevi } })}>
                                {Object.entries(KART_ISLEVLERI).map(([id, isim]) => <option key={id} value={id}>{isim}</option>)}
                            </select>
                        </label>
                    ))}
                </div>
                <button type="button" className="mt-3 min-h-[44px] rounded-xl px-3 text-sm font-medium text-moss-700 hover:bg-moss-50"
                    onClick={() => tuvalTercihleriniKaydet({ ...t, dugmeler: { ...VARSAYILAN_KART_DUGMELERI } })}>Düğmeleri varsayılana döndür</button>
            </SettingsSection>}

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
