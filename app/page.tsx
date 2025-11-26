'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { Plus, Trash2, TreePine, Sparkles, Calendar } from 'lucide-react';
import CreateGardenModal from '@/components/bahce/CreateGardenModal';
import Sidebar from '@/components/layout/Sidebar';

export default function HomePage() {
    const router = useRouter();
    const { gardens, fetchGardens, deleteGarden, toggleSidebar } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadGardens = async () => {
            await fetchGardens();
            setIsLoading(false);
        };
        loadGardens();
    }, [fetchGardens]);

    const handleGardenClick = (gardenId: string) => {
        router.push(`/bahce/${gardenId}`);
    };

    const handleDeleteGarden = async (e: React.MouseEvent, gardenId: string) => {
        e.stopPropagation();
        if (confirm('Bu bahçeyi ve içindeki tüm notları silmek istediğinize emin misiniz?')) {
            await deleteGarden(gardenId);
        }
    };

    // Renk paleti - Ağaç ve Doğa tonları
    const colorPalette = [
        { gradient: 'from-amber-700 to-orange-800', shadow: 'shadow-amber-900/20', hover: 'hover:shadow-amber-900/40', icon: 'text-amber-100', name: 'Meşe' },
        { gradient: 'from-emerald-600 to-green-700', shadow: 'shadow-emerald-900/20', hover: 'hover:shadow-emerald-900/40', icon: 'text-emerald-100', name: 'Çam' },
        { gradient: 'from-lime-600 to-green-700', shadow: 'shadow-lime-900/20', hover: 'hover:shadow-lime-900/40', icon: 'text-lime-100', name: 'Söğüt' },
        { gradient: 'from-stone-600 to-stone-700', shadow: 'shadow-stone-900/20', hover: 'hover:shadow-stone-900/40', icon: 'text-stone-100', name: 'Ceviz' },
        { gradient: 'from-teal-600 to-cyan-700', shadow: 'shadow-teal-900/20', hover: 'hover:shadow-teal-900/40', icon: 'text-teal-100', name: 'Ladin' },
        { gradient: 'from-yellow-600 to-amber-700', shadow: 'shadow-yellow-900/20', hover: 'hover:shadow-yellow-900/40', icon: 'text-yellow-100', name: 'Çınar' },
    ];

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

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full md:w-auto group relative bg-[#5D4037] hover:bg-[#4E342E] text-amber-50 px-6 md:px-8 py-3 md:py-4 rounded-xl font-semibold shadow-lg shadow-stone-900/10 transition-all duration-300 hover:translate-y-[-2px] flex items-center justify-center gap-3 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span className="text-base md:text-lg">Yeni Tohum Ek</span>
                    </button>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {gardens.map((garden, index) => {
                                const colors = colorPalette[index % colorPalette.length];

                                return (
                                    <div
                                        key={garden.id}
                                        onClick={() => handleGardenClick(garden.id)}
                                        className={`group relative cursor-pointer transition-all duration-300 hover:scale-105`}
                                    >
                                        {/* Kart */}
                                        <div className={`relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-lg shadow-xl ${colors.shadow} ${colors.hover} border-2 border-slate-200/50 p-6`}>
                                            {/* Gradient Header */}
                                            <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-br ${colors.gradient} opacity-90`}>
                                                <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" />
                                            </div>

                                            {/* Dekoratif Pattern */}
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
                                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/5 rounded-full translate-y-12 -translate-x-12" />

                                            {/* İçerik */}
                                            <div className="relative">
                                                {/* Üst Kısım */}
                                                <div className="flex items-start justify-between mb-16">
                                                    <div className={`w-14 h-14 bg-white/30 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-white/50`}>
                                                        <TreePine className="text-white drop-shadow-lg" size={28} />
                                                    </div>

                                                    <button
                                                        onClick={(e) => handleDeleteGarden(e, garden.id)}
                                                        className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-white shadow-lg hover:scale-110"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>

                                                {/* Bahçe Bilgileri */}
                                                <div>
                                                    <h3 className="text-2xl font-bold text-slate-800 mb-3 line-clamp-2">
                                                        {garden.name}
                                                    </h3>

                                                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100/80 backdrop-blur-sm px-3 py-2 rounded-lg">
                                                        <Calendar size={16} className="text-slate-500" />
                                                        <span>
                                                            {new Date(garden.created_at).toLocaleDateString('tr-TR', {
                                                                day: 'numeric',
                                                                month: 'long',
                                                                year: 'numeric'
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Hover Badge */}
                                            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 shadow-lg">
                                                Aç →
                                            </div>
                                        </div>

                                        {/* Glow Effect */}
                                        <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${colors.gradient} blur-xl opacity-0 group-hover:opacity-20 transition-opacity -z-10`} />
                                    </div>
                                );
                            })}
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
