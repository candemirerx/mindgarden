'use client';

/**
 * Google Drive senkronizasyonu (Supabase gerektirmeyen kolay yedekleme).
 *
 * Veriler kullanıcının kendi Google Drive'ındaki gizli "appDataFolder"
 * alanına JSON olarak yazılır; başka hiçbir uygulama/kişi erişemez.
 *
 * - Native (APK): @codetrix-studio/capacitor-google-auth ile token alınır.
 * - Web: Google Identity Services (GIS) token istemcisi ile token alınır.
 */

import { Capacitor } from '@capacitor/core';
import { supabase } from './supabaseClient';

export const GOOGLE_CLIENT_ID =
    '745502376472-dqf1pus06s224bakb2i3sls86flgfjm5.apps.googleusercontent.com';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_FILE_NAME = 'notbahcesi-backup.json';

// ---------------------------------------------------------------------------
// Token yönetimi
// ---------------------------------------------------------------------------

let cachedToken: { token: string; expiresAt: number } | null = null;

declare global {
    interface Window {
        google?: any;
    }
}

function loadGisScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.google?.accounts?.oauth2) return resolve();
        const existing = document.getElementById('gis-script');
        if (existing) {
            existing.addEventListener('load', () => resolve());
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.id = 'gis-script';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Google oturum betiği yüklenemedi'));
        document.head.appendChild(script);
    });
}

async function requestTokenWeb(): Promise<string> {
    await loadGisScript();
    return new Promise((resolve, reject) => {
        try {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: DRIVE_SCOPE,
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
        } catch (e) {
            reject(e instanceof Error ? e : new Error('Google oturumu başlatılamadı'));
        }
    });
}

async function requestTokenNative(): Promise<string> {
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
    // Plugin tipi seçenek almıyor olabilir; çalışma anında desteklenir.
    const res: any = await (GoogleAuth as any).signIn({ scopes: [DRIVE_SCOPE] });
    const token = res?.accessToken;
    if (!token) throw new Error('Google erişim anahtarı alınamadı');
    return token;
}

/** Google Drive için erişim anahtarı alır (mümkünse önbellekten). */
export async function getDriveToken(force = false): Promise<string> {
    if (!force && cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
        return cachedToken.token;
    }
    const token = Capacitor.isNativePlatform()
        ? await requestTokenNative()
        : await requestTokenWeb();

    // Token süresini ölçmek için basit bir istek atıyoruz; Google 1 saat verir.
    cachedToken = { token, expiresAt: Date.now() + 55 * 60 * 1000 };
    return token;
}

export function clearDriveToken(): void {
    cachedToken = null;
}

// ---------------------------------------------------------------------------
// Yerel veriyi toplama / geri yazma
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Drive API (appDataFolder)
// ---------------------------------------------------------------------------

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

async function findBackupFile(token: string): Promise<string | null> {
    const url =
        `${API}/files?spaces=appDataFolder` +
        `&q=${encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false`)}` +
        `&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=1`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Drive listesi alınamadı (' + res.status + ')');
    const data = await res.json();
    return data.files?.[0]?.id ?? null;
}

/** Yerel veriyi Drive'a yazar (varsa üzerine günceller). */
export async function uploadBackup(token: string): Promise<{ exportedAt: string; count: number }> {
    const base = await collectLocalData();
    const payload: BackupPayload = {
        ...base,
        exportedAt: new Date().toISOString(),
        device: Capacitor.isNativePlatform() ? 'android' : 'web',
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

    const fileId = await findBackupFile(token);
    const url = fileId
        ? `${UPLOAD_API}/files/${fileId}?uploadType=media&fields=id`
        : `${UPLOAD_API}/files?uploadType=multipart&fields=id`;

    let body: FormData | Blob = blob;
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
    return {
        exportedAt: payload.exportedAt,
        count: payload.gardens.length + payload.nodes.length,
    };
}

/** Drive'daki yedeği okur. */
export async function downloadBackup(token: string): Promise<BackupPayload> {
    const fileId = await findBackupFile(token);
    if (!fileId) throw new Error('Drive üzerinde yedek bulunamadı');
    const res = await fetch(`${API}/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Yedek indirilemedi (' + res.status + ')');
    const data = await res.json();
    if (data?.app !== 'notbahcesi') throw new Error('Geçersiz yedek dosyası');
    return data;
}

/**
 * Yedeği cihaza geri yükler: mevcut kayıtların üzerine yazar, yedekte olmayan
 * aynı id'li kayıtları upsert eder.
 */
export async function restoreBackup(
    token: string,
    onProgress?: (msg: string) => void
): Promise<{ gardens: number; nodes: number }> {
    const payload = await downloadBackup(token);
    onProgress?.('Yedek okundu, cihaza yazılıyor…');

    for (const garden of payload.gardens ?? []) {
        await supabase.from('gardens').upsert(garden);
    }
    for (const node of payload.nodes ?? []) {
        await supabase.from('nodes').upsert(node);
    }

    return {
        gardens: payload.gardens?.length ?? 0,
        nodes: payload.nodes?.length ?? 0,
    };
}
