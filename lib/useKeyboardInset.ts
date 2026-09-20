'use client';

import { useEffect, useState } from 'react';

/**
 * Ekran klavyesi açıldığında görünür alanın kaç piksel küçüldüğünü döner.
 *
 * Android'de WebView klavye açılınca her zaman küçülmez (özellikle
 * windowSoftInputMode "adjustPan" iken). Bu yüzden modal ve alt sayfaları
 * klavyenin üstünde tutabilmek için visualViewport ile ölçüm yaparız.
 * adjustResize zaten çalışıyorsa fark sıfır çıkar ve fazladan kaydırma
 * uygulanmaz; iki durumda da doğru sonuç verir.
 */
export function useKeyboardInset(active: boolean): number {
    const [inset, setInset] = useState(0);

    useEffect(() => {
        if (!active || typeof window === 'undefined') {
            setInset(0);
            return;
        }

        const viewport = window.visualViewport;
        if (!viewport) return;

        const update = () => {
            const hidden = window.innerHeight - viewport.height - viewport.offsetTop;
            setInset(hidden > 1 ? Math.round(hidden) : 0);
        };

        update();
        viewport.addEventListener('resize', update);
        viewport.addEventListener('scroll', update);
        window.addEventListener('resize', update);

        return () => {
            viewport.removeEventListener('resize', update);
            viewport.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, [active]);

    return inset;
}
