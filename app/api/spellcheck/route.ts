import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_INSTRUCTION } from '@/lib/aiMacro';

/**
 * Uzun metinlerde sağlayıcının yanıtı 10 saniyeyi aşabildiği için fonksiyon
 * süresini yükseltiyoruz. Aksi hâlde Vercel isteği yarıda kesiyor ve istemci
 * hiç yanıt alamıyor.
 */
export const maxDuration = 60;
export const runtime = 'nodejs';

/** Sağlayıcıya gönderilebilecek en uzun metin. */
const MAX_TEXT_LENGTH = 20000;

/**
 * Yerel/özel ağ hedeflerini tespit eder. Özel sağlayıcı adresi sunucu
 * tarafından çağrıldığı için bu adreslerin canlıda engellenmesi gerekir.
 */
function isPrivateHost(hostname: string): boolean {
    const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();

    if (
        host === 'localhost' ||
        host.endsWith('.localhost') ||
        host.endsWith('.local') ||
        host.endsWith('.internal')
    ) {
        return true;
    }

    // IPv6 sabit adresleri (yalnızca gerçek IPv6 gösterimlerinde)
    if (host.includes(':')) {
        return (
            host === '::1' ||
            host.startsWith('fc') ||
            host.startsWith('fd') ||
            host.startsWith('fe80:')
        );
    }

    const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!ipv4) return false;

    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];

    return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
    );
}

/**
 * Sağlayıcının reddettiği istekleri ayırt eder; böylece kullanıcı "model
 * bulunamadı" ile "anahtar geçersiz" hatasını ayırt edebilir.
 */
class ProviderError extends Error {
    constructor(
        readonly status: number,
        readonly detail: string
    ) {
        super(`Sağlayıcı isteği reddetti (HTTP ${status})`);
    }
}

/** Sağlayıcı yanıtını kısaltır ve içinde anahtar geçiyorsa maskeler. */
async function providerErrorDetail(response: Response, apiKey: string): Promise<string> {
    const raw = await response.text().catch(() => '');
    const masked = apiKey ? raw.split(apiKey).join('***') : raw;
    return masked.replace(/\s+/g, ' ').trim().slice(0, 300);
}

/**
 * Sağlayıcı isteğinin en fazla ne kadar sürebileceği.
 *
 * Bazı modeller (özellikle "düşünen" modeller) uzun metinlerde dakikalarca
 * yanıt üretmeyebiliyor. Bu durumda istek sonsuza kadar asılı kalmasın diye
 * süre sınırı koyuyoruz; kullanıcıya da nedenini söyleyen net bir hata dönüyor.
 */
const PROVIDER_TIMEOUT_MS = 45000;

/** Sağlayıcı çağrılarını zaman aşımıyla sarmalar. */
async function fetchProvider(
    input: string | URL,
    init: RequestInit,
    label: string
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new ProviderError(
                504,
                `${label} ${PROVIDER_TIMEOUT_MS / 1000} saniye içinde yanıt vermedi. ` +
                    'Seçtiğiniz model uzun metinlerde çok yavaş kalıyor olabilir; ' +
                    'sağlayıcı panelinden daha hızlı bir model seçmeyi deneyin.'
            );
        }
        throw new ProviderError(
            502,
            `${label} adresine bağlanılamadı. Adresi ve internet bağlantınızı kontrol edin.`
        );
    } finally {
        clearTimeout(timer);
    }
}

