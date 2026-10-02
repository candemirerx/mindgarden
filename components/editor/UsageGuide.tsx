'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import {
    BookOpen,
    ChevronDown,
    ChevronRight,
    Cloud,
    Database,
    HelpCircle,
    Layers,
    ListTree,
    Monitor,
    PenLine,
    Sparkles,
    TreePine,
    type LucideIcon,
} from 'lucide-react';
import { SettingsHint, SettingsSection, cx } from '@/components/ui/settings';
import type { SettingsSectionId } from './SettingsHome';

/**
 * Ayarlar içindeki kullanım kılavuzu.
 *
 * Uzun bir metin yerine konulara ayrılmış açılır paneller kullanılır; böylece
 * telefonda tek elle gezinirken ekran kalabalıklaşmaz. Konu metinlerinde
 * **kalın** yazımı, metinParcalari ile kalın metne çevrilir.
 */

interface UsageGuideProps {
    /** Kılavuzdan ilgili ayar bölümüne geçmek için. */
    onNavigate?: (id: SettingsSectionId) => void;
}

interface Konu {
    id: string;
    icon: LucideIcon;
    title: string;
    description: string;
    adimlar: string[];
    /** Adımların altında önerilecek ayar bölümü. */
    ayarId?: SettingsSectionId;
    ayarEtiketi?: string;
}

const HIZLI_BASLANGIC = [
    'Ana ekranda **Yeni Bahçe** düğmesine dokunun ve bahçeye bir ad verin.',
    'Bahçe kartından **Liste** veya **Tuval** görünümünü açın.',
    'Yazmaya başlayın; **Oto** açıkken değişiklikler kendiliğinden kaydedilir.',
];

