'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ViewState, Point } from '@/lib/types';

interface GardenCanvasProps {
    children: React.ReactNode;
}

export const GardenCanvas: React.FC<GardenCanvasProps> = ({ children }) => {
    const [viewState, setViewState] = useState<ViewState>({ scale: 1, offset: { x: 0, y: 0 } });
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 });
    const [isPinching, setIsPinching] = useState(false);

    // Gesture Başlangıç Referansları (Daha stabil bir deneyim için)
    const gestureStartScale = useRef<number>(1);
    const gestureStartOffset = useRef<Point>({ x: 0, y: 0 });
    const gestureStartDistance = useRef<number>(0);
    // Pinch başladığında parmakların altındaki dünya koordinatı (sabit kalmalı)
    const gestureStartWorldPoint = useRef<Point>({ x: 0, y: 0 });

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

        // Touch event ise
        if ('touches' in e) {
            // İki parmak - pinch başlat
            if (e.touches.length === 2 && containerRef.current) {
                setIsPinching(true);
                setIsDragging(false);

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

    // Mouse/Touch hareket
    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
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
            else if (e.touches.length === 1 && isDragging && !isPinching) {
                const clientX = e.touches[0].clientX;
                const clientY = e.touches[0].clientY;

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
                return;
            }
        }

        // Mouse event - sürükleme
        if (!isDragging) return;

        const clientX = 'clientX' in e ? (e as React.MouseEvent).clientX : 0;
        const clientY = 'clientY' in e ? (e as React.MouseEvent).clientY : 0;

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
        </div>
    );
};
