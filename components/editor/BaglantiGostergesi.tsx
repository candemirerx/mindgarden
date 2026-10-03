'use client';

/**
 * Bilgisayar bağlantısının canlı durum göstergesi (ayarlar ve editör ortak).
 * Yeşil: yol gerçekten yanıt veriyor. Kırmızı: kurulu ama ulaşılamıyor.
 * Gri: kurulum eksik. Dokununca hemen yeniden yoklar.
 */
import { Loader2, RefreshCw } from 'lucide-react';
import { YOL_ADI } from '@/lib/baglantiDurumu';
import type { BaglantiDurumu } from '@/lib/baglantiDurumu';
import type { ConnectionMode } from '@/lib/remoteTools';
import { cx } from '@/components/ui/settings';

const RENK: Record<'ok' | 'hata' | 'kurulmadi' | 'bilinmiyor', { nokta: string; kutu: string; kisa: string }> = {
    ok: { nokta: 'bg-moss-500', kutu: 'border-moss-300 bg-moss-50 text-moss-800', kisa: 'Bağlı' },
    hata: { nokta: 'bg-berry-500', kutu: 'border-berry-200 bg-berry-50 text-berry-800', kisa: 'Bağlantı yok' },
    kurulmadi: { nokta: 'bg-sand-400', kutu: 'border-sand-300 bg-sand-50 text-sand-700', kisa: 'Kurulmadı' },
    bilinmiyor: { nokta: 'bg-sand-300', kutu: 'border-sand-200 bg-white text-sand-600', kisa: 'Denetleniyor' }
};

function ne_zaman(ms: number): string {
    const sn = Math.max(0, Math.round((Date.now() - ms) / 1000));
    return sn < 5 ? 'az önce' : sn < 60 ? sn + ' sn önce' : Math.round(sn / 60) + ' dk önce';
}

export default function BaglantiGostergesi({ yol, durum, bakiliyor, onTazele, kompakt = false, id }: {
    yol: ConnectionMode; durum: BaglantiDurumu | null; bakiliyor: boolean; onTazele: () => void; kompakt?: boolean; id?: string;
}) {
    const tur = durum?.tur === 'ok' || durum?.tur === 'hata' || durum?.tur === 'kurulmadi' ? durum.tur : 'bilinmiyor';
    const r = RENK[tur];
    const aciklama = YOL_ADI[yol] + ': ' + (durum ? durum.mesaj + ' (' + ne_zaman(durum.zaman) + ')' : 'denetleniyor…');
    if (kompakt) {
        return <button type="button" id={id} onClick={onTazele} disabled={bakiliyor} title={aciklama + ' — dokununca yeniden dener'}
            aria-label={'Bilgisayar bağlantısı: ' + (bakiliyor && !durum ? 'denetleniyor' : r.kisa) + '. ' + aciklama + '. Yeniden denemek için dokunun.'}
            className={cx('flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold', r.kutu)}>
            {bakiliyor ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <span aria-hidden="true" className={cx('h-2.5 w-2.5 rounded-full', r.nokta)} />}
            <span className="max-w-[7.5rem] truncate">{r.kisa}</span>
        </button>;
    }
    return <div id={id} role="status" aria-live="polite" className={cx('flex items-start gap-2.5 rounded-xl border px-3 py-2.5', r.kutu)}>
        {bakiliyor && !durum ? <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin" aria-hidden="true" /> : <span aria-hidden="true" className={cx('mt-1 h-3 w-3 shrink-0 rounded-full', r.nokta)} />}
        <div className="min-w-0 flex-1 text-xs leading-relaxed">
            <p className="font-semibold">Editör bu yolu kullanıyor: {YOL_ADI[yol]} · {bakiliyor && !durum ? 'denetleniyor…' : r.kisa}</p>
            {durum && <p className="opacity-90">{durum.mesaj} <span className="opacity-70">({ne_zaman(durum.zaman)})</span></p>}
        </div>
        <button type="button" onClick={onTazele} disabled={bakiliyor} aria-label="Bağlantıyı yeniden dene"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-white/60 disabled:opacity-50">
            <RefreshCw size={16} className={bakiliyor ? 'animate-spin' : ''} aria-hidden="true" />
        </button>
    </div>;
}
