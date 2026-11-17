// P2 y copia formato 2: solo audios y datos sintéticos, navegador aislado.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
const profile=mkdtempSync(tmpdir()+'/dictavoz-p2-');
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(readFileSync(new URL('../index.html',import.meta.url)));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://localhost:'+server.address().port+'/';
const chrome=spawn(process.env.CHROME_BIN||'google-chrome',['--headless','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank']);
let ws;
try{
 const endpoint=await new Promise((resolve,reject)=>{
   let log='';const timer=setTimeout(()=>reject(Error('Chrome timeout: '+log)),30000);
   chrome.on('error',reject);chrome.stderr.on('data',d=>{
     log+=d;const m=log.match(/DevTools listening on (ws:\/\/\S+)/);if(m){clearTimeout(timer);resolve(m[1]);}
   });
 });
 ws=new WebSocket(endpoint);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let seq=0;const pending=new Map();
 ws.addEventListener('message',e=>{const x=JSON.parse(e.data);if(x.id&&pending.has(x.id)){const p=pending.get(x.id);pending.delete(x.id);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result);}});
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{
  const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
 });
 const {targetInfos}=await send('Target.getTargets');
 const {sessionId}=await send('Target.attachToTarget',{targetId:targetInfos.find(t=>t.type==='page').targetId,flatten:true});
 const call=(method,params={})=>send(method,params,sessionId);
 const run=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await call('Page.enable');await call('Runtime.enable');await call('Page.navigate',{url});
 for(let i=0;i<100;i++){if(await run('document.readyState==="complete" && typeof anPlainStageFile==="function"'))break;await new Promise(r=>setTimeout(r,100));if(i===99)throw Error('App sin iniciar');}
 assert.equal(await run('vault.state'),'off');
 const r=JSON.parse(await run('(async()=>{' +
  'const db=await anDb(),raw=new Uint8Array(AN_FILE_CHUNK+7);for(let i=0;i<raw.length;i++)raw[i]=i%251;' +
  "const f=new File([raw],'tono-inventado.wav',{type:'audio/wav'});" +
  'const id=await anPlainStageFile(db,f,4200),m=await anGetMeta(db,id),h=await anPlainHealth(db,id),read=await anPlainRead(db,id);' +
  'const b=new Uint8Array(await read[0].blob.arrayBuffer());' +
  'return JSON.stringify({id,mode:m.mode,estado:m.state,key:m.key,sealed:m.sealed,hashes:m.plain.parts[0].hashes.length,chunks:await anCountChunks(db,id),ok:h.ok,bytes:b.length,equal:b.every((x,i)=>x===raw[i])});' +
  '})()'));
 assert.equal(r.mode,'claro');assert.equal(r.estado,'cerrado');assert.equal(r.key,null);assert.equal(r.sealed,null);
 assert.equal(r.hashes,2);assert.equal(r.chunks,2);assert.equal(r.ok,true);assert.equal(r.bytes,1048583);assert.equal(r.equal,true);
 const damaged=JSON.parse(await run('(async()=>{' +
  'const db=await anDb(),id='+JSON.stringify(r.id)+',old=await anGetChunk(db,id,0,1);' +
  'await anPutChunk(db,id,0,1,new Blob([new Uint8Array([9,9,9])]));const h=await anPlainHealth(db,id);' +
  'await anPutChunk(db,id,0,1,old);return JSON.stringify({ok:h.ok,why:h.why,preserved:!!(await anGetMeta(db,id))});' +
  '})()'));
 assert.equal(damaged.ok,false);assert.match(damaged.why,/alterado/);assert.equal(damaged.preserved,true);
 const saved=JSON.parse(await run('(async()=>{' +
  'const db=await anDb(),m=await anGetMeta(db,'+JSON.stringify(r.id)+'),chunks=[];' +
  'for(let n=0;n<m.plain.parts[0].chunks;n++)chunks.push({part:0,n,blob:await anGetChunk(db,m.id,0,n)});' +
  "const password='clave inventada de ensayo 903',c=await vaultCreate(password);" +
  'const key=await vaultImportDataKey(c.dek);c.dek.fill(0);' +
  "const writer=copia2Writer(c.header,key,'completa',Date.now());await writer.config({cfg:null,generador:null});" +
  'await writer.audioClaro(m,chunks);const file=await writer.finish(),open=h=>copiaOpenWithSecret(h,password);' +
  'const good=await copia2Verify(file,open);let old="",bad="",cut="";' +
  'try{await copiaVerify(file,open)}catch(e){old=e.copia};' +
  'const changed=new Uint8Array(await file.arrayBuffer());changed[changed.length-60]^=1;' +
  'try{await copia2Verify(new Blob([changed]),open)}catch(e){bad=e.copia};' +
  'try{await copia2Verify(file.slice(0,file.size-22),open)}catch(e){cut=e.copia};' +
  "const wt=copia2Writer(c.header,key,'solo-texto',Date.now());await wt.config({cfg:null,generador:null});" +
  'const text=await copia2Verify(await wt.finish(),open);' +
  'return JSON.stringify({size:file.size,format:good.formato,clear:good.claro,encrypted:good.cifrado,blocks:good.fragmentos,old,bad,cut,text:text.contenido,textAudios:text.audios});' +
  '})()'));
 assert.equal(saved.format,2);assert.equal(saved.clear,1);assert.equal(saved.encrypted,0);
 assert.equal(saved.blocks,2);assert.equal(saved.old,'FormatoNuevo');
 assert.ok(saved.bad,'alteración detectada');assert.ok(saved.cut,'corte detectado');
 assert.equal(saved.text,'solo-texto');assert.equal(saved.textAudios,0);
 assert.ok(saved.size>r.bytes);
 // Archivo fijo reproducible por futuras versiones: no depende de AES aleatorio generado hoy.
 const fixture=readFileSync(new URL('./copia-formato-2.dictanota.base64',import.meta.url),'utf8').trim();
 const fixed=JSON.parse(await run('(async()=>{' +
  'const text=atob('+JSON.stringify(fixture)+');' +
  'const bytes=Uint8Array.from(text,x=>x.charCodeAt(0)),file=new Blob([bytes]);' +
  "const ok=await copia2Verify(file,h=>copiaOpenWithSecret(h,'clave-fixture-dictavoz-903'));" +
  'let wrong="";try{await copia2Verify(file,h=>copiaOpenWithSecret(h,"contraseña falsa"))}catch(e){wrong=e.copia;}' +
  'return JSON.stringify({bytes:file.size,version:ok.formato,clear:ok.claro,encrypted:ok.cifrado,blocks:ok.fragmentos,wrong});' +
  '})()'));
 assert.equal(fixed.bytes,1712);assert.equal(fixed.version,2);assert.equal(fixed.clear,1);
 assert.equal(fixed.encrypted,0);assert.equal(fixed.blocks,1);assert.equal(fixed.wrong,'Clave');
 // Regresión: una ficha clara a medio escribir no se borra ni se diagnostica como cifrada
 // si posteriormente se activa la bóveda. Solo E2 puede revisarse con clave E2.
 const transition=JSON.parse(await run(`(async()=>{
   const db=await anDb(), partialId=anNewId();
   const part={mime:'audio/wav',origin:'cargado',name:'parcial-inventado.wav',
     chunks:1,bytes:4,ms:100,complete:true,hashes:[]};
   await anPutMeta(db,{...anNewMeta(partialId,Date.now(),'escribiendo'),
     mode:AN_PLAIN_MODE,parts:1,bytes:4,plain:{parts:[part]}});
   await anPutChunk(db,partialId,0,0,new Blob([new Uint8Array([1,2,3,4])]));
   const {dek}=await vault.enable('clave inventada de cambio de modo 904'); dek.fill(0);
   await vaultTakeTabLock();
   await anReviewOnOpen();
   const preserved=await anGetMeta(db,${JSON.stringify(r.id)});
   return JSON.stringify({stillClear:!!preserved,clearMode:preserved?.mode,
     partial:!!(await anGetMeta(db,partialId)),flagged:anDamaged.has(${JSON.stringify(r.id)})});
 })()`));
 assert.equal(transition.stillClear,true,'activar protección no borra audios en claro');
 assert.equal(transition.clearMode,'claro','no se reinterpretan como cifrados');
 assert.equal(transition.partial,true,'una escritura clara interrumpida permanece para diagnóstico');
 assert.equal(transition.flagged,false,'una ficha clara íntegra no se informa como cifrado dañado');
 console.log('BIBLIOTECA P2 + RESPALDO 2 OK:',r.chunks,'fragmentos; cifrado de copia autenticado; fixture fijo válido y transición preservada');
}finally{
 try{ws?.close()}catch(e){}
 chrome.kill('SIGKILL');server.close();
 try{rmSync(profile,{recursive:true,force:true})}catch(e){}
}
