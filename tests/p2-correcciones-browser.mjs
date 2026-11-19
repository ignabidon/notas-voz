// Correcciones del PR #60 en Chrome real, con perfil limpio y solo audios sintéticos (tonos inventados).
// Recorre una biblioteca MEZCLADA: audios sin cifrar (uno completo, uno cortado a mitad de escritura) y uno cifrado.
// Comprueba: la guarda de «quitar la protección», el panel de almacenamiento, la copia formato 1 que usa la app
// (que avisa lo que no lleva) y el ensayo de copia formato 2 (que declara cada exclusión en su inventario).
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';

const profile = mkdtempSync(tmpdir() + '/dictavoz-p2c-');
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(readFileSync(new URL('../index.html', import.meta.url))); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = 'http://localhost:' + server.address().port + '/';
const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank']);
let ws;
const PASS = 'clave inventada de corrección 906';
try {
  const endpoint = await new Promise((resolve, reject) => {
    let log = ''; const timer = setTimeout(() => reject(Error('Chrome timeout: ' + log)), 30000);
    chrome.on('error', reject); chrome.stderr.on('data', d => { log += d; const m = log.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
  });
  ws = new WebSocket(endpoint); await new Promise(r => ws.addEventListener('open', r, {once: true}));
  let seq = 0; const pending = new Map();
  ws.addEventListener('message', e => { const x = JSON.parse(e.data); if (x.id && pending.has(x.id)) { const p = pending.get(x.id); pending.delete(x.id); x.error ? p.reject(Error(JSON.stringify(x.error))) : p.resolve(x.result); } });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, {resolve, reject}); ws.send(JSON.stringify({id, method, params, ...(sessionId ? {sessionId} : {})})); });
  const {targetInfos} = await send('Target.getTargets');
  const {sessionId} = await send('Target.attachToTarget', {targetId: targetInfos.find(t => t.type === 'page').targetId, flatten: true});
  const call = (method, params = {}) => send(method, params, sessionId);
  const run = async expression => { const r = await call('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true}); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  const json = async code => JSON.parse(await run('(async()=>{' + code + '})()'));
  await call('Page.enable'); await call('Runtime.enable'); await call('Page.navigate', {url});
  for (let i = 0; i < 100; i++) { if (await run('document.readyState==="complete" && typeof copia2Audios==="function"')) break; await new Promise(r => setTimeout(r, 100)); if (i === 99) throw Error('App sin iniciar'); }
  assert.equal(await run('vault.state'), 'off');
  await run(`window.__dl = []; window.download = f => { window.__dl.push(f); }; true`);

  // ===== 1) Sin protección: un audio sin cifrar completo y otro cortado a mitad de escritura =====
  const ids = await json(`
    const db = await anDb(), raw = new Uint8Array(AN_FILE_CHUNK + 333); for (let i = 0; i < raw.length; i++) raw[i] = (i * 7) % 253;
    window.__raw = raw;
    const claro = await anPlainStageFile(db, new File([raw], 'tono-inventado.wav', {type: 'audio/wav'}), 3000);
    // Corte simulado: el segundo fragmento no llega a leerse (como si se cerrara la app o faltara espacio).
    class Cortado extends Blob { slice(a, b){ if (a > 0) return {size: b - a, arrayBuffer: () => Promise.reject(new DOMException('corte simulado', 'QuotaExceededError'))}; return super.slice(a, b); } }
    const f = new Cortado([new Uint8Array(AN_FILE_CHUNK + 10)], {type: 'audio/wav'});
    let error = ''; try { await anPlainStageFile(db, f, 1000); } catch (e) { error = e.name; }
    const metas = await anListMeta(db), cortado = metas.find(m => m.id !== claro);
    return JSON.stringify({claro, cortado: cortado.id, estado: cortado.state, error, trozos: await anCountChunks(db, cortado.id)});`);
  assert.equal(ids.error, 'QuotaExceededError', 'el corte se informa, no se disimula');
  assert.equal(ids.estado, 'escribiendo', 'la ficha cortada queda marcada como no confirmada');
  assert.equal(ids.trozos, 1, 'quedó solo lo que alcanzó a escribirse; no se borró solo');
  let kinds = await json(`const k = await anStoredKinds(); return JSON.stringify({total: k.total, cifrados: k.cifrados, claros: k.claros});`);
  assert.deepEqual(kinds, {total: 2, cifrados: 0, claros: 2});

  // Panel sin protección: el audio completo puede prepararse como nota; el incompleto sigue sin acciones.
  const panelOff = await json(`await e3RefreshSpace(); const rows = [...document.querySelectorAll('#e3AudioList .e3-audio-row')];
    return JSON.stringify({msg: document.getElementById('e3SpaceMsg').textContent, filas: rows.map(r => ({modo: r.dataset.modo || '', texto: r.textContent, botones: r.querySelectorAll('button').length}))});`);
  assert.match(panelOff.msg, /^0 audio\(s\) cifrado\(s\) · .* · 2 audio\(s\) SIN CIFRAR \(no protegidos\)/);
  assert.equal(panelOff.filas.length, 2);
  for (const f of panelOff.filas) { assert.equal(f.modo, 'claro'); assert.equal(f.botones, /a medio guardar/.test(f.texto) ? 0 : 2); assert.match(f.texto, /SIN CIFRAR/); }
  assert.equal(panelOff.filas.filter(f => /a medio guardar/.test(f.texto)).length, 1, 'el cortado se nombra como tal');

  // Ensayo de copia 2 sin protección: entra el completo (cifrado en el archivo) y el cortado queda declarado.
  const c2off = await json(`
    const c = await vaultCreate('contraseña inventada del archivo 907'), key = await vaultImportDataKey(c.dek); c.dek.fill(0);
    const w = copia2Writer(c.header, key, 'completa', Date.now()); await w.config({cfg: null, generador: null});
    const total = await copia2Audios(w, 'completa', {}), file = await w.finish(total);
    const r = await copia2Verify(file, h => copiaOpenWithSecret(h, 'contraseña inventada del archivo 907'));
    const bytes = new Uint8Array(await file.arrayBuffer()), needle = window.__raw.subarray(5000, 5064);
    let visible = false; for (let i = 0; i + 64 <= bytes.length && !visible; i++) { let j = 0; while (j < 64 && bytes[i + j] === needle[j]) j++; visible = j === 64; }
    return JSON.stringify({total, audios: r.audios, claro: r.claro, excl: r.exclusiones, motivos: r.motivos, todo: r.todoIncluido, texto: copia2Describe(r), visible});`);
  assert.deepEqual([c2off.total, c2off.audios, c2off.claro, c2off.excl, c2off.todo], [2, 1, 1, 1, false]);
  assert.deepEqual(c2off.motivos, {'a-medio-guardar': 1});
  assert.match(c2off.texto, /INCOMPLETA: faltan 1 audio de la biblioteca \(1 audio quedó a medio guardar\)/);
  assert.equal(c2off.visible, false, 'el audio que estaba sin cifrar no aparece legible en la copia');

  // ===== 2) Se activa la protección y se guarda un audio cifrado (sintético) =====
  const enc = await json(`
    const r = await vault.enable(${JSON.stringify(PASS)}); r.dek.fill(0); await vaultTakeTabLock(); await anReviewOnOpen();
    const db = await anDb(), hid = vault.header.id, kAudio = vault.audioKey, id = anNewId(), k = await anNewCek(kAudio, hid, id);
    const datos = [new Uint8Array(900).fill(11), new Uint8Array(250).fill(12)];
    const detail = {parts: [{mime: 'audio/webm', chunks: 2, bytes: 1150, ms: 2000, origin: 'grabado', complete: true}]};
    await anPutMeta(db, {...anSetState(anNewMeta(id, Date.now(), 'grabando'), 'cerrado'), parts: 1, bytes: 1150, key: k.box, sealed: await anSealDetail(kAudio, hid, id, detail)});
    for (let n = 0; n < 2; n++) await anPutChunk(db, id, 0, n, await anSealChunk(k.cek, hid, id, 0, n, datos[n]));
    const h = await anAudioHealth(db, kAudio, hid, id);
    return JSON.stringify({id, sano: h.ok, claroSigue: (await anPlainHealth(db, ${JSON.stringify(ids.claro)})).ok, damaged: anDamaged.size});`);
  assert.equal(enc.sano, true); assert.equal(enc.claroSigue, true, 'activar la protección no toca el audio sin cifrar'); assert.equal(enc.damaged, 0);
  kinds = await json(`const k = await anStoredKinds(); return JSON.stringify({total: k.total, cifrados: k.cifrados, claros: k.claros});`);
  assert.deepEqual(kinds, {total: 3, cifrados: 1, claros: 2});

  // Corrección 1: la guarda cuenta SOLO el audio cifrado.
  const guard = await run('vault.disableGuard()');
  assert.match(guard, /hay un audio guardado/, 'un solo audio cifrado (los 2 sin cifrar no cuentan): ' + guard);

  // Corrección 2: panel con la protección abierta.
  const panelOn = await json(`await e3RefreshSpace(); const rows = [...document.querySelectorAll('#e3AudioList .e3-audio-row')];
    return JSON.stringify({msg: document.getElementById('e3SpaceMsg').textContent, filas: rows.map(r => ({modo: r.dataset.modo || '', botones: [...r.querySelectorAll('button')].map(b => b.textContent)}))});`);
  assert.match(panelOn.msg, /^1 audio\(s\) cifrado\(s\) · .* · 2 audio\(s\) SIN CIFRAR/);
  assert.deepEqual(panelOn.filas.map(f => f.modo).sort(), ['', 'claro', 'claro']);
  assert.deepEqual(panelOn.filas.find(f => !f.modo).botones, ['Preparar nota', 'Borrar audio'], 'el cifrado sin nota conserva sus acciones');
  assert.deepEqual(panelOn.filas.filter(f => f.modo).map(f => f.botones.length).sort(), [0, 2]);
  // Un audio sin cifrar sano puede recuperarse sin contraseña; uno incompleto conserva sus datos.
  const acciones = await json(`
    const db = await anDb(), id = ${JSON.stringify(ids.claro)}, h = await anAudioHealth(db, vault.audioKey, vault.header.id, id);
    await e3Recover(id); const recover = document.getElementById('flash').textContent;
    const enlazado = convAudioId === id;
    convClearComposer();
    window.confirm = () => false; await e3Remove(null, id);
    return JSON.stringify({why: h.why, recover, enlazado, sigue: (await anPlainHealth(db, id)).ok, borrador: convAudioId});`);
  assert.equal(acciones.why, 'sin cifrar');
  assert.match(acciones.recover, /Audio recuperado como borrador/);
  assert.equal(acciones.enlazado, true);
  assert.equal(acciones.sigue, true); assert.equal(acciones.borrador, null);

  // La beta cambia a formato 2 cuando hay audios sin cifrar; se cifran dentro del archivo de copia.
  const c1 = await json(`
    document.getElementById('copiaCompleta').checked = true;
    const file = await copiaCreate(); const r = await copia2Verify(file, async () => ({key: vault.key, audioKey: vault.audioKey}));
    return JSON.stringify({msg: document.getElementById('copiaMsg').textContent, audios: r.audios, claro:r.claro,excl:r.exclusiones,formato: r.formato});`);
  assert.equal(c1.formato, 2); assert.equal(c1.audios, 2, 'incluye un cifrado y un sin cifrar');
  assert.equal(c1.claro,1);
  assert.equal(c1.excl,1,'declara la ficha incompleta en vez de inventar una copia completa');
  assert.match(c1.msg, /Copia creada y comprobada: .*2 audios incluidos y cifrados en la copia/);
  assert.match(c1.msg, /Atención, la copia NO está completa: un audio dañado o a medio guardar no entró/);
  // Solo texto: también avisa los sin cifrar que no lleva.
  const c1t = await json(`document.getElementById('copiaSoloTexto').checked = true; await copiaCreate(); return JSON.stringify({msg: document.getElementById('copiaMsg').textContent});`);
  assert.match(c1t.msg, /solo texto, sin audios[\s\S]*NO está completa: 2 audios guardados sin cifrar no entraron\./);
  await run(`document.getElementById('copiaCompleta').checked = true; true`);

  // Corrección 4: copia 2 de la biblioteca mezclada, con la clave abierta: entran los dos sanos; el cortado queda declarado.
  const mix = await json(`
    const w = copia2Writer(vault.header, vault.key, 'completa', Date.now()); await w.config({cfg: null, generador: null});
    const total = await copia2Audios(w, 'completa', {kAudio: vault.audioKey, hid: vault.header.id}), file = await w.finish(total);
    const r = await copia2Verify(file, h => copiaOpenWithSecret(h, ${JSON.stringify(PASS)}));
    return JSON.stringify({total, audios: r.audios, cifrado: r.cifrado, claro: r.claro, excl: r.exclusiones, motivos: r.motivos, fragmentos: r.fragmentos, bytesAudio: r.bytesAudio, texto: copia2Describe(r)});`);
  assert.deepEqual([mix.total, mix.audios, mix.cifrado, mix.claro, mix.excl, mix.fragmentos], [3, 2, 1, 1, 1, 4]);
  assert.equal(mix.bytesAudio, 1150 + 1048576 + 333);
  assert.match(mix.texto, /2 audios \(1 cifrado, 1 guardado sin cifrar y cifrado en la copia\) · INCOMPLETA/);

  // Corrección 5: un fragmento sin cifrar alterado → ese audio queda excluido como dañado, no se copia mal en silencio.
  const dam = await json(`
    const db = await anDb(), id = ${JSON.stringify(ids.claro)}, old = await anGetChunk(db, id, 0, 1);
    await anPutChunk(db, id, 0, 1, new Blob([new Uint8Array(333).fill(1)]));
    const w = copia2Writer(vault.header, vault.key, 'completa', Date.now()); await w.config({});
    const total = await copia2Audios(w, 'completa', {kAudio: vault.audioKey, hid: vault.header.id});
    const r = await copia2Verify(await w.finish(total), h => copiaOpenWithSecret(h, ${JSON.stringify(PASS)}));
    await anPutChunk(db, id, 0, 1, old);
    return JSON.stringify({audios: r.audios, motivos: r.motivos, restaurado: (await anPlainHealth(db, id)).ok});`);
  assert.equal(dam.audios, 1); assert.deepEqual(dam.motivos, {'a-medio-guardar': 1, 'danado': 1}); assert.equal(dam.restaurado, true);
  // Copia 2 de solo texto: declara los 3 audios que no lleva.
  const txt = await json(`
    const w = copia2Writer(vault.header, vault.key, 'solo-texto', Date.now()); await w.config({});
    const total = await copia2Audios(w, 'solo-texto', {}); const r = await copia2Verify(await w.finish(total), h => copiaOpenWithSecret(h, ${JSON.stringify(PASS)}));
    return JSON.stringify({audios: r.audios, excl: r.exclusiones, motivos: r.motivos});`);
  assert.deepEqual(txt, {audios: 0, excl: 3, motivos: {'solo-texto': 3}});

  // Corrección 1, de punta a punta: sin el audio cifrado, la protección se puede quitar aunque queden audios sin cifrar.
  const off = await json(`
    const db = await anDb(); await anDelete(db, ${JSON.stringify(enc.id)});
    const guard = await vault.disableGuard(); await vault.disable(${JSON.stringify(PASS)});
    const k = await anStoredKinds();
    return JSON.stringify({guard, state: vault.state, claros: k.claros, sano: (await anPlainHealth(db, ${JSON.stringify(ids.claro)})).ok});`);
  assert.deepEqual(off, {guard: '', state: 'off', claros: 2, sano: true});
  // Sin la clave: un audio cifrado (si lo hubiera) se declara «cifrado-sin-clave», nunca se saltea.
  const sinClave = await json(`
    const db = await anDb(), id = 'audio-cifrado-huerfano-inventado';
    await anPutMeta(db, {...anSetState(anNewMeta(id, Date.now(), 'grabando'), 'cerrado'), parts: 1, bytes: 1, key: {iv: 'AAAAAAAAAAAAAAAA', ct: 'AA=='}, sealed: {iv: 'AAAAAAAAAAAAAAAA', ct: 'AA=='}});
    const c = await vaultCreate('contraseña inventada del archivo 908'), key = await vaultImportDataKey(c.dek); c.dek.fill(0);
    const w = copia2Writer(c.header, key, 'completa', Date.now()); await w.config({});
    const total = await copia2Audios(w, 'completa', {}); const r = await copia2Verify(await w.finish(total), h => copiaOpenWithSecret(h, 'contraseña inventada del archivo 908'));
    await anDelete(db, id);
    return JSON.stringify({total, audios: r.audios, motivos: r.motivos});`);
  assert.deepEqual(sinClave, {total: 3, audios: 1, motivos: {'a-medio-guardar': 1, 'cifrado-sin-clave': 1}});
  console.log('CORRECCIONES #60 OK: guarda, panel, copia 1 con avisos, copia 2 mezclada con exclusiones declaradas y corte de escritura');
} finally {
  try { ws?.close(); } catch (e) {}
  chrome.kill('SIGKILL'); server.close();
  try { rmSync(profile, {recursive: true, force: true}); } catch (e) {}
}
