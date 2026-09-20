'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface AnchoredDropdownProps {
    isOpen: boolean;
    anchorElement: HTMLElement | null;
    onClose: () => void;
    children: ReactNode;
    width?: number;
    className?: string;
    ariaLabel?: string;
}

const VIEWPORT_MARGIN = 8;
const MENU_GAP = 6;

export default function AnchoredDropdown({
    isOpen,
    anchorElement,
    onClose,
    children,
    width = 192,
    className = '',
    ariaLabel = 'Seçenekler'
}: AnchoredDropdownProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    const updatePosition = useCallback(() => {
        const menu = menuRef.current;
        if (!anchorElement || !menu) return;

        const anchorRect = anchorElement.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const menuWidth = menuRect.width || width;
        const menuHeight = menuRect.height;
        const spaceBelow = window.innerHeight - anchorRect.bottom - VIEWPORT_MARGIN;
        const openAbove = spaceBelow < menuHeight + MENU_GAP && anchorRect.top > spaceBelow;

        const preferredTop = openAbove
            ? anchorRect.top - menuHeight - MENU_GAP
            : anchorRect.bottom + MENU_GAP;
        const top = Math.min(
            Math.max(VIEWPORT_MARGIN, preferredTop),
            Math.max(VIEWPORT_MARGIN, window.innerHeight - menuHeight - VIEWPORT_MARGIN)
        );
        const left = Math.min(
            Math.max(VIEWPORT_MARGIN, anchorRect.right - menuWidth),
            Math.max(VIEWPORT_MARGIN, window.innerWidth - menuWidth - VIEWPORT_MARGIN)
        );

        setPosition({ top, left });
    }, [anchorElement, width]);

    useEffect(() => {
        if (!isOpen) {
            setPosition(null);
            return;
        }

        const frame = window.requestAnimationFrame(updatePosition);
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, updatePosition]);

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <>
            <button
                type="button"
                aria-label="Menüyü kapat"
                className="fixed inset-0 z-[90] cursor-default bg-transparent"
                onClick={onClose}
            />
            <div
                ref={menuRef}
                role="menu"
                aria-label={ariaLabel}
                onClick={(event) => event.stopPropagation()}
                className={`fixed z-[100] overflow-hidden rounded-xl border border-sand-200 bg-white py-1 shadow-pop animate-scale-in ${className}`}
                style={{
                    width,
                    top: position?.top ?? 0,
                    left: position?.left ?? 0,
                    visibility: position ? 'visible' : 'hidden'
                }}
            >
                {children}
            </div>
        </>,
        document.body
    );
}
