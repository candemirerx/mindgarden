'use client';

import { useEffect, Suspense, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { ArrowLeft, Sprout, Settings, List, TreePine } from 'lucide-react';
import { GardenCanvas } from '@/components/canvas/GardenCanvas';
import { MindMapNode } from '@/components/canvas/MindMapNode';
import { TreeManagementModal } from '@/components/canvas/TreeManagementModal';
import { Modal } from '@/components/editor/Modal';
import { MindTextEditor } from '@/components/editor/MindTextEditor';
import Sidebar from '@/components/layout/Sidebar';
import PromptModal from '@/components/ui/PromptModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { hapticTick } from '@/components/mobile/MobileShell';
import { agacSuruklemesiBasladi, agacSuruklemesiBitti } from '@/lib/canvasGesture';
import { MindNode } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Bir ağacı uzun basıp sürükleyerek bahçede istenen konuma taşımaya yarar.
 *
 * Konum, ağacın otomatik yerleşimine eklenen bir kaydırma olarak tutulur;
 * böylece diğer ağaçların düzeni bozulmaz. Sürükleme bitince konum kaydedilir.
 *
 * Sürükleme başladığında tuval bilgilendirilir; böylece ağaç taşınırken
 * bahçe de kaymaz ve hareket yalnızca ağaca ait olur.
 */
function SuruklenebilirAgac({
    x,
    y,
    onMove,
    children
}: {
    x: number;
    y: number;
    onMove: (x: number, y: number) => void;
    children: React.ReactNode;
}) {
    const [kaydirma, setKaydirma] = useState({ x, y });
    const [surukluyor, setSurukluyor] = useState(false);
    const baslangic = useRef({ fareX: 0, fareY: 0, kayX: 0, kayY: 0, olcek: 1 });
    const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
    const suruklendi = useRef(false);

    // Konum dışarıdan değişirse (senkron vb.) ve o an sürükleme yoksa uygula
    useEffect(() => {
        if (!surukluyor) {
            setKaydirma({ x, y });
        }
    }, [x, y, surukluyor]);

    // Bileşen ekrandan kalkarsa tuvali kilitli bırakma
    useEffect(() => () => {
        if (zamanlayici.current) clearTimeout(zamanlayici.current);
        agacSuruklemesiBitti();
    }, []);

    /** Tuvalin yakınlaştırma oranını okur; sürükleme farkını buna böleriz. */
    const olcekOku = () => {
        const katman = document.querySelector('.tree') as HTMLElement | null;
        if (!katman) return 1;
        try {
            const donusum = new DOMMatrixReadOnly(getComputedStyle(katman).transform);
            return donusum.a || 1;
        } catch {
            return 1;
        }
    };

    const fareFarki = (e: React.PointerEvent) => {
        const { fareX, fareY, kayX, kayY, olcek } = baslangic.current;
        return {
            x: kayX + (e.clientX - fareX) / olcek,
            y: kayY + (e.clientY - fareY) / olcek
        };
    };

    const basla = (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        // Düğmelere uzun basmak ağacı taşımaya başlatmasın; düğmeler
        // kendi işlerini yapmaya devam etsin.
        if ((e.target as HTMLElement).closest('button')) return;

        baslangic.current = {
            fareX: e.clientX,
            fareY: e.clientY,
            kayX: kaydirma.x,
            kayY: kaydirma.y,
            olcek: olcekOku()
        };
        suruklendi.current = false;

        const hedef = e.currentTarget as HTMLElement;
        zamanlayici.current = setTimeout(() => {
            setSurukluyor(true);
            // Tuval bu andan sonra kaymaz; hareket yalnızca ağaca aittir.
            agacSuruklemesiBasladi();
            void hapticTick();
            try {
                hedef.setPointerCapture(e.pointerId);
            } catch {
                // yakalama desteklenmiyorsa sorun değil
            }
        }, 350);
    };

    const hareket = (e: React.PointerEvent) => {
        if (!surukluyor) {
            // Parmak erken kayarsa uzun basma iptal olur, tuval kaydırması devam eder
            if (
                zamanlayici.current &&
                Math.hypot(
                    e.clientX - baslangic.current.fareX,
                    e.clientY - baslangic.current.fareY
                ) > 8
            ) {
                clearTimeout(zamanlayici.current);
                zamanlayici.current = null;
            }
            return;
        }

        e.stopPropagation();
        suruklendi.current = true;
        setKaydirma(fareFarki(e));
    };

    const bitir = (e: React.PointerEvent) => {
        if (zamanlayici.current) {
            clearTimeout(zamanlayici.current);
            zamanlayici.current = null;
        }
        if (!surukluyor) return;

        e.stopPropagation();
        setSurukluyor(false);
        // Tuval yeniden kaydırılabilir.
        agacSuruklemesiBitti();

        const son = fareFarki(e);
        onMove(Math.round(son.x), Math.round(son.y));
    };

    return (
        <li
            onPointerDown={basla}
            onPointerMove={hareket}
            onPointerUp={bitir}
            onPointerCancel={bitir}
            onClickCapture={(e) => {
                // Sürüklemeden sonra oluşan tıklamayı yut; düğüm seçilmesin
                if (suruklendi.current) {
                    e.stopPropagation();
                    e.preventDefault();
                    suruklendi.current = false;
                }
            }}
            data-agac-alani
            className={`tree-drag-area relative ${surukluyor ? 'z-50' : ''}`}
            style={{
                transform: `translate(${kaydirma.x}px, ${kaydirma.y}px)`,
                touchAction: surukluyor ? 'none' : 'auto',
                transition: surukluyor ? 'none' : 'transform 0.15s ease-out',
                cursor: surukluyor ? 'grabbing' : undefined,
                // Taşınan ağaç, elin altında olduğu anlaşılsın diye hafifçe öne çıkar
                filter: surukluyor ? 'drop-shadow(0 12px 18px rgba(41, 37, 30, 0.22))' : undefined
            }}
        >
            {children}
        </li>
    );
}

function GardenPageInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const gardenId = searchParams.get('id') || '';

    const { gardens, nodes, fetchGardens, fetchNodes, setCurrentGarden, addNode, updateNode, updateNodePosition, deleteNode: deleteNodeFromStore } = useStore();
    const [isLoading, setIsLoading] = useState(true);
    const [mindRoots, setMindRoots] = useState<MindNode[]>([]); // Birden fazla ağaç için array
    const [editingNode, setEditingNode] = useState<MindNode | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Modals state
    const [promptConfig, setPromptConfig] = useState<{isOpen: boolean, title: string, placeholder?: string, onConfirm: (val: string) => void}>({isOpen: false, title: '', onConfirm: () => {}});
    const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, description: string, isDanger?: boolean, onConfirm: () => void}>({isOpen: false, title: '', description: '', onConfirm: () => {}});

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
                nodeType: node.node_type ?? 'auto',
                isPruned: node.is_pruned ?? false
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
    const handleCreateRoot = () => {
        setPromptConfig({
            isOpen: true,
            title: 'Yeni Ağaç Ekle',
            placeholder: 'Ağaç adı girin...',
            onConfirm: async (title) => {
                setPromptConfig(prev => ({ ...prev, isOpen: false }));
                await addNode(gardenId, title, null, { x: 0, y: 0 });
            }
        });
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
    const handleAddChild = (parentId: string, direction: 'left' | 'right' = 'right') => {
        if (mindRoots.length === 0) return;

        setPromptConfig({
            isOpen: true,
            title: 'Dal Ekle',
            placeholder: 'Dal adı girin...',
            onConfirm: async (title) => {
                setPromptConfig(prev => ({ ...prev, isOpen: false }));
                // Supabase'e kaydet ve gerçek node'u al
                const newNode = await addNode(gardenId, title, parentId, { x: 0, y: 0 });

                if (newNode) {
                    const newMindNode: MindNode = {
                        id: newNode.id,
                        title: newNode.content,
                        content: '',
                        children: [],
                        nodeType: 'auto',
                        isPruned: false
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
                            return { ...node, children: newChildren, isExpanded: true };
                        });

                        const newRoots = [...mindRoots];
                        newRoots[treeIndex] = newTree;
                        setMindRoots(newRoots);
                    }
                }
            }
        });
    };

    // Node sil
    const handleDeleteNode = (nodeId: string) => {
        if (mindRoots.length === 0) return;

        // Root silme kontrolü - hangi ağacın root'u olduğunu bul
        const rootIndex = mindRoots.findIndex(root => root.id === nodeId);
        if (rootIndex !== -1) {
            setConfirmConfig({
                isOpen: true,
                title: 'Ağacı Sil',
                description: 'Bütün ağacı ve altındaki tüm düşünceleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
                isDanger: true,
                onConfirm: async () => {
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                    await deleteNodeFromStore(nodeId);
                    const newRoots = mindRoots.filter((_, i) => i !== rootIndex);
                    setMindRoots(newRoots);
                }
            });
            return;
        }

        // Hangi ağaçta olduğunu bul
        const result = findNodeInTrees(nodeId);
        if (result) {
            setConfirmConfig({
                isOpen: true,
                title: 'Dalı Sil',
                description: 'Bu dalı ve altındaki tüm düşünceleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
                isDanger: true,
                onConfirm: async () => {
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
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
            });
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
            <header className="relative z-40 flex h-[calc(3.5rem+env(safe-area-inset-top,0px))] items-center justify-between gap-3 border-b border-sand-200 bg-white/85 px-3 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md md:h-[calc(4rem+env(safe-area-inset-top,0px))] md:px-6">
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
                        onClick={() => router.push(`/projeler?id=${gardenId}`)}
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
                                <SuruklenebilirAgac
                                    key={root.id}
                                    x={nodes.find((n) => n.id === root.id)?.position_x ?? 0}
                                    y={nodes.find((n) => n.id === root.id)?.position_y ?? 0}
                                    onMove={(x, y) => {
                                        void updateNodePosition(root.id, x, y);
                                    }}
                                >
                                    <MindMapNode
                                        node={root}
                                        onAddChild={handleAddChild}
                                        onDelete={handleDeleteNode}
                                        onEdit={(node) => router.push(`/editor?id=${gardenId}&nodeId=${node.id}`)}
                                        depth={0}
                                    />
                                </SuruklenebilirAgac>
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
                                    <span className="mt-0.5 hidden text-sm text-sand-600 sm:block">
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
        </div>
    );
}

export default function Bahce_viewPage() {
  return <Suspense fallback={<div>Yükleniyor...</div>}><GardenPageInner /></Suspense>;
}
