/** Explicit navigation allowlist: model text cannot execute application actions. */
export const BILGE_DESTINATIONS = {
    '/bilge/ayarlar': { label: 'Ayarlar', section: 'home' },
    '/bilge/sohbet-ayarlari': { label: 'Bilge Ağaç ayarları', panel: 'settings' },
    '/bilge/yapay-zeka': { label: 'Yapay zekâ ayarları', section: 'models' },
    '/bilge/makrolar': { label: 'AI makroları', section: 'macros' },
    '/bilge/gorunum': { label: 'Görünüm', section: 'gorunum' },
    '/bilge/tuval': { label: 'Tuval ayarları', section: 'tuval' },
    '/bilge/bilgisayar': { label: 'Bilgisayar bağlantısı', section: 'remote' },
    '/bilge/bilgisayar-araclari': { label: 'Bilgisayar araçları', section: 'pcAraclari' },
    '/bilge/kisayollar': { label: 'Kısayollar', section: 'kisayollar' },
    '/bilge/yedekleme': { label: 'Yedekleme', section: 'sync' },
    '/bilge/veri': { label: 'Veri yönetimi', section: 'data' },
    '/bilge/hesap': { label: 'Hesap ve giriş', section: 'account' },
    '/bilge/kilavuz': { label: 'Kullanım kılavuzu', section: 'usage' },
    '/bilge/deneme': { label: 'Deneme ağacı', route: '/editor?deneme=hepsi' },
    '/bilge/bahceler': { label: 'Bahçelerim', route: '/' },
} as const;
export type BilgeDestination = keyof typeof BILGE_DESTINATIONS;
export function bilgeDestination(href: string) {
    return Object.prototype.hasOwnProperty.call(BILGE_DESTINATIONS, href) ? BILGE_DESTINATIONS[href as BilgeDestination] : null;
}
export function bilgeWebUrl(href: string): URL | null {
    try {
        const url = new URL(href);
        return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url : null;
    } catch { return null; }
}
export const BILGE_LINK_INSTRUCTION = `Yönlendirmeleri kısa etiketli Markdown bağlantılarıyla ver; uzun URL yazma.
Uygulama içi konumlar (bunlar yalnız kullanıcı tıklarsa açılan gezinme düğmeleridir):
${Object.entries(BILGE_DESTINATIONS).map(([url, target]) => `[${target.label}](${url})`).join(', ')}.
Örneğin: Model seçmek için [Yapay zekâ ayarları](/bilge/yapay-zeka), ses ve yanıt uzunluğu için [Bilge Ağaç ayarları](/bilge/sohbet-ayarlari) bölümünü açabilirsin.
Yalnız bu listede var olan uygulama hedeflerini kullan; bahçe/kart kimliği veya işlem bağlantısı uydurma.
Genel sorularda yararlı olduğunda bilinen güvenilir web sitelerine [Kısa kaynak adı](https://...) biçiminde bağlantı ver. Kaynağı açıp doğruladığını söyleme; internette arama yaptığını veya güncel bilgiyi doğruladığını iddia etme. Bilmediğin sayfa adresini uydurma.`;
