'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, User, TreePine, Leaf, Download, Upload, Database, Loader2, Mail, Eye, EyeOff, FileJson, FileText, FileType, ChevronDown, ChevronRight, Sparkles, Settings } from 'lucide-react';
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
    const { isSidebarOpen, setSidebarOpen, gardens, fetchGardens } = useStore();

    // Drive otomatik senkron motorunu başlat (tüm uygulama ömrü boyunca tek kez)
    useEffect(() => {
        initDriveAutoSync(useStore);
    }, []);

    // Android geri tuşu + çevrimdışı takibi
    const isOffline = useMobileShell();

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
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    // İçe aktarma inline state'leri
    const [showImportOptions, setShowImportOptions] = useState(false);
    const [importData, setImportData] = useState<{ gardens: any[]; nodes: any[] } | null>(null);

    // Veri Yönetimi bölümü varsayılan olarak kapalı gelir
    const [isDataSectionOpen, setIsDataSectionOpen] = useState(false);

    // Dışa aktarma inline state'leri
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [exportData, setExportData] = useState<{ gardens: any[]; nodes: any[] } | null>(null);
    const [exportStep, setExportStep] = useState<'select' | 'format'>('select');
    const [selectedGardenIds, setSelectedGardenIds] = useState<Set<string>>(new Set());

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

    // Dışa aktarma seçeneklerini aç/kapat - verileri çek
    const handleExportClick = async () => {
        // Zaten açıksa kapat
        if (showExportOptions) {
            setShowExportOptions(false);
            setExportData(null);
            return;
        }

        if (!user) return;
        setIsExporting(true);

        try {
            const { data: gardensData, error: gardensError } = await supabase
                .from('gardens')
                .select('*')
                .eq('user_id', user.id)
                .is('deleted_at', null);

            if (gardensError) throw gardensError;

            let nodesData: any[] = [];
            const gardenIds = gardensData?.map(g => g.id) || [];

            if (gardenIds.length > 0) {
                const { data: fetchedNodes, error: nodesError } = await supabase
                    .from('nodes')
                    .select('*')
                    .in('garden_id', gardenIds)
                    .is('deleted_at', null);

                if (nodesError) throw nodesError;
                nodesData = fetchedNodes || [];
            }

            setExportData({ gardens: gardensData || [], nodes: nodesData });
            setSelectedGardenIds(new Set(gardenIds)); // Varsayılan: tümü seçili
            setExportStep('select');
            setShowExportOptions(true);
            setShowImportOptions(false); // Diğerini kapat
        } catch (error) {
            console.error('Export error:', error);
            alert('Veriler alınırken hata oluştu.');
        } finally {
            setIsExporting(false);
        }
    };

    // Bahçe seçimini toggle et
    const toggleGardenSelection = (gardenId: string) => {
        const newSet = new Set(selectedGardenIds);
        if (newSet.has(gardenId)) {
            newSet.delete(gardenId);
        } else {
            newSet.add(gardenId);
        }
        setSelectedGardenIds(newSet);
    };

    // Tümünü seç
    const selectAllGardens = () => {
        if (exportData) {
            setSelectedGardenIds(new Set(exportData.gardens.map(g => g.id)));
        }
    };

    // Seçili verileri filtrele
    const getFilteredExportData = () => {
        if (!exportData) return null;
        const filteredGardens = exportData.gardens.filter(g => selectedGardenIds.has(g.id));
        const filteredNodes = exportData.nodes.filter(n => selectedGardenIds.has(n.garden_id));
        return { gardens: filteredGardens, nodes: filteredNodes };
    };

    // JSON olarak dışa aktar
    const handleExportJSON = () => {
        const filtered = getFilteredExportData();
        if (!filtered) return;
        const data = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            gardens: filtered.gardens,
            nodes: filtered.nodes
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        void saveFile(blob, `not-bahcesi-backup-${tarihDamgasi()}.json`);
        setShowExportOptions(false);
        setExportData(null);
    };

    // HTML olarak dışa aktar (ağaç yapısında, içerikler gizli)
    const handleExportHTML = () => {
        const filtered = getFilteredExportData();
        if (!filtered) return;

        const escapeHtml = (text: string) => {
            return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        };

        const escapeJs = (text: string) => {
            return text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
        };

        const buildTreeHTML = (nodes: any[], parentId: string | null = null, depth: number = 0): string => {
            const children = nodes.filter(n => n.parent_id === parentId);
            if (children.length === 0) return '';

            return children.map(node => {
                const title = node.content.split('\n')[0] || 'Başlıksız';
                const content = node.content.split('\n').slice(1).join('\n').trim();
                const childrenHTML = buildTreeHTML(nodes, node.id, depth + 1);
                const nodeId = node.id.replace(/-/g, '');

                return `
                <div class="node" style="margin-left: ${depth * 24}px; margin-bottom: 16px;">
                    <div class="node-header">
                        <span class="icon">${depth === 0 ? '🌳' : '🌿'}</span>
                        <strong class="title">${escapeHtml(title)}</strong>
                        <button type="button" data-copy="${escapeHtml(title)}" class="copy-btn copy-title" title="Başlığı kopyala">📋</button>
                        ${content ? `<button type="button" data-copy="${escapeHtml(content)}" class="copy-btn copy-content" title="İçeriği kopyala">📄</button>` : ''}
                        ${content ? `<button type="button" data-toggle="${nodeId}" class="toggle-btn" id="toggle-${nodeId}">▶ Detaylar</button>` : ''}
                    </div>
                    ${content ? `<div class="content hidden" id="content-${nodeId}">${escapeHtml(content)}</div>` : ''}
                    ${childrenHTML ? `<div class="children">${childrenHTML}</div>` : ''}
                </div>`;
            }).join('');
        };

        const gardensHTML = filtered.gardens.map(garden => {
            const gardenNodes = filtered.nodes.filter(n => n.garden_id === garden.id);
            const treesHTML = buildTreeHTML(gardenNodes, null, 0);
            return `
            <div class="garden">
                <h2>🏡 ${escapeHtml(garden.name)}</h2>
                ${treesHTML || '<p class="empty">Bu bahçede henüz not yok.</p>'}
            </div>`;
        }).join('');

        const html = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Not Bahçesi - Dışa Aktarım</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 860px; margin: 0 auto; padding: 40px 20px 64px;
            background: #f6f3ee; color: #1e1813; line-height: 1.55;
            -webkit-font-smoothing: antialiased;
        }
        h1 { color: #275939; text-align: center; margin-bottom: 6px; font-size: 30px; letter-spacing: -0.02em; }
        .subtitle { text-align: center; color: #7c7268; margin-bottom: 36px; font-size: 13px; }
        .garden {
            margin-bottom: 24px; padding: 22px; background: #fff;
            border-radius: 16px; border: 1px solid #eae5de;
            box-shadow: 0 1px 3px rgba(29,21,16,0.05), 0 8px 24px -10px rgba(29,21,16,0.12);
        }
        .garden h2 { color: #275939; margin-bottom: 16px; font-size: 19px; letter-spacing: -0.01em; }
        .empty { color: #ada396; font-style: italic; }
        .node { padding: 6px 0; }
        .node-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .icon { font-size: 15px; }
        .title { color: #2c251d; font-size: 15px; font-weight: 600; }
        .copy-btn {
            padding: 3px 9px; font-size: 11px; font-weight: 600;
            background: #f0f7ef; border: 1px solid #bbdcc1; color: #306c47;
            border-radius: 7px; cursor: pointer; transition: background 0.18s, border-color 0.18s;
        }
        .copy-btn:hover { background: #deedda; }
        .copy-btn.copied { background: #44825b; color: #fff; border-color: #44825b; }
        .toggle-btn {
            padding: 3px 10px; font-size: 11px; font-weight: 600;
            background: #fdf8e9; border: 1px solid #f4dc94; color: #8c5210;
            border-radius: 7px; cursor: pointer; transition: background 0.18s, border-color 0.18s;
        }
        .toggle-btn:hover { background: #faedc9; }
        .toggle-btn.open { background: #c9841b; color: #fff; border-color: #c9841b; }
        .content {
            margin: 8px 0 0 26px; padding: 12px 14px; background: #fbf9f6;
            border-radius: 10px; border: 1px solid #eae5de; color: #5b5348;
            white-space: pre-wrap; font-size: 14px;
        }
        .content.hidden { display: none; }
        .children { margin-top: 10px; }
    </style>
</head>
<body>
    <h1>🌱 Not Bahçesi</h1>
    <p class="subtitle">Dışa aktarım tarihi: ${new Date().toLocaleDateString('tr-TR')}</p>
    ${gardensHTML}
    <script>
        // Kopyalama: navigator.clipboard yalnızca güvenli bağlamlarda (https,
        // localhost) tanımlıdır. Dosya olarak açılan bir HTML'de bulunmadığı
        // için eski yönteme düşülür; aksi hâlde düğme hiçbir şey yapmıyordu.
        function panoyaKopyala(metin) {
            if (navigator.clipboard && window.isSecureContext) {
                return navigator.clipboard.writeText(metin);
            }

            return new Promise(function (cozumle, reddet) {
                var alan = document.createElement('textarea');
                alan.value = metin;
                alan.setAttribute('readonly', '');
                alan.style.position = 'fixed';
                alan.style.top = '-1000px';
                alan.style.opacity = '0';
                document.body.appendChild(alan);

                var secim = document.getSelection();
                var onceki = secim && secim.rangeCount > 0 ? secim.getRangeAt(0) : null;

                alan.select();
                alan.setSelectionRange(0, alan.value.length);

                var basarili = false;
                try {
                    basarili = document.execCommand('copy');
                } catch (e) {
                    basarili = false;
                }

                document.body.removeChild(alan);
                if (onceki && secim) {
                    secim.removeAllRanges();
                    secim.addRange(onceki);
                }

                if (basarili) {
                    cozumle();
                } else {
                    reddet(new Error('Kopyalanamadı'));
                }
            });
        }

        document.querySelectorAll('[data-copy]').forEach(function (dugme) {
            dugme.addEventListener('click', function () {
                var metin = dugme.getAttribute('data-copy') || '';
                var eski = dugme.textContent;

                panoyaKopyala(metin).then(function () {
                    dugme.classList.add('copied');
                    dugme.textContent = '✓';
                    setTimeout(function () {
                        dugme.classList.remove('copied');
                        dugme.textContent = eski;
                    }, 1500);
                }).catch(function () {
                    dugme.textContent = '✕';
                    setTimeout(function () {
                        dugme.textContent = eski;
                    }, 1500);
                });
            });
        });

        document.querySelectorAll('[data-toggle]').forEach(function (dugme) {
            dugme.addEventListener('click', function () {
                var id = dugme.getAttribute('data-toggle');
                var icerik = document.getElementById('content-' + id);
                if (!icerik) return;

                if (icerik.classList.contains('hidden')) {
                    icerik.classList.remove('hidden');
                    dugme.classList.add('open');
                    dugme.textContent = '▼ Gizle';
                } else {
                    icerik.classList.add('hidden');
                    dugme.classList.remove('open');
                    dugme.textContent = '▶ Detaylar';
                }
            });
        });
    </script>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        void saveFile(blob, `not-bahcesi-${tarihDamgasi()}.html`);
        setShowExportOptions(false);
        setExportData(null);
    };

    // PDF olarak dışa aktar (tarayıcı print ile - Türkçe karakter desteği)
    const handleExportPDF = async () => {
        const filtered = getFilteredExportData();
        if (!filtered) return;

        const escapeHtml = (text: string) => {
            return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        };

        const buildTreeHTML = (nodes: any[], parentId: string | null = null, depth: number = 0): string => {
            const children = nodes.filter(n => n.parent_id === parentId);
            if (children.length === 0) return '';

            return children.map(node => {
                const title = node.content.split('\n')[0] || 'Başlıksız';
                const content = node.content.split('\n').slice(1).join('\n').trim();
                const childrenHTML = buildTreeHTML(nodes, node.id, depth + 1);
                const isRoot = depth === 0;

                return `
                <div class="node ${isRoot ? 'root' : 'child'}" style="margin-left: ${depth * 20}px;">
                    <div class="node-title">
                        <span class="bullet">${isRoot ? '●' : '○'}</span>
                        <span class="title-text">${escapeHtml(title)}</span>
                    </div>
                    ${content ? `<div class="node-content">${escapeHtml(content)}</div>` : ''}
                    ${childrenHTML}
                </div>`;
            }).join('');
        };

        const gardensHTML = filtered.gardens.map(garden => {
            const gardenNodes = filtered.nodes.filter(n => n.garden_id === garden.id);
            const treesHTML = buildTreeHTML(gardenNodes, null, 0);
            return `
            <div class="garden">
                <h2>${escapeHtml(garden.name)}</h2>
                ${treesHTML || '<p class="empty">Bu bahçede henüz not yok.</p>'}
            </div>`;
        }).join('');

        const printHTML = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Not Bahçesi</title>
    <style>
        @page { margin: 2cm; size: A4; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            color: #1c1917; 
            line-height: 1.6;
            font-size: 11pt;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            padding-bottom: 20px; 
            border-bottom: 2px solid #16a34a;
        }
        .header h1 { 
            color: #16a34a; 
            font-size: 24pt; 
            margin-bottom: 5px;
            font-weight: 600;
        }
        .header .date { 
            color: #78716c; 
            font-size: 10pt; 
        }
        .garden { 
            margin-bottom: 25px; 
            page-break-inside: avoid;
        }
        .garden h2 { 
            color: #16a34a; 
            font-size: 14pt; 
            margin-bottom: 12px;
            padding: 8px 12px;
            background: #f0fdf4;
            border-left: 4px solid #16a34a;
            border-radius: 0 8px 8px 0;
        }
        .node { 
            margin-bottom: 8px;
            page-break-inside: avoid;
        }
        .node.root { 
            margin-top: 12px;
        }
        .node-title { 
            display: flex; 
            align-items: flex-start; 
            gap: 8px;
        }
        .bullet { 
            color: #16a34a; 
            font-size: 8pt;
            margin-top: 4px;
        }
        .node.root .bullet { font-size: 10pt; }
        .title-text { 
            font-weight: 600; 
            color: #1c1917;
        }
        .node.root .title-text { 
            font-size: 12pt;
            color: #166534;
        }
        .node-content { 
            margin-left: 18px; 
            margin-top: 4px;
            padding: 8px 12px;
            background: #fafaf9;
            border-radius: 6px;
            color: #57534e;
            font-size: 10pt;
            white-space: pre-wrap;
            border-left: 2px solid #e7e5e4;
        }
        .empty { 
            color: #a8a29e; 
            font-style: italic; 
            padding: 10px;
        }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌱 Not Bahçesi</h1>
        <p class="date">${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>
    ${gardensHTML}
</body>
</html>`;

        // PDF'i doğrudan dosya olarak üret.
        //
        // jsPDF'in gömülü Helvetica fontu Türkçeye özgü harfleri (ş, ğ, ı, İ)
        // içermediği için metni doğrudan PDF'e yazmak yerine tarayıcının kendi
        // çizim motoruyla (canvas) çizip sayfayı görüntü olarak PDF'e ekleriz.
        // Böylece Türkçe harfler eksiksiz görünür.
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });

        const sayfaGenisligi = doc.internal.pageSize.getWidth();
        const sayfaYuksekligi = doc.internal.pageSize.getHeight();
        const kenar = 48;
        const olcek = 2; // net görüntü için

        interface PdfSatiri { metin: string; boyut: number; kalin: boolean; girinti: number; }
        const satirlar: PdfSatiri[] = [];

        const ekle = (metin: string, boyut: number, kalin: boolean, girinti: number) => {
            satirlar.push({ metin, boyut, kalin, girinti });
        };

        ekle('Not Bahçesi', 24, true, 0);
        ekle(new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }), 11, false, 0);
        satirlar.push({ metin: '', boyut: 12, kalin: false, girinti: 0 });

        for (const garden of filtered.gardens) {
            ekle(garden.name, 17, true, 0);

            const gardenNodes = filtered.nodes.filter((n: any) => n.garden_id === garden.id);
            const gezin = (parentId: string | null, derinlik: number) => {
                const cocuklar = gardenNodes.filter((n: any) => n.parent_id === parentId);
                for (const node of cocuklar) {
                    const baslik = node.content.split('\n')[0] || 'Başlıksız';
                    const govde = node.content.split('\n').slice(1).join('\n').trim();
                    ekle(`${derinlik === 0 ? '•' : '–'} ${baslik}`, 12, derinlik === 0, 12 + derinlik * 16);
                    if (govde) ekle(govde, 10.5, false, 28 + derinlik * 16);
                    gezin(node.id, derinlik + 1);
                }
            };
            gezin(null, 0);
            satirlar.push({ metin: '', boyut: 10, kalin: false, girinti: 0 });
        }

        // Sayfa numarası ve alt bilgi için ayrılan alan
        const altBilgiAlani = 34;

        // Çizim alanı: satır kaydırma ölçümü ve sayfa çizimi için ortak kullanılır
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(sayfaGenisligi * olcek);
        canvas.height = Math.round(sayfaYuksekligi * olcek);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            alert('PDF oluşturulamadı: çizim alanı açılamadı.');
            return;
        }

        /** Bir satırın sayfa genişliğine sığacak biçimde bölünmüş hâli. */
        const sarilanSatirlar = (satir: PdfSatiri): string[] => {
            ctx.font = `${satir.kalin ? '600 ' : ''}${satir.boyut * olcek}px "Segoe UI", Roboto, Arial, sans-serif`;
            const enFazlaGenislik = canvas.width - (kenar * 2 + satir.girinti) * olcek;

            const parcalar: string[] = [];
            let birikim = '';

            for (const kelime of satir.metin.split(' ')) {
                const deneme = birikim ? `${birikim} ${kelime}` : kelime;
                if (ctx.measureText(deneme).width > enFazlaGenislik && birikim) {
                    parcalar.push(birikim);
                    birikim = kelime;
                } else {
                    birikim = deneme;
                }
            }
            if (birikim) parcalar.push(birikim);

            return parcalar.length > 0 ? parcalar : [''];
        };

        const sarilanSatirSayisi = (satir: PdfSatiri) => sarilanSatirlar(satir).length;

        // Satırları sayfalara böl (kaydırma ölçülerek yapılır)
        const sayfalar: PdfSatiri[][] = [];
        let aktif: PdfSatiri[] = [];
        let kullanilan = kenar;

        for (const satir of satirlar) {
            const yukseklik = satir.metin
                ? sarilanSatirSayisi(satir) * satir.boyut * 1.5
                : satir.boyut;

            if (
                kullanilan + yukseklik > sayfaYuksekligi - kenar - altBilgiAlani &&
                aktif.length > 0
            ) {
                sayfalar.push(aktif);
                aktif = [];
                kullanilan = kenar;
            }
            aktif.push(satir);
            kullanilan += yukseklik;
        }
        if (aktif.length > 0) sayfalar.push(aktif);

        sayfalar.forEach((sayfa, sayfaNo) => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            let y = kenar * olcek;

            for (const satir of sayfa) {
                if (!satir.metin) {
                    y += satir.boyut * olcek;
                    continue;
                }

                ctx.font = `${satir.kalin ? '600 ' : ''}${satir.boyut * olcek}px "Segoe UI", Roboto, Arial, sans-serif`;
                ctx.fillStyle = satir.girinti === 0 && satir.kalin ? '#1B3A28' : '#2C251D';

                for (const parca of sarilanSatirlar(satir)) {
                    ctx.fillText(parca, (kenar + satir.girinti) * olcek, y);
                    y += satir.boyut * 1.5 * olcek;
                }
            }

            // Alt bilgi
            ctx.font = `${10 * olcek}px "Segoe UI", Roboto, Arial, sans-serif`;
            ctx.fillStyle = '#7C7268';
            ctx.fillText(
                `Not Bahçesi · ${sayfaNo + 1} / ${sayfalar.length}`,
                kenar * olcek,
                (sayfaYuksekligi - altBilgiAlani / 2) * olcek
            );

            if (sayfaNo > 0) doc.addPage();
            doc.addImage(
                canvas.toDataURL('image/jpeg', 0.92),
                'JPEG',
                0,
                0,
                sayfaGenisligi,
                sayfaYuksekligi
            );
        });

        await saveFile(doc.output('blob'), `not-bahcesi-${tarihDamgasi()}.pdf`);

        setShowExportOptions(false);
        setExportData(null);
    };

    /** Blob'u base64'e çevirir (Capacitor Filesystem base64 bekler). */
    const blobToBase64 = (blob: Blob): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const sonuc = reader.result as string;
                resolve(sonuc.includes(',') ? sonuc.split(',')[1] : sonuc);
            };
            reader.onerror = () => reject(new Error('Dosya okunamadı.'));
            reader.readAsDataURL(blob);
        });

    /**
     * Dışa aktarılan dosyayı cihaza kaydeder.
     *
     * Android uygulamasında tarayıcı indirmesi çalışmadığı için dosya
     * Capacitor Filesystem ile Belgeler klasörüne yazılır ve paylaşım menüsü
     * açılır; kullanıcı dosyayı istediği uygulamaya gönderebilir. Tarayıcıda
     * ise normal indirme kullanılır.
     */
    const saveFile = async (blob: Blob, filename: string) => {
        if (Capacitor.isNativePlatform()) {
            try {
                const base64 = await blobToBase64(blob);
                const { Filesystem, Directory } = await import('@capacitor/filesystem');
                const { Share } = await import('@capacitor/share');

                const yazilan = await Filesystem.writeFile({
                    path: filename,
                    data: base64,
                    directory: Directory.Documents,
                    recursive: true
                });

                await Share.share({
                    title: filename,
                    text: 'Not Bahçesi dışa aktarma',
                    url: yazilan.uri,
                    dialogTitle: 'Dosyayı paylaş'
                });
                return;
            } catch (error) {
                console.error('Dışa aktarma hatası:', error);
                alert(
                    'Dosya kaydedilemedi: ' +
                        (error instanceof Error ? error.message : 'bilinmeyen hata')
                );
                return;
            }
        }

        // Tarayıcı: bağlantıyı DOM'a ekleyip tıklamak, bazı tarayıcılarda
        // indirmenin iptal edilmesini önler.
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    };

    /** Dosya adlarında kullanılan tarih damgası. */
    const tarihDamgasi = () => new Date().toISOString().split('T')[0];

    // Export seçeneklerini kapat
    const handleExportCancel = () => {
        setShowExportOptions(false);
        setExportData(null);
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
            setShowImportOptions(true);
            setShowExportOptions(false); // Diğerini kapat
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
        setShowImportOptions(false);
        setIsImporting(true);

        try {
            // Mevcut bahçeleri al
            const { data: existingGardens, error: existingError } = await supabase
                .from('gardens')
                .select('id')
                .eq('user_id', user.id)
                .is('deleted_at', null);
            if (existingError) throw existingError;

            // Silme bilgisini Drive senkronuna taşıyabilmek için kayıtları tombstone yap.
            if (existingGardens && existingGardens.length > 0) {
                const gardenIds = existingGardens.map(g => g.id);
                const deletedAt = new Date().toISOString();
                const nodeResult = await supabase
                    .from('nodes')
                    .update({ deleted_at: deletedAt, updated_at: deletedAt })
                    .in('garden_id', gardenIds);
                if (nodeResult.error) throw nodeResult.error;
                const gardenResult = await supabase
                    .from('gardens')
                    .update({ deleted_at: deletedAt, updated_at: deletedAt })
                    .in('id', gardenIds);
                if (gardenResult.error) throw gardenResult.error;
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
        setShowImportOptions(false);
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

    // Ortak içe aktarma fonksiyonu - Tek tek insert ile güvenilir ID eşleştirmesi
    const importGardenData = async (data: { gardens: any[]; nodes: any[] }) => {
        if (!user) return;

        // ID eşleştirme için map
        const gardenIdMap: Record<string, string> = {};
        const nodeIdMap: Record<string, string> = {};

        // Bahçeleri tek tek ekle (sıralama garantisi için)
        for (const garden of data.gardens) {
            const { data: insertedGarden, error: gardenError } = await supabase
                .from('gardens')
                .insert({
                    name: garden.name,
                    user_id: user.id,
                        view_state: garden.view_state,
                        deleted_at: null
                    })
                .select()
                .single();

            if (gardenError) {
                console.error('Garden insert error:', gardenError);
                throw gardenError;
            }

            if (insertedGarden) {
                gardenIdMap[garden.id] = insertedGarden.id;
            }
        }

        // Node'ları seviyelerine göre grupla
        const nodesByLevel: Map<number, any[]> = new Map();
        const nodeLevelCache: Map<string, number> = new Map();

        // Node seviyesini hesapla
        const getNodeLevel = (nodeId: string): number => {
            if (nodeLevelCache.has(nodeId)) {
                return nodeLevelCache.get(nodeId)!;
            }
            const node = data.nodes.find((n: any) => n.id === nodeId);
            if (!node || !node.parent_id) {
                nodeLevelCache.set(nodeId, 0);
                return 0;
            }
            const level = 1 + getNodeLevel(node.parent_id);
            nodeLevelCache.set(nodeId, level);
            return level;
        };

        // Tüm node'ları seviyelerine göre grupla
        for (const node of data.nodes) {
            const level = getNodeLevel(node.id);
            if (!nodesByLevel.has(level)) {
                nodesByLevel.set(level, []);
            }
            nodesByLevel.get(level)!.push(node);
        }

        // Seviyeleri sıralı şekilde işle (0, 1, 2, ...)
        const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

        for (const level of sortedLevels) {
            const nodesAtLevel = nodesByLevel.get(level)!;

            // Bu seviyedeki node'ları tek tek ekle (sıralama garantisi için)
            for (const node of nodesAtLevel) {
                // Bahçe eşleşmesi yoksa atla
                if (!gardenIdMap[node.garden_id]) continue;

                const { data: insertedNode, error: nodeError } = await supabase
                    .from('nodes')
                    .insert({
                        garden_id: gardenIdMap[node.garden_id],
                        parent_id: node.parent_id ? nodeIdMap[node.parent_id] : null,
                        content: node.content,
                        position_x: node.position_x,
                        position_y: node.position_y,
                        is_expanded: node.is_expanded ?? true,
                        node_type: node.node_type ?? 'auto',
                        deleted_at: null
                    })
                    .select()
                    .single();

                if (nodeError) {
                    console.error('Node insert error:', nodeError);
                    throw nodeError;
                }

                if (insertedNode) {
                    nodeIdMap[node.id] = insertedNode.id;
                }
            }
        }
    };

    // Import seçeneklerini kapat
    const handleImportCancel = () => {
        setShowImportOptions(false);
        setImportData(null);
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

                                            {/* Ayarlar ve Veri Yönetimi */}
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
                                                            <span className="block text-sm font-semibold text-sand-800">Model, API ve Senkronizasyon</span>
                                                            <span className="mt-0.5 block text-[11px] text-sand-500">AI sağlayıcısı ve Google Drive</span>
                                                        </span>
                                                    </span>
                                                    <ChevronRight size={17} className="flex-shrink-0 text-sand-400" />
                                                </button>

                                                <div className="h-px bg-sand-200" />

                                                <button
                                                    type="button"
                                                    onClick={() => setIsDataSectionOpen(!isDataSectionOpen)}
                                                    aria-expanded={isDataSectionOpen}
                                                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-sand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-moss-500/40"
                                                >
                                                    <span className="flex min-w-0 items-center gap-3">
                                                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-clay-100 text-clay-700">
                                                            <Database size={17} />
                                                        </span>
                                                        <span className="min-w-0">
                                                            <span className="block text-sm font-semibold text-sand-800">Veri Yönetimi</span>
                                                            <span className="mt-0.5 block text-[11px] text-sand-500">İçe ve dışa aktarma araçları</span>
                                                        </span>
                                                    </span>
                                                    <motion.span
                                                        animate={{ rotate: isDataSectionOpen ? 180 : 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="flex-shrink-0"
                                                    >
                                                        <ChevronDown size={17} className="text-sand-400" />
                                                    </motion.span>
                                                </button>

                                                {/* Hidden file input */}
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept=".json"
                                                    onChange={handleFileSelect}
                                                    className="hidden"
                                                />

                                                <AnimatePresence initial={false}>
                                                    {isDataSectionOpen && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden"
                                                        >
                                                <div className="space-y-2 border-t border-sand-200 bg-sand-50/70 p-3">
                                                    {/* Export Section */}
                                                    <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-soft">
                                                        <button
                                                            onClick={handleExportClick}
                                                            disabled={isExporting || gardens.length === 0}
                                                            className="flex w-full items-center justify-between gap-3 px-4 py-3 transition-colors duration-200 hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                {isExporting ? (
                                                                    <Loader2 size={18} className="text-moss-600 animate-spin" />
                                                                ) : (
                                                                    <Download size={18} className="text-moss-600" />
                                                                )}
                                                                <div className="text-left">
                                                                    <p className="font-medium text-sand-700 text-sm">Dışa Aktar</p>
                                                                    <p className="text-xs text-sand-500">JSON, HTML veya PDF</p>
                                                                </div>
                                                            </div>
                                                            <motion.div
                                                                animate={{ rotate: showExportOptions ? 180 : 0 }}
                                                                transition={{ duration: 0.2 }}
                                                            >
                                                                <ChevronDown size={16} className="text-sand-400" />
                                                            </motion.div>
                                                        </button>

                                                        <AnimatePresence>
                                                            {showExportOptions && exportData && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="px-4 pb-4 pt-2 border-t border-sand-200 space-y-3">
                                                                        {exportStep === 'select' ? (
                                                                            <>
                                                                                <p className="text-xs text-sand-600">
                                                                                    {selectedGardenIds.size} / {exportData.gardens.length} bahçe seçili
                                                                                </p>

                                                                                {/* Tümünü Seç */}
                                                                                <button
                                                                                    onClick={() => { selectAllGardens(); setExportStep('format'); }}
                                                                                    className="w-full flex items-center gap-2 px-3 py-2 bg-moss-50 hover:bg-moss-100 border border-moss-200 rounded-lg transition-all text-left"
                                                                                >
                                                                                    <TreePine size={14} className="text-moss-600" />
                                                                                    <span className="text-xs font-medium text-moss-700">Tümünü Seç ve Devam</span>
                                                                                </button>

                                                                                {/* Bahçe listesi */}
                                                                                <div className="max-h-32 overflow-y-auto space-y-1.5">
                                                                                    {exportData.gardens.map(garden => {
                                                                                        const nodeCount = exportData.nodes.filter(n => n.garden_id === garden.id).length;
                                                                                        const isSelected = selectedGardenIds.has(garden.id);
                                                                                        return (
                                                                                            <button
                                                                                                key={garden.id}
                                                                                                onClick={() => toggleGardenSelection(garden.id)}
                                                                                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left text-xs ${isSelected
                                                                                                    ? 'bg-moss-100 border border-moss-400'
                                                                                                    : 'bg-white/80 border border-sand-200 hover:border-moss-300'
                                                                                                    }`}
                                                                                            >
                                                                                                <div className={`w-4 h-4 rounded flex items-center justify-center ${isSelected ? 'bg-moss-500' : 'bg-sand-200'}`}>
                                                                                                    {isSelected && <span className="text-white text-[10px]">✓</span>}
                                                                                                </div>
                                                                                                <span className="flex-1 truncate text-sand-700">{garden.name}</span>
                                                                                                <span className="text-sand-400">{nodeCount} not</span>
                                                                                            </button>
                                                                                        );
                                                                                    })}
                                                                                </div>

                                                                                <button
                                                                                    onClick={() => setExportStep('format')}
                                                                                    disabled={selectedGardenIds.size === 0}
                                                                                    className="w-full py-2 bg-moss-500 hover:bg-moss-600 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                >
                                                                                    Devam
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <p className="text-xs text-sand-600">Format seçin:</p>

                                                                                <div className="grid grid-cols-3 gap-2">
                                                                                    <button
                                                                                        onClick={handleExportJSON}
                                                                                        className="flex flex-col items-center gap-1 px-3 py-3 bg-clay-50 hover:bg-clay-100 border border-clay-200 rounded-lg transition-all"
                                                                                    >
                                                                                        <FileJson size={18} className="text-clay-600" />
                                                                                        <span className="text-xs font-medium text-clay-700">JSON</span>
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={handleExportHTML}
                                                                                        className="flex flex-col items-center gap-1 px-3 py-3 bg-moss-50 hover:bg-moss-100 border border-moss-200 rounded-lg transition-all"
                                                                                    >
                                                                                        <FileText size={18} className="text-moss-600" />
                                                                                        <span className="text-xs font-medium text-moss-700">HTML</span>
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={handleExportPDF}
                                                                                        className="flex flex-col items-center gap-1 px-3 py-3 bg-berry-50 hover:bg-berry-100 border border-berry-200 rounded-lg transition-all"
                                                                                    >
                                                                                        <FileType size={18} className="text-berry-600" />
                                                                                        <span className="text-xs font-medium text-berry-700">PDF</span>
                                                                                    </button>
                                                                                </div>

                                                                                <button
                                                                                    onClick={() => setExportStep('select')}
                                                                                    className="w-full py-2 bg-sand-100 hover:bg-sand-200 text-sand-600 text-xs font-medium rounded-lg transition-all"
                                                                                >
                                                                                    ← Geri
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>

                                                    {/* Import Section */}
                                                    <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-soft">
                                                        <button
                                                            onClick={() => {
                                                                if (showImportOptions) {
                                                                    handleImportCancel();
                                                                } else {
                                                                    fileInputRef.current?.click();
                                                                }
                                                            }}
                                                            disabled={isImporting}
                                                            className="flex w-full items-center justify-between gap-3 px-4 py-3 transition-colors duration-200 hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                {isImporting ? (
                                                                    <Loader2 size={18} className="text-clay-600 animate-spin" />
                                                                ) : (
                                                                    <Upload size={18} className="text-clay-600" />
                                                                )}
                                                                <div className="text-left">
                                                                    <p className="font-medium text-sand-700 text-sm">İçe Aktar</p>
                                                                    <p className="text-xs text-sand-500">JSON dosyasından yükle</p>
                                                                </div>
                                                            </div>
                                                            {showImportOptions && (
                                                                <motion.div
                                                                    animate={{ rotate: 180 }}
                                                                    transition={{ duration: 0.2 }}
                                                                >
                                                                    <ChevronDown size={16} className="text-sand-400" />
                                                                </motion.div>
                                                            )}
                                                        </button>

                                                        <AnimatePresence>
                                                            {showImportOptions && importData && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="px-4 pb-4 pt-2 border-t border-sand-200 space-y-3">
                                                                        <p className="text-xs text-sand-600">
                                                                            {importData.gardens.length} bahçe, {importData.nodes.length} not bulundu
                                                                        </p>

                                                                        <button
                                                                            onClick={handleImportAppend}
                                                                            className="w-full flex items-center gap-3 px-3 py-2.5 bg-moss-50 hover:bg-moss-100 border border-moss-200 rounded-lg transition-all text-left"
                                                                        >
                                                                            <Upload size={16} className="text-moss-600" />
                                                                            <div>
                                                                                <p className="text-xs font-medium text-moss-700">Mevcut Verilere Ekle</p>
                                                                                <p className="text-[10px] text-moss-500">Verileriniz korunur</p>
                                                                            </div>
                                                                        </button>

                                                                        <button
                                                                            onClick={handleImportReplace}
                                                                            className="w-full flex items-center gap-3 px-3 py-2.5 bg-berry-50 hover:bg-berry-100 border border-berry-200 rounded-lg transition-all text-left"
                                                                        >
                                                                            <Database size={16} className="text-berry-600" />
                                                                            <div>
                                                                                <p className="text-xs font-medium text-berry-700">Verileri Değiştir</p>
                                                                                <p className="text-[10px] text-berry-500">Mevcut veriler silinir</p>
                                                                            </div>
                                                                        </button>

                                                                        <button
                                                                            onClick={handleImportCancel}
                                                                            className="w-full py-2 bg-sand-100 hover:bg-sand-200 text-sand-600 text-xs font-medium rounded-lg transition-all"
                                                                        >
                                                                            İptal
                                                                        </button>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                </div>
                                                        </motion.div>
                                                    )}
                                                    </AnimatePresence>
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
