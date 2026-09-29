'use client';

import { useId, useRef, useState } from 'react';
import {
    BookOpen,
    ChevronRight,
    Cloud,
    Database,
    Info,
    Monitor,
    Palette,
    Search,
    SlidersHorizontal,
    Sparkles,
    TreePine,
    UserCircle2,
    Wand2,
    X,
    type LucideIcon,
} from 'lucide-react';
import { APP_VERSION } from '@/lib/config';

export type SettingsSectionId =
    | 'account'
    | 'models'
    | 'macros'
    | 'gorunum'
    | 'tools'
    | 'remote'
    | 'sync'
    | 'data'
    | 'about'
    | 'usage';

interface SettingsSectionDefinition {
    id: SettingsSectionId;
    title: string;
    description: string;
    icon: LucideIcon;
    group: string;
    keywords: string[];
}

export const SETTINGS_SECTIONS: SettingsSectionDefinition[] = [
    {
        id: 'usage',
        title: 'Kullanım kılavuzu',
        description: 'Bahçe, editör, yapay zekâ ve yedekleme adımları',
        icon: BookOpen,
        group: 'Yardım',
        keywords: ['kullanım', 'kılavuz', 'yardım', 'nasıl', 'başlangıç', 'rehber', 'adım', 'ipucu', 'sss'],
    },
    {
        id: 'account',
        title: 'Hesap ve giriş',
        description: 'Hesabınız ve oturum tercihleriniz',
        icon: UserCircle2,
        group: 'Hesabınız',
        keywords: ['google', 'e-posta', 'email', 'giriş', 'çıkış', 'oturum', 'profil'],
    },
    {
        id: 'models',
        title: 'Yapay zekâ',
        description: 'Modeller, sağlayıcılar ve API anahtarları',
        icon: Sparkles,
        group: 'Yazma deneyimi',
        keywords: ['ai', 'model', 'chatgpt', 'openai', 'gemini', 'claude', 'api', 'anahtar'],
    },
    {
        id: 'macros',
        title: 'AI makroları',
        description: 'Yazılarınıza özel hazır komutlar',
        icon: Wand2,
        group: 'Yazma deneyimi',
        keywords: ['yapay zekâ', 'makro', 'komut', 'prompt', 'özet', 'çeviri'],
    },
    {
        id: 'gorunum',
        title: 'Görünüm',
        description: 'Açık, koyu veya sistem teması',
        icon: Palette,
        group: 'Yazma deneyimi',
        keywords: ['tema', 'koyu', 'açık', 'gece', 'görünüm', 'renk', 'kontrast', 'dark'],
    },
    {
        id: 'tools',
        title: 'Düzenleme araçları',
        description: 'Editörde kullanacağınız araçları seçin',
        icon: SlidersHorizontal,
        group: 'Çalışma alanınız',
        keywords: ['editör', 'araç çubuğu', 'yazım', 'imla', 'biçim', 'tercihler'],
    },
    {
        id: 'remote',
        title: 'Bilgisayar bağlantısı',
        description: 'Telefon ve bilgisayar arasında çalışın',
        icon: Monitor,
        group: 'Çalışma alanınız',
        keywords: ['uzak', 'remote', 'bluetooth', 'kablosuz', 'köprü', 'dikte', 'mikrofon'],
    },
    {
        id: 'sync',
        title: 'Yedekleme ve senkronizasyon',
        description: 'Notlarınızı cihazlarınız arasında taşıyın',
        icon: Cloud,
        group: 'Hesabınız',
        keywords: ['yedek', 'bulut', 'google', 'drive', 'eşitle', 'senkron', 'sync'],
    },
    {
        id: 'data',
        title: 'Veri yönetimi',
        description: 'Notlarınızı dışa aktarın veya geri yükleyin',
        icon: Database,
        group: 'Uygulama',
        keywords: ['yedek', 'dosya', 'json', 'indir', 'yükle', 'sil', 'saklama', 'depolama'],
    },
    {
        id: 'about',
        title: 'Uygulama hakkında',
        description: 'Sürüm bilgisi ve gizlilik politikası',
        icon: Info,
        group: 'Uygulama',
        keywords: ['not bahçesi', 'sürüm', 'versiyon', 'gizlilik', 'güvenlik', 'hakkında'],
    },
];

const GROUPS = ['Hesabınız', 'Yazma deneyimi', 'Çalışma alanınız', 'Yardım', 'Uygulama'];