async function handleSpellcheckRequest(request: NextRequest) {
    try {
        const {
            text,
            clientApiKey,
            provider = 'gemini',
            customUrl,
            customModel,
            macro
        } = await request.json();

        if (!text || text.trim().length === 0) {
            return NextResponse.json({ correctedText: text });
        }

        // Çok uzun metinlerde sağlayıcı yanıtı zaman aşımına uğradığı için
        // kullanıcıyı beklemeden net bir mesajla bilgilendiririz.
        if (typeof text === 'string' && text.length > MAX_TEXT_LENGTH) {
            return NextResponse.json(
                {
                    error: `Metin çok uzun (${text.length} karakter). Yapay zekâ ile işlemek için ${MAX_TEXT_LENGTH} karakterden kısa bir bölüm seçip tekrar deneyin.`
                },
                { status: 400 }
            );
        }

        const apiKey = clientApiKey || (provider === 'gemini' ? process.env.GEMINI_API_KEY : undefined);
        if (!apiKey) {
            return NextResponse.json(
                { error: 'API anahtarı bulunamadı. Lütfen Ayarlar bölümünden bir Model Provider ekleyin.' },
                { status: 400 }
            );
        }

        // Kullanıcının seçtiği makro varsa o kullanılır; yoksa varsayılan
        // imla düzeltme görevi uygulanır.
        const instruction =
            typeof macro === 'string' && macro.trim().length > 0
                ? macro.trim()
                : DEFAULT_INSTRUCTION;

        const prompt = `${instruction}

Metin:
${text}`;

        let correctedText = text;

        if (provider === 'gemini') {
            const response = await fetchProvider(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
                    })
                },
                'Google Gemini'
            );

            if (!response.ok) {
                // gemini-2.5-flash fallback if 2.5 is not available yet (just in case)
                const fallbackResponse = await fetchProvider(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
                        })
                    },
                    'Google Gemini'
                );
                
                if (!fallbackResponse.ok) {
                   throw new ProviderError(
                       fallbackResponse.status,
                       await providerErrorDetail(fallbackResponse, apiKey)
                   );
                }
                const data = await fallbackResponse.json();
                correctedText = requireProviderText(data.candidates?.[0]?.content?.parts?.[0]?.text, data, 'Google Gemini');
            } else {
                const data = await response.json();
                correctedText = requireProviderText(data.candidates?.[0]?.content?.parts?.[0]?.text, data, 'Google Gemini');
            }

        } else if (provider === 'openai') {
            const response = await fetchProvider('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1
                })
            }, 'OpenAI');
            if (!response.ok) throw new ProviderError(response.status, await providerErrorDetail(response, apiKey));
            const data = await response.json();
            correctedText = requireProviderText(data.choices?.[0]?.message?.content, data, 'Sağlayıcı');

        } else if (provider === 'anthropic') {
            const response = await fetchProvider('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 8192,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1
                })
            }, 'Anthropic');
            if (!response.ok) throw new ProviderError(response.status, await providerErrorDetail(response, apiKey));
            const data = await response.json();
            correctedText = requireProviderText(data.content?.[0]?.text, data, 'Anthropic');

        } else if (provider === 'custom') {
            if (!customUrl?.trim()) {
                return NextResponse.json({ error: 'Özel sağlayıcı Base URL adresi belirtilmedi.' }, { status: 400 });
            }
            if (!customModel?.trim()) {
                return NextResponse.json({ error: 'Özel sağlayıcı model adı belirtilmedi.' }, { status: 400 });
            }

            let endpoint: URL;
            try {
                const normalizedUrl = customUrl.trim().replace(/\/+$/, '');
                endpoint = new URL(
                    normalizedUrl.endsWith('/chat/completions')
                        ? normalizedUrl
                        : `${normalizedUrl}/chat/completions`
                );
            } catch {
                return NextResponse.json({ error: 'Özel sağlayıcı Base URL adresi geçersiz.' }, { status: 400 });
            }

            if (!['http:', 'https:'].includes(endpoint.protocol)) {
                return NextResponse.json({ error: 'Özel sağlayıcı adresi HTTP veya HTTPS kullanmalıdır.' }, { status: 400 });
            }

            // Canlı sunucuda adres sunucu tarafından çağrıldığı için yerel/özel ağ
            // hedeflerini engelleriz (SSRF koruması). Yerel geliştirmede kendi
            // makinedeki bir modele bağlanabilmek için serbest bırakılır.
            if (process.env.NODE_ENV === 'production' && isPrivateHost(endpoint.hostname)) {
                return NextResponse.json(
                    { error: 'Özel sağlayıcı adresi genel bir alan adı olmalıdır.' },
                    { status: 400 }
                );
            }

            const response = await fetchProvider(endpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: customModel.trim(),
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1,
                    // Görev metni baştan yazdırmak olduğu için çıktı sınırını
                    // girdiye göre belirleriz. Alt sınırı yüksek tutuyoruz:
                    // "düşünen" modeller yanıtı yazmadan önce uzun bir akıl
                    // yürütme bölümü üretiyor ve küçük sınırlarda içerik boş
                    // kalıyor (finish_reason: length).
                    max_tokens: Math.min(8192, Math.max(4096, text.length * 2))
                })
            }, 'Özel sağlayıcı');
            if (!response.ok) throw new ProviderError(response.status, await providerErrorDetail(response, apiKey));
            const data = await response.json();
            correctedText = requireProviderText(data.choices?.[0]?.message?.content, data, 'Sağlayıcı');
        }

        return NextResponse.json({ correctedText: correctedText.trim() });
    } catch (error) {
        // Sağlayıcı hatasını olduğu gibi iletiriz; kullanıcı sorunun anahtar mı,
        // model adı mı, kota mı olduğunu görebilsin.
        if (error instanceof ProviderError) {
            console.error('Spellcheck provider error:', error.status, error.detail);
            return NextResponse.json(
                {
                    error: `Sağlayıcı isteği reddetti (HTTP ${error.status}). ${error.detail}`
                },
                { status: 502 }
            );
        }

        console.error('Spellcheck error:', error);
        return NextResponse.json(
            { error: 'Yapay Zeka servisine bağlanılamadı. Lütfen ayarlarınızı kontrol edin.' },
            { status: 500 }
        );
    }
}

