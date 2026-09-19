import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';

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
    themeColor: '#F9F6F1',
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
    return (
        <html lang="tr" className={`${inter.variable} ${fraunces.variable}`}>
            <body className="font-sans antialiased">{children}</body>
        </html>
    );
}
