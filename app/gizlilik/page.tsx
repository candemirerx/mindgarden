import Link from 'next/link';
import { ArrowLeft, Sprout } from 'lucide-react';
import { VERI_SILME_ADRESI } from '@/lib/yasalBaglantilar';

export const metadata = {
    title: 'Gizlilik Politikası - Not Bahçesi',
    description: 'Not Bahçesi gizlilik politikası: verileriniz nerede saklanır, kimlerle paylaşılır.',
};

const BOLUMLER: { baslik: string; paragraflar: string[] }[] = [
    {
        baslik: '1. Cihazında tutulanlar',
        paragraflar: [
            "Bahçelerin, düşünce ağaçların, not metinlerin, ayarların, yapay zekâ sağlayıcı tercihlerin ve API anahtarın, bilgisayar araçlarının bağlantı adresleri ve erişim anahtarı ile mini galeriye eklediğin görseller ve dosyalar yalnızca cihazındaki uygulama deposunda saklanır. Android'in otomatik bulut yedeklemesi kapalıdır; uygulamayı kaldırdığında bu veriler de silinir. Notlarını JSON, HTML veya PDF olarak dışa aktarabilirsin.",
        ],
    },
    {
        baslik: '2. Google ile giriş',
        paragraflar: [
            "Google ile giriş yaptığında Google hesabının e-posta adresi, adı ve profil fotoğrafı bağlantısı yalnızca cihazında yerel oturum bilgisi olarak tutulur. Bu bilgiler Not Bahçesi'nin sunucusuna gönderilmez. Giriş işlemini Google yönetir.",
        ],
    },
    {
        baslik: '3. Google Drive yedeklemesi',
        paragraflar: [
            "Google ile giriş yaptığında not yedeklemesi ve mini galeri eşitlemesi varsayılan olarak açılır; ikisi de Ayarlar'dan kapatılabilir. Notlarının yedeği (notbahcesi-backup.json) ve mini galeriye eklediğin görseller ve dosyalar, kendi Google Drive hesabındaki uygulamaya özel gizli klasöre (appDataFolder) yazılır ve normal Drive dosya listende görünmez. Uygulama yalnızca \"drive.appdata\" iznini ister; Drive'daki diğer dosyalarını göremez, okuyamaz ve değiştiremez. Bu veriler cihazından doğrudan Google'a gönderilir, Not Bahçesi'nin sunucusundan geçmez.",
            "Not Bahçesi'nin Google API'lerinden aldığı bilgileri kullanması ve başka uygulamalara aktarması, Sınırlı Kullanım (Limited Use) koşulları dahil olmak üzere Google API Hizmetleri Kullanıcı Verileri Politikası'na (https://developers.google.com/terms/api-services-user-data-policy) uygundur. Google hesap verilerin yalnızca senin yedeğini almak ve geri yüklemek için kullanılır; reklam için kullanılmaz, satılmaz, insanlar tarafından okunmaz ve yapay zekâ modellerini eğitmek için kullanılmaz.",
            'Uygulamanın Google hesabına erişimini istediğin zaman https://myaccount.google.com/permissions adresinden kaldırabilirsin.',
        ],
    },
    {
        baslik: '4. Yapay zekâ özellikleri (isteğe bağlı)',
        paragraflar: [
            "\"İmla Düzelt\" gibi bir yapay zekâ özelliğini bulut sağlayıcıyla kullandığında, işlenecek metin, API anahtarın, sağlayıcı seçimin ve varsa özel sağlayıcı adresin şifreli bağlantıyla (HTTPS) önce Not Bahçesi'nin Vercel üzerindeki sunucu rotasına, oradan da seçtiğin sağlayıcıya (Google Gemini, OpenAI, Anthropic veya kendi belirttiğin servis) iletilir. Not Bahçesi bu metni ve anahtarı kendi tarafında saklamaz. Seçtiğin sağlayıcı metni kendi gizlilik ve saklama koşullarına göre işler.",
            "Android'de yerel yapay zekâyı seçersen metin cihazında işlenir; metin veya anahtar hiçbir sunucuya gönderilmez. Modelin ilk indirmesi Hugging Face (https://huggingface.co/privacy) üzerinden yapılır. Tarayıcıdaki yerel mod, isteği yalnızca senin ayarladığın Ollama sunucusuna gönderir.",
        ],
    },
    {
        baslik: '5. Bilgisayar araçları, Bluetooth ve Tailscale (isteğe bağlı)',
        paragraflar: [
            '"Bilgisayara yaz" ve "PC panosuna gönder" yalnızca sen düğmeye bastığında çalışır ve seçtiğin metni, görseli veya dosyayı yerel ağ ya da Bluetooth üzerinden kendi Kablosuz Bellek kartına veya kendi bilgisayarındaki pano yardımcısına iletir. Bu bağlantı düz HTTP kullanıyorsa ağda şifrelenmez; yalnızca güvendiğin ağlarda kullan. Tailscale yolunu seçersen trafik kendi Tailscale ağından geçer (https://tailscale.com/privacy-policy). Bağlantı kurmak tek başına not içeriğini göndermez.',
        ],
    },
    {
        baslik: '6. İzinler',
        paragraflar: [
            "Kamera yalnızca sen açtığında mini galeriye fotoğraf eklemek için kullanılır. Mikrofon yalnızca dikteyi başlattığında Android'in konuşma tanıma hizmeti için kullanılır; uygulama ses kaydı saklamaz, sesin işlenmesi cihazındaki konuşma hizmetinin ayarlarına bağlıdır. Yakındaki Cihazlar izni (eski Android sürümlerinde konum izni) yalnızca Bluetooth kartını bulmak için istenir; konum bilgisi kaydedilmez ve gönderilmez.",
        ],
    },
    {
        baslik: '7. Sunucu ve barındırma',
        paragraflar: [
            'Web sürümü ve yapay zekâ sunucu rotası Vercel (https://vercel.com/legal/privacy-policy) üzerinde çalışır. Vercel, hizmeti çalıştırmak ve güvenliği sağlamak için IP adresi, tarayıcı/cihaz bilgisi ve istek zamanı gibi standart teknik kayıtları kısa süre tutabilir. Not Bahçesi bu kayıtları profil oluşturmak veya takip için kullanmaz.',
        ],
    },
    {
        baslik: '8. Reklam, analiz ve satış yok',
        paragraflar: [
            'Uygulamada reklam, analiz/izleme aracı veya izleme çerezi yoktur; gerçek parayla satın alma da yoktur. Verilerin satılmaz ve reklam için kullanılmaz.',
        ],
    },
    {
        baslik: '9. Çocuklar',
        paragraflar: ['Uygulama 13 yaş altındaki çocuklara yönelik değildir; 13 yaş altındaki çocuklardan bilerek veri toplanmaz.'],
    },
    {
        baslik: '10. Güvenlik ve saklama',
        paragraflar: [
            "Google ve yapay zekâ sağlayıcılarına giden veriler şifreli bağlantıyla (HTTPS) iletilir. Cihazdaki veriler sen silene veya uygulamayı kaldırana kadar, Drive yedeği ise sen silene kadar saklanır. Not Bahçesi'nin kendi sunucusunda notların için bir saklama süresi yoktur, çünkü notların orada tutulmaz.",
        ],
    },
    {
        baslik: '11. Hakların (KVKK / GDPR)',
        paragraflar: [
            'Verilerinle ilgili bilgi alma, düzeltme, silme ve itiraz haklarını kullanmak için candemirerx@gmail.com adresine yazabilirsin. Talebin en geç 30 gün içinde yanıtlanır.',
        ],
    },
    {
        baslik: '12. Değişiklikler',
        paragraflar: ['Bu politika değişirse güncel hâli bu sayfada yayımlanır ve yukarıdaki yürürlük tarihi güncellenir.'],
    },
];

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-paper">
            <main className="mx-auto max-w-2xl break-words px-6 py-12">
                <Link
                    href="/"
                    className="mb-10 inline-flex min-h-[44px] items-center gap-2 text-sm text-sand-600 transition-colors hover:text-sand-900"
                >
                    <ArrowLeft size={16} />
                    Ana Sayfaya Dön
                </Link>

                <div className="mb-8 flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-moss-100 text-moss-700">
                        <Sprout size={24} />
                    </span>
                    <h1 className="text-3xl text-sand-900">Gizlilik Politikası</h1>
                </div>

                <div className="space-y-6 rounded-3xl border border-sand-200 bg-white p-8 text-sm leading-relaxed text-sand-700 shadow-card">
                    <p>
                        <strong>Yürürlük:</strong> 25 Ekim 2026 · <strong>İletişim:</strong> candemirerx@gmail.com ·{' '}
                        <strong>Paket:</strong> com.notbahcesi.app
                    </p>

                    <p className="rounded-2xl border border-moss-200 bg-moss-50 p-4 text-moss-800">
                        <strong>Kısaca:</strong> Not Bahçesi&apos;nin kendi sunucusunda bir hesap veritabanı ya da not deposu
                        yoktur. Notların cihazında saklanır. Google ile giriş yaparsan yedeğin yalnızca senin Google Drive
                        hesabındaki gizli uygulama klasörüne yazılır. Reklam, analiz ya da izleme aracı kullanılmaz ve veri
                        satılmaz. Cihazından veri çıkan durumlar aşağıda tek tek yazıyor.
                    </p>

                    {BOLUMLER.map((bolum) => (
                        <section key={bolum.baslik} className="space-y-2">
                            <h2 className="text-lg font-semibold text-sand-900">{bolum.baslik}</h2>
                            {bolum.paragraflar.map((paragraf) => (
                                <p key={paragraf.slice(0, 40)}>{paragraf}</p>
                            ))}
                        </section>
                    ))}

                    <p className="border-t border-sand-200 pt-6 text-xs text-sand-600">
                        Verilerini silmek için{' '}
                        <a
                            href={VERI_SILME_ADRESI}
                            className="font-semibold text-clay-800 underline decoration-clay-400 underline-offset-2"
                        >
                            veri silme talebi
                        </a>{' '}
                        sayfasına bakabilirsin.
                    </p>
                </div>
            </main>
        </div>
    );
}
