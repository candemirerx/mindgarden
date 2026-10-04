import { Capacitor, registerPlugin } from '@capacitor/core';
import type { Plugin } from '@capacitor/core';
import { bildir } from './degisim';
import { fareHareketRaporlari, fareTekerRaporlari, fareTikRaporlari, hidYazamadiklari, kisayolRaporlari, metinRaporlari } from './hidKodlari';
import type { HidRapor } from './hidKodlari';

export type RemoteMode = 'write' | 'mouse' | 'dictation' | 'shortcuts' | 'screen';
/** Dikte sonucunun gideceği yer: not metni, bilgisayar ya da ikisi birden. */
export type DikteHedefi = 'editor' | 'computer' | 'both';
export const DIKTE_HEDEFLERI: DikteHedefi[] = ['editor', 'computer', 'both'];
export const dikteHedefiGecerli = (v: unknown, yedek: DikteHedefi): DikteHedefi => DIKTE_HEDEFLERI.includes(v as DikteHedefi) ? v as DikteHedefi : yedek;
/**
 * Bilgisayara Yaz'ın biçimi: dugme (düğmeye basınca notun tamamı bir kerede)
 * ya da canli (notta yazdıkça bilgisayara yansır; eski Köprü Yaz).
 */
export type YazBicimi = 'dugme' | 'canli';
/** Hedef not metnini içeriyor mu / bilgisayarı içeriyor mu. */
export const hedefNota = (h: DikteHedefi) => h !== 'computer';
export const hedefBilgisayara = (h: DikteHedefi) => h !== 'editor';

export type ConnectionMode = 'wifi' | 'bluetooth' | 'pc-wifi' | 'pc-bluetooth';
export type RemoteToolId = 'mouse' | 'dictation' | 'bridgeDictation' | 'computerWrite' | 'clipboard' | 'shortcuts' | 'screen';
export const REMOTE_TOOL_IDS: RemoteToolId[] = ['mouse', 'dictation', 'bridgeDictation', 'computerWrite', 'clipboard', 'shortcuts', 'screen'];
/**
 * Sıralı makronun tek adımı. 'macro' adımı başka bir makroyu kimliğiyle
 * (value) çağırır; 'wait' adımı value milisaniye bekler; diğer türler tekil
 * makrolarla aynı değeri taşır.
 */
export type RemoteMacroStep = { type: 'text' | 'shortcut' | 'position' | 'macro' | 'wait'; value: string; click?: 1 | 2 };
/** Bekleme adımının sınırları (ms): 0,05 sn – 10 dk. */
export const BEKLEME_SINIRI = { min: 50, max: 600000 };
/** Bekleme süresini kısa Türkçe metne çevirir: 1500 → "1,5 sn", 120000 → "2 dk". */
export function beklemeMetni(ms: number): string {
    if (!Number.isFinite(ms)) return '?';
    if (ms >= 60000 && ms % 60000 === 0) return ms / 60000 + ' dk';
    const sn = ms / 1000;
    return (Number.isInteger(sn) ? String(sn) : sn.toLocaleString('tr-TR', { maximumFractionDigits: 2 })) + ' sn';
}
export function beklemeGecerli(deger: string): boolean {
    const ms = Number(deger);
    return /^\d+$/.test(deger) && ms >= BEKLEME_SINIRI.min && ms <= BEKLEME_SINIRI.max;
}
/**
 * Sıralı makronun düğmeye basılınca nasıl çalışacağı:
 * tek — bir kez (bilgisayar tuşu gibi); sayili — `tekrar` kez;
 * anahtar — ilk dokunuşta başlar, ikinci dokunuşa kadar döner;
 * basili — düğme basılı tutuldukça döner, bırakınca durur.
 */
export type MakroCalisma = 'tek' | 'sayili' | 'anahtar' | 'basili';
/** Sayılı çalışmada tekrar sayısı ve turlar arası bekleme (ms) sınırları. */
export const TEKRAR_SINIRI = { min: 1, max: 1000 };
export const TUR_ARASI_SINIRI = { min: 0, max: 600000 };
export type RemoteMacro = {
    id: string; name: string; type: 'text' | 'shortcut' | 'position' | 'sequence'; value: string; enabled?: boolean; click?: 1 | 2; steps?: RemoteMacroStep[];
    /** Yalnız sıralı makroda; verilmezse 'tek'. */
    calisma?: MakroCalisma;
    /** 'sayili' çalışmada kaç kez (varsayılan 3). */
    tekrar?: number;
    /** Tekrarlanan çalışmalarda iki tur arası bekleme (ms, varsayılan 0). */
    turArasi?: number;
};
/** Kısayol panosunda birlikte gösterilen makrolar. */
export type RemoteProfile = { id: string; name: string; macroIds: string[] };
/** Editörün bilgisayar şeridindeki düğme; dokunulunca bağlı profilin makrolarını açar. */
export type RemoteShortcutButton = { id: string; name: string; profileId: string };
/** Ekran düzeninde bir bölmenin içeriği; shortcuts bölmesi isteğe bağlı bir profile bağlanır. */
export type RemotePaneKind = 'mouse' | 'keys' | 'text' | 'liveKeyboard' | 'phoneKeyboard' | 'computerKeyboard' | 'shortcuts' | 'bridgeDictation' | 'empty';
export const DEFAULT_NAVIGATION_SHORTCUTS = { topLeft: 'ESC', topRight: 'BACKSPACE', center: 'ENTER', bottomLeft: 'TAB', bottomRight: 'SPACE' };
export type NavigationShortcutPosition = keyof typeof DEFAULT_NAVIGATION_SHORTCUTS;
/** weight: aynı sütundaki bölmeler arasında yükseklik payı (göreli). */
export type RemotePane = { kind: RemotePaneKind; weight?: number; profileId?: string; navigationShortcuts?: Partial<Record<NavigationShortcutPosition, string>> };

export function normalizeNavigationShortcuts(value: unknown): Record<NavigationShortcutPosition, string> {
    const shortcuts = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return Object.fromEntries(Object.entries(DEFAULT_NAVIGATION_SHORTCUTS).map(([position, fallback]) => {
        const command = shortcuts[position];
        return [position, typeof command === 'string' && command.trim() && /^[A-Za-z0-9+_ -]{1,60}$/.test(command) ? command.trim() : fallback];
    })) as Record<NavigationShortcutPosition, string>;
}
/** Ekran düzeni sınırları: sütun ve bölme sayısı, boşluk ölçüleri (px). */
export const EKRAN_SINIRLARI = { sutun: 6, bolme: 8, bosluk: 64, icBosluk: 32, pay: [5, 100] as const };
export const VARSAYILAN_BOLME_BOSLUGU = 8;
export const VARSAYILAN_IC_BOSLUK = 8;

