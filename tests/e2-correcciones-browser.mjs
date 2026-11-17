// Correcciones de E2 (revisión de ChatGPT sobre 2c88ce1), en Chrome real y sin dependencias (CDP por WebSocket de Node 22).
// Reproduce cada falla: quitar la protección con audios, cambiar de nota A ↔ B, cancelar, falta de espacio (texto y audio),
// cortes al agregar una segunda parte, audio dañado y dos pestañas reales. Tono sintético y textos inventados: sin datos reales.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';

const profile = mkdtempSync(tmpdir() + '/dictanota-e2fix-');
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(readFileSync(new URL('../index.html', import.meta.url))); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL_APP = 'http://localhost:' + server.address().port + '/';
const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank']);
let ws;
try {
  const endpoint = await new Promise((resolve, reject) => { let log = ''; const t = setTimeout(() => reject(Error('Chrome timeout: ' + log)), 20000); chrome.on('error', reject); chrome.stderr.on('data', d => { log += d; const m = log.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); resolve(m[1]); } }); });
  ws = new WebSocket(endpoint); await new Promise(r => ws.addEventListener('open', r, {once: true}));
  let id = 0; const pending = new Map(), listeners = [];
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result); } else listeners.forEach(f => f(m)); });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, {resolve, reject}); ws.send(JSON.stringify({id: n, method, params, ...(sessionId ? {sessionId} : {})})); });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // Una «pestaña»: cada página del navegador con su propia sesión de depuración. Las confirmaciones se aceptan.
  const tab = async targetId => {
    const {sessionId} = await send('Target.attachToTarget', {targetId, flatten: true});
    const call = (m, p = {}) => send(m, p, sessionId);
    listeners.push(m => { if (m.sessionId === sessionId && m.method === 'Page.javascriptDialogOpening') call('Page.handleJavaScriptDialog', {accept: true}); });
    const run = async expression => { const r = await call('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true}); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
    const waitFor = async (expr, what, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { try { if (await run(expr)) return; } catch (e) {} await sleep(100); } throw Error('No se cumplió: ' + what); };
    await call('Page.enable'); await call('Runtime.enable');
    return {call, run, waitFor};
  };
  const ready = 'document.readyState === "complete" && typeof anSaveFile === "function" && typeof convStore === "object"';
  // Registro de avisos (flash) para comprobar qué se le dijo al usuario.
  const espiar = `(() => { window.__avisos = []; new MutationObserver(() => { const t = document.getElementById('flash').textContent; if (t) window.__avisos.push(t); }).observe(document.getElementById('flash'), {childList: true, characterData: true, subtree: true}); return true; })()`;
  const PASS = 'frase de prueba inventada 901';

  const {targetInfos} = await send('Target.getTargets');
  const A = await tab(targetInfos.find(t => t.type === 'page').targetId);
  const load = async (T, reload) => {
    if (reload) { await T.run('window.__viejo = true'); await T.call('Page.reload', {ignoreCache: true}); await T.waitFor('!window.__viejo', 'recarga'); }
    else await T.call('Page.navigate', {url: URL_APP});
    await T.waitFor(ready, 'carga'); await T.run(espiar);
  };
  const desbloquear = T => T.run(`(async () => { await vault.unlockPassword(${JSON.stringify(PASS)}); await vaultAfterUnlock(); return true; })()`);
  const avisos = T => T.run('JSON.stringify(window.__avisos)').then(JSON.parse);
  const limpiarAvisos = T => T.run('window.__avisos = []; true');
  const meta = (T, id) => T.run(`anDb().then(db => anGetMeta(db, ${JSON.stringify(id)})).then(m => m ? JSON.stringify(m) : null)`).then(x => x && JSON.parse(x));
  const detalle = (T, id) => T.run(`(async () => { const m = await anGetMeta(await anDb(), ${JSON.stringify(id)}); return JSON.stringify(await anOpenDetail(vault.audioKey, vault.header.id, m.id, m.sealed)); })()`).then(JSON.parse);
  const leer = (T, id) => T.run(`(async () => {
    const partes = await anReadAudio(await anDb(), vault.audioKey, vault.header.id, ${JSON.stringify(id)}), out = [];
    for (const p of partes) { const b = new Uint8Array(await p.blob.arrayBuffer()); out.push({largo: b.length, sha: [...new Uint8Array(await crypto.subtle.digest('SHA-256', b))].join(',')}); }
    return JSON.stringify(out);
  })()`).then(JSON.parse);
  const entrada = (T, id) => T.run(`JSON.stringify(convStore.data.entries.find(e => e.id === ${JSON.stringify(id)}) || null)`).then(JSON.parse);
  // Archivo inventado (bytes al azar con cabecera «ID3» de mentira); se guarda como si se hubiera cargado.
  const archivo = (T, largo, nombre = 'Persona Inventada Uno.mp3') => T.run(`(async () => {
    const d = new Uint8Array(${largo}); for (let i = 0; i < d.length; i += 65536) crypto.getRandomValues(d.subarray(i, i + 65536)); d.set([0x49, 0x44, 0x33, 0x04], 0);
    const id = await anSaveFile(new File([d], ${JSON.stringify(nombre)}, {type: 'audio/mpeg'}), 4000);
    return JSON.stringify({id, sha: [...new Uint8Array(await crypto.subtle.digest('SHA-256', d))].join(',')});
  })()`).then(JSON.parse);
  const escribir = (T, texto) => T.run(`(() => { const t = document.getElementById('text'); t.value = ${JSON.stringify(texto)}; t.dispatchEvent(new Event('input', {bubbles: true})); return true; })()`);
  const guardar = async T => { await T.run(`document.getElementById('save').click(); true`); await T.waitFor('!convSaving', 'fin del guardado'); };
  const ultima = T => T.run('JSON.stringify(convStore.data.entries[convStore.data.entries.length - 1])').then(JSON.parse);
  // «Grabación» con un tono sintético (sin micrófono ni voz). antesDeCortar(i) corre en la página antes de cada fragmento.
  const grabar = (T, cortes, antesDeCortar = '') => T.run(`(async () => {
    const ac = new AudioContext(), osc = ac.createOscillator(), dst = ac.createMediaStreamDestination(); osc.frequency.value = 330; osc.connect(dst); osc.start();
    const rec = new MediaRecorder(dst.stream); window.__crudo = []; rec.addEventListener('dataavailable', e => { if (e.data.size) window.__crudo.push(e.data); });
    mr = rec; startAudioNota(rec);
    for (let i = 0; i < ${cortes}; i++) { await new Promise(r => setTimeout(r, 600)); ${antesDeCortar} rec.requestData(); }
    await new Promise(r => setTimeout(r, 400)); rec._deltaStopRequested = true; rec.stop(); osc.stop(); await new Promise(r => setTimeout(r, 300)); ac.close();
    while (anBusyN > 0) await new Promise(r => setTimeout(r, 50));
    return JSON.stringify({id: convAudioId, ms: convAudioMs, base: convAudioBase, primero: window.__crudo.length ? window.__crudo[0].size : 0});
  })()`).then(JSON.parse);
  const nAudios = T => T.run(`anDb().then(db => anListMeta(db)).then(l => l.length)`);

  await load(A, false);
  await A.run(`(async () => { const r = await vault.enable(${JSON.stringify(PASS)}); r.dek.fill(0); await vaultTakeTabLock(); vaultRefreshPanel(); document.getElementById('saveAudio').checked = true; return true; })()`);
  assert.equal(await A.run('vault.state'), 'open'); assert.equal(await A.run('vault.readOnly'), false);
  // Sin audios todavía: la guarda cuenta 0 y no crea la base de audios.
  assert.equal(await A.run('anStoredCount()'), 0);
  assert.equal(await A.run(`indexedDB.databases().then(l => l.some(d => d.name === AN_DB))`), false, 'contar no crea la base');

  // ---------- Nota A con audio (archivo) y nota B sin audio ----------
  const fA = await archivo(A, 1500000);
  await escribir(A, 'Nota A inventada: Persona Inventada Uno, X-901'); await guardar(A);
  const notaA = await ultima(A); assert.equal(notaA.audioId, fA.id);
  await escribir(A, 'Nota B inventada sin audio'); await guardar(A);
  const notaB = await ultima(A); assert.equal(notaB.audioId, null);

  // ---------- 1) Quitar la protección con audios guardados: se impide y se explica ----------
  await A.run(`vaultEl('vaultMsg').textContent = ''; vaultEl('vaultDisable').click(); true`);
  await A.waitFor(`/no se puede quitar todavía/.test(vaultEl('vaultMsg').textContent)`, 'explicación al quitar la protección');
  assert.match(await A.run(`vaultEl('vaultMsg').textContent`), /un audio guardado[\s\S]*no se podrían volver a escuchar/);
  await assert.rejects(A.run(`vault.disable(${JSON.stringify(PASS)})`), /no se puede quitar todavía/);
  assert.equal(await A.run('vault.state'), 'open'); assert.ok(await A.run(`localStorage.getItem('notasvoz.boveda.v1') !== null`), 'la cabecera sigue');

  // ---------- 2) Editar A, grabarle una parte y querer pasar a B: se niega; cancelar quita solo la parte nueva ----------
  await A.run(`convEdit(${JSON.stringify(notaA.id)}); true`);
  const g = await grabar(A, 2);
  assert.equal(g.id, fA.id, 'la grabación se suma al audio de A'); assert.equal(g.base, 1, 'recuerda que A tenía 1 parte');
  assert.equal((await meta(A, fA.id)).parts, 2);
  await limpiarAvisos(A);
  await A.run(`convEdit(${JSON.stringify(notaB.id)}); true`);
  assert.equal(await A.run('convEditingId'), notaA.id, 'no pasa a B con el audio de A pendiente');
  assert.match((await avisos(A)).join(' '), /Primero guardá o cancelá la edición de la nota actual/);
  await limpiarAvisos(A);
  await A.run(`document.getElementById('convCancelEdit').click(); true`);
  await A.waitFor('convEditingId === null && !convSaving', 'fin de la cancelación');
  assert.match((await avisos(A)).join(' '), /la nota guardada no cambió y se quitó el audio agregado/);
  assert.equal((await meta(A, fA.id)).parts, 1, 'el audio de A volvió a su única parte');
  const lA = await leer(A, fA.id); assert.equal(lA.length, 1); assert.equal(lA[0].sha, fA.sha, 'y es idéntico al original');
  assert.equal((await entrada(A, notaA.id)).audioId, fA.id);

  // Sin cambios, sí se puede pasar de A a B; la grabación sobre B crea su propio audio y A no cambia.
  await A.run(`convEdit(${JSON.stringify(notaA.id)}); convEdit(${JSON.stringify(notaB.id)}); true`);
  assert.equal(await A.run('convEditingId'), notaB.id); assert.equal(await A.run('convAudioId'), null, 'no arrastra audio de A');
  const gB = await grabar(A, 1);
  assert.notEqual(gB.id, fA.id); assert.equal(gB.base, null, 'B no tenía audio: no hay partes que recortar');
  // Una segunda grabación en la misma edición se suma al mismo audio (no deja uno suelto).
  const gB2 = await grabar(A, 1);
  assert.equal(gB2.id, gB.id); assert.equal((await meta(A, gB.id)).parts, 2);
  await guardar(A);
  assert.equal((await entrada(A, notaB.id)).audioId, gB.id); assert.equal((await entrada(A, notaA.id)).audioId, fA.id);

  // Editar una nota sin audio, grabar y cancelar: el audio nuevo se borra entero (y el mensaje lo dice).
  await escribir(A, 'Nota C inventada'); await guardar(A); const notaC = await ultima(A);
  await A.run(`convEdit(${JSON.stringify(notaC.id)}); true`);
  const gC = await grabar(A, 1);
  await limpiarAvisos(A);
  await A.run(`document.getElementById('convCancelEdit').click(); true`);
  await A.waitFor(`convEditingId === null`, 'cancelación C');
  await A.waitFor(`anDb().then(db => anGetMeta(db, ${JSON.stringify(gC.id)})).then(m => m === undefined)`, 'audio nuevo de la edición borrado');
  assert.match((await avisos(A)).join(' '), /se quitó el audio agregado/);
  assert.equal((await entrada(A, notaC.id)).audioId, null);

  // ---------- 3) Un audio que termina de guardarse después de cambiar de nota no se une a la otra ----------
  const tarde = JSON.parse(await A.run(`(async () => {
    const d = new Uint8Array(600000); crypto.getRandomValues(d.subarray(0, 65536));
    const p = anSaveFile(new File([d], 'inventado.mp3', {type: 'audio/mpeg'}), 1000);
    convEdit(${JSON.stringify(notaA.id)}); const durante = convEditingId;   // bloqueado mientras se cifra
    convClearComposer();                                                  // el editor pasa a otra cosa antes de que termine
    const id = await p;
    return JSON.stringify({id, durante, pendiente: convAudioId});
  })()`));
  assert.equal(tarde.durante, null, 'no se puede pasar a editar otra nota mientras se cifra un audio');
  assert.ok(tarde.id); assert.equal(tarde.pendiente, null, 'no quedó unido al editor nuevo');
  assert.ok(await meta(A, tarde.id), 'quedó guardado, sin nota (D8)');
  assert.match((await avisos(A)).join(' '), /quedó guardado aparte, sin unirse a ninguna/);

  // ---------- 4) Borrar una nota nunca borra un audio que usa otra ----------
  await escribir(A, 'Nota D inventada'); await guardar(A); const notaD = await ultima(A);
  // Dato viejo simulado: D apunta al mismo audio que A.
  assert.equal(await A.run(`(async () => { const ok = convStore.save(convSetAudio(convStore.data, ${JSON.stringify(notaD.id)}, ${JSON.stringify(fA.id)}, null)).ok; await vault.flush(); return ok; })()`), true);
  await limpiarAvisos(A);
  await A.run(`convDelete(${JSON.stringify(notaD.id)}); true`);
  await A.waitFor(`!convStore.data.entries.some(e => e.id === ${JSON.stringify(notaD.id)})`, 'nota D borrada');
  await sleep(300);
  assert.ok(await meta(A, fA.id), 'el audio de A sigue');
  assert.match((await avisos(A)).join(' '), /Su audio lo usa otra nota y se conserva/);

  // ---------- 5) Falta de espacio al guardar el texto cifrado: no se anuncia nada, el texto y su audio quedan ----------
  const fE = await archivo(A, 300000, 'inventado-e.mp3');
  await escribir(A, 'Nota E inventada X-901');
  const antes = await A.run(`localStorage.getItem(VAULT_REC_PREFIX + VAULT_KEYS[CONV_KEY])`);
  await A.run(`(() => { const o = Storage.prototype.setItem; window.__setItemOriginal = o;
    Storage.prototype.setItem = function (k, v) { if (String(k).startsWith(VAULT_REC_PREFIX)) throw new DOMException('lleno (prueba)', 'QuotaExceededError'); return o.call(this, k, v); }; return true; })()`);
  await limpiarAvisos(A);
  const n0 = await A.run('convStore.data.entries.length');
  await guardar(A);
  assert.match((await avisos(A)).join(' '), /No se guardó: no hay espacio para guardar cifrado\. El texto y su audio siguen en el editor/);
  assert.doesNotMatch((await avisos(A)).join(' '), /Guardado en|Guardado como/, 'no anuncia éxito');
  assert.equal(await A.run(`document.getElementById('text').value`), 'Nota E inventada X-901', 'el texto sigue');
  assert.equal(await A.run('convAudioId'), fE.id, 'y su vínculo con el audio');
  assert.equal(await A.run('convStore.data.entries.length'), n0, 'no aparece una burbuja que no se guardó');
  assert.equal(await A.run(`localStorage.getItem(VAULT_REC_PREFIX + VAULT_KEYS[CONV_KEY])`), antes, 'el registro guardado no cambió');
  await A.run(`Storage.prototype.setItem = window.__setItemOriginal; true`);
  await guardar(A);   // reintento
  const notaE = await ultima(A);
  assert.equal(notaE.audioId, fE.id); assert.equal(await A.run('convAudioId'), null);
  assert.notEqual(await A.run(`localStorage.getItem(VAULT_REC_PREFIX + VAULT_KEYS[CONV_KEY])`), antes, 'ahora sí llegó al almacenamiento');

  // ---------- 6) Falta de espacio en plena grabación: el audio queda marcado incompleto y sin duración ----------
  await A.run(`(() => { const o = IDBObjectStore.prototype.put; window.__putOriginal = o; window.__lugar = 1;
    IDBObjectStore.prototype.put = function (...a) { if (this.name === 'chunks' && window.__lugar-- <= 0) throw new DOMException('lleno (prueba)', 'QuotaExceededError'); return o.apply(this, a); }; return true; })()`);
  await limpiarAvisos(A);
  const gI = await grabar(A, 3);
  await A.run(`IDBObjectStore.prototype.put = window.__putOriginal; true`);
  assert.ok(gI.id);
  const dI = await detalle(A, gI.id);
  assert.equal(dI.parts.length, 1); assert.equal(dI.parts[0].incompleta, true); assert.equal(dI.parts[0].ms, null, 'sin duración engañosa');
  assert.equal(dI.parts[0].chunks, 1, 'solo el fragmento que entró');
  assert.equal(gI.ms, null, 'la nota no recibe una duración completa');
  const lI = await leer(A, gI.id); assert.equal(lI[0].largo, gI.primero, 'lo guardado se lee entero');
  assert.match((await avisos(A)).join(' '), /El audio quedó incompleto/);
  await A.run(`document.getElementById('convDiscard').click(); true`);
  await A.waitFor(`anDb().then(db => anGetMeta(db, ${JSON.stringify(gI.id)})).then(m => m === undefined)`, 'descartado');

  // ---------- 7) Cortes al agregar una segunda parte ----------
  // 7a) Grabación cortada a mitad de la segunda parte de A: al reabrir se cierra como interrumpida, sigue la edición y cancelar la quita.
  await A.run(`convEdit(${JSON.stringify(notaA.id)}); true`);
  await A.run(`(async () => { const r = anBeginRecording('audio/webm'); anRecChunk(r, new Blob([new Uint8Array([9, 8, 7, 6])])); await r.q; saveDraft(); await vault.flush(); return true; })()`);
  assert.equal((await meta(A, fA.id)).state, 'grabando');
  await load(A, true); await desbloquear(A);
  await A.waitFor(`anDb().then(db => anGetMeta(db, ${JSON.stringify(fA.id)})).then(m => m.state === 'cerrado')`, 'segunda parte cerrada al reabrir');
  const d7 = await detalle(A, fA.id);
  assert.equal(d7.parts.length, 2); assert.equal(d7.parts[1].interrumpida, true); assert.equal(d7.parts[1].ms, null);
  assert.equal(await A.run('convEditingId'), notaA.id, 'la edición sigue abierta');
  assert.equal(await A.run('convAudioBase'), 1, 'y recuerda las partes originales');
  await A.run(`document.getElementById('convCancelEdit').click(); true`);
  await A.waitFor(`convEditingId === null && !convSaving`, 'cancelación tras el corte');
  assert.equal((await meta(A, fA.id)).parts, 1);
  assert.equal((await leer(A, fA.id))[0].sha, fA.sha, 'A quedó como estaba');
  // 7b) Archivo cortado mientras se agregaba como segunda parte: la ficha nunca cambió y los restos se limpian.
  await A.run(`(async () => { const db = await anDb(), m = await anGetMeta(db, ${JSON.stringify(fA.id)}), cek = await anOpenCek(vault.audioKey, vault.header.id, m.id, m.key);
    await anPutChunk(db, m.id, 1, 0, await anSealChunk(cek, vault.header.id, m.id, 1, 0, new Uint8Array(100))); return true; })()`);
  await load(A, true); await desbloquear(A);
  await A.waitFor(`anDb().then(db => anCountPartChunks(db, ${JSON.stringify(fA.id)}, 1)).then(n => n === 0)`, 'restos de la parte cortada limpiados');
  assert.equal((await meta(A, fA.id)).parts, 1); assert.equal((await leer(A, fA.id))[0].sha, fA.sha);

  // ---------- 8) Audio dañado: se detecta, se avisa y se conserva sin cambios ----------
  const sano = await meta(A, fA.id);
  await A.run(`(async () => { const db = await anDb(), m = await anGetMeta(db, ${JSON.stringify(fA.id)});
    const ct = m.sealed.ct; m.sealed = {...m.sealed, ct: (ct[5] === 'A' ? 'B' : 'A') + ct.slice(1)}; await anPutMeta(db, m); return true; })()`);
  const danado = await meta(A, fA.id);
  const trozos = await A.run(`anDb().then(db => anCountChunks(db, ${JSON.stringify(fA.id)}))`);
  await load(A, true); await desbloquear(A);
  await A.waitFor(`window.__avisos.some(t => /Hay un audio dañado/.test(t))`, 'aviso de audio dañado');
  assert.deepEqual(await meta(A, fA.id), danado, 'la ficha no se tocó');
  assert.equal(await A.run(`anDb().then(db => anCountChunks(db, ${JSON.stringify(fA.id)}))`), trozos, 'ni sus fragmentos');
  await A.run(`convEdit(${JSON.stringify(notaA.id)}); true`);
  await limpiarAvisos(A);
  assert.equal((await archivo(A, 50000)).id, null, 'no se agrega nada a un audio dañado');
  await grabar(A, 1);
  assert.match((await avisos(A)).join(' '), /dañado o incompleto: se conserva como está/);
  assert.equal(await A.run('convAudioId'), null, 'no se crea otro audio en su lugar');
  assert.deepEqual(await meta(A, fA.id), danado);
  await A.run(`document.getElementById('convCancelEdit').click(); true`);
  assert.equal((await entrada(A, notaA.id)).audioId, fA.id, 'la nota sigue apuntando a su audio');
  assert.notDeepEqual(sano, danado);

  // ---------- 9) Dos pestañas reales: la segunda no guarda nada ----------
  const {targetId: tid2} = await send('Target.createTarget', {url: 'about:blank'});
  const B = await tab(tid2);
  await load(B, false); await desbloquear(B);
  assert.equal(await B.run('vault.readOnly'), true, 'la segunda pestaña queda en solo lectura');
  assert.equal(await B.run(`!document.getElementById('tabLockWarn').hidden && /otra pestaña/.test(document.getElementById('tabLockWarn').textContent)`), true);
  assert.equal(await A.run('vault.readOnly'), false);
  const foto = () => A.run(`JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))`);
  const antesB = await foto(), audiosAntes = await nAudios(A);
  await escribir(B, 'Texto inventado de la segunda pestaña');
  await guardar(B);
  assert.match((await avisos(B)).join(' '), /No se guardó: DictaNota está abierta en otra pestaña/);
  await B.run('saveDraft(); persistUndo(); true');
  assert.equal(await B.run(`(() => { try { vaultStore.setItem(PKEY, '[]'); return 'escribió'; } catch (e) { return e.name; } })()`), 'OtraPestana');
  assert.equal(await B.run(`document.getElementById('saveAudio').checked = true; anSaveFile(new File([new Uint8Array(1000)], 'b.mp3', {type: 'audio/mpeg'}), 1000)`), null);
  await B.run(`vaultEl('vaultDisable').click(); true`);
  await B.waitFor(`/otra pestaña/.test(vaultEl('vaultMsg').textContent)`, 'quitar la protección desde la segunda');
  await sleep(1700);   // pasa un ciclo del borrador automático
  assert.equal(await foto(), antesB, 'el almacenamiento no cambió por la segunda pestaña');
  assert.equal(await nAudios(A), audiosAntes);
  // La primera sigue guardando normalmente.
  await escribir(A, 'Nota F inventada desde la primera pestaña'); await guardar(A);
  assert.equal((await ultima(A)).text, 'Nota F inventada desde la primera pestaña');
  await send('Target.closeTarget', {targetId: tid2});

  // ---------- 10) Sin audios guardados, quitar la protección vuelve a funcionar ----------
  await A.run(`(async () => { const l = await anListMeta(await anDb()); for (const m of l) await anDeleteAudio(m.id); return true; })()`);
  assert.equal(await nAudios(A), 0);
  await A.run(`vault.disable(${JSON.stringify(PASS)}).then(() => true)`);
  assert.equal(await A.run('vault.state'), 'off');

  console.log('E2 CORRECCIONES OK: quitar la protección con audios se impide; A ↔ B sin cruzar audios; cancelar quita solo lo agregado; audio tardío sin nota; borrar respeta audios compartidos; sin espacio al guardar conserva texto y audio; grabación sin espacio marcada incompleta; cortes en la segunda parte; audio dañado conservado; dos pestañas reales.');
} finally {
  try { ws && ws.close(); } catch (e) {}
  chrome.kill('SIGKILL'); server.close();
  try { rmSync(profile, {recursive: true, force: true}); } catch (e) {}
}
