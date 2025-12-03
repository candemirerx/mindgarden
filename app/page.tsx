'use client';

import { useEffect, useState, useCallback, memo, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { supabase } from '@/lib/supabaseClient';
import { Plus, MoreHorizontal, TreePine, Sparkles, LogIn, FolderTree, Layout, Trash2, Clock, Pencil } from 'lucide-react';
import CreateGardenModal from '@/components/bahce/CreateGardenModal';
import type { User } from '@supabase/supabase-js';
import type { Garden } from '@/lib/types';

// Sidebar'ı lazy load et - ilk yüklemede ağırlık yaratmasın
const Sidebar = lazy(() => import('@/components/layout/Sidebar'));

// Garden kartını ayrı component olarak memoize et
const GardenCard = memo(function GardenCard({ 
    garden, 
    isEditing, 
    editingName,
    isMenuOpen,
    onEdit,
    onMenuToggle,
    onNameChange,
    onSaveName,
    onKeyDown,
    onOpenGarden,
    onOpenCanvas,
    onOpenProjects,
    onDelete,
    formatDate
}: {
    garden: Garden;
    isEditing: boolean;
    editingName: string;
    isMenuOpen: boolean;
    onEdit: () => void;
    onMenuToggle: () => void;
    onNameChange: (name: string) => void;
    onSaveName: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onOpenGarden: () => void;
    onOpenCanvas: (e: React.MouseEvent) => void;
    onOpenProjects: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
    formatDate: (date: string) => string;
}) {
    return (
        <div
            onClick={onOpenGarden}
            className="group relative bg-gradient-to-br from-[#f8f6f3] to-[#f0ebe4] rounded-2xl border border-stone-200/60 hover:border-emerald-300/60 hover:shadow-lg transition-all overflow-hidden cursor-pointer"
        >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/30 rounded-full -translate-y-12 translate-x-12" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-amber-100/30 rounded-full translate-y-8 -translate-x-8" />
            
            <div className="relative p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                            <TreePine className="text-white" size={20} />
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editingName}
                                onChange={(e) => onNameChange(e.target.value)}
                                onBlur={onSaveName}
                                onKeyDown={onKeyDown}
                                className="font-bold text-stone-800 text-lg bg-white/80 px-2 py-1 rounded-lg border border-emerald-300 outline-none w-full"
                                autoFocus
                            />
                        ) : (
                            <h3 
                                className="font-bold text-stone-800 truncate text-lg cursor-pointer hover:text-emerald-700"
                                onDoubleClick={onEdit}
                            >
                                {garden.name}
                            </h3>
                        )}
                    </div>
                    
                    <div className="relative flex-shrink-0">
                        <button
                            onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
                            className="p-1.5 hover:bg-white/60 rounded-lg text-stone-400 hover:text-stone-600"
                        >
                            <MoreHorizontal size={18} />
                        </button>
                        
                        {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl py-1 z-10 min-w-[160px]">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50"
                                >
                                    <Pencil size={15} className="text-amber-500" />
                                    <span>Yeniden Adlandır</span>
                                </button>
                                <hr className="my-1 border-stone-100" />
                                <button
                                    onClick={onDelete}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 size={15} />
                                    <span>Bahçeyi Sil</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 text-stone-500 text-sm mb-5">
                    <Clock size={14} />
                    <span>{formatDate(garden.created_at)}</span>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onOpenProjects}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/70 hover:bg-amber-100 text-stone-700 hover:text-amber-800 rounded-xl text-sm font-medium border border-stone-200/50 hover:border-amber-200"
                    >
                        <FolderTree size={16} />
                        <span>Projeler</span>
                    </button>
                    <button
                        onClick={onOpenCanvas}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-sm hover:shadow-md"
                    >
                        <Layout size={16} />
                        <span>Canvas</span>
                    </button>
                </div>
            </div>
        </div>
    );
});

