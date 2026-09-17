'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { ArrowLeft, Sprout, Settings, List, TreePine } from 'lucide-react';
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

    const { gardens, nodes, fetchGardens, fetchNodes, setCurrentGarden, addNode, updateNode, deleteNode: deleteNodeFromStore } = useStore();
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
                isExpanded: node.is_expanded ?? true,
                nodeType: node.node_type ?? 'auto'
            };
        };

        return rootNodes.map(root => buildTree(root.id));
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setCurrentGarden(gardenId);
            // Sayfaya doğrudan URL ile (veya yenileme sonrası) girildiğinde store boş
            // olur; bahçe kaydı yoksa "Bahçe bulunamadı" ekranına düşmemek için listeyi çek.
            if (!useStore.getState().gardens.some((g) => g.id === gardenId)) {
                await fetchGardens();
            }
            await fetchNodes(gardenId);
            setIsLoading(false);
        };
        loadData();
    }, [gardenId, fetchGardens, fetchNodes, setCurrentGarden]);

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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sand-50 via-clay-50/30 to-sand-50">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-sand-200 border-t-clay-600 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Sprout className="text-clay-600" size={24} />
                    </div>
                </div>
            </div>
        );
    }

    if (!currentGarden) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-paper p-6">
                <div className="rounded-3xl border border-sand-200 bg-white p-10 text-center shadow-lift">
                    <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-clay-100 text-clay-700">
                        <TreePine size={28} />
                    </span>
                    <h2 className="text-xl text-sand-900">Bahçe bulunamadı</h2>
                    <p className="mt-1.5 text-sm text-sand-600">
                        Bu bahçe silinmiş ya da artık erişilebilir değil.
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="btn btn-primary mt-6 px-5 py-2.5"
                    >
                        <ArrowLeft size={18} />
                        <span>Ana Sayfaya Dön</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Header - Mobil Responsive */}
            <header className="relative z-40 flex h-14 items-center justify-between gap-3 border-b border-sand-200 bg-white/85 px-3 backdrop-blur-md md:h-16 md:px-6">
                <div className="flex min-w-0 flex-1 items-center gap-1.5 md:gap-2">
                    <button
                        onClick={() => router.push('/')}
                        aria-label="Ana sayfa"
                        title="Ana Sayfa"
                        className="flex-shrink-0 rounded-xl p-2 text-sand-600 transition-colors duration-200 hover:bg-sand-100 hover:text-sand-800 touch-manipulation"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-base text-sand-900 md:text-lg">{currentGarden.name}</h1>
                        <p className="hidden text-xs text-sand-500 sm:block">
                            {mindRoots.length > 0 ? `${mindRoots.length} ağaç` : 'Henüz ağaç yok'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-shrink-0 items-center gap-1.5 md:gap-2">
                    <button
                        onClick={() => router.push(`/bahce/${gardenId}/projeler`)}
                        aria-label="Projeler"
                        title="Projeler (liste görünümü)"
                        className="flex-shrink-0 rounded-xl p-2 text-clay-700 transition-colors duration-200 hover:bg-clay-50"
                    >
                        <List size={19} />
                    </button>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        aria-label="Ayarlar"
                        title="Ayarlar"
                        className="flex-shrink-0 rounded-xl p-2 text-sand-600 transition-colors duration-200 hover:bg-sand-100 hover:text-sand-800"
                    >
                        <Settings size={19} />
                    </button>
                    <button
                        onClick={handleCreateRoot}
                        title="Yeni ağaç ekle"
                        className="btn btn-primary ml-1 px-3 py-2 text-xs md:px-4 md:text-sm"
                    >
                        <Sprout size={16} />
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
                        <div className="absolute inset-0 flex items-center justify-center p-6">
                            <button
                                onClick={handleCreateRoot}
                                className="group flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-sand-300 bg-white/60 p-9 backdrop-blur-sm transition-all duration-200 ease-smooth hover:border-moss-400 hover:bg-white hover:shadow-lift"
                            >
                                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-moss-100 text-moss-700 transition-transform duration-200 group-hover:scale-105">
                                    <Sprout size={32} />
                                </span>
                                <span className="text-center">
                                    <span className="block text-lg font-semibold text-sand-900">İlk tohumu ek</span>
                                    <span className="mt-0.5 block text-sm text-sand-600">
                                        Düşünce ağacını başlatmak için tıkla
                                    </span>
                                </span>
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
