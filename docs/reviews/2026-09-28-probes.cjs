// Read-only review probes: real source, isolated in-memory storage, no provider calls.
// Run from repository root: node docs/reviews/2026-09-28-probes.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
function load(file, extra = '', context = {}, dependencies = {}) {
  const source = fs.readFileSync(file, 'utf8') + '\n' + extra;
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, console, URL, URLSearchParams, Blob, AbortController, setTimeout, clearTimeout, process: { env: { NODE_ENV: 'production' } }, require: name => {
    if (name in dependencies) return dependencies[name];
    throw new Error('Unmocked dependency: ' + name);
  }, ...context }, { filename: file, timeout: 3000 });
  return exports;
}
const data = new Map();
let failDatabaseWrite = false;
const storage = {
  getItem: k => data.get(k) ?? null,
  setItem: (k, v) => { if (failDatabaseWrite && k === 'nb-local-db-v1') throw new Error('QuotaExceededError'); data.set(k, v); },
  removeItem: k => data.delete(k),
};
const context = { window: { localStorage: storage }, localStorage: storage };
const result = (name, observed) => console.log(JSON.stringify({ name, observed }));
(async () => {
  const local = load('lib/localClient.ts', '', context);
  local.signInAsGuest();
  const garden = (await local.localClient.from('gardens').insert({ name: 'Synthetic review garden' }).select().single()).data;
  const node = (await local.localClient.from('nodes').insert({ garden_id: garden.id, content: 'old', color: '#123456', is_pruned: true }).select().single()).data;
  failDatabaseWrite = true;
  const update = await local.localClient.from('nodes').update({ content: 'new' }).eq('id', node.id);
  const persisted = (await local.localClient.from('nodes').select().eq('id', node.id).single()).data.content;
  // P1-02 düzeltmesinden sonra: kota hatası sessizce yutulmaz, hata döner ve
  // başarısız yazma mevcut veriyi bozmaz.
  assert.notEqual(update.error, null); assert.equal(persisted, 'old');
  result('quota_write', { returnedError: update.error, persisted, requested: 'new' });
  failDatabaseWrite = false;
  const deletedAt = new Date().toISOString();
  await local.localClient.from('nodes').update({ deleted_at: deletedAt }).eq('id', node.id);
  result('soft_delete_retains_content', JSON.parse(data.get('nb-local-db-v1')).nodes[0].content === 'old');
  await local.localClient.auth.signInWithGoogleProfile({ email: 'synthetic@example.test' });
  const visible = (await local.localClient.from('gardens').select()).data;
  // P1-09 düzeltmesinden sonra: misafir bahçesi yeni hesaba aktarılır, görünür kalır.
  assert.equal(visible.length, 1);
  result('guest_to_google', { visibleGardens: visible.length, storedGardens: JSON.parse(data.get('nb-local-db-v1')).gardens.length });
  const provider = load('lib/aiProvider.ts', '', context);
  storage.setItem('nb-ai-key', 'synthetic-legacy-key');
  provider.saveActiveProvider('gemini');
  provider.readProviderKey('gemini');
  provider.saveProviderKey('gemini', '');
  assert.equal(provider.readProviderKey('gemini'), 'synthetic-legacy-key');
  result('deleted_legacy_key_reappears', true);
  const drive = load('lib/driveSync.ts', 'export { chooseWinner };', context, {
    '@capacitor/core': { Capacitor: { isNativePlatform: () => false } },
    './supabaseClient': { supabase: local.localClient, isLocalBackend: true },
  });
  const winner = drive.chooseWinner(
    { id: 'n', content: 'new text', is_expanded: false, updated_at: '2026-09-28T10:00:00Z' },
    { id: 'n', content: 'old text', is_expanded: true, updated_at: '2026-09-28T10:01:00Z' });
  assert.equal(winner.content, 'old text');
  result('view_change_wins_over_text', { winningContent: winner.content });
  const calls = [];
  const api = load('app/api/spellcheck/route.ts', 'export { isPrivateHost };', {
    fetch: async (url, options) => { calls.push({ url: String(url), redirect: options.redirect ?? 'follow (default)' }); return new Response(JSON.stringify({ choices: [{ message: { content: 'mocked answer' } }] }), { status: 200 }); },
  }, { 'next/server': require('next/server'), '@/lib/aiMacro': { DEFAULT_INSTRUCTION: 'synthetic instruction' } });
  const mappedHost = new URL('http://[::ffff:127.0.0.1]').hostname;
  assert.equal(api.isPrivateHost(mappedHost), false);
  result('private_host_filter', { ordinaryLoopbackBlocked: api.isPrivateHost('127.0.0.1'), mappedLoopbackBlocked: api.isPrivateHost(mappedHost) });
  const response = await api.POST({ json: async () => ({ text: 'synthetic text', provider: 'custom', clientApiKey: 'synthetic-key', customUrl: 'https://example.test/v1', customModel: 'synthetic-model' }), headers: { get: () => null } });
  assert.equal(response.status, 200);
  result('unauthenticated_api_with_mock_provider', { status: response.status, providerCalls: calls.length, redirect: calls[0]?.redirect });
  const source = fs.readFileSync('components/editor/DataSection.tsx', 'utf8');
  const start = source.indexOf('const getNodeLevel =');
  const end = source.indexOf('// Tüm node', start);
  const cyclic = 'const data = {nodes: [{id:"a",parent_id:"b"},{id:"b",parent_id:"a"}]}; const nodeLevelCache = new Map();' + source.slice(start, end) + '\ngetNodeLevel("a");';
  let cycleError;
  try { vm.runInNewContext(ts.transpileModule(cyclic, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {}, { timeout: 1000 }); }
  catch (e) { cycleError = e.name; }
  assert.equal(cycleError, 'RangeError');
  result('import_parent_cycle', cycleError);
  console.log('All eight findings reproduced; only synthetic in-memory data used.');
})().catch(e => { console.error(e); process.exitCode = 1; });
