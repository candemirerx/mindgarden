import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const origin = requestUrl.origin;
    
    // Mobil uygulama mı kontrol et (User-Agent veya query param ile)
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /android|iphone|ipad|mobile/i.test(userAgent);
    const fromApp = requestUrl.searchParams.get('from_app') === 'true';

    if (code) {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        // Mobil uygulama için custom scheme ile yönlendir
        if ((isMobile || fromApp) && data?.session) {
            const { access_token, refresh_token } = data.session;
            const appUrl = `notbahcesi://auth/callback#access_token=${access_token}&refresh_token=${refresh_token}&type=recovery`;
            return NextResponse.redirect(appUrl);
        }
    }

    // Web için ana sayfaya yönlendir
    return NextResponse.redirect(origin);
}
