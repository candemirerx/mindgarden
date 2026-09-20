/**
 * Uzun metni, yapay zekâya parça parça gönderilebilecek biçimde böler.
 *
 * Bazı sağlayıcılar uzun metni tek istekte zamanında yanıtlayamıyor; kısa
 * parçalar ise hızlı dönüyor. Bu yüzden metni cümle sınırlarından bölüp
 * sonuçları aynı düzenle geri birleştiririz.
 */
export interface TextChunk {
    text: string;
    /** Bu parçadan sonra gelmesi gereken ayraç (boşluk veya satır sonu). */
    after: string;
}

const DEFAULT_MAX_LENGTH = 400;

/**
 * Tek başına sınırı aşan bir parçayı, kelimeleri ortadan kesmeden böler.
 * (Noktalama içermeyen tek uzun cümlelerde gerekir.)
 */
function forceSplit(part: string, maxLength: number): string[] {
    if (part.length <= maxLength) return [part];

    const out: string[] = [];
    let rest = part;

    while (rest.length > maxLength) {
        let cut = rest.lastIndexOf(' ', maxLength);
        if (cut < maxLength * 0.5) cut = maxLength;
        out.push(rest.slice(0, cut).trimEnd());
        rest = rest.slice(cut).trimStart();
    }

    if (rest) out.push(rest);
    return out;
}

export function splitIntoChunks(
    text: string,
    maxLength = DEFAULT_MAX_LENGTH
): TextChunk[] {
    if (text.length <= maxLength) {
        return [{ text, after: '' }];
    }

    const chunks: TextChunk[] = [];
    const lines = text.split('\n');

    lines.forEach((line, lineIndex) => {
        const lineSeparator = lineIndex === lines.length - 1 ? '' : '\n';

        if (line.length <= maxLength) {
            chunks.push({ text: line, after: lineSeparator });
            return;
        }

        // Uzun satırı önce cümle sonlarından böl.
        const sentences = line.split(/(?<=[.!?…])\s+/);
        const parts: string[] = [];
        let current = '';

        for (const sentence of sentences) {
            if (current && current.length + sentence.length + 1 > maxLength) {
                parts.push(current);
                current = sentence;
            } else {
                current = current ? `${current} ${sentence}` : sentence;
            }
        }
        if (current) parts.push(current);

        // Hâlâ sınırı aşan parçaları (noktalamasız uzun cümleler) kelime
        // sınırından zorla böl.
        const parcalar = parts.flatMap((part) => forceSplit(part, maxLength));

        parcalar.forEach((part, index) => {
            const isLast = index === parcalar.length - 1;
            chunks.push({ text: part, after: isLast ? lineSeparator : ' ' });
        });
    });

    return chunks;
}
