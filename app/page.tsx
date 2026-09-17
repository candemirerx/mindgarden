'use client';

import { useEffect, useState, useCallback, memo, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { supabase, isLocalBackend } from '@/lib/supabaseClient';
import { signInAsGuest } from '@/lib/localClient';
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
            onKeyDown={(e) => {
                if (isEditing) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenGarden();
                }
            }}
            role="button"
            tabIndex={0}
            aria-label={`${garden.name} bahçesini aç`}
            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-card transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-moss-200 hover:shadow-lift focus-visible:border-moss-300"
        >
            {/* Bahçe kimliğini taşıyan ince şerit */}
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-moss-600 via-moss-400 to-clay-300 opacity-70 transition-opacity duration-200 group-hover:opacity-100" />

            <div className="flex flex-1 flex-col p-5 pt-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-moss-100 text-moss-700 transition-colors duration-200 group-hover:bg-moss-600 group-hover:text-white">
                            <TreePine size={21} />
                        </span>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editingName}
                                onChange={(e) => onNameChange(e.target.value)}
                                onBlur={onSaveName}
                                onKeyDown={onKeyDown}
                                aria-label="Bahçe adı"
                                className="w-full rounded-lg border border-moss-400 bg-white px-2.5 py-1.5 text-base font-semibold text-sand-900 outline-none ring-4 ring-moss-500/10"
                                autoFocus
                            />
                        ) : (
                            <h3
                                className="truncate text-base font-semibold text-sand-900 transition-colors duration-200 group-hover:text-moss-700"
                                onDoubleClick={onEdit}
                                title={garden.name}
                            >
                                {garden.name}
                            </h3>
                        )}
                    </div>

                    <div className="relative flex-shrink-0">
                        <button
                            onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
                            aria-label="Bahçe seçenekleri"
                            aria-expanded={isMenuOpen}
                            className={`rounded-lg p-1.5 transition-colors duration-200 ${
                                isMenuOpen
                                    ? 'bg-sand-200 text-sand-700'
                                    : 'text-sand-500 hover:bg-sand-100 hover:text-sand-700'
                            }`}
                        >
                            <MoreHorizontal size={18} />
                        </button>

                        {isMenuOpen && (
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full z-20 mt-1.5 min-w-[176px] overflow-hidden rounded-xl border border-sand-200 bg-white py-1 shadow-pop animate-scale-in"
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-sand-700 transition-colors duration-150 hover:bg-sand-100"
                                >
                                    <Pencil size={15} className="text-clay-600" />
                                    <span>Yeniden adlandır</span>
                                </button>
                                <div className="my-1 h-px bg-sand-200" />
                                <button
                                    onClick={onDelete}
                                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-berry-600 transition-colors duration-150 hover:bg-berry-50"
                                >
                                    <Trash2 size={15} />
                                    <span>Bahçeyi sil</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mb-5 flex items-center gap-1.5 text-xs text-sand-500">
                    <Clock size={13} />
                    <span>{formatDate(garden.created_at)}</span>
                </div>

                {/* Eylemler - kartın altına yaslanır */}
                <div className="mt-auto flex gap-2.5">
                    <button
                        onClick={onOpenProjects}
                        className="btn btn-secondary flex-1 px-3 py-2.5 text-sm"
                    >
                        <FolderTree size={16} />
                        <span>Projeler</span>
                    </button>
                    <button
                        onClick={onOpenCanvas}
                        className="btn btn-primary flex-1 px-3 py-2.5 text-sm"
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

    // Açık menü varken dışına tıklanınca kapat
    useEffect(() => {
        if (!openMenuId) return;
        const closeMenu = () => setOpenMenuId(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, [openMenuId]);

    // Memoized callbacks
    const formatDate = useCallback((dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    }, []);

    // Şifresiz yerel giriş: oturum açılır, SIGNED_IN olayı listeyi kendisi çeker.
    const handleGuestSignIn = useCallback(() => {
        signInAsGuest();
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

    const gardenCount = gardens.length;

    return (
        <div className="min-h-screen bg-paper">
            <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-8 md:py-10">
                {/* Başlık */}
                <header className="mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3.5">
                        <button
                            onClick={toggleSidebar}
                            title="Menü"
                            aria-label="Menüyü aç"
                            className="group relative flex-shrink-0 rounded-2xl transition-transform duration-200 active:scale-95"
                        >
                            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-moss-700 to-moss-900 shadow-lift md:h-16 md:w-16">
                                <TreePine className="text-moss-50" size={30} />
                            </span>
                            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-sand-100 bg-clay-500">
                                <Sparkles size={10} className="text-white" />
                            </span>
                        </button>
                        <div>
                            <h1 className="text-3xl text-sand-900 md:text-4xl">Not Bahçesi</h1>
                            <p className="mt-0.5 text-sm text-sand-600 md:text-base">
                                Fikirlerinizi toprağa ekin, ağaca dönüşsün.
                            </p>
                        </div>
                    </div>

                    {user && (
                        <div className="flex items-center gap-3">
                            {gardenCount > 0 && (
                                <span className="chip-moss hidden sm:inline-flex">
                                    {gardenCount} bahçe
                                </span>
                            )}
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="btn btn-primary w-full px-5 py-3 md:w-auto md:px-6"
                            >
                                <Plus size={19} />
                                <span>Yeni Bahçe</span>
                            </button>
                        </div>
                    )}
                </header>

                {/* İçerik */}
                <main>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-24">
                            <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-sand-300 border-t-moss-600" />
                        </div>
                    ) : !user ? (
                        <div className="py-12 md:py-20">
                            <div className="mx-auto max-w-md rounded-3xl border border-sand-200 bg-white p-10 text-center shadow-lift">
                                <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-moss-100 text-moss-700">
                                    <TreePine size={32} />
                                </span>
                                <h2 className="text-2xl text-sand-900">Hoş geldiniz</h2>
                                <p className="mt-2 text-base text-sand-600">
                                    Notlarınızı kaydetmek için giriş yapın.
                                </p>
                                <div className="mt-7 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
                                    <button
                                        onClick={toggleSidebar}
                                        className="btn btn-primary px-6 py-3"
                                    >
                                        <LogIn size={19} />
                                        <span>Giriş Yap</span>
                                    </button>
                                    {isLocalBackend && (
                                        <button
                                            onClick={handleGuestSignIn}
                                            title="Altyapı bağlı olmadığı için şifre sormadan bu cihazda oturum açar"
                                            className="btn px-5 py-3 border border-clay-300 bg-clay-50 text-clay-800 hover:bg-clay-100"
                                        >
                                            <Sparkles size={18} />
                                            <span>Yerel Modda Gir</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : gardens.length === 0 ? (
                        <div className="py-12 md:py-20">
                            <div className="mx-auto max-w-md rounded-3xl border border-sand-200 bg-white p-10 text-center shadow-lift">
                                <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-clay-100 text-clay-700">
                                    <TreePine size={32} />
                                </span>
                                <h2 className="text-2xl text-sand-900">Bahçeniz boş</h2>
                                <p className="mt-2 text-base text-sand-600">
                                    İlk bahçenizi oluşturup notlarınızı ağaca dönüştürün.
                                </p>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="btn btn-primary mt-7 px-6 py-3"
                                >
                                    <Plus size={19} />
                                    <span>İlk Bahçemi Oluştur</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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
                </main>
            </div>

            <CreateGardenModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

            <Suspense fallback={null}>
                <Sidebar />
            </Suspense>
        </div>
    );
}
