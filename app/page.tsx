'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { supabase } from '@/lib/supabaseClient';
import { Plus, MoreHorizontal, TreePine, Sparkles, LogIn, FolderTree, Layout, Trash2, Clock, Pencil } from 'lucide-react';
import CreateGardenModal from '@/components/bahce/CreateGardenModal';
import Sidebar from '@/components/layout/Sidebar';
import type { User } from '@supabase/supabase-js';

export default function HomePage() {
    const router = useRouter();
    const { gardens, fetchGardens, deleteGarden, updateGardenName, toggleSidebar } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // Auth durumunu kontrol et
        const checkAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('Session error:', error);
                    setIsLoading(false);
                    return;
                }
                
                setUser(session?.user ?? null);
                
                if (session?.user) {
                    // fetchGardens'ı timeout ile çağır - takılmayı önle
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), 10000)
                    );
                    
                    try {
                        await Promise.race([fetchGardens(), timeoutPromise]);
                    } catch (e) {
                        console.error('fetchGardens error or timeout:', e);
                    }
                }
            } catch (e) {
                console.error('Auth check error:', e);
            } finally {
                setIsLoading(false);
            }
        };
        checkAuth();

        // Auth değişikliklerini dinle
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);
            setUser(session?.user ?? null);
            
            if (session?.user) {
                // Loading'i göster ve bahçeleri yükle
                setIsLoading(true);
                try {
                    await fetchGardens();
                } catch (e) {
                    console.error('fetchGardens error:', e);
                } finally {
                    setIsLoading(false);
                }
            } else {
                // Çıkış yapıldığında bahçeleri temizle
                useStore.getState().setGardens([]);
            }
        });

        return () => subscription.unsubscribe();
    }, [fetchGardens]);

    // Son görünüm tercihini kaydet ve yönlendir
    const handleOpenCanvas = (e: React.MouseEvent, gardenId: string) => {
        e.stopPropagation();
        localStorage.setItem(`garden-view-${gardenId}`, 'canvas');
        router.push(`/bahce/${gardenId}`);
    };

    const handleOpenProjects = (e: React.MouseEvent, gardenId: string) => {
        e.stopPropagation();
        localStorage.setItem(`garden-view-${gardenId}`, 'projects');
        router.push(`/bahce/${gardenId}/projeler`);
    };

    // Bahçe kartına tıklayınca son görünüme git
    const handleOpenGarden = (gardenId: string) => {
        const lastView = localStorage.getItem(`garden-view-${gardenId}`);
        if (lastView === 'projects') {
            router.push(`/bahce/${gardenId}/projeler`);
        } else {
            router.push(`/bahce/${gardenId}`);
        }
    };

    const handleDeleteGarden = async (e: React.MouseEvent, gardenId: string) => {
        e.stopPropagation();
        if (confirm('Bu bahçeyi ve içindeki tüm notları silmek istediğinize emin misiniz?')) {
            await deleteGarden(gardenId);
        }
    };

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [editingGardenId, setEditingGardenId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    // Çift tıklama ile düzenleme
    const handleDoubleClick = (gardenId: string, currentName: string) => {
        setEditingGardenId(gardenId);
        setEditingName(currentName);
    };

    const handleSaveName = async (gardenId: string) => {
        if (editingName.trim() && editingName !== gardens.find(g => g.id === gardenId)?.name) {
            await updateGardenName(gardenId, editingName.trim());
        }
        setEditingGardenId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent, gardenId: string) => {
        if (e.key === 'Enter') {
            handleSaveName(gardenId);
        } else if (e.key === 'Escape') {
            setEditingGardenId(null);
        }
    };

    // Tarih formatlama
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-[#f4f1ea] p-4 md:p-8 font-sans selection:bg-emerald-200">
            {/* Modern Header */}
            <div className="max-w-7xl mx-auto mb-8 md:mb-12">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <button
                                onClick={toggleSidebar}
                                className="relative group"
                                title="Menü"
                            >
                                <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-emerald-700 to-green-800 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-900/20 border-2 border-emerald-600/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl group-active:scale-95">
                                    <TreePine className="text-emerald-50" size={32} />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-[#f4f1ea] flex items-center justify-center">
                                    <Sparkles size={10} className="text-white" />
                                </div>
                            </button>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-stone-800 tracking-tight font-serif">
                                    Not Bahçesi
                                </h1>
                                <p className="text-stone-500 text-sm md:text-base mt-1 font-medium">
                                    Fikirlerinizi toprağa ekin, ağaca dönüşsün.
                                </p>
                            </div>
                        </div>
                    </div>

                    {user && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="w-full md:w-auto group relative bg-[#5D4037] hover:bg-[#4E342E] text-amber-50 px-6 md:px-8 py-3 md:py-4 rounded-xl font-semibold shadow-lg shadow-stone-900/10 transition-all duration-300 hover:translate-y-[-2px] flex items-center justify-center gap-3 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            <span className="text-base md:text-lg">Yeni Bahçe Ekle</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Gardens Grid */}
            <div className="max-w-7xl mx-auto">
                {
                    isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <TreePine className="text-emerald-500" size={24} />
                                </div>
                            </div>
                        </div>
                    ) : !user ? (
                        /* Giriş Yapılmamış - Hoş Geldin Ekranı */
                        <div className="text-center py-20">
                            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-12 max-w-md mx-auto border-2 border-dashed border-emerald-300">
                                <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-emerald-500/50">
                                    <TreePine size={48} className="text-white" />
                                </div>
                                <h2 className="text-3xl font-bold text-slate-800 mb-3 font-serif">
                                    Hoş Geldiniz!
                                </h2>
                                <p className="text-slate-600 mb-8 text-lg">
                                    Notlarınızı kaydetmek ve bahçenizi oluşturmak için giriş yapın.
                                </p>
                                <button
                                    onClick={toggleSidebar}
                                    className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-2xl hover:shadow-emerald-500/50 hover:scale-105 transition-all duration-300 inline-flex items-center gap-3"
                                >
                                    <LogIn size={24} />
                                    <span className="text-lg">Giriş Yap</span>
                                </button>
                            </div>
                        </div>
                    ) : gardens.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-12 max-w-md mx-auto border-2 border-dashed border-slate-300">
                                <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-emerald-500/50">
                                    <TreePine size={48} className="text-white" />
                                </div>
                                <h2 className="text-3xl font-bold text-slate-800 mb-3">
                                    Bahçeniz Boş
                                </h2>
                                <p className="text-slate-600 mb-8 text-lg">
                                    İlk bahçenizi oluşturarak fikirlerinizi yetiştirmeye başlayın!
                                </p>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-2xl hover:shadow-emerald-500/50 hover:scale-105 transition-all duration-300 inline-flex items-center gap-3"
                                >
                                    <Plus size={24} />
                                    <span className="text-lg">İlk Bahçemi Oluştur</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {gardens.map((garden) => (
                                <div
                                    key={garden.id}
                                    onClick={() => handleOpenGarden(garden.id)}
                                    className="group relative bg-gradient-to-br from-[#f8f6f3] to-[#f0ebe4] rounded-2xl border border-stone-200/60 hover:border-emerald-300/60 hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer"
                                >
                                    {/* Dekoratif arka plan */}
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/30 rounded-full -translate-y-12 translate-x-12" />
                                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-amber-100/30 rounded-full translate-y-8 -translate-x-8" />
                                    
                                    {/* İçerik */}
                                    <div className="relative p-5">
                                        {/* Üst kısım: Başlık ve Menü */}
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                                                    <TreePine className="text-white" size={20} />
                                                </div>
                                                {editingGardenId === garden.id ? (
                                                    <input
                                                        type="text"
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        onBlur={() => handleSaveName(garden.id)}
                                                        onKeyDown={(e) => handleKeyDown(e, garden.id)}
                                                        className="font-bold text-stone-800 text-lg bg-white/80 px-2 py-1 rounded-lg border border-emerald-300 outline-none w-full"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <h3 
                                                        className="font-bold text-stone-800 truncate text-lg cursor-pointer hover:text-emerald-700 transition-colors"
                                                        onDoubleClick={() => handleDoubleClick(garden.id, garden.name)}
                                                        title="Çift tıklayarak düzenle"
                                                    >
                                                        {garden.name}
                                                    </h3>
                                                )}
                                            </div>
                                            
                                            {/* Menü */}
                                            <div className="relative flex-shrink-0">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(openMenuId === garden.id ? null : garden.id);
                                                    }}
                                                    className="p-1.5 hover:bg-white/60 rounded-lg text-stone-400 hover:text-stone-600 transition-colors"
                                                >
                                                    <MoreHorizontal size={18} />
                                                </button>
                                                
                                                {openMenuId === garden.id && (
                                                    <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl py-1 z-10 min-w-[160px]">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingGardenId(garden.id);
                                                                setEditingName(garden.name);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                                                        >
                                                            <Pencil size={15} className="text-amber-500" />
                                                            <span>Yeniden Adlandır</span>
                                                        </button>
                                                        <hr className="my-1 border-stone-100" />
                                                        <button
                                                            onClick={(e) => {
                                                                handleDeleteGarden(e, garden.id);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            <Trash2 size={15} />
                                                            <span>Bahçeyi Sil</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Tarih */}
                                        <div className="flex items-center gap-2 text-stone-500 text-sm mb-5">
                                            <Clock size={14} />
                                            <span>{formatDate(garden.created_at)}</span>
                                        </div>

                                        {/* Butonlar */}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={(e) => handleOpenProjects(e, garden.id)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/70 hover:bg-amber-100 text-stone-700 hover:text-amber-800 rounded-xl text-sm font-medium transition-all border border-stone-200/50 hover:border-amber-200"
                                            >
                                                <FolderTree size={16} />
                                                <span>Projeler</span>
                                            </button>
                                            <button
                                                onClick={(e) => handleOpenCanvas(e, garden.id)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md"
                                            >
                                                <Layout size={16} />
                                                <span>Canvas</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                }
            </div>

            {/* Create Garden Modal */}
            <CreateGardenModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />

            {/* Sidebar */}
            <Sidebar />
        </div>
    );
}
