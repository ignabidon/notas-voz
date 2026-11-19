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
  console.log('BETA AUDIO SIN CONTRASEÑA OK: audio cargado, partes, MediaRecorder, reproductor, copia v2 y modo apagado');
}finally{
  closed=true;
  for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('cerrando Chrome'));}
  pending.clear();chrome.kill('SIGKILL');server.close();
  try{rmSync(profile,{recursive:true,force:true})}catch(e){}
}
