'use client';

/**
 * Ayar arayüzünün ortak yapı taşları.
 *
 * Ayarlar penceresi büyüdükçe her sekme kendi düğmesini, kendi kutusunu ve
 * kendi anahtarını yeniden yazıyordu; bu da aralarında ölçü, renk ve davranış
 * farkları oluşturuyordu. Buradaki bileşenler tek bir görsel dil tanımlar:
 *
 *   - `SettingsSection`  : Başlıklı beyaz kart (ikon + açıklama + içerik)
 *   - `SettingsRow`      : Sol tarafta açıklama, sağda denetim barındıran satır
 *   - `SettingsSwitch`   : Erişilebilir açma/kapama anahtarı
 *   - `SettingsField`    : Etiket + yardım metni + girdi sarmalayıcısı
 *   - `SettingsNote`     : Görsel geri bildirim şeridi (başarı/hata/bilgi)
 *   - `SettingsTab`      : Masaüstünde dikey, telefonda yatay sekme düğmesi
 *   - `SettingsPageHeader`: Sekme içeriğinin başlık bloğu
 *
 * Sekmeler bu bileşenleri kullanır; yeni bir ayar eklerken de aynı parçalar
 * kullanılmalıdır ki pencere bütün olarak tutarlı kalsın.
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';

/** Koşullu sınıf adlarını okunur biçimde birleştirir. */
export function cx(...values: Array<string | false | null | undefined>): string {
    return values.filter(Boolean).join(' ');
}

/** Tüm girdilerde ortak alan görünümü. */
export const settingsFieldClass =
    'w-full rounded-xl border border-sand-300 bg-white px-3.5 py-2.5 text-sm text-sand-900 ' +
    'placeholder:text-sand-600 outline-none transition-colors duration-200 ' +
    'focus:border-moss-500 focus:ring-4 focus:ring-moss-500/10 ' +
    'disabled:cursor-not-allowed disabled:border-sand-200 disabled:bg-sand-100 disabled:text-sand-600';

type Tone = 'moss' | 'clay' | 'berry' | 'sand';

const toneBadge: Record<Tone, string> = {
    moss: 'bg-moss-100 text-moss-700',
    clay: 'bg-clay-100 text-clay-700',
    berry: 'bg-berry-100 text-berry-700',
    sand: 'bg-sand-100 text-sand-600'
};

const tonePill: Record<Tone, string> = {
    moss: 'border-moss-500/30 bg-moss-500/10 text-moss-700',
    clay: 'border-clay-500/30 bg-clay-500/10 text-clay-700',
    berry: 'border-berry-500/30 bg-berry-500/10 text-berry-700',
    sand: 'border-sand-300 bg-sand-100 text-sand-600'
};

/* ------------------------------------------------------------------ */
/* Yüzeyler                                                            */
/* ------------------------------------------------------------------ */

interface SettingsSectionProps {
    icon?: LucideIcon;
    title?: string;
    description?: string;
    tone?: Tone;
    /** Başlık satırının sağında gösterilecek küçük denetim (ör. anahtar). */
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    /** İçerik alanının dolgusu olmadan tam genişlikte kullanılması için. */
    flush?: boolean;
}

