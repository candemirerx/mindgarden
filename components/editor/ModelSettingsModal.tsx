'use client';

import React, { useEffect, useState } from 'react';
import { X, Sparkles, Database, Check, RefreshCw, Key, ChevronDown, HardDriveDownload, UploadCloud, Loader2, Wand2, RotateCcw, ChevronRight, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { isLocalBackend } from '@/lib/supabaseClient';
import { useStore } from '@/lib/store/useStore';
import { getDriveToken, restoreBackup, mergeSync, isAutoSyncEnabled, setAutoSyncEnabled, lastSyncTime } from '@/lib/driveSync';
import { readAiMacros, saveAiMacros, createMacro, DEFAULT_MACROS, SPELLCHECK_MACRO_ID } from '@/lib/aiMacro';
import type { AiMacro } from '@/lib/aiMacro';
import {
    PROVIDER_IDS,
    PROVIDER_LABELS,
    MODEL_HINTS,
    KEY_HINTS,
    DEFAULT_MODELS,
    readActiveProvider,
    saveActiveProvider,
    readProviderKey,
    saveProviderKey,
    readRawProviderModel,
    saveProviderModel,
    readModelList,
    saveModelList,
    readCustomUrl,
    saveCustomUrl
} from '@/lib/aiProvider';

interface ModelSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ProviderType = 'gemini' | 'openai' | 'anthropic' | 'custom';

export default function ModelSettingsModal({ isOpen, onClose }: ModelSettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'models' | 'macros' | 'sync'>('models');
    
    // AI Ayarları
    const [provider, setProvider] = useState<ProviderType>('gemini');
    const [customUrl, setCustomUrl] = useState('');
    const [customModel, setCustomModel] = useState('');
    /** Sağlayıcı başına anahtar ve model; biri diğerini etkilemez. */
    const [keys, setKeys] = useState<Record<ProviderType, string>>({
        gemini: '', openai: '', anthropic: '', custom: ''
    });
    const [models, setModels] = useState<Record<ProviderType, string>>({
        gemini: '', openai: '', anthropic: '', custom: ''
    });
    /** Sağlayıcı başına kayıtlı model adları. */
    const [modelLists, setModelLists] = useState<Record<ProviderType, string[]>>({
        gemini: [], openai: [], anthropic: [], custom: []
    });
    const [yeniModel, setYeniModel] = useState('');
    const [macroList, setMacroList] = useState<AiMacro[]>([]);
    const [macroDraft, setMacroDraft] = useState<AiMacro | null>(null);
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
            setProvider(readActiveProvider());
            
            // Her sağlayıcının kendi anahtarı ve modeli yüklenir
            const bosKayit = { gemini: '', openai: '', anthropic: '', custom: '' } as Record<ProviderType, string>;
            const nextKeys = { ...bosKayit };
            const nextModels = { ...bosKayit };
            for (const id of PROVIDER_IDS) {
                nextKeys[id] = readProviderKey(id);
                nextModels[id] = readRawProviderModel(id);
            }
            setKeys(nextKeys);
            setModels(nextModels);

            const nextLists = { gemini: [], openai: [], anthropic: [], custom: [] } as Record<ProviderType, string[]>;
            for (const id of PROVIDER_IDS) nextLists[id] = readModelList(id);
            setModelLists(nextLists);
            setYeniModel('');
            if (PROVIDER_IDS.some((id) => nextKeys[id])) setIsSaved(true);

            setCustomUrl(readCustomUrl());
            setCustomModel(nextModels.custom);
            setMacroList(readAiMacros());
            setMacroDraft(null);
            setAutoSync(isAutoSyncEnabled());
            setLastSync(lastSyncTime());
        }
    }, [isOpen]);

    const handleSaveAi = (e: React.FormEvent) => {
        e.preventDefault();
        saveActiveProvider(provider);
        for (const id of PROVIDER_IDS) {
            saveProviderKey(id, keys[id]);
            saveProviderModel(id, models[id]);
        }
        saveCustomUrl(customUrl);
        setCustomModel(models.custom);
        for (const id of PROVIDER_IDS) saveModelList(id, modelLists[id]);
        setIsSaved(true);
    };

    /** Girişteki model adını listeye ekler ve etkin model yapar. */
    const handleAddModel = () => {
        const ad = yeniModel.trim();
        if (!ad) return;

        setModelLists(prev => ({
            ...prev,
            [provider]: Array.from(new Set([...prev[provider], ad]))
        }));
        const sonrakiModeller = { ...models, [provider]: ad };
        const sonrakiListe = Array.from(new Set([...modelLists[provider], ad]));
        setModelLists(prev => ({ ...prev, [provider]: sonrakiListe }));
        setModels(sonrakiModeller);
        saveModelList(provider, sonrakiListe);
        persistAyarlar({ provider, keys, models: sonrakiModeller, customUrl });
        setYeniModel('');
        setIsSaved(false);
    };

    /** Modeli listeden çıkarır; etkinse varsayılana döner. */
    const handleRemoveModel = (ad: string) => {
        const sonrakiListe = modelLists[provider].filter(x => x !== ad);
        setModelLists(prev => ({ ...prev, [provider]: sonrakiListe }));
        saveModelList(provider, sonrakiListe);
        if (models[provider] === ad) {
            setModels(prev => ({ ...prev, [provider]: '' }));
        }
        persistAyarlar({ provider, keys, models, customUrl });
        setIsSaved(false);
    };
    
    /** Ayarları anında kalıcı hale getirir; ayrı bir kayıt adımı gerekmez. */
    const persistAyarlar = (
        sonraki: {
            provider: ProviderType;
            keys: Record<ProviderType, string>;
            models: Record<ProviderType, string>;
            customUrl: string;
        }
    ) => {
        saveActiveProvider(sonraki.provider);
        for (const id of PROVIDER_IDS) {
            saveProviderKey(id, sonraki.keys[id]);
            saveProviderModel(id, sonraki.models[id]);
        }
        saveCustomUrl(sonraki.customUrl);
    };

    const persistMacros = (next: AiMacro[]) => {
        setMacroList(next);
        saveAiMacros(next);
    };

    const handleSaveMacro = () => {
        if (!macroDraft) return;
        const cleaned: AiMacro = {
            ...macroDraft,
            title: macroDraft.title.trim() || 'Adsız Makro',
            subtitle: macroDraft.subtitle.trim(),
            instruction: macroDraft.instruction.trim()
        };
        persistMacros(macroList.map((item) => (item.id === cleaned.id ? cleaned : item)));
        setMacroDraft(null);
    };

    const handleDeleteMacro = () => {
        if (!macroDraft) return;
        persistMacros(macroList.filter((item) => item.id !== macroDraft.id));
        setMacroDraft(null);
    };

    const handleAddMacro = () => {
        const created = createMacro();
        persistMacros([...macroList, created]);
        setMacroDraft(created);
    };

    const handleResetMacros = () => {
        persistMacros(DEFAULT_MACROS);
        setMacroDraft(null);
    };

    /** Makroyu kapatır/açar; kapalı makro metin editöründe görünmez. */
    const handleToggleMacro = (id: string) => {
        persistMacros(
            macroList.map((item) =>
                item.id === id ? { ...item, enabled: item.enabled === false } : item
            )
        );
    };

    const enabledMacroCount = macroList.filter((item) => item.enabled !== false).length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bark-950/60 p-0 sm:p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="flex h-[100dvh] min-h-0 w-full max-w-5xl flex-col overflow-hidden bg-white text-sand-800 shadow-2xl animate-scale-in sm:h-[85vh] sm:max-h-[750px] sm:rounded-[24px] sm:border sm:border-sand-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex flex-shrink-0 items-center gap-3 border-b border-sand-200 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-6 sm:py-5">
                    <button
                        onClick={onClose}
                        aria-label="Ayarlardan geri dön"
                        className="-ml-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sand-500 transition-colors hover:bg-sand-100 hover:text-sand-900"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="flex min-w-0 items-center gap-3 text-lg font-semibold tracking-tight text-sand-900 sm:text-xl">
                        <Sparkles size={20} className="flex-shrink-0 text-moss-600" />
                        <span className="truncate">Tercihler & Ayarlar</span>
                    </h2>
                </div>

                {/* Body: Split Layout */}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
                    {/* Sidebar / Tabs */}
                    <div className="flex w-full flex-shrink-0 flex-row gap-2 overflow-x-auto border-b border-sand-200 bg-sand-50 p-2.5 sm:p-4 md:w-64 md:flex-col md:overflow-visible md:border-b-0 md:border-r">
                        <div className="hidden md:block mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-sand-500">
                            Yapılandırma
                        </div>
                        <button
                            onClick={() => setActiveTab('models')}
                            className={`flex shrink-0 items-center gap-2 sm:gap-3 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                                activeTab === 'models' 
                                ? 'bg-sand-100 text-sand-900' 
                                : 'text-sand-500 hover:bg-sand-50 hover:text-sand-700'
                            }`}
                        >
                            <Sparkles size={16} />
                            Model Ayarları
                        </button>
                        <button
                            onClick={() => setActiveTab('macros')}
                            className={`flex shrink-0 items-center gap-2 sm:gap-3 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                                activeTab === 'macros'
                                ? 'bg-sand-100 text-sand-900'
                                : 'text-sand-500 hover:bg-sand-50 hover:text-sand-700'
                            }`}
                        >
                            <Wand2 size={16} />
                            AI Makroları
                        </button>
                        <button
                            onClick={() => setActiveTab('sync')}
                            className={`flex shrink-0 items-center gap-2 sm:gap-3 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                                activeTab === 'sync' 
                                ? 'bg-sand-100 text-sand-900' 
                                : 'text-sand-500 hover:bg-sand-50 hover:text-sand-700'
                            }`}
                        >
                            <Database size={16} />
                            Senkronizasyon
                        </button>
                    </div>

                    {/* Content */}
                    <div className="min-h-0 flex-1 overflow-y-auto bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:p-8">
                        {activeTab === 'models' && (
                            <div className="max-w-2xl animate-fade-in pb-8">
                                <div className="mb-6 sm:mb-8">
                                    <h3 className="text-xl sm:text-2xl font-semibold text-sand-900 mb-2">Model Ayarları</h3>
                                    <p className="text-xs sm:text-sm text-sand-500 leading-relaxed">
                                        Özel model sağlayıcılarını (provider) yapılandırın. İmla düzeltme ve akıllı asistan yetenekleri bu bağlantı üzerinden çalışır.
                                    </p>
                                </div>

                                <form onSubmit={handleSaveAi} className="space-y-6">
                                    {/* Provider Selection */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-sand-700">Sağlayıcı (Provider)</label>
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
                                                    onClick={() => {
                                                        setProvider(p.id as ProviderType);
                                                        persistAyarlar({ provider: p.id as ProviderType, keys, models, customUrl });
                                                        setIsSaved(false);
                                                    }}
                                                    className={`rounded-xl border p-2.5 sm:p-3 text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                                                        provider === p.id 
                                                        ? 'border-moss-500 bg-moss-500/10 text-moss-600' 
                                                        : 'border-sand-200 bg-sand-50 text-sand-500 hover:border-sand-300 hover:text-sand-700'
                                                    }`}
                                                >
                                                    {provider === p.id && <div className="w-1.5 h-1.5 rounded-full bg-moss-400 flex-shrink-0" />}
                                                    <span className="truncate">{p.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {provider === 'custom' && (
                                            <div className="space-y-2 sm:col-span-2">
                                                <label className="text-sm font-medium text-sand-700">Base URL</label>
                                                <input
                                                    type="url"
                                                    value={customUrl}
                                                    onChange={e => {
                                                    const v = e.target.value;
                                                    setCustomUrl(v);
                                                    persistAyarlar({ provider, keys, models, customUrl: v });
                                                    setIsSaved(false);
                                                }}
                                                    placeholder="https://api.example.com/v1"
                                                    required
                                                    className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm text-sand-900 placeholder-sand-400 outline-none transition-all focus:border-moss-500 focus:ring-1 focus:ring-moss-500"
                                                />
                                                <p className="text-[11px] leading-relaxed text-sand-500">
                                                    `/v1` adresini veya doğrudan `/chat/completions` endpoint&apos;ini girebilirsiniz.
                                                </p>
                                            </div>
                                        )}

                                        {/* Model seçimi: kaydet, seç, sil */}
                                        <div className="space-y-3 sm:col-span-2">
                                            <label className="text-sm font-medium text-sand-700">
                                                Model adı / Model ID
                                            </label>

                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={yeniModel}
                                                    onChange={e => setYeniModel(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleAddModel();
                                                        }
                                                    }}
                                                    placeholder={DEFAULT_MODELS[provider] || 'Örn. gpt-4o-mini'}
                                                    autoCapitalize="none"
                                                    autoCorrect="off"
                                                    spellCheck={false}
                                                    className="min-w-0 flex-1 rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm font-mono text-sand-900 placeholder-sand-400 placeholder:font-sans outline-none transition-all focus:border-moss-500 focus:ring-1 focus:ring-moss-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddModel}
                                                    disabled={!yeniModel.trim()}
                                                    className="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-moss-600 px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-moss-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <Plus size={14} /> Kaydet
                                                </button>
                                            </div>

                                            {modelLists[provider].length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {modelLists[provider].map(ad => {
                                                        const secili = models[provider] === ad ||
                                                            (!models[provider] && ad === DEFAULT_MODELS[provider]);

                                                        return (
                                                            <span
                                                                key={ad}
                                                                className={`flex items-center gap-1 rounded-lg border pr-1 font-mono text-[11px] transition-colors ${
                                                                    secili
                                                                        ? 'border-moss-500 bg-moss-500/15 text-moss-200'
                                                                        : 'border-sand-200 bg-sand-50 text-sand-700'
                                                                }`}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setModels(prev => ({ ...prev, [provider]: ad }));
                                                                        persistAyarlar({ provider, keys, models: { ...models, [provider]: ad }, customUrl });
                                                                        setIsSaved(false);
                                                                    }}
                                                                    className="px-2.5 py-1.5"
                                                                >
                                                                    {ad}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveModel(ad)}
                                                                    aria-label={`${ad} modelini listeden çıkar`}
                                                                    className="rounded p-0.5 text-sand-500 transition-colors hover:bg-berry-500/20 hover:text-berry-600"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            <p className="text-[11px] leading-relaxed text-sand-500">
                                                {MODEL_HINTS[provider]} Yazıp <span className="font-semibold text-sand-700">Kaydet</span>&apos;e
                                                basın; ad listede kalır, dilediğinizde tek dokunuşla seçer veya silersiniz.
                                                {DEFAULT_MODELS[provider] && (
                                                    <> Seçili model boşsa <span className="font-mono text-sand-500">{DEFAULT_MODELS[provider]}</span> kullanılır.</>
                                                )}
                                            </p>
                                        </div>

                                        {/* API anahtarı: her sağlayıcının kendi anahtarı */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-sand-700">
                                                {PROVIDER_LABELS[provider]} API Anahtarı
                                            </label>
                                            <div className="relative">
                                                <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-sand-900/40" />
                                                <input
                                                    type="password"
                                                    value={keys[provider]}
                                                    onChange={e => {
                                                        const v = e.target.value;
                                                        setKeys(prev => ({ ...prev, [provider]: v }));
                                                        persistAyarlar({ provider, keys: { ...keys, [provider]: v }, models, customUrl });
                                                        setIsSaved(false);
                                                    }}
                                                    placeholder="Anahtarınızı buraya girin"
                                                    className="w-full rounded-xl border border-sand-200 bg-white py-3 pl-11 pr-4 text-sm font-mono text-sand-900 placeholder-sand-400 placeholder:font-sans outline-none transition-all focus:border-moss-500 focus:ring-1 focus:ring-moss-500"
                                                />
                                            </div>
                                            <p className="text-[11px] leading-relaxed text-sand-500">
                                                {KEY_HINTS[provider]} — yalnızca bu sağlayıcı için geçerlidir,
                                                diğer sağlayıcıların anahtarları ayrı tutulur.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-sand-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <p className="text-[11px] sm:text-xs text-sand-500 max-w-md leading-relaxed">
                                            API anahtarı bu cihazın yerel deposunda saklanır. AI özelliğini kullandığınızda anahtar ve işlenecek metin önce uygulamanın Vercel sunucu rotasına, ardından seçtiğiniz sağlayıcıya iletilir.{' '}
                                            <a href="/gizlilik" className="font-semibold text-moss-600 hover:underline">Ayrıntılar</a>
                                        </p>
                                        <button
                                            type="submit"
                                            disabled={
                                                !keys[provider].trim() ||
                                                (provider === 'custom' && !customUrl.trim())
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

                        {activeTab === "macros" && (
                            <div className="max-w-2xl animate-fade-in pb-8">
                                <div className="mb-6 sm:mb-8">
                                    <h3 className="text-xl sm:text-2xl font-semibold text-sand-900 mb-2">AI Makroları</h3>
                                    <p className="text-xs sm:text-sm text-sand-500 leading-relaxed">
                                        Metin editöründe imla düzeltmenin yanında görünen kutuları buradan yönetin. Kapatılan veya silinen makrolar editörde yer kaplamaz.
                                    </p>
                                </div>
                                        {/* AI Makroları */}
                                        <div className="space-y-3">
                                            {macroDraft ? (
                                                <div className="space-y-4 rounded-2xl border border-sand-200 bg-sand-50 p-4 sm:p-5">
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => setMacroDraft(null)}
                                                            aria-label="Makro listesine dön"
                                                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sand-500 transition-colors hover:bg-sand-100 hover:text-sand-900"
                                                        >
                                                            <ArrowLeft size={17} />
                                                        </button>
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold text-sand-900">
                                                                {macroDraft.title || 'Adsız Makro'}
                                                            </p>
                                                            <p className="truncate text-[11px] text-sand-500">
                                                                {macroDraft.subtitle || 'Alt başlık eklenmedi'}
                                                            </p>
                                                        </div>
                                                    </div>
    
                                                    <div className="space-y-2">
                                                        <label htmlFor="macro-title" className="text-xs font-medium text-sand-700">Makro adı</label>
                                                        <input
                                                            id="macro-title"
                                                            type="text"
                                                            value={macroDraft.title}
                                                            onChange={e => setMacroDraft({ ...macroDraft, title: e.target.value })}
                                                            placeholder="Örn. Toplantı notuna çevir"
                                                            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm text-sand-900 placeholder-sand-400 outline-none transition-all focus:border-moss-500 focus:ring-1 focus:ring-moss-500"
                                                        />
                                                    </div>
    
                                                    <div className="space-y-2">
                                                        <label htmlFor="macro-subtitle" className="text-xs font-medium text-sand-700">Alt başlık</label>
                                                        <input
                                                            id="macro-subtitle"
                                                            type="text"
                                                            value={macroDraft.subtitle}
                                                            onChange={e => setMacroDraft({ ...macroDraft, subtitle: e.target.value })}
                                                            placeholder="Bu makronun ne yaptığını kısaca yazın"
                                                            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm text-sand-900 placeholder-sand-400 outline-none transition-all focus:border-moss-500 focus:ring-1 focus:ring-moss-500"
                                                        />
                                                    </div>
    
                                                    <div className="space-y-2">
                                                        <label htmlFor="macro-instruction" className="text-xs font-medium text-sand-700">Yapay zekâya gönderilecek görev</label>
                                                        <textarea
                                                            id="macro-instruction"
                                                            value={macroDraft.instruction}
                                                            onChange={e => setMacroDraft({ ...macroDraft, instruction: e.target.value })}
                                                            rows={7}
                                                            placeholder="Örn. Aşağıdaki notu toplantı tutanağı biçimine çevir ve kararları madde madde yaz."
                                                            className="w-full resize-y rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm leading-relaxed text-sand-900 placeholder-sand-400 outline-none transition-all focus:border-moss-500 focus:ring-1 focus:ring-moss-500"
                                                        />
                                                    </div>
    
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                        {macroDraft.id !== SPELLCHECK_MACRO_ID ? (
                                                            <button
                                                                type="button"
                                                                onClick={handleDeleteMacro}
                                                                className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-berry-600 transition-colors hover:bg-berry-500/10"
                                                            >
                                                                <Trash2 size={14} /> Makroyu sil
                                                            </button>
                                                        ) : (
                                                            <span className="hidden sm:block" />
                                                        )}
    
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setMacroDraft(null)}
                                                                className="flex-1 rounded-xl border border-sand-200 px-4 py-2 text-xs font-medium text-sand-700 transition-colors hover:bg-sand-50 sm:flex-none"
                                                            >
                                                                Vazgeç
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleSaveMacro}
                                                                disabled={!macroDraft.instruction.trim()}
                                                                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-moss-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-moss-500 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                                                            >
                                                                <Check size={15} /> Makroyu kaydet
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="text-[11px] font-medium uppercase tracking-wider text-sand-500">
                                                            {enabledMacroCount} / {macroList.length} makro etkin
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={handleResetMacros}
                                                            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-sand-500 transition-colors hover:bg-sand-50 hover:text-sand-700"
                                                        >
                                                            <RotateCcw size={12} />
                                                            Varsayılanlar
                                                        </button>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {macroList.map((macro) => {
                                                            const isOn = macro.enabled !== false;

                                                            return (
                                                                <div
                                                                    key={macro.id}
                                                                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
                                                                        isOn
                                                                            ? 'border-sand-200 bg-sand-50'
                                                                            : 'border-white/5 bg-sand-50'
                                                                    }`}
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setMacroDraft(macro)}
                                                                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                                                    >
                                                                        <span className="min-w-0 flex-1">
                                                                            <span
                                                                                className={`block truncate text-sm font-medium ${
                                                                                    isOn ? 'text-sand-800' : 'text-sand-500 line-through'
                                                                                }`}
                                                                            >
                                                                                {macro.title}
                                                                            </span>
                                                                            <span className="mt-0.5 block truncate text-[11px] text-sand-500">
                                                                                {macro.subtitle || 'Alt başlık yok'}
                                                                            </span>
                                                                        </span>
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        role="switch"
                                                                        aria-checked={isOn}
                                                                        aria-label={`${macro.title} makrosunu ${isOn ? 'kapat' : 'aç'}`}
                                                                        onClick={() => handleToggleMacro(macro.id)}
                                                                        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                                                                            isOn ? 'bg-moss-600' : 'bg-white/15'
                                                                        }`}
                                                                    >
                                                                        <span
                                                                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                                                                                isOn ? 'left-[22px]' : 'left-0.5'
                                                                            }`}
                                                                        />
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setMacroDraft(macro)}
                                                                        aria-label={`${macro.title} makrosunu düzenle`}
                                                                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sand-500 transition-colors hover:bg-sand-50 hover:text-sand-700"
                                                                    >
                                                                        <ChevronRight size={16} />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={handleAddMacro}
                                                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-sand-300 px-4 py-3 text-sm font-medium text-sand-500 transition-colors hover:border-moss-500/50 hover:text-moss-700"
                                                    >
                                                        <Plus size={16} /> Yeni makro ekle
                                                    </button>

                                                    <p className="text-[11px] leading-relaxed text-sand-500">
                                                        Kapatılan makrolar metin editöründe görünmez, böylece arayüz kalabalıklaşmaz. Bir kutuya bastığınızda notun metni o makronun göreviyle birlikte kendi API anahtarınızla seçtiğiniz sağlayıcıya gönderilir ve dönen cevap nota yazılır.
                                                    </p>
                                                </>
                                            )}
                                        </div>
                            </div>
                        )}

                        {activeTab === 'sync' && (
                            <div className="max-w-2xl animate-fade-in pb-8">
                                <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start gap-4">
                                    <div>
                                        <h3 className="text-xl sm:text-2xl font-semibold text-sand-900 mb-2">Bulut Senkronizasyonu</h3>
                                        <p className="text-xs sm:text-sm text-sand-500 leading-relaxed">
                                            Google Drive yedeklerini yönetin ve cihazlar arasındaki değişiklikleri güvenle birleştirin.
                                        </p>
                                    </div>
                                    {isLocalBackend ? (
                                        <span className="flex-shrink-0 rounded-full border border-clay-500/30 bg-clay-500/10 px-3 py-1 text-xs font-semibold text-clay-600">
                                            Yerel Mod Etkin
                                        </span>
                                    ) : (
                                        <span className="flex-shrink-0 rounded-full border border-moss-500/30 bg-moss-500/10 px-3 py-1 text-xs font-semibold text-moss-600">
                                            Bulut Aktif
                                        </span>
                                    )}
                                </div>

                                {/* Google Drive (kolay senkron) */}
                                <div className="mb-8 rounded-2xl border border-sand-200 bg-sand-50 p-4 sm:p-5">
                                    <div className="mb-3 flex items-center gap-2.5">
                                        <UploadCloud size={18} className="text-moss-600" />
                                        <h4 className="text-sm sm:text-base font-semibold text-sand-900">Google Drive ile Senkron (Kolay Yol)</h4>
                                    </div>
                                    <p className="mb-4 text-[11px] sm:text-xs text-sand-500 leading-relaxed">
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
                                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-sand-300 bg-sand-50 px-4 py-3 text-sm font-semibold text-sand-800 transition-all hover:bg-sand-100 disabled:opacity-50"
                                        >
                                            {driveBusy === 'restore' ? <Loader2 size={16} className="animate-spin" /> : <HardDriveDownload size={16} />}
                                            Drive'dan Geri Yükle
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDriveMerge}
                                            disabled={driveBusy !== 'idle'}
                                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-moss-500/40 bg-moss-500/10 px-4 py-3 text-sm font-semibold text-moss-700 transition-all hover:bg-moss-500/20 disabled:opacity-50"
                                        >
                                            {driveBusy === 'merge' ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                            Şimdi Senkronla
                                        </button>
                                    </div>

                                    {/* Otomatik senkron anahtarı */}
                                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-sand-200 bg-sand-50 p-3.5">
                                        <input
                                            type="checkbox"
                                            checked={autoSync}
                                            onChange={(e) => {
                                                setAutoSync(e.target.checked);
                                                setAutoSyncEnabled(e.target.checked);
                                            }}
                                            className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-sand-300 bg-white accent-moss-500"
                                        />
                                        <span>
                                            <span className="block text-sm font-semibold text-sand-900">Otomatik Senkron</span>
                                            <span className="mt-0.5 block text-[11px] leading-relaxed text-sand-500">
                                                Google ile giriş yaptığınız anda otomatik açılır: her not değişikliği kısa süre sonra Drive'a yazılır, uygulama açılışında diğer cihazlardaki değişiklikler birleştirilir. Buradan dilediğiniz zaman kapatabilirsiniz.
                                            </span>
                                            {lastSync && (
                                                <span className="mt-1.5 block text-[11px] text-moss-600">
                                                    Son yedek: {new Date(lastSync).toLocaleString('tr-TR')}
                                                </span>
                                            )}
                                        </span>
                                    </label>
                                    {driveMessage && (
                                        <p className={`mt-3 text-xs leading-relaxed ${driveMessage.type === 'ok' ? 'text-moss-600' : 'text-berry-600'}`}>
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
