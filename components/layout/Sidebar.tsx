'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, User, TreePine, Leaf, Loader2, Mail, Eye, EyeOff, ChevronRight, Sparkles, Settings } from 'lucide-react';
import { useStore } from '@/lib/store/useStore';
import { supabase, isLocalBackend } from '@/lib/supabaseClient';
import { signInAsGuest } from '@/lib/localClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import ModelSettingsModal from '@/components/editor/ModelSettingsModal';
import { clearDriveToken, fetchGoogleProfile, setAutoSyncEnabled, syncOnStartup, initDriveAutoSync } from '@/lib/driveSync';
import { useMobileShell } from '@/components/mobile/MobileShell';
import { OfflineOverlay } from '@/components/mobile/MobileShell';

const PRODUCTION_URL = 'https://mindgarden-neon.vercel.app';

/**
 * OAuth dönüş adresi için origin.
 *
 * Sabit production adresi kullanıldığında localhost'ta yapılan bir giriş
 * kullanıcıyı production'a fırlatıyordu. Tarayıcıda bulunduğumuz origin'i,
 * yerel paketten çalışan native uygulamada ise production adresini kullanırız.
 */
function getOAuthOrigin(): string {
    if (typeof window === 'undefined') return PRODUCTION_URL;
    if (!/^https?:$/.test(window.location.protocol)) return PRODUCTION_URL;
    return window.location.origin;
}

