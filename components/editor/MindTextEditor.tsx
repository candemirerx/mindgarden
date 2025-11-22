'use client';

import React, { useState } from 'react';
import { Check, Wand2 } from 'lucide-react';

interface MindTextEditorProps {
    initialTitle: string;
    initialContent: string;
    onSave: (title: string, content: string) => void;
    onClose: () => void;
}

export const MindTextEditor: React.FC<MindTextEditorProps> = ({
    initialTitle,
    initialContent,
    onSave,
    onClose
}) => {
    const [title, setTitle] = useState(initialTitle);
    const [content, setContent] = useState(initialContent);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleAIExpand = async () => {
        setIsGenerating(true);
        try {
            // TODO: Gemini API entegrasyonu
            // const newContent = await generateContentExpansion(title, content);
            // setContent(prev => prev + '\n\n' + newContent);

            // Şimdilik placeholder
            setTimeout(() => {
                setContent(prev => prev + '\n\n[AI ile genişletilmiş içerik buraya gelecek]');
                setIsGenerating(false);
            }, 1500);
        } catch (e) {
            alert("AI servisine ulaşılamadı.");
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                    Başlık / Prompt
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xl font-bold text-stone-800 bg-transparent border-b-2 border-transparent focus:border-amber-400 focus:outline-none pb-2 placeholder-stone-300 transition-colors"
                    placeholder="Düşüncenin adı..."
                />
            </div>

            <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        İçerik
                    </label>
                    <button
                        onClick={handleAIExpand}
                        disabled={isGenerating}
                        className={`text-xs flex items-center gap-1 px-3 py-1 rounded-full transition-all
              ${isGenerating ? 'bg-stone-100 text-stone-400' : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-md hover:scale-105'}`}
                    >
                        {isGenerating ? (
                            <span className="animate-spin">⟳</span>
                        ) : (
                            <Wand2 size={12} />
                        )}
                        {isGenerating ? 'Düşünülüyor...' : 'Yapay Zeka ile Genişlet'}
                    </button>
                </div>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="flex-1 w-full resize-none p-4 bg-stone-50 rounded-xl border-2 border-stone-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 focus:outline-none transition-all font-serif text-lg leading-relaxed text-stone-700"
                    placeholder="Detayları buraya yazın..."
                />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                    onClick={onClose}
                    className="px-5 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-lg transition-colors"
                >
                    İptal
                </button>
                <button
                    onClick={() => onSave(title, content)}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-lg shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                >
                    <Check size={18} />
                    Kaydet
                </button>
            </div>
        </div>
    );
};
