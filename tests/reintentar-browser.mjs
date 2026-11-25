// U14 (24/11/2026): reintentar la transcripción de una nota con audio guardado y sin texto.
// Chrome real, almacenamiento aislado, ondas sintéticas, sin voz ni datos de pacientes. Whisper se reemplaza por un sustituto: se comprueba que el audio
// de la nota se LEE y se entrega al proceso de transcripción, y que el texto queda en el editor sin tocar el audio.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
const profile=mkdtempSync(tmpdir()+'/dictavoz-reintento-');
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
  const SETUP = `(() => {
    $('saveAudio').checked=true; $('replace').checked=false;
    window.wav=()=>{
      const b=new ArrayBuffer(32044),v=new DataView(b),str=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
      str(0,'RIFF');v.setUint32(4,32036,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);
      v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,16000,true);
      v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,32000,true);
      for(let i=0;i<16000;i++)v.setInt16(44+2*i,Math.sin(i*2*Math.PI*440/8000)*2000,true);
      return new File([b],'tono-ficticio.wav',{type:'audio/wav'});
    };
    // Sustituto de Whisper: cuenta las muestras que recibe y al terminar «transcribe» un texto inventado.
    window.__fed = 0; window.__texto = 'Texto inventado de la persona X-901.';
    window.makeSegmenter = () => ({push(b){ window.__fed += b.length; }, flush(){ gotText = true; appendMachine(window.__texto); }});
    window.ensureModel = () => Promise.resolve();
  })()`;
  await run(SETUP);
  // 1) Una nota con audio y SIN texto (como queda cuando la transcripción falló).
  const n1 = JSON.parse(await run(`(async()=>{
    convClearComposer();convOpenId=null;convStartPending(true);
    await anSaveFile(wav(),1000);const id=convAudioId;
    await convSave();const e=convStore.data.entries.at(-1);
    return JSON.stringify({id,e});
  })()`));
  assert.ok(n1.e.audioId && n1.e.audioId === n1.id, 'la nota tiene su audio');
  assert.equal(n1.e.text, '', 'la nota quedó sin texto');
  await run(`document.querySelector('[data-delta-view=transcripcion]').click();convOpen(${JSON.stringify(n1.e.conversationId)})`);
  const botones = JSON.parse(await run(`JSON.stringify([...document.querySelectorAll('#convBubbles .conv-actions button')].map(b=>b.textContent))`));
  assert.ok(botones.includes('Transcribir audio'), 'se ofrece «Transcribir audio»: ' + botones);
  assert.ok(!botones.includes('Copiar'), 'sin texto no se ofrece «Copiar» directo');

  // 2) Tocar el botón: abre la nota en edición, lee el audio guardado y deja el texto en el editor.
  await run(`[...document.querySelectorAll('#convBubbles .conv-actions button')].find(b=>b.textContent==='Transcribir audio').click()`);
  await wait("$('text').value.includes('X-901')", 'el texto transcripto llega al editor');
  const t = JSON.parse(await run(`JSON.stringify({editando:convEditingId, fed:window.__fed, texto:$('text').value, nuevoAudio:convAudioId, vista:document.body.dataset.view})`));
  assert.equal(t.editando, n1.e.id, 'la nota queda en edición');
  assert.ok(t.fed > 30000, 'se entregó el audio de la nota a la transcripción (' + t.fed + ' muestras)');
  assert.equal(t.nuevoAudio, null, 'no se agregó ningún audio nuevo');
  assert.equal(t.texto, 'Texto inventado de la persona X-901.');
  // 3) Guardar: el texto queda en la MISMA nota y el audio sigue intacto.
  await wait("!anBusyN && !convSaving && !busy && outstanding===0 && !feeding", 'terminó la transcripción');
  const g = JSON.parse(await run(`(async()=>{
    await convSave();const db=await anDb(),e=convEntry(${JSON.stringify(n1.e.id)}),h=await anPlainHealth(db,e.audioId);
    return JSON.stringify({texto:e.text,audioId:e.audioId,editado:e.textEditedAt!==null,audioOk:h.ok,partes:e.audioParts,notas:convStore.data.entries.length});
  })()`));
  assert.equal(g.texto, 'Texto inventado de la persona X-901.');
  assert.equal(g.audioId, n1.id, 'el audio sigue unido a la misma nota');
  assert.equal(g.audioOk, true, 'el audio no se tocó');
  assert.equal(g.editado, true); assert.equal(g.notas, 1, 'no se creó otra nota');
  await run(`document.querySelector('[data-delta-view=transcripcion]').click();convOpen(${JSON.stringify(n1.e.conversationId)})`);
  const b2 = JSON.parse(await run(`JSON.stringify([...document.querySelectorAll('#convBubbles .conv-actions button')].map(b=>b.textContent))`));
  assert.ok(b2.includes('Copiar') && !b2.includes('Transcribir audio'), 'con texto vuelve «Copiar»: ' + b2);

  // 4) Una nota con texto no se vuelve a transcribir (no pisa nada).
  const antes = await run(`window.__fed`);
  await run(`convRetranscribe(${JSON.stringify(n1.e.id)})`);
  assert.equal(await run(`window.__fed`), antes, 'no se transcribió otra vez');
  assert.equal(await run(`convEditingId`), null, 'no abrió la edición');

  // 5) Si el audio ya no existe, la nota queda como estaba y se explica.
  const n2 = JSON.parse(await run(`(async()=>{
    convClearComposer();convOpenId=null;convStartPending(true);
    await anSaveFile(wav(),1000);const id=convAudioId;await convSave();const e=convStore.data.entries.at(-1);
    await anDelete(await anDb(),id);
    return JSON.stringify({id,e});
  })()`));
  await run(`convRetranscribe(${JSON.stringify(n2.e.id)})`);
  await wait("/No se pudo leer/.test($('status').textContent)", 'mensaje de audio no disponible');
  const f = JSON.parse(await run(`JSON.stringify({status:$('status').textContent,texto:convEntry(${JSON.stringify(n2.e.id)}).text,editorVacio:$('text').value===''})`));
  assert.match(f.status, /el audio ya no está disponible/); assert.equal(f.texto, ''); assert.equal(f.editorVacio, true);
  await wait("!feeding && !busy", 'la app quedó libre');

  // 6) Con la protección activada el audio está CIFRADO: se descifra solo para transcribir y sigue cifrado después.
  const PA = 'frase inventada de prueba 111';
  await call('Page.navigate',{url:'about:blank'}); await new Promise(r=>setTimeout(r,400));
  await call('Storage.clearDataForOrigin',{origin:url.replace(/\/$/,''),storageTypes:'all'});
  await call('Page.navigate',{url});
  await wait("document.readyState==='complete'&&typeof anSaveFile==='function'&&convStore.data!==null&&!vault.readOnly",'app lista otra vez');
  await run(SETUP);
  await run(`(async()=>{const r=await vault.enable(${JSON.stringify(PA)});r.dek.fill(0);await vaultTakeTabLock();vaultRefreshPanel();return 1})()`);
  assert.equal(await run('vault.state'),'open');
  const n3 = JSON.parse(await run(`(async()=>{
    convClearComposer();convOpenId=null;convStartPending(true);
    await anSaveFile(wav(),1000);const id=convAudioId;await convSave();const e=convStore.data.entries.at(-1);
    const m=await anGetMeta(await anDb(),id);
    return JSON.stringify({id,e,cifrado:!anIsPlainMeta(m)});
  })()`));
  assert.equal(n3.cifrado, true, 'el audio quedó cifrado'); assert.equal(n3.e.text, '');
  await run(`window.__fed=0;document.querySelector('[data-delta-view=transcripcion]').click();convOpen(${JSON.stringify(n3.e.conversationId)})`);
  await run(`[...document.querySelectorAll('#convBubbles .conv-actions button')].find(b=>b.textContent==='Transcribir audio').click()`);
  await wait("$('text').value.includes('X-901')", 'texto del audio cifrado');
  assert.ok(await run('window.__fed') > 30000, 'se descifró y se entregó el audio');
  await wait("!busy && outstanding===0 && !feeding", 'terminó');
  const g3 = JSON.parse(await run(`(async()=>{await convSave();const e=convEntry(${JSON.stringify(n3.e.id)}),m=await anGetMeta(await anDb(),e.audioId);
    return JSON.stringify({texto:e.text,mismo:e.audioId===${JSON.stringify(n3.id)},sigueCifrado:!anIsPlainMeta(m)})})()`));
  assert.equal(g3.texto,'Texto inventado de la persona X-901.'); assert.equal(g3.mismo,true); assert.equal(g3.sigueCifrado,true);

  console.log('REINTENTO OK: botón solo en notas con audio y sin texto, lee el audio guardado, deja el texto en la misma nota sin tocar el audio (claro y cifrado), no pisa texto y explica si falta el audio');
}finally{
  closed=true;
  for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('cerrando Chrome'));}
  pending.clear();chrome.kill('SIGKILL');server.close();
  try{rmSync(profile,{recursive:true,force:true})}catch(e){}
}
