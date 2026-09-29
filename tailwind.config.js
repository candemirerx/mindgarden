/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './lib/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    /*
     * Koyu tema: .dark sınıfı <html> üzerine eklenir; renkler CSS
     * değişkenlerinden gelir (app/globals.css). Böylece bileşenlerde tek bir
     * dark: varyantı yazmadan tüm arayüz tema değiştirir.
     */
    darkMode: 'class',
    /*
     * Dokunmatik cihazlarda `hover:` stilleri yapışıp kalıyordu: bir bahçe
     * kartına dokununca ağaç simgesi yeşile dönüyor ve başka bir yere
     * dokunana kadar öyle kalıyordu. Bu bayrak hover stillerini yalnızca
     * gerçek fare/kalem olan cihazlarda devreye sokar (Tailwind 3.4+).
     */
    future: {
        hoverOnlyWhenSupported: true,
    },
    theme: {
        extend: {
            /**
             * Renk ölçekleri bilinçli olarak Tailwind'in stone/emerald/amber/red
             * basamaklarıyla aynı açıklıkta tasarlandı: sıcak tonlu ama
             * kontrast oranları tanıdık. Böylece varsayılan paletten geçiş
             * görsel olarak güvenli.
             */
            colors: {
                /* Kart/panel yüzeyi (bg-white, text-white) */
                white: 'rgb(var(--surface) / <alpha-value>)',
                /* Sıcak nötr - stone'un ısıtılmış karşılığı */
                sand: {
                    50: 'rgb(var(--sand-50) / <alpha-value>)',
                    100: 'rgb(var(--sand-100) / <alpha-value>)',
                    200: 'rgb(var(--sand-200) / <alpha-value>)',
                    300: 'rgb(var(--sand-300) / <alpha-value>)',
                    400: 'rgb(var(--sand-400) / <alpha-value>)',
                    500: 'rgb(var(--sand-500) / <alpha-value>)',
                    600: 'rgb(var(--sand-600) / <alpha-value>)',
                    700: 'rgb(var(--sand-700) / <alpha-value>)',
                    800: 'rgb(var(--sand-800) / <alpha-value>)',
                    900: 'rgb(var(--sand-900) / <alpha-value>)',
                    950: 'rgb(var(--sand-950) / <alpha-value>)',
                },
                /* Birincil yeşil - emerald'ın toprak tonlu karşılığı */
                moss: {
                    50: 'rgb(var(--moss-50) / <alpha-value>)',
                    100: 'rgb(var(--moss-100) / <alpha-value>)',
                    200: 'rgb(var(--moss-200) / <alpha-value>)',
                    300: 'rgb(var(--moss-300) / <alpha-value>)',
                    400: 'rgb(var(--moss-400) / <alpha-value>)',
                    500: 'rgb(var(--moss-500) / <alpha-value>)',
                    600: 'rgb(var(--moss-600) / <alpha-value>)',
                    700: 'rgb(var(--moss-700) / <alpha-value>)',
                    800: 'rgb(var(--moss-800) / <alpha-value>)',
                    900: 'rgb(var(--moss-900) / <alpha-value>)',
                    950: 'rgb(var(--moss-950) / <alpha-value>)',
                },
                /* Kahve - ağaç kabuğu; eski arayüzün ana rengi */
                bark: {
                    50: 'rgb(var(--bark-50) / <alpha-value>)',
                    100: 'rgb(var(--bark-100) / <alpha-value>)',
                    200: 'rgb(var(--bark-200) / <alpha-value>)',
                    300: 'rgb(var(--bark-300) / <alpha-value>)',
                    400: 'rgb(var(--bark-400) / <alpha-value>)',
                    500: 'rgb(var(--bark-500) / <alpha-value>)',
                    600: 'rgb(var(--bark-600) / <alpha-value>)',
                    700: 'rgb(var(--bark-700) / <alpha-value>)',
                    800: 'rgb(var(--bark-800) / <alpha-value>)',
                    900: 'rgb(var(--bark-900) / <alpha-value>)',
                    950: 'rgb(var(--bark-950) / <alpha-value>)',
                },
                /* Amber - toprak/bal vurgusu; amber'ın yumuşatılmış karşılığı */
                clay: {
                    50: 'rgb(var(--clay-50) / <alpha-value>)',
                    100: 'rgb(var(--clay-100) / <alpha-value>)',
                    200: 'rgb(var(--clay-200) / <alpha-value>)',
                    300: 'rgb(var(--clay-300) / <alpha-value>)',
                    400: 'rgb(var(--clay-400) / <alpha-value>)',
                    500: 'rgb(var(--clay-500) / <alpha-value>)',
                    600: 'rgb(var(--clay-600) / <alpha-value>)',
                    700: 'rgb(var(--clay-700) / <alpha-value>)',
                    800: 'rgb(var(--clay-800) / <alpha-value>)',
                    900: 'rgb(var(--clay-900) / <alpha-value>)',
                    950: 'rgb(var(--clay-950) / <alpha-value>)',
                },
                /* Kırmızı - silme ve hata; red'in sıcak karşılığı */
                berry: {
                    50: 'rgb(var(--berry-50) / <alpha-value>)',
                    100: 'rgb(var(--berry-100) / <alpha-value>)',
                    200: 'rgb(var(--berry-200) / <alpha-value>)',
                    300: 'rgb(var(--berry-300) / <alpha-value>)',
                    400: 'rgb(var(--berry-400) / <alpha-value>)',
                    500: 'rgb(var(--berry-500) / <alpha-value>)',
                    600: 'rgb(var(--berry-600) / <alpha-value>)',
                    700: 'rgb(var(--berry-700) / <alpha-value>)',
                    800: 'rgb(var(--berry-800) / <alpha-value>)',
                    900: 'rgb(var(--berry-900) / <alpha-value>)',
                    950: 'rgb(var(--berry-950) / <alpha-value>)',
                },
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
                display: ['var(--font-display)', 'Georgia', 'serif'],
                // Mevcut `font-serif` kullanımları da yeni editoryal serife bağlansın
                serif: ['var(--font-display)', 'Georgia', 'serif'],
            },
            borderRadius: {
                /* Eski sürümdeki şişkin köşeler sıkılaştırıldı */
                xl: '0.75rem',
                '2xl': '1rem',
                '3xl': '1.25rem',
                '4xl': '1.5rem',
            },
            boxShadow: {
                /* Katmanlı, düşük alfalı gölgeler - modern derinlik */
                soft: '0 1px 2px rgba(29, 21, 16, 0.04), 0 1px 3px rgba(29, 21, 16, 0.06)',
                card: '0 1px 3px rgba(29, 21, 16, 0.05), 0 8px 24px -10px rgba(29, 21, 16, 0.12)',
                lift: '0 2px 6px rgba(29, 21, 16, 0.06), 0 16px 40px -14px rgba(29, 21, 16, 0.18)',
                pop: '0 8px 16px rgba(29, 21, 16, 0.08), 0 28px 64px -20px rgba(29, 21, 16, 0.3)',
            },
            transitionTimingFunction: {
                smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
            },
            animation: {
                'fade-in': 'fadeIn 0.25s ease-out',
                'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                'scale-in': 'scaleIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.96)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
            },
        },
    },
    plugins: [],
};
