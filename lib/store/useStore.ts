import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import type { Garden, TreeNode, StoreState } from '../types';

export const useStore = create<StoreState>((set, get) => ({
    // Initial state
    gardens: [],
    currentGardenId: null,
    nodes: [],
    selectedNodeId: null,
    isSidebarOpen: false,

    // Garden actions
    setGardens: (gardens: Garden[]) => set({ gardens }),

    setCurrentGarden: (id: string | null) => set({ currentGardenId: id }),
    setSelectedNode: (id: string | null) => set({ selectedNodeId: id }),
    
    // Sidebar actions
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    setSidebarOpen: (open: boolean) => set({ isSidebarOpen: open }),

    addGarden: async (name: string): Promise<{ success: boolean; error?: string }> => {
        try {
            console.log('addGarden called with name:', name);
            
            // Önce session'ı kontrol et (getUser yerine getSession daha güvenilir)
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            console.log('Session check:', { hasSession: !!session, hasUser: !!session?.user, sessionError });
            
            if (sessionError) {
                console.error('Session error:', sessionError);
                return { success: false, error: 'Oturum hatası: ' + sessionError.message };
            }
            
            if (!session?.user) {
                console.error('No session or user found');
                return { success: false, error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' };
            }

            console.log('Inserting garden for user:', session.user.id);
            
            // Timeout ile Supabase isteği
            const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('İstek zaman aşımına uğradı')), 15000)
            );
            
            const insertPromise = supabase
                .from('gardens')
                .insert([{ name, user_id: session.user.id }])
                .select()
                .single();
            
            const { data, error } = await Promise.race([insertPromise, timeoutPromise]);

            console.log('Insert result:', { data, error });

            if (error) {
                console.error('Supabase insert error:', error);
                return { success: false, error: error.message };
            }

            if (data) {
                set((state) => ({
                    gardens: [...state.gardens, data as Garden],
                }));
                console.log('Garden created successfully');
                return { success: true };
            }
            
            return { success: false, error: 'Beklenmeyen bir hata oluştu' };
        } catch (error) {
            console.error('Bahçe eklenirken hata:', error);
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
            return { success: false, error: errorMessage };
        }
    },

    updateGardenName: async (id: string, name: string) => {
        try {
            // Optimistic update
            set((state) => ({
                gardens: state.gardens.map((g) =>
                    g.id === id ? { ...g, name } : g
                ),
            }));

            const { error } = await supabase
                .from('gardens')
                .update({ name })
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Bahçe adı güncellenirken hata:', error);
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
                        is_expanded: true,
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

    updateGardenViewState: async (id: string, viewState: { x: number; y: number; zoom: number }) => {
        try {
            // Optimistic update
            set((state) => ({
                gardens: state.gardens.map((g) =>
                    g.id === id ? { ...g, view_state: viewState } : g
                ),
            }));

            const { error } = await supabase
                .from('gardens')
                .update({ view_state: viewState })
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Bahçe görünümü güncellenirken hata:', JSON.stringify(error, null, 2));
        }
    },

    toggleNodeExpansion: async (id: string, isExpanded: boolean) => {
        try {
            // Optimistic update
            set((state) => ({
                nodes: state.nodes.map((n) =>
                    n.id === id ? { ...n, is_expanded: isExpanded } : n
                ),
            }));

            const { error } = await supabase
                .from('nodes')
                .update({ is_expanded: isExpanded })
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Node genişletme durumu güncellenirken hata:', JSON.stringify(error, null, 2));
        }
    },
}));
