'use client';

import { useEffect, Suspense, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import {
    Plus, Trash2, Pencil, Layout, Search,
    MoreHorizontal, X, TreePine, FileText, Copy, Check, Leaf, ArrowLeft,
    Sprout, ChevronRight, ChevronsUpDown, Columns, LayoutGrid, ExternalLink,
    Calendar, Hash, AlignLeft, Sparkles, BookOpen, RotateCcw
} from 'lucide-react';

import PromptModal from '@/components/ui/PromptModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import AnchoredDropdown from '@/components/ui/AnchoredDropdown';
import { BRANCH_COLORS, sonrakiRenk } from '@/lib/branchColors';

interface TreeItem {
    id: string;
    title: string;
    content: string;
    children: TreeItem[];
    isExpanded: boolean;
    nodeType: 'branch' | 'leaf' | 'auto';
    color: string | null;
}

/**
 * Seviye anahtarı: her derinlik kendi rengiyle işaretlenir.
 */
const LEVEL_COLORS = ['#306C47', '#C9841B', '#4A7C8C', '#8A6A9E', '#B5626F'];

function ProjectsPageInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const gardenId = searchParams.get('id') || '';

    const { gardens, nodes, fetchGardens, fetchNodes, addNode, updateNode, deleteNode, toggleNodeExpansion, setNodeColor } = useStore();
    const [isLoading, setIsLoading] = useState(true);
    const [trees, setTrees] = useState<TreeItem[]>([]);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    /**
     * Geçici renk değişiklikleri. Yalnızca ekranda görünür, kaydedilmez;
     * sayfa yenilendiğinde renk eski hâline döner.
     */
    const [geciciRenkler, setGeciciRenkler] = useState<Record<string, string>>({});
    const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'split' | 'grid'>('split');

    // Modals state
    const [promptConfig, setPromptConfig] = useState<{isOpen: boolean, title: string, placeholder?: string, onConfirm: (val: string) => void}>({isOpen: false, title: '', onConfirm: () => {}});
    const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, description: string, isDanger?: boolean, onConfirm: () => void}>({isOpen: false, title: '', description: '', onConfirm: () => {}});

    const currentGarden = gardens.find(g => g.id === gardenId);

    const buildTrees = useCallback((nodeList: typeof nodes): TreeItem[] => {
        const rootNodes = nodeList.filter(n => !n.parent_id);

            const buildTree = (nodeId: string): TreeItem => {
            const node = nodeList.find(n => n.id === nodeId);
            if (!node) return { id: nodeId, title: 'Hata', content: '', children: [], isExpanded: true, nodeType: 'auto', color: null };

            const children = nodeList
                .filter(n => n.parent_id === nodeId)
                .map(child => buildTree(child.id));

            return {
                id: node.id,
                title: node.content.split('\n')[0] || 'Başlıksız',
                content: node.content,
                children,
                isExpanded: node.is_expanded ?? true,
                nodeType: node.node_type ?? 'auto',
                color: node.color ?? null
            };
        };

        return rootNodes.map(root => buildTree(root.id));
    }, []);

    useEffect(() => {
        const loadData = async () => {
            if (!useStore.getState().gardens.some((g) => g.id === gardenId)) {
                await fetchGardens();
            }
            await fetchNodes(gardenId);
            setIsLoading(false);
        };
        loadData();
    }, [gardenId, fetchGardens, fetchNodes]);

    useEffect(() => {
        if (nodes.length > 0) {
            const built = buildTrees(nodes);
            setTrees(built);
            const expanded = new Set<string>();
            nodes.forEach(n => {
                if (n.is_expanded) expanded.add(n.id);
            });
            setExpandedNodes(expanded);

            // Eğer seçili düğüm yoksa ilk ağacı varsayılan olarak seç
            setSelectedNodeId(prev => {
                if (prev && nodes.some(n => n.id === prev)) return prev;
                return built[0]?.id ?? null;
            });
        } else {
            setTrees([]);
            setSelectedNodeId(null);
        }
    }, [nodes, buildTrees]);

    const filterTrees = useCallback((items: TreeItem[], query: string): TreeItem[] => {
        if (!query.trim()) return items;
        const lowerQuery = query.toLowerCase();

        const filterItem = (item: TreeItem): TreeItem | null => {
            const matchesTitle = item.title.toLowerCase().includes(lowerQuery);
            const filteredChildren = item.children
                .map(child => filterItem(child))
                .filter((child): child is TreeItem => child !== null);

            if (matchesTitle || filteredChildren.length > 0) {
                return { ...item, children: filteredChildren, isExpanded: true };
            }
            return null;
        };

        return items.map(item => filterItem(item)).filter((item): item is TreeItem => item !== null);
    }, []);

    const displayedTrees = filterTrees(trees, searchQuery);

    const toggleExpand = async (nodeId: string) => {
        const newExpanded = new Set(expandedNodes);
        const isCurrentlyExpanded = newExpanded.has(nodeId);

        if (isCurrentlyExpanded) {
            newExpanded.delete(nodeId);
        } else {
            newExpanded.add(nodeId);
        }

        setExpandedNodes(newExpanded);
        await toggleNodeExpansion(nodeId, !isCurrentlyExpanded);
    };

    const handleExpandAll = () => {
        const allIds = new Set(nodes.map(n => n.id));
        setExpandedNodes(allIds);
    };

    const handleCollapseAll = () => {
        setExpandedNodes(new Set());
    };

    const handleAddRoot = () => {
        setPromptConfig({
            isOpen: true,
            title: 'Yeni Ağaç Ekle',
            placeholder: 'Ağaç adı girin...',
            onConfirm: async (title) => {
                setPromptConfig(prev => ({ ...prev, isOpen: false }));
                const created = await addNode(gardenId, title, null, { x: 0, y: 0 });
                if (created) setSelectedNodeId(created.id);
            }
        });
    };

    const handleAddChild = (parentId: string, hasChildren: boolean) => {
        setActiveMenu(null);
        setPromptConfig({
            isOpen: true,
            title: hasChildren ? 'Yeni Dal Ekle' : 'Yeni Yaprak Ekle',
            placeholder: 'Adını girin...',
            onConfirm: async (title) => {
                setPromptConfig(prev => ({ ...prev, isOpen: false }));
                const created = await addNode(gardenId, title, parentId, { x: 0, y: 0 });
                
                if (!expandedNodes.has(parentId)) {
                    const newExpanded = new Set(expandedNodes);
                    newExpanded.add(parentId);
                    setExpandedNodes(newExpanded);
                    await toggleNodeExpansion(parentId, true);
                }
                if (created) setSelectedNodeId(created.id);
            }
        });
    };

    const handleDelete = (nodeId: string) => {
        setActiveMenu(null);
        setConfirmConfig({
            isOpen: true,
            title: 'Notu Sil',
            description: 'Bu notu ve alt dallarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
            isDanger: true,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                await deleteNode(nodeId);
                if (selectedNodeId === nodeId) {
                    setSelectedNodeId(null);
                }
            }
        });
    };

    const handleEdit = (nodeId: string) => {
        router.push(`/editor?id=${gardenId}&nodeId=${nodeId}`);
    };

    /** Rengi sıradaki renge döndürür; yalnızca ekranda geçerlidir. */
    const handleCycleColor = (nodeId: string, mevcutRenk: string | null) => {
        const palet = BRANCH_COLORS.map((c) => c.value);
        const suankiIndex = mevcutRenk ? palet.indexOf(mevcutRenk) : -1;
        const sonraki = palet[(suankiIndex + 1) % palet.length];

        setGeciciRenkler((prev) => ({ ...prev, [nodeId]: sonraki }));
        setActiveMenu(null);
    };

    const handleSaveTitle = async (nodeId: string, originalContent: string) => {
        if (editingTitle.trim()) {
            const lines = originalContent.split('\n');
            lines[0] = editingTitle.trim();
            await updateNode(nodeId, lines.join('\n'));
        }
        setEditingNodeId(null);
    };

    const handleCopy = (text: string, id: string, type: 'title' | 'content') => {
        navigator.clipboard.writeText(text);
        setCopiedId(`${type}-${id}`);
        setTimeout(() => setCopiedId(null), 1500);
    };

    const countAllNodes = (items: TreeItem[]): number => {
        return items.reduce((acc, item) => acc + 1 + countAllNodes(item.children), 0);
    };

    const getDepthColor = (d: number) => LEVEL_COLORS[d % LEVEL_COLORS.length];

    // İkon gösterimi
    const getNodeIcon = (item: TreeItem, isRoot: boolean, isExpanded: boolean) => {
        if (isRoot) {
            return (
                <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-soft ring-1 ${
                        item.color
                            ? 'text-white ring-black/10'
                            : 'bg-gradient-to-br from-moss-600 to-moss-800 text-moss-50 ring-moss-900/20'
                    }`}
                    style={item.color ? { backgroundColor: item.color } : undefined}
                >
                    <TreePine size={18} />
                </span>
            );
        }

        if (item.children.length > 0) {
            return (
                <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 transition-colors duration-200 ${
                        item.color
                            ? 'text-white ring-black/10'
                            : isExpanded
                                ? 'bg-clay-500 text-white ring-clay-600/30'
                                : 'bg-clay-100 text-clay-700 ring-clay-300'
                    }`}
                    style={item.color ? { backgroundColor: item.color } : undefined}
                >
                    <Sprout size={15} />
                </span>
            );
        }

        return (
            <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 ${
                    item.color ? 'text-white ring-black/10' : 'bg-moss-100 text-moss-700 ring-moss-300'
                }`}
                style={item.color ? { backgroundColor: item.color } : undefined}
            >
                <Leaf size={14} />
            </span>
        );
    };

    // Seçili düğümün detay verileri
    const selectedNode = useMemo(() => {
        if (!selectedNodeId) return null;
        return nodes.find(n => n.id === selectedNodeId) ?? null;
    }, [nodes, selectedNodeId]);

    // Ekmek kırıntısı (Breadcrumbs) yolu
    const breadcrumbs = useMemo(() => {
        if (!selectedNodeId) return [];
        const path: Array<{ id: string; title: string }> = [];
        let cur = nodes.find(n => n.id === selectedNodeId);
        while (cur) {
            path.unshift({
                id: cur.id,
                title: cur.content.split('\n')[0] || 'Başlıksız',
            });
            cur = cur.parent_id ? nodes.find(n => n.id === cur?.parent_id) : undefined;
        }
        return path;
    }, [nodes, selectedNodeId]);

    const selectedNodeTitle = selectedNode?.content.split('\n')[0] || '';
    const selectedNodeBody = selectedNode?.content.split('\n').slice(1).join('\n').trim() || '';
    const selectedChildren = useMemo(() => {
        if (!selectedNodeId) return [];
        return nodes.filter(n => n.parent_id === selectedNodeId);
    }, [nodes, selectedNodeId]);

    // Ağaç öğesini hiyerarşik render eden fonksiyon
    const renderTreeItem = (item: TreeItem, depth: number = 0) => {
        const hasChildren = item.children.length > 0;
        const isExpanded = searchQuery ? true : expandedNodes.has(item.id);
        const isRoot = depth === 0;
        const isSelected = selectedNodeId === item.id;
        const etkinRenk = geciciRenkler[item.id] ?? item.color ?? null;
        const gosterItem: TreeItem =
            etkinRenk === item.color ? item : { ...item, color: etkinRenk };
        const levelColor = etkinRenk || getDepthColor(depth - 1);

        return (
            <div key={item.id} className="w-full">
                {isRoot ? (
                    <div className="w-full">
                        <div
                            onClick={() => setSelectedNodeId(item.id)}
                            className={`relative rounded-2xl border bg-white p-3 shadow-card transition-all duration-200 cursor-pointer ${
                                isSelected
                                    ? 'border-moss-500 ring-2 ring-moss-500/15 shadow-lift'
                                    : 'border-sand-200 hover:border-moss-200 hover:shadow-lift'
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        hasChildren ? toggleExpand(item.id) : handleEdit(item.id);
                                    }}
                                    className="flex-shrink-0 rounded-xl transition-transform duration-200 hover:scale-105"
                                    title={hasChildren ? (isExpanded ? 'Dalları kapat' : 'Dalları aç') : 'Düzenle'}
                                >
                                    {getNodeIcon(gosterItem, true, isExpanded)}
                                </button>

                                {hasChildren && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleExpand(item.id);
                                        }}
                                        aria-label={isExpanded ? 'Dalları kapat' : 'Dalları aç'}
                                        aria-expanded={isExpanded}
                                        className="flex-shrink-0 rounded-md p-0.5 text-sand-500 transition-colors duration-200 hover:bg-sand-100 hover:text-sand-800"
                                    >
                                        <ChevronRight
                                            size={16}
                                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                        />
                                    </button>
                                )}

                                <div className="flex-1 min-w-0">
                                    {editingNodeId === item.id ? (
                                        <input
                                            type="text"
                                            value={editingTitle}
                                            onChange={(e) => setEditingTitle(e.target.value)}
                                            onBlur={() => handleSaveTitle(item.id, item.content)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveTitle(item.id, item.content);
                                                if (e.key === 'Escape') setEditingNodeId(null);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full rounded-lg border border-moss-400 bg-white px-2 py-1 text-sm font-semibold text-sand-900 outline-none ring-4 ring-moss-500/10"
                                            autoFocus
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span
                                                onDoubleClick={() => handleEdit(item.id)}
                                                className="block truncate text-left text-[15px] font-semibold text-sand-900 hover:text-moss-700 transition-colors"
                                            >
                                                {item.title}
                                            </span>
                                            {hasChildren && (
                                                <span className="text-[11px] font-medium text-sand-400">
                                                    ({item.children.length})
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => {
                                            const c = item.content.split('\n').slice(1).join('\n').trim();
                                            handleCopy(c || item.title, item.id, 'content');
                                        }}
                                        className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 ${copiedId === `content-${item.id}` ? 'bg-moss-600 text-white' : 'bg-moss-100 text-moss-700 hover:bg-moss-200'}`}
                                        title="İçeriği kopyala"
                                        aria-label="İçeriği kopyala"
                                    >
                                        {copiedId === `content-${item.id}` ? <Check size={13} /> : <FileText size={13} />}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(item.id)}
                                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-clay-100 text-clay-700 transition-all duration-200 hover:bg-clay-200"
                                        title="Editörde aç"
                                        aria-label="Notu editörde aç"
                                    >
                                        <Pencil size={13} />
                                    </button>

                                    <div className="relative">
                                        <button
                                            ref={(element) => { menuButtonRefs.current[item.id] = element; }}
                                            onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
                                            className="flex h-11 w-11 items-center justify-center rounded-xl text-sand-500 transition-colors duration-200 hover:bg-sand-100 hover:text-sand-800"
                                            aria-label={`${item.title} seçenekleri`}
                                            aria-expanded={activeMenu === item.id}
                                            aria-haspopup="menu"
                                        >
                                            <MoreHorizontal size={18} />
                                        </button>
                                        {activeMenu === item.id && renderMenu(item, hasChildren)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {hasChildren && isExpanded && (
                            <div className="mt-1.5 space-y-1 pl-1">
                                {item.children.map((child) => renderTreeItem(child, depth + 1))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNodeId(item.id);
                        }}
                        className={`group relative flex items-center gap-1.5 rounded-xl py-1.5 pl-2.5 pr-1 transition-all duration-200 cursor-pointer ${
                            isSelected
                                ? 'bg-moss-100/70 ring-1 ring-moss-400'
                                : 'hover:bg-sand-100/70'
                        }`}
                        style={{
                            marginLeft: `${(depth - 1) * 16}px`,
                        }}
                    >
                        <span
                            aria-hidden
                            className={`absolute inset-y-1 left-0 rounded-full transition-all duration-200 ${
                                isSelected ? 'w-[4px]' : 'w-[3px] group-hover:w-[4px]'
                            }`}
                            style={{ backgroundColor: levelColor }}
                        />

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                hasChildren ? toggleExpand(item.id) : handleEdit(item.id);
                            }}
                            className="flex-shrink-0 rounded-lg transition-transform duration-200 hover:scale-105"
                            title={hasChildren ? (isExpanded ? 'Dalları kapat' : 'Dalları aç') : 'Düzenle'}
                        >
                            {getNodeIcon(gosterItem, false, isExpanded)}
                        </button>

                        {hasChildren && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(item.id);
                                }}
                                aria-label={isExpanded ? 'Dalları kapat' : 'Dalları aç'}
                                aria-expanded={isExpanded}
                                className="flex-shrink-0 rounded p-0.5 text-sand-600 transition-colors duration-200 hover:bg-white hover:text-sand-800"
                            >
                                <ChevronRight
                                    size={15}
                                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                />
                            </button>
                        )}

                        <div className="flex-1 min-w-0">
                            {editingNodeId === item.id ? (
                                <input
                                    type="text"
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    onBlur={() => handleSaveTitle(item.id, item.content)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveTitle(item.id, item.content);
                                        if (e.key === 'Escape') setEditingNodeId(null);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full rounded-md border border-moss-400 bg-white px-2 py-0.5 text-sm text-sand-900 outline-none ring-4 ring-moss-500/10"
                                    autoFocus
                                />
                            ) : (
                                <span
                                    onDoubleClick={() => handleEdit(item.id)}
                                    className={`block truncate text-left text-sm transition-colors duration-200 ${
                                        isSelected
                                            ? 'font-semibold text-moss-900'
                                            : 'font-medium text-sand-700 hover:text-moss-700'
                                    }`}
                                >
                                    {item.title}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => {
                                    const c = item.content.split('\n').slice(1).join('\n').trim();
                                    handleCopy(c || item.title, item.id, 'content');
                                }}
                                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 ${copiedId === `content-${item.id}` ? 'bg-moss-600 text-white' : 'bg-moss-100 text-moss-700 hover:bg-moss-200'}`}
                                title="İçeriği kopyala"
                                aria-label="İçeriği kopyala"
                            >
                                {copiedId === `content-${item.id}` ? <Check size={13} /> : <FileText size={13} />}
                            </button>
                            <button
                                onClick={() => handleEdit(item.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-clay-100 text-clay-700 transition-all duration-200 hover:bg-clay-200"
                                title="Editörde aç"
                                aria-label="Notu editörde aç"
                            >
                                <Pencil size={13} />
                            </button>

                            <div className="relative">
                                <button
                                    ref={(element) => { menuButtonRefs.current[item.id] = element; }}
                                    onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
                                    className="flex h-10 w-10 items-center justify-center rounded-xl text-sand-500 transition-colors duration-200 hover:bg-white hover:text-sand-800"
                                    aria-label={`${item.title} seçenekleri`}
                                    aria-expanded={activeMenu === item.id}
                                    aria-haspopup="menu"
                                >
                                    <MoreHorizontal size={17} />
                                </button>
                                {activeMenu === item.id && renderMenu(item, hasChildren)}
                            </div>
                        </div>
                    </div>
                )}

                {!isRoot && hasChildren && isExpanded && (
                    <div className="space-y-1 mt-1">
                        {item.children.map((child) => renderTreeItem(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    const renderMenu = (item: TreeItem, hasChildren: boolean) => (
        <AnchoredDropdown
            isOpen={activeMenu === item.id}
            anchorElement={menuButtonRefs.current[item.id]}
            onClose={() => setActiveMenu(null)}
            width={196}
            ariaLabel={`${item.title} not seçenekleri`}
        >
            <button
                type="button"
                role="menuitem"
                onClick={() => { setEditingNodeId(item.id); setEditingTitle(item.title); setActiveMenu(null); }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-sand-700 transition-colors duration-150 hover:bg-sand-100"
            >
                <FileText size={15} className="text-clay-600" /> Yeniden adlandır
            </button>
            <div className="my-1 h-px bg-sand-200" />
            <button
                type="button"
                role="menuitem"
                onClick={() => handleAddChild(item.id, hasChildren)}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-sand-700 transition-colors duration-150 hover:bg-sand-100"
            >
                {hasChildren ? (
                    <>
                        <Sprout size={15} className="text-clay-600" /> Yeni dal ekle
                    </>
                ) : (
                    <>
                        <Leaf size={15} className="text-moss-600" /> Yeni yaprak ekle
                    </>
                )}
            </button>
            <div className="my-1 h-px bg-sand-200" />

            {/* Başlığı kopyala */}
            <button
                type="button"
                role="menuitem"
                onClick={() => {
                    handleCopy(item.title, item.id, 'title');
                    setActiveMenu(null);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-sand-700 transition-colors duration-150 hover:bg-sand-100"
            >
                <Copy size={15} className="text-clay-600" /> Başlığı kopyala
            </button>

            {/* Rengi değiştir: tek seçenek, sıradaki renge geçer (yalnızca ekranda) */}
            <button
                type="button"
                role="menuitem"
                onClick={() =>
                    handleCycleColor(
                        item.id,
                        geciciRenkler[item.id] ?? item.color ?? null
                    )
                }
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-sand-700 transition-colors duration-150 hover:bg-sand-100"
            >
                <span
                    className="flex h-4 w-4 items-center justify-center rounded-full ring-1 ring-black/10"
                    style={{
                        backgroundColor:
                            geciciRenkler[item.id] ??
                            item.color ??
                            LEVEL_COLORS[0]
                    }}
                />
                Rengi değiştir
            </button>

            <div className="my-1 h-px bg-sand-200" />

            <button
                type="button"
                role="menuitem"
                onClick={() => handleDelete(item.id)}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-berry-600 transition-colors duration-150 hover:bg-berry-50"
            >
                <Trash2 size={15} /> Sil
            </button>
        </AnchoredDropdown>
    );

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-paper">
                <div className="text-center">
                    <div className="relative mx-auto mb-4 h-14 w-14">
                        <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-sand-300 border-t-moss-600" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Leaf className="animate-pulse text-moss-600" size={22} />
                        </div>
                    </div>
                    <p className="text-sm font-medium text-sand-600">Bahçe yükleniyor…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-paper flex flex-col">
            <PromptModal
                isOpen={promptConfig.isOpen}
                title={promptConfig.title}
                placeholder={promptConfig.placeholder}
                onConfirm={promptConfig.onConfirm}
                onCancel={() => setPromptConfig(prev => ({ ...prev, isOpen: false }))}
            />
            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                description={confirmConfig.description}
                isDanger={confirmConfig.isDanger}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            />

            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-sand-200 bg-white/85 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl">
                <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 py-3 lg:h-16 lg:flex-nowrap lg:py-0">
                        {/* Sol: Geri & Başlık */}
                        <div className="flex min-w-0 items-center gap-2.5 lg:flex-shrink-0">
                            <button
                                onClick={() => router.push('/')}
                                aria-label="Ana sayfa"
                                title="Ana Sayfa"
                                className="rounded-xl p-2 text-sand-600 transition-colors duration-200 hover:bg-sand-100 hover:text-sand-800"
                            >
                                <ArrowLeft size={21} />
                            </button>
                            <div className="min-w-0">
                                <h1 className="truncate text-lg font-semibold text-sand-900">
                                    {currentGarden?.name || 'Bahçe'}
                                </h1>
                                <p className="text-xs text-sand-500">
                                    {trees.length} ağaç · {countAllNodes(trees)} düşünce
                                </p>
                            </div>
                        </div>

                        {/* Orta: Arama */}
                        <div className="relative order-last w-full lg:order-none lg:w-auto lg:max-w-md lg:flex-1">
                            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sand-400" />
                            <input
                                type="text"
                                placeholder="Düşüncelerde ara…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input h-10 pl-10 pr-10 text-sm"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Aramayı temizle"
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-sand-400 hover:bg-sand-200 hover:text-sand-700"
                                >
                                    <X size={15} />
                                </button>
                            )}
                        </div>

                        {/* Sağ Eylemler: Görünüm Seçici, Canvas, Yeni Ağaç */}
                        <div className="ml-auto flex flex-shrink-0 items-center gap-2">
                            {/* Görünüm geçiş düğmesi (sadece geniş ekranlarda) */}
                            <div className="hidden lg:flex items-center rounded-xl border border-sand-200 bg-sand-100 p-0.5">
                                <button
                                    onClick={() => setViewMode('split')}
                                    title="İki Bölmeli Görünüm (Gezgin + Not Detayı)"
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                        viewMode === 'split'
                                            ? 'bg-white text-sand-900 shadow-soft'
                                            : 'text-sand-600 hover:text-sand-900'
                                    }`}
                                >
                                    <Columns size={14} />
                                    <span>Bölmeli</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    title="Pano / Kartlar Görünümü"
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                        viewMode === 'grid'
                                            ? 'bg-white text-sand-900 shadow-soft'
                                            : 'text-sand-600 hover:text-sand-900'
                                    }`}
                                >
                                    <LayoutGrid size={14} />
                                    <span>Pano</span>
                                </button>
                            </div>

                            <button
                                onClick={() => router.push(`/bahce_view?id=${gardenId}`)}
                                className="btn btn-secondary h-10 px-4 text-sm"
                            >
                                <Layout size={16} />
                                <span className="hidden sm:inline">Canvas</span>
                            </button>
                            <button
                                onClick={handleAddRoot}
                                className="btn btn-primary h-10 px-4 text-sm"
                            >
                                <Plus size={16} />
                                <span className="hidden sm:inline">Yeni Ağaç</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 relative mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
                {trees.length === 0 ? (
                    <div className="py-16 text-center md:py-24">
                        <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-moss-100 text-moss-700">
                            <TreePine size={30} />
                        </span>
                        <h2 className="text-2xl text-sand-900">Bahçeniz hazır</h2>
                        <p className="mx-auto mt-2 max-w-md text-sand-600">
                            İlk ağacınızı dikerek düşüncelerinizi dallandırıp notlarınızı organize etmeye başlayın.
                        </p>
                        <button
                            onClick={handleAddRoot}
                            className="btn btn-primary mt-7 px-6 py-3"
                        >
                            <Plus size={19} />
                            <span>İlk Ağacı Dik</span>
                        </button>
                    </div>
                ) : displayedTrees.length === 0 ? (
                    <div className="py-16 text-center md:py-24">
                        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sand-200 text-sand-600">
                            <Search size={26} />
                        </span>
                        <p className="text-sand-600">
                            &ldquo;{searchQuery}&rdquo; için sonuç bulunamadı
                        </p>
                    </div>
                ) : viewMode === 'split' ? (
                    /* ==========================================================
                       BÖLMELİ ÇALIŞMA ALANI (MASTER-DETAIL WORKSPACE)
                       Geniş ekranlarda boşluğu tam doldurur: solda ağaç gezgini,
                       sağda seçili notun canlı detay/okuma paneli.
                       ========================================================== */
                    <div className="flex flex-col lg:flex-row items-start gap-6">
                        {/* Sol Sütun: Ağaç Hiyerarşisi Gezgini */}
                        <div className="w-full lg:w-[460px] xl:w-[500px] flex-shrink-0 flex flex-col gap-3">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-sand-600">
                                        Ağaç Gezgini
                                    </span>
                                    <span className="chip-moss text-[11px] py-0.5 px-2">
                                        {displayedTrees.length} ağaç
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handleExpandAll}
                                        title="Tüm dalları aç"
                                        className="btn btn-ghost px-2 py-1 text-xs text-sand-600 hover:text-sand-900"
                                    >
                                        <ChevronsUpDown size={13} />
                                        <span>Tümünü Aç</span>
                                    </button>
                                    <button
                                        onClick={handleCollapseAll}
                                        title="Tüm dalları kapat"
                                        className="btn btn-ghost px-2 py-1 text-xs text-sand-600 hover:text-sand-900"
                                    >
                                        <span>Kapat</span>
                                    </button>
                                </div>
                            </div>

                            {/* Ağaç Listesi */}
                            <div className="space-y-3.5">
                                {displayedTrees.map((tree) => renderTreeItem(tree, 0))}
                            </div>
                        </div>

                        {/* Sağ Sütun: Not Detayı & Önizleme / Okuma Alanı */}
                        <div className="hidden lg:block flex-1 min-w-0 sticky top-24">
                            {selectedNode ? (
                                <div className="rounded-3xl border border-sand-200 bg-white p-7 shadow-card flex flex-col gap-6">
                                    {/* Ekmek Kırıntısı (Hiyerarşi Yolu) */}
                                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-sand-500 border-b border-sand-100 pb-3.5">
                                        <span className="text-moss-700 font-medium">Bahçe</span>
                                        {breadcrumbs.map((crumb, idx) => (
                                            <div key={crumb.id} className="flex items-center gap-1.5">
                                                <ChevronRight size={13} className="text-sand-400" />
                                                <button
                                                    onClick={() => setSelectedNodeId(crumb.id)}
                                                    className={`hover:underline truncate max-w-[160px] ${
                                                        idx === breadcrumbs.length - 1
                                                            ? 'font-semibold text-sand-900'
                                                            : 'text-sand-600 hover:text-moss-700'
                                                    }`}
                                                >
                                                    {crumb.title}
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Başlık & Aksiyonlar */}
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="chip-moss text-xs font-semibold py-0.5 px-2.5">
                                                    {breadcrumbs.length === 1
                                                        ? 'Kök Ağaç'
                                                        : breadcrumbs.length === 2
                                                        ? 'Ana Dal'
                                                        : `${breadcrumbs.length}. Seviye`}
                                                </span>
                                                {selectedChildren.length > 0 && (
                                                    <span className="chip-clay text-xs font-semibold py-0.5 px-2.5">
                                                        {selectedChildren.length} alt dal
                                                    </span>
                                                )}
                                            </div>
                                            <h2 className="font-serif text-2xl lg:text-3xl text-sand-900 tracking-tight">
                                                {selectedNodeTitle}
                                            </h2>
                                        </div>

                                        <button
                                            onClick={() => handleEdit(selectedNode.id)}
                                            className="btn btn-primary flex-shrink-0 px-4 py-2.5 text-sm"
                                        >
                                            <Pencil size={15} />
                                            <span>Tam Editör</span>
                                        </button>
                                    </div>

                                    {/* İçerik / Not Gövdesi */}
                                    <div className="rounded-2xl border border-sand-200/70 bg-sand-50/60 p-5 min-h-[160px]">
                                        {selectedNodeBody ? (
                                            <div className="text-sand-800 text-[15px] leading-relaxed whitespace-pre-wrap font-sans">
                                                {selectedNodeBody}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-8 text-center text-sand-500">
                                                <BookOpen size={28} className="text-sand-400 mb-2 opacity-70" />
                                                <p className="text-sm font-medium">Bu nota henüz açıklama veya metin eklenmemiş.</p>
                                                <p className="text-xs text-sand-400 mt-1">
                                                    Düşüncelerinizi genişletmek için tam editörü açabilirsiniz.
                                                </p>
                                                <button
                                                    onClick={() => handleEdit(selectedNode.id)}
                                                    className="btn btn-secondary mt-3 px-3.5 py-1.5 text-xs"
                                                >
                                                    <Pencil size={13} />
                                                    <span>İçerik Yaz</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Alt Dallar Önizlemesi */}
                                    {selectedChildren.length > 0 && (
                                        <div className="space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-semibold uppercase tracking-wider text-sand-600">
                                                    Alt Dallar ({selectedChildren.length})
                                                </h4>
                                                <button
                                                    onClick={() => handleAddChild(selectedNode.id, true)}
                                                    className="text-xs font-semibold text-moss-700 hover:text-moss-900 flex items-center gap-1"
                                                >
                                                    <Plus size={13} />
                                                    <span>Yeni Ekle</span>
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {selectedChildren.map(child => (
                                                    <button
                                                        key={child.id}
                                                        onClick={() => setSelectedNodeId(child.id)}
                                                        className="flex items-center justify-between p-3 rounded-xl border border-sand-200 bg-sand-50/70 hover:bg-sand-100 hover:border-moss-300 transition-all text-left group"
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-moss-100 text-moss-700 flex-shrink-0">
                                                                <Leaf size={12} />
                                                            </span>
                                                            <span className="text-sm font-medium text-sand-800 truncate group-hover:text-moss-800">
                                                                {child.content.split('\n')[0] || 'Başlıksız'}
                                                            </span>
                                                        </div>
                                                        <ChevronRight size={15} className="text-sand-400 group-hover:text-moss-600 flex-shrink-0" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* İstatistik & Bilgi Çubuğu */}
                                    <div className="flex items-center justify-between pt-3 border-t border-sand-200 text-xs text-sand-500">
                                        <div className="flex items-center gap-4">
                                            <span className="flex items-center gap-1">
                                                <AlignLeft size={13} />
                                                <span>{selectedNodeBody ? selectedNodeBody.split(/\s+/).filter(Boolean).length : 0} kelime</span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Hash size={13} />
                                                <span>{selectedNode.content.length} karakter</span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={13} />
                                                <span>{new Date(selectedNode.created_at).toLocaleDateString('tr-TR')}</span>
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleAddChild(selectedNode.id, selectedChildren.length > 0)}
                                                className="btn btn-secondary px-3 py-1.5 text-xs"
                                            >
                                                <Plus size={13} />
                                                <span>Alt Dal Ekle</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(selectedNode.id)}
                                                className="btn px-2.5 py-1.5 text-xs text-berry-600 hover:bg-berry-50 border border-transparent hover:border-berry-200"
                                                title="Bu notu sil"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Hiçbir not seçilmediğinde Bahçe Özeti kartı */
                                <div className="rounded-3xl border border-sand-200 bg-white p-8 shadow-card text-center space-y-6">
                                    <div className="mx-auto w-14 h-14 rounded-2xl bg-moss-100 flex items-center justify-center text-moss-700">
                                        <Sparkles size={28} />
                                    </div>
                                    <div>
                                        <h3 className="font-serif text-2xl text-sand-900">Bahçe Genel Bakış</h3>
                                        <p className="text-sm text-sand-500 mt-1 max-w-md mx-auto">
                                            Sol taraftaki ağaç gezgininden bir nota tıklayarak içeriğini doğrudan bu panelde okuyabilir, önizleyebilir veya düzenleyebilirsiniz.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-left">
                                        <div className="p-3.5 rounded-2xl border border-sand-200 bg-sand-50/70">
                                            <p className="text-xs text-sand-500">Ağaç</p>
                                            <p className="text-xl font-bold text-sand-900 mt-0.5">{trees.length}</p>
                                        </div>
                                        <div className="p-3.5 rounded-2xl border border-sand-200 bg-sand-50/70">
                                            <p className="text-xs text-sand-500">Toplam Not</p>
                                            <p className="text-xl font-bold text-sand-900 mt-0.5">{countAllNodes(trees)}</p>
                                        </div>
                                        <div className="p-3.5 rounded-2xl border border-sand-200 bg-sand-50/70">
                                            <p className="text-xs text-sand-500">Görünüm</p>
                                            <p className="text-sm font-bold text-moss-700 mt-1">Bölmeli</p>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            onClick={() => router.push(`/bahce_view?id=${gardenId}`)}
                                            className="btn btn-secondary px-4 py-2 text-sm"
                                        >
                                            <Layout size={15} />
                                            <span>Sonsuz Canvas Tuvalini Aç</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* ==========================================================
                       PANO GÖRÜNÜMÜ (GRID VIEW)
                       Kullanıcı isterse tüm ağaçları geniş kartlar halinde yan yana görür.
                       ========================================================== */
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 items-start gap-4">
                        {displayedTrees.map((tree) => renderTreeItem(tree, 0))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default function ProjelerPage() {
  return <Suspense fallback={<div>Yükleniyor...</div>}><ProjectsPageInner /></Suspense>;
}