export type RemoteScreenColumn = { weight: number; panes: RemotePane[] };
/**
 * Kullanıcının tasarladığı ekran: yan yana sütunlar, her sütunda alt alta bölmeler.
 * Genişlik ve yükseklikler göreli paydır (5–100); gerçek oran paylardan hesaplanır.
 */
export type RemoteScreenLayout = {
    id: string; name: string;
    columns: RemoteScreenColumn[];
    /** Kenarsız: bölmeler arasında çerçeve olmadan tek yüzey gibi görünür. */
    borderless?: boolean;
    /** Bölmeler arası boşluk (px). Verilmezse kutulu 8, kenarsız 0. */
    gap?: number;
    /** Bölmenin kendi iç boşluğu (px). Verilmezse 8. */
    innerPadding?: number;
};

const sinirla = (deger: unknown, alt: number, ust: number, yedek: number): number => {
    const sayi = typeof deger === 'number' && Number.isFinite(deger) ? Math.round(deger) : yedek;
    return Math.min(ust, Math.max(alt, sayi));
};
const BILINEN_BOLMELER: RemotePaneKind[] = ['mouse', 'keys', 'text', 'liveKeyboard', 'phoneKeyboard', 'computerKeyboard', 'shortcuts', 'bridgeDictation', 'empty'];
function normalizePane(raw: unknown): RemotePane {
    const pane = (raw && typeof raw === 'object' ? raw : {}) as RemotePane;
    const kind = BILINEN_BOLMELER.includes(pane.kind) ? pane.kind : 'empty';
    const sonuc: RemotePane = { ...pane, kind, weight: sinirla(pane.weight, EKRAN_SINIRLARI.pay[0], EKRAN_SINIRLARI.pay[1], 50) };
    if (kind === 'keys') sonuc.navigationShortcuts = normalizeNavigationShortcuts(pane.navigationShortcuts);
    return sonuc;
}
/**
 * Kayıtlı düzeni güvenli biçime getirir. Eski sürümün 4 bölmeli düzeni
 * (panes + split/leftSplit/rightSplit) iki sütunlu yeni modele dönüştürülür.
 */
export function normalizeScreenLayout(raw: unknown): RemoteScreenLayout {
    const duzen = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
    let columns: RemoteScreenColumn[];
    if (Array.isArray(duzen.columns)) {
        columns = duzen.columns.slice(0, EKRAN_SINIRLARI.sutun).map((sutun: any) => ({
            weight: sinirla(sutun?.weight, EKRAN_SINIRLARI.pay[0], EKRAN_SINIRLARI.pay[1], 50),
            panes: (Array.isArray(sutun?.panes) ? sutun.panes : []).slice(0, EKRAN_SINIRLARI.bolme).map(normalizePane)
        }));
    } else {
        const eski: unknown[] = Array.isArray(duzen.panes) ? duzen.panes : [];
        const oran = (deger: unknown) => sinirla(deger, 20, 80, 50);
        const bol = (ust: unknown, alt: unknown, ustOran: number): RemotePane[] =>
            [{ ...normalizePane(ust), weight: ustOran }, { ...normalizePane(alt), weight: 100 - ustOran }];
        columns = [
            { weight: oran(duzen.split), panes: bol(eski[0], eski[1], oran(duzen.leftSplit)) },
            { weight: 100 - oran(duzen.split), panes: bol(eski[2], eski[3], oran(duzen.rightSplit)) }
        ];
    }
    if (!columns.length) columns = [{ weight: 50, panes: [{ kind: 'empty', weight: 50 }] }];
    return {
        id: typeof duzen.id === 'string' && duzen.id ? duzen.id : 'ekran-' + Date.now(),
        name: typeof duzen.name === 'string' ? duzen.name : 'Ekran',
        columns,
        borderless: !!duzen.borderless,
        ...(duzen.gap !== undefined ? { gap: sinirla(duzen.gap, 0, EKRAN_SINIRLARI.bosluk, VARSAYILAN_BOLME_BOSLUGU) } : {}),
        ...(duzen.innerPadding !== undefined ? { innerPadding: sinirla(duzen.innerPadding, 0, EKRAN_SINIRLARI.icBosluk, VARSAYILAN_IC_BOSLUK) } : {})
    };
}

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
    /** Eşleştirilen bilgisayarın adı (yardımcının bildirdiği); yalnız gösterim için. */
    helperName?: string;
    mouseSensitivity: number;
    dictationLanguage: string;
    bridgeDictationSeconds: number;
    bridgeDictationUnlimited: boolean;
    /** Köprü Dikte'de tanınan söz, cümle sonu beklenmeden bilgisayara yazılır. */
    bridgeDictationLive: boolean;
    /**
     * Köprü Dikte ses tanıma motoru: auto (önce Google çevrimiçi, yoksa cihaz içi),
     * google (Gboard ile aynı çevrimiçi motor), device (yalnızca cihaz içi), system (telefonun varsayılanı).
     */
    dictationEngine: 'auto' | 'google' | 'device' | 'system' | 'cloud';
    /** dictationEngine 'cloud' iken kullanılan servis (kendi API anahtarıyla). */
    dictationCloud: 'openai' | 'gemini' | 'groq';
    appendDictation: boolean;
    dictationTarget: DikteHedefi;
    /** Köprü Dikte'nin yazacağı yer; varsayılan yalnız bilgisayar. */
    bridgeDictationTarget: DikteHedefi;
    /** Bilgisayara Yaz (eski Köprü Yaz ile birleşik): biçim ve hedef. */
    writeMode: YazBicimi;
    writeTarget: DikteHedefi;
    enabledTools: Record<RemoteToolId, boolean>;
    macros: RemoteMacro[];
    profiles: RemoteProfile[];
    shortcutButtons: RemoteShortcutButton[];
    screenLayouts: RemoteScreenLayout[];
};

const key = 'nb-remote-prefs-v1';
const defaults: RemotePrefs = {
    connection: 'wifi', cardUrl: 'http://192.168.4.1', helperUrl: '', helperToken: '', helperBluetoothAddress: '',
    mouseSensitivity: 1, dictationLanguage: 'tr-TR', bridgeDictationSeconds: 30, bridgeDictationUnlimited: false, bridgeDictationLive: true, dictationEngine: 'auto', dictationCloud: 'gemini', appendDictation: true, dictationTarget: 'editor', bridgeDictationTarget: 'computer', writeMode: 'dugme', writeTarget: 'both',
    enabledTools: { mouse: true, dictation: true, bridgeDictation: true, computerWrite: true, clipboard: true, shortcuts: true, screen: true }, macros: [], profiles: [], shortcutButtons: [], screenLayouts: []
};

