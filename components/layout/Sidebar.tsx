'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, User, TreePine, Leaf } from 'lucide-react';
import { useStore } from '@/lib/store/useStore';
import { supabase } from '@/lib/supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export default function Sidebar() {
    const { isSidebarOpen, setSidebarOpen } = useStore();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Kullanıcı durumunu dinle
    useEffect(() => {
        // Mevcut oturumu kontrol et
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            setIsLoading(false);
        };
        getSession();

        // Auth değişikliklerini dinle
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Google ile giriş
    const handleGoogleSignIn = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
    };

    // Çıkış yap
    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setSidebarOpen(false);
    };

    return (
        <AnimatePresence>
            {isSidebarOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                        onClick={() => setSidebarOpen(false)}
                    />

                    {/* Sidebar */}
                    <motion.aside
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed left-0 top-0 h-full w-80 bg-gradient-to-b from-[#f4f1ea] to-[#e8e4dc] shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-stone-300/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                                    <TreePine className="text-white" size={20} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-stone-800 font-serif">Not Bahçesi</h2>
                                    <p className="text-xs text-stone-500">Hesap Ayarları</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="p-2 hover:bg-stone-200/50 rounded-full transition-colors"
                            >
                                <X size={20} className="text-stone-600" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-6">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-32">
                                    <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : user ? (
                                /* Giriş Yapılmış */
                                <div className="space-y-6">
                                    {/* Profil Kartı */}
                                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-stone-200/50 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            {user.user_metadata?.avatar_url ? (
                                                <img
                                                    src={user.user_metadata.avatar_url}
                                                    alt="Profil"
                                                    className="w-14 h-14 rounded-full border-2 border-emerald-500/30 shadow-md"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                                                    <User className="text-white" size={24} />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-stone-800 truncate">
                                                    {user.user_metadata?.full_name || 'Kullanıcı'}
                                                </h3>
                                                <p className="text-sm text-stone-500 truncate">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hoş Geldin Mesajı */}
                                    <div className="flex items-center gap-2 text-stone-600 text-sm">
                                        <Leaf size={16} className="text-emerald-600" />
                                        <span>Bahçene hoş geldin!</span>
                                    </div>
                                </div>
                            ) : (
                                /* Giriş Yapılmamış */
                                <div className="space-y-6">
                                    <div className="text-center py-8">
                                        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center">
                                            <User className="text-emerald-600" size={32} />
                                        </div>
                                        <h3 className="font-semibold text-stone-800 mb-2">Hoş Geldiniz</h3>
                                        <p className="text-sm text-stone-500">
                                            Notlarınızı kaydetmek için giriş yapın
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleGoogleSignIn}
                                        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl shadow-sm transition-all hover:shadow-md"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path
                                                fill="#4285F4"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            />
                                            <path
                                                fill="#34A853"
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            />
                                            <path
                                                fill="#FBBC05"
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            />
                                            <path
                                                fill="#EA4335"
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            />
                                        </svg>
                                        <span className="font-medium text-stone-700">Google ile Giriş Yap</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer - Çıkış Butonu */}
                        {user && (
                            <div className="p-6 border-t border-stone-300/50">
                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                >
                                    <LogOut size={18} />
                                    <span className="font-medium">Çıkış Yap</span>
                                </button>
                            </div>
                        )}

                        {/* Dekoratif Alt Kısım */}
                        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none overflow-hidden">
                            <div className="absolute -bottom-16 -left-8 w-32 h-32 bg-emerald-200/20 rounded-full blur-2xl" />
                            <div className="absolute -bottom-8 right-4 w-24 h-24 bg-amber-200/20 rounded-full blur-2xl" />
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}
