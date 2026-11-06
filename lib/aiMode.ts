import { bildir } from './degisim';
import { providerHazir, readActiveProvider } from './aiProvider';

export type AiMode = 'hosted' | 'personal';

/** Eski kullanıcıların çalışan kişisel/yerel ayarlarını değiştirme. */
export function readAiMode(): AiMode {
    if (typeof window === 'undefined') return 'hosted';
    const saved = localStorage.getItem('nb-ai-mode');
    if (saved === 'hosted' || saved === 'personal') return saved;
    return providerHazir(readActiveProvider()) ? 'personal' : 'hosted';
}

export function saveAiMode(mode: AiMode): void {
    localStorage.setItem('nb-ai-mode', mode);
    bildir('ai-tercih');
}

/** İlk bulut sohbet mesajından önce açık paylaşım onayı; cihaz içi modelde aktarım yok. */
export function aiChatPaylasimOnayi(): boolean {
    const mode = readAiMode(), provider = readActiveProvider();
    if (mode === 'personal' && provider === 'local') return true;
    const scope = mode === 'hosted' ? 'hosted' : 'personal:' + provider;
    try { if (localStorage.getItem('nb-ai-chat-consent-v1') === scope) return true; } catch { /* tekrar onay sorulur */ }
    const accepted = window.confirm('Göndereceğiniz mesaj ve yanıt için gerekli son sohbet mesajları, seçili bulut yapay zekâ sağlayıcısına iletilecek. Hazır AI istekleri Not Bahçesi sunucusundan geçer. Notlarınız kendiliğinden paylaşılmaz. AI yanılabilir; hassas bilgi veya anahtar göndermeyin. Devam edilsin mi?');
    if (accepted) { try { localStorage.setItem('nb-ai-chat-consent-v1', scope); } catch { /* yalnız bu istek için geçerli */ } }
    return accepted;
}

export function aiHazir(): boolean {
    return readAiMode() === 'hosted' || providerHazir(readActiveProvider());
}

/** İlk bulut makrosundan önce veri paylaşımını açıkça sor. Metin saklanmaz. */
export function aiPaylasimOnayi(): boolean {
    if (readAiMode() === 'personal' && readActiveProvider() === 'local') return true;
    if (localStorage.getItem('nb-ai-text-consent-v1') === 'yes') return true;
    const kabul = window.confirm('Seçtiğiniz not metni ve makro komutu, işlenmek üzere seçili yapay zekâ sağlayıcısına gönderilecek. Hazır AI kullanıyorsanız istek Not Bahçesi sunucusundan geçer ve ortak kullanım hakkından düşer. Devam edilsin mi?');
    if (kabul) localStorage.setItem('nb-ai-text-consent-v1', 'yes');
    return kabul;
}
