'use client';
/* eslint-disable @next/next/no-img-element -- Prepared local data URLs, never remote images. */
import { X } from 'lucide-react';
import AiDialog from '@/components/ai/AiDialog';
export default function ImagePreview({ src, onClose }: { src: string; onClose: () => void }) {
    return <AiDialog fullscreen label="Görsel önizlemesi" onClose={onClose} className="max-w-3xl">
<header className="flex shrink-0 items-center justify-between border-b border-sand-200 px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+8px)]"><h2 className="font-sans text-sm font-semibold">Görsel önizlemesi</h2><button type="button" aria-label="Görsel önizlemesini kapat" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-sand-100"><X size={20} /></button></header>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-sand-100 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]"><img src={src} alt="Seçilen görselin büyük önizlemesi" className="max-h-full max-w-full rounded-xl object-contain" /></div>
    </AiDialog>;
}
