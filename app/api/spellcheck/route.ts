import { NextRequest, NextResponse } from 'next/server';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
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

/** İstek gövdesinin üst sınırı; JSON ayrıştırmadan önce uygulanır. */
const MAX_BODY_BYTES = 64 * 1024;

/** İzin verilen sağlayıcılar. */
const SAGLAYICILAR = new Set(['gemini', 'openai', 'anthropic', 'custom']);

/* ---------------------------------------------------------------- */
/* Hız sınırı (örnek başına, en iyi çaba)                            */
/* ---------------------------------------------------------------- */

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
// Uzun notlar sağlayıcıya birden çok parça hâlinde gönderilebiliyor; sınır bu
// yüzden cömert tutulur. Amaç meşru kullanımı engellemek değil, tek bir
// istemcinin uç noktayı toplu çağrı için kullanmasını önlemek.
const RATE_LIMIT_MAX = 120;
const istekSayaci = new Map<string, { sayi: number; pencere: number }>();

function istemciAdresi(request: NextRequest): string {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim() || 'bilinmeyen';
    return request.headers.get('x-real-ip') ?? 'bilinmeyen';
}

/** Pencere içindeki istek sayısı sınırı aştıysa true döner. */
function hizSiniriAsildi(request: NextRequest): boolean {
    const simdi = Date.now();
    const anahtar = istemciAdresi(request);

    // Belleğin sınırsız büyümesini engellemek için eski pencereleri at.
    if (istekSayaci.size > 5000) {
        for (const [k, v] of istekSayaci) {
            if (simdi - v.pencere > RATE_LIMIT_WINDOW_MS) istekSayaci.delete(k);
        }
    }

    const kayit = istekSayaci.get(anahtar);
    if (!kayit || simdi - kayit.pencere > RATE_LIMIT_WINDOW_MS) {
        istekSayaci.set(anahtar, { sayi: 1, pencere: simdi });
        return false;
    }

    kayit.sayi += 1;
    return kayit.sayi > RATE_LIMIT_MAX;
}

/* ---------------------------------------------------------------- */
/* Oturum doğrulama                                                  */
/* ---------------------------------------------------------------- */

const OTURUM_DOGRULAMA_TIMEOUT_MS = 5000;

/**
 * İsteğin doğrulanmış bir Supabase oturumuna ait olup olmadığını söyler.
 *
 * Sunucudaki ücretli sağlayıcı anahtarı yalnızca doğrulanmış oturumlarda
 * kullanılır; aksi hâlde uç nokta üçüncü kişilere açık bir ücretsiz geçit
 * hâline gelir.
 */
async function hasVerifiedSession(request: NextRequest): Promise<boolean> {
    const auth = request.headers.get('authorization');
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) return false;

    const token = auth.slice(7).trim();
    if (!token) return false;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return false;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OTURUM_DOGRULAMA_TIMEOUT_MS);

    try {
        const res = await fetch(supabaseUrl.replace(/\/+$/, '') + '/auth/v1/user', {
            headers: { apikey: anonKey, Authorization: 'Bearer ' + token },
            redirect: 'manual',
            signal: controller.signal
        });
        return res.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * İstek gövdesini boyut sınırıyla okur ve JSON olarak ayrıştırır.
 * Ayrıştırmadan önce sınır uygulanır; böylece çok büyük gövde ayrıştırılmaz.
 */
async function readJsonBody(
    request: NextRequest
): Promise<{ veri: Record<string, unknown> } | { hata: string; status: number }> {
    const bildirilenBoyut = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(bildirilenBoyut) && bildirilenBoyut > MAX_BODY_BYTES) {
        return { hata: 'İstek gövdesi çok büyük.', status: 413 };
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
        return { hata: 'İstek gövdesi çok büyük.', status: 413 };
    }

    try {
        const veri = JSON.parse(raw);
        if (!veri || typeof veri !== 'object' || Array.isArray(veri)) {
            return { hata: 'İstek gövdesi geçersiz.', status: 400 };
        }
        return { veri: veri as Record<string, unknown> };
    } catch {
        return { hata: 'İstek gövdesi geçersiz JSON.', status: 400 };
    }
}

