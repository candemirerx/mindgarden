/**
 * Metin editöründeki yerel araçlar.
 *
 * Araçlar yapay zekâ kullanmaz: cihazın kendi içinde çalışırlar ve API
 * anahtarı gerektirmezler. AI makroları gibi açılıp kapatılabilir, silinebilir;
 * kapatılan veya silinen araç editörde yer kaplamaz.
 */
export type ToolKind =
    | 'sirali-ad'
    | 'icerikten-dal'
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
export const TOOLS_VERSION = 2;
const TOOLS_VERSION_KEY = 'nb-tools-version';

/** Kayıtlı aracı geri getirmek için kullanılan varsayılan liste. */
export const DEFAULT_TOOLS: AppTool[] = [
    {
        id: 'icerikten-baslik',
        title: 'İçerikten Dal Oluştur',
        subtitle: 'Notun satırlarını alt dal yapar: her satır bir dal olur.',
        kind: 'icerikten-dal',
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
        baslik: 'Ağaç yapısı araçları',
        aciklama: 'Ağacınızı elle kurmadan hızlıca dallandırır.',
        turler: ['icerikten-dal', 'sirali-ad']
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
            'sirali-ad',
            'icerikten-dal',
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

/** Aracın notun metnini değiştirip değiştirmediği. */
export function metniDegistirir(kind: ToolKind): boolean {
    return kind !== 'sirali-ad' && kind !== 'icerikten-dal';
}

/**
 * "İçerikten Dal Oluştur" için kullanılacak satırları çıkarır.
 *
 * Boş satırlar atılır, uç boşluklar silinir; aynı satır iki kez yazılmışsa
 * tek sayılır. Çok uzun satırlar dal adına sığması için kısaltılır.
 */
export function iceriktenDallar(metin: string, uzunlukSiniri = 80): string[] {
    const gorulen = new Set<string>();
    const dallar: string[] = [];

    for (const satir of metin.split('\n')) {
        const temiz = satir.trim();
        if (!temiz) continue;

        const ad =
            temiz.length > uzunlukSiniri
                ? `${temiz.slice(0, uzunlukSiniri).trimEnd()}…`
                : temiz;
        if (gorulen.has(ad)) continue;

        gorulen.add(ad);
        dallar.push(ad);
    }
    return dallar;
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
