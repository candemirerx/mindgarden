/**
 * Dal ve ağaçlar için seçilebilir renkler.
 *
 * Hem Projeler hem Canvas ekranı bu listeyi kullanır; iki ekranda aynı
 * renkler döner.
 */
export interface BranchColor {
    name: string;
    value: string;
}

export const BRANCH_COLORS: BranchColor[] = [
    { name: 'Yosun yeşili', value: '#306C47' },
    { name: 'Bal köşe', value: '#C9841B' },
    { name: 'Deniz mavisi', value: '#4A7C8C' }
];

/** Verilen renkten sonra gelen rengi döner; renk yoksa ilk renkle başlar. */
export function sonrakiRenk(mevcut: string | null | undefined): string {
    const palet = BRANCH_COLORS.map((c) => c.value);
    const index = mevcut ? palet.indexOf(mevcut) : -1;
    return palet[(index + 1) % palet.length];
}
