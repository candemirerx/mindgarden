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
                        <strong>Son güncelleme:</strong> 19 Eylül 2026
                    </p>

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold text-sand-900">1. Topladığımız Veriler</h2>
                        <p>
                            Not Bahçesi, notlarınızı (bahçe ve düşünce ağaçlarınızı) <strong>cihazınızda</strong> saklar.
                            Uygulama sunucularında notlarınızın bir kopyası tutulmaz.
                        </p>
                        <p>
                            Google ile giriş yaptığınızda hesabınızın <strong>e-posta adresi, adı ve profil fotoğrafı</strong>
                            oturum bilgisi olarak yalnızca cihazınızda saklanır.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold text-sand-900">2. Google Drive Yedeklemesi</h2>
                        <p>
                            Otomatik senkronizasyonu etkinleştirdiğinizde notlarınız, <strong>kendi Google Drive hesabınızın
                            gizli uygulama klasörüne</strong> (appDataFolder) yedeklenir. Bu klasörü sizin dışınızda yalnızca
                            Not Bahçesi uygulaması görebilir; diğer uygulamalar, Google çalışanları veya geliştiricimiz
                            erişemez.
                        </p>
                        <p>
                            Bu veriler Drive hesabınızdan kaldırılarak her an silinebilir. Uygulama silindiğinde Drive
                            klasörü otomatik silinmez; isterseniz Google Drive ayarlarınızdan temizleyebilirsiniz.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold text-sand-900">3. Yapay Zeka Özellikleri</h2>
                        <p>
                            "İmla Düzelt" gibi yapay zeka özelliklerini kullanmak için kendi API anahtarınızı girersiniz.
                            Bu anahtar yalnızca cihazınızda saklanır ve seçtiğiniz yapay zeka sağlayıcısına
                            (Google Gemini, OpenAI, Anthropic veya kendi özel adresiniz) doğrudan gönderilir. Düzenlenecek
                            metin, sağlayıcının kendi gizlilik politikasına tabi olarak işlenir.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold text-sand-900">4. Veri Paylaşımı</h2>
                        <p>
                            Notlarınızı üçüncü taraflarla paylaşmayız, satmayız veya reklam amacıyla kullanmayız.
                            Uygulama içerinde hiçbir izleme/reklam çerezi kullanılmaz.
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
