import { Capacitor, registerPlugin } from '@capacitor/core';
import type { Plugin } from '@capacitor/core';
import { bildir } from './degisim';

export type RemoteMode = 'write' | 'mouse' | 'dictation' | 'shortcuts' | 'screen';
export type ConnectionMode = 'wifi' | 'bluetooth' | 'pc-wifi' | 'pc-bluetooth';
export type RemoteToolId = 'mouse' | 'dictation' | 'bridgeDictation' | 'bridgeWrite' | 'computerWrite' | 'clipboard' | 'shortcuts' | 'screen';
export const REMOTE_TOOL_IDS: RemoteToolId[] = ['mouse', 'dictation', 'bridgeDictation', 'bridgeWrite', 'computerWrite', 'clipboard', 'shortcuts', 'screen'];
/**
 * Sıralı makronun tek adımı. 'macro' adımı başka bir makroyu kimliğiyle
 * (value) çağırır; diğer türler tekil makrolarla aynı değeri taşır.
 */
export type RemoteMacroStep = { type: 'text' | 'shortcut' | 'position' | 'macro'; value: string; click?: 1 | 2 };
export type RemoteMacro = { id: string; name: string; type: 'text' | 'shortcut' | 'position' | 'sequence'; value: string; enabled?: boolean; click?: 1 | 2; steps?: RemoteMacroStep[] };
/** Kısayol panosunda birlikte gösterilen makrolar. */
export type RemoteProfile = { id: string; name: string; macroIds: string[] };
/** Editörün bilgisayar şeridindeki düğme; dokunulunca bağlı profilin makrolarını açar. */
export type RemoteShortcutButton = { id: string; name: string; profileId: string };
/** Ekran düzeninde bir bölmenin içeriği; shortcuts bölmesi isteğe bağlı bir profile bağlanır. */
export type RemotePaneKind = 'mouse' | 'keys' | 'text' | 'shortcuts' | 'empty';
export type RemotePane = { kind: RemotePaneKind; profileId?: string };
/**
 * Kullanıcının tasarladığı ekran: iki sütun, her sütunda üst ve alt bölme.
 * Oranlar yüzde olarak tutulur (20–80): sütun genişliği ve her sütunun üst bölme yüksekliği.
 */
export type RemoteScreenLayout = {
    id: string; name: string;
    split: number; leftSplit: number; rightSplit: number;
    panes: [RemotePane, RemotePane, RemotePane, RemotePane]; // sol üst, sol alt, sağ üst, sağ alt
};

/** Makro panoda ve ayarlarda çalıştırılabilir durumda mı? */
export function makroHazir(makro: RemoteMacro): boolean {
    if (makro.enabled === false || !makro.name.trim()) return false;
    return makro.type === 'sequence' ? (makro.steps?.length ?? 0) > 0 : makro.value.trim() !== '';
}

/** Konum makrolarında mutlak eksen aralığı (kart ve yardımcı program sözleşmesi). */
export const KONUM_MAX = 32767;
/** Ekranın ortası: 0–32767 aralığının ortası. */
export const KONUM_MERKEZ = 16384;

/** 0–32767 değerini okunur yüzdeye çevirir (bir ondalık). */
export function konumYuzdesi(deger: number): number {
    const sinirli = Math.max(0, Math.min(KONUM_MAX, Math.round(deger) || 0));
    return Math.round((sinirli / KONUM_MAX) * 1000) / 10;
}
export type RemotePrefs = {
    connection: ConnectionMode;
    cardUrl: string;
    helperUrl: string;
    helperToken: string;
    helperBluetoothAddress: string;
    mouseSensitivity: number;
    dictationLanguage: string;
    bridgeDictationSeconds: number;
    bridgeDictationUnlimited: boolean;
    /** Köprü Dikte'de tanınan söz, cümle sonu beklenmeden bilgisayara yazılır. */
    bridgeDictationLive: boolean;
    /** Köprü Dikte ses tanıma motoru: auto (cihaz içi varsa o), device (yalnızca cihaz içi), system (çevrimiçi). */
    dictationEngine: 'auto' | 'device' | 'system';
    appendDictation: boolean;
    dictationTarget: 'editor' | 'computer';
    enabledTools: Record<RemoteToolId, boolean>;
    macros: RemoteMacro[];
    profiles: RemoteProfile[];
    shortcutButtons: RemoteShortcutButton[];
    screenLayouts: RemoteScreenLayout[];
};

