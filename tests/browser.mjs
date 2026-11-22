// Sin dependencias: Chrome del runner y CDP por WebSocket nativo de Node 22.
// Datos ficticios; estados de captura y teclado simulados, sin micrófono físico.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
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
 // Native keyboard activation of help controls.
 await call('Page.bringToFront');
 await call('Emulation.setFocusEmulationEnabled',{enabled:true});
 await run('document.querySelector(\'[data-delta-view="ajustes"]\').click();document.querySelector("#settingsReading .info-toggle").focus()');   // U19: la primera ayuda visible ahora es la de «Tamaño del texto», en Ajustes
 const helpId=await run('document.activeElement.getAttribute("aria-controls")');assert.ok(helpId,'la primera ayuda controla un texto');   // U19: ya no está la ayuda de «Conservar audio»
 for(const [key,hidden] of [['Enter',false],['Enter',true]]){await call('Input.dispatchKeyEvent',{type:'keyDown',key,code:'Enter',text:'\r',windowsVirtualKeyCode:13});await call('Input.dispatchKeyEvent',{type:'keyUp',key,code:'Enter',windowsVirtualKeyCode:13});assert.equal(await run('document.getElementById("'+helpId+'").hidden'),hidden); }
 assert.equal(await run('document.getElementById("'+helpId+'").hidden'),true);
