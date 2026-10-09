import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
const pieces = new Map(); const transfers = [];
const server = createServer(async (req, res) => {
 res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
 if(req.method==='OPTIONS'){res.end();return;}
 if(req.url==='/health'){res.end(JSON.stringify({ok:true,app:'not-bahcesi-clipboard'}));return;}
 let raw='';for await(const p of req)raw+=p;
 const input=JSON.parse(raw);
 if(input.action==='parca'){
  if(input.sira===0)pieces.set(input.id,[]);
  assert.equal(pieces.get(input.id).length,input.sira);pieces.get(input.id).push(Buffer.from(input.veri,'base64'));
 } else if(input.action==='dosyalar'){
  transfers.push({...input,bytes:input.ids.map(id=>Buffer.concat(pieces.get(id)))});
 } else assert.equal(input.action,'ping');
 res.end('{"ok":true}');
});
await new Promise(r=>server.listen(18979,'127.0.0.1',r));
const dir=mkdtempSync(join(tmpdir(),'nb-gallery-files-'));
const names=['rapor.pdf','arsiv.zip','bos.bin'];
const data=[Buffer.from('%PDF-1.7\nbyte test\x00\xff'),Buffer.from(Array.from({length:400000},(_,i)=>i%256)),Buffer.alloc(0)];
const files=names.map((n,i)=>{const p=join(dir,n);writeFileSync(p,data[i]);return p;});
const source=readFileSync('tuval-tasarim/hareket-dogrula.mjs','utf8');
const setup=source.slice(0,source.indexOf(' await load();'));
const checks=`
 const until=async x=>{for(let i=0;i<160;i++){if(await run(x))return;await wait(150);}throw Error('Not ready: '+x);};
 await run('localStorage.setItem("nb-remote-prefs-v1",JSON.stringify({connection:"pc-wifi",helperUrl:"http://127.0.0.1:18979",helperToken:"isolated-test"}))');
 await navigate('/editor?id=gesture-test&nodeId=branch');
 await until('!!document.querySelector("#studio-dosya-secici")');
 assert.equal(await run('document.querySelectorAll(".studio-galeri>button").length'),4);
 await c.gonder('DOM.enable');
 const setFiles=async selector=>{const root=await c.gonder('DOM.getDocument');const n=await c.gonder('DOM.querySelector',{nodeId:root.root.nodeId,selector});await c.gonder('DOM.setFileInputFiles',{nodeId:n.nodeId,files:${JSON.stringify(files)}});};
 await setFiles('#studio-dosya-secici');
 await until('document.querySelector("#studio-mini-galeri").textContent.includes("3")');
 await navigate('/editor?id=gesture-test&nodeId=branch');await until('document.querySelector("#studio-mini-galeri")?.textContent.includes("3")');
 await run('document.querySelector("#studio-mini-galeri").click()');
 await until('document.querySelectorAll("[data-galeri-oge]").length===3');
 const bytes=await run('new Promise((resolve,reject)=>{const q=indexedDB.open("nb-mini-galeri",1);q.onsuccess=()=>{const db=q.result;const r=db.transaction("ogeler").objectStore("ogeler").getAll();r.onsuccess=async()=>{resolve(await Promise.all(r.result.map(async o=>({ad:o.ad,tur:o.tur,bytes:Array.from(new Uint8Array(await o.veri.arrayBuffer()))}))));db.close();};r.onerror=reject;};q.onerror=reject;})');
 for(const item of bytes){assert.equal(item.tur,'dosya');assert.deepEqual(Buffer.from(item.bytes),Buffer.from(${JSON.stringify(data.map(d=>d.toString('base64')))}[${JSON.stringify(names)}.indexOf(item.ad)],'base64'));}
 await run('document.querySelector("[data-galeri-oge]").click()');await wait(100);
 assert.ok(await run('document.querySelector("[aria-label=Önizleme]").textContent.includes("Dosyayı indir")'));
 await run(${JSON.stringify('document.querySelector(\'[aria-label="Önizlemeyi kapat"]\').click()')});
 await run('document.querySelector("#galeri-tumunu-sec").click()');await wait(100);
 await run('document.querySelector("#galeri-bilgisayara").click()');await until('document.querySelector("#galeri-durum")?.textContent.includes("kaydedildi")');
 await run('document.querySelector("#galeri-pc-panosu").click()');await until('document.querySelector("#galeri-durum")?.textContent.includes("kopyalandı")');
 for(const width of [320,430]){await c.gonder('Emulation.setDeviceMetricsOverride',{width,height:932,deviceScaleFactor:1,mobile:true});await wait(100);assert.ok(await run('document.querySelector("#mini-galeri").scrollWidth<=innerWidth'));}
 await run(${JSON.stringify('document.querySelector(\'[aria-label="Seçimi kapat"]\').click()')});await wait(100);await run(${JSON.stringify('document.querySelector(\'[aria-label="Galeriyi kapat"]\').click()')});await wait(100);
 for(const width of [320,360,379,380,390,430,640]){
  await c.gonder('Emulation.setDeviceMetricsOverride',{width,height:932,deviceScaleFactor:1,mobile:true});await wait(100);
  const row=await run('(()=>{const footer=document.querySelector(".studio-footer");const buttons=Array.from(document.querySelectorAll(".studio-galeri>button")).map(b=>{const r=b.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height};});const controls=document.querySelector(".studio-footer-details").getBoundingClientRect();return {buttons,controls:{top:controls.top,bottom:controls.bottom},overflow:footer.scrollWidth>innerWidth};})()');
  assert.equal(row.overflow,false,'footer overflow at '+width);
  assert.equal(row.buttons.length,4);
  for(const b of row.buttons){assert.ok(b.width>=44&&b.height>=44);assert.ok(Math.abs((b.top+b.bottom)/2-(row.controls.top+row.controls.bottom)/2)<1,'buttons must share the bottom row at '+width);}
 }
 console.log('PASS: four editor buttons, file picker, exact binary persistence after reload, preview, PC/file clipboard transport and 320px layout');
} finally { socket?.close(); browser.kill(); }
`;
try {
 await import('data:text/javascript;base64,'+Buffer.from(setup+checks).toString('base64'));
 assert.equal(transfers.length,2);
 for(const transfer of transfers){assert.equal(transfer.action,'dosyalar');for(let i=0;i<transfer.adlar.length;i++){assert.deepEqual(transfer.bytes[i],data[names.indexOf(transfer.adlar[i])]);assert.equal(transfer.boyutlar[i],transfer.bytes[i].length);}}
 assert.deepEqual(transfers.map(t=>t.hedef),['dosya','pano']);
 console.log('PASS: multichunk PDF/ZIP/empty file preserved by both transport destinations');
} catch(error) { console.error(error.message); process.exitCode=1; } finally {server.close();}
