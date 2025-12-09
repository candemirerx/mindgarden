'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, User, TreePine, Leaf, Download, Upload, Database, Loader2, Mail, Eye, EyeOff, FileJson, FileText, FileType, ChevronDown } from 'lucide-react';
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

    // İçe aktarma inline state'leri
    const [showImportOptions, setShowImportOptions] = useState(false);
    const [importData, setImportData] = useState<{ gardens: any[]; nodes: any[] } | null>(null);

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
                } else if (error.message.includes('Signups not allowed') || error.message.includes('signups are disabled')) {
                    setAuthError('E-posta ile kayıt şu an kapalı. Lütfen Google ile giriş yapın.');
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
                .eq('user_id', user.id);

            if (gardensError) throw gardensError;

            let nodesData: any[] = [];
            const gardenIds = gardensData?.map(g => g.id) || [];

            if (gardenIds.length > 0) {
                const { data: fetchedNodes, error: nodesError } = await supabase
                    .from('nodes')
                    .select('*')
                    .in('garden_id', gardenIds);

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
        downloadFile(blob, `not-bahcesi-backup-${new Date().toISOString().split('T')[0]}.json`);
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
                        <button onclick="copyText(\`${escapeJs(title)}\`, this)" class="copy-btn copy-title">📋</button>
                        ${content ? `<button onclick="copyText(\`${escapeJs(content)}\`, this)" class="copy-btn copy-content">📄</button>` : ''}
                        ${content ? `<button onclick="toggleContent('${nodeId}')" class="toggle-btn" id="toggle-${nodeId}">▶ Detaylar</button>` : ''}
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
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; background: #fafaf9; color: #1c1917; line-height: 1.5; }
        h1 { color: #166534; text-align: center; margin-bottom: 8px; font-size: 28px; }
        .subtitle { text-align: center; color: #78716c; margin-bottom: 32px; font-size: 14px; }
        .garden { margin-bottom: 32px; padding: 20px; background: #f5f5f4; border-radius: 16px; border: 1px solid #e7e5e4; }
        .garden h2 { color: #166534; margin-bottom: 16px; font-size: 20px; }
        .empty { color: #a8a29e; font-style: italic; }
        .node-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .icon { font-size: 16px; }
        .title { color: #166534; font-size: 15px; }
        .copy-btn { padding: 4px 8px; font-size: 11px; background: #ecfccb; border: 1px solid #bef264; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
        .copy-btn:hover { background: #d9f99d; }
        .copy-btn.copied { background: #22c55e; color: white; border-color: #22c55e; }
        .toggle-btn { padding: 4px 10px; font-size: 11px; background: #e0f2fe; border: 1px solid #7dd3fc; border-radius: 6px; cursor: pointer; transition: all 0.2s; color: #0369a1; }
        .toggle-btn:hover { background: #bae6fd; }
        .toggle-btn.open { background: #0ea5e9; color: white; border-color: #0ea5e9; }
        .content { margin-left: 28px; margin-top: 8px; padding: 12px; background: white; border-radius: 8px; border: 1px solid #e7e5e4; color: #57534e; white-space: pre-wrap; font-size: 14px; }
        .content.hidden { display: none; }
        .children { margin-top: 12px; }
    </style>
</head>
<body>
    <h1>🌱 Not Bahçesi</h1>
    <p class="subtitle">Dışa aktarım tarihi: ${new Date().toLocaleDateString('tr-TR')}</p>
    ${gardensHTML}
    <script>
        function copyText(text, btn) {
            navigator.clipboard.writeText(text).then(() => {
                const original = btn.textContent;
                btn.classList.add('copied');
                btn.textContent = '✓';
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.textContent = original;
                }, 1500);
            });
        }
        function toggleContent(id) {
            const content = document.getElementById('content-' + id);
            const btn = document.getElementById('toggle-' + id);
            if (content.classList.contains('hidden')) {
                content.classList.remove('hidden');
                btn.classList.add('open');
                btn.textContent = '▼ Gizle';
            } else {
                content.classList.add('hidden');
                btn.classList.remove('open');
                btn.textContent = '▶ Detaylar';
            }
        }
    </script>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        downloadFile(blob, `not-bahcesi-${new Date().toISOString().split('T')[0]}.html`);
        setShowExportOptions(false);
        setExportData(null);
    };

    // PDF olarak dışa aktar (tarayıcı print ile - Türkçe karakter desteği)
    const handleExportPDF = () => {
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

        // Yeni pencere aç ve yazdır
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printHTML);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
                printWindow.onafterprint = () => printWindow.close();
            };
        }

        setShowExportOptions(false);
        setExportData(null);
    };

    // Dosya indirme yardımcı fonksiyonu
    const downloadFile = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

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

    // Ortak içe aktarma fonksiyonu - Optimize edilmiş batch insert
    const importGardenData = async (data: { gardens: any[]; nodes: any[] }) => {
        if (!user) return;

        // ID eşleştirme için map
        const gardenIdMap: Record<string, string> = {};
        const nodeIdMap: Record<string, string> = {};

        // Bahçeleri toplu ekle
        const gardensToInsert = data.gardens.map(garden => ({
            name: garden.name,
            user_id: user.id,
            view_state: garden.view_state
        }));

        const { data: insertedGardens, error: gardenError } = await supabase
            .from('gardens')
            .insert(gardensToInsert)
            .select();

        if (gardenError) throw gardenError;

        // Eski ID -> Yeni ID eşleştirmesi
        if (insertedGardens) {
            data.gardens.forEach((oldGarden, index) => {
                if (insertedGardens[index]) {
                    gardenIdMap[oldGarden.id] = insertedGardens[index].id;
                }
            });
        }

        // Node'ları seviyelerine göre grupla (performanslı)
        const nodesByLevel: Map<number, any[]> = new Map();
        const nodeLevelCache: Map<string, number> = new Map();

        // Önce parent_id olmayan (root) node'ları bul
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

            // Bu seviyedeki node'ları hazırla
            const nodesToInsert = nodesAtLevel
                .filter(node => gardenIdMap[node.garden_id]) // Sadece eşleşen bahçeler
                .map(node => ({
                    garden_id: gardenIdMap[node.garden_id],
                    parent_id: node.parent_id ? nodeIdMap[node.parent_id] : null,
                    content: node.content,
                    position_x: node.position_x,
                    position_y: node.position_y,
                    is_expanded: node.is_expanded ?? true
                }));

            if (nodesToInsert.length === 0) continue;

            // Toplu insert
            const { data: insertedNodes, error: nodeError } = await supabase
                .from('nodes')
                .insert(nodesToInsert)
                .select();

            if (nodeError) {
                console.error('Node batch insert error:', nodeError);
                throw nodeError;
            }

            // ID eşleştirmesini güncelle
            if (insertedNodes) {
                const filteredNodesAtLevel = nodesAtLevel.filter(node => gardenIdMap[node.garden_id]);
                filteredNodesAtLevel.forEach((oldNode, index) => {
                    if (insertedNodes[index]) {
                        nodeIdMap[oldNode.id] = insertedNodes[index].id;
                    }
                });
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

                                                <div className="space-y-2">
                                                    {/* Hidden file input */}
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept=".json"
                                                        onChange={handleFileSelect}
                                                        className="hidden"
                                                    />

                                                    {/* Export Section */}
                                                    <div className="bg-white/60 border border-stone-200 rounded-xl overflow-hidden">
                                                        <button
                                                            onClick={handleExportClick}
                                                            disabled={isExporting || gardens.length === 0}
                                                            className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                {isExporting ? (
                                                                    <Loader2 size={18} className="text-emerald-600 animate-spin" />
                                                                ) : (
                                                                    <Download size={18} className="text-emerald-600" />
                                                                )}
                                                                <div className="text-left">
                                                                    <p className="font-medium text-stone-700 text-sm">Dışa Aktar</p>
                                                                    <p className="text-xs text-stone-500">JSON, HTML veya PDF</p>
                                                                </div>
                                                            </div>
                                                            <motion.div
                                                                animate={{ rotate: showExportOptions ? 180 : 0 }}
                                                                transition={{ duration: 0.2 }}
                                                            >
                                                                <ChevronDown size={16} className="text-stone-400" />
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
                                                                    <div className="px-4 pb-4 pt-2 border-t border-stone-200 space-y-3">
                                                                        {exportStep === 'select' ? (
                                                                            <>
                                                                                <p className="text-xs text-stone-600">
                                                                                    {selectedGardenIds.size} / {exportData.gardens.length} bahçe seçili
                                                                                </p>

                                                                                {/* Tümünü Seç */}
                                                                                <button
                                                                                    onClick={() => { selectAllGardens(); setExportStep('format'); }}
                                                                                    className="w-full flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all text-left"
                                                                                >
                                                                                    <TreePine size={14} className="text-emerald-600" />
                                                                                    <span className="text-xs font-medium text-emerald-700">Tümünü Seç ve Devam</span>
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
                                                                                                    ? 'bg-emerald-100 border border-emerald-400'
                                                                                                    : 'bg-white/80 border border-stone-200 hover:border-emerald-300'
                                                                                                    }`}
                                                                                            >
                                                                                                <div className={`w-4 h-4 rounded flex items-center justify-center ${isSelected ? 'bg-emerald-500' : 'bg-stone-200'}`}>
                                                                                                    {isSelected && <span className="text-white text-[10px]">✓</span>}
                                                                                                </div>
                                                                                                <span className="flex-1 truncate text-stone-700">{garden.name}</span>
                                                                                                <span className="text-stone-400">{nodeCount} not</span>
                                                                                            </button>
                                                                                        );
                                                                                    })}
                                                                                </div>

                                                                                <button
                                                                                    onClick={() => setExportStep('format')}
                                                                                    disabled={selectedGardenIds.size === 0}
                                                                                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                >
                                                                                    Devam
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <p className="text-xs text-stone-600">Format seçin:</p>

                                                                                <div className="grid grid-cols-3 gap-2">
                                                                                    <button
                                                                                        onClick={handleExportJSON}
                                                                                        className="flex flex-col items-center gap-1 px-3 py-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all"
                                                                                    >
                                                                                        <FileJson size={18} className="text-amber-600" />
                                                                                        <span className="text-xs font-medium text-amber-700">JSON</span>
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={handleExportHTML}
                                                                                        className="flex flex-col items-center gap-1 px-3 py-3 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-all"
                                                                                    >
                                                                                        <FileText size={18} className="text-sky-600" />
                                                                                        <span className="text-xs font-medium text-sky-700">HTML</span>
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={handleExportPDF}
                                                                                        className="flex flex-col items-center gap-1 px-3 py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all"
                                                                                    >
                                                                                        <FileType size={18} className="text-rose-600" />
                                                                                        <span className="text-xs font-medium text-rose-700">PDF</span>
                                                                                    </button>
                                                                                </div>

                                                                                <button
                                                                                    onClick={() => setExportStep('select')}
                                                                                    className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-medium rounded-lg transition-all"
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
                                                    <div className="bg-white/60 border border-stone-200 rounded-xl overflow-hidden">
                                                        <button
                                                            onClick={() => {
                                                                if (showImportOptions) {
                                                                    handleImportCancel();
                                                                } else {
                                                                    fileInputRef.current?.click();
                                                                }
                                                            }}
                                                            disabled={isImporting}
                                                            className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                {isImporting ? (
                                                                    <Loader2 size={18} className="text-amber-600 animate-spin" />
                                                                ) : (
                                                                    <Upload size={18} className="text-amber-600" />
                                                                )}
                                                                <div className="text-left">
                                                                    <p className="font-medium text-stone-700 text-sm">İçe Aktar</p>
                                                                    <p className="text-xs text-stone-500">JSON dosyasından yükle</p>
                                                                </div>
                                                            </div>
                                                            {showImportOptions && (
                                                                <motion.div
                                                                    animate={{ rotate: 180 }}
                                                                    transition={{ duration: 0.2 }}
                                                                >
                                                                    <ChevronDown size={16} className="text-stone-400" />
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
                                                                    <div className="px-4 pb-4 pt-2 border-t border-stone-200 space-y-3">
                                                                        <p className="text-xs text-stone-600">
                                                                            {importData.gardens.length} bahçe, {importData.nodes.length} not bulundu
                                                                        </p>

                                                                        <button
                                                                            onClick={handleImportAppend}
                                                                            className="w-full flex items-center gap-3 px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all text-left"
                                                                        >
                                                                            <Upload size={16} className="text-emerald-600" />
                                                                            <div>
                                                                                <p className="text-xs font-medium text-emerald-700">Mevcut Verilere Ekle</p>
                                                                                <p className="text-[10px] text-emerald-500">Verileriniz korunur</p>
                                                                            </div>
                                                                        </button>

                                                                        <button
                                                                            onClick={handleImportReplace}
                                                                            className="w-full flex items-center gap-3 px-3 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all text-left"
                                                                        >
                                                                            <Database size={16} className="text-red-600" />
                                                                            <div>
                                                                                <p className="text-xs font-medium text-red-700">Verileri Değiştir</p>
                                                                                <p className="text-[10px] text-red-500">Mevcut veriler silinir</p>
                                                                            </div>
                                                                        </button>

                                                                        <button
                                                                            onClick={handleImportCancel}
                                                                            className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-medium rounded-lg transition-all"
                                                                        >
                                                                            İptal
                                                                        </button>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
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
