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
// not-bahcesi.vercel.app kaldırılmıştı (404 dönüyordu), ayakta olan dağıtım kullanılıyor.
// NEXT_PUBLIC_VERCEL_URL kullanılmaz: Vercel bu adı kendisi doldurur (derlemeye
// özel, korumalı ve https'siz adres), web sürümündeki indirme bağlantısı 404
// veriyordu. Kalıcı site adresi NEXT_PUBLIC_SITE_URL ile verilir.
const VERCEL_URL = (() => {
    const adres = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mindgarden-neon.vercel.app').trim().replace(/\/+$/, '');
    return /^https?:\/\//.test(adres) ? adres : 'https://' + adres;
})();

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

/**
 * Uygulama sürümü. Android tarafındaki `versionName` ile aynı tutulur
 * (android/app/build.gradle) ve Ayarlar → Hakkında bölümünde gösterilir.
 */
export const APP_VERSION = '2.2.18';

// Supabase URL'leri için de aynı mantık
export const getApiUrl = (path: string): string => {
    const base = API_BASE_URL || '';
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

/** PC yardımcısının indirme sayfası (Play Store kullanıcıları yardımcıyı buradan alır). */
export const PC_YARDIMCISI_SAYFASI = VERCEL_URL + '/pc';
/** Yardımcının doğrudan indirme adresi (scripts/yardimci-zip.mjs üretir). */
export const PC_YARDIMCISI_ZIP = VERCEL_URL + '/indir/not-bahcesi-pc-yardimcisi.zip';
