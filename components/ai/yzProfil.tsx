'use client';

/**
 * YZ ağacının profili: simge ve renk.
 *
 * Simge seçilmemişse notun yerine göre gelir (kökte ağaç, dalda dal, daha
 * derinde yaprak); köşedeki küçük kıvılcım onun bir yapay zekâ olduğunu
 * gösterir. Renk, --yz-* değişkenlerini değiştirerek kartı, sohbeti ve
 * ayarları aynı tonla boyar.
 */
import type { CSSProperties } from 'react';
import {
    BookOpen, Brain, Briefcase, Code2, Flower2, GitBranch, GraduationCap, HeartPulse, Leaf, Lightbulb, Palette,
    Scale, Sparkles, Sprout, TreeDeciduous, TreePine, Trees, type LucideIcon
} from 'lucide-react';
import type { YzAyar, YzRenk } from '@/lib/yzAgaci';

export const SIMGELER: { id: string; ad: string; Ikon: LucideIcon }[] = [
    { id: 'agac', ad: 'Ağaç', Ikon: TreePine },
    { id: 'yaprakli', ad: 'Çınar', Ikon: TreeDeciduous },
    { id: 'orman', ad: 'Orman', Ikon: Trees },
    { id: 'dal', ad: 'Dal', Ikon: GitBranch },
    { id: 'yaprak', ad: 'Yaprak', Ikon: Leaf },
    { id: 'fidan', ad: 'Fidan', Ikon: Sprout },
    { id: 'cicek', ad: 'Çiçek', Ikon: Flower2 },
    { id: 'kivilcim', ad: 'Kıvılcım', Ikon: Sparkles },
    { id: 'kitap', ad: 'Kitap', Ikon: BookOpen },
    { id: 'beyin', ad: 'Zihin', Ikon: Brain },
    { id: 'kep', ad: 'Eğitim', Ikon: GraduationCap },
    { id: 'terazi', ad: 'Hukuk', Ikon: Scale },
    { id: 'saglik', ad: 'Sağlık', Ikon: HeartPulse },
    { id: 'canta', ad: 'İş', Ikon: Briefcase },
    { id: 'ampul', ad: 'Fikir', Ikon: Lightbulb },
    { id: 'palet', ad: 'Sanat', Ikon: Palette },
    { id: 'kod', ad: 'Yazılım', Ikon: Code2 }
];

export const RENKLER: { id: YzRenk; ad: string }[] = [
    { id: 'gece', ad: 'Alacakaranlık' }, { id: 'orman', ad: 'Orman' }, { id: 'ceviz', ad: 'Ceviz' }, { id: 'toprak', ad: 'Toprak' }
];

/** Seçilen rengin --yz-* değişkenleri; altındaki her şey bu tonla boyanır. */
export function yzTema(renk?: YzRenk): CSSProperties | undefined {
    if (!renk) return undefined;
    const v = (ad: string) => `var(--yzp-${renk}-${ad})`;
    return { '--yz-1': v('1'), '--yz-2': v('2'), '--yz-3': v('3'), '--yz-acik': v('acik'), '--yz-koyu': v('koyu'), '--yz-soluk': v('soluk') } as CSSProperties;
}

/** Simge kimliği; seçilmemişse seviyeye göre ağaç, dal ya da yaprak. */
export function yzIkon(simge: string | undefined, derinlik: number): LucideIcon {
    const secili = simge && SIMGELER.find(s => s.id === simge);
    if (secili) return secili.Ikon;
    return derinlik <= 0 ? TreePine : derinlik === 1 ? GitBranch : Leaf;
}

/** Notun derinliği (kök 0); YZ simgesinin varsayılanı için. */
export function dugumDerinligi(id: string, nodes: { id: string; parent_id: string | null }[]): number {
    let d = 0;
    let n = nodes.find(x => x.id === id);
    while (n?.parent_id && d < 50) { d++; const ust = n.parent_id; n = nodes.find(x => x.id === ust); }
    return d;
}

/** YZ ağacının rozeti: renkli zemin, seçili simge, köşede kıvılcım. */
export function YzRozet({ boyut = 40, className = '', ayar, derinlik = 0 }: { boyut?: number; className?: string; ayar?: Pick<YzAyar, 'simge' | 'renk'> | null; derinlik?: number }) {
    const Ikon = yzIkon(ayar?.simge, derinlik);
    const kivilcim = Ikon !== Sparkles;
    return <span aria-hidden="true" style={{ ...yzTema(ayar?.renk), width: boyut, height: boyut }}
        className={'relative inline-flex shrink-0 items-center justify-center rounded-[30%] bg-[linear-gradient(145deg,rgb(var(--yz-1)),rgb(var(--yz-2))_60%,rgb(var(--yz-3)))] text-[rgb(var(--yz-yazi))] shadow-[0_6px_16px_-8px_rgb(var(--yz-2)/.9),inset_0_1px_0_rgba(255,255,255,.18)] ' + className}>
        <span className="absolute inset-0 overflow-hidden rounded-[30%]"><span className="absolute -right-1 -top-1 h-1/2 w-1/2 rounded-full bg-[rgb(var(--yz-isik)/.28)] blur-md" /></span>
        <Ikon size={Math.round(boyut * 0.5)} strokeWidth={1.9} className="relative" />
        {kivilcim && boyut >= 24 && <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-[rgb(var(--yz-isik))] text-[rgb(var(--yz-3))] ring-2 ring-[rgb(var(--surface,255_255_255))]" style={{ width: Math.max(11, boyut * 0.36), height: Math.max(11, boyut * 0.36) }}>
            <Sparkles size={Math.max(7, Math.round(boyut * 0.22))} strokeWidth={2.4} />
        </span>}
    </span>;
}
