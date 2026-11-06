export const BILGE_IMAGE_MAX = 700000;
export const BILGE_IMAGE_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
export function validBilgeImage(value: unknown): value is string {
    return typeof value === 'string' && value.length <= BILGE_IMAGE_MAX && BILGE_IMAGE_PATTERN.test(value);
}
/** Resize locally before transfer. Re-encoding strips EXIF/GPS metadata. */
export async function prepareBilgeImage(file: Blob): Promise<string> {
    // Android pickers sometimes omit MIME or provide image/jpg. Decode actual
    // pixels, do not trust a filename; SVG/active content is not accepted.
    if ((file.type && !['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif', 'image/gif', 'image/bmp'].includes(file.type)) || file.size > 25000000 || !file.size) throw new Error('En fazla 25 MB fotoğraf seçin. JPEG, PNG veya WebP önerilir.');
    const url = URL.createObjectURL(file);
    try {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => { img.src = ''; reject(new Error('Fotoğraf zamanında açılamadı. JPEG veya PNG olarak tekrar seçin.')); }, 15000);
            img.onload = () => { clearTimeout(timeout); resolve(); };
            img.onerror = () => { clearTimeout(timeout); reject(new Error('Bu fotoğraf biçimi cihazınızda okunamıyor. Galeriden JPEG veya PNG kopyasını seçin.')); }; img.src = url;
        });
        if (!img.naturalWidth || !img.naturalHeight) throw new Error('Fotoğrafın boyutları okunamadı.');
        let scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Fotoğraf hazırlanamadı.');
        // Compress locally until it fits; no paid request retries or lost images.
        for (let attempt = 0; attempt < 4; attempt++) {
            canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            for (const quality of [.82, .68, .52]) { const data = canvas.toDataURL('image/jpeg', quality); if (validBilgeImage(data)) return data; }
            scale *= .75;
        }
        throw new Error('Fotoğraf küçültülemedi. Daha küçük bir görsel seçin.');
    } finally { URL.revokeObjectURL(url); }
}

export function bilgePlainText(text: string): string {
    return text.replace(/```[^\n]*\n([\s\S]*?)```/g, '$1').replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/^#{1,6}\s+/gm, '').replace(/(\*\*|__|~~|`)/g, '').replace(/^>\s?/gm, '');
}
