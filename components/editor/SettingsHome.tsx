'use client';

/**
 * Ayarlar ana ekranı.
 *
 * Üstte iki hızlı kart: kullanım kılavuzu ve deneme ağacı (bağlantıyı ya da
 * yapay zekâyı kaydedilmeyen bir notta denemek için). Altında ayarlar
 * başlıklar hâlinde düğme ızgarası olarak dizilir: Araçlar (makrolar, yerel
 * ve bilgisayar araçları, kısayollar), Bağlantılar (bilgisayar, yapay zekâ,
 * hesap, yedekleme) ve Uygulama. Arama yazılınca düz sonuç listesi çıkar.
 */
import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    BookOpen,
    ChevronRight,
    Cloud,
    Database,
    Info,
    Keyboard,
    Loader2,
    Monitor,
    MonitorSmartphone,
    Palette,
    Search,
    Sparkles,
    Sprout,
    TreePine,
    UserCircle2,
    Wand2,
    Wrench,
    X,
    type LucideIcon,
} from 'lucide-react';
import { APP_VERSION } from '@/lib/config';
import { ayarlaraDonSakla, denemeAgaciAdresi, type DenemeTuru } from '@/lib/denemeAgaci';

export type SettingsSectionId =
    | 'account'
    | 'models'
    | 'macros'
    | 'gorunum'
    /** Eski bağlantılar için: bilgisayar araçlarına yönlenir. */
    | 'tools'
    | 'yerel'
    | 'pcAraclari'
    | 'kisayollar'
    | 'remote'
    | 'sync'
    | 'data'
    | 'about'
    | 'usage';

type Ton = 'moss' | 'clay' | 'bark' | 'berry';

interface SettingsSectionDefinition {
    id: SettingsSectionId;
    title: string;
    description: string;
    icon: LucideIcon;
    group: string;
    ton: Ton;
    keywords: string[];
}

export const SETTINGS_SECTIONS: SettingsSectionDefinition[] = [
    { id: 'macros', title: 'AI makroları', description: 'Yazılarınıza hazır yapay zekâ komutları', icon: Wand2, group: 'Araçlar', ton: 'clay', keywords: ['yapay zekâ', 'makro', 'komut', 'prompt', 'özet', 'çeviri', 'imla'] },
    { id: 'yerel', title: 'Yerel araçlar', description: 'İnternetsiz metin araçları', icon: Wrench, group: 'Araçlar', ton: 'moss', keywords: ['editör', 'araç', 'numaralandır', 'başlık', 'temizle', 'sıra'] },
    { id: 'pcAraclari', title: 'Bilgisayar araçları', description: 'Fare, dikte, yazma, pano, görsel', icon: MonitorSmartphone, group: 'Araçlar', ton: 'bark', keywords: ['fare', 'dikte', 'köprü', 'yaz', 'pano', 'enter', 'görsel', 'araç'] },
    { id: 'kisayollar', title: 'Kısayollar ve ekranlar', description: 'Makrolar, profiller, ekran düzenleri', icon: Keyboard, group: 'Araçlar', ton: 'berry', keywords: ['kısayol', 'makro', 'profil', 'ekran', 'numpad', 'konum', 'düzen'] },
    { id: 'remote', title: 'Bilgisayar bağlantısı', description: 'Kart, Wi‑Fi, Bluetooth, PC yardımcısı', icon: Monitor, group: 'Bağlantılar', ton: 'bark', keywords: ['uzak', 'remote', 'bluetooth', 'kablosuz', 'kart', 'yardımcı', 'eşleştir', 'dikte motoru'] },
    { id: 'models', title: 'Yapay zekâ', description: 'Bulut anahtarı ya da yerel model', icon: Sparkles, group: 'Bağlantılar', ton: 'clay', keywords: ['ai', 'model', 'chatgpt', 'openai', 'gemini', 'claude', 'api', 'anahtar', 'yerel', 'çevrimdışı', 'gemma', 'ollama'] },
    { id: 'account', title: 'Hesap ve giriş', description: 'Google hesabı ve oturum', icon: UserCircle2, group: 'Bağlantılar', ton: 'moss', keywords: ['google', 'e-posta', 'email', 'giriş', 'çıkış', 'oturum', 'profil'] },
    { id: 'sync', title: 'Yedekleme', description: 'Google Drive ile eşitleme', icon: Cloud, group: 'Bağlantılar', ton: 'moss', keywords: ['yedek', 'bulut', 'google', 'drive', 'eşitle', 'senkron', 'sync'] },
    { id: 'gorunum', title: 'Görünüm', description: 'Açık, koyu ya da sistem teması', icon: Palette, group: 'Uygulama', ton: 'moss', keywords: ['tema', 'koyu', 'açık', 'gece', 'görünüm', 'renk', 'dark'] },
    { id: 'data', title: 'Veri yönetimi', description: 'Dışa aktar, geri yükle', icon: Database, group: 'Uygulama', ton: 'moss', keywords: ['yedek', 'dosya', 'json', 'indir', 'yükle', 'sil', 'depolama', 'pdf', 'docx'] },
    { id: 'about', title: 'Uygulama hakkında', description: 'Sürüm ve gizlilik', icon: Info, group: 'Uygulama', ton: 'moss', keywords: ['not bahçesi', 'sürüm', 'versiyon', 'gizlilik', 'güvenlik', 'hakkında'] },
    { id: 'usage', title: 'Kullanım kılavuzu', description: 'Başlangıçtan uzmana beş seviye', icon: BookOpen, group: 'Yardım', ton: 'clay', keywords: ['kullanım', 'kılavuz', 'yardım', 'nasıl', 'başlangıç', 'rehber', 'sss'] },
];

