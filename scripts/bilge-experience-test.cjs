const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(file, mocks = {}, globals = {}) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(js, { exports: module.exports, module, require: n => n in mocks ? mocks[n] : n.endsWith('/bilgeLinks') ? load('lib/bilgeLinks.ts') : require(n), URL, console, setTimeout, clearTimeout, ...globals });
    return module.exports;
}
(async () => {
    const media = load('lib/bilgeMedia.ts');
    assert.equal(media.validBilgeImage('https://attacker.invalid/image.png'), false);
    assert.equal(media.validBilgeImage('data:image/svg+xml;base64,AAAA'), false);
    assert.equal(media.bilgePlainText('# Başlık\n**Kalın** ve [bağlantı](https://example.com)\n```js\nx()\n```'), 'Başlık\nKalın ve bağlantı\nx()\n');
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const markdown = load('components/ai/BilgeMarkdown.tsx', { 'react-markdown': (await import('react-markdown')).default, 'remark-gfm': (await import('remark-gfm')).default });
    const html = renderToStaticMarkup(React.createElement(markdown.default, { text: '# Başlık\n**Kalın**\n\n- Madde\n\n<script>alert(1)</script>\n\n[Tehlikeli](javascript:alert(1))\n\n![Takip](https://evil.invalid/pixel.png)\n\n```js\nconst x = 1\n```' }));
    assert.match(html, /<strong>Kalın<\/strong>/); assert.match(html, /<h3/); assert.match(html, /<li>Madde/); assert.match(html, /<pre/);
    assert.ok(!html.includes('<script')); assert.ok(!html.includes('javascript:')); assert.ok(!html.includes('<img')); assert.ok(!html.includes('**Kalın**'));
    console.log('OK: Markdown headings/emphasis/lists/code; raw HTML, unsafe links and tracking images disabled');
    const links = renderToStaticMarkup(React.createElement(markdown.default, { text: '[Ayarları aç](/bilge/ayarlar) [AI](/bilge/yapay-zeka) [Tehlike](/bilge/sil) [Kaynak](https://example.com/reference) https://example.com/very/long/page [Kimlik](https://user:password@example.com)', onNavigate: () => {} }));
    assert.match(links, /<button[^>]*aria-label="Ayarlar bölümünü aç"/);
    assert.match(links, /Yapay zekâ ayarları/);
    assert.ok(!links.includes('href="/bilge/sil"')); assert.ok(!links.includes('user:password'));
    assert.match(links, /href="https:\/\/example.com\/reference"/); assert.match(links, /rel="noopener noreferrer"/);
    assert.ok(!links.includes('>https://example.com/very/long/page<'));
    let navigated = '';
    const tree = markdown.default({ text: '', onNavigate: href => { navigated = href; } });
    const anchor = tree.props.children.props.components.a;
    const button = anchor({ href: '/bilge/yapay-zeka', children: 'AI' });
    assert.equal(navigated, '', 'Rendering must never navigate automatically');
    button.props.onClick(); assert.equal(navigated, '/bilge/yapay-zeka');
    assert.equal(anchor({ href: '/bilge/sil', children: 'Sil' }).type, 'span');
    console.log('OK: Allowlisted app navigation buttons, compact named/external links, invalid targets blocked');

    let spoken = 0, accepted = false;
    const store = new Map();
    const speech = load('lib/bilgeSpeech.ts', {
        '@capacitor/core': { Capacitor: { isNativePlatform: () => true }, registerPlugin: () => ({ voices: async () => ({ engines: [], voices: [{ id: 'tr-network', name: 'Türkçe', network: true }] }), speak: async () => { spoken++; }, stop: async () => {} }) }, './bilgeMedia': media
    }, { window: { confirm: () => accepted }, localStorage: { getItem: k => store.get(k), setItem: (k, v) => store.set(k, v) } });
    assert.equal(speech.readBilgeSpeech().rate, .92);
    store.set('nb-bilge-speech', '{"rate":99,"pitch":"bad"}'); assert.equal(speech.readBilgeSpeech().rate, .92); assert.equal(speech.readBilgeSpeech().pitch, .94);
    await speech.speakBilge('**Deneme**'); assert.equal(spoken, 0);
    accepted = true; await speech.speakBilge('**Deneme**'); assert.equal(spoken, 1);
    console.log('OK: TTS safe defaults, corrupt preferences, online voice explicit opt-in');

    let gardens = [], creates = 0, nodes = [], fail = false, release;
    const api = { auth: { getSession: async () => ({ data: { session: { user: { id: 'test-user' } } } }) }, from: () => {
        let inserting = false;
        const q = { select() { return q; }, eq() { return q; }, is() { return q; }, order() { return Promise.resolve({ data: gardens, error: null }); }, insert() { inserting = true; return q; }, single() { assert.ok(inserting); creates++; gardens = [{ id: 'garden-1', name: 'Bilge Ağaç' }]; return Promise.resolve({ data: gardens[0] }); } };
        return q;
    } };
    const exp = load('lib/bilgeExport.ts', {
        './supabaseClient': { supabase: api },
        './store/useStore': { useStore: { getState: () => ({ addNode: async (id, text) => { if (release) await new Promise(r => { release = r; }); if (fail) return null; const node = { id: 'node-' + nodes.length, garden_id: id, content: text }; nodes.push(node); return node; }, fetchGardens: async () => {} }) } }
    });
    await exp.exportBilgeTree('Başlık', 'İlk yanıt'); await exp.exportBilgeTree('İkinci', 'İkinci yanıt');
    assert.equal(creates, 1); assert.equal(nodes.length, 2); assert.equal(nodes[0].content, 'Başlık\nİlk yanıt');
    fail = true; await assert.rejects(() => exp.exportBilgeTree('Hata', 'Metin'), /kaydedilemedi/); assert.equal(nodes.length, 2); fail = false;
    release = true;
    const first = exp.exportBilgeTree('Eşzamanlı', 'İlk');
    await new Promise(r => setTimeout(r, 0));
    await assert.rejects(() => exp.exportBilgeTree('Eşzamanlı', 'İkinci'), /bekleyin/);
    const resume = release; release = null; resume(); await first;
    console.log('OK: Garden reuse, separate root per export, save error preserved, concurrent export blocked');
    console.log('Bilge experience tests passed. Real Samsung engines/PC pairing are not simulated as verified.');
})().catch(e => { console.error(e); process.exitCode = 1; });
