'use client';

import { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    ConnectionMode,
    Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Sparkles } from 'lucide-react';

import type { TreeNode, FlowNode, FlowEdge } from '@/lib/types';
import TreeNodeComponent from './TreeNode';
import { useStore } from '@/lib/store/useStore';

interface InfiniteCanvasProps {
    gardenId: string;
    nodes: TreeNode[];
}

// Özel node tipleri
const nodeTypes = {
    treeNode: TreeNodeComponent,
};

// Renk paleti - her node için rastgele atanacak
const COLOR_PALETTE = [
    { bg: 'from-emerald-400 to-teal-500', border: 'border-emerald-500', dot: 'bg-emerald-600' },
    { bg: 'from-blue-400 to-cyan-500', border: 'border-blue-500', dot: 'bg-blue-600' },
    { bg: 'from-purple-400 to-pink-500', border: 'border-purple-500', dot: 'bg-purple-600' },
    { bg: 'from-orange-400 to-red-500', border: 'border-orange-500', dot: 'bg-orange-600' },
    { bg: 'from-green-400 to-lime-500', border: 'border-green-500', dot: 'bg-green-600' },
    { bg: 'from-indigo-400 to-blue-500', border: 'border-indigo-500', dot: 'bg-indigo-600' },
    { bg: 'from-rose-400 to-pink-500', border: 'border-rose-500', dot: 'bg-rose-600' },
    { bg: 'from-amber-400 to-yellow-500', border: 'border-amber-500', dot: 'bg-amber-600' },
];

export default function InfiniteCanvas({ gardenId, nodes: treeNodes }: InfiniteCanvasProps) {
    const { addNode } = useStore();
    const [isAddingNode, setIsAddingNode] = useState(false);

    // TreeNode'ları React Flow node'larına dönüştür
    const initialNodes: FlowNode[] = useMemo(() => {
        return treeNodes.map((node, index) => {
            const colorScheme = COLOR_PALETTE[index % COLOR_PALETTE.length];
            return {
                id: node.id,
                type: 'treeNode',
                position: { x: node.position_x, y: node.position_y },
                data: {
                    label: node.content,
                    content: node.content,
                    nodeId: node.id,
                    parentId: node.parent_id,
                    gardenId: node.garden_id,
                    colorScheme,
                },
            };
        });
    }, [treeNodes]);

    // Parent-child ilişkilerinden edge'leri oluştur
    const initialEdges: FlowEdge[] = useMemo(() => {
        return treeNodes
            .filter((node) => node.parent_id)
            .map((node) => ({
                id: `e-${node.parent_id}-${node.id}`,
                source: node.parent_id!,
                target: node.id,
                type: 'smoothstep',
                style: {
                    stroke: 'url(#edge-gradient)',
                    strokeWidth: 3,
                },
                animated: true,
                markerEnd: {
                    type: 'arrowclosed',
                    color: '#10b981',
                },
            }));
    }, [treeNodes]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({
            ...params,
            type: 'smoothstep',
            animated: true,
            style: { stroke: 'url(#edge-gradient)', strokeWidth: 3 },
        }, eds)),
        [setEdges]
    );

    // Node pozisyonu değiştiğinde
    const handleNodeDragStop = useCallback(
        (_event: React.MouseEvent, node: any) => {
            // Pozisyon güncellemesi için store action'ı çağırılacak
            // TODO: updateNodePosition action'ı eklenecek
            console.log('Node moved:', node.id, node.position);
        },
        []
    );

    // Hızlı node ekleme
    const handleQuickAddNode = async () => {
        setIsAddingNode(true);
        const randomX = Math.random() * 500 + 100;
        const randomY = Math.random() * 300 + 100;

        await addNode(gardenId, 'Yeni Fikir', null, { x: randomX, y: randomY });
        setIsAddingNode(false);
    };

    return (
        <div className="w-full h-full bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 relative">
            {/* SVG Gradient tanımları */}
            <svg width="0" height="0">
                <defs>
                    <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                </defs>
            </svg>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDragStop={handleNodeDragStop}
                nodeTypes={nodeTypes}
                connectionMode={ConnectionMode.Loose}
                fitView
                minZoom={0.1}
                maxZoom={4}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                className="touch-none"
            >
                {/* Arka plan pattern */}
                <Background
                    color="#cbd5e1"
                    gap={20}
                    size={1.5}
                />

                {/* Kontroller */}
                <Controls
                    className="!bg-white/90 backdrop-blur-lg !rounded-2xl !shadow-2xl !border-2 !border-slate-200"
                    showInteractive={false}
                />

                {/* Mini harita */}
                <MiniMap
                    className="!bg-white/90 backdrop-blur-lg !rounded-2xl !shadow-2xl !border-2 !border-slate-200"
                    nodeColor={(node) => {
                        const colorScheme = node.data.colorScheme;
                        return colorScheme ? `#10b981` : '#64748b';
                    }}
                    maskColor="rgba(0, 0, 0, 0.05)"
                    nodeBorderRadius={12}
                />

                {/* Floating Action Button - Hızlı Ekleme */}
                <Panel position="top-right" className="m-4">
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleQuickAddNode}
                            disabled={isAddingNode}
                            className="group relative bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed p-4"
                        >
                            <div className="flex items-center gap-3">
                                {isAddingNode ? (
                                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                                )}
                                <span className="font-semibold text-sm">Hızlı Ekle</span>
                            </div>

                            {/* Glow effect */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 blur-xl opacity-0 group-hover:opacity-50 transition-opacity -z-10" />
                        </button>

                        {/* İpucu kartı */}
                        <div className="bg-white/90 backdrop-blur-lg rounded-xl shadow-lg p-3 border-2 border-purple-200 max-w-xs">
                            <div className="flex items-start gap-2">
                                <Sparkles size={16} className="text-purple-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    <strong className="text-purple-600">İpucu:</strong> Node&apos;ları sürükleyerek taşıyabilir,
                                    bağlantı noktalarından çizerek ilişkilendirebilirsiniz!
                                </p>
                            </div>
                        </div>
                    </div>
                </Panel>

                {/* Boş durum mesajı */}
                {nodes.length === 0 && (
                    <Panel position="top-center" className="m-4">
                        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border-2 border-dashed border-slate-300 max-w-md">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                                    <Sparkles size={40} className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">
                                    Bahçeniz Boş
                                </h3>
                                <p className="text-slate-600 mb-4">
                                    İlk ağacınızı ekleyerek fikirlerinizi büyütmeye başlayın!
                                </p>
                                <button
                                    onClick={handleQuickAddNode}
                                    className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
                                >
                                    İlk Ağacı Ekle
                                </button>
                            </div>
                        </div>
                    </Panel>
                )}
            </ReactFlow>
        </div >
    );
}