/** Eski bölüm kimliklerini günceline çevirir. */
export const bolumuNormallestir = (id: SettingsSectionId | 'home'): SettingsSectionId | 'home' => id === 'tools' ? 'pcAraclari' : id;

const GRUPLAR: { ad: string; aciklama: string; izgara: boolean }[] = [
    { ad: 'Araçlar', aciklama: 'Editörde kullandığınız araçlar', izgara: true },
    { ad: 'Bağlantılar', aciklama: 'Bilgisayar, yapay zekâ ve hesap', izgara: true },
    { ad: 'Uygulama', aciklama: '', izgara: false },
];

const TON: Record<Ton, string> = {
    moss: 'bg-moss-50 text-moss-700 ring-moss-200/60',
    clay: 'bg-clay-50 text-clay-700 ring-clay-200/70',
    bark: 'bg-bark-50 text-bark-700 ring-bark-200/70',
    berry: 'bg-berry-50 text-berry-700 ring-berry-100',
};

function normalizeSearch(value: string) {
    return value.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Deneme ağacı: tüm araçları açık, kaydedilmeyen bir not. Açık not önce
 * kaydedilir, ayarlar kapanır, editör deneme modunda açılır.
 */
function DenemeDugmesi() {
    const router = useRouter();
    const [mesgul, setMesgul] = useState(false);
    const ac = async () => {
        setMesgul(true);
        try {
            const adres = await denemeAgaciAdresi('hepsi');
            ayarlaraDonSakla('home');
            window.dispatchEvent(new Event('nb-editor-kaydet'));
            window.dispatchEvent(new Event('nb-ayarlari-kapat'));
            router.push(adres);
        } finally { setMesgul(false); }
    };
    return (
        <button type="button" id="ayar-deneme-agaci" disabled={mesgul} onClick={() => void ac()}
            className="group relative isolate flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-clay-200/80 bg-gradient-to-br from-clay-50 via-white to-moss-50 px-4 py-3.5 text-left shadow-soft transition-all hover:border-clay-300 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 active:scale-[.99] disabled:opacity-70">
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <Sprout className="absolute -bottom-6 right-12 h-24 w-24 rotate-12 text-moss-300/25" strokeWidth={1} />
            </span>
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-clay-300 to-clay-500 text-white shadow-[0_6px_14px_-6px_rgba(170,104,20,.7)]">
                {mesgul ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Sprout size={20} aria-hidden="true" />}
            </span>
            <span className="relative min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-clay-700">Deneme ağacı</span>
                <span className="mt-0.5 block truncate font-display text-lg leading-snug tracking-tight text-sand-900">Tüm araçları deneyin.</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-sand-600">Kaydedilmeyen bir not; çıkınca kaybolur.</span>
            </span>
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-clay-700 ring-1 ring-clay-200 transition-colors group-hover:bg-white">
                <ChevronRight size={17} aria-hidden="true" />
            </span>
        </button>
    );
}

export default function SettingsHome({ onSelect }: { onSelect: (id: SettingsSectionId) => void }) {
    const [query, setQuery] = useState('');
    const searchId = useId();
    const searchRef = useRef<HTMLInputElement>(null);
    const terms = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
    const sections = SETTINGS_SECTIONS.filter((section) => {
        const searchable = normalizeSearch([section.title, section.description, ...section.keywords].join(' '));
        return terms.every((term) => searchable.includes(term));
    });

    function clearSearch() {
        setQuery('');
        searchRef.current?.focus();
    }

    const satir = ({ id, title, description, icon: Icon, ton }: SettingsSectionDefinition) => (
        <li key={id} className="border-b border-sand-100 last:border-b-0">
            <button type="button" onClick={() => onSelect(id)}
                className="group flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-moss-50/70 focus-visible:bg-moss-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-moss-500 active:bg-moss-100/60">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${TON[ton]}`} aria-hidden="true"><Icon size={19} strokeWidth={1.8} /></span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-5 text-sand-900">{title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-sand-600">{description}</span>
                </span>
                <ChevronRight size={17} className="shrink-0 text-sand-500 transition-colors group-hover:text-moss-600" aria-hidden="true" />
            </button>
        </li>
    );

    const kutu = ({ id, title, description, icon: Icon, ton }: SettingsSectionDefinition) => (
        <li key={id}>
            <button type="button" id={'ayar-kutu-' + id} onClick={() => onSelect(id)}
                className="group flex h-full min-h-[118px] w-full flex-col items-start gap-2.5 rounded-2xl border border-sand-200 bg-white p-3.5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-moss-300 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 active:translate-y-0 active:scale-[.98]">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ${TON[ton]}`} aria-hidden="true"><Icon size={19} strokeWidth={1.8} /></span>
                <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold leading-tight text-sand-900">{title}</span>
                    <span className="mt-1 block text-[11.5px] leading-snug text-sand-600">{description}</span>
                </span>
            </button>
        </li>
    );

    return (
        <div className="space-y-6">
            {/* Hızlı kartlar: kılavuz ve deneme ağacı */}
            <div className="grid gap-3 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={() => onSelect('usage')}
                    className="group relative isolate flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-moss-900 px-4 py-3.5 text-left text-white shadow-card transition-colors hover:bg-moss-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 focus-visible:ring-offset-2"
                >
                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                        <span className="absolute -right-16 -top-20 h-44 w-44 rounded-full border border-moss-200/10" />
                        <TreePine className="absolute -bottom-7 right-3 h-24 w-24 -rotate-12 text-moss-200/[0.07]" strokeWidth={1} />
                    </span>
                    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-moss-200/15 text-moss-100 ring-1 ring-inset ring-moss-200/20">
                        <BookOpen size={20} aria-hidden="true" />
                    </span>
                    <span className="relative min-w-0 flex-1">
                        <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-moss-200">Kullanım kılavuzu</span>
                        <span className="mt-0.5 block truncate font-display text-lg leading-snug tracking-tight">Bahçeniz, sizin düzeniniz.</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-moss-100/90">Başlangıçtan uzmana adım adım.</span>
                    </span>
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-moss-100 transition-colors group-hover:bg-white/20">
                        <ChevronRight size={17} aria-hidden="true" />
                    </span>
                </button>
                <DenemeDugmesi />
            </div>

            <div>
                <label htmlFor={searchId} className="sr-only">Ayarlarda ara</label>
                <div className="relative">
                    <Search aria-hidden="true" size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sand-500" />
                    <input
                        ref={searchRef}
                        id={searchId}
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Ayarlarda ara: yapay zekâ, pano, yedek…"
                        autoComplete="off"
                        spellCheck={false}
                        aria-controls={`${searchId}-results`}
                        className="h-12 w-full rounded-2xl border border-sand-200 bg-white pl-11 pr-12 text-[15px] text-sand-900 shadow-soft outline-none transition-shadow placeholder:text-sand-500 focus:border-moss-500 focus:ring-4 focus:ring-moss-500/10 [&::-webkit-search-cancel-button]:appearance-none"
                    />
                    {query && (
                        <button type="button" onClick={clearSearch} aria-label="Aramayı temizle"
                            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-sand-600 transition-colors hover:bg-sand-100 hover:text-sand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500">
                            <X size={18} aria-hidden="true" />
                        </button>
                    )}
                </div>
                <p role="status" className="sr-only">{terms.length > 0 ? `${sections.length} ayar bölümü bulundu.` : ''}</p>
            </div>

            <div id={`${searchId}-results`}>
                {terms.length > 0 ? (
                    sections.length > 0 ? (
                        <ul className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-soft">{sections.map(satir)}</ul>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-sand-300 bg-white px-5 py-8 text-center">
                            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sand-100 text-sand-600" aria-hidden="true"><Search size={22} /></span>
                            <h3 className="text-base font-semibold text-sand-900">Bir ayar bulunamadı</h3>
                            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-sand-600">Başka bir kelime deneyin veya aramayı temizleyin.</p>
                            <button type="button" onClick={clearSearch} className="mt-4 min-h-[44px] rounded-xl bg-moss-50 px-4 py-2.5 text-sm font-semibold text-moss-800 transition-colors hover:bg-moss-100">Aramayı temizle</button>
                        </div>
                    )
                ) : (
                    <div className="space-y-6">
                        {GRUPLAR.map((grup, i) => {
                            const ogeler = SETTINGS_SECTIONS.filter(s => s.group === grup.ad);
                            return (
                                <section key={grup.ad} aria-labelledby={`${searchId}-grup-${i}`}>
                                    <div className="mb-2.5 flex items-baseline justify-between gap-3 px-1">
                                        <h3 id={`${searchId}-grup-${i}`} className="text-[13px] font-bold uppercase tracking-[0.12em] text-sand-700">{grup.ad}</h3>
                                        {grup.aciklama && <p className="truncate text-xs text-sand-500">{grup.aciklama}</p>}
                                    </div>
                                    {grup.izgara
                                        ? <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">{ogeler.map(kutu)}</ul>
                                        : <ul className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-soft">{ogeler.map(satir)}</ul>}
                                </section>
                            );
                        })}
                    </div>
                )}
            </div>

            <p className="flex items-center justify-center gap-2 pb-1 text-xs text-sand-600">
                <TreePine size={14} aria-hidden="true" />
                Not Bahçesi <span aria-hidden="true">·</span> Sürüm {APP_VERSION}
            </p>
        </div>
    );
}
