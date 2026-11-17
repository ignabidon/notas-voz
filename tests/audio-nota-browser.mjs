// Audio por nota, etapa E1, en Chrome real (sin dependencias): CDP por WebSocket nativo de Node 22.
// Comprueba que la base nueva está apagada, que lo de Delta 11 no cambia y que el bloque anda si se lo llama. Datos inventados; sin micrófono.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';

const profile = mkdtempSync(tmpdir() + '/dictanota-audionota-');
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(readFileSync(new URL('../index.html', import.meta.url))); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
// WebAuthn no acepta direcciones IP como dominio: se usa «localhost», que el navegador trata como contexto seguro.
const URL_APP = 'http://localhost:' + server.address().port + '/';
const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank']);
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
  const ready = 'document.readyState === "complete" && typeof anOpen === "function" && typeof getDb === "function"';
  const load = async reload => { if (reload) { await run('window.__viejo = true'); await call('Page.reload', {ignoreCache: true}); await waitFor('!window.__viejo', 'recarga'); } else await call('Page.navigate', {url: URL_APP}); await waitFor(ready, 'carga'); };
  const bases = () => run('indexedDB.databases().then(l => l.map(d => d.name).sort())');
  // Foto de lo que existe de Delta 11: notas y audio suelto en la base histórica.
  const fotoViejo = () => run(`(async () => {
    const db = await getDb();
    const leer = (s) => new Promise(res => { const r = db.transaction(s).objectStore(s).getAll(); r.onsuccess = () => res(r.result); });
    const meta = await leer('meta'), chunks = await leer('chunks');
    const bytes = await Promise.all(chunks.map(c => c.b.arrayBuffer().then(b => [c.k, [...new Uint8Array(b)].join(',')])));
    return JSON.stringify({notas: localStorage.getItem('notasvoz.gamma.v1'), meta, bytes});
  })()`);

  await load(false);
  // Sembrar datos inventados de Delta 11.
  await run(`(async () => {
    localStorage.setItem('notasvoz.gamma.v1', JSON.stringify([{id: 'n1', title: 'Persona Inventada Uno', text: 'texto inventado X-901'}]));
    await audioPutMeta({id: 'last', sid: 's1', parts: 1}); await audioPutChunk('s1', 0, new Blob([new Uint8Array([1, 2, 3, 4])])); return true;
  })()`);
  const antes = await fotoViejo();
  assert.ok(antes.includes('X-901') && antes.includes('1,2,3,4'), 'la siembra no quedó');

  // 1) Apagado: cargar la app no crea la base nueva ni cambia lo de Delta 11.
  await load(true);
  assert.deepEqual(await bases(), ['notasvoz-gamma-audio'], 'la base nueva no debe existir al cargar la app');
  assert.equal(await fotoViejo(), antes, 'los datos de Delta 11 cambiaron');
  assert.equal(await run('typeof anTakeLock'), 'function');

  // 2) Si alguien la llama, funciona: ficha + primer fragmento juntos, fragmentos, estados, conteo y lectura.
  const r = JSON.parse(await run(`(async () => {
    const out = {}, db = await anOpen();
    out.stores = [...db.objectStoreNames].sort(); out.version = db.version;
    const bin = (...n) => new Blob([new Uint8Array(n)]);
    const id = anNewId(), m = anNewMeta(id, Date.now());
    await anStart(db, m, bin(10, 11));
    await anPutChunk(db, id, 0, 1, bin(12, 13)); await anPutChunk(db, id, 1, 0, bin(14));
    await anPutMeta(db, {...anSetState({...m, parts: 2, bytes: 5}, 'cerrado')});
    out.count = await anCountChunks(db, id);
    out.chunk = [...new Uint8Array(await (await anGetChunk(db, id, 0, 1)).arrayBuffer())];
    out.estado = (await anGetMeta(db, id)).state;
    // Otro audio, para comprobar que borrar uno no toca al otro.
    const id2 = anNewId(); await anStart(db, anNewMeta(id2, Date.now()), bin(20)); await anPutChunk(db, id2, 0, 1, bin(21));
    out.revision = anReview(await anListMeta(db), {[id]: out.count, [id2]: 2}, [id], []).audios.map(a => a.action).sort();
    // Cortar una grabación a la mitad: la ficha y el primer fragmento van juntos o no queda ninguno.
    const id3 = anNewId(); let fallo = false;
    try { await anStart(db, anNewMeta(id3, Date.now()), () => {}); } catch (e) { fallo = true; }
    out.fallo = fallo; out.fichaTrasFallo = (await anGetMeta(db, id3)) === undefined; out.chunksTrasFallo = await anCountChunks(db, id3);
    await anDelete(db, id);
    out.tras = {ficha: (await anGetMeta(db, id)) === undefined, chunks: await anCountChunks(db, id), otro: await anCountChunks(db, id2), fichaOtro: (await anGetMeta(db, id2)).id === id2};
    db.close(); return JSON.stringify(out);
  })()`));
  assert.deepEqual(r.stores, ['chunks', 'meta']); assert.equal(r.version, 1);
  assert.equal(r.count, 3); assert.deepEqual(r.chunk, [12, 13]); assert.equal(r.estado, 'cerrado');
  assert.deepEqual(r.revision, ['cerrar-interrumpida', 'ok'], 'revisión: uno cerrado con nota y otro interrumpido');
  assert.equal(r.fallo, true); assert.equal(r.fichaTrasFallo, true); assert.equal(r.chunksTrasFallo, 0);
  assert.deepEqual(r.tras, {ficha: true, chunks: 0, otro: 2, fichaOtro: true});
  assert.deepEqual(await bases(), ['notasvoz-dictanota-audio', 'notasvoz-gamma-audio']);
  assert.equal(await fotoViejo(), antes, 'usar la base nueva cambió datos de Delta 11');

  // 3) Candado universal (K2, 17/11/2026): la app lo toma al arrancar, también sin bóveda; otra toma falla mientras siga viva.
  const l = JSON.parse(await run(`(async () => { await vaultTabLockP; const q = await navigator.locks.query(); const held = q.held.filter(h => h.name === AN_LOCK_NAME).length;
    const a = await anTakeLock(); a.release(); return JSON.stringify([held, a.ok, a.soportado, vault.otherTab]); })()`));
  assert.deepEqual(l, [1, false, true, false], 'la app tiene el candado y escribe; una segunda toma no lo consigue');
  console.log('AUDIO POR NOTA E1 OK: apagado al cargar, datos de Delta 11 intactos, base nueva andando si se la llama, borrado y candado.');
} finally {
  try { ws && ws.close(); } catch (e) {}
  chrome.kill('SIGKILL'); server.close();
  try { rmSync(profile, {recursive: true, force: true}); } catch (e) {}
}
