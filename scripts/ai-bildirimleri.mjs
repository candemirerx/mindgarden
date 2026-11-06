/** Yalnız geliştiricinin terminalinde çalıştırın. Sırlar yazdırılmaz.
 * node --env-file=.env.production.local scripts/ai-bildirimleri.mjs
 * ... --resolve UUID veya --delete UUID (sadece açıkça seçilen kayıt).
 */
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
if (!url?.startsWith('https://') || !token) throw new Error('Redis ortam ayarları gerekli.');
async function redis(command) {
    const r = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(command), redirect: 'error', signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error('Bildirim deposuna erişilemedi.');
    const j = await r.json(); if (j.error) throw new Error('Depo işlemi başarısız.'); return j.result;
}
const [action, id] = process.argv.slice(2);
if (action) {
    if (!['--resolve', '--delete'].includes(action) || !/^[a-f0-9-]{36}$/.test(id || '')) throw new Error('Geçerli işlem ve bildirim UUID gerekli.');
    if (action === '--delete') {
        await redis(['EVAL', "redis.call('DEL', KEYS[1]); redis.call('ZREM', KEYS[2], ARGV[1]); return 1", '2', 'nb:reports:item:' + id, 'nb:reports:index', id]);
    } else {
        await redis(['EVAL', "local s=redis.call('GET', KEYS[1]); if not s then return 0 end; local r=cjson.decode(s); r.status='reviewed'; redis.call('SET', KEYS[1], cjson.encode(r), 'KEEPTTL'); return 1", '1', 'nb:reports:item:' + id]);
    }
    console.log('İşlem tamamlandı:', action, id);
} else {
    const ids = await redis(['ZREVRANGE', 'nb:reports:index', '0', '99']);
    for (const id of ids || []) {
        const value = await redis(['GET', 'nb:reports:item:' + id]);
        if (value) console.log(JSON.stringify(JSON.parse(value))); // Kullanıcı içeriği; genel günlüklere taşımayın.
    }
    console.log('Son 100 kayıt sorgulandı. İçeriği üçüncü kişilerle paylaşmayın.');
}
