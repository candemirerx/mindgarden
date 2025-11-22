import React, { useEffect, useRef } from 'react';
import { Icons } from './Icons';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <div 
        ref={modalRef}
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-100 overflow-hidden flex flex-col max-h-[85vh] animate-[fadeIn_0.2s_ease-out]"
      >
        <div className="flex items-center justify-between p-4 border-b border-stone-100 bg-earth-50">
          <h3 className="text-lg font-bold text-earth-800 flex items-center gap-2">
            {title}
          </h3>
          <button 
            onClick={onClose} 
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
          >
            <Icons.Close size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
