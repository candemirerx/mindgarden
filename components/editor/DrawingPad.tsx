'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, Undo2, Trash2, X } from 'lucide-react';
import AiDialog from '@/components/ai/AiDialog';

type Point = { x: number; y: number };
type Stroke = { color: string; width: number; points: Point[] };
export default function DrawingPad({ onClose, onInsert }: { onClose: () => void; onInsert: (src: string) => void }) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const strokes = useRef<Stroke[]>([]);
    const active = useRef<number | null>(null);
    const [count, setCount] = useState(0);
    const [color, setColor] = useState('#244936');
    const [width, setWidth] = useState(3);
    const paint = () => {
        const el = canvas.current, ctx = el?.getContext('2d'); if (!el || !ctx) return;
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, el.width, el.height);
        for (const s of strokes.current) {
            ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = s.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath(); s.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
            if (s.points.length === 1) { ctx.beginPath(); ctx.arc(s.points[0].x, s.points[0].y, s.width / 2, 0, Math.PI * 2); ctx.fill(); }
        }
    };
    useEffect(() => { paint(); }, []);
    const close = () => { if (!strokes.current.length || window.confirm('Çizimi eklemeden kapatmak istiyor musun?')) onClose(); };
    const insert = () => {
        const el = canvas.current; if (!el || !strokes.current.length || active.current !== null) return;
        // Trim empty margins so the tiny inline preview still tells you what it is.
        let minX = 900, minY = 1100, maxX = 0, maxY = 0;
        for (const s of strokes.current) for (const p of s.points) { minX = Math.min(minX, p.x - s.width); minY = Math.min(minY, p.y - s.width); maxX = Math.max(maxX, p.x + s.width); maxY = Math.max(maxY, p.y + s.width); }
        const x = Math.max(0, Math.floor(minX - 24)), y = Math.max(0, Math.floor(minY - 24));
        const crop = document.createElement('canvas'); crop.width = Math.max(1, Math.min(900, Math.ceil(maxX + 24)) - x); crop.height = Math.max(1, Math.min(1100, Math.ceil(maxY + 24)) - y);
        const ctx = crop.getContext('2d'); if (!ctx) return; ctx.drawImage(el, x, y, crop.width, crop.height, 0, 0, crop.width, crop.height); onInsert(crop.toDataURL('image/jpeg', .8));
    };
    return <AiDialog fullscreen label="Çiz ve yaz" onClose={close} className="max-w-3xl">
        <header className="flex shrink-0 items-center gap-2 border-b border-sand-200 px-3 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)]"><button type="button" aria-label="Çizimi kapat" onClick={close} className="p-3"><X size={20} /></button><div className="min-w-0 flex-1"><h2 className="font-semibold">Çiz ve yaz</h2><p className="text-xs text-sand-600">Parmağınla veya kaleminle · cihazında</p></div><button type="button" disabled={!count} onClick={insert} className="flex min-h-11 items-center gap-1 rounded-xl bg-moss-700 px-3 text-sm text-white disabled:opacity-40"><Check size={16} />Ekle</button></header>
        <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-sand-200 px-3 py-2">
            {['#244936', '#272323', '#325da8', '#b34151'].map(c => <button key={c} type="button" aria-label={'Kalem rengi ' + c} aria-pressed={color === c} onClick={() => setColor(c)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-transparent aria-pressed:border-moss-500"><span className="h-5 w-5 rounded-full" style={{ background: c }} /></button>)}
            <label className="flex items-center gap-1 text-xs">Kalınlık<select aria-label="Kalem kalınlığı" className="min-h-11 rounded-xl bg-sand-100 px-2" value={width} onChange={e => setWidth(Number(e.target.value))}><option value={3}>İnce</option><option value={6}>Orta</option><option value={12}>Kalın</option></select></label>
            <button type="button" aria-label="Son çizgiyi geri al" disabled={!count} onClick={() => { strokes.current.pop(); setCount(strokes.current.length); paint(); }} className="p-3 disabled:opacity-30"><Undo2 size={18} /></button>
            <button type="button" aria-label="Çizimi temizle" disabled={!count} onClick={() => { if (window.confirm('Çizimin tamamı temizlensin mi?')) { strokes.current = []; setCount(0); paint(); } }} className="p-3 disabled:opacity-30"><Trash2 size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-sand-100 p-3"><canvas ref={canvas} width={900} height={1100} aria-label="Elle çizim ve yazma alanı" className="w-full rounded-xl bg-white shadow-sm" style={{ touchAction: 'none' }} onPointerDown={e => {
            if (active.current !== null || e.button !== 0 || strokes.current.length >= 2000) return;
            e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); active.current = e.pointerId;
            const r = e.currentTarget.getBoundingClientRect(); strokes.current.push({ color, width, points: [{ x: (e.clientX - r.left) * 900 / r.width, y: (e.clientY - r.top) * 1100 / r.height }] }); paint(); setCount(strokes.current.length);
        }} onPointerMove={e => {
            if (active.current !== e.pointerId) return; const r = e.currentTarget.getBoundingClientRect();
            const stroke = strokes.current.at(-1); if (stroke && stroke.points.length < 10000) stroke.points.push({ x: (e.clientX - r.left) * 900 / r.width, y: (e.clientY - r.top) * 1100 / r.height }); paint();
        }} onPointerUp={() => { active.current = null; }} onPointerCancel={() => { active.current = null; }} onLostPointerCapture={() => { active.current = null; }} /></div>
    </AiDialog>;
}
