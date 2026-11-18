// K2 de REEMPLAZO en Chrome real (sin dependencias): restaurar una copia sobre una instalación que YA tiene datos.
// Todo inventado. Cubre: cortes en cada paso con recuperación desde el respaldo previo (el corte «duro» congela lo guardado
// como si el proceso muriera), id de audio repetido, respaldo previo con exclusiones, copia de otra instalación,
// contraseña cambiada, copia hecha sin protección, autobloqueo durante el reemplazo, espacio justo e insuficiente,
// formatos 1 y 2, y audios sin cifrar que al restaurar quedan cifrados (A11).
// INDEX_HTML=<ruta> permite probar otra versión de la app (lo usan las pruebas de mutación).
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';

const profile = mkdtempSync(tmpdir() + '/dictavoz-k2r-');
const HTML = readFileSync(process.env.INDEX_HTML || new URL('../index.html', import.meta.url));
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(HTML); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = 'http://localhost:' + server.address().port;
const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank']);
const PA = 'frase actual inventada 111', PB = 'otra frase cambiada 222', PF = 'frase del archivo 333', PBK = 'respaldo previo de prueba 444';
const SAMPLE1 = readFileSync(new URL('./copia-formato-1.dictanota', import.meta.url)).toString('base64'), PASS1 = 'frase de prueba inventada 901';
const SAMPLE2 = readFileSync(new URL('./copia-formato-2.dictanota.base64', import.meta.url), 'utf8').trim(), PASS2 = 'clave-fixture-dictavoz-903';
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
  const json = async expression => JSON.parse(await run('(async()=>{' + expression + '})()'));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  await call('Page.enable'); await call('Runtime.enable');

  // ---- Biblioteca dentro de la página (se vuelve a inyectar tras cada carga) ----
  const LIB = `(() => {
    window.__dl = [];
    window.download = f => { window.__dl.push(f); };
    window.u8 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    window.blob = s => new Blob([u8(s)]);
    window.b64 = async f => { const b = new Uint8Array(await f.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
    window.nota = async t => { const el = document.getElementById('text'); el.value = t; el.dispatchEvent(new Event('input', {bubbles: true})); document.getElementById('save').click(); await new Promise(r => setTimeout(r, 50)); while (convSaving) await new Promise(r => setTimeout(r, 20)); if (vault.state === 'open') await vault.flush(); return convStore.data.entries.length; };
    window.mkAudio = async (size, fill) => {
      const db = await anDb(), hid = vault.header.id, ka = vault.audioKey, id = anNewId(), k = await anNewCek(ka, hid, id);
      const part = {mime: 'audio/mpeg', chunks: 1, bytes: size, ms: 1000, origin: 'cargado', name: 'inventado.mp3', complete: true};
      const first = {...anNewMeta(id, Date.now(), 'escribiendo'), parts: 1, bytes: size, key: k.box, sealed: await anSealDetail(ka, hid, id, {parts: [part]})};
      await anPutMeta(db, first); await anPutChunk(db, id, 0, 0, await anSealChunk(k.cek, hid, id, 0, 0, new Uint8Array(size).fill(fill)));
      await anPutMeta(db, anSetState(first, 'cerrado')); return id;
    };
    window.setAudioFill = async (id, fill) => {   // cambia el contenido de un audio ya guardado (sigue sano)
      const db = await anDb(), m = await anGetMeta(db, id), k = await anOpenCek(vault.audioKey, vault.header.id, id, m.key);
      await anPutChunk(db, id, 0, 0, await anSealChunk(k.cek ? k.cek : k, vault.header.id, id, 0, 0, new Uint8Array(m.bytes).fill(fill)));
    };
    window.notasGuardadas = () => JSON.parse(vaultStore.getItem(CONV_KEY)).entries.length;
    window.sig = async id => {   // huella del contenido descifrado del audio (necesita la protección abierta)
      const db = await anDb(), m = await anGetMeta(db, id), cek = await anOpenCek(vault.audioKey, vault.header.id, id, m.key), out = [];
      const d = await anOpenDetail(vault.audioKey, vault.header.id, id, m.sealed);
      for (let p = 0; p < d.parts.length; p++) for (let n = 0; n < d.parts[p].chunks; n++) out.push(await anPlainHash(new Blob([await anOpenChunk(cek, vault.header.id, id, p, n, await anGetChunk(db, id, p, n))])));
      return out.join(',');
    };
    window.foto = async () => {
      const ls = {}; for (const k of Object.keys(localStorage).sort()) ls[k] = localStorage.getItem(k);
      // La restauración K2 (que ya existía) escribe la cabecera sin «created», un dato informativo que la app no lee: se ignora al comparar.
      if (ls[VAULT_HEADER]) { const h = JSON.parse(ls[VAULT_HEADER]); delete h.created; ls[VAULT_HEADER] = JSON.stringify(h); }
      const db = await anDb(), metas = await anListMeta(db), keys = await anTx(db, ['chunks'], 'readonly', t => t.objectStore('chunks').getAllKeys()), vals = await anTx(db, ['chunks'], 'readonly', t => t.objectStore('chunks').getAll());
      const chunks = []; for (let i = 0; i < keys.length; i++) chunks.push([keys[i], await anPlainHash(vals[i])]);
      return JSON.stringify({ls, metas, chunks, legacy: await k2LegacyInfo()});
    };
    window.dump = async () => {
      const db = await anDb(), ls = {}; for (const k of Object.keys(localStorage)) ls[k] = localStorage.getItem(k);
      const metas = await anListMeta(db), keys = await anTx(db, ['chunks'], 'readonly', t => t.objectStore('chunks').getAllKeys()), vals = await anTx(db, ['chunks'], 'readonly', t => t.objectStore('chunks').getAll());
      const chunks = []; for (let i = 0; i < keys.length; i++) chunks.push([keys[i], await b64(vals[i])]);
      const lm = await idbDo(['meta'], 'readonly', t => t.objectStore('meta').getAll()), lc = await idbDo(['chunks'], 'readonly', t => t.objectStore('chunks').getAll());
      const lchunks = []; for (const c of lc) lchunks.push({k: c.k, b: await b64(c.b)});
      return {ls, metas, chunks, legacy: {metas: lm, chunks: lchunks}};
    };
    window.load = async d => {
      localStorage.clear(); for (const [k, v] of Object.entries(d.ls)) localStorage.setItem(k, v);
      const db = await anDb(); await anTx(db, ['meta', 'chunks'], 'readwrite', t => { t.objectStore('meta').clear(); t.objectStore('chunks').clear(); }); await audioClear();
      for (const m of d.metas) await anPutMeta(db, m);
      for (const [k, b] of d.chunks) await anPutChunk(db, k[0], k[1], k[2], blob(b));
      for (const m of d.legacy.metas) await idbDo(['meta'], 'readwrite', t => t.objectStore('meta').put(m));
      for (const c of d.legacy.chunks) await idbDo(['chunks'], 'readwrite', t => t.objectStore('chunks').put({k: c.k, b: blob(c.b)}));
      return true;
    };
    // Corte «duro»: la N-ésima escritura falla y TODAS las siguientes también (como si el proceso muriera): lo guardado queda congelado.
    window.arm = n => {
      window.__ops = []; window.__n = 0; window.__cut = n; window.__dead = false;
      if (!window.__orig) window.__orig = {set: Storage.prototype.setItem, rem: Storage.prototype.removeItem, tx: window.anTx, idb: window.idbDo};
      const short = k => k === VAULT_HEADER ? 'cabecera' : k === K2R_JOURNAL ? 'diarioReemplazo' : k === K2_JOURNAL ? 'diarioK2' : vault.records.owns(k) ? 'registro' : (k === CKEY || k === GKEY) ? 'config' : 'otra';
      const gate = label => { if (window.__dead) throw new Error('muerto'); window.__n++; window.__ops.push(label); if (window.__cut === window.__n) { window.__dead = true; throw new Error('corte'); } };
      Storage.prototype.setItem = function (k, v) { if (this === localStorage) gate('set:' + short(k)); return window.__orig.set.call(this, k, v); };
      Storage.prototype.removeItem = function (k) { if (this === localStorage) gate('rem:' + short(k)); return window.__orig.rem.call(this, k); };
      window.anTx = function (db, stores, mode, fn) { if (mode === 'readwrite') { try { gate('idb:' + stores.join('+')); } catch (e) { return Promise.reject(e); } } return window.__orig.tx(db, stores, mode, fn); };
      window.idbDo = function (stores, mode, fn) { if (mode === 'readwrite') { try { gate('legado'); } catch (e) { return Promise.reject(e); } } return window.__orig.idb(stores, mode, fn); };
    };
    window.mkUi = (o = {}) => ({
      progress: () => {},
      confirm: async (step, info, name) => { (window.__confirms = window.__confirms || []).push({step, info, name}); if (o.onConfirm) await o.onConfirm(step, info, name); return o.deny !== step; },
      saveBackup: async f => { window.__backup = f; sessionStorage.setItem('__bk', await b64(f)); },
      backupPassword: async () => ${JSON.stringify(PBK)}
    });
    return true;
  })()`;
  const load = async () => {
    await sleep(400);   // la página anterior suelta su candado de pestaña al descargarse
    await call('Page.navigate', {url: ORIGIN + '/'});
    for (let i = 0; i < 150; i++) { try { if (await run('document.readyState==="complete" && typeof k2Replace==="function" && typeof convStore==="object"')) break; } catch (e) {} await sleep(100); if (i === 149) throw Error('la app no inició'); }
    await run(LIB);
  };
  const reset = async () => { await call('Page.navigate', {url: 'about:blank'}); await sleep(400); await call('Storage.clearDataForOrigin', {origin: ORIGIN, storageTypes: 'all'}); await load(); };
  const unlock = pw => run(`(async()=>{await vault.unlockPassword(${JSON.stringify(pw)});await vaultTakeTabLock();await vaultAfterUnlock();return vault.state})()`);
  const rejects = expr => run(`(async()=>{try{await (${expr});return ""}catch(e){return e.message||String(e)}})()`);

  // ===== Instalación A: notas, bóveda, un audio cifrado; copia propia =====
  async function sembrarA() {
    await reset();
    assert.equal(await run('vault.state'), 'off');
    assert.equal(await run(`nota('Persona Inventada Uno: primera nota X-901')`), 1);
    await run(`(async()=>{const r=await vault.enable(${JSON.stringify(PA)});r.dek.fill(0);await vaultTakeTabLock();vaultRefreshPanel();return 1})()`);
    assert.equal(await run(`nota('Persona Inventada Uno: segunda nota X-902')`), 2);
    await run(`vault.store.setItem('notasvoz.gamma.dict.v1','pasiente => paciente');vault.flush()`);
    const X = await run(`mkAudio(2500, 7)`);
    const copia = await run(`(async()=>{const m=await copiaMake(null,{completa:true});return b64(m.file)})()`);
    return {X, copia};
  }
  const copiaBlob = c => `blob(${JSON.stringify(c)})`;
  const replace = (c, pw, ui = 'mkUi()') => json(`let r="",res=null;try{res=await k2Replace(${copiaBlob(c)},${JSON.stringify(pw)},${ui});}catch(e){r=e.message||String(e);return JSON.stringify({err:r,cancelled:!!e.cancelled,journal:localStorage.getItem(K2R_JOURNAL),otherTab:vault.otherTab,active:k2ReplaceActive})}return JSON.stringify({ok:true,summary:res.summary&&{id:res.summary.id,notas:res.summary.notas,audios:res.summary.audios},info:res.info,journal:localStorage.getItem(K2R_JOURNAL),active:k2ReplaceActive})`);

  // ===== 1) Recorrido completo: notas más nuevas, audio repetido con otro contenido, audio nuevo, audio antiguo =====
  {
    const {X, copia} = await sembrarA();
    const sigCopia = await run(`sig(${JSON.stringify(X)})`);
    await run(`new Promise(r => setTimeout(r, 20))`);
    await run(`nota('Persona Inventada Uno: tercera nota, posterior a la copia X-903')`);
    await run(`setAudioFill(${JSON.stringify(X)}, 8)`);
    const Y = await run(`mkAudio(1800, 9)`);
    await run(`(async()=>{await audioPutChunk('sid-antiguo',0,new Blob(['audio antiguo inventado']));await audioPutMeta({id:'last',sid:'sid-antiguo',mime:'audio/webm',size:23});return 1})()`);
    const sigActualX = await run(`sig(${JSON.stringify(X)})`);
    assert.notEqual(sigActualX, sigCopia, 'el audio repetido tiene otro contenido en el estado actual');
    const antes = await run('foto()');
    // Se mira todo lo que pasa en la segunda confirmación: marca, autobloqueo, otras copias.
    const r = await replace(copia, PA, `mkUi({onConfirm: async step => { if (step !== 2) return;
      window.__vigilado = {active: k2ReplaceActive, busy: vaultBusy(), busyN: copiaBusyN, locked: await vaultLockNow(true), state: vault.state};
      window.__vigilado.copia = await copiaCreate(null); window.__vigilado.msgCopia = document.getElementById('copiaMsg').textContent;
      window.__vigilado.check = await copiaCheck(new File([new Uint8Array(4)], 'x.dictanota'));
      window.__vigilado.otro = await k2Replace(${copiaBlob(copia)}, ${JSON.stringify(PA)}, mkUi()).then(() => '', e => e.message);
      window.__vigilado.diario = localStorage.getItem(K2R_JOURNAL);
    }})`);
    assert.equal(r.ok, true, JSON.stringify(r));
    const v = await json(`return JSON.stringify(window.__vigilado)`);
    assert.deepEqual([v.active, v.busy, v.busyN, v.locked, v.state], [true, true, 0, false, 'open'], 'la marca bloquea el autobloqueo y NO usa copiaBusyN');
    assert.equal(v.copia, null, 'no se crea otra copia durante el reemplazo'); assert.match(v.msgCopia, /reemplazar/);
    assert.equal(v.check, null, 'tampoco se comprueba otra copia');
    assert.match(v.otro, /Ya hay un reemplazo en curso/);
    assert.match(v.diario, /"phase":"respaldo"/, 'hasta la confirmación final no se borró nada: el diario dice «respaldo»');
    const i = r.info;
    assert.deepEqual([i.notasActuales, i.notasNuevas, i.notasSinCopia, i.notasPerdidas], [3, 1, 1, 1]);
    assert.deepEqual([i.audiosActuales, i.audiosSinCopia, i.audiosRepetidos, i.audioAntiguo, i.otraInstalacion], [2, 1, 1, 1, false]);
    assert.equal(r.journal, null, 'al terminar no queda diario ni marca');
    assert.equal(await run('k2ReplaceActive'), false);
    const confirms = await json(`return JSON.stringify(window.__confirms.map(c => c.step))`);
    assert.deepEqual(confirms, [1, 2], 'doble confirmación');
    // El respaldo previo es completo, está comprobado y lleva lo que había ANTES (3 notas, los 2 audios, con el contenido modificado).
    const bk = await json(`const f=window.__backup;const r=await copiaVerify(f,h=>copiaOpenWithSecret(h,${JSON.stringify(PA)}));return JSON.stringify({notas:r.notas,audios:r.audios,contenido:r.contenido})`);
    assert.deepEqual(bk, {notas: 3, audios: 2, contenido: 'completa'});
    // Resultado: la copia, entera (y nada de lo que no estaba en ella).
    await load(); await unlock(PA);
    assert.equal(await run('notasGuardadas()'), 2, 'las notas son las de la copia');
    assert.equal(await run(`sig(${JSON.stringify(X)})`), sigCopia, 'el audio repetido quedó con el contenido de la copia');
    assert.deepEqual(await json(`const l=await anListMeta(await anDb());return JSON.stringify(l.map(m=>m.id))`), [X], 'el audio nuevo no sobrevive');
    assert.equal((await json(`return JSON.stringify(await k2LegacyInfo())`)).count, 0, 'el audio antiguo se borró');
    assert.equal(await run(`localStorage.getItem(K2R_JOURNAL)`), null);
    assert.notEqual(await run('foto()'), antes);
    console.log('1) recorrido completo OK');

  }

  // ===== 2) Cortes en cada paso, con recuperación desde el respaldo previo =====
  // Corrida en seco para conocer la secuencia de escrituras y elegir un corte por cada tipo de paso.
  {
    const {X, copia} = await sembrarA();
    await run(`nota('Persona Inventada Uno: nota posterior a la copia X-903')`);
    await run(`setAudioFill(${JSON.stringify(X)}, 8)`);
    const snapshot = await json(`return JSON.stringify(await dump())`);
    const original = await run('foto()');
    const sigOriginal = await run(`sig(${JSON.stringify(X)})`);
    const info = async n => { await load(); await run(`load(${JSON.stringify(snapshot)})`); await load(); await unlock(PA); await run(`arm(${n})`); };
    // En seco (sin corte): secuencia completa de escrituras.
    await info(0);
    const seco = await replace(copia, PA, 'mkUi()'); assert.equal(seco.ok, true, JSON.stringify(seco));
    const ops = await json(`return JSON.stringify(window.__ops)`);
    assert.ok(ops.length > 15, 'secuencia de escrituras: ' + ops.length);
    console.log('   escrituras del reemplazo: ' + ops.join(' '));
    const elegidos = new Set(); const vistos = new Set();
    ops.forEach((o, k) => { if (!vistos.has(o)) { vistos.add(o); elegidos.add(k + 1); } });   // la primera de cada tipo
    ops.forEach((o, k) => { if (o === 'set:diarioReemplazo') elegidos.add(k + 1); });   // los tres cambios de estado del diario
    for (const k of [ops.length - 3, ops.length - 2, ops.length - 1, ops.length]) elegidos.add(k);   // y las últimas (cerca de la confirmación)
    ops.forEach((o, k) => { if (o === 'rem:cabecera' || o === 'set:cabecera') elegidos.add(k + 1); });
    const cortes = [...elegidos].filter(n => n >= 1 && n <= ops.length).sort((a, b) => a - b);
    assert.ok(cortes.length >= 10, 'cortes elegidos: ' + cortes.length);
    const resultados = [];
    for (const n of cortes) {
      await info(n);
      await run(`sessionStorage.removeItem('__bk')`);
      const r = await replace(copia, PA, 'mkUi()');
      // Los dos últimos pasos (quitar los diarios, ya con la cabecera escrita) los ignora el código a propósito: la restauración ya está confirmada.
      assert.ok(r.err || /^rem:diario/.test(ops[n - 1]), 'el corte ' + n + ' (' + ops[n - 1] + ') tiene que interrumpir el reemplazo');
      // «Reiniciar»: lo guardado queda congelado tal como estaba en el corte.
      await load();
      await sleep(300);
      const estado = await json(`return JSON.stringify({diario:localStorage.getItem(K2R_JOURNAL),cabecera:!!localStorage.getItem(VAULT_HEADER),k2:localStorage.getItem(K2_JOURNAL),backup:sessionStorage.getItem('__bk')})`);
      let clase;
      if (!estado.diario && estado.cabecera) {   // nada se había borrado, o la restauración ya estaba confirmada
        await unlock(PA).catch(() => null);
        const f = await run('foto()');
        if (f === original) clase = 'intacto';
        else clase = 'copia';
      } else {
        // Borrado empezado o hecho: se recupera con el respaldo previo, que se descargó ANTES de borrar.
        assert.ok(estado.backup, 'el respaldo previo existía antes de borrar (corte ' + n + ': ' + ops[n - 1] + ')');
        const rec = await json(`let e="";try{await k2Replace(blob(sessionStorage.getItem('__bk')),${JSON.stringify(PA)},mkUi())}catch(x){e=x.message}return JSON.stringify({e,diario:localStorage.getItem(K2R_JOURNAL)})`);
        assert.equal(rec.e, '', 'recuperación del corte ' + n + ' (' + ops[n - 1] + '): ' + rec.e);
        await load(); await unlock(PA);
        assert.equal(await run('foto()'), original, 'tras recuperar desde el respaldo previo queda EXACTAMENTE lo que había (corte ' + n + ': ' + ops[n - 1] + ')');
        assert.equal(await run(`sig(${JSON.stringify(X)})`), sigOriginal);
        clase = 'recuperado';
      }
      if (clase === 'copia') {
        assert.equal(await run('notasGuardadas()'), 2, 'corte ' + n + ': la restauración estaba confirmada y quedó la copia entera');
        assert.equal(await run(`localStorage.getItem(K2R_JOURNAL)`), null);
      } else if (clase === 'intacto') assert.equal(await run(`localStorage.getItem(K2R_JOURNAL)`), null, 'sin diario residual (corte ' + n + ')');
      resultados.push(n + ':' + ops[n - 1] + '→' + clase);
    }
    const clases = new Set(resultados.map(x => x.split('→')[1]));
    assert.ok(clases.has('intacto') && clases.has('recuperado'), 'hubo cortes antes y después de borrar: ' + resultados.join(' | '));
    console.log('2) cortes OK (' + cortes.length + '): ' + resultados.join(' | '));
  }

  // ===== 3) Respaldo previo con exclusiones: se rechaza antes de borrar nada =====
  {
    const {X, copia} = await sembrarA();
    const base = await run('foto()');
    const intacto = async (why, rx) => {
      const r = await replace(copia, PA);
      assert.match(r.err || '', rx, why + ': ' + JSON.stringify(r));
      assert.equal(r.journal, null, why + ': sin diario'); assert.equal(r.otherTab, false, why + ': esta pestaña vuelve a escribir'); assert.equal(r.active, false);
      assert.equal(await run('foto()'), base, why + ': no se tocó nada');
      assert.equal(await json(`return JSON.stringify((window.__confirms||[]).map(c=>c.step))`).then(x => x.includes(2)), false, why + ': no llegó a la última confirmación');
    };
    // a) audio dañado (un fragmento alterado): el respaldo saldría sin ese audio.
    const Z = await run(`mkAudio(1500, 3)`);
    await run(`(async()=>{const db=await anDb();await anPutChunk(db,${JSON.stringify(Z)},0,0,new Blob([new Uint8Array(1528).fill(1)]));return 1})()`);
    const baseZ = await run('foto()');
    const r = await replace(copia, PA);
    assert.match(r.err || '', /INCOMPLETO/, 'audio dañado: ' + JSON.stringify(r));
    assert.equal(r.journal, null); assert.equal(r.otherTab, false);
    assert.equal(await run('foto()'), baseZ, 'audio dañado: no se tocó nada');
    assert.equal(await json(`return JSON.stringify((window.__confirms||[]).map(c=>c.step))`).then(x => x.includes(2)), false);
    // b) un dato apartado por dañado: el respaldo no puede incluirlo.
    await run(`(async()=>{const db=await anDb();await anDelete(db,${JSON.stringify(Z)});vault.records.quarantine('notas','registro dañado inventado');return 1})()`);
    const baseQ = await run('foto()');
    const q = await replace(copia, PA);
    assert.match(q.err || '', /INCOMPLETO[\s\S]*dañados o apartados/, JSON.stringify(q));
    assert.equal(await run('foto()'), baseQ, 'dato apartado: no se tocó nada');
    void X; void intacto; void base;
    // c) audio sin cifrar (la bóveda apagada no puede cifrarlo ni el formato 1 llevarlo): se rechaza.
    await reset();
    await run(`nota('Persona Inventada Uno: nota sin protección X-901')`);
    await run(`(async()=>{const db=await anDb();await anPlainStageFile(db,new File([new Uint8Array(2000).fill(4)],'tono.wav',{type:'audio/wav'}),1000);return 1})()`);
    const baseP = await run('foto()');
    const p = await replace(SAMPLE1, PASS1);
    assert.match(p.err || '', /INCOMPLETO[\s\S]*sin cifrar/, JSON.stringify(p));
    assert.equal(p.journal, null); assert.equal(await run('foto()'), baseP, 'audio sin cifrar: no se tocó nada');
    console.log('3) respaldo previo con exclusiones rechazado OK');
  }

  // ===== 4) Copia de OTRA instalación (formato 1), contraseña cambiada y copia hecha con la protección apagada =====
  {
    await sembrarA();
    const r = await replace(SAMPLE1, PASS1);
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(r.info.otraInstalacion, true, 'avisa que viene de otra instalación');
    assert.equal(r.info.copiaFormato, 1);
    assert.match(await run(`k2ReplaceText(${JSON.stringify(r.info)})`), /OTRA instalación[\s\S]*contraseña y el código de recuperación de la COPIA/);
    await load(); assert.equal(await run('vault.state'), 'locked');
    assert.match(await rejects(`vault.unlockPassword(${JSON.stringify(PA)})`), /.+/, 'la contraseña anterior ya no sirve');
    await unlock(PASS1);
    assert.equal(await run('notasGuardadas()'), 2);
    assert.equal((await json(`return JSON.stringify(await anListMeta(await anDb()))`)).length, 1);
    console.log('4a) otra instalación OK');
  }
  {
    // Contraseña cambiada después de la copia: se aplica la de la COPIA.
    const {copia} = await sembrarA();
    await run(`vault.changePassword(${JSON.stringify(PA)},${JSON.stringify(PB)})`);
    const r = await replace(copia, PA, `mkUi()`);
    assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(r.info.otraInstalacion, false);
    await load();
    assert.match(await rejects(`vault.unlockPassword(${JSON.stringify(PB)})`), /.+/, 'la contraseña nueva de ahora deja de servir');
    assert.equal(await unlock(PA), 'open', 'sirve la contraseña con la que se hizo la copia');
    // El respaldo previo se abre con la contraseña de ANTES del reemplazo (PB).
    const bk = await run(`copiaVerify(blob(sessionStorage.getItem('__bk')),h=>copiaOpenWithSecret(h,${JSON.stringify(PB)})).then(r=>r.notas)`);
    assert.equal(bk, 2);
    console.log('4b) contraseña cambiada OK');
  }
  {
    // Copia hecha con la protección apagada (contraseña elegida para el archivo); ahora la instalación tiene protección.
    await reset();
    await run(`nota('Persona Inventada Uno: nota sin protección X-901')`);
    const copia = await run(`(async()=>{const m=await copiaMake(${JSON.stringify(PF)},{completa:true});return b64(m.file)})()`);
    await run(`(async()=>{const r=await vault.enable(${JSON.stringify(PA)});r.dek.fill(0);await vaultTakeTabLock();return 1})()`);
    await run(`nota('Persona Inventada Uno: nota posterior, ya con protección X-902')`);
    const r = await replace(copia, PF);
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(r.info.otraInstalacion, true, 'otro identificador: la copia tiene su propia cabecera');
    await load();
    assert.match(await rejects(`vault.unlockPassword(${JSON.stringify(PA)})`), /.+/);
    await unlock(PF);
    assert.equal(await run('notasGuardadas()'), 1, 'quedó la nota de la copia sin protección');
    console.log('4c) copia hecha sin protección OK');
  }

  // ===== 5) Espacio: justo alcanza, uno menos no =====
  {
    const {copia} = await sembrarA();
    const base = await run('foto()');
    const medidas = await json(`const f=${copiaBlob(copia)};return JSON.stringify({need:Math.ceil(f.size*1.1)+262144,freed:await k2CurrentBytes(),usage:1000000})`);
    const estimar = quota => run(`navigator.storage.estimate=async()=>({quota:${quota},usage:${medidas.usage}});true`);
    const quotaJusto = medidas.need - medidas.freed + medidas.usage;
    await estimar(quotaJusto - 1);
    const poco = await replace(copia, PA);
    assert.match(poco.err || '', /No hay espacio suficiente/, JSON.stringify(poco));
    assert.equal(poco.journal, null); assert.equal(await run('foto()'), base, 'sin espacio: no se tocó nada');
    assert.equal(await json(`return JSON.stringify((window.__confirms||[]).length)`), 0, 'sin espacio: ni siquiera se pregunta');
    await estimar(quotaJusto);
    const justo = await replace(copia, PA);
    assert.equal(justo.ok, true, 'con el espacio justo se restaura: ' + JSON.stringify(justo));
    const sin = await json(`navigator.storage.estimate=async()=>({});return JSON.stringify(k2SpaceCheck({quota:undefined,usage:1,freed:1,need:1}))`);
    assert.equal(sin.ok, false, 'si no se puede medir, no se sigue');
    console.log('5) espacio OK');
  }

  // ===== 6) Formato 2 con audio sin cifrar: se restaura CIFRADO (A11); nunca se escribe en claro =====
  {
    await sembrarA();
    await run(`window.__puestos = []; const o = anPutChunk; window.anPutChunk = function (db, id, part, n, blob) { window.__puestos.push({id, size: blob.size}); return o.call(this, db, id, part, n, blob); }; true`);
    const plan = await json(`const f=blob(${JSON.stringify(SAMPLE2)});const open=h=>copiaOpenWithSecret(h,${JSON.stringify(PASS2)});const v=await copia2Verify(f,open);const {key}=await open(await k2Header(f));const p=await k2ReadPlan(f,v,key);return JSON.stringify({claro:v.claro,formato:v.formato,audios:p.audios.map(m=>({id:m.id,modo:m.mode,partes:m.plain.parts.map(x=>({bytes:x.bytes,chunks:x.chunks,hashes:x.hashes}))}))})`);
    assert.equal(plan.formato, 2); assert.ok(plan.claro >= 1, 'la copia de ejemplo trae audio sin cifrar');
    const r = await replace(SAMPLE2, PASS2);
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(r.info.audiosSinCifrarEnCopia, plan.claro);
    assert.match(await run(`k2ReplaceText(${JSON.stringify(r.info)})`), /se guardan CIFRADOS/);
    await load(); await unlock(PASS2);
    const dest = await json(`const db=await anDb(),out=[];for(const m of await anListMeta(db)){const h=await anAudioHealth(db,vault.audioKey,vault.header.id,m.id);const d=await anOpenDetail(vault.audioKey,vault.header.id,m.id,m.sealed),cek=await anOpenCek(vault.audioKey,vault.header.id,m.id,m.key),hs=[],sizes=[];for(let p=0;p<d.parts.length;p++)for(let n=0;n<d.parts[p].chunks;n++){const b=await anGetChunk(db,m.id,p,n);sizes.push(b.size);hs.push(await anPlainHash(new Blob([await anOpenChunk(cek,vault.header.id,m.id,p,n,b)])))}out.push({id:m.id,plain:anIsPlainMeta(m),modo:m.mode||null,sano:h.ok,key:!!m.key,sealed:!!m.sealed,hashes:hs,sizes})}return JSON.stringify(out)`);
    assert.equal(dest.length, plan.audios.length);
    for (const a of dest) {
      const o = plan.audios.find(x => x.id === a.id); assert.ok(o);
      assert.deepEqual([a.plain, a.modo, a.sano, a.key, a.sealed], [false, null, true, true, true], 'el audio quedó cifrado y sano');
      assert.deepEqual(a.hashes, o.partes.flatMap(x => x.hashes), 'el contenido es el mismo que el original en claro');
      assert.deepEqual(a.sizes, o.partes.flatMap(x => Array.from({length: x.chunks}, (_, n) => (n === x.chunks - 1 ? x.bytes - 1048576 * (x.chunks - 1) : 1048576) + 28)), 'cada fragmento guardado es el original + IV y etiqueta: no es el original');
    }
    console.log('6) formato 2 / audio sin cifrar → cifrado OK');
  }

  // ===== 7) K2 para instalación vacía con la copia formato 2 (mismo motor): ahora restaura y cifra =====
  {
    await reset();
    assert.equal(await run('k2StorageEmpty()'), true, await run(`JSON.stringify({keys:Object.keys(localStorage),state:vault.state,legacy:0})`) + await json(`return JSON.stringify({m:(await anListMeta(await anDb())).length,l:await k2LegacyInfo()})`));
    const r = await json(`const res=await k2RestoreEmpty(blob(${JSON.stringify(SAMPLE2)}),${JSON.stringify(PASS2)});return JSON.stringify({f:res.formato,a:res.audios})`);
    assert.equal(r.f, 2);
    const claros = await json(`const l=await anListMeta(await anDb());return JSON.stringify(l.filter(anIsPlainMeta).length)`);
    assert.equal(claros, 0, 'ningún audio en claro queda guardado');
    console.log('7) instalación vacía con formato 2 OK');
  }

  // ===== 8) Deshacer distingue lo que creó el lote de lo que ya existía; un id repetido se rechaza antes de escribir =====
  {
    await reset();
    const res = await json(`const db=await anDb(),t=Date.now();
      const mk=id=>({...anNewMeta(id,t,'importando')});
      for(const id of ['id-previo','id-del-lote']){await anPutMeta(db,mk(id));await anPutChunk(db,id,0,0,new Blob(['x '+id]));}
      localStorage.setItem(K2_JOURNAL,JSON.stringify({version:3,audios:[{id:'id-previo',createdAt:t,bytes:0},{id:'id-del-lote',createdAt:t,bytes:0}],names:[],preexisting:['id-previo']}));
      const limpio=await k2Rollback();
      return JSON.stringify({limpio,previo:!!(await anGetMeta(db,'id-previo')),chunkPrevio:await anCountChunks(db,'id-previo'),lote:!!(await anGetMeta(db,'id-del-lote')),diario:localStorage.getItem(K2_JOURNAL)})`);
    assert.deepEqual(res, {limpio: true, previo: true, chunkPrevio: 1, lote: false, diario: null}, 'el id que ya existía no se borra; el del lote sí');
    const bad = await rejects(`(async()=>{localStorage.setItem(K2_JOURNAL,JSON.stringify({version:3,audios:[],names:[]}));try{await k2Rollback()}finally{localStorage.removeItem(K2_JOURNAL)}})()`);
    assert.match(bad, /desconocido o alterado/, 'un diario v3 sin la lista de ids previos se rechaza');
    // Id repetido: la copia propia lleva el audio X y ya hay un audio X guardado → no se escribe NADA.
    const {X, copia} = await sembrarA();
    const base = await run('foto()');
    const e = await rejects(`(async()=>{k2StorageEmpty=async()=>true;vault.otherTab=true;return k2RestoreLocked(${copiaBlob(copia)},${JSON.stringify(PA)})})()`);
    assert.match(e, /repite el identificador/, e);
    assert.equal(await run('foto()'), base, 'no se escribió nada');
    void X;
    console.log('8) deshacer / id repetido OK');
  }

  // ===== 9) Reanudar: diario «borrando» tras un reinicio =====
  {
    const {copia} = await sembrarA();
    await json(`localStorage.setItem(K2R_JOURNAL,JSON.stringify({version:1,phase:'borrando',started:Date.now(),previo:{name:'respaldo-previo.dictanota',bytes:1}}));return 1`);
    await load();
    assert.match(await run(`document.getElementById('copiaMsg').textContent`), /Quedó un reemplazo a medias/);
    assert.equal(await run(`localStorage.getItem(K2R_JOURNAL) !== null`), true, 'el diario no se pierde al abrir');
    assert.equal(await run(`copiaCreate(null)`).catch(() => null), null, 'con un reemplazo a medias tampoco se crean copias');
    const r = await replace(copia, PA, `mkUi({deny: 'retomar'})`);
    assert.equal(r.cancelled, true, JSON.stringify(r)); assert.ok(r.journal, 'cancelar al retomar conserva el diario');
    const ok = await replace(copia, PA, `mkUi()`);
    assert.equal(ok.ok, true, JSON.stringify(ok)); assert.equal(ok.journal, null);
    console.log('9) reanudación OK');
  }
  console.log('K2 de reemplazo: todo OK');
} finally {
  try { ws && ws.close(); } catch (e) {}
  chrome.kill('SIGKILL'); server.close();
  try { rmSync(profile, {recursive: true, force: true}); } catch (e) {}
}
