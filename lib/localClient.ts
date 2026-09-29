/**
 * Yerel (altyapısız) yedek istemci.
 *
 * Supabase kimlik bilgileri tanımlı olmadığında uygulamanın çalışmaya devam
 * edebilmesi için, supabase-js'in bu projede kullanılan yüzeyini taklit eder.
 * Veriler tarayıcının localStorage'ında tutulur; gerçek bir Supabase projesi
 * bağlandığında (yani .env.local doldurulduğunda) bu dosya tamamen devre dışı
 * kalır ve hiçbir kaydı okunmaz.
 *
 * Kasıtlı sınırlar:
 * - Şifre saklanmaz ve doğrulanmaz; her e-posta/şifre çifti kabul edilir.
 * - E-posta doğrulama, şifre sıfırlama ve Google OAuth yoktur.
 * - Veri yalnızca bu tarayıcıda durur, cihazlar arası eşitlenmez.
 */

import type { Garden, TreeNode } from './types';

const DB_KEY = 'nb-local-db-v1';
const SESSION_KEY = 'nb-local-session-v1';

export interface LocalUser {
    id: string;
    email: string;
    user_metadata: { full_name: string; avatar_url: string | null; provider?: string };
}

interface LocalSession {
    user: LocalUser;
    access_token: string;
}

interface LocalDatabase {
    gardens: Garden[];
    nodes: TreeNode[];
}

type Row = Record<string, unknown>;
type QueryError = { message: string } | null;

/* ------------------------------------------------------------------ */
/* Depolama                                                            */
/* ------------------------------------------------------------------ */

function storage(): Storage | null {
    if (typeof window === 'undefined') return null;
    try {
        return window.localStorage;
    } catch {
        // Gizli sekmede veya çerezler kapalıyken localStorage erişilemez olabilir.
        return null;
    }
}

function readDatabase(): LocalDatabase {
    const store = storage();
    if (!store) return { gardens: [], nodes: [] };
    try {
        const raw = store.getItem(DB_KEY);
        if (!raw) return { gardens: [], nodes: [] };
        const parsed = JSON.parse(raw) as Partial<LocalDatabase>;
        const db: LocalDatabase = {
            gardens: Array.isArray(parsed.gardens) ? parsed.gardens : [],
            nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
        };

        // Eski sürümlerde user_id yazılmamış bahçeleri ilk aktif kullanıcıya
        // bir kez bağla. Böylece aynı cihazdaki sonraki hesaplar bu veriyi göremez.
        const userId = activeUserId();
        if (userId) {
            let migrated = false;
            db.gardens = db.gardens.map((garden) => {
                if (garden.user_id) return garden;
                migrated = true;
                return { ...garden, user_id: userId };
            });
            if (migrated) {
                try {
                    writeDatabase(db);
                } catch {
                    // Göç yazılamadı; okuma yine de sürer.
                }
            }
        }

        return db;
    } catch {
        // Bozuk JSON: sessizce boş veritabanı gibi davranıp üzerine yazmak yerine
        // içeriği karantinaya alırız.
        try {
            const raw = storage()?.getItem(DB_KEY);
            if (raw) karantinayaAl(raw);
        } catch {
            // Okunamıyorsa yapılacak bir şey yok.
        }
        return { gardens: [], nodes: [] };
    }
}

function writeDatabase(db: LocalDatabase): void {
    const store = storage();
    if (!store) throw new Error('Yerel depolama kullanılamıyor.');
    try {
        store.setItem(DB_KEY, JSON.stringify(db));
    } catch (error) {
        // Kota dolu ya da depolama erişimi engelli. Bu bir başarısızlıktır ve
        // çağırana bildirilmelidir; eskiden sessizce yutulduğu için kullanıcı
        // kaydettiğini sanıyordu.
        throw new Error(
            'Kayıt cihaza yazılamadı: ' +
                (error instanceof Error ? error.message : 'bilinmeyen depolama hatası'),
        );
    }
}

/** Bozuk yerel veri ayrıldığında kullanıcıya gösterilebilecek uyarı. */
let localVeriUyarisi: string | null = null;

export function localDataWarning(): string | null {
    return localVeriUyarisi;
}

/**
 * Okunamayan yerel veriyi silmek yerine ayrı bir anahtara taşır; böylece
 * kullanıcı verisi kurtarılabilir kalır ve üzerine sessizce yazılmaz.
 */