const KONULAR: Konu[] = [
    {
        id: 'bahce',
        icon: TreePine,
        title: 'Bahçe oluşturma ve kartlar',
        description: 'Her bahçe bir konu başlığıdır.',
        adimlar: [
            '**Yeni Bahçe** ile yeni bir bahçe açın; oluşturduğunuz bahçe listenin en başında görünür.',
            'Kartın başlığına dokunmak son kullandığınız görünümü açar.',
            '**Liste** notları hiyerarşik liste hâlinde, **Tuval** ise görsel ağaç olarak gösterir.',
            'Karttaki üç nokta menüsünden bahçeyi **yeniden adlandırabilir** veya **silebilirsiniz**.',
        ],
    },
    {
        id: 'liste',
        icon: ListTree,
        title: 'Liste görünümü',
        description: 'Notları hiyerarşik liste hâlinde yönetin.',
        adimlar: [
            '**Yeni Ağaç** ile en üst seviyede bir not açın.',
            'Bir notun üç nokta menüsünden **Yeni dal ekle** ya da **Yeni yaprak ekle** ile altına not ekleyin.',
            'Aynı menüde **Tam editörde aç**, **Yeniden adlandır**, **Dal rengi** ve **Sil** seçenekleri bulunur.',
            '**Dal rengi** ile konu başlıklarını görsel olarak ayırın; renkler cihazda saklanır ve yedeklemeyle taşınır.',
            'Üstteki arama kutusuyla aradığınız nota hızlıca ulaşın.',
        ],
    },
    {
        id: 'tuval',
        icon: Layers,
        title: 'Tuval görünümü',
        description: 'Notlarınızı dallarıyla birlikte görsel ağaç olarak gezin.',
        adimlar: [
            '**İki parmakla** yakınlaştırıp uzaklaştırın, **parmağınızla sürükleyerek** gezinin.',
            'Bir düğüme dokununca üstünde eylem menüsü açılır; boş alana dokunmak menüleri kapatır.',
            'Menüden tam editörü açabilir, başlığı kopyalayabilir, yeni dal ekleyebilir ve düğüm tipini değiştirebilirsiniz.',
            '**Ağaç yönetimi** düğmesiyle tüm ağaçları toplu açıp kapatabilirsiniz.',
        ],
    },
    {
        id: 'editor',
        icon: PenLine,
        title: 'Metin editörü',
        description: 'Notunuzu yazın, biçimlendirin ve dışa aktarın.',
        adimlar: [
            'Başlık ve içerik alanlarına yazın; **Oto** açıkken kaydetmeniz gerekmez.',
            'Otomatik kaydetme kapalıysa **Kaydet** düğmesini kendiniz basmalısınız.',
            'Üst şeritten geri dönebilir, içeriği kopyalayabilir ve **PDF** ya da **Word** olarak dışa aktarabilirsiniz.',
            'Editörün sağ üstündeki dişli simgesi bu ayarları editörden açar.',
            '**Araçlar** ve **Yapay zekâ** satırları varsayılan olarak kapalıdır; istediğinizi **Ayarlar → Düzenleme araçları** bölümünden açabilirsiniz.',
        ],
    },
    {
        id: 'ai',
        icon: Sparkles,
        title: 'Yapay zekâ ve makrolar',
        description: 'İmla, özet ve çeviri gibi hazır komutları kullanın.',
        adimlar: [
            '**Ayarlar → Yapay zekâ** içinde **Bulut** ve **Yerel** sekmeleri bulunur. Sekme değiştirmek kullanılan motoru değiştirmez; ilgili sağlayıcıyı veya modeli ayrıca etkinleştirin.',
            'Android’de yerel model için Hugging Face’ten LiteRT-LM uyumlu **.litertlm** veya MediaPipe uyumlu **.task / .bin** dosyasını indirin. Uygulamada **Dosya seç → Etkinleştir** adımlarını izleyin. **Modeli dene** ile yanıtı kontrol edebilirsiniz.',
            'Yapay zekâ satırı varsayılan olarak kapalıdır: dişli simgesinden **Ayarlar → Düzenleme araçları** bölümünü açıp "Yapay zekâ bölümünü editörde göster" anahtarını açın.',
            'Editörde **AI** etiketinin yanındaki makro kutusuna dokunun (örn. **Özetle**, **İmla Düzelt**).',
            'Metnin yalnızca bir bölümünü seçtiyseniz yapay zekâ sadece o bölümü işler.',
            'Gelen cevabı **Onayla** ile kalıcı hâle getirin, **Geri Al** ile vazgeçin.',
            'Makroları kapatıp açabilir, kendi görev metninizi yazabilirsiniz.',
        ],
        ayarId: 'models',
        ayarEtiketi: 'Yapay zekâ ayarlarını aç',
    },
    {
        id: 'sync',
        icon: Cloud,
        title: 'Yedekleme ve senkronizasyon',
        description: 'Notlarınızı cihazlarınız arasında taşıyın.',
        adimlar: [
            "Google ile giriş yapın; yedekler Drive'ın uygulamaya özel gizli klasöründe tutulur.",
            "**Drive ile Senkron** yedekle bu cihazı güvenle birleştirir, **Drive'a Yedekle** cihazdaki her şeyi yazar.",
            '**Otomatik Senkron** açıkken değişiklikler kendiliğinden yedeklenir.',
            'Notların güncel kalması için her cihazda aynı Google hesabını kullanın.',
        ],
        ayarId: 'sync',
        ayarEtiketi: 'Yedekleme ve senkronizasyon ayarlarını aç',
    },
    {
        id: 'veri',
        icon: Database,
        title: 'Veri yönetimi',
        description: 'Yedek alın, geri yükleyin, dışa aktarın.',
        adimlar: [
            '**Dışa Aktar** ile bahçelerinizi **JSON**, **HTML** veya **PDF** olarak kaydedin; tek bir notu **Word** olarak editörden indirebilirsiniz.',
            '**İçe Aktar** ile daha önce aldığınız JSON yedeğini geri yükleyin.',
            'Cihaz değiştirirken Drive kullanmadan yedek almak için bu bölümü kullanın.',
        ],
        ayarId: 'data',
        ayarEtiketi: 'Veri yönetimi ayarlarını aç',
    },
    {
        id: 'bilgisayar',
        icon: Monitor,
        title: 'Bilgisayarla birlikte çalışma',
        description: 'Telefon ile bilgisayar arasında bağlantı kurun.',
        adimlar: [
            '**Windows bilgisayarda (tek seferlik):** proje klasöründeki scripts klasörünü açın ve **pc_yardimcisi_baslat.cmd** dosyasına çift tıklayın. Açılan pencere açık kalsın; kapatmak için Ctrl+C.',
            'Windows yönetici izni sorarsa **Evet** deyin. Bu izin güvenlik duvarına yalnız TCP 8765 kapısını (Özel ağ) ekler; bu kural olmadan telefon bilgisayara bağlanamaz.',
            'Program açılırken bilgisayarın adresi ve erişim anahtarı **panonuza kopyalanır**; elle yazmanız gerekmez.',
            'Telefonda **Ayarlar → Bilgisayar bağlantısı** bölümünü açın, **Doğrudan PC** yolunu seçin; **Tek satır bağlantı bilgisi** alanına yapıştırıp **Yapıştır ve uygula** düğmesine dokunun.',
            '**PC bağlantısını dene** ile bağlantıyı, **Pano aktarımını dene** ile panoya gönderimi sınayın. Deneme metnini bilgisayarda Ctrl+V ile yapıştırabilirsiniz.',
            'Telefon ve bilgisayar aynı güvenilen Wi‑Fi ağında olmalı; Windows Güvenlik Duvarı sorarsa yalnız **Özel ağ** izni verin.',
            'Bağlantı kurulduğunda editördeki fare, klavye, Köprü Yaz, Köprü Dikte ve pano düğmeleri çalışır; hangilerinin görüneceğini Ayarlar → Düzenleme araçları bölümünden seçersiniz.',
            '**Köprü Dikte** konuşurken yazar: sözünüz cümle sonunu beklemeden bilgisayarda görünür, yanlış tanınan kelime düzeltilir. İstemezseniz Ayarlar → Bilgisayar bağlantısı bölümündeki **Köprü Dikte\'de konuşurken anında yaz** tercihini kapatın.',
        ],
        ayarId: 'remote',
        ayarEtiketi: 'Bilgisayar bağlantısı ayarlarını aç',
    },
];