function normalizeSearch(value: string) {
    return value.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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

    return (
        <div className="space-y-5 sm:space-y-6">
            <button
                type="button"
                onClick={() => onSelect('usage')}
                className="group relative isolate flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-moss-900 px-4 py-3.5 text-left text-white shadow-card transition-colors hover:bg-moss-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 focus-visible:ring-offset-2 sm:gap-4 sm:px-5 sm:py-4"
            >
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                    <span className="absolute -right-16 -top-20 h-44 w-44 rounded-full border border-moss-200/10" />
                    <TreePine className="absolute -bottom-7 right-3 h-24 w-24 -rotate-12 text-moss-200/[0.07] sm:right-16 sm:h-28 sm:w-28" strokeWidth={1} />
                </span>
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-moss-200/15 text-moss-100 ring-1 ring-inset ring-moss-200/20">
                    <TreePine size={20} aria-hidden="true" />
                </span>
                <span className="relative min-w-0 flex-1">
                    <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-moss-200">
                        Kullanım kılavuzu
                    </span>
                    <span className="mt-0.5 block truncate font-display text-lg leading-snug tracking-tight sm:text-xl">
                        Bahçeniz, sizin düzeniniz.
                    </span>
                    <span className="mt-0.5 hidden text-xs leading-relaxed text-moss-100 sm:block">
                        Uygulamayı adım adım nasıl kullanacağınızı görün.
                    </span>
                </span>
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-moss-100 transition-colors group-hover:bg-white/20">
                    <ChevronRight size={17} aria-hidden="true" />
                </span>
            </button>

            <div>
                <label htmlFor={searchId} className="mb-2 block text-sm font-semibold text-sand-800">
                    Ayarlarda ara
                </label>
                <div className="relative">
                    <Search aria-hidden="true" size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sand-600" />
                    <input
                        ref={searchRef}
                        id={searchId}
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Örn. yapay zekâ, yedekleme…"
                        autoComplete="off"
                        spellCheck={false}
                        aria-controls={`${searchId}-results`}
                        className="h-14 w-full rounded-2xl border border-sand-300 bg-white pl-11 pr-14 text-base text-sand-900 shadow-soft outline-none transition-shadow placeholder:text-sand-600 focus:border-moss-500 focus:ring-4 focus:ring-moss-500/10 [&::-webkit-search-cancel-button]:appearance-none"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            aria-label="Aramayı temizle"
                            className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-sand-600 transition-colors hover:bg-sand-100 hover:text-sand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500"
                        >
                            <X size={18} aria-hidden="true" />
                        </button>
                    )}
                </div>
                <p role="status" className="sr-only">
                    {terms.length > 0 ? `${sections.length} ayar bölümü bulundu.` : ''}
                </p>
            </div>

            <div id={`${searchId}-results`}>
                {sections.length > 0 ? (
                    <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-x-6 lg:gap-y-7">
                        {GROUPS.map((group, groupIndex) => {
                            const groupSections = sections.filter((section) => section.group === group);
                            if (groupSections.length === 0) return null;

                            return (
                                <section key={group} aria-labelledby={`${searchId}-group-${groupIndex}`} className="min-w-0">
                                    <h3 id={`${searchId}-group-${groupIndex}`} className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-wider text-sand-600">
                                        {group}
                                    </h3>
                                    <ul className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-soft">
                                        {groupSections.map(({ id, title, description, icon: Icon }) => (
                                            <li key={id} className="border-b border-sand-100 last:border-b-0">
                                                <button
                                                    type="button"
                                                    onClick={() => onSelect(id)}
                                                    className="group flex min-h-[88px] w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-moss-50/70 focus-visible:bg-moss-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-moss-500 active:bg-moss-100/60 sm:gap-3.5 sm:px-5"
                                                >
                                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-moss-50 text-moss-700 ring-1 ring-inset ring-moss-200/40 transition-colors group-hover:bg-moss-100" aria-hidden="true">
                                                        <Icon size={20} strokeWidth={1.8} />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block text-sm font-semibold leading-5 text-sand-900">{title}</span>
                                                        <span className="mt-1 block text-xs leading-relaxed text-sand-600">{description}</span>
                                                    </span>
                                                    <ChevronRight size={17} className="shrink-0 text-sand-600 transition-colors group-hover:text-moss-600" aria-hidden="true" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-sand-300 bg-white px-5 py-8 text-center">
                        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sand-100 text-sand-600" aria-hidden="true">
                            <Search size={22} />
                        </span>
                        <h3 className="text-base font-semibold text-sand-900">Bir ayar bulunamadı</h3>
                        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-sand-600">
                            Başka bir kelime deneyin veya tüm ayarları görmek için aramayı temizleyin.
                        </p>
                        <button type="button" onClick={clearSearch} className="mt-4 min-h-[44px] rounded-xl bg-moss-50 px-4 py-2.5 text-sm font-semibold text-moss-800 transition-colors hover:bg-moss-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 focus-visible:ring-offset-2">
                            Aramayı temizle
                        </button>
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
