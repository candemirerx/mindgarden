'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Maximize2 } from 'lucide-react';
import { ViewState, Point } from '@/lib/types';

interface GardenCanvasProps {
    children: React.ReactNode;
}

export const GardenCanvas: React.FC<GardenCanvasProps> = ({ children }) => {
    const [viewState, setViewState] = useState<ViewState>({ scale: 1, offset: { x: 0, y: 0 } });
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Canvas'ı başlangıçta ortala
    useEffect(() => {
        if (containerRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            setViewState(prev => ({
                ...prev,
                offset: { x: width / 2 - 100, y: height / 4 }
            }));
        }
    }, []);

    // Fit View - Tüm içeriği göster
    const handleFitView = () => {
        if (!containerRef.current || !contentRef.current) return;

        const container = containerRef.current.getBoundingClientRect();
        const content = contentRef.current.getBoundingClientRect();

        // İçeriğin gerçek boyutlarını al (scale olmadan)
        const contentWidth = content.width / viewState.scale;
        const contentHeight = content.height / viewState.scale;

        // Padding ekle
        const padding = 50;
        const availableWidth = container.width - padding * 2;
        const availableHeight = container.height - padding * 2;

        // Ölçek hesapla
        const scaleX = availableWidth / contentWidth;
        const scaleY = availableHeight / contentHeight;
        const newScale = Math.min(scaleX, scaleY, 1); // Max 1x zoom

        // Merkezleme hesapla
        const scaledWidth = contentWidth * newScale;
        const scaledHeight = contentHeight * newScale;
        const offsetX = (container.width - scaledWidth) / 2;
        const offsetY = (container.height - scaledHeight) / 2;

        setViewState({
            scale: newScale,
            offset: { x: offsetX, y: offsetY }
        });
    };

    // Mouse/Touch başlangıç
    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.node-content')) return;

        setIsDragging(true);

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        setLastMousePos({ x: clientX, y: clientY });
    };

    // Mouse/Touch hareket
    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const deltaX = clientX - lastMousePos.x;
        const deltaY = clientY - lastMousePos.y;

        setViewState(prev => ({
            ...prev,
            offset: {
                x: prev.offset.x + deltaX,
                y: prev.offset.y + deltaY
            }
        }));
        setLastMousePos({ x: clientX, y: clientY });
    };

    // Mouse/Touch bitiş
    const handlePointerUp = () => {
        setIsDragging(false);
    };

    // Zoom (mouse wheel) - useEffect ile native listener kullanıyoruz
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const zoomSensitivity = 0.001;
            const newScale = Math.min(Math.max(0.2, viewState.scale - e.deltaY * zoomSensitivity), 3);

            setViewState(prev => ({
                ...prev,
                scale: newScale
            }));
        };

        // passive: false ile ekliyoruz ki preventDefault çalışsın
        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, [viewState.scale]);

    return (
        <div
            ref={containerRef}
            className={`w-full h-full overflow-hidden relative bg-[#f4f1ea] cursor-grab ${isDragging ? 'cursor-grabbing' : ''} touch-none`}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
        >
            {/* Grid Background Pattern - Toprak Dokusu */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%233e2723\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                    backgroundSize: `${60 * viewState.scale}px ${60 * viewState.scale}px`,
                    backgroundPosition: `${viewState.offset.x}px ${viewState.offset.y}px`
                }}
            />

            {/* Content Layer */}
            <div
                ref={contentRef}
                className="absolute origin-top-left transition-transform duration-75 ease-out tree"
                style={{
                    transform: `translate(${viewState.offset.x}px, ${viewState.offset.y}px) scale(${viewState.scale})`
                }}
            >
                {children}
            </div>

            {/* Zoom Controls - Mobil Responsive - Ağaç Teması */}
            <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 flex flex-col gap-2 bg-[#fffbf7]/90 backdrop-blur-lg p-2 rounded-xl shadow-xl border border-[#d7ccc8]">
                {/* Fit View Button */}
                <button
                    onClick={handleFitView}
                    className="p-2 md:p-2.5 hover:bg-[#E8F5E9] rounded-lg text-[#2E7D32] transition-colors group"
                    title="Tümünü Göster"
                >
                    <Maximize2 size={18} className="md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
                </button>

                <div className="w-full h-px bg-[#d7ccc8]" />

                {/* Zoom In */}
                <button
                    onClick={() => setViewState(p => ({ ...p, scale: Math.min(p.scale + 0.2, 3) }))}
                    className="p-2 md:p-2.5 hover:bg-[#efebe9] rounded-lg text-[#5D4037] transition-colors"
                    title="Yakınlaştır"
                >
                    <Plus size={18} className="md:w-5 md:h-5" />
                </button>

                {/* Scale Indicator */}
                <div className="text-center text-[10px] md:text-xs text-[#8D6E63] font-mono py-1 font-bold">
                    {Math.round(viewState.scale * 100)}%
                </div>

                {/* Zoom Out */}
                <button
                    onClick={() => setViewState(p => ({ ...p, scale: Math.max(p.scale - 0.2, 0.2) }))}
                    className="p-2 md:p-2.5 hover:bg-[#efebe9] rounded-lg text-[#5D4037] transition-colors"
                    title="Uzaklaştır"
                >
                    <div className="w-4 h-0.5 md:w-5 bg-current mx-auto"></div>
                </button>
            </div>

            {/* Mobile Hint */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 md:hidden bg-[#fffbf7]/90 backdrop-blur-lg px-4 py-2 rounded-full shadow-lg border border-[#d7ccc8] text-xs text-[#5D4037] pointer-events-none">
                <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#66BB6A] rounded-full animate-pulse"></span>
                    Parmağınla sürükle ve yakınlaştır
                </span>
            </div>
        </div>
    );
};
