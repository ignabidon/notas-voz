// U12 · Elegir cuaderno y nombre desde Dictar. Chrome real a 360 px de ancho (sin dependencias: CDP por WebSocket nativo).
// Solo datos inventados. El dictado se simula con las mismas funciones de la captura (prepareNew + appendMachine).
// Cubre: cuaderno nuevo con nombre, sin nombre (fecha y hora) y uno existente, con la protección activada y desactivada;
// que dictar dentro de un cuaderno no muestre el selector; que nada se guarde sin confirmar el borrador; que la elección
// dure solo la sesión. CAPTURA_DIR=<carpeta> guarda las capturas de 360 px (por defecto, una carpeta temporal).
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync, mkdtempSync, rmSync, writeFileSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';

const profile = mkdtempSync(tmpdir() + '/dictavoz-u12-');
const shots = process.env.CAPTURA_DIR || mkdtempSync(tmpdir() + '/dictavoz-u12-capturas-');
mkdirSync(shots, {recursive: true});
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(readFileSync(process.env.INDEX_HTML || new URL('../index.html', import.meta.url))); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = 'http://localhost:' + server.address().port;
const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank']);
const PA = 'frase inventada de prueba 111';
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

  const load = async (bloqueada = false) => {
    await sleep(300);
    await call('Page.navigate', {url: ORIGIN + '/'});
    for (let i = 0; i < 150; i++) { try { if (await run('document.readyState==="complete" && typeof convInit==="function" && ('+bloqueada+' || !!convStore.data)')) return; } catch (e) {} await sleep(100); }
    throw Error('la app no cargó');
  };
  const reset = async protegida => {
    await call('Page.navigate', {url: 'about:blank'}); await sleep(400);
    await call('Storage.clearDataForOrigin', {origin: ORIGIN, storageTypes: 'all'});
    await load();
    if (protegida) {
      await run(`(async()=>{const r=await vault.enable(${JSON.stringify(PA)});r.dek.fill(0);await vaultTakeTabLock();return 1})()`);
      assert.equal(await run('vault.state'), 'open');
    }
  };
  const vista = v => run(`document.querySelector('[data-delta-view="${v}"]').click(); document.body.dataset.view`);
  // Mide un elemento en pantalla: visible solo si ocupa lugar y cae dentro de los 360 px.
  const rect = id => run(`(()=>{const e=document.getElementById(${JSON.stringify(id)});if(!e)return null;const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return {w:r.width,h:r.height,l:r.left,r:r.right,visible:r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&!e.closest('[hidden]')}})()`);
  const setSel = v => run(`(()=>{const s=document.getElementById('dictDestSel');s.value=${JSON.stringify(v)};s.dispatchEvent(new Event('change',{bubbles:true}));return s.value})()`);
  const setName = v => run(`(()=>{const s=document.getElementById('dictName');s.value=${JSON.stringify(v)};s.dispatchEvent(new Event('input',{bubbles:true}));return 1})()`);
  const dictar = texto => run(`(()=>{prepareNew();appendMachine(${JSON.stringify(texto)});return 1})()`);   // empezar a dictar + llega la transcripción
  const guardar = async n => {   // toca Guardar en Cuadernos y espera a que el total de notas llegue a n
    await vista('transcripcion'); await run(`document.getElementById('save').click()`);
    for (let i = 0; i < 100; i++) { if (await run(`convStore.data.entries.length===${n} && !convSaving`)) return; await sleep(50); }
    throw Error('no se guardó la nota ' + n);
  };
  const estado = () => run(`JSON.stringify({convs:convStore.data.conversations.map(c=>({id:c.id,title:c.title,updatedAt:c.updatedAt})),entries:convStore.data.entries.map(e=>({text:e.text,cid:e.conversationId,kind:e.kind,savedAt:e.savedAt,tz:e.tzOffsetMin})),draft:$('text').value})`).then(JSON.parse);
  const opciones = () => run(`JSON.stringify([...document.getElementById('dictDestSel').options].map(o=>[o.value,o.textContent]))`).then(JSON.parse);
  const textoPlano = marca => run(`(()=>{let n=0;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if((localStorage.getItem(k)||'').includes(${JSON.stringify(marca)}))n++;}return n})()`);
  const captura = async nombre => { const r = await call('Page.captureScreenshot', {format: 'png'}); writeFileSync(shots + '/' + nombre, Buffer.from(r.data, 'base64')); };

  for (const protegida of [false, true]) {
    const modo = protegida ? 'protección activada' : 'protección desactivada';
    await reset(protegida);

    // ---- 1) Aspecto y comportamiento por defecto, a 360 px ----
    assert.equal(await vista('grabacion'), 'grabacion');
    // Revisión 22/11 (D1): el destino arranca plegado en una línea «Se guarda en: …» que muestra a dónde va; al tocarla se despliegan los mismos campos.
    assert.equal((await rect('dictDestSel')).visible, false, modo + ': plegado al entrar');
    const tog = await rect('dictDestToggle'); assert.ok(tog.visible && tog.h >= 47.5, modo + ': la línea de destino se ve y mide 48 px');
    assert.equal(await run(`document.getElementById('dictDestNow').textContent`), 'Cuaderno nuevo');
    await run(`document.getElementById('dictDestToggle').click()`); await sleep(100);
    assert.equal(await run(`document.getElementById('dictDestToggle').getAttribute('aria-expanded')`), 'true');
    const sel = await rect('dictDestSel'), nom = await rect('dictName');
    assert.ok(sel.visible && nom.visible, modo + ': el selector y el nombre se ven en Dictar');
    assert.ok(sel.h >= 47.5 && nom.h >= 47.5, modo + ': campos de 48 px para el pulgar');
    assert.ok(sel.l >= 0 && sel.r <= 360 && nom.l >= 0 && nom.r <= 360, modo + ': nada se sale de los 360 px');
    assert.equal(await run('document.documentElement.scrollWidth <= 360'), true, modo + ': sin desplazamiento horizontal');
    assert.deepEqual(await opciones(), [['', 'Cuaderno nuevo']], 'sin cuadernos: solo «Cuaderno nuevo»');
    assert.equal(await run(`document.getElementById('dictDestSel').value`), '', 'por defecto: cuaderno nuevo');
    if (!protegida) { await run(`document.getElementById('dictDest').scrollIntoView({block:'center'})`); await sleep(200); await captura('u12-selector-360-cuaderno-nuevo.png'); }

    // ---- 2) Cuaderno nuevo CON nombre: el dictado es borrador hasta tocar Guardar ----
    await setName('  Caso ficticio P-001  ');
    await dictar('Texto inventado uno ZZ-UNO.');
    await vista('transcripcion');
    assert.match(await run(`document.getElementById('convTarget').textContent`), /se crea el cuaderno nuevo «Caso ficticio P-001»/);
    let e = await estado();
    assert.equal(e.convs.length + e.entries.length, 0, modo + ': mientras es borrador no hay cuaderno ni nota');
    assert.equal(await run(`JSON.parse(vaultStore.getItem(CONV_KEY)||'{"entries":[]}').entries.length`), 0, modo + ': tampoco en el almacenamiento');
    assert.match(e.draft, /ZZ-UNO/, 'el texto sigue en el editor');
    await guardar(1);
    e = await estado();
    assert.equal(e.convs.length, 1); assert.equal(e.convs[0].title, 'Caso ficticio P-001', 'el nombre se recorta y se usa');
    assert.deepEqual([e.entries[0].text, e.entries[0].kind], ['Texto inventado uno ZZ-UNO.', 'audio']);
    assert.equal(await run(`document.getElementById('dictName').value`), '', 'el nombre se limpia después de guardar');
    assert.equal(await textoPlano('ZZ-UNO') > 0, !protegida, modo + ': el texto está en claro solo con la protección apagada');
    if (protegida) assert.equal(await run('vault.saved(CONV_KEY)'), true, 'llegó cifrado al almacenamiento');

    // ---- 3) Cuaderno nuevo SIN nombre (y con solo espacios): fecha y hora, como hoy (U7) ----
    await vista('grabacion'); await setName('    ');
    await dictar('Texto inventado dos ZZ-DOS.');
    assert.match(await run(`(vista=>{document.querySelector('[data-delta-view="transcripcion"]').click();return document.getElementById('convTarget').textContent})()`), /se crea un cuaderno nuevo con la fecha y hora/);
    await guardar(2);
    e = await estado();
    const c2 = e.convs.find(c => c.id === e.entries[1].cid);
    assert.equal(c2.title, await run(`convStamp(${e.entries[1].savedAt}, ${e.entries[1].tz})`), 'el título es la fecha y hora de guardado');
    assert.equal(e.convs.length, 2);

    // ---- 4) Cuaderno EXISTENTE: lista del más reciente al más viejo; la elección se recuerda en la sesión ----
    await vista('grabacion');
    const ops = await opciones();
    assert.deepEqual(ops.map(o => o[1]), ['Cuaderno nuevo', c2.title, 'Caso ficticio P-001'], 'del más reciente al más viejo');
    const caso = e.convs.find(c => c.title === 'Caso ficticio P-001');
    assert.equal(await setSel(caso.id), caso.id);
    assert.equal((await rect('dictName')).visible, false, 'con un cuaderno existente no hay campo de nombre');
    if (!protegida) { await run(`document.getElementById('dictDest').scrollIntoView({block:'center'})`); await sleep(200); await captura('u12-selector-360-cuaderno-existente.png'); }
    await dictar('Texto inventado tres ZZ-TRES.');
    await vista('transcripcion');
    assert.match(await run(`document.getElementById('convTarget').textContent`), /se agrega a «Caso ficticio P-001»/);
    await guardar(3);
    e = await estado();
    assert.equal(e.convs.length, 2, 'no se creó otro cuaderno');
    assert.equal(e.entries.filter(x => x.cid === caso.id).length, 2);
    assert.equal(e.entries[0].text, 'Texto inventado uno ZZ-UNO.', 'la nota anterior no cambió');
    await run(`document.querySelector('[data-delta-view="grabacion"]').click()`);
    assert.equal(await run(`document.getElementById('dictDestSel').value`), caso.id, 'se recuerda la última elección durante la sesión');

    // ---- 5) Elegir DESPUÉS de dictar también vale (el texto ya está en el editor) ----
    await dictar('Texto inventado cuatro ZZ-CUATRO.');
    assert.equal(await run('document.getElementById("dictDestSel").disabled'), false);
    await setSel(c2.id);
    await vista('transcripcion');
    assert.match(await run(`document.getElementById('convTarget').textContent`), new RegExp('se agrega a «' + c2.title.replace(/[/]/g, '\\/') + '»'));
    await guardar(4);
    e = await estado();
    assert.equal(e.entries[3].cid, c2.id); assert.equal(e.convs.length, 2);

    // ---- 6) Descartar no guarda nada ----
    await vista('grabacion'); await setSel('');
    await dictar('Texto inventado cinco ZZ-CINCO.');
    await vista('transcripcion');
    await run(`document.getElementById('convDiscard').click()`); await sleep(200);
    e = await estado();
    assert.equal(e.entries.length, 4, 'descartar el borrador no guarda'); assert.equal(e.convs.length, 2);
    assert.equal(await textoPlano('ZZ-CINCO') > 0, false, modo + ': el borrador descartado no queda guardado');

    // ---- 7) Dictar DENTRO de un cuaderno: va a ese cuaderno y no hay selector (U7) ----
    await vista('transcripcion');
    await run(`convOpen(${JSON.stringify(caso.id)})`);
    assert.equal(await run('convOpenId'), caso.id);
    assert.equal((await rect('dictDestSel')).visible, false, 'dentro de un cuaderno no se muestra el selector');
    assert.equal((await rect('dictName')).visible, false);
    await dictar('Texto inventado seis ZZ-SEIS.');
    assert.match(await run(`document.getElementById('convTarget').textContent`), /se agrega a «Caso ficticio P-001»/);
    await run(`document.getElementById('save').click()`);
    for (let i = 0; i < 100 && (await estado()).entries.length < 5; i++) await sleep(50);
    e = await estado();
    assert.equal(e.entries[4].cid, caso.id); assert.equal(e.convs.length, 2);
    // Si la última elección era «Cuaderno nuevo», dictar dentro de un cuaderno tampoco la usa.
    await vista('grabacion'); await setSel('');
    await run(`convOpen(${JSON.stringify(c2.id)})`); await vista('transcripcion');
    await dictar('Texto inventado siete ZZ-SIETE.');
    await run(`document.getElementById('save').click()`);
    for (let i = 0; i < 100 && (await estado()).entries.length < 6; i++) await sleep(50);
    e = await estado();
    assert.equal(e.entries[5].cid, c2.id); assert.equal(e.convs.length, 2, 'no se creó un cuaderno nuevo');

    // ---- 8) Al abrir de nuevo la app, vuelve a «Cuaderno nuevo» ----
    await vista('grabacion'); await setSel(caso.id);
    await load(protegida);
    if (protegida) await run(`(async()=>{await vault.unlockPassword(${JSON.stringify(PA)});await vaultTakeTabLock();await vaultAfterUnlock();return 1})()`);
    await vista('grabacion');
    assert.equal(await run(`document.getElementById('dictDestSel').value`), '', modo + ': tras abrir de nuevo, «Cuaderno nuevo»');
    assert.equal(await run(`Object.keys(localStorage).filter(k=>/dict.?dest|u12/i.test(k)).length`), 0, 'la elección no se guarda en ningún lado');
    console.log('U12 · ' + modo + ' OK');
  }

  // ---- 9) Cuaderno elegido que se borra: vuelve a «Cuaderno nuevo» sin perder el borrador ----
  await reset(false);
  await dictar('Texto inventado ocho ZZ-OCHO.'); await guardar(1);
  const id1 = (await estado()).convs[0].id;
  await vista('grabacion'); await setSel(id1);
  await run(`(()=>{const d=convStore.data;convStore.save({...d,conversations:[],entries:[]});renderConv();return 1})()`);
  assert.equal(await run(`document.getElementById('dictDestSel').value`), '', 'si el cuaderno elegido ya no existe, vuelve a «Cuaderno nuevo»');
  await captura('u12-selector-360-pantalla-dictar.png');
  console.log('U12 · todo OK. Capturas en ' + shots);
} finally {
  try { ws && ws.close(); } catch (e) {}
  chrome.kill('SIGKILL'); server.close();
  try { rmSync(profile, {recursive: true, force: true}); } catch (e) {}
}
