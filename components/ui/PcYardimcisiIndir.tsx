'use client';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Copy, Download, Keyboard, Loader2, Share2 } from 'lucide-react';
import { PC_YARDIMCISI_SAYFASI, PC_YARDIMCISI_ZIP } from '@/lib/config';
import { baglantiTuru, baglantiTuruSec, bluetoothKlavyeBagla, bleDurumu, connectCard, kayitliKartAdresi, remotePrefs, typeOnComputer } from '@/lib/remoteTools';
import type { BaglantiTuru, RemotePrefs } from '@/lib/remoteTools';

const dugme = 'btn btn-secondary min-h-[44px] gap-1.5 px-3 text-sm';
const YAZMA_YOLLARI = [
    ['pc-bluetooth', 'Bilgisayar · Bluetooth (kartsız)'],
    ['bluetooth', 'Kart · Bluetooth'],
    ['wifi', 'Kart · Wi-Fi'],
    ['kart-ap', 'Kart · kendi ağı (AP)'],
] as const;

/** Aynı indirme kartı uygulamada ve /pc sayfasında kullanılır. */
export default function PcYardimcisiIndir({ kurulu = false, prefs }: { kurulu?: boolean; prefs?: RemotePrefs }) {
    const [mesaj, setMesaj] = useState<{ hata: boolean; metin: string } | null>(null);
    const [mesgul, setMesgul] = useState('');
    const [yazmaAcik, setYazmaAcik] = useState(false);
    const [yol, setYol] = useState<BaglantiTuru | null>(null);
    const telefon = Capacitor.isNativePlatform();
    const secili = baglantiTuru(prefs ?? remotePrefs());
    const yazmaYolu = yol ?? (secili === 'pc-wifi' || secili === 'tailscale' ? 'pc-bluetooth' : secili);
    const islem = async (ad: string, fn: () => Promise<string | void>) => {
        if (mesgul) return;
        setMesgul(ad); setMesaj(null);
        try { const metin = await fn(); if (metin) setMesaj({ hata: false, metin }); }
        catch (e) { setMesaj({ hata: true, metin: e instanceof Error ? e.message : 'İşlem tamamlanamadı.' }); }
        finally { setMesgul(''); }
    };
    const kopyala = async () => {
        try { await navigator.clipboard.writeText(PC_YARDIMCISI_SAYFASI); }
        catch { throw new Error('Panoya erişilemedi. Yukarıdaki linki basılı tutup kopyalayın veya Paylaş seçeneğini kullanın.'); }
        return 'Link kopyalandı. Bilgisayarda tarayıcının adres çubuğuna yapıştırın.';
    };
    const paylas = async () => {
        const veri = { title: 'Not Bahçesi PC Yardımcısı', text: 'Windows yardımcısını bilgisayarda bu sayfadan indirin:', url: PC_YARDIMCISI_SAYFASI };
        try {
            if (telefon) { const { Share } = await import('@capacitor/share'); await Share.share({ ...veri, dialogTitle: 'İndirme linkini paylaş' }); }
            else if (navigator.share) await navigator.share(veri);
            else return await kopyala();
        } catch (e) {
            if ((e as Error).name === 'AbortError' || /cancel|iptal/i.test((e as Error).message ?? '')) return;
            throw e;
        }
    };
    const bilgisayaraYaz = async () => {
        // Wi-Fi/Tailscale PC alıcısına düşme: ilk indirme yardımcı olmadan yapılmalı.
        const p = baglantiTuruSec(prefs ?? remotePrefs(), yazmaYolu);
        if (p.connection === 'pc-wifi') throw new Error('Linki yardımcı olmadan yazmak için Bluetooth klavye veya kart yolunu seçin.');
        if (p.connection === 'pc-bluetooth') await bluetoothKlavyeBagla(p.helperBluetoothAddress);
        if (p.connection === 'bluetooth') {
            if (!(await bleDurumu()).connected) {
                const adres = kayitliKartAdresi();
                if (!adres) throw new Error('Önce Ayarlar → Bilgisayar bağlantısı bölümünden kartı Bluetooth ile bağlayın.');
                await connectCard(adres);
            }
        }
        await typeOnComputer(PC_YARDIMCISI_SAYFASI, p);
        return 'Link bilgisayardaki odaklı alana yazıldı. Tarayıcı adres çubuğundaysa Enter’a basın.';
    };
    const icerik = <div className="space-y-3">
        <p className="text-xs leading-relaxed text-sand-700">Tek Windows yardımcısı: PC panosu, dosya aktarımı ve doğrudan PC Wi-Fi bağlantısı için. <strong>Bluetooth klavye/fare veya kartla yazma için gerekmez.</strong></p>
        <div className="rounded-xl border border-sand-200 bg-white p-3">
            <p className="mb-1 text-xs font-semibold text-sand-900">İndirme sayfasını bilgisayarda açın</p>
            <a href={PC_YARDIMCISI_SAYFASI} target="_blank" rel="noopener noreferrer" className="block select-all break-all text-xs text-moss-700 underline">{PC_YARDIMCISI_SAYFASI}</a>
            <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" id="yardimci-bilgisayara-gonder" disabled={!!mesgul} className={dugme} onClick={() => void islem('paylas', paylas)}><Share2 size={15} aria-hidden="true" /> Paylaş</button>
                <button type="button" id="yardimci-link-kopyala" disabled={!!mesgul} className={dugme} onClick={() => void islem('kopyala', kopyala)}><Copy size={15} aria-hidden="true" /> Linki kopyala</button>
                <button type="button" id="yardimci-link-yaz-ac" disabled={!!mesgul} className={dugme} aria-expanded={yazmaAcik} onClick={() => setYazmaAcik(!yazmaAcik)}><Keyboard size={15} aria-hidden="true" /> Bilgisayara linki yaz</button>
            </div>
        </div>
        {yazmaAcik && <div className="space-y-2 rounded-xl border border-moss-200 bg-white p-3">
            <p className="text-xs leading-relaxed text-sand-700">Yardımcı gerektirmez. Önce bilgisayarda tarayıcıyı açın ve adres çubuğuna tıklayın (Ctrl+L). Yalnız link yazılır; Enter’a siz basarsınız. Kart kullanıyorsanız USB kablosu hedef PC’de olsun; PC klavye dili Türkçe Q olmalı.</p>
            <label htmlFor="yardimci-link-yolu" className="block text-xs font-medium text-sand-900">Link hangi bağlantıyla yazılsın?</label>
            <select id="yardimci-link-yolu" value={yazmaYolu} disabled={!!mesgul} onChange={e => setYol(e.target.value as BaglantiTuru)} className="min-h-[44px] w-full rounded-xl border border-sand-300 bg-white px-3 text-xs text-sand-900">
                {YAZMA_YOLLARI.map(([id, ad]) => <option key={id} value={id}>{ad}</option>)}
            </select>
            <button type="button" id="yardimci-link-yaz" disabled={!!mesgul || (!telefon && yazmaYolu !== 'wifi' && yazmaYolu !== 'kart-ap')} className={dugme} onClick={() => void islem('yaz', bilgisayaraYaz)}>{mesgul === 'yaz' ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Keyboard size={15} aria-hidden="true" />} {mesgul === 'yaz' ? 'Yazılıyor…' : 'Linki şimdi yaz'}</button>
            {!telefon && <p className="text-xs text-sand-600">Bluetooth ile yazma Android uygulamasında çalışır. Tarayıcıda kart Wi-Fi/AP bağlantısı kullanılabilir.</p>}
        </div>}
        <div className="flex flex-wrap gap-2">
            {telefon ? <button type="button" disabled={!!mesgul} className={dugme} onClick={() => void islem('indir', async () => {
                const { Browser } = await import('@capacitor/browser');
                await Browser.open({ url: PC_YARDIMCISI_ZIP });
                return 'ZIP linki tarayıcıda açıldı. İndirdiğiniz dosyayı USB veya Quick Share ile bilgisayara aktarabilirsiniz.';
            })}><Download size={15} aria-hidden="true" /> Alternatif: ZIP’i telefona indir</button>
                : <a id="yardimci-indir" href={PC_YARDIMCISI_ZIP} download className="btn btn-primary min-h-[44px] gap-1.5 px-4 text-sm"><Download size={15} aria-hidden="true" /> Windows ZIP’ini indir</a>}
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed text-sand-700">
            <li>ZIP’in tamamını bir klasöre çıkarın; içinden doğrudan çalıştırmayın.</li>
            <li>Ana klasördeki <strong>BASLAT.cmd</strong> dosyasına çift tıklayın. Bluetooth/kart için yeterli; yeni Tailscale kurulumu gerekmez.</li>
            <li>Pencereyi açık bırakın; küçültebilirsiniz. PC yeniden açılınca tekrar başlatın.</li>
        </ol>
        <p className="text-xs leading-relaxed text-sand-600">Ana başlatıcı admin istemez. Wi-Fi izni eklemek ve yeni Tailscale kurulumu admin gerektirebilir. Kurum betikleri, Bluetooth veya USB’yi engelliyorsa bu kısıtları aşmaya çalışmayın.</p>
        {mesaj && <p role={mesaj.hata ? 'alert' : 'status'} className={'break-words text-xs ' + (mesaj.hata ? 'text-berry-700' : 'text-moss-700')}>{mesaj.metin}</p>}
    </div>;
    return kurulu ? <details className="rounded-xl border border-sand-200 bg-white"><summary className="min-h-11 cursor-pointer p-3 text-xs font-medium text-sand-700">Yardımcıyı indir / linki gönder</summary><div className="px-3 pb-3">{icerik}</div></details>
        : <div id="yardimci-indir-karti" className="space-y-2 rounded-xl border border-moss-200 bg-moss-50/60 p-3"><p className="text-sm font-semibold text-moss-800">PC yardımcısını indir</p>{icerik}</div>;
}
