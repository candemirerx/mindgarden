'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Copy, Pencil, Plus, ChevronDown, ChevronRight, X, TreePine, Leaf, Check, Palette } from 'lucide-react';
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
    const [isExpanded, setIsExpanded] = useState(node.isExpanded ?? true);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(node.title);
    const [isMobile, setIsMobile] = useState(false);
    const [showTitleCopied, setShowTitleCopied] = useState(false);

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

    const handleCopyTitle = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(node.title);
        setShowTitleCopied(true);
        setTimeout(() => setShowTitleCopied(false), 1500);
    };

    const { updateNode, selectedNodeId, setSelectedNode, toggleNodeExpansion, toggleNodeType } = useStore();

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newState = !isExpanded;
        setIsExpanded(newState);
        toggleNodeExpansion(node.id, newState);
    };

    const handleNodeClick = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();

        // Menü görünürlüğü seçili düğüme bağlıdır: başka bir düğüme
        // dokunulduğunda öncekinin menüsü kendiliğinden kapanır, böylece
        // ekranda aynı anda tek menü açık kalır.
        if (selectedNodeId !== node.id) {
            setSelectedNode(node.id);
            return;
        }

        // Zaten seçili düğüme ikinci dokunuş başlığı düzenlemeye geçirir.
        if (isMobile) {
            setIsEditingTitle(true);
        }
    };

    const handleTitleClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        // Başlığa dokunmak da düğümü seçer; böylece dokunmatik cihazlarda
        // başlığa basıldığında menü açılır. Zaten seçiliyse düzenlemeye geçer.
        if (selectedNodeId === node.id) {
            setIsEditingTitle(true);
        } else {
            setSelectedNode(node.id);
        }
    };

    const handleSaveTitle = async () => {
        if (editedTitle.trim() && editedTitle !== node.title) {
            const lines = node.content.split('\n');
            lines[0] = editedTitle.trim();
            const newContent = lines.join('\n');
            await updateNode(node.id, newContent);
        }
        setIsEditingTitle(false);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSaveTitle();
        } else if (e.key === 'Escape') {
            setEditedTitle(node.title);
            setIsEditingTitle(false);
        }
    };

    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [isEditingTitle]);

    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNodeId === node.id;
    /** Eylem menüleri yalnızca üzerine gelinen veya seçili düğümde görünür.
     *  Dokunmatik cihazlarda hover güvenilir olmadığı için yalnızca seçim
     *  belirleyicidir; böylece ekranda tek menü açık kalır. */
    const showActions = isSelected || (!isMobile && isHovered);

    // =========================================================================
    // KÖK DÜĞÜM (DEPTH 0)
    // =========================================================================
    if (depth === 0) {
        return (
            <li>
                <div
                    className="relative flex flex-col items-center group"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={handleNodeClick}
                >
                {/* Üst Yüzen Eylem Araç Çubuğu */}
                {/* NOT: after:absolute after:inset-x-0 after:-bottom-3 after:h-3 kısmı, 
                    menü ile düğüm arasında görünmez bir köprü oluşturur. 
                    Böylece fareyi yukarı kaydırırken menü kaybolmaz. */}
                <div className={`
                    absolute bottom-full mb-1 left-1/2 -translate-x-1/2 
                    flex items-center gap-0.5 glass p-1 rounded-xl shadow-lift border border-sand-200
                    transition-all duration-200 z-40
                    after:absolute after:inset-x-0 after:-bottom-2 after:h-2
                    ${showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                `}>
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(node); }}
                            className="p-1.5 text-sand-700 hover:bg-sand-200/80 hover:text-sand-900 rounded-xl transition-colors"
                            title="Tam Editör"
                            aria-label="Tam Editör"
                        >
                            <Pencil size={14} />
                        </button>
                        <button
                            onClick={handleCopyTitle}
                            className="p-1.5 text-sand-700 hover:bg-sand-200/80 hover:text-sand-900 rounded-xl transition-colors"
                            title={showTitleCopied ? "Kopyalandı!" : "Başlığı Kopyala"}
                            aria-label="Başlığı Kopyala"
                        >
                            {showTitleCopied ? <Check size={14} className="text-moss-600" /> : <Copy size={14} />}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddChild(node.id, 'right'); }}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-moss-700 hover:bg-moss-100 rounded-xl transition-colors"
                            title="Yeni Dal Ekle"
                        >
                            <Plus size={13} />
                            <span>Dal Ekle</span>
                        </button>
                    </div>

                    {/* Kök Kartı: Zarif orman yeşili, temiz tipografi */}
                    <div
                        className={`
                            relative z-20 flex min-w-[220px] max-w-[340px] flex-col items-center justify-center
                            rounded-3xl bg-gradient-to-br from-moss-700 via-moss-800 to-moss-900
                            px-7 py-6 text-center text-white
                            shadow-lift transition-all duration-200 cursor-pointer
                            ${isSelected ? 'ring-4 ring-moss-500/40 scale-[1.02]' : 'ring-1 ring-moss-950/40 hover:scale-[1.01] hover:shadow-pop'}
                        `}
                    >
                        {/* Kök Düşünce Etiketi */}
                        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-moss-100 backdrop-blur-sm">
                            <TreePine size={12} />
                            <span>Kök Düşünce</span>
                        </div>

                        {isEditingTitle ? (
                            <input
                                ref={titleInputRef}
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                onKeyDown={handleTitleKeyDown}
                                onBlur={handleSaveTitle}
                                className="w-full rounded-xl border border-white/40 bg-white/20 px-3 py-1 text-center font-serif text-xl font-semibold tracking-tight text-white outline-none ring-2 ring-white/40"
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <h4
                                className="cursor-text font-serif text-xl font-semibold tracking-tight text-white transition-opacity hover:opacity-90"
                                onClick={handleTitleClick}
                            >
                                {node.title}
                            </h4>
                        )}

                        {hasChildren && (
                            <p className="mt-1 text-xs text-moss-200/80">
                                {node.children.length} ana dal
                            </p>
                        )}
                    </div>

                    {/* Alt Bağlantı Noktası: Yeni Dal Ekle düğmesi */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onAddChild(node.id, 'right'); }}
                        className={`
                            absolute -bottom-3 left-1/2 -translate-x-1/2
                            flex h-6 w-6 items-center justify-center rounded-full
                            bg-white text-moss-700 border-2 border-moss-400 shadow-soft
                            transition-all duration-200 hover:scale-110 hover:bg-moss-50 hover:border-moss-500 active:scale-95
                            ${showActions ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                            z-30
                        `}
                        title="Yeni Dal Ekle"
                        aria-label="Yeni Dal Ekle"
                    >
                        <Plus size={16} />
                    </button>

                    {/* Eğer çocukları varsa: Katla / Aç Rozeti */}
                    {hasChildren && (
                        <button
                            onClick={toggleExpand}
                            className="absolute -bottom-3 left-1/2 translate-x-4 flex h-6 w-6 items-center justify-center rounded-full bg-sand-100 text-bark-800 border-2 border-white shadow-soft transition-all duration-200 hover:scale-110 hover:bg-sand-200 z-30 text-xs font-bold"
                            title={isExpanded ? "Dalları Kapat" : "Dalları Aç"}
                            aria-label={isExpanded ? "Dalları Kapat" : "Dalları Aç"}
                        >
                            {isExpanded ? <ChevronDown size={14} /> : <span>{node.children.length}</span>}
                        </button>
                    )}
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

    // =========================================================================
    // DAL VE YAPRAK DÜĞÜMLERİ (DEPTH >= 1)
    // =========================================================================
    // Eğer node.nodeType belirtilmişse o kullanılır, yoksa default olarak:
    // Derinlik 1 ise 'branch' (Dal/Sarı), daha derinse 'leaf' (Yaprak/Yeşil) kabul edilir.
    const resolvedType = node.nodeType && node.nodeType !== 'auto'
        ? node.nodeType
        : (depth === 1 ? 'branch' : 'leaf');

    const isBranchStyle = resolvedType === 'branch';

    return (
        <li>
            <div
                className="relative inline-block group"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleNodeClick}
            >
                {/* Üst Yüzen Eylem Araç Çubuğu */}
                {/* Görünmez köprü (after:) ile farenin boşluktan düşmesi engellenir */}
                <div className={`
                    absolute bottom-full mb-1 left-1/2 -translate-x-1/2 
                    flex items-center gap-0.5 glass p-1 rounded-xl shadow-lift border border-sand-200
                    transition-all duration-200 z-30
                    after:absolute after:inset-x-0 after:-bottom-2 after:h-2
                    ${showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                `}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(node); }}
                        className="p-1.5 text-sand-700 hover:bg-sand-200/80 hover:text-sand-900 rounded-lg transition-colors"
                        title="Metin Editörü"
                        aria-label="Metin Editörü"
                    >
                        <Pencil size={13} />
                    </button>
                    <button
                        onClick={handleCopyTitle}
                        className="p-1.5 text-sand-700 hover:bg-sand-200/80 hover:text-sand-900 rounded-lg transition-colors"
                        title={showTitleCopied ? "Kopyalandı!" : "Kopyala"}
                        aria-label="Kopyala"
                    >
                        {showTitleCopied ? <Check size={13} className="text-moss-600" /> : <Copy size={13} />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
                        className="p-1.5 text-berry-600 hover:bg-berry-50 rounded-lg transition-colors"
                        title="Dalı Sil"
                        aria-label="Dalı Sil"
                    >
                        <X size={13} />
                    </button>
                </div>

                {/* Düğüm Kartı:
                    Dal: Kalın border ve dolgulu amber (clay) filiz ikonu
                    Yaprak: Standart ince border ve açık yeşil yaprak ikonu */}
                <div
                    className={`
                        node-content relative z-10 flex cursor-pointer flex-col justify-center
                        min-w-[140px] max-w-[280px] px-4 py-3 rounded-2xl bg-white text-sand-900
                        transition-all duration-200 ease-smooth shadow-soft hover:shadow-card
                        ${isBranchStyle
                            ? 'border-2 border-clay-400 hover:border-clay-500'
                            : 'border border-sand-300 hover:border-moss-400'
                        }
                        ${isSelected ? 'ring-4 ring-moss-500/20 scale-[1.03]' : 'hover:scale-[1.02]'}
                    `}
                >
                    <div className="flex items-center gap-2">
                        {isBranchStyle ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-clay-500 text-white flex-shrink-0">
                                <Plus size={14} />
                            </span>
                        ) : (
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-moss-100 text-moss-700 flex-shrink-0">
                                <Leaf size={12} />
                            </span>
                        )}

                        <div className="flex-1 min-w-0">
                            {isEditingTitle ? (
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    onKeyDown={handleTitleKeyDown}
                                    onBlur={handleSaveTitle}
                                    className="w-full rounded-md border border-moss-400 bg-sand-50 px-2 py-0.5 text-sm font-semibold outline-none ring-2 ring-moss-500/20"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <h4
                                    className="truncate text-[15px] font-semibold cursor-text text-sand-900"
                                    onClick={handleTitleClick}
                                >
                                    {node.title}
                                </h4>
                            )}
                        </div>
                    </div>
                </div>

                {/* TİP DEĞİŞTİRME BUTONU (SOL KENAR) */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleNodeType(node.id, resolvedType);
                    }}
                    className={`
                        absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2
                        flex h-5 w-5 items-center justify-center rounded-full
                        border-2 shadow-soft transition-all duration-200 hover:scale-110 active:scale-95
                        ${isBranchStyle
                            ? 'bg-white text-moss-600 border-moss-300 hover:bg-moss-50 hover:border-moss-400'
                            : 'bg-white text-clay-600 border-clay-300 hover:bg-clay-50 hover:border-clay-400'
                        }
                        ${showActions ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                        z-20
                    `}
                    title={isBranchStyle ? "Yaprağa Dönüştür" : "Dala Dönüştür"}
                    aria-label={isBranchStyle ? "Yaprağa Dönüştür" : "Dala Dönüştür"}
                >
                    {isBranchStyle ? <Leaf size={11} /> : <Palette size={11} />}
                </button>

                {/* Alt Dala Ekle Düğmesi (Aşağı) */}
                <button
                    onClick={(e) => { e.stopPropagation(); onAddChild(node.id, 'right'); }}
                    className={`
                        absolute -bottom-3 left-1/2 -translate-x-1/2
                        flex h-5 w-5 items-center justify-center rounded-full
                        bg-white text-moss-600 border-2 border-moss-300 shadow-soft
                        transition-all duration-200 hover:scale-110 hover:bg-moss-50 hover:border-moss-400 active:scale-95
                        ${showActions ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                        z-20
                    `}
                    title="Alt Dal Ekle"
                    aria-label="Alt Dal Ekle"
                >
                    <Plus size={14} />
                </button>

                {/* Katla / Aç Rozeti (Aşağı, sağa kayık) */}
                {hasChildren && (
                    <button
                        onClick={toggleExpand}
                        className={`
                            absolute -bottom-3 left-1/2 translate-x-3.5
                            flex h-5 w-5 items-center justify-center rounded-full
                            bg-sand-100 text-sand-600 border border-sand-300 shadow-soft
                            transition-all duration-200 hover:scale-110 hover:bg-sand-200 active:scale-95
                            z-20 text-[10px] font-bold
                        `}
                        title={isExpanded ? "Dalları Kapat" : "Dalları Aç"}
                        aria-label={isExpanded ? "Dalları Kapat" : "Dalları Aç"}
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <span>{node.children.length}</span>}
                    </button>
                )}

                {/* Yan Dal Ekle (Sağ Kenar) */}
                {onAddSibling && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onAddSibling(node.id, 'right'); }}
                        className={`
                            absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2
                            flex h-5 w-5 items-center justify-center rounded-full
                            bg-white text-clay-600 border-2 border-clay-300 shadow-soft
                            transition-all duration-200 hover:scale-110 hover:bg-clay-50 hover:border-clay-400 active:scale-95
                            ${showActions ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                            z-20
                        `}
                        title="Yan Dal Ekle"
                        aria-label="Yan Dal Ekle"
                    >
                        <Plus size={14} />
                    </button>
                )}
            </div>

            {hasChildren && isExpanded && (
                <ul>
                    {node.children.map(child => (
                        <MindMapNode
                            key={child.id}
                            node={child}
                            onAddChild={onAddChild}
                            onAddSibling={(siblingId) => onAddChild(node.id, 'right')}
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
