'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bark-950/45 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-pop animate-slide-up"
            >
                <div className="flex items-center justify-between gap-4 border-b border-sand-200 px-5 py-4">
                    <h3 className="text-lg font-semibold text-sand-900">{title}</h3>
                    <button
                        onClick={onClose}
                        aria-label="Kapat"
                        className="rounded-xl p-2 text-sand-500 transition-colors duration-200 hover:bg-sand-100 hover:text-sand-700"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="overflow-y-auto p-6">{children}</div>
            </div>
        </div>
    );
};
