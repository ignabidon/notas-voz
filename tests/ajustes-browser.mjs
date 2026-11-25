// U16 · Rediseño de Ajustes (lista de secciones con subpantallas). Chrome real a 360 px de ancho, sin dependencias (CDP nativo).
// Solo datos inventados. CAPTURA_DIR=<carpeta> guarda las capturas de 360 px (por defecto, una carpeta temporal).
// Cubre: cada fila abre su subpantalla y «‹ Ajustes» vuelve; todos los controles de la lista siguen funcionando; el botón único de
// restaurar elige vacío o reemplazo; la tarjeta de estado cambia con la protección; la fecha de la última copia se actualiza al crear una.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync, mkdtempSync, rmSync, writeFileSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';

const profile = mkdtempSync(tmpdir() + '/dictavoz-u16-');
const shots = process.env.CAPTURA_DIR || mkdtempSync(tmpdir() + '/dictavoz-u16-capturas-');
mkdirSync(shots, {recursive: true});
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(readFileSync(process.env.INDEX_HTML || new URL('../index.html', import.meta.url))); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = 'http://localhost:' + server.address().port;
const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank']);
const PA = 'frase inventada de prueba 111';
const SUBS = ['proteccion', 'copias', 'espacio', 'calidad', 'diccionario', 'diagnostico', 'borrar'];
const TITULOS = {proteccion: 'Protección y contraseña', copias: 'Copias de seguridad', espacio: 'Espacio y audios guardados', calidad: 'Calidad de transcripción', diccionario: 'Diccionario y correcciones', diagnostico: 'Diagnóstico', borrar: 'Borrar datos'};
let ws;
try {
  const endpoint = await new Promise((resolve, reject) => {
    let log = ''; const t = setTimeout(() => reject(Error('Chrome timeout: ' + log)), 30000);
    chrome.on('error', reject); chrome.stderr.on('data', d => { log += d; const m = log.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); resolve(m[1]); } });
  });
  ws = new WebSocket(endpoint); await new Promise(r => ws.addEventListener('open', r, {once: true}));
  let seq = 0; const pending = new Map();
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.method === 'Page.javascriptDialogOpening') call('Page.handleJavaScriptDialog', {accept: true}).catch(() => {});
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, {resolve, reject}); ws.send(JSON.stringify({id, method, params, ...(sessionId ? {sessionId} : {})})); });
  const {targetInfos} = await send('Target.getTargets');
  const {sessionId} = await send('Target.attachToTarget', {targetId: targetInfos.find(t => t.type === 'page').targetId, flatten: true});
  const call = (m, p = {}) => send(m, p, sessionId);
  const run = async expression => {
    const m = await call('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
    if (m.exceptionDetails) throw Error(JSON.stringify(m.exceptionDetails).slice(0, 600));
    return m.result.value;
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  await call('Page.enable'); await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', {width: 360, height: 740, deviceScaleFactor: 2, mobile: true});

  const load = async (bloqueada = false, hash = '') => {
    await sleep(300);
    await call('Page.navigate', {url: ORIGIN + '/' + hash});
    for (let i = 0; i < 150; i++) { try { if (await run('document.readyState==="complete" && typeof convInit==="function" && typeof ajShow==="function" && (' + bloqueada + ' || !!convStore.data)')) return; } catch (e) {} await sleep(100); }
    throw Error('la app no cargó');
  };
  const reset = async protegida => {
    await call('Page.navigate', {url: 'about:blank'}); await sleep(400);
    await call('Storage.clearDataForOrigin', {origin: ORIGIN, storageTypes: 'all'});
    await load();
    if (protegida) {
      await run(`(async()=>{const r=await vault.enable(${JSON.stringify(PA)});r.dek.fill(0);await vaultTakeTabLock();vaultRefreshPanel();return 1})()`);
      assert.equal(await run('vault.state'), 'open');
    }
  };
  const irAjustes = () => run(`document.querySelector('[data-delta-view="ajustes"]').click(); document.body.dataset.view`);
  const abrir = async n => { await run(`document.getElementById('ajRow-${n}').click()`); await sleep(60); };
  const volver = async () => { await run(`document.querySelector('.aj-sub:not([hidden]) [data-aj-back]').click()`); await sleep(60); };
  const visible = id => run(`(()=>{const e=document.getElementById(${JSON.stringify(id)});if(!e)return false;const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&!e.closest('[hidden]')})()`);
  const cfg = () => run(`JSON.parse(localStorage.getItem(CKEY)||'{}')`);
  const setSel = (id, v) => run(`(()=>{const s=document.getElementById(${JSON.stringify(id)});s.value=${JSON.stringify(v)};s.dispatchEvent(new Event('change',{bubbles:true}));return s.value})()`);
  const tocar = id => run(`document.getElementById(${JSON.stringify(id)}).click()`);   // un toque real (cambia el interruptor y dispara su evento)
  // Medidas: nada se sale de los 360 px y todo lo tocable de la pantalla visible mide al menos 48 px de alto.
  const medidas = () => run(`(()=>{const vis=e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&!e.closest('[hidden]')};
    const chicos=[...document.querySelectorAll('#ajustes button:not(.info-toggle), #ajustes select, #ajustes input[type=text], #ajustes input[type=password], #ajustes .aj-row, #ajustes .aj-switch-row, #ajustes label.chk')].filter(vis).filter(e=>e.getBoundingClientRect().height<47.5).map(e=>(e.id||e.className||e.tagName)+':'+Math.round(e.getBoundingClientRect().height));
    const fuera=[...document.querySelectorAll('#ajustes *')].filter(vis).filter(e=>{const r=e.getBoundingClientRect();return r.right>360.5||r.left<-0.5}).map(e=>(e.id||e.className||e.tagName)).slice(0,5);
    return {ancho:document.documentElement.scrollWidth,chicos,fuera}})()`);
  const captura = async nombre => {
    const alto = await run('Math.min(Math.max(document.documentElement.scrollHeight, 740), 3000)');
    await call('Emulation.setDeviceMetricsOverride', {width: 360, height: alto, deviceScaleFactor: 2, mobile: true}); await sleep(150);
    const r = await call('Page.captureScreenshot', {format: 'png'}); writeFileSync(shots + '/' + nombre, Buffer.from(r.data, 'base64'));
    await call('Emulation.setDeviceMetricsOverride', {width: 360, height: 740, deviceScaleFactor: 2, mobile: true});
  };
  const espiar = ids => run(`(()=>{window.__toques=[];for(const id of ${JSON.stringify(ids)}){document.getElementById(id).addEventListener('click',e=>{window.__toques.push(id);e.stopImmediatePropagation()},true)}return 1})()`);

  for (const protegida of [false, true]) {
    const modo = protegida ? 'protección activada' : 'protección desactivada';
    await reset(protegida);

    // ---- 1) Pantalla principal: tarjeta de estado, grupos y pie ----
    assert.equal(await irAjustes(), 'ajustes');
    assert.equal(await visible('ajHome'), true);
    for (const n of SUBS) assert.equal(await visible('ajSub-' + n), false, 'las subpantallas empiezan cerradas');
    assert.equal(await run(`document.getElementById('ajStatusTitle').textContent`), protegida ? 'Protección activada' : 'Protección desactivada', modo + ': la tarjeta de estado');
    assert.match(await run(`document.getElementById('ajStatusLine').textContent`), protegida ? /15 minutos/ : /Sin protección/);
    assert.equal(await visible('ajLock'), protegida, '«Bloquear ahora» solo con la protección activada');
    assert.equal(await visible('ajCopy'), true);
    assert.equal(await visible('ajProtect'), !protegida, 'revisión 22/11 (S2): sin protección, la acción principal de la tarjeta es «Activar protección»');
    assert.equal(await run(`document.getElementById('ajLastCopy').textContent`), 'Todavía no preparaste ninguna copia.');
    assert.equal(await run(`document.getElementById('ajCredit').textContent`), 'Psicólogo Ignacio Lasarte · creador de la aplicación');
    assert.equal(await run(`/\\b(Claude|ChatGPT|OpenAI|Anthropic)\\b/i.test(document.getElementById('ajustes').textContent)`), false, 'sin nombres de IA en Ajustes');
    assert.deepEqual(await run(`[...document.querySelectorAll('#ajHome .aj-group')].map(h=>h.textContent)`), ['Datos y privacidad', 'Lectura', 'Dictado', 'Avanzado']);   // revisión 22/11: lo de lectura antes que lo técnico
    for (const id of ['saveAudio', 'listPreview', 'textSize']) assert.equal(await visible(id), true, '#' + id + ' está directamente en la pantalla principal');
    let m = await medidas();
    assert.ok(m.ancho <= 360, modo + ': sin desplazamiento horizontal en la principal (' + m.ancho + ')');
    assert.deepEqual(m.chicos, [], modo + ': todo lo tocable mide 48 px o más (principal)'); assert.deepEqual(m.fuera, []);
    await captura(protegida ? 'u16-principal-360-protegida.png' : 'u16-principal-360.png');

    // ---- 2) Cada fila abre su subpantalla y «‹ Ajustes» vuelve ----
    for (const n of SUBS) {
      await abrir(n);
      assert.equal(await visible('ajHome'), false); assert.equal(await visible('ajSub-' + n), true, 'abre ' + n);
      for (const o of SUBS.filter(x => x !== n)) assert.equal(await visible('ajSub-' + o), false);
      assert.equal(await run(`document.getElementById('ajT-${n}').textContent`), TITULOS[n]);
      assert.equal(await run(`document.activeElement.id`), 'ajT-' + n, 'el foco va al título de la subpantalla');
      assert.equal(await run(`document.querySelector('.aj-sub:not([hidden]) [data-aj-back]').textContent`), '‹ Ajustes');
      m = await medidas();
      assert.ok(m.ancho <= 360, modo + ': ' + n + ' sin desplazamiento horizontal (' + m.ancho + ')'); assert.deepEqual(m.fuera, [], n + ' no se sale de la pantalla');
      assert.deepEqual(m.chicos, [], modo + ': ' + n + ' todo lo tocable mide 48 px o más');
      if (!protegida) await captura('u16-sub-' + n + '-360.png');
      await volver();
      assert.equal(await visible('ajHome'), true); assert.equal(await visible('ajSub-' + n), false);
      assert.equal(await run(`document.activeElement.id`), 'ajRow-' + n, 'al volver, el foco regresa a la fila');
    }
    // El botón «Crear copia» de la tarjeta lleva a Copias; tocar la pestaña Ajustes desde una subpantalla vuelve a la lista.
    await tocar('ajCopy'); assert.equal(await visible('ajSub-copias'), true);
    await irAjustes(); assert.equal(await visible('ajHome'), true, 'tocar la pestaña Ajustes vuelve a la lista');
    // El vínculo #localPrivacy abre Borrar datos.
    await load(false, '#localPrivacy'); if (protegida) await run(`(async()=>{await vault.unlockPassword(${JSON.stringify(PA)});await vaultTakeTabLock();await vaultAfterUnlock();return 1})()`);
    assert.equal(await run('document.body.dataset.view'), 'ajustes'); assert.equal(await visible('ajSub-borrar'), true); assert.equal(await run(`document.getElementById('localPrivacy').open`), true);
    console.log('U16 · navegación · ' + modo + ' OK');
    await irAjustes();

    // ---- 3) Los controles de la lista siguen funcionando (y se guardan como antes) ----
    await setSel('textSize', 'large');
    assert.equal(await run('document.documentElement.dataset.textSize'), 'large'); assert.equal((await cfg()).textSize, 'large');
    await tocar('listPreview'); assert.equal((await cfg()).listPreview, false, 'vista previa en la lista');
    await tocar('listPreview'); assert.equal((await cfg()).listPreview, true);
    await tocar('saveAudio'); assert.equal((await cfg()).saveAudio, true, 'conservar audio');
    await tocar('saveAudio'); assert.equal((await cfg()).saveAudio, false);
    await abrir('calidad');
    await setSel('model', 'Xenova/whisper-base'); await setSel('accel', 'cpu'); await setSel('mic', 'raw');
    let c = await cfg(); assert.deepEqual([c.model, c.accel, c.mic], ['Xenova/whisper-base', 'cpu', 'raw'], 'modelo, velocidad y micrófono');
    assert.match(await run(`document.getElementById('modelHint').textContent`), /Base|equilibrado|memoria|rápid/i);
    assert.equal(await visible('nativeNote'), true, 'cómo transcribir');
    await tocar('replace'); assert.equal((await cfg()).replace, false, 'empezar de cero al grabar'); await tocar('replace');
    assert.equal(await run(`document.querySelector('input[name=eng][value=whisper]').checked`), true);
    await volver();
    await abrir('diccionario');
    await tocar('learnAuto'); assert.equal((await cfg()).learnAuto, false, 'aprender de mis correcciones'); await tocar('learnAuto');
    await run(`(()=>{document.querySelector('.studio-dictionary').open=true;const d=document.getElementById('dict');d.value='palabra mal => palabra bien';d.dispatchEvent(new Event('input',{bubbles:true}));return 1})()`); await sleep(300);
    assert.match(await run(`vaultStore.getItem(DKEY)||''`), /palabra mal => palabra bien/, 'el diccionario se guarda');
    for (const id of ['applyDict', 'voseo']) assert.equal(await visible(id), true, '#' + id);
    // Voseo: el botón agrega lo que falta (también a un diccionario que ya tenía una versión vieja) y no duplica.
    await run(`(()=>{const d=document.getElementById('dict');d.value='# Voseo rioplatense\\nquieres => querés';d.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('voseo').click();return 1})()`); await sleep(300);
    const dic = await run(`document.getElementById('dict').value`);
    assert.match(dic, /queréis => querés/, 'el voseo agrega «queréis»'); assert.match(dic, /podéis => podés/);
    assert.equal(dic.split('quieres => querés').length, 2, 'no repite lo que ya estaba'); assert.equal(dic.split('# Voseo rioplatense').length, 2, 'no repite el encabezado');
    await run(`document.getElementById('voseo').click()`); await sleep(200);
    assert.equal(await run(`document.getElementById('dict').value`), dic, 'una segunda vez no cambia nada');
    assert.equal(await run(`applyDict('¿Queréis venir? Vosotros podéis.', D)`), '¿Querés venir? Ustedes podés.', 'se aplica al texto');
    await volver();
    // Persisten tras recargar.
    await load(protegida);
    if (protegida) await run(`(async()=>{await vault.unlockPassword(${JSON.stringify(PA)});await vaultTakeTabLock();await vaultAfterUnlock();return 1})()`);
    assert.equal(await run(`document.getElementById('model').value`), 'Xenova/whisper-base'); assert.equal(await run(`document.getElementById('textSize').value`), 'large');
    console.log('U16 · controles · ' + modo + ' OK');

    // ---- 4) Protección y contraseña (solo desactivada: se activa desde la propia pantalla) ----
    await irAjustes(); await abrir('proteccion');
    if (!protegida) {
      assert.equal(await visible('vaultEnable'), true);
      await tocar('vaultEnable'); assert.equal(await visible('vaultSetup'), true);
      await run(`(()=>{for(const [id,v] of [['vaultNew',${JSON.stringify(PA)}],['vaultNew2',${JSON.stringify(PA)}]]){const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))}document.getElementById('vaultSetupGo').click();return 1})()`);
      for (let i = 0; i < 150 && (await run('vault.state')) !== 'open'; i++) await sleep(100);
      assert.equal(await run('vault.state'), 'open', 'se activó desde la subpantalla');
      assert.equal(await visible('vaultRecoveryBox'), true, 'muestra el código de recuperación');
      await run(`vaultEl('vaultRecoveryDone').click()`); await volver();
      assert.equal(await run(`document.getElementById('ajStatusTitle').textContent`), 'Protección activada', 'la tarjeta cambia al activar');
      assert.equal(await visible('ajLock'), true);
    } else {
      for (const id of ['vaultLockBtn', 'vaultChangePw', 'vaultNewCode', 'vaultBioAdd']) assert.equal(await visible(id), true, '#' + id);
      await volver();
    }
    // «Bloquear ahora» de la tarjeta bloquea la app.
    await tocar('ajLock');
    let estado = 'open';
    for (let i = 0; i < 80 && estado === 'open'; i++) { await sleep(100); try { estado = await run('vault.state'); } catch (e) {} }
    assert.notEqual(estado, 'open', 'la tarjeta bloquea la app');
    console.log('U16 · protección · ' + modo + ' OK');
  }

  // ---- 5) Copias: crear una copia actualiza la fecha; el botón único de restaurar elige el camino ----
  await reset(false);
  await irAjustes(); await abrir('copias');
  assert.deepEqual(await run(`['copiaCrear','copiaVerificar','ajRestoreBtn','ajRestoreHint'].map(i=>document.getElementById(i).textContent.slice(0,30))`).then(a => a.slice(0, 3)), ['Crear una copia', 'Verificar una copia', 'Restaurar una copia']);
  for (const id of ['copiaCrear', 'copiaVerificar', 'ajRestoreBtn']) assert.equal(await visible(id), true);
  assert.equal(await run(`document.querySelector('#ajRestore .aj-tag').textContent`), 'Experimental');
  assert.equal(await run(`getComputedStyle(document.getElementById('ajRestore')).borderTopColor`), 'rgb(155, 44, 38)', 'borde rojo');
  assert.equal(await run(`['copiaRestaurar','copiaReemplazar'].every(i=>document.getElementById(i).hidden)`), true, 'los dos caminos de K2 quedan ocultos detrás del botón único');
  // Instalación vacía → restauración en vacío.
  assert.equal(await run('k2StorageEmpty()'), true);
  await sleep(200);
  assert.match(await run(`document.getElementById('ajRestoreHint').textContent`), /está vacía/);
  await espiar(['copiaRestaurar', 'copiaReemplazar']);
  await tocar('ajRestoreBtn'); await sleep(300);
  assert.deepEqual(await run('window.__toques'), ['copiaRestaurar'], 'instalación vacía → k2RestoreEmpty');
  // Con datos → reemplazo.
  await run(`(()=>{vaultStore.setItem(KEY, JSON.stringify([{id:'n1',title:'Nota inventada',text:'Texto inventado ZZ-COPIA.',ts:1,tags:[]}]));return 1})()`);
  assert.equal(await run('k2StorageEmpty()'), false);
  await run(`window.__toques=[]`); await volver(); await abrir('copias'); await sleep(300);
  assert.match(await run(`document.getElementById('ajRestoreHint').textContent`), /ya tiene datos/);
  await tocar('ajRestoreBtn'); await sleep(300);
  assert.deepEqual(await run('window.__toques'), ['copiaReemplazar'], 'con datos → k2Replace');
  // Crear una copia (protección apagada: pide contraseña propia del archivo) → la fecha se actualiza.
  assert.equal(await run(`JSON.parse(localStorage.getItem(CKEY)||'{}').lastBackupAt`), undefined, 'antes: sin fecha de copia');
  await tocar('copiaCrear'); assert.equal(await visible('copiaPwForm'), true);
  await run(`(()=>{for(const id of ['copiaPw1','copiaPw2']){const e=document.getElementById(id);e.value=${JSON.stringify(PA)};e.dispatchEvent(new Event('input',{bubbles:true}))}document.querySelector('#copiaPwForm button[type=submit]').click();return 1})()`);
  for (let i = 0; i < 150 && !(await run(`/Copia creada/.test(document.getElementById('copiaMsg').textContent)`)); i++) await sleep(100);
  assert.match(await run(`document.getElementById('copiaMsg').textContent`), /Copia creada y comprobada/);
  const antes = Date.now(); const lb = (await cfg()).lastBackupAt;
  assert.ok(lb && lb <= antes && lb > antes - 60000, 'la fecha de la copia quedó en la configuración existente');
  assert.deepEqual(Object.keys(await cfg()).filter(k => !['textSize', 'model', 'accel', 'mic', 'eng', 'replace', 'saveAudio', 'pVolatile', 'learnAuto', 'listPreview', 'lastBackupAt', 'theme'].includes(k)), [], 'la configuración no suma ningún otro campo');   // U5: «theme» es el único campo nuevo (apariencia)
  await volver();
  assert.equal(await run(`document.getElementById('ajLastCopy').textContent`), 'Última copia preparada: hoy. Confirmá que esté descargada y verificada; conviene hacer una por semana.');
  // Pasan los días: «hace N días».
  await run(`(()=>{cfgLastBackup=Date.now()-3*86400000-5000;saveCfg();ajRefresh();return 1})()`);
  assert.equal(await run(`document.getElementById('ajLastCopy').textContent`), 'Última copia preparada: hace 3 días. Confirmá que esté descargada y verificada; conviene hacer una por semana.');
  await load(); await irAjustes();
  assert.equal(await run(`document.getElementById('ajLastCopy').textContent`), 'Última copia preparada: hace 3 días. Confirmá que esté descargada y verificada; conviene hacer una por semana.', 'la fecha sobrevive a recargar');
  console.log('U16 · copias OK');

  // ---- 6) Espacio y audios; Borrar datos (incluye el audio antiguo) ----
  await abrir('espacio');
  for (const id of ['e3SpaceMsg', 'e3Refresh', 'e3Persist', 'e3Sort', 'e3AudioList']) assert.equal(await visible(id), true, '#' + id);
  assert.equal(await visible('e3Legacy'), false, 'sin audio antiguo, su bloque no se ve');
  await volver(); await abrir('borrar');
  assert.equal(await visible('clearLocalTexts'), true); assert.equal(await visible('ajLegacyBox'), false);
  await run(`document.getElementById('e3Legacy').hidden=false; document.getElementById('e3LegacyDelete').disabled=false`); await sleep(100);
  assert.equal(await visible('ajLegacyBox'), true, 'con audio antiguo, Borrar datos ofrece borrarlo');
  await espiar(['e3LegacyDelete']); await tocar('ajLegacyDelete'); assert.deepEqual(await run('window.__toques'), ['e3LegacyDelete']);
  await run(`document.getElementById('e3Legacy').hidden=true`); await sleep(100); assert.equal(await visible('ajLegacyBox'), false);
  await run(`vaultStore.setItem(KEY, JSON.stringify([{id:'n2',title:'Otra inventada',text:'Texto inventado ZZ-BORRAR.',ts:2,tags:[]}]))`);
  await tocar('clearLocalTexts'); await sleep(400);
  assert.equal(await run(`(vaultStore.getItem(KEY)||'').includes('ZZ-BORRAR')`), false, 'borrar notas y borradores sigue funcionando');
  assert.equal(await run(`getComputedStyle(document.getElementById('ajRow-borrar')||document.body).color!==''`), true);
  assert.equal(await run(`getComputedStyle(document.getElementById('clearLocalTexts')).color`), 'rgb(155, 44, 38)', 'rojo');
  await volver();
  assert.equal(await run(`getComputedStyle(document.querySelector('#ajRow-borrar b')).color`), 'rgb(155, 44, 38)', 'la fila «Borrar datos» va en rojo');
  console.log('U16 · espacio y borrar OK');

  // ---- 7) Diagnóstico ----
  await abrir('diagnostico');
  assert.equal(await visible('nativeDiag'), true);
  await run(`document.querySelector('#ajSub-diagnostico [data-go-view]').click()`); assert.equal(await run('document.body.dataset.view'), 'grabacion');
  console.log('U16 · todo OK. Capturas en ' + shots);
} finally {
  try { ws && ws.close(); } catch (e) {}
  chrome.kill('SIGKILL'); server.close();
  try { rmSync(profile, {recursive: true, force: true}); } catch (e) {}
}
