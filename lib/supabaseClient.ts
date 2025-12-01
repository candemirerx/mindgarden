import { createClient } from '@supabase/supabase-js';

// Supabase URL ve Anon Key'i environment variable'lardan al
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Supabase client oluştur - Capacitor WebView için optimize edilmiş ayarlar
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        storageKey: 'notbahcesi-auth',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }
});

// Hata kontrolü için yardımcı fonksiyon
export const checkSupabaseConnection = () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.warn('⚠️ Supabase credentials eksik! .env.local dosyasını oluşturun ve credentials\'ları ekleyin.');
        console.warn('Şimdilik uygulama çalışacak ama veri kaydedilmeyecek.');
        return false;
    }
    return true;
};
