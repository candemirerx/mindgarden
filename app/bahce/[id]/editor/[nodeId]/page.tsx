'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { ArrowLeft, Save, Copy, Check, PenLine, Loader2, X, Download } from 'lucide-react';

export default function EditorPage() {
    const params = useParams();
    const router = useRouter();
    const gardenId = params.id as string;
    const nodeId = params.nodeId as string;

    const { nodes, updateNode } = useStore();
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [showCopied, setShowCopied] = useState(false);
    const [isSpellChecking, setIsSpellChecking] = useState(false);
    const [pendingSpellCheck, setPendingSpellCheck] = useState<{ original: string; corrected: string } | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    const currentNode = nodes.find(n => n.id === nodeId);

    useEffect(() => {
        if (currentNode) {
            const lines = currentNode.content.split('\n');
            setTitle(lines[0] || '');
            setContent(lines.slice(1).join('\n').trim());
        }
    }, [currentNode]);

    const handleSave = async () => {
        setIsSaving(true);
        const fullContent = `${title}\n${content}`;
        await updateNode(nodeId, fullContent);
        setHasChanges(false);
        setIsSaving(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
    };

    const handleClose = () => {
        if (hasChanges) {
            if (confirm('Kaydedilmemiş değişiklikler var. Çıkmak istediğinize emin misiniz?')) {
                router.back();
            }
        } else {
            router.back();
        }
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        setHasChanges(true);
    };

    // İmla düzeltme fonksiyonu
    const handleSpellCheck = async () => {
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

        try {
            const response = await fetch('/api/spellcheck', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToCheck })
            });

            if (!response.ok) throw new Error('API hatası');

            const data = await response.json();
            const correctedText = data.correctedText;

            // Orijinali sakla ve düzeltilmişi göster
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
        } catch (error) {
            console.error('Spellcheck error:', error);
            alert('İmla düzeltme sırasında bir hata oluştu.');
        } finally {
            setIsSpellChecking(false);
        }
    };

    // İmla düzeltmeyi onayla
    const handleAcceptSpellCheck = () => {
        setHasChanges(true);
        setPendingSpellCheck(null);
    };

    // İmla düzeltmeyi iptal et
    const handleRejectSpellCheck = () => {
        if (pendingSpellCheck) {
            setContent(pendingSpellCheck.original);
        }
        setPendingSpellCheck(null);
    };

    // Export menüsünü dışarı tıklayınca kapat
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
                setShowExportMenu(false);
            }
        };
        if (showExportMenu) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showExportMenu]);

    // PDF olarak indir
    const handleExportPDF = async () => {
        setShowExportMenu(false);
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const maxWidth = pageWidth - margin * 2;
        
        // Başlık
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(title || 'Başlıksız Not', margin, 25);
        
        // İçerik
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(content, maxWidth);
        doc.text(lines, margin, 40);
        
        doc.save(`${title || 'not'}.pdf`);
    };

    // Word olarak indir
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

    return (
        <div className="min-h-screen bg-[#f0f0f0] flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-stone-300">
                <div className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-stone-100 rounded transition-colors"
                            title="Geri Dön"
                        >
                            <ArrowLeft size={20} className="text-stone-600" />
                        </button>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg font-semibold text-stone-800 truncate">
                                {title || 'Başlıksız Not'}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded flex items-center gap-2 transition-colors"
                            title="İçeriği Kopyala"
                        >
                            {showCopied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                            <span className="text-sm">{showCopied ? 'Kopyalandı!' : 'Kopyala'}</span>
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || isSaving}
                            className={`px-6 py-2 rounded flex items-center gap-2 font-medium transition-all ${hasChanges && !isSaving
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                }`}
                        >
                            <Save size={18} />
                            <span>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</span>
                        </button>
                        
                        {/* Export Butonu */}
                        <div className="relative" ref={exportMenuRef}>
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="p-2 text-stone-600 hover:bg-stone-100 rounded transition-colors"
                                title="Dışa Aktar"
                            >
                                <Download size={18} />
                            </button>
                            
                            {showExportMenu && (
                                <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg py-1 min-w-[140px] z-50">
                                    <button
                                        onClick={handleExportPDF}
                                        className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-100 transition-colors"
                                    >
                                        PDF olarak indir
                                    </button>
                                    <button
                                        onClick={handleExportWord}
                                        className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-100 transition-colors"
                                    >
                                        Word olarak indir
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI Toolbar */}
                <div className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-stone-200">
                    <span className="text-xs font-medium text-indigo-600 mr-2">Yapay Zeka</span>
                    
                    {pendingSpellCheck ? (
                        // Onay/İptal butonları
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-stone-500 mr-2">Değişiklikleri onayla:</span>
                            <button
                                onClick={handleAcceptSpellCheck}
                                className="p-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-all"
                                title="Değişiklikleri Onayla"
                            >
                                <Check size={16} />
                            </button>
                            <button
                                onClick={handleRejectSpellCheck}
                                className="p-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all"
                                title="Eski Haline Dön"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleSpellCheck}
                            disabled={isSpellChecking || !content.trim()}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                isSpellChecking || !content.trim()
                                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow'
                            }`}
                            title="Seçili metni veya tüm içeriği imla kurallarına uygun hale getir"
                        >
                            {isSpellChecking ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <PenLine size={16} />
                            )}
                            <span>{isSpellChecking ? 'Düzeltiliyor...' : 'İmla Düzelt'}</span>
                        </button>
                    )}
                </div>
            </header>


            {/* Editor Area */}
            <main className="flex-1 overflow-auto py-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white shadow-lg min-h-[842px]">
                        {/* Başlık */}
                        <div className="border-b border-stone-200 px-12 pt-6 pb-4">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => {
                                    setTitle(e.target.value);
                                    setHasChanges(true);
                                }}
                                placeholder="Başlık"
                                className="w-full text-xl font-semibold text-stone-800 outline-none placeholder:text-stone-300"
                            />
                        </div>

                        {/* İçerik */}
                        <div className="px-12 py-6">
                            <textarea
                                ref={textareaRef}
                                value={content}
                                onChange={handleContentChange}
                                placeholder="İçeriğinizi buraya yazın..."
                                className="w-full min-h-[600px] resize-none outline-none text-stone-700 text-base leading-relaxed placeholder:text-stone-300"
                                autoFocus
                            />
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-stone-300 px-6 py-2">
                <div className="flex items-center justify-between text-xs text-stone-500">
                    <span>{hasChanges ? '● Kaydedilmemiş değişiklikler' : 'Tüm değişiklikler kaydedildi'}</span>
                    <div className="flex items-center gap-6">
                        <span>{content.split(/\s+/).filter(w => w.length > 0).length} kelime</span>
                        <span>{content.length} karakter</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
