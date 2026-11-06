import { validBilgeImage } from './bilgeMedia';

/** Never accept model-supplied remote URLs or silently discard an attachment. */
export function bilgeImageParts(image: string) {
    if (!validBilgeImage(image)) throw new Error('Geçerli bir JPEG, PNG veya WebP fotoğraf gönderin.');
    const comma = image.indexOf(',');
    return { mimeType: image.slice(5, image.indexOf(';')), data: image.slice(comma + 1) };
}

/**
 * `detail` alanı OpenAI'ye özgüdür; katı doğrulama yapan OpenAI uyumlu
 * sunucular (LM Studio, vLLM, bazı aracılar) bilinmeyen alan yüzünden 400
 * döndürebiliyor. `sade` ile alan tamamen çıkarılır ve istek tekrarlanır.
 */
export function openAiImageContent(text: string, image?: string, sade = false) {
    if (!image) return text;
    bilgeImageParts(image);
    return [{ type: 'text' as const, text }, { type: 'image_url' as const, image_url: sade ? { url: image } : { url: image, detail: 'auto' as const } }];
}

export function geminiImageParts(text: string, image?: string) {
    return image ? [{ text }, { inlineData: bilgeImageParts(image) }] : [{ text }];
}

export function anthropicImageContent(text: string, image?: string) {
    if (!image) return text;
    const { mimeType, data } = bilgeImageParts(image);
    return [{ type: 'image', source: { type: 'base64', media_type: mimeType, data } }, { type: 'text', text }];
}
