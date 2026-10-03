'use client';

/**
 * Makro düğmesi: makronun çalışma biçimine göre davranır.
 *
 * - Normal: dokununca bir kez çalışır (bilgisayar tuşu gibi).
 * - Sayılı: dokununca ayarlardaki sayı kadar çalışır; çalışırken dokunmak durdurur.
 * - Anahtar: ilk dokunuş açar, makro ikinci dokunuşa kadar baştan tekrar eder.
 * - Basılı tut: parmak düğmedeyken tekrar eder, bırakınca durur.
 *
 * Çalışırken düğme vurgulanır ve köşede tur sayısı görünür. Durum ortak
 * çalıştırıcıdan (lib/makroCalistirici) gelir; aynı makro başka bir panoda da
 * çalışıyor görünür.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { makroCalismasi, makroCalisiyor, makroyuBaslat, makroyuDurdur, useMakroDurumu } from '@/lib/makroCalistirici';
import type { RemoteMacro, RemotePrefs } from '@/lib/remoteTools';
import { cx } from '@/components/ui/settings';

type Ozellikler = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'> & {
    makro: RemoteMacro;
    prefs: RemotePrefs;
    /** Bitiş, durdurma ya da hata iletisi. */
    onSonuc?: (mesaj: string, hata: boolean) => void;
    /** Tek çalışmada başarı iletisi; verilmezse '"ad" çalıştırıldı.' */
    basariMesaji?: string;
    /** Hata iletisini kullanıcıya uygun hale getirir. */
    hataMetni?: (hata: unknown) => string;
    children: ReactNode;
};

export default function MakroDugmesi({ makro, prefs, onSonuc, basariMesaji, hataMetni, children, className, disabled, ...kalan }: Ozellikler) {
    const durum = useMakroDurumu(makro.id);
    const calisma = makroCalismasi(makro);
    const ad = makro.name.trim() || 'Makro';

    const baslat = () => {
        if (makroCalisiyor(makro.id)) return;
        void makroyuBaslat(makro, prefs)
            .then(() => onSonuc?.(calisma === 'tek' ? basariMesaji ?? '"' + ad + '" çalıştırıldı.'
                : calisma === 'sayili' ? '"' + ad + '" bitti.' : '"' + ad + '" durduruldu.', false))
            .catch((hata) => onSonuc?.(hataMetni ? hataMetni(hata) : hata instanceof Error ? hata.message : 'Makro çalıştırılamadı.', true));
    };
    const durdur = () => makroyuDurdur(makro.id);

    const basili = calisma === 'basili';
    const olaylar = basili ? {
        onPointerDown: (olay: React.PointerEvent<HTMLButtonElement>) => {
            if (olay.button !== 0) return;
            // Parmak düğmeden kaysa da bırakılınca durması için işaretçi yakalanır.
            try { olay.currentTarget.setPointerCapture(olay.pointerId); } catch { /* yakalanamazsa pointerleave yeter */ }
            baslat();
        },
        onPointerUp: durdur,
        onPointerCancel: durdur,
        onLostPointerCapture: durdur,
        onPointerLeave: durdur,
        onKeyDown: (olay: React.KeyboardEvent) => { if ((olay.key === ' ' || olay.key === 'Enter') && !olay.repeat) { olay.preventDefault(); baslat(); } },
        onKeyUp: (olay: React.KeyboardEvent) => { if (olay.key === ' ' || olay.key === 'Enter') durdur(); },
        // Uzun basışta telefonun bağlam menüsü/metin seçimi açılmasın.
        onContextMenu: (olay: React.MouseEvent) => olay.preventDefault()
    } : {
        onClick: () => { if (durum) durdur(); else baslat(); }
    };

    const ipucu = basili ? 'Basılı tuttukça çalışır'
        : calisma === 'anahtar' ? (durum ? 'Durdurmak için dokunun' : 'Açmak için dokunun; kapatana kadar çalışır')
            : calisma === 'sayili' ? (durum ? 'Durdurmak için dokunun' : (makro.tekrar ?? 3) + ' kez çalışır') : undefined;

    return <button
        type="button"
        {...kalan}
        {...olaylar}
        disabled={disabled && !durum}
        data-makro-calisiyor={durum ? 'evet' : undefined}
        aria-pressed={calisma === 'anahtar' ? !!durum : undefined}
        title={kalan.title ?? (ipucu ? ad + ' · ' + ipucu : ad)}
        className={cx('relative', basili && 'touch-none select-none [-webkit-touch-callout:none]', className,
            durum && '!border-moss-600 !bg-moss-100 !text-moss-800 ring-2 ring-moss-500/60')}
    >
        {children}
        {durum && (calisma !== 'tek') && <span aria-hidden="true"
            className="absolute right-1 top-1 rounded-full bg-moss-700 px-1.5 text-[10px] font-semibold leading-4 text-white">
            {durum.toplam ? durum.tur + '/' + durum.toplam : durum.tur}
        </span>}
    </button>;
}
