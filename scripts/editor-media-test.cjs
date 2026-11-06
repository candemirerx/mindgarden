const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, globals = {}, imports = {}) {
    const module = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, require: n => n in imports ? imports[n] : require(n), setTimeout, clearTimeout, ...globals });
    return module.exports;
}
(async () => {
    let attempts = 0, revoked = 0, decodeFails = false;
    const small = 'data:image/jpeg;base64,YQ==';
    class FakeImage {
        naturalWidth = 6000; naturalHeight = 4000;
        set src(v) { if (v) queueMicrotask(() => decodeFails ? this.onerror() : this.onload()); }
    }
    const canvas = { width: 0, height: 0, getContext: () => ({ fillRect() {}, drawImage() {} }), toDataURL: () => ++attempts < 5 ? 'data:image/jpeg;base64,' + 'A'.repeat(710000) : small };
    const media = load('lib/bilgeMedia.ts', { Image: FakeImage, URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => revoked++ }, document: { createElement: () => canvas } });
    assert.equal(await media.prepareBilgeImage({ type: '', size: 12000000 }), small, 'Missing Android MIME decodes actual pixels');
    assert.equal(attempts, 5, 'High-detail photos retry local quality/dimensions until within envelope');
    assert.ok(canvas.width < 1280 && canvas.height < 1280);
    assert.equal(revoked, 1);
    await assert.rejects(media.prepareBilgeImage({ type: 'image/svg+xml', size: 100 }), /fotoğraf/);
    await assert.rejects(media.prepareBilgeImage({ type: 'image/png', size: 26000000 }), /25 MB/);
    decodeFails = true;
    await assert.rejects(media.prepareBilgeImage({ type: 'image/heic', size: 1000 }), /JPEG veya PNG/);
    assert.equal(revoked, 2, 'Object URLs released on decode failure too');
    const storage = new Map([['nb-tools-version', '3'], ['nb-tools', JSON.stringify([{ id: 'numaralandir', kind: 'numaralandir', title: 'Numaralandır', enabled: false }])]]);
    const tools = load('lib/tools.ts', { window: {}, localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) } }, { './degisim': { bildir() {} } });
    let list = tools.readTools();
    assert.equal(list.length, 6, 'Media tools plus opt-in formatting; deleted old tools not resurrected');
    assert.equal(list.find(t => t.id === 'numaralandir').enabled, false, 'Existing disabled preference kept');
    assert.equal(list[0].kind, 'bicim-cubugu', 'Formatting toggle is discoverable at the start');
    tools.saveTools(list.filter(t => t.kind !== 'cizim'));
    assert.equal(tools.readTools().some(t => t.kind === 'cizim'), false, 'Deleted new tool stays deleted');
    storage.set('nb-tools-version', '4');
    storage.set('nb-tools', JSON.stringify([{ id: 'bicim-gecisi', kind: 'bicim-gecisi', title: 'Yazı biçimi', enabled: false }]));
    list = tools.readTools();
    assert.equal(list.length, 2, 'v4 gets only formatting toggle, not deleted media tools');
    assert.equal(list[1].title, 'Biçim işaretleri', 'Old ambiguous label is clarified');
    assert.equal(list[1].enabled, false, 'Renaming does not enable a disabled tool');
    tools.saveTools(list.filter(t => t.kind !== 'bicim-cubugu'));
    assert.equal(tools.readTools().some(t => t.kind === 'bicim-cubugu'), false, 'Deleted formatting tool stays deleted too');
    const source = fs.readFileSync('app/editor/page.tsx', 'utf8');
    assert.ok(!source.includes('Düz metin / Markdown</button>'), 'No source toggle occupying document');
    assert.ok(source.includes('onMouseDown={e => e.preventDefault()}'), 'Tool clicks preserve editor caret');
    assert.ok(source.includes('imageInsertion()'));
    const sharp = require('sharp');
    await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320"><rect width="640" height="320" fill="#e9f5ed"/><text x="55" y="185" font-family="sans-serif" font-size="65" fill="#244936">Not Bahcesi</text></svg>')).png().toFile('.codex/editor-media-test.png');
    console.log('OK: Adaptive photo compression, Android MIME, decode/size errors, cleanup, v3/v4 tool migrations and caret guards; synthetic fixture ready');
})().catch(e => { console.error(e); process.exitCode = 1; });