/**
 * Kayıtlı araç açıklıkları. Eski sürümde ayrı olan "Köprü Yaz" (bridgeWrite) ve
 * "Bilgisayara Yaz" tek araçta birleşti: ikisinden biri açıksa birleşik araç açık.
 */
function araclariBirlestir(kayitli: unknown): RemotePrefs['enabledTools'] {
    const k = (kayitli && typeof kayitli === 'object' ? kayitli : {}) as Record<string, unknown>;
    const arac = { ...defaults.enabledTools, ...k } as Record<string, boolean>;
    if ('bridgeWrite' in k || 'computerWrite' in k) arac.computerWrite = k.computerWrite !== false || k.bridgeWrite !== false;
    delete arac.bridgeWrite;
    return arac as RemotePrefs['enabledTools'];
}
export function remotePrefs(): RemotePrefs {
    if (typeof window === 'undefined') return defaults;
    try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        return { ...defaults, ...data, dictationTarget: dikteHedefiGecerli(data.dictationTarget, defaults.dictationTarget), bridgeDictationTarget: dikteHedefiGecerli(data.bridgeDictationTarget, defaults.bridgeDictationTarget), writeMode: data.writeMode === 'canli' ? 'canli' : 'dugme', writeTarget: dikteHedefiGecerli(data.writeTarget, defaults.writeTarget), enabledTools: araclariBirlestir(data.enabledTools), macros: Array.isArray(data.macros) ? data.macros : [], profiles: Array.isArray(data.profiles) ? data.profiles : [], shortcutButtons: Array.isArray(data.shortcutButtons) ? data.shortcutButtons : [], screenLayouts: Array.isArray(data.screenLayouts) ? data.screenLayouts.map(normalizeScreenLayout) : [] };
    } catch { return defaults; }
}
export function saveRemotePrefs(prefs: RemotePrefs) {
    localStorage.setItem(key, JSON.stringify(prefs));
    bildir('remote-prefs');
}

export type Device = { address: string; name: string; rssi: number; computer?: boolean; connected?: boolean };
type NativeRemote = {
    scan(options?: { scanId: string }): Promise<{ devices: Device[] }>;
    scanPaired(): Promise<{ devices: Device[] }>;
    discover(options?: { port?: number; path?: string; marker?: string }): Promise<{ cards: string[]; bodies?: string[] }>;
    wifiAddress(): Promise<{ address: string }>;
    bleStatus(): Promise<{ connected: boolean; address: string }>;
    hidStart(): Promise<HidDurum>;
    hidConnect(options: { address: string }): Promise<HidDurum>;
    hidDisconnect(): Promise<void>;
    hidStatus(): Promise<HidDurum>;
    hidSend(options: { reports: HidRapor[]; gapMs?: number }): Promise<void>;
    hidDiscoverable(): Promise<void>;
    udpSend(options: { host: string; port: number; data: number[] }): Promise<void>;
    openBluetoothSettings(): Promise<void>;
    connect(options: { address: string }): Promise<{ connected: boolean }>;
    connectClassic(options: { address: string }): Promise<{ connected: boolean }>;
    sendClassic(options: { body: string; address?: string }): Promise<{ ok?: boolean; token?: string; name?: string; error?: string } | void>;
    disconnect(): Promise<void>;
    send(options: { command: string; fast?: boolean }): Promise<void>;
    clickAbsolute(options: { x: number; y: number }): Promise<void>;
    moveAbsolute(options: { x: number; y: number }): Promise<void>;
    request(options: { url: string; method: string; body?: string; token?: string }): Promise<{ status: number; body: string }>;
    dictate(options: { language: string }): Promise<{ text: string }>;
    startBridgeDictation(options: { language: string; seconds: number; engine?: string }): Promise<{ text: string }>;
    getDictationEngines(): Promise<{ onDevice: boolean; system: boolean; google?: boolean }>;
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
/** PC yardımcısının Wi‑Fi portu. */
export const YARDIMCI_PORTU = 8765;
export type BulunanBilgisayar = { url: string; name: string };

/** Telefonun Wi‑Fi IPv4 adresi; "" = Wi‑Fi ağına bağlı değil, null = bilinemiyor (tarayıcı). */
export async function telefonWifiAdresi(): Promise<string | null> {
    if (!isNative()) return null;
    try { return (await native.wifiAddress()).address || ''; } catch { return ''; }
}
/** Telefon kartın kendi ağında mı (kart AP'si 192.168.4.1 dağıtır)? */
export function kartAginda(adres: string): boolean {
    return adres.startsWith('192.168.4.');
}
export async function bluetoothAyarlariniAc(): Promise<void> {
    if (!isNative()) throw new Error('Bluetooth ayarları Android uygulamasında açılır.');
    await native.openBluetoothSettings();
}
/**
 * Yerel ağdaki PC yardımcılarını bulur (anahtarsız /hello ucu). Yardımcı
 * eşleştirme kodunu gösterdiği sürece listede bilgisayarın adı görünür.
 */
export async function bilgisayarlariBul(): Promise<BulunanBilgisayar[]> {
    if (!isNative()) throw new Error('Ağda bilgisayar arama Android uygulamasında çalışır; adresi elle girebilirsiniz.');
    const sonuc = await native.discover({ port: YARDIMCI_PORTU, path: '/hello', marker: 'not-bahcesi-clipboard' });
    return sonuc.cards.map((url, i) => {
        let name = 'Bilgisayar';
        try { name = String(JSON.parse(sonuc.bodies?.[i] ?? '{}').name || name); } catch { /* ad yoksa varsayılan */ }
        return { url, name };
    });
}
/** Elle yazılan adresi doğrular: bu adreste Not Bahçesi yardımcısı var mı? */
export async function bilgisayarAdresiniSina(adres: string): Promise<BulunanBilgisayar> {
    const tam = adres.includes('://') ? adres.trim() : 'http://' + adres.trim();
    const adresUrl = new URL(tam);
    const url = adresUrl.port ? adresUrl.origin : adresUrl.origin + ':' + YARDIMCI_PORTU;
    let govde: { app?: string; name?: string };
    try { govde = JSON.parse(await request(endpoint(url, '/hello'))); }
    catch { throw new Error(url + ' adresinde yardımcıya ulaşılamadı. Yardımcı açık mı, telefon ve bilgisayar aynı Wi‑Fi ağında mı, güvenlik duvarı izni verildi mi?'); }
    if (govde.app !== 'not-bahcesi-clipboard') throw new Error('Bu adreste Not Bahçesi yardımcısı yok.');
    return { url, name: govde.name || 'Bilgisayar' };
}
/** Hata gövdesindeki {"error": ...} iletisini okunur hâle getirir. */
function yardimciHatasi(hata: unknown, yedek: string): Error {
    const metin = hata instanceof Error ? hata.message : '';
    const m = /\{.*"error"\s*:\s*"([^"]+)"/.exec(metin);
    return new Error(m ? m[1] : metin || yedek);
}
/** Wi‑Fi ile eşleştirme: 6 haneli kod doğruysa yardımcı erişim anahtarını verir. */
export async function bilgisayarlaEslestirWifi(url: string, kod: string): Promise<{ helperUrl: string; helperToken: string; helperName: string }> {
    const pin = kod.replace(/\D/g, '');
    if (pin.length !== 6) throw new Error('Bilgisayardaki 6 haneli eşleştirme kodunu yazın.');
    let govde: { ok?: boolean; token?: string; name?: string; error?: string };
    try { govde = JSON.parse(await request(endpoint(url, '/pair'), 'POST', JSON.stringify({ pin }))); }
    catch (hata) { throw yardimciHatasi(hata, 'Eşleştirilemedi.'); }
    if (!govde.ok || !govde.token) throw new Error(govde.error || 'Eşleştirme kodu yanlış.');
    return { helperUrl: url, helperToken: govde.token, helperName: govde.name || 'Bilgisayar' };
}
/** Klasik Bluetooth ile eşleştirme: kod RFCOMM üzerinden yardımcıya gider. */
/**
 * Klasik Bluetooth ile bağlanma. Kod gerekmez: PC yardımcısı yalnız Windows'la
 * eşleşmiş cihazları kabul eder ve anahtarı bu güvenli bağlantı üzerinden verir.
 * (kod verilirse eski yardımcılar için kodlu eşleşme yapılır.)
 */
