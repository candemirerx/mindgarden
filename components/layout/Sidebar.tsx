'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, User, TreePine, Leaf, Download, Upload, Database, Loader2 } from 'lucide-react';
import { useStore } from '@/lib/store/useStore';
import { supabase } from '@/lib/supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export default function Sidebar() {
    const { isSidebarOpen, setSidebarOpen, gardens, fetchGardens } = useStore();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            setIsLoading(false);
        };
        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        // Capacitor deep link listener for OAuth callback
        let appUrlListener: any = null;
        if (Capacitor.isNativePlatform()) {
            appUrlListener = App.addListener('appUrlOpen', async ({ url }) => {
                console.log('Deep link received:', url);
                
                // Handle OAuth callback URL
                if (url.includes('auth/callback') || url.includes('access_token') || url.includes('code=')) {
                    try {
                        // URL'den token bilgilerini çıkar
                        const urlObj = new URL(url.replace('notbahcesi://', 'https://'));
                        const hashParams = new URLSearchParams(urlObj.hash.substring(1));
                        const queryParams = urlObj.searchParams;
                        
                        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
                        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
                        
                        if (accessToken && refreshToken) {
                            await supabase.auth.setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken
                            });
                        }
                    } catch (error) {
                        console.error('Deep link auth error:', error);
                    }
                }
            });
        }

        return () => {
            subscription.unsubscribe();
            if (appUrlListener) {
                appUrlListener.remove();
            }
        };
    }, []);

    const handleGoogleSignIn = async () => {
        // Capacitor native platform kontrolü
        const isNative = Capacitor.isNativePlatform();
        
        // Native için custom scheme, web için normal URL
        const callbackUrl = isNative 
            ? 'notbahcesi://auth/callback'
            : `${window.location.origin}/auth/callback`;
        
        console.log('Redirect URL:', callbackUrl, 'isNative:', isNative);
        
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { 
                redirectTo: callbackUrl,
                skipBrowserRedirect: false
            }
        });
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setSidebarOpen(false);
    };

    // Tüm verileri JSON olarak dışa aktar
    const handleExport = async () => {
        if (!user) return;
        setIsExporting(true);

        try {
            // Tüm bahçeleri al
            const { data: gardensData } = await supabase
                .from('gardens')
                .select('*')
                .eq('user_id', user.id);

            // Tüm node'ları al
            const { data: nodesData } = await supabase
                .from('nodes')
                .select('*')
                .in('garden_id', gardensData?.map(g => g.id) || []);

            const exportData = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                gardens: gardensData || [],
                nodes: nodesData || []
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `not-bahcesi-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export error:', error);
            alert('Dışa aktarma sırasında hata oluştu.');
        } finally {
            setIsExporting(false);
        }
    };

    // JSON dosyasından içe aktar
    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsImporting(true);

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.gardens || !data.nodes) {
                throw new Error('Geçersiz dosya formatı');
            }

            // Onay al
            const gardenCount = data.gardens.length;
            const nodeCount = data.nodes.length;
            if (!confirm(`${gardenCount} bahçe ve ${nodeCount} not içe aktarılacak. Devam etmek istiyor musunuz?`)) {
                setIsImporting(false);
                return;
            }

            // ID eşleştirme için map
            const gardenIdMap: Record<string, string> = {};

            // Bahçeleri ekle
            for (const garden of data.gardens) {
                const { data: newGarden, error } = await supabase
                    .from('gardens')
                    .insert({
                        name: garden.name,
                        user_id: user.id,
                        view_state: garden.view_state
                    })
                    .select()
                    .single();

                if (error) throw error;
                if (newGarden) {
                    gardenIdMap[garden.id] = newGarden.id;
                }
            }

            // Node'ları seviye seviye ekle (BFS yaklaşımı - daha güvenli)
            const nodeIdMap: Record<string, string> = {};
            
            // Tüm node'ları seviyelerine göre grupla
            const getNodeLevel = (nodeId: string, nodes: any[]): number => {
                const node = nodes.find((n: any) => n.id === nodeId);
                if (!node || !node.parent_id) return 0;
                return 1 + getNodeLevel(node.parent_id, nodes);
            };

            // Node'ları seviyelerine göre sırala
            const sortedNodes = [...data.nodes].sort((a: any, b: any) => {
                const levelA = getNodeLevel(a.id, data.nodes);
                const levelB = getNodeLevel(b.id, data.nodes);
                return levelA - levelB;
            });

            // Sırayla ekle (önce parent'lar, sonra child'lar)
            for (const node of sortedNodes) {
                const newGardenId = gardenIdMap[node.garden_id];
                if (!newGardenId) continue; // Bahçe bulunamadıysa atla

                const newParentId = node.parent_id ? nodeIdMap[node.parent_id] : null;
                
                const { data: newNode, error } = await supabase
                    .from('nodes')
                    .insert({
                        garden_id: newGardenId,
                        parent_id: newParentId,
                        content: node.content,
                        position_x: node.position_x,
                        position_y: node.position_y,
                        is_expanded: node.is_expanded ?? true
                    })
                    .select()
                    .single();

                if (error) {
                    console.error('Node insert error:', error, node);
                    continue; // Hata olursa diğer node'lara devam et
                }
                
                if (newNode) {
                    nodeIdMap[node.id] = newNode.id;
                }
            }

            alert('Veriler başarıyla içe aktarıldı!');
            await fetchGardens();
        } catch (error) {
            console.error('Import error:', error);
            alert('İçe aktarma sırasında hata oluştu. Dosya formatını kontrol edin.');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };


    return (
        <AnimatePresence>
            {isSidebarOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                        onClick={() => setSidebarOpen(false)}
                    />

                    <motion.aside
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed left-0 top-0 h-full w-80 bg-gradient-to-b from-[#f4f1ea] to-[#e8e4dc] shadow-2xl z-50 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-stone-300/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                                    <TreePine className="text-white" size={20} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-stone-800 font-serif">Not Bahçesi</h2>
                                    <p className="text-xs text-stone-500">Ayarlar</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="p-2 hover:bg-stone-200/50 rounded-full transition-colors"
                            >
                                <X size={20} className="text-stone-600" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-6 space-y-6">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-32">
                                        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : user ? (
                                    <>
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
                                                    <p className="text-sm text-stone-500 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-stone-600 text-sm">
                                            <Leaf size={16} className="text-emerald-600" />
                                            <span>Bahçene hoş geldin!</span>
                                        </div>

                                        {/* Veri Yönetimi Bölümü */}
                                        <div className="pt-4 border-t border-stone-300/50">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Database size={18} className="text-amber-600" />
                                                <h4 className="font-semibold text-stone-700">Veri Yönetimi</h4>
                                            </div>

                                            <div className="space-y-3">
                                                {/* Export */}
                                                <button
                                                    onClick={handleExport}
                                                    disabled={isExporting || gardens.length === 0}
                                                    className="w-full flex items-center gap-3 px-4 py-3 bg-white/80 hover:bg-white border border-stone-200 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isExporting ? (
                                                        <Loader2 size={18} className="text-emerald-600 animate-spin" />
                                                    ) : (
                                                        <Download size={18} className="text-emerald-600" />
                                                    )}
                                                    <div className="text-left">
                                                        <p className="font-medium text-stone-700">Dışa Aktar</p>
                                                        <p className="text-xs text-stone-500">Tüm notlarını JSON olarak indir</p>
                                                    </div>
                                                </button>

                                                {/* Import */}
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept=".json"
                                                    onChange={handleImport}
                                                    className="hidden"
                                                />
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isImporting}
                                                    className="w-full flex items-center gap-3 px-4 py-3 bg-white/80 hover:bg-white border border-stone-200 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isImporting ? (
                                                        <Loader2 size={18} className="text-amber-600 animate-spin" />
                                                    ) : (
                                                        <Upload size={18} className="text-amber-600" />
                                                    )}
                                                    <div className="text-left">
                                                        <p className="font-medium text-stone-700">İçe Aktar</p>
                                                        <p className="text-xs text-stone-500">JSON dosyasından geri yükle</p>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    /* Giriş Yapılmamış */
                                    <div className="space-y-6">
                                        <div className="text-center py-8">
                                            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center">
                                                <User className="text-emerald-600" size={32} />
                                            </div>
                                            <h3 className="font-semibold text-stone-800 mb-2">Hoş Geldiniz</h3>
                                            <p className="text-sm text-stone-500">Notlarınızı kaydetmek için giriş yapın</p>
                                        </div>

                                        <button
                                            onClick={handleGoogleSignIn}
                                            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl shadow-sm transition-all hover:shadow-md"
                                        >
                                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                            <span className="font-medium text-stone-700">Google ile Giriş Yap</span>
                                        </button>
                                    </div>
                                )}
                            </div>
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

                        {/* Dekoratif */}
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
