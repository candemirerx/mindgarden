'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Portal: tuvalin transform/zoom katmanından bağımsız, klavye ile erişilebilir. */
export default function AiDialog({ children, onClose, label, className = '', fullscreen = false }: { children: ReactNode; onClose: () => void; label: string; className?: string; fullscreen?: boolean }) {
    const overlay = useRef<HTMLDivElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const close = useRef(onClose); close.current = onClose;
    useEffect(() => {
        if (!fullscreen) return;
        // visualViewport already excludes the keyboard, including adjustResize WebViews.
        const viewport = window.visualViewport;
        const resize = () => {
            if (!overlay.current) return;
            overlay.current.style.height = `${viewport?.height ?? window.innerHeight}px`;
            overlay.current.style.top = `${viewport?.offsetTop ?? 0}px`;
        };
        resize();
        viewport?.addEventListener('resize', resize);
        viewport?.addEventListener('scroll', resize);
        window.addEventListener('resize', resize);
        return () => {
            viewport?.removeEventListener('resize', resize);
            viewport?.removeEventListener('scroll', resize);
            window.removeEventListener('resize', resize);
        };
    }, [fullscreen]);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const autofocus = !fullscreen || window.matchMedia('(pointer: fine)').matches;
        (autofocus && panel.current?.querySelector<HTMLElement>('[data-autofocus]') || panel.current?.querySelector<HTMLElement>('button, textarea'))?.focus({ preventScroll: true });
        const keydown = (event: KeyboardEvent) => {
            const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
            if (dialogs[dialogs.length - 1] !== panel.current) return;
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current(); }
            if (event.key !== 'Tab') return;
            const elements = panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex="0"]');
            if (!elements?.length) return;
            const first = elements[0], last = elements[elements.length - 1];
            if (event.shiftKey && (document.activeElement === first || !panel.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && (document.activeElement === last || !panel.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', keydown, true);
        return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown, true); previous?.focus?.(); };
    }, [fullscreen]);
    return createPortal(<div ref={overlay} className={'fixed inset-x-0 top-0 z-[240] flex justify-center bg-bark-950/45 backdrop-blur-sm ' + (fullscreen ? 'h-[100dvh] items-stretch sm:items-center sm:p-5' : 'bottom-0 items-end p-0 sm:items-center sm:p-5')} onPointerDown={event => { event.stopPropagation(); if (event.target === event.currentTarget) close.current(); }} onClick={event => event.stopPropagation()}>
        <div ref={panel} role="dialog" aria-modal="true" aria-label={label} className={'flex w-full flex-col overflow-hidden bg-paper shadow-pop ' + (fullscreen ? 'h-full min-h-0 sm:max-h-[820px] sm:rounded-[28px] sm:border sm:border-sand-200 ' : 'max-h-[92dvh] rounded-t-[28px] border border-sand-200 sm:rounded-[28px] ') + className}>{children}</div>
    </div>, document.body);
}
