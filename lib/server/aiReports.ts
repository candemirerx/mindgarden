import 'server-only';
import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { AiError, hostedConfig, identity } from './hostedAi';
import { AI_REPORT_REASONS } from '../aiReports';

export const REPORT_TTL = 30 * 86400;
/** Kota ve kalıcı kayıt tek atomik işlem; ağ başına 10, toplam günde 100 bildirim. */
export const REPORT_LUA = `
local a = tonumber(redis.call('GET', KEYS[1]) or '0')
local b = tonumber(redis.call('GET', KEYS[2]) or '0')
if a >= 10 or b >= 100 then return 0 end
redis.call('INCR', KEYS[1]); redis.call('EXPIRE', KEYS[1], 172800)
redis.call('INCR', KEYS[2]); redis.call('EXPIRE', KEYS[2], 172800)
redis.call('SET', KEYS[3], ARGV[1], 'EX', ARGV[2])
redis.call('ZADD', KEYS[4], ARGV[3], ARGV[4])
redis.call('ZREMRANGEBYSCORE', KEYS[4], '-inf', ARGV[5])
redis.call('EXPIRE', KEYS[4], ARGV[2])
return 1
`;
export function validateReport(body: Record<string, unknown>) {
    if (typeof body.response !== 'string' || !body.response.trim() || body.response.length > 4000 ||
        typeof body.reason !== 'string' || !(AI_REPORT_REASONS as readonly string[]).includes(body.reason) ||
        (body.details !== undefined && (typeof body.details !== 'string' || body.details.length > 500)) ||
        typeof body.source !== 'string' || !['chat', 'macro'].includes(body.source) || body.consent !== true)
        throw new AiError(400, 'Geçerli bir yanıt, bildirim nedeni ve paylaşım onayı gerekli.');
    return { response: body.response.trim(), reason: body.reason, details: typeof body.details === 'string' ? body.details.trim() : '', source: body.source };
}
export async function storeReport(request: NextRequest, body: Record<string, unknown>) {
    const clean = validateReport(body);
    const cfg = hostedConfig();
    // Raporlama, Hazır AI açık olmasa da kişisel ve yerel modeller için çalışır.
    if (!/^https:\/\//.test(cfg.redisUrl) || !cfg.redisToken || cfg.salt.length < 32)
        throw new AiError(503, 'Bildirim servisi şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
    const network = await identity(request, cfg.salt);
    const now = Date.now(), id = randomUUID(), day = new Date(now).toISOString().slice(0, 10);
    const report = { id, ...clean, createdAt: new Date(now).toISOString(), status: 'new' };
    // Ham IP, kullanıcı hesabı, anahtar veya diğer sohbetler kayda eklenmez.
    let result: unknown;
    try {
        const response = await fetch(cfg.redisUrl, {
            method: 'POST', headers: { Authorization: 'Bearer ' + cfg.redisToken, 'Content-Type': 'application/json' },
            body: JSON.stringify(['EVAL', REPORT_LUA, '4', 'nb:reports:rate:' + day + ':' + network, 'nb:reports:rate:' + day,
                'nb:reports:item:' + id, 'nb:reports:index', JSON.stringify(report), String(REPORT_TTL), String(now), id, String(now - REPORT_TTL * 1000)]),
            signal: AbortSignal.timeout(8000), cache: 'no-store', redirect: 'error'
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (data.error || ![0, 1].includes(data.result)) throw new Error();
        result = data.result;
    } catch { throw new AiError(503, 'Bildirim kaydedilemedi. Lütfen daha sonra tekrar deneyin.'); }
    if (result === 0) throw new AiError(429, 'Bildirim sınırına ulaşıldı. Lütfen yarın tekrar deneyin.', 3600);
    return { id };
}
