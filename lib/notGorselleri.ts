/**
 * Markdown kaynak görünümünde gömülü görseller.
 *
 * Nota eklenen fotoğraflar `data:image/...;base64,...` olarak saklanır. Bu
 * dizeler yüz binlerce karakter uzunluğunda olabilir; kaynak görünümünde
 * doğrudan gösterildiklerinde notun yazısı kaybolur, imleç kayar ve metin
 * düzenlenemez hâle gelir.
 *
 * Bu yüzden kaynak görünümünde her görsel `![alt](gorsel:1)` gibi kısa bir yer
 * tutucuya indirgenir. Depolama biçimi değişmez: kutudaki her değişiklik
 * kaydedilmeden önce yer tutucular gerçek verilerine geri açılır. Bir yer
 * tutucuyu silmek görseli silmek demektir; bu beklenen davranıştır.
 */

const GOMULU_GORSEL = /!\[([^\]]*)\]\((data:image\/[A-Za-z0-9+.-]+;base64,[A-Za-z0-9+/]+={0,2})\)/g;
const YER_TUTUCU = /!\[([^\]]*)\]\(gorsel:(\d+)\)/g;

/** Kaynak metindeki bir yer tutucunun gerçek içerikteki karşılığı. */
interface Aralik {
    /** Kaynak metindeki başlangıç ve uzunluk. */
    k: number; kl: number;
    /** Gerçek içerikteki başlangıç ve uzunluk. */
    i: number; il: number;
}

export interface KaynakGorunum {
    /** Kutuda gösterilen kısaltılmış Markdown. */
    metin: string;
    /** Yer tutucu sırasına göre gerçek `data:` adresleri. */
    gorseller: string[];
    araliklar: Aralik[];
}

export function gorselleriKisalt(icerik: string): KaynakGorunum {
    const araliklar: Aralik[] = [];
    const gorseller: string[] = [];
    let metin = '';
    let son = 0;
    GOMULU_GORSEL.lastIndex = 0;
    for (let eslesme = GOMULU_GORSEL.exec(icerik); eslesme; eslesme = GOMULU_GORSEL.exec(icerik)) {
        gorseller.push(eslesme[2]);
        const yerTutucu = `![${eslesme[1] || 'Not görseli'}](gorsel:${gorseller.length})`;
        metin += icerik.slice(son, eslesme.index);
        araliklar.push({ k: metin.length, kl: yerTutucu.length, i: eslesme.index, il: eslesme[0].length });
        metin += yerTutucu;
        son = eslesme.index + eslesme[0].length;
    }
    metin += icerik.slice(son);
    return { metin, gorseller, araliklar };
}

/**
 * Kutudan gelen metni gerçek içeriğe çevirir. Kullanıcı yer tutucuyu taşımış,
 * çoğaltmış ya da silmiş olabilir: eşleme numaraya göre yapılır, konuma göre
 * değil. Tanınmayan numara olduğu gibi bırakılır, böylece veri uydurulmaz.
 */
export function gorselleriAc(metin: string, gorseller: string[]): string {
    return metin.replace(YER_TUTUCU, (tam, alt: string, no: string) => {
        const kaynak = gorseller[Number(no) - 1];
        return kaynak ? `![${alt}](${kaynak})` : tam;
    });
}

/**
 * Kutudaki imleç konumunu gerçek içerikteki konuma çevirir. Yer tutucunun
 * ortasına düşen konum, görselin tamamının sonuna taşınır: seçim hiçbir zaman
 * base64 verisini ortadan bölmez.
 */
export function kaynaktanIcerige(konum: number, araliklar: Aralik[]): number {
    let fark = 0;
    for (const a of araliklar) {
        if (konum <= a.k) break;
        if (konum < a.k + a.kl) return a.i + a.il;
        fark += a.il - a.kl;
    }
    return konum + fark;
}
