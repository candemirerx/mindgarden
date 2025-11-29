'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { 
    ArrowLeft, ChevronRight, ChevronDown, Plus, Trash2, 
    Pencil, Layout, Search, MoreHorizontal, X, TreePine,
    FolderOpen, FileText, Sparkles, Home, Copy, Check
} from 'lucide-react';

interface TreeItem {
    id: string;
    title: string;
    content: string;
    children: TreeItem[];
    isExpanded: boolean;
}

export default function ProjectsPage() {
    const params = useParams();
    const router = useRouter();
    const gardenId = params.id as string;

    const { gardens, nodes, fetchNodes, addNode, updateNode, deleteNode, toggleNodeExpansion } = useStore();
    const [isLoading, setIsLoading] = useState(true);
    const [trees, setTrees] = useState<TreeItem[]>([]);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const currentGarden = gardens.find(g => g.id === gardenId);

    const handleCopy = (text: string, id: string, type: 'title' | 'content') => {
        navigator.clipboard.writeText(text);
        setCopiedId(`${type}-${id}`);
        setTimeout(() => setCopiedId(null), 1500);
    };

    const buildTrees = useCallback((nodeList: typeof nodes): TreeItem[] => {
        const rootNodes = nodeList.filter(n => !n.parent_id);
        
        const buildTree = (nodeId: string): TreeItem => {
            const node = nodeList.find(n => n.id === nodeId);
            if (!node) return { id: nodeId, title: 'Hata', content: '', children: [], isExpanded: true };

            const children = nodeList
                .filter(n => n.parent_id === nodeId)
                .map(child => buildTree(child.id));

            return {
                id: node.id,
                title: node.content.split('\n')[0] || 'Başlıksız',
                content: node.content,
                children,
                isExpanded: node.is_expanded ?? true
            };
        };

        return rootNodes.map(root => buildTree(root.id));
    }, []);

    useEffect(() => {
        const loadData = async () => {
            await fetchNodes(gardenId);
            setIsLoading(false);
        };
        loadData();
    }, [gardenId, fetchNodes]);

    useEffect(() => {
        if (nodes.length > 0) {
            setTrees(buildTrees(nodes));
            const expanded = new Set<string>();
            nodes.forEach(n => {
                if (n.is_expanded) expanded.add(n.id);
            });
            setExpandedNodes(expanded);
        } else {
            setTrees([]);
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

    const handleAddRoot = async () => {
        const title = prompt('Yeni ağaç adı:');
        if (!title?.trim()) return;
        await addNode(gardenId, title.trim(), null, { x: 0, y: 0 });
    };

    const handleAddChild = async (parentId: string) => {
        const title = prompt('Yeni dal adı:');
        if (!title?.trim()) return;
        await addNode(gardenId, title.trim(), parentId, { x: 0, y: 0 });
        setActiveMenu(null);
    };

    const handleDelete = async (nodeId: string) => {
        if (confirm('Bu notu ve alt dallarını silmek istediğinize emin misiniz?')) {
            await deleteNode(nodeId);
        }
        setActiveMenu(null);
    };

    const handleEdit = (nodeId: string) => {
        router.push(`/bahce/${gardenId}/editor/${nodeId}`);
    };

    const handleSaveTitle = async (nodeId: string, originalContent: string) => {
        if (editingTitle.trim()) {
            const lines = originalContent.split('\n');
            lines[0] = editingTitle.trim();
            await updateNode(nodeId, lines.join('\n'));
        }
        setEditingNodeId(null);
    };

    // Toplam not sayısını hesapla
    const countAllNodes = (items: TreeItem[]): number => {
        return items.reduce((acc, item) => acc + 1 + countAllNodes(item.children), 0);
    };

    const renderTreeItem = (item: TreeItem, depth: number = 0, isLast: boolean = false) => {
        const hasChildren = item.children.length > 0;
        const isExpanded = searchQuery ? true : expandedNodes.has(item.id);
        const isRoot = depth === 0;

        return (
            <div key={item.id}>
                {/* Ana item */}
                <div 
                    className={`
                        group relative flex items-center gap-3 
                        ${isRoot 
                            ? 'p-4 bg-white rounded-2xl shadow-sm border border-stone-100 hover:shadow-md hover:border-emerald-200' 
                            : 'py-2.5 px-3 ml-4 hover:bg-stone-50 rounded-xl'
                        }
                        transition-all duration-200
                    `}
                >
                    {/* Sol taraf - Expand ve İkon */}
                    <div className="flex items-center gap-2">
                        {hasChildren ? (
                            <button
                                onClick={() => toggleExpand(item.id)}
                                className={`
                                    w-7 h-7 flex items-center justify-center rounded-lg transition-all
                                    ${isExpanded 
                                        ? 'bg-emerald-100 text-emerald-600' 
                                        : 'bg-stone-100 text-stone-400 hover:bg-emerald-50 hover:text-emerald-500'
                                    }
                                `}
                            >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                        ) : (
                            <div className={`w-7 h-7 flex items-center justify-center rounded-lg ${isRoot ? 'bg-amber-50' : 'bg-stone-50'}`}>
                                <FileText size={14} className={isRoot ? 'text-amber-500' : 'text-stone-400'} />
                            </div>
                        )}
                        
                        {isRoot && hasChildren && (
                            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
                                <FolderOpen size={16} className="text-white" />
                            </div>
                        )}
                    </div>

                    {/* Başlık ve Kopyalama Butonları */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
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
                                className="flex-1 px-3 py-1 bg-emerald-50 rounded-lg border-2 border-emerald-400 outline-none text-stone-800"
                                autoFocus
                            />
                        ) : (
                            <>
                                <button
                                    onClick={() => handleEdit(item.id)}
                                    className={`
                                        text-left transition-colors shrink-0 max-w-full
                                        ${isRoot 
                                            ? 'text-stone-800 font-semibold hover:text-emerald-700' 
                                            : 'text-stone-600 hover:text-emerald-600'
                                        }
                                    `}
                                    style={{ wordBreak: 'break-word' }}
                                >
                                    {item.title}
                                </button>
                                
                                {/* Başlık Kopyala */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy(item.title, item.id, 'title');
                                    }}
                                    className={`
                                        w-7 h-7 flex items-center justify-center rounded-lg transition-all shrink-0 border
                                        ${copiedId === `title-${item.id}` 
                                            ? 'bg-emerald-500 text-white border-emerald-500 scale-110' 
                                            : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 hover:border-amber-300 hover:scale-105 active:scale-95'
                                        }
                                    `}
                                    title="Başlığı kopyala"
                                >
                                    {copiedId === `title-${item.id}` ? <Check size={14} /> : <Copy size={14} />}
                                </button>

                                {/* İçerik Kopyala */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const contentOnly = item.content.split('\n').slice(1).join('\n').trim();
                                        handleCopy(contentOnly || item.title, item.id, 'content');
                                    }}
                                    className={`
                                        w-7 h-7 flex items-center justify-center rounded-lg transition-all shrink-0 border
                                        ${copiedId === `content-${item.id}` 
                                            ? 'bg-blue-500 text-white border-blue-500 scale-110' 
                                            : 'bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100 hover:border-sky-300 hover:scale-105 active:scale-95'
                                        }
                                    `}
                                    title="İçeriği kopyala"
                                >
                                    {copiedId === `content-${item.id}` ? <Check size={14} /> : <FileText size={14} />}
                                </button>
                            </>
                        )}
                    </div>

                    {/* Sağ taraf - Badge ve Menü */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {hasChildren && (
                            <span className={`
                                px-2 py-0.5 text-xs font-medium rounded-full
                                ${isRoot 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-stone-100 text-stone-500'
                                }
                            `}>
                                {item.children.length}
                            </span>
                        )}

                        {/* Menü */}
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenu(activeMenu === item.id ? null : item.id);
                                }}
                                className={`
                                    p-1.5 rounded-lg transition-all
                                    ${activeMenu === item.id 
                                        ? 'bg-stone-200 text-stone-700' 
                                        : 'text-stone-400 hover:bg-stone-100 hover:text-stone-600 opacity-0 group-hover:opacity-100'
                                    }
                                `}
                            >
                                <MoreHorizontal size={18} />
                            </button>

                            {activeMenu === item.id && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                                    <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-50 min-w-[150px]">
                                        <button
                                            onClick={() => { handleEdit(item.id); setActiveMenu(null); }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                                        >
                                            <Pencil size={15} className="text-stone-400" />
                                            Düzenle
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingNodeId(item.id);
                                                setEditingTitle(item.title);
                                                setActiveMenu(null);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                                        >
                                            <FileText size={15} className="text-stone-400" />
                                            Yeniden Adlandır
                                        </button>
                                        <button
                                            onClick={() => handleAddChild(item.id)}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                                        >
                                            <Plus size={15} className="text-emerald-500" />
                                            Alt Not Ekle
                                        </button>
                                        <hr className="my-1.5 border-stone-100" />
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 size={15} />
                                            Sil
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Alt elemanlar */}
                {hasChildren && isExpanded && (
                    <div className={`${isRoot ? 'mt-2 ml-6 pl-4 border-l-2 border-emerald-100' : 'ml-3 pl-3 border-l border-stone-200'}`}>
                        {item.children.map((child, idx) => 
                            renderTreeItem(child, depth + 1, idx === item.children.length - 1)
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-3 border-stone-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-stone-500 text-sm">Yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafaf8]">
            {/* Header */}
            <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
                <div className="max-w-3xl mx-auto px-4">
                    {/* Üst bar */}
                    <div className="h-14 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push('/')}
                                className="p-2 -ml-2 hover:bg-stone-100 rounded-xl transition-colors"
                            >
                                <Home size={20} className="text-stone-500" />
                            </button>
                            <div className="h-5 w-px bg-stone-200" />
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                                    <TreePine size={16} className="text-white" />
                                </div>
                                <div>
                                    <h1 className="text-sm font-semibold text-stone-800 leading-tight">
                                        {currentGarden?.name || 'Bahçe'}
                                    </h1>
                                    <p className="text-xs text-stone-400">
                                        {trees.length} ağaç · {countAllNodes(trees)} not
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push(`/bahce/${gardenId}`)}
                                className="h-9 px-3 flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                            >
                                <Layout size={16} />
                                <span className="hidden sm:inline">Canvas</span>
                            </button>
                            <button
                                onClick={handleAddRoot}
                                className="h-9 px-4 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                <Plus size={16} />
                                <span className="hidden sm:inline">Yeni</span>
                            </button>
                        </div>
                    </div>

                    {/* Arama */}
                    <div className="pb-3">
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                type="text"
                                placeholder="Notlarda ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 pl-10 pr-10 bg-stone-100 rounded-xl text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-200 rounded-md"
                                >
                                    <X size={14} className="text-stone-400" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-3xl mx-auto px-4 py-6">
                {trees.length === 0 ? (
                    /* Boş durum */
                    <div className="py-16 text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-3xl mx-auto mb-5 flex items-center justify-center">
                            <Sparkles size={32} className="text-emerald-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-stone-800 mb-2">
                            Bahçeniz hazır!
                        </h2>
                        <p className="text-stone-500 mb-6 max-w-xs mx-auto">
                            İlk notunuzu ekleyerek fikirlerinizi organize etmeye başlayın.
                        </p>
                        <button
                            onClick={handleAddRoot}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors"
                        >
                            <Plus size={18} />
                            İlk Notu Ekle
                        </button>
                    </div>
                ) : displayedTrees.length === 0 ? (
                    /* Arama sonucu yok */
                    <div className="py-16 text-center">
                        <Search size={40} className="text-stone-300 mx-auto mb-4" />
                        <p className="text-stone-500">
                            &ldquo;{searchQuery}&rdquo; için sonuç bulunamadı
                        </p>
                    </div>
                ) : (
                    /* Liste */
                    <div className="space-y-3">
                        {displayedTrees.map((tree, idx) => renderTreeItem(tree, 0, idx === displayedTrees.length - 1))}
                    </div>
                )}
            </main>

            {/* Mobil FAB */}
            {trees.length > 0 && (
                <button
                    onClick={handleAddRoot}
                    className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center z-50 active:scale-95 transition-transform"
                >
                    <Plus size={24} />
                </button>
            )}
        </div>
    );
}
