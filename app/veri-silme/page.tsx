import { ArrowLeft, Mail, ShieldCheck, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { GIZLILIK_ADRESI } from '@/lib/yasalBaglantilar';

export const metadata = {
    title: 'Veri Silme Talebi - Not Bahçesi',
    description: 'Not Bahçesi verilerinizi nasıl silersiniz: uygulama içi silme, cihazdan kaldırma, Drive yedeği ve e-posta ile silme talebi.',
};

const SILME_ADIMLARI: { baslik: string; aciklama: string }[] = [
    {
        baslik: 'Tek tek silme',
        aciklama:
            'Bir bahçeyi kartındaki üç nokta menüsünden "Bahçeyi sil" ile, tek bir notu Liste görünümündeki üç nokta menüsünden silebilirsin. Not metni cihazdan hemen silinir. Cihazlar arası eşitleme silme işlemini doğru uygulayabilsin diye yalnızca kaydın kimliği ve silinme zamanı tutulur. Drive yedeklemesi açıksa silme bir sonraki eşitlemede yedeğe de yansır.',
    },
    {
        baslik: 'Cihazdaki her şeyi silme',
        aciklama:
            "Uygulamayı kaldırdığında ya da Android Ayarlar > Uygulamalar > Not Bahçesi > Depolama > Verileri temizle yaptığında cihazdaki tüm notlar, ayarlar, API anahtarı, galeri görselleri ve yerel oturum bilgisi silinir. Android'in otomatik bulut yedeklemesi kapalı olduğu için bunların kopyası sistem yedeğinde kalmaz.",
    },
    {
        baslik: 'Google Drive yedeğini silme',
        aciklama:
            'Bilgisayarda drive.google.com > Ayarlar (dişli simgesi) > Uygulamaları yönet > Not Bahçesi > Seçenekler > "Gizli uygulama verilerini sil" adımlarını izle. Uygulamanın Google hesabına erişimini de https://myaccount.google.com/permissions adresinden kaldırabilirsin. Uygulamayı kaldırmak Drive yedeğini kendiliğinden silmez.',
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
                        <strong>Yürürlük:</strong> 25 Ekim 2026 · <strong>İletişim:</strong> candemirerx@gmail.com ·{' '}
                        <strong>Paket:</strong> com.notbahcesi.app
                    </p>

                    <p>
                        Not Bahçesi&apos;nin kendi sunucusunda senin adına tutulan bir hesap ya da not yoktur. Verilerin
                        yalnızca iki yerde durur: cihazında ve Google ile giriş yaptıysan kendi Google Drive hesabındaki
                        gizli uygulama klasöründe. İkisini de kendin silebilirsin; istersen e-postayla da talep
                        gönderebilirsin.
                    </p>

                    <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-sand-900">A) Kendin silmek için</h2>
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
                        <h2 className="text-lg font-semibold text-sand-900">B) E-postayla talep göndermek için</h2>
                        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sand-200 bg-sand-50 p-4">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-moss-100 text-moss-700">
                                <Mail size={18} />
                            </span>
                            <div className="text-sand-700">
                                <p className="font-semibold text-sand-900">candemirerx@gmail.com</p>
                                <p>
                                    Konu: <strong>Veri silme talebi – Not Bahçesi</strong>. Uygulamada kullandığın Google
                                    hesabının e-posta adresini yaz.
                                </p>
                            </div>
                        </div>
                        <p>
                            Talebin en geç <strong>30 gün içinde</strong> yanıtlanır. Not Bahçesi&apos;nin sunucusunda senin
                            notların tutulmadığı için cihazındaki ve Drive&apos;ındaki verileri bizim uzaktan silmemiz
                            teknik olarak mümkün değildir. E-postanla gelen talepte, kendi tarafımızda (örneğin bu e-posta
                            yazışmasında) bulunan bilgilerin silinir ve yukarıdaki adımlarda sana yardımcı olunur.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-sand-900">Silinenler</h2>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>Cihazındaki bahçeler, ağaçlar ve not metinleri</li>
                            <li>Ayarlar, yapay zekâ tercihlerin ve API anahtarın</li>
                            <li>Bilgisayar araçlarının bağlantı adresleri ve erişim anahtarı</li>
                            <li>Mini galeri görselleri ve dosyaları</li>
                            <li>Yerel oturum bilgisi (e-posta, ad, profil fotoğrafı bağlantısı)</li>
                            <li>Drive&apos;ındaki gizli uygulama klasöründe duran not yedeği (notbahcesi-backup.json) ve galeri dosyaları</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-sand-900">Saklananlar</h2>
                        <p>
                            Not Bahçesi&apos;nin kendi tarafında saklanan bir kayıt kalmaz. Yapay zekâ özelliğini bulut
                            sağlayıcıyla kullandıysan işlenen metin, o sağlayıcının (Google, OpenAI, Anthropic veya kendi
                            seçtiğin servis) kendi saklama kurallarına göre tutulabilir; bunun için doğrudan ilgili
                            sağlayıcıya başvurman gerekir. Vercel&apos;in kısa süreli teknik erişim kayıtları Vercel&apos;in
                            kendi saklama süresine göre kendiliğinden silinir.
                        </p>
                        <p className="flex items-start gap-2 rounded-2xl border border-moss-200 bg-moss-50 p-4 text-moss-800">
                            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
                            <span>Not Bahçesi notlarını kendi sunucusuna kaydetmez, veri satmaz ve reklam amacıyla kullanmaz.</span>
                        </p>
                    </section>

                    <p className="border-t border-sand-200 pt-6 text-xs text-sand-600">
                        Ayrıntılar için{' '}
                        <a href={GIZLILIK_ADRESI} className="font-semibold text-clay-800 underline decoration-clay-400 underline-offset-2">
                            gizlilik politikasına
                        </a>{' '}
                        bakabilirsin.
                    </p>
                </div>
            </main>
        </div>
    );
}
