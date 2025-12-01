// API Base URL - Hibrit yapı için dinamik URL
// Web: Relative path kullanır (SSR)
// Mobil: Vercel production URL'i kullanır (Static Export)

const isClient = typeof window !== 'undefined';
const isMobileApp = isClient && (
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    (window.location.hostname === 'localhost' && window.location.port === '')
);

// Production Vercel URL'i - mobil uygulama için
const VERCEL_URL = process.env.NEXT_PUBLIC_VERCEL_URL || 'https://not-bahcesi.vercel.app';

// API Base URL belirleme
export const API_BASE_URL = (() => {
    // Server-side rendering
    if (!isClient) {
        return process.env.NEXT_PUBLIC_API_BASE_URL || '';
    }

    // Mobil uygulama (Capacitor)
    if (isMobileApp) {
        return VERCEL_URL;
    }

    // Web tarayıcı - relative path
    return process.env.NEXT_PUBLIC_API_BASE_URL || '';
})();

// API endpoint'leri
export const API_ENDPOINTS = {
    spellcheck: `${API_BASE_URL}/api/spellcheck`,
    chat: `${API_BASE_URL}/api/chat`,
};

// Supabase URL'leri için de aynı mantık
export const getApiUrl = (path: string): string => {
    const base = API_BASE_URL || '';
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};