const key = 'nb-remote-prefs-v1';
const defaults: RemotePrefs = {
    connection: 'wifi', cardUrl: 'http://192.168.4.1', helperUrl: '', helperToken: '', helperBluetoothAddress: '',
    mouseSensitivity: 1, dictationLanguage: 'tr-TR', bridgeDictationSeconds: 30, bridgeDictationUnlimited: false, bridgeDictationLive: true, dictationEngine: 'auto', appendDictation: true, dictationTarget: 'editor',
    enabledTools: { mouse: true, dictation: true, bridgeDictation: true, bridgeWrite: true, computerWrite: true, clipboard: true, shortcuts: true, screen: true }, macros: [], profiles: [], shortcutButtons: [], screenLayouts: []
};

export function remotePrefs(): RemotePrefs {
    if (typeof window === 'undefined') return defaults;
    try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        return { ...defaults, ...data, enabledTools: { ...defaults.enabledTools, ...data.enabledTools }, macros: Array.isArray(data.macros) ? data.macros : [], profiles: Array.isArray(data.profiles) ? data.profiles : [], shortcutButtons: Array.isArray(data.shortcutButtons) ? data.shortcutButtons : [], screenLayouts: Array.isArray(data.screenLayouts) ? data.screenLayouts : [] };
    } catch { return defaults; }
}
export function saveRemotePrefs(prefs: RemotePrefs) {
    localStorage.setItem(key, JSON.stringify(prefs));
    bildir('remote-prefs');
}

type Device = { address: string; name: string; rssi: number };
type NativeRemote = {
    scan(options?: { scanId: string }): Promise<{ devices: Device[] }>;
    scanPaired(): Promise<{ devices: Device[] }>;
    discover(): Promise<{ cards: string[] }>;
    connect(options: { address: string }): Promise<{ connected: boolean }>;
    connectClassic(options: { address: string }): Promise<{ connected: boolean }>;
    sendClassic(options: { body: string; address?: string }): Promise<void>;
    disconnect(): Promise<void>;
    send(options: { command: string }): Promise<void>;
    clickAbsolute(options: { x: number; y: number }): Promise<void>;
    moveAbsolute(options: { x: number; y: number }): Promise<void>;
    request(options: { url: string; method: string; body?: string; token?: string }): Promise<{ status: number; body: string }>;
    dictate(options: { language: string }): Promise<{ text: string }>;
    startBridgeDictation(options: { language: string; seconds: number; engine?: string }): Promise<{ text: string }>;
    getDictationEngines(): Promise<{ onDevice: boolean; system: boolean }>;
    stopBridgeDictation(): Promise<void>;
    setImmersive(options: { enabled: boolean }): Promise<void>;
};
const native = registerPlugin<NativeRemote & Plugin>('RemoteBridge');
const isNative = () => Capacitor.isNativePlatform();

/** Android'de durum ve gezinme çubuklarını gizler/gösterir (editör tam ekranı). */
export async function sistemCubuklariniGizle(gizle: boolean): Promise<void> {
    if (Capacitor.getPlatform() !== 'android') return;
    try { await native.setImmersive({ enabled: gizle }); } catch { /* eski yerel sürüm */ }
}

export async function scanCards(onDevices?: (devices: Device[]) => void): Promise<Device[]> {
    if (!isNative()) throw new Error('Bluetooth tarama yalnız Android uygulamasında kullanılabilir.');
    const scanId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const found = new Map<string, Device>();
    const listener = onDevices ? await native.addListener('bleScanDevice', (event: { scanId?: string; device?: Device }) => {
        if (event.scanId !== scanId || !event.device?.address) return;
        found.set(event.device.address, event.device);
        onDevices([...found.values()]);
    }) : undefined;
    try {
        const devices = (await native.scan({ scanId })).devices;
        onDevices?.(devices);
        return devices;
    } finally {
        await listener?.remove();
    }
}
export async function scanPairedComputers(): Promise<Device[]> {
    if (!isNative()) throw new Error('Eşleşmiş Bluetooth cihazları Android uygulamasında gösterilir.');
    return (await native.scanPaired()).devices;
}
export async function connectComputerBluetooth(address: string) {
    if (!isNative()) throw new Error('Klasik Bluetooth bağlantısı Android uygulamasını gerektirir.');
    await native.connectClassic({ address });
}
export async function discoverCards(): Promise<string[]> {
    if (!isNative()) throw new Error('Yerel ağ taraması Android uygulamasında kullanılabilir; kart adresini elle girebilirsiniz.');
    return (await native.discover()).cards;
}
export async function connectCard(address: string) {
    if (!isNative()) throw new Error('Bluetooth bağlantısı Android uygulamasını gerektirir.');
    await native.connect({ address });
}
export async function disconnectCard() { if (isNative()) await native.disconnect(); }

