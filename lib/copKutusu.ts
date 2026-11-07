'use client';

/**
 * Geri dönüşüm kutusu: silinen not ve alt dalları bir süre geri alınabilir.
 *
 * Not kaydı her zamanki gibi silinmiş işaretlenir (Drive eşitlemesi ve
 * yerel depo bunu "silindi" olarak görür); notun tam kopyası ise bu cihazda,
 * IndexedDB'de saklanır. Geri alınca kayıt aynı kimlikle, içeriğiyle birlikte
 * yeniden canlanır. Süresi dolan kayıtlar kendiliğinden kalıcı olarak silinir.
 */
import { useSyncExternalStore } from 'react';
import { supabase } from './supabaseClient';
import { useStore } from './store/useStore';
import { yzAgaciMi, yzAgaciniSil } from './yzAgaci';
import type { TreeNode } from './types';

export type CopKaydi = {
    /** Çöpe atılan en üst notun kimliği. */
    id: string;
    bahceId: string;
    bahceAdi: string;
    baslik: string;
    /** Notun ve tüm alt dallarının silinmeden önceki kopyası. */
    satirlar: TreeNode[];
    silinme: number;
    yzSayisi: number;
};

const SURE_ANAHTARI = 'nb-cop-sure-gun';
const OLAY = 'nb-cop';
/** Çöpe atma sonrası "Geri al" bildirimini gösterir. */
export const COP_BILDIRIM_OLAYI = 'nb-cop-bildirim';
export const COP_SURELERI = [1, 7, 15, 30, 60, 90, 0] as const;
const GUN = 86_400_000;

export function copSuresi(): number {
    if (typeof window === 'undefined') return 30;
    const v = Number(localStorage.getItem(SURE_ANAHTARI));
    return (COP_SURELERI as readonly number[]).includes(v) && localStorage.getItem(SURE_ANAHTARI) !== null ? v : 30;
}
export function copSuresiKaydet(gun: number): void {
    try { localStorage.setItem(SURE_ANAHTARI, String(gun)); } catch { /* bu oturumda geçerli */ }
    duyur();
    void copSuresiDolanlariSil();
}
export const sureEtiketi = (gun: number) => (gun === 0 ? 'Hiçbir zaman' : gun === 1 ? '1 gün' : gun % 30 === 0 ? `${gun / 30} ay` : `${gun} gün`);
/** Kaydın kalıcı silinmesine kalan gün (süre kapalıysa null). */
export function kalanGun(kayit: CopKaydi): number | null {
    const gun = copSuresi();
    if (!gun) return null;
    return Math.max(0, Math.ceil((kayit.silinme + gun * GUN - Date.now()) / GUN));
}

/* ---------------- Depo ---------------- */

function db(): Promise<IDBDatabase> {
    return new Promise((coz, reddet) => {
        const istek = indexedDB.open('nb-cop', 1);
        istek.onupgradeneeded = () => istek.result.createObjectStore('kayitlar', { keyPath: 'id' });
        istek.onsuccess = () => coz(istek.result);
        istek.onerror = () => reddet(istek.error ?? new Error('Geri dönüşüm kutusu açılamadı.'));
    });
}
async function islem<T>(kip: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
    const d = await db();
    return new Promise((coz, reddet) => {
        const t = d.transaction('kayitlar', kip);
        const istek = f(t.objectStore('kayitlar'));
        t.oncomplete = () => { coz(istek ? istek.result : undefined); d.close(); };
        t.onerror = t.onabort = () => { reddet(t.error ?? new Error('Geri dönüşüm kutusu yazılamadı.')); d.close(); };
    });
}

let sayi = 0;
const duyur = () => window.dispatchEvent(new Event(OLAY));
async function sayiyiTazele() {
    sayi = (await islem<number>('readonly', s => s.count()).catch(() => 0)) ?? 0;
    duyur();
}
const abone = (f: () => void) => { window.addEventListener(OLAY, f); return () => window.removeEventListener(OLAY, f); };
/** Kutudaki kayıt sayısı (ayar kartındaki rozet için). */
export function useCopSayisi(): number {
    return useSyncExternalStore(abone, () => sayi, () => 0);
}
if (typeof window !== 'undefined') queueMicrotask(() => { void copSuresiDolanlariSil(); });

export async function copListesi(): Promise<CopKaydi[]> {
    await copSuresiDolanlariSil();
    const hepsi = (await islem<CopKaydi[]>('readonly', s => s.getAll() as IDBRequest<CopKaydi[]>)) ?? [];
    return hepsi.sort((a, b) => b.silinme - a.silinme);
}

