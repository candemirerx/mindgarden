'use client';

import { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { temaDegisiminiIzle, temaUygula } from '@/lib/tema';

/**
 * Kök ayarlar: tema eşitlemesi ve hareket tercihi.
 *
 * Tema ilk boyamadan önce app/layout.tsx içindeki betikle uygulanır; burada
 * sistem teması değiştiğinde ve diğer sekmelerde tercih güncellendiğinde
 * eşitleme sürdürülür.
 *
 * MotionConfig reducedMotion="user": işletim sisteminde "hareketi azalt"
 * açıksa framer-motion dönüşüm ve yerleşim animasyonlarını uygulamaz
 * (WCAG 2.3.3).
 */
export default function KokAyarlari({ children }: { children: React.ReactNode }) {
    // Cihaz testi kancası (window.__nbUzak) her sayfada hazır olsun; ayrı parça
    // olarak sonradan yüklenir, ilk açılışı yavaşlatmaz.
    useEffect(() => { void import('@/lib/baglantiDurumu'); }, []);
    // Açılışta (ve arka plandan dönüşte) seçili bağlantı yoluna kendiliğinden
    // bağlanılır; Ayarlar → Bilgisayar bağlantısı'ndan kapatılabilir. Tarayıcıda
    // ve tercih kapalıyken etkisizdir (lib/otomatikBaglanti bunu kendisi bilir).
    useEffect(() => {
        let iptal = false;
        const baglan = () => { if (!iptal) void import('@/lib/otomatikBaglanti').then(m => m.otomatikBaglan()).catch(() => undefined); };
        // İlk boyama ve sayfa kurulumu bitsin diye kısa bir gecikmeyle başlar.
        const zaman = setTimeout(baglan, 1500);
        const gorunurluk = () => { if (document.visibilityState === 'visible') baglan(); };
        document.addEventListener('visibilitychange', gorunurluk);
        return () => { iptal = true; clearTimeout(zaman); document.removeEventListener('visibilitychange', gorunurluk); };
    }, []);
    useEffect(() => {
        temaUygula();
        return temaDegisiminiIzle();
    }, []);

    return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

