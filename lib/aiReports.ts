export const AI_REPORT_REASONS = ['unsafe', 'hate', 'sexual', 'misleading', 'other'] as const;
export type AiReportReason = typeof AI_REPORT_REASONS[number];
export const AI_REPORT_LABELS: Record<AiReportReason, string> = {
    unsafe: 'Tehlikeli veya yasa dışı içerik', hate: 'Nefret / taciz',
    sexual: 'Cinsel içerik / çocuk güvenliği', misleading: 'Yanıltıcı veya hatalı bilgi', other: 'Diğer'
};
