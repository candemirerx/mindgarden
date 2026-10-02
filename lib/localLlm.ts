/**
 * NotBahçesi Yerel Yapay Zekâ (On-Device Local LLM) Katmanı
 *
 * MediaPipe Tasks GenAI (Android Native) ve Masaüstü / Yerel Endpoint (Ollama)
 * üzerinden tamamen çevrimdışı, sıfır internet ve sıfır API anahtarı ile çalışır.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { bildir } from './degisim';

export interface LocalModelFile {
    name: string;
    path: string;
    sizeBytes: number;
    sizeMb: number;
    isLoaded: boolean;
}

export interface LocalModelCatalogItem {
    id: string;
    name: string;
    description: string;
    size: string;
    ramReq: string;
    filename: string;
    downloadUrl: string;
    recommended?: boolean;
}

/** Google'ın Android LLM Inference kılavuzundaki hazır MediaPipe dosyası.
 * Ham Hugging Face ağırlıkları (.safetensors/GGUF) bu motorla kullanılamaz.
 * Gemma lisansı kullanıcının Hugging Face hesabıyla kabul edilmelidir.
 */
export const RECOMMENDED_LOCAL_MODELS: LocalModelCatalogItem[] = [
    {
        id: 'gemma3-1b-it',
        name: 'Gemma 3 · 1B',
        description: 'Telefon için hafif, 4 bit sıkıştırılmış metin modeli. Performans ve Türkçe kalitesi cihazınıza göre değişir.',
        size: '~600 MB',
        ramReq: 'Yeterli boş RAM gerekir',
        filename: 'gemma3-1b-it-int4.task',
        downloadUrl: 'https://huggingface.co/litert-community/Gemma3-1B-IT/blob/main/gemma3-1b-it-int4.task',
        recommended: true
    }
];

export interface LocalLlmPluginInterface {
    deleteModel(options: { modelPath: string }): Promise<{ success: boolean }>;
    isAvailable(): Promise<{
        supported: boolean;
        isLoaded: boolean;
        currentModelPath: string;
        currentModelName: string;
    }>;
    listModels(): Promise<{
        models: LocalModelFile[];
        modelsDir: string;
        extModelsDir?: string;
    }>;
    loadModel(options: {
        modelPath: string;
        maxTokens?: number;
    }): Promise<{
        success: boolean;
        modelPath: string;
        modelName: string;
    }>;
    generate(options: {
        prompt: string;
    }): Promise<{
        text: string;
        durationMs: number;
        modelName: string;
    }>;
    unloadModel(): Promise<{ success: boolean }>;
    importModel(): Promise<{ cancelled?: boolean; modelPath?: string; modelName?: string }>;
}

const LocalLlmNative = registerPlugin<LocalLlmPluginInterface>('LocalLlm');

/** Android dosya seçicisiyle alınan dosya uygulamanın özel deposuna kopyalanır. */
export async function importLocalModel(): Promise<string | null> {
    if (Capacitor.getPlatform() !== 'android') {
        throw new Error('Dosyadan model ekleme Android uygulamasında kullanılabilir. Tarayıcıda Ollama bağlantısını kullanın.');
    }
    const result = await LocalLlmNative.importModel();
    if (result.cancelled) return null;
    if (!result.modelPath) throw new Error('Model dosyası eklenemedi.');
    return result.modelPath;
}

const STORAGE_KEY_FALLBACK = 'nb-ai-offline-fallback';
const STORAGE_KEY_SELECTED_PATH = 'nb-ai-local-model-path';
const STORAGE_KEY_DESKTOP_ENDPOINT = 'nb-ai-local-desktop-endpoint';

/** Otomatik çevrimdışı yedekleme açık mı? (İnternet koptuğunda yerel modele geç) */
export function isOfflineFallbackEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    const val = localStorage.getItem(STORAGE_KEY_FALLBACK);
    return val === null ? true : val === 'true'; // Varsayılan: Açık
}

export function setOfflineFallbackEnabled(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_FALLBACK, enabled ? 'true' : 'false');
    bildir('ai-tercih');
}

/** Kayıtlı yerel model dosya yolu */
export function getSavedLocalModelPath(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_KEY_SELECTED_PATH) || '';
}

export function saveLocalModelPath(path: string): void {
    if (typeof window === 'undefined') return;
    if (path.trim()) {
        localStorage.setItem(STORAGE_KEY_SELECTED_PATH, path.trim());
    } else {
        localStorage.removeItem(STORAGE_KEY_SELECTED_PATH);
    }
    bildir('ai-tercih');
}