export default function HomePage() {
    const router = useRouter();
    const { gardens, fetchGardens, deleteGarden, updateGardenName, toggleSidebar } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [editingGardenId, setEditingGardenId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    useEffect(() => {
        let mounted = true;

        // İlk yükleme
        const init = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                
                if (!mounted) return;
                
                setUser(session?.user ?? null);
                
                if (session?.user) {
                    await fetchGardens();
                }
            } catch (e) {
                console.error('Init error:', e);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        init();

        // Auth state değişikliklerini dinle
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            
            // INITIAL_SESSION zaten init() tarafından handle ediliyor
            if (event === 'INITIAL_SESSION') return;
            
            console.log('Auth event:', event);
            setUser(session?.user ?? null);
            
            if (event === 'SIGNED_IN' && session?.user) {
                setIsLoading(true);
                try {
                    await fetchGardens();
                } catch (e) {
                    console.error('fetchGardens error:', e);
                } finally {
                    if (mounted) setIsLoading(false);
                }
            } else if (event === 'SIGNED_OUT') {
                useStore.getState().setGardens([]);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [fetchGardens]);

    // Memoized callbacks
    const formatDate = useCallback((dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }, []);

    const handleOpenGarden = useCallback((gardenId: string) => {
        const lastView = localStorage.getItem(`garden-view-${gardenId}`);
        router.push(lastView === 'projects' ? `/bahce/${gardenId}/projeler` : `/bahce/${gardenId}`);
    }, [router]);

    const handleOpenCanvas = useCallback((e: React.MouseEvent, gardenId: string) => {
        e.stopPropagation();
        localStorage.setItem(`garden-view-${gardenId}`, 'canvas');
        router.push(`/bahce/${gardenId}`);
    }, [router]);

    const handleOpenProjects = useCallback((e: React.MouseEvent, gardenId: string) => {
        e.stopPropagation();
        localStorage.setItem(`garden-view-${gardenId}`, 'projects');
        router.push(`/bahce/${gardenId}/projeler`);
    }, [router]);

    const handleDeleteGarden = useCallback(async (e: React.MouseEvent, gardenId: string) => {
        e.stopPropagation();
        if (confirm('Bu bahçeyi silmek istediğinize emin misiniz?')) {
            await deleteGarden(gardenId);
        }
        setOpenMenuId(null);
    }, [deleteGarden]);

    const handleSaveName = useCallback(async (gardenId: string) => {
        const garden = gardens.find(g => g.id === gardenId);
        if (editingName.trim() && editingName !== garden?.name) {
            await updateGardenName(gardenId, editingName.trim());
        }
        setEditingGardenId(null);
        setOpenMenuId(null);
    }, [gardens, editingName, updateGardenName]);

    return (
        <div className="min-h-screen bg-[#f4f1ea] p-4 md:p-8 font-sans">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8 md:mb-12">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 mb-2">
                        <button onClick={toggleSidebar} className="relative group" title="Menü">
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-emerald-700 to-green-800 rounded-2xl flex items-center justify-center shadow-xl">
                                <TreePine className="text-emerald-50" size={32} />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-[#f4f1ea] flex items-center justify-center">
                                <Sparkles size={10} className="text-white" />
                            </div>
                        </button>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-stone-800 font-serif">Not Bahçesi</h1>
                            <p className="text-stone-500 text-sm md:text-base mt-1">Fikirlerinizi toprağa ekin, ağaca dönüşsün.</p>
                        </div>
                    </div>

                    {user && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="w-full md:w-auto bg-[#5D4037] hover:bg-[#4E342E] text-amber-50 px-6 md:px-8 py-3 md:py-4 rounded-xl font-semibold shadow-lg flex items-center justify-center gap-3"
                        >
                            <Plus size={20} />
                            <span className="text-base md:text-lg">Yeni Bahçe Ekle</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-16 h-16 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
                    </div>
                ) : !user ? (
                    <div className="text-center py-20">
                        <div className="bg-white/80 rounded-3xl shadow-xl p-12 max-w-md mx-auto border-2 border-dashed border-emerald-300">
                            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-xl">
                                <TreePine size={48} className="text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-800 mb-3 font-serif">Hoş Geldiniz!</h2>
                            <p className="text-slate-600 mb-8 text-lg">Notlarınızı kaydetmek için giriş yapın.</p>
                            <button
                                onClick={toggleSidebar}
                                className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold inline-flex items-center gap-3"
                            >
                                <LogIn size={24} />
                                <span className="text-lg">Giriş Yap</span>
                            </button>
                        </div>
                    </div>
                ) : gardens.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="bg-white/80 rounded-3xl shadow-xl p-12 max-w-md mx-auto border-2 border-dashed border-slate-300">
                            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-xl">
                                <TreePine size={48} className="text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-800 mb-3">Bahçeniz Boş</h2>
                            <p className="text-slate-600 mb-8 text-lg">İlk bahçenizi oluşturun!</p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold inline-flex items-center gap-3"
                            >
                                <Plus size={24} />
                                <span className="text-lg">İlk Bahçemi Oluştur</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {gardens.map((garden) => (
                            <GardenCard
                                key={garden.id}
                                garden={garden}
                                isEditing={editingGardenId === garden.id}
                                editingName={editingName}
                                isMenuOpen={openMenuId === garden.id}
                                onEdit={() => {
                                    setEditingGardenId(garden.id);
                                    setEditingName(garden.name);
                                    setOpenMenuId(null);
                                }}
                                onMenuToggle={() => setOpenMenuId(openMenuId === garden.id ? null : garden.id)}
                                onNameChange={setEditingName}
                                onSaveName={() => handleSaveName(garden.id)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveName(garden.id);
                                    else if (e.key === 'Escape') setEditingGardenId(null);
                                }}
                                onOpenGarden={() => handleOpenGarden(garden.id)}
                                onOpenCanvas={(e) => handleOpenCanvas(e, garden.id)}
                                onOpenProjects={(e) => handleOpenProjects(e, garden.id)}
                                onDelete={(e) => handleDeleteGarden(e, garden.id)}
                                formatDate={formatDate}
                            />
                        ))}
                    </div>
                )}
            </div>

            <CreateGardenModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            
            <Suspense fallback={null}>
                <Sidebar />
            </Suspense>
        </div>
    );
}
