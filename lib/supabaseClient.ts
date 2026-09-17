import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { localClient } from './localClient';

// Supabase URL ve Anon Key'i environment variable'lardan al
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Kimlik bilgileri gerçekten kullanılabilir mi?
 *
 * Boş veya Supabase kalıbına uymayan bir adres verildiğinde bulut moduna
 * geçmek anlamsız olur: istemci kurulur, her istek ağ hatasıyla döner ve
 * konsol bu hatalarla dolar. Bu durumda yerel moda düşüyoruz.
 */
export const hasSupabaseCredentials =
    /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/.test(supabaseUrl) &&
    !supabaseUrl.includes('zojnjnyjavftnscbnikv') &&
    supabaseAnonKey.length > 40 &&
    !supabaseAnonKey.includes('placeholder');

export const isLocalBackend = !hasSupabaseCredentials;

const LOCAL_MODE_NOTICE =
    'Yerel mod etkin: Supabase kimlik bilgileri tanımlı olmadığı için veriler bu tarayıcıda saklanıyor. ' +
    'Bulut moduna geçmek için .env.local içindeki NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY değerlerini doldurun.';

let cloudClient: SupabaseClient | null = null;

/** Gerçek Supabase istemcisini yalnızca gerektiğinde ve bir kez oluşturur. */
function getCloudClient(): SupabaseClient {
    if (!cloudClient) {
        cloudClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true,
                detectSessionInUrl: true,
                autoRefreshToken: true,
                // Storage key'i varsayılan bırak - PKCE code_verifier ile uyumlu olsun
                storage: typeof window !== 'undefined' ? window.localStorage : undefined,
                flowType: 'pkce',
            },
        });
    }
    return cloudClient;
}

if (isLocalBackend && typeof window !== 'undefined') {
    // Tek seferlik, gürültüsüz bilgi. Eski halinde her başarısız istek
    // console.error ile loglandığı için konsol saniyeler içinde doluyordu.
    console.info(LOCAL_MODE_NOTICE);
}

/**
 * Uygulamanın kullandığı istemci.
 *
 * Yerel modda `localClient`, bulut modunda gerçek Supabase istemcisi döner.
 * `localClient` bu projede kullanılan supabase-js yüzeyini (auth + basit sorgu
 * zincirleri) karşıladığı için çağıran tarafların değişmesi gerekmez.
 */
export const supabase: SupabaseClient = isLocalBackend
    ? (localClient as unknown as SupabaseClient)
    : getCloudClient();

// Hata kontrolü için yardımcı fonksiyon
export const checkSupabaseConnection = () => {
    if (isLocalBackend) {
        console.info(LOCAL_MODE_NOTICE);
        return false;
    }
    return true;
};
