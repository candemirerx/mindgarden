'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { ArrowLeft, Sprout, Settings, List } from 'lucide-react';
import { GardenCanvas } from '@/components/canvas/GardenCanvas';
import { MindMapNode } from '@/components/canvas/MindMapNode';
import { TreeManagementModal } from '@/components/canvas/TreeManagementModal';
import { Modal } from '@/components/editor/Modal';
import { MindTextEditor } from '@/components/editor/MindTextEditor';
import Sidebar from '@/components/layout/Sidebar';
import { MindNode } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export default function GardenPage() {
    const params = useParams();
    const router = useRouter();
    const gardenId = params.id as string;

    const { gardens, nodes, fetchNodes, setCurrentGarden, addNode, updateNode, deleteNode: deleteNodeFromStore } = useStore();
    const [isLoading, setIsLoading] = useState(true);
    const [mindRoots, setMindRoots] = useState<MindNode[]>([]); // Birden fazla ağaç için array
    const [editingNode, setEditingNode] = useState<MindNode | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const currentGarden = gardens.find((g: any) => g.id === gardenId);

    // Supabase node'larını MindNode ağaçlarına dönüştür (birden fazla root destekler)
    const convertToMindTrees = useCallback((nodes: any[]): MindNode[] => {
        if (nodes.length === 0) return [];

        // Tüm root node'ları bul (parent_id === null)
        const rootNodes = nodes.filter(n => n.parent_id === null);

        const buildTree = (nodeId: string): MindNode => {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return { id: nodeId, title: 'Hata', content: '', children: [] };

            const children = nodes
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
            setCurrentGarden(gardenId);
            await fetchNodes(gardenId);
            setIsLoading(false);
        };
        loadData();
    }, [gardenId, fetchNodes, setCurrentGarden]);

    // Node'lar yüklendiğinde ağaçları oluştur
    useEffect(() => {
        if (nodes.length > 0) {
            const trees = convertToMindTrees(nodes);
            setMindRoots(trees);
        } else {
            setMindRoots([]);
        }
    }, [nodes, convertToMindTrees]);

    // Yeni root node (ağaç) oluştur
    const handleCreateRoot = async () => {
        const title = prompt('Ağaç ismi giriniz:');
        if (!title || !title.trim()) return;

        const newNode = await addNode(gardenId, title.trim(), null, { x: 0, y: 0 });
        // Supabase'e kaydedildi, useEffect otomatik olarak state'i güncelleyecek
    };

    // Recursive node bulma
    const findNode = (root: MindNode, nodeId: string): MindNode | null => {
        if (root.id === nodeId) return root;
        for (const child of root.children) {
            const found = findNode(child, nodeId);
            if (found) return found;
        }
        return null;
    };

    // Recursive node güncelleme
    const modifyNode = (root: MindNode, nodeId: string, callback: (node: MindNode) => MindNode): MindNode => {
        if (root.id === nodeId) return callback(root);
        return {
            ...root,
            children: root.children.map(child => modifyNode(child, nodeId, callback))
        };
    };

    // Recursive node silme
    const deleteNodeRecursive = (root: MindNode, nodeId: string): MindNode | null => {
        if (root.id === nodeId) return null;
        return {
            ...root,
            children: root.children
                .map(child => deleteNodeRecursive(child, nodeId))
                .filter((n): n is MindNode => n !== null)
        };
    };

    // Tüm ağaçlarda node bulma
    const findNodeInTrees = (nodeId: string): { tree: MindNode; treeIndex: number } | null => {
        for (let i = 0; i < mindRoots.length; i++) {
            const found = findNode(mindRoots[i], nodeId);
            if (found) return { tree: mindRoots[i], treeIndex: i };
        }
        return null;
    };

    // Alt node ekle
    const handleAddChild = async (parentId: string, direction: 'left' | 'right' = 'right') => {
        if (mindRoots.length === 0) return;

        const title = prompt('Dal ismi giriniz:');
        if (!title || !title.trim()) return;

        // Supabase'e kaydet ve gerçek node'u al
        const newNode = await addNode(gardenId, title.trim(), parentId, { x: 0, y: 0 });

        if (newNode) {
            const newMindNode: MindNode = {
                id: newNode.id,
                title: newNode.content,
                content: '',
                children: []
            };

            // Hangi ağaçta olduğunu bul
            const result = findNodeInTrees(parentId);
            if (result) {
                const { tree, treeIndex } = result;
                // UI'da ekle
                const newTree = modifyNode(tree, parentId, (node) => {
                    const newChildren = direction === 'left'
                        ? [newMindNode, ...node.children]
                        : [...node.children, newMindNode];
                    return { ...node, children: newChildren };
                });

                const newRoots = [...mindRoots];
                newRoots[treeIndex] = newTree;
                setMindRoots(newRoots);
            }
        }
    };

    // Node sil
    const handleDeleteNode = async (nodeId: string) => {
        if (mindRoots.length === 0) return;

        // Root silme kontrolü - hangi ağacın root'u olduğunu bul
        const rootIndex = mindRoots.findIndex(root => root.id === nodeId);
        if (rootIndex !== -1) {
            if (window.confirm("Bütün ağacı silmek istediğine emin misin?")) {
                await deleteNodeFromStore(nodeId);
                const newRoots = mindRoots.filter((_, i) => i !== rootIndex);
                setMindRoots(newRoots);
            }
            return;
        }

        // Hangi ağaçta olduğunu bul
        const result = findNodeInTrees(nodeId);
        if (result) {
            const { tree, treeIndex } = result;
            // UI'dan sil
            const newTree = deleteNodeRecursive(tree, nodeId);
            if (newTree) {
                const newRoots = [...mindRoots];
                newRoots[treeIndex] = newTree;
                setMindRoots(newRoots);
            }

            // Supabase'den sil
            await deleteNodeFromStore(nodeId);
        }
    };

    // Node kaydet
    const handleSaveNode = async (title: string, content: string) => {
        if (mindRoots.length === 0 || !editingNode) return;

        // Hangi ağaçta olduğunu bul
        const result = findNodeInTrees(editingNode.id);
        if (result) {
            const { tree, treeIndex } = result;
            // UI'da güncelle
            const newTree = modifyNode(tree, editingNode.id, (node) => ({
                ...node,
                title,
                content
            }));

            const newRoots = [...mindRoots];
            newRoots[treeIndex] = newTree;
            setMindRoots(newRoots);

            // Supabase'de güncelle
            await updateNode(editingNode.id, content);

            setEditingNode(null);
        }
    };

    // Ağaç yeniden adlandırma
    const handleRenameTree = async (treeId: string, newName: string) => {
        const tree = mindRoots.find(t => t.id === treeId);
        if (!tree) return;

        // İçeriğin ilk satırını (başlığı) güncelle
        const lines = tree.content.split('\n');
        lines[0] = newName;
        const newContent = lines.join('\n');

        await updateNode(treeId, newContent);

        // UI'da güncelle
        setMindRoots(prev => prev.map(t =>
            t.id === treeId ? { ...t, title: newName, content: newContent } : t
        ));
    };

    // Ağaç silme
    const handleDeleteTree = async (treeId: string) => {
        await deleteNodeFromStore(treeId);
        setMindRoots(prev => prev.filter(t => t.id !== treeId));
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-50">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-stone-200 border-t-amber-600 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Sprout className="text-amber-600" size={24} />
                    </div>
                </div>
            </div>
        );
    }

    if (!currentGarden) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-50">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-stone-700 mb-4">
                        Bahçe bulunamadı
                    </h2>
                    <button onClick={() => router.push('/')} className="btn-primary">
                        Ana Sayfaya Dön
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Header - Mobil Responsive */}
            <header className="h-14 md:h-16 bg-white/80 backdrop-blur-md border-b border-stone-200 flex items-center justify-between px-3 md:px-6 z-40 relative shadow-sm">
                <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 hover:bg-stone-100 rounded-full text-stone-600 transition-colors flex-shrink-0 touch-manipulation"
                        title="Ana Sayfa"
                    >
                        <ArrowLeft size={20} className="md:w-5 md:h-5" />
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-base md:text-xl font-bold text-amber-900 font-serif truncate">{currentGarden.name}</h1>
                        <p className="text-[10px] md:text-xs text-stone-400 hidden sm:block">{mindRoots.length} ağaç</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                    {/* Projeler Butonu */}
                    <button
                        onClick={() => router.push(`/bahce/${gardenId}/projeler`)}
                        className="p-2 hover:bg-amber-100 rounded-full text-amber-600 transition-colors flex-shrink-0"
                        title="Projeler (Liste Görünümü)"
                    >
                        <List size={18} className="md:w-5 md:h-5" />
                    </button>
                    {/* Ayarlar Butonu */}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 hover:bg-stone-100 rounded-full text-stone-500 transition-colors flex-shrink-0"
                        title="Ayarlar"
                    >
                        <Settings size={18} className="md:w-5 md:h-5" />
                    </button>
                    {/* Ağaç Ekle Butonu */}
                    <button
                        onClick={handleCreateRoot}
                        className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs md:text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
                        title="Yeni Ağaç Ekle"
                    >
                        <Sprout size={16} className="md:w-4 md:h-4" />
                        <span className="hidden sm:inline">Ağaç Ekle</span>
                    </button>
                </div>
            </header>

            {/* Canvas */}
            <div className="flex-1 relative overflow-hidden">
                <GardenCanvas gardenId={gardenId} initialViewState={currentGarden.view_state}>
                    {mindRoots.length > 0 ? (
                        <ul className="flex gap-20">
                            {mindRoots.map((root) => (
                                <MindMapNode
                                    key={root.id}
                                    node={root}
                                    onAddChild={handleAddChild}
                                    onDelete={handleDeleteNode}
                                    onEdit={(node) => router.push(`/bahce/${gardenId}/editor/${node.id}`)}
                                    depth={0}
                                />
                            ))}
                        </ul>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <button
                                onClick={handleCreateRoot}
                                className="group flex flex-col items-center gap-4 p-8 rounded-3xl border-2 border-dashed border-stone-300 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
                            >
                                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Sprout size={32} />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-stone-700">İlk Tohumu Ek</h3>
                                    <p className="text-stone-500 text-sm">Düşünce ağacını başlatmak için tıkla</p>
                                </div>
                            </button>
                        </div>
                    )}
                </GardenCanvas>
            </div>

            {/* Editor Modal */}
            <Modal
                isOpen={!!editingNode}
                onClose={() => setEditingNode(null)}
                title="Düşünceyi Düzenle"
            >
                {editingNode && (
                    <MindTextEditor
                        initialTitle={editingNode.title}
                        initialContent={editingNode.content}
                        onSave={handleSaveNode}
                        onClose={() => setEditingNode(null)}
                    />
                )}
            </Modal>

            {/* Tree Management Modal */}
            <TreeManagementModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                trees={mindRoots}
                onRenameTree={handleRenameTree}
                onDeleteTree={handleDeleteTree}
            />

            {/* Sidebar */}
            <Sidebar />
        </div>
    );
}
