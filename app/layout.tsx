import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

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
        <html lang="tr">
            <body className={inter.className}>{children}</body>
        </html>
    );
}
