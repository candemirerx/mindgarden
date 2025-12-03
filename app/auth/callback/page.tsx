'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
    const [status, setStatus] = useState('Giriş yapılıyor...');

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const error = queryParams.get('error');
        const errorDescription = queryParams.get('error_description');

        // OAuth hatası varsa göster
        if (error) {
            console.error('OAuth error:', error, errorDescription);
            setStatus(`Giriş hatası: ${errorDescription || error}`);
            setTimeout(() => window.location.href = '/', 2000);
            return;
        }

        // Supabase'in onAuthStateChange'ini dinle
        // detectSessionInUrl: true ayarı sayesinde Supabase URL'deki code'u otomatik işler
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, !!session);
            
            if (event === 'SIGNED_IN' && session) {
                setStatus('Giriş başarılı!');
                // Session oluştu, ana sayfaya yönlendir
                window.location.href = '/';
            } else if (event === 'TOKEN_REFRESHED' && session) {
                setStatus('Giriş başarılı!');
                window.location.href = '/';
            }
        });

        // 5 saniye içinde session oluşmazsa kontrol et ve yönlendir
        const timeout = setTimeout(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setStatus('Giriş başarılı!');
            } else {
                setStatus('Oturum bulunamadı...');
            }
            window.location.href = '/';
        }, 5000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
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
