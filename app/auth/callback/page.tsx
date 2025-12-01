'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
    const [status, setStatus] = useState('Giriş yapılıyor...');
    const router = useRouter();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // URL'den hash ve query parametrelerini al
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const queryParams = new URLSearchParams(window.location.search);
                
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                const code = queryParams.get('code');
                const error = queryParams.get('error');
                const errorDescription = queryParams.get('error_description');

                console.log('Callback params:', { 
                    accessToken: !!accessToken, 
                    refreshToken: !!refreshToken, 
                    code: !!code,
                    error,
                    hash: window.location.hash.substring(0, 50),
                    search: window.location.search.substring(0, 50)
                });

                // Hata varsa göster
                if (error) {
                    console.error('OAuth error:', error, errorDescription);
                    setStatus(`Giriş hatası: ${errorDescription || error}`);
                    setTimeout(() => router.push('/'), 3000);
                    return;
                }

                if (accessToken && refreshToken) {
                    // Token'lar hash'te var - direkt session ayarla
                    setStatus('Oturum oluşturuluyor...');
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });
                    
                    if (sessionError) {
                        console.error('Session set error:', sessionError);
                        setStatus('Giriş hatası: ' + sessionError.message);
                        setTimeout(() => router.push('/'), 2000);
                        return;
                    }
                    
                    setStatus('Giriş başarılı! Yönlendiriliyorsunuz...');
                    // Router kullan - daha güvenilir
                    setTimeout(() => router.push('/'), 500);
                    
                } else if (code) {
                    // Code var - exchange yap
                    setStatus('Kod doğrulanıyor...');
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    
                    if (exchangeError) {
                        console.error('Code exchange error:', exchangeError);
                        setStatus('Giriş hatası: ' + exchangeError.message);
                        setTimeout(() => router.push('/'), 2000);
                        return;
                    }
                    
                    setStatus('Giriş başarılı! Yönlendiriliyorsunuz...');
                    setTimeout(() => router.push('/'), 500);
                    
                } else {
                    // Parametre yok - Supabase'in otomatik session detection'ını dene
                    setStatus('Oturum kontrol ediliyor...');
                    
                    // Supabase client'ın URL'yi işlemesini bekle
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    const { data: { session } } = await supabase.auth.getSession();
                    
                    if (session) {
                        setStatus('Giriş başarılı! Yönlendiriliyorsunuz...');
                    } else {
                        setStatus('Oturum bulunamadı. Yönlendiriliyorsunuz...');
                    }
                    
                    setTimeout(() => router.push('/'), 500);
                }
            } catch (error) {
                console.error('Auth callback error:', error);
                setStatus('Giriş sırasında hata oluştu. Ana sayfaya yönlendiriliyorsunuz...');
                setTimeout(() => router.push('/'), 2000);
            }
        };

        // Küçük bir gecikme ile başla - bazı tarayıcılarda hash geç yükleniyor
        const timer = setTimeout(handleCallback, 100);
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