const SSS: Array<{ soru: string; cevap: string }> = [
    {
        soru: 'Notlarım kaybolur mu?',
        cevap: "Yerel modda veriler yalnızca bu cihazda tutulur; uygulamayı kaldırırsanız silinir. Google ile giriş yapıp otomatik senkronizasyonu açarsanız Drive'da yedeklenir.",
    },
    {
        soru: 'İnternet olmadan çalışır mı?',
        cevap: 'Evet. Notlar cihazda tutulur; yalnızca Drive senkronizasyonu ve yapay zekâ internet ister.',
    },
    {
        soru: 'Telefon ve bilgisayarda aynı notları görebilir miyim?',
        cevap: 'İki cihazda da aynı Google hesabıyla giriş yapıp otomatik senkronizasyonu açın. Notlar birleştirilir; çakışmada en son değiştirilen sürüm geçerli olur.',
    },
    {
        soru: 'Yapay zekâ hata veriyor, ne yapmalıyım?',
        cevap: 'Hata mesajı sağlayıcının yanıtını gösterir. Sık sebepler: geçersiz API anahtarı, yanlış model adı veya kota ya da bakiye yetersizliği.',
    },
    {
        soru: 'Yapay zekâ kullanmak zorunda mıyım?',
        cevap: 'Hayır. Sağlayıcı tanımlamazsanız makro kutuları çalışmaz; uygulamanın diğer tüm özellikleri normal çalışır.',
    },
    {
        soru: 'Bir dalın rengini nasıl değiştiririm?',
        cevap: 'Liste görünümünde notun üç nokta menüsüne dokunup **Dal rengi** seçeneğine basın; renk sırayla değişir ve kaydedilir.',
    },
    {
        soru: 'Ayarları nereden açarım?',
        cevap: 'Ana ekranın sol üstündeki ağaç simgesi ayarları tam ekran açar. Editörün sağ üstündeki dişli simgesi de aynı ekranı açar.',
    },
    {
        soru: 'PC yardımcısı nedir, neyi kurar?',
        cevap: 'Yardımcı, bilgisayarda açık kalan küçük bir alıcıdır: telefondan gelen yazı, fare ve pano isteklerini Windows\'a uygular. Kurulum gerektirmez, Windows\'un kendi PowerShell\'iyle çalışır ve uygulamanın bir parçası değildir. Bilgisayarı kapattığınızda kapanır; yeni oturumda masaüstündeki **Not Bahçesi PC Yardımcısı** kısayolundan yeniden açmanız yeterlidir.',
    },
    {
        soru: 'Başka bir bilgisayarda da kullanabilir miyim?',
        cevap: 'Evet. O bilgisayarda aynı yardımcıyı açın, pencerenin kopyaladığı **adres|anahtar** satırını telefonunuzda Ayarlar → Bilgisayar bağlantısı bölümüne yapıştırıp **Yapıştır ve uygula** düğmesine dokunun. Telefonda yeniden kurulum gerekmez; satır yapıştırıldığı anda yeni bilgisayar kullanılır.',
    },
];

