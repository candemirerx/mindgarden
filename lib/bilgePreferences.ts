export const BILGE_LENGTHS = ['short', 'balanced', 'detailed'] as const;
export type BilgeLength = typeof BILGE_LENGTHS[number];
export const BILGE_LENGTH_LABELS: Record<BilgeLength, string> = { short: 'Kısa', balanced: 'Dengeli', detailed: 'Ayrıntılı' };
export function isBilgeLength(value: unknown): value is BilgeLength {
    return typeof value === 'string' && (BILGE_LENGTHS as readonly string[]).includes(value);
}
export function readBilgeLength(): BilgeLength {
    try { const value = localStorage.getItem('bilge-answer-length'); return isBilgeLength(value) ? value : 'short'; } catch { return 'short'; }
}
export function saveBilgeLength(value: BilgeLength): boolean {
    try { localStorage.setItem('bilge-answer-length', value); return true; } catch { return false; }
}
/** Yalnız önceden tanımlı talimatlar; istemciden serbest sistem komutu alınmaz. */
export function bilgeLengthInstruction(length: BilgeLength): string {
    return {
        short: 'Varsayılan olarak 2–4 kısa cümleyle doğrudan yanıtla. Gereksiz giriş ve tekrardan kaçın. Gerekirse en fazla 3 kısa madde kullan. Kullanıcı özellikle ayrıntı isterse veya güvenlik için gerekliyse genişletebilirsin.',
        balanced: 'Kısa bir açıklama ve gerektiğinde birkaç uygulanabilir adımla yanıtla. Gereksiz tekrar yapma. Kullanıcının açık uzunluk isteğine uy.',
        detailed: 'Kullanıcıya gerektiğinde örnekler ve adımlarla ayrıntılı, düzenli açıklama ver. Gereksiz tekrar yapma. Kullanıcının açık uzunluk isteğine uy.'
    }[length];
}
