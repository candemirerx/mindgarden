'use client';

import React, { useEffect, useState } from 'react';
import { X, Sparkles, Database, Check, RefreshCw, Key, ChevronDown, HardDriveDownload, UploadCloud, Loader2, Wand2, RotateCcw } from 'lucide-react';
import { isLocalBackend } from '@/lib/supabaseClient';
import { useStore } from '@/lib/store/useStore';
import { getDriveToken, restoreBackup, mergeSync, isAutoSyncEnabled, setAutoSyncEnabled, lastSyncTime } from '@/lib/driveSync';
import { AI_MACRO_KEY, DEFAULT_AI_MACRO, readAiMacro } from '@/lib/aiMacro';

interface ModelSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ProviderType = 'gemini' | 'openai' | 'anthropic' | 'custom';

export default function ModelSettingsModal({ isOpen, onClose }: ModelSettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'models' | 'sync'>('models');
    
    // AI Ayarları
    const [provider, setProvider] = useState<ProviderType>('gemini');
    const [apiKey, setApiKey] = useState('');
    const [customUrl, setCustomUrl] = useState('');
    const [customModel, setCustomModel] = useState('');
    const [macro, setMacro] = useState('');
    const [isSaved, setIsSaved] = useState(false);
    
    // Google Drive (kolay senkron) durumu
    const [driveBusy, setDriveBusy] = useState<'idle' | 'upload' | 'restore' | 'merge'>('idle');
    const [driveMessage, setDriveMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [autoSync, setAutoSync] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const { fetchGardens } = useStore();

    const handleDriveUpload = async () => {
        setDriveBusy('upload');
        setDriveMessage(null);
        try {
            const token = await getDriveToken(true);
            const res = await mergeSync(token);
            const syncedAt = lastSyncTime();
            setLastSync(syncedAt);
            setDriveMessage({
                type: 'ok',
                text: res.merged
                    ? `Drive ile güvenli biçimde birleştirildi (${res.gardens} bahçe, ${res.nodes} not güncellendi).`
                    : 'Drive\'da yedek yoktu; bu cihazın verisi ilk kez yedeklendi.'
            });
        } catch (e) {
            setDriveMessage({ type: 'err', text: e instanceof Error ? e.message : 'Yedekleme başarısız' });
        } finally {
            setDriveBusy('idle');
        }
    };

    const handleDriveRestore = async () => {
        setDriveBusy('restore');
        setDriveMessage(null);
        try {
            const token = await getDriveToken(false);
            const res = await restoreBackup(token, (msg) => setDriveMessage({ type: 'ok', text: msg }));
            await fetchGardens();
            setDriveMessage({ type: 'ok', text: `Drive'dan geri yüklendi: ${res.gardens} bahçe, ${res.nodes} not.` });
        } catch (e) {
            setDriveMessage({ type: 'err', text: e instanceof Error ? e.message : 'Geri yükleme başarısız' });
        } finally {
            setDriveBusy('idle');
        }
    };

    const handleDriveMerge = async () => {
        setDriveBusy('merge');
        setDriveMessage(null);
        try {
            const token = await getDriveToken(false);
            const res = await mergeSync(token);
            if (!res.merged) {
                setDriveMessage({ type: 'ok', text: 'Drive\'da yedek yok; bu cihazın verisi ilk kez yedeklendi.' });
            } else {
                setDriveMessage({ type: 'ok', text: `Birleştirildi: ${res.gardens} bahçe ve ${res.nodes} not karşı taraftan geldi.` });
            }
        } catch (e) {
            setDriveMessage({ type: 'err', text: e instanceof Error ? e.message : 'Senkron başarısız' });
        } finally {
            setDriveBusy('idle');
        }
    };

    useEffect(() => {
        if (isOpen) {
            // Yüklendiğinde mevcut ayarları al
            const savedProvider = localStorage.getItem('nb-ai-provider') as ProviderType;
            if (savedProvider) setProvider(savedProvider);
            
            const savedKey = localStorage.getItem('nb-ai-key') || localStorage.getItem('nb-gemini-key');
            if (savedKey) {
                setApiKey(savedKey);
                setIsSaved(true);
            }
            
            setCustomUrl(localStorage.getItem('nb-ai-custom-url') || '');
            setCustomModel(localStorage.getItem('nb-ai-custom-model') || '');
            setMacro(readAiMacro());
            setAutoSync(isAutoSyncEnabled());
            setLastSync(lastSyncTime());
        }
    }, [isOpen]);

    const handleSaveAi = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem('nb-ai-provider', provider);
        localStorage.setItem('nb-ai-key', apiKey.trim());
        localStorage.setItem('nb-gemini-key', apiKey.trim()); // Geriye dönük uyumluluk
        localStorage.setItem('nb-ai-custom-url', customUrl.trim());
        localStorage.setItem('nb-ai-custom-model', customModel.trim());
        localStorage.setItem(AI_MACRO_KEY, macro.trim());
        setIsSaved(true);
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bark-950/60 p-0 sm:p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="flex h-[100dvh] min-h-0 w-full max-w-5xl flex-col overflow-hidden bg-[#1a1a1a] text-sand-100 shadow-2xl animate-scale-in sm:h-[85vh] sm:max-h-[750px] sm:rounded-[24px] sm:border sm:border-white/10"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-8 sm:py-5">
                    <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white flex items-center gap-3">
                        <Sparkles size={20} className="text-moss-400" />
                        Tercihler & Ayarlar
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-2 text-sand-400 transition-colors hover:bg-white/10 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Body: Split Layout */}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
                    {/* Sidebar / Tabs */}
                    <div className="flex w-full flex-shrink-0 flex-row gap-2 overflow-x-auto border-b border-white/10 bg-[#141414] p-2.5 sm:p-4 md:w-64 md:flex-col md:overflow-visible md:border-b-0 md:border-r">
                        <div className="hidden md:block mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-sand-500">
                            Yapılandırma
                        </div>
                        <button
                            onClick={() => setActiveTab('models')}
                            className={`flex shrink-0 items-center gap-2 sm:gap-3 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                                activeTab === 'models' 
                                ? 'bg-white/10 text-white' 
                                : 'text-sand-400 hover:bg-white/5 hover:text-sand-200'
                            }`}
                        >
                            <Sparkles size={16} />
                            Model Ayarları
                        </button>
                        <button
                            onClick={() => setActiveTab('sync')}
                            className={`flex shrink-0 items-center gap-2 sm:gap-3 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                                activeTab === 'sync' 
                                ? 'bg-white/10 text-white' 
                                : 'text-sand-400 hover:bg-white/5 hover:text-sand-200'
                            }`}
                        >
                            <Database size={16} />
                            Senkronizasyon
                        </button>
                    </div>

                    {/* Content */}
                    <div className="min-h-0 flex-1 overflow-y-auto bg-[#1a1a1a] p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:p-8">
                        {activeTab === 'models' && (
                            <div className="max-w-2xl animate-fade-in pb-8">
                                <div className="mb-6 sm:mb-8">
                                    <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">Model Ayarları</h3>
                                    <p className="text-xs sm:text-sm text-sand-400 leading-relaxed">
                                        Özel model sağlayıcılarını (provider) yapılandırın. İmla düzeltme ve akıllı asistan yetenekleri bu bağlantı üzerinden çalışır.
                                    </p>
                                </div>

                                <form onSubmit={handleSaveAi} className="space-y-6">
                                    {/* Provider Selection */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-sand-300">Sağlayıcı (Provider)</label>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                                            {[
                                                { id: 'gemini', name: 'Google Gemini' },
                                                { id: 'openai', name: 'OpenAI' },
                                                { id: 'anthropic', name: 'Anthropic' },
                                                { id: 'custom', name: 'Özel (Custom)' }
                                            ].map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => { setProvider(p.id as ProviderType); setIsSaved(false); }}
                                                    className={`rounded-xl border p-2.5 sm:p-3 text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                                                        provider === p.id 
                                                        ? 'border-moss-500 bg-moss-500/10 text-moss-400' 
                                                        : 'border-white/10 bg-white/5 text-sand-400 hover:border-white/20 hover:text-sand-200'
                                                    }`}
                                                >
                                                    {provider === p.id && <div className="w-1.5 h-1.5 rounded-full bg-moss-400 flex-shrink-0" />}
                                                    <span className="truncate">{p.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {provider === 'custom' ? (
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-sand-300">Base URL</label>
                                                <input
                                                    type="url"
                                                    value={customUrl}
                                                    onChange={e => { setCustomUrl(e.target.value); setIsSaved(false); }}
                                                    placeholder="https://api.example.com/v1"
                                                    required
                                                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-moss-500 focus:ring-1 focus:ring-moss-500"
                                                />
                                                <p className="text-[11px] leading-relaxed text-sand-500">
                                                    `/v1` adresini veya doğrudan `/chat/completions` endpoint&apos;ini girebilirsiniz.
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-sand-300">Model adı / Model ID</label>
                                                <input
                                                    type="text"
                                                    value={customModel}
                                                    onChange={e => { setCustomModel(e.target.value); setIsSaved(false); }}
                                                    placeholder="Örn. gpt-4o-mini veya llama3.1"
                                                    required
                                                    autoCapitalize="none"
                                                    autoCorrect="off"
                                                    spellCheck={false}
                                                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-mono text-white placeholder-white/30 placeholder:font-sans outline-none transition-all focus:border-moss-500 focus:ring-1 focus:ring-moss-500"
                                                />
                                                <p className="text-[11px] leading-relaxed text-sand-500">
                                                    Sağlayıcınızın panelinde yazan gerçek model kimliğini kullanın.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-sand-400">
                                            {provider === 'gemini' && 'Model: Gemini 2.5 Flash; kullanılamazsa Gemini 2.0 Flash denenir.'}
                                            {provider === 'openai' && 'Model: gpt-4o-mini'}
                                            {provider === 'anthropic' && 'Model: claude-3-haiku-20240307'}
                                        </div>
                                    )}

                                    {/* API Key */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-sand-300">API Anahtarı (API Key)</label>
                                        <div className="relative">
                                            <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                                            <input
                                                type="password"
                                                value={apiKey}
                                                onChange={e => { setApiKey(e.target.value); setIsSaved(false); }}
                                                placeholder="Anahtarınızı buraya girin"
                                                className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 text-sm font-mono text-white placeholder-white/30 placeholder:font-sans outline-none transition-all focus:border-moss-500 focus:ring-1 focus:ring-moss-500"
                                            />
                                        </div>
                                    </div>

                                    {/* AI Görevi (Makro) */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <label
                                                htmlFor="ai-macro"
                                                className="flex items-center gap-2 text-sm font-medium text-sand-300"
                                            >
                                                <Wand2 size={15} className="text-moss-400" />
                                                AI Görevi (Makro)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => { setMacro(DEFAULT_AI_MACRO); setIsSaved(false); }}
                                                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-sand-400 transition-colors hover:bg-white/5 hover:text-sand-200"
                                            >
                                                <RotateCcw size={12} />
                                                Varsayılanı yaz
                                            </button>
                                        </div>

                                        <textarea
                                            id="ai-macro"
                                            value={macro}
                                            onChange={e => { setMacro(e.target.value); setIsSaved(false); }}
                                            rows={7}
                                            placeholder={DEFAULT_AI_MACRO}
                                            className="w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-relaxed text-white placeholder-white/25 outline-none transition-all focus:border-moss-500 focus:ring-1 focus:ring-moss-500"
                                        />

                                        <p className="text-[11px] leading-relaxed text-sand-500">
                                            Metin editöründeki <span className="font-semibold text-sand-400">AI</span> düğmesine bastığınızda notun metni bu görevle birlikte kendi API anahtarınızla seçtiğiniz sağlayıcıya gönderilir ve dönen cevap nota yazılır. Boş bırakırsanız imla düzeltme görevi kullanılır.
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <p className="text-[11px] sm:text-xs text-sand-500 max-w-md leading-relaxed">
                                            API anahtarı bu cihazın yerel deposunda saklanır. AI özelliğini kullandığınızda anahtar ve işlenecek metin önce uygulamanın Vercel sunucu rotasına, ardından seçtiğiniz sağlayıcıya iletilir.{' '}
                                            <a href="/gizlilik" className="font-semibold text-moss-400 hover:underline">Ayrıntılar</a>
                                        </p>
                                        <button
                                            type="submit"
                                            disabled={
                                                !apiKey.trim() ||
                                                (provider === 'custom' && (!customUrl.trim() || !customModel.trim()))
                                            }
                                            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-moss-600 px-6 py-3 sm:py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-moss-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSaved ? (
                                                <><Check size={16} /> Kaydedildi</>
                                            ) : (
                                                'Sağlayıcıyı Ekle'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {activeTab === 'sync' && (
                            <div className="max-w-2xl animate-fade-in pb-8">
                                <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start gap-4">
                                    <div>
                                        <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">Bulut Senkronizasyonu</h3>
                                        <p className="text-xs sm:text-sm text-sand-400 leading-relaxed">
                                            Google Drive yedeklerini yönetin ve cihazlar arasındaki değişiklikleri güvenle birleştirin.
                                        </p>
                                    </div>
                                    {isLocalBackend ? (
                                        <span className="flex-shrink-0 rounded-full border border-clay-500/30 bg-clay-500/10 px-3 py-1 text-xs font-semibold text-clay-400">
                                            Yerel Mod Etkin
                                        </span>
                                    ) : (
                                        <span className="flex-shrink-0 rounded-full border border-moss-500/30 bg-moss-500/10 px-3 py-1 text-xs font-semibold text-moss-400">
                                            Bulut Aktif
                                        </span>
                                    )}
                                </div>

                                {/* Google Drive (kolay senkron) */}
                                <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                                    <div className="mb-3 flex items-center gap-2.5">
                                        <UploadCloud size={18} className="text-moss-400" />
                                        <h4 className="text-sm sm:text-base font-semibold text-white">Google Drive ile Senkron (Kolay Yol)</h4>
                                    </div>
                                    <p className="mb-4 text-[11px] sm:text-xs text-sand-400 leading-relaxed">
                                        Notların, Google Drive'ındaki gizli uygulama klasörüne yazılır; sadece bu uygulama görebilir. Otomatik senkron açıkken elle bir şey yapmanıza gerek yok.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-2.5">
                                        <button
                                            type="button"
                                            onClick={handleDriveUpload}
                                            disabled={driveBusy !== 'idle'}
                                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-moss-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-moss-500 disabled:opacity-50"
                                        >
                                            {driveBusy === 'upload' ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                                            Drive'a Yedekle
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDriveRestore}
                                            disabled={driveBusy !== 'idle'}
                                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-sand-100 transition-all hover:bg-white/10 disabled:opacity-50"
                                        >
                                            {driveBusy === 'restore' ? <Loader2 size={16} className="animate-spin" /> : <HardDriveDownload size={16} />}
                                            Drive'dan Geri Yükle
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDriveMerge}
                                            disabled={driveBusy !== 'idle'}
                                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-moss-500/40 bg-moss-500/10 px-4 py-3 text-sm font-semibold text-moss-300 transition-all hover:bg-moss-500/20 disabled:opacity-50"
                                        >
                                            {driveBusy === 'merge' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                            Şimdi Senkronla
                                        </button>
                                    </div>

                                    {/* Otomatik senkron anahtarı */}
                                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                                        <input
                                            type="checkbox"
                                            checked={autoSync}
                                            onChange={(e) => {
                                                setAutoSync(e.target.checked);
                                                setAutoSyncEnabled(e.target.checked);
                                            }}
                                            className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-white/20 bg-black/40 accent-moss-500"
                                        />
                                        <span>
                                            <span className="block text-sm font-semibold text-white">Otomatik Senkron</span>
                                            <span className="mt-0.5 block text-[11px] leading-relaxed text-sand-400">
                                                Google ile giriş yaptığınız anda otomatik açılır: her not değişikliği kısa süre sonra Drive'a yazılır, uygulama açılışında diğer cihazlardaki değişiklikler birleştirilir. Buradan dilediğiniz zaman kapatabilirsiniz.
                                            </span>
                                            {lastSync && (
                                                <span className="mt-1.5 block text-[11px] text-moss-400">
                                                    Son yedek: {new Date(lastSync).toLocaleString('tr-TR')}
                                                </span>
                                            )}
                                        </span>
                                    </label>
                                    {driveMessage && (
                                        <p className={`mt-3 text-xs leading-relaxed ${driveMessage.type === 'ok' ? 'text-moss-400' : 'text-berry-400'}`}>
                                            {driveMessage.text}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
