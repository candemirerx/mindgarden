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
    useEffect(() => {
        temaUygula();
        return temaDegisiminiIzle();
    }, []);

    return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

