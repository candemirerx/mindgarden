'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
    const [status, setStatus] = useState('Giriş yapılıyor...');
    const router = useRouter();
    const processedRef = useRef(false);

    useEffect(() => {
        // Çift çalışmayı önle
        if (processedRef.current) return;
        processedRef.current = true;

        const handleCallback = async () => {
            try {
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const queryParams = new URLSearchParams(window.location.search);
                
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                const code = queryParams.get('code');
                const error = queryParams.get('error');
                const errorDescription = queryParams.get('error_description');

                console.log('Callback params:', { 
                    hasAccessToken: !!accessToken, 
                    hasRefreshToken: !!refreshToken, 
                    hasCode: !!code,
                    error
                });

                if (error) {
                    console.error('OAuth error:', error, errorDescription);
                    setStatus(`Giriş hatası: ${errorDescription || error}`);
                    setTimeout(() => window.location.href = '/', 2000);
                    return;
                }

                if (accessToken && refreshToken) {
                    setStatus('Oturum oluşturuluyor...');
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });
                    
                    if (sessionError) {
                        console.error('Session set error:', sessionError);
                        setStatus('Giriş hatası: ' + sessionError.message);
                        setTimeout(() => window.location.href = '/', 2000);
                        return;
                    }
                    
                    setStatus('Giriş başarılı!');
                    // Hard redirect - router yerine window.location kullan
                    window.location.href = '/';
                    
                } else if (code) {
                    setStatus('Kod doğrulanıyor...');
                    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    
                    if (exchangeError) {
                        console.error('Code exchange error:', exchangeError);
                        setStatus('Giriş hatası: ' + exchangeError.message);
                        setTimeout(() => window.location.href = '/', 2000);
                        return;
                    }
                    
                    console.log('Exchange successful, session:', !!data.session);
                    setStatus('Giriş başarılı!');
                    
                    // Session'ın localStorage'a yazılmasını bekle
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    // Hard redirect - bu kritik!
                    window.location.href = '/';
                    
                } else {
                    // Parametre yok - mevcut session'ı kontrol et
                    setStatus('Oturum kontrol ediliyor...');
                    
                    const { data: { session } } = await supabase.auth.getSession();
                    
                    if (session) {
                        setStatus('Giriş başarılı!');
                    } else {
                        setStatus('Oturum bulunamadı.');
                    }
                    
                    window.location.href = '/';
                }
            } catch (error) {
                console.error('Auth callback error:', error);
                setStatus('Giriş sırasında hata oluştu.');
                setTimeout(() => window.location.href = '/', 2000);
            }
        };

        // Küçük gecikme - hash'in yüklenmesini bekle
        const timer = setTimeout(handleCallback, 150);
        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f4f1ea] to-[#e8e4dc] flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-stone-700 font-medium">{status}</p>
            </div>
        </div>
    );
}
