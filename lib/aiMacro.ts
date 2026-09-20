/**
 * Metin editöründeki yapay zekâ görevi ("makro").
 *
 * Kullanıcı bu metinde yapay zekâdan ne istediğini yazar. Metin editöründeki
 * AI düğmesine basıldığında bu görev, düzenlenen metinle birlikte kullanıcının
 * kendi API anahtarıyla seçtiği sağlayıcıya gönderilir ve dönen cevap notun
 * içeriğine uygulanır. Boş bırakılırsa varsayılan imla düzeltme görevi kullanılır.
 */
export const AI_MACRO_KEY = 'nb-ai-macro';

export const DEFAULT_AI_MACRO = `Sen bir Türkçe imla ve yazım düzeltici asistansın. Aşağıdaki metni düzelt:
- Sadece yazım ve imla hatalarını düzelt
- Noktalama işaretlerini düzelt
- Büyük/küçük harf kullanımını düzelt
- İçeriği, anlamı veya cümle yapısını DEĞİŞTİRME
- Yeni kelime veya cümle EKLEME
- Sadece düzeltilmiş metni döndür, açıklama yapma`;

/** Cihazda kayıtlı makroyu döner; tanımlı değilse boş metin döner. */
export function readAiMacro(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(AI_MACRO_KEY) ?? '';
}

/** Editörde kullanılacak etkin görevi döner (kayıtlı makro yoksa varsayılan). */
export function effectiveAiMacro(): string {
    return readAiMacro().trim() || DEFAULT_AI_MACRO;
}
