'use client';
import './garden.css';

import { useEffect, Suspense, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { ArrowLeft, Sprout, Settings2, List, TreePine, X } from 'lucide-react';
import { useBudamaModu } from '@/components/ui/BudananlarDugmesi';
import { budamaFiltresi } from '@/lib/uiPrefs';
import { GardenCanvas } from '@/components/canvas/GardenCanvas';
import { YeniAgac } from '@/components/canvas/YeniAgac';
import { SeciliEylemler } from '@/components/canvas/SeciliEylemler';
import { useKoyuTema, useTuvalTercihleri } from '@/lib/tuvalTercihleri';
import { TreeManagementModal } from '@/components/canvas/TreeManagementModal';
import { Modal } from '@/components/editor/Modal';
import { MindTextEditor } from '@/components/editor/MindTextEditor';
import Sidebar from '@/components/layout/Sidebar';
import PromptModal from '@/components/ui/PromptModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { hapticTick } from '@/components/mobile/MobileShell';
import { agacSuruklemesiBasladi, agacSuruklemesiBitti } from '@/lib/canvasGesture';
import { sonrakiRenk } from '@/lib/branchColors';
import { siraliAdEtkin, siraliAd } from '@/lib/tools';
import { MindNode } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Menüden taşıma seçildikten sonra ağacı sürükleyerek konumlandırır.
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
    const [tasimaHazir, setTasimaHazir] = useState(false);
    const alanRef = useRef<HTMLLIElement>(null);
    const baslangic = useRef({ fareX: 0, fareY: 0, kayX: 0, kayY: 0, olcek: 1 });
    const suruklendi = useRef(false);

    useEffect(() => {
        const alan = alanRef.current;
        const hazirla = (e: Event) => setTasimaHazir(e.target instanceof Node && !!alan?.contains(e.target));
        const iptal = (e: KeyboardEvent) => { if (e.key === 'Escape') setTasimaHazir(false); };
        document.addEventListener('nb-agac-tasi', hazirla);
        window.addEventListener('keydown', iptal);
        return () => {
            document.removeEventListener('nb-agac-tasi', hazirla);
            window.removeEventListener('keydown', iptal);
        };
    }, []);

    useEffect(() => {
        if (!tasimaHazir) return;
        const disari = (e: PointerEvent) => {
            if (e.target instanceof Node && !alanRef.current?.contains(e.target)) setTasimaHazir(false);
        };
        document.addEventListener('pointerdown', disari);
        return () => document.removeEventListener('pointerdown', disari);
    }, [tasimaHazir]);

    // Konum dışarıdan değişirse (senkron vb.) ve o an sürükleme yoksa uygula
    useEffect(() => {
        if (!surukluyor) {
            setKaydirma({ x, y });
        }
    }, [x, y, surukluyor]);

    // Bileşen ekrandan kalkarsa tuvali kilitli bırakma
    useEffect(() => () => {
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
        if (!tasimaHazir || !e.isPrimary) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        // Düğmelere uzun basmak ağacı taşımaya başlatmasın; düğmeler
        // kendi işlerini yapmaya devam etsin.
        if ((e.target as HTMLElement).closest('button')) return;

        // Ağaç yalnızca bir düğüm kartından tutularak taşınır. Tuvalin boş
        // bir yerine uzun basmak ağacı kaldırmaz; o dokunuş tuvali kaydırır
        // ve seçimi kaldırır.
        if (!(e.target as HTMLElement).closest('.dugum-karti')) return;

        baslangic.current = {
            fareX: e.clientX,
            fareY: e.clientY,
            kayX: kaydirma.x,
            kayY: kaydirma.y,
            olcek: olcekOku()
        };
        suruklendi.current = true;

        const hedef = e.currentTarget as HTMLElement;
        setSurukluyor(true);
        agacSuruklemesiBasladi();
        void hapticTick();
        hedef.setPointerCapture(e.pointerId);
        e.stopPropagation();
    };

    const hareket = (e: React.PointerEvent) => {
        if (!surukluyor) return;

        e.stopPropagation();
        suruklendi.current = true;
        setKaydirma(fareFarki(e));
    };

    const bitir = (e: React.PointerEvent) => {
        if (!surukluyor) return;

        e.stopPropagation();
        setSurukluyor(false);
        setTasimaHazir(false);
        // Tuval yeniden kaydırılabilir.
        agacSuruklemesiBitti();

        if (e.type === 'pointercancel') { setKaydirma({ x, y }); return; }
        const son = fareFarki(e);
        onMove(Math.round(son.x), Math.round(son.y));
    };

    return (
        <li
            ref={alanRef}
            onPointerDown={basla}
            onPointerMove={hareket}
            onPointerUp={bitir}
            onPointerCancel={bitir}
            onClickCapture={(e) => {
                // Sürüklemeden sonra oluşan tıklamayı yut; düğüm seçilmesin
                if (suruklendi.current && e.detail > 0 && !(e.target as Element).closest('button')) {
                    e.stopPropagation();
                    e.preventDefault();
                    suruklendi.current = false;
                }
            }}
            data-agac-alani
            data-agac-tasima={tasimaHazir ? '1' : undefined}
            className={`tree-drag-area relative ${surukluyor ? 'z-50' : ''}`}
            style={{
                transform: `translate(${kaydirma.x}px, ${kaydirma.y}px)`,
                touchAction: surukluyor ? 'none' : 'auto',
                transition: surukluyor ? 'none' : 'transform 0.15s ease-out',
                cursor: surukluyor ? 'grabbing' : tasimaHazir ? 'grab' : undefined,
                // Taşınan ağaç, elin altında olduğu anlaşılsın diye hafifçe öne çıkar
                filter: surukluyor ? 'drop-shadow(0 12px 18px rgba(41, 37, 30, 0.22))' : undefined
            }}
        >
            {tasimaHazir && <span className="agac-tasima-etiket" role="status">Ağacı sürükle
                <button type="button" aria-label="Taşımayı iptal et" onClick={e => { e.stopPropagation(); setTasimaHazir(false); }}><X size={15} /></button>
            </span>}
            {children}
        </li>
    );
}

function GardenPageInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const gardenId = searchParams.get('id') || '';

    const { gardens, nodes, fetchGardens, fetchNodes, setCurrentGarden, addNode, updateNode, updateNodePosition, deleteNode: deleteNodeFromStore, toggleNodeType, setNodePruned, setNodeColor, setSelectedNode, selectedNodeId } = useStore();
    const [isLoading, setIsLoading] = useState(true);
    const [mindRoots, setMindRoots] = useState<MindNode[]>([]); // Birden fazla ağaç için array
    const [ortalanacak, setOrtalanacak] = useState<{ id: string; sayac: number } | null>(null);
    const [editingNode, setEditingNode] = useState<MindNode | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const budamaModu = useBudamaModu();
    const gorunenAgaclar = budamaFiltresi(mindRoots, budamaModu);
    const tuval = useTuvalTercihleri();
    const koyuTema = useKoyuTema();
    const notSayisi = (n: MindNode): number => 1 + n.children.reduce((t, c) => t + notSayisi(c), 0);

    // Modals state
    const [promptConfig, setPromptConfig] = useState<{isOpen: boolean, title: string, placeholder?: string, allowEmpty?: boolean, onConfirm: (val: string) => void}>({isOpen: false, title: '', onConfirm: () => {}});
    const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, description: string, isDanger?: boolean, onConfirm: () => void}>({isOpen: false, title: '', description: '', onConfirm: () => {}});

    const currentGarden = gardens.find((g: any) => g.id === gardenId);

    // Supabase node'larını MindNode ağaçlarına dönüştür (birden fazla root destekler)
    const convertToMindTrees = useCallback((nodes: any[]): MindNode[] => {
        if (nodes.length === 0) return [];

        // Tüm root node'ları bul (parent_id === null)
        // Ağaçlar oluşturulma zamanına göre yan yana dizilir (stabil sıralama).
        const rootNodes = nodes.filter(n => n.parent_id === null)
            .sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')));

        const buildTree = (nodeId: string): MindNode => {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return { id: nodeId, title: 'Hata', content: '', children: [] };

            const children = nodes
                .filter(n => n.parent_id === nodeId)
                .sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))
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
        // Ad her zaman boş bırakılabilir; sıra numarası aracı kapalıysa
        // anlaşılır bir varsayılan ad verilir.
        const adIzinli = siraliAdEtkin();
        const varsayilan = 'Yeni Ağaç';
        setPromptConfig({
            isOpen: true,
            title: 'Yeni Ağaç Ekle',
            placeholder: adIzinli
                ? 'Ad girin (boş bırakılırsa sıra numarası verilir)...'
                : `Ad girin (boş bırakılırsa "${varsayilan}" yazılır)...`,
            allowEmpty: true,
            onConfirm: async (title) => {
                setPromptConfig(prev => ({ ...prev, isOpen: false }));
                const ad = title || (adIzinli ? siraliAd(null, nodes) : varsayilan);
                const yeni = await addNode(gardenId, ad, null, { x: 0, y: 0 });
                if (yeni) setOrtalanacak(o => ({ id: yeni.id, sayac: (o?.sayac ?? 0) + 1 }));
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

    /** Düğümün derinliği: kök 0, kökün çocukları (dallar) 1, daha derinler (yapraklar) 2+. */
    const derinlikBul = (nodeId: string): number => {
        const ara = (dugum: MindNode, d: number): number => {
            if (dugum.id === nodeId) return d;
            for (const cocuk of dugum.children) { const b = ara(cocuk, d + 1); if (b >= 0) return b; }
            return -1;
        };
        for (const kok of mindRoots) { const d = ara(kok, 0); if (d >= 0) return d; }
        return -1;
    };

    // Bir ağacın hemen yanına yeni ağaç ekle (kök düğümün "Ağaç Ekle" düğmesi)
    const handleAddTreeBeside = (rootId: string) => {
        const adIzinli = siraliAdEtkin();
        const varsayilan = 'Yeni Ağaç';
        setPromptConfig({
            isOpen: true,
            title: 'Ağaç Ekle',
            placeholder: adIzinli
                ? 'Ad girin (boş bırakılırsa sıra numarası verilir)...'
                : `Ad girin (boş bırakılırsa "${varsayilan}" yazılır)...`,
            allowEmpty: true,
            onConfirm: async (title) => {
                setPromptConfig(prev => ({ ...prev, isOpen: false }));
                const ad = title || (adIzinli ? siraliAd(null, nodes) : varsayilan);
                // Ağaçlar oluşturulma sırasıyla yan yana dizilir: yeni ağaç, bu ağaçla
                // sonraki ağacın arasına düşecek bir oluşturma zamanı alır.
                const kokler = nodes.filter(n => n.parent_id === null)
                    .sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')));
                const sira = kokler.findIndex(n => n.id === rootId);
                let createdAt: string | undefined;
                if (sira >= 0 && sira < kokler.length - 1) {
                    const t0 = Date.parse(kokler[sira].created_at), t1 = Date.parse(kokler[sira + 1].created_at);
                    if (Number.isFinite(t0) && Number.isFinite(t1)) createdAt = new Date(t0 + Math.max(1, Math.floor((t1 - t0) / 2))).toISOString();
                }
                const yeni = await addNode(gardenId, ad, null, { x: 0, y: 0 }, createdAt);
                if (yeni) {
                    setSelectedNode(yeni.id);
                    setOrtalanacak(o => ({ id: yeni.id, sayac: (o?.sayac ?? 0) + 1 }));
                }
            }
        });
    };

    // Alt node ekle
    /**
     * Yan not: verilen notun hemen yanına (sonrasına) kardeş ekler. Kardeşler
     * oluşturulma zamanına göre dizildiği için yeni not, bu notla bir sonraki
     * kardeşin arasına düşecek bir zaman alır.
     */
    const handleAddSiblingAfter = (siblingId: string) => {
        const kardes = nodes.find(n => n.id === siblingId);
        if (!kardes || !kardes.parent_id) return;
        handleAddChild(kardes.parent_id, 'right', siblingId);
    };

    const handleAddChild = (parentId: string, direction: 'left' | 'right' = 'right', sonrasina?: string) => {
        if (mindRoots.length === 0) return;

        const adIzinli = siraliAdEtkin();
        // Kökün altına dal, dalın ve yaprağın altına yaprak eklenir.
        const yaprak = derinlikBul(parentId) >= 1;
        const varsayilan = yaprak ? 'Yeni Yaprak' : 'Yeni Dal';
        setPromptConfig({
            isOpen: true,
            title: yaprak ? 'Yaprak Ekle' : 'Dal Ekle',
            placeholder: adIzinli
                ? 'Ad girin (boş bırakılırsa sıra numarası verilir)...'
                : `Ad girin (boş bırakılırsa "${varsayilan}" yazılır)...`,
            allowEmpty: true,
            onConfirm: async (title) => {
                setPromptConfig(prev => ({ ...prev, isOpen: false }));
                // Sıralı ad aracı açıkken boş ad, seviyedeki sıra numarasına dönüşür.
                const ad = title || (adIzinli ? siraliAd(parentId, nodes) : varsayilan);
                // Yan not: bu kardeşle sonraki kardeşin arasına düşecek oluşturma zamanı
                let createdAt: string | undefined;
                if (sonrasina) {
                    const kardesler = nodes.filter(n => n.parent_id === parentId)
                        .sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')));
                    const sira = kardesler.findIndex(n => n.id === sonrasina);
                    if (sira >= 0 && sira < kardesler.length - 1) {
                        const t0 = Date.parse(kardesler[sira].created_at), t1 = Date.parse(kardesler[sira + 1].created_at);
                        if (Number.isFinite(t0) && Number.isFinite(t1)) createdAt = new Date(t0 + Math.max(1, Math.floor((t1 - t0) / 2))).toISOString();
                    }
                }
                // Supabase'e kaydet ve gerçek node'u al
                const newNode = await addNode(gardenId, ad, parentId, { x: 0, y: 0 }, createdAt);

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
                    const result = sonrasina ? null : findNodeInTrees(parentId);
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

                    // Odak yeni dala geçsin: seçili olduğu için eylem
                    // düğmeleri hemen çevresinde görünür.
                    setSelectedNode(newNode.id);
                    setOrtalanacak(o => ({ id: newNode.id, sayac: (o?.sayac ?? 0) + 1 }));
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

    /**
     * Düğüm tipini dala/yaprağa çevirir.
     *
     * Ağaç yönetiminden çağrılır; ağaç ağacı yeniden kurulduğu için ekran
     * kendiliğinden güncellenir.
     */
    const handleToggleNodeType = async (nodeId: string, currentType: 'branch' | 'leaf' | 'auto') => {
        const sonraki = currentType === 'auto' ? 'branch' : currentType === 'branch' ? 'leaf' : 'auto';
        await toggleNodeType(nodeId, currentType);
        setMindRoots((onceki) =>
            onceki.map((kok) => modifyNode(kok, nodeId, (dugum) => ({ ...dugum, nodeType: sonraki })))
        );
    };

    /** Düğümü budama durumuna alır veya geri alır. */
    const handleTogglePrune = async (nodeId: string, isPruned: boolean) => {
        await setNodePruned(nodeId, !isPruned);
        setMindRoots((onceki) =>
            onceki.map((kok) => modifyNode(kok, nodeId, (dugum) => ({ ...dugum, isPruned: !isPruned })))
        );
    };

    /**
     * Dal rengini sıradaki renge çevirip kaydeder.
     *
     * Ağaç yönetiminden çağrılır. Renk notun kendi kaydına yazıldığı için
     * pencere kapanıp açıldığında da seçim korunur; kaydedilemezse ekranda
     * eski renk kalır ve çağırana `false` döner.
     */
    const handleCycleNodeColor = async (nodeId: string, mevcutRenk: string | null) => {
        const sonraki = sonrakiRenk(mevcutRenk);
        const kaydedildi = await setNodeColor(nodeId, sonraki);
        if (kaydedildi) {
            setMindRoots((onceki) =>
                onceki.map((kok) => modifyNode(kok, nodeId, (dugum) => ({ ...dugum, color: sonraki })))
            );
        }
        return kaydedildi;
    };

    /**
     * Düğümü doğrudan siler.
     *
     * Ağaç yönetimi kendi onay penceresini gösterdiği için burada ikinci
     * bir onay istenmez.
     */
    const handleDeleteNodeDirect = async (nodeId: string) => {
        await deleteNodeFromStore(nodeId);
        setMindRoots((onceki) => {
            const kokIndeksi = onceki.findIndex((kok) => kok.id === nodeId);
            if (kokIndeksi !== -1) return onceki.filter((_, i) => i !== kokIndeksi);
            return onceki
                .map((kok) => deleteNodeRecursive(kok, nodeId))
                .filter((kok): kok is MindNode => kok !== null);
        });
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
            <main className="flex min-h-screen items-center justify-center bg-paper p-6">
                <div className="rounded-3xl border border-sand-200 bg-white p-10 text-center shadow-lift">
                    <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-clay-100 text-clay-700">
                        <TreePine size={28} />
                    </span>
                    <h1 className="text-xl text-sand-900">Bahçe bulunamadı</h1>
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
            </main>
        );
    }

    return (
        <div className="garden-page h-[100dvh] flex flex-col overflow-hidden">
            {/* Header - Mobil Responsive */}
            <header className="relative z-40 flex h-[calc(3.5rem+env(safe-area-inset-top,0px))] items-center justify-between gap-3 border-b border-sand-200 bg-white/85 px-3 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md md:h-[calc(4rem+env(safe-area-inset-top,0px))] md:px-6">
                <div className="flex min-w-0 flex-1 items-center gap-1.5 md:gap-2">
                    <button
                        onClick={() => router.push('/')}
                        aria-label="Ana sayfa"
                        title="Ana Sayfa"
                        className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sand-600 transition-colors duration-200 hover:bg-sand-100 hover:text-sand-800 touch-manipulation"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-base text-sand-900 md:text-lg">{currentGarden.name}</h1>
                        <p className="hidden text-xs text-sand-600 sm:block">
                            {mindRoots.length > 0 ? `${mindRoots.length} ağaç` : 'Henüz ağaç yok'}
                        </p>
                    </div>
                </div>

                {/* Görünüm ve ayarlar: tek düğme grubu (yeni ağaç kök kartındaki "Ağaç ekle" ile eklenir) */}
                <div className="flex flex-shrink-0 items-center rounded-2xl border border-sand-200 bg-sand-50 p-1">
                    <button
                        onClick={() => router.push(`/projeler?id=${gardenId}`)}
                        aria-label="Liste görünümüne geç"
                        title="Liste görünümüne geç"
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-sand-700 transition-colors duration-200 hover:bg-white hover:text-sand-900 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40 touch-manipulation"
                    >
                        <List size={18} aria-hidden="true" />
                        <span className="hidden sm:inline">Liste</span>
                    </button>
                    <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-sand-200" />
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        aria-label="Tuval ve ağaç ayarları"
                        title="Tuval ve ağaç ayarları"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-sand-700 transition-colors duration-200 hover:bg-white hover:text-sand-900 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40 touch-manipulation"
                    >
                        <Settings2 size={18} aria-hidden="true" />
                    </button>
                </div>
            </header>

            {/* Tuval */}
            <main className="flex-1 min-h-0 relative overflow-hidden">
                <GardenCanvas gardenId={gardenId} initialViewState={currentGarden.view_state} ortalanacak={ortalanacak}
                    gezinme={tuval.gezinme} agacDizilisi={tuval.gosterim === 'yatay' ? 'alt' : 'yan'}
                    agaclar={gorunenAgaclar.map(a => ({ id: a.id, ad: a.title, sayi: notSayisi(a) }))}>
                    {mindRoots.length > 0 ? (
                        <ul className={tuval.gosterim === 'yatay' ? 'flex flex-col gap-24' : 'flex items-start gap-28'}>
                            {gorunenAgaclar.map((root) => (
                                <SuruklenebilirAgac
                                    key={root.id}
                                    x={nodes.find((n) => n.id === root.id)?.position_x ?? 0}
                                    y={nodes.find((n) => n.id === root.id)?.position_y ?? 0}
                                    onMove={(x, y) => {
                                        void updateNodePosition(root.id, x, y);
                                    }}
                                >
                                        <YeniAgac
                                            node={root}
                                            onAddSiblingAfter={handleAddSiblingAfter}
                                            duzen={tuval.gosterim}
                                            onizleme={tuval.onizleme}
                                            eylem={tuval.eylem}
                                            kart={koyuTema ? tuval.kartKoyu : tuval.kart}
                                            onAddChild={handleAddChild}
                                            onAddTree={handleAddTreeBeside}
                                            onEdit={(node) => router.push(`/editor?id=${gardenId}&nodeId=${node.id}`)}
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
                {(
                    <SeciliEylemler
                        kip={tuval.eylem}
                        kokler={mindRoots}
                        seciliId={selectedNodeId}
                        onKapat={() => setSelectedNode(null)}
                        onEdit={(node) => router.push(`/editor?id=${gardenId}&nodeId=${node.id}`)}
                        onYanina={handleAddSiblingAfter}
                        onAltina={(id) => handleAddChild(id, 'right')}
                        onAgacEkle={handleAddTreeBeside}
                        onBuda={(id, budandi) => void handleTogglePrune(id, budandi)}
                    />
                )}
            </main>

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
                bahceAdi={currentGarden?.name}
                trees={mindRoots}
                onRenameTree={handleRenameTree}
                onDeleteTree={handleDeleteTree}
                onToggleType={handleToggleNodeType}
                onTogglePrune={handleTogglePrune}
                onCycleColor={handleCycleNodeColor}
                onDeleteNode={handleDeleteNodeDirect}
            />

            {/* Sidebar */}
            <Sidebar />

            <PromptModal
                isOpen={promptConfig.isOpen}
                title={promptConfig.title}
                placeholder={promptConfig.placeholder}
                allowEmpty={promptConfig.allowEmpty}
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
