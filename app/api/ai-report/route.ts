import { NextRequest, NextResponse } from 'next/server';
import { AiError } from '@/lib/server/hostedAi';
import { storeReport } from '@/lib/server/aiReports';
export const runtime = 'nodejs';
export const maxDuration = 15;
function headers(request: NextRequest): Record<string, string> {
    const origin = request.headers.get('origin') || '';
    const allowed = new Set(['http://localhost', 'https://localhost', 'capacitor://localhost', 'https://mindgarden-neon.vercel.app', process.env.NEXT_PUBLIC_SITE_URL || '']);
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) allowed.add(origin);
    return { 'Cache-Control': 'no-store', Vary: 'Origin', ...(allowed.has(origin) ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } : {}) };
}
export function OPTIONS(request: NextRequest) { return new NextResponse(null, { status: 204, headers: headers(request) }); }
export async function POST(request: NextRequest) {
    const cors = headers(request);
    try {
        const origin = request.headers.get('origin');
        if (origin && !cors['Access-Control-Allow-Origin']) throw new AiError(403, 'Bu kaynağa izin verilmiyor.');
        if (!request.headers.get('content-type')?.includes('application/json')) throw new AiError(415, 'JSON gerekli.');
        if (Number(request.headers.get('content-length')) > 20000) throw new AiError(413, 'Bildirim çok uzun.');
        const reader = request.body?.getReader();
        if (!reader) throw new AiError(400, 'Bildirim boş.');
        const chunks: Uint8Array[] = []; let size = 0;
        try {
            while (true) {
                const { value, done } = await reader.read(); if (done) break;
                size += value.byteLength;
                if (size > 20000) { await reader.cancel(); throw new AiError(413, 'Bildirim çok uzun.'); }
                chunks.push(value);
            }
        } finally { reader.releaseLock(); }
        let body;
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new AiError(400, 'Geçersiz bildirim.'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AiError(400, 'Geçersiz bildirim.');
        return NextResponse.json(await storeReport(request, body), { status: 201, headers: cors });
    } catch (error) {
        const safe = error instanceof AiError ? error : new AiError(500, 'Bildirim gönderilemedi.');
        return NextResponse.json({ error: safe.message }, { status: safe.status, headers: { ...cors, ...(safe.retryAfter ? { 'Retry-After': String(safe.retryAfter) } : {}) } });
    }
}
