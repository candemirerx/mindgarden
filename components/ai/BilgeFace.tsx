import { useId } from 'react';

/**
 * Gece bahçesi: ay ışığı almış bir ağaç. Tek SVG olduğu için indirilecek
 * görsel yok, 30 pikselden 72 piksele kadar her boyda net kalır.
 *
 * Degrade ve kırpma kimlikleri useId ile türetilir: simge aynı sayfada
 * birden çok kez çizildiği için sabit id'ler çakışır, ilk kopya kaldırılınca
 * geri kalanların ışığı ve kırpması kaybolurdu.
 */
export default function BilgeFace({ size = 64 }: { size?: number }) {
    const n = useId().replace(/:/g, '');
    const cerceve = `bf-c-${n}`, isima = `bf-i-${n}`, tac = `bf-t-${n}`, katman = `bf-k-${n}`;
    const TAC = 'M48 11c-9 0-17 4-21 11-6 2-10 7-10 13 0 8 6 14 15 16h32c9-2 15-8 15-16 0-6-4-11-10-13-4-7-12-11-21-11Z';
    return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 96 96" fill="none">
        <clipPath id={cerceve}><circle cx="48" cy="48" r="47" /></clipPath>
        <g clipPath={`url(#${cerceve})`}>
            <radialGradient id={isima} cx="69" cy="21" r="26" gradientUnits="userSpaceOnUse">
                <stop offset="40%" stopColor="#f2d484" stopOpacity=".3" />
                <stop offset="100%" stopColor="#f2d484" stopOpacity="0" />
            </radialGradient>
            <circle cx="48" cy="48" r="47" fill="#06140b" />
            <circle cx="69" cy="21" r="26" fill={`url(#${isima})`} />
            <circle cx="69" cy="21" r="12" fill="#f2d484" />
            <path d={TAC} fill="#3f7d58" />
            {/* Ay sağ üstte: tacın o yanı aydınlanıyor, geçiş yumuşak. */}
            <clipPath id={tac}><path d={TAC} /></clipPath>
            <linearGradient id={katman} x1="34" y1="44" x2="76" y2="24" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#62ac7e" stopOpacity="0" />
                <stop offset="1" stopColor="#62ac7e" stopOpacity=".95" />
            </linearGradient>
            <g clipPath={`url(#${tac})`}><rect x="10" y="5" width="80" height="55" fill={`url(#${katman})`} /></g>
            <path d="M44.5 48h7l2 23c0 2-11 2-11 0l2-23Z" fill="#2a5c40" />
            <path d="M48 72c-4 3-8 5-14 6m14-6c4 3 8 5 14 6" stroke="#2a5c40" strokeWidth="3.6" strokeLinecap="round" fill="none" />
            <path d="M21 16C21 23.3 22.7 25 30 25C22.7 25 21 26.7 21 34C21 26.7 19.3 25 12 25C19.3 25 21 23.3 21 16Z" fill="#f7e5a8" />
            <path d="M13 43.5C13 47.1 13.9 48 17.5 48C13.9 48 13 48.9 13 52.5C13 48.9 12.1 48 8.5 48C12.1 48 13 47.1 13 43.5Z" fill="#f7e5a8" opacity=".75" />
            <path d="M32 8.4C32 11.3 32.7 12 35.6 12C32.7 12 32 12.7 32 15.6C32 12.7 31.3 12 28.4 12C31.3 12 32 11.3 32 8.4Z" fill="#f7e5a8" opacity=".6" />
        </g>
    </svg>;
}
