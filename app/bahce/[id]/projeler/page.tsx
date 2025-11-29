'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import {
    ChevronDown, Plus, Trash2, Pencil, Layout, Search, 
    MoreHorizontal, X, TreePine, FileText, Home, Copy, Check, Leaf
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

    const countAllNodes = (items: TreeItem[]): number => {
        return items.reduce((acc, item) => acc + 1 + countAllNodes(item.children), 0);
    };

    const renderTreeItem = (item: TreeItem, depth: number = 0) => {
        const hasChildren = item.children.length > 0;
        const isExpanded = searchQuery ? true : expandedNodes.has(item.id);
        const isRoot = depth === 0;

        return (
            <div key={item.id} className={isRoot ? '' : 'relative'}>
                {/* Bağlantı çizgisi - sadece alt elemanlar için */}
                {!isRoot && (
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-300 to-emerald-100" />
                )}

                <div
                    className={`
                        group relative
                        ${isRoot
                            ? 'bg-gradient-to-br from-white via-white to-emerald-50/30 rounded-2xl shadow-sm hover:shadow-xl border-2 border-stone-100 hover:border-emerald-300 transition-all duration-300'
                            : 'ml-6 pl-4'
                        }
                    `}
                >
                    {/* İçerik - Tek satır tasarım */}
                    <div className={`${isRoot ? 'p-4' : 'py-3'}`}>
                        <div className="flex items-center gap-3">
                            {/* Sol: İkon + Expand */}
                            {isRoot ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
                                        <TreePine size={20} className="text-white" />
                                    </div>
                                    {hasChildren && (
                                        <button
                                            onClick={() => toggleExpand(item.id)}
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all shrink-0 ${isExpanded ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-400 hover:bg-emerald-50 hover:text-emerald-500'}`}
                                        >
                                            <ChevronDown size={16} className={isExpanded ? '' : '-rotate-90'} />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {hasChildren ? (
                                        <button
                                            onClick={() => toggleExpand(item.id)}
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all shrink-0 ${isExpanded ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-400 hover:bg-emerald-50 hover:text-emerald-500'}`}
                                        >
                                            <ChevronDown size={16} className={isExpanded ? '' : '-rotate-90'} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleEdit(item.id)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shrink-0 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
                                            title="Düzenle"
                                        >
                                            <Leaf size={14} className="text-white" />
                                        </button>
                                    )}
                                </>
                            )}

                            {/* Orta: Başlık + Kopyalama Butonları */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
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
                                        className="flex-1 px-3 py-1.5 bg-emerald-50 rounded-lg border-2 border-emerald-400 outline-none text-stone-800 font-medium"
                                        autoFocus
                                    />
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleEdit(item.id)}
                                            className={`text-left transition-all hover:text-emerald-600 truncate ${isRoot ? 'text-lg font-bold text-stone-800' : 'text-base font-medium text-stone-700'}`}
                                        >
                                            {item.title}
                                        </button>

                                        {/* Kopyalama Butonları */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleCopy(item.title, item.id, 'title'); }}
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all border shrink-0 ${copiedId === `title-${item.id}` ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 hover:border-amber-400'}`}
                                            title="Başlığı kopyala"
                                        >
                                            {copiedId === `title-${item.id}` ? <Check size={12} /> : <Copy size={12} />}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); const c = item.content.split('\n').slice(1).join('\n').trim(); handleCopy(c || item.title, item.id, 'content'); }}
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all border shrink-0 ${copiedId === `content-${item.id}` ? 'bg-sky-500 text-white border-sky-500' : 'bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100 hover:border-sky-400'}`}
                                            title="İçeriği kopyala"
                                        >
                                            {copiedId === `content-${item.id}` ? <Check size={12} /> : <FileText size={12} />}
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Sağ: Dal sayısı + Menü */}
                            <div className="flex items-center gap-2 shrink-0">
                                {hasChildren && (
                                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                                        {item.children.length} dal
                                    </span>
                                )}

                                {/* Menü */}
                                <div className="relative">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === item.id ? null : item.id); }}
                                        className={`p-1.5 rounded-lg transition-all ${isRoot ? 'text-stone-400 hover:text-stone-600 hover:bg-stone-100' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100 opacity-0 group-hover:opacity-100'}`}
                                    >
                                        <MoreHorizontal size={18} />
                                    </button>

                                    {activeMenu === item.id && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
                                            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-stone-200 py-1.5 z-50 min-w-[160px]">
                                                <button onClick={() => { handleEdit(item.id); setActiveMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50">
                                                    <Pencil size={14} className="text-emerald-500" /> Düzenle
                                                </button>
                                                <button onClick={() => { setEditingNodeId(item.id); setEditingTitle(item.title); setActiveMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50">
                                                    <FileText size={14} className="text-amber-500" /> Yeniden Adlandır
                                                </button>
                                                <button onClick={() => handleAddChild(item.id)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50">
                                                    <Plus size={14} className="text-sky-500" /> Alt Dal Ekle
                                                </button>
                                                <hr className="my-1 border-stone-100" />
                                                <button onClick={() => handleDelete(item.id)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                                                    <Trash2 size={14} /> Sil
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Alt elemanlar */}
                        {hasChildren && isExpanded && (
                            <div className="mt-4 space-y-2">
                                {item.children.map((child) => renderTreeItem(child, depth + 1))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-stone-50 via-emerald-50/30 to-stone-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 relative mx-auto mb-4">
                        <div className="absolute inset-0 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Leaf className="text-emerald-500 animate-pulse" size={24} />
                        </div>
                    </div>
                    <p className="text-stone-500 font-medium">Bahçe yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-50 via-emerald-50/20 to-stone-50">
            {/* Dekoratif arka plan */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl" />
            </div>

            {/* Header */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-stone-200/50 sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="h-16 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push('/')}
                                className="p-2.5 hover:bg-stone-100 rounded-xl transition-colors"
                            >
                                <Home size={22} className="text-stone-500" />
                            </button>
                            <div className="h-6 w-px bg-stone-200" />
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                                    <TreePine size={22} className="text-white" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-stone-800">
                                        {currentGarden?.name || 'Bahçe'}
                                    </h1>
                                    <p className="text-sm text-stone-500">
                                        {trees.length} ağaç · {countAllNodes(trees)} not
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push(`/bahce/${gardenId}`)}
                                className="h-10 px-4 flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors border border-stone-200 hover:border-emerald-200"
                            >
                                <Layout size={18} />
                                <span className="hidden sm:inline">Canvas Görünümü</span>
                            </button>
                            <button
                                onClick={handleAddRoot}
                                className="h-10 px-5 flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30"
                            >
                                <Plus size={18} />
                                <span className="hidden sm:inline">Yeni Ağaç</span>
                            </button>
                        </div>
                    </div>

                    {/* Arama */}
                    <div className="pb-4">
                        <div className="relative max-w-xl">
                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                type="text"
                                placeholder="Notlarda ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-12 pl-12 pr-12 bg-stone-100/80 hover:bg-stone-100 focus:bg-white rounded-xl text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 border border-transparent focus:border-emerald-300 transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-stone-200 rounded-lg"
                                >
                                    <X size={16} className="text-stone-400" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {trees.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="w-28 h-28 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-xl">
                            <TreePine size={48} className="text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-stone-800 mb-3">
                            Bahçeniz Hazır!
                        </h2>
                        <p className="text-stone-500 mb-8 max-w-md mx-auto text-lg">
                            İlk ağacınızı dikerek fikirlerinizi organize etmeye başlayın.
                        </p>
                        <button
                            onClick={handleAddRoot}
                            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-2xl transition-all shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:scale-105"
                        >
                            <Plus size={22} />
                            İlk Ağacı Dik
                        </button>
                    </div>
                ) : displayedTrees.length === 0 ? (
                    <div className="py-20 text-center">
                        <Search size={48} className="text-stone-300 mx-auto mb-4" />
                        <p className="text-stone-500 text-lg">
                            &ldquo;{searchQuery}&rdquo; için sonuç bulunamadı
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-2">
                        {displayedTrees.map((tree) => renderTreeItem(tree, 0))}
                    </div>
                )}
            </main>

            {/* Mobil FAB */}
            {trees.length > 0 && (
                <button
                    onClick={handleAddRoot}
                    className="lg:hidden fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-2xl shadow-2xl shadow-emerald-500/40 flex items-center justify-center z-50 active:scale-95 transition-transform"
                >
                    <Plus size={28} />
                </button>
            )}
        </div>
    );
}
