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
 await run('document.querySelector(".info-toggle").focus()');
 for(const key of ['Enter','Enter']){await call('Input.dispatchKeyEvent',{type:'keyDown',key,code:'Enter',windowsVirtualKeyCode:13});await call('Input.dispatchKeyEvent',{type:'keyUp',key,code:'Enter',windowsVirtualKeyCode:13});if(key){} }
 assert.equal(await run('document.getElementById("retainHelp").hidden'),true);
 await run('document.getElementById("recordSaveAudio").click()');
 assert.equal(await run('document.getElementById("saveAudio").checked'),true);
 assert.equal(await run('document.getElementById("recordSaveState").textContent'),'Sí');
 await run('document.getElementById("saveAudio").click()');
 assert.equal(await run('document.getElementById("recordSaveAudio").checked'),false);
 await run('lockUI(true)');
 assert.equal(await run('document.getElementById("recordSaveAudio").disabled'),true);
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
 await run('recording=false;updateDockRecording()');
 assert.equal(await run('document.getElementById("studioDockCapture").hidden'),true);
 // Resized visual viewport / keyboard layout simulation: last line can scroll above dock.
 await call('Emulation.setDeviceMetricsOverride',{width:412,height:420,deviceScaleFactor:1,mobile:true});
 await run('document.querySelector(\'[data-delta-view="transcripcion"]\').click();document.body.classList.add("keyboard-open");const editor=document.getElementById("text");editor.value="Línea ficticia\\n".repeat(150);editor.focus();editor.setSelectionRange(editor.value.length,editor.value.length);editor.scrollTop=editor.scrollHeight;editor.scrollIntoView({block:"end"})');
 await settle();
 assert.ok(await run('(()=>{const t=document.getElementById("text"),d=document.querySelector(".studio-dock");return t.getBoundingClientRect().bottom<=d.getBoundingClientRect().top && t.scrollTop+t.clientHeight>=t.scrollHeight-2})()'),'última línea libre de barra');
 console.log('UI OK: 320/360/412/760/1365, normal/grande, ayudas, sincronización, bloqueo, captura, movimiento reducido y teclado simulado.');
} finally {ws?.close();chrome.kill();server.close();setTimeout(()=>rmSync(profile,{recursive:true,force:true}),500).unref();}