export async function bilgisayarlaEslestirBluetooth(address: string, kod = ''): Promise<{ helperToken: string; helperName: string }> {
    if (!isNative()) throw new Error('Bluetooth bağlantısı Android uygulamasında çalışır.');
    const pin = kod.replace(/\D/g, '');
    let yanit;
    try { yanit = await native.sendClassic({ body: JSON.stringify(pin ? { action: 'pair', pin } : { action: 'pair' }), address }); }
    catch (hata) {
        const ileti = hata instanceof Error ? hata.message : '';
        if (/bağlantısı kurulamadı|read failed|socket/i.test(ileti)) {
            throw new Error('Bilgisayara Bluetooth ile ulaşılamadı. Bilgisayarda Not Bahçesi PC Yardımcısı açık mı, Bluetooth açık mı, telefon bu bilgisayarla Windows Bluetooth ayarlarından eşleşmiş mi?');
        }
        throw yardimciHatasi(hata, 'Bluetooth ile bağlanılamadı.');
    }
    if (!yanit || !yanit.ok || !yanit.token) {
        throw new Error((yanit && yanit.error) || 'Yardımcı eski sürüm olabilir: güncel PC yardımcısını açın (ya da 6 haneli kodu girin).');
    }
    return { helperToken: yanit.token, helperName: yanit.name || 'Bilgisayar' };
}
/**
 * Kartı Wi‑Fi'da bulur: telefon kartın kendi ağındaysa (192.168.4.x) adres
 * 192.168.4.1'dir; değilse yerel ağ taranır.
 */
export async function kartiWifidaBul(): Promise<{ urls: string[]; kartAgi: boolean }> {
    const adres = await telefonWifiAdresi();
    if (adres && kartAginda(adres)) return { urls: ['http://192.168.4.1'], kartAgi: true };
    return { urls: await discoverCards(), kartAgi: false };
}

const KART_ADRESI = 'nb-ble-card';
/** Kart BLE bağlantısı açık mı? Hiçbir komut göndermez. */
export async function bleDurumu(): Promise<{ connected: boolean; address: string }> {
    if (!isNative()) return { connected: false, address: '' };
    try { return await native.bleStatus(); } catch { return { connected: false, address: '' }; }
}
/** Son bağlanılan kartın adresi (editör kopan bağlantıyı buna yeniden kurar). */
export function kayitliKartAdresi(): string {
    try { return localStorage.getItem(KART_ADRESI) || ''; } catch { return ''; }
}
export async function connectCard(address: string) {
    if (!isNative()) throw new Error('Bluetooth bağlantısı Android uygulamasını gerektirir.');
    await native.connect({ address });
    localStorage.setItem(KART_ADRESI, address);
}
export async function disconnectCard() {
    if (!isNative()) return;
    localStorage.removeItem(KART_ADRESI);
    await native.disconnect();
}

let bleSirasi: Promise<unknown> = Promise.resolve();
/**
 * Karta BLE yazar. Yazmalar sıraya alınır; aynı anda ikinci yazma yerelde
 * reddedildiği için hızlı fare hareketlerinde komutlar düşüyordu. Bağlantı
 * kopmuşsa (kart uyudu, menzil dışına çıkıldı) komut hiç gönderilmeden son kartla
 * bir kez yeniden bağlanılır ve aynı komut bir kez daha denenir.
 */
function bleYaz(yaz: () => Promise<void>): Promise<void> {
    const is = bleSirasi.then(async () => {
        try { await yaz(); }
        catch (hata) {
            const kod = (hata as { code?: string }).code;
            const adres = localStorage.getItem(KART_ADRESI);
            if (!adres || (kod !== 'BLE_NOT_CONNECTED' && kod !== 'BLE_NOT_STARTED')) throw hata;
            try { await native.connect({ address: adres }); }
            catch { throw new Error('Kartla BLE bağlantısı koptu ve yeniden kurulamadı. Kart açık ve yakında mı?'); }
            await yaz();
        }
    });
    bleSirasi = is.catch(() => undefined);
    return is;
}

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
/**
 * Karta HTTP isteği. Ağ hatasında, PC yardımcısına yönelik genel ileti yerine
 * kartla ilgili ne yapılacağını söyler (kart HTTP hata kodları olduğu gibi kalır).
 */