export default function Sidebar() {
    const { isSidebarOpen, setSidebarOpen } = useStore();

    // Drive otomatik senkron motorunu başlat (tüm uygulama ömrü boyunca tek kez)
    useEffect(() => {
        initDriveAutoSync(useStore);
    }, []);

    // Android geri tuşu + çevrimdışı takibi
    const isOffline = useMobileShell();

    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // E-posta giriş state'leri
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    useEffect(() => {
        // Sidebar kapalıyken auth kontrolü yapma
        if (!isSidebarOpen) return;

        let mounted = true;

        const initAuth = async () => {
            // Native platformda Google Auth'u initialize et
            // ÖNEMLİ: Android'de clientId verilmez (serverClientId kullanılır),
            // aksi halde GMS "Something went wrong" hatası verir.
            if (Capacitor.isNativePlatform()) {
                try {
                    await GoogleAuth.initialize({
                        scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/drive.appdata'],
                    });
                } catch (e) {
                    console.log('GoogleAuth already initialized or error:', e);
                }
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (mounted) {
                setUser(session?.user ?? null);
                setIsLoading(false);
            }
        };
        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) setUser(session?.user ?? null);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [isSidebarOpen]);

    const handleGoogleSignIn = async () => {
        setAuthLoading(true);
        setAuthError('');

        // Yerel modda Google girişi Supabase'e ihtiyaç duymaz:
        // Google profili alınır, cihazda oturum açılır ve Drive otomatik
        // yedeklemesi etkinleştirilir.
        if (isLocalBackend) {
            try {
                const { profile } = await fetchGoogleProfile();
                await (supabase.auth as any).signInWithGoogleProfile(profile);
                setAutoSyncEnabled(true);
                setSuccessMessage('Google ile giriş yapıldı. Notlar artık Drive\'ına otomatik yedekleniyor.');
                setTimeout(() => setSuccessMessage(''), 4000);
                setSidebarOpen(false);
                void syncOnStartup();
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                setAuthError('Google ile giriş başarısız: ' + errorMessage);
            } finally {
                setAuthLoading(false);
            }
            return;
        }

        try {
            // OAuth URL'ini al ve manuel yönlendir
            // Bu sayede WebView içinde kalır, harici tarayıcı açılmaz
            const callbackUrl = `${getOAuthOrigin()}/auth/callback`;
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

    // Şifresiz yerel giriş - form doldurmaya gerek kalmadan oturum açar
    const handleGuestSignIn = () => {
        signInAsGuest();
        setAuthError('');
        setSuccessMessage('');
        setSidebarOpen(false);
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
        } finally {
            clearDriveToken();
        }
        useStore.getState().resetData();
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
                } else if (error.message.includes('Signups not allowed') || error.message.includes('signups are disabled')) {
                    setAuthError('E-posta ile kayıt şu an kapalı. Lütfen Google ile giriş yapın.');
                } else {
                    setAuthError(error.message);
                }
            } else {
                // Yerel modda e-posta doğrulaması yok, hesap anında açılır.
                setSuccessMessage(
                    isLocalBackend
                        ? 'Kayıt başarılı! Yerel moddasınız, doğrudan giriş yapıldı.'
                        : 'Kayıt başarılı! E-postanızı kontrol edin.'
                );
                setEmail('');
                setPassword('');
            }
        } catch {
            setAuthError('Bir hata oluştu');
        } finally {
            setAuthLoading(false);
        }
    };

    return (
        <>
            {isOffline && <OfflineOverlay />}

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
                            className="fixed left-0 top-0 z-50 flex h-full w-80 flex-col overflow-hidden border-r border-sand-200 bg-sand-50/95 pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl shadow-pop"
                        >
                            {/* Başlık */}
                            <div className="flex items-center justify-between border-b border-sand-200 px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-moss-600 to-moss-800 shadow-soft">
                                        <TreePine className="text-moss-50" size={20} />
                                    </span>
                                    <div>
                                        <h2 className="text-base font-semibold text-sand-900">Not Bahçesi</h2>
                                        <p className="text-xs text-sand-500">Ayarlar</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    aria-label="Kapat"
                                    className="rounded-xl p-2 text-sand-500 transition-colors duration-200 hover:bg-sand-200 hover:text-sand-700"
                                >
                                    <X size={19} />
                                </button>
                            </div>

                            {/* Kaydırılabilir içerik */}
                            <div className="flex-1 overflow-y-auto">
                                <div className="space-y-5 p-5">
                                    {isLoading ? (
                                        <div className="flex h-32 items-center justify-center">
                                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-sand-300 border-t-moss-600" />
                                        </div>
                                    ) : user ? (
                                        <>
                                            {/* Profil */}
                                            <div className="rounded-2xl border border-sand-200 bg-white p-4 shadow-soft">
                                                <div className="flex items-center gap-3.5">
                                                    {user.user_metadata?.avatar_url ? (
                                                        <img
                                                            src={user.user_metadata.avatar_url}
                                                            alt="Profil"
                                                            className="h-12 w-12 rounded-full ring-2 ring-moss-200"
                                                        />
                                                    ) : (
                                                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-moss-500 to-moss-700">
                                                            <User className="text-white" size={22} />
                                                        </span>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="truncate text-sm font-semibold text-sand-900">
                                                            {user.user_metadata?.full_name || 'Kullanıcı'}
                                                        </h3>
                                                        <p className="truncate text-xs text-sand-500">{user.email}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 px-1 text-sm text-sand-600">
                                                <Leaf size={15} className="text-moss-600" />
                                                <span>Bahçene hoş geldin!</span>
                                            </div>

                                            {/* Tek ayar girişi: model, senkronizasyon,
                                                makrolar, araçlar ve veri yönetimi
                                                aynı pencerede sekmeler hâlindedir. */}
                                            <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-soft">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsSettingsModalOpen(true)}
                                                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-sand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-moss-500/40"
                                                >
                                                    <span className="flex min-w-0 items-center gap-3">
                                                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-moss-100 text-moss-700">
                                                            <Settings size={17} />
                                                        </span>
                                                        <span className="min-w-0">
                                                            <span className="block text-sm font-semibold text-sand-800">Ayarlar</span>
                                                            <span className="mt-0.5 block text-[11px] text-sand-500">Model, senkronizasyon, araçlar ve veri</span>
                                                        </span>
                                                    </span>
                                                    <ChevronRight size={17} className="flex-shrink-0 text-sand-400" />
                                                </button>
                                            </div>


                                        </>
                                    ) : (
                                        /* Giriş Yapılmamış */
                                        <div className="space-y-5">
                                            <div className="text-center py-4">
                                                <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-moss-100 to-moss-100 rounded-full flex items-center justify-center">
                                                    <User className="text-moss-600" size={28} />
                                                </div>
                                                <h3 className="font-semibold text-sand-800 mb-1">
                                                    {authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
                                                </h3>
                                                <p className="text-xs text-sand-500">Notlarınızı kaydetmek için giriş yapın</p>
                                            </div>

                                            {isLocalBackend && (
                                                <div className="rounded-xl border border-clay-200 bg-clay-50 px-3 py-2 text-[11px] leading-relaxed text-clay-800">
                                                    <span className="font-semibold">Yerel mod.</span> Supabase altyapısı bağlı değil; veriler bu tarayıcıda saklanır ve şifre doğrulaması yapılmaz. Altyapı kurulduğunda otomatik olarak buluta geçer.
                                                </div>
                                            )}

                                            {/* Google ile giriş (Supabase'siz Drive senkronu da bu akışta) */}
                                            <button
                                                onClick={handleGoogleSignIn}
                                                disabled={authLoading}
                                                className="flex w-full items-center justify-center gap-3 rounded-xl border border-sand-300 bg-white px-4 py-3 text-sm font-semibold text-sand-800 shadow-soft transition-all hover:bg-sand-50 hover:shadow disabled:opacity-60"
                                            >
                                                {authLoading ? (
                                                    <Loader2 size={18} className="animate-spin" />
                                                ) : (
                                                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                                                        <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z"/>
                                                        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z"/>
                                                        <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z"/>
                                                        <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77z"/>
                                                    </svg>
                                                )}
                                                Google ile Giriş Yap
                                            </button>

                                            <div className="flex items-center gap-3">
                                                <span className="h-px flex-1 bg-sand-200" />
                                                <span className="text-[10px] font-semibold uppercase tracking-wider text-sand-400">veya e-posta ile</span>
                                                <span className="h-px flex-1 bg-sand-200" />
                                            </div>

                                            {/* E-posta Formu */}
                                            <form onSubmit={authMode === 'login' ? handleEmailSignIn : handleEmailSignUp} className="space-y-3">
                                                <div className="relative">
                                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sand-400" />
                                                    <input
                                                        type="email"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        placeholder="E-posta"
                                                        required
                                                        className="input pl-10"
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
                                                        className="input pr-10"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-400 hover:text-sand-600"
                                                    >
                                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>

                                                {authError && (
                                                    <p className="rounded-xl border border-berry-200 bg-berry-50 px-3 py-2 text-xs text-berry-700">{authError}</p>
                                                )}
                                                {successMessage && (
                                                    <p className="rounded-xl border border-moss-200 bg-moss-50 px-3 py-2 text-xs text-moss-700">{successMessage}</p>
                                                )}

                                                <button
                                                    type="submit"
                                                    disabled={authLoading}
                                                    className="btn btn-primary w-full py-2.5 text-sm"
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
                                                    className="text-xs text-moss-600 hover:underline"
                                                >
                                                    {authMode === 'login' ? 'Hesabınız yok mu? Kayıt olun' : 'Zaten hesabınız var mı? Giriş yapın'}
                                                </button>
                                            </div>

                                            {isLocalBackend ? (
                                                <button
                                                    onClick={handleGuestSignIn}
                                                    title="Altyapı bağlı olmadığı için şifre sormadan bu cihazda oturum açar"
                                                    className="btn w-full border border-clay-300 bg-clay-50 px-4 py-3 text-sm text-clay-800 hover:bg-clay-100"
                                                >
                                                    <Sparkles size={18} />
                                                    <span className="text-sm">Yerel Modda Giriş Yap</span>
                                                </button>
                                            ) : (
                                                <>
                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-sand-200"></div>
                                                </div>
                                                <div className="relative flex justify-center text-xs">
                                                    <span className="px-2 bg-sand-200 text-sand-500">veya</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleGoogleSignIn}
                                                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-sand-50 border border-sand-200 rounded-xl shadow-soft transition-all hover:shadow-soft"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                </svg>
                                                <span className="font-medium text-sand-700 text-sm">Google ile Giriş</span>
                                            </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Alt eylem - Çıkış */}
                            {user && (
                                <div className="border-t border-sand-200 p-4">
                                    <button
                                        onClick={handleSignOut}
                                        className="btn w-full px-4 py-2.5 text-sm text-berry-600 hover:bg-berry-50"
                                    >
                                        <LogOut size={17} />
                                        <span>Çıkış Yap</span>
                                    </button>
                                </div>
                            )}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            <ModelSettingsModal 
                isOpen={isSettingsModalOpen} 
                onClose={() => setIsSettingsModalOpen(false)} 
            />
        </>
    );
}
