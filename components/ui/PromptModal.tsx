'use client';

import React, { useEffect, useRef } from 'react';
import { X, Check, StickyNote, Sparkles } from 'lucide-react';
import { useKeyboardInset } from '@/lib/useKeyboardInset';

export type EklemeTuru = 'not' | 'yz';

interface PromptModalProps {
    isOpen: boolean;
    title: string;
    description?: string;
    placeholder?: string;
    initialValue?: string;
    confirmText?: string;
    cancelText?: string;
    /**
     * Boş değerle onaylamaya izin verir. Sıralı ad aracı açıkken ad
     * yazmadan da dal eklenebilsin diye kullanılır.
     */
    allowEmpty?: boolean;
    /** Not ya da YZ ağacı seçimi gösterilir; seçim onConfirm'in ikinci değeridir. */
    turSecimi?: boolean;
    onConfirm: (value: string, tur: EklemeTuru) => void;
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
    allowEmpty = false,
    turSecimi = false,
    onConfirm,
    onCancel
}: PromptModalProps) {
    const [value, setValue] = React.useState(initialValue);
    const [tur, setTur] = React.useState<EklemeTuru>('not');
    const inputRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const oncesiOdakRef = useRef<HTMLElement | null>(null);

    // Klavye açıldığında kutunun görünür alanda kalmasını sağlar
    const keyboardInset = useKeyboardInset(isOpen);

    // Kapanınca odak, pencereyi açan öğeye döner; aksi hâlde klavye
    // kullanıcısı belgenin başına savrulur.
    useEffect(() => {
        if (!isOpen) return;
        oncesiOdakRef.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        return () => {
            oncesiOdakRef.current?.focus?.();
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
            setTur('not');
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
                if (allowEmpty || value.trim()) onConfirm(value.trim(), tur);
            } else if (e.key === 'Tab') {
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
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, value, tur, onConfirm, onCancel, allowEmpty]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-bark-950/45 p-4 backdrop-blur-sm animate-fade-in"
            style={{ paddingBottom: keyboardInset ? keyboardInset + 16 : undefined }}
            onClick={onCancel}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="istem-basligi"
                className="w-full max-w-sm max-h-full overflow-y-auto rounded-2xl bg-white p-6 shadow-pop animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <h3 id="istem-basligi" className="mb-1 text-lg font-semibold text-sand-900">{title}</h3>
                {description && <p className="mb-4 text-sm leading-relaxed text-sand-600">{description}</p>}
                
                {turSecimi && (
                    <div role="radiogroup" aria-label="Eklenecek tür" className="mt-4 grid grid-cols-2 gap-2">
                        {([['not', 'Not', 'Yazı, dal ve yapraklar', StickyNote], ['yz', 'YZ ağacı', 'Belgeyle eğitilen asistan', Sparkles]] as const).map(([id, ad, alt, Ikon]) => {
                            const secili = tur === id;
                            const yz = id === 'yz';
                            return (
                                <button key={id} type="button" role="radio" aria-checked={secili} onClick={() => setTur(id)}
                                    className={`relative flex flex-col items-start gap-1.5 overflow-hidden rounded-2xl border-[1.5px] p-3 text-left transition-all duration-200 ${secili
                                        ? (yz ? 'border-transparent bg-[linear-gradient(145deg,rgb(var(--yz-1)),rgb(var(--yz-2))_60%,rgb(var(--yz-3)))] text-[rgb(var(--yz-yazi))] shadow-[0_12px_26px_-14px_rgb(var(--yz-2))]' : 'border-moss-500 bg-moss-50 text-moss-900')
                                        : 'border-sand-200 bg-white text-sand-800 hover:border-sand-300'}`}>
                                    {secili && yz && <span aria-hidden="true" className="pointer-events-none absolute -right-4 -top-6 h-16 w-16 rounded-full bg-[rgb(var(--yz-isik)/.3)] blur-xl" />}
                                    <span className={`relative flex h-8 w-8 items-center justify-center rounded-xl ${secili ? (yz ? 'bg-white/15 text-[rgb(var(--yz-isik))]' : 'bg-moss-600 text-white') : (yz ? 'bg-[rgb(var(--yz-acik))] text-[rgb(var(--yz-koyu))]' : 'bg-sand-100 text-sand-600')}`}><Ikon size={16} /></span>
                                    <span className="relative text-sm font-semibold">{ad}</span>
                                    <span className={`relative text-[11.5px] leading-4 ${secili ? (yz ? 'text-[rgb(var(--yz-soluk))]' : 'text-moss-700') : 'text-sand-500'}`}>{alt}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className={description || turSecimi ? (turSecimi ? "mt-3" : "") : "mt-4"}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        placeholder={turSecimi && tur === 'yz' ? 'Örn. Ders Asistanı' : placeholder}
                        className="w-full rounded-xl border border-sand-300 bg-white px-4 py-3 text-base text-sand-900 outline-none transition-colors duration-200 placeholder:text-sand-400 focus:border-moss-500 focus:ring-4 focus:ring-moss-500/10"
                    />
                </div>

                <div className="mt-6 flex items-center justify-end gap-2.5">
                    <button
                        onClick={onCancel}
                        className="btn btn-ghost min-h-[44px] px-4 py-2.5 text-sm"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            if (allowEmpty || value.trim()) onConfirm(value.trim(), tur);
                        }}
                        disabled={!allowEmpty && !value.trim()}
                        className="btn btn-primary min-h-[44px] px-5 py-2.5 text-sm"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