/** Notu ve alt dallarını çöp kutusuna taşır; kopya kaydedilemezse not silinmez. */
export async function copeTasi(nodeId: string): Promise<CopKaydi | null> {
    const { nodes, gardens, deleteNode } = useStore.getState();
    const kok = nodes.find(n => n.id === nodeId);
    if (!kok) return null;
    const ids = new Set([nodeId]);
    for (let degisti = true; degisti;) {
        degisti = false;
        for (const n of nodes) if (n.parent_id && ids.has(n.parent_id) && !ids.has(n.id)) { ids.add(n.id); degisti = true; }
    }
    const satirlar = nodes.filter(n => ids.has(n.id)).map(n => ({ ...n }));
    const kayit: CopKaydi = {
        id: nodeId, bahceId: kok.garden_id, bahceAdi: gardens.find(g => g.id === kok.garden_id)?.name || 'Bahçe',
        baslik: kok.content.split('\n')[0] || 'Başlıksız', satirlar, silinme: Date.now(),
        yzSayisi: satirlar.filter(n => yzAgaciMi(n.id)).length
    };
    await islem('readwrite', s => s.put(kayit));
    await deleteNode(nodeId);
    void sayiyiTazele();
    window.dispatchEvent(new CustomEvent(COP_BILDIRIM_OLAYI, { detail: kayit }));
    return kayit;
}

/** Kaydı aynı yerine geri koyar; üst dalı artık yoksa ağaç olarak döner. */
export async function geriAl(id: string): Promise<{ ustYok: boolean }> {
    const kayit = await islem<CopKaydi>('readonly', s => s.get(id) as IDBRequest<CopKaydi>);
    if (!kayit) throw new Error('Kayıt geri dönüşüm kutusunda bulunamadı.');
    const store = useStore.getState();
    if (!store.gardens.some(g => g.id === kayit.bahceId)) await store.fetchGardens();
    if (!useStore.getState().gardens.some(g => g.id === kayit.bahceId)) throw new Error(`"${kayit.bahceAdi}" bahçesi silinmiş; not geri alınamıyor.`);
    const kok = kayit.satirlar.find(n => n.id === kayit.id);
    let ustYok = false;
    if (kok?.parent_id) {
        const { data } = await supabase.from('nodes').select('*').eq('id', kok.parent_id);
        const ust = Array.isArray(data) ? data[0] as TreeNode | undefined : undefined;
        ustYok = !ust || !!ust.deleted_at;
    }
    const simdi = new Date().toISOString();
    // Üstten alta: önce kök canlanır, sonra dalları.
    for (const n of kayit.satirlar) {
        const { error } = await supabase.from('nodes').update({
            content: n.content, deleted_at: null, updated_at: simdi,
            parent_id: n.id === kayit.id && ustYok ? null : n.parent_id,
            is_pruned: n.is_pruned ?? false, is_expanded: n.is_expanded ?? true,
            node_type: n.node_type ?? 'auto', color: n.color ?? null,
            position_x: n.position_x, position_y: n.position_y
        }).eq('id', n.id);
        if (error) throw new Error('Not geri alınamadı: ' + error.message);
    }
    await islem('readwrite', s => s.delete(id));
    void sayiyiTazele();
    if (useStore.getState().currentGardenId === kayit.bahceId) await useStore.getState().fetchNodes(kayit.bahceId);
    return { ustYok };
}

/** Kaydı kalıcı olarak siler (not kaydı zaten silinmişti; kopya ve YZ ayarları da gider). */
export async function kaliciSil(id: string): Promise<void> {
    const kayit = await islem<CopKaydi>('readonly', s => s.get(id) as IDBRequest<CopKaydi>);
    await islem('readwrite', s => s.delete(id));
    for (const n of kayit?.satirlar ?? []) if (yzAgaciMi(n.id)) await yzAgaciniSil(n.id).catch(() => {});
    void sayiyiTazele();
}
export async function copuBosalt(): Promise<void> {
    const hepsi = (await islem<CopKaydi[]>('readonly', s => s.getAll() as IDBRequest<CopKaydi[]>)) ?? [];
    for (const k of hepsi) await kaliciSil(k.id);
}
export async function copSuresiDolanlariSil(): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    try {
        const gun = copSuresi();
        const hepsi = (await islem<CopKaydi[]>('readonly', s => s.getAll() as IDBRequest<CopKaydi[]>)) ?? [];
        if (gun) for (const k of hepsi) if (Date.now() - k.silinme > gun * GUN) await kaliciSil(k.id);
        await sayiyiTazele();
    } catch { /* depo açılamazsa kutu boş görünür */ }
}
