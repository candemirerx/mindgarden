/**
 * Bulut ses tanıma (kendi API anahtarıyla): OpenAI, Gemini, Groq.
 *
 * Mikrofon sesi tarayıcıda (WebView) kaydedilir, konuşmadaki duraklamalarla
 * cümlelere bölünür ve 16 kHz tek kanallı WAV olarak seçilen servise
 * gönderilir. OpenAI ve Gemini, Yapay zekâ ayarlarındaki aynı anahtarı
 * kullanır; Groq'un anahtarı ayrıca saklanır. İstekler doğrudan servise gider;
 * uygulamanın sunucusundan geçmez.
 */
import { readProviderKey, saveProviderKey } from './aiProvider';

export type BulutSaglayici = 'openai' | 'gemini' | 'groq';

export const BULUT_SAGLAYICILAR: Array<{ id: BulutSaglayici; ad: string; model: string; anahtarSayfasi: string; not: string }> = [
    { id: 'openai', ad: 'OpenAI', model: 'gpt-4o-mini-transcribe', anahtarSayfasi: 'https://platform.openai.com/api-keys', not: 'Çok isabetli, ucuz. Yapay zekâdaki OpenAI anahtarı kullanılır.' },
    { id: 'gemini', ad: 'Google Gemini', model: 'gemini-2.5-flash', anahtarSayfasi: 'https://aistudio.google.com/apikey', not: 'Ücretsiz kotası geniş. Yapay zekâdaki Gemini anahtarı kullanılır.' },
    { id: 'groq', ad: 'Groq (Whisper)', model: 'whisper-large-v3-turbo', anahtarSayfasi: 'https://console.groq.com/keys', not: 'Çok hızlı ve çok ucuz; ücretsiz kotası var.' }
];

const GROQ_ANAHTAR = 'nb-stt-key-groq';
const MODEL_ONEK = 'nb-stt-model-';

export function bulutAnahtari(s: BulutSaglayici): string {
    if (typeof window === 'undefined') return '';
    if (s === 'groq') { try { return localStorage.getItem(GROQ_ANAHTAR) ?? ''; } catch { return ''; } }
    return readProviderKey(s);
}
export function bulutAnahtariKaydet(s: BulutSaglayici, anahtar: string): void {
    if (s === 'groq') { try { localStorage.setItem(GROQ_ANAHTAR, anahtar.trim()); } catch { /* yok say */ } return; }
    saveProviderKey(s, anahtar.trim());
}
export function bulutModeli(s: BulutSaglayici): string {
    const varsayilan = BULUT_SAGLAYICILAR.find(b => b.id === s)!.model;
    if (typeof window === 'undefined') return varsayilan;
    try { return localStorage.getItem(MODEL_ONEK + s)?.trim() || varsayilan; } catch { return varsayilan; }
}
export function bulutModeliKaydet(s: BulutSaglayici, model: string): void {
    try { localStorage.setItem(MODEL_ONEK + s, model.trim()); } catch { /* yok say */ }
}

/** 'tr-TR' → 'tr' (servislerin beklediği ISO-639-1). */
const dilKodu = (dil: string) => (dil || 'tr').split(/[-_]/)[0].toLowerCase();

function hataMetni(saglayici: string, durum: number, govde: string): string {
    // Gemini geçersiz anahtarda 400 + "API key not valid" döndürür.
    if (durum === 401 || durum === 403 || /API key not valid|invalid_api_key|Invalid API Key/i.test(govde)) return saglayici + ': API anahtarı geçersiz ya da yetkisiz. Ayarlar → Bilgisayar bağlantısı → Dikte motoru bölümünden kontrol edin.';
    if (durum === 429) return saglayici + ': kota ya da hız sınırı doldu; biraz sonra deneyin veya hesabınızın bakiyesini kontrol edin.';
    if (durum === 413) return saglayici + ': ses parçası çok uzun.';
    const kisa = govde.replace(/\s+/g, ' ').slice(0, 160);
    return saglayici + ' hatası (' + durum + ')' + (kisa ? ': ' + kisa : '');
}

