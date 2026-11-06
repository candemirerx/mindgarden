// Lifecycle contracts for the keyboard-aware dialog; real-device checks remain necessary.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function setup({ fullscreen = true, viewport = true, fine = false } = {}) {
    const effects = [], refs = [], events = new Map(), viewportEvents = new Map();
    const source = fs.readFileSync(path.join(__dirname, '../components/ai/AiDialog.tsx'), 'utf8');
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const button = { focus() { button.focused = true; } };
    const input = { focus() { input.focused = true; } };
    const previous = { focus() { previous.focused = true; } };
    const document = { activeElement: previous, body: { style: { overflow: 'auto' } }, addEventListener: (k, v) => events.set(k, v), removeEventListener: k => events.delete(k) };
    const visualViewport = { height: 800, offsetTop: 0, addEventListener: (k, v) => viewportEvents.set(k, v), removeEventListener: k => viewportEvents.delete(k) };
    const window = { innerHeight: 800, visualViewport: viewport ? visualViewport : null, matchMedia: () => ({ matches: fine }), addEventListener: (k, v) => events.set(k, v), removeEventListener: k => events.delete(k) };
    const module = { exports: {} };
    vm.runInNewContext(js, { exports: module.exports, module, window, document, require(name) {
        if (name === 'react') return { useEffect: f => effects.push(f), useRef: v => { const r = { current: v }; refs.push(r); return r; } };
        if (name === 'react-dom') return { createPortal: value => value };
        return require(name);
    } });
    module.exports.default({ children: null, label: 'Test', fullscreen, onClose() {} });
    refs[0].current = { style: {} };
    refs[1].current = { querySelector: selector => selector === '[data-autofocus]' ? input : button };
    return { effects, refs, events, viewportEvents, visualViewport, window, document, input, button, previous };
}

const mobile = setup();
const stopViewport = mobile.effects[0]();
assert.equal(mobile.refs[0].current.style.height, '800px');
mobile.visualViewport.height = 370;
mobile.viewportEvents.get('resize')();
assert.equal(mobile.refs[0].current.style.height, '370px', 'Keyboard height must not be subtracted twice');
mobile.visualViewport.offsetTop = 24;
mobile.viewportEvents.get('scroll')();
assert.equal(mobile.refs[0].current.style.top, '24px');
stopViewport();
assert.equal(mobile.viewportEvents.size, 0);
assert.equal(mobile.events.size, 0);
const stopFocus = mobile.effects[1]();
assert.equal(mobile.button.focused, true);
assert.equal(mobile.input.focused, undefined, 'Opening on touch must not summon the keyboard');
assert.equal(mobile.document.body.style.overflow, 'hidden');
stopFocus();
assert.equal(mobile.document.body.style.overflow, 'auto');
assert.equal(mobile.previous.focused, true);
assert.equal(mobile.events.size, 0);

const fallback = setup({ viewport: false });
fallback.effects[0]();
fallback.window.innerHeight = 420;
fallback.events.get('resize')();
assert.equal(fallback.refs[0].current.style.height, '420px');

const desktop = setup({ fine: true });
desktop.effects[1]();
assert.equal(desktop.input.focused, true);

const macro = setup({ fullscreen: false });
assert.equal(macro.effects[0](), undefined);
assert.equal(macro.viewportEvents.size, 0, 'Macro previews must retain the existing dialog sizing');
console.log('OK: viewport resize/scroll, keyboard sizing, cleanup, touch/desktop focus, fallback and macro isolation');
