'use client';

import React, { useEffect, useState } from 'react';
import { X, Sparkles, Database, Check, RefreshCw, Key, ChevronDown, Lock } from 'lucide-react';
import { supabase, isLocalBackend } from '@/lib/supabaseClient';
import { useStore } from '@/lib/store/useStore';

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
    const [isSaved, setIsSaved] = useState(false);
    
    // Senkronizasyon (Supabase) Ayarları
    const [supaUrl, setSupaUrl] = useState('');
    const [supaKey, setSupaKey] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Yüklendiğinde mevcut ayarları al
            const savedProvider = localStorage.getItem('nb-ai-provider') as ProviderType;
            if (savedProvider) setProvider(savedProvider);
            
            const savedKey = localStorage.getItem('nb-gemini-key') || localStorage.getItem('nb-ai-key');
            if (savedKey) {
                setApiKey(savedKey);
                setIsSaved(true);
            }
            
            setCustomUrl(localStorage.getItem('nb-ai-custom-url') || '');
            
            setSupaUrl(localStorage.getItem('nb-supa-url') || process.env.NEXT_PUBLIC_SUPABASE_URL || '');
            setSupaKey(localStorage.getItem('nb-supa-key') || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
        }
    }, [isOpen]);

    const handleSaveAi = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem('nb-ai-provider', provider);
        localStorage.setItem('nb-ai-key', apiKey);
        localStorage.setItem('nb-gemini-key', apiKey); // Geriye dönük uyumluluk
        localStorage.setItem('nb-ai-custom-url', customUrl);
        setIsSaved(true);
    };
    
    const handleSaveSync = (e: React.FormEvent) => {
        e.preventDefault();
        if (supaUrl.trim() && supaKey.trim()) {
            localStorage.setItem('nb-supa-url', supaUrl.trim());
            localStorage.setItem('nb-supa-key', supaKey.trim());
            alert('Senkronizasyon ayarları kaydedildi. Uygulama yeniden başlatılacak.');
            window.location.reload();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bark-950/60 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="flex h-full max-h-[750px] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] bg-[#1a1a1a] text-sand-100 shadow-2xl animate-scale-in border border-white/10"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-8 py-5">
                    <h2 className="text-xl font-semibold tracking-tight text-white flex items-center gap-3">
                        <Sparkles size={20} className="text-moss-400" />
                        Tercihler & Ayarlar
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-2 text-sand-400 transition-colors hover:bg-white/10 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Body: Split Layout */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-64 flex-shrink-0 border-r border-white/10 bg-[#141414] p-4 flex flex-col gap-1">
                        <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-sand-500">
                            Yapılandırma
                        </div>
                        <button
                            onClick={() => setActiveTab('models')}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                                activeTab === 'models' 
                                ? 'bg-white/10 text-white' 
                                : 'text-sand-400 hover:bg-white/5 hover:text-sand-200'
                            }`}
                        >
                            <Sparkles size={16} />
                            Yapay Zeka Modelleri
                        </button>
                        <button
                            onClick={() => setActiveTab('sync')}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                                activeTab === 'sync' 
                                ? 'bg-white/10 text-white' 
                                : 'text-sand-400 hover:bg-white/5 hover:text-sand-200'
                            }`}
                        >
                            <Database size={16} />
                            Bulut Senkronizasyonu
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto bg-[#1a1a1a] p-8">
                        {activeTab === 'models' && (
                            <div className="max-w-2xl animate-fade-in">
                                <div className="mb-8">
                                    <h3 className="text-2xl font-semibold text-white mb-2">Model Ayarları</h3>
                                    <p className="text-sm text-sand-400">
                                        Özel model sağlayıcılarını (provider) yapılandırın. İmla düzeltme ve akıllı asistan yetenekleri bu bağlantı üzerinden çalışır.
                                    </p>
                                </div>

                                <form onSubmit={handleSaveAi} className="space-y-6">
                                    {/* Provider Selection */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-sand-300">Sağlayıcı (Provider)</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                                                    className={`rounded-xl border p-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                                        provider === p.id 
                                                        ? 'border-moss-500 bg-moss-500/10 text-moss-400' 
                                                        : 'border-white/10 bg-white/5 text-sand-400 hover:border-white/20 hover:text-sand-200'
                                                    }`}
                                                >
                                                    {provider === p.id && <div className="w-1.5 h-1.5 rounded-full bg-moss-400" />}
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Custom URL */}
                                    {provider === 'custom' && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-sand-300">Base URL</label>
                                            <input
                                                type="url"
                                                value={customUrl}
                                                onChange={e => { setCustomUrl(e.target.value); setIsSaved(false); }}
                                                placeholder="https://api.example.com/v1"
                                                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-moss-500 focus:ring-1 focus:ring-moss-500"
                                            />
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

                                    <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                                        <p className="text-xs text-sand-500 max-w-md">
                                            Bu anahtar yalnızca tarayıcınızın yerel deposunda (localStorage) saklanır ve doğrudan sağlayıcıya gönderilir.
                                        </p>
                                        <button
                                            type="submit"
                                            disabled={!apiKey.trim()}
                                            className="flex items-center gap-2 rounded-xl bg-moss-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-moss-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                            <div className="max-w-2xl animate-fade-in">
                                <div className="mb-8 flex items-start gap-4">
                                    <div>
                                        <h3 className="text-2xl font-semibold text-white mb-2">Bulut Senkronizasyonu</h3>
                                        <p className="text-sm text-sand-400">
                                            Cihazlar arası eşitleme için kendi Supabase veritabanınızı bağlayın. E-posta ve Google ile girişler bu veritabanı üzerinden yönetilecektir.
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

                                <form onSubmit={handleSaveSync} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-sand-300">Supabase URL</label>
                                        <input
                                            type="url"
                                            value={supaUrl}
                                            onChange={e => setSupaUrl(e.target.value)}
                                            placeholder="https://xxxxx.supabase.co"
                                            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-mono text-white placeholder-white/30 placeholder:font-sans outline-none transition-all focus:border-moss-500"
                                        />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-sand-300">Supabase Anon Key</label>
                                        <div className="relative">
                                            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                                            <input
                                                type="password"
                                                value={supaKey}
                                                onChange={e => setSupaKey(e.target.value)}
                                                placeholder="eyJhbGci..."
                                                className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 text-sm font-mono text-white placeholder-white/30 placeholder:font-sans outline-none transition-all focus:border-moss-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                                        <p className="text-xs text-sand-500 max-w-md">
                                            Bu ayarlar değiştirildiğinde uygulama yeniden başlatılır. Boş bırakırsanız cihazınız Yerel Mod'a döner.
                                        </p>
                                        <button
                                            type="submit"
                                            className="flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-black shadow-lg transition-all hover:bg-sand-200"
                                        >
                                            <RefreshCw size={16} />
                                            Bağlantıyı Yenile
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
