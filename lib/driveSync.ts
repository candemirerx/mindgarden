'use client';

/**
 * Google Drive senkronizasyonu (Supabase gerektirmeyen kolay senkron).
 *
 * - Google ile giriş: tarayıcıda GIS, APK'da @codetrix-studio/capacitor-google-auth.
 * - Yedek: kullanıcının Drive'ındaki gizli "appDataFolder" alanına JSON.
 * - Otomatik senkron: Google oturumu açıkken not değişince (5 sn hareketsizlikte)
 *   Drive'a yazılır; uygulama açılışında uzaktaki yedek cihazla birleştirilir.
 *
 * Birleştirme kuralı: notlarda "son değişiklik kazanır" (updated_at);
 * bahçelerde eksik olanlar uzaktan eklenir. Silinen kayıtlar taşınmaz (v1).
 */

import { Capacitor } from '@capacitor/core';
import { supabase, isLocalBackend } from './supabaseClient';
import type { useStore } from './store/useStore';

export const GOOGLE_CLIENT_ID =
    '745502376472-dqf1pus06s224bakb2i3sls86flgfjm5.apps.googleusercontent.com';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const PROFILE_SCOPE = 'openid email profile';
const SCOPES = `${PROFILE_SCOPE} ${DRIVE_SCOPE}`;
const BACKUP_FILE_NAME = 'notbahcesi-backup.json';
const AUTOSYNC_KEY = 'nb-drive-autosync';
const LAST_SYNC_KEY = 'nb-drive-last-sync';

export function isAutoSyncEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(AUTOSYNC_KEY) === '1';
}

export function setAutoSyncEnabled(on: boolean): void {
    localStorage.setItem(AUTOSYNC_KEY, on ? '1' : '0');
}

export function lastSyncTime(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(LAST_SYNC_KEY);
}

export function isSignedInWithGoogle(): boolean {
    if (typeof window === 'undefined') return false;
    const session = JSON.parse(localStorage.getItem('nb-local-session-v1') || 'null');
    return session?.user?.user_metadata?.provider === 'google';
}

/* ------------------------------------------------------------------ */
/* Token yönetimi                                                     */
/* ------------------------------------------------------------------ */

let cachedToken: { token: string; expiresAt: number } | null = null;
let lastAutoAttempt = 0;

declare global {
    interface Window {
        google?: any;
    }
}

function waitGoogleReady(timeoutMs = 8000): Promise<void> {
    return new Promise((resolve, reject) => {
        const started = Date.now();
        const tick = () => {
            if (window.google?.accounts?.oauth2) return resolve();
            if (Date.now() - started > timeoutMs) {
                return reject(new Error('Google oturum servisi zamanında yüklenemedi'));
            }
            setTimeout(tick, 200);
        };
        tick();
    });
}

function injectGisScriptOnce(): void {
    if (document.getElementById('gis-script')) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.id = 'gis-script';
    script.async = true;
    script.onload = () => { void waitGoogleReady(); };
    script.onerror = () => {
        // Betik yüklenemedi; yedek redirect akışı devreye girecek.
    };
    document.head.appendChild(script);
}

async function loadGisScript(): Promise<void> {
    if (window.google?.accounts?.oauth2) return;
    injectGisScriptOnce();
    await waitGoogleReady();
}

function requestTokenWeb(): Promise<string> {
    return (async () => {
        try {
            await loadGisScript();
            return await new Promise<string>((resolve, reject) => {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_CLIENT_ID,
                    scope: SCOPES,
                    callback: (resp: any) => {
                        if (resp?.access_token) {
                            resolve(resp.access_token);
                        } else {
                            reject(new Error(resp?.error_description || resp?.error || 'Google izni alınamadı'));
                        }
                    },
                    error_callback: (err: any) => {
                        reject(new Error(err?.message || 'Google penceresi kapatıldı'));
                    },
                });
                client.requestAccessToken();
            });
        } catch (e) {
            // GIS yüklenemediyse tam sayfa redirect akışına düş (tek gereksinim: JS origin ayarı).
            if (e instanceof Error && e.message.includes('zamanında')) {
                return await requestTokenRedirect();
            }
            throw e;
        }
    })();
}