async function request(url: string, method = 'GET', body = '', token = '') {
    if (isNative()) {
        const response = await native.request({ url, method, body, token });
        if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}: ${response.body.slice(0, 180)}`);
        return response.body;
    }
    let response: Response;
    try {
        response = await fetch(url, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'text/plain' }, body: method === 'GET' ? undefined : body });
    } catch {
        // Tarayıcı ağ hatasını "Failed to fetch" diye bırakıyor; nedeni yaz.
        throw new Error('Bilgisayara ulaşılamadı. Yardımcı program açık mı, telefon aynı Wi‑Fi ağında mı ve güvenlik duvarı izni verildi mi?');
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
}
function endpoint(base: string, path: string) {
    const ham = base.trim();
    if (!ham) throw new Error('Adres girin.');
    // Kullanıcı yalnızca "192.168.1.20:8765" yazdıysa da çalışsın: başında
    // şema yoksa http:// eklenir. Aksi hâlde "Invalid URL" gibi anlaşılmaz bir
    // hata çıkıyordu.
    const semali = ham.startsWith('http://') || ham.startsWith('https://') ? ham : 'http://' + ham;
    let url: URL;
    try {
        url = new URL(semali);
    } catch {
        throw new Error('Adres okunamadı; "http://192.168.1.20:8765" biçiminde girin.');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('HTTP(S) adresi girin.');
    return new URL(path, url.origin).toString();
}

/**
 * Yardımcı programın penceresinden panoya kopyalanan tek satırı çözer.
 *
 * Beklenen biçim: `http://192.168.1.20:8765|<erişim anahtarı>`. Kullanıcı
 * adresi ve anahtarı iki ayrı alana elle yazmak zorunda kalmasın diye.
 */
export function baglantiSatiriniCoz(satir: string): { helperUrl: string; helperToken: string } | null {
    const metin = satir.trim();
    if (!metin) return null;
    // JSON yapıştırılırsa onu da kabul et.
    if (metin.startsWith('{')) {
        try {
            const veri = JSON.parse(metin) as { url?: unknown; address?: unknown; token?: unknown; key?: unknown };
            const adres = typeof veri.url === 'string' ? veri.url : typeof veri.address === 'string' ? veri.address : '';
            const anahtar = typeof veri.token === 'string' ? veri.token : typeof veri.key === 'string' ? veri.key : '';
            if (adres && anahtar) return { helperUrl: adres.trim(), helperToken: anahtar.trim() };
        } catch {
            return null;
        }
    }
    const ayirac = metin.indexOf('|') >= 0 ? '|' : metin.includes('#') ? '#' : '';
    if (!ayirac) return null;
    const [adres, ...kalan] = metin.split(ayirac);
    const anahtar = kalan.join(ayirac).trim();
    if (!adres.trim() || !anahtar) return null;
    return { helperUrl: adres.trim(), helperToken: anahtar };
}
function cardResponse(raw: string) {
    const result = JSON.parse(raw);
    if (!result.ok) throw new Error(result.msg || result.error || 'Kart isteği reddetti.');
    return result;
}
export async function testCard(prefs: RemotePrefs) {
    const result = JSON.parse(await request(endpoint(prefs.cardUrl, '/api/status')));
    if (!result || typeof result !== 'object' || !('sd' in result || 'mode' in result || 'mod' in result)) {
        throw new Error('Bu adreste Kablosuz Bellek kartı bulunamadı.');
    }
    return result;
}
export async function testHelper(prefs: RemotePrefs) {
    if (prefs.connection === 'pc-bluetooth') { await pcInput({ action: 'ping' }, prefs); return; }
    if (!prefs.helperUrl || !prefs.helperToken) throw new Error('Yardımcı program adresi ve anahtarı gerekli.');
    const result = JSON.parse(await request(endpoint(prefs.helperUrl, '/health'), 'GET', '', prefs.helperToken));
    if (result.app !== 'not-bahcesi-clipboard') throw new Error('Bu adreste pano yardımcı programı bulunamadı.');
    try { await pcInput({ action: 'ping' }, prefs); }
    catch (error) {
        if (error instanceof Error && /HTTP 404/.test(error.message)) throw new Error('Bu yardımcı yalnız panoyu destekliyor. Güncel Not Bahçesi PC Yardımcısı’nı açın.');
        throw error;
    }
}
export async function sendCommand(command: string, prefs: RemotePrefs) {
    if (prefs.connection === 'pc-wifi' || prefs.connection === 'pc-bluetooth') {
        const [kind, value] = [command.slice(0, command.indexOf(':')), command.slice(command.indexOf(':') + 1)];
        let input: Record<string, unknown>;
        if (kind === 'mm') {
            const match = /^(-?\d+),(-?\d+)$/.exec(value);
            if (!match) throw new Error('Fare hareketi geçersiz.');
            input = { action: 'move', dx: Number(match[1]), dy: Number(match[2]) };
        } else if (kind === 'mc') input = { action: 'click', button: Number(value) };
        else if (kind === 'ms') input = { action: 'scroll', steps: Number(value) };
        else if (kind === 'k') input = { action: 'shortcut', keys: value };
        else if (kind === 't') input = { action: 'text', text: value };
        else throw new Error('Desteklenmeyen PC komutu.');
        await pcInput(input, prefs);
        return;
    }
    if (prefs.connection !== 'bluetooth') throw new Error('Fare ve makro komutları için Ayarlar’dan Bluetooth bağlantısını seçin.');
    await native.send({ command });
}
async function pcInput(input: Record<string, unknown>, prefs: RemotePrefs) {
    if (!prefs.helperToken) throw new Error('PC erişim anahtarını Ayarlar’dan girin.');
    if (prefs.connection === 'pc-bluetooth') {
        await native.sendClassic({ body: JSON.stringify({ ...input, token: prefs.helperToken }), address: prefs.helperBluetoothAddress });
        return;
    }
    if (!prefs.helperUrl) throw new Error('PC adresini Ayarlar’dan girin.');
    const result = JSON.parse(await request(endpoint(prefs.helperUrl, '/input'), 'POST', JSON.stringify(input), prefs.helperToken));
    if (!result.ok) throw new Error('Bilgisayar komutu uygulanamadı.');
}
/** Sıralı makroda adımlar arasındaki bekleme; önceki adımın etkisi (pencere değişimi vb.) otursun. */
const ADIM_ARASI_MS = 150;
/**
 * Makroyu çalıştırır. Sıralı makroda adımlar kullanıcının belirlediği sırayla
 * tek tek ve bir öncekinin bitmesi beklenerek gönderilir; bir adım hata verirse
 * kalanlar gönderilmez. `zincir` iç içe çağrılarda döngüyü yakalar.
 */
export async function runRemoteMacro(macro: RemoteMacro, prefs: RemotePrefs, zincir: string[] = []) {
    if (macro.type === 'sequence') {
        if (zincir.includes(macro.id)) throw new Error('"' + macro.name + '" makrosu kendini çağırıyor; sıralı adımları düzeltin.');
        const adimlar = macro.steps ?? [];
        if (!adimlar.length) throw new Error('"' + macro.name + '" makrosunda adım yok.');
        for (let sira = 0; sira < adimlar.length; sira++) {
            const adim = adimlar[sira];
            if (sira > 0) await new Promise(cozum => setTimeout(cozum, ADIM_ARASI_MS));
            try {
                if (adim.type === 'macro') {
                    const hedef = prefs.macros.find(m => m.id === adim.value);
                    if (!hedef) throw new Error('çağrılan makro silinmiş.');
                    await runRemoteMacro(hedef, prefs, [...zincir, macro.id]);
                } else {
                    await runRemoteMacro({ id: macro.id + '-' + sira, name: macro.name, type: adim.type, value: adim.value, click: adim.click }, prefs, [...zincir, macro.id]);
                }
            } catch (hata) {
                throw new Error((sira + 1) + '. adım: ' + (hata instanceof Error ? hata.message : 'çalıştırılamadı.'));
            }
        }
        return;
    }
    if (macro.type === 'position') {
        if (!['bluetooth', 'pc-wifi', 'pc-bluetooth'].includes(prefs.connection)) throw new Error('Konum makrosu için Bluetooth veya doğrudan PC bağlantısı gerekli.');
        const match = /^(\d{1,5})\s*,\s*(\d{1,5})$/.exec(macro.value.trim());
        if (!match) throw new Error('Konumu x,y biçiminde girin.');
        const x = Number(match[1]), y = Number(match[2]);
        // Çift tık iki ayrı tıklama olarak gönderilir: hem PC yardımcısı hem kart
        // tek tıklama sözleşmesi kullanır.
        const tekrar = macro.click === 2 ? 2 : 1;
        for (let i = 0; i < tekrar; i++) {
            if (prefs.connection === 'pc-wifi' || prefs.connection === 'pc-bluetooth') await pcInput({ action: 'absolute', x, y, click: true }, prefs);
            else await native.clickAbsolute({ x, y });
        }
    } else if (macro.type === 'shortcut') {
        if (!/^[A-Za-z0-9+_ -]{1,60}$/.test(macro.value)) throw new Error('Geçersiz klavye kısayolu.');
        await sendCommand(`k:${macro.value.trim()}`, prefs);
    } else {
        await typeOnComputer(macro.value, prefs);
    }
}
export async function previewPosition(x: number, y: number, prefs = remotePrefs()) {
    if (prefs.connection === 'pc-wifi' || prefs.connection === 'pc-bluetooth') await pcInput({ action: 'absolute', x: Math.round(x), y: Math.round(y), click: false }, prefs);
    else await native.moveAbsolute({ x: Math.round(x), y: Math.round(y) });
}
export async function typeOnComputer(text: string, prefs: RemotePrefs) {
    if (!text) throw new Error('Editör metni boş.');
    const encoder = new TextEncoder();
    const chunks: string[] = [];
    let chunk = '';
    const limit = prefs.connection === 'bluetooth' ? 120 : prefs.connection === 'pc-wifi' || prefs.connection === 'pc-bluetooth' ? 3000 : 300;
    for (const char of text) {
        if (encoder.encode(chunk + char).length > limit) { chunks.push(chunk); chunk = ''; }
        chunk += char;
    }
    if (chunk) chunks.push(chunk);
    if (prefs.connection === 'pc-wifi' || prefs.connection === 'pc-bluetooth') {
        for (const part of chunks) await pcInput({ action: 'text', text: part }, prefs);
        return;
    }
    if (prefs.connection === 'bluetooth') {
        // BLE NUS satır sınırı: uzun metni UTF-8 güvenli küçük parçalara böl.
        for (const part of chunks) await native.send({ command: `t:${part}` });
        return;
    }
    // Kartın mevcut /api/keys sözleşmesi: b64: UTF-8, USB HID üzerinden yazma.
    for (const part of chunks) {
        const block = encoder.encode(part);
        const b64 = btoa(Array.from(block, b => String.fromCharCode(b)).join(''));
        cardResponse(await request(endpoint(prefs.cardUrl, '/api/keys'), 'POST', `b64:${b64}`));
    }
}
export async function deleteOnComputer(count: number, prefs: RemotePrefs) {
    if (!Number.isSafeInteger(count) || count < 1 || count > 1000) throw new Error('Silme miktarı geçersiz.');
    if (prefs.connection === 'wifi') {
        cardResponse(await request(endpoint(prefs.cardUrl, `/api/keys?bs=${count}`), 'POST', 'b64:'));
        return;
    }
    for (let i = 0; i < count; i++) {
        if (prefs.connection === 'bluetooth') await native.send({ command: 'b' });
        else await sendCommand('k:BACKSPACE', prefs);
    }
}
/**
 * Bilgisayara yazılmış metni hedefe eşitler.
 *
 * Ortak önek korunur, fazlalık silinir, eksik kuyruk 64 karakterlik parçalarla
 * yazılır. Köprü Yaz ve Köprü Dikte aynı yolu kullanır: diktede konuşma
 * sürerken cümlenin son hâli değiştiği için yalnızca değişen kuyruk gidip gelir.
 */
export async function metinFarkiAktar(hedef: string, onceki: string, prefs: RemotePrefs, ilerleme?: (yazilan: string) => void): Promise<string> {
    const eski = Array.from(onceki);
    const yeni = Array.from(hedef);
    let ortak = 0;
    while (ortak < eski.length && ortak < yeni.length && eski[ortak] === yeni[ortak]) ortak++;
    while (eski.length > ortak) {
        const silinecek = Math.min(1000, eski.length - ortak);
        await deleteOnComputer(silinecek, prefs);
        eski.length -= silinecek;
        ilerleme?.(eski.join(''));
    }
    for (let sira = ortak; sira < yeni.length; sira += 64) {
        await typeOnComputer(yeni.slice(sira, sira + 64).join(''), prefs);
        ilerleme?.(yeni.slice(0, Math.min(sira + 64, yeni.length)).join(''));
    }
    return hedef;
}
export async function sendToComputerClipboard(text: string, prefs: RemotePrefs) {
    if (!text) throw new Error('Editör metni boş.');
    if (prefs.connection === 'pc-bluetooth') { await pcInput({ action: 'clipboard', text }, prefs); return; }
    // Kart panoya yazamaz (yalnız klavye/fare). Kart bağlıyken pano, varsa PC yardımcısına
    // Wi‑Fi ile, yoksa eşleşmiş PC'ye klasik Bluetooth ile gider.
    const kart = prefs.connection === 'wifi' || prefs.connection === 'bluetooth';
    if (kart && !prefs.helperUrl && prefs.helperToken && prefs.helperBluetoothAddress) {
        await pcInput({ action: 'clipboard', text }, { ...prefs, connection: 'pc-bluetooth' });
        return;
    }
    if (!prefs.helperUrl || !prefs.helperToken) throw new Error(kart
        ? 'Kart bilgisayar panosuna yazamaz. Pano için Ayarlar → Bilgisayar bağlantısı → "PC panosu (kartla birlikte)" bölümüne PC yardımcısının bağlantı kodunu girin.'
        : 'Ayarlar → Bilgisayar sekmesinde PC pano yardımcı programını yapılandırın.');
    const result = JSON.parse(await request(endpoint(prefs.helperUrl, '/clipboard'), 'POST', text, prefs.helperToken));
    if (!result.ok) throw new Error('Pano güncellenemedi.');
}
export async function dictate(language: string): Promise<string> {
    if (isNative()) return (await native.dictate({ language })).text;
    const BrowserRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!BrowserRecognition) throw new Error('Bu tarayıcı ses tanımayı desteklemiyor; Android uygulamasını kullanın.');
    return new Promise((resolve, reject) => {
        const recognition = new BrowserRecognition();
        recognition.lang = language; recognition.interimResults = false;
        recognition.onresult = (event: any) => resolve(event.results[0][0].transcript);
        recognition.onerror = (event: any) => reject(new Error(event.error || 'Ses tanınamadı.'));
        recognition.onnomatch = () => reject(new Error('Konuşma anlaşılamadı.'));
        recognition.start();
    });
}

