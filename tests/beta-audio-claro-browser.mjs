// Beta: regla funcional «Conservar audio» funciona con o sin protección.
// Chrome real, almacenamiento aislado, ondas sintéticas, sin voz ni datos de pacientes.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
const profile=mkdtempSync(tmpdir()+'/dictavoz-beta-audio-claro-');
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(readFileSync(new URL('../index.html',import.meta.url)));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://localhost:'+server.address().port+'/';
const chrome=spawn(process.env.CHROME_BIN||'google-chrome',['--headless','--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required','--remote-debugging-pipe','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','pipe','pipe','pipe','pipe']});
let seq=0, buf='', sessionId, closed=false;
const pending=new Map();
chrome.stdio[4].on('data',b=>{
  buf+=b.toString();let i;
  while((i=buf.indexOf('\0'))>=0){
    const raw=buf.slice(0,i);buf=buf.slice(i+1);if(!raw)continue;
    const m=JSON.parse(raw);
    if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}
    else if(m.method==='Page.javascriptDialogOpening')call('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});
  }
});
const send=(method,params={},sid)=>new Promise((resolve,reject)=>{
  const id=++seq, timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},30000);
  pending.set(id,{resolve,reject,timer});
  chrome.stdio[3].write(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})})+'\0');
});
const call=(method,params={})=>send(method,params,sessionId);
const run=async code=>{
  const r=await call('Runtime.evaluate',{expression:code,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const wait=async(expr,label,ms=18000)=>{
  const until=Date.now()+ms;
  while(Date.now()<until){try{if(await run(expr))return;}catch(e){}await new Promise(r=>setTimeout(r,90));}
  throw Error('No ocurrió: '+label);
};
try{
  const {targetInfos}=await send('Target.getTargets');
  sessionId=(await send('Target.attachToTarget',{targetId:targetInfos.find(t=>t.type==='page').targetId,flatten:true})).sessionId;
  await call('Page.enable');await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});
  await call('Page.navigate',{url});
  await wait("document.readyState==='complete'&&typeof anSaveFile==='function'&&typeof startAudioClaro==='function'",'app lista');
  await wait("!vault.readOnly && convStore.data !== null",'candado y cuadernos disponibles');
  assert.equal(await run('vault.state'),'off');
  await run(`(() => {
    $('saveAudio').checked=true;
    $('replace').checked=false;
    window.wav=()=>{
      const b=new ArrayBuffer(32044),v=new DataView(b),str=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
      str(0,'RIFF');v.setUint32(4,32036,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);
      v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,16000,true);
      v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,32000,true);
      for(let i=0;i<16000;i++)v.setInt16(44+2*i,Math.sin(i*2*Math.PI*440/8000)*2000,true);
      return new File([b],'tono-ficticio.wav',{type:'audio/wav'});
    };
  })()`);
  const first=JSON.parse(await run(`(async()=>{
    convClearComposer();convOpenId=null;convStartPending(true);
    await anSaveFile(wav(),2000);const id=convAudioId;
    await anSaveFile(wav(),2000);$('text').value='Audio sintético de prueba, persona X-901';
    await convSave();const e=convStore.data.entries.at(-1),m=await anGetMeta(await anDb(),id),h=await anPlainHealth(await anDb(),id);
    return JSON.stringify({id,e,m:{mode:m.mode,parts:m.parts,state:m.state},ok:h.ok});
  })()`));
  assert.ok(first.id,'audio vinculado antes de guardar');
  assert.equal(first.e.audioId,first.id,'audio adherido a nota');
  assert.equal(first.e.audioParts,2,'dos partes confirmadas en la nota');
  assert.deepEqual(first.m,{mode:'claro',parts:2,state:'cerrado'});
  assert.equal(first.ok,true,'integridad de audio sin contraseña');
  await run(`document.querySelector('[data-delta-view=transcripcion]').click();convOpen(${JSON.stringify(first.e.conversationId)})`);
  assert.equal(await run("document.querySelectorAll('.note-audio').length"),1);
  assert.equal(await run("document.getElementById('betaAudioMissingGuide')===null"),true,'aviso grande retirado');
  await run("document.querySelector('.note-audio button').click()");
  await wait("e3Current?.plain===true&&!e3Current.loading&&!e3Current.audio.paused",'reproductor de audio no cifrado');
  await run('e3Stop()');
  // MediaRecorder real con fuente sintética: probar la ruta de captura, no solo cargar archivos.
  const live=JSON.parse(await run(`(async()=>{
    convClearComposer();convOpenId=null;convStartPending(true);
    const ac=new AudioContext(),osc=ac.createOscillator(),dst=ac.createMediaStreamDestination();
    osc.connect(dst);osc.start();
    const rec=new MediaRecorder(dst.stream);mr=rec;startAudioClaro(rec);
    await new Promise(r=>setTimeout(r,750));
    rec.requestData();await new Promise(r=>setTimeout(r,250));
    rec._deltaStopRequested=true;rec.stop();osc.stop();
    while(anBusyN>0)await new Promise(r=>setTimeout(r,60));
    await ac.close();
    const id=convAudioId;const h=id?await anPlainHealth(await anDb(),id):null;
    $('text').value='Otra nota inventada del micrófono sintético';
    await convSave();const e=convStore.data.entries.at(-1);
    return JSON.stringify({id,ok:h?.ok||false,mode:h?.m?.mode,linked:e.audioId===id,conversationId:e.conversationId});
  })()`));
  assert.ok(live.id,'MediaRecorder produjo audio');
  assert.equal(live.ok,true,'MediaRecorder cerró su audio sin cifrar íntegro');
  assert.equal(live.mode,'claro');
  assert.equal(live.linked,true,'audio del grabador adherido a nota');
  await run(`convOpen(${JSON.stringify(live.conversationId)});document.querySelector('.note-audio button').click()`);
  await wait("e3Current?.plain===true&&!e3Current.loading&&!e3Current.audio.paused",'reproductor de grabación');
  await run("e3Stop()");
  // Respaldo completo: ambos audios se cifran dentro de la copia, sin requerir bóveda activa.
  const backup=JSON.parse(await run(`(async()=>{
    const b=await copiaMake('contraseña inventada de respaldo beta 919',{completa:true});
    const r=await copia2Verify(b.file,h=>copiaOpenWithSecret(h,'contraseña inventada de respaldo beta 919'));
    return JSON.stringify({version:r.formato,claro:r.claro,audios:r.audios,excl:r.exclusiones,contenido:r.contenido});
  })()`));
  assert.deepEqual(backup,{version:2,claro:2,audios:2,excl:0,contenido:'completa'},'copia v2 completa y autenticada');
  // Conservar audio apagado: guardar solo texto no crea reproductor.
  const off=JSON.parse(await run(`(async()=>{
    convClearComposer();convOpenId=null;convStartPending(true);$('saveAudio').checked=false;
    $('text').value='Texto sin grabación inventada';await convSave();
    const e=convStore.data.entries.at(-1);convOpen(e.conversationId);
    return JSON.stringify({audioId:e.audioId,player:!!document.querySelector('.note-audio')});
  })()`));
  assert.deepEqual(off,{audioId:null,player:false});

  // Recuperación de una grabación interrumpida cuando ampliaba un audio confirmado.
  const recovery=JSON.parse(await run(`(async()=>{
    const db=await anDb(),old=new Blob([new Uint8Array(140).fill(9)],{type:'audio/wav'});
    const id=await anPlainStageFile(db,old,1500),before=await anGetMeta(db,id);
    const segment=new Blob([new Uint8Array(75).fill(7)],{type:'audio/wav'});
    const p={mime:'audio/wav',origin:'grabado',chunks:1,bytes:segment.size,ms:null,complete:false,hashes:[await anPlainHash(segment)]};
    await anPutChunkMeta(db,{...before,state:'grabando',parts:2,bytes:before.bytes+segment.size,
      plain:{parts:before.plain.parts.concat(p)}},1,0,segment);
    await anRepairPlainOnOpen();
    const after=await anGetMeta(db,id),h=await anPlainHealth(db,id);
    return JSON.stringify({ok:h.ok,parts:after.parts,state:after.state,firstUnchanged:after.plain.parts[0].bytes===before.plain.parts[0].bytes,
      lastIncomplete:after.plain.parts[1].incompleta===true && after.plain.parts[1].interrumpida===true && after.plain.parts[1].ms===null});
  })()`));
  assert.deepEqual(recovery,{ok:true,parts:2,state:'cerrado',firstUnchanged:true,lastIncomplete:true},
    'se recupera la parte recibida sin afectar la grabación anterior');

  // Si la parte nueva no pasa el SHA-256, solo se restaura lo previamente confirmado.
  const damaged=JSON.parse(await run(`(async()=>{
    const db=await anDb(),id=await anPlainStageFile(db,new Blob([new Uint8Array(120).fill(11)],{type:'audio/wav'}),1500);
    const before=await anGetMeta(db,id),bad=new Blob([new Uint8Array(40).fill(22)],{type:'audio/wav'});
    const p={mime:'audio/wav',origin:'grabado',chunks:1,bytes:bad.size,ms:null,complete:false,
      hashes:[await anPlainHash(new Blob([new Uint8Array(40).fill(99)]))]};
    await anPutChunkMeta(db,{...before,state:'grabando',parts:2,bytes:before.bytes+bad.size,
      plain:{parts:before.plain.parts.concat(p)}},1,0,bad);
    await anRepairPlainOnOpen();
    const after=await anGetMeta(db,id),h=await anPlainHealth(db,id);
    return JSON.stringify({ok:h.ok,parts:after.parts,bytes:after.bytes,priorBytes:before.bytes,
      removedNewChunks:(await anCountPartChunks(db,id,1))===0});
  })()`));
  assert.deepEqual(damaged,{ok:true,parts:1,bytes:120,priorBytes:120,removedNewChunks:true},
    'un fragmento interrumpido alterado no inutiliza el audio anterior');

  // Aborto real de la transacción IndexedDB al agregar un archivo: nada queda a medias.
  const aborted=JSON.parse(await run(`(async()=>{
    const db=await anDb(),id=await anPlainStageFile(db,new Blob([new Uint8Array(90).fill(8)]),1000);
    const before=await anGetMeta(db,id),original=anTx;
    let injected=false,error='';
    try{
      anTx=(db,stores,mode,fn)=>{
        if(!injected && mode==='readwrite' && stores.includes('meta') && stores.includes('chunks')){
          injected=true;return original(db,stores,mode,t=>{fn(t);t.abort();});
        }
        return original(db,stores,mode,fn);
      };
      await anPlainAppendFile(db,id,new Blob([new Uint8Array(300).fill(19)]),1000);
    }catch(e){error=e.name}
    finally{anTx=original;}
    const after=await anGetMeta(db,id);
    return JSON.stringify({injected,failed:!!error,unchanged:after.parts===before.parts&&after.bytes===before.bytes,
      healthy:(await anPlainHealth(db,id)).ok,extra:(await anCountPartChunks(db,id,1))});
  })()`));
  assert.deepEqual(aborted,{injected:true,failed:true,unchanged:true,healthy:true,extra:0},
    'un corte de escritura revierte ficha y fragmentos en la misma transacción');

  // Si falla la verificación DESPUÉS de la transacción, restaura el estado confirmado.
  const postCheck=JSON.parse(await run(`(async()=>{
    const db=await anDb(),id=await anPlainStageFile(db,new Blob([new Uint8Array(90).fill(8)]),1000);
    const original=anPlainHealth;
    let calls=0,error='';
    try{
      anPlainHealth=async(...args)=>{calls++;if(calls===2)return {ok:false,why:'lectura simulada'};return original(...args);};
      await anPlainAppendFile(db,id,new Blob([new Uint8Array(300).fill(19)]),1000);
    }catch(e){error=e.message}
    finally{anPlainHealth=original;}
    const m=await anGetMeta(db,id);
    return JSON.stringify({checks:calls,failed:!!error,parts:m.parts,healthy:(await anPlainHealth(db,id)).ok,
      extra:(await anCountPartChunks(db,id,1))});
  })()`));
  assert.deepEqual(postCheck,{checks:2,failed:true,parts:1,healthy:true,extra:0},
    'verificación fallida tras agregar un archivo restaura el audio previo');


  // F1: si aborta la ÚNICA transacción de un archivo nuevo, no queda ficha ni fragmentos huérfanos.
  const stageAbort=JSON.parse(await run(`(async()=>{
    const db=await anDb(),id=anNewId(),original=anTx;
    let aborted=false,failed=false;
    try{
      anTx=(db,stores,mode,fn)=>{
        if(!aborted && mode==='readwrite' && stores.includes('meta') && stores.includes('chunks')){
          aborted=true;return original(db,stores,mode,t=>{fn(t);t.abort();});
        }
        return original(db,stores,mode,fn);
      };
      await anPlainStageFile(db,new Blob([new Uint8Array(180).fill(6)]),700,id);
    }catch(e){failed=true}
    finally{anTx=original}
    return JSON.stringify({aborted,failed,meta:(await anGetMeta(db,id))===undefined,chunks:await anCountChunks(db,id)});
  })()`));
  assert.deepEqual(stageAbort,{aborted:true,failed:true,meta:true,chunks:0},
    'F1: archivo nuevo abortado deja la biblioteca completamente limpia');

  // F1: restos de una versión anterior aparecen con opción Borrar; si están
  // sueltos, se retiran al revisar sin tocar grabaciones confirmadas.
  const stale=JSON.parse(await run(`(async()=>{
    const db=await anDb(),id=anNewId(),m={...anNewMeta(id,Date.now(),'escribiendo'),
      mode:'claro',parts:1,bytes:33,plain:{parts:[{mime:'audio/wav',origin:'cargado',chunks:1,bytes:33,
        ms:1000,complete:false,hashes:[]}]}};
    await anPutMeta(db,m);await anPutChunk(db,id,0,0,new Blob([new Uint8Array(33).fill(3)]));
    await e3RefreshSpace();
    const row=[...document.querySelectorAll('.e3-audio-row[data-modo=claro]')].find(e=>e.textContent.includes('a medio guardar'));
    const canDelete=!!row && [...row.querySelectorAll('button')].some(b=>b.textContent.includes('Borrar audio'));
    await anRepairPlainOnOpen();
    return JSON.stringify({canDelete,removed:!(await anGetMeta(db,id)),noChunks:(await anCountChunks(db,id))===0});
  })()`));
  assert.deepEqual(stale,{canDelete:true,removed:true,noChunks:true},
    'F1: ficha de archivo interrumpido es eliminable y se limpia al reabrir');

  // M2: una excepción de lectura después de confirmar la ampliación TAMBIÉN revierte.
  const thrownCheck=JSON.parse(await run(`(async()=>{
    const db=await anDb(),id=await anPlainStageFile(db,new Blob([new Uint8Array(70).fill(7)]),1000);
    const old=anPlainHealth;let calls=0,error='';
    try{
      anPlainHealth=async(...args)=>{
        calls++;if(calls===2)throw new Error('lectura interrumpida');return old(...args);
      };
      await anPlainAppendFile(db,id,new Blob([new Uint8Array(100).fill(8)]),500);
    }catch(e){error=e.message}finally{anPlainHealth=old}
    const meta=await anGetMeta(db,id);
    return JSON.stringify({calls,failed:error.includes('revirtió'),parts:meta.parts,healthy:(await anPlainHealth(db,id)).ok,
      extra:await anCountPartChunks(db,id,1)});
  })()`));
  assert.deepEqual(thrownCheck,{calls:2,failed:true,parts:1,healthy:true,extra:0},
    'M2: excepción de lectura no deja audio agregado tras anunciar error');

  // Una compilación beta anterior dejó una parte huérfana después de fallar una carga.
  const oldSuffix=JSON.parse(await run(`(async()=>{
    const db=await anDb(),id=await anPlainStageFile(db,new Blob([new Uint8Array(128).fill(16)]),1000);
    await anPutChunk(db,id,1,0,new Blob([new Uint8Array(80).fill(2)]));
    const broken=!(await anPlainHealth(db,id)).ok;
    await anRepairPlainOnOpen();
    const h=await anPlainHealth(db,id);
    return JSON.stringify({broken,healthy:h.ok,parts:h.m.parts,suffix:(await anCountPartChunks(db,id,1))});
  })()`));
  assert.deepEqual(oldSuffix,{broken:true,healthy:true,parts:1,suffix:0},
    'se limpia solo el agregado nunca confirmado, sin modificar el audio previo');

  // Recarga real: al volver a abrir se recupera la ficha interrumpida.
  await run(`(async()=>{
    const db=await anDb(),id=await anPlainStageFile(db,new Blob([new Uint8Array(72).fill(4)]),1000);
    const m=await anGetMeta(db,id),newPart=new Blob([new Uint8Array(53).fill(5)]);
    const p={mime:'audio/webm',origin:'grabado',chunks:1,bytes:newPart.size,ms:null,
      complete:false,hashes:[await anPlainHash(newPart)]};
    await anPutChunkMeta(db,{...m,state:'grabando',parts:2,bytes:m.bytes+newPart.size,
      plain:{parts:m.plain.parts.concat(p)}},1,0,newPart);
    localStorage.setItem('__betaRestartId',id);
    return id;
  })()`);
  await call('Page.navigate',{url});
  await wait("document.readyState==='complete' && typeof anRepairPlainOnOpen==='function'",'carga tras interrupción');
  await wait("(async()=>{const db=await anDb(),m=await anGetMeta(db,localStorage.getItem('__betaRestartId'));return m?.state==='cerrado'})()",'reparación automática al reabrir');
  const reopened=JSON.parse(await run(`(async()=>{
    const db=await anDb(),m=await anGetMeta(db,localStorage.getItem('__betaRestartId')),h=await anPlainHealth(db,m.id);
    return JSON.stringify({ok:h.ok,parts:m.parts,interrupted:m.plain.parts[1].interrumpida===true});
  })()`));
  assert.deepEqual(reopened,{ok:true,parts:2,interrupted:true},'el arranque recupera solo los fragmentos verificados');

  // Activar contraseña con audios en claro requiere consentimiento informado.
  await run(`(()=>{
    window.__enableConfirmationSeen=false;
    window.confirm=msg=>{if(msg.includes('SIN CIFRAR'))window.__enableConfirmationSeen=true;return false;};
    $('vaultNew').value='Clave ficticia 2026';$('vaultNew2').value='Clave ficticia 2026';
    $('vaultSetup').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    return true;
  })()`);
  await wait("window.__enableConfirmationSeen",'advertencia de privacidad al activar la contraseña');
  assert.equal(await run("vault.state==='off'"),true,'cancelar la advertencia evita activar la bóveda');


  // M1: activar la bóveda NO convierte una nota clara en cifrada ni la marca dañada.
  const mixedEdit=JSON.parse(await run(`(async()=>{
    $('saveAudio').checked=true;
    const enabled=await vault.enable('Clave ficticia segura para ensayo 2026');enabled.dek.fill(0);
    await vaultTakeTabLock();
    const id=${JSON.stringify(first.id)};
    const original=anTargetNow;let result;
    try{
      anTargetNow=()=>({mode:'parte',id,obligatorio:true});
      result=await anSaveFile(wav(),1000);
    }finally{anTargetNow=original}
    const db=await anDb(),h=await anPlainHealth(db,id);
    return JSON.stringify({noAppend:result===null,priorHealthy:h.ok,parts:h.m.parts,
      notMarkedDamaged:!anDamaged.has(id),stillPlain:anIsPlainMeta(h.m)});
  })()`));
  assert.deepEqual(mixedEdit,{noAppend:true,priorHealthy:true,parts:2,notMarkedDamaged:true,stillPlain:true},
    'M1: la bóveda abierta no daña ni vuelve ilegible un audio anterior claro');

  console.log('BETA AUDIO SIN CONTRASEÑA OK: flujo habitual, recuperación, rollback atómico, advertencia de privacidad, F1 y M1/M2');
}finally{
  closed=true;
  for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('cerrando Chrome'));}
  pending.clear();chrome.kill('SIGKILL');server.close();
  try{rmSync(profile,{recursive:true,force:true})}catch(e){}
}
