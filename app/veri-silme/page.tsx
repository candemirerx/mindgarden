import Link from 'next/link';
import { ArrowLeft, Mail, ShieldCheck, Trash2 } from 'lucide-react';
import { APP_VERSION } from '@/lib/config';

export const metadata = {
    title: 'Veri Silme Talebi - Not Bahçesi',
    description: 'Not Bahçesi verilerinizi nasıl silersiniz: uygulama içi silme, cihazdan kaldırma ve e-posta ile silme talebi.',
};

const SILME_ADIMLARI: { baslik: string; aciklama: string }[] = [
    {
        baslik: 'Notları cihazdan silin',
        aciklama:
            'Uygulamayı açın, silmek istediğiniz bahçeyi kartındaki üç nokta menüsünden "Bahçeyi sil" ile kaldırın. Tek tek not silmek için Liste görünümündeki üç nokta menüsünü kullanın. Notun metni cihazdan hemen kaldırılır; cihazlar arası eşitlemenin silmeyi doğru uygulayabilmesi için yalnızca kaydın kimliği ve silinme zamanı saklanır. Google Drive senkronizasyonu açıksa silme işlemi bir sonraki eşitlemede yedekten de uygulanır.',
    },
    {
        baslik: 'Tüm verileri tek adımda silin',
        aciklama:
            'Uygulamayı telefondan kaldırmak, cihazda saklanan tüm notları, ayarları ve yerel oturum bilgisini siler. Android otomatik bulut yedeklemesi kapalı olduğu için notlar sistem yedeğinde tutulmaz; kaldırmadan sonra uygulamayı yeniden kurarsanız boş bir bahçe ile başlarsınız.',
    },
    {
        baslik: 'Google Drive yedeğini silin',
        aciklama:
            'Google ile giriş yaptıysanız notlarınız kendi Drive hesabınızın uygulamaya özel gizli klasöründe (appDataFolder) durur. Bunu Drive ayarlarından "Uygulama verilerini yönet" bölümünde Not Bahçesi kaydını kaldırarak silebilirsiniz. Uygulamayı kaldırmak bu yedeği silmez.',
    },
];

export default function DataDeletionPage() {
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
                        <Trash2 size={24} />
                    </span>
                    <h1 className="text-3xl text-sand-900">Veri Silme Talebi</h1>
                </div>

                <div className="space-y-8 rounded-3xl border border-sand-200 bg-white p-8 text-sm leading-relaxed text-sand-700 shadow-card">
                    <p>
                        <strong>Son güncelleme:</strong> 28 Eylül 2026
                    </p>

                    <p>
                        Not Bahçesi notlarınızı kendi cihazınızda tutar. Aşağıdaki üç adımdan
                        herhangi biriyle verilerinizi kendiniz silebilirsiniz; ek bir talep
                        göndermeniz gerekmez.
                    </p>

                    <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-sand-900">1. Verilerinizi nasıl silersiniz</h2>
                        <ol className="space-y-3">
                            {SILME_ADIMLARI.map((adim, index) => (
                                <li key={adim.baslik} className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
                                    <p className="mb-1 font-semibold text-sand-900">
                                        {index + 1}. {adim.baslik}
                                    </p>
                                    <p className="text-sand-600">{adim.aciklama}</p>
                                </li>
                            ))}
                        </ol>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-sand-900">2. Silinen veriler</h2>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>Cihaza kaydedilmiş tüm bahçeler, ağaçlar ve not metinleri</li>
                            <li>Uygulama ayarları, yapay zekâ sağlayıcı tercihleri ve API anahtarı</li>
                            <li>Bilgisayar araçları erişim anahtarı ve bağlantı adresleri</li>
                            <li>Yerel oturum bilgisi (Google hesabıyla geldiyse e-posta, ad, profil fotoğrafı)</li>
                            <li>Kendi Drive hesabınızdaki uygulamaya özel yedek (yukarıdaki 3. adım)</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-sand-900">3. E-posta ile silme talebi</h2>
                        <p>
                            Yukarıdaki adımları uygulayamıyorsanız silme talebinizi e-posta ile
                            gönderebilirsiniz. Talebinizi aldıktan sonra en geç <strong>30 gün içinde</strong>
                            verileriniz silinir ve size bilgi verilir.
                        </p>
                        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sand-200 bg-sand-50 p-4">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-moss-100 text-moss-700">
                                <Mail size={18} />
                            </span>
                            <div className="text-sand-700">
                                <p className="font-semibold text-sand-900">candemirerx@gmail.com</p>
                                <p>Konu: <strong>Veri Silme Talebi</strong> — uygulamada kullandığınız hesabın e-posta adresini yazın.</p>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-sand-900">4. Silmenin kapsamadığı durumlar</h2>
                        <p>
                            Yapay zekâ özelliğini kullandıysanız işlenen metin, seçtiğiniz sağlayıcının
                            (Google, OpenAI, Anthropic veya kendi belirttiğiniz servis) sistemlerinde o
                            sağlayıcının saklama politikasına göre tutulabilir. Bu kayıtlar uygulamanın
                            denetiminde değildir; silme talebi için ilgili sağlayıcıya başvurmanız gerekir.
                        </p>
                        <p className="flex items-start gap-2 rounded-2xl border border-moss-200 bg-moss-50 p-4 text-moss-800">
                            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
                            <span>
                                Not Bahçesi hiçbir veriyi kendi sunucusuna kaydetmez, veri satmaz ve
                                reklam amacıyla kullanmaz.
                            </span>
                        </p>
                    </section>

                    <p className="border-t border-sand-200 pt-6 text-xs text-sand-600">
                        Bu sayfa Not Bahçesi sürüm {APP_VERSION} için geçerlidir. Ayrıntılar için{' '}
                        <Link href="/gizlilik" className="font-semibold text-clay-800 underline decoration-clay-400 underline-offset-2">
                            gizlilik politikasına
                        </Link>{' '}
                        bakabilirsiniz.
                    </p>
                </div>
            </main>
        </div>
    );
}