/** WAV sesini seçilen servise gönderip metni döndürür. Sessizlikse boş metin. */
export async function sesiYaziyaCevir(wav: Blob, s: BulutSaglayici, dil: string): Promise<string> {
    const anahtar = bulutAnahtari(s);
    const ad = BULUT_SAGLAYICILAR.find(b => b.id === s)!.ad;
    if (!anahtar) throw new Error(ad + ' için API anahtarı girilmemiş. Ayarlar → Bilgisayar bağlantısı → Dikte motoru → Bulut.');
    const model = bulutModeli(s);
    let yanit: Response;
    try {
        if (s === 'gemini') {
            const veri = await blobBase64(wav);
            yanit = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': anahtar },
                body: JSON.stringify({
                    contents: [{ parts: [
                        { text: `Bu ses kaydını (${dilKodu(dil)} dili) kelimesi kelimesine yazıya dök. Noktalama kullan. Yalnızca söylenen metni yaz; açıklama, tırnak ya da başlık ekleme. Konuşma yoksa hiçbir şey yazma.` },
                        { inline_data: { mime_type: 'audio/wav', data: veri } }
                    ] }],
                    generationConfig: { temperature: 0 }
                })
            });
        } else {
            const form = new FormData();
            form.append('file', wav, 'ses.wav');
            form.append('model', model);
            form.append('language', dilKodu(dil));
            form.append('response_format', 'json');
            const adres = s === 'openai' ? 'https://api.openai.com/v1/audio/transcriptions' : 'https://api.groq.com/openai/v1/audio/transcriptions';
            yanit = await fetch(adres, { method: 'POST', headers: { Authorization: 'Bearer ' + anahtar }, body: form });
        }
    } catch {
        throw new Error(ad + ' servisine ulaşılamadı. İnternet bağlantınızı kontrol edin.');
    }
    const govde = await yanit.text();
    if (!yanit.ok) throw new Error(hataMetni(ad, yanit.status, govde));
    try {
        const json = JSON.parse(govde);
        const metin = s === 'gemini'
            ? (json.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('')
            : String(json.text ?? '');
        return metin.trim();
    } catch { throw new Error(ad + ' yanıtı okunamadı.'); }
}

function blobBase64(blob: Blob): Promise<string> {
    return new Promise((coz, reddet) => {
        const okuyucu = new FileReader();
        okuyucu.onload = () => coz(String(okuyucu.result).split(',')[1] ?? '');
        okuyucu.onerror = () => reddet(new Error('Ses okunamadı.'));
        okuyucu.readAsDataURL(blob);
    });
}

