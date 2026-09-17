/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './lib/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            /**
             * Renk ölçekleri bilinçli olarak Tailwind'in stone/emerald/amber/red
             * basamaklarıyla aynı açıklıkta tasarlandı: sıcak tonlu ama
             * kontrast oranları tanıdık. Böylece varsayılan paletten geçiş
             * görsel olarak güvenli.
             */
            colors: {
                /* Sıcak nötr - stone'un ısıtılmış karşılığı */
                sand: {
                    50: '#FBF9F6',
                    100: '#F6F3EE',
                    200: '#EAE5DE',
                    300: '#DAD3C9',
                    400: '#ADA396',
                    500: '#7C7268',
                    600: '#5B5348',
                    700: '#463F36',
                    800: '#2C251D',
                    900: '#1E1813',
                    950: '#0D0A07',
                },
                /* Birincil yeşil - emerald'ın toprak tonlu karşılığı */
                moss: {
                    50: '#F0F7EF',
                    100: '#DEEDDA',
                    200: '#BBDCC1',
                    300: '#91C39D',
                    400: '#64A378',
                    500: '#44825B',
                    600: '#306C47',
                    700: '#275939',
                    800: '#20472F',
                    900: '#1B3A28',
                    950: '#0C2116',
                },
                /* Kahve - ağaç kabuğu; eski arayüzün ana rengi */
                bark: {
                    50: '#FAF6F3',
                    100: '#F2E9E2',
                    200: '#E4D2C5',
                    300: '#D0B3A0',
                    400: '#B78E75',
                    500: '#A1705A',
                    600: '#875948',
                    700: '#6E473B',
                    800: '#5B3C33',
                    900: '#4C342D',
                    950: '#291B17',
                },
                /* Amber - toprak/bal vurgusu; amber'ın yumuşatılmış karşılığı */
                clay: {
                    50: '#FDF8E9',
                    100: '#FAEDC9',
                    200: '#F4DC94',
                    300: '#EEC25C',
                    400: '#E0A632',
                    500: '#C9841B',
                    600: '#AA6814',
                    700: '#8C5210',
                    800: '#73400F',
                    900: '#5F3410',
                    950: '#361C09',
                },
                /* Kırmızı - silme ve hata; red'in sıcak karşılığı */
                berry: {
                    50: '#FCF3F1',
                    100: '#FBE3E0',
                    200: '#F7CBC7',
                    300: '#EFA6A0',
                    400: '#E3756D',
                    500: '#D64A44',
                    600: '#BE2F2B',
                    700: '#9C2926',
                    800: '#7F2723',
                    900: '#6A2420',
                    950: '#3A1512',
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