/** Masaüstü için yerel Ollama/LM Studio endpoint'i (örn. http://localhost:11434) */
export function getDesktopLocalEndpoint(): string {
    if (typeof window === 'undefined') return 'http://localhost:11434';
    return localStorage.getItem(STORAGE_KEY_DESKTOP_ENDPOINT) || 'http://localhost:11434';
}

export function saveDesktopLocalEndpoint(url: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_DESKTOP_ENDPOINT, url.trim());
    bildir('ai-tercih');
}

/** Yerel yapay zekâ bu cihazda destekleniyor mu? */
export async function isLocalLlmSupported(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
        try {
            const res = await LocalLlmNative.isAvailable();
            return !!res?.supported;
        } catch {
            return false;
        }
    }
    // Web / Masaüstü ortamında yerel Ollama veya WebGPU kullanılabilir
    return true;
}

/** Cihazdaki `.bin` / `.task` modellerini listeler */
export async function listDiscoveredModels(): Promise<{
    models: LocalModelFile[];
    modelsDir: string;
    extModelsDir?: string;
}> {
    if (Capacitor.isNativePlatform()) {
        return await LocalLlmNative.listModels();
    }
    return { models: [], modelsDir: '' };
}

/** Modeli belleğe yükler */
export async function loadLocalModel(modelPath: string): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
        try {
            const res = await LocalLlmNative.loadModel({ modelPath, maxTokens: 1024 });
            if (res.success) {
                saveLocalModelPath(modelPath);
                return true;
            }
            throw new Error('Model belleğe yüklenemedi.');
        } catch (e) {
            console.error('Model yüklenirken hata:', e);
            throw e;
        }
    }
    throw new Error('Tarayıcıda dosya yüklemek yerine Ollama bağlantısını kullanın.');
}

/** Modeli bellekten (RAM/GPU) boşaltır */
export async function unloadLocalModel(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
        await LocalLlmNative.unloadModel();
    }
}

/** Uygulamaya eklenmiş model dosyasını siler ve eski seçimi temizler. */
export async function deleteLocalModel(modelPath: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) throw new Error('Dosya silme yalnızca Android cihazda kullanılabilir.');
    const result = await LocalLlmNative.deleteModel({ modelPath });
    if (!result.success) throw new Error('Model silinemedi.');
    if (getSavedLocalModelPath() === modelPath) saveLocalModelPath('');
}

/** Yerel yapay zekâ ile metin üretir (Android MediaPipe veya Masaüstü Ollama) */
export async function runLocalInference(prompt: string): Promise<{ text: string; source: string; durationMs?: number }> {
    if (Capacitor.isNativePlatform()) {
        // Cihaz içi MediaPipe LLM Inference
        const status = await LocalLlmNative.isAvailable().catch(() => null);
        if (!status?.isLoaded) {
            // Kayıtlı bir model yolu varsa önce onu yüklemeyi dene
            const savedPath = getSavedLocalModelPath();
            if (savedPath) {
                await LocalLlmNative.loadModel({ modelPath: savedPath });
            } else {
                throw new Error(
                    'Cihazınızda yüklü bir yerel model bulunamadı.\n\n' +
                    'Ayarlar → Yapay zekâ → Yerel bölümünden uyumlu bir .litertlm, .task veya .bin modelini ekleyip etkinleştirin.'
                );
            }
        }

        const res = await LocalLlmNative.generate({ prompt });
        return {
            text: res.text,
            source: res.modelName || 'On-Device MediaPipe',
            durationMs: res.durationMs
        };
    } else {
        // Masaüstü / Tarayıcı ortamında yerel Ollama / Localhost
        const endpoint = getDesktopLocalEndpoint().replace(/\/+$/, '');
        const { readProviderModel } = await import('./aiProvider');
        // Önceki sürümlerin Android model adları Ollama etiketi değildir.
        const savedModel = readProviderModel('local');
        const model = ['gemma-2b-it', 'gemma2-2b-it', 'phi-2'].includes(savedModel) ? 'gemma3:1b' : savedModel;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);

        try {
            const res = await fetch(`${endpoint}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    model,
                    prompt: prompt,
                    stream: false
                })
            });

            if (!res.ok) {
                throw new Error(`Yerel servis hatası (${res.status}): ${res.statusText}`);
            }

            const data = await res.json();
            return {
                text: data.response || '',
                source: `Yerel Ollama (${model})`
            };
        } finally {
            clearTimeout(timeout);
        }
    }
}
