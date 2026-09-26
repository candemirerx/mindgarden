/**
 * Metin editöründeki yerel araçlar.
 *
 * Araçlar yapay zekâ kullanmaz: cihazın kendi içinde çalışırlar ve API
 * anahtarı gerektirmezler. AI makroları gibi açılıp kapatılabilir, silinebilir;
 * kapatılan veya silinen araç editörde yer kaplamaz.
 */
import { bildir } from './degisim';

export type ToolKind =
    | 'icerikten-baslik'
    | 'sirali-ad'
    | 'numaralandir'
    | 'bosluk-sadelestir';

export interface AppTool {
    id: string;
    /** Kutunun üstünde görünen ad. */
    title: string;
    /** Ne yaptığını anlatan kısa açıklama. */
    subtitle: string;
    /** Aracın yapacağı iş. */
    kind: ToolKind;
    /** Kapatılan araç metin editöründe görünmez. */
    enabled: boolean;
}

export const TOOLS_KEY = 'nb-tools';
/** Araç listesinde değişiklik olduğunda artar; eski kayıtlara yeni araçlar eklenir. */
export const TOOLS_VERSION = 3;
const TOOLS_VERSION_KEY = 'nb-tools-version';

/** Kayıtlı aracı geri getirmek için kullanılan varsayılan liste. */
export const DEFAULT_TOOLS: AppTool[] = [
    {
        id: 'icerikten-baslik',
        title: 'İçerikten Başlık',
        subtitle: 'İçerikten 1-2 kelimelik başlık üretir ve mevcut başlığı değiştirir.',
        kind: 'icerikten-baslik',
        enabled: true
    },
    {
        id: 'sirali-ad',
        title: 'Sıralı Ad',
        subtitle: 'Ad yazmadan eklenen dal, bulunduğu seviyedeki sıra numarasını ad olarak alır.',
        kind: 'sirali-ad',
        enabled: true
    },
    {
        id: 'numaralandir',
        title: 'Numaralandır',
        subtitle: 'Notun satırlarını 1, 2, 3… diye numaralandırır.',
        kind: 'numaralandir',
        enabled: true
    },
    {
        id: 'bosluk-sadelestir',
        title: 'Boşlukları Sadeleştir',
        subtitle: 'Satır sonu boşluklarını siler, üst üste boş satırları bire indirir.',
        kind: 'bosluk-sadelestir',
        enabled: true
    }
];

/** Araçların ayarlardaki grupları: sekmenin düzenli görünmesi için. */
export const TOOL_GROUPS: Array<{ baslik: string; aciklama: string; turler: ToolKind[] }> = [
    {
        baslik: 'Başlık araçları',
        aciklama: 'Nota uygun kısa başlığı elle yazmadan üretir.',
        turler: ['icerikten-baslik']
    },
    {
        baslik: 'Ağaç yapısı araçları',
        aciklama: 'Ağacınızı elle kurmadan hızlıca dallandırır.',
        turler: ['sirali-ad']
    },
    {
        baslik: 'Metin düzenleme araçları',
        aciklama: 'Notun metnini yapay zekâ olmadan düzenler.',
        turler: ['numaralandir', 'bosluk-sadelestir']
    }
];

/** Kayıtlı araçları döner; hiç kayıt yoksa varsayılanları döner. */
export function readTools(): AppTool[] {
    if (typeof window === 'undefined') return DEFAULT_TOOLS;

    const stored = localStorage.getItem(TOOLS_KEY);
    if (!stored) return DEFAULT_TOOLS;

    try {
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return DEFAULT_TOOLS;

        const gecerliTurler: ToolKind[] = [
            'icerikten-baslik',
            'sirali-ad',
            'numaralandir',
            'bosluk-sadelestir'
        ];
        const valid = parsed.filter(
            (item): item is AppTool =>
                !!item &&
                typeof item.id === 'string' &&
                typeof item.title === 'string' &&
                gecerliTurler.includes(item.kind)
        );

        let liste = valid.map((item) => ({
            ...item,
            subtitle: typeof item.subtitle === 'string' ? item.subtitle : '',
            enabled: item.enabled !== false
        }));

        // Eski sürümde kaydedilmiş liste: sonradan eklenen araçlar yoktur.
        // Bir kez varsayılanlara bakıp eksikleri ekleriz; silinen araçların
        // yeniden belirmemesi için sürüm damgası kullanılır.
        const kayitliSurum = Number(localStorage.getItem(TOOLS_VERSION_KEY) ?? '1');
        if (kayitliSurum < TOOLS_VERSION) {
            const olanlar = new Set(liste.map((item) => item.id));
            const eksikler = DEFAULT_TOOLS.filter((item) => !olanlar.has(item.id));
            if (eksikler.length > 0) {
                liste = [...liste, ...eksikler];
                localStorage.setItem(TOOLS_KEY, JSON.stringify(liste));
            }
            localStorage.setItem(TOOLS_VERSION_KEY, String(TOOLS_VERSION));
        }

        return liste;
    } catch {
        // Bozuk kayıt: varsayılanlara düşeriz.
        return DEFAULT_TOOLS;
    }
}

