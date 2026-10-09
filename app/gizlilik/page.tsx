import Link from 'next/link';
import { ArrowLeft, Sprout } from 'lucide-react';
import { APP_VERSION } from '@/lib/config';

export const metadata = {
    title: 'Gizlilik Politikası - Not Bahçesi',
    description: 'Not Bahçesi gizlilik politikası: verileriniz nerede saklanır, kimlerle paylaşılır.',
};

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
                        <strong>Son güncelleme:</strong> 30 Eylül 2026
                    </p>

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold text-sand-900">1. Topladığımız Veriler</h2>
                        <p>
                            Yerel modda Not Bahçesi, notlarınızı (bahçe ve düşünce ağaçlarınızı) <strong>cihazınızda</strong> saklar.
                            Uygulama kodu not defterinizin kalıcı bir kopyasını kendi sunucusunda oluşturmaz; ancak yapay zekâ
                            bulut sağlayıcısını kullandığınızda işlenecek metin aşağıda açıklandığı şekilde Vercel sunucu rotasından geçer.
                        </p>
                        <p>
                            Google ile giriş yaptığınızda hesabınızın <strong>e-posta adresi, adı ve profil fotoğrafı</strong>
                            yerel oturum bilgisi olarak cihazınızda saklanır.
                        </p>
                        <p>
                            Android uygulamasında <strong>otomatik bulut yedeklemesi kapalıdır</strong>: işletim sistemi
                            notlarınızı Google hesabınıza yedeklemez. Bu nedenle uygulamayı cihazdan kaldırdığınızda
                            yerel notlar da silinir; saklamak istediğiniz notları JSON olarak dışa aktarabilir veya
                            Google Drive senkronizasyonunu kullanabilirsiniz.
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
                            Bulut sağlayıcısıyla "İmla Düzelt" gibi yapay zekâ özelliklerini kullandığınızda API anahtarınız cihazınızın yerel
                            deposundan okunur. İşlenecek metin, API anahtarı, sağlayıcı seçimi ve varsa özel sağlayıcı adresi
                            önce Not Bahçesi'nin Vercel üzerindeki sunucu rotasına, ardından seçtiğiniz yapay zekâ sağlayıcısına
                            iletilir. Bu işlem Vercel'in ve seçilen sağlayıcının geçerli gizlilik ve veri işleme koşullarına tabidir.
                        </p>
                        <p>
                            Android uygulamasında yerel yapay zekâyı seçtiğinizde model ve işlenecek metin cihazınızda
                            işlenir; bu çıkarım için metin veya API anahtarı Vercel'e ya da bir bulut yapay zekâ sağlayıcısına
                            gönderilmez. Modelin ilk indirmesi Hugging Face üzerinden, bu hizmetin hesap, lisans ve gizlilik
                            koşullarıyla yapılır. Seçtiğiniz model dosyası uygulamanın özel deposuna kopyalanır.
                            Tarayıcıdaki yerel mod, isteği yapılandırdığınız Ollama sunucusuna gönderir.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold text-sand-900">4. Veri Paylaşımı</h2>
                        <p>
                            Notlarınızı satmayız veya reklam amacıyla kullanmayız. Yalnızca sizin başlattığınız Drive
                            senkronizasyonu, bilgisayar araçları ve yapay zekâ işlemleri kapsamında gerekli veriler, bu politikada açıklanan
                            hizmet sağlayıcılara iletilir. Uygulama içinde izleme veya reklam çerezi kullanılmaz.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold text-sand-900">5. Bilgisayar Araçları ve Dikte</h2>
                        <p>
                            Bilgisayara yazma ve PC panosuna gönderme yalnız sizin düğmeye basmanızla editör metnini seçtiğiniz
                            Kablosuz Bellek kartına veya kendi bilgisayarınızda çalıştırdığınız pano yardımcısına yerel ağ/Bluetooth
                            üzerinden iletir. Bağlantı adresleri ve yardımcı program anahtarı bu cihazın yerel deposunda tutulur;
                            bu iletişim açık HTTP kullanıyorsa ağ üzerinde şifrelenmez. Yalnız güvenilen yerel ağ kullanın.
                        </p>
                        <p>
                            Tailscale yolunu seçtiğinizde telefon ve bilgisayar arasındaki bağlantı kendi Tailscale ağınızdan
                            geçer; iki cihazda da Tailscale açık olmalıdır. Tailscale'in hizmet ve gizlilik koşulları ayrıca geçerlidir.
                            "Açılışta otomatik bağlan" açıksa uygulama açıldığında veya yeniden ön plana geldiğinde
                            önceden kurduğunuz bağlantıyı yeniden dener. Kart Bluetooth bağlantısında kayıtlı kart bulunamazsa
                            tanınan kart adlarını tarayabilir. Bu seçenek bağlantı ayarlarından kapatılabilir;
                            bağlantı kurmak tek başına not metninizi veya galeri görsellerinizi göndermez.
                        </p>
                        <p>
                            Mini galeriye kameradan veya telefonunuzun seçicisinden eklediğiniz görseller uygulamanın
                            cihazdaki özel deposunda saklanır. Kamera yalnız siz açtığınızda kullanılır. Seçtiğiniz
                            görselleri bilgisayara veya PC panosuna gönderdiğinizde görsel verisi kendi bilgisayarınızdaki
                            yardımcıya iletilir. Uygulama bu görselleri kendiliğinden bulut yapay zekâya göndermez.
                            Görselleri galeriden silebilirsiniz; uygulamayı kaldırmak cihazdaki uygulama verilerini kaldırır.
                        </p>
                        <p>
                            BLE tarama için Yakındaki Cihazlar izni (eski Android sürümlerinde konum izni) gerekir; konum bilgisi
                            uygulama tarafından kaydedilmez. Dikte başlatıldığında mikrofon/sistem konuşma tanıma hizmeti açılır.
                            Sesin işlenmesi seçili Android konuşma hizmetinin çevrim içi veya çevrim dışı ayarlarına bağlıdır;
                            uygulama ham ses kaydı saklamaz. Tanınan metin seçtiğiniz hedefe göre notunuza,
                            bilgisayarınıza veya ikisine birden yazılır.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold text-sand-900">6. Çocukların Gizliliği</h2>
                        <p>
                            Uygulama 13 yaş altı çocuklardan bilinçli olarak veri toplamaz.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold text-sand-900">7. İletişim</h2>
                        <p>
                            Gizlilik ile ilgili sorularınız için: <strong>candemirerx@gmail.com</strong>
                        </p>
                    </section>

                    <p className="border-t border-sand-200 pt-6 text-xs text-sand-600">
                        Bu politika Not Bahçesi sürüm {APP_VERSION} için geçerlidir. Verilerinizi
                        silmek için{' '}
                        <Link
                            href="/veri-silme"
                            className="font-semibold text-clay-800 underline decoration-clay-400 underline-offset-2"
                        >
                            veri silme talebi
                        </Link>{' '}
                        sayfasına bakabilirsiniz.
                    </p>
                </div>
            </main>
        </div>
    );
}
