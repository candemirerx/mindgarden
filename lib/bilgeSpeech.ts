import { Capacitor, registerPlugin } from '@capacitor/core';
import { bilgePlainText } from './bilgeMedia';
export type BilgeVoice = { id: string; name: string; network: boolean };
export type BilgeSpeechPrefs = { engine: string; voice: string; rate: number; pitch: number };
export const DEFAULT_BILGE_SPEECH: BilgeSpeechPrefs = { engine: '', voice: '', rate: .92, pitch: .94 };
const native = registerPlugin<{
    voices(options: { engine: string }): Promise<{ engines: { id: string; name: string }[]; voices: BilgeVoice[] }>;
    speak(options: BilgeSpeechPrefs & { text: string }): Promise<void>;
    stop(): Promise<void>;
    install(options: { engine: string }): Promise<void>;
}>('BilgeSpeech');
export function readBilgeSpeech(): BilgeSpeechPrefs {
    try {
        const p = JSON.parse(localStorage.getItem('nb-bilge-speech') || '{}');
        return { engine: typeof p.engine === 'string' ? p.engine : '', voice: typeof p.voice === 'string' ? p.voice : '', rate: typeof p.rate === 'number' && p.rate >= .5 && p.rate <= 1.5 ? p.rate : .92, pitch: typeof p.pitch === 'number' && p.pitch >= .7 && p.pitch <= 1.3 ? p.pitch : .94 };
    } catch { return DEFAULT_BILGE_SPEECH; }
}
export function saveBilgeSpeech(p: BilgeSpeechPrefs) { localStorage.setItem('nb-bilge-speech', JSON.stringify(p)); }
let speechGeneration = 0;
let finishWebSpeech: (() => void) | undefined;
export async function bilgeVoices(engine = '') {
    if (Capacitor.isNativePlatform()) return native.voices({ engine });
    if (!('speechSynthesis' in window)) throw new Error('Bu tarayıcı seslendirmeyi desteklemiyor.');
    if (!speechSynthesis.getVoices().length) await new Promise<void>(resolve => {
        const done = () => { clearTimeout(timer); speechSynthesis.removeEventListener('voiceschanged', done); resolve(); };
        const timer = setTimeout(done, 2000); speechSynthesis.addEventListener('voiceschanged', done);
    });
    return { engines: [{ id: '', name: 'Tarayıcı / sistem' }], voices: speechSynthesis.getVoices().filter(v => /^tr([-_]|$)/i.test(v.lang)).map(v => ({ id: v.voiceURI, name: v.name, network: !v.localService })) };
}
export async function stopBilgeSpeech() {
    speechGeneration++;
    finishWebSpeech?.(); finishWebSpeech = undefined;
    if (Capacitor.isNativePlatform()) await native.stop();
    else if ('speechSynthesis' in window) speechSynthesis.cancel();
}
export async function speakBilge(text: string, prefs = readBilgeSpeech()) {
    await stopBilgeSpeech();
    const token = speechGeneration;
    const plain = bilgePlainText(text).trim().slice(0, 16000);
    if (!plain) return;
    if (Capacitor.isNativePlatform()) {
        const { voices } = await bilgeVoices(prefs.engine);
        if (token !== speechGeneration) return;
        const selected = voices.find(v => v.id === prefs.voice) || voices.find(v => !v.network) || voices[0];
        if (!selected) throw new Error('Türkçe ses bulunamadı. Ses ayarlarından Türkçe ses paketi yükleyin.');
        if (selected.network && !window.confirm('Seçtiğiniz çevrimiçi ses, okunacak metni ses motoru sağlayıcısına gönderebilir. Seslendirilsin mi?')) return;
        return native.speak({ ...prefs, voice: selected.id, text: plain });
    }
    if (!('speechSynthesis' in window)) throw new Error('Bu tarayıcı seslendirmeyi desteklemiyor.');
    await bilgeVoices();
    if (token !== speechGeneration) return;
    const voices = speechSynthesis.getVoices().filter(v => /^tr([-_]|$)/i.test(v.lang));
    const voice = voices.find(v => v.voiceURI === prefs.voice) || voices.find(v => v.localService) || voices[0];
    if (!voice) throw new Error('Türkçe ses bulunamadı. Cihazın metin okuma ayarlarından Türkçe ses yükleyin.');
    if (!voice.localService && !window.confirm('Çevrimiçi ses, okunacak metni ses sağlayıcısına gönderebilir. Seslendirilsin mi?')) return;
    await new Promise<void>((resolve, reject) => {
        const chunks: string[] = [];
        let remaining = plain;
        while (remaining) {
            let end = Math.min(180, remaining.length);
            if (end < remaining.length) { const space = remaining.lastIndexOf(' ', end); if (space > 80) end = space + 1; }
            chunks.push(remaining.slice(0, end)); remaining = remaining.slice(end);
        }
        let index = 0;
        let done = false;
        const finish = () => { done = true; if (finishWebSpeech === finish) finishWebSpeech = undefined; resolve(); };
        finishWebSpeech = finish;
        const next = () => {
            if (done || token !== speechGeneration || index >= chunks.length) { finish(); return; }
            const u = new SpeechSynthesisUtterance(chunks[index++]); u.voice = voice; u.lang = 'tr-TR'; u.rate = prefs.rate; u.pitch = prefs.pitch;
            u.onend = next; u.onerror = e => { if (e.error === 'canceled' || e.error === 'interrupted') finish(); else { done = true; if (finishWebSpeech === finish) finishWebSpeech = undefined; reject(new Error('Seslendirme tamamlanamadı.')); } };
            speechSynthesis.speak(u);
        }; next();
    });
}
export async function installBilgeVoices(engine: string) {
    if (Capacitor.isNativePlatform()) await native.install({ engine });
    else throw new Error('Türkçe sesleri cihazınızın erişilebilirlik / metin okuma ayarlarından yükleyebilirsiniz.');
}