/** İkonlu başlık ve açıklamayla çevrili beyaz ayar kartı. */
export function SettingsSection({
    icon: Icon,
    title,
    description,
    tone = 'moss',
    action,
    children,
    className,
    flush = false
}: SettingsSectionProps) {
    const hasHeader = Boolean(title || description);
    return (
        <section className={cx('overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-soft', className)}>
            {hasHeader && (
                <header className="flex items-start gap-3 border-b border-sand-100 px-4 py-3.5 sm:px-5">
                    {Icon && (
                        <span className={cx('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl', toneBadge[tone])} aria-hidden>
                            <Icon size={17} />
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        {title && <h4 className="text-sm font-semibold leading-6 text-sand-900">{title}</h4>}
                        {description && (
                            <p className="mt-0.5 text-xs leading-relaxed text-sand-600">{description}</p>
                        )}
                    </div>
                    {action && <div className="flex-shrink-0 self-center">{action}</div>}
                </header>
            )}
            <div className={flush ? '' : 'px-4 py-4 sm:px-5'}>{children}</div>
        </section>
    );
}

interface SettingsRowProps {
    icon?: LucideIcon;
    title: React.ReactNode;
    description?: React.ReactNode;
    /** Sağda gösterilecek denetim (anahtar, düğme, rozet). */
    children?: React.ReactNode;
    /** Kapatılmış öğeler için soluk görünüm. */
    dimmed?: boolean;
    tone?: Tone;
    className?: string;
}

/** Açıklamalı ayar satırı: metin solda, denetim sağda. */
export function SettingsRow({
    icon: Icon,
    title,
    description,
    children,
    dimmed = false,
    tone = 'moss',
    className
}: SettingsRowProps) {
    return (
        <div
            className={cx(
                'flex items-start gap-2.5 rounded-xl border p-3 transition-colors duration-200 sm:gap-3 sm:p-4',
                dimmed ? 'border-sand-200 bg-sand-50/60' : 'border-sand-200 bg-white',
                className
            )}
        >
            {Icon && (
                <span
                    aria-hidden
                    className={cx(
                        'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-colors duration-200 sm:h-10 sm:w-10',
                        dimmed ? 'bg-sand-100 text-sand-600' : cx(toneBadge[tone], 'ring-1 ring-inset ring-black/5')
                    )}
                >
                    <Icon size={18} />
                </span>
            )}
            <div className="min-w-0 flex-1 self-center">
                <div
                    className={cx(
                        'text-sm font-semibold leading-5',
                        dimmed ? 'text-sand-600' : 'text-sand-900'
                    )}
                >
                    {title}
                </div>
                {description && (
                    <p className="mt-0.5 text-xs leading-snug text-sand-600">{description}</p>
                )}
            </div>
            {children && <div className="flex flex-shrink-0 items-center gap-1.5 self-center">{children}</div>}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Denetimler                                                          */
/* ------------------------------------------------------------------ */

interface SettingsSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    /** Ekran okuyucular için zorunlu etiket. */
    label: string;
    id?: string;
    disabled?: boolean;
}

/** Erişilebilir açma/kapama anahtarı (role="switch"). */
export function SettingsSwitch({ checked, onChange, label, id, disabled = false }: SettingsSwitchProps) {
    return (
        <button
            type="button"
            id={id}
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cx(
                'relative inline-flex h-11 w-11 flex-shrink-0 items-center rounded-xl',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                disabled && 'cursor-not-allowed opacity-50'
            )}
        >
            <span
                aria-hidden
                className={cx('flex h-6 w-11 items-center rounded-full transition-colors duration-200', checked ? 'bg-moss-600' : 'bg-sand-300')}
            >
                <span className={cx('h-5 w-5 rounded-full bg-white shadow transition-transform duration-200', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
            </span>
        </button>
    );
}

interface SettingsFieldProps {
    label?: string;
    hint?: React.ReactNode;
    htmlFor?: string;
    children: React.ReactNode;
    className?: string;
}

/** Etiket + girdi + yardım metnini tek düzende toplar. */
export function SettingsField({ label, hint, htmlFor, children, className }: SettingsFieldProps) {
    return (
        <div className={cx('space-y-1.5', className)}>
            {label && (
                <label htmlFor={htmlFor} className="block text-xs font-semibold text-sand-700">
                    {label}
                </label>
            )}
            {children}
            {hint && <p className="text-xs leading-relaxed text-sand-600">{hint}</p>}
        </div>
    );
}

/** Küçük bölüm başlığı (ör. "Bağlantı yolu"). */
export function SettingsGroupLabel({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <p className={cx('text-xs font-semibold uppercase tracking-wider text-sand-600', className)}>
            {children}
        </p>
    );
}

type NoteTone = 'ok' | 'error' | 'info';

const noteStyle: Record<NoteTone, string> = {
    ok: 'border-moss-200 bg-moss-50 text-moss-800',
    error: 'border-berry-200 bg-berry-50 text-berry-700',
    info: 'border-clay-200 bg-clay-50 text-clay-800'
};

/** İşlem geri bildirimi; ekran okuyuculara da duyurulur. */
export function SettingsNote({ tone = 'info', children }: { tone?: NoteTone; children: React.ReactNode }) {
    return (
        <p role="status" className={cx('rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed', noteStyle[tone])}>
            {children}
        </p>
    );
}

/**
 * Durağan bilgi şeridi: yönlendirme metinleri için. `SettingsNote`'tan farkı
 * `role="status"` taşımamasıdır; ekranda duran bir açıklama her durum
 * değişiminde ekran okuyucuya okunmamalıdır.
 */
export function SettingsHint({ tone = 'info', children }: { tone?: NoteTone; children: React.ReactNode }) {
    return (
        <p className={cx('rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed', noteStyle[tone])}>
            {children}
        </p>
    );
}

interface SettingsTabProps {
    active: boolean;
    onClick: () => void;
    icon: LucideIcon;
    label: string;
    id: string;
    /** Sekmenin sağında gösterilecek sayı/rozet. */
    badge?: React.ReactNode;
}

/** Sekme düğmesi: masaüstünde satır, telefonda yatay kaydırılan çip. */
export function SettingsTab({ active, onClick, icon: Icon, label, id, badge }: SettingsTabProps) {
    return (
        <button
            type="button"
            role="tab"
            id={`${id}-tab`}
            aria-selected={active}
            aria-controls={`${id}-panel`}
            onClick={onClick}
            className={cx(
                'relative flex shrink-0 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40 focus-visible:ring-offset-1',
                'md:w-full md:justify-start',
                active
                    ? 'border-sand-200 bg-white text-sand-900 shadow-soft md:border-transparent md:bg-moss-50 md:text-moss-800'
                    : 'border-transparent text-sand-600 hover:bg-white/70 hover:text-sand-800'
            )}
        >
            {active && (
                <span
                    aria-hidden
                    className="absolute inset-y-1.5 left-0 hidden w-[3px] rounded-full bg-moss-600 md:block"
                />
            )}
            <Icon size={16} className={active ? 'text-moss-700' : 'text-sand-600'} />
            <span className="whitespace-nowrap">{label}</span>
            {badge !== undefined && (
                <span
                    className={cx(
                        'ml-auto hidden rounded-full px-2 py-0.5 text-xs font-semibold md:inline-block',
                        active ? 'bg-moss-600/10 text-moss-700' : 'bg-sand-200 text-sand-600'
                    )}
                >
                    {badge}
                </span>
            )}
        </button>
    );
}

interface SettingsPageHeaderProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    tone?: Tone;
    badge?: React.ReactNode;
}

/** Sekme içeriğinin başlığı; tüm sekmelerde aynı hiyerarşiyi kurar. */
export function SettingsPageHeader({ icon: Icon, title, description, tone = 'moss', badge }: SettingsPageHeaderProps) {
    return (
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
                {Icon && (
                    <span
                        className={cx('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl', toneBadge[tone])}
                        aria-hidden
                    >
                        <Icon size={20} />
                    </span>
                )}
                <div className="min-w-0">
                    <h3 className="text-lg font-semibold tracking-tight text-sand-900 sm:text-xl">{title}</h3>
                    {description && (
                        <p className="mt-1 max-w-prose text-xs leading-relaxed text-sand-600 sm:text-sm">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            {badge && <div className="flex-shrink-0 self-start">{badge}</div>}
        </div>
    );
}

/** Küçük durum rozeti (ör. "12 / 15 etkin"). */
export function SettingsPill({ tone = 'sand', children }: { tone?: Tone; children: React.ReactNode }) {
    return (
        <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold', tonePill[tone])}>
            {children}
        </span>
    );
}

/** Kart içi ince ayırıcı. */
export function SettingsDivider({ className }: { className?: string }) {
    return <hr className={cx('border-sand-100', className)} />;
}
