'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ViewState, Point } from '@/lib/types';
import { useStore } from '@/lib/store/useStore';
import { agacSurukleniyorMu } from '@/lib/canvasGesture';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

/** Ağaç üzerinde başlayan dokunuşun tuval kaydırmasına dönüşmesi için
 *  parmağın aşması gereken mesafe (piksel). */
const KAYDIRMA_ESIGI = 10;

interface GardenCanvasProps {
    children: React.ReactNode;
    gardenId?: string;
    initialViewState?: { x: number; y: number; zoom: number };
}

export const GardenCanvas: React.FC<GardenCanvasProps> = ({ children, gardenId, initialViewState }) => {
    const { setSelectedNode, updateGardenViewState } = useStore();
    const [viewState, setViewState] = useState<ViewState>({
        scale: initialViewState?.zoom || 1,
        offset: { x: initialViewState?.x || 0, y: initialViewState?.y || 0 }
    });
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 });
    const [isPinching, setIsPinching] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Gesture Başlangıç Referansları (Daha stabil bir deneyim için)
    const gestureStartScale = useRef<number>(1);
    const gestureStartOffset = useRef<Point>({ x: 0, y: 0 });
    const gestureStartDistance = useRef<number>(0);
    // Pinch başladığında parmakların altındaki dünya koordinatı (sabit kalmalı)
    const gestureStartWorldPoint = useRef<Point>({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    /**
     * Ağaç üzerinde başlayan dokunuşun başlangıç noktası.
     *
     * Böyle bir dokunuşta tuval hemen kaymaz: parmak eşiği aşarsa kaydırmaya
     * dönüşür, parmak yerinde kalırsa uzun basma sayılır ve ağaç taşınır.
     */
    const dugumBaslangicRef = useRef<Point | null>(null);

    /** Dokunuşun bir ağaç gövdesi üzerinde başlayıp başlamadığı. */
    const agacUzerinde = (hedef: EventTarget | null): boolean =>
        hedef instanceof Element && Boolean(hedef.closest('.tree-drag-area'));

    // Canvas'ı başlangıçta ortala (Eğer kayıtlı veri yoksa)
    useEffect(() => {
        if (!initialViewState && containerRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            setViewState(prev => ({
                ...prev,
                offset: { x: width / 2 - 100, y: height / 4 }
            }));
        }
    }, [initialViewState]);

    // ViewState değişimlerini kaydet (Debounce ile)
    useEffect(() => {
        if (!gardenId) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            updateGardenViewState(gardenId, {
                x: viewState.offset.x,
                y: viewState.offset.y,
                zoom: viewState.scale
            });
        }, 1000);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [viewState, gardenId, updateGardenViewState]);

    // İki parmak arası mesafeyi hesapla
    const getTouchDistance = (touches: React.TouchList): number => {
        const touch1 = touches[0];
        const touch2 = touches[1];
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    // İki parmağın merkez noktasını hesapla (Ekran koordinatlarında)
    const getTouchCenter = (touches: React.TouchList): Point => {
        const touch1 = touches[0];
        const touch2 = touches[1];
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    };

    // Mouse/Touch başlangıç
    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.node-content')) return;

        const ikiParmak = 'touches' in e && e.touches.length === 2;

        // Ağaç üzerinde başlayan tek parmak/fare dokunuşu: ne seçim silinir
        // ne de tuval hemen kaymaya başlar. Önce parmağın niyeti beklenir.
        if (!ikiParmak && agacUzerinde(e.target)) {
            dugumBaslangicRef.current = 'touches' in e
                ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
                : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
            return;
        }

        dugumBaslangicRef.current = null;

        // Arka plana tıklandığında seçimi kaldır
        setSelectedNode(null);

        // Touch event ise
        if ('touches' in e) {
            // İki parmak - pinch başlat
            if (e.touches.length === 2 && containerRef.current) {
                setIsPinching(true);
                setIsDragging(false);
                dugumBaslangicRef.current = null;

                const distance = getTouchDistance(e.touches);
                const center = getTouchCenter(e.touches);
                const containerBounds = containerRef.current.getBoundingClientRect();

                // Container içindeki center
                const centerX = center.x - containerBounds.left;
                const centerY = center.y - containerBounds.top;

                // Başlangıç değerlerini kaydet
                gestureStartDistance.current = distance;
                gestureStartScale.current = viewState.scale;
                gestureStartOffset.current = { ...viewState.offset };

                // Parmakların altındaki dünya noktasını hesapla
                // World = (Screen - Offset) / Scale
                gestureStartWorldPoint.current = {
                    x: (centerX - viewState.offset.x) / viewState.scale,
                    y: (centerY - viewState.offset.y) / viewState.scale
                };
                return;
            }
            // Tek parmak - sürükleme başlat
            else if (e.touches.length === 1) {
                setIsDragging(true);
                setIsPinching(false);
                setLastMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
                return;
            }
        }

        // Mouse event
        setIsDragging(true);
        setLastMousePos({ x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY });
    };

    // Gesture Logic (Start-based calculation)
    const handleGesture = (currentCenter: Point, currentDistance: number) => {
        if (!containerRef.current) return;

        const containerBounds = containerRef.current.getBoundingClientRect();

        // Container içindeki güncel center
        const currentTouchX = currentCenter.x - containerBounds.left;
        const currentTouchY = currentCenter.y - containerBounds.top;

        // 1. Yeni Scale Hesabı
        // newScale = startScale * (currentDist / startDist)
        // Sıfıra bölme hatasını önle
        const startDist = gestureStartDistance.current > 0 ? gestureStartDistance.current : 1;
        const scaleRatio = currentDistance / startDist;
        const newScale = Math.min(Math.max(0.1, gestureStartScale.current * scaleRatio), 4);

        // 2. Yeni Offset Hesabı
        // Mantık: Başlangıçtaki dünya noktası (gestureStartWorldPoint), 
        // şu anki parmak merkezi (currentTouch) altında olmalı.
        // currentTouch = newOffset + (worldPoint * newScale)
        // newOffset = currentTouch - (worldPoint * newScale)

        const newOffsetX = currentTouchX - (gestureStartWorldPoint.current.x * newScale);
        const newOffsetY = currentTouchY - (gestureStartWorldPoint.current.y * newScale);

        setViewState({
            scale: newScale,
            offset: { x: newOffsetX, y: newOffsetY }
        });
    };

    /**
     * Ağaç üzerinde bekleyen dokunuşu tuval kaydırmasına çevirir.
     *
     * Parmak eşiği aşmadıysa hiçbir şey yapılmaz; bu durumda dokunuş uzun
     * basmaya bırakılır ve ağaç taşınır.
     */
    const bekleyeniKaydirmayaCevir = (clientX: number, clientY: number): boolean => {
        const bekleme = dugumBaslangicRef.current;
        if (!bekleme) return false;
        if (Math.hypot(clientX - bekleme.x, clientY - bekleme.y) < KAYDIRMA_ESIGI) return false;

        dugumBaslangicRef.current = null;
        setIsDragging(true);
        setLastMousePos({ x: clientX, y: clientY });
        setViewState(prev => ({
            ...prev,
            offset: {
                x: prev.offset.x + (clientX - bekleme.x),
                y: prev.offset.y + (clientY - bekleme.y)
            }
        }));
        return true;
    };

    // Mouse/Touch hareket
    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        // Ağaç taşınırken tuval yerinden oynamaz; tek hareket ağaca aittir.
        if (agacSurukleniyorMu()) return;

        // Touch event ise
        if ('touches' in e) {
            // İki parmak - pinch zoom + pan
            if (e.touches.length === 2 && isPinching) {
                e.preventDefault();
                const currentDistance = getTouchDistance(e.touches);
                const currentCenter = getTouchCenter(e.touches);

                handleGesture(currentCenter, currentDistance);
                return;
            }
            // Tek parmak - sürükleme
            if (e.touches.length === 1) {
                const clientX = e.touches[0].clientX;
                const clientY = e.touches[0].clientY;

                if (bekleyeniKaydirmayaCevir(clientX, clientY)) return;
                if (!isDragging || isPinching) return;

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
            }
            return;
        }

        // Mouse event - sürükleme
        const clientX = (e as React.MouseEvent).clientX;
        const clientY = (e as React.MouseEvent).clientY;

        if (bekleyeniKaydirmayaCevir(clientX, clientY)) return;
        if (!isDragging) return;

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
        dugumBaslangicRef.current = null;
        setIsDragging(false);
        setIsPinching(false);
    };

    // Zoom (mouse wheel) - Zoom to Cursor
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            const { clientX, clientY, deltaY } = e;
            const containerBounds = container.getBoundingClientRect();

            // Mouse'un container içindeki pozisyonu
            const mouseX = clientX - containerBounds.left;
            const mouseY = clientY - containerBounds.top;

            // Mevcut scale ve offset
            const oldScale = viewState.scale;
            const oldOffsetX = viewState.offset.x;
            const oldOffsetY = viewState.offset.y;

            // Mouse'un dünya koordinatlarındaki (scale edilmemiş) pozisyonu
            const worldX = (mouseX - oldOffsetX) / oldScale;
            const worldY = (mouseY - oldOffsetY) / oldScale;

            // Yeni scale hesapla
            const zoomSensitivity = 0.001;
            const newScale = Math.min(Math.max(0.1, oldScale - deltaY * zoomSensitivity), 4);

            // Yeni offset hesapla (mouse noktası sabit kalmalı)
            // mouseX = newOffsetX + worldX * newScale
            const newOffsetX = mouseX - worldX * newScale;
            const newOffsetY = mouseY - worldY * newScale;

            setViewState({
                scale: newScale,
                offset: { x: newOffsetX, y: newOffsetY }
            });
        };

        // passive: false ile ekliyoruz ki preventDefault çalışsın
        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, [viewState]);

    const handleZoomIn = useCallback(() => {
        setViewState(prev => ({
            ...prev,
            scale: Math.min(4, +(prev.scale * 1.2).toFixed(2))
        }));
    }, []);

    const handleZoomOut = useCallback(() => {
        setViewState(prev => ({
            ...prev,
            scale: Math.max(0.2, +(prev.scale / 1.2).toFixed(2))
        }));
    }, []);

    const handleResetView = useCallback(() => {
        if (containerRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            setViewState({
                scale: 1,
                offset: { x: width / 2 - 120, y: height / 4 }
            });
        } else {
            setViewState({ scale: 1, offset: { x: 0, y: 0 } });
        }
    }, []);

    return (
        <div
            ref={containerRef}
            className={`w-full h-full overflow-hidden relative bg-paper cursor-grab ${isDragging ? 'cursor-grabbing' : ''} touch-none`}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
        >
            {/* Nokta ızgarası - tuvalin sonsuz olduğunu hissettirir ve
                sürükleme sırasında yön duygusu verir. */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage:
                        'radial-gradient(circle, rgba(91, 60, 51, 0.16) 1.2px, transparent 1.2px)',
                    backgroundSize: `${Math.max(20, 28 * viewState.scale)}px ${Math.max(20, 28 * viewState.scale)}px`,
                    backgroundPosition: `${viewState.offset.x}px ${viewState.offset.y}px`,
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

            {/* Yüzen Tuval Kontrolleri (Canvas HUD) */}
            <div className="absolute bottom-5 right-5 z-40 flex items-center gap-1.5 glass rounded-2xl p-1.5 shadow-pop border border-sand-200">
                <button
                    onClick={handleZoomOut}
                    className="p-2 text-sand-700 hover:bg-sand-200/80 hover:text-sand-900 rounded-xl transition-colors"
                    title="Uzaklaştır"
                    aria-label="Uzaklaştır"
                >
                    <ZoomOut size={16} />
                </button>
                <button
                    onClick={() => setViewState(prev => ({ ...prev, scale: 1 }))}
                    className="px-2.5 py-1 text-xs font-semibold text-sand-800 hover:bg-sand-200/80 rounded-lg transition-colors min-w-[50px] text-center"
                    title="Ölçeği %100 yap"
                >
                    {Math.round(viewState.scale * 100)}%
                </button>
                <button
                    onClick={handleZoomIn}
                    className="p-2 text-sand-700 hover:bg-sand-200/80 hover:text-sand-900 rounded-xl transition-colors"
                    title="Yakınlaştır"
                    aria-label="Yakınlaştır"
                >
                    <ZoomIn size={16} />
                </button>
                <div className="h-5 w-px bg-sand-300 mx-0.5" />
                <button
                    onClick={handleResetView}
                    className="p-2 text-sand-700 hover:bg-sand-200/80 hover:text-sand-900 rounded-xl transition-colors"
                    title="Ağacı Ortala"
                    aria-label="Ağacı Ortala"
                >
                    <RotateCcw size={15} />
                </button>
            </div>
        </div>
    );
};
