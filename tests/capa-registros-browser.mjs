// Capa única de registros cifrados, en Chrome real (sin dependencias): CDP por WebSocket nativo de Node 22.
// Se cambia el almacén interno de la capa (vault.records.useBackend) por uno falso en memoria y se recorre todo:
// activar la protección, guardar notas, crear una copia, verificarla y restaurarla en una instalación vacía.
// Comprueba que la copia lleva EXACTAMENTE los mismos registros y que, en todo el recorrido, nada lee ni escribe
// las claves de registros de localStorage (un espía en Storage lo vigila). Datos, contraseñas y textos inventados.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';

const profile = mkdtempSync(tmpdir() + '/dictavoz-capa-');
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(readFileSync(new URL('../index.html', import.meta.url))); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PUERTO = server.address().port;
// «localhost» y «127.0.0.1» son orígenes distintos: cada uno tiene su propio almacenamiento (la segunda instalación nace vacía).
const URL_1 = 'http://localhost:' + PUERTO + '/', URL_2 = 'http://127.0.0.1:' + PUERTO + '/';
const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank']);
let ws;
try {
  const endpoint = await new Promise((resolve, reject) => { let log = ''; const t = setTimeout(() => reject(Error('Chrome timeout: ' + log)), 30000); chrome.on('error', reject); chrome.stderr.on('data', d => { log += d; const m = log.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); resolve(m[1]); } }); });
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
  listeners.push(m => { if (m.method === 'Page.javascriptDialogOpening') call('Page.handleJavaScriptDialog', {accept: true}); });
  const ready = 'document.readyState === "complete" && typeof copiaCheck === "function" && typeof k2RestoreEmpty === "function" && typeof convStore === "object"';
  const PASS = 'frase de prueba inventada 901';
  const msg = () => run(`document.getElementById('copiaMsg').textContent`);
  const click = id => run(`document.getElementById(${JSON.stringify(id)}).click(); true`);
  const fill = (id, v) => run(`document.getElementById(${JSON.stringify(id)}).value = ${JSON.stringify(v)}; true`);
  const submit = id => run(`document.getElementById(${JSON.stringify(id)}).requestSubmit(); true`);
  const guardarNota = texto => run(`(async () => { const t = document.getElementById('text'); t.value = ${JSON.stringify(texto)}; t.dispatchEvent(new Event('input', {bubbles: true})); document.getElementById('save').click(); await new Promise(r => setTimeout(r, 50)); while (convSaving) await new Promise(r => setTimeout(r, 20)); if (vault.state === 'open') await vault.flush(); return convStore.data.entries.length; })()`);
  // Espía en Storage: anota todo acceso (leer, escribir o borrar) a una clave de registro cifrado de localStorage. Debe quedar vacío.
  const espia = () => run(`(() => {
    window.__tocados = [];
    for (const m of ['getItem', 'setItem', 'removeItem']) {
      const original = Storage.prototype[m];
      Storage.prototype[m] = function (k, ...resto) { if (String(k).includes('boveda.v1.r.')) window.__tocados.push(m + ':' + k); return original.call(this, k, ...resto); };
    }
    return true;
  })()`);
  // Almacén falso en memoria con la forma de Storage (length y key incluidos). Reemplaza el almacén interno de la capa.
  const instalarFalso = () => run(`(() => {
    const mapa = new Map();
    window.__falso = {get length() { return mapa.size; }, key: i => [...mapa.keys()][i] ?? null, getItem: k => mapa.has(k) ? mapa.get(k) : null, setItem: (k, v) => { mapa.set(k, String(v)); }, removeItem: k => { mapa.delete(k); }, claves: () => [...mapa.keys()].sort()};
    vault.records.useBackend(window.__falso);
    return true;
  })()`);
  const sinRegistrosEnLocalStorage = () => run(`Object.keys(localStorage).filter(k => k.includes('boveda.v1.r.')).length === 0 && window.__tocados.length === 0`);

  await call('Page.enable'); await call('Runtime.enable'); await call('DOM.enable');
  await call('Emulation.setDeviceMetricsOverride', {width: 360, height: 740, deviceScaleFactor: 1, mobile: true});

  // ===== 1) Primera instalación: protección, notas y copia con el almacén falso =====
  await call('Page.navigate', {url: URL_1}); await waitFor(ready, 'carga de la primera instalación');
  await run(`window.__dl = []; window.download = f => { window.__dl.push(f); }; true`);   // la descarga se captura en vez de ir al disco
  await espia(); await instalarFalso();
  assert.equal(await run('vault.state'), 'off');
  assert.equal(await guardarNota('Persona Inventada Uno: nota inventada X-901'), 1);
  const recovery = await run(`(async () => { const r = await vault.enable(${JSON.stringify(PASS)}); r.dek.fill(0); await vaultTakeTabLock(); vaultRefreshPanel(); return r.recovery; })()`);
  assert.ok(recovery, 'código de recuperación inventado'); assert.equal(await run('vault.state'), 'open');
  assert.equal(await guardarNota('Persona Inventada Uno: segunda nota, madre de X-901'), 2);
  await run(`vault.store.setItem('notasvoz.gamma.dict.v1', 'pasiente => paciente'); vault.store.setItem('notasvoz.gamma.people.v1', JSON.stringify([{names: ['Persona Inventada Uno'], code: 'X-901', rel: ''}])); vault.flush()`);
  const claves = JSON.parse(await run(`JSON.stringify(window.__falso.claves())`));
  for (const nombre of ['conversaciones', 'diccionario', 'personas']) assert.ok(claves.includes('notasvoz.boveda.v1.r.' + nombre), 'el registro «' + nombre + '» está en el almacén falso');
  assert.equal(await sinRegistrosEnLocalStorage(), true, 'ningún registro cifrado en localStorage ni acceso a sus claves (bóveda)');
  const originales = await run(`JSON.stringify(vault.records.all())`);   // lo guardado, ya cifrado, justo antes de la copia
  assert.ok(JSON.parse(originales).length >= 3);
  const textoConv = await run(`vaultStore.getItem('notasvoz.dictanota.v2')`);
  assert.equal(JSON.parse(textoConv).entries.length, 2);

  // Crear la copia por el recorrido real de la pantalla Ajustes.
  await run(`document.querySelector('[data-delta-view="ajustes"]').click(); document.getElementById('copiaPanel').scrollIntoView({block: 'start'}); true`);
  await click('copiaCrear'); await waitFor(`!document.getElementById('vaultAuth').hidden`, 'pedido de contraseña');
  await fill('vaultAuthPass', PASS); await submit('vaultAuth');
  await waitFor('window.__dl.length === 1', 'descarga de la copia', 60000);
  assert.match(await msg(), /Copia creada y comprobada: .*1 cuaderno · 2 notas/);
  assert.equal(await run(`JSON.stringify(vault.records.all())`), originales, 'crear la copia no cambió ningún registro');

  // Verificarla por el recorrido real (pide la contraseña del archivo).
  await run(`document.getElementById('copiaMsg').textContent = ''; window.__chk = copiaCheck(window.__dl[0]); true`);
  await waitFor(`!document.getElementById('copiaClaveForm').hidden`, 'pedido de contraseña de la copia');
  await fill('copiaClave', PASS); await submit('copiaClaveForm');
  const verificada = JSON.parse(await run(`window.__chk.then(r => JSON.stringify(r))`));
  assert.match(await msg(), /^Copia correcta: /);
  assert.deepEqual([verificada.cuadernos, verificada.notas, verificada.audios, verificada.registros], [1, 2, 0, JSON.parse(originales).length]);
  // La copia lleva exactamente los mismos registros: mismos nombres y mismos textos cifrados, sin faltar ni sobrar.
  const enCopia = JSON.parse(await run(`(async () => {
    const f = window.__dl[0], h = await k2Header(f), abierto = await copiaOpenWithSecret(h, ${JSON.stringify(PASS)});
    const v = await copia2Verify(f, header => copiaOpenWithSecret(header, ${JSON.stringify(PASS)}));
    const plan = await k2ReadPlan(f, v, abierto.key);
    return JSON.stringify([...plan.records.entries()]);
  })()`));
  const ordenar = lista => lista.slice().sort((a, b) => a[0] < b[0] ? -1 : 1);
  assert.deepEqual(ordenar(enCopia), ordenar(JSON.parse(originales)), 'la copia lleva exactamente los registros de la capa');
  assert.equal(await sinRegistrosEnLocalStorage(), true, 'ningún acceso a registros de localStorage al crear y verificar la copia');
  const bytes = await run(`window.__dl[0].arrayBuffer().then(b => { let s = ''; const u = new Uint8Array(b); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); })`);
  assert.doesNotMatch(Buffer.from(bytes, 'base64').toString('latin1'), /Persona Inventada|X-901/, 'nada del texto en claro en la copia');

  // ===== 2) Segunda instalación (otro origen, vacía): restaurar con otro almacén falso =====
  await call('Page.navigate', {url: URL_2}); await waitFor(ready, 'carga de la segunda instalación');
  await espia(); await instalarFalso();
  const archivo = `new Blob([Uint8Array.from(atob(${JSON.stringify(bytes)}), x => x.charCodeAt(0))])`;
  assert.equal(await run('k2StorageEmpty()'), true, 'instalación vacía');
  // La comprobación de «vacía» mira los registros por la capa: un registro en el almacén falso ya la hace «no vacía».
  assert.equal(await run(`(async () => { vault.records.set('notas', 'registro de ensayo inventado'); const ocupada = !(await k2StorageEmpty()); vault.records.remove('notas'); return ocupada && await k2StorageEmpty(); })()`), true,
    'un registro guardado en el almacén de la capa cuenta como dato, aunque localStorage esté vacío');
  // Una contraseña falsa no escribe nada en ningún almacén.
  const rechazo = await run(`(async () => { let e = ''; try { await k2RestoreEmpty(${archivo}, 'clave falsa 000') } catch (x) { e = x.copia || x.message } return e + '|' + vault.records.any() + '|' + Object.keys(localStorage).filter(k => k.startsWith('notasvoz.')).length; })()`);
  assert.equal(rechazo, 'Clave|false|0', 'clave falsa: no se escribió nada, ni en la capa ni en localStorage');
  // Restaurar en la instalación vacía.
  const r = JSON.parse(await run(`(async () => { const v = await k2RestoreEmpty(${archivo}, ${JSON.stringify(PASS)}); return JSON.stringify({formato: v.formato, notas: v.notas, cuadernos: v.cuadernos, registros: v.registros, audios: v.audios}); })()`));
  assert.deepEqual(r, {formato: 1, notas: 2, cuadernos: 1, registros: JSON.parse(originales).length, audios: 0});
  assert.equal(await run(`!!localStorage.getItem(VAULT_HEADER) && localStorage.getItem(K2_JOURNAL) === null`), true, 'la cabecera quedó escrita y el lote cerrado');
  const restaurados = await run(`JSON.stringify(vault.records.all())`);
  assert.deepEqual(ordenar(JSON.parse(restaurados)), ordenar(JSON.parse(originales)), 'se restauraron exactamente los mismos registros');
  assert.equal(await sinRegistrosEnLocalStorage(), true, 'la restauración no escribió ningún registro en localStorage');
  // Y la bóveda restaurada se abre y lee lo mismo que se había guardado (otra instancia sobre la misma capa).
  const abierta = JSON.parse(await run(`(async () => {
    const w = createVault(localStorage, {records: vault.records});
    await w.unlockPassword(${JSON.stringify(PASS)});
    return JSON.stringify({estado: w.state, conv: w.store.getItem('notasvoz.dictanota.v2'), dict: w.store.getItem('notasvoz.gamma.dict.v1')});
  })()`));
  assert.equal(abierta.estado, 'open'); assert.equal(abierta.conv, textoConv, 'las notas restauradas son las mismas'); assert.equal(abierta.dict, 'pasiente => paciente');
  assert.equal(await sinRegistrosEnLocalStorage(), true, 'tampoco al desbloquear');

  console.log('CAPA DE REGISTROS OK: con el almacén interno falso, la protección, la copia, su verificación y la restauración K2 funcionan; la copia lleva exactamente los mismos registros y nada toca las claves de registros de localStorage.');
} finally {
  try { ws && ws.close(); } catch (e) {}
  chrome.kill('SIGKILL'); server.close();
  try { rmSync(profile, {recursive: true, force: true}); } catch (e) {}
}
