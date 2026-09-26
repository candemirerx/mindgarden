'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Copy, Pencil, Plus, ChevronDown, TreePine, Leaf, Check, Scissors } from 'lucide-react';
import { MindNode } from '@/lib/types';
import { useStore } from '@/lib/store/useStore';

/**
 * Düğümün çevresindeki yuvarlak eylem düğmelerinin ortak görünümü.
 *
 * Dokunma alanı 36 pikseldir; parmakla rahatça basılır. Klavyeyle odaklanınca
 * belirgin bir halka çıkar, böylece düğmeler yalnızca fareyle değil klavyeyle
 * de kullanılabilir.
 */
const DUGME_TABANI =
    'flex items-center justify-center rounded-full border-2 shadow-soft ' +
    'transition-all duration-200 hover:scale-110 active:scale-95 touch-manipulation ' +
    'outline-none focus-visible:ring-4 focus-visible:ring-moss-500/40';

/** Düğümün üstündeki yüzen araç çubuğunda kullanılan düğme görünümü.
 *  40 piksel: parmakla rahat basılır. Düğüm çevresindeki seçenek sayısı
 *  azaltıldığı için kalanlar daha büyük ve belirgin tutulur. */
const ARAC_DUGMESI =
    'flex h-10 w-10 items-center justify-center rounded-xl text-sand-700 ' +
    'transition-colors duration-150 hover:bg-sand-200/80 hover:text-sand-900 ' +
    'active:scale-95 touch-manipulation outline-none focus-visible:bg-sand-200/80';

interface MindMapNodeProps {
    node: MindNode;
    onAddChild: (parentId: string, direction?: 'left' | 'right') => void;
    onAddSibling?: (siblingId: string, direction: 'left' | 'right') => void;
    onEdit: (node: MindNode) => void;
    depth: number;
}

