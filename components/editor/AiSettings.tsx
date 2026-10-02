'use client';

import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Check, Cloud, Cpu, Download, Eye, EyeOff, FilePlus2, Key, Loader2, Plus, RefreshCw, ShieldCheck, Sparkles, Trash2, WifiOff, X } from 'lucide-react';
import {
    DEFAULT_MODELS, KEY_HINTS, PROVIDER_LABELS, readActiveProvider, readCustomUrl,
    readModelList, readProviderKey, readProviderModel, readRawProviderModel, saveActiveProvider,
    saveCustomUrl, saveModelList, saveProviderKey, saveProviderModel, type ProviderType
} from '@/lib/aiProvider';
import {
    deleteLocalModel, getDesktopLocalEndpoint, getSavedLocalModelPath, importLocalModel, isLocalLlmSupported,
    isOfflineFallbackEnabled, listDiscoveredModels, loadLocalModel,
    runLocalInference, saveDesktopLocalEndpoint, setOfflineFallbackEnabled, unloadLocalModel, type LocalModelFile
} from '@/lib/localLlm';
import { SettingsField, SettingsNote, SettingsPageHeader, SettingsRow, SettingsSection, SettingsSwitch, settingsFieldClass } from '@/components/ui/settings';

type CloudProvider = Exclude<ProviderType, 'local'>;
const providers: { id: CloudProvider; name: string; detail: string }[] = [
    { id: 'gemini', name: 'Gemini', detail: 'Google' },
    { id: 'openai', name: 'OpenAI', detail: 'GPT modelleri' },
    { id: 'anthropic', name: 'Claude', detail: 'Anthropic' },
    { id: 'custom', name: 'Özel sunucu', detail: 'OpenAI uyumlu API' }
];
const actionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 disabled:cursor-not-allowed disabled:opacity-50';
const primaryClass = actionClass + ' bg-moss-600 text-white hover:bg-moss-700';
const secondaryClass = actionClass + ' border border-sand-300 bg-white text-sand-800 hover:bg-sand-50';
const errorText = (error: unknown) => error instanceof Error ? error.message : 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';

