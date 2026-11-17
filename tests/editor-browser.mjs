// Sin dependencias: Chrome del runner y CDP por WebSocket nativo de Node 22.
// Datos ficticios; estados de captura y teclado simulados, sin micrófono físico.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
const profile=mkdtempSync(tmpdir()+'/dictanota-ui-');
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
 await call('Page.enable');
 await call('Page.navigate',{url:'http://127.0.0.1:'+server.address().port});
 for(let i=0;i<100;i++){if(await run('document.readyState==="complete" && typeof updateDockRecording === "function"'))break;await new Promise(r=>setTimeout(r,50));}
 const settle=()=>run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');

 // Datos ficticios y estados de captura/teclado simulados: no micrófono ni inferencia real.
 const waitLayout=async()=>{await settle();await new Promise(r=>setTimeout(r,200));};
 const viewport=async(w,h)=>{await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await call('Emulation.setTouchEmulationEnabled',{enabled:true});await waitLayout();};
 const view=async(v)=>{await run(`document.querySelector('[data-delta-view="${v}"]').click()`);await waitLayout();};
 const type=async(t)=>{await run(`document.getElementById('text').value=${JSON.stringify(t)};document.getElementById('text').dispatchEvent(new Event('input',{bubbles:true}));`);await waitLayout();};
 const capture=async(name)=>{if(!process.env.SCREENSHOT_DIR)return;mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});writeFileSync(process.env.SCREENSHOT_DIR+'/'+name+'.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));};
 const geometry=()=>run(`(()=>{const rect=id=>document.getElementById(id).getBoundingClientRect().toJSON();const d=document.querySelector('.studio-dock').getBoundingClientRect();return {width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth,dock:d.toJSON(),text:rect('text'),rec:rect('rec'),save:rect('save'),cancel:rect('convCancelEdit')}})()`);
 const controlsReachable=()=>run(`['convCancelEdit','save','studioDockStart'].every(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.height>=48 && r.top>=0 && r.bottom<=innerHeight && (e===hit||e.contains(hit))})`);
 await viewport(360,740);
 await run('convBeginNew()');await type('Primera nota ficticia.\nSegundo párrafo para leer y corregir.');await run('document.getElementById("save").click();document.activeElement.blur();document.getElementById("flash").textContent="";');
 const book=await run('convOpenId');
 const entry=await run('convStore.data.entries[0].id');
 const original=await run(`convEntry(${JSON.stringify(entry)}).text`);
 const savedAt=await run(`convEntry(${JSON.stringify(entry)}).savedAt`);
 const longTitle='Cuaderno ficticio con un nombre suficientemente largo para varias líneas '.repeat(3);
 await run(`convCommit(convRename(convStore.data,convOpenId,${JSON.stringify(longTitle)}));`);
 for(const [w,h] of [[320,640],[360,740],[412,892]])for(const size of ['normal','large']){
  await viewport(w,h);await run(`applyTextSize('${size}');document.activeElement.blur();convOpen(${JSON.stringify(book)});document.getElementById('flash').textContent='';window.scrollTo({top:0,behavior:'instant'});`);await waitLayout();
  const g=await geometry();assert.ok(g.scroll<=w+1,`nombre largo sin desborde ${w} ${size}: ${g.scroll}`);assert.ok(g.dock.height<=h*.3,`compositor vacío compacto ${w} ${size}: ${g.dock.height}`);
  await run(`document.querySelector('.conv-actions button').scrollIntoView({block:'center',behavior:'instant'});`);await waitLayout();
  assert.ok(await run(`(()=>{const e=document.querySelector('.conv-actions button'),r=e.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.top>=0&&r.bottom<document.querySelector('.studio-dock').getBoundingClientRect().top&&(h===e||e.contains(h))})()`),`acciones de la nota accesibles ${w} ${size}`);
  if(size==='normal'){await run(`convCommit(convRename(convStore.data,convOpenId,'Cuaderno de prueba'));document.getElementById('flash').textContent='';window.scrollTo({top:0,behavior:'instant'});`);await waitLayout();await capture('cuaderno-'+w);await run(`convCommit(convRename(convStore.data,convOpenId,${JSON.stringify(longTitle)}));`);}
 }
 await viewport(360,740);await run('applyTextSize("normal");convCommit(convRename(convStore.data,convOpenId,"Cuaderno de prueba"));document.getElementById("flash").textContent="";');
 await run(`convEdit(${JSON.stringify(entry)});`);await waitLayout();
 assert.ok((await geometry()).text.height>400,'editar aprovecha la pantalla');await capture('editor-360');
 const revised='Texto corregido ficticio.\n'.repeat(120);
 await type(revised);
 await run('document.getElementById("convMinimizeEditor").click()');await waitLayout();
 assert.equal(await run('document.getElementById("text").value'),revised,'volver no descarta texto');
 assert.equal(await run('convDest()'),book,'volver no cambia destino');
 assert.ok((await geometry()).dock.height<740*.3,'volver libera la lectura aun con borrador');
 await run('document.getElementById("convExpandEditor").click()');await waitLayout();
 await view('anonimizar');assert.equal(await run('document.getElementById("text").value'),revised);await view('transcripcion');
 for(const [w,h,kh] of [[320,640,360],[360,740,360],[412,892,420]])for(const size of ['normal','large']){
  await viewport(w,h);await run(`applyTextSize('${size}');document.getElementById('text').focus();`);await waitLayout();await viewport(w,kh);
  const g=await geometry();assert.ok(g.scroll<=w+1,`editor sin desborde ${w} ${size}`);assert.ok(g.text.height>=120,`editor con teclado amplio ${w} ${size}: ${g.text.height}`);assert.ok(g.text.top>=0&&g.text.bottom<=g.save.top,`texto libre de acciones ${w} ${size}`);assert.ok(await controlsReachable(),`Guardar/Cancelar/Grabar accesibles ${w} ${size}`);
  await run(`(()=>{const t=document.getElementById('text');t.setSelectionRange(t.value.length,t.value.length);t.scrollTop=t.scrollHeight;})()`);assert.ok(await run(`(()=>{const t=document.getElementById('text');return t.scrollTop+t.clientHeight>=t.scrollHeight-2})()`),'última línea del texto desplazable');
  if(size==='normal')await capture('teclado-'+w);
 }
 for(const [w,h,kh] of [[320,640,360],[360,740,360],[412,892,420]])for(const size of ['normal','large']){
  await viewport(w,h);await run(`applyTextSize('${size}');document.getElementById('text').focus();busy=true;outstanding=2;totalSec=60;doneSec=20;engine={terminate(){}};updProgress()`);await viewport(w,kh);
  if(w===360&&size==='normal')await capture('procesando-teclado-360');
  assert.ok(await controlsReachable(),`Guardar/Cancelar edición accesibles mientras Whisper procesa ${w} ${size}`);
  assert.ok(await run(`(()=>{const e=document.getElementById('transcriptionDockCancel'),r=e.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.height>=48&&r.top>=0&&r.bottom<=innerHeight&&(h===e||e.contains(h))})()`),`Cancelar transcripción accesible ${w} ${size}`);
  await run('busy=false;outstanding=0;engine=null;updProgress()');
 }

 await viewport(412,892);await run('applyTextSize("normal");document.getElementById("convToolsToggle").click()');await waitLayout();
 assert.equal(await run('document.getElementById("noteTools").open'),true,'herramientas dentro del editor');
 await run(`(()=>{const t=document.getElementById('text');t.focus();t.setSelectionRange(0,5);t.dispatchEvent(new Event('select'));document.getElementById('correctSelection').click();})()`);
 assert.equal(await run('document.getElementById("correctionDialog").open'),true,'diálogo de corrección sigue disponible');
 await run('document.getElementById("correctionCancel").click();document.getElementById("convToolsToggle").click();document.getElementById("save").click();document.activeElement.blur();document.getElementById("flash").textContent="";');await waitLayout();
 assert.equal(await run(`convEntry(${JSON.stringify(entry)}).savedAt`),savedAt,'editar conserva sello');assert.equal(await run(`convEntry(${JSON.stringify(entry)}).text`),revised);
 await run(`convEdit(${JSON.stringify(entry)})`);await type('Cambio ficticio que se cancelará.');await run('document.getElementById("convCancelEdit").click();document.activeElement.blur();document.getElementById("flash").textContent="";');await waitLayout();assert.equal(await run(`convEntry(${JSON.stringify(entry)}).text`),revised,'cancelar conserva la nota guardada');assert.ok((await geometry()).dock.height<892*.3,'cancelar vuelve a la lectura');
 await run('convBeginNew()');await type('Borrador ficticio recuperable.');await run('saveDraft()');await call('Page.reload');await new Promise(r=>setTimeout(r,300));await view('transcripcion');assert.equal(await run('document.getElementById("text").value'),'Borrador ficticio recuperable.');assert.ok((await geometry()).text.height>400,'borrador recuperado en editor amplio');
 await run('window.confirm=()=>true;document.getElementById("convDiscard").click();document.activeElement.blur();document.getElementById("flash").textContent="";');
 // El aviso completo usa el mismo estado real; se simula la captura, no el micrófono.
 for(const [w,h] of [[320,640],[360,740],[412,892]])for(const size of ['normal','large']){
  await viewport(w,h);await run(`applyTextSize('${size}');document.querySelector('[data-delta-view="grabacion"]').click();recording=true;paused=false;tAcc=123000;tRun=0;document.getElementById('rec').classList.add('on');document.getElementById('rec').textContent='Detener';setCtl(true);updClock();updProgress();window.scrollTo({top:0,behavior:'instant'});`);await waitLayout();
  if(h<=700){await run('tAcc=5025000;updClock()');assert.ok(await run('document.getElementById("clock").scrollWidth<=document.getElementById("clock").clientWidth'),'reloj de más de una hora legible sin desbordar');await run('tAcc=123000;updClock()');}
  const g=await geometry();assert.ok(g.scroll<=w+1,`captura sin desborde ${w} ${size}`);assert.ok(g.rec.top>=0&&g.rec.bottom<=g.dock.top,`micrófono completo al grabar ${w} ${size}: ${JSON.stringify(g)}`);assert.equal(await run('document.getElementById("recordLabel").textContent'),'Grabando');await capture('grabando-'+w+'-'+size);
  await run('document.getElementById("transcriptionDockToggle").click()');assert.equal(await run('document.getElementById("transcriptionDockDetails").hidden'),false);await run('document.getElementById("transcriptionDockToggle").click()');
  await run('document.getElementById("studioDockPause").click()');await waitLayout();assert.equal(await run('document.getElementById("recordLabel").textContent'),'Grabación en pausa');
  assert.ok(await run(`(()=>{const c=getComputedStyle(document.getElementById('pause'));const l=s=>{const a=s.match(/[\\d.]+/g).slice(0,3).map(Number).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});return a[0]*.2126+a[1]*.7152+a[2]*.0722};const a=l(c.color),b=l(c.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5})()`),'Reanudar legible en la tarjeta');await capture('pausa-'+w+'-'+size);assert.equal(await run('document.getElementById("pause").textContent'),'Reanudar');await run('document.getElementById("studioDockPause").click()');assert.equal(await run('paused'),false,'Reanudar usa el control original');
  for(const v of ['transcripcion','anonimizar','ajustes']){await view(v);assert.equal(await run('recording'),true,'navegar no detiene captura');assert.ok(await run(`(()=>{const r=document.getElementById('studioDockStop').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.height>=48})()`),'Detener accesible en '+v);}
  await run('recording=false;paused=false;stopUI();updProgress()');
 }
 await viewport(412,892);await run('applyTextSize("normal")');await view('grabacion');
 await run('prepareNew();appendMachine("Transcripción ficticia para revisar en pantalla amplia.")');await view('transcripcion');assert.ok((await geometry()).text.height>400,'transcripción abre revisión amplia');
 await run('recEng="native";recording=true;setCtl(true);updClock();updProgress()');await waitLayout();assert.equal(await run('getComputedStyle(document.getElementById("convComposer")).display'),'none','captura nativa también tiene prioridad');
 assert.ok(await run('document.getElementById("studioDockStop").getBoundingClientRect().height>=48'),'control nativo visible');
 await run('recording=false;recEng="whisper";stopUI();updProgress();window.confirm=()=>true;document.getElementById("convDiscard").click();document.activeElement.blur();document.getElementById("flash").textContent="";');
 await view('transcripcion');await run(`convOpen(${JSON.stringify(book)});`);await waitLayout();
 const ratios=await run(`(()=>{const lum=c=>{const v=c.match(/[\\d.]+/g).slice(0,3).map(Number).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});return v[0]*.2126+v[1]*.7152+v[2]*.0722};return ['#text','.conv-actions button','#studioDockStart'].map(s=>{const c=getComputedStyle(document.querySelector(s));const a=lum(c.borderColor),b=lum(c.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)})})()`);assert.ok(ratios.every(n=>n>=3),'bordes con contraste 3:1');
 assert.equal(await run('getComputedStyle(document.querySelector(".conv-actions .danger")).color'),'rgb(155, 44, 38)','Borrar conserva rojo');
 console.log('EDITOR OK: lectura compacta, edición amplia, teclado 320/360/412 Normal/Grande, controles alcanzables, herramientas/corrección, minimizar, destino, sello, cancelar, borrador recuperado, micrófono visible, detalles y contraste.');
} finally {ws?.close();chrome.kill();server.close();setTimeout(()=>rmSync(profile,{recursive:true,force:true}),500).unref();}
