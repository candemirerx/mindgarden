'use client';

import React, { useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import { useKeyboardInset } from '@/lib/useKeyboardInset';

interface PromptModalProps {
    isOpen: boolean;
    title: string;
    description?: string;
    placeholder?: string;
    initialValue?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
}

export default function PromptModal({
    isOpen,
    title,
    description,
    placeholder = 'Buraya yazın...',
    initialValue = '',
    confirmText = 'Tamam',
    cancelText = 'İptal',
    onConfirm,
    onCancel
}: PromptModalProps) {
    const [value, setValue] = React.useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);

    // Klavye açıldığında kutunun görünür alanda kalmasını sağlar
    const keyboardInset = useKeyboardInset(isOpen);

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
            const focusTimer = setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 100);
            // Klavye açıldıktan sonra alanı görünür alana getir
            const scrollTimer = setTimeout(() => {
                inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }, 400);

            return () => {
                clearTimeout(focusTimer);
                clearTimeout(scrollTimer);
            };
        }
    }, [isOpen, initialValue]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (value.trim()) onConfirm(value.trim());
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, value, onConfirm, onCancel]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-bark-950/40 p-4 backdrop-blur-sm animate-fade-in"
            style={{ paddingBottom: keyboardInset ? keyboardInset + 16 : undefined }}
            onClick={onCancel}
        >
            <div 
                className="w-full max-w-sm max-h-full overflow-y-auto rounded-[24px] bg-white p-6 shadow-pop animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-xl font-semibold text-sand-900 mb-1">{title}</h3>
                {description && <p className="text-sm text-sand-500 mb-4">{description}</p>}
                
                <div className={description ? "" : "mt-4"}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        placeholder={placeholder}
                        className="w-full rounded-xl border border-moss-400 bg-sand-50 px-4 py-3 text-base text-sand-900 outline-none ring-4 ring-moss-500/10 focus:border-moss-500 transition-all"
                    />
                </div>

                <div className="mt-6 flex items-center justify-end gap-2.5">
                    <button
                        onClick={onCancel}
                        className="rounded-xl px-4 py-2.5 text-sm font-semibold text-sand-600 hover:bg-sand-100 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            if (value.trim()) onConfirm(value.trim());
                        }}
                        disabled={!value.trim()}
                        className="rounded-xl bg-moss-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-moss-700 disabled:opacity-50"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