/** **kalın** işaretlerini kalın metne çevirir. */
function metinParcalari(metin: string): ReactNode[] {
    return metin.split('**').map((parca, index) =>
        index % 2 === 1 ? (
            <strong key={index} className="font-semibold text-sand-900">
                {parca}
            </strong>
        ) : (
            parca
        )
    );
}

export default function UsageGuide({ onNavigate }: UsageGuideProps) {
    const [acikKonu, setAcikKonu] = useState<string | null>('bahce');
    const baseId = useId();

    return (
        <div className="space-y-5">
            <SettingsSection
                icon={BookOpen}
                title="Kısa yoldan başlangıç"
                description="İlk notunuzu üç adımda oluşturun."
            >
                <ol className="space-y-2.5">
                    {HIZLI_BASLANGIC.map((adim, index) => (
                        <li key={adim} className="flex gap-3 text-sm leading-relaxed text-sand-700">
                            <span
                                aria-hidden="true"
                                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-moss-100 text-xs font-semibold text-moss-700"
                            >
                                {index + 1}
                            </span>
                            <span className="min-w-0">{metinParcalari(adim)}</span>
                        </li>
                    ))}
                </ol>
            </SettingsSection>

            <div className="space-y-2.5">
                <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-sand-600">Konular</h3>
                {KONULAR.map((konu) => {
                    const isOpen = acikKonu === konu.id;
                    const panelId = baseId + '-' + konu.id;
                    const Ikon = konu.icon;

                    return (
                        <div key={konu.id} className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-soft">
                            <button
                                type="button"
                                onClick={() => setAcikKonu(isOpen ? null : konu.id)}
                                aria-expanded={isOpen}
                                aria-controls={panelId}
                                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-moss-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-moss-500"
                            >
                                <span
                                    aria-hidden="true"
                                    className={cx(
                                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                                        isOpen ? 'bg-moss-600 text-white' : 'bg-moss-100 text-moss-700'
                                    )}
                                >
                                    <Ikon size={17} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold leading-5 text-sand-900">{konu.title}</span>
                                    <span className="mt-0.5 block text-xs leading-relaxed text-sand-600">{konu.description}</span>
                                </span>
                                <ChevronDown
                                    size={18}
                                    aria-hidden="true"
                                    className={cx('shrink-0 text-sand-600 transition-transform duration-200', isOpen && 'rotate-180')}
                                />
                            </button>
                            {isOpen && (
                                <div id={panelId} className="border-t border-sand-100 px-4 py-4">
                                    <ol className="space-y-3">
                                        {konu.adimlar.map((adim, index) => (
                                            <li key={adim} className="flex gap-3 text-sm leading-relaxed text-sand-700">
                                                <span
                                                    aria-hidden="true"
                                                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sand-100 text-xs font-semibold text-sand-600"
                                                >
                                                    {index + 1}
                                                </span>
                                                <span className="min-w-0">{metinParcalari(adim)}</span>
                                            </li>
                                        ))}
                                    </ol>
                                    {konu.ayarId && onNavigate && (
                                        <button
                                            type="button"
                                            onClick={() => onNavigate(konu.ayarId as SettingsSectionId)}
                                            className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-moss-50 px-3.5 text-sm font-semibold text-moss-800 transition-colors hover:bg-moss-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-500 focus-visible:ring-offset-1"
                                        >
                                            {konu.ayarEtiketi || 'İlgili ayarları aç'}
                                            <ChevronRight size={16} aria-hidden="true" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="space-y-2.5">
                <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-sand-600">Sık sorulan sorular</h3>
                {SSS.map(({ soru, cevap }) => (
                    <details key={soru} className="group overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-soft">
                        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm font-semibold text-sand-900 transition-colors hover:bg-moss-50/60 [&::-webkit-details-marker]:hidden">
                            <HelpCircle size={17} className="shrink-0 text-moss-700" aria-hidden="true" />
                            <span className="min-w-0 flex-1">{soru}</span>
                            <ChevronDown
                                size={17}
                                aria-hidden="true"
                                className="shrink-0 text-sand-600 transition-transform duration-200 group-open:rotate-180"
                            />
                        </summary>
                        <p className="border-t border-sand-100 px-4 py-3.5 text-sm leading-relaxed text-sand-700">{cevap}</p>
                    </details>
                ))}
            </div>

            <SettingsHint>
                Ayarlarda yaptığınız değişiklikler anında kaydedilir; ayrıca bir Kaydet düğmesi yoktur.
            </SettingsHint>
        </div>
    );
}
