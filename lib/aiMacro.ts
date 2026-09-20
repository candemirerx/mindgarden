/**
 * Metin editöründeki yapay zekâ görevleri ("makrolar").
 *
 * Her makro bir kutudur: başlığı, kısa açıklaması (alt başlık) ve sağlayıcıya
 * gönderilen görev metni vardır. Kullanıcı birden çok makro tanımlayabilir;
 * metin editöründe imla düzeltmenin yanında kutu olarak görünürler. Bir kutuya
 * basıldığında notun metni o makronun göreviyle birlikte kullanıcının kendi API
 * anahtarıyla seçtiği sağlayıcıya gönderilir ve dönen cevap nota yazılır.
 */
export interface AiMacro {
    id: string;
    /** Kutunun üstünde görünen ad. */
    title: string;
    /** Makro detay sayfasındaki alt başlık. */
    subtitle: string;
    /** Sağlayıcıya gönderilen görev metni. */
    instruction: string;
    /** Devre dışı bırakılan makro metin editöründe görünmez. */
    enabled: boolean;
}

export const AI_MACROS_KEY = 'nb-ai-macros';
/** Tek makrolu eski sürümün anahtarı; açılışta yeni listeye taşınır. */
export const AI_MACRO_LEGACY_KEY = 'nb-ai-macro';

export const SPELLCHECK_MACRO_ID = 'imla-duzelt';

export const DEFAULT_MACROS: AiMacro[] = [
    {
        id: SPELLCHECK_MACRO_ID,
        title: 'İmla Düzelt',
        subtitle: 'Yazım, noktalama ve büyük/küçük harf hatalarını düzeltir; içeriği değiştirmez.',
        instruction: `Sen bir Türkçe imla ve yazım düzeltici asistansın. Aşağıdaki metni düzelt:
- Sadece yazım ve imla hatalarını düzelt
- Noktalama işaretlerini düzelt
- Büyük/küçük harf kullanımını düzelt
- İçeriği, anlamı veya cümle yapısını DEĞİŞTİRME
- Yeni kelime veya cümle EKLEME
- Sadece düzeltilmiş metni döndür, açıklama yapma`,
        enabled: true
    },
    {
        id: 'ozetle',
        title: 'Özetle',
        subtitle: 'Notun içeriğini kısa maddeler halinde özetler.',
        instruction: `Aşağıdaki metni özetle:
- En fazla 5 madde kullan
- Her madde tek satır olsun
- Sadece özeti döndür, açıklama veya giriş cümlesi yazma`,
        enabled: true
    },
    {
        id: 'resmilestir',
        title: 'Resmileştir',
        subtitle: 'Metni resmî ve kurumsal bir dile çevirir.',
        instruction: `Aşağıdaki metni resmî, kurumsal ve ölçülü bir Türkçe ile yeniden yaz:
- Anlamı koru, yeni bilgi ekleme
- Günlük konuşma ifadelerini çıkar
- Sadece yeniden yazılmış metni döndür`,
        enabled: true
    },
    {
        id: 'sadelestir',
        title: 'Sadeleştir',
        subtitle: 'Uzun ve karmaşık cümleleri anlaşılır hale getirir.',
        instruction: `Aşağıdaki metni sadeleştir:
- Uzun cümleleri kısalt ve böl
- Karmaşık kelimeleri günlük karşılıklarıyla değiştir
- Anlamı koru, yeni bilgi ekleme
- Sadece sadeleştirilmiş metni döndür`,
        enabled: true
    },
    {
        id: 'genislet',
        title: 'Genişlet',
        subtitle: 'Notu örnek ve ayrıntılarla genişletir.',
        instruction: `Aşağıdaki notu genişlet:
- Mevcut fikirleri koru
- Her fikri bir örnek veya ayrıntıyla destekle
- Başlık ekleme, doğrudan genişletilmiş metni döndür`,
        enabled: true
    },
    {
        id: 'ingilizce',
        title: 'İngilizceye Çevir',
        subtitle: 'Metni İngilizceye çevirir.',
        instruction: `Translate the following text into English:
- Keep the original meaning and tone
- Do not add explanations
- Return only the translation`,
        enabled: true
    }
];

/** Sunucu tarafında makro gönderilmediğinde kullanılan varsayılan görev. */
export const DEFAULT_INSTRUCTION = DEFAULT_MACROS[0].instruction;

function createId(): string {    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `macro-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

/** Kayıtlı makroları döner; hiç kayıt yoksa varsayılanları döner. */
export function readAiMacros(): AiMacro[] {
    if (typeof window === 'undefined') return DEFAULT_MACROS;

    const stored = localStorage.getItem(AI_MACROS_KEY);

    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                const valid = parsed.filter(
                    (item): item is AiMacro =>
                        !!item &&
                        typeof item.id === 'string' &&
                        typeof item.title === 'string' &&
                        typeof item.instruction === 'string'
                );

                return valid.map((item) => ({
                    ...item,
                    subtitle: typeof item.subtitle === 'string' ? item.subtitle : '',
                    enabled: item.enabled !== false
                }));
            }
        } catch {
            // Bozuk kayıt: varsayılanlara düşeriz.
        }
    }

    // Eski tek makrolu sürümden geçiş: kullanıcının yazdığı görev korunur.
    const legacy = localStorage.getItem(AI_MACRO_LEGACY_KEY);
    if (legacy && legacy.trim()) {
        const migrated: AiMacro[] = [
            ...DEFAULT_MACROS,
            {
                id: createId(),
                title: 'Kendi Görevim',
                subtitle: 'Önceki sürümde yazdığınız tek görev.',
                instruction: legacy.trim(),
                enabled: true
            }
        ];
        saveAiMacros(migrated);
        localStorage.removeItem(AI_MACRO_LEGACY_KEY);
        return migrated;
    }

    return DEFAULT_MACROS;
}

export function saveAiMacros(macros: AiMacro[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(AI_MACROS_KEY, JSON.stringify(macros));
}

export function createMacro(): AiMacro {
    return {
        id: createId(),
        title: 'Yeni Makro',
        subtitle: '',
        instruction: '',
        enabled: true
    };
}

/**
 * Metin editöründe gösterilecek makrolar.
 *
 * Devre dışı bırakılan ve görevi boş olan makrolar editörde yer kaplamaz.
 */
export function readEnabledMacros(): AiMacro[] {
    return readAiMacros().filter(
        (macro) => macro.enabled !== false && macro.instruction.trim().length > 0
    );
}

/** İmla düzeltme makrosunu bulur; yoksa varsayılanı döner. */
export function spellcheckMacro(macros: AiMacro[]): AiMacro {
    return (
        macros.find((macro) => macro.id === SPELLCHECK_MACRO_ID) ??
        DEFAULT_MACROS[0]
    );
}