export const MindMapNode: React.FC<MindMapNodeProps> = ({
    node,
    onAddChild,
    onAddSibling,
    onEdit,
    depth
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isExpanded, setIsExpanded] = useState(node.isExpanded ?? true);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(node.title);
    const [isMobile, setIsMobile] = useState(false);
    const [showContentCopied, setShowContentCopied] = useState(false);

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

    /**
     * Notun gövdesini kopyalar; gövde boşsa başlığa düşer.
     * Kullanıcı notun içeriğini tek dokunuşla alabilsin diye araç
     * çubuğunda tutulur.
     */
    const handleCopyContent = (e: React.MouseEvent) => {
        e.stopPropagation();
        const govde = node.content.split('\n').slice(1).join('\n').trim();
        navigator.clipboard.writeText(govde || node.title);
        setShowContentCopied(true);
        setTimeout(() => setShowContentCopied(false), 1500);
    };

    const { updateNode, selectedNodeId, setSelectedNode, toggleNodeExpansion, setNodePruned } = useStore();

    /**
     * Budama: notu silmez, yalnızca soluk ve üstü çizili gösterir.
     * Aynı düğme ikinci kez kullanıldığında durum geri alınır.
     */
    const isPruned = node.isPruned ?? false;

    const togglePruned = (e: React.MouseEvent) => {
        e.stopPropagation();
        void setNodePruned(node.id, !isPruned);
    };

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
                <div
                    role="toolbar"
                    aria-label={`${node.title} araçları`}
                    className={`
                    absolute bottom-full mb-1 left-1/2 -translate-x-1/2 
                    flex items-center gap-1 whitespace-nowrap glass p-1 rounded-2xl shadow-lift border border-sand-200
                    transition-all duration-200 z-40
                    after:absolute after:inset-x-0 after:-bottom-3 after:h-3
                    ${showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                `}>
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(node); }}
                            className={ARAC_DUGMESI}
                            title="Metin editörünü aç"
                            aria-label="Metin editörünü aç"
                        >
                            <Pencil size={18} />
                        </button>
                        <button
                            onClick={handleCopyContent}
                            className={ARAC_DUGMESI}
                            title={showContentCopied ? 'Kopyalandı!' : 'İçeriği kopyala'}
                            aria-label="İçeriği kopyala"
                        >
                            {showContentCopied ? <Check size={18} className="text-moss-600" /> : <Copy size={18} />}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddChild(node.id, 'right'); }}
                            className="flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold text-moss-700 transition-colors duration-150 hover:bg-moss-100 active:scale-95 touch-manipulation outline-none focus-visible:bg-moss-100"
                            title="Alt dal ekle"
                            aria-label="Alt dal ekle"
                        >
                            <Plus size={18} />
                            <span>Dal Ekle</span>
                        </button>
                        <button
                            onClick={togglePruned}
                            className={`${ARAC_DUGMESI} ${
                                isPruned ? 'bg-sand-200 text-sand-800 hover:bg-sand-300' : ''
                            }`}
                            title={isPruned ? 'Budamayı geri al' : 'Buda'}
                            aria-label={isPruned ? 'Budamayı geri al' : 'Buda'}
                            aria-pressed={isPruned}
                        >
                            <Scissors size={18} />
                        </button>
                    </div>

                    {/* Kök Kartı: Zarif orman yeşili, temiz tipografi */}
                    <div
                        className={`
                            dugum-karti relative z-20 flex min-w-[220px] max-w-[340px] flex-col items-center justify-center
                            rounded-3xl bg-gradient-to-br from-moss-700 via-moss-800 to-moss-900
                            px-7 py-6 text-center text-white
                            shadow-lift transition-all duration-200 cursor-pointer
                            ${isSelected ? 'ring-4 ring-moss-500/40 scale-[1.02]' : 'ring-1 ring-moss-950/40 hover:scale-[1.01] hover:shadow-pop'}
                            ${isPruned ? 'opacity-60' : ''}
                        `}
                    >
                        {/* Kök Düşünce Etiketi */}
                        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-moss-100 backdrop-blur-sm">
                            {isPruned ? <Scissors size={12} /> : <TreePine size={12} />}
                            <span>{isPruned ? 'Budandı' : 'Kök Düşünce'}</span>
                        </div>

                        {isEditingTitle ? (
                            <input
                                ref={titleInputRef}
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                onKeyDown={handleTitleKeyDown}
                                onBlur={handleSaveTitle}
                                className="w-full rounded-xl border border-white/40 bg-white/20 px-3 py-1 text-center font-serif text-xl font-semibold tracking-tight text-white outline-none ring-2 ring-white/40 select-text"
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <h4
                                className={`cursor-text font-serif text-xl font-semibold tracking-tight text-white transition-opacity hover:opacity-90 ${isPruned ? 'line-through decoration-2' : ''}`}
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
                            ${DUGME_TABANI}
                            absolute -bottom-[18px] left-1/2 h-9 w-9 -translate-x-1/2
                            bg-white text-moss-700 border-moss-400 hover:bg-moss-50 hover:border-moss-500
                            ${showActions ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                            z-30
                        `}
                        title="Yeni dal ekle"
                        aria-label="Yeni dal ekle"
                    >
                        <Plus size={20} />
                    </button>

                    {/* Eğer çocukları varsa: Katla / Aç Rozeti (sağ alt köşe)
                        Seçim gerektirmez: dalları kapatmanın tek yolu bu düğme. */}
                    {hasChildren && (
                        <button
                            onClick={toggleExpand}
                            aria-expanded={isExpanded}
                            className={`
                                ${DUGME_TABANI}
                                absolute bottom-0 right-0 h-9 w-9 translate-x-1/2 translate-y-1/2
                                bg-sand-100 text-bark-800 border-white hover:bg-sand-200
                                z-30 text-sm font-bold
                            `}
                            title={isExpanded ? 'Dalları kapat' : 'Dalları aç'}
                            aria-label={isExpanded ? 'Dalları kapat' : 'Dalları aç'}
                        >
                            {isExpanded ? <ChevronDown size={20} /> : <span>{node.children.length}</span>}
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
                {/* Üst Yüzen Eylem Araç Çubuğu
                    Yalnızca sık kullanılan dört eylem burada: metin editörü,
                    içeriği kopyala, yan dal ekle ve buda. Tip değiştirme,
                    renk, başlığı kopyalama ve silme Ağaç Yönetimi'ndedir. */}
                {/* Görünmez köprü (after:) ile farenin boşluktan düşmesi engellenir */}
                <div
                    role="toolbar"
                    aria-label={`${node.title} araçları`}
                    className={`
                    absolute bottom-full mb-1 left-1/2 -translate-x-1/2 
                    flex items-center gap-1 whitespace-nowrap glass p-1 rounded-2xl shadow-lift border border-sand-200
                    transition-all duration-200 z-30
                    after:absolute after:inset-x-0 after:-bottom-3 after:h-3
                    ${showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                `}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(node); }}
                        className={ARAC_DUGMESI}
                        title="Metin editörünü aç"
                        aria-label="Metin editörünü aç"
                    >
                        <Pencil size={18} />
                    </button>
                    <button
                        onClick={handleCopyContent}
                        className={ARAC_DUGMESI}
                        title={showContentCopied ? 'Kopyalandı!' : 'İçeriği kopyala'}
                        aria-label="İçeriği kopyala"
                    >
                        {showContentCopied ? <Check size={18} className="text-moss-600" /> : <Copy size={18} />}
                    </button>
                    {onAddSibling && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddSibling(node.id, 'right'); }}
                            className={`${ARAC_DUGMESI} text-clay-700 hover:bg-clay-100`}
                            title="Yan dal ekle"
                            aria-label="Yan dal ekle"
                        >
                            <Plus size={18} />
                        </button>
                    )}
                    <button
                        onClick={togglePruned}
                        className={`${ARAC_DUGMESI} ${
                            isPruned ? 'bg-sand-200 text-sand-800 hover:bg-sand-300' : ''
                        }`}
                        title={isPruned ? 'Budamayı geri al' : 'Buda'}
                        aria-label={isPruned ? 'Budamayı geri al' : 'Buda'}
                        aria-pressed={isPruned}
                    >
                        <Scissors size={18} />
                    </button>
                </div>

                {/* Düğüm Kartı:
                    Dal: Kalın border ve dolgulu amber (clay) filiz ikonu
                    Yaprak: Standart ince border ve açık yeşil yaprak ikonu */}
                <div
                    className={`
                        node-content dugum-karti relative z-10 flex cursor-pointer flex-col justify-center
                        min-w-[140px] max-w-[280px] px-4 py-3 rounded-2xl bg-white text-sand-900
                        transition-all duration-200 ease-smooth shadow-soft hover:shadow-card
                        ${isBranchStyle
                            ? 'border-2 border-clay-400 hover:border-clay-500'
                            : 'border border-sand-300 hover:border-moss-400'
                        }
                        ${isSelected ? 'ring-4 ring-moss-500/20 scale-[1.03]' : 'hover:scale-[1.02]'}
                        ${isPruned ? 'opacity-60 border-dashed' : ''}
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
                                    className="w-full rounded-md border border-moss-400 bg-sand-50 px-2 py-0.5 text-sm font-semibold outline-none ring-2 ring-moss-500/20 select-text"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <h4
                                    className={`truncate text-[15px] font-semibold cursor-text ${
                                        isPruned ? 'text-sand-400 line-through decoration-sand-400' : 'text-sand-900'
                                    }`}
                                    onClick={handleTitleClick}
                                >
                                    {node.title}
                                </h4>
                            )}
                            {isPruned && (
                                <span
                                    className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-sand-100 px-1.5 py-0.5 text-[10px] font-semibold text-sand-500"
                                    title="Bu not budandı"
                                >
                                    <Scissors size={9} />
                                    Budandı
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* DÜĞÜMÜN ALTINDAKİ EYLEM DÜĞMELERİ
                    Burada yalnızca büyümenin anahtarı olan "+" ve katla/aç
                    rozeti kalır; ikisi de bağlantı çizgisinin dışındadır. */}
                <div
                    role="group"
                    aria-label={`${node.title} eylemleri`}
                    className="pointer-events-none absolute inset-0 z-20"
                >
                    {/* ALT DALA EKLE (ALT ORTA) */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onAddChild(node.id, 'right'); }}
                        className={`
                            ${DUGME_TABANI}
                            absolute -bottom-[20px] left-1/2 h-10 w-10 -translate-x-1/2
                            bg-white text-moss-600 border-moss-300 hover:bg-moss-50 hover:border-moss-400
                            ${showActions ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                        `}
                        title="Alt dal veya yaprak ekle"
                        aria-label="Alt dal veya yaprak ekle"
                    >
                        <Plus size={20} />
                    </button>

                    {/* KATLA / AÇ ROZETİ (SAĞ ALT KÖŞE)
                        Seçim gerektirmez: dalları kapatmanın tek yolu bu düğme.
                        Köşede durur; alt ortadaki bağlantı çizgisiyle ve
                        alttaki dalın araç çubuğuyla çakışmaz. */}
                    {hasChildren && (
                        <button
                            onClick={toggleExpand}
                            aria-expanded={isExpanded}
                            className={`
                                ${DUGME_TABANI}
                                pointer-events-auto
                                absolute bottom-0 right-0 h-10 w-10 translate-x-1/2 translate-y-1/2
                                bg-sand-100 text-bark-800 border-white hover:bg-sand-200
                                text-sm font-bold
                            `}
                            title={isExpanded ? 'Dalları kapat' : 'Dalları aç'}
                            aria-label={isExpanded ? 'Dalları kapat' : 'Dalları aç'}
                        >
                            {isExpanded ? <ChevronDown size={20} /> : <span>{node.children.length}</span>}
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
                            onAddSibling={(siblingId) => onAddChild(node.id, 'right')}
                            onEdit={onEdit}
                            depth={depth + 1}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};