/** Redirect tabanlı yedek OAuth akışı (GIS çalışmazsa). */
function requestTokenRedirect(): Promise<string> {
    return new Promise((resolve, reject) => {
        sessionStorage.setItem('nb-drive-oauth-pending', '1');
        const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: window.location.origin + window.location.pathname,
            response_type: 'token',
            scope: SCOPES,
            include_granted_scopes: 'true',
            prompt: 'consent',
        });
        window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
        reject(new Error('Google sayfasına yönlendiriliyorsun; izin verdikten sonra otomatik döneceksin.'));
    });
}

/** Redirect dönüşünde URL hash'inden token'ı yakalar. */
export function completeDriveOAuthRedirectIfPresent(): boolean {
    if (typeof window === 'undefined') return false;
    if (!sessionStorage.getItem('nb-drive-oauth-pending')) return false;
    if (!window.location.hash.includes('access_token=')) return false;

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get('access_token');
    const expiresIn = Number(hash.get('expires_in') || '3600');
    // Hash'i temizle ki yenilemelerde tekrar işlemesin.
    history.replaceState(null, '', window.location.pathname + window.location.search);
    sessionStorage.removeItem('nb-drive-oauth-pending');

    if (token) {
        cachedToken = { token, expiresAt: Date.now() + Math.max(60, expiresIn - 300) * 1000 };
        return true;
    }
    return false;
}

async function requestTokenNative(): Promise<string> {
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
    // Android'de clientId VERİLMEZ (serverClientId kullanılır); scope'lar
    // initialize ile tanımlanır çünkü plugin'in signIn'i seçenek almaz.
    try {
        await (GoogleAuth as any).initialize({ scopes: SCOPES.split(' ') });
    } catch (e) {
        // Zaten initialize edilmişse sorun değil; scopes ile tekrar denenir.
        try {
            await (GoogleAuth as any).initialize();
        } catch {
            // yoksay
        }
    }
    const res: any = await (GoogleAuth as any).signIn();
    // Plugin v3+: token `authentication.accessToken` içinde; eski sürümlerde üst seviyede.
    const token =
        res?.authentication?.accessToken ??
        res?.accessToken ??
        (typeof res?.serverAuthCode === 'string' && res.serverAuthCode.length > 0
            ? ''
            : '');
    if (!token) throw new Error('Google erişim anahtarı alınamadı');
    return token;
}

/** Google Drive + profil için erişim anahtarı alır (mümkünse önbellekten). */
export async function getDriveToken(force = false): Promise<string> {
    if (!force && cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
        return cachedToken.token;
    }
    const token = Capacitor.isNativePlatform()
        ? await requestTokenNative()
        : await requestTokenWeb();

    cachedToken = { token, expiresAt: Date.now() + 55 * 60 * 1000 };
    return token;
}

export function clearDriveToken(): void {
    cachedToken = null;
}

/* ------------------------------------------------------------------ */
/* Google girişi (Supabase'siz)                                       */
/* ------------------------------------------------------------------ */

export interface GoogleProfile {
    email: string;
    name: string | null;
    avatarUrl: string | null;
}

/** Google oturumu açar ve profili döndürür; hemen ardından yerel oturum yazılmaz. */
export async function fetchGoogleProfile(): Promise<{ token: string; profile: GoogleProfile }> {
    const token = await getDriveToken(true);
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Google profili alınamadı (' + res.status + ')');
    const data = await res.json();
    if (!data?.email) throw new Error('Google profili e-posta içermiyor');
    return {
        token,
        profile: { email: data.email, name: data.name ?? null, avatarUrl: data.picture ?? null },
    };
}

/* ------------------------------------------------------------------ */
/* Veri toplama                                                       */
/* ------------------------------------------------------------------ */

export interface BackupPayload {
    app: 'notbahcesi';
    version: 1;
    exportedAt: string;
    device: string;
    gardens: any[];
    nodes: any[];
}

async function collectLocalData(): Promise<Omit<BackupPayload, 'exportedAt' | 'device'>> {
    const [gardensRes, nodesRes] = await Promise.all([
        supabase.from('gardens').select('*'),
        supabase.from('nodes').select('*'),
    ]);
    if (gardensRes.error) throw new Error('Bahçeler okunamadı: ' + gardensRes.error.message);
    if (nodesRes.error) throw new Error('Notlar okunamadı: ' + nodesRes.error.message);
    return { app: 'notbahcesi', version: 1, gardens: gardensRes.data ?? [], nodes: nodesRes.data ?? [] };
}

