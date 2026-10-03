/**
 * Kendi yüksekliğine göre büyüyen (iç kaydırması olmayan) bir textarea'da
 * imleci görünür tutar. Kaydırma belgede olduğundan tarayıcı imleci yalnızca
 * pencere sınırına göre gösterir; yapışkan alt çubuk ve klavye ise imlecin
 * üstünü örter. Burada imlecin gerçek konumu ölçülür ve gerekirse sayfa kaydırılır.
 */

const KOPYALANAN_STILLER = [
    'boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight',
    'textTransform', 'wordSpacing', 'textIndent', 'tabSize'
] as const;

/** İmlecin textarea içindeki dikey konumu (üst kenara göre) ve satır yüksekliği. */
function imlecKonumu(field: HTMLTextAreaElement): { ust: number; yukseklik: number } {
    const stil = window.getComputedStyle(field);
    const ayna = document.createElement('div');
    const s = ayna.style;
    for (const ad of KOPYALANAN_STILLER) s[ad] = stil[ad];
    s.position = 'absolute';
    s.visibility = 'hidden';
    s.top = '0';
    s.left = '-9999px';
    s.whiteSpace = 'pre-wrap';
    s.overflowWrap = 'break-word';
    s.wordBreak = stil.wordBreak;
    ayna.textContent = field.value.slice(0, field.selectionEnd);
    const isaret = document.createElement('span');
    // Boş satır sonunda da yükseklik ölçülebilsin.
    isaret.textContent = '​';
    ayna.appendChild(isaret);
    document.body.appendChild(ayna);
    const ust = isaret.offsetTop;
    const yukseklik = isaret.offsetHeight || parseFloat(stil.lineHeight) || 24;
    document.body.removeChild(ayna);
    return { ust, yukseklik };
}

/**
 * İmleç görünür alanın dışındaysa (klavye, yapışkan alt çubuk) sayfayı kaydırır.
 * @param altEngel İmlecin altında kalması gereken öğe (ör. yapışkan alt çubuk).
 */
export function imleciGorunurTut(field: HTMLTextAreaElement, altEngel?: HTMLElement | null): void {
    if (typeof window === 'undefined' || document.activeElement !== field) return;
    const { ust, yukseklik } = imlecKonumu(field);
    const kutu = field.getBoundingClientRect();
    const imlecUst = kutu.top + ust - field.scrollTop;
    const imlecAlt = imlecUst + yukseklik;

    const vv = window.visualViewport;
    const gorunurUst = vv ? vv.offsetTop : 0;
    let gorunurAlt = vv ? vv.offsetTop + vv.height : window.innerHeight;
    if (altEngel) {
        const engel = altEngel.getBoundingClientRect();
        if (engel.height > 0 && engel.top < gorunurAlt) gorunurAlt = engel.top;
    }

    const pay = Math.round(yukseklik * 0.75);
    if (imlecAlt + pay > gorunurAlt) {
        window.scrollBy({ top: imlecAlt + pay - gorunurAlt });
    } else if (imlecUst - pay < gorunurUst) {
        window.scrollBy({ top: imlecUst - pay - gorunurUst });
    }
}
