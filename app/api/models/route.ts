import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;
export const runtime = 'nodejs';

/**
 * Özel sağlayıcının sunduğu modelleri listeler.
 *
 * Kullanıcı 10+ model arasından hızlı olanı seçebilsin diye sağlayıcının
 * `/v1/models` uç noktasını sunucu tarafından çağırırız (tarayıcıdan
 * çağrılsa CORS engeline takılırdı).
 */
const REQUEST_TIMEOUT_MS = 20000;

/** Yerel/özel ağ hedeflerini engeller (SSRF koruması). */
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

async function handleModelsRequest(request: NextRequest) {
    try {
        const { clientApiKey, customUrl } = await request.json();

        if (!customUrl?.trim()) {
            return NextResponse.json(
                { error: 'Önce Base URL adresini girin.' },
                { status: 400 }
            );
        }

        const normalized = customUrl.trim().replace(/\/+$/, '');

        // Base URL hem "/v1" hem de tam uç nokta olarak girilebiliyor.
        const base = normalized.endsWith('/chat/completions')
            ? normalized.slice(0, -'/chat/completions'.length)
            : normalized;

        let endpoint: URL;
        try {
            endpoint = new URL(`${base}/models`);
        } catch {
            return NextResponse.json(
                { error: 'Base URL adresi geçersiz.' },
                { status: 400 }
            );
        }

        if (!['http:', 'https:'].includes(endpoint.protocol)) {
            return NextResponse.json(
                { error: 'Adres HTTP veya HTTPS kullanmalıdır.' },
                { status: 400 }
            );
        }

        if (process.env.NODE_ENV === 'production' && isPrivateHost(endpoint.hostname)) {
            return NextResponse.json(
                { error: 'Adres genel bir alan adı olmalıdır.' },
                { status: 400 }
            );
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        let response: Response;
        try {
            response = await fetch(endpoint, {
                method: 'GET',
                headers: clientApiKey
                    ? { Authorization: `Bearer ${clientApiKey}` }
                    : {},
                signal: controller.signal
            });
        } catch {
            return NextResponse.json(
                { error: 'Sağlayıcıya bağlanılamadı. Adresi kontrol edin.' },
                { status: 502 }
            );
        } finally {
            clearTimeout(timer);
        }

        if (!response.ok) {
            const raw = await response.text().catch(() => '');
            const masked = clientApiKey ? raw.split(clientApiKey).join('***') : raw;
            return NextResponse.json(
                {
                    error: `Sağlayıcı model listesini vermedi (HTTP ${response.status}). ${masked
                        .replace(/\s+/g, ' ')
                        .trim()
                        .slice(0, 200)}`
                },
                { status: 502 }
            );
        }

        const data = await response.json();
        const list = Array.isArray(data?.data) ? data.data : [];

        const models = list
            .map((item: { id?: string }) => (typeof item?.id === 'string' ? item.id : null))
            .filter((id: string | null): id is string => !!id)
            .sort((a: string, b: string) => a.localeCompare(b));

        return NextResponse.json({ models });
    } catch (error) {
        console.error('Model listesi hatası:', error);
        return NextResponse.json(
            { error: 'Model listesi alınamadı.' },
            { status: 500 }
        );
    }
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders(request.headers.get('origin'))
    });
}

export async function POST(request: NextRequest) {
    const response = await handleModelsRequest(request);
    const headers = corsHeaders(request.headers.get('origin'));

    for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
    }

    return response;
}
