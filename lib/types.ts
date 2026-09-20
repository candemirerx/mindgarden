// Mevcut tipler
export interface Garden {
    id: string;
    name: string;
    created_at: string;
    updated_at?: string;
    deleted_at?: string | null;
    user_id?: string;
    view_state?: {
        x: number;
        y: number;
        zoom: number;
    };
}

export interface TreeNode {
    id: string;
    garden_id: string;
    content: string;
    parent_id: string | null;
    position_x: number;
    position_y: number;
    created_at: string;
    updated_at?: string;
    deleted_at?: string | null;
    is_expanded?: boolean;
    node_type?: 'branch' | 'leaf' | 'auto';
}

// Store State Tipi
export interface StoreState {
    gardens: Garden[];
    currentGardenId: string | null;
    nodes: TreeNode[];
    selectedNodeId: string | null;
    isSidebarOpen: boolean;
    setGardens: (gardens: Garden[]) => void;
    setCurrentGarden: (id: string | null) => void;
    setSelectedNode: (id: string | null) => void;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
    resetData: () => void;
    addGarden: (name: string) => Promise<{ success: boolean; error?: string }>;
    updateGardenName: (id: string, name: string) => Promise<void>;
    deleteGarden: (id: string) => Promise<void>;
    fetchGardens: () => Promise<void>;
    setNodes: (nodes: TreeNode[]) => void;
    addNode: (gardenId: string, content: string, parentId?: string | null, position?: { x: number; y: number }) => Promise<TreeNode | null>;
    updateNode: (id: string, content: string) => Promise<void>;
    updateNodePosition: (id: string, x: number, y: number) => Promise<void>;
    deleteNode: (id: string) => Promise<void>;
    fetchNodes: (gardenId: string) => Promise<void>;
    updateGardenViewState: (id: string, viewState: { x: number; y: number; zoom: number }) => Promise<void>;
    toggleNodeExpansion: (id: string, isExpanded: boolean) => Promise<void>;
    toggleNodeType: (id: string, currentType: 'branch' | 'leaf' | 'auto') => Promise<void>;
}

// Yeni MindMap yapısı için tipler
export interface MindNode {
    id: string;
    title: string;
    content: string;
    children: MindNode[];
    isExpanded?: boolean;
    nodeType?: 'branch' | 'leaf' | 'auto';
}

export interface ViewState {
    scale: number;
    offset: { x: number; y: number };
}

export interface Point {
    x: number;
    y: number;
}

// React Flow tipleri (eski yapı için - gerekirse silinebilir)
export interface FlowNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: {
        label: string;
        content: string;
        nodeId: string;
        parentId: string | null;
        gardenId: string;
        colorScheme?: {
            bg: string;
            border: string;
            dot: string;
        };
    };
}

export interface FlowEdge {
    id: string;
    source: string;
    target: string;
    type?: string;
    style?: any;
    animated?: boolean;
    markerEnd?: any;
}
