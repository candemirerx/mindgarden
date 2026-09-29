/** Açık bir defterden filizlenen yapraklar: not ve bahçenin ortak işareti. */
export default function GardenMark({ size = 32, className = '' }: { size?: number; className?: string }) {
    return <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
        <path d="M20 33C15 29 9 29 5 30V13C10 12 16 14 20 18C24 14 30 12 35 13V30C29 29 24 30 20 33Z" fill="currentColor" opacity=".16" />
        <path d="M20 33C15 29 9 29 5 30V13C10 12 16 14 20 18C24 14 30 12 35 13V30C29 29 24 30 20 33ZM20 19V33" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M20 21V12C20 7 24 4 30 4C30 10 26 13 20 12Z" fill="currentColor" />
        <path d="M20 16C13 16 10 12 11 7C16 7 20 10 20 16Z" fill="currentColor" opacity=".65" />
        <path d="M10 22L15 24M25 24L30 22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".6" />
    </svg>;
}
