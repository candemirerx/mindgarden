import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import type { Garden, TreeNode, StoreState } from '../types';

export const useStore = create<StoreState>((set, get) => ({
    // Initial state
    gardens: [],
    currentGardenId: null,
    nodes: [],

    // Garden actions
    setGardens: (gardens: Garden[]) => set({ gardens }),

    setCurrentGarden: (id: string | null) => set({ currentGardenId: id }),

    addGarden: async (name: string) => {
        try {
            const { data, error } = await supabase
                .from('gardens')
                .insert([{ name }])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                set((state) => ({
                    gardens: [...state.gardens, data as Garden],
                }));
            }
        } catch (error) {
            console.error('Bahçe eklenirken hata:', error);
        }
    },

    deleteGarden: async (id: string) => {
        try {
            // Önce bu bahçeye ait tüm node'ları sil
            await supabase.from('nodes').delete().eq('garden_id', id);

            // Sonra bahçeyi sil
            const { error } = await supabase.from('gardens').delete().eq('id', id);

            if (error) throw error;

            set((state) => ({
                gardens: state.gardens.filter((g) => g.id !== id),
                currentGardenId: state.currentGardenId === id ? null : state.currentGardenId,
            }));
        } catch (error) {
            console.error('Bahçe silinirken hata:', error);
        }
    },

    fetchGardens: async () => {
        try {
            const { data, error } = await supabase
                .from('gardens')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            set({ gardens: (data as Garden[]) || [] });
        } catch (error) {
            console.error('Bahçeler yüklenirken hata:', error);
        }
    },

    // Node actions
    setNodes: (nodes: TreeNode[]) => set({ nodes }),

    addNode: async (
        gardenId: string,
        content: string,
        parentId: string | null = null,
        position = { x: 250, y: 100 }
    ) => {
        try {
            const { data, error } = await supabase
                .from('nodes')
                .insert([
                    {
                        garden_id: gardenId,
                        parent_id: parentId,
                        content,
                        position_x: position.x,
                        position_y: position.y,
                    },
                ])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                set((state) => ({
                    nodes: [...state.nodes, data as TreeNode],
                }));
                return data as TreeNode;
            }
            return null;
        } catch (error) {
            console.error('Node eklenirken hata:', error);
            return null;
        }
    },

    updateNode: async (id: string, content: string) => {
        try {
            const { error } = await supabase
                .from('nodes')
                .update({ content, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            set((state) => ({
                nodes: state.nodes.map((node) =>
                    node.id === id ? { ...node, content } : node
                ),
            }));
        } catch (error) {
            console.error('Node güncellenirken hata:', error);
        }
    },

    updateNodePosition: async (id: string, x: number, y: number) => {
        try {
            const { error } = await supabase
                .from('nodes')
                .update({ position_x: x, position_y: y })
                .eq('id', id);

            if (error) throw error;

            set((state) => ({
                nodes: state.nodes.map((node) =>
                    node.id === id ? { ...node, position_x: x, position_y: y } : node
                ),
            }));
        } catch (error) {
            console.error('Node pozisyonu güncellenirken hata:', error);
        }
    },

    deleteNode: async (id: string) => {
        try {
            // Bu node'un alt node'larını da sil (cascade)
            const childNodes = get().nodes.filter((n) => n.parent_id === id);

            for (const child of childNodes) {
                await get().deleteNode(child.id);
            }

            const { error } = await supabase.from('nodes').delete().eq('id', id);

            if (error) throw error;

            set((state) => ({
                nodes: state.nodes.filter((node) => node.id !== id),
            }));
        } catch (error) {
            console.error('Node silinirken hata:', error);
        }
    },

    fetchNodes: async (gardenId: string) => {
        try {
            const { data, error } = await supabase
                .from('nodes')
                .select('*')
                .eq('garden_id', gardenId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            set({ nodes: (data as TreeNode[]) || [] });
        } catch (error) {
            console.error('Node\'lar yüklenirken hata:', error);
        }
    },
}));
