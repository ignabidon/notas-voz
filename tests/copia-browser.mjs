// Copia cifrada, paso K1, en Chrome real (sin dependencias): CDP por WebSocket nativo de Node 22.
// Recorre los botones reales de Ajustes a 360 px. Datos, contraseñas y audios inventados (tono sintético).
// Comprueba que crear y verificar una copia NO cambia nada de lo guardado. No restaura (eso es K2).
import {writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';

const profile = mkdtempSync(tmpdir() + '/dictanota-copia-');
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
  const ready = 'document.readyState === "complete" && typeof copiaCheck === "function" && typeof convStore === "object"';
  const PASS = 'frase de prueba inventada 901', PASS_ARCHIVO = 'archivo inventado frase 55';
  const msg = () => run(`document.getElementById('copiaMsg').textContent`);
  const waitMsg = (re, what) => waitFor(`${re}.test(document.getElementById('copiaMsg').textContent)`, what + ' · mensaje: ' + '');
  const click = id => run(`document.getElementById(${JSON.stringify(id)}).click(); true`);
  const fill = (id, v) => run(`document.getElementById(${JSON.stringify(id)}).value = ${JSON.stringify(v)}; true`);
  const submit = id => run(`document.getElementById(${JSON.stringify(id)}).requestSubmit(); true`);
  const visible = id => run(`(() => { const e = document.getElementById(${JSON.stringify(id)}); return !!e && !e.hidden && e.getClientRects().length > 0; })()`);
  // Todo lo guardado, para comparar antes y después: localStorage completo y la base de audios por nota (fichas y huella de cada fragmento).
  const foto = () => run(`(async () => {
    // U16: crear una copia anota su fecha (lastBackupAt) en la configuración existente (si no había, la crea). Es lo único que cambia: acá se deja afuera y lo prueba ajustes-browser.mjs.
    const out = {ls: Object.entries(localStorage).filter(([k]) => k !== CKEY).sort(), bases: (await indexedDB.databases()).map(d => d.name + ':' + d.version).sort(), audio: null};
    if (out.bases.some(n => n.startsWith('notasvoz-dictanota-audio'))) {
      const db = await anDb(), leer = (s, m) => new Promise(res => { const r = db.transaction(s).objectStore(s)[m](); r.onsuccess = () => res(r.result); });
      const blobs = await leer('chunks', 'getAll'), sha = [];
      for (const b of blobs) sha.push([...new Uint8Array(await crypto.subtle.digest('SHA-256', await b.arrayBuffer()))].join(','));
      out.audio = {metas: await leer('meta', 'getAll'), claves: await leer('chunks', 'getAllKeys'), sha};
    }
    return JSON.stringify(out);
  })()`);
  const bytesDe = i => run(`window.__dl[${i}].arrayBuffer().then(b => [...new Uint8Array(b)])`);
  // Comprueba un archivo por el recorrido de la interfaz: copiaCheck abre el formulario y se escribe el dato secreto.
  const comprobar = async (fileExpr, secreto) => {
    await run(`document.getElementById('copiaMsg').textContent = ''; window.__chk = copiaCheck(${fileExpr}); true`);
    if (secreto !== undefined) {
      await waitFor(`!document.getElementById('copiaClaveForm').hidden`, 'pedido de contraseña de la copia');
      if (secreto === null) await click('copiaClaveCancel'); else { await fill('copiaClave', secreto); await submit('copiaClaveForm'); }
    }
    const r = await run(`window.__chk.then(r => JSON.stringify(r))`);
    assert.equal(await run(`document.getElementById('copiaClaveForm').hidden && document.getElementById('copiaClave').value === ''`), true, 'el formulario se cierra y se vacía');
    return {r: JSON.parse(r), msg: await msg()};
  };
  const grabar = () => run(`(async () => {
    const ac = new AudioContext(), osc = ac.createOscillator(), dst = ac.createMediaStreamDestination(); osc.frequency.value = 440; osc.connect(dst); osc.start();
    const rec = new MediaRecorder(dst.stream); mr = rec; startAudioNota(rec);
    for (let i = 0; i < 2; i++) { await new Promise(r => setTimeout(r, 700)); rec.requestData(); }
    await new Promise(r => setTimeout(r, 400)); rec._deltaStopRequested = true; rec.stop(); osc.stop(); await new Promise(r => setTimeout(r, 300)); ac.close();
    while (anBusyN > 0) await new Promise(r => setTimeout(r, 50));
    return convAudioId;
  })()`);
  const guardarNota = texto => run(`(async () => { const t = document.getElementById('text'); t.value = ${JSON.stringify(texto)}; t.dispatchEvent(new Event('input', {bubbles: true})); document.getElementById('save').click(); await new Promise(r => setTimeout(r, 50)); while (convSaving) await new Promise(r => setTimeout(r, 20)); if (vault.state === 'open') await vault.flush(); return convStore.data.entries.length; })()`);

  await call('Page.enable'); await call('Runtime.enable'); await call('DOM.enable');
  await call('Emulation.setDeviceMetricsOverride', {width: 360, height: 740, deviceScaleFactor: 1, mobile: true});
  await call('Page.navigate', {url: URL_APP}); await waitFor(ready, 'carga');
  await run(`window.__dl = []; window.download = f => { window.__dl.push(f); }; true`);   // la descarga se captura en vez de ir al disco

  // ===== A) Protección apagada: la copia igual sale cifrada, con una contraseña solo para el archivo =====
  assert.equal(await run('vault.state'), 'off');
  assert.equal(await guardarNota('Persona Inventada Uno: nota inventada X-901'), 1);
  await run(`document.querySelector('[data-delta-view="ajustes"]').click(); ajShow('copias', false); true`);   // U16: la copia vive en la subpantalla Copias de seguridad
  await run(`document.getElementById('copiaPanel').scrollIntoView({block: 'start'}); true`);
  assert.equal(await visible('copiaCrear'), true); assert.equal(await visible('copiaVerificar'), true);
  assert.equal(await visible('copiaOffHint'), true, 'explica que lleva una contraseña propia'); assert.equal(await visible('copiaContenido'), false, 'sin protección no hay audios por nota que elegir');
  assert.equal(await run(`document.documentElement.scrollWidth <= window.innerWidth`), true, 'sin desborde horizontal a 360 px');
  assert.equal(await run(`['copiaCrear', 'copiaVerificar'].every(id => document.getElementById(id).getBoundingClientRect().height >= 48)`), true, 'botones de al menos 48 px');
  const antesA = await foto();
  await click('copiaCrear');
  assert.equal(await visible('copiaPwForm'), true);
  await fill('copiaPw1', PASS_ARCHIVO); await fill('copiaPw2', 'otra cosa distinta'); await submit('copiaPwForm');
  await waitMsg('/no coinciden/', 'contraseñas distintas'); assert.equal(await run('window.__dl.length'), 0);
  await fill('copiaPw1', 'corta'); await fill('copiaPw2', 'corta'); await submit('copiaPwForm');
  await waitMsg('/al menos 8/', 'contraseña corta'); assert.equal(await run('window.__dl.length'), 0);
  await fill('copiaPw1', PASS_ARCHIVO); await fill('copiaPw2', PASS_ARCHIVO); await submit('copiaPwForm');
  await waitFor('window.__dl.length === 1', 'descarga de la copia sin protección', 60000);
  assert.match(await msg(), /Copia creada y comprobada: .*1 cuaderno · 1 nota · solo texto, sin audios/);
  assert.match(await msg(), /solo con la contraseña que acabás de elegir/);
  assert.match(await run('window.__dl[0].name'), /^DictaVoz-copia-\d{4}-\d{2}-\d{2}\.dictanota$/);
  assert.equal(await foto(), antesA, 'crear la copia no cambió nada de lo guardado');
  assert.equal(await run(`vault.state + '|' + localStorage.getItem('notasvoz.boveda.v1')`), 'off|null', 'la protección sigue apagada y no se creó ninguna cabecera');
  assert.equal(await run(`document.getElementById('copiaPw1').value + document.getElementById('copiaPw2').value`), '', 'la contraseña no queda en el formulario');
  const bytesA = await bytesDe(0);
  assert.doesNotMatch(Buffer.from(bytesA).toString('latin1'), /Persona Inventada|X-901|nota inventada/, 'nada del texto en claro en el archivo');
  let v = await comprobar('window.__dl[0]', PASS_ARCHIVO);
  assert.match(v.msg, /^Copia correcta: /); assert.deepEqual([v.r.contenido, v.r.cuadernos, v.r.notas, v.r.audios], ['solo-texto', 1, 1, 0]);
  v = await comprobar('window.__dl[0]', 'no es esta frase 123');
  assert.equal(v.r, null); assert.match(v.msg, /no abren esta copia/);
  assert.equal(await foto(), antesA, 'verificar tampoco cambió nada');

  // ===== B) Protección activa, con un audio cifrado unido a una nota =====
  const recovery = await run(`(async () => { const r = await vault.enable(${JSON.stringify(PASS)}); r.dek.fill(0); await vaultTakeTabLock(); vaultRefreshPanel(); return r.recovery; })()`);
  assert.equal(await run('vault.state'), 'open');
  assert.equal(await visible('copiaContenido'), true); assert.equal(await visible('copiaOffHint'), false);
  assert.equal(await run(`document.getElementById('copiaCompleta').checked`), true, '«Completa» viene elegida');
  await run(`document.getElementById('saveAudio').checked = true; true`);
  const audioId = await grabar(); assert.ok(audioId, 'audio cifrado pendiente');
  assert.equal(await guardarNota('Persona Inventada Uno: nota con audio, madre de X-901'), 2);
  const antesB = await foto();
  assert.ok(JSON.parse(antesB).audio.metas.length === 1 && JSON.parse(antesB).audio.claves.length >= 2);

  // Ocupada: no se crea una copia mientras se graba (y la copia en curso frena el autobloqueo).
  await run('recording = true; true'); await click('copiaCrear');
  await waitMsg('/Primero terminá de grabar/', 'aviso de ocupado'); assert.equal(await visible('vaultAuth'), false);
  await run('recording = false; true');
  assert.equal(await run(`(() => { copiaBusyN = 1; const b = vaultBusy(); copiaBusyN = 0; return b && !vaultBusy(); })()`), true, 'la copia en curso cuenta como uso para el autobloqueo');

  // Contraseña equivocada: no se crea nada.
  await click('copiaCrear'); await waitFor(`!document.getElementById('vaultAuth').hidden`, 'pedido de contraseña');
  await fill('vaultAuthPass', 'no es la contraseña 000'); await submit('vaultAuth');
  await waitMsg('/La contraseña no es correcta/', 'contraseña equivocada'); assert.equal(await run('window.__dl.length'), 1);
  // Contraseña correcta: copia completa.
  await click('copiaCrear'); await waitFor(`!document.getElementById('vaultAuth').hidden`, 'pedido de contraseña');
  await fill('vaultAuthPass', PASS); await submit('vaultAuth');
  await waitFor('window.__dl.length === 2', 'descarga de la copia completa', 60000);
  assert.match(await msg(), /Copia creada y comprobada: .*1 cuaderno · 2 notas · 1 audio cifrado/);
  assert.match(await msg(), /contraseña actual o con tu código de recuperación/);
  assert.equal(await foto(), antesB, 'crear la copia completa no cambió notas, registros ni audios');
  const bytesB = await bytesDe(1);
  assert.doesNotMatch(Buffer.from(bytesB).toString('latin1'), /Persona Inventada|X-901|"bio"/, 'ni texto en claro ni datos de la huella');
  const tieneWebm = bytesB.some((x, i) => x === 0x1A && bytesB[i + 1] === 0x45 && bytesB[i + 2] === 0xDF && bytesB[i + 3] === 0xA3);
  assert.equal(tieneWebm, false, 'ninguna cabecera WebM en claro');

  // Verificar: con la contraseña, con el código de recuperación, con una clave equivocada y cancelando.
  v = await comprobar('window.__dl[1]', PASS);
  assert.match(v.msg, /^Copia correcta: .*1 audio cifrado/); assert.deepEqual([v.r.contenido, v.r.cuadernos, v.r.notas, v.r.audios, v.r.registros >= 1], ['completa', 1, 2, 1, true]);
  assert.match(v.msg, /No se cargó ni se cambió nada en la app/);
  v = await comprobar('window.__dl[1]', recovery.toLowerCase());
  assert.match(v.msg, /^Copia correcta: /, 'el código de recuperación también la abre');
  v = await comprobar('window.__dl[1]', 'clave equivocada 999');
  assert.equal(v.r, null); assert.match(v.msg, /no abren esta copia/);
  v = await comprobar('window.__dl[1]', null);
  assert.equal(v.r, null); assert.match(v.msg, /cancelada/i);
  // La copia hecha sin protección NO se abre con la contraseña de la protección (es otro archivo, con otra clave).
  v = await comprobar('window.__dl[0]', PASS); assert.match(v.msg, /no abren esta copia/);

  // Elegir el archivo con el selector real de la página.
  const ruta = profile + '/copia-de-prueba.dictanota'; writeFileSync(ruta, Buffer.from(bytesB));
  const {root} = await call('DOM.getDocument'), {nodeId} = await call('DOM.querySelector', {nodeId: root.nodeId, selector: '#copiaArchivo'});
  await run(`document.getElementById('copiaMsg').textContent = ''; true`);
  await call('DOM.setFileInputFiles', {files: [ruta], nodeId});
  await waitFor(`!document.getElementById('copiaClaveForm').hidden`, 'pedido de contraseña tras elegir el archivo');
  await fill('copiaClave', PASS); await submit('copiaClaveForm');
  await waitMsg('/^Copia correcta: /', 'verificación del archivo elegido');
  assert.equal(await run(`document.getElementById('copiaArchivo').value`), '', 'el selector queda vacío para poder elegir el mismo archivo otra vez');

  // Archivos malos: cortado, alterado, de un formato más nuevo y uno que no es una copia. Nunca se pide la contraseña de más.
  await run(`window.__malos = (() => { const f = window.__dl[1]; return f.arrayBuffer().then(b => { const u = new Uint8Array(b);
    const alterado = u.slice(); alterado[Math.floor(u.length / 2)] ^= 1; const nuevo = u.slice(); new DataView(nuevo.buffer).setUint32(16, 2);
    return {cortado: new File([u.subarray(0, u.length - 9)], 'cortado.dictanota'), alterado: new File([alterado], 'alterado.dictanota'), nuevo: new File([nuevo], 'nuevo.dictanota'), otro: new File(['Persona Inventada Uno: un texto cualquiera, no una copia.'], 'nota.txt')}; }); })(); window.__malos.then(m => { window.__malos = m; return true; })`);
  v = await comprobar('window.__malos.cortado', PASS); assert.equal(v.r, null); assert.match(v.msg, /incompleta/);
  v = await comprobar('window.__malos.alterado', PASS); assert.equal(v.r, null); assert.match(v.msg, /dañada o fue modificada/);
  v = await comprobar('window.__malos.nuevo'); assert.equal(v.r, null); assert.match(v.msg, /versión más nueva/);
  v = await comprobar('window.__malos.otro'); assert.equal(v.r, null); assert.match(v.msg, /no es una copia de DictaVoz/);
  assert.equal(await foto(), antesB, 'ninguna comprobación cambió nada');

  // «Solo texto»: sin audios y más liviana.
  await click('copiaSoloTexto'); await click('copiaCrear'); await waitFor(`!document.getElementById('vaultAuth').hidden`, 'pedido de contraseña');
  await fill('vaultAuthPass', PASS); await submit('vaultAuth');
  await waitFor('window.__dl.length === 3', 'descarga de la copia de solo texto', 60000);
  assert.match(await msg(), /solo texto, sin audios/);
  assert.ok(await run('window.__dl[2].size < window.__dl[1].size'), 'la copia de solo texto pesa menos');
  v = await comprobar('window.__dl[2]', PASS); assert.deepEqual([v.r.contenido, v.r.audios, v.r.fragmentos, v.r.notas], ['solo-texto', 0, 0, 2]);
  await click('copiaCompleta');

  // Un audio dañado no entra en la copia, se avisa, y la copia igual pasa su comprobación. El audio dañado no se toca.
  const extra = await run(`anSaveFile(new File([new Uint8Array(3000).fill(5)], 'inventado.mp3', {type: 'audio/mpeg'}), 1000)`);
  assert.ok(extra, 'segundo audio (archivo cargado, pendiente en el borrador)');
  await run(`(async () => { const db = await anDb(); await new Promise((res, rej) => { const t = db.transaction('chunks', 'readwrite'); t.objectStore('chunks').put(new Blob([new Uint8Array(3028).fill(1)]), [${JSON.stringify(extra)}, 0, 0]); t.oncomplete = res; t.onerror = rej; }); return true; })()`);
  const antesC = await foto();
  await click('copiaCrear'); await waitFor(`!document.getElementById('vaultAuth').hidden`, 'pedido de contraseña');
  await fill('vaultAuthPass', PASS); await submit('vaultAuth');
  await waitFor('window.__dl.length === 4', 'descarga con un audio dañado', 60000);
  assert.match(await msg(), /un audio dañado o a medio guardar no entró en la copia/);
  v = await comprobar('window.__dl[3]', PASS); assert.equal(v.r.audios, 1, 'solo entró el audio sano');
  assert.equal(await foto(), antesC, 'el audio dañado quedó como estaba');

  // Después de cambiar la contraseña, la copia vieja se sigue abriendo con la contraseña vieja (y con el código).
  await run(`vault.changePassword(${JSON.stringify(PASS)}, 'frase nueva inventada 902').then(() => true)`);
  v = await comprobar('window.__dl[1]', PASS); assert.match(v.msg, /^Copia correcta: /);
  v = await comprobar('window.__dl[1]', 'frase nueva inventada 902'); assert.match(v.msg, /no abren esta copia/);

  console.log('COPIA CIFRADA K1 OK: sin protección (contraseña propia) y con protección (completa y solo texto); se abre con contraseña o código; cortada, alterada, formato nuevo y archivo ajeno se rechazan; un audio dañado no entra; crear y verificar no cambian nada de lo guardado; 360 px sin desborde.');
} finally {
  try { ws && ws.close(); } catch (e) {}
  chrome.kill('SIGKILL'); server.close();
  try { rmSync(profile, {recursive: true, force: true}); } catch (e) {}
}
