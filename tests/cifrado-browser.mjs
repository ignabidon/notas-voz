// Protección cifrada en Chrome real (sin dependencias): CDP por WebSocket nativo de Node 22.
// Huella simulada con el autenticador virtual de Chrome (con PRF). Datos ficticios; sin micrófono.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';

const MARCA = 'PACIENTE-FICTICIO-7Q', MARCA2 = 'ESCRITO-FICTICIO-3Z', PASS = 'frase de prueba larga', PASS2 = 'otra frase nueva';
const SHOTS = process.env.CIFRADO_SHOTS || '';
const profile = mkdtempSync(tmpdir() + '/dictanota-cifrado-');
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
  const shot = async name => { if (!SHOTS) return; const {data} = await call('Page.captureScreenshot', {format: 'png'}); writeFileSync(SHOTS + '/' + name + '.png', Buffer.from(data, 'base64')); };
  const allStorage = 'JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])))';
  const ready = 'document.readyState === "complete" && typeof vaultWhenReady === "function"';
  let first = true;
  const load = async () => {
    if (first) { first = false; await call('Page.navigate', {url: URL_APP + '#ajustes'}); }
    else { await run('window.__viejo = true'); await call('Page.reload', {ignoreCache: true}); await waitFor('!window.__viejo', 'recarga'); }
    await waitFor(ready, 'carga');
  };

  await call('Page.enable'); await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', {width: 412, height: 915, deviceScaleFactor: 1, mobile: true});
  await call('WebAuthn.enable', {enableUI: false});
  await call('WebAuthn.addVirtualAuthenticator', {options: {protocol: 'ctap2', ctap2Version: 'ctap2_1', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, hasPrf: true, automaticPresenceSimulation: true}});

  // 1) Datos ficticios en claro, como hoy.
  await load();
  await run(`localStorage.setItem('notasvoz.gamma.v1', JSON.stringify([{id:'a1', title:'Sesión ${MARCA}', text:'Texto de ${MARCA}', ts:1, tags:['prueba']}])); localStorage.setItem('notasvoz.gamma.draft.v1', JSON.stringify({title:'', text:'Borrador ${MARCA}', tags:[], cur:null, baseline:''})); localStorage.setItem('notasvoz.gamma.people.v1', JSON.stringify([{names:['${MARCA}'], code:'P-001', rel:''}])); true`);
  await load();
  assert.equal(await run('vault.state'), 'off');
  assert.equal(await run('document.getElementById("vaultLock").hidden'), true);
  assert.equal(await run('notes.length'), 1);
  await shot('1-ajustes-sin-proteccion');

  // 2) Activar con contraseña, guardar el código y registrar la huella.
  await run('document.getElementById("vaultEnable").click()');
  await run(`document.getElementById("vaultNew").value = ${JSON.stringify(PASS)}; document.getElementById("vaultNew2").value = ${JSON.stringify(PASS)}; document.getElementById("vaultSetupGo").click(); true`);
  await waitFor('!document.getElementById("vaultRecoveryBox").hidden', 'código de recuperación visible');
  const recovery = await run('document.getElementById("vaultRecoveryCode").textContent');
  assert.match(recovery, /^[0-9A-Z]{4}(-[0-9A-Z]{4}){5}$/);
  await shot('2-codigo-recuperacion');
  let stored = await run(allStorage);
  assert.ok(!stored.includes(MARCA), 'quedó texto ficticio sin cifrar al activar');
  assert.equal(await run('vault.state'), 'open');
  assert.equal(await run('notes.length'), 1, 'la sesión sigue abierta con las notas');
  await run('document.getElementById("vaultRecoverySaved").click(); document.getElementById("vaultRecoveryBio").click(); true');
  await waitFor('/huella/.test(document.getElementById("vaultMsg").textContent) && !!vault.header.bio', 'huella registrada');
  assert.match(await run('document.getElementById("vaultMsg").textContent'), /Listo/);
  assert.equal(await run('document.getElementById("vaultRecoveryCode").textContent'), '', 'el código no queda en pantalla');
  await shot('3-proteccion-activada');

  // 3) Escribir con la protección activa: el borrador se guarda cifrado.
  await run(`const t = document.getElementById("text"); t.value = "Nota nueva ${MARCA2}"; t.dispatchEvent(new Event("input", {bubbles:true})); saveDraft(); true`);
  await sleep(300);
  stored = await run(allStorage);
  assert.ok(!stored.includes(MARCA2) && !stored.includes(MARCA), 'lo escrito se guardó sin cifrar');

  // 4) Recargar: aparece bloqueada y sin datos; la huella abre y recupera el borrador.
  await load();
  assert.equal(await run('vault.state'), 'locked');
  assert.equal(await run('document.getElementById("vaultLock").hidden'), false);
  assert.equal(await run('document.getElementById("vaultBioUnlock").hidden'), false);
  assert.equal(await run('notes.length + document.getElementById("text").value.length'), 0, 'bloqueada no muestra nada');
  assert.equal(await run('document.querySelector(".wrap").inert'), true, 'la app no se puede usar detrás del bloqueo');
  await shot('4-pantalla-bloqueo');
  await run('document.getElementById("vaultBioUnlock").click(); true');
  await waitFor('vault.state === "open" && document.getElementById("vaultLock").hidden', 'desbloqueo con huella');
  assert.equal(await run('notes.length'), 1);
  assert.match(await run('document.getElementById("text").value'), new RegExp(MARCA2));
  assert.equal(await run('document.querySelector(".wrap").inert'), false);
  assert.equal(await run('document.getElementById("topLock").hidden'), false);

  // 4b) Si el borrador falla al autoguardarse, el temporizador cubre los datos, sin descartar el texto.
  await run(`window.__beforeLockNormal = vaultBeforeLock; vaultBeforeLock = async () => false;
    $('text').value = 'BORRADOR-CON-CUOTA-SIMULADA';
    vaultLastActivity = Date.now() - 16 * 60 * 1000;
    document.dispatchEvent(new Event('visibilitychange')); true`);
  await waitFor('vaultPrivacyHold && !document.getElementById("vaultLock").hidden', 'escudo de privacidad');
  assert.equal(await run('vault.state'), 'open', 'no se destruye el borrador sin guardar');
  assert.equal(await run('document.querySelector(".wrap").inert'), true, 'texto no accesible desde la interfaz');
  assert.equal(await run('document.getElementById("vaultLockTitle").textContent'), 'DictaVoz está oculta');
  assert.equal(await run('document.getElementById("vaultBioUnlock").hidden'), true);
  await run('document.getElementById("vaultLockPass").value = "incorrecta"; document.getElementById("vaultLockGo").click(); true');
  await waitFor('/no coinciden/.test(document.getElementById("vaultLockMsg").textContent)', 'rechazo de contraseña del escudo');
  assert.equal(await run('vaultPrivacyHold'), true);
  await run(`document.getElementById("vaultLockPass").value = ${JSON.stringify(PASS)};
    document.getElementById("vaultLockGo").click(); true`);
  await waitFor('!vaultPrivacyHold && document.getElementById("vaultLock").hidden', 'retirar escudo con contraseña');
  assert.equal(await run('document.getElementById("text").value'), 'BORRADOR-CON-CUOTA-SIMULADA', 'borrador visible recuperado');
  await run('vaultBeforeLock = window.__beforeLockNormal; true');

  // 5) Bloquear desde el encabezado; contraseña incorrecta y luego correcta.
  await run('window.__viejo = true; document.getElementById("topLock").click(); true');
  await waitFor('!window.__viejo && ' + ready + ' && vault.state === "locked"', 'bloqueo manual');
  await run('document.getElementById("vaultLockPass").value = "incorrecta"; document.getElementById("vaultLockGo").click(); true');
  await waitFor('/no coinciden/.test(document.getElementById("vaultLockMsg").textContent)', 'aviso de contraseña incorrecta');
  assert.equal(await run('vault.state'), 'locked');
  await run(`document.getElementById("vaultLockPass").value = ${JSON.stringify(PASS)}; document.getElementById("vaultLockGo").click(); true`);
  await waitFor('vault.state === "open"', 'desbloqueo con contraseña');

  // 6) Grabando no se bloquea por inactividad; sin actividad durante 15 minutos, sí.
  await run('recording = true; vaultLastActivity = Date.now() - 16 * 60 * 1000; document.dispatchEvent(new Event("visibilitychange")); true');
  await sleep(400);
  assert.equal(await run('vault.state'), 'open', 'no debe bloquear mientras graba');
  await run('window.__viejo = true; recording = false; vaultLastActivity = Date.now() - 16 * 60 * 1000; document.dispatchEvent(new Event("visibilitychange")); true');
  await waitFor('!window.__viejo && ' + ready + ' && vault.state === "locked"', 'bloqueo automático');

  // 7) Olvidé la contraseña: el código de recuperación abre y pone una contraseña nueva.
  await run('document.getElementById("vaultRecoverOpen").click(); true');
  await run(`document.getElementById("vaultRecCode").value = ${JSON.stringify(recovery.toLowerCase())}; document.getElementById("vaultRecNew").value = ${JSON.stringify(PASS2)}; document.getElementById("vaultRecNew2").value = ${JSON.stringify(PASS2)}; document.querySelector("#vaultRecoverForm button[type=submit]").click(); true`);
  await waitFor('vault.state === "open"', 'desbloqueo con código');
  assert.equal(await run('notes.length'), 1);

  // 7b) Código nuevo: botón Copiar presente y el código anterior deja de servir.
  await run('document.getElementById("vaultNewCode").click(); true');
  await waitFor('!document.getElementById("vaultAuth").hidden', 'pide contraseña para el código nuevo');
  await run(`document.getElementById("vaultAuthPass").value = ${JSON.stringify(PASS2)}; document.querySelector("#vaultAuth button[type=submit]").click(); true`);
  await waitFor('!document.getElementById("vaultRecoveryBox").hidden && document.getElementById("vaultRecoveryCode").textContent.length === 29', 'código nuevo visible');
  const nuevo = await run('document.getElementById("vaultRecoveryCode").textContent');
  assert.notEqual(nuevo, recovery);
  assert.equal(await run('document.getElementById("vaultRecoveryBio").hidden'), true);
  await run('document.getElementById("vaultRecoveryCopy").click(); true');
  await waitFor('/[Cc]opi/.test(document.getElementById("vaultMsg").textContent)', 'aviso de copia');
  await run('document.getElementById("vaultRecoverySaved").click(); document.getElementById("vaultRecoveryDone").click(); true');
  assert.equal(await run('document.getElementById("vaultRecoveryBox").hidden && document.getElementById("vaultRecoveryCode").textContent === ""'), true);
  await shot('5-codigo-nuevo');

  // 8) Quitar la protección (con contraseña): los datos vuelven a quedar como antes.
  await run('document.getElementById("vaultDisable").click(); true');
  await waitFor('!document.getElementById("vaultAuth").hidden', 'pide contraseña');
  await run(`document.getElementById("vaultAuthPass").value = ${JSON.stringify(PASS2)}; document.querySelector("#vaultAuth button[type=submit]").click(); true`);
  await waitFor('vault.state === "off"', 'protección quitada');
  stored = await run(allStorage);
  assert.ok(stored.includes(MARCA) && stored.includes(MARCA2), 'los datos no volvieron');
  assert.ok(!stored.includes('notasvoz.boveda'), 'quedaron restos de la protección');
  await load();
  assert.equal(await run('vault.state'), 'off');
  assert.equal(await run('notes.length'), 1);
  console.log('CIFRADO OK: activar, código, huella (PRF virtual), bloqueo manual y automático, recuperación y quitar la protección.');
} finally {
  try { ws && ws.close(); } catch (e) {}
  chrome.kill('SIGKILL'); server.close();
  try { rmSync(profile, {recursive: true, force: true}); } catch (e) {}
}
