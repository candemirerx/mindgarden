import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_INSTRUCTION } from '@/lib/aiMacro';

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
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
                    })
                }
            );

            if (!response.ok) {
                // gemini-2.5-flash fallback if 2.5 is not available yet (just in case)
                const fallbackResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
                        })
                    }
                );
                
                if (!fallbackResponse.ok) {
                   throw new ProviderError(
                       fallbackResponse.status,
                       await providerErrorDetail(fallbackResponse, apiKey)
                   );
                }
                const data = await fallbackResponse.json();
                correctedText = data.candidates?.[0]?.content?.parts?.[0]?.text || text;
            } else {
                const data = await response.json();
                correctedText = data.candidates?.[0]?.content?.parts?.[0]?.text || text;
            }

        } else if (provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            });
            if (!response.ok) throw new ProviderError(response.status, await providerErrorDetail(response, apiKey));
            const data = await response.json();
            correctedText = data.choices?.[0]?.message?.content || text;

        } else if (provider === 'anthropic') {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 4096,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1
                })
            });
            if (!response.ok) throw new ProviderError(response.status, await providerErrorDetail(response, apiKey));
            const data = await response.json();
            correctedText = data.content?.[0]?.text || text;

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

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: customModel.trim(),
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1
                })
            });
            if (!response.ok) throw new ProviderError(response.status, await providerErrorDetail(response, apiKey));
            const data = await response.json();
            correctedText = data.choices?.[0]?.message?.content || text;
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

export async function POST(request: NextRequest) {
    const response = await handleSpellcheckRequest(request);
    const headers = corsHeaders(request.headers.get('origin'));

    for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
    }

    return response;
}
