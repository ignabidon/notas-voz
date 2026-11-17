// K2: laboratorio exclusivo con Chrome aislado, copia fija de formato 1 y archivos totalmente inventados.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';

const profile=mkdtempSync(tmpdir()+'/dictavoz-k2-');
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(readFileSync(new URL('../index.html',import.meta.url)));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const chrome=spawn(process.env.CHROME_BIN||'google-chrome',['--headless','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank']);
let ws;
try{
  const endpoint=await new Promise((resolve,reject)=>{
    let log='';const timer=setTimeout(()=>reject(Error('Chrome timeout: '+log)),30000);
    chrome.on('error',reject);chrome.stderr.on('data',d=>{
      log+=d;const m=log.match(/DevTools listening on (ws:\/\/\S+)/);
      if(m){clearTimeout(timer);resolve(m[1]);}
    });
  });
  ws=new WebSocket(endpoint);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
  let seq=0;const pending=new Map();
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}});
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{
    const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
  });
  const {targetInfos}=await send('Target.getTargets');
  const {sessionId}=await send('Target.attachToTarget',{targetId:targetInfos.find(t=>t.type==='page').targetId,flatten:true});
  const call=(method,params={})=>send(method,params,sessionId);
  const run=async expression=>{
    const m=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(m.exceptionDetails)throw Error(JSON.stringify(m.exceptionDetails));
    return m.result.value;
  };
  await call('Page.enable');await call('Runtime.enable');
  await call('Page.navigate',{url:'http://localhost:'+server.address().port+'/'});
  for(let i=0;i<120;i++){
    if(await run('document.readyState==="complete" && typeof k2RestoreEmpty==="function"'))break;
    await new Promise(r=>setTimeout(r,100));
    if(i===119)throw Error('K2 no inició');
  }
  assert.equal(await run('k2StorageEmpty()'),true);
  const bytes=readFileSync(new URL('./copia-formato-1.dictanota',import.meta.url));
  const v1="new Blob([Uint8Array.from(atob("+JSON.stringify(bytes.toString('base64'))+"),x=>x.charCodeAt(0))])";
  const p2=readFileSync(new URL('./copia-formato-2.dictanota.base64',import.meta.url),'utf8').trim();
  const v2Plain="new Blob([Uint8Array.from(atob("+JSON.stringify(p2)+"),x=>x.charCodeAt(0))])";
  const rejected=JSON.parse(await run('(async()=>{' +
    'const f='+v1+',plain='+v2Plain+';let wrong="",cut="",occupied="",plainMode="";'+
    "try{await k2RestoreEmpty(f,'clave falsa')}catch(e){wrong=e.copia||e.message}"+
    "try{await k2RestoreEmpty(f.slice(0,f.size-22),'frase de prueba inventada 901')}catch(e){cut=e.copia||e.message}"+
    "try{await k2RestoreEmpty(plain,'clave-fixture-dictavoz-903')}catch(e){plainMode=e.message}"+
    "localStorage.setItem('notasvoz.gamma.draft.v1','borrador ficticio');"+
    "try{await k2RestoreEmpty(f,'frase de prueba inventada 901')}catch(e){occupied=e.message}"+
    "localStorage.removeItem('notasvoz.gamma.draft.v1');"+
    'return JSON.stringify({wrong,cut,occupied,plainMode,empty:await k2StorageEmpty(),audios:(await anListMeta(await anDb())).length});'+
    '})()'));
  assert.equal(rejected.wrong,'Clave');
  assert.ok(rejected.cut);
  assert.match(rejected.plainMode,/en claro|sin cifrar/);
  assert.match(rejected.occupied,/contiene datos/);
  assert.equal(rejected.empty,true);
  assert.equal(rejected.audios,0);
  // Simular interrupción con lote identificado: solo se limpian sus propias piezas.
  const interrupted=JSON.parse(await run('(async()=>{' +
    "const db=await anDb(),id='audio-interrumpido-ficticio',m=anNewMeta(id,Date.now(),'importando');"+
    "localStorage.setItem(K2_JOURNAL,JSON.stringify({version:1,ids:[id],names:['borrador']}));"+
    "await anPutMeta(db,m);await anPutChunk(db,id,0,0,new Blob(['audio inventado']));"+
    "localStorage.setItem(VAULT_REC_PREFIX+'borrador','registro de ensayo');"+
    'const cleaned=await k2Rollback();'+
    'return JSON.stringify({cleaned,meta:await anGetMeta(db,id)||null,chunks:await anCountChunks(db,id),journal:localStorage.getItem(K2_JOURNAL)});'+
    '})()'));
  assert.equal(interrupted.cleaned,true);
  assert.equal(interrupted.meta,null);
  assert.equal(interrupted.chunks,0);
  assert.equal(interrupted.journal,null);
  const restored=JSON.parse(await run('(async()=>{' +
    'const f='+v1+';const r=await k2RestoreEmpty(f,"frase de prueba inventada 901");'+
    'const db=await anDb(),list=await anListMeta(db),m=list[0];'+
    'let repeat="";try{await k2RestoreEmpty(f,"frase de prueba inventada 901")}catch(e){repeat=e.message};'+
    'return JSON.stringify({format:r.formato,audios:r.audios,notas:r.notas,header:!!localStorage.getItem(VAULT_HEADER),'+
    'chunks:await anCountChunks(db,m.id),repeat,journal:localStorage.getItem(K2_JOURNAL)});'+
    '})()'));
  assert.equal(restored.format,1);
  assert.equal(restored.audios,1);
  assert.equal(restored.notas,2);
  assert.equal(restored.header,true);
  assert.equal(restored.chunks,3);
  assert.match(restored.repeat,/contiene datos/);
  assert.equal(restored.journal,null);
  await call('Page.reload',{ignoreCache:true});
  for(let i=0;i<120;i++){
    if(await run('document.readyState==="complete" && typeof vault!=="undefined" && vault.state==="locked"'))break;
    await new Promise(r=>setTimeout(r,100));
    if(i===119)throw Error('Bóveda no bloqueada al recargar');
  }
  const opened=JSON.parse(await run('(async()=>{' +
    'await vault.unlockPassword("frase de prueba inventada 901");await vaultAfterUnlock();'+
    'const raw=vaultStore.getItem("notasvoz.dictanota.v2"),data=JSON.parse(raw),'+
    'db=await anDb(),m=(await anListMeta(db))[0],h=await anAudioHealth(db,vault.audioKey,vault.header.id,m.id);'+
    'return JSON.stringify({cuadernos:data.conversations.length,notas:data.entries.length,audio:h.ok});'+
    '})()'));
  assert.equal(opened.cuadernos,1);
  assert.equal(opened.notas,2);
  assert.equal(opened.audio,true);
  console.log('K2 OK: formato 1, 2 notas/1 audio cifrado, clave incorrecta/corte, versión 2 clara rechazada, perfil ocupado, lote interrumpido, reapertura e integridad de audio');
}finally{
  try{ws?.close()}catch(e){}
  chrome.kill('SIGKILL');server.close();
  try{rmSync(profile,{recursive:true,force:true})}catch(e){}
}