/** Sekmeler yalnızca görünümü değiştirir; kullanılan motor ayrı, açık bir seçimdir. */
export default function AiSettings() {
    const [tab, setTab] = useState<'cloud' | 'local'>('cloud');
    const [active, setActive] = useState<ProviderType>('gemini');
    const [provider, setProvider] = useState<CloudProvider>('gemini');
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [model, setModel] = useState('');
    const [modelList, setModelList] = useState<string[]>([]);
    const [newModel, setNewModel] = useState('');
    const [customUrl, setCustomUrl] = useState('');
    const [fallback, setFallback] = useState(true);
    const [native, setNative] = useState(false);
    const [supported, setSupported] = useState<boolean | null>(null);
    const [files, setFiles] = useState<LocalModelFile[]>([]);
    const [selectedPath, setSelectedPath] = useState('');
    const [endpoint, setEndpoint] = useState('');
    const [ollamaModel, setOllamaModel] = useState('gemma3:1b');
    const [busy, setBusy] = useState<string | null>(null);
    const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
    const [sample, setSample] = useState('');
    const [deleteFiles, setDeleteFiles] = useState<LocalModelFile[] | null>(null);
    const operation = useRef(false);
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const readCloud = (id: CloudProvider) => {
        setProvider(id);
        setApiKey(readProviderKey(id));
        setModel(readRawProviderModel(id));
        setModelList(readModelList(id));
        setNewModel('');
        setShowKey(false);
    };
    const refreshFiles = async () => {
        const result = await listDiscoveredModels();
        setFiles(result.models);
        setSelectedPath(getSavedLocalModelPath());
    };
    useEffect(() => {
        const current = readActiveProvider();
        setActive(current);
        setTab(current === 'local' ? 'local' : 'cloud');
        readCloud(current === 'local' ? 'gemini' : current);
        setCustomUrl(readCustomUrl());
        setFallback(isOfflineFallbackEnabled());
        setNative(Capacitor.getPlatform() === 'android');
        setEndpoint(getDesktopLocalEndpoint());
        const previousModel = readRawProviderModel('local');
        setOllamaModel(previousModel && !['gemma-2b-it', 'gemma2-2b-it', 'phi-2'].includes(previousModel) ? previousModel : 'gemma3:1b');
        void isLocalLlmSupported().then(setSupported);
        if (Capacitor.getPlatform() === 'android') {
            void refreshFiles().catch(error => setMessage({ error: true, text: errorText(error) }));
        }
    }, []);

    const perform = async (label: string, action: () => Promise<void>) => {
        if (operation.current) return;
        operation.current = true;
        setBusy(label);
        setMessage(null);
        setDeleteFiles(null);
        try { await action(); }
        catch (error) { setMessage({ error: true, text: errorText(error) }); }
        finally { operation.current = false; setBusy(null); }
    };
    const activate = (id: ProviderType) => { saveActiveProvider(id); setActive(id); };
    const load = (path: string) => perform('Model hazırlanıyor…', async () => {
        try { await loadLocalModel(path); }
        finally { await refreshFiles(); }
        activate('local');
        setMessage({ error: false, text: 'Yerel model hazır. Yapay zekâ araçları artık bu cihazda çalışır.' });
    });
    const addModel = () => {
        const value = newModel.trim();
        if (!value) return;
        const next = Array.from(new Set([...modelList, value]));
        saveModelList(provider, next);
        saveProviderModel(provider, value);
        setModelList(next); setModel(value); setNewModel('');
    };
    const localReady = native ? files.some(file => file.isLoaded) : !!endpoint.trim() && !!ollamaModel.trim();
    const activeModel = active === 'local'
        ? native ? files.find(file => file.isLoaded)?.name || files.find(file => file.path === selectedPath)?.name || 'Model seçilmedi' : ollamaModel.trim() || 'Model seçilmedi'
        : active === provider ? model.trim() || DEFAULT_MODELS[active] : readProviderModel(active);
    const removeFiles = () => {
        const targets = deleteFiles;
        if (!targets?.length) return;
        setDeleteFiles(null);
        setSample('');
        void perform('Modeller siliniyor…', async () => {
            try { for (const file of targets) await deleteLocalModel(file.path); }
            finally { await refreshFiles(); }
            setMessage({ error: false, text: targets.length === 1 ? 'Model silindi.' : 'Model listesi temizlendi.' });
        });
    };

    return (
        <div className="space-y-4">
            <SettingsPageHeader icon={Sparkles} title="Yapay zekâ" description="İnternetten güç alın ya da notlarınızı cihazınızda işleyin." />

            <div className="flex items-center gap-3 rounded-2xl border border-moss-500/25 bg-moss-50 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-moss-100 text-moss-700">
                    {active === 'local' ? <Cpu size={18} /> : <Cloud size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-moss-700">Kullanılan yapay zekâ</p>
                    <p className="truncate text-sm font-semibold text-sand-900">{active === 'local' ? 'Yerel · cihazınızda' : providers.find(item => item.id === active)?.name}</p>
                    <p className="mt-0.5 break-words text-xs text-moss-800" aria-live="polite">{activeModel}</p>
                </div>
                <Check size={17} className="shrink-0 text-moss-700" aria-hidden />
            </div>

            <div role="tablist" aria-label="Yapay zekâ ayarları" className="grid grid-cols-2 gap-1 rounded-2xl border border-sand-200 bg-sand-200/50 p-1">
                {(['cloud', 'local'] as const).map((id, index) => (
                    <button key={id} ref={element => { tabRefs.current[index] = element; }} type="button" role="tab"
                        id={`ai-tab-${id}`} aria-controls={`ai-panel-${id}`} aria-selected={tab === id} tabIndex={tab === id ? 0 : -1}
                        onClick={() => { setTab(id); setMessage(null); }}
                        onKeyDown={event => {
                            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                            event.preventDefault();
                            const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
                            setTab(next === 0 ? 'cloud' : 'local'); setMessage(null); tabRefs.current[next]?.focus();
                        }}
                        className={'flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 ' + (tab === id ? 'bg-white text-moss-800 shadow-sm' : 'text-sand-700 hover:bg-white/50')}>
                        {id === 'cloud' ? <Cloud size={17} /> : <Cpu size={17} />}{id === 'cloud' ? 'Bulut' : 'Yerel'}
                    </button>
                ))}
            </div>

            {message && <div role={message.error ? 'alert' : 'status'} className={'rounded-xl border px-4 py-3 text-sm leading-relaxed ' + (message.error ? 'border-berry-200 bg-berry-50 text-berry-800' : 'border-moss-200 bg-moss-50 text-moss-800')}>{message.text}</div>}

            {tab === 'cloud' ? (
                <div role="tabpanel" id="ai-panel-cloud" aria-labelledby="ai-tab-cloud" className="space-y-4">
                    <SettingsSection title="Sağlayıcı" description="Anahtarlar ve modeller her sağlayıcı için ayrı saklanır.">
                        <div className="grid grid-cols-2 gap-2">
                            {providers.map(item => (
                                <button type="button" key={item.id} aria-pressed={provider === item.id} onClick={() => { readCloud(item.id); setMessage(null); }}
                                    className={'flex min-h-14 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 ' + (provider === item.id ? 'border-moss-400 bg-moss-50 text-moss-800' : 'border-sand-200 text-sand-800 hover:bg-sand-50')}>
                                    <span><span className="block text-sm font-semibold">{item.name}</span><span className="block text-[11px] text-sand-600">{item.detail}</span></span>
                                    {provider === item.id && <Check size={16} className="shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </SettingsSection>
                    <SettingsSection icon={Key} title="Bağlantı">
                        <div className="space-y-4">
                            {provider === 'custom' && <SettingsField label="Sunucu adresi" htmlFor="ai-custom-url" hint={native ? 'OpenAI uyumlu /v1 veya /chat/completions adresi. Telefonda http:// ve yerel ağ adresleri (örn. http://192.168.1.20:1234/v1) kullanılabilir.' : 'OpenAI uyumlu /v1 veya /chat/completions adresi. Web sürümünde adres HTTPS ve herkese açık olmalıdır; yerel sunucular için Android uygulamasını kullanın.'}>
                                <input id="ai-custom-url" type="url" value={customUrl} onChange={event => { setCustomUrl(event.target.value); saveCustomUrl(event.target.value); }} placeholder="https://api.example.com/v1" className={settingsFieldClass} />
                            </SettingsField>}
                            <SettingsField label={provider === 'custom' ? 'API anahtarı (isteğe bağlı)' : 'API anahtarı'} htmlFor="ai-api-key" hint={provider === 'custom' ? 'Yerel sunucular çoğunlukla anahtar istemez; boş bırakabilirsiniz.' : KEY_HINTS[provider]}>
                                <div className="relative">
                                    <input id="ai-api-key" type={showKey ? 'text' : 'password'} autoComplete="off" autoCapitalize="none" spellCheck={false} value={apiKey}
                                        onChange={event => { setApiKey(event.target.value); saveProviderKey(provider, event.target.value); }} placeholder="Anahtarınızı yapıştırın" className={settingsFieldClass + ' pr-12 font-mono'} />
                                    <button type="button" onClick={() => setShowKey(!showKey)} aria-label={showKey ? 'Anahtarı gizle' : 'Anahtarı göster'} aria-pressed={showKey}
                                        className="absolute right-0 top-0 flex h-full min-h-11 w-11 items-center justify-center rounded-xl text-sand-600 focus-visible:ring-2 focus-visible:ring-moss-500">{showKey ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                                </div>
                            </SettingsField>
                            <SettingsField label="Model" htmlFor="ai-cloud-model" hint="Sağlayıcının desteklediği model adını seçin veya ekleyin.">
                                <select id="ai-cloud-model" value={model || DEFAULT_MODELS[provider]} onChange={event => { setModel(event.target.value); saveProviderModel(provider, event.target.value); }} className={settingsFieldClass}>
                                    {!modelList.length && <option value="">Model ekleyin</option>}
                                    {Array.from(new Set([model || DEFAULT_MODELS[provider], ...modelList].filter(Boolean))).map(value => <option key={value} value={value}>{value}</option>)}
                                </select>
                            </SettingsField>
                            <details className="rounded-xl border border-sand-200 bg-sand-50/50">
                                <summary className="min-h-11 cursor-pointer px-3 py-3 text-xs font-medium text-sand-700">Model listesini düzenle</summary>
                                <div className="space-y-2 px-3 pb-3">
                                    <div className="flex gap-2">
                                        <input aria-label="Yeni model adı" value={newModel} onChange={event => setNewModel(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addModel(); } }} autoCapitalize="none" spellCheck={false} placeholder="Model adı" className={settingsFieldClass + ' min-w-0 flex-1'} />
                                        <button type="button" disabled={!newModel.trim()} onClick={addModel} className={secondaryClass + ' shrink-0 px-3'} aria-label="Model ekle"><Plus size={17} /></button>
                                    </div>
                                    {modelList.map(value => <div key={value} className="flex items-center gap-2">
                                        <span className="min-w-0 flex-1 truncate font-mono text-xs text-sand-700">{value}</span>
                                        {value !== DEFAULT_MODELS[provider] && <button type="button" aria-label={`${value} modelini listeden çıkar`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sand-600 hover:bg-berry-50 hover:text-berry-700 focus-visible:ring-2 focus-visible:ring-moss-500" onClick={() => {
                                            const next = modelList.filter(item => item !== value); saveModelList(provider, next); setModelList(next);
                                            if (model === value) { saveProviderModel(provider, ''); setModel(''); }
                                        }}><X size={15} /></button>}
                                    </div>)}
                                </div>
                            </details>
                            <button type="button" disabled={(provider !== 'custom' && !apiKey.trim()) || !(model || DEFAULT_MODELS[provider]).trim() || (provider === 'custom' && !customUrl.trim())} onClick={() => activate(provider)} className={primaryClass + ' w-full'}>
                                {active === provider ? <><Check size={16} /> Bu sağlayıcı kullanılıyor</> : <><Cloud size={16} /> {providers.find(item => item.id === provider)?.name} kullan</>}
                            </button>
                        </div>
                    </SettingsSection>
                    <div className="px-1 text-xs leading-relaxed text-sand-600">
                        Ayarlar anında kaydedilir. Bulut araçlarında anahtar ve işlenecek metin uygulamanın sunucusu üzerinden sağlayıcıya iletilir. <a href="/gizlilik" className="font-medium text-moss-700 underline underline-offset-2">Gizlilik politikası</a>
                    </div>
                </div>
            ) : (
                <div role="tabpanel" id="ai-panel-local" aria-labelledby="ai-tab-local" className="space-y-4">
                    {!native && <div className="flex items-start gap-2.5 px-1 text-xs leading-relaxed text-sand-600"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-moss-700" /><p>Tarayıcıda yerel modeller Ollama üzerinden çalışır.</p></div>}
                    {native ? <>
                        <SettingsSection icon={Download} title="Model ekle">
                            <div className="space-y-3">
                                <p className="text-xs leading-relaxed text-sand-600">Hugging Face’ten uyumlu .litertlm / .task / .bin dosyasını indirin, ardından burada seçin.</p>
                                <button type="button" className={primaryClass + ' w-full'} disabled={!!busy || supported !== true} onClick={() => void perform('Model dosyası ekleniyor…', async () => {
                                    const path = await importLocalModel(); if (!path) return;
                                    await refreshFiles(); setMessage({ error: false, text: 'Dosya eklendi. Aşağıdan “Etkinleştir” ile kullanmaya başlayın.' });
                                })}><FilePlus2 size={17} /> Dosya seç</button>
                            </div>
                        </SettingsSection>
                        <SettingsSection icon={Cpu} title="Cihazdaki modeller" action={<div className="flex items-center gap-1">
                            {!!files.length && <button type="button" disabled={!!busy} onClick={() => setDeleteFiles(files)} className={actionClass + ' px-2 text-berry-700 hover:bg-berry-50'} aria-label="Tüm yerel modelleri sil"><Trash2 size={16} /><span className="text-xs">Temizle</span></button>}
                            <button type="button" disabled={!!busy} onClick={() => void perform('Modeller kontrol ediliyor…', refreshFiles)} className="flex h-11 w-11 items-center justify-center rounded-xl text-sand-600 hover:bg-sand-50 focus-visible:ring-2 focus-visible:ring-moss-500 disabled:opacity-50" aria-label="Model listesini yenile"><RefreshCw size={17} /></button>
                        </div>}>
                            {deleteFiles && <div role="group" aria-label="Model silme onayı" className="mb-3 rounded-xl border border-berry-200 bg-berry-50 p-3">
                                <p className="break-words text-sm text-berry-800">{deleteFiles.length === 1 ? `${deleteFiles[0].name} silinsin mi?` : `${deleteFiles.length} modelin tamamı silinsin mi?`}</p>
                                <p className="mt-1 text-xs text-berry-700">Dosyalar cihazdan kaldırılır. Yeniden kullanmak için eklemeniz gerekir.</p>
                                <div className="mt-2 flex justify-end gap-2"><button type="button" className={secondaryClass} onClick={() => setDeleteFiles(null)}>Vazgeç</button><button type="button" className={actionClass + ' bg-berry-700 text-white hover:bg-berry-800'} onClick={removeFiles}>Sil</button></div>
                            </div>}
                            {files.length ? <div className="space-y-2">{files.map(file => <div key={file.path} className={'rounded-xl border p-3 ' + (file.isLoaded ? 'border-moss-300 bg-moss-50' : 'border-sand-200')}>
                                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="break-all text-xs font-semibold text-sand-900">{file.name}</p><p className="mt-1 text-[11px] text-sand-600">{file.sizeMb} MB{file.isLoaded ? ' · Hazır' : file.path === selectedPath ? ' · Son kullanılan' : ' · Cihazda kayıtlı'}</p></div>{file.isLoaded && <Check size={16} className="shrink-0 text-moss-700" />}</div>
                                <div className="mt-3 flex gap-2"><button type="button" disabled={!!busy} className={(file.isLoaded ? secondaryClass : primaryClass) + ' min-w-0 flex-1'} onClick={() => file.isLoaded ? void perform('Model kapatılıyor…', async () => {
                                    await unloadLocalModel(); await refreshFiles(); setMessage({ error: false, text: 'Model bellekten çıkarıldı; dosya cihazda duruyor. Tekrar etkinleştirebilirsiniz.' });
                                }) : void load(file.path)}>{file.isLoaded ? 'Belleği boşalt' : 'Etkinleştir'}</button><button type="button" disabled={!!busy} aria-label={`${file.name} modelini sil`} onClick={() => setDeleteFiles([file])} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sand-600 hover:bg-berry-50 hover:text-berry-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berry-500 disabled:opacity-50"><Trash2 size={17} /></button></div>
                            </div>)}</div> : <div className="py-3 text-center"><Cpu size={25} className="mx-auto mb-2 text-sand-400" /><p className="text-sm font-medium text-sand-800">Henüz model eklenmedi</p><p className="mt-1 text-xs text-sand-600">İndirdiğiniz dosyayı yukarıdaki düğmeden seçin.</p></div>}
                            {supported === false && <div className="mt-3"><SettingsNote tone="error">Yerel motor bu sürümde kullanılamıyor. Güncel Android uygulamasını yükleyin.</SettingsNote></div>}
                        </SettingsSection>
                    </> : <SettingsSection icon={Cpu} title="Ollama bağlantısı" description="Ollama çalışan bilgisayarın adresi ve kurulu model adı.">
                        <div className="space-y-4">
                            <SettingsField label="Sunucu adresi" htmlFor="ai-ollama-url"><input id="ai-ollama-url" type="url" value={endpoint} onChange={event => { setEndpoint(event.target.value); saveDesktopLocalEndpoint(event.target.value); }} placeholder="http://localhost:11434" className={settingsFieldClass} /></SettingsField>
                            <SettingsField label="Ollama modeli" htmlFor="ai-ollama-model"><input id="ai-ollama-model" value={ollamaModel} autoCapitalize="none" spellCheck={false} onChange={event => { setOllamaModel(event.target.value); saveProviderModel('local', event.target.value); }} placeholder="gemma3:1b" className={settingsFieldClass} /></SettingsField>
                            <button type="button" disabled={!localReady} onClick={() => { saveProviderModel('local', ollamaModel); activate('local'); }} className={primaryClass + ' w-full'}>{active === 'local' ? <><Check size={16} /> Yerel mod kullanılıyor</> : <><Cpu size={16} /> Yerel modu kullan</>}</button>
                            <p className="text-xs leading-relaxed text-sand-600">Ollama açık ve model kurulu olmalıdır. Tarayıcının ağ izinleri veya HTTPS kısıtlamaları bağlantıyı engelleyebilir.</p>
                        </div>
                    </SettingsSection>}
                    {busy && <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-xl bg-sand-200/50 px-4 py-3 text-sm text-sand-800"><Loader2 size={17} className="shrink-0 animate-spin" />{busy}</div>}
                    <SettingsSection icon={WifiOff} title="İnternet kesildiğinde">
                        <SettingsRow title="Yerel modele geç" description="Bulut yanıt veremezse yerel model denenir. Modeli önceden ekleyip hazırlamanız gerekir."><SettingsSwitch label="Bulut çalışmazsa yerel modele geç" checked={fallback} onChange={checked => { setFallback(checked); setOfflineFallbackEnabled(checked); }} /></SettingsRow>
                    </SettingsSection>
                    {localReady && <SettingsSection icon={Sparkles} title="Kısa bir deneme">
                        <button type="button" disabled={!!busy} className={secondaryClass + ' w-full'} onClick={() => void perform('Yerel model yanıtlıyor…', async () => {
                            setSample(''); if (!native) saveProviderModel('local', ollamaModel);
                            const result = await runLocalInference('Türkçe tek kısa cümleyle merhaba de.');
                            if (!result.text.trim()) throw new Error('Model boş yanıt verdi. Başka bir uyumlu model deneyin.');
                            setSample(result.text.trim());
                        })}>Modeli dene</button>
                        {sample && <p role="status" className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-moss-50 p-3 text-sm leading-relaxed text-moss-900">{sample}</p>}
                    </SettingsSection>}
                </div>
            )}
        </div>
    );
}
