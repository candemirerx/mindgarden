import Link from 'next/link';
import { ArrowLeft, MonitorSmartphone } from 'lucide-react';
import YardimciKlasorleri from '@/components/ui/YardimciKlasorleri';
import PcYardimcisiIndir from '@/components/ui/PcYardimcisiIndir';

export const metadata = {
    title: 'PC Yardımcısı - Not Bahçesi',
    description: 'Telefondaki Not Bahçesi ile bilgisayara yazmak, fareyi kullanmak ve panoya göndermek için Windows yardımcısı.',
};

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
                    <PcYardimcisiIndir />

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold text-sand-900">İlk bağlantı</h2>
                        <ol className="list-decimal space-y-1.5 pl-5">
                            <li><strong>BASLAT.cmd</strong> açıkken telefonda <strong>Ayarlar → Bilgisayar bağlantısı</strong> bölümünü açın.</li>
                            <li>Bluetooth kullanıyorsanız Windows ve telefonu bir kez eşleştirin. Yardımcının pano/dosya alıcısını seçin; uygulama kod sorarsa penceredeki <strong>6 haneli kodu</strong> girin.</li>
                            <li>Doğrudan PC Wi-Fi kullanıyorsanız bunun yerine <strong>WIFI.cmd</strong> açın; aynı güvenilen ağda bilgisayarı bulun ve kodla eşleştirin. Güvenlik duvarı engelliyorsa admin olmadan izin eklenemez.</li>
                        </ol>
                        <p>Eşleşme bilgisi telefonda saklanır. Sonraki kullanımda yalnız yardımcıyı açmanız yeterlidir. Güncel kartın USB pano yolunda ayrı telefon-PC eşleşmesi gerekmez.</p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-sand-900">Zip içindeki dosyalar</h2>
                        <p>Hangi dosyanın ne işe yaradığı ve yönetici izni isteyip istemediği:</p>
                        <YardimciKlasorleri />
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold text-sand-900">Koşullar ve gizlilik</h2>
                        <ul className="list-disc space-y-1.5 pl-5">
                            <li>Wi-Fi için aynı güvenilen ağ; Bluetooth için açık radyo ve eşleşme; kart USB için destekleyen kart ve seri port erişimi gerekir.</li>
                            <li>Varsayılan ağ alıcısı yalnız bu bilgisayarda dinler; mevcut ve izinli Tailscale özel ağ bağlantısını taşıyabilir. Yerel Wi-Fi HTTP trafiği şifrelenmez. USB internet köprüsü kullanılırsa ilgili istekler PC’nin internet bağlantısından çıkar.</li>
                            <li>Kapatmak için pencerede Ctrl+C’ye basın ya da pencereyi kapatın.</li>
                        </ul>
                    </section>
                </div>
            </main>
        </div>
    );
}
