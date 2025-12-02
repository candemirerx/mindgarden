'use client';

import { useState, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Copy, Edit, Plus, GitBranch, Check, X, Trash2, Sparkles } from 'lucide-react';
import TextEditorModal from '../editor/TextEditorModal';
import { useStore } from '@/lib/store/useStore';

interface TreeNodeProps {
    data: {
        label: string;
        content: string;
        nodeId: string;
        parentId: string | null;
        gardenId: string;
        colorScheme?: {
            bg: string;
            border: string;
            dot: string;
        };
    };
}

export default function TreeNodeComponent({ data }: TreeNodeProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(data.label);
    const [showCopied, setShowCopied] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const { addNode, updateNode } = useStore();

    // Renk şeması - varsayılan yeşil
    const colors = data.colorScheme || {
        bg: 'from-emerald-400 to-teal-500',
        border: 'border-emerald-500',
        dot: 'bg-emerald-600'
    };

    useEffect(() => {
        if (isEditingTitle && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditingTitle]);

    const handleCopy = () => {
        navigator.clipboard.writeText(data.content);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
    };

    const handleEdit = () => {
        setIsEditorOpen(true);
    };

    const handleSaveEdit = async (newContent: string) => {
        await updateNode(data.nodeId, newContent);
        setIsEditorOpen(false);
    };

    const handleTitleEdit = () => {
        setIsEditingTitle(true);
    };

    const handleSaveTitle = async () => {
        if (editedTitle.trim() && editedTitle !== data.label) {
            // Mevcut içeriğin gövdesini koru, sadece başlığı değiştir
            const lines = data.content.split('\n');
            const bodyContent = lines.slice(1).join('\n');
            const newContent = bodyContent ? `${editedTitle.trim()}\n${bodyContent}` : editedTitle.trim();
            await updateNode(data.nodeId, newContent);
        }
        setIsEditingTitle(false);
    };

    const handleCancelTitle = () => {
        setEditedTitle(data.label);
        setIsEditingTitle(false);
    };

    const handleAddChild = async () => {
        // Otomatik olarak alt node ekle
        await addNode(
            data.gardenId,
            'Yeni Alt Dal',
            data.nodeId,
            { x: 0, y: 150 }
        );
    };

    const handleAddSibling = async () => {
        // Otomatik olarak yan node ekle
        await addNode(
            data.gardenId,
            'Yeni Yan Dal',
            data.parentId,
            { x: 250, y: 0 }
        );
    };

    return (
        <>
            <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="relative group"
            >
                {/* Floating Toolbar - Her zaman görünür ama hover'da daha belirgin */}
                <div className={`absolute -top-14 left-1/2 -translate-x-1/2 transition-all duration-300 z-50 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
                    }`}>
                    <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border-2 border-slate-200 p-2 flex items-center gap-1">
                        <button
                            onClick={handleTitleEdit}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors group/btn"
                            title="Başlığı Düzenle"
                        >
                            <Edit size={16} className="text-blue-600 group-hover/btn:scale-110 transition-transform" />
                        </button>

                        <button
                            onClick={handleEdit}
                            className="p-2 hover:bg-purple-50 rounded-lg transition-colors group/btn"
                            title="Detaylı Düzenle"
                        >
                            <Sparkles size={16} className="text-purple-600 group-hover/btn:scale-110 transition-transform" />
                        </button>

                        <button
                            onClick={handleCopy}
                            className="p-2 hover:bg-green-50 rounded-lg transition-colors group/btn relative"
                            title="Kopyala"
                        >
                            {showCopied ? (
                                <Check size={16} className="text-green-600" />
                            ) : (
                                <Copy size={16} className="text-green-600 group-hover/btn:scale-110 transition-transform" />
                            )}
                        </button>

                        <div className="w-px h-6 bg-slate-200" />

                        <button
                            onClick={handleAddChild}
                            className="p-2 hover:bg-emerald-50 rounded-lg transition-colors group/btn"
                            title="Alt Dal Ekle"
                        >
                            <Plus size={16} className="text-emerald-600 group-hover/btn:scale-110 transition-transform" />
                        </button>

                        {data.parentId && (
                            <button
                                onClick={handleAddSibling}
                                className="p-2 hover:bg-orange-50 rounded-lg transition-colors group/btn"
                                title="Yan Dal Ekle"
                            >
                                <GitBranch size={16} className="text-orange-600 group-hover/btn:scale-110 transition-transform" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Node Card - Yeni Modern Tasarım */}
                <div className={`
                    relative overflow-hidden rounded-3xl shadow-xl
                    min-w-[220px] max-w-[320px]
                    border-3 ${colors.border}
                    transition-all duration-300
                    ${isHovered ? 'shadow-2xl scale-105 -translate-y-1' : 'shadow-lg'}
                `}>
                    {/* Gradient Arka Plan */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-90`} />

                    {/* Glassmorphism Overlay */}
                    <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" />

                    {/* Dekoratif Pattern */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/5 rounded-full translate-y-12 -translate-x-12" />

                    {/* İçerik */}
                    <div className="relative p-5">
                        {/* Başlık Alanı */}
                        <div className="flex items-center gap-3 mb-3">
                            {/* Dekoratif Nokta */}
                            <div className={`w-3 h-3 ${colors.dot} rounded-full shadow-lg ring-4 ring-white/50 flex-shrink-0`} />

                            {/* Başlık veya Edit Input */}
                            {isEditingTitle ? (
                                <div className="flex-1 flex items-center gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={editedTitle}
                                        onChange={(e) => setEditedTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveTitle();
                                            if (e.key === 'Escape') handleCancelTitle();
                                        }}
                                        className="flex-1 bg-white/90 text-slate-800 font-semibold text-sm px-3 py-1.5 rounded-lg border-2 border-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                    <button
                                        onClick={handleSaveTitle}
                                        className="p-1.5 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                                    >
                                        <Check size={14} className="text-white" />
                                    </button>
                                    <button
                                        onClick={handleCancelTitle}
                                        className="p-1.5 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                                    >
                                        <X size={14} className="text-white" />
                                    </button>
                                </div>
                            ) : (
                                <h3
                                    className="flex-1 font-bold text-white text-sm leading-tight drop-shadow-lg cursor-pointer hover:underline"
                                    onClick={handleTitleEdit}
                                >
                                    {data.label}
                                </h3>
                            )}
                        </div>

                        {/* İçerik Önizleme */}
                        {data.content !== data.label && (
                            <div className="bg-white/30 backdrop-blur-sm rounded-xl p-3 border border-white/40">
                                <p className="text-xs text-white/95 line-clamp-3 leading-relaxed font-medium">
                                    {data.content}
                                </p>
                            </div>
                        )}

                        {/* Hover Badge */}
                        {isHovered && (
                            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold text-slate-600 shadow-lg animate-pulse">
                                Düzenle
                            </div>
                        )}
                    </div>

                    {/* Glow Effect */}
                    <div className={`
                        absolute inset-0 rounded-3xl bg-gradient-to-br ${colors.bg}
                        blur-xl opacity-0 group-hover:opacity-30 transition-opacity -z-10
                    `} />
                </div>

                {/* Bağlantı Noktaları - Handles */}
                <Handle
                    type="target"
                    position={Position.Top}
                    className="!w-4 !h-4 !bg-gradient-to-br !from-emerald-400 !to-teal-500 !border-3 !border-white shadow-lg transition-transform hover:scale-125"
                />
                <Handle
                    type="source"
                    position={Position.Bottom}
                    className="!w-4 !h-4 !bg-gradient-to-br !from-blue-400 !to-purple-500 !border-3 !border-white shadow-lg transition-transform hover:scale-125"
                />
            </div>

            {/* Text Editor Modal */}
            <TextEditorModal
                isOpen={isEditorOpen}
                content={data.content}
                onSave={handleSaveEdit}
                onClose={() => setIsEditorOpen(false)}
            />
        </>
    );
}
