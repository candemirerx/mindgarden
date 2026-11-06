'use client';

import { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import AiDialog from './AiDialog';
import AiReportButton from './AiReportButton';

export default function AiResultDialog({ title, original, result, onApply, onClose }: { title: string; original: string; result: string; onApply: () => Promise<void>; onClose: () => void }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    return <AiDialog label="Yapay zekâ sonucu önizlemesi" onClose={() => { if (!busy) onClose(); }} className="max-w-2xl">
        <header className="flex items-center justify-between border-b border-sand-200 px-5 py-4"><div><h2 className="text-xl text-moss-900">{title}</h2><p className="mt-1 text-xs text-sand-600">Notunuz henüz değişmedi. Sonucu kontrol edip uygulayın.</p></div><button type="button" disabled={busy} aria-label="Önizlemeyi kapat" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-sand-100"><X size={19} /></button></header>
        <div className="min-h-0 space-y-4 overflow-y-auto p-5">
            <details className="rounded-xl border border-sand-200 p-3"><summary className="cursor-pointer text-xs font-semibold text-sand-700">Orijinal metin</summary><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-sand-600">{original}</p></details>
            <p className="whitespace-pre-wrap break-words rounded-2xl border border-moss-200 bg-moss-50 p-4 text-sm leading-7 text-sand-900">{result}</p>
            <AiReportButton response={result} source="macro" />
            {error && <p role="alert" className="text-sm text-berry-700">{error}</p>}
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-sand-200 p-4 pb-[max(16px,env(safe-area-inset-bottom))]"><button type="button" className="btn btn-ghost min-h-11" onClick={() => { void navigator.clipboard.writeText(result).then(() => setCopied(true)).catch(() => setError('Kopyalanamadı. Metni seçerek kopyalayabilirsiniz.')); }}><Copy size={15} />{copied ? 'Kopyalandı' : 'Kopyala'}</button><button type="button" disabled={busy} onClick={onClose} className="btn btn-secondary min-h-11">Vazgeç</button><button type="button" disabled={busy} className="btn btn-primary min-h-11" onClick={async () => { setBusy(true); setError(''); try { await onApply(); onClose(); } catch (e) { setError(e instanceof Error ? e.message : 'Sonuç uygulanamadı.'); } finally { setBusy(false); } }}><Check size={16} />{busy ? 'Uygulanıyor…' : 'Nota uygula'}</button></footer>
    </AiDialog>;
}
