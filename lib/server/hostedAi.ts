import 'server-only';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import type { NextRequest } from 'next/server';

export class AiError extends Error {
    constructor(public status: number, message: string, public retryAfter?: number) { super(message); }
}

function integer(name: string, fallback: number, max: number): number {
    const value = Number(process.env[name]);
    return Number.isSafeInteger(value) && value > 0 ? Math.min(value, max) : fallback;
}

export function hostedConfig() {
    const key = process.env.BILGE_AI_API_KEY?.trim() || '';
    const base = (process.env.BILGE_AI_BASE_URL || 'https://api.b.ai/v1').replace(/\/+$/, '');
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
    const salt = process.env.BILGE_AI_ID_SALT || '';
    const configured = process.env.BILGE_AI_ENABLED === 'true' && !!key && !!salt && salt.length >= 32 && /^https:\/\//.test(base) && /^https:\/\//.test(redisUrl) && !!redisToken;
    return {
        configured, key, base, redisUrl, redisToken, salt,
        model: process.env.BILGE_AI_MODEL || 'gpt-6-luna',
        dailyRequests: integer('BILGE_AI_DAILY_REQUESTS', 20, 200),
        dailyUnits: integer('BILGE_AI_DAILY_UNITS', 100000, 1000000),
        globalUnits: integer('BILGE_AI_GLOBAL_DAILY_UNITS', 2000000, 100000000),
        globalRequests: integer('BILGE_AI_GLOBAL_DAILY_REQUESTS', 500, 100000),
        maxTextLength: 12000, outputTokens: 2048
    };
}

// Atomik, dağıtık ve sohbet/makro arasında ortak. Önce tüm sınırlar kontrol
// edilir; biri doluysa hiçbir sayaç artırılmaz. Maliyetli istekten ÖNCE ayırır.
export const RESERVE_LUA = `
local cost = tonumber(ARGV[1])
local limits = {tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4]), tonumber(ARGV[5]), 6}
local increments = {1, cost, cost, 1, 1}
local values = {}
for i = 1, 5 do
  values[i] = tonumber(redis.call('GET', KEYS[i]) or '0')
  if values[i] + increments[i] > limits[i] then return {0, i} end
end
for i = 1, 5 do
  redis.call('INCRBY', KEYS[i], increments[i])
  redis.call('EXPIRE', KEYS[i], i == 5 and 120 or 172800)
end
return {1, limits[1] - values[1] - 1, limits[2] - values[2] - cost}
`;

export function quotaDay(now = new Date()) {
    // Europe/Istanbul UTC+03:00; kota her gün İstanbul gece yarısında yenilenir.
    const day = new Date(now.getTime() + 3 * 3600000).toISOString().slice(0, 10);
    const resetsAt = new Date(Date.parse(day + 'T00:00:00+03:00') + 86400000).toISOString();
    return { day, resetsAt };
}

export async function identity(request: NextRequest, salt: string): Promise<string> {
    // Vercel bu başlığı dış istemci değerinden bağımsız yeniden yazar.
    // Başka bir reverse proxy kullanılıyorsa aynı güven garantisi kurulmalıdır.
    let ip = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : '';
    if (process.env.NODE_ENV !== 'production') ip = '127.0.0.1';
    if (!ip || !isIP(ip)) throw new AiError(503, 'Hazır AI güvenli ağ doğrulaması henüz yapılandırılmadı.');
    // IPv6 gizlilik adresleri değişince kotanın sıfırlanmaması için /64.
    if (isIP(ip) === 6) {
        const expanded = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
        const [left, right = ''] = expanded.split('::');
        const a = left ? left.split(':') : [];
        const b = right ? right.split(':') : [];
        const groups = expanded.includes('::') ? [...a, ...Array(8 - a.length - b.length).fill('0'), ...b] : a;
        ip = groups.slice(0, 4).map(g => g.padStart(4, '0')).join(':');
    }
    // Ham IP ve kullanıcı metni saklanmaz. Ağ kotası hesap/cihaz değiştirerek aşılamaz.
    return createHmac('sha256', salt).update(ip).digest('hex').slice(0, 40);
}

