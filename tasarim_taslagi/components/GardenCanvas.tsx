import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { ViewState, Point } from '../types';

interface GardenCanvasProps {
  children: React.ReactNode;
}

export const GardenCanvas: React.FC<GardenCanvasProps> = ({ children }) => {
  const [viewState, setViewState] = useState<ViewState>({ scale: 1, offset: { x: 0, y: 0 } });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Center the canvas initially
  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setViewState(prev => ({
        ...prev,
        offset: { x: width / 2 - 100, y: height / 4 }
      }));
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.node-content')) return;
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;

    setViewState(prev => ({
      ...prev,
      offset: {
        x: prev.offset.x + deltaX,
        y: prev.offset.y + deltaY
      }
    }));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Prevent default browser zoom if needed (though react synthetic events make this tricky, usually handled on window)
    // Simple zoom logic
    const zoomSensitivity = 0.001;
    const newScale = Math.min(Math.max(0.2, viewState.scale - e.deltaY * zoomSensitivity), 3);
    
    setViewState(prev => ({
      ...prev,
      scale: newScale
    }));
  };

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full overflow-hidden relative bg-stone-50 cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Grid Background Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'radial-gradient(#895d3d 1px, transparent 1px)',
          backgroundSize: `${20 * viewState.scale}px ${20 * viewState.scale}px`,
          backgroundPosition: `${viewState.offset.x}px ${viewState.offset.y}px`
        }}
      />

      {/* Content Layer */}
      <div 
        className="absolute origin-top-left transition-transform duration-75 ease-out tree"
        style={{
          transform: `translate(${viewState.offset.x}px, ${viewState.offset.y}px) scale(${viewState.scale})`
        }}
      >
        {children}
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-2 bg-white p-2 rounded-xl shadow-xl border border-stone-100">
        <button 
          onClick={() => setViewState(p => ({ ...p, scale: Math.min(p.scale + 0.2, 3) }))}
          className="p-2 hover:bg-stone-100 rounded-lg text-stone-600"
        >
          <Icons.Add size={20} />
        </button>
         <div className="text-center text-xs text-stone-400 font-mono py-1">
           {Math.round(viewState.scale * 100)}%
         </div>
        <button 
          onClick={() => setViewState(p => ({ ...p, scale: Math.max(p.scale - 0.2, 0.2) }))}
          className="p-2 hover:bg-stone-100 rounded-lg text-stone-600"
        >
          {/* Using Minus icon logic via simple element or Icon if imported, using simplified approach */}
          <div className="w-5 h-0.5 bg-current mx-auto my-2"></div> 
        </button>
      </div>
    </div>
  );
};