/* ------------------------------------------------------------------ */
/* Drive API (appDataFolder)                                          */
/* ------------------------------------------------------------------ */

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

async function findBackupFile(token: string): Promise<string | null> {
    const url =
        `${API}/files?spaces=appDataFolder` +
        `&q=${encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false`)}` +
        `&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=1`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.error?.message || errJson?.error?.status || res.statusText;
        throw new Error(`Drive listesi alınamadı (${res.status}): ${errMsg}`);
    }
    const data = await res.json();
    return data.files?.[0]?.id ?? null;
}

async function writeBackup(token: string, payload: BackupPayload): Promise<void> {
    const fileId = await findBackupFile(token);
    const url = fileId
        ? `${UPLOAD_API}/files/${fileId}?uploadType=media&fields=id`
        : `${UPLOAD_API}/files?uploadType=multipart&fields=id`;

    let body: Blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (!fileId) {
        headers['Content-Type'] = 'multipart/related; boundary="nb"';
        body = new Blob(
            [
                '--nb\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n',
                JSON.stringify({ name: BACKUP_FILE_NAME, parents: ['appDataFolder'] }),
                '\r\n--nb\r\nContent-Type: application/json\r\n\r\n',
                JSON.stringify(payload),
                '\r\n--nb--',
            ],
            { type: 'multipart/related; boundary="nb"' }
        );
    }

    const res = await fetch(url, { method: fileId ? 'PATCH' : 'POST', headers, body });
    if (!res.ok) {
        const err = await res.text();
        throw new Error('Drive yükleme başarısız (' + res.status + '): ' + err.slice(0, 200));
    }
}

async function downloadBackup(token: string): Promise<BackupPayload | null> {
    const fileId = await findBackupFile(token);
    if (!fileId) return null;
    const res = await fetch(`${API}/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Yedek indirilemedi (' + res.status + ')');
    const data = await res.json();
    if (data?.app !== 'notbahcesi') throw new Error('Geçersiz yedek dosyası');
    return data;
}

/* ------------------------------------------------------------------ */
/* Senkron işlemleri                                                  */
/* ------------------------------------------------------------------ */

/** Yerel veriyi Drive'a yazar (manuel buton veya otomatik). */
export async function uploadBackup(token: string): Promise<{ exportedAt: string; count: number }> {
    const base = await collectLocalData();
    const payload: BackupPayload = {
        ...base,
        exportedAt: new Date().toISOString(),
        device: Capacitor.isNativePlatform() ? 'android' : 'web',
    };
    await writeBackup(token, payload);
    localStorage.setItem(LAST_SYNC_KEY, payload.exportedAt);
    return {
        exportedAt: payload.exportedAt,
        count: payload.gardens.length + payload.nodes.length,
    };
}

/** Drive'daki yedeği olduğu gibi cihaza yazar (eskiyi silmeden upsert). */
export async function restoreBackup(
    token: string,
    onProgress?: (msg: string) => void
): Promise<{ gardens: number; nodes: number }> {
    onProgress?.('Yedek indiriliyor…');
    const payload = await downloadBackup(token);
    if (!payload) throw new Error('Drive üzerinde yedek bulunamadı');
    return writePayloadToLocal(payload, onProgress);
}

async function writePayloadToLocal(
    payload: BackupPayload,
    onProgress?: (msg: string) => void
): Promise<{ gardens: number; nodes: number }> {
    merging = true;
    try {
        onProgress?.('Cihaza yazılıyor…');
        for (const garden of payload.gardens ?? []) {
            await supabase.from('gardens').upsert(garden);
        }
        for (const node of payload.nodes ?? []) {
            await supabase.from('nodes').upsert(node);
        }
        // Store'u uyar (açık sayfalar tazelesin)
        if (storeRef) {
            await storeRef.getState().fetchGardens();
        }
        return { gardens: payload.gardens?.length ?? 0, nodes: payload.nodes?.length ?? 0 };
    } finally {
        // Bir tur bekle ki store'un kendi güncellemesi debounce'u tetiklemesin
        setTimeout(() => { merging = false; }, 2000);
    }
}

/**
 * Çapraz cihaz senkronu: Drive'daki yedeği cihazla birleştirir.
 * Notlarda updated_at yeni olan kazanır; eksikler karşı taraftan gelir.
 * Sonuç hem cihaza yazılır hem Drive'a geri yüklenir.
 */
