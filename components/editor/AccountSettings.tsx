'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Cloud, Eye, EyeOff, Leaf, Loader2, LogOut, Mail, ShieldCheck, Smartphone, User, UserCircle2 } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { supabase, isLocalBackend } from '@/lib/supabaseClient';
import { GUEST_EMAIL, localClient, signInAsGuest } from '@/lib/localClient';
import { useStore } from '@/lib/store/useStore';
import { clearDriveToken, fetchGoogleProfile, setAutoSyncEnabled, syncOnStartup } from '@/lib/driveSync';
import {
    cx, SettingsField, SettingsHint, SettingsNote, SettingsPageHeader, SettingsPill,
    SettingsSection, settingsFieldClass
} from '@/components/ui/settings';

const PRODUCTION_URL = 'https://mindgarden-neon.vercel.app';
type AuthAction = 'google' | 'email' | 'signout' | null;

function getOAuthOrigin(): string {
    if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return PRODUCTION_URL;
    return /^https?:$/.test(window.location.protocol) ? window.location.origin : PRODUCTION_URL;
}

/** Sunucudan gelen iç ayrıntıları veya ham hataları kullanıcıya yansıtma. */
function authErrorMessage(error: unknown, fallback: string): string {
    const message = (error instanceof Error ? error.message :
        typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : '').toLowerCase();
    if (message.includes('invalid login credentials')) return 'E-posta veya şifre hatalı. Bilgilerinizi kontrol edin.';
    if (message.includes('email not confirmed')) return 'Giriş yapmak için e-postanızdaki doğrulama bağlantısını açın.';
    if (message.includes('already registered')) return 'Bu e-posta ile bir hesap var. Giriş yapmayı deneyin.';
    if (message.includes('signups not allowed') || message.includes('signups are disabled')) {
        return 'E-posta ile kayıt şu anda kapalı. Google ile giriş yapabilirsiniz.';
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
        return 'Çok fazla deneme yapıldı. Biraz bekleyip yeniden deneyin.';
    }
    if (message.includes('cancel') || message.includes('popup_closed')) return 'Google girişi iptal edildi. Hazır olduğunuzda yeniden deneyebilirsiniz.';
    if (message.includes('network') || message.includes('fetch')) return 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip yeniden deneyin.';
    return fallback;
}

function GoogleMark() {
    return (
        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
            <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z" />
            <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77z" />
        </svg>
    );
}

