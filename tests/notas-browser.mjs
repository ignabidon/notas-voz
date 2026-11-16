// Pantalla Notas (rediseño conversacional, fase 3). Sin dependencias: Chrome del runner y CDP por WebSocket nativo.
// Solo datos ficticios. La grabación se simula con las mismas funciones que usa la captura (prepareNew + appendMachine).
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
const profile=mkdtempSync(tmpdir()+'/dictanota-notas-');
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(readFileSync(new URL('../index.html',import.meta.url)));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const chrome=spawn(process.env.CHROME_BIN||'google-chrome',['--headless','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank']);
let ws;
try {
 const endpoint=await new Promise((resolve,reject)=>{let log='';const timeout=setTimeout(()=>reject(Error('Chrome timeout: '+log)),20000);chrome.on('error',reject);chrome.stderr.on('data',d=>{log+=d;const m=log.match(/DevTools listening on (ws:\/\/\S+)/);if(m){clearTimeout(timeout);resolve(m[1]);}});});
 ws=new WebSocket(endpoint);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let id=0;const pending=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}});
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
 const {targetInfos}=await send('Target.getTargets');
 const {sessionId}=await send('Target.attachToTarget',{targetId:targetInfos.find(t=>t.type==='page').targetId,flatten:true});
 const call=(m,p={})=>send(m,p,sessionId);
 const run=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const url='http://127.0.0.1:'+server.address().port;
 const load=async()=>{await call('Page.navigate',{url});for(let i=0;i<200;i++){if(await run('document.readyState==="complete" && typeof convInit==="function" && !!convStore.data'))return;await new Promise(r=>setTimeout(r,50));}throw Error('no cargó');};
 await call('Page.enable');
 await call('Emulation.setDeviceMetricsOverride',{width:412,height:860,deviceScaleFactor:1,mobile:true});
 await call('Page.navigate',{url});
 for(let i=0;i<100;i++){if(await run('document.readyState==="complete"'))break;await new Promise(r=>setTimeout(r,50));}
 // Notas anteriores ficticias (formato viejo), una con código de ataque falso.
 const viejas=[{id:'v1',title:'Paciente ficticio P-001',text:'Sesión del lunes, texto inventado.',ts:Date.UTC(2026,10,9,13,0),tags:['prueba']},
  {id:'v2',title:'<img src=x onerror="window.__xss=1">',text:'<script>window.__xss=2</script>',ts:Date.UTC(2026,10,10,13,0),tags:[]}];
 await run('localStorage.clear();localStorage.setItem("notasvoz.gamma.v1",'+JSON.stringify(JSON.stringify(viejas))+')');
 await load();
 const prep='window.confirm=()=>true;window.prompt=()=>"Supermercado";document.querySelector(\'[data-delta-view="transcripcion"]\').click();';
 await run(prep);
 const stampRe=/^\d\d\/\d\d\/\d{4} · \d\d:\d\d$/;
 // Migración: una hoja con una burbuja por nota vieja; las originales intactas; nada se ejecuta.
 assert.equal(await run('document.querySelectorAll("#convList .conv-item").length'),2);
 assert.equal(await run('localStorage.getItem("notasvoz.gamma.v1")'),JSON.stringify(viejas));
 assert.equal(await run('window.__xss'),undefined);
 assert.equal(await run('document.querySelector("#convList").textContent.includes("<img src=x")'),true);
 assert.equal(await run('document.querySelector(\'[data-delta-view="transcripcion"] span\').textContent'),'Notas');
 // 1) Escribir sin hoja abierta → hoja nueva titulada con la fecha y hora de guardado.
 const type=t=>run('(()=>{const x=document.getElementById("text");x.value='+JSON.stringify(t)+';x.dispatchEvent(new Event("input",{bubbles:true}));return document.getElementById("convTarget").textContent})()');
 assert.match(await type('Comprar yerba ficticia.'),/se crea una hoja nueva/);
 await run('document.getElementById("save").click()');
 assert.equal(await run('document.getElementById("text").value'),'');
 assert.equal(await run('document.getElementById("convOpenView").hidden'),false);
 const title1=await run('document.getElementById("convTitle").textContent');
 assert.match(title1,stampRe);
 assert.equal(await run('document.querySelectorAll("#convBubbles .conv-bubble").length'),1);
 const stamp1=await run('document.querySelector("#convBubbles .conv-stamp").textContent');
 assert.equal(stamp1,title1);
 assert.equal(await run('JSON.parse(localStorage.getItem("notasvoz.dictanota.v2")).conversations.length'),3);
 // 2) Con la hoja abierta, escribir y guardar → se agrega ahí.
 assert.match(await type('Sumar pan.'),/se agrega a «/);
 await run('document.getElementById("save").click()');
 assert.equal(await run('document.querySelectorAll("#convBubbles .conv-bubble").length'),2);
 // 3) Captura global desde Audio con la hoja abierta → hoja nueva (no se suma a la abierta).
 await run('document.querySelector(\'[data-delta-view="grabacion"]\').click();prepareNew();appendMachine("Dictado global ficticio.");document.querySelector(\'[data-delta-view="transcripcion"]\').click();');
 assert.match(await run('document.getElementById("convTarget").textContent'),/se crea una hoja nueva/);
 await run('document.getElementById("save").click()');
 assert.equal(await run('convStore.data.conversations.length'),4);
 assert.equal(await run('convStore.data.entries.find(e=>e.text==="Dictado global ficticio.").kind'),'audio');
 // 4) Grabar dentro de una hoja abierta en Notas → se agrega ahí.
 await run('prepareNew();appendMachine("Dictado dentro de la hoja.");');
 assert.match(await run('document.getElementById("convTarget").textContent'),/se agrega a «/);
 await run('document.getElementById("save").click()');
 assert.equal(await run('document.querySelectorAll("#convBubbles .conv-bubble").length'),2);
 // 5) Renombrar y editar: el sello no cambia; queda «editado».
 await run('document.getElementById("convBack").click()');
 await run('[...document.querySelectorAll("#convList .conv-item")].find(b=>b.textContent.includes("2 mensajes")).click()');
 await run('document.getElementById("convRename").click()');
 assert.equal(await run('document.getElementById("convTitle").textContent'),'Supermercado');
 const before=await run('JSON.stringify(convStore.data.entries.map(e=>[e.id,e.savedAt]))');
 await run('[...document.querySelectorAll("#convBubbles .conv-bubble")][0].querySelector(".conv-actions button:nth-child(2)").click()');
 assert.match(await run('document.getElementById("convTarget").textContent'),/Editando/);
 await type('Comprar yerba ficticia y fideos.');
 await run('document.getElementById("save").click()');
 assert.equal(await run('JSON.stringify(convStore.data.entries.map(e=>[e.id,e.savedAt]))'),before,'editar no cambia ningún sello');
 assert.match(await run('document.querySelector("#convBubbles .conv-meta").textContent'),/editado/);
 assert.equal(await run('document.querySelector("#convBubbles .conv-text").textContent'),'Comprar yerba ficticia y fideos.');
 // 6) Mover un mensaje con Deshacer.
 const hoja=await run('convOpenId');
 await run('[...document.querySelectorAll("#convBubbles .conv-bubble")][1].querySelector(".conv-actions button:nth-child(3)").click()');
 assert.equal(await run('document.getElementById("convMoveDialog").open'),true);
 await run('document.getElementById("convMoveForm").requestSubmit()');
 assert.equal(await run('convEntriesOf(convStore.data,'+JSON.stringify(hoja)+').length'),1);
 assert.equal(await run('document.getElementById("convUndoRow").hidden'),false);
 await run('document.getElementById("convUndo").click()');
 assert.equal(await run('convEntriesOf(convStore.data,'+JSON.stringify(hoja)+').length'),2);
 assert.equal(await run('JSON.stringify(convStore.data.entries.map(e=>[e.id,e.savedAt]).sort())'),JSON.stringify(JSON.parse(before).sort()));
 // 7) Copiar todo: título y fecha de cada mensaje en línea aparte.
 const all=await run('convCopyText(convStore.data,convOpenId)');
 assert.match(all,/^Supermercado\n\n\d\d\/\d\d\/\d{4} · \d\d:\d\d\nComprar yerba ficticia y fideos\./);
 // 8) Pasar todo a otra hoja; la vacía se puede borrar.
 await run('document.getElementById("convMoveAllBtn").click()');
 await run('document.getElementById("convMoveForm").requestSubmit()');
 assert.equal(await run('convIsEmpty(convStore.data,'+JSON.stringify(hoja)+')'),true);
 assert.equal(await run('document.getElementById("convDeleteEmpty").hidden'),false);
 await run('document.getElementById("convDeleteEmpty").click()');
 assert.equal(await run('convStore.data.conversations.length'),3);
 // 9) Descartar pide confirmación y no deja nada.
 await type('Algo que no quiero guardar.');
 await run('window.confirm=()=>false;document.getElementById("convDiscard").click()');
 assert.equal(await run('document.getElementById("text").value'),'Algo que no quiero guardar.');
 await run('window.confirm=()=>true;document.getElementById("convDiscard").click()');
 assert.equal(await run('document.getElementById("text").value'),'');
 assert.equal(await run('convStore.data.entries.some(e=>e.text.includes("no quiero"))'),false);
 // 10) Recuperación automática: un mensaje sin guardar vuelve al recargar, con su destino.
 await run('document.querySelector("#convList .conv-item").click()');
 const dest=await run('convOpenId');
 await type('Pendiente de guardar.');
 await run('saveDraft()');
 await load(); await run(prep);
 assert.equal(await run('document.getElementById("text").value'),'Pendiente de guardar.');
 assert.equal(await run('convDest()'),dest);
 assert.match(await run('document.getElementById("flash").textContent'),/Guardar o Descartar/);
 assert.equal(await run('convStore.data.entries.some(e=>e.text==="Pendiente de guardar.")'),false,'sin Guardar no está en ninguna hoja');
 await run('document.getElementById("save").click()');
 assert.equal(await run('convEntriesOf(convStore.data,'+JSON.stringify(dest)+').some(e=>e.text==="Pendiente de guardar.")'),true);
 // 11) Contenido hostil se muestra como texto.
 await type('<img src=x onerror="window.__xss=3">');
 await run('document.getElementById("save").click()');
 assert.equal(await run('window.__xss'),undefined);
 assert.equal(await run('document.querySelectorAll("#convBubbles img").length'),0);
 // 12) Sin desborde horizontal en celulares chicos, con hoja abierta y en la lista.
 for(const width of [320,360,412]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:760,deviceScaleFactor:1,mobile:true});
  for(const back of [false,true]){
   if(back) await run('document.getElementById("convBack").click()');
   await run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
   assert.ok(await run('document.documentElement.scrollWidth<=window.innerWidth+1'),'desborde a '+width);
  }
  await run('document.querySelector("#convList .conv-item").click()');
 }
 // 13) Las notas viejas siguen intactas al final.
 assert.equal(await run('localStorage.getItem("notasvoz.gamma.v1")'),JSON.stringify(viejas));
 console.log('NOTAS OK: migración, hoja nueva, agregar, captura global, editar sin cambiar la fecha, mover y deshacer, copiar y pasar todo, descartar, recuperación, textos hostiles y anchos 320/360/412.');
} finally {
 try{ws?.close();}catch{} chrome.kill('SIGKILL'); server.close(); rmSync(profile,{recursive:true,force:true});
}
