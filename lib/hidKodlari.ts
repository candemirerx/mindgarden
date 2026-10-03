/**
 * Bluetooth klavye/fare (HID) raporları.
 *
 * Telefon bilgisayara Bluetooth klavye olarak bağlandığında metin, Windows'un
 * Türkçe Q düzenine göre tuş basışlarına çevrilir (kart bellenimindeki eşlemeyle
 * aynı: getTrHid + ALTGR_TR). Rapor 1: [değiştirici, 0, tuş×6], rapor 2: fare
 * [düğmeler, dx, dy, tekerlek]. Değiştirici bitleri: Ctrl 1, Shift 2, Alt 4,
 * Win 8, sağ Alt (AltGr) 0x40.
 */
export type HidRapor = number[];

const SHIFT = 0x02;
const ALTGR = 0x40;
const BOS_KLAVYE: HidRapor = [1, 0, 0, 0, 0, 0, 0, 0, 0];

type Tus = { kod: number; mod: number; olu?: boolean };

/** Türkçe Q: karakter → HID kodu (+ Shift/AltGr). Kart bellenimiyle aynı küme. */
function tusBul(k: string): Tus | null {
    const c = k.codePointAt(0) ?? 0;
    if (k >= 'a' && k <= 'z') return { kod: k === 'i' ? 0x34 : 0x04 + c - 97, mod: 0 };
    if (k >= 'A' && k <= 'Z') return { kod: k === 'I' ? 0x0c : 0x04 + c - 65, mod: SHIFT };
    if (k >= '1' && k <= '9') return { kod: 0x1e + c - 49, mod: 0 };
    const tablo: Record<string, Tus> = {
        '0': { kod: 0x27, mod: 0 }, 'ı': { kod: 0x0c, mod: 0 }, 'İ': { kod: 0x34, mod: SHIFT },
        'ç': { kod: 0x37, mod: 0 }, 'Ç': { kod: 0x37, mod: SHIFT }, 'ğ': { kod: 0x2f, mod: 0 }, 'Ğ': { kod: 0x2f, mod: SHIFT },
        'ö': { kod: 0x36, mod: 0 }, 'Ö': { kod: 0x36, mod: SHIFT }, 'ş': { kod: 0x33, mod: 0 }, 'Ş': { kod: 0x33, mod: SHIFT },
        'ü': { kod: 0x30, mod: 0 }, 'Ü': { kod: 0x30, mod: SHIFT },
        '.': { kod: 0x38, mod: 0 }, ':': { kod: 0x38, mod: SHIFT }, ',': { kod: 0x31, mod: 0 }, ';': { kod: 0x31, mod: SHIFT },
        '!': { kod: 0x1e, mod: SHIFT }, '\'': { kod: 0x1f, mod: SHIFT }, '"': { kod: 0x35, mod: 0 }, '-': { kod: 0x2e, mod: 0 },
        '_': { kod: 0x2e, mod: SHIFT }, '/': { kod: 0x24, mod: SHIFT }, '(': { kod: 0x25, mod: SHIFT }, ')': { kod: 0x26, mod: SHIFT },
        '?': { kod: 0x2d, mod: SHIFT }, '*': { kod: 0x2d, mod: 0 }, '=': { kod: 0x27, mod: SHIFT }, '+': { kod: 0x21, mod: SHIFT },
        '%': { kod: 0x22, mod: SHIFT }, '&': { kod: 0x23, mod: SHIFT }, ' ': { kod: 0x2c, mod: 0 }, '\n': { kod: 0x28, mod: 0 },
        '\t': { kod: 0x2b, mod: 0 }, '<': { kod: 0x64, mod: 0 }, '^': { kod: 0x20, mod: SHIFT, olu: true },
        '@': { kod: 0x14, mod: ALTGR }, '#': { kod: 0x20, mod: ALTGR }, '$': { kod: 0x21, mod: ALTGR }, '{': { kod: 0x24, mod: ALTGR },
        '[': { kod: 0x25, mod: ALTGR }, ']': { kod: 0x26, mod: ALTGR }, '}': { kod: 0x27, mod: ALTGR }, '\\': { kod: 0x2d, mod: ALTGR },
        '|': { kod: 0x2e, mod: ALTGR }, '>': { kod: 0x1e, mod: ALTGR }, '€': { kod: 0x08, mod: ALTGR }, '₺': { kod: 0x17, mod: ALTGR },
        '~': { kod: 0x30, mod: ALTGR, olu: true }, '`': { kod: 0x31, mod: ALTGR, olu: true }
    };
    return tablo[k] ?? null;
}

const klavye = (mod: number, kod: number): HidRapor => [1, mod, 0, kod, 0, 0, 0, 0, 0];

/** Bluetooth klavyenin yazamayacağı karakterler (tekrarsız). */
export function hidYazamadiklari(metin: string): string[] {
    return [...new Set([...metin].filter(k => k !== '\r' && !tusBul(k)))];
}

/**
 * Metni rapor dizisine çevirir. Değiştirici önce tek başına basılır (Windows
 * AltGr/Shift'i harften önce görsün), sonra tuş, sonra hepsi bırakılır.
 */
export function metinRaporlari(metin: string): HidRapor[] {
    const raporlar: HidRapor[] = [];
    for (const k of metin) {
        if (k === '\r') continue;
        const t = tusBul(k);
        if (!t) continue;
        if (t.mod) raporlar.push(klavye(t.mod, 0));
        raporlar.push(klavye(t.mod, t.kod), BOS_KLAVYE);
        if (t.olu) raporlar.push(klavye(0, 0x2c), BOS_KLAVYE); // ölü tuşun simgesi için boşluk
    }
    return raporlar;
}

/** Kısayol: değiştiriciler + tuş bas, bırak. mods/kod remoteTools.kisayolCoz ile aynı. */
export function kisayolRaporlari(mods: number, kod: number): HidRapor[] {
    if (!kod) return [klavye(mods, 0), BOS_KLAVYE];
    return [klavye(mods, 0), klavye(mods, kod), BOS_KLAVYE];
}

const sinirla = (n: number) => Math.max(-127, Math.min(127, n));

/** Göreli fare hareketi: büyük adımlar ±127'lik parçalara bölünür. */
export function fareHareketRaporlari(dx: number, dy: number): HidRapor[] {
    const raporlar: HidRapor[] = [];
    let kx = Math.trunc(dx), ky = Math.trunc(dy);
    do {
        const x = sinirla(kx), y = sinirla(ky);
        raporlar.push([2, 0, x & 0xff, y & 0xff, 0]);
        kx -= x; ky -= y;
    } while ((kx || ky) && raporlar.length < 40);
    return raporlar;
}

/** Tık: 1 sol, 2 sağ. */
export function fareTikRaporlari(dugme: number): HidRapor[] {
    const bit = dugme === 2 ? 2 : 1;
    return [[2, bit, 0, 0, 0], [2, 0, 0, 0, 0]];
}

export function fareTekerRaporlari(adim: number): HidRapor[] {
    return [[2, 0, 0, 0, sinirla(Math.trunc(adim)) & 0xff]];
}