export default function AccountSettings({ onDone }: { onDone?: () => void }) {
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [action, setAction] = useState<AuthAction>(null);
    const [authError, setAuthError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
    const isBusy = action !== null;
    const isGuest = isLocalBackend && user?.email === GUEST_EMAIL;
    const isGoogleUser = user?.user_metadata?.provider === 'google' || user?.app_metadata?.provider === 'google';
    const avatar = typeof user?.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null;
    const avatarUrl = avatar && /^https?:\/\//.test(avatar) && failedAvatar !== avatar ? avatar : null;

    useEffect(() => {
        let mounted = true;
        void supabase.auth.getSession().then(({ data, error }) => {
            if (!mounted) return;
            setUser(data.session?.user ?? null);
            if (error) setAuthError('Oturum bilgisi alınamadı. Hesap bölümünü yeniden açıp deneyin.');
            setIsLoading(false);
        }).catch(() => {
            if (!mounted) return;
            setAuthError('Oturum bilgisi alınamadı. Hesap bölümünü yeniden açıp deneyin.');
            setIsLoading(false);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
                setUser(session?.user ?? null);
                setIsLoading(false);
            }
        });
        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const handleGoogleSignIn = async () => {
        setAction('google');
        setAuthError('');
        setSuccessMessage('');
        try {
            if (isLocalBackend) {
                const { profile } = await fetchGoogleProfile();
                const { error } = await localClient.auth.signInWithGoogleProfile(profile);
                if (error) throw error;
                setAutoSyncEnabled(true);
                setSuccessMessage('Google hesabınız bağlandı. Otomatik Drive yedeklemesi açık.');
                void syncOnStartup().catch(() => {
                    // Senkronizasyon bölümünde bağlantı tekrar denenebilir; oturum geçerlidir.
                });
                onDone?.();
                return;
            }
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${getOAuthOrigin()}/auth/callback`,
                    skipBrowserRedirect: true
                }
            });
            if (error) throw error;
            if (!data.url) throw new Error('OAuth yönlendirmesi alınamadı');
            window.location.assign(data.url);
        } catch (error) {
            setAuthError(authErrorMessage(error, 'Google ile giriş tamamlanamadı. Lütfen yeniden deneyin.'));
        } finally {
            setAction(null);
        }
    };

    const handleGuestSignIn = () => {
        signInAsGuest();
        setAuthError('');
        setSuccessMessage('Bu cihazdaki yerel bahçeniz hazır.');
        onDone?.();
    };

    const handleSignOut = async () => {
        setAction('signout');
        setAuthError('');
        setSuccessMessage('');
        try {
            const { error } = await supabase.auth.signOut({ scope: 'local' });
            if (error) throw error;
            clearDriveToken();
            if (Capacitor.isNativePlatform()) {
                try {
                    await GoogleAuth.signOut();
                } catch {
                    // Uygulama oturumu kapandı; Google eklentisi zaten kapalı olabilir.
                }
            }
            useStore.getState().resetData();
            setUser(null);
            setSuccessMessage('Bu cihazdaki oturumunuz kapatıldı.');
        } catch (error) {
            setAuthError(authErrorMessage(error, 'Çıkış yapılamadı. Lütfen yeniden deneyin.'));
        } finally {
            setAction(null);
        }
    };

    const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setAuthError('');
        setSuccessMessage('');
        setAction('email');
        try {
            if (authMode === 'register') {
                const { error } = await supabase.auth.signUp({
                    email: email.trim(), password,
                    options: { emailRedirectTo: `${getOAuthOrigin()}/auth/callback` }
                });
                if (error) throw error;
                setSuccessMessage(isLocalBackend
                    ? 'Yerel hesabınız hazır. Notlarınız bu cihazda saklanır.'
                    : 'Hesabınızı doğrulamak için e-postanızdaki bağlantıyı açın.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
                if (error) throw error;
                setSuccessMessage('Giriş yapıldı. Bahçenize hoş geldiniz.');
            }
            setEmail('');
            setPassword('');
            setShowPassword(false);
        } catch (error) {
            setAuthError(authErrorMessage(error, 'İşlem tamamlanamadı. Bilgilerinizi kontrol edip yeniden deneyin.'));
        } finally {
            setAction(null);
        }
    };

    if (isLoading) {
        return (
            <div role="status" className="flex min-h-48 items-center justify-center gap-3 text-sm text-sand-600">
                <Loader2 size={20} className="animate-spin text-moss-600" aria-hidden />
                Hesabınız yükleniyor…
            </div>
        );
    }

    const googleButton = (
        <button type="button" onClick={() => void handleGoogleSignIn()} disabled={isBusy}
            className="btn btn-secondary min-h-12 w-full text-sm disabled:opacity-50">
            {action === 'google' ? <Loader2 size={19} className="animate-spin" aria-hidden /> : <GoogleMark />}
            {action === 'google' ? 'Google bağlantısı kuruluyor…' : user ? 'Google hesabıma bağlan' : 'Google ile giriş yap'}
        </button>
    );

    return (
        <div className="space-y-5" aria-busy={isBusy}>
            <SettingsPageHeader
                icon={UserCircle2}
                title="Hesap ve giriş"
                description="Oturumunuzu yönetin: Google hesabıyla giriş, e-posta ile giriş veya bu cihazdaki misafir oturumu."
            />

            {authError && <SettingsNote tone="error">{authError}</SettingsNote>}
            {successMessage && <SettingsNote tone="ok">{successMessage}</SettingsNote>}

            {user ? (
                <>
                    <SettingsSection>
                        <div className="flex items-center gap-4">
                            {/* Profil fotoğrafı uzak bir adresten gelir ve Capacitor'ın statik dışa
                                aktarımında next/image kullanılamaz; bu yüzden <img> tercih edildi. */}
                            {avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatarUrl} alt="" onError={() => setFailedAvatar(avatarUrl)}
                                    className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-moss-200" />
                            ) : (
                                <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-moss-100 text-moss-700">
                                    {isGuest ? <Leaf size={26} /> : <User size={26} />}
                                </span>
                            )}
                            <div className="min-w-0 flex-1">
                                <h4 className="break-words text-lg font-semibold tracking-tight text-sand-900">
                                    {isGuest ? 'Misafir bahçeniz' : user.user_metadata?.full_name || 'Bahçıvan'}
                                </h4>
                                <p className="mt-1 break-all text-sm text-sand-600">
                                    {isGuest ? 'Bu cihazda kullanılıyor' : user.email}
                                </p>
                            </div>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2 border-t border-sand-100 pt-4">
                            <SettingsPill tone="moss"><ShieldCheck size={13} aria-hidden />Oturum açık</SettingsPill>
                            <SettingsPill tone="sand">
                                {isGoogleUser ? 'Google hesabı' : isLocalBackend ? 'Yerel hesap' : 'E-posta hesabı'}
                            </SettingsPill>
                        </div>
                    </SettingsSection>

                    {isLocalBackend && !isGoogleUser && (
                        <SettingsSection icon={Cloud} title="Google hesabınızla devam edin"
                            description="Google hesabınıza ait bahçelere geçin ve Drive yedeklemesini kullanın.">
                            <div className="space-y-4">
                                {googleButton}
                                <SettingsHint>
                                    Yerel bahçeleriniz bu cihazda kalır; Google hesabınıza otomatik taşınmaz.
                                    Taşımak istediğiniz notları önce Veri yönetimi bölümünden dışa aktarabilirsiniz.
                                </SettingsHint>
                            </div>
                        </SettingsSection>
                    )}

                    {isGoogleUser && (
                        <SettingsSection icon={Cloud} title="Google hesabınız bağlı"
                            description="Drive yedeklemesini ve son senkronizasyon durumunu Yedekleme ve senkronizasyon bölümünden yönetebilirsiniz.">
                            <p className="text-sm leading-relaxed text-sand-600">Notlarınızın cihazlar arasında güncel kalması için her cihazda aynı Google hesabını kullanın.</p>
                        </SettingsSection>
                    )}

                    <SettingsSection icon={LogOut} title="Bu cihazdaki oturum" tone="sand"
                        description="Çıkış yapmak hesabınızı veya kayıtlı bahçelerinizi silmez.">
                        <button type="button" onClick={() => void handleSignOut()} disabled={isBusy}
                            className="btn min-h-11 w-full border border-berry-200 bg-berry-50 text-sm text-berry-700 hover:bg-berry-100 disabled:opacity-50 sm:w-auto">
                            {action === 'signout' ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <LogOut size={17} aria-hidden />}
                            {action === 'signout' ? 'Çıkış yapılıyor…' : 'Çıkış yap'}
                        </button>
                    </SettingsSection>
                </>
            ) : (
                <>
                    <SettingsSection icon={Cloud} title="Bahçenize bağlanın"
                        description={isLocalBackend ? 'Google hesabınızla giriş yapın ve notlarınızı Drive ile yedekleyin.' : 'Google hesabınızla bahçelerinize erişin.'}>
                        {googleButton}
                    </SettingsSection>

                    {isLocalBackend && (
                        <SettingsSection icon={Smartphone} title="Bu cihazda kullanın" tone="sand"
                            description="Hesap oluşturmadan yerel bahçenize ulaşın. Notlarınız bu cihazda saklanır.">
                            <button type="button" onClick={handleGuestSignIn} disabled={isBusy}
                                className="btn btn-secondary min-h-11 w-full text-sm disabled:opacity-50">
                                <Leaf size={17} aria-hidden />Yerel bahçeme devam et
                            </button>
                        </SettingsSection>
                    )}

                    <SettingsSection icon={Mail} title="E-posta ile devam edin" tone="sand">
                        <div className="mb-5 flex gap-1 rounded-xl bg-sand-100 p-1" aria-label="E-posta işlemi">
                            {(['login', 'register'] as const).map(mode => (
                                <button key={mode} type="button" aria-pressed={authMode === mode} disabled={isBusy}
                                    onClick={() => { setAuthMode(mode); setAuthError(''); setSuccessMessage(''); }}
                                    className={cx('min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/40 disabled:opacity-50',
                                        authMode === mode ? 'bg-white text-moss-800 shadow-sm' : 'text-sand-600 hover:text-sand-800')}>
                                    {mode === 'login' ? 'Giriş yap' : 'Kayıt ol'}
                                </button>
                            ))}
                        </div>
                        <form onSubmit={handleEmailAuth} className="space-y-4">
                            {isLocalBackend && <SettingsHint>Yerel e-posta hesabı yalnızca bu cihazda kullanılır. Şifre doğrulaması ve bulut hesabı oluşturma bu modda desteklenmez.</SettingsHint>}
                            <SettingsField label="E-posta adresi" htmlFor="account-email">
                                <input id="account-email" name="email" type="email" autoComplete="email" inputMode="email"
                                    autoCapitalize="none" spellCheck={false} required disabled={isBusy}
                                    value={email} onChange={event => setEmail(event.target.value)}
                                    placeholder="ornek@eposta.com" className={settingsFieldClass} />
                            </SettingsField>
                            <SettingsField label="Şifre" htmlFor="account-password" hint={authMode === 'register' ? 'En az 6 karakter kullanın.' : undefined}>
                                <div className="relative">
                                    <input id="account-password" name="password" type={showPassword ? 'text' : 'password'}
                                        autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                                        required minLength={authMode === 'register' ? 6 : undefined} disabled={isBusy}
                                        value={password} onChange={event => setPassword(event.target.value)}
                                        className={cx(settingsFieldClass, 'pr-12')} />
                                    <button type="button" onClick={() => setShowPassword(value => !value)}
                                        aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'} aria-pressed={showPassword}
                                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-sand-600 hover:text-moss-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-moss-500/40">
                                        {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                                    </button>
                                </div>
                            </SettingsField>
                            <button type="submit" disabled={isBusy} className="btn btn-primary min-h-12 w-full text-sm disabled:opacity-50">
                                {action === 'email' ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Mail size={17} aria-hidden />}
                                {action === 'email' ? 'İşlem yapılıyor…' : authMode === 'login' ? 'E-posta ile giriş yap' : 'Hesap oluştur'}
                            </button>
                        </form>
                    </SettingsSection>
                </>
            )}
        </div>
    );
}
