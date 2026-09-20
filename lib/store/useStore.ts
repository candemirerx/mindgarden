import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import type { Garden, TreeNode, StoreState } from '../types';

const activeOnly = <T extends { deleted_at?: string | null }>(rows: T[] | null | undefined): T[] =>
    (rows ?? []).filter((row) => !row.deleted_at);

export const useStore = create<StoreState>((set, get) => ({
    gardens: [],
    currentGardenId: null,
    nodes: [],
    selectedNodeId: null,
    isSidebarOpen: false,

    setGardens: (gardens: Garden[]) => set({ gardens: activeOnly(gardens) }),
    setCurrentGarden: (id: string | null) => set({ currentGardenId: id }),
    setSelectedNode: (id: string | null) => set({ selectedNodeId: id }),
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    setSidebarOpen: (open: boolean) => set({ isSidebarOpen: open }),
    resetData: () => set({ gardens: [], nodes: [], currentGardenId: null, selectedNodeId: null }),

    addGarden: async (name: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const sessionResult = await supabase.auth.getSession();
            const session = sessionResult.data.session;
            if (sessionResult.error) {
                return { success: false, error: 'Oturum hatası: ' + sessionResult.error.message };
            }
            if (!session?.user) {
                return { success: false, error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' };
            }

            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from('gardens')
                .insert([{ name, user_id: session.user.id, updated_at: now, deleted_at: null }])
                .select()
                .single();

            if (error) return { success: false, error: error.message };
            if (!data) return { success: false, error: 'Beklenmeyen bir hata oluştu' };

            // Listede en yeni bahçe en üstte görünür; bu sıralama fetchGardens
            // sorgusundaki `created_at` azalan düzeniyle aynı olmalıdır.
            set((state) => ({ gardens: [data as Garden, ...state.gardens] }));
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' };
        }
    },

    updateGardenName: async (id: string, name: string) => {
        const updatedAt = new Date().toISOString();
        const previous = get().gardens;
        set((state) => ({
            gardens: state.gardens.map((garden) =>
                garden.id === id ? { ...garden, name, updated_at: updatedAt } : garden
            ),
        }));

        const { error } = await supabase
            .from('gardens')
            .update({ name, updated_at: updatedAt })
            .eq('id', id);

        if (error) {
            console.error('Bahçe adı güncellenirken hata:', error);
            set({ gardens: previous });
        }
    },

    deleteGarden: async (id: string) => {
        try {
            const deletedAt = new Date().toISOString();
            const nodeResult = await supabase
                .from('nodes')
                .update({ deleted_at: deletedAt, updated_at: deletedAt })
                .eq('garden_id', id);
            if (nodeResult.error) throw nodeResult.error;

            const gardenResult = await supabase
                .from('gardens')
                .update({ deleted_at: deletedAt, updated_at: deletedAt })
                .eq('id', id);
            if (gardenResult.error) throw gardenResult.error;

            set((state) => ({
                gardens: state.gardens.filter((garden) => garden.id !== id),
                nodes: state.nodes.filter((node) => node.garden_id !== id),
                currentGardenId: state.currentGardenId === id ? null : state.currentGardenId,
                selectedNodeId: state.nodes.some(
                    (node) => node.garden_id === id && node.id === state.selectedNodeId
                ) ? null : state.selectedNodeId,
            }));
        } catch (error) {
            console.error('Bahçe silinirken hata:', error);
        }
    },

    fetchGardens: async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
            const { data, error } = await supabase
                .from('gardens')
                .select('*')
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .abortSignal(controller.signal);
            if (error) throw error;
            set({ gardens: activeOnly(data as Garden[]) });
        } catch (error) {
            console.error('Bahçeler yüklenirken hata:', error);
            set({ gardens: [] });
        } finally {
            clearTimeout(timeoutId);
        }
    },

    setNodes: (nodes: TreeNode[]) => set({ nodes: activeOnly(nodes) }),

    addNode: async (
        gardenId: string,
        content: string,
        parentId: string | null = null,
        position = { x: 250, y: 100 }
    ) => {
        try {
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from('nodes')
                .insert([{
                    garden_id: gardenId,
                    parent_id: parentId,
                    content,
                    position_x: position.x,
                    position_y: position.y,
                    is_expanded: true,
                    updated_at: now,
                    deleted_at: null,
                }])
                .select()
                .single();

            if (error) throw error;
            if (!data) return null;
            set((state) => ({ nodes: [...state.nodes, data as TreeNode] }));
            return data as TreeNode;
        } catch (error) {
            console.error('Node eklenirken hata:', error);
            return null;
        }
    },

    updateNode: async (id: string, content: string) => {
        try {
            const updatedAt = new Date().toISOString();
            const { error } = await supabase
                .from('nodes')
                .update({ content, updated_at: updatedAt })
                .eq('id', id);
            if (error) throw error;
            set((state) => ({
                nodes: state.nodes.map((node) =>
                    node.id === id ? { ...node, content, updated_at: updatedAt } : node
                ),
            }));
        } catch (error) {
            console.error('Node güncellenirken hata:', error);
        }
    },

    updateNodePosition: async (id: string, x: number, y: number) => {
        try {
            const updatedAt = new Date().toISOString();
            const { error } = await supabase
                .from('nodes')
                .update({ position_x: x, position_y: y, updated_at: updatedAt })
                .eq('id', id);
            if (error) throw error;
            set((state) => ({
                nodes: state.nodes.map((node) =>
                    node.id === id
                        ? { ...node, position_x: x, position_y: y, updated_at: updatedAt }
                        : node
                ),
            }));
        } catch (error) {
            console.error('Node pozisyonu güncellenirken hata:', error);
        }
    },

    deleteNode: async (id: string) => {
        try {
            const allNodes = get().nodes;
            const doomed = new Set<string>([id]);
            let changed = true;
            while (changed) {
                changed = false;
                for (const node of allNodes) {
                    if (node.parent_id && doomed.has(node.parent_id) && !doomed.has(node.id)) {
                        doomed.add(node.id);
                        changed = true;
                    }
                }
            }

            const deletedAt = new Date().toISOString();
            const { error } = await supabase
                .from('nodes')
                .update({ deleted_at: deletedAt, updated_at: deletedAt })
                .in('id', Array.from(doomed));
            if (error) throw error;

            set((state) => ({
                nodes: state.nodes.filter((node) => !doomed.has(node.id)),
                selectedNodeId: state.selectedNodeId && doomed.has(state.selectedNodeId)
                    ? null
                    : state.selectedNodeId,
            }));
        } catch (error) {
            console.error('Node silinirken hata:', error);
        }
    },

    fetchNodes: async (gardenId: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
            const { data, error } = await supabase
                .from('nodes')
                .select('*')
                .eq('garden_id', gardenId)
                .is('deleted_at', null)
                .order('created_at', { ascending: true })
                .abortSignal(controller.signal);
            if (error) throw error;
            set({ nodes: activeOnly(data as TreeNode[]), currentGardenId: gardenId });
        } catch (error) {
            console.error('Node\'lar yüklenirken hata:', error);
            set({ nodes: [], currentGardenId: gardenId });
        } finally {
            clearTimeout(timeoutId);
        }
    },

    updateGardenViewState: async (id: string, viewState: { x: number; y: number; zoom: number }) => {
        try {
            const updatedAt = new Date().toISOString();
            set((state) => ({
                gardens: state.gardens.map((garden) =>
                    garden.id === id
                        ? { ...garden, view_state: viewState, updated_at: updatedAt }
                        : garden
                ),
            }));
            const { error } = await supabase
                .from('gardens')
                .update({ view_state: viewState, updated_at: updatedAt })
                .eq('id', id);
            if (error) throw error;
        } catch (error) {
            console.error('Bahçe görünümü güncellenirken hata:', error);
        }
    },

    toggleNodeExpansion: async (id: string, isExpanded: boolean) => {
        try {
            const updatedAt = new Date().toISOString();
            set((state) => ({
                nodes: state.nodes.map((node) =>
                    node.id === id
                        ? { ...node, is_expanded: isExpanded, updated_at: updatedAt }
                        : node
                ),
            }));
            const { error } = await supabase
                .from('nodes')
                .update({ is_expanded: isExpanded, updated_at: updatedAt })
                .eq('id', id);
            if (error) throw error;
        } catch (error) {
            console.error('Node genişletme durumu güncellenirken hata:', error);
        }
    },

    toggleNodeType: async (id: string, currentType: 'branch' | 'leaf' | 'auto') => {
        try {
            const nextType = currentType === 'auto' ? 'branch' : currentType === 'branch' ? 'leaf' : 'auto';
            const updatedAt = new Date().toISOString();
            set((state) => ({
                nodes: state.nodes.map((node) =>
                    node.id === id
                        ? { ...node, node_type: nextType, updated_at: updatedAt }
                        : node
                ),
            }));
            const { error } = await supabase
                .from('nodes')
                .update({ node_type: nextType, updated_at: updatedAt })
                .eq('id', id);
            if (error) throw error;
        } catch (error) {
            console.error('Node tipi güncellenirken hata:', error);
        }
    },

    /**
     * Dalın rengini kaydeder. Yerel durum önce güncellenir; böylece renk
     * seçimi her modda anında görünür, kalıcılık hatası kullanıcıyı kesmez.
     */
    setNodeColor: async (id: string, color: string | null) => {
        try {
            const updatedAt = new Date().toISOString();
            set((state) => ({
                nodes: state.nodes.map((node) =>
                    node.id === id ? { ...node, color, updated_at: updatedAt } : node
                ),
            }));
            const { error } = await supabase
                .from('nodes')
                .update({ color, updated_at: updatedAt })
                .eq('id', id);
            if (error) throw error;
        } catch (error) {
            console.error('Dal rengi güncellenirken hata:', error);
        }
    },
}));