/**
 * Android uygulamasında WebView `https://localhost` kaynağından çalıştığı için
 * bu adrese yapılan istekler çapraz kaynak olur ve tarayıcı katmanı CORS
 * başlığı olmadan isteği sunucuya hiç göndermez. Bu yüzden yalnızca uygulamanın
 * ve sitenin kendi kaynaklarına izin veriyoruz.
 */
const CORS_ORIGINS = new Set([
    'https://localhost',
    'http://localhost',
    'capacitor://localhost',
    'https://mindgarden-neon.vercel.app'
]);

function corsHeaders(origin: string | null): Record<string, string> {
    if (!origin || !CORS_ORIGINS.has(origin)) return {};

    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin'
    };
}

/** Tarayıcının gönderdiği CORS ön kontrol isteği. */
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders(request.headers.get('origin'))
    });
}

/**
 * Sağlayıcı yanıtından düzeltilmiş metni çıkarır.
 *
 * Yanıt boş geldiğinde eskiden orijinal metin geri döndürülüyordu; bu da
 * kullanıcıya "işlem çalıştı ama hiçbir şey değişmedi" gibi görünüyordu.
 * Bunun yerine nedenini söyleyen bir hata fırlatırız.
 */
function requireProviderText(content: unknown, raw: unknown, label: string): string {
    if (typeof content === 'string' && content.trim().length > 0) {
        return content;
    }

    const kaynak = raw as {
        choices?: Array<{ finish_reason?: string }>;
        candidates?: Array<{ finishReason?: string }>;
    } | null;

    const bitis =
        kaynak?.choices?.[0]?.finish_reason ?? kaynak?.candidates?.[0]?.finishReason;

    const ayrinti = bitis ? ` (bitiş nedeni: ${bitis})` : '';
    const ozet = JSON.stringify(raw ?? null).slice(0, 160);

    throw new ProviderError(
        502,
        `${label} boş yanıt döndü${ayrinti}. Seçtiğiniz model yanıtı yazmadan ` +
            'çıktı sınırına takılmış olabilir; sağlayıcınızdan farklı bir model ' +
            `seçmeyi deneyin. Gelen yanıt: ${ozet}`
    );
}

export async function POST(request: NextRequest) {
    const response = await handleSpellcheckRequest(request);
    const headers = corsHeaders(request.headers.get('origin'));

    for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
    }

    return response;
}
