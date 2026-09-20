import Link from 'next/link';
import { ArrowLeft, Sprout } from 'lucide-react';

export const metadata = {
    title: 'Gizlilik Politikası - Not Bahçesi',
    description: 'Not Bahçesi gizlilik politikası: verileriniz nerede saklanır, kimlerle paylaşılır.',
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-paper">
            <div className="mx-auto max-w-2xl px-6 py-12">
                <Link
                    href="/"
                    className="mb-10 inline-flex items-center gap-2 text-sm text-sand-600 transition-colors hover:text-sand-900"
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
                        <strong>Son güncelleme:</strong> 20 Eylül 2026
                    </p>

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold text-sand-900">1. Topladığımız Veriler</h2>
                        <p>
                            Yerel modda Not Bahçesi, notlarınızı (bahçe ve düşünce ağaçlarınızı) <strong>cihazınızda</strong> saklar.
                            Uygulama kodu not defterinizin kalıcı bir kopyasını kendi sunucusunda oluşturmaz; ancak yapay zekâ
                            özelliğini kullandığınızda işlenecek metin aşağıda açıklandığı şekilde Vercel sunucu rotasından geçer.
                        </p>
                        <p>
                            Google ile giriş yaptığınızda hesabınızın <strong>e-posta adresi, adı ve profil fotoğrafı</strong>
                            yerel oturum bilgisi olarak cihazınızda saklanır.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold text-sand-900">2. Google Drive Yedeklemesi</h2>
                        <p>
                            Otomatik senkronizasyonu etkinleştirdiğinizde notlarınız, <strong>kendi Google Drive hesabınızdaki
                            uygulamaya özel klasöre</strong> (appDataFolder) yedeklenir ve normal Drive dosya listenizde görünmez.
                            Erişim Google hesabınızın yetkilendirmesi ile Google'ın hizmet ve gizlilik koşulları kapsamında yönetilir.
                        </p>
                        <p>
                            Bu veriler Drive hesabınızdan kaldırılarak her an silinebilir. Uygulama silindiğinde Drive
                            klasörü otomatik silinmez; isterseniz Google Drive ayarlarınızdan temizleyebilirsiniz.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold text-sand-900">3. Yapay Zeka Özellikleri</h2>
                        <p>
                            "İmla Düzelt" gibi yapay zekâ özelliklerini kullandığınızda API anahtarınız cihazınızın yerel
                            deposundan okunur. İşlenecek metin, API anahtarı, sağlayıcı seçimi ve varsa özel sağlayıcı adresi
                            önce Not Bahçesi'nin Vercel üzerindeki sunucu rotasına, ardından seçtiğiniz yapay zekâ sağlayıcısına
                            iletilir. Bu işlem Vercel'in ve seçilen sağlayıcının geçerli gizlilik ve veri işleme koşullarına tabidir.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold text-sand-900">4. Veri Paylaşımı</h2>
                        <p>
                            Notlarınızı satmayız veya reklam amacıyla kullanmayız. Yalnızca sizin başlattığınız Drive
                            senkronizasyonu ve yapay zekâ işlemleri kapsamında gerekli veriler, bu politikada açıklanan
                            hizmet sağlayıcılara iletilir. Uygulama içinde izleme veya reklam çerezi kullanılmaz.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold text-sand-900">5. Çocukların Gizliliği</h2>
                        <p>
                            Uygulama 13 yaş altı çocuklardan bilinçli olarak veri toplamaz.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold text-sand-900">6. İletişim</h2>
                        <p>
                            Gizlilik ile ilgili sorularınız için: <strong>candemirerx@gmail.com</strong>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
