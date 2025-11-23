'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store/useStore';
import { ArrowLeft, Save, Copy, Check } from 'lucide-react';

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

    return (
        <div className="min-h-screen bg-[#f0f0f0] flex flex-col">
            {/* Minimal Header - Word tarzı */}
            <header className="bg-white border-b border-stone-300">
                <div className="flex items-center justify-between px-6 py-3">
                    {/* Sol: Geri ve Başlık */}
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

                    {/* Sağ: Butonlar */}
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
                    </div>
                </div>
            </header>

            {/* Editor Area - Word tarzı beyaz sayfa */}
            <main className="flex-1 overflow-auto py-12">
                <div className="max-w-4xl mx-auto">
                    {/* Beyaz Sayfa */}
                    <div className="bg-white shadow-lg min-h-[842px]">
                        {/* Başlık */}
                        <div className="border-b border-stone-200 px-16 pt-16 pb-6">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => {
                                    setTitle(e.target.value);
                                    setHasChanges(true);
                                }}
                                placeholder="Başlık"
                                className="w-full text-3xl font-bold text-stone-800 outline-none placeholder:text-stone-300"
                            />
                        </div>

                        {/* İçerik */}
                        <div className="px-16 py-8">
                            <textarea
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

            {/* Footer - Durum Çubuğu */}
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
