/** Yerel/bulut geçişinin veri saklama ve hata sözleşmeleri. Model çıkarımı
 * sahte native köprüyle yönlendirme açısından denetlenir; donanım testi değildir. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const stored = new Map();
const storage = {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
    removeItem: key => stored.delete(key)
};
let platform = 'android';
const bridge = {};
let lastRequest;
let calls = 0;
const providers = {};
const dependencies = {
    '@capacitor/core': {
        Capacitor: { isNativePlatform: () => platform === 'android', getPlatform: () => platform },
        registerPlugin: () => bridge
    },
    './degisim': { bildir: () => {} },
    './aiProvider': providers
};
function load(file) {
    const source = ts.transpileModule(readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText;
    const exports = {};
    vm.runInNewContext(source, {
        exports, require: id => {
            if (!(id in dependencies)) throw new Error(`Beklenmeyen bağımlılık: ${id}`);
            return dependencies[id];
        },
        window: {}, localStorage: storage, console: { error() {}, warn() {} },
        setTimeout, clearTimeout, AbortController,
        fetch: async (url, options) => {
            calls++; lastRequest = { url, body: JSON.parse(options.body) };
            return { ok: true, json: async () => ({ response: 'Merhaba' }) };
        }
    }, { filename: file });
    return exports;
}
Object.assign(providers, load('lib/aiProvider.ts'));
const local = load('lib/localLlm.ts');

providers.saveProviderKey('gemini', 'test-gemini');
providers.saveProviderKey('openai', 'test-openai');
providers.saveActiveProvider('local');
assert.equal(providers.readProviderKey('gemini'), 'test-gemini');
assert.equal(providers.readProviderKey('openai'), 'test-openai');
local.setOfflineFallbackEnabled(false);
assert.equal(local.isOfflineFallbackEnabled(), false);

bridge.importModel = async () => ({ cancelled: true });
assert.equal(await local.importLocalModel(), null);
bridge.importModel = async () => ({});
await assert.rejects(local.importLocalModel(), /eklenemedi/);
bridge.importModel = async () => ({ modelPath: '/files/models/gemma.task' });
assert.equal(await local.importLocalModel(), '/files/models/gemma.task');
assert.equal(local.getSavedLocalModelPath(), ''); // Eklemek, etkinleştirmek değildir.

bridge.loadModel = async () => ({ success: false });
await assert.rejects(local.loadLocalModel('/files/models/bad.task'), /yüklenemedi/);
assert.equal(local.getSavedLocalModelPath(), '');
bridge.loadModel = async () => ({ success: true });
await local.loadLocalModel('/files/models/gemma.task');
assert.equal(local.getSavedLocalModelPath(), '/files/models/gemma.task');
bridge.listModels = async () => { throw new Error('Köprü yok'); };
await assert.rejects(local.listDiscoveredModels(), /Köprü yok/);
bridge.unloadModel = async () => { throw new Error('Boşaltma hatası'); };
await assert.rejects(local.unloadLocalModel(), /Boşaltma hatası/);

local.saveLocalModelPath('');
bridge.isAvailable = async () => ({ supported: true, isLoaded: false });
await assert.rejects(local.runLocalInference('test'), /model bulunamadı/);
assert.equal(calls, 0); // Yerel istek, model yokken buluta gitmez.
bridge.isAvailable = async () => ({ supported: true, isLoaded: true });
bridge.generate = async () => ({ text: 'Merhaba', modelName: 'Gemma', durationMs: 1 });
assert.equal((await local.runLocalInference('test')).text, 'Merhaba');
assert.equal(calls, 0);

platform = 'web';
await assert.rejects(local.importLocalModel(), /Android/);
await assert.rejects(local.loadLocalModel('/some/file'), /Ollama/);
local.saveDesktopLocalEndpoint('http://127.0.0.1:11434/');
providers.saveProviderModel('local', 'custom-model:latest');
await local.runLocalInference('Türkçe');
assert.equal(lastRequest.url, 'http://127.0.0.1:11434/api/generate');
assert.equal(lastRequest.body.model, 'custom-model:latest');
providers.saveProviderModel('local', 'gemma-2b-it');
await local.runLocalInference('test');
assert.equal(lastRequest.body.model, 'gemma3:1b');
console.log('Yerel AI sözleşmeleri geçti: sağlayıcı izolasyonu, iptal, hata iletimi, dosya seçimi, yerel yönlendirme, Ollama model tercihi.');
