'use client';

import { useCallback, useMemo, useState, useRef } from 'react';
import ReactFlow, {
    Background,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    ConnectionMode,
    Panel,
    ReactFlowInstance,
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

    // ReactFlow instance'ı al
    const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);

    // Touch event'leri için state
    const lastTouchDistance = useRef<number | null>(null);
    const isPinching = useRef<boolean>(false);

    // TreeNode'ları React Flow node'larına dönüştür
    const initialNodes: FlowNode[] = useMemo(() => {
        return treeNodes.map((node, index) => {
            const colorScheme = COLOR_PALETTE[index % COLOR_PALETTE.length];
            // İçeriğin ilk satırını başlık olarak al (editör ile tutarlı)
            const firstLine = node.content.split('\n')[0] || node.content;
            return {
                id: node.id,
                type: 'treeNode',
                position: { x: node.position_x, y: node.position_y },
                data: {
                    label: firstLine,
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



    // İki parmak arasındaki mesafeyi hesapla
    const getTouchDistance = (touch1: React.Touch, touch2: React.Touch): number => {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    // İki parmağın merkez noktasını hesapla
    const getTouchCenter = (touch1: React.Touch, touch2: React.Touch): { x: number; y: number } => {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2,
        };
    };

    // Touch start event handler
    const handleTouchStart = useCallback((event: React.TouchEvent) => {
        if (event.touches.length === 2) {
            event.preventDefault();
            event.stopPropagation();

            isPinching.current = true;
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];

            lastTouchDistance.current = getTouchDistance(touch1, touch2);
        }
    }, []);

    // Touch move event handler - zoom-to-touch-position için
    const handleTouchMove = useCallback((event: React.TouchEvent) => {
        if (event.touches.length === 2 && isPinching.current && reactFlowInstance.current && reactFlowWrapper.current) {
            event.preventDefault();
            event.stopPropagation();

            const touch1 = event.touches[0];
            const touch2 = event.touches[1];

            const currentDistance = getTouchDistance(touch1, touch2);
            const touchCenter = getTouchCenter(touch1, touch2);

            if (lastTouchDistance.current !== null) {
                const zoomRatio = currentDistance / lastTouchDistance.current;

                if (Math.abs(zoomRatio - 1.0) < 0.01) return;

                const currentViewport = reactFlowInstance.current.getViewport();
                const oldZoom = currentViewport.zoom;
                const newZoom = Math.max(0.1, Math.min(4, oldZoom * zoomRatio));

                if (Math.abs(newZoom - oldZoom) < 0.001) return;

                const canvasBounds = reactFlowWrapper.current.getBoundingClientRect();

                const pointOnCanvas = {
                    x: touchCenter.x - canvasBounds.left,
                    y: touchCenter.y - canvasBounds.top,
                };

                const pointInFlowSpace = {
                    x: (pointOnCanvas.x - currentViewport.x) / oldZoom,
                    y: (pointOnCanvas.y - currentViewport.y) / oldZoom,
                };

                const newViewport = {
                    x: pointOnCanvas.x - pointInFlowSpace.x * newZoom,
                    y: pointOnCanvas.y - pointInFlowSpace.y * newZoom,
                    zoom: newZoom,
                };

                reactFlowInstance.current.setViewport(newViewport, { duration: 0 });
            }

            lastTouchDistance.current = currentDistance;
        }
    }, []);

    // Touch end event handler
    const handleTouchEnd = useCallback((event: React.TouchEvent) => {
        if (event.touches.length < 2) {
            isPinching.current = false;
            lastTouchDistance.current = null;
        }
    }, []);

    // Wheel event handler - zoom-to-cursor (Masaüstü için)
    const handleWheel = useCallback((event: React.WheelEvent) => {
        if (reactFlowInstance.current && reactFlowWrapper.current) {
            // Sayfa scroll'unu engelle
            try {
                event.preventDefault();
            } catch (e) {
                // ignore
            }

            const { clientX, clientY, deltaY } = event;
            const viewport = reactFlowInstance.current.getViewport();
            const oldZoom = viewport.zoom;

            // Zoom hassasiyeti
            const ZOOM_SPEED = 0.0015;
            const zoomFactor = Math.exp(-deltaY * ZOOM_SPEED);
            const newZoom = Math.max(0.1, Math.min(4, oldZoom * zoomFactor));

            if (Math.abs(newZoom - oldZoom) < 0.001) return;

            const bounds = reactFlowWrapper.current.getBoundingClientRect();

            // Mouse'un canvas üzerindeki pozisyonu
            const mouseX = clientX - bounds.left;
            const mouseY = clientY - bounds.top;

            // Flow space'deki nokta (zoom öncesi)
            const flowX = (mouseX - viewport.x) / oldZoom;
            const flowY = (mouseY - viewport.y) / oldZoom;

            // Yeni pan değerleri (zoom sonrası aynı nokta mouse altında kalsın)
            const newX = mouseX - flowX * newZoom;
            const newY = mouseY - flowY * newZoom;

            reactFlowInstance.current.setViewport({
                x: newX,
                y: newY,
                zoom: newZoom,
            }, { duration: 0 });
        }
    }, []);

    // Hızlı node ekleme
    const handleQuickAddNode = async () => {
        setIsAddingNode(true);
        const randomX = Math.random() * 500 + 100;
        const randomY = Math.random() * 300 + 100;

        await addNode(gardenId, 'Yeni Fikir', null, { x: randomX, y: randomY });
        setIsAddingNode(false);
    };

    return (
        <div
            ref={reactFlowWrapper}
            className="w-full h-full bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 relative"
            style={{ touchAction: 'none' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onWheel={handleWheel}
        >
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
                onInit={(instance) => {
                    reactFlowInstance.current = instance;
                }}
                zoomOnPinch={false}
                zoomOnScroll={false}
                panOnScroll={false}
                zoomOnDoubleClick={false}
                panOnDrag={true}
                preventScrolling={false}
                elementsSelectable={true}
                selectNodesOnDrag={false}
            >
                {/* Arka plan pattern */}
                <Background
                    color="#cbd5e1"
                    gap={20}
                    size={1.5}
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
                                    <strong className="text-purple-600">İpucu:</strong> Düğümleri sürükleyerek taşıyabilir,
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
        </div>
    );
}
