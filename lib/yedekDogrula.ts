/**
 * Yedek dosyası doğrulama ve normalleştirme.
 *
 * İçe aktarma akışı, herhangi bir şey yazmadan ÖNCE dosyayı buradan geçirir:
 * bozuk, tutarsız veya dairesel bağlı bir yedek reddedilir ve kullanıcının
 * mevcut notları olduğu gibi kalır. Doğrulama saf fonksiyondur (yan etkisi ve
 * ağ erişimi yoktur), bu yüzden `docs/reviews/probes-c.cjs` içinden doğrudan
 * test edilebilir.
 */

/** Dosya boyutu üst sınırı (bayt). */
export const YEDEK_EN_BUYUK_BAYT = 16 * 1024 * 1024;
/** Tek içe aktarmada kabul edilen en fazla bahçe sayısı. */
export const YEDEK_EN_COK_BAHCE = 500;
/** Tek içe aktarmada kabul edilen en fazla not sayısı. */
export const YEDEK_EN_COK_DUGUM = 20000;
/** İzin verilen en büyük üst-not zinciri uzunluğu. */
export const YEDEK_EN_COK_DERINLIK = 500;

export type YedekBahce = {
    id: string;
    name: string;
    view_state?: unknown;
};

export type YedekDugum = {
    id: string;
    garden_id: string;
    parent_id: string | null;
    content: string;
    position_x: number;
    position_y: number;
    is_expanded: boolean;
    node_type: string;
    color: string | null;
    is_pruned: boolean;
};

export type YedekDogrulama =
    | { ok: true; bahceler: YedekBahce[]; dugumler: YedekDugum[]; uyarilar: string[] }
    | { ok: false; hata: string };

const NOT_TIPLERI = new Set(['auto', 'branch', 'leaf']);

const metin = (deger: unknown): string | null => (typeof deger === 'string' ? deger : null);

/** Metne çevrilebilen değerleri korur; null/undefined boş metne düşer. */
const icerikMetni = (deger: unknown): string => {
    if (typeof deger === 'string') return deger;
    if (typeof deger === 'number' || typeof deger === 'boolean') return String(deger);
    return '';
};

const sayi = (deger: unknown, varsayilan: number): number =>
    typeof deger === 'number' && Number.isFinite(deger) ? deger : varsayilan;

const mantik = (deger: unknown, varsayilan: boolean): boolean =>
    typeof deger === 'boolean' ? deger : varsayilan;

