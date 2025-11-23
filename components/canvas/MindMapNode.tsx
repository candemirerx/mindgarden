'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Copy, FileEdit, Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { MindNode } from '@/lib/types';
import { useStore } from '@/lib/store/useStore';

interface MindMapNodeProps {
    node: MindNode;
    onAddChild: (parentId: string, direction?: 'left' | 'right') => void;
    onAddSibling?: (siblingId: string, direction: 'left' | 'right') => void;
    onDelete: (nodeId: string) => void;
    onEdit: (node: MindNode) => void;
    depth: number;
}

export const MindMapNode: React.FC<MindMapNodeProps> = ({
    node,
    onAddChild,
    onAddSibling,
    onDelete,
    onEdit,
    depth
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showCopied, setShowCopied] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [showMenuOnMobile, setShowMenuOnMobile] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(node.title);
    const [isMobile, setIsMobile] = useState(false);

    const titleInputRef = useRef<HTMLInputElement>(null);

    // Mobil cihaz tespiti
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Sadece içeriği kopyala (başlık hariç - ilk satırdan sonraki kısım)
        const lines = node.content.split('\n');
        const contentOnly = lines.slice(1).join('\n').trim();
        navigator.clipboard.writeText(contentOnly);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
    };

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    // Düğüm tıklama mantığı
    const handleNodeClick = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();

        if (isMobile) {
            // Mobilde: Menü kapalıysa aç, açıksa başlığı düzenle
            if (!showMenuOnMobile) {
                setShowMenuOnMobile(true);
            } else {
                setIsEditingTitle(true);
            }
        } else {
            // Masaüstünde: Doğrudan başlığı düzenle
            setIsEditingTitle(true);
        }
    };

    const { updateNode } = useStore();

    // Başlık düzenlemeyi kaydet
    const handleSaveTitle = async () => {
        if (editedTitle.trim() && editedTitle !== node.title) {
            // Başlığı içeriğin ilk satırı olarak güncelle
            const lines = node.content.split('\n');
            lines[0] = editedTitle.trim();
            const newContent = lines.join('\n');
            await updateNode(node.id, newContent);
        }
        setIsEditingTitle(false);
    };

    // Enter tuşu ile kaydet, Escape ile iptal
    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSaveTitle();
        } else if (e.key === 'Escape') {
            setEditedTitle(node.title);
            setIsEditingTitle(false);
        }
    };

    // Input focus olduğunda seç
    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [isEditingTitle]);

    const getBgColor = (d: number) => {
        if (d === 0) return 'bg-[#5D4037] text-[#EFEBE9] border-4 border-[#3E2723] shadow-xl shadow-[#3E2723]/40';
        if (d === 1) return 'bg-[#8D6E63] text-white border-2 border-[#5D4037] shadow-lg shadow-[#5D4037]/30';
        if (d === 2) return 'bg-[#66BB6A] text-white border-2 border-[#388E3C] shadow-lg shadow-[#388E3C]/30';
        return 'bg-[#A5D6A7] text-[#1B5E20] border-2 border-[#81C784] shadow-md shadow-[#81C784]/20';
    };

    const getTextColor = (d: number) => {
        if (d <= 1) return 'text-[#EFEBE9] font-serif tracking-wide';
        return 'text-[#1B5E20] font-medium';
    };

    const getIconColor = (d: number) => {
        if (d === 0) return 'bg-[#3E2723] text-[#D7CCC8] border-[#5D4037]';
        if (d === 1) return 'bg-[#5D4037] text-[#D7CCC8] border-[#8D6E63]';
        return 'bg-[#2E7D32] text-[#E8F5E9] border-[#66BB6A]';
    };

    const getNodeSize = (d: number) => {
        if (d === 0) return 'min-w-[200px] max-w-[300px]';
        if (d === 1) return 'min-w-[140px] max-w-[280px] md:min-w-[160px] md:max-w-[320px] rounded-[20px] rounded-br-[40px] rounded-tl-[40px]';
        return 'min-w-[120px] max-w-[240px] md:min-w-[140px] md:max-w-[280px] rounded-[20px] rounded-tr-[40px] rounded-bl-[40px]';
    };

    const hasChildren = node.children && node.children.length > 0;

    // Kök Düğüm
    if (depth === 0) {
        return (
            <li>
                <div
                    className="relative flex flex-col items-center group"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={handleNodeClick}
                >
                    <div className={`
                        absolute -top-16 left-1/2 transform -translate-x-1/2 
                        flex items-center gap-1 bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-green-100
                        transition-all duration-200 z-40
                        ${(isHovered || showMenuOnMobile) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                    `}>
                        <button onClick={(e) => { e.stopPropagation(); onEdit(node); }} className="p-2 text-green-700 hover:bg-green-50 rounded-xl transition-colors" title="Düzenle">
                            <FileEdit size={18} />
                        </button>
                        <button onClick={handleCopy} className="p-2 text-green-700 hover:bg-green-50 rounded-xl transition-colors" title="Kopyala">
                            <Copy size={18} />
                        </button>
                    </div>

                    <div
                        className="relative flex flex-col items-center cursor-pointer transition-transform duration-300 hover:scale-105"
                    >
                        <div className="
                            relative z-20 
                            min-w-[240px] max-w-[340px] p-8
                            bg-gradient-to-b from-[#66BB6A] to-[#43A047]
                            text-white text-center
                            rounded-[3rem]
                            border-4 border-[#2E7D32]/20
                            shadow-[0_10px_20px_rgba(46,125,50,0.3)]
                            flex flex-col items-center justify-center
                        ">
                            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-t-[3rem] pointer-events-none" />

                            {isEditingTitle ? (
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    onKeyDown={handleTitleKeyDown}
                                    onBlur={handleSaveTitle}
                                    className="font-bold text-xl mb-2 relative z-10 font-serif tracking-wide drop-shadow-sm bg-white/20 text-white px-3 py-1 rounded-lg border-2 border-white/40 outline-none w-full text-center"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <h4 className="font-bold text-xl mb-2 relative z-10 font-serif tracking-wide drop-shadow-sm">
                                    {node.title}
                                </h4>
                            )}

                        </div>

                        <div className="
                            w-12 h-16 
                            bg-gradient-to-r from-[#5D4037] via-[#795548] to-[#5D4037]
                            -mt-4 pt-4
                            rounded-b-xl rounded-t-sm
                            border-x-2 border-b-2 border-[#3E2723]/30
                            shadow-inner
                            relative z-10
                        " />

                        <div className="absolute -bottom-2 w-24 h-4 bg-[#3E2723]/10 blur-md rounded-full z-0" />

                        <button
                            onClick={(e) => { e.stopPropagation(); onAddChild(node.id, 'right'); }}
                            className="
                                absolute -bottom-4 left-1/2 transform -translate-x-1/2
                                w-10 h-10 rounded-full flex items-center justify-center
                                bg-[#2E7D32] text-white border-3 border-white shadow-lg
                                hover:scale-110 hover:bg-[#1B5E20] active:scale-95 transition-all duration-300
                                opacity-0 group-hover:opacity-100
                                z-30
                            "
                            title="Yeni Dal Ekle"
                        >
                            <Plus size={20} />
                        </button>

                        {hasChildren && (
                            <button
                                onClick={toggleExpand}
                                className="
                                    absolute bottom-16 left-1/2 transform -translate-x-1/2 translate-x-24
                                    w-8 h-8 rounded-full flex items-center justify-center
                                    bg-amber-600 text-white border-2 border-white shadow-md
                                    hover:scale-110 active:scale-95 transition-all duration-300
                                    opacity-0 group-hover:opacity-100
                                    z-30
                                "
                                title={isExpanded ? "Dalları Kapat" : "Dalları Aç"}
                            >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                        )}
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <ul>
                        {node.children.map(child => (
                            <MindMapNode
                                key={child.id}
                                node={child}
                                onAddChild={onAddChild}
                                onAddSibling={(siblingId, direction) => onAddChild(node.id, direction)}
                                onDelete={onDelete}
                                onEdit={onEdit}
                                depth={depth + 1}
                            />
                        ))}
                    </ul>
                )}
            </li>
        );
    }

    // Diğer Düğümler
    return (
        <li>
            <div
                className="relative inline-block group"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleNodeClick}
            >
                <div className={`
          absolute -top-10 md:-top-12 left-1/2 transform -translate-x-1/2 
          flex items-center gap-1 bg-[#fffbf7] backdrop-blur-lg p-1.5 md:p-2 rounded-full shadow-xl border border-[#d7ccc8]
          transition-all duration-200 z-20
          ${(isHovered || showMenuOnMobile) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
        `}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(node); }}
                        className="p-1.5 md:p-2 text-[#5D4037] hover:text-[#3E2723] hover:bg-[#efebe9] rounded-full transition-colors touch-manipulation"
                        title="Düzenle"
                    >
                        <FileEdit size={14} className="md:w-4 md:h-4" />
                    </button>
                    <button
                        onClick={handleCopy}
                        className="p-1.5 md:p-2 text-[#5D4037] hover:text-[#2E7D32] hover:bg-[#E8F5E9] rounded-full transition-colors touch-manipulation"
                        title={showCopied ? "Kopyalandı!" : "Kopyala"}
                    >
                        <Copy size={14} className="md:w-4 md:h-4" />
                    </button>
                    {depth > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
                            className="p-1.5 md:p-2 text-[#5D4037] hover:text-[#c62828] hover:bg-[#ffebee] rounded-full transition-colors touch-manipulation"
                            title="Sil"
                        >
                            <Trash2 size={14} className="md:w-4 md:h-4" />
                        </button>
                    )}
                </div>

                <div
                    className={`
            node-content relative z-10 px-4 py-3 md:px-6 md:py-4 shadow-lg cursor-pointer 
            ${getNodeSize(depth)}
            transition-all duration-300 hover:scale-105 active:scale-95
            ${getBgColor(depth)}
            touch-manipulation
            flex flex-col justify-center
          `}
                >
                    {depth > 1 && (
                        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                    )}

                    {isEditingTitle ? (
                        <input
                            ref={titleInputRef}
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onKeyDown={handleTitleKeyDown}
                            onBlur={handleSaveTitle}
                            className={`font-bold text-sm md:text-base ${getTextColor(depth)} relative z-10 bg-white/30 px-2 py-1 rounded border-2 border-white/50 outline-none w-full`}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <h4 className={`font-bold text-sm md:text-base truncate ${getTextColor(depth)} relative z-10`}>
                            {node.title}
                        </h4>
                    )}


                    {onAddSibling && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddSibling(node.id, 'left'); }}
                            className={`
                                absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2
                                w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center
                                border-2 shadow-md
                                ${getIconColor(depth)}
                                hover:scale-110 active:scale-95 transition-all duration-300
                                ${(isHovered || showMenuOnMobile) ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                                touch-manipulation
                                z-20
                            `}
                            title="Sol Yan Dal Ekle"
                        >
                            <Plus size={16} className="md:w-4 md:h-4" />
                        </button>
                    )}

                    {onAddSibling && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddSibling(node.id, 'right'); }}
                            className={`
                                absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2
                                w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center
                                border-2 shadow-md
                                ${getIconColor(depth)}
                                hover:scale-110 active:scale-95 transition-all duration-300
                                ${(isHovered || showMenuOnMobile) ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                                touch-manipulation
                                z-20
                            `}
                            title="Sağ Yan Dal Ekle"
                        >
                            <Plus size={16} className="md:w-4 md:h-4" />
                        </button>
                    )}

                    <button
                        onClick={(e) => { e.stopPropagation(); onAddChild(node.id, 'right'); }}
                        className={`
              absolute -bottom-3 left-1/2 transform -translate-x-1/2
              w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center
              border-2 shadow-md
              ${getIconColor(depth)}
              hover:scale-110 active:scale-95 transition-all duration-300
              ${(isHovered || showMenuOnMobile) ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
              touch-manipulation
            `}
                        title="Filizlendir"
                    >
                        <Plus size={16} className="md:w-4 md:h-4" />
                    </button>

                    {hasChildren && (
                        <button
                            onClick={toggleExpand}
                            className={`
                                absolute -bottom-3 left-1/2 transform -translate-x-1/2 translate-x-8
                                w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center
                                border-2 shadow-md
                                bg-amber-600 text-white border-amber-700
                                hover:scale-110 active:scale-95 transition-all duration-300
                                ${(isHovered || showMenuOnMobile) ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                                touch-manipulation
                            `}
                            title={isExpanded ? "Dalları Kapat" : "Dalları Aç"}
                        >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                    )}
                </div>
            </div>

            {hasChildren && isExpanded && (
                <ul>
                    {node.children.map(child => (
                        <MindMapNode
                            key={child.id}
                            node={child}
                            onAddChild={onAddChild}
                            onAddSibling={(siblingId) => onAddChild(node.id)}
                            onDelete={onDelete}
                            onEdit={onEdit}
                            depth={depth + 1}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};
