import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import assert from 'node:assert/strict';
const origin = process.env.GESTURE_ORIGIN || 'http://localhost:3000';

const source = readFileSync('scripts/play-gorsel-cek.mjs', 'utf8');
const Cdp = Function(source.slice(source.indexOf('class Cdp'), source.indexOf('async function hedefAdresi')) + '\nreturn Cdp;')();
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const port = 9500 + Math.floor(Math.random()*1000);
const browser = spawn(exe, ['--headless=new','--remote-debugging-port='+port,'--user-data-dir='+join(tmpdir(),'nb-gesture-'+Date.now()),'--no-first-run','--no-default-browser-check','--disable-extensions','--disable-gpu','--hide-scrollbars','about:blank'],{stdio:'ignore',windowsHide:true});
let socket;
try {
 let target;
 for(let i=0;i<150;i++) { try { target=(await (await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(x=>x.type==='page'); if(target) break; } catch {} await wait(200); }
 if(!target) throw Error('Test tarayıcısı 30 saniye içinde açılmadı.');
 socket = new WebSocket(target.webSocketDebuggerUrl);
 await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 const c = new Cdp(socket);
 await c.gonder('Page.enable'); await c.gonder('Runtime.enable');
 await c.gonder('Emulation.setDeviceMetricsOverride',{width:430,height:932,deviceScaleFactor:2,mobile:true});
 await c.gonder('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 await c.gonder('Emulation.setFocusEmulationEnabled',{enabled:true});
 const run = async expression => { const r=await c.gonder('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true}); if(r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
 const navigate = async path => {
  await run('window.__nbEskiBelge=true');
  await c.gonder('Page.navigate',{url:origin+path});
  await wait(400);
  for(let i=0;i<150;i++){
   const hazir=await run(`!window.__nbEskiBelge && location.origin===${JSON.stringify(origin)} && document.readyState==="complete"`);
   if(hazir) return;
   await wait(200);
  }
  throw Error('Sayfa yüklenemedi: '+path);
 };
 await navigate('/');
 const date='2026-10-07T08:00:00.000Z';
 const user={id:'local-gesture-test',email:'test@yerel',user_metadata:{full_name:'Test'}};
 const garden={id:'gesture-test',name:'Düşünce bahçem',user_id:user.id,created_at:date,updated_at:date,deleted_at:null,view_state:{x:65,y:155,zoom:1}};
 const nodes=[['root',null,'Yeni fikirler\nDüşüncelerime yer açıyorum.'],['branch','root','İlk adım\nKüçük bir fikirle başla.'],['leaf','branch','Bir düşünce\nSonra geliştireceğim.'],['root2',null,'Diğer ağaç']].map(([id,parent_id,content],i)=>({id,parent_id,content,garden_id:garden.id,position_x:0,position_y:0,created_at:new Date(Date.parse(date)+i*1000).toISOString(),updated_at:date,deleted_at:null,is_expanded:true,is_pruned:false,color:null}));
 await run(`localStorage.setItem('nb-local-session-v1',${JSON.stringify(JSON.stringify({user,access_token:'test'}))});localStorage.setItem('nb-local-db-v1',${JSON.stringify(JSON.stringify({gardens:[garden],nodes}))});localStorage.setItem('nb-tuval-v1',JSON.stringify({gosterim:'organik',gezinme:'yok',onizleme:2,eylem:'hap',kart:'bahce'}));`);
 const load = async () => {
  await run(`localStorage.setItem('nb-local-db-v1',${JSON.stringify(JSON.stringify({gardens:[garden],nodes}))});`);
  await navigate('/bahce_view?id=gesture-test');
  for(let i=0;i<100;i++){ if(await run(`(()=>{const t=JSON.parse(localStorage.getItem('nb-tuval-v1'));return document.querySelectorAll('[data-yk-id]').length>=4 && !!document.querySelector('.yeni-agac--'+(t.gosterim||'organik')) && document.querySelector('[data-kart-model]')?.dataset.kartModel===(t.eylem||'hap')})()`)) return; await wait(200); }
  throw Error('Kartlar yüklenmedi');
 };
 await load();
 // Android WebView uzun basışı metin seçmeye çevirirse dokunuşu iptal ediyor ve
 // menü açılır açılmaz kapanıyor; kart içindeki metinler seçilemez olmalı.
 assert.equal(await run(`getComputedStyle(document.querySelector('[data-yk-id="branch"] p')).userSelect`),'none');
 console.log('PASS: kart metinleri seçilemez (uzun basış metin seçmeye dönüşmez)');
 await c.gonder('Browser.grantPermissions',{origin,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
 const box = async selector => run(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Hedef yok');const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom}})()`);
 const touch = (type,p) => c.gonder('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x:p.x,y:p.y}]});
 const hold = async id => { const p=await box(`[data-yk-id="${id}"]`); await touch('touchStart',p); await wait(700); assert.equal(await run('document.documentElement.hasAttribute("data-kart-menusu")'),true); return p; };
 const choose = async action => { const p=await box(`[data-kart-eylem="${action}"]`); await touch('touchMove',p); await wait(70); assert.equal(await run(`document.querySelector('[data-kart-eylem="${action}"]').classList.contains('kart-eylem--hedef')`),true); await touch('touchEnd',p); await wait(250); };
 const screenshot = async name => { const result=await c.gonder('Page.captureScreenshot',{format:'png'}); writeFileSync('tuval-tasarim/'+name,Buffer.from(result.data,'base64')); };
 const metinParlak = sel => `(()=>{const c=getComputedStyle(document.querySelector('${sel}')).color;const v=c.match(/[\\d.]+/g).slice(0,3).map(Number);const f=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)};return .2126*f(v[0])+.7152*f(v[1])+.0722*f(v[2])})()`;
 await hold('branch');
 assert.equal(await run('Array.from(document.querySelectorAll("[data-yk-id]")).filter(e=>getComputedStyle(e).visibility!=="hidden").length'),1);
 const card=await box('[data-yk-id="branch"]'); const edit=await box('[data-kart-eylem="editor"]'); const copy=await box('[data-kart-eylem="kopya"]'); const cut=await box('[data-kart-eylem="buda"]');
 console.log('ölçüm', JSON.stringify({kart:[card.left,card.right,card.w], bar:[copy.left,cut.right], copy:copy.w, cut:cut.w, edit:edit.w}));
 assert.ok(Math.abs(edit.x-card.x)<1); assert.ok(Math.abs(copy.w-cut.w)<0.6); assert.ok(Math.abs(edit.w-copy.w)<0.6); assert.ok(Math.abs((copy.left+cut.right)/2-card.x)<1);
 assert.ok(Math.abs((copy.left-card.left)-(card.right-cut.right))<0.6); assert.ok(Math.abs(card.top-edit.bottom)<=1);
 await screenshot('basili-tut-uygulama.png');
 await touch('touchMove',{x:cut.x,y:cut.y}); await wait(120); await screenshot('basili-tut-etiket.png');
 assert.equal(await run(`document.querySelector('.kart-eylem-etiket').textContent`),'Buda');
 await touch('touchCancel',card); await wait(150);
 assert.equal(await run('document.documentElement.hasAttribute("data-kart-menusu")'),false);
 console.log('PASS: dokunmatik menü, tek kart odağı, merkez/genişlik/5px boşluk, iptal');
 await hold('branch'); await choose('kopya');
 assert.equal(await run('navigator.clipboard.readText()'),'Küçük bir fikirle başla.');
 console.log('PASS: kaydırıp bırakarak not içeriğini panoya kopyalama');
 await hold('branch'); await choose('buda');
 assert.equal(await run(`JSON.parse(localStorage.getItem('nb-local-db-v1')).nodes.find(n=>n.id==='branch').is_pruned`),true);
 await hold('branch'); await choose('buda');
 console.log('PASS: kaydırıp bırakarak budama ve geri alma');
 const before=await box('[data-yk-id="branch"]');
 await touch('touchStart',before); await wait(50); await touch('touchEnd',before); await wait(200);
 assert.equal(await run('location.pathname'),'/bahce_view');
 assert.equal(await run('document.documentElement.hasAttribute("data-kart-menusu")'),true);
 assert.equal(await run('document.querySelectorAll(".kart-kose").length'),0);
 await touch('touchStart',before); await wait(500);
 await touch('touchMove',{x:before.x+35,y:before.y+45}); await wait(80); await touch('touchEnd',before); await wait(400);
 const position=await run(`JSON.parse(localStorage.getItem('nb-local-db-v1')).nodes.find(n=>n.id==='root')`);
 assert.equal(position.position_x,35); assert.equal(position.position_y,45);
 assert.equal(await run('location.pathname'),'/bahce_view');
 console.log('PASS: tek dokunuş menüyü açar; ikinci uzun basış ağacı taşır ve konumu kaydeder; köşe düğmeleri kapalı');
 await hold('branch'); await choose('alt');
 assert.equal(await run('!!document.querySelector("[role=dialog]")'),true);
 await run(`Array.from(document.querySelectorAll('[role=dialog] button')).find(b=>b.textContent.includes('Tamam')).click()`);
 await wait(500);
 assert.equal(await run(`JSON.parse(localStorage.getItem('nb-local-db-v1')).nodes.filter(n=>n.parent_id==='branch').length`),2);
 await hold('branch'); await choose('yan');
 await run(`Array.from(document.querySelectorAll('[role=dialog] button')).find(b=>b.textContent.includes('Tamam')).click()`);
 await wait(500);
 assert.equal(await run(`JSON.parse(localStorage.getItem('nb-local-db-v1')).nodes.filter(n=>n.parent_id==='root').length`),2);
 console.log('PASS: mevcut çocuğu olan kartın altına not ekleme ve yanına kardeş ekleme');
 await load();
 await hold('root'); await choose('yan');
 assert.equal(await run(`document.querySelector('[role=dialog] h3').textContent`),'Ağaç Ekle');
 await run(`Array.from(document.querySelectorAll('[role=dialog] button')).find(b=>b.textContent.includes('İptal')).click()`);
 const pan=await box('[data-yk-id="branch"]');
 await hold('root');
 const kokKart=await box('[data-yk-id="root"]'); const kokBar=await box('[data-kart-eylem="kopya"]'); const kokSon=await box('[data-kart-eylem="buda"]');
 assert.ok(Math.abs((kokBar.left-kokKart.left)-(kokKart.right-kokSon.right))<0.6);
 assert.ok(kokKart.w-kokSon.right+kokBar.left<3);
 await screenshot('basili-tut-kok.png');
 await touch('touchCancel',pan); await wait(200);
 const transform=await run('document.querySelector(".tree").style.transform');
 await touch('touchStart',pan); await touch('touchMove',{x:pan.x+25,y:pan.y+10}); await wait(40); await touch('touchEnd',pan); await wait(150);
 assert.notEqual(await run('document.querySelector(".tree").style.transform'),transform);
 assert.equal(await run('location.pathname'),'/bahce_view');
 console.log('PASS: kökün yanına ağaç işlemi ve erken kaydırmada tuval hareketi');
 await run(`localStorage.setItem('nb-tema','koyu')`);
 await load();
 await hold('branch');
 assert.ok(await run(metinParlak('[data-kart-eylem="editor"]')) < 0.2);
 const koyuKart=await box('[data-yk-id="branch"]');
 const koyuCopy=await box('[data-kart-eylem="kopya"]'); const koyuCut=await box('[data-kart-eylem="buda"]');
 assert.ok(Math.abs((koyuCopy.left-koyuKart.left)-(koyuKart.right-koyuCut.right))<0.6);
 await screenshot('basili-tut-koyu.png');
 await touch('touchCancel',koyuKart); await wait(200);
 await run(`localStorage.setItem('nb-tema','acik')`);
 await load();
 await hold('branch');
 assert.ok(await run(metinParlak('[data-kart-eylem="editor"]')) > 0.8);
 await touch('touchCancel',await box('[data-yk-id="branch"]')); await wait(200);
 console.log('PASS: koyu ve açık temada şerit yazı rengi kontrastı');
 const tap=await box('[data-yk-id="branch"]'); await touch('touchStart',tap); await wait(50); await touch('touchEnd',tap);
 await wait(250);
 assert.equal(await run('location.pathname'),'/bahce_view');
 assert.equal(await run('document.documentElement.hasAttribute("data-kart-menusu")'),true);
 await run('document.querySelector("[data-kart-eylem=editor]").click()');
 for(let i=0;i<100;i++) { if(await run('location.pathname==="/editor"')) break; await wait(200); }
 assert.equal(await run('new URL(location.href).searchParams.get("nodeId")'),'branch');
 console.log('PASS: kısa dokunuş menüyü, Düzenle düğmesi metin editörünü açıyor');

 // Uzun basarken parmak hafifçe kayarsa menü yine açılmalı; tuval yerinden oynamamalı.
 await load();
 const kaymaOncesi = await run('document.querySelector(".tree").style.transform');
 const kaymaKart = await box('[data-yk-id="branch"]');
 await touch('touchStart', kaymaKart);
 for (let i = 1; i <= 10; i++) { await touch('touchMove', { x: kaymaKart.x + i * 1.2, y: kaymaKart.y + i * 1.2 }); await wait(45); }
 await wait(150);
 assert.equal(await run('document.documentElement.hasAttribute("data-kart-menusu")'), true, 'hafif kaymada menü açılmalı');
 assert.equal(await run('document.querySelector(".tree").style.transform'), kaymaOncesi, 'hafif kaymada tuval kaymamalı');
 await touch('touchCancel', kaymaKart); await wait(180);
 console.log('PASS: parmak hafifçe kayarken basılı tutma menüsü açılıyor, tuval yerinden oynamıyor');

 // Düğmenin tam üstüne değil hemen yanına bırakmak da o düğmeyi çalıştırmalı.
 await load();
 await hold('branch');
 const kopyaDugme = await box('[data-kart-eylem="kopya"]');
 await touch('touchMove', { x: kopyaDugme.x, y: kopyaDugme.bottom + 9 }); await wait(80);
 assert.equal(await run('document.querySelector(".kart-eylem--hedef")?.dataset.kartEylem'), 'kopya');
 await touch('touchEnd', { x: kopyaDugme.x, y: kopyaDugme.bottom + 9 }); await wait(250);
 assert.equal(await run('navigator.clipboard.readText()'), 'Küçük bir fikirle başla.');
 console.log('PASS: düğmenin hemen yanına bırakınca en yakın düğme çalışıyor');

 // Taşıma iptal edilince konum değişmez ve tuval kilidi bırakılır.
 await load();
 const iptalKart=await box('[data-yk-id="branch"]');
 await touch('touchStart',iptalKart); await wait(50); await touch('touchEnd',iptalKart); await wait(100);
 await touch('touchStart',iptalKart); await wait(500);
 await touch('touchMove',{x:iptalKart.x+40,y:iptalKart.y+20}); await wait(100);
 await touch('touchCancel',iptalKart); await wait(250);
 assert.equal(await run(`JSON.parse(localStorage.getItem('nb-local-db-v1')).nodes.find(n=>n.id==='root').position_x`),0);
 assert.equal(await run('document.documentElement.hasAttribute("data-kart-menusu")'),false);
 console.log('PASS: iptal edilen taşıma konumu değiştirmez, menü kilidi temizlenir');

 // Yakınlaştırılmış tuvalde hareket gerçek ağaç koordinatlarına çevrilir.
 await load();
 await run('document.querySelector("button[aria-label=Uzaklaştır]").click()'); await wait(200);
 await run('document.querySelector("button[aria-label=Uzaklaştır]").click()'); await wait(400);
 const zoomScale=await run('new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".tree")).transform).a');
 const zoomKart=await box('[data-yk-id="branch"]');
 await touch('touchStart',zoomKart); await wait(50); await touch('touchEnd',zoomKart); await wait(100);
 await touch('touchStart',zoomKart); await wait(500);
 await touch('touchMove',{x:zoomKart.x+20,y:zoomKart.y+15}); await wait(100);
 await touch('touchEnd',{x:zoomKart.x+20,y:zoomKart.y+15}); await wait(350);
 const zoomKonum=await run(`JSON.parse(localStorage.getItem('nb-local-db-v1')).nodes.find(n=>n.id==='root')`);
 assert.equal(zoomKonum.position_x,Math.round(20/zoomScale)); assert.equal(zoomKonum.position_y,Math.round(15/zoomScale));
 console.log('PASS: taşıma tuvalin yakınlaştırma oranını hesaba katar');

 // Sol ekleme gerçekten seçilen kardeşin önüne eklemeli.
 await load(); await hold('branch'); await choose('sol');
 await run(`Array.from(document.querySelectorAll('[role=dialog] button')).find(b=>b.textContent.includes('Tamam')).click()`);
 await wait(500);
 const soldaki=await run(`JSON.parse(localStorage.getItem('nb-local-db-v1')).nodes.filter(n=>n.parent_id==='root').sort((a,b)=>a.created_at.localeCompare(b.created_at)).map(n=>n.id)`);
 assert.equal(soldaki[1],'branch');
 console.log('PASS: sol yanına ekleme sıralaması');

 // Kartı dokunup bıraktıktan sonra normal düğme dokunuşu da işlevini çalıştırır.
 const tapAt = async p => { await touch('touchStart',p); await wait(60); await touch('touchEnd',p); await wait(250); };
 const tapMenu = async action => {
  await tapAt(await box('[data-yk-id="branch"]'));
  assert.equal(await run('document.documentElement.hasAttribute("data-kart-menusu")'),true);
  await tapAt(await box(`[data-kart-eylem="${action}"]`));
 };
 await load(); await run('navigator.clipboard.writeText("önceki pano")'); await tapMenu('kopya');
 assert.equal(await run('navigator.clipboard.readText()'),'Küçük bir fikirle başla.');
 assert.equal(await run('document.documentElement.hasAttribute("data-kart-menusu")'),false);
 await tapMenu('buda');
 assert.equal(await run(`JSON.parse(localStorage.getItem('nb-local-db-v1')).nodes.find(n=>n.id==='branch').is_pruned`),true);
 await tapMenu('buda');
 assert.equal(await run(`JSON.parse(localStorage.getItem('nb-local-db-v1')).nodes.find(n=>n.id==='branch').is_pruned`),false);
 for(const action of ['sol','yan','alt']) {
  await tapMenu(action);
  assert.equal(await run('!!document.querySelector("[role=dialog]")'),true);
  await run(`Array.from(document.querySelectorAll('[role=dialog] button')).find(b=>b.textContent.includes('İptal')).click()`);
  await wait(200);
 }
 await tapMenu('editor');
 for(let i=0;i<100;i++){if(await run('location.pathname==="/editor"'))break;await wait(100);}
 assert.equal(await run('new URL(location.href).searchParams.get("nodeId")'),'branch');
 console.log('PASS: kartı dokunup bırak → düğmeye normal dokun; kopyala, buda/geri al, sol/sağ/alt ekleme ve editör çalışır');

 // Düğme konumuna başka işlev atama, devre dışı bırakma ve kalıcılık.
 await navigate('/bahce_view?id=gesture-test'); await wait(300);
 await run(`localStorage.setItem('nb-tuval-v1',JSON.stringify({...JSON.parse(localStorage.getItem('nb-tuval-v1')),dugmeler:{ustSol:'kopya',ustOrta:'editor',ustSag:'buda',sol:'sol',sag:'yok',alt:'alt',altSol:'ayarlar',altSag:'yok'}}))`);
 await load(); await hold('branch');
 assert.equal(await run('document.querySelector("[data-kart-yer=sag]")===null'),true);
 assert.equal(await run('document.querySelector("[data-kart-yer=altSol]").dataset.kartEylem'),'ayarlar');
 await choose('ayarlar'); await wait(300);
 assert.equal(await run('!!document.querySelector("[role=dialog]")'),true);
 await run(`(()=>{const s=document.querySelector('select[aria-label="Sağ kenar işlevi"]');s.value='kopya';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await wait(150);
 assert.equal(await run(`JSON.parse(localStorage.getItem('nb-tuval-v1')).dugmeler.sag`),'kopya');
 await run(`(()=>{const s=document.querySelector('select[aria-label="Sol alt köşe işlevi"]');s.value='yok';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await wait(150);
 assert.equal(await run(`JSON.parse(localStorage.getItem('nb-tuval-v1')).dugmeler.altSol`),'yok');
 await load(); await hold('branch');
 assert.equal(await run('document.querySelector("[data-kart-yer=sag]").dataset.kartEylem'),'kopya');
 assert.equal(await run('document.querySelector("[data-kart-yer=altSol]")===null'),true);
 await touch('touchCancel',await box('[data-yk-id="branch"]'));
 console.log('PASS: seçilen işlev konumunda görünür, gizlenen düğme yok, ayarlar düğmesi çalışır');

 const tercih = async values => {
  await run(`localStorage.setItem('nb-tuval-v1',JSON.stringify({gosterim:'organik',gezinme:'yok',onizleme:2,eylem:'hap',kart:'bahce',...${JSON.stringify(values)}}))`);
  await load();
 };
 for (const model of ['hap','yumusak','kapsul']) {
  await tercih({eylem:model,kullanim:'birlikte'});
  await hold('branch');
  assert.equal(await run(`document.querySelector('[data-kart-aktif="1"]').dataset.kartModel`),model);
  const kart=await box('[data-yk-id="branch"]'), alt=await box('[data-kart-yer="alt"]');
  assert.ok(alt.top-kart.bottom<10);
  await choose('buda');
  assert.equal(await run(`JSON.parse(localStorage.getItem('nb-local-db-v1')).nodes.find(n=>n.id==='branch').is_pruned`),true);
 }
 console.log('PASS: üç güncel modelin yakın hedefleri ve kaydırarak seçimi');
 await tercih({gosterim:'klasik'});
 assert.equal(await run(`!!document.querySelector('.yeni-agac--klasik')`),true);
 assert.equal(await run(`Array.from(document.querySelectorAll('.yeni-agac > svg path')).every(p=>p.getAttribute('d').includes('H') && !p.getAttribute('d').includes('C'))`),true);
 await tapMenu('kopya');
 await load();
 assert.equal(await run(`!!document.querySelector('.yeni-agac--klasik')`),true);
 console.log('PASS: Klasik düzen, köşeli bağlantılar, yeni düğmeler ve kalıcılık');
 for (const eskiYontem of ['kaydir','dokun']) {
  await tercih({kullanim:eskiYontem});
  await tapAt(await box('[data-yk-id="branch"]'));
  assert.equal(await run('!!document.querySelector("[data-kart-aktif]")'),true);
  await tapAt(await box('[data-kart-eylem="kopya"]'));
  await hold('branch'); await choose('buda');
  assert.equal(await run(`JSON.parse(localStorage.getItem('nb-local-db-v1')).nodes.find(n=>n.id==='branch').is_pruned`),true);
 }
 console.log('PASS: eski yöntem ayarları seçimleri kısıtlamaz; dokunma ve kaydırma yerleşik çalışır');
 for(const model of ['panel','yuzen']) {
  await tercih({eylem:model,kullanim:'kaydir'});
  await tapAt(await box('[data-yk-id="branch"]'));
  assert.equal(await run('document.documentElement.hasAttribute("data-kart-menusu")'),false);
  assert.equal(await run(`!!document.querySelector('#secili-${model}')`),true);
  if(model==='yuzen') await run(`document.querySelector('#secili-yuzen button').click()`);
  await tapAt(await box('#secili-buda'));
  assert.equal(await run(`JSON.parse(localStorage.getItem('nb-local-db-v1')).nodes.find(n=>n.id==='branch').is_pruned`),true);
 }
 console.log('PASS: panel ve yüzen düğme gerçek dokunuşla açılır, budama çalışır');
 await tercih({dugmeler:{ustSol:'kopya',ustOrta:'editor',ustSag:'buda',sol:'sol',sag:'yan',alt:'alt',altSol:'ayarlar',altSag:'yok'}});
 await hold('branch'); await choose('ayarlar'); await wait(200);
 for(const model of ['hap','yumusak','kapsul','panel','yuzen']) assert.equal(await run(`!!document.querySelector('#tuval-eylem-${model}')`),true);
 assert.equal(await run(`document.querySelector('[aria-label="Not düğmelerinin kullanım yöntemi"]')===null`),true);
 for (const model of ['panel','yuzen']) {
  await run(`document.querySelector('#tuval-eylem-${model}').click()`); await wait(100);
  assert.equal(await run(`document.querySelector('select[aria-label="Sağ kenar işlevi"]')===null`),true);
 }
 await run(`document.querySelector('#tuval-eylem-kapsul').click()`); await wait(150);
 assert.equal(await run(`!!document.querySelector('select[aria-label="Sağ kenar işlevi"]')`),true);
 await run(`Array.from(document.querySelectorAll('[aria-label="Düzen"] button')).find(b=>b.textContent.includes('Klasik')).click()`); await wait(150);
 assert.deepEqual(await run(`(()=>{const t=JSON.parse(localStorage.getItem('nb-tuval-v1'));return [t.gosterim,t.eylem,Object.hasOwn(t,'kullanim')]})()`),['klasik','kapsul',false]);
 await run(`document.querySelector('[aria-label="Ağaç yönetiminden geri dön"]').click()`); await wait(250);
 await navigate('/'); await load(); await wait(350); await hold('branch');
 assert.equal(await run(`document.querySelector('[data-kart-aktif="1"]').dataset.kartModel`),'kapsul');
 await screenshot('guncel-kapsul-klasik.png'); await touch('touchCancel',await box('[data-yk-id="branch"]'));
 console.log('PASS: Görünüm seçenekleri ayarlardan değişir, yenilemede korunur ve tuvale uygulanır');
} finally { socket?.close(); browser.kill(); }
