'use client';

import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal({
    isOpen,
    title,
    description,
    confirmText = 'Onayla',
    cancelText = 'İptal',
    isDanger = false,
    onConfirm,
    onCancel
}: ConfirmModalProps) {

    const dialogRef = useRef<HTMLDivElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const oncesiOdakRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        // Açılmadan önce odaklanan öğeyi hatırla; kapanınca o öğeye dön.
        oncesiOdakRef.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;

        // Varsayılan odak İptal'de durur: klavyeden gelen Enter yanlışlıkla
        // silme/onay işlemini tetiklemez, odaklanan düğmeyi çalıştırır.
        cancelRef.current?.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
                return;
            }
            if (e.key !== 'Tab') return;

            // Odağı diyalog içinde tut; Tab ile arka plandaki arayüze kaçmasın.
            const odaklanabilirler = dialogRef.current?.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (!odaklanabilirler || odaklanabilirler.length === 0) return;
            const ilk = odaklanabilirler[0];
            const son = odaklanabilirler[odaklanabilirler.length - 1];
            if (e.shiftKey && document.activeElement === ilk) {
                e.preventDefault();
                son.focus();
            } else if (!e.shiftKey && document.activeElement === son) {
                e.preventDefault();
                ilk.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            oncesiOdakRef.current?.focus?.();
        };
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-bark-950/45 p-4 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="onay-basligi"
                aria-describedby="onay-aciklamasi"
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-pop animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isDanger ? 'bg-berry-100 text-berry-600' : 'bg-sand-100 text-sand-600'}`}>
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <h3 id="onay-basligi" className="text-lg font-semibold text-sand-900">{title}</h3>
                        <p id="onay-aciklamasi" className="mt-1.5 text-sm leading-relaxed text-sand-600">{description}</p>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2.5">
                    <button
                        ref={cancelRef}
                        type="button"
                        onClick={onCancel}
                        className="btn btn-ghost min-h-[44px] px-4 py-2.5 text-sm"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`btn min-h-[44px] px-5 py-2.5 text-sm ${isDanger ? 'btn-danger' : 'btn-primary'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
