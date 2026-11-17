// Audio por nota, etapa E2 (cifrado), en Chrome real (sin dependencias): CDP por WebSocket nativo de Node 22.
// Tono sintético en lugar de voz, bytes y nombres inventados. Sin micrófono ni datos reales.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';

const profile = mkdtempSync(tmpdir() + '/dictanota-audiocifrado-');
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(readFileSync(new URL('../index.html', import.meta.url))); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
// WebAuthn no acepta direcciones IP como dominio: se usa «localhost», que el navegador trata como contexto seguro.
const URL_APP = 'http://localhost:' + server.address().port + '/';
const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required', '--remote-debugging-pipe', '--user-data-dir=' + profile, 'about:blank'], {stdio:['ignore','pipe','pipe','pipe','pipe']});
let ws;
try {
  let id = 0, buffer = ''; const pending = new Map(), listeners = [];
  chrome.stdio[4].on('data', data => {
    buffer += data.toString();
    for (;;) {
      const end = buffer.indexOf('\0'); if (end < 0) break;
      const raw = buffer.slice(0,end); buffer = buffer.slice(end+1); if (!raw) continue;
      const m = JSON.parse(raw);
      if (m.id) { const p = pending.get(m.id); if (!p) continue; pending.delete(m.id); clearTimeout(p.timer); m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result); }
      else listeners.forEach(f => f(m));
    }
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve,reject) => {
    const n = ++id, timer = setTimeout(() => reject(Error('CDP timeout: ' + method)), 30000);
    pending.set(n,{resolve,reject,timer});
    chrome.stdio[3].write(JSON.stringify({id:n,method,params,...(sessionId ? {sessionId} : {})}) + '\0');
  });
  const {targetInfos} = await send('Target.getTargets');
  const {sessionId} = await send('Target.attachToTarget', {targetId: targetInfos.find(t => t.type === 'page').targetId, flatten: true});
  const call = (m, p = {}) => send(m, p, sessionId);
  const run = async expression => { if(process.env.DEBUG_E3) console.log(expression.slice(0,120)); const r = await call('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true, timeout:5000}); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const waitFor = async (expr, what, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { try { if (await run(expr)) return; } catch (e) { if(process.env.DEBUG_E3) console.log(e.message); } await sleep(100); } throw Error('No se cumplió: ' + what); };
  // Confirmaciones (confirm) de la app: se aceptan.
  listeners.push(m => { if (m.method === 'Page.javascriptDialogOpening') call('Page.handleJavaScriptDialog', {accept: true}); });
  const ready = 'document.readyState === "complete" && typeof anSaveFile === "function" && typeof convStore === "object"';
  const PASS = 'frase de prueba inventada 901';
  const load = async reload => { if (reload) { await run('window.__viejo = true'); await call('Page.reload', {ignoreCache: true}); await waitFor('!window.__viejo', 'recarga'); } else await call('Page.navigate', {url: URL_APP}); await waitFor(ready, 'carga'); };
  const bases = () => run('indexedDB.databases().then(l => l.map(d => d.name).sort())');
  const idle = () => waitFor('anBusyN === 0', 'fin del guardado cifrado');
  // Todo lo que hay en la base nueva, en bruto, para buscar texto o audio en claro.
  const crudo = () => run(`(async () => {
    const db = await anDb();
    const leer = s => new Promise(res => { const r = db.transaction(s).objectStore(s).getAll(); r.onsuccess = () => res(r.result); });
    const metas = await leer('meta'), chunks = await leer('chunks');
    const bytes = await Promise.all(chunks.map(b => b.arrayBuffer().then(x => [...new Uint8Array(x)])));
    return JSON.stringify({metas, bytes});
  })()`);
  const tieneSecuencia = (arr, seq) => { for (let i = 0; i + seq.length <= arr.length; i++) { let ok = true; for (let j = 0; j < seq.length; j++) if (arr[i + j] !== seq[j]) { ok = false; break; } if (ok) return true; } return false; };
  // «Grabación» con un tono sintético (sin micrófono ni voz). Se fuerzan fragmentos con requestData.
  const grabar = (cortes) => run(`(async () => {
    const ac = new AudioContext(), osc = ac.createOscillator(), dst = ac.createMediaStreamDestination(); osc.frequency.value = 440; osc.connect(dst); osc.start();
    const rec = new MediaRecorder(dst.stream); window.__crudo = []; rec.addEventListener('dataavailable', e => { if (e.data.size) window.__crudo.push(e.data); });
    mr = rec; startAudioNota(rec);
    for (let i = 0; i < ${cortes}; i++) { await new Promise(r => setTimeout(r, 700)); rec.requestData(); }
    await new Promise(r => setTimeout(r, 400)); rec._deltaStopRequested = true; rec.stop(); osc.stop(); await new Promise(r => setTimeout(r, 300)); ac.close();
    while (anBusyN > 0) await new Promise(r => setTimeout(r, 50));
    const crudo = new Uint8Array(await new Blob(window.__crudo).arrayBuffer());
    return JSON.stringify({id: convAudioId, ms: convAudioMs, crudo: [...crudo.subarray(0, 4)], largo: crudo.length, sha: [...new Uint8Array(await crypto.subtle.digest('SHA-256', crudo))]});
  })()`);
  const leerAudio = id => run(`(async () => {
    const partes = await anReadAudio(await anDb(), vault.audioKey, vault.header.id, ${JSON.stringify(id)});
    const out = [];
    for (const p of partes) { const b = new Uint8Array(await p.blob.arrayBuffer()); out.push({mime: p.mime, origin: p.origin, largo: b.length, sha: [...new Uint8Array(await crypto.subtle.digest('SHA-256', b))]}); }
    return JSON.stringify(out);
  })()`);


  listeners.push(m=>{if(m.method==='Runtime.exceptionThrown') console.error(JSON.stringify(m.params));});
  await call('Page.enable'); await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', {width:360,height:800,deviceScaleFactor:1,mobile:true});
  if(process.env.E3_OFFLINE){
    await call('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
    listeners.push(m=>{if(m.method==='Fetch.requestPaused'){
      const body=m.params.request.url===URL_APP?readFileSync(new URL('../index.html',import.meta.url)).toString('base64'):'';
      call('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html; charset=utf-8'}],body});
    }});
  }
  await load(false);
  assert.equal(await run('vault.state'), 'off');
  await run("document.querySelector('[data-delta-view=ajustes]').click()");
  await run('e3RefreshSpace()');
  assert.ok(!(await bases()).includes('notasvoz-dictanota-audio'), 'mirar espacio no crea la base');
  await run(`(async () => { const r=await vault.enable(${JSON.stringify(PASS)}); r.dek.fill(0); vaultRefreshPanel(); $('saveAudio').checked=true;
    window.wav = () => { const b=new ArrayBuffer(80044), v=new DataView(b), str=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
      str(0,'RIFF');v.setUint32(4,80036,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
      v.setUint32(24,8000,true);v.setUint32(28,16000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,80000,true);
      for(let i=0;i<40000;i++)v.setInt16(44+i*2,Math.sin(i*2*Math.PI*440/8000)*2000,true);
      return new File([b],'tono-inventado.wav',{type:'audio/wav'}); };
    window.__urls=new Set(); const create=URL.createObjectURL.bind(URL), revoke=URL.revokeObjectURL.bind(URL);
    URL.createObjectURL=b=>{const u=create(b);__urls.add(u);return u}; URL.revokeObjectURL=u=>{__urls.delete(u);revoke(u)};
    window.__persistCalls=0; navigator.storage.persist=async()=>{__persistCalls++;return false};
  })()`);
  const createNote = async (text, parts=1) => {
    await run(`(async()=>{ convClearComposer(); convOpenId=null; convStartPending(true);
      $('replace').checked=false; /* sin «empezar de cero»: el segundo archivo se suma como segunda parte del mismo audio */
      for(let i=0;i<${parts};i++)await anSaveFile(wav(),5000);
      $('text').value=${JSON.stringify(text)}; $('text').dispatchEvent(new Event('input',{bubbles:true})); await convSave();
    })()`);
    return await run('convStore.data.entries.at(-1)');
  };
  const A=await createNote('Persona Inventada Uno X-901',2), B=await createNote('Persona Inventada Dos X-902');
  assert.equal(await run('__persistCalls'),1,'persistencia solicitada al primer audio');
  await run(`document.querySelector('[data-delta-view=transcripcion]').click(); convOpen(${JSON.stringify(A.conversationId)})`);
  const before=await crudo();
  assert.equal(await run('__urls.size'),0,'abrir cuaderno no descifra audio');
  await run("document.querySelector('.note-audio button').click()");
  await waitFor('e3Current && !e3Current.loading && !e3Current.audio.paused','audio real reproduciendo');
  assert.equal(await run('__urls.size'),1);
  await run("document.querySelector('.note-audio button').click()");
  assert.equal(await run('e3Current.audio.paused'),true,'pausa real');
  await run("document.querySelector('.note-audio button').click()");
  await waitFor('e3Current && !e3Current.audio.paused','reanudar');
  await run("const slider=document.querySelector('.note-audio input');slider.value=6;slider.dispatchEvent(new Event('change'))");
  await waitFor('e3Current && e3Current.part===1 && !e3Current.loading && e3Current.audio.currentTime>=0.8','adelantar a la segunda parte');
  assert.equal(await run('__urls.size'),1,'solo una parte descifrada con URL');
  await run(`convOpen(${JSON.stringify(B.conversationId)})`);
  assert.equal(await run('e3Current===null && __urls.size===0'),true,'cambiar cuaderno libera audio');
  await run("document.querySelector('.note-audio button').click()");
  await waitFor('e3Current && !e3Current.loading && !e3Current.audio.paused','segundo audio');
  await waitFor('e3Current===null','final del audio libera memoria',12000);
  assert.equal(await run('__urls.size'),0);
  assert.equal(await crudo(),before,'reproducir no modifica datos cifrados');
  // Descifrado pendiente: salir no debe crear una URL tardía.
  await run(`window.__openChunk=anOpenChunk; window.__gate=null; anOpenChunk=async(...a)=>{await new Promise(r=>__gate=r);return __openChunk(...a)};
    document.querySelector('.note-audio button').click()`);
  await waitFor('!!__gate','descifrado demorado');
  await run("document.querySelector('[data-delta-view=ajustes]').click()");
  await sleep(100);
  await run('__gate();anOpenChunk=__openChunk');
  await sleep(200);
  assert.equal(await run('e3Current===null && __urls.size===0'),true,'salida durante descifrado no deja audio accesible');
  // Capturas y geometría de controles.
  await run(`document.querySelector('[data-delta-view=transcripcion]').click();convOpen(${JSON.stringify(A.conversationId)})`);
  for(const width of [320,360,412,760]){
    await call('Emulation.setDeviceMetricsOverride',{width,height:800,deviceScaleFactor:1,mobile:true});
    const dimensions=await run("({overflow:document.documentElement.scrollWidth>innerWidth,button:document.querySelector('.note-audio button').getBoundingClientRect().height,range:document.querySelector('.note-audio input').getBoundingClientRect().height})");
    assert.equal(dimensions.overflow,false,'sin desborde '+width);assert.ok(dimensions.button>=48 && dimensions.range>=48);
    if(width===360 || width===412){const shot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(new URL('../e3-'+width+'.png',import.meta.url),Buffer.from(shot.data,'base64'));}
  }
  // Audio huérfano recuperado con confirmación persistente de la nota.
  const orphan=await run("(async()=>{convClearComposer();await anSaveFile(wav(),5000);const id=convAudioId;convClearComposer();return id})()");
  await run(`document.querySelector('[data-delta-view=ajustes]').click(); true`);
  // Abrir Ajustes ya actualiza el panel por su cuenta: se espera el resultado en lugar de pedir otra actualización que lo pisaría.
  await waitFor("$('e3AudioList').textContent.includes('Audio sin nota')",'lista con el audio sin nota');
  assert.match(await run("$('e3AudioList').textContent"),/Audio sin nota/);
  await run(`e3Recover(${JSON.stringify(orphan)})`);
  assert.equal(await run(`convStore.data.entries.filter(e=>e.audioId===${JSON.stringify(orphan)}).length`),1);
  const recovered=await run('convStore.data.entries.at(-1)');
  assert.equal(await run('vault.saved(CONV_KEY)'),true);
  // Borrar solo audio conserva texto y sello. Un error de disco no debe borrar audio.
  await run(`window.__set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='notasvoz.boveda.v1.r.conversaciones')throw new DOMException('lleno','QuotaExceededError');return __set.call(this,k,v)};`);
  await run(`e3Remove(${JSON.stringify(recovered.id)},${JSON.stringify(orphan)})`);
  assert.equal(await run(`convEntry(${JSON.stringify(recovered.id)}).audioId`),orphan);
  assert.equal(await run(`anDb().then(db=>anGetMeta(db,${JSON.stringify(orphan)})).then(Boolean)`),true);
  await run('(async()=>{Storage.prototype.setItem=__set;await vault.flush();return true})()');
  await run(`e3Remove(${JSON.stringify(recovered.id)},${JSON.stringify(orphan)})`);
  assert.equal(await run(`convEntry(${JSON.stringify(recovered.id)}).audioId`),null);
  assert.equal(await run(`convEntry(${JSON.stringify(recovered.id)}).text`),recovered.text);
  assert.equal(await run(`convEntry(${JSON.stringify(recovered.id)}).savedAt`),recovered.savedAt);
  assert.equal(await run(`anDb().then(db=>anGetMeta(db,${JSON.stringify(orphan)})).then(Boolean)`),false);
  // Referencia inexistente: texto intacto y sin fallo de la pantalla.
  await run(`(async()=>{await anDeleteAudio(${JSON.stringify(B.audioId)});convOpen(${JSON.stringify(B.conversationId)});document.querySelector('.note-audio button').click();return true})()`);
  await waitFor("document.querySelector('.note-audio-status').textContent.includes('no disponible')",'audio ausente');
  assert.equal(await run('__urls.size'),0);
  // Autobloqueo no se inhibe por reproducción; se fuerza el reloj de inactividad.
  await run(`convOpen(${JSON.stringify(A.conversationId)});document.querySelector('.note-audio button').click()`);
  await waitFor('e3Current && !e3Current.loading && !e3Current.audio.paused','audio antes del bloqueo');
  assert.equal(await run('vaultBusy()'),false);
  await run('vaultLastActivity=Date.now()-VAULT_IDLE_MS-1000');
  await waitFor("vault.state==='locked'",'autobloqueo con audio',25000);
  assert.equal(await run('e3Current===null'),true);
  console.log('E3 OK: reproducción WAV real, partes, pausa, seek, salida durante descifrado, URLs liberadas, huérfanos, error de escritura, borrado solo audio, referencia ausente, autobloqueo y anchos 320/360/412/760.');
} finally {
  chrome.kill('SIGKILL'); server.close();
  try { rmSync(profile,{recursive:true,force:true}); } catch(e) {}
}