export async function bridgeDictate(language: string, seconds: number, engine: RemotePrefs['dictationEngine'] = 'auto'): Promise<string> {
    if (!isNative()) throw new Error('Süreli Köprü Dikte yalnız Android uygulamasında kullanılabilir.');
    return (await native.startBridgeDictation({ language, seconds: seconds === 0 ? 0 : Math.max(5, Math.min(3600, Math.round(seconds) || 30)), engine })).text;
}

export async function dictationEngines(): Promise<{ onDevice: boolean; system: boolean }> {
    if (!isNative()) return { onDevice: false, system: false };
    try { return await native.getDictationEngines(); } catch { return { onDevice: false, system: true }; }
}

export async function stopBridgeDictation(): Promise<void> {
    if (isNative()) await native.stopBridgeDictation();
}

/**
 * Köprü Dikte olaylarını dinler.
 *
 * Her olay iki metin taşır: `text` kesinleşmiş cümlelerle konuşulmakta olan
 * parçanın birleşimi, `kesin` ise yalnızca kesinleşmiş cümleler. Arayüz tercihe
 * göre birini hedef alır. Aktarım bu olayla ilerler; dinleyici dikte
 * başlatılmadan önce kurulmalıdır ki ilk cümle kaçmasın.
 */
export type BridgeDictationEvent = { text: string; kesin: string };

export async function dinleKopruDikte(geriCagri: (olay: BridgeDictationEvent) => void): Promise<{ remove: () => Promise<void> } | null> {
    if (!isNative()) return null;
    return native.addListener('bridgeDictation', (veri: unknown) => {
        const kayit = (veri ?? {}) as { text?: unknown; kesin?: unknown };
        const tam = typeof kayit.text === 'string' ? kayit.text : '';
        geriCagri({ text: tam, kesin: typeof kayit.kesin === 'string' ? kayit.kesin : tam });
    });
}
