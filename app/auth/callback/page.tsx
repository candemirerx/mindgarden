'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
    const [status, setStatus] = useState('Giriş yapılıyor...');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // URL'den hash parametrelerini al
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const queryParams = new URLSearchParams(window.location.search);
                
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                const code = queryParams.get('code');

                console.log('Callback params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, code: !!code });

                if (accessToken && refreshToken) {
                    // Token'lar hash'te var - direkt session ayarla
                    await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });
                    setStatus('Giriş başarılı! Yönlendiriliyorsunuz...');
                    
                    // Mobil uygulama için deep link dene
                    const isMobile = /android|iphone|ipad|mobile/i.test(navigator.userAgent);
                    if (isMobile) {
                        // Uygulamaya yönlendir
                        window.location.href = `notbahcesi://auth/callback#access_token=${accessToken}&refresh_token=${refreshToken}`;
                        
                        // 2 saniye sonra hala buradaysak web'e yönlendir
                        setTimeout(() => {
                            window.location.href = '/';
                        }, 2000);
                    } else {
                        window.location.href = '/';
                    }
                } else if (code) {
                    // Code var - exchange yap
                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) throw error;
                    
                    setStatus('Giriş başarılı! Yönlendiriliyorsunuz...');
                    
                    // Session'ı al ve mobil için deep link gönder
                    const { data: { session } } = await supabase.auth.getSession();
                    const isMobile = /android|iphone|ipad|mobile/i.test(navigator.userAgent);
                    
                    if (isMobile && session) {
                        window.location.href = `notbahcesi://auth/callback#access_token=${session.access_token}&refresh_token=${session.refresh_token}`;
                        setTimeout(() => {
                            window.location.href = '/';
                        }, 2000);
                    } else {
                        window.location.href = '/';
                    }
                } else {
                    // Parametre yok - ana sayfaya git
                    setStatus('Yönlendiriliyorsunuz...');
                    window.location.href = '/';
                }
            } catch (error) {
                console.error('Auth callback error:', error);
                setStatus('Giriş sırasında hata oluştu. Ana sayfaya yönlendiriliyorsunuz...');
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            }
        };

        handleCallback();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f4f1ea] to-[#e8e4dc] flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-stone-700 font-medium">{status}</p>
            </div>
        </div>
    );
}
