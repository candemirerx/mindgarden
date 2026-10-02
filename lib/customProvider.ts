/**
 * Özel (OpenAI uyumlu) sağlayıcıyı doğrudan cihazdan çağırır.
 *
 * Android uygulamasında istek uygulamanın sunucusuna uğramadan, yerel HTTP
 * katmanıyla sağlayıcıya gider. Böylece `http://` adresleri, yerel ağdaki
 * (LM Studio, Ollama, vLLM vb.) sunucular ve anahtarsız uç noktalar da
 * kullanılabilir; sunucu rotasındaki HTTPS ve genel adres zorunluluğu yalnızca
 * internet üzerinden yapılan aktarma için geçerlidir.
 */
import { CapacitorHttp } from '@capacitor/core';

export class CustomProviderError extends Error {
    retryable: boolean;
    constructor(message: string, retryable = false) {
        super(message);
        this.retryable = retryable;
    }
}

const TIMEOUT_MS = 90000;

/** Base URL'den `/chat/completions` uç noktasını üretir. */
export function customEndpoint(baseUrl: string): string {
    let url: URL;
    try {
        const trimmed = baseUrl.trim().replace(/\/+$/, '');
        url = new URL(trimmed.endsWith('/chat/completions') ? trimmed : `${trimmed}/chat/completions`);
    } catch {
        throw new CustomProviderError('Özel sağlayıcı Base URL adresi geçersiz.');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new CustomProviderError('Özel sağlayıcı adresi HTTP veya HTTPS kullanmalıdır.');
    }
    return url.toString();
}

function maskKey(text: string, apiKey: string): string {
    return apiKey ? text.split(apiKey).join('***') : text;
}

function responseText(data: unknown): string {
    if (typeof data === 'string') return data;
    try {
        return JSON.stringify(data ?? '');
    } catch {
        return '';
    }
}

async function post(endpoint: string, apiKey: string, body: Record<string, unknown>) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    try {
        return await CapacitorHttp.request({
            url: endpoint,
            method: 'POST',
            headers,
            data: body,
            connectTimeout: 15000,
            readTimeout: TIMEOUT_MS
        });
    } catch (error) {
        const detail = error instanceof Error ? error.message : '';
        const timedOut = /timeout|timed out/i.test(detail);
        throw new CustomProviderError(
            timedOut
                ? 'Özel sağlayıcı yanıt vermedi (zaman aşımı).'
                : 'Özel sağlayıcı adresine bağlanılamadı. Adresi, bağlantıyı ve aynı ağda olduğunuzu kontrol edin.',
            true
        );
    }
}

export interface CustomRequest {
    baseUrl: string;
    apiKey: string;
    model: string;
    instruction: string;
    text: string;
}

export async function runCustomProviderDirect(req: CustomRequest): Promise<string> {
    const endpoint = customEndpoint(req.baseUrl);
    if (!req.model.trim()) throw new CustomProviderError('Özel sağlayıcı model adı belirtilmedi.');

    const baseBody = {
        model: req.model.trim(),
        messages: [{ role: 'user', content: `${req.instruction}\n\nMetin:\n${req.text}` }],
        temperature: 0.1,
        max_tokens: Math.min(8192, Math.max(2048, req.text.length * 2))
    };

    // "Düşünen" modelleri hızlandırmak için düşünmeyi kapatmayı deneriz;
    // alanları tanımayan sağlayıcı 400 verirse istek alanlar olmadan tekrarlanır.
    let response = await post(endpoint, req.apiKey, {
        ...baseBody,
        enable_thinking: false,
        reasoning_effort: 'none',
        chat_template_kwargs: { enable_thinking: false }
    });
    if (response.status === 400) response = await post(endpoint, req.apiKey, baseBody);

    if (response.status === 401 || response.status === 403) {
        throw new CustomProviderError(
            req.apiKey
                ? 'Sunucu API anahtarını kabul etmedi. Ayarlar → Yapay zekâ bölümünde anahtarı kontrol edin.'
                : 'Bu sunucu API anahtarı istiyor. Ayarlar → Yapay zekâ bölümünde anahtarı girin.'
        );
    }
    if (response.status < 200 || response.status >= 300) {
        const detail = maskKey(responseText(response.data).replace(/\s+/g, ' ').trim(), req.apiKey).slice(0, 300);
        throw new CustomProviderError(
            `Sağlayıcı isteği reddetti (HTTP ${response.status}). ${detail}`,
            response.status >= 500
        );
    }

    let data: unknown = response.data;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch {
            data = null;
        }
    }
    const content = (data as { choices?: Array<{ message?: { content?: unknown } }> } | null)?.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim()) return content.trim();

    throw new CustomProviderError(
        'Sağlayıcı boş yanıt döndü. Seçtiğiniz model yanıtı yazmadan çıktı sınırına takılmış olabilir; farklı bir model deneyin.'
    );
}
