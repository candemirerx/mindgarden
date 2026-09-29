import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import Script from 'next/script';
import KokAyarlari from '@/components/ui/KokAyarlari';
import { temaBaslatmaBetigi } from '@/lib/tema';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

// Başlıklar için editoryal serif: organik/köklenmiş kimliği korur,
// Merriweather'ın ağır görünümü yerine daha ince ve modern bir duruş verir.
const fraunces = Fraunces({
    subsets: ['latin'],
    variable: '--font-display',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Not Bahçesi - Ağaç Temalı Not Tutma',
    description: 'Bahçe ve ağaç temalı, modern zihin haritası not tutma uygulaması',
};

export const viewport: Viewport = {
    // lib/tema.ts içindeki ACIK_ZEMIN/KOYU_ZEMIN ile aynı olmalı; tema
    // betiği ilk boyamada bu değeri seçilen temaya göre günceller.
    themeColor: '#F6F3EE',
    colorScheme: 'light dark',
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    // Mobil klavye açıldığında sayfanın zıplamasını engeller.
    maximumScale: 5,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Tema betiği ilk boyamadan önce <html> üzerine style yazar; bu yüzden
    // React'in sunucu HTML'i ile karşılaştırması susturulur.
    return (
        <html lang="tr" suppressHydrationWarning className={`${inter.variable} ${fraunces.variable}`}>
            <body className="font-sans antialiased">
                {/* Tema ilk boyamadan önce uygulanır: koyu temada beyaz ekran
                    parlaması olmaz. */}
                <Script
                    id="nb-tema"
                    strategy="beforeInteractive"
                    dangerouslySetInnerHTML={{ __html: temaBaslatmaBetigi }}
                />
                <KokAyarlari>{children}</KokAyarlari>
            </body>
        </html>
    );
}