/**
 * Yerel/özel ağ hedeflerini tespit eder. Özel sağlayıcı adresi sunucu
 * tarafından çağrıldığı için bu adreslerin canlıda engellenmesi gerekir.
 */
function isPrivateIPv4(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
        return true; // çözümlenemeyen adres güvenli sayılmaz
    }

    const [a, b, c] = parts;

    return (
        a === 0 ||                                  // 0.0.0.0/8
        a === 10 ||                                 // 10/8
        a === 127 ||                                // loopback
        (a === 100 && b >= 64 && b <= 127) ||       // CGNAT 100.64/10
        (a === 169 && b === 254) ||                 // link-local
        (a === 172 && b >= 16 && b <= 31) ||        // 172.16/12
        (a === 192 && b === 0 && c === 0) ||        // 192.0.0/24
        (a === 192 && b === 168) ||                 // 192.168/16
        (a === 198 && (b === 18 || b === 19)) ||    // benchmark
        a >= 224                                    // multicast ve rezerve
    );
}

/** IPv6 adresini sekiz 16 bitlik gruba çözer; çözümlenemezse null döner. */
function ipv6Gruplari(ip: string): number[] | null {
    let adres = ip.toLowerCase().split('%')[0];

    // Sonda gömülü IPv4 varsa (::ffff:127.0.0.1) iki hex grubuna çevir.
    const sonIkiNokta = adres.lastIndexOf(':');
    if (adres.includes('.')) {
        const ipv4 = adres.slice(sonIkiNokta + 1).split('.').map(Number);
        if (ipv4.length !== 4 || ipv4.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
            return null;
        }
        const ust = ((ipv4[0] << 8) | ipv4[1]).toString(16);
        const alt = ((ipv4[2] << 8) | ipv4[3]).toString(16);
        adres = adres.slice(0, sonIkiNokta + 1) + ust + ':' + alt;
    }

    const parcalar = adres.split('::');
    if (parcalar.length > 2) return null;

    const sol = parcalar[0] ? parcalar[0].split(':') : [];
    const sag = parcalar.length === 2 && parcalar[1] ? parcalar[1].split(':') : [];

    let gruplar: string[];
    if (parcalar.length === 2) {
        const eksik = 8 - sol.length - sag.length;
        if (eksik < 0) return null;
        gruplar = [...sol, ...new Array(eksik).fill('0'), ...sag];
    } else {
        gruplar = sol;
    }

    if (gruplar.length !== 8) return null;

    const sayilar = gruplar.map((g) => parseInt(g || '0', 16));
    if (sayilar.some((n) => !Number.isInteger(n) || n < 0 || n > 0xffff)) return null;
    return sayilar;
}

/** Gömülü IPv4'ü son iki gruptan çıkarır. */
function gomuluIpv4(g: number[]): string {
    return [g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff].join('.');
}

/**
 * IPv4-eşlemeli (::ffff:7f00:1), IPv4-uyumlu, NAT64, 6to4 gömülü adresler ile
 * özel/ayrılmış IPv6 aralıklarını yakalar.
 */
function isPrivateIPv6(ip: string): boolean {
    const g = ipv6Gruplari(ip);
    if (!g) return true; // çözümlenemeyen adres güvenli sayılmaz

    if (g.every((n) => n === 0)) return true;                            // ::
    if (g.slice(0, 7).every((n) => n === 0) && g[7] === 1) return true;  // ::1

    // ::/96 (IPv4-uyumlu) ve ::ffff:0:0/96 (IPv4-eşlemeli)
    if (g.slice(0, 5).every((n) => n === 0) && (g[5] === 0 || g[5] === 0xffff)) {
        return isPrivateIPv4(gomuluIpv4(g));
    }

    // 64:ff9b::/96 NAT64
    if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((n) => n === 0)) {
        return isPrivateIPv4(gomuluIpv4(g));
    }

    // 2002::/16 (6to4) içindeki IPv4
    if (g[0] === 0x2002) {
        return isPrivateIPv4([g[1] >> 8, g[1] & 0xff, g[2] >> 8, g[2] & 0xff].join('.'));
    }

    if ((g[0] & 0xfe00) === 0xfc00) return true;  // fc00::/7 unique local
    if ((g[0] & 0xffc0) === 0xfe80) return true;  // fe80::/10 link-local
    if ((g[0] & 0xff00) === 0xff00) return true;  // ff00::/8 multicast

    return false;
}