/** Renk alanı yalnızca anlamlı bir renk metniyse korunur. */
const renk = (deger: unknown): string | null => {
    if (typeof deger !== 'string') return null;
    const temiz = deger.trim();
    if (!temiz) return null;
    if (/^#[0-9a-fA-F]{3,8}$/.test(temiz)) return temiz;
    if (/^[a-zA-Z]{3,20}$/.test(temiz)) return temiz;
    return null;
};

/**
 * Yedeği doğrular ve alanları güvenli biçimde normalleştirir.
 *
 * Hata durumunda çağıran taraf dosyayı içe aktarmaz; `uyarilar` yalnızca
 * kullanıcıya gösterilecek bilgilendirme metinleridir (aktarımı engellemez).
 */
export function yedegiDogrula(ham: unknown): YedekDogrulama {
    if (typeof ham !== 'object' || ham === null || Array.isArray(ham)) {
        return { ok: false, hata: 'Dosya bir yedek nesnesi içermiyor (JSON kökü nesne olmalı).' };
    }

    const veri = ham as Record<string, unknown>;
    if (!Array.isArray(veri.gardens) || !Array.isArray(veri.nodes)) {
        return { ok: false, hata: 'Yedek dosyasında "gardens" ve "nodes" listeleri bulunmalı.' };
    }
    if (veri.gardens.length === 0) {
        return { ok: false, hata: 'Yedek dosyasında hiç bahçe yok.' };
    }
    if (veri.gardens.length > YEDEK_EN_COK_BAHCE) {
        return {
            ok: false,
            hata: `Yedekte ${veri.gardens.length} bahçe var; tek seferde en fazla ${YEDEK_EN_COK_BAHCE} bahçe içe aktarılabilir.`,
        };
    }
    if (veri.nodes.length > YEDEK_EN_COK_DUGUM) {
        return {
            ok: false,
            hata: `Yedekte ${veri.nodes.length} not var; tek seferde en fazla ${YEDEK_EN_COK_DUGUM} not içe aktarılabilir.`,
        };
    }

    const uyarilar: string[] = [];

    /* --- Bahçeler ---------------------------------------------------- */
    const bahceler: YedekBahce[] = [];
    const bahceIdleri = new Set<string>();
    for (let sira = 0; sira < veri.gardens.length; sira += 1) {
        const kayit = veri.gardens[sira];
        if (typeof kayit !== 'object' || kayit === null || Array.isArray(kayit)) {
            return { ok: false, hata: `${sira + 1}. bahçe geçersiz bir kayıt.` };
        }
        const alanlar = kayit as Record<string, unknown>;
        const id = metin(alanlar.id)?.trim();
        if (!id) {
            return { ok: false, hata: `${sira + 1}. bahçenin kimliği (id) yok.` };
        }
        if (bahceIdleri.has(id)) {
            return { ok: false, hata: `Bahçe kimliği yedek içinde yineleniyor: ${id}` };
        }
        bahceIdleri.add(id);

        const ad = metin(alanlar.name);
        if (ad === null) {
            uyarilar.push(`${id} kimliğine sahip bahçenin adı okunamadı; "Adsız bahçe" olarak aktarılacak.`);
        }
        bahceler.push({ id, name: ad ?? 'Adsız bahçe', view_state: alanlar.view_state });
    }

    /* --- Notlar ------------------------------------------------------ */
    const hamDugumler = new Map<string, Record<string, unknown>>();
    for (let sira = 0; sira < veri.nodes.length; sira += 1) {
        const kayit = veri.nodes[sira];
        if (typeof kayit !== 'object' || kayit === null || Array.isArray(kayit)) {
            return { ok: false, hata: `${sira + 1}. not geçersiz bir kayıt.` };
        }
        const alanlar = kayit as Record<string, unknown>;
        const id = metin(alanlar.id)?.trim();
        if (!id) {
            return { ok: false, hata: `${sira + 1}. notun kimliği (id) yok.` };
        }
        if (hamDugumler.has(id)) {
            return { ok: false, hata: `Not kimliği yedek içinde yineleniyor: ${id}` };
        }
        hamDugumler.set(id, alanlar);
    }

    for (const [id, alanlar] of hamDugumler) {
        const gardenId = metin(alanlar.garden_id)?.trim() ?? '';
        if (!bahceIdleri.has(gardenId)) {
            return {
                ok: false,
                hata: `"${id}" notu yedekte bulunmayan bir bahçeye bağlı (${gardenId || 'bahçe bilgisi yok'}).`,
            };
        }

        const parentIdHam = metin(alanlar.parent_id)?.trim() ?? null;
        const parentId = parentIdHam === '' ? null : parentIdHam;
        if (parentId !== null) {
            if (parentId === id) {
                return { ok: false, hata: `"${id}" notu kendi üst notu olarak işaretlenmiş.` };
            }
            const ebeveyn = hamDugumler.get(parentId);
            if (!ebeveyn) {
                return { ok: false, hata: `"${id}" notunun üst notu yedekte yok (${parentId}).` };
            }
            if ((metin(ebeveyn.garden_id)?.trim() ?? '') !== gardenId) {
                return {
                    ok: false,
                    hata: `"${id}" notu ile üst notu farklı bahçelerde; yedek tutarsız.`,
                };
            }
        }
    }

    const dugumler: YedekDugum[] = [];
    for (const [id, alanlar] of hamDugumler) {
        const parentIdHam = metin(alanlar.parent_id)?.trim() ?? null;
        const icerik = icerikMetni(alanlar.content);
        if (alanlar.content !== undefined && typeof alanlar.content !== 'string') {
            uyarilar.push(`"${id}" notunun metni metin biçiminde değildi; okunabilir hâle getirildi.`);
        }
        const tip = metin(alanlar.node_type) ?? 'auto';
        if (alanlar.node_type !== undefined && !NOT_TIPLERI.has(tip)) {
            uyarilar.push(`"${id}" notunun tipi tanınmadı; otomatik olarak ayarlandı.`);
        }
        dugumler.push({
            id,
            garden_id: metin(alanlar.garden_id)?.trim() ?? '',
            parent_id: parentIdHam === '' ? null : parentIdHam,
            content: icerik,
            position_x: sayi(alanlar.position_x, 0),
            position_y: sayi(alanlar.position_y, 0),
            is_expanded: mantik(alanlar.is_expanded, true),
            node_type: NOT_TIPLERI.has(tip) ? tip : 'auto',
            color: renk(alanlar.color),
            is_pruned: mantik(alanlar.is_pruned, false),
        });
    }

    const dongu = donguAra(dugumler);
    if (dongu) return { ok: false, hata: dongu };

    // Derinlik sınırı: çok uzun üst-not zincirleri arayüzü ve yazma sırasını
    // kilitleyebilir. Seviyeler yinelemesiz hesaplandığı için yığın taşmaz.
    for (const seviye of dugumSeviyeleri(dugumler).values()) {
        if (seviye > YEDEK_EN_COK_DERINLIK) {
            return {
                ok: false,
                hata: `Not zinciri çok derin (${YEDEK_EN_COK_DERINLIK} üst nottan fazla).`,
            };
        }
    }

    return { ok: true, bahceler, dugumler, uyarilar };
}

/**
 * Üst-not zincirlerindeki döngüleri yinelemesiz (yığını taşırmadan) bulur.
 * Döngü varsa Türkçe hata metni, yoksa `null` döner.
 */
export function donguAra(dugumler: YedekDugum[]): string | null {
    const ebeveyn = new Map<string, string | null>();
    for (const dugum of dugumler) ebeveyn.set(dugum.id, dugum.parent_id);

    const durum = new Map<string, 'yolda' | 'bitti'>();
    for (const dugum of dugumler) {
        if (durum.has(dugum.id)) continue;
        const yol: string[] = [];
        let mevcut: string | null = dugum.id;
        while (mevcut !== null) {
            const hal = durum.get(mevcut);
            if (hal === 'bitti') break;
            if (hal === 'yolda') {
                return `Notlar birbirine dairesel bağlı (döngü): ${mevcut}. Yedek düzeltilmeden içe aktarılamaz.`;
            }
            durum.set(mevcut, 'yolda');
            yol.push(mevcut);
            if (yol.length > YEDEK_EN_COK_DERINLIK) {
                return `Not zinciri çok derin (${YEDEK_EN_COK_DERINLIK} üst nottan fazla).`;
            }
            mevcut = ebeveyn.get(mevcut) ?? null;
        }
        for (const id of yol) durum.set(id, 'bitti');
    }
    return null;
}

/**
 * Her notun kökten uzaklığını hesaplar. Yazma sırası bu seviyeye göre
 * belirlenir: üst not, alt notlarından önce eklenmelidir. Yinelemesiz çalışır.
 */
export function dugumSeviyeleri(dugumler: YedekDugum[]): Map<string, number> {
    const ebeveyn = new Map<string, string | null>();
    for (const dugum of dugumler) ebeveyn.set(dugum.id, dugum.parent_id);

    const seviye = new Map<string, number>();
    for (const dugum of dugumler) {
        if (seviye.has(dugum.id)) continue;
        const yol: string[] = [];
        let mevcut: string | null = dugum.id;
        while (mevcut !== null && !seviye.has(mevcut)) {
            yol.push(mevcut);
            mevcut = ebeveyn.get(mevcut) ?? null;
        }
        // Zincirin tepesindeki bilinen seviyeden aşağı doğru artırılır.
        let sonuc = mevcut === null ? 0 : (seviye.get(mevcut) ?? 0) + 1;
        for (let i = yol.length - 1; i >= 0; i -= 1) {
            seviye.set(yol[i], sonuc);
            sonuc += 1;
        }
    }
    return seviye;
}
