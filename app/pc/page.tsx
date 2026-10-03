import Link from 'next/link';
import { ArrowLeft, Download, MonitorSmartphone } from 'lucide-react';

export const metadata = {
    title: 'PC Yardımcısı - Not Bahçesi',
    description: 'Telefondaki Not Bahçesi ile bilgisayara yazmak, fareyi kullanmak ve panoya göndermek için Windows yardımcısı.',
};

/** Yardımcının indirme adresi; scripts/yardimci-zip.mjs üretir. */
const ZIP = '/indir/not-bahcesi-pc-yardimcisi.zip';

export default function PcYardimcisiSayfasi() {
    return (
        <div className="min-h-screen bg-paper">
            <main className="mx-auto max-w-2xl break-words px-6 py-12">
                <Link href="/" className="mb-10 inline-flex min-h-[44px] items-center gap-2 text-sm text-sand-600 transition-colors hover:text-sand-900">
                    <ArrowLeft size={16} />
                    Ana Sayfaya Dön
                </Link>

                <div className="mb-8 flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-moss-100 text-moss-700">
                        <MonitorSmartphone size={24} />
                    </span>
                    <h1 className="text-3xl text-sand-900">PC Yardımcısı</h1>
                </div>

                <div className="space-y-6 rounded-3xl border border-sand-200 bg-white p-8 text-sm leading-relaxed text-sand-700 shadow-card">
                    <p>
                        Telefondaki Not Bahçesi ile bu bilgisayara <strong>yazmak</strong>, <strong>fareyi ve kısayolları</strong> kullanmak
                        ve metni <strong>panoya göndermek</strong> için gereken küçük Windows programı. Hepsi tek programla çalışır.
                        Kablosuz Bellek kartı kullanıyorsanız yazma ve fare için gerekmez; yalnız pano için gerekir.
                    </p>

                    <a href={ZIP} download className="btn btn-primary inline-flex min-h-[48px] items-center gap-2 px-5 text-sm">
                        <Download size={18} aria-hidden="true" /> Yardımcıyı indir (Windows, ~0,2 MB)
                    </a>

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold text-sand-900">Kurulum</h2>
                        <ol className="list-decimal space-y-1.5 pl-5">
                            <li>Zip dosyasını bir klasöre çıkarın (örnek: Belgeler\Not Bahçesi PC).</li>
                            <li><code>scripts</code> klasöründeki <strong>pc_yardimcisi_baslat.cmd</strong> dosyasına çift tıklayın.</li>
                            <li>Windows yönetici izni ister; <strong>Evet</strong> deyin. Güvenlik duvarına yalnız yerel ağ için TCP 8765 izni eklenir.</li>
                            <li>Açılan pencere <strong>6 haneli eşleştirme kodu</strong> gösterir. Pencereyi açık bırakın.</li>
                            <li>Telefonda: <strong>Ayarlar → Bilgisayar bağlantısı → Bilgisayar · Wi‑Fi</strong> (ya da Bluetooth) → “Ağda bilgisayar ara” → kodu yazın.</li>
                        </ol>
                        <p>Kod tek kullanımlıktır; eşleşen telefon bir daha kod sormaz. Bilgisayar her açıldığında yardımcıyı yeniden başlatın.</p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold text-sand-900">Koşullar ve gizlilik</h2>
                        <ul className="list-disc space-y-1.5 pl-5">
                            <li>Telefon ve bilgisayar aynı güvenilen Wi‑Fi ağında olmalı. Bluetooth yolunda bilgisayarın Bluetooth’u açık ve telefonla eşleşmiş olmalı.</li>
                            <li>Yardımcı yalnız yerel ağda çalışır, internete veri göndermez. Her istek bilgisayarınıza özel bir erişim anahtarıyla doğrulanır.</li>
                            <li>Kapatmak için pencerede Ctrl+C’ye basın ya da pencereyi kapatın.</li>
                        </ul>
                    </section>
                </div>
            </main>
        </div>
    );
}
