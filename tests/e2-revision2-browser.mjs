// Segunda revisión de E2 (PR #47, sobre 745f36b): borrador viejo vs audio confirmado, candado entre pestañas, audio dañado, ficha final sin espacio y borrado fallido.
// Cada escenario comprueba lo PERSISTIDO (localStorage, IndexedDB, bytes de cada fragmento), no solo mensajes. Datos y tono sintéticos: sin datos reales.
// «Corte simulado» = se descartan escrituras a propósito dentro de una sola sesión; NO es un cierre real del navegador ni una prueba en Brave/Motorola.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assertEstricto from 'node:assert/strict';
// Modo de diagnóstico (REV2_BLANDO=1): anota cada falla en vez de cortar. Sirve para mostrar qué falla en una versión anterior (INDEX_HTML=ruta).
const blando = process.env.REV2_BLANDO === '1', fallas = [];
const assert = blando ? new Proxy(assertEstricto, {get: (t, k) => typeof t[k] !== 'function' || k === 'rejects' ? t[k] : (...a) => { try { return t[k](...a); } catch (e) { fallas.push(String(e.message).split('\n')[0].slice(0, 160)); } }}) : assertEstricto;

const profile = mkdtempSync(tmpdir() + '/dictanota-e2rev2-');
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(readFileSync(process.env.INDEX_HTML || new URL('../index.html', import.meta.url))); });
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

  // ---------- Utilidades de esta prueba ----------
  const P1 = 'frase de prueba inventada 111', P2 = 'frase de prueba inventada 222', NUEVA = 'clave nueva inventada 777';
  const snapLS = T => T.run(`JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))`);
  const abrir = (T, pass) => T.run(`(async () => { await vault.unlockPassword(${JSON.stringify(pass)}); await vaultAfterUnlock(); return true; })()`);
  const nuevaPestana = async (antes) => {
    const {targetId} = await send('Target.createTarget', {url: 'about:blank'});
    const T = await tab(targetId); T.targetId = targetId;
    if (antes) await T.call('Page.addScriptToEvaluateOnNewDocument', {source: antes});
    return T;
  };
  const cerrar = async T => { await send('Target.closeTarget', {targetId: T.targetId}); await sleep(400); };
  // Foto de un audio: ficha + (clave, huella) de cada fragmento. Sirve para comprobar que NADA cambió.
  const foto = (T, id) => T.run(`(async () => { const db = await anDb(), b = anChunkBounds(${JSON.stringify(id)});
    const m = await anGetMeta(db, ${JSON.stringify(id)});
    const keys = await anTx(db, ['chunks'], 'readonly', t => t.objectStore('chunks').getAllKeys(IDBKeyRange.bound(b.lower, b.upper))), out = [];
    for (const k of keys) { const blob = await anTx(db, ['chunks'], 'readonly', t => t.objectStore('chunks').get(k)); out.push([k.join('/'), [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].join(',')]); }
    return JSON.stringify({m, out}); })()`);
  const registroNotas = T => T.run(`vaultOpenRecord(vault.key, vault.header.id, 'conversaciones', localStorage.getItem(VAULT_REC_PREFIX + 'conversaciones')).then(x => x)`).then(JSON.parse);
  const reabrir = async (T, pass) => { await load(T, true); await abrir(T, pass); await T.waitFor('convStore.data && typeof convStore.data === "object"', 'cuadernos cargados'); await T.run(`document.getElementById('saveAudio').checked = true; true`); };
  const cancelar = async T => { await T.run(`document.getElementById('convCancelEdit').click(); true`); await T.waitFor('!convSaving', 'fin de la cancelación'); await sleep(300); };

  // REV2_SALTAR_CANDADO=1 (solo diagnóstico): omite los escenarios de candado para ver el resto contra una versión anterior.
  const saltar = process.env.REV2_SALTAR_CANDADO === '1';
  let passW = P1;
  if (!saltar) {
  // ======================= HALLAZGO 2 =======================
  // 2a) Dos activaciones simultáneas desde dos pestañas con la protección apagada.
  const X = A, Y = await nuevaPestana(); X.targetId = targetInfos.find(t => t.type === 'page').targetId;
  await load(X, false); await load(Y, false);
  assert.equal(await X.run('vault.state'), 'off'); assert.equal(await Y.run('vault.state'), 'off');
  const activar = p => `vault.enable(${JSON.stringify(p)}).then(async r => { const rec = r.recovery; r.dek.fill(0); await vaultTakeTabLock(); return JSON.stringify({ok: true, rec, hid: vault.header.id}); }, e => JSON.stringify({ok: false, nombre: e.name, msg: String(e.message)}))`;
  const [rx, ry] = (await Promise.all([X.run(activar(P1)), Y.run(activar(P2))])).map(JSON.parse);
  assert.equal([rx, ry].filter(r => r.ok).length, 1, 'dos activaciones simultáneas: solo una puede ganar (' + JSON.stringify([rx, ry]) + ')');
  const gana = rx.ok ? rx : ry, W = rx.ok ? X : Y, L = rx.ok ? Y : X, perdio = rx.ok ? ry : rx; passW = rx.ok ? P1 : P2;
  assert.match(perdio.msg, /otra pestaña/, 'a la que pierde se le explica');
  const cab = JSON.parse(await W.run(`localStorage.getItem(VAULT_HEADER)`));
  assert.equal(cab.id, gana.hid, 'la cabecera guardada es la de la ganadora (no fue reemplazada)');
  assert.equal(await L.run('vault.state'), 'off', 'la perdedora no cree tener protección');
  assert.equal(await W.run('vault.state'), 'open');

  // 2b) Recuperación desde una segunda pestaña mientras la primera está abierta: no toca la cabecera.
  await load(L, true);   // la segunda pestaña recarga: ahora ve la protección bloqueada
  assert.equal(await L.run('vault.state'), 'locked');
  const antesRec = await snapLS(L);
  const recRes = await L.run(`vault.unlockRecovery(${JSON.stringify(gana.rec)}, ${JSON.stringify(NUEVA)}).then(() => 'abrio', e => e.name + ': ' + e.message)`);
  assert.match(recRes, /OtraPestana/, 'recuperar desde la segunda pestaña se rechaza (' + recRes + ')');
  assert.equal(await snapLS(L), antesRec, 'la cabecera y todo el almacenamiento quedaron idénticos');
  assert.equal(await L.run('vault.state'), 'locked', 'sigue bloqueada: no abrió con datos a medias');

  // 2c) Copias en claro y registros dañados al desbloquear la segunda pestaña: no se cifra, no se aparta, no se borra nada.
  await W.run(`localStorage.setItem('notasvoz.gamma.dict.v1', 'copia en claro inventada => x'); localStorage.setItem(VAULT_REC_PREFIX + 'personas', '{registro dañado inventado'); true`);
  const antesDesb = await snapLS(W);
  await load(L, true); await abrir(L, passW);
  assert.equal(await L.run('vault.readOnly'), true, 'la segunda pestaña abre en solo lectura');
  assert.ok((await L.run('JSON.stringify(vault.damaged)')).includes('personas'), 'avisa del registro dañado');
  assert.equal(await snapLS(L), antesDesb, 'al desbloquear no escribió nada: copia en claro y registro dañado siguen donde estaban (sin «.danado.»)');
  assert.equal(await L.run(`(() => { try { vaultStore.setItem(PKEY, '[]'); return 'escribió'; } catch (e) { return e.name; } })()`), 'OtraPestana');
  await W.run(`localStorage.removeItem('notasvoz.gamma.dict.v1'); localStorage.removeItem(VAULT_REC_PREFIX + 'personas'); true`);

  // 2d) Candado no disponible o con error: se abre en solo lectura y no se escribe (falla cerrada).
  await cerrar(L); await cerrar(W);
  const sinLocks = `Object.defineProperty(Navigator.prototype, 'locks', {get() { return undefined; }, configurable: true});`;
  const locksFallan = `Object.defineProperty(navigator.locks, 'request', {value: () => Promise.reject(new DOMException('prueba', 'SecurityError')), configurable: true});`;
  for (const [nombre, src, texto] of [['sin Web Locks', sinLocks, /no permite comprobar/], ['Web Locks con error', locksFallan, /No se pudo comprobar/]]) {
    const Z = await nuevaPestana(src); await load(Z, false);
    assert.equal(await Z.run('vault.state'), 'locked');
    const a0 = await snapLS(Z);
    const rr = await Z.run(`vault.unlockRecovery(${JSON.stringify(gana.rec)}, ${JSON.stringify(NUEVA)}).then(() => 'abrio', e => e.name)`);
    assert.equal(rr, 'OtraPestana', nombre + ': la recuperación no escribe sin candado');
    await abrir(Z, passW);
    assert.equal(await Z.run('vault.readOnly'), true, nombre + ': solo lectura');
    assert.match(await Z.run(`document.getElementById('tabLockWarn').textContent`), texto, nombre + ': explica el problema');
    assert.equal(await snapLS(Z), a0, nombre + ': nada cambió en el almacenamiento');
    await cerrar(Z);
  }

  }
  // Desde acá, una sola pestaña normal con el candado disponible.
  const A2 = await nuevaPestana(); await load(A2, false);
  if (saltar) { await A2.run(`vault.enable(${JSON.stringify(P1)}).then(async r => { r.dek.fill(0); await vaultTakeTabLock(); return true; })`); } else await abrir(A2, passW);
  assert.equal(await A2.run('vault.readOnly'), false, 'con el candado libre, la pestaña escribe');
  await A2.run(`document.getElementById('saveAudio').checked = true; true`);
  const a = A2;

  // ======================= HALLAZGO 1 =======================
  // Nota confirmada + borrador anterior persistente + recarga + cancelar: ningún audio confirmado se pierde.
  const fA = await archivo(a, 1500000);
  await escribir(a, 'Nota A inventada X-901'); await guardar(a);
  const notaA = await ultima(a); assert.equal(notaA.audioId, fA.id);
  for (const modo of ['descartar', 'fallar']) {
    const antesPartes = (await meta(a, fA.id)).parts;
    await a.run(`convEdit(${JSON.stringify(notaA.id)}); true`);
    const g = await grabar(a, 2);
    assert.equal(g.base, antesPartes, 'recuerda cuántas partes tenía antes de editar');
    const partes = (await meta(a, fA.id)).parts; assert.equal(partes, antesPartes + 1);
    await a.run('saveDraft(); vault.flush().then(() => true)');   // el borrador viejo (con audioBase) llega al almacenamiento
    const shaAntes = (await leer(a, fA.id)).map(p => p.sha);
    // Corte simulado entre las dos escrituras: la nota se confirma pero la limpieza del borrador no llega (se descarta o falla).
    await a.run(`(() => { const o = Storage.prototype.setItem; window.__o = o;
      Storage.prototype.setItem = function (k, v) { if (k === VAULT_REC_PREFIX + 'borrador') { if (${JSON.stringify(modo)} === 'fallar') throw new DOMException('lleno (prueba)', 'QuotaExceededError'); return; } return o.call(this, k, v); }; return true; })()`);
    await guardar(a);
    const reg = (await registroNotas(a)).entries.find(e => e.id === notaA.id);
    assert.equal(reg.audioId, fA.id);
    await reabrir(a, passW);   // recarga: el borrador viejo sigue en el almacenamiento
    // Cancelar lo que sea que haya quedado abierto: nunca debe recortar audio confirmado.
    if (await a.run('convEditingId')) await cancelar(a);
    assert.equal((await meta(a, fA.id)).parts, partes, 'el audio confirmado conserva todas sus partes (' + modo + ')');
    assert.deepEqual((await leer(a, fA.id)).map(p => p.sha).slice(0, shaAntes.length), shaAntes, 'y sus bytes son idénticos');
    assert.equal((await entrada(a, notaA.id)).audioId, fA.id);
    assert.equal(reg.audioParts, partes, 'la nota guardada recuerda cuántas partes de audio confirmó (' + modo + ')');
    if (await a.run('convEditingId')) await cancelar(a);
  }
  // Contraprueba: si el corte ocurre ANTES de confirmar la nota, la parte sin confirmar sí se quita al cancelar.
  {
    const antesPartes = (await meta(a, fA.id)).parts;
    await a.run(`convEdit(${JSON.stringify(notaA.id)}); true`);
    await grabar(a, 1); await a.run('saveDraft(); vault.flush().then(() => true)');
    assert.equal((await meta(a, fA.id)).parts, antesPartes + 1);
    await reabrir(a, passW);
    assert.equal(await a.run('convEditingId'), notaA.id); await cancelar(a);
    assert.equal((await meta(a, fA.id)).parts, antesPartes, 'lo no confirmado sí se quita');
  }

  // ======================= HALLAZGO 3 =======================
  // Audios con fragmento faltante, alterado o mal posicionado: ampliar y cancelar no modifican nada.
  const mk = async (txt) => { const f = await archivo(a, 1500000, 'inventado-' + txt + '.mp3'); await escribir(a, 'Nota ' + txt + ' inventada'); await guardar(a); return {id: f.id, nota: (await ultima(a)).id}; };
  const dMiss = await mk('faltante'), dAlt = await mk('alterado'), dPos = await mk('posicion');
  const tocar = (T, id, js) => T.run(`(async () => { const db = await anDb(), id = ${JSON.stringify(id)};
    const get = n => anTx(db, ['chunks'], 'readonly', t => t.objectStore('chunks').get([id, 0, n]));
    const put = (n, b) => anTx(db, ['chunks'], 'readwrite', t => t.objectStore('chunks').put(b, [id, 0, n]));
    ${js}; return true; })()`);
  await tocar(a, dMiss.id, `await anTx(db, ['chunks'], 'readwrite', t => t.objectStore('chunks').delete([id, 0, 1]))`);
  await tocar(a, dAlt.id, `const b = new Uint8Array(await (await get(0)).arrayBuffer()); b[40] ^= 1; await put(0, new Blob([b]))`);
  await tocar(a, dPos.id, `const b0 = await get(0), b1 = await get(1); await put(0, b1); await put(1, b0)`);
  const f0 = {}; for (const d of [dMiss, dAlt, dPos]) f0[d.id] = await foto(a, d.id);
  await reabrir(a, passW);
  for (const [nombre, d] of [['faltante', dMiss], ['alterado', dAlt], ['mal posicionado', dPos]]) {
    await a.run(`convEdit(${JSON.stringify(d.nota)}); true`); await limpiarAvisos(a);
    assert.equal((await archivo(a, 50000)).id, null, nombre + ': no se amplía con un archivo');
    await grabar(a, 1);
    assert.equal(await a.run('convAudioId'), null, nombre + ': no se crea otro audio en su lugar');
    assert.match((await avisos(a)).join(' '), /dañado o incompleto: se conserva como está/, nombre + ': se explica al usuario');
    assert.equal(await foto(a, d.id), f0[d.id], nombre + ': ficha y fragmentos idénticos tras intentar ampliar');
    await cancelar(a);
    assert.equal(await foto(a, d.id), f0[d.id], nombre + ': idénticos tras cancelar');
    assert.equal((await entrada(a, d.nota)).audioId, d.id, nombre + ': la nota sigue unida a su audio');
  }
  // Recortar (cancelar una edición que agregó una parte) sobre un audio que se dañó: se niega y se conserva todo.
  {
    const f = await archivo(a, 1500000, 'inventado-recorte.mp3'); await escribir(a, 'Nota recorte inventada'); await guardar(a);
    const n = await ultima(a);
    await a.run(`convEdit(${JSON.stringify(n.id)}); true`);
    assert.ok((await archivo(a, 400000)).id, 'primero se agrega una parte sana'); assert.equal((await meta(a, f.id)).parts, 2);
    await tocar(a, f.id, `const b = new Uint8Array(await (await get(0)).arrayBuffer()); b[50] ^= 1; await put(0, new Blob([b]))`);
    const f1 = await foto(a, f.id); await limpiarAvisos(a);
    assert.equal(await a.run(`anTruncateAudio(${JSON.stringify(f.id)}, 1)`), 'danado', 'recortar un audio alterado se niega');
    assert.equal(await foto(a, f.id), f1, 'sin tocar ficha ni fragmentos');
    await cancelar(a);
    assert.equal(await foto(a, f.id), f1, 'cancelar la edición tampoco lo modifica');
    assert.match((await avisos(a)).join(' '), /dañado[\s\S]*se conserva/, 'y se le explica al usuario');
  }
  // Costo de la validación en una grabación larga (medido aquí, en Chrome de escritorio; NO en el Motorola).
  const grande = await archivo(a, 24 * 1048576, 'inventado-largo.mp3');
  const medida = await a.run(`(async () => { if (typeof anAudioHealth !== 'function') return 'sin-funcion'; const t0 = performance.now();
    const h = await anAudioHealth(await anDb(), vault.audioKey, vault.header.id, ${JSON.stringify(grande.id)}); return JSON.stringify({ok: h.ok, ms: Math.round(performance.now() - t0)}); })()`);
  console.log('Validación completa de un audio de 24 MB (escritorio, Chrome headless): ' + medida);
  assert.ok(medida === 'sin-funcion' || (JSON.parse(medida).ok && JSON.parse(medida).ms < 15000), 'la validación termina en un tiempo razonable');
  await a.run(`document.getElementById('convDiscard').click(); true`); await sleep(600);
  await a.run(`anDeleteAudio(${JSON.stringify(grande.id)})`);

  // ======================= FICHA FINAL SIN ESPACIO =======================
  const nAntes = await nAudios(a);
  const sinEspacioFicha = n => `(() => { const o = IDBObjectStore.prototype.put; window.__putO = o; window.__cuenta = 0;
    IDBObjectStore.prototype.put = function (...x) { if (this.name === 'meta' && this.transaction.objectStoreNames.length === 1 && ++window.__cuenta === ${n}) throw new DOMException('lleno (prueba)', 'QuotaExceededError'); return o.apply(this, x); }; return true; })()`;
  // a) Grabación: los fragmentos entran pero la ficha final no.
  await escribir(a, 'Nota ficha final inventada'); await guardar(a); const nF = await ultima(a);
  await a.run(`convEdit(${JSON.stringify(nF.id)}); true`);
  await a.run(sinEspacioFicha(1)); await limpiarAvisos(a);
  const gF = await grabar(a, 2);
  await a.run(`IDBObjectStore.prototype.put = window.__putO; true`);
  assert.ok(gF.id);
  assert.equal((await meta(a, gF.id)).state, 'grabando', 'persistido: la ficha quedó sin cerrar (no cerrada)');
  assert.doesNotMatch((await avisos(a)).join(' '), /queda marcado como incompleto/, 'no afirma que quedó marcado si la ficha no se escribió');
  assert.match((await avisos(a)).join(' '), /no se pudo cerrar/, 'dice lo que pasó de verdad');
  assert.equal(await a.run('anBusyN'), 0, 'no queda ocupada');
  await reabrir(a, passW);
  await a.waitFor(`anDb().then(db => anGetMeta(db, ${JSON.stringify(gF.id)})).then(m => m && m.state === 'cerrado')`, 'se cierra al reabrir');
  assert.equal((await detalle(a, gF.id)).parts[0].interrumpida, true, 'al reabrir se cierra como interrumpida');
  if (await a.run('convEditingId')) await cancelar(a);
  // b) Archivo cargado: la ficha final no entra → se descarta entero, sin audio a medias ni vínculo.
  await a.run(`document.getElementById('saveAudio').checked = true; true`);
  const nB = await nAudios(a);
  await a.run(sinEspacioFicha(2)); await limpiarAvisos(a);
  assert.equal((await archivo(a, 1500000, 'inventado-sin-ficha.mp3')).id, null);
  await a.run(`IDBObjectStore.prototype.put = window.__putO; true`);
  assert.equal(await nAudios(a), nB, 'no quedó ningún audio a medias');
  assert.equal(await a.run('convAudioId'), null);
  assert.match((await avisos(a)).join(' '), /No se pudo guardar el archivo cifrado/);

  // ======================= BORRAR AUDIO FALLA =======================
  const sinBorrar = `(() => { const o = IDBObjectStore.prototype.delete; window.__delO = o; IDBObjectStore.prototype.delete = function (...x) { if (this.name === 'meta' || this.name === 'chunks') throw new DOMException('falla (prueba)', 'UnknownError'); return o.apply(this, x); }; return true; })()`;
  const sinBorrarFin = `IDBObjectStore.prototype.delete = window.__delO; true`;
  // Cancelar una edición cuyo audio nuevo no se puede borrar.
  await escribir(a, 'Nota borrado inventada'); await guardar(a); const nD = await ultima(a);
  await a.run(`convEdit(${JSON.stringify(nD.id)}); true`);
  const gD = await grabar(a, 1);
  await a.run(sinBorrar); await limpiarAvisos(a);
  await cancelar(a);
  await a.run(sinBorrarFin);
  assert.ok(await meta(a, gD.id), 'persistido: el audio sigue ahí porque el borrado falló');
  const msgD = (await avisos(a)).join(' ');
  assert.doesNotMatch(msgD, /se quitó el audio agregado/, 'no anuncia que se borró algo que sigue ahí');
  assert.match(msgD, /no se pudo borrar/, 'dice que no se pudo');
  // Descartar una nota nueva cuyo audio no se puede borrar.
  const gE = await archivo(a, 300000, 'inventado-descarte.mp3'); await escribir(a, 'Nota descarte inventada');
  await a.run(sinBorrar); await limpiarAvisos(a);
  await a.run(`document.getElementById('convDiscard').click(); true`); await sleep(800);
  await a.run(sinBorrarFin);
  assert.ok(await meta(a, gE.id), 'persistido: el audio del descarte sigue ahí');
  assert.doesNotMatch((await avisos(a)).join(' '), /Nota descartada, con su audio/, 'no anuncia el borrado que falló');
  assert.match((await avisos(a)).join(' '), /no se pudo borrar/);
  // Con el borrado funcionando, sí se borra y se anuncia.
  await a.run(`anDeleteAudio(${JSON.stringify(gD.id)}).then(() => anDeleteAudio(${JSON.stringify(gE.id)}))`);
  assert.equal(await meta(a, gD.id), null);

  console.log('E2 SEGUNDA REVISIÓN OK: una sola activación gana; recuperación y desbloqueo en otra pestaña no escriben; candado ausente o con error = solo lectura; el borrador viejo no recorta audio confirmado; audio faltante/alterado/mal posicionado no se amplía ni recorta; ficha final sin espacio y borrado fallido sin avisos falsos. Cortes SIMULADOS (escrituras descartadas), no cierres reales; sin prueba en Brave/Motorola.');
} catch (e) {
  if (!blando) throw e;
  fallas.push('CORTE de la prueba: ' + String(e.message).split('\n')[0].slice(0, 200));
} finally {
  if (blando) { console.log('FALLAS (' + fallas.length + '):\n- ' + fallas.join('\n- ')); }
  try { ws && ws.close(); } catch (e) {}
  chrome.kill('SIGKILL'); server.close();
  try { rmSync(profile, {recursive: true, force: true}); } catch (e) {}
}
