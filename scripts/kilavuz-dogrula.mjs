import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Mevcut izole Chrome/CDP kurulumu; kullanıcının cihaz verilerine dokunmaz.
const source = readFileSync('tuval-tasarim/hareket-dogrula.mjs', 'utf8');
const setup = source.slice(0, source.indexOf(' await load();'));
const { SEVIYELER, SSS } = await import(pathToFileURL(process.cwd() + '/lib/kilavuzIcerik.ts').href);
const config = readFileSync('lib/config.ts', 'utf8');
const version = /APP_VERSION\s*=\s*'([^']+)'/.exec(config)[1];
const checks = `
 const levels = ${JSON.stringify(SEVIYELER)};
 const faq = ${JSON.stringify(SSS)};
 const until = async expression => {
  for(let i=0;i<100;i++){if(await run(expression))return;await wait(100);}
  throw Error('Ekran hazır olmadı: '+expression);
 };
 const click = async text => {
  await run('(()=>{const b=Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes('+JSON.stringify(text)+'));if(!b)throw Error("Düğme yok: "+'+JSON.stringify(text)+');b.click()})()');
  await wait(150);
 };
 const openGuide = async () => {
  await navigate('/');
  const selector = JSON.stringify('button[aria-label="Ayarları aç"]');
  await until('!!document.querySelector('+selector+')');
  await run('document.querySelector('+selector+').click()');
  await until('Array.from(document.querySelectorAll("button")).some(b=>b.textContent.includes("Kullanım kılavuzu"))');
  await click('Kullanım kılavuzu');
  await until('!!document.querySelector("#kilavuz-seviye-baslangic")');
 };
 await run('localStorage.setItem("nb-kilavuz-ilerleme-v1",JSON.stringify(["b-fikir"]));localStorage.setItem("nb-kilavuz-seviye-v1",JSON.stringify("temel"))');
 await openGuide();
 assert.equal(await run('document.querySelector("#kilavuz-seviye-temel").getAttribute("aria-selected")'),'true');
 assert.ok(await run('document.body.textContent.includes("Güncel kılavuz · ${version}")'));
 for(const level of levels){
  await run('document.querySelector("#kilavuz-seviye-'+level.id+'").click()');await wait(100);
  for(const lesson of level.dersler){
   await click(lesson.title);
   const text = await run('document.querySelector("[role=tabpanel]").textContent');
   for(const step of lesson.adimlar) assert.ok(text.includes(step.replaceAll('**','')),lesson.id+' adımı ekranda eksik');
   if(lesson.ipucu) assert.ok(text.includes(lesson.ipucu.replaceAll('**','')));
  }
 }
 console.log('PASS: beş seviyenin 32 dersi ve adımları mobil ekranda açılıyor');
 await run('document.querySelector("#kilavuz-seviye-baslangic").click()');await click('Deneme ağacında araçları deneyin');await click('Öğrendim');
 assert.deepEqual(await run('JSON.parse(localStorage.getItem("nb-kilavuz-ilerleme-v1"))'),['b-fikir','b-deneme']);
 await openGuide();await click('Deneme ağacında araçları deneyin');
 assert.ok(await run('document.querySelector("[role=tabpanel]").textContent.includes("Öğrenildi")'));
 console.log('PASS: eski ilerleme korunuyor; yeni ders işareti yeniden açılışta hatırlanıyor');
 await run('document.querySelector("#kilavuz-seviye-ileri").click()');await click('Otomatik bağlantı ve bağlantı sınaması');await click('Bağlantı ayarlarını aç');
 await until('document.body.textContent.includes("Açılışta otomatik bağlan")');
 assert.equal(await run('document.querySelector("#kilavuz-seviye-ileri")===null'),true);
 console.log('PASS: yeni bağlantı dersi doğru ayar bölümüne geçiyor');
 await openGuide();
 const body=await run('document.body.textContent');
 for(const item of faq) assert.ok(body.includes(item.soru));
 const doc=readFileSync('play-store-paketi/belgeler/02-kullanim-kilavuzu.md','utf8');
 const html=readFileSync('play-store-paketi/belgeler/02-kullanim-kilavuzu.html','utf8');
 assert.ok(doc.includes('**Sürüm:** ${version}'));assert.ok(html.includes('${version}'));
 for(const level of levels)for(const lesson of level.dersler)for(const step of lesson.adimlar)assert.ok(doc.includes(step));
 for(const item of faq)assert.ok(doc.includes(item.cevap));
 console.log('PASS: SSS, uygulama ve dağıtım kılavuzu aynı sürümü ve içeriği gösteriyor');
} finally { socket?.close(); browser.kill(); }
`;
try { await import('data:text/javascript;base64,' + Buffer.from(setup + checks).toString('base64')); }
catch (error) { console.error(error.message); process.exitCode = 1; }
