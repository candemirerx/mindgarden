'use client';

import { useEffect, useRef } from 'react';
import { fareAdimSiniri, sendCommand } from '@/lib/remoteTools';
import type { RemotePrefs } from '@/lib/remoteTools';

/**
 * Fare dokunmatik yüzeyi: sürükleme imleci taşır, kısa tek dokunuş sol tık.
 *
 * Aynı anda tek hareket isteği yoldadır; o sürede gelen hareketler birikir ve
 * istek dönünce tek pakette gider. Böylece bağlantı yavaşken kuyruk büyümez,
 * imleç parmağın gerisinde kalmaz. Küsuratlar saklanır; yavaş hareket kaybolmaz.
 */
export default function FareYuzeyi({ prefs, onHata, className, children }: {
    prefs: RemotePrefs; onHata: (mesaj: string) => void; className: string; children?: React.ReactNode;
}) {
    const start = useRef<{ id: number; x: number; y: number; originX: number; originY: number; time: number; moved: boolean } | null>(null);
    const movement = useRef<Promise<void>>(Promise.resolve());
    const pendingMove = useRef({ x: 0, y: 0 });
    const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hareketYolda = useRef(false);
    useEffect(() => () => { if (moveTimer.current) clearTimeout(moveTimer.current); }, []);

    const flushMove = () => {
        if (moveTimer.current) { clearTimeout(moveTimer.current); moveTimer.current = null; }
        if (hareketYolda.current) return;
        const sinir = fareAdimSiniri(prefs);
        const dx = Math.max(-sinir, Math.min(sinir, Math.trunc(pendingMove.current.x)));
        const dy = Math.max(-sinir, Math.min(sinir, Math.trunc(pendingMove.current.y)));
        if (!dx && !dy) return;
        pendingMove.current.x -= dx;
        pendingMove.current.y -= dy;
        hareketYolda.current = true;
        movement.current = movement.current.catch(() => {}).then(() => sendCommand(`mm:${dx},${dy}`, prefs))
            .catch(error => onHata(error.message))
            .finally(() => { hareketYolda.current = false; if (Math.abs(pendingMove.current.x) >= 1 || Math.abs(pendingMove.current.y) >= 1) flushMove(); });
    };
    const move = (x: number, y: number) => {
        const point = start.current;
        if (!point) return;
        const dx = x - point.x, dy = y - point.y;
        if (Math.hypot(x - point.originX, y - point.originY) > 8) point.moved = true;
        point.x = x; point.y = y;
        pendingMove.current.x += dx * prefs.mouseSensitivity;
        pendingMove.current.y += dy * prefs.mouseSensitivity;
        if (!moveTimer.current && !hareketYolda.current) moveTimer.current = setTimeout(flushMove, 8);
    };

    return <div role="application" aria-label="Fare dokunmatik yüzeyi" className={className}
        onPointerDown={e => { if (!e.isPrimary || start.current) return; e.currentTarget.setPointerCapture(e.pointerId); start.current = { id: e.pointerId, x: e.clientX, y: e.clientY, originX: e.clientX, originY: e.clientY, time: Date.now(), moved: false }; }}
        onPointerMove={e => { if (start.current?.id === e.pointerId && e.buttons) move(e.clientX, e.clientY); }}
        onPointerUp={e => {
            const point = start.current;
            if (!point || point.id !== e.pointerId) return;
            if (!point.moved && Math.hypot(e.clientX - point.originX, e.clientY - point.originY) < 8 && Date.now() - point.time < 450) {
                flushMove();
                movement.current = movement.current.catch(() => {}).then(() => sendCommand('mc:1', prefs)).catch(error => onHata(error.message));
            }
            start.current = null;
        }} onPointerCancel={e => { if (start.current?.id === e.pointerId) start.current = null; }}>
        {children}
    </div>;
}