function karantinayaAl(raw: string): void {
    const store = storage();
    if (store) {
        try {
            store.setItem(DB_KEY + '-bozuk-' + Date.now(), raw);
        } catch {
            // Yer yoksa karantina kopyası yazılamaz; asıl kayıt zaten bozuk.
        }
    }
    localVeriUyarisi =
        'Yerel veri dosyası okunamadı; bozuk kopya ayrı olarak saklandı. ' +
        'Notlarınız görünmüyorsa uygulamayı kapatıp destek ile iletişime geçin.';
}

/* ------------------------------------------------------------------ */
/* Oturum                                                             */
/* ------------------------------------------------------------------ */

let listeners: Array<(event: string, session: LocalSession | null) => void> = [];

export function readLocalSession(): LocalSession | null {
    const store = storage();
    if (!store) return null;
    try {
        const raw = store.getItem(SESSION_KEY);
        return raw ? (JSON.parse(raw) as LocalSession) : null;
    } catch {
        return null;
    }
}

function writeLocalSession(session: LocalSession | null): void {
    const store = storage();
    if (!store) return;
    try {
        if (session) store.setItem(SESSION_KEY, JSON.stringify(session));
        else store.removeItem(SESSION_KEY);
    } catch {
        // yoksay
    }
}

function emit(event: string, session: LocalSession | null): void {
    for (const listener of listeners) listener(event, session);
}

export function clearLocalData(): void {
    const store = storage();
    if (!store) return;
    try {
        store.removeItem(DB_KEY);
        store.removeItem(SESSION_KEY);
    } catch {
        // yoksay
    }
}

/* ------------------------------------------------------------------ */
/* Yardımcılar                                                        */
/* ------------------------------------------------------------------ */