export function saveTools(tools: AppTool[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOOLS_KEY, JSON.stringify(tools));
    // Editör açıkken değişiklik anında görünsün.
    bildir('araclar');
}

/**
 * Metin editöründe gösterilecek araçlar.
 *
 * Kapatılan araçlar editörde yer kaplamaz.
 */
export function readEnabledTools(): AppTool[] {
    return readTools().filter((tool) => tool.enabled !== false);
}

/** Sıralı ad aracı etkin mi? Boş adla düğüm eklemeye izin verir. */
export function siraliAdEtkin(tools: AppTool[] = readEnabledTools()): boolean {
    return tools.some((tool) => tool.kind === 'sirali-ad');
}

/**
 * Yeni düğüme verilecek sıralı ad.
 *
 * Ad, düğümün kendi seviyesindeki sırasıdır: aynı ebeveynin altındaki
 * kaçıncı çocuk olduğu. Kök düğümlerde ağaçlar arasındaki sıra kullanılır.
 */
export function siraliAd(parentId: string | null, nodes: Array<{ parent_id: string | null }>): string {
    const kardesSayisi = nodes.filter((node) => node.parent_id === parentId).length;
    return String(kardesSayisi + 1);
}

/** Başlık üretirken sayılmayacak yaygın kelimeler. */
const DURAK_KELIMELER = new Set([
    'bir', 'bu', 'şu', 'o', 've', 'veya', 'ile', 'için', 'ama', 'fakat', 'lakin',
    'çok', 'daha', 'en', 'da', 'de', 'ki', 'mi', 'mı', 'mu', 'mü', 'gibi',
    'kadar', 'olarak', 'ise', 'ya', 'ne', 'her', 'tüm', 'bütün', 'var', 'yok',
    'sonra', 'önce', 'göre', 'hem', 'yani', 'çünkü', 'eğer', 'böyle', 'şöyle',
    'ancak', 'yine', 'zaten', 'oldu', 'olur', 'olan', 'olacak', 'the', 'and'
]);

/**
 * Notun içeriğinden kısa bir başlık üretir.
 *
 * En sık geçen 1-2 anlamlı kelimeyi seçer; durak kelimeleri ve iki
 * harften kısa parçaları saymaz. Nadiren içerik zorunlu kılarsa üçüncü
 * kelime de eklenebilir. Uygun kelime yoksa null döner.
 */
export function iceriktenBaslik(metin: string, enCokKelime = 2): string | null {
    const hepsi = metin.match(/[\p{L}\p{N}]+/gu) ?? [];
    const kucuk = hepsi.map((k) => k.toLocaleLowerCase('tr'));

    const frekans = new Map<string, { sayi: number; ilk: number }>();
    kucuk.forEach((kelime, sira) => {
        if (kelime.length < 3 || DURAK_KELIMELER.has(kelime)) return;
        const mevcut = frekans.get(kelime);
        if (mevcut) mevcut.sayi += 1;
        else frekans.set(kelime, { sayi: 1, ilk: sira });
    });

    if (frekans.size === 0) return null;

    const sirali = [...frekans.entries()].sort(
        (a, b) => b[1].sayi - a[1].sayi || a[1].ilk - b[1].ilk
    );
    const adet = Math.min(enCokKelime, sirali.length);

    // Kelimelerin metindeki ilk geçtiği büyük/küçük hali korunur.
    const orijinalBicim = new Map<string, string>();
    hepsi.forEach((kelime) => {
        const anahtar = kelime.toLocaleLowerCase('tr');
        if (!orijinalBicim.has(anahtar)) orijinalBicim.set(anahtar, kelime);
    });

    const baslik = sirali
        .slice(0, adet)
        .map(([anahtar]) => orijinalBicim.get(anahtar) ?? anahtar)
        .join(' ');

    return baslik.charAt(0).toLocaleUpperCase('tr') + baslik.slice(1);
}

/**
 * Yerel metin araçlarını uygular.
 *
 * Yalnızca boşluk ve satır düzeniyle oynayan araçlardır; kelimelerin
 * kendisine dokunulmaz, bu yüzden kullanıcı onayı istenmez.
 */
export function aracMetniniUygula(kind: ToolKind, metin: string): string {
    if (kind === 'numaralandir') {
        let sira = 0;
        return metin
            .split('\n')
            .map((satir) => {
                if (!satir.trim()) return satir;
                sira += 1;
                return `${sira}. ${satir}`;
            })
            .join('\n');
    }

    if (kind === 'bosluk-sadelestir') {
        return metin
            .split('\n')
            .map((satir) => satir.replace(/[ \t]+$/, ''))
            .join('\n')
            .replace(/\n{3,}/g, '\n\n');
    }

    return metin;
}