// U19: «Conservar audio» vive solo en Ajustes (#saveAudio): se cambia ahí y se bloquea durante la captura.
await run('document.getElementById("saveAudio").click()');
assert.equal(await run('document.getElementById("saveAudio").checked'),true);
await run('document.getElementById("saveAudio").click()');
assert.equal(await run('document.getElementById("saveAudio").checked'),false);
await run('lockUI(true)');
assert.equal(await run('document.getElementById("saveAudio").disabled'),true);
 await run('lockUI(false)');
 for(const width of [320,360,412,760,1365]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:width<761});
  for(const size of ['normal','large']){
   await run('applyTextSize('+JSON.stringify(size)+')');
   for(const view of ['grabacion','transcripcion','anonimizar','ajustes']){
    await run('document.querySelector(\'[data-delta-view="'+view+'"]\').click()');await settle();
    assert.ok(await run('document.documentElement.scrollWidth <= innerWidth + 1'),`overflow ${width} ${size} ${view}`);
    const nav=await run('[...document.querySelectorAll(".studio-nav a")].map(e=>({w:e.clientWidth,sw:e.scrollWidth,h:e.getBoundingClientRect().height}))');
    assert.ok(nav.every(n=>n.sw<=n.w+1&&n.h>=48),`nav ${width} ${size}`);
   }
  }
 }
 await run('recording=true;paused=false;updateDockRecording()');
 assert.equal(await run('document.getElementById("studioDockMode").textContent'),'Grabando');
 await run('paused=true;updateDockRecording()');
 assert.equal(await run('document.getElementById("studioDockMode").textContent'),'En pausa');
 assert.equal(await run('getComputedStyle(document.querySelector(".capture-dot")).animationName'),'none');
 await run('paused=false;updateDockRecording()');
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 assert.equal(await run('getComputedStyle(document.querySelector(".capture-dot")).animationName'),'none');
 for(const width of [320,412]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:true});
  for(const view of ['grabacion','transcripcion','anonimizar','ajustes']){
   await run('document.querySelector(\'[data-delta-view="'+view+'"]\').click()');await settle();
   // Revisión 22/11 (R1): en Dictar, con el círculo grande a la vista, la barra fija no repite Pausar/Detener; si el círculo sale de la vista, vuelve.
   assert.ok(await run('(()=>{const r=document.getElementById("studioDockCapture").getBoundingClientRect(),m=document.getElementById("rec").getBoundingClientRect(),micVisible=document.body.dataset.view==="grabacion"&&document.body.classList.contains("record-mic-visible");return (micVisible ? r.height===0 && m.top>=0 && m.bottom<=innerHeight : r.height>0 && r.top>=0 && r.bottom<=innerHeight) && document.documentElement.scrollWidth<=innerWidth+1})()'),'captura visible '+width+' '+view);
  }
 }
 await run('recording=false;updateDockRecording()');
 assert.equal(await run('document.getElementById("studioDockCapture").hidden'),true);
 // Resized visual viewport / keyboard layout simulation: last line can scroll above dock.
 await call('Emulation.setTouchEmulationEnabled',{enabled:true});
 await call('Emulation.setDeviceMetricsOverride',{width:412,height:850,deviceScaleFactor:1,mobile:true});
 await run('document.querySelector(\'[data-delta-view="transcripcion"]\').click();document.getElementById("convNewNote").click();document.getElementById("text").focus()');
 await settle();
 await call('Emulation.setDeviceMetricsOverride',{width:412,height:420,deviceScaleFactor:1,mobile:true});
 await settle();
 assert.equal(await run('document.body.classList.contains("keyboard-open")'),true,'teclado detectado por geometría');
 await run('const editor=document.getElementById("text");editor.value="Línea ficticia\\n".repeat(150);editor.setSelectionRange(editor.value.length,editor.value.length);editor.scrollIntoView({block:"end",behavior:"instant"});editor.scrollTop=editor.scrollHeight');
 await settle();
 const geometry=await run('(()=>{const t=document.getElementById("text"),d=document.querySelector(".studio-dock");return {bottom:t.getBoundingClientRect().bottom,dock:document.getElementById("studioDockNotes").getBoundingClientRect().top,top:t.getBoundingClientRect().top,scroll:t.scrollTop,client:t.clientHeight,height:t.scrollHeight}})()');
 console.log('Editor geometry',geometry);
 assert.ok(geometry.top>=0 && geometry.bottom<=geometry.dock && geometry.scroll+geometry.client>=geometry.height-2,'última línea libre de barra');
 // Tema, contraste y composición: verificaciones sobre estilos calculados.
 await call('Emulation.setDeviceMetricsOverride',{width:412,height:850,deviceScaleFactor:1,mobile:true});
 await run('document.activeElement.blur();applyTextSize("normal");convClearComposer();');
 assert.equal(await run('getComputedStyle(document.documentElement).colorScheme'),'light');
 const ratios=await run(`(()=>{
   const lum=c=>{const v=c.match(/[\\d.]+/g).slice(0,3).map(Number).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});return v[0]*.2126+v[1]*.7152+v[2]*.0722};
   return ['#save','#studioDockStart','#rec','#studioDockStop','#convTarget'].map(id=>{
    const e=document.querySelector(id),s=getComputedStyle(e);let bg=s.backgroundColor,p=e;
    while(bg==='rgba(0, 0, 0, 0)'&&(p=p.parentElement))bg=getComputedStyle(p).backgroundColor;
    const a=lum(s.color),b=lum(bg);return {id,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
   });
 })()`);
 assert.ok(ratios.every(x=>x.ratio>=4.5),JSON.stringify(ratios));
 await run('convBeginNew();document.getElementById("text").value="Primera nota de ejemplo. Recordar las ideas para la próxima reunión.";document.getElementById("text").dispatchEvent(new Event("input"));document.getElementById("save").click();convCommit(convRename(convStore.data,convOpenId,"Luciano · ejemplo ficticio"));');
 await run('document.getElementById("text").value="Segunda nota: revisar lo pendiente y preparar el encuentro del lunes.";document.getElementById("text").dispatchEvent(new Event("input"));document.getElementById("save").click();');
 // Capturas de laboratorio con datos exclusivamente ficticios para revisión visual.
 for(const view of ['grabacion','anonimizar','transcripcion']){
  await call('Emulation.setDeviceMetricsOverride',{width:412,height:850,deviceScaleFactor:1,mobile:true});
  await run('document.activeElement.blur();document.querySelector(\'[data-delta-view="'+view+'"]\').click();window.scrollTo({top:0,behavior:"instant"})');await settle();
  console.log('SCREENSHOT_'+view+' '+(await call('Page.captureScreenshot',{format:'jpeg',quality:55})).data);
 }
 console.log('UI OK: 320/360/412/760/1365, normal/grande, ayudas, sincronización, bloqueo, captura, movimiento reducido y teclado simulado.');
} finally {ws?.close();chrome.kill();server.close();setTimeout(()=>rmSync(profile,{recursive:true,force:true}),500).unref();}