async function kartIstegi(prefs: RemotePrefs, yol: string, method: string, body = ''): Promise<string> {
    try {
        return await request(endpoint(prefs.cardUrl, yol), method, body);
    } catch (hata) {
        const ileti = hata instanceof Error ? hata.message : '';
        if (/^HTTP \d+/.test(ileti)) throw hata;
        throw new Error('Karta ulaşılamadı (' + prefs.cardUrl.replace(/^https?:\/\//, '') + '). Kart açık mı, telefon kartla aynı ağda mı ya da kartın kendi ağına (can bellek s3) bağlı mı? Ayarlar → Bilgisayar bağlantısı → Kart · Wi‑Fi → "Kartı bul".');
    }
}
export async function testCard(prefs: RemotePrefs) {
    const result = JSON.parse(await kartIstegi(prefs, '/api/status', 'GET'));
    if (!result || typeof result !== 'object' || !('sd' in result || 'mode' in result || 'mod' in result)) {
        throw new Error('Bu adreste Kablosuz Bellek kartı bulunamadı.');
    }
    kartUdp.set(kartHost(prefs), typeof result.udp === 'number' ? result.udp : 0);
    return result;
}

// ---- Kartın UDP fare kanalı (bellenim 2.36.0+) ----
// Kart başına UDP portu: undefined = henüz bilinmiyor, 0 = yok (eski bellenim).
const kartUdp = new Map<string, number>();
const kartUdpSoruluyor = new Set<string>();
function kartHost(prefs: RemotePrefs): string {
    try { return new URL(prefs.cardUrl.includes('://') ? prefs.cardUrl : 'http://' + prefs.cardUrl).hostname; } catch { return ''; }
}
/** Bilinen UDP portu (0 = yok). Bilinmiyorsa arka planda bir kez öğrenilir; o sırada HTTP kullanılır. */
function kartUdpPortu(prefs: RemotePrefs): number {
    const host = kartHost(prefs);
    if (!host || !isNative()) return 0;
    const port = kartUdp.get(host);
    if (port !== undefined) return port;
    if (!kartUdpSoruluyor.has(host)) {
        kartUdpSoruluyor.add(host);
        void testCard(prefs).catch(() => undefined).finally(() => kartUdpSoruluyor.delete(host));
    }
    return 0;
}
const int8 = (n: number) => Math.max(-127, Math.min(127, Math.trunc(n)));
/** UDP fare paketi: 'N','B', dx, dy, tekerlek, basılı düğmeler, tık. Büyük adım ±127'lik paketlere bölünür. */
async function kartUdpFare(prefs: RemotePrefs, port: number, dx: number, dy: number, teker = 0, tik = 0): Promise<void> {
    const host = kartHost(prefs);
    let kx = Math.trunc(dx), ky = Math.trunc(dy);
    let ilk = true;
    do {
        const x = int8(kx), y = int8(ky);
        await native.udpSend({ host, port, data: [78, 66, x & 0xff, y & 0xff, (ilk ? int8(teker) : 0) & 0xff, 0, ilk ? tik : 0] });
        kx -= x; ky -= y; ilk = false;
    } while (kx || ky);
}
export type HidDurum = { destekleniyor: boolean; kayitli: boolean; bagli: boolean; adres: string };

/**
 * Bilgisayar · Bluetooth: telefon, seçilen bilgisayara Bluetooth klavye/fare
 * olarak bağlanır (PC'de program gerekmez). Bağlıysa hiçbir şey yapmaz;
 * değilse klavyeyi başlatıp kayıtlı bilgisayara bağlanır.
 */
export async function bluetoothKlavyeBagla(adres: string): Promise<HidDurum> {
    if (!isNative()) throw new Error('Bluetooth klavye Android uygulamasında çalışır.');
    if (!adres) throw new Error('Bilgisayar seçilmedi. Ayarlar → Bilgisayar bağlantısı → Bilgisayar · Bluetooth.');
    let durum = await native.hidStatus();
    if (durum.bagli && durum.adres.toUpperCase() === adres.toUpperCase()) return durum;
    if (!durum.kayitli) durum = await native.hidStart();
    return native.hidConnect({ address: adres });
}
/** Bluetooth klavyeyi başlatır (bilgisayar onu "Cihaz ekle" ile görebilsin). */
export async function bluetoothKlavyeyiBaslat(): Promise<HidDurum> {
    if (!isNative()) throw new Error('Bluetooth klavye Android uygulamasında çalışır.');
    const durum = await native.hidStatus();
    return durum.kayitli ? durum : native.hidStart();
}
export async function bluetoothKlavyeDurumu(): Promise<HidDurum> {
    if (!isNative()) return { destekleniyor: false, kayitli: false, bagli: false, adres: '' };
    try { return await native.hidStatus(); } catch { return { destekleniyor: false, kayitli: false, bagli: false, adres: '' }; }
}
export async function telefonuGorunurYap(): Promise<void> {
    if (!isNative()) throw new Error('Android uygulamasında çalışır.');
    await native.hidDiscoverable();
}
/**
 * Raporları gönderir; bağlantı düşmüşse bir kez yeniden bağlanıp tekrarlar.
 * Klavye raporları arası 20 ms: daha kısa aralıkta Windows Bluetooth üzerinden
 * gelen basış/bırakışları birleştirip harf ya da Shift kaçırıyordu. Fare 8 ms.
 */
async function hidGonder(raporlar: HidRapor[], prefs: RemotePrefs, gapMs = 20): Promise<void> {
    if (!raporlar.length) return;
    for (let i = 0; i < raporlar.length; i += 600) {
        const parca = raporlar.slice(i, i + 600);
        try { await native.hidSend({ reports: parca, gapMs }); }
        catch (hata) {
            if ((hata as { code?: string }).code !== 'HID_NOT_CONNECTED') throw hata;
            await bluetoothKlavyeBagla(prefs.helperBluetoothAddress);
            await native.hidSend({ reports: parca, gapMs });
        }
    }
}
async function bluetoothKlavyeKomutu(command: string, prefs: RemotePrefs): Promise<void> {
    const ayrac = command.indexOf(':');
    const [kind, value] = [command.slice(0, ayrac), command.slice(ayrac + 1)];
    if (kind === 't') { await typeOnComputer(value, prefs); return; }
    if (kind === 'k') { const { mods, code } = kisayolCoz(value); await hidGonder(kisayolRaporlari(mods, code), prefs); return; }
    if (kind === 'mm') {
        const match = /^(-?\d+),(-?\d+)$/.exec(value);
        if (!match) throw new Error('Fare hareketi geçersiz.');
        await hidGonder(fareHareketRaporlari(Number(match[1]), Number(match[2])), prefs, 8);
        return;
    }
    if (kind === 'mc') { await hidGonder(fareTikRaporlari(Number(value)), prefs); return; }
    if (kind === 'ms') { await hidGonder(fareTekerRaporlari(Number(value) || 0), prefs); return; }
    if (command === 'b') { await hidGonder(kisayolRaporlari(0, 0x2a), prefs); return; }
    throw new Error('Bu komut Bluetooth klavye yolunda desteklenmiyor.');
}

export async function testHelper(prefs: RemotePrefs) {
    if (prefs.connection === 'pc-bluetooth') {
        await bluetoothKlavyeBagla(prefs.helperBluetoothAddress);
        // Zararsız rapor: sıfır fare hareketi; bağlantının rapor taşıdığını doğrular.
        await native.hidSend({ reports: [[2, 0, 0, 0, 0]], gapMs: 2 });
        return;
    }
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
    if (prefs.connection === 'pc-bluetooth') { await bluetoothKlavyeKomutu(command, prefs); return; }
    if (prefs.connection === 'pc-wifi') {
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
    if (prefs.connection === 'wifi') { await kartWifiKomutu(command, prefs); return; }
    // Fare hareketi ve tekerlek onaysız (hızlı) gider; metin ve kısayollar onaylı.
    await bleYaz(() => native.send({ command, fast: /^m[ms]:/.test(command) }));
}

/** USB HID kullanım kodları: kartın /api/rkey ucu tuşu bu kodla basar. */
function hidKodu(ad: string): number {
    const tus = ad.trim().toUpperCase();
    if (/^[A-Z]$/.test(tus)) return 0x04 + tus.charCodeAt(0) - 65;
    if (/^[1-9]$/.test(tus)) return 0x1e + Number(tus) - 1;
    if (tus === '0') return 0x27;
    const f = /^F([1-9]|1[0-2])$/.exec(tus);
    if (f) return 0x3a + Number(f[1]) - 1;
    const ozel: Record<string, number> = {
        ENTER: 0x28, ESC: 0x29, ESCAPE: 0x29, BACKSPACE: 0x2a, TAB: 0x2b, SPACE: 0x2c,
        HOME: 0x4a, DELETE: 0x4c, END: 0x4d, RIGHT: 0x4f, LEFT: 0x50, DOWN: 0x51, UP: 0x52
    };
    if (ozel[tus] === undefined) throw new Error('"' + ad + '" tuşu tanınmıyor.');
    return ozel[tus];
}
const DEGISTIRICI_BITI: Record<string, number> = { CTRL: 1, CONTROL: 1, SHIFT: 2, ALT: 4, WIN: 8, GUI: 8, META: 8 };
/** "CTRL+SHIFT+S" → { mods, code }. Yalnız değiştirici (ör. WIN) de geçerlidir. */
function kisayolCoz(kisayol: string): { mods: number; code: number } {
    let mods = 0, code = 0;
    for (const parca of kisayol.split('+').map(p => p.trim().toUpperCase()).filter(Boolean)) {
        if (DEGISTIRICI_BITI[parca]) mods |= DEGISTIRICI_BITI[parca];
        else code = hidKodu(parca);
    }
    if (!mods && !code) throw new Error('Geçersiz klavye kısayolu.');
    return { mods, code };
}
/**
 * Kartın Wi‑Fi yolu: metin /api/keys, tuş /api/rkey, fare /api/rmouse ile gider.
 * Böylece kart Wi‑Fi'da da kısayol ve fare çalışır (eskiden yalnız BLE'deydi).
 */
async function kartWifiKomutu(command: string, prefs: RemotePrefs) {
    const ayrac = command.indexOf(':');
    const [kind, value] = [command.slice(0, ayrac), command.slice(ayrac + 1)];
    const gonder = async (yol: string) => cardResponse(await kartIstegi(prefs, yol, 'POST', ''));
    if (kind === 't') { await typeOnComputer(value, prefs); return; }
    if (kind === 'k') {
        const { mods, code } = kisayolCoz(value);
        await gonder(`/api/rkey?code=${code}&mods=${mods}`);
        return;
    }
    const udp = kartUdpPortu(prefs);
    if (kind === 'mm') {
        const match = /^(-?\d+),(-?\d+)$/.exec(value);
        if (!match) throw new Error('Fare hareketi geçersiz.');
        if (udp) { await kartUdpFare(prefs, udp, Number(match[1]), Number(match[2])); return; }
        await gonder(`/api/rmouse?dx=${match[1]}&dy=${match[2]}&b=0`);
        return;
    }
    if (kind === 'mc') {
        const dugme = Number(value) === 2 ? 2 : 1;
        if (udp) { await kartUdpFare(prefs, udp, 0, 0, 0, dugme); return; }
        await gonder(`/api/rmouse?c=${dugme}&b=0`);
        return;
    }
    if (kind === 'ms') {
        const adim = Math.max(-20, Math.min(20, Number(value) || 0));
        if (udp) { await kartUdpFare(prefs, udp, 0, 0, adim); return; }
        await gonder(`/api/rmouse?w=${adim}&b=0`);
        return;
    }
    if (command === 'b') { await deleteOnComputer(1, prefs); return; }
    throw new Error('Bu komut kartın Wi‑Fi yolunda desteklenmiyor.');
}
/**
 * Fare yüzeyinin tek gönderimdeki en büyük adımı. Kart Wi‑Fi'da UDP varsa küçük
 * ve sık adımlar (akıcı); yoksa HTTP yavaş olduğu için biraz büyük ama zıplatmayan
 * bir sınır (eskiden 1500'dü; birikmiş hareket imleci sıçratıyordu).
 */
export function fareAdimSiniri(prefs: RemotePrefs): number {
    if (prefs.connection !== 'wifi') return 127;
    return kartUdpPortu(prefs) ? 127 : 400;
}
/**
 * Kart (Wi‑Fi ve BLE) metni USB klavye olarak Türkçe Q düzeniyle yazar ve bu
 * tabloda olmayan karakterleri sessizce atlar. Kart bellenimindeki getTrHid +
 * ALTGR_TR (2.35.0) ile aynı küme.
 */
const KART_KARAKTERLERI = new Set([...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZıİçÇğĞöÖşŞüÜ0123456789.:,;!\'"-_/()?*=+%& \n\t@#$€₺{}[]\\|<>~`^']);
/** Bağlantı kart ise, kartın yazamayacağı karakterleri döndürür (tekrarsız). */
export function kartinYazamadiklari(metin: string, prefs: RemotePrefs): string[] {
    if (prefs.connection === 'pc-bluetooth') return hidYazamadiklari(metin);
    if (prefs.connection !== 'wifi' && prefs.connection !== 'bluetooth') return [];
    return [...new Set([...metin].filter(k => k !== '\r' && !KART_KARAKTERLERI.has(k)))];
}
/**
 * Tek tuş / tuş birleşimi gönderir (ör. ENTER, CTRL+C). Dört bağlantıda da çalışır;
 * kartta Delete/Home/End/PgUp/PgDn için bellenim 2.35.0 gerekir.
 */
export async function sendKey(keys: string, prefs: RemotePrefs) {
    await sendCommand('k:' + keys, prefs);
}
/**
 * Ekranda mutlak konuma gitme/tıklama. Bluetooth klavye (HID) yalnız göreli
 * fare hareketi gönderebildiği için Bilgisayar · Bluetooth yolunda bu iş PC
 * yardımcısıyla yapılır; yardımcı tanıtılmamış ya da kapalıysa ne yapılacağı
 * açıkça söylenir.
 */
async function konumGonder(input: Record<string, unknown>, prefs: RemotePrefs) {
    if (prefs.connection === 'pc-bluetooth') {
        const nasil = 'Bluetooth klavye ekranın belirli bir noktasına gidemez; konum makroları için bilgisayarda PC yardımcısını açın ve Ayarlar → Bilgisayar bağlantısı → PC panosu bölümünden bir kez bağlanın (Bluetooth ile kod gerekmez).';
        if (!prefs.helperToken) throw new Error(nasil);
        try { await pcInput(input, prefs); }
        catch { throw new Error('PC yardımcısına ulaşılamadı. ' + nasil); }
        return;
    }
    await pcInput(input, prefs);
}
async function pcInput(input: Record<string, unknown>, prefs: RemotePrefs) {
    if (!prefs.helperToken) throw new Error('PC erişim anahtarını Ayarlar’dan girin.');
    if (prefs.connection === 'pc-bluetooth') {
        await native.sendClassic({ body: JSON.stringify({ ...input, token: prefs.helperToken }), address: prefs.helperBluetoothAddress });
        return;
    }
    if (!prefs.helperUrl) throw new Error('PC adresini Ayarlar’dan girin.');
    const result = JSON.parse(await yardimciIstegi(prefs, '/input', JSON.stringify(input)));
    if (!result.ok) throw new Error('Bilgisayar komutu uygulanamadı.');
}

/**
 * PC yardımcısına Wi‑Fi isteği. Bilgisayarın adresi değiştiyse (modem yeniden
 * başladı, DHCP yeni adres verdi) istek ağ hatası verir: o zaman yardımcı ağda
 * yeniden aranır, aynı anahtarı kabul eden bilgisayar bulunursa adres kaydedilir
 * ve istek bir kez tekrarlanır. Kullanıcının yeniden eşleştirmesi gerekmez.
 */
async function yardimciIstegi(prefs: RemotePrefs, yol: string, govde: string): Promise<string> {
    try {
        return await request(endpoint(prefs.helperUrl, yol), 'POST', govde, prefs.helperToken);
    } catch (hata) {
        const ileti = hata instanceof Error ? hata.message : '';
        if (/^HTTP \d+/.test(ileti) || !isNative()) throw hata;
        const yeni = await yardimciyiYenidenBul(prefs);
        if (!yeni) throw hata;
        return request(endpoint(yeni, yol), 'POST', govde, prefs.helperToken);
    }
}
let yenidenAraniyor: Promise<string | null> | null = null;
async function yardimciyiYenidenBul(prefs: RemotePrefs): Promise<string | null> {
    if (yenidenAraniyor) return yenidenAraniyor;
    yenidenAraniyor = (async () => {
        try {
            for (const pc of await bilgisayarlariBul()) {
                if (pc.url === prefs.helperUrl) continue;
                try {
                    const saglik = JSON.parse(await request(endpoint(pc.url, '/health'), 'GET', '', prefs.helperToken));
                    if (saglik.app !== 'not-bahcesi-clipboard') continue;
                    const guncel = remotePrefs();
                    saveRemotePrefs({ ...guncel, helperUrl: pc.url, helperName: pc.name || guncel.helperName });
                    prefs.helperUrl = pc.url;
                    return pc.url;
                } catch { /* başka bilgisayar ya da farklı anahtar */ }
            }
            return null;
        } finally { setTimeout(() => { yenidenAraniyor = null; }, 0); }
    })();
    return yenidenAraniyor;
}
/** Sıralı makroda adımlar arasındaki bekleme; önceki adımın etkisi (pencere değişimi vb.) otursun. */
const ADIM_ARASI_MS = 150;
/** Bekler; durdurulursa uzun beklemeyi sonuna kadar sürdürmez (en geç 50 ms'de çıkar). */
export async function durdurulabilirBekle(ms: number, durdu: () => boolean): Promise<void> {
    const bitis = Date.now() + ms;
    while (!durdu()) {
        const kalan = bitis - Date.now();
        if (kalan <= 0) return;
        await new Promise(cozum => setTimeout(cozum, Math.min(50, kalan)));
    }
}
/**
 * Makroyu çalıştırır. Sıralı makroda adımlar kullanıcının belirlediği sırayla
 * tek tek ve bir öncekinin bitmesi beklenerek gönderilir; bir adım hata verirse
 * kalanlar gönderilmez. `zincir` iç içe çağrılarda döngüyü yakalar.
 */
export async function runRemoteMacro(macro: RemoteMacro, prefs: RemotePrefs, zincir: string[] = [], durdu: () => boolean = () => false) {
    if (macro.type === 'sequence') {
        if (zincir.includes(macro.id)) throw new Error('"' + macro.name + '" makrosu kendini çağırıyor; sıralı adımları düzeltin.');
        const adimlar = macro.steps ?? [];
        if (!adimlar.length) throw new Error('"' + macro.name + '" makrosunda adım yok.');
        for (let sira = 0; sira < adimlar.length; sira++) {
            if (durdu()) return;
            const adim = adimlar[sira];
            if (adim.type === 'wait') {
                // Kullanıcının koyduğu bekleme: adımlar arasındaki kısa ara yerine geçer.
                if (!beklemeGecerli(adim.value)) throw new Error((sira + 1) + '. adım: bekleme süresi geçersiz.');
                await durdurulabilirBekle(Number(adim.value), durdu);
                continue;
            }
            if (sira > 0 && adimlar[sira - 1].type !== 'wait') await new Promise(cozum => setTimeout(cozum, ADIM_ARASI_MS));
            if (durdu()) return;
            try {
                if (adim.type === 'macro') {
                    const hedef = prefs.macros.find(m => m.id === adim.value);
                    if (!hedef) throw new Error('çağrılan makro silinmiş.');
                    await runRemoteMacro(hedef, prefs, [...zincir, macro.id], durdu);
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
            if (prefs.connection === 'pc-wifi' || prefs.connection === 'pc-bluetooth') await konumGonder({ action: 'absolute', x, y, click: true }, prefs);
            else await bleYaz(() => native.clickAbsolute({ x, y }));
        }
    } else if (macro.type === 'shortcut') {
        if (!/^[A-Za-z0-9+_ -]{1,60}$/.test(macro.value)) throw new Error('Geçersiz klavye kısayolu.');
        await sendCommand(`k:${macro.value.trim()}`, prefs);
    } else {
        await typeOnComputer(macro.value, prefs);
    }
}
export async function previewPosition(x: number, y: number, prefs = remotePrefs()) {
    if (prefs.connection === 'pc-wifi' || prefs.connection === 'pc-bluetooth') await konumGonder({ action: 'absolute', x: Math.round(x), y: Math.round(y), click: false }, prefs);
    else await bleYaz(() => native.moveAbsolute({ x: Math.round(x), y: Math.round(y) }));
}
export async function typeOnComputer(text: string, prefs: RemotePrefs) {
    if (!text) throw new Error('Editör metni boş.');
    const encoder = new TextEncoder();
    const chunks: string[] = [];
    let chunk = '';
    const limit = prefs.connection === 'bluetooth' ? 120 : prefs.connection === 'pc-wifi' || prefs.connection === 'pc-bluetooth' ? 1000 : 300; // PC yardımcısı karakter başına ~3 ms bekler; 1000 bayt telefonun 10 sn okuma süresine sığar
    for (const char of text) {
        if (encoder.encode(chunk + char).length > limit) { chunks.push(chunk); chunk = ''; }
        chunk += char;
    }
    if (chunk) chunks.push(chunk);
    if (prefs.connection === 'pc-bluetooth') { await hidGonder(metinRaporlari(text), prefs); return; }
    if (prefs.connection === 'pc-wifi') {
        for (const part of chunks) await pcInput({ action: 'text', text: part }, prefs);
        return;
    }
    if (prefs.connection === 'bluetooth') {
        // BLE NUS satır sınırı: uzun metni UTF-8 güvenli küçük parçalara böl.
        for (const part of chunks) await bleYaz(() => native.send({ command: `t:${part}` }));
        return;
    }
    // Kartın mevcut /api/keys sözleşmesi: b64: UTF-8, USB HID üzerinden yazma.
    for (const part of chunks) {
        const block = encoder.encode(part);
        const b64 = btoa(Array.from(block, b => String.fromCharCode(b)).join(''));
        cardResponse(await kartIstegi(prefs, '/api/keys', 'POST', `b64:${b64}`));
    }
}
export async function deleteOnComputer(count: number, prefs: RemotePrefs) {
    if (!Number.isSafeInteger(count) || count < 1 || count > 1000) throw new Error('Silme miktarı geçersiz.');
    if (prefs.connection === 'wifi') {
        cardResponse(await kartIstegi(prefs, `/api/keys?bs=${count}`, 'POST', 'b64:'));
        return;
    }
    for (let i = 0; i < count; i++) {
        if (prefs.connection === 'bluetooth') await bleYaz(() => native.send({ command: 'b' }));
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
    if (prefs.connection === 'pc-bluetooth') {
        // Bluetooth klavye panoya yazamaz; pano bilgisayardaki yardımcıyla yapılır:
        // Wi‑Fi eşleşmesi varsa onunla, yoksa yardımcının Bluetooth alıcısıyla.
        if (prefs.helperUrl && prefs.helperToken) {
            const result = JSON.parse(await yardimciIstegi(prefs, '/clipboard', text));
            if (!result.ok) throw new Error('Pano güncellenemedi.');
            return;
        }
        if (prefs.helperToken) { await pcInput({ action: 'clipboard', text }, prefs); return; }
        throw new Error('Bluetooth klavye yazar ama panoya erişemez. Pano için bilgisayarda Not Bahçesi PC Yardımcısı\'nı açıp Ayarlar → Bilgisayar bağlantısı → "PC panosu" bölümünden bir kez bağlanın.');
    }
    // Kart panoya yazamaz (yalnız klavye/fare). Kart bağlıyken pano PC yardımcısına gider:
    // önce Wi‑Fi (eşleşme varsa), ulaşılamazsa ya da yoksa Bluetooth (bilgisayar seçiliyse).
    const kart = prefs.connection === 'wifi' || prefs.connection === 'bluetooth';
    const bluetoothVar = !!(prefs.helperToken && prefs.helperBluetoothAddress);
    const bluetoothIle = () => pcInput({ action: 'clipboard', text }, { ...prefs, connection: 'pc-bluetooth' });
    if (!prefs.helperUrl || !prefs.helperToken) {
        if (kart && bluetoothVar) { await bluetoothIle(); return; }
        throw new Error(kart
            ? 'Kart bilgisayar panosuna yazamaz. Pano için Ayarlar → Bilgisayar bağlantısı → "PC panosu" bölümünden bilgisayara bağlanın (Bluetooth ile kod gerekmez).'
            : 'Ayarlar → Bilgisayar bağlantısı bölümünden bilgisayarı eşleştirin.');
    }
    try {
        const result = JSON.parse(await yardimciIstegi(prefs, '/clipboard', text));
        if (!result.ok) throw new Error('Pano güncellenemedi.');
    } catch (hata) {
        if (kart && bluetoothVar) { await bluetoothIle(); return; }
        throw hata;
    }
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
    if (engine === 'cloud') engine = 'auto'; // bulut motoru telefon tanıyıcısı değil; çağıran ayrıca ele alır
    if (!isNative()) throw new Error('Süreli Köprü Dikte yalnız Android uygulamasında kullanılabilir.');
    return (await native.startBridgeDictation({ language, seconds: seconds === 0 ? 0 : Math.max(5, Math.min(3600, Math.round(seconds) || 30)), engine })).text;
}

export async function dictationEngines(): Promise<{ onDevice: boolean; system: boolean; google?: boolean }> {
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
