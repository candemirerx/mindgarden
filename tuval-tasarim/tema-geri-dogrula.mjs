import { readFileSync } from 'node:fs';

// İzole yerel bahçe ve dokunmatik CDP kurulumu ortak hareket testinden alınır.
const source = readFileSync('tuval-tasarim/hareket-dogrula.mjs', 'utf8');
const setup = source.slice(0, source.indexOf(" await hold('branch');"));
const checks = `
 const openSettings = async () => {
  await run("document.querySelector('button[aria-label=\\"Tuval ve ağaç ayarları\\"]').click()");
  await wait(200);
 };
 await run("localStorage.removeItem('nb-tuval-v1'); localStorage.setItem('nb-tema','acik')");
 await navigate('/'); await navigate('/bahce_view?id=gesture-test'); await wait(700);
 assert.equal(await run("!!document.querySelector('.yeni-agac--klasik')"),true);
 await openSettings();
 assert.equal(await run("document.querySelector('#tuval-eylem-hap').getAttribute('aria-checked')"),'true');
 assert.equal(await run("document.querySelector('#tuval-kart-bahce').getAttribute('aria-checked')"),'true');
 assert.equal(await run("document.querySelector('[aria-label=\\"Tasarımı seçilen tema\\"]')===null"),true);
 assert.equal(await run("!!document.querySelector('[data-geri-yonetir]')"),true);
 await run("document.querySelector('#tuval-kart-sade').click()"); await wait(100);
 assert.equal(await run("JSON.parse(localStorage.getItem('nb-tuval-v1')).kart"),'sade');
 assert.equal(await run("JSON.parse(localStorage.getItem('nb-tuval-v1')).kartKoyu"),'bahce');
 await c.gonder('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await c.gonder('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await wait(200);
 assert.equal(await run("location.pathname"),'/bahce_view');
 assert.equal(await run("document.querySelector('#tuval-ayarlari')===null"),true);
 console.log('PASS: varsayılan Klasik/Bahçe/Bitişik, tema ayırıcı yok; Escape tuvale döner');
 await run("localStorage.setItem('nb-tema','koyu')");
 await navigate('/'); await load();
 await openSettings();
 assert.equal(await run("document.documentElement.classList.contains('dark')"),true);
 assert.equal(await run("document.querySelector('#tuval-kart-bahce').getAttribute('aria-checked')"),'true');
 await run("document.querySelector('#tuval-kart-renkli').click()"); await wait(100);
 assert.equal(await run("JSON.parse(localStorage.getItem('nb-tuval-v1')).kart"),'sade');
 assert.equal(await run("JSON.parse(localStorage.getItem('nb-tuval-v1')).kartKoyu"),'renkli');
 await run("document.querySelector('[aria-label=\\"Ağaç yönetiminden geri dön\\"]').click()"); await wait(200);
 assert.equal(await run("location.pathname"),'/bahce_view');
 assert.equal(await run("new URL(location.href).searchParams.get('id')"),'gesture-test');
 assert.equal(await run("document.querySelector('#tuval-ayarlari')===null"),true);
 console.log('PASS: koyu modeller otomatik gelir, yalnız etkin temaya kaydedilir; geri oku aynı tuvali açar');
 await run("localStorage.setItem('nb-tema','acik')");
 await navigate('/'); await load(); await openSettings();
 assert.equal(await run("document.querySelector('#tuval-kart-sade').getAttribute('aria-checked')"),'true');
 console.log('PASS: açık temaya dönünce önceki açık kart seçimi korunur');
} finally { socket?.close(); browser.kill(); }
`;
try { await import('data:text/javascript;base64,' + Buffer.from(setup + checks).toString('base64')); }
catch (error) { console.error(error.message); process.exitCode = 1; }
