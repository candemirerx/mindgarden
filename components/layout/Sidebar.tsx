'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, User, TreePine, Leaf, Download, Upload, Database, Loader2, Mail, Eye, EyeOff } from 'lucide-react';
import { useStore } from '@/lib/store/useStore';
import { supabase } from '@/lib/supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export default function Sidebar() {
    const { isSidebarOpen, setSidebarOpen, gardens, fetchGardens } = useStore();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // E-posta giriş state'leri
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    
    // İçe aktarma modal state'leri
    const [showImportModal, setShowImportModal] = useState(false);
    const [importData, setImportData] = useState<{ gardens: any[]; nodes: any[] } | null>(null);

    useEffect(() => {
        const initAuth = async () => {
            // Native platformda Google Auth'u initialize et
            if (Capacitor.isNativePlatform()) {
                try {
                    await GoogleAuth.initialize({
                        clientId: '745502376472-dqf1pus06s224bakb2i3sls86flgfjm5.apps.googleusercontent.com',
                        scopes: ['profile', 'email'],
                        grantOfflineAccess: true
                    });
                } catch (e) {
                    console.log('GoogleAuth already initialized or error:', e);
                }
            }
            
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            setIsLoading(false);
        };
        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const handleGoogleSignIn = async () => {
        setAuthLoading(true);
        setAuthError('');
        
        try {
            // OAuth URL'ini al ve manuel yönlendir
            // Bu sayede WebView içinde kalır, harici tarayıcı açılmaz
            const callbackUrl = 'https://mindgarden-neon.vercel.app/auth/callback';
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { 
                    redirectTo: callbackUrl,
                    skipBrowserRedirect: true // URL'i al, otomatik yönlendirme yapma
                }
            });
            
            if (error) {
                console.error('OAuth error:', error);
                setAuthError('Google ile giriş başarısız: ' + error.message);
                return;
            }
            
            if (data?.url) {
                // WebView içinde yönlendir - harici tarayıcı açılmaz
                window.location.href = data.url;
            }
        } catch (error: unknown) {
            console.error('Google sign in error:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            setAuthError('Google ile giriş başarısız: ' + errorMessage);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleSignOut = async () => {
        try {
            // Native platformda Google'dan da çıkış yap
            if (Capacitor.isNativePlatform()) {
                try {
                    await GoogleAuth.signOut();
                } catch (e) {
                    console.log('Google sign out error:', e);
                }
            }
            await supabase.auth.signOut({ scope: 'local' });
        } catch (error) {
            console.error('Sign out error:', error);
        }
        setUser(null);
        setSidebarOpen(false);
    };

    // E-posta ile giriş
    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        setSuccessMessage('');
        setAuthLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    setAuthError('E-posta veya şifre hatalı');
                } else if (error.message.includes('Email not confirmed')) {
                    setAuthError('Lütfen e-postanızı doğrulayın');
                } else {
                    setAuthError(error.message);
                }
            } else {
                setEmail('');
                setPassword('');
            }
        } catch {
            setAuthError('Bir hata oluştu');
        } finally {
            setAuthLoading(false);
        }
    };

    // E-posta ile kayıt
    const handleEmailSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        setSuccessMessage('');
        setAuthLoading(true);

        if (password.length < 6) {
            setAuthError('Şifre en az 6 karakter olmalı');
            setAuthLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`
                }
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    setAuthError('Bu e-posta zaten kayıtlı');
                } else {
                    setAuthError(error.message);
                }
            } else {
                setSuccessMessage('Kayıt başarılı! E-postanızı kontrol edin.');
                setEmail('');
                setPassword('');
            }
        } catch {
            setAuthError('Bir hata oluştu');
        } finally {
            setAuthLoading(false);
        }
    };

    // Tüm verileri JSON olarak dışa aktar
    const handleExport = async () => {
        if (!user) return;
        setIsExporting(true);

        try {
            // Tüm bahçeleri al
            const { data: gardensData, error: gardensError } = await supabase
                .from('gardens')
                .select('*')
                .eq('user_id', user.id);

            if (gardensError) {
                console.error('Gardens fetch error:', gardensError);
                throw gardensError;
            }

            // Node'ları al (bahçe varsa)
            let nodesData: any[] = [];
            const gardenIds = gardensData?.map(g => g.id) || [];
            
            if (gardenIds.length > 0) {
                const { data: fetchedNodes, error: nodesError } = await supabase
                    .from('nodes')
                    .select('*')
                    .in('garden_id', gardenIds);

                if (nodesError) {
                    console.error('Nodes fetch error:', nodesError);
                    throw nodesError;
                }
                nodesData = fetchedNodes || [];
            }

            const exportData = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                gardens: gardensData || [],
                nodes: nodesData
            };

            console.log('Export data:', exportData);

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

    // JSON dosyasından içe aktar - dosya seçildiğinde modal aç
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.gardens || !data.nodes) {
                throw new Error('Geçersiz dosya formatı');
            }

            setImportData(data);
            setShowImportModal(true);
        } catch (error) {
            console.error('File read error:', error);
            alert('Dosya okunamadı. Geçerli bir JSON dosyası seçtiğinizden emin olun.');
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Verileri değiştir (mevcut verileri sil, yenilerini ekle)
    const handleImportReplace = async () => {
        if (!importData || !user) return;
        setShowImportModal(false);
        setIsImporting(true);

        try {
            // Mevcut bahçeleri al
            const { data: existingGardens } = await supabase
                .from('gardens')
                .select('id')
                .eq('user_id', user.id);

            // Mevcut bahçelere ait node'ları sil
            if (existingGardens && existingGardens.length > 0) {
                const gardenIds = existingGardens.map(g => g.id);
                await supabase.from('nodes').delete().in('garden_id', gardenIds);
                await supabase.from('gardens').delete().eq('user_id', user.id);
            }

            // Yeni verileri ekle
            await importGardenData(importData);

            alert('Veriler başarıyla değiştirildi!');
            await fetchGardens();
        } catch (error) {
            console.error('Import replace error:', error);
            alert('İçe aktarma sırasında hata oluştu.');
        } finally {
            setIsImporting(false);
            setImportData(null);
        }
    };

    // Verileri mevcut verilere ekle
    const handleImportAppend = async () => {
        if (!importData || !user) return;
        setShowImportModal(false);
        setIsImporting(true);

        try {
            await importGardenData(importData);

            alert('Veriler başarıyla eklendi!');
            await fetchGardens();
        } catch (error) {
            console.error('Import append error:', error);
            alert('İçe aktarma sırasında hata oluştu.');
        } finally {
            setIsImporting(false);
            setImportData(null);
        }
    };

    // Ortak içe aktarma fonksiyonu
    const importGardenData = async (data: { gardens: any[]; nodes: any[] }) => {
        if (!user) return;

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

        // Node'ları seviye seviye ekle (BFS yaklaşımı)
        const nodeIdMap: Record<string, string> = {};
        
        const getNodeLevel = (nodeId: string, nodes: any[]): number => {
            const node = nodes.find((n: any) => n.id === nodeId);
            if (!node || !node.parent_id) return 0;
            return 1 + getNodeLevel(node.parent_id, nodes);
        };

        const sortedNodes = [...data.nodes].sort((a: any, b: any) => {
            const levelA = getNodeLevel(a.id, data.nodes);
            const levelB = getNodeLevel(b.id, data.nodes);
            return levelA - levelB;
        });

        for (const node of sortedNodes) {
            const newGardenId = gardenIdMap[node.garden_id];
            if (!newGardenId) continue;

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
                continue;
            }
            
            if (newNode) {
                nodeIdMap[node.id] = newNode.id;
            }
        }
    };

    // Modal'ı kapat
    const handleImportCancel = () => {
        setShowImportModal(false);
        setImportData(null);
    };


    return (
        <>
            {/* İçe Aktarma Modal */}
            <AnimatePresence>
                {showImportModal && importData && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                            onClick={handleImportCancel}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-gradient-to-b from-[#f4f1ea] to-[#e8e4dc] rounded-2xl shadow-2xl z-[60] p-6"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                                    <Upload className="text-white" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-stone-800 font-serif">İçe Aktar</h3>
                                    <p className="text-xs text-stone-500">
                                        {importData.gardens.length} bahçe, {importData.nodes.length} not
                                    </p>
                                </div>
                            </div>

                            <p className="text-sm text-stone-600 mb-5">
                                Verileri nasıl içe aktarmak istiyorsunuz?
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={handleImportReplace}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all text-left"
                                >
                                    <Database size={18} className="text-red-600" />
                                    <div>
                                        <p className="font-medium text-red-700">Verileri Değiştir</p>
                                        <p className="text-xs text-red-500">Mevcut tüm veriler silinir, yenileri eklenir</p>
                                    </div>
                                </button>

                                <button
                                    onClick={handleImportAppend}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all text-left"
                                >
                                    <Upload size={18} className="text-emerald-600" />
                                    <div>
                                        <p className="font-medium text-emerald-700">Var Olan Verilere Ekle</p>
                                        <p className="text-xs text-emerald-500">Mevcut veriler korunur, yenileri eklenir</p>
                                    </div>
                                </button>

                                <button
                                    onClick={handleImportCancel}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition-all"
                                >
                                    <X size={18} className="text-stone-600" />
                                    <span className="font-medium text-stone-600">İptal</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

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
                                                    onChange={handleFileSelect}
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
                                    <div className="space-y-5">
                                        <div className="text-center py-4">
                                            <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center">
                                                <User className="text-emerald-600" size={28} />
                                            </div>
                                            <h3 className="font-semibold text-stone-800 mb-1">
                                                {authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
                                            </h3>
                                            <p className="text-xs text-stone-500">Notlarınızı kaydetmek için giriş yapın</p>
                                        </div>

                                        {/* E-posta Formu */}
                                        <form onSubmit={authMode === 'login' ? handleEmailSignIn : handleEmailSignUp} className="space-y-3">
                                            <div className="relative">
                                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="E-posta"
                                                    required
                                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                                                />
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="Şifre"
                                                    required
                                                    minLength={6}
                                                    className="w-full pl-4 pr-10 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                                                >
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>

                                            {authError && (
                                                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{authError}</p>
                                            )}
                                            {successMessage && (
                                                <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">{successMessage}</p>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={authLoading}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
                                            >
                                                {authLoading ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Mail size={16} />
                                                )}
                                                {authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
                                            </button>
                                        </form>

                                        <div className="text-center">
                                            <button
                                                onClick={() => {
                                                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                                                    setAuthError('');
                                                    setSuccessMessage('');
                                                }}
                                                className="text-xs text-emerald-600 hover:underline"
                                            >
                                                {authMode === 'login' ? 'Hesabınız yok mu? Kayıt olun' : 'Zaten hesabınız var mı? Giriş yapın'}
                                            </button>
                                        </div>

                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-stone-200"></div>
                                            </div>
                                            <div className="relative flex justify-center text-xs">
                                                <span className="px-2 bg-[#f0ece5] text-stone-500">veya</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleGoogleSignIn}
                                            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl shadow-sm transition-all hover:shadow-md"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                            <span className="font-medium text-stone-700 text-sm">Google ile Giriş</span>
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
        </>
    );
}
