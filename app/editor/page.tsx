'use client';

import { useEffect, Suspense, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { ArrowLeft, Save, Copy, Check, PenLine, Loader2, X, Download } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { initDriveAutoSync } from '@/lib/driveSync';
import { readEnabledMacros } from '@/lib/aiMacro';
import type { AiMacro } from '@/lib/aiMacro';
import { Capacitor } from '@capacitor/core';

function EditorPageInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const gardenId = searchParams.get('id') || '';
    const nodeId = searchParams.get('nodeId') || '';

    const { nodes, updateNode, fetchNodes } = useStore();
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [showCopied, setShowCopied] = useState(false);
    const [isSpellChecking, setIsSpellChecking] = useState(false);
    const [pendingSpellCheck, setPendingSpellCheck] = useState<{ original: string; corrected: string } | null>(null);
    const [macros, setMacros] = useState<AiMacro[]>([]);
    const [activeMacroId, setActiveMacroId] = useState<string | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [autoSave, setAutoSave] = useState(true);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [loadedNodeKey, setLoadedNodeKey] = useState<string | null>(null);
    const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, onConfirm?: () => void}>({ isOpen: false });

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const loadingNodeKeyRef = useRef<string | null>(null);

    const currentNode = nodes.find(n => n.id === nodeId);

    // Editör sayfası Sidebar içermez; otomatik Drive yedeklemesini burada da başlat.
    useEffect(() => {
        initDriveAutoSync(useStore);
    }, []);

    useEffect(() => {
        const nodeKey = `${gardenId}:${nodeId}`;
        if (
            !gardenId ||
            !nodeId ||
            currentNode ||
            loadedNodeKey === nodeKey ||
            loadingNodeKeyRef.current === nodeKey
        ) return;

        let active = true;
        loadingNodeKeyRef.current = nodeKey;
        void fetchNodes(gardenId).finally(() => {
            if (loadingNodeKeyRef.current === nodeKey) {
                loadingNodeKeyRef.current = null;
            }
            if (active) setLoadedNodeKey(nodeKey);
        });

        return () => {
            active = false;
        };
    }, [gardenId, nodeId, currentNode, loadedNodeKey, fetchNodes]);

    useEffect(() => {
        if (currentNode) {
            const lines = currentNode.content.split('\n');
            setTitle(lines[0] || '');
            setContent(lines.slice(1).join('\n').trim());
        }
    }, [currentNode]);

    // Kaydetme fonksiyonu
    const saveContent = useCallback(async () => {
        if (!hasChanges) return;
        setIsSaving(true);
        const fullContent = `${title}\n${content}`;
        await updateNode(nodeId, fullContent);
        setHasChanges(false);
        setLastSaved(new Date());
        setIsSaving(false);
    }, [title, content, nodeId, updateNode, hasChanges]);

    // Otomatik kaydetme
    useEffect(() => {
        if (autoSave && hasChanges) {
            // Önceki timeout'u temizle
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
            // 1.5 saniye sonra kaydet
            autoSaveTimeoutRef.current = setTimeout(() => {
                saveContent();
            }, 1500);
        }

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [autoSave, hasChanges, title, content, saveContent]);

    const handleSave = async () => {
        await saveContent();
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
    };

    const handleClose = () => {
        if (hasChanges && !autoSave) {
            setConfirmConfig({
                isOpen: true,
                onConfirm: () => {
                    setConfirmConfig({ isOpen: false });
                    router.back();
                }
            });
        } else {
            router.back();
        }
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        setHasChanges(true);
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        setHasChanges(true);
    };

    // Ayarlarda etkin bırakılan AI makroları (imla düzeltme dahil).
    // Kapalı veya boş makrolar araç çubuğunda yer kaplamaz.
    useEffect(() => {
        setMacros(readEnabledMacros());
    }, []);

    // Makro çalıştırma
    const runMacro = async (macro: AiMacro) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const selectionStart = textarea.selectionStart;
        const selectionEnd = textarea.selectionEnd;
        const hasSelection = selectionStart !== selectionEnd;

        const textToCheck = hasSelection
            ? content.substring(selectionStart, selectionEnd)
            : content;

        if (!textToCheck.trim()) return;

        setIsSpellChecking(true);
        setActiveMacroId(macro.id);

        try {
            // İstemcinin girdiği ayarları al
            const clientApiKey = localStorage.getItem('nb-ai-key') || localStorage.getItem('nb-gemini-key') || '';
            const provider = localStorage.getItem('nb-ai-provider') || 'gemini';
            const customUrl = localStorage.getItem('nb-ai-custom-url') || '';
            const customModel = localStorage.getItem('nb-ai-custom-model') || '';

            const spellcheckUrl = Capacitor.isNativePlatform()
                ? 'https://mindgarden-neon.vercel.app/api/spellcheck'
                : '/api/spellcheck';
            const response = await fetch(spellcheckUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: textToCheck,
                    clientApiKey,
                    provider,
                    customUrl,
                    customModel,
                    macro: macro.instruction
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                throw new Error(errData?.error || 'API hatası');
            }

            const data = await response.json();
            const correctedText = data.correctedText;

            setPendingSpellCheck({ original: content, corrected: '' });

            if (hasSelection) {
                const newContent =
                    content.substring(0, selectionStart) +
                    correctedText +
                    content.substring(selectionEnd);
                setPendingSpellCheck({ original: content, corrected: newContent });
                setContent(newContent);
            } else {
                setPendingSpellCheck({ original: content, corrected: correctedText });
                setContent(correctedText);
            }
        } catch (error: any) {
            console.error('AI makro hatası:', error);
            alert(error.message || `"${macro.title}" makrosu çalıştırılamadı.`);
        } finally {
            setIsSpellChecking(false);
            setActiveMacroId(null);
        }
    };

    const handleAcceptSpellCheck = () => {
        setHasChanges(true);
        setPendingSpellCheck(null);
    };

    const handleRejectSpellCheck = () => {
        if (pendingSpellCheck) {
            setContent(pendingSpellCheck.original);
        }
        setPendingSpellCheck(null);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
                setShowExportMenu(false);
            }
        };
        if (showExportMenu) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showExportMenu]);

    const handleExportPDF = async () => {
        setShowExportMenu(false);
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const maxWidth = pageWidth - margin * 2;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(title || 'Başlıksız Not', margin, 25);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(content, maxWidth);
        doc.text(lines, margin, 40);

        doc.save(`${title || 'not'}.pdf`);
    };

    const handleExportWord = async () => {
        setShowExportMenu(false);
        const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        text: title || 'Başlıksız Not',
                        heading: HeadingLevel.HEADING_1,
                    }),
                    ...content.split('\n').map(line =>
                        new Paragraph({
                            children: [new TextRun(line)],
                        })
                    ),
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title || 'not'}.docx`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Son kaydetme zamanını formatla
    const formatLastSaved = () => {
        if (!lastSaved) return null;
        const now = new Date();
        const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);
        if (diff < 5) return 'Az önce kaydedildi';
        if (diff < 60) return `${diff} sn önce kaydedildi`;
        return `${Math.floor(diff / 60)} dk önce kaydedildi`;
    };

    return (
        <div className="min-h-screen bg-sand-200 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-sand-300 pt-[env(safe-area-inset-top,0px)]">
                <div className="flex items-center justify-between px-4 sm:px-6 py-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-sand-100 rounded-lg transition-colors"
                            title="Geri Dön"
                        >
                            <ArrowLeft size={20} className="text-sand-600" />
                        </button>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-base sm:text-lg font-semibold text-sand-800 truncate">
                                {title || 'Başlıksız Not'}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                        {/* Kopyala */}
                        <button
                            onClick={handleCopy}
                            className={`p-2.5 rounded-lg transition-all ${showCopied ? 'bg-moss-100 text-moss-600' : 'text-sand-500 hover:bg-sand-100 hover:text-sand-700'}`}
                            title="İçeriği Kopyala"
                        >
                            {showCopied ? <Check size={20} /> : <Copy size={20} />}
                        </button>

                        {/* Export */}
                        <div className="relative" ref={exportMenuRef}>
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="p-2.5 text-sand-500 hover:bg-sand-100 hover:text-sand-700 rounded-lg transition-colors"
                                title="Dışa Aktar"
                            >
                                <Download size={20} />
                            </button>

                            {showExportMenu && (
                                <div className="absolute right-0 top-full mt-1 bg-white border border-sand-200 rounded-xl shadow-lift py-1.5 min-w-[150px] z-50">
                                    <button
                                        onClick={handleExportPDF}
                                        className="w-full px-4 py-2.5 text-left text-sm text-sand-700 hover:bg-sand-50 transition-colors"
                                    >
                                        PDF olarak indir
                                    </button>
                                    <button
                                        onClick={handleExportWord}
                                        className="w-full px-4 py-2.5 text-left text-sm text-sand-700 hover:bg-sand-50 transition-colors"
                                    >
                                        Word olarak indir
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Ayırıcı */}
                        <div className="h-6 w-px bg-sand-200 mx-1" />

                        {/* Otomatik Kaydet Toggle + Kaydet Butonu */}
                        <div className="flex flex-col items-center gap-0.5">
                            {/* Otomatik kaydet checkbox */}
                            <label className="flex items-center gap-1 cursor-pointer" title="Otomatik Kaydet">
                                <input
                                    type="checkbox"
                                    checked={autoSave}
                                    onChange={(e) => setAutoSave(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-sand-300 text-moss-600 focus:ring-moss-500 focus:ring-offset-0 cursor-pointer"
                                />
                                <span className="text-[10px] text-sand-500">Oto</span>
                            </label>

                            {/* Kaydet butonu */}
                            <button
                                onClick={handleSave}
                                disabled={!hasChanges || isSaving || autoSave}
                                className={`p-2 rounded-lg transition-all ${
                                    isSaving
                                        ? 'bg-moss-100 text-moss-600'
                                        : hasChanges && !autoSave
                                            ? 'bg-moss-600 hover:bg-moss-700 text-white'
                                            : 'bg-sand-100 text-sand-400 cursor-not-allowed'
                                }`}
                                title={autoSave ? 'Otomatik kaydetme açık' : 'Kaydet'}
                            >
                                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* AI Toolbar */}
                <div className="flex items-center gap-2 border-t border-sand-200 bg-gradient-to-r from-clay-50 to-clay-50 px-4 py-2 sm:px-6">
                    <span className="mr-1 flex-shrink-0 text-xs font-medium text-clay-600">AI</span>

                    {pendingSpellCheck ? (
                        <div
                            className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5"
                            role="group"
                            aria-label="Yapay zekâ sonucu"
                        >
                            <span
                                role="status"
                                className="flex-shrink-0 text-xs font-medium text-sand-600"
                            >
                                Sonuç hazır:
                            </span>
                            <button
                                onClick={handleAcceptSpellCheck}
                                aria-label="Yapay zekâ sonucunu onayla ve nota uygula"
                                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-moss-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-moss-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-400 sm:flex-none"
                            >
                                <Check size={18} />
                                Onayla
                            </button>
                            <button
                                onClick={handleRejectSpellCheck}
                                aria-label="Yapay zekâ sonucunu geri al ve notu eski haline döndür"
                                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-berry-300 bg-white px-4 text-sm font-semibold text-berry-700 transition-colors hover:bg-berry-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berry-300 sm:flex-none"
                            >
                                <X size={18} />
                                Geri Al
                            </button>
                        </div>
                    ) : (
                        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5">
                            {macros.map((macro) => {
                                const isRunning = isSpellChecking && activeMacroId === macro.id;
                                const isDisabled = isSpellChecking || !content.trim();

                                return (
                                    <button
                                        key={macro.id}
                                        type="button"
                                        onClick={() => runMacro(macro)}
                                        disabled={isDisabled}
                                        title={macro.subtitle || macro.title}
                                        className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                                            isDisabled
                                                ? 'bg-sand-200 text-sand-400 cursor-not-allowed'
                                                : 'bg-clay-600 text-white shadow-soft hover:bg-clay-700 hover:shadow'
                                        }`}
                                    >
                                        {isRunning ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <PenLine size={16} />
                                        )}
                                        <span className="whitespace-nowrap">
                                            {isRunning ? 'Çalışıyor…' : macro.title}
                                        </span>
                                    </button>
                                );
                            })}

                            {macros.length === 0 && (
                                <span className="text-xs text-sand-500">
                                    Makro bulunamadı. Ayarlardan makro ekleyin.
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </header>

            {/* Editor Area */}
            <main className="flex-1 overflow-auto py-4 sm:py-6">
                <div className="max-w-4xl mx-auto px-4 sm:px-0">
                    <div className="bg-white shadow-card min-h-[600px] sm:min-h-[842px] rounded-lg sm:rounded-none">
                        {/* Başlık */}
                        <div className="border-b border-sand-200 px-6 sm:px-12 pt-6 pb-4">
                            <input
                                type="text"
                                value={title}
                                onChange={handleTitleChange}
                                placeholder="Başlık"
                                className="w-full text-xl font-semibold text-sand-800 outline-none placeholder:text-sand-300"
                            />
                        </div>

                        {/* İçerik */}
                        <div className="px-6 sm:px-12 py-6">
                            <textarea
                                ref={textareaRef}
                                value={content}
                                onChange={handleContentChange}
                                placeholder="İçeriğinizi buraya yazın..."
                                className="w-full min-h-[500px] sm:min-h-[600px] resize-none outline-none text-sand-700 text-base leading-relaxed placeholder:text-sand-300"
                                autoFocus
                            />
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-sand-300 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] pt-2 sm:px-6">
                <div className="flex items-center justify-between text-xs text-sand-500">
                    <span>
                        {isSaving ? (
                            <span className="flex items-center gap-1">
                                <Loader2 size={12} className="animate-spin" />
                                Kaydediliyor...
                            </span>
                        ) : autoSave ? (
                            formatLastSaved() || 'Otomatik kaydetme açık'
                        ) : hasChanges ? (
                            '● Kaydedilmemiş değişiklikler'
                        ) : (
                            'Kaydedildi'
                        )}
                    </span>
                    <div className="flex items-center gap-4 sm:gap-6">
                        <span>{content.split(/\s+/).filter(w => w.length > 0).length} kelime</span>
                        <span className="hidden sm:inline">{content.length} karakter</span>
                    </div>
                </div>
            </footer>

            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                title="Kaydedilmemiş değişiklikler"
                description="Kaydetmeden çıkarsan yaptığın son değişiklikler kaybolacak."
                confirmText="Yine de çık"
                cancelText="Düzenlemeye devam et"
                isDanger
                onCancel={() => setConfirmConfig({ isOpen: false })}
                onConfirm={() => confirmConfig.onConfirm?.()}
            />
        </div>
    );
}

export default function EditorPage() {
  return <Suspense fallback={<div>Yükleniyor...</div>}><EditorPageInner /></Suspense>;
}