export async function reserveAllowance(request: NextRequest, units: number) {
    const cfg = hostedConfig();
    if (!cfg.configured) throw new AiError(503, 'Hazır AI henüz açılmadı. Uygulama rehberini kullanabilir veya Ayarlar → Yapay zekâ bölümünden kendi anahtarınızı / yerel modelinizi seçebilirsiniz.');
    const id = await identity(request, cfg.salt);
    const { day, resetsAt } = quotaDay();
    const prefix = `nb:ai:v1:${day}`;
    const keys = [`${prefix}:net:${id}:calls`, `${prefix}:net:${id}:units`, `${prefix}:global:units`, `${prefix}:global:calls`, `nb:ai:v1:burst:${id}:${Math.floor(Date.now() / 60000)}`];
    let result: number[];
    try {
        const response = await fetch(cfg.redisUrl, {
            method: 'POST', headers: { Authorization: `Bearer ${cfg.redisToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(['EVAL', RESERVE_LUA, '5', ...keys, String(units), String(cfg.dailyRequests), String(cfg.dailyUnits), String(cfg.globalUnits), String(cfg.globalRequests)]),
            signal: AbortSignal.timeout(5000), cache: 'no-store', redirect: 'error'
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (data.error || !Array.isArray(data.result) || ![0, 1].includes(data.result[0])) throw new Error();
        result = data.result;
    } catch { throw new AiError(503, 'Kullanım hakkı güvenle doğrulanamadı. Lütfen daha sonra tekrar deneyin.'); }
    if (result[0] === 0) {
        const global = result[1] === 3 || result[1] === 4;
        const burst = result[1] === 5;
        throw new AiError(429, burst ? 'Bilge Ağaç biraz soluklansın. Bir dakika sonra tekrar deneyin.' : global ? 'Bugünkü ortak erken erişim kapasitesi doldu. Yarın yeniden deneyebilir veya kendi anahtarınızı kullanabilirsiniz.' : 'Bu ağın bugünkü sohbet ve makro hakkı doldu. Yarın yenilenir; kendi anahtarınızla devam edebilirsiniz.', burst ? 60 : Math.max(1, Math.ceil((Date.parse(resetsAt) - Date.now()) / 1000)));
    }
    return { remainingRequests: result[1], remainingUnits: result[2], dailyRequests: cfg.dailyRequests, dailyUnits: cfg.dailyUnits, resetsAt };
}

export type HostedMessage = { role: string; content: string | ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'low' } })[] };
export async function hostedCompletion(messages: HostedMessage[]) {
    const cfg = hostedConfig();
    let response: Response;
    try {
        response = await fetch(`${cfg.base}/chat/completions`, {
            method: 'POST', headers: { Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: cfg.model, messages, max_tokens: cfg.outputTokens, stream: false }),
            signal: AbortSignal.timeout(45000), redirect: 'error', cache: 'no-store'
        });
    } catch { throw new AiError(504, 'Bilge Ağaç zamanında yanıt alamadı. Lütfen daha sonra tekrar deneyin.'); }
    // Sağlayıcının ham hata gövdesini istemciye veya günlüğe taşımayız.
    if (!response.ok) throw new AiError(502, response.status === 429 ? 'Yapay zekâ sağlayıcısı şu anda yoğun. Biraz sonra tekrar deneyin.' : 'Yapay zekâ sağlayıcısına şu anda ulaşılamıyor. Lütfen daha sonra tekrar deneyin.');
    const data = await response.json().catch(() => null);
    const choice = data?.choices?.[0];
    if (choice?.finish_reason === 'length') throw new AiError(422, 'Yanıt sınırına ulaşıldı. Lütfen daha kısa bir metin veya soru deneyin.');
    const text = choice?.message?.content;
    if (typeof text !== 'string' || !text.trim()) throw new AiError(502, 'Yapay zekâ boş yanıt verdi.');
    return text.trim();
}
