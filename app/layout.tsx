import type { Metadata } from 'next';
import { Inter, Merriweather } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

const merriweather = Merriweather({ 
    subsets: ['latin'],
    weight: ['300', '400', '700', '900'],
    variable: '--font-merriweather',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Not Bahçesi - Ağaç Temalı Not Tutma',
    description: 'Bahçe ve ağaç temalı, modern zihin haritası not tutma uygulaması',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="tr" className={`${inter.variable} ${merriweather.variable}`}>
            <body className={inter.className}>{children}</body>
        </html>
    );
}
