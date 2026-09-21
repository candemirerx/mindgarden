/**
 * Sağlayıcıya özel API anahtarı ve model yönetimi.
 *
 * Her sağlayıcının kendi anahtarı ve kendi modeli vardır; biri için girilen
 * anahtar diğerlerini etkilemez. Kullanıcı hazır sağlayıcılarda da model adını
 * elle değiştirebilir.
 */
export type ProviderType = 'gemini' | 'openai' | 'anthropic' | 'custom';

export const PROVIDER_IDS: ProviderType[] = ['gemini', 'openai', 'anthropic', 'custom'];

export const PROVIDER_LABELS: Record<ProviderType, string> = {
    gemini: 'Google Gemini',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    custom: 'Özel (Custom)'
};

/** Sağlayıcı seçilmediğinde kullanılan model. */
export const DEFAULT_MODELS: Record<ProviderType, string> = {
    gemini: 'gemini-2.5-flash',
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-haiku-20240307',
    custom: ''
};

export const MODEL_HINTS: Record<ProviderType, string> = {
    gemini: 'Örn. gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-pro',
    openai: 'Örn. gpt-4o-mini, gpt-4o, gpt-4.1-mini',
    anthropic: 'Örn. claude-3-haiku-20240307, claude-3-5-sonnet-latest',
    custom: 'Sağlayıcınızın panelinde yazan gerçek model kimliği'
};

export const KEY_HINTS: Record<ProviderType, string> = {
    gemini: 'Google AI Studio anahtarınız',
    openai: 'OpenAI platform anahtarınız',
    anthropic: 'Anthropic Console anahtarınız',
    custom: 'Sağlayıcınızın verdiği anahtar'
};

const PROVIDER_KEY = 'nb-ai-provider';
const LEGACY_KEY = 'nb-ai-key';
const LEGACY_GEMINI_KEY = 'nb-gemini-key';
const CUSTOM_URL_KEY = 'nb-ai-custom-url';

function keyStorageKey(provider: ProviderType): string {
    return `nb-ai-key-${provider}`;
}

function modelStorageKey(provider: ProviderType): string {
    return provider === 'custom' ? 'nb-ai-custom-model' : `nb-ai-model-${provider}`;
}

/** Etkin sağlayıcı; tanımlı değilse Gemini. */
export function readActiveProvider(): ProviderType {
    if (typeof window === 'undefined') return 'gemini';
    const stored = localStorage.getItem(PROVIDER_KEY) as ProviderType | null;
    return stored && PROVIDER_IDS.includes(stored) ? stored : 'gemini';
}

export function saveActiveProvider(provider: ProviderType): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PROVIDER_KEY, provider);
}

/** Sağlayıcının anahtarını döner; eski tek anahtar varsa etkin sağlayıcıya taşır. */
export function readProviderKey(provider: ProviderType): string {
    if (typeof window === 'undefined') return '';

    const own = localStorage.getItem(keyStorageKey(provider));
    if (own) return own;

    // Eski sürümde tek anahtar tüm sağlayıcılar için ortaktı. Yalnızca etkin
    // sağlayıcı için bir kez taşırız; diğerleri boş kalır ve kullanıcı kendi
    // anahtarını girer.
    if (provider === readActiveProvider()) {
        const legacy =
            localStorage.getItem(LEGACY_KEY) || localStorage.getItem(LEGACY_GEMINI_KEY);
        if (legacy) {
            localStorage.setItem(keyStorageKey(provider), legacy);
            return legacy;
        }
    }

    return '';
}

export function saveProviderKey(provider: ProviderType, key: string): void {
    if (typeof window === 'undefined') return;
    const trimmed = key.trim();

    if (trimmed) {
        localStorage.setItem(keyStorageKey(provider), trimmed);
    } else {
        localStorage.removeItem(keyStorageKey(provider));
    }
}

/** Sağlayıcının modelini döner; boşsa varsayılan model kullanılır. */
export function readProviderModel(provider: ProviderType): string {
    if (typeof window === 'undefined') return DEFAULT_MODELS[provider];
    const stored = localStorage.getItem(modelStorageKey(provider));
    return stored && stored.trim() ? stored : DEFAULT_MODELS[provider];
}

/** Kullanıcının elle yazdığı model; boş olabilir. */
export function readRawProviderModel(provider: ProviderType): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(modelStorageKey(provider)) ?? '';
}

export function saveProviderModel(provider: ProviderType, model: string): void {
    if (typeof window === 'undefined') return;
    const trimmed = model.trim();

    if (trimmed) {
        localStorage.setItem(modelStorageKey(provider), trimmed);
    } else {
        localStorage.removeItem(modelStorageKey(provider));
    }
}

function modelListStorageKey(provider: ProviderType): string {
    return `nb-ai-model-list-${provider}`;
}

/** Kayıtlı model adları; varsayılan model de listede yer alır. */
export function readModelList(provider: ProviderType): string[] {
    if (typeof window === 'undefined') return [];

    const varsayilan = DEFAULT_MODELS[provider];
    let kayitli: string[] = [];

    try {
        const raw = localStorage.getItem(modelListStorageKey(provider));
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
            kayitli = parsed.filter((x): x is string => typeof x === 'string' && !!x.trim());
        }
    } catch {
        kayitli = [];
    }

    // Varsayılan model her zaman listede bulunsun ki tek tıkla geri dönülebilsin.
    if (varsayilan && !kayitli.includes(varsayilan)) {
        kayitli = [varsayilan, ...kayitli];
    }

    return kayitli;
}

export function saveModelList(provider: ProviderType, list: string[]): void {
    if (typeof window === 'undefined') return;

    const temiz = Array.from(new Set(list.map((x) => x.trim()).filter(Boolean)));
    localStorage.setItem(modelListStorageKey(provider), JSON.stringify(temiz));
}

export function readCustomUrl(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(CUSTOM_URL_KEY) ?? '';
}

export function saveCustomUrl(url: string): void {
    if (typeof window === 'undefined') return;
    const trimmed = url.trim();

    if (trimmed) {
        localStorage.setItem(CUSTOM_URL_KEY, trimmed);
    } else {
        localStorage.removeItem(CUSTOM_URL_KEY);
    }
}
