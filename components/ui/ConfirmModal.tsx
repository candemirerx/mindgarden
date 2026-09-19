'use client';

import React, { useEffect } from 'react';
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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                onConfirm();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onConfirm, onCancel]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-bark-950/40 p-4 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
            <div 
                className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-pop animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isDanger ? 'bg-berry-100 text-berry-600' : 'bg-sand-100 text-sand-600'}`}>
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-sand-900">{title}</h3>
                        <p className="mt-1.5 text-sm text-sand-500 leading-relaxed">{description}</p>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2.5">
                    <button
                        onClick={onCancel}
                        className="rounded-xl px-4 py-2.5 text-sm font-semibold text-sand-600 hover:bg-sand-100 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all ${
                            isDanger 
                            ? 'bg-berry-600 hover:bg-berry-700' 
                            : 'bg-moss-600 hover:bg-moss-700'
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