function createId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `local-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

/** Aynı e-posta her zaman aynı kullanıcı kimliğini üretir. */
function userIdFor(email: string): string {
    let hash = 5381;
    for (let i = 0; i < email.length; i += 1) {
        hash = ((hash << 5) + hash + email.charCodeAt(i)) >>> 0;
    }
    return `local-${hash.toString(16)}`;
}

function buildUser(email: string): LocalUser {
    const name = email.split('@')[0] || 'Kullanıcı';
    return {
        id: userIdFor(email),
        email,
        user_metadata: { full_name: name, avatar_url: null },
    };
}

function activeUserId(): string | null {
    return readLocalSession()?.user.id ?? null;
}

/** Şifresiz yerel girişte kullanılan sabit misafir kimliği. */
export const GUEST_EMAIL = 'misafir@yerel';

/**
 * Şifre sormadan yerel oturum açar.
 *
 * Supabase altyapısı bağlı değilken kullanıcının uygulamayı hemen
 * kullanabilmesi için. Aynı kimliği kullandığı için misafir olarak
 * oluşturulan bahçeler sonraki girişlerde de yerinde durur.
 */
export function signInAsGuest(): LocalSession {
    const session: LocalSession = {
        user: {
            id: userIdFor(GUEST_EMAIL),
            email: GUEST_EMAIL,
            user_metadata: { full_name: 'Misafir Bahçıvan', avatar_url: null },
        },
        access_token: createId(),
    };
    writeLocalSession(session);
    emit('SIGNED_IN', session);
    return session;
}

/** Bulut modundaki RLS davranışını taklit eder: herkes yalnızca kendi verisini görür. */
type AktarimOzeti = { bahce: number; not: number };

/**
 * Misafir oturumunda oluşturulan bahçeleri, hesaba geçişte yeni sahibe aktarır.
 *
 * Yalnızca bu cihazdaki misafir kayıtları taşınır; başka bir hesabın verisi
 * asla birleştirilmez. Yazma tek geçişte yapılır: yazma başarısız olursa veri
 * değişmemiş kalır ve çağıran taraf girişi iptal edip kullanıcıya haber verir.
 * Böylece "giriş yapınca notlarım kayboldu" durumu oluşmaz.
 */
function misafirVerisiniAktar(yeniKullaniciId: string): AktarimOzeti {
    const onceki = readLocalSession();
    const misafirId = userIdFor(GUEST_EMAIL);

    // Yalnızca misafirden gerçek bir hesaba geçişte taşıma yapılır.
    if (!onceki || onceki.user.id !== misafirId || yeniKullaniciId === misafirId) {
        return { bahce: 0, not: 0 };
    }

    const db = readDatabase();
    const tasinacak = db.gardens.filter((garden) => garden.user_id === misafirId);
    if (tasinacak.length === 0) return { bahce: 0, not: 0 };

    const idler = new Set(tasinacak.map((garden) => garden.id));
    const notSayisi = db.nodes.filter((node) => idler.has(String(node.garden_id ?? ''))).length;

    writeDatabase({
        gardens: db.gardens.map((garden) =>
            garden.user_id === misafirId ? { ...garden, user_id: yeniKullaniciId } : garden
        ),
        nodes: db.nodes,
    });

    return { bahce: tasinacak.length, not: notSayisi };
}

/** Aktarım başarısız olduğunda giriş iptal edilir ve kullanıcıya açıkça söylenir. */
function aktarimHatasi(hata: unknown): { message: string } {
    return {
        message:
            'Misafir notlarınız hesaba aktarılamadı, bu yüzden giriş yapılmadı. ' +
            'Notlarınız silinmedi; tekrar deneyebilirsiniz. ' +
            (hata instanceof Error ? `(${hata.message})` : ''),
    };
}

/** Bulut modundaki RLS davranışını taklit eder: herkes yalnızca kendi verisini görür. */
function scopeForTable(table: Table, rows: Row[], db: LocalDatabase): Row[] {
    const userId = activeUserId();
    if (!userId) return [];

    const ownedGardenIds = new Set(
        db.gardens
            .filter((garden) => garden.user_id === userId)
            .map((garden) => garden.id),
    );

    if (table === 'gardens') {
        return rows.filter((row) => row.user_id === userId);
    }

    return rows.filter((row) => ownedGardenIds.has(String(row.garden_id ?? '')));
}

/* ------------------------------------------------------------------ */
/* Sorgu kurucusu                                                     */
/* ------------------------------------------------------------------ */

type Table = 'gardens' | 'nodes';
type Action = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

interface QueryResult {
    data: unknown;
    error: QueryError;
}

/**
 * supabase-js zincirlerini (`from().select().eq().order()`) karşılayan asgari
 * sorgu kurucusu. Thenable olduğu için `await` ile doğrudan çalışır.
 */
class LocalQuery implements PromiseLike<QueryResult> {
    private readonly table: Table;
    private readonly action: Action;
    private readonly payload?: Row | Row[];
    private filters: Array<(row: Row) => boolean> = [];
    private ordering: { column: string; ascending: boolean } | null = null;
    private wantsSingle = false;
    private wantsReturning = false;

    constructor(table: Table, action: Action, payload?: Row | Row[]) {
        this.table = table;
        this.action = action;
        this.payload = payload;
    }

    select(): this {
        this.wantsReturning = true;
        return this;
    }

    eq(column: string, value: unknown): this {
        this.filters.push((row) => row[column] === value);
        return this;
    }

    in(column: string, values: unknown[]): this {
        this.filters.push((row) => values.includes(row[column]));
        return this;
    }

    is(column: string, value: unknown): this {
        this.filters.push((row) => {
            if (value === null) return row[column] === null || row[column] === undefined;
            return row[column] === value;
        });
        return this;
    }

    order(column: string, options?: { ascending?: boolean }): this {
        this.ordering = { column, ascending: options?.ascending !== false };
        return this;
    }

    limit(count: number): this {
        void count;
        return this;
    }

    single(): this {
        this.wantsSingle = true;
        this.wantsReturning = true;
        return this;
    }

    abortSignal(): this {
        // Yerel işlemler anlıktır, iptal edilecek bir şey yok.
        return this;
    }

    then<TResult1 = QueryResult, TResult2 = never>(
        onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
        return Promise.resolve()
            .then(() => this.execute())
            .then(onfulfilled, onrejected);
    }

    private matchingRows(): Row[] {
        const db = readDatabase();
        const rows = db[this.table] as unknown as Row[];
        return scopeForTable(this.table, rows, db).filter((row) =>
            this.filters.every((filter) => filter(row)),
        );
    }

    private sorted(rows: Row[]): Row[] {
        if (!this.ordering) return rows;
        const { column, ascending } = this.ordering;
        return [...rows].sort((a, b) => {
            const left = String(a[column] ?? '');
            const right = String(b[column] ?? '');
            if (left === right) return 0;
            return (left < right ? -1 : 1) * (ascending ? 1 : -1);
        });
    }

    private execute(): QueryResult {
        try {
            switch (this.action) {
                case 'select':
                    return this.runSelect();
                case 'insert':
                    return this.runInsert();
                case 'upsert':
                    return this.runUpsert();
                case 'update':
                    return this.runUpdate();
                case 'delete':
                    return this.runDelete();
                default:
                    return { data: null, error: { message: 'Desteklenmeyen işlem' } };
            }
        } catch (error) {
            return {
                data: null,
                error: { message: error instanceof Error ? error.message : 'Yerel veri hatası' },
            };
        }
    }

    private runSelect(): QueryResult {
        const rows = this.sorted(this.matchingRows());
        if (this.wantsSingle) {
            return rows.length > 0
                ? { data: rows[0], error: null }
                : { data: null, error: null };
        }
        return { data: rows, error: null };
    }

    private runInsert(): QueryResult {
        const incoming = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
        const db = readDatabase();
        const inserted: Row[] = [];

        for (const row of incoming) {
            const now = new Date().toISOString();
            const record: Row = {
                id: createId(),
                created_at: now,
                updated_at: now,
                deleted_at: null,
                ...row,
            };
            if (this.table === 'gardens') {
                record.user_id = record.user_id ?? activeUserId() ?? undefined;
                db.gardens.push(record as unknown as Garden);
            } else {
                const ownedGardenIds = new Set(
                    db.gardens
                        .filter((garden) => garden.user_id === activeUserId())
                        .map((garden) => garden.id),
                );
                if (!ownedGardenIds.has(String(record.garden_id ?? ''))) {
                    throw new Error('Bu bahçeye not ekleme yetkiniz yok');
                }
                record.is_expanded = record.is_expanded ?? true;
                record.is_pruned = record.is_pruned ?? false;
                db.nodes.push(record as unknown as TreeNode);
            }
            inserted.push(record);
        }

        writeDatabase(db);
        if (!this.wantsReturning) return { data: null, error: null };
        return { data: this.wantsSingle ? inserted[0] ?? null : inserted, error: null };
    }

    private runUpdate(): QueryResult {
        const patch = (Array.isArray(this.payload) ? this.payload[0] : this.payload) ?? {};
        const db = readDatabase();
        const collection = (this.table === 'gardens' ? db.gardens : db.nodes) as unknown as Row[];
        const scope = scopeForTable(this.table, collection, db);
        const targets = new Set(scope.filter((row) => this.filters.every((f) => f(row))).map((row) => row.id));

        for (const row of collection) {
            if (!targets.has(row.id)) continue;
            Object.assign(row, patch);
            if (patch.updated_at === undefined) {
                row.updated_at = new Date().toISOString();
            }
            if (row.deleted_at) temizleSilinenIcerik(row);
        }

        writeDatabase(db);
        return { data: null, error: null };
    }

    private runUpsert(): QueryResult {
        const incoming = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
        const db = readDatabase();
        const key = this.table === 'gardens' ? 'gardens' : 'nodes';
        const collection = db[key] as unknown as Row[];
        const scopedIds = new Set(scopeForTable(this.table, collection, db).map((row) => row.id));
        const byId = new Map(collection.map((row) => [row.id, row]));
        const userId = activeUserId();
        const ownedGardenIds = new Set(
            db.gardens.filter((garden) => garden.user_id === userId).map((garden) => garden.id),
        );

        for (const row of incoming) {
            if (!row.id || !userId) continue;
            const now = new Date().toISOString();
            const existing = byId.get(row.id);

            if (this.table === 'gardens') {
                const incomingOwner = row.user_id;
                if (incomingOwner !== undefined && incomingOwner !== userId) continue;
            } else if (!ownedGardenIds.has(String(row.garden_id ?? ''))) {
                continue;
            }

            if (existing) {
                if (!scopedIds.has(row.id)) continue;
                Object.assign(existing, row);
                existing.updated_at = existing.updated_at ?? existing.created_at ?? now;
                if (existing.deleted_at) temizleSilinenIcerik(existing);
            } else {
                const record: Row = {
                    created_at: now,
                    updated_at: row.updated_at ?? row.created_at ?? now,
                    deleted_at: null,
                    ...row,
                };
                if (this.table === 'gardens') {
                    record.user_id = userId;
                    ownedGardenIds.add(String(record.id));
                } else {
                    record.is_expanded = record.is_expanded ?? true;
                    record.is_pruned = record.is_pruned ?? false;
                }
                collection.push(record);
                byId.set(record.id, record);
                scopedIds.add(record.id);
            }
        }

        writeDatabase(db);
        return { data: null, error: null };
    }

    private runDelete(): QueryResult {
        const db = readDatabase();
        const key = this.table === 'gardens' ? 'gardens' : 'nodes';
        const collection = db[key] as unknown as Row[];
        const scope = scopeForTable(this.table, collection, db);
        const doomed = new Set(scope.filter((row) => this.filters.every((f) => f(row))).map((row) => row.id));

        db[key] = collection.filter((row) => !doomed.has(row.id)) as never;
        writeDatabase(db);
        return { data: null, error: null };
    }
}

function from(table: Table): LocalQuery {
    return new LocalQuery(table, 'select');
}

/**
 * Silinen kaydın not içeriği cihazda tutulmaz.
 *
 * Eşitleme yalnızca tombstone (kimlik + silme damgası) taşır; yerel kayıtta da
 * metin bırakmak, kullanıcıya verilen "veri silindi" açıklamasıyla çelişirdi.
 */
function temizleSilinenIcerik(row: Row): void {
    for (const alan of ['title', 'content', 'name']) {
        if (alan in row) row[alan] = null;
    }
}

/* ------------------------------------------------------------------ */
/* Genel istemci                                                      */
/* ------------------------------------------------------------------ */

const UNSUPPORTED_GOOGLE =
    'Supabase altyapısı bağlı değil. Yerel modda e-posta ile giriş yapabilirsiniz.';

export const localClient = {
    auth: {
        async getSession() {
            return { data: { session: readLocalSession() }, error: null };
        },

        onAuthStateChange(callback: (event: string, session: LocalSession | null) => void) {
            listeners.push(callback);
            // supabase-js gibi açılışta mevcut durumu bildir.
            Promise.resolve().then(() => callback('INITIAL_SESSION', readLocalSession()));
            return {
                data: {
                    subscription: {
                        unsubscribe() {
                            listeners = listeners.filter((item) => item !== callback);
                        },
                    },
                },
            };
        },

        async signInWithPassword({ email, password }: { email: string; password: string }) {
            if (!email || !password) {
                return { data: { session: null, user: null }, error: { message: 'E-posta ve şifre gerekli' } };
            }
            const user = buildUser(email);
            let aktarim: AktarimOzeti;
            try {
                aktarim = misafirVerisiniAktar(user.id);
            } catch (hata) {
                return { data: { session: null, user: null }, error: aktarimHatasi(hata) };
            }
            const session: LocalSession = { user, access_token: createId() };
            writeLocalSession(session);
            emit('SIGNED_IN', session);
            return { data: { session, user: session.user, aktarim }, error: null };
        },

        async signUp({ email, password }: { email: string; password: string }) {
            if (!email || !password) {
                return { data: { session: null, user: null }, error: { message: 'E-posta ve şifre gerekli' } };
            }
            // Yerel modda e-posta doğrulaması yok; kayıt doğrudan oturum açar.
            const user = buildUser(email);
            let aktarim: AktarimOzeti;
            try {
                aktarim = misafirVerisiniAktar(user.id);
            } catch (hata) {
                return { data: { session: null, user: null }, error: aktarimHatasi(hata) };
            }
            const session: LocalSession = { user, access_token: createId() };
            writeLocalSession(session);
            emit('SIGNED_IN', session);
            return { data: { session, user: session.user, aktarim }, error: null };
        },

        async signOut() {
            writeLocalSession(null);
            emit('SIGNED_OUT', null);
            return { error: null };
        },

        async signInWithOAuth() {
            return { data: { url: null, provider: null }, error: { message: UNSUPPORTED_GOOGLE } };
        },

        /**
         * Google profiliyle (Supabase'siz) yerel oturum açar.
         * driveSync'teki Google girişi bu metodu kullanır; aynı e-posta
         * her cihazda aynı kullanıcı kimliğini üretir.
         */
        async signInWithGoogleProfile(profile: {
            email: string;
            name?: string | null;
            avatarUrl?: string | null;
        }) {
            if (!profile.email) {
                return { data: { session: null, user: null }, error: { message: 'Google profili okunamadı' } };
            }
            const kullaniciId = userIdFor(profile.email.toLowerCase());
            let aktarim: AktarimOzeti;
            try {
                aktarim = misafirVerisiniAktar(kullaniciId);
            } catch (hata) {
                return { data: { session: null, user: null }, error: aktarimHatasi(hata) };
            }
            const session: LocalSession = {
                user: {
                    id: kullaniciId,
                    email: profile.email,
                    user_metadata: {
                        full_name: profile.name || profile.email.split('@')[0],
                        avatar_url: profile.avatarUrl ?? null,
                        provider: 'google',
                    },
                },
                access_token: createId(),
            };
            writeLocalSession(session);
            emit('SIGNED_IN', session);
            return { data: { session, user: session.user, aktarim }, error: null };
        },

        async exchangeCodeForSession() {
            return { data: { session: null }, error: { message: UNSUPPORTED_GOOGLE } };
        },
    },

    from(table: Table) {
        return {
            select: () => new LocalQuery(table, 'select').select(),
            insert: (rows: Row | Row[]) => new LocalQuery(table, 'insert', rows),
            update: (patch: Row) => new LocalQuery(table, 'update', patch),
            upsert: (rows: Row | Row[]) => new LocalQuery(table, 'upsert', rows),
            delete: () => new LocalQuery(table, 'delete'),
        };
    },
};
