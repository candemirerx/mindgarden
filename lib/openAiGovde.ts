/**
 * OpenAI uyumlu istek gövdesini sağlayıcının itirazına göre uyarlar.
 *
 * Neden gerekli: "OpenAI uyumlu" diyen sunucular aynı alanları kabul etmiyor.
 * Akıl yürüten modeller (gpt-5 / o-serisi ve bunları aktaran ağ geçitleri)
 * `temperature` kabul etmez, `max_tokens` yerine `max_completion_tokens`
 * ister; katı doğrulama yapan yerel sunucular (LM Studio, vLLM) tanımadıkları
 * `detail` ya da düşünme alanları yüzünden 400 döndürür.
 *
 * Bu yüzden 400 gelince isteği körlemesine tekrarlamak yerine sağlayıcının
 * kendi hata metnindeki alan adına bakıp yalnız o alanı çıkarıyoruz. Model,
 * mesajlar ve fotoğraf her denemede aynı kalır: sessizce metne düşmek ya da
 * başka modele geçmek yok.
 */

/** Yalnızca hızlandırma amaçlı; hiçbiri yanıtın içeriğini belirlemez. */
export const DUSUNME_ALANLARI = ['enable_thinking', 'reasoning_effort', 'chat_template_kwargs'];

export type Govde = Record<string, unknown>;

/** Gövdedeki fotoğrafın OpenAI'ye özgü `detail` alanını kaldırır. */
function detayiKaldir(govde: Govde): boolean {
    const mesajlar = govde.messages as Array<{ content?: unknown }> | undefined;
    let degisti = false;
    for (const mesaj of mesajlar ?? []) {
        if (!Array.isArray(mesaj.content)) continue;
        for (const parca of mesaj.content as Array<{ type?: string; image_url?: Record<string, unknown> }>) {
            if (parca?.type === 'image_url' && parca.image_url && 'detail' in parca.image_url) {
                parca.image_url = { url: parca.image_url.url };
                degisti = true;
            }
        }
    }
    return degisti;
}

/**
 * Bir sonraki denemenin gövdesini üretir; denenecek bir şey kalmadıysa null.
 *
 * Son çare olarak yalnız `model` ve `messages` içeren en sade gövde denenir:
 * hata metni alan adı vermeyen sunucularda tek şansımız budur.
 */
export function govdeyiUyarla(govde: Govde, hata: string, sadeDenendi: boolean): Govde | null {
    const yeni: Govde = { ...govde, messages: JSON.parse(JSON.stringify(govde.messages ?? [])) };
    let degisti = false;

    // Düşünme alanları hata hangisini söylerse söylesin birlikte çıkarılır.
    if (DUSUNME_ALANLARI.some(alan => alan in yeni)) {
        for (const alan of DUSUNME_ALANLARI) delete yeni[alan];
        degisti = true;
    }
    if (/temperature/i.test(hata) && 'temperature' in yeni) { delete yeni.temperature; degisti = true; }
    if (/top_p/i.test(hata) && 'top_p' in yeni) { delete yeni.top_p; degisti = true; }
    if (/max_completion_tokens/i.test(hata) && 'max_completion_tokens' in yeni) { delete yeni.max_completion_tokens; degisti = true; }
    else if (/max_tokens/i.test(hata) && 'max_tokens' in yeni) { yeni.max_completion_tokens = yeni.max_tokens; delete yeni.max_tokens; degisti = true; }
    if (/detail/i.test(hata) && detayiKaldir(yeni)) degisti = true;

    if (degisti) return yeni;
    if (sadeDenendi) return null;
    const sade: Govde = { model: govde.model, messages: JSON.parse(JSON.stringify(govde.messages ?? [])) };
    detayiKaldir(sade);
    return JSON.stringify(sade) === JSON.stringify(govde) ? null : sade;
}

/** En fazla kaç kez yeniden denenir. Her deneme aynı modeli ve fotoğrafı taşır. */
export const EN_FAZLA_UYARLAMA = 3;