function isPrivateAddress(host: string): boolean {
    const tur = isIP(host);
    if (tur === 4) return isPrivateIPv4(host);
    if (tur === 6) return isPrivateIPv6(host);
    return false;
}

function isPrivateHost(hostname: string): boolean {
    const host = hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();

    if (
        host === 'localhost' ||
        host.endsWith('.localhost') ||
        host.endsWith('.local') ||
        host.endsWith('.internal') ||
        host.endsWith('.home.arpa')
    ) {
        return true;
    }

    return isPrivateAddress(host);
}

/**
 * Özel sağlayıcı adresinin gerçekten genel bir HTTPS hedefi olduğunu doğrular.
 *
 * Metinsel alan adı kontrolü tek başına yetmez: ad özel bir IP'ye çözülebilir
 * (DNS rebinding) veya IPv4-eşlemeli IPv6 gibi gösterimlerle filtre atlatılabilir.
 * Bu yüzden alan adının tüm A/AAAA kayıtları ayrı ayrı denetlenir.
 */
async function assertPublicProviderUrl(endpoint: URL): Promise<void> {
    if (endpoint.protocol !== 'https:') {
        throw new ProviderError(400, 'Özel sağlayıcı adresi HTTPS kullanmalıdır.');
    }

    const host = endpoint.hostname.replace(/^\[|\]$/g, '');
    if (isPrivateHost(host)) {
        throw new ProviderError(400, 'Özel sağlayıcı adresi genel bir alan adı olmalıdır.');
    }
    if (isIP(host)) return;

    let adresler: Array<{ address: string }>;
    try {
        adresler = await lookup(host, { all: true, verbatim: true });
    } catch {
        throw new ProviderError(400, 'Özel sağlayıcı adresinin alan adı çözümlenemedi.');
    }

    if (adresler.length === 0) {
        throw new ProviderError(400, 'Özel sağlayıcı adresinin alan adı çözümlenemedi.');
    }

    for (const adres of adresler) {
        if (isPrivateAddress(adres.address)) {
            throw new ProviderError(400, 'Özel sağlayıcı adresi genel bir adrese çözümlenmelidir.');
        }
    }
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
 *
 * Değer, fonksiyonun toplam süre sınırının (60 sn) hemen altında tutulur ki
 * yavaş ama başarılı olacak istekler yarıda kesilmesin.
 */
const PROVIDER_TIMEOUT_MS = 55000;

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
        if (hizSiniriAsildi(request)) {
            return NextResponse.json(
                { error: 'Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.' },
                { status: 429 }
            );
        }

        const govde = await readJsonBody(request);
        if ('hata' in govde) {
            return NextResponse.json({ error: govde.hata }, { status: govde.status });
        }

        const girdi = govde.veri;
        const text = typeof girdi.text === 'string' ? girdi.text : '';
        const clientApiKey = typeof girdi.clientApiKey === 'string' ? girdi.clientApiKey : '';
        const provider = typeof girdi.provider === 'string' && girdi.provider ? girdi.provider : 'gemini';
        const customUrl = typeof girdi.customUrl === 'string' ? girdi.customUrl : '';
        const customModel = typeof girdi.customModel === 'string' ? girdi.customModel : '';
        const macro = typeof girdi.macro === 'string' ? girdi.macro : '';

        if (!SAGLAYICILAR.has(provider)) {
            return NextResponse.json({ error: 'Bilinmeyen yapay zekâ sağlayıcısı.' }, { status: 400 });
        }

        // Kullanıcı hazır sağlayıcılarda da model adını elle girebilir;
        // boş bırakılırsa sağlayıcının varsayılan modeli kullanılır.
        const secilenModel = (varsayilan: string) =>
            typeof customModel === 'string' && customModel.trim()
                ? customModel.trim()
                : varsayilan;

        const geminiModel = secilenModel('gemini-2.5-flash');
        const geminiFallback = 'gemini-2.0-flash';

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

        // Sunucudaki ortak anahtar yalnızca doğrulanmış oturumlarda (veya
        // AI_ALLOW_SERVER_KEY ile açıkça izin verilmişse) kullanılır. Aksi hâlde
        // kimliği doğrulanmamış istekler ücretli anahtarı tüketir; uç nokta
        // herkese açık bir geçide dönüşür.
        const sunucuAnahtariKullanilabilir =
            process.env.AI_ALLOW_SERVER_KEY === 'true' ||
            (provider === 'gemini' && (await hasVerifiedSession(request)));

        const apiKey =
            clientApiKey ||
            (provider === 'gemini' && sunucuAnahtariKullanilabilir
                ? process.env.GEMINI_API_KEY
                : undefined);

        if (!apiKey) {
            return NextResponse.json(
                {
                    error:
                        'Bu istek için API anahtarı bulunamadı. Ayarlar → Yapay Zekâ bölümünden ' +
                        'kendi sağlayıcı anahtarınızı ekleyin; uygulamanın ortak anahtarı yalnızca ' +
                        'oturum açmış kullanıcılara açıktır.'
                },
                { status: 401 }
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
                `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
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
                    `https://generativelanguage.googleapis.com/v1beta/models/${geminiFallback}:generateContent?key=${apiKey}`,
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
                    model: secilenModel('gpt-4o-mini'),
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
                    model: secilenModel('claude-3-haiku-20240307'),
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

            // Canlı sunucuda adres sunucu tarafından çağrıldığı için SSRF
            // koruması uygularız: HTTPS zorunlu, alan adının tüm A/AAAA
            // kayıtları genel bir adrese çözümlenmeli ve yönlendirmeler
            // izlenmez. Yerel geliştirmede kendi makinedeki bir modele
            // bağlanabilmek serbest bırakılır.
            if (process.env.NODE_ENV === 'production') {
                try {
                    await assertPublicProviderUrl(endpoint);
                } catch (error) {
                    if (error instanceof ProviderError) {
                        return NextResponse.json({ error: error.detail }, { status: error.status });
                    }
                    throw error;
                }
            }

            const basliklar = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };

            const temelGovde = {
                model: secilenModel(''),
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                // Görev metni baştan yazdırmak olduğu için çıktı sınırı girdiye
                // göre belirlenir.
                max_tokens: Math.min(8192, Math.max(2048, text.length * 2))
            };

            // "Düşünen" modeller yanıtı yazmadan önce uzun bir akıl yürütme
            // üretiyor; bu yüzden tek sayfalık bir metin bile dakikalarca
            // sürebiliyor. Düşünmeyi kapatmayı deneriz: destekleyen
            // sağlayıcılarda yanıt anında gelir. Alanları tanımayan sağlayıcı
            // 400 döndürürse istek, alanlar olmadan tekrarlanır.
            let response = await fetchProvider(
                endpoint,
                {
                    method: 'POST',
                    headers: basliklar,
                    redirect: 'manual',
                    body: JSON.stringify({
                        ...temelGovde,
                        enable_thinking: false,
                        reasoning_effort: 'none',
                        chat_template_kwargs: { enable_thinking: false }
                    })
                },
                'Özel sağlayıcı'
            );

            if (response.status >= 300 && response.status < 400) {
                throw new ProviderError(
                    400,
                    'Özel sağlayıcı adresi yönlendirme yanıtı verdi; güvenlik nedeniyle izlenmedi.'
                );
            }

            if (response.status === 400) {
                response = await fetchProvider(
                    endpoint,
                    {
                        method: 'POST',
                        headers: basliklar,
                        redirect: 'manual',
                        body: JSON.stringify(temelGovde)
                    },
                    'Özel sağlayıcı'
                );

                if (response.status >= 300 && response.status < 400) {
                    throw new ProviderError(
                        400,
                        'Özel sağlayıcı adresi yönlendirme yanıtı verdi; güvenlik nedeniyle izlenmedi.'
                    );
                }
            }

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
            // 4xx: isteğin kendisi geçersiz (yönlendirme, özel adres, geçersiz
            // hedef). Bunu sağlayıcı hatası gibi 502'ye indirgemeyiz.
            const durum = error.status >= 400 && error.status < 500 ? error.status : 502;
            return NextResponse.json(
                {
                    error:
                        durum === 502
                            ? 'Sağlayıcı isteği reddetti (HTTP ' + error.status + '). ' + error.detail
                            : error.detail
                },
                { status: durum }
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