export async function mergeSync(token: string): Promise<{ gardens: number; nodes: number; merged: boolean }> {
    const remote = await downloadBackup(token);
    if (!remote) {
        // Yedek yok: yerel veriyi ilk kez yükle
        const res = await uploadBackup(token);
        return { gardens: res.count, nodes: 0, merged: false };
    }

    const local = await collectLocalData();
    merging = true;
    try {
        // Bahçeler: cihazda olmayanları uzaktan ekle
        const localGardenIds = new Set(local.gardens.map((g) => g.id));
        const missingGardens = (remote.gardens ?? []).filter((g) => g.id && !localGardenIds.has(g.id));
        for (const garden of missingGardens) {
            await supabase.from('gardens').upsert(garden);
        }

        // Notlar: son değişiklik kazanır
        const localNodes = new Map(local.nodes.map((n) => [n.id, n]));
        const remoteNodes = remote.nodes ?? [];
        const toWrite: any[] = [];
        for (const rNode of remoteNodes) {
            if (!rNode.id) continue;
            const lNode = localNodes.get(rNode.id);
            if (!lNode) {
                toWrite.push(rNode);
                continue;
            }
            const lTime = lNode.updated_at || lNode.created_at || '';
            const rTime = rNode.updated_at || rNode.created_at || '';
            if (rTime > lTime) {
                toWrite.push(rNode);
            }
        }
        for (const node of toWrite) {
            await supabase.from('nodes').upsert(node);
        }

        // Birleşik sonucu Drive'a yaz
        const merged = await collectLocalData();
        const payload: BackupPayload = {
            ...merged,
            exportedAt: new Date().toISOString(),
            device: Capacitor.isNativePlatform() ? 'android' : 'web',
        };
        await writeBackup(token, payload);
        localStorage.setItem(LAST_SYNC_KEY, payload.exportedAt);

        if (storeRef) {
            await storeRef.getState().fetchGardens();
        }
        return { gardens: missingGardens.length, nodes: toWrite.length, merged: true };
    } finally {
        setTimeout(() => { merging = false; }, 2000);
    }
}

/** Uygulama açılışında çağrılır: otomatik senkron açıksa birleştirme yapar. */
export async function syncOnStartup(): Promise<void> {
    if (!isAutoSyncEnabled() || !isSignedInWithGoogle()) return;
    const now = Date.now();
    if (now - lastAutoAttempt < 60_000) return;
    lastAutoAttempt = now;
    try {
        const token = await getDriveToken(true);
        await mergeSync(token);
    } catch {
        // Sessiz geç: çevrimdışı olabilir; sonraki açılışta tekrar denenir.
    }
}

/* ------------------------------------------------------------------ */
/* Otomatik senkron (store değişimlerini izler)                       */
/* ------------------------------------------------------------------ */

type StoreApi = typeof useStore;
let storeRef: StoreApi | null = null;
let autoSyncInitialized = false;
let merging = false;
let uploadTimer: ReturnType<typeof setTimeout> | null = null;

/** Değişiklik sonrası otomatik yedekleme gecikmesi (ms). */
const AUTOSYNC_DEBOUNCE = 5000;

/**
 * Store değişikliklerini izler; Google oturumu + otomatik senkron açıksa
 * son değişiklikten 5 sn sonra Drive'a yazar. Sayfa başına bir kez çağrılır.
 */
export function initDriveAutoSync(store: typeof useStore): void {
    if (autoSyncInitialized || typeof window === 'undefined') return;
    autoSyncInitialized = true;
    storeRef = store;

    store.subscribe((state) => {
        if (merging) return;
        if (!isAutoSyncEnabled() || !isSignedInWithGoogle()) return;
        if (state.gardens.length === 0 && state.nodes.length === 0) return;

        if (uploadTimer) clearTimeout(uploadTimer);
        uploadTimer = setTimeout(async () => {
            try {
                const token = await getDriveToken(false);
                await uploadBackup(token);
            } catch {
                // Sessiz geç: token süresi/çevrimdışı; bir sonraki değişiklikte tekrar denenir.
            }
        }, AUTOSYNC_DEBOUNCE);
    });

    // Açılışta: redirect akışından dönen token'ı yakala, sonra uzaktaki
    // yedekle birleştir (çapraz cihaz).
    if (isLocalBackend) {
        Promise.resolve().then(async () => {
            completeDriveOAuthRedirectIfPresent();
            await syncOnStartup();
        });
    }
}
