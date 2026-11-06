'use client';
import { useEffect, useRef, useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { AI_REPORT_LABELS, AI_REPORT_REASONS, type AiReportReason } from '@/lib/aiReports';
import { getApiUrl } from '@/lib/config';

export default function AiReportButton({ response, source }: { response: string; source: 'chat' | 'macro' }) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState<AiReportReason>('unsafe');
    const [details, setDetails] = useState('');
    const [consent, setConsent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [receipt, setReceipt] = useState('');
    const controller = useRef<AbortController | null>(null);
    useEffect(() => () => controller.current?.abort(), []);
    async function submit() {
        if (!consent || controller.current) return;
        const abort = new AbortController(); controller.current = abort;
        const timeout = setTimeout(() => abort.abort(), 15000);
        setBusy(true); setError('');
        try {
            const result = await fetch(getApiUrl('/api/ai-report'), {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response: response.slice(0, 4000), source, reason, details, consent: true }), signal: abort.signal
            });
            const body = await result.json().catch(() => null);
            if (!result.ok || typeof body?.id !== 'string') throw new Error(body?.error || 'Bildirim alınamadı. Tekrar deneyin.');
            setReceipt(body.id); setOpen(false); setDetails('');
        } catch (e) {
            if (controller.current === abort) setError(abort.signal.aborted ? 'Bağlantı zaman aşımına uğradı. Tekrar deneyebilirsiniz.' : e instanceof Error ? e.message : 'Bildirim gönderilemedi.');
        } finally { clearTimeout(timeout); controller.current = null; setBusy(false); }
    }
    if (receipt) return <p role="status" className="mt-1 break-all text-xs text-moss-700">Bildirimin alındı · {receipt}</p>;
    return <div className="mt-1">
        <button type="button" aria-label="Bu AI yanıtını bildir" aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-xs text-sand-500 hover:bg-sand-100"><Flag size={13} />Yanıtı bildir</button>
        {open && <div role="group" aria-label="AI yanıtını bildirme" className="mt-1 space-y-3 rounded-2xl border border-sand-200 bg-paper p-3 text-sm text-sand-800">
            <label className="block"><span className="mb-1 block text-xs font-semibold">Bildirim nedeni</span><select aria-label="Bildirim nedeni" value={reason} disabled={busy} onChange={e => setReason(e.target.value as AiReportReason)} className="min-h-11 w-full rounded-xl border border-sand-300 bg-white px-2 text-base">{AI_REPORT_REASONS.map(r => <option key={r} value={r}>{AI_REPORT_LABELS[r]}</option>)}</select></label>
            <label className="block"><span className="mb-1 block text-xs">Açıklama (isteğe bağlı, kişisel bilgi yazmayın)</span><textarea aria-label="Bildirim açıklaması" value={details} onChange={e => setDetails(e.target.value)} maxLength={500} rows={2} disabled={busy} className="w-full resize-y rounded-xl border border-sand-300 bg-white p-2 text-base" /></label>
            <label className="flex min-h-11 items-start gap-2 text-xs leading-5"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" /><span>Yalnızca bu AI yanıtının{response.length > 4000 ? ' ilk 4.000 karakterinin' : ''}, bildirim nedeninin ve açıklamamın Not Bahçesi geliştiricisine gönderilmesini onaylıyorum. Diğer sohbet ve notlar gönderilmez. Bildirim en fazla 30 gün saklanır.</span></label>
            {error && <p role="alert" className="text-xs text-berry-700">{error}</p>}
            <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setOpen(false)} className="min-h-11 rounded-xl px-3 text-sand-600">Vazgeç</button><button type="button" disabled={!consent || busy} onClick={() => void submit()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-moss-700 px-3 text-white disabled:opacity-40">{busy && <Loader2 size={15} className="animate-spin" />}Bildirimi gönder</button></div>
        </div>}
    </div>;
}
