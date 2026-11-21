// Audio por nota, etapa E2 (cifrado), en Chrome real (sin dependencias): CDP por WebSocket nativo de Node 22.
// Tono sintético en lugar de voz, bytes y nombres inventados. Sin micrófono ni datos reales.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';

const profile = mkdtempSync(tmpdir() + '/dictanota-audiocifrado-');
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(readFileSync(new URL('../index.html', import.meta.url))); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
// WebAuthn no acepta direcciones IP como dominio: se usa «localhost», que el navegador trata como contexto seguro.
const URL_APP = 'http://localhost:' + server.address().port + '/';
const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank']);
let ws;
try {
  const endpoint = await new Promise((resolve, reject) => { let log = ''; const t = setTimeout(() => reject(Error('Chrome timeout: ' + log)), 20000); chrome.on('error', reject); chrome.stderr.on('data', d => { log += d; const m = log.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); resolve(m[1]); } }); });
  ws = new WebSocket(endpoint); await new Promise(r => ws.addEventListener('open', r, {once: true}));
  let id = 0; const pending = new Map(), listeners = [];
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result); } else listeners.forEach(f => f(m)); });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, {resolve, reject}); ws.send(JSON.stringify({id: n, method, params, ...(sessionId ? {sessionId} : {})})); });
  const {targetInfos} = await send('Target.getTargets');
  const {sessionId} = await send('Target.attachToTarget', {targetId: targetInfos.find(t => t.type === 'page').targetId, flatten: true});
  const call = (m, p = {}) => send(m, p, sessionId);
  const run = async expression => { const r = await call('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true}); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const waitFor = async (expr, what, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { try { if (await run(expr)) return; } catch (e) {} await sleep(100); } throw Error('No se cumplió: ' + what); };
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

  await call('Page.enable'); await call('Runtime.enable');
  await load(false);
  assert.equal(await run('vault.state'), 'off');

  // 1) Sin protección, con «Conservar audio» apagado: no crear audio (el modo activo sin bóveda se prueba por separado).
  await run(`document.getElementById('saveAudio').checked = false; true`);
  assert.equal(await run(`anSaveFile(new File([new Uint8Array(1000)], 'x.mp3', {type: 'audio/mpeg'}), 1000)`), null);
  assert.ok(!(await bases()).includes('notasvoz-dictanota-audio'), 'sin protección no se usa la base nueva');

  // 2) Activar la protección (datos inventados).
  await run(`(async () => { const r = await vault.enable(${JSON.stringify(PASS)}); r.dek.fill(0); vaultRefreshPanel(); return true; })()`);
  assert.equal(await run('vault.state'), 'open');
  assert.equal(await run('!!vault.audioKey && vault.audioKey.extractable === false'), true);

  // 3) «Conservar audio» apagado: nada se guarda y la base nueva sigue sin existir (2.8).
  await run(`document.getElementById('saveAudio').checked = false; true`);
  assert.equal(await run(`anSaveFile(new File([new Uint8Array(1000)], 'x.mp3', {type: 'audio/mpeg'}), 1000)`), null);
  assert.ok(!(await bases()).includes('notasvoz-dictanota-audio'), 'con «Conservar audio» apagado no se crea la base nueva');
  await run(`document.getElementById('saveAudio').checked = true; true`);

  // 4) Grabación cifrada: se guarda por fragmentos, vuelve idéntica y ningún fragmento queda en claro.
  const g1 = JSON.parse(await grabar(3));
  assert.ok(g1.id, 'la grabación quedó anotada en el borrador');
  assert.deepEqual(g1.crudo, [0x1A, 0x45, 0xDF, 0xA3], 'el grabador entregó WebM');
  const l1 = JSON.parse(await leerAudio(g1.id));
  assert.equal(l1.length, 1); assert.equal(l1[0].origin, 'grabado'); assert.equal(l1[0].largo, g1.largo);
  assert.deepEqual(l1[0].sha, g1.sha, 'el audio descifrado es idéntico byte a byte');
  let c = JSON.parse(await crudo());
  assert.ok(c.bytes.length >= 3, 'se guardó en varios fragmentos');
  assert.ok(c.bytes.every(b => !tieneSecuencia(b, [0x1A, 0x45, 0xDF, 0xA3])), 'ninguna cabecera WebM en claro');
  assert.doesNotMatch(JSON.stringify(c.metas), /webm|grabado/, 'el detalle de las partes va cifrado');
  assert.equal(c.metas[0].state, 'cerrado');
  assert.equal(await run(`getDb().then(db => new Promise(r => { const q = db.transaction('meta').objectStore('meta').getAll(); q.onsuccess = () => r(q.result.length); }))`), 0, 'con la protección abierta no se escribe nada en la base vieja');

  // 5) Guardar la nota: queda unida al audio, con su duración.
  await run(`(async () => { const t = document.getElementById('text'); t.value = 'Persona Inventada Uno: texto inventado X-901'; t.dispatchEvent(new Event('input', {bubbles: true})); document.getElementById('save').click(); await new Promise(r => setTimeout(r, 50)); while (convSaving) await new Promise(r => setTimeout(r, 20)); await vault.flush(); return true; })()`);
  const nota = JSON.parse(await run(`JSON.stringify(convStore.data.entries[convStore.data.entries.length - 1])`));
  assert.equal(nota.audioId, g1.id); assert.equal(typeof nota.durationMs, 'number');
  assert.equal(await run('convAudioId'), null, 'el editor queda limpio');
  assert.ok(!(await run(`JSON.stringify(localStorage)`)).includes('X-901'), 'la nota quedó cifrada');

  // 6) Editar la nota y grabar otra vez: se suma una parte al mismo audio.
  await run(`convEdit(${JSON.stringify(nota.id)}); true`);
  const g2 = JSON.parse(await grabar(1));
  assert.equal(g2.id, g1.id, 'mismo audio');
  const l2 = JSON.parse(await leerAudio(g1.id));
  assert.equal(l2.length, 2); assert.deepEqual(l2[0].sha, g1.sha, 'la primera parte no cambió'); assert.deepEqual(l2[1].sha, g2.sha);
  await run(`document.getElementById('save').click(); true`);
  await waitFor('!convSaving && convAudioId === null', 'edición confirmada tras la comprobación del audio');
  await run('vault.flush().then(() => true)');
  assert.equal(await run(`convStore.data.entries.find(e => e.id === ${JSON.stringify(nota.id)}).audioId`), g1.id);

  // 7) Archivo cargado (bytes inventados, nombre inventado): se guarda cifrado en partes de 1 MB y cuenta como «ocupado».
  const f = JSON.parse(await run(`(async () => {
    const datos = new Uint8Array(2600000); for (let i = 0; i < datos.length; i += 65536) crypto.getRandomValues(datos.subarray(i, i + 65536));
    datos.set([0x49, 0x44, 0x33, 0x04], 0);   // «ID3»: como empieza un MP3
    const p = anSaveFile(new File([datos], 'Persona Inventada Uno.mp3', {type: 'audio/mpeg'}), 95000);
    const ocupado = vaultBusy(); const id = await p;
    return JSON.stringify({id, ocupado, pendiente: convAudioId, ms: convAudioMs, sha: [...new Uint8Array(await crypto.subtle.digest('SHA-256', datos))]});
  })()`));
  assert.ok(f.id); assert.equal(f.ocupado, true, 'el autobloqueo espera mientras se cifra'); assert.equal(f.pendiente, f.id); assert.equal(f.ms, 95000);
  const lf = JSON.parse(await leerAudio(f.id));
  assert.equal(lf[0].origin, 'cargado'); assert.equal(lf[0].largo, 2600000); assert.deepEqual(lf[0].sha, f.sha);
  c = JSON.parse(await crudo());
  assert.doesNotMatch(JSON.stringify(c.metas), /Persona|Inventada|mpeg/, 'el nombre del archivo no queda en claro');
  assert.ok(c.bytes.every(b => !tieneSecuencia(b.slice(0, 64), [0x49, 0x44, 0x33, 0x04])), 'ningún fragmento empieza en claro');
  assert.equal(await run(`anDb().then(db => anCountChunks(db, ${JSON.stringify(f.id)}))`), 3, '2,6 MB → 3 fragmentos');

  // 8) Descartar la nota sin guardar borra su audio pendiente (con aviso).
  await run(`document.getElementById('convDiscard').click(); true`);
  await waitFor(`anDb().then(db => anGetMeta(db, ${JSON.stringify(f.id)})).then(m => m === undefined)`, 'audio descartado');
  assert.equal(await run('convAudioId'), null);

  // Entrega 2: confirmar una nota exclusivamente con audio cifrado, aunque Whisper no haya producido texto.
  const only = JSON.parse(await run(`(async () => {
    convClearComposer(); convOpenId = null; convStartPending(true);
    const id = await anSaveFile(new File([new Uint8Array([1,2,3,4,5,6])], 'audio-inventado.mp3', {type:'audio/mpeg'}), 1200);
    $('text').value = ''; refreshConvEditor();
    const button = $('save').querySelector('span').textContent, visible = !$('save').hidden;
    dead = true; await convSave(); dead = false;
    const entry = convStore.data.entries.at(-1);
    return JSON.stringify({id, button, visible, entry, remaining: convAudioId});
  })()`));
  assert.ok(only.id && only.visible);
  assert.equal(only.button, 'Guardar solo audio');
  assert.equal(only.entry.audioId, only.id);
  assert.equal(only.entry.text, '', 'no fabricar texto para sortear validaciones');
  assert.equal(only.entry.transcriptionStatus, 'error');
  assert.equal(only.entry.audioParts, 1);
  assert.equal(only.remaining, null, 'el editor se limpia solo al confirmar el guardado');

  // Sin lugar para cifrar la nota, el audio y el borrador sobreviven y se puede reintentar.
  const quota = JSON.parse(await run(`(async () => {
    convClearComposer(); convOpenId = null; convStartPending(true);
    const id = await anSaveFile(new File([new Uint8Array([5,4,3,2,1])], 'cuota-inventada.mp3', {type:'audio/mpeg'}), 1200);
    const count = convStore.data.entries.length;
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k,v) {
      if (k === 'notasvoz.boveda.v1.r.conversaciones') throw new DOMException('cuota','QuotaExceededError');
      return original.call(this,k,v);
    };
    try { await convSave(); }
    finally { Storage.prototype.setItem = original; }
    const unchanged = convStore.data.entries.length === count && convAudioId === id;
    const retained = !!(await anGetMeta(await anDb(), id));
    await convSave();
    return JSON.stringify({unchanged, retained, saved: convStore.data.entries.at(-1).audioId === id});
  })()`));
  assert.equal(quota.unchanged, true, 'no limpiar ni dar por guardada una nota cuya escritura falló');
  assert.equal(quota.retained, true, 'el audio persiste tras la cuota agotada');
  assert.equal(quota.saved, true, 'reintento confirma el vínculo');

  // Fragmento alterado: una nota sin texto no puede confirmar un audio dañado; no se borra nada.
  const bad = JSON.parse(await run(`(async () => {
    convClearComposer(); convOpenId = null; convStartPending(true);
    const id = await anSaveFile(new File([new Uint8Array([9,9,9,9,9])], 'danado-inventado.mp3', {type:'audio/mpeg'}), 1200);
    const db = await anDb(), before = convStore.data.entries.length;
    await anPutChunk(db, id, 0, 0, new Blob([new Uint8Array([0,1,2])]));
    await convSave();
    return JSON.stringify({notSaved: convStore.data.entries.length === before, pending: convAudioId === id, exists: !!(await anGetMeta(db,id))});
  })()`));
  assert.equal(bad.notSaved && bad.pending && bad.exists, true, 'conservar el audio dañado y el borrador sin inventar éxito');

  // Integridad también con texto: un audio alterado no debe aceptarse solamente porque hay transcripción.
  const badWithText = JSON.parse(await run(`(async () => {
    convClearComposer(); convOpenId = null; convStartPending(true);
    const id = await anSaveFile(new File([new Uint8Array([4,8,1,3])], 'con-texto-inventado.mp3', {type:'audio/mpeg'}), 900);
    $('text').value = 'Texto inventado asociado a un audio corrupto'; refreshConvEditor();
    const db = await anDb(), before = convStore.data.entries.length;
    await anPutChunk(db, id, 0, 0, new Blob([new Uint8Array([2,2,2])]));
    await convSave();
    return JSON.stringify({notSaved: convStore.data.entries.length === before, pending: convAudioId === id,
      textKept: $('text').value.includes('Texto inventado'), exists: !!(await anGetMeta(db, id))});
  })()`));
  assert.equal(badWithText.notSaved && badWithText.pending && badWithText.textKept && badWithText.exists, true,
    'la nota con texto tampoco confirma un vínculo a un audio dañado');

  // 9) Cortes: una grabación interrumpida y un archivo a medio guardar; al volver a abrir se resuelven (tabla 2.5).
  const corte = JSON.parse(await run(`(async () => {
    const r = anBeginRecording('audio/webm');
    anRecChunk(r, new Blob([new Uint8Array([1, 2, 3, 4, 5])])); anRecChunk(r, new Blob([new Uint8Array([6, 7, 8])])); await r.q;
    const db = await anDb(), id2 = anNewId(), k = await anNewCek(vault.audioKey, vault.header.id, id2);
    await anPutMeta(db, {...anNewMeta(id2, Date.now(), 'escribiendo'), parts: 1, key: k.box,
      sealed: await anSealDetail(vault.audioKey, vault.header.id, id2, {parts: [{mime: 'audio/mpeg', chunks: 2, bytes: 10, ms: 0, origin: 'cargado', complete: true}]})});
    await anPutChunk(db, id2, 0, 0, await anSealChunk(k.cek, vault.header.id, id2, 0, 0, new Uint8Array(5)));
    saveDraft(); await vault.flush();
    return JSON.stringify({grabando: r.id, escribiendo: id2, estado: (await anGetMeta(db, r.id)).state});
  })()`));
  assert.equal(corte.estado, 'grabando');
  await load(true);
  assert.equal(await run('vault.state'), 'locked');
  await run(`(async () => { await vault.unlockPassword(${JSON.stringify(PASS)}); await vaultAfterUnlock(); return true; })()`);
  await waitFor(`anDb().then(db => anGetMeta(db, ${JSON.stringify(corte.grabando)})).then(m => m && m.state === 'cerrado')`, 'grabación interrumpida cerrada');
  await waitFor(`anDb().then(db => anGetMeta(db, ${JSON.stringify(corte.escribiendo)})).then(m => m === undefined)`, 'archivo a medio guardar descartado');
  const li = JSON.parse(await leerAudio(corte.grabando));
  assert.equal(li.length, 1); assert.equal(li[0].largo, 8, 'quedó con lo que alcanzó a guardarse');
  assert.equal(await run('convAudioId'), corte.grabando, 'sigue unida a la nota pendiente');
  assert.equal(await run(`anDb().then(db => anGetMeta(db, ${JSON.stringify(g1.id)})).then(m => m.state)`), 'cerrado', 'lo demás no se tocó');

  // 10) Borrar una nota borra también su audio.
  await run(`convDelete(${JSON.stringify(nota.id)}); true`);
  await waitFor(`anDb().then(db => anGetMeta(db, ${JSON.stringify(g1.id)})).then(m => m === undefined)`, 'audio de la nota borrada');
  assert.equal(await run(`anDb().then(db => anCountChunks(db, ${JSON.stringify(g1.id)}))`), 0);

  // 11) Tope de 30 MB (D4) y textos de la interfaz.
  assert.equal(await run(`IMPORT_MAX_BYTES`), 30 * 1024 * 1024);
  assert.match(await run(`document.getElementById('loadAudioHint').textContent`), /30 MB/);
  console.log('AUDIO CIFRADO E2 OK: sin protección o sin «Conservar audio» no usa la base nueva; grabación y archivo cifrados e idénticos; partes; nota unida; descartar y borrar; cortes resueltos al abrir.');
} finally {
  try { ws && ws.close(); } catch (e) {}
  chrome.kill('SIGKILL'); server.close();
  try { rmSync(profile, {recursive: true, force: true}); } catch (e) {}
}
