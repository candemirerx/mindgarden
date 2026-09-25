/**
 * Metin editöründeki yerel araçlar.
 *
 * Araçlar yapay zekâ kullanmaz: cihazın kendi içinde çalışırlar ve API
 * anahtarı gerektirmezler. AI makroları gibi açılıp kapatılabilir, silinebilir;
 * kapatılan veya silinen araç editörde yer kaplamaz.
 */
export type ToolKind = 'sirali-ad' | 'numaralandir' | 'bosluk-sadelestir';

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

/** Silinen aracı geri getirmek için kullanılan varsayılan liste. */
export const DEFAULT_TOOLS: AppTool[] = [
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

/** Kayıtlı araçları döner; hiç kayıt yoksa varsayılanları döner. */
export function readTools(): AppTool[] {
    if (typeof window === 'undefined') return DEFAULT_TOOLS;

    const stored = localStorage.getItem(TOOLS_KEY);
    if (!stored) return DEFAULT_TOOLS;

    try {
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return DEFAULT_TOOLS;

        const gecerliTurler: ToolKind[] = ['sirali-ad', 'numaralandir', 'bosluk-sadelestir'];
        const valid = parsed.filter(
            (item): item is AppTool =>
                !!item &&
                typeof item.id === 'string' &&
                typeof item.title === 'string' &&
                gecerliTurler.includes(item.kind)
        );

        return valid.map((item) => ({
            ...item,
            subtitle: typeof item.subtitle === 'string' ? item.subtitle : '',
            enabled: item.enabled !== false
        }));
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
    return kind !== 'sirali-ad';
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
