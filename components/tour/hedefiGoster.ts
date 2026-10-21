import { TUVAL_ORTALA_OLAYI } from '@/lib/kilavuzIlerleme';

/**
 * Vurgulanacak öğeyi görünür yere getirir.
 *
 * Tuval kaydırılabilir bir sayfa değil, dönüşümle çizilen bir yüzeydir;
 * scrollIntoView orada taşıyıcıyı kaydırıp çizimi bozar. Tuvaldeki bir kart
 * tam görünmüyorsa tuvalden onu ortalaması istenir; tuvalin sabit düğmeleri
 * (başlık, yakınlaştırma) zaten görünürdür. Diğer ekranlarda sayfa kaydırılır.
 */
export function hedefiGoster(el: Element, yumusak = true): void {
    const tuval = el.closest('.garden-page');
    if (!tuval) {
        el.scrollIntoView({ block: 'center', behavior: yumusak ? 'smooth' : 'auto' });
        return;
    }
    const kart = el.closest('[data-node-id]');
    if (kart && !tamGorunur(el)) window.dispatchEvent(new CustomEvent(TUVAL_ORTALA_OLAYI, { detail: kart.getAttribute('data-node-id') }));
}

/**
 * Öğe görünen alanın içinde tamamen duruyor mu? Tuvalde başlığın altı ve alttaki
 * yakınlaştırma düğmelerinin üstü sayılır; yarısı ekran dışındaki kart "tam" değildir.
 */
export function tamGorunur(el: Element): boolean {
    const r = el.getBoundingClientRect();
    const h = window.visualViewport?.height ?? window.innerHeight;
    const tuval = el.closest('.garden-page');
    const ust = tuval && el.closest('[data-node-id]') ? (tuval.querySelector('header')?.getBoundingClientRect().bottom ?? 0) + 8 : 0;
    const alt = tuval && el.closest('[data-node-id]') ? h - 72 : h;
    return r.top >= ust && r.bottom <= alt && r.left >= 0 && r.right <= window.innerWidth;
}
