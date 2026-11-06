import { getApiUrl } from './config';
import type { BilgeLength } from './bilgePreferences';

export type ChatMessage = { role: 'user' | 'assistant'; content: string; image?: string; hadImage?: boolean };
export type AiAllowance = { remainingRequests: number; remainingUnits: number; dailyRequests: number; dailyUnits: number; resetsAt: string };
export type HostedAiStatus = { available: boolean; notice: string; dailyRequests: number; dailyUnits: number; maxTextLength: number; supportsImages?: boolean };

export async function hostedAiStatus(signal?: AbortSignal): Promise<HostedAiStatus> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    const timeout = setTimeout(abort, 10000);
    try {
        const res = await fetch(getApiUrl('/api/ai'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'status' }), signal: controller.signal, cache: 'no-store' });
        if (!res.ok) throw new Error('Hazır AI durumu alınamadı.');
        return await res.json();
    } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}

export async function hostedAiRequest(input: { kind: 'chat'; messages: ChatMessage[]; answerLength?: BilgeLength } | { kind: 'macro'; text: string; instruction: string }, signal?: AbortSignal): Promise<{ text: string; allowance: AiAllowance }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    const timeout = setTimeout(abort, 55000);
    try {
        const response = await fetch(getApiUrl('/api/ai'), {
            method: 'POST', headers, body: JSON.stringify(input), signal: controller.signal
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            const error = new Error(data?.error || 'Hazır AI şu anda yanıt veremiyor.') as Error & { retryable: boolean };
            // Ortak bütçe kullanırken otomatik yeniden deneme/parçalama yok.
            error.retryable = false;
            throw error;
        }
        if (typeof data?.text !== 'string' || !data.text.trim()) throw new Error('Yapay zekâ boş yanıt döndürdü.');
        window.dispatchEvent(new CustomEvent('nb-ai-allowance', { detail: data.allowance }));
        return data;
    } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abort);
    }
}