/** Float32 örnekleri 16 kHz tek kanal, 16 bit PCM WAV'a çevirir. */
function wavYap(parcalar: Float32Array[], kaynakHizi: number): Blob {
    const hedefHiz = 16000;
    const toplam = parcalar.reduce((n, p) => n + p.length, 0);
    const oran = kaynakHizi / hedefHiz;
    const uzunluk = Math.floor(toplam / oran);
    const tum = new Float32Array(toplam);
    let o = 0; for (const p of parcalar) { tum.set(p, o); o += p.length; }
    const pcm = new Int16Array(uzunluk);
    for (let i = 0; i < uzunluk; i++) {
        // Basit ortalama ile örnek seyreltme (konuşma için yeterli).
        const bas = Math.floor(i * oran), son = Math.min(toplam, Math.floor((i + 1) * oran));
        let t = 0; for (let j = bas; j < son; j++) t += tum[j];
        const v = Math.max(-1, Math.min(1, t / Math.max(1, son - bas)));
        pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    const tampon = new ArrayBuffer(44 + pcm.byteLength);
    const g = new DataView(tampon);
    const yaz = (k: number, m: string) => { for (let i = 0; i < m.length; i++) g.setUint8(k + i, m.charCodeAt(i)); };
    yaz(0, 'RIFF'); g.setUint32(4, 36 + pcm.byteLength, true); yaz(8, 'WAVE'); yaz(12, 'fmt ');
    g.setUint32(16, 16, true); g.setUint16(20, 1, true); g.setUint16(22, 1, true); g.setUint32(24, hedefHiz, true);
    g.setUint32(28, hedefHiz * 2, true); g.setUint16(32, 2, true); g.setUint16(34, 16, true); yaz(36, 'data'); g.setUint32(40, pcm.byteLength, true);
    new Int16Array(tampon, 44).set(pcm);
    return new Blob([tampon], { type: 'audio/wav' });
}

/**
 * Mikrofon kaydedici. bolumle açıkken konuşma duraklayınca (~0,9 sn sessizlik)
 * o cümleyi onParca ile verir; böylece Köprü Dikte cümle cümle yazar. Uzun
 * kesintisiz konuşma 25 sn'de bölünür. bitir() kalan konuşmayı döndürür.
 */
export class SesKaydedici {
    private akis: MediaStream | null = null;
    private baglam: AudioContext | null = null;
    private islemci: ScriptProcessorNode | null = null;
    private parcalar: Float32Array[] = [];
    private onceki: Float32Array[] = [];
    private konusmaVar = false;
    private sessizMs = 0;
    private parcaMs = 0;
    private gurultu = 0.004;

    constructor(private ayar: { bolumle: boolean; onParca?: (wav: Blob) => void; onSeviye?: (konusuyor: boolean) => void }) {}

    async baslat(): Promise<void> {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Bu ortam mikrofon kaydını desteklemiyor.');
        try {
            this.akis = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        } catch {
            throw new Error('Mikrofona erişilemedi. Uygulamanın mikrofon izni açık mı?');
        }
        const Baglam = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.baglam = new Baglam();
        const kaynak = this.baglam.createMediaStreamSource(this.akis);
        this.islemci = this.baglam.createScriptProcessor(4096, 1, 1);
        const hiz = this.baglam.sampleRate;
        this.islemci.onaudioprocess = (olay) => {
            const veri = new Float32Array(olay.inputBuffer.getChannelData(0));
            const ms = (veri.length / hiz) * 1000;
            let kare = 0; for (let i = 0; i < veri.length; i++) kare += veri[i] * veri[i];
            const rms = Math.sqrt(kare / veri.length);
            const esik = Math.max(0.012, this.gurultu * 3);
            const konusuyor = rms > esik;
            if (!konusuyor) this.gurultu = this.gurultu * 0.95 + rms * 0.05; // ortam gürültüsünü izle
            this.ayar.onSeviye?.(konusuyor);
            if (konusuyor) {
                if (!this.konusmaVar) { this.parcalar = [...this.onceki]; this.parcaMs = 0; } // konuşmanın başını kaçırma
                this.konusmaVar = true; this.sessizMs = 0;
            } else if (this.konusmaVar) this.sessizMs += ms;
            if (this.konusmaVar) { this.parcalar.push(veri); this.parcaMs += ms; }
            else { this.onceki.push(veri); if (this.onceki.length > 3) this.onceki.shift(); }
            if (this.ayar.bolumle && this.konusmaVar && ((this.sessizMs >= 900 && this.parcaMs >= 600) || this.parcaMs >= 25000)) this.parcaVer();
        };
        kaynak.connect(this.islemci);
        this.islemci.connect(this.baglam.destination);
    }

    private parcaVer(): Blob | null {
        if (!this.konusmaVar || !this.parcalar.length || !this.baglam) { this.parcalar = []; return null; }
        const wav = wavYap(this.parcalar, this.baglam.sampleRate);
        this.parcalar = []; this.konusmaVar = false; this.sessizMs = 0; this.parcaMs = 0;
        this.ayar.onParca?.(wav);
        return wav;
    }

    /** Kaydı durdurur; söylenip henüz verilmemiş konuşma varsa onu döndürür. */
    async bitir(): Promise<Blob | null> {
        const kalan = this.konusmaVar ? (this.ayar.bolumle ? this.parcaVer() : wavYap(this.parcalar, this.baglam?.sampleRate ?? 48000)) : null;
        try { this.islemci?.disconnect(); } catch { /* yok say */ }
        this.akis?.getTracks().forEach(t => t.stop());
        try { await this.baglam?.close(); } catch { /* yok say */ }
        this.akis = null; this.baglam = null; this.islemci = null;
        return this.ayar.bolumle ? null : kalan;
    }
}
