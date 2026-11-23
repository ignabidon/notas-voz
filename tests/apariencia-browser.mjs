// U5 · Estética «Clínica serena» pulida + modo nocturno opcional. Chrome real a 360 px de ancho, sin dependencias (CDP nativo).
// Solo datos inventados. CAPTURA_DIR=<carpeta> guarda las capturas de 360 px (por defecto, una carpeta temporal);
// TABLA_CONTRASTES=<archivo.md> escribe la tabla de contrastes medidos (la que va en la descripción del PR).
// Cubre: elegir Clara, Nocturna y Automática (emulando preferencia oscura y clara del sistema) cambia los colores; la elección sobrevive a
// recargar; no hay destello claro al abrir en nocturno; meta color-scheme y theme-color siguen a la apariencia activa; contraste de 4,5:1 o más
// (texto) y 3:1 o más (bordes de controles) en Dictar, Cuadernos, Ajustes, la pantalla de bloqueo, avisos y diálogos, en las dos apariencias;
// sin desplazamiento horizontal; lo tocable sigue midiendo 48 px o más; no cambia nada de lo que se exporta.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync, mkdtempSync, rmSync, writeFileSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';

const profile = mkdtempSync(tmpdir() + '/dictavoz-u5-');
const shots = process.env.CAPTURA_DIR || mkdtempSync(tmpdir() + '/dictavoz-u5-capturas-');
mkdirSync(shots, {recursive: true});
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(readFileSync(process.env.INDEX_HTML || new URL('../index.html', import.meta.url))); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ORIGIN = 'http://localhost:' + server.address().port;
const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank']);
const PA = 'frase inventada de prueba 111';
const BG = {light: 'rgb(247, 242, 234)', dark: 'rgb(40, 34, 41)'};
const TC = {light: '#F7F2EA', dark: '#282229'};
const tabla = [];   // filas de la tabla de contrastes: [apariencia, pantalla, par, contraste]
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
  const sistema = v => call('Emulation.setEmulatedMedia', {features: [{name: 'prefers-color-scheme', value: v}]});

  // Notas ficticias en formato viejo (la app las migra a cuadernos).
  const viejas = [
    {id: 'v1', title: 'Paciente ficticio P-001', text: 'Sesión del lunes, texto inventado para la prueba de apariencia.', ts: Date.UTC(2026, 10, 9, 13, 0), tags: ['prueba']},
    {id: 'v2', title: 'Cuaderno de ejemplo', text: 'Otra nota inventada, sin datos reales.', ts: Date.UTC(2026, 10, 10, 13, 0), tags: []},
    {id: 'v3', title: 'Lista de tareas inventada', text: 'Comprar yerba ficticia. Llamar al taller inventado.', ts: Date.UTC(2026, 10, 11, 13, 0), tags: []}];
  const load = async (bloqueada = false, hash = '') => {
    await sleep(300);
    await call('Page.navigate', {url: ORIGIN + '/' + hash});
    for (let i = 0; i < 150; i++) { try { if (await run('document.readyState==="complete" && typeof convInit==="function" && typeof ajShow==="function" && (' + bloqueada + ' || !!convStore.data)')) return; } catch (e) {} await sleep(100); }
    throw Error('la app no cargó');
  };
  const reset = async (cfg, conDatos = true) => {
    await call('Page.navigate', {url: 'about:blank'}); await sleep(400);
    await call('Storage.clearDataForOrigin', {origin: ORIGIN, storageTypes: 'all'});
    await call('Page.navigate', {url: ORIGIN + '/'}); await sleep(500);
    await run(`localStorage.clear(); ${cfg ? `localStorage.setItem('notasvoz.gamma.cfg.v1', ${JSON.stringify(JSON.stringify(cfg))});` : ''} ${conDatos ? `localStorage.setItem('notasvoz.gamma.v1', ${JSON.stringify(JSON.stringify(viejas))});` : ''} 1`);
    await load();
  };
  const ir = v => run(`document.querySelector('[data-delta-view="${v}"]').click(); document.body.dataset.view`);
  const estado = () => run(`({tema: document.documentElement.dataset.theme, pref: document.documentElement.dataset.themePref, esquema: document.querySelector('meta[name="color-scheme"]').content, color: document.querySelector('meta[name="theme-color"]').content, css: getComputedStyle(document.documentElement).colorScheme, fondo: getComputedStyle(document.body).backgroundColor, cfg: JSON.parse(localStorage.getItem(CKEY) || '{}').theme, radio: (document.querySelector('input[name=theme]:checked') || {}).value})`);
  const elegir = async v => { await ir('ajustes'); await run(`document.getElementById('ajHome') && ajShow && 1`); await run(`document.getElementById('theme-${v}').click()`); await sleep(120); };

  // Medición en la página: contraste de un par texto/fondo con composición de transparencias; ignora fondos con imagen o degradado.
  const MEDIR = `(() => {
    if (!document.getElementById('sin-transiciones')) { const st = document.createElement('style'); st.id = 'sin-transiciones'; st.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}'; document.head.append(st); }   // se mide el color final, no a mitad de una transición
    const parse = c => { const m = c.match(/[\\d.]+/g).map(Number); return {r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1}; };
    const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
    const lum = c => .2126 * lin(c.r) + .7152 * lin(c.g) + .0722 * lin(c.b);
    const over = (f, b) => ({r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1});
    const ratio = (x, y) => { const a = lum(x), b = lum(y); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
    const fondo = el => { const capas = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none') return null; capas.push(parse(cs.backgroundColor)); if (capas[capas.length - 1].a === 1) break; }
      let base = {r: 255, g: 255, b: 255, a: 1}; for (let i = capas.length - 1; i >= 0; i--) base = over(capas[i], base); return base; };
    const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[hidden]') && cs.opacity !== '0'; };
    const nombre = e => (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).slice(0, 2).join('.') : '') || e.tagName.toLowerCase();
    const texto = e => (e.textContent || e.value || e.placeholder || '').trim().replace(/\\s+/g, ' ').slice(0, 28);
    window.__medir = (raiz, selector) => {
      const out = [];
      for (const e of document.querySelectorAll(selector.split(',').map(x => raiz + ' ' + x.trim()).join(','))) {
        if (!vis(e)) continue; const t = texto(e); if (!t) continue;
        const cs = getComputedStyle(e), bg = fondo(e); if (!bg) { out.push({n: nombre(e), t, salta: true}); continue; }
        const fg = over(parse(cs.color), bg);
        out.push({n: nombre(e), t, c: +ratio(fg, bg).toFixed(2), fg: cs.color, bg: 'rgb(' + [bg.r, bg.g, bg.b].map(Math.round).join(', ') + ')'});
      }
      return out;
    };
    // Bordes de controles: el límite del control contra lo que lo rodea (por su fondo o por su borde), 3:1 como mínimo.
    window.__bordes = (raiz, selector) => {
      const out = [];
      for (const e of document.querySelectorAll(selector.split(',').map(x => raiz + ' ' + x.trim()).join(','))) {
        if (!vis(e) || e.disabled) continue; const cs = getComputedStyle(e), pad = e.parentElement ? fondo(e.parentElement) : null, propio = fondo(e); if (!pad || !propio) continue;   // un control desactivado queda fuera de la regla de 3:1
        const bw = parseFloat(cs.borderTopWidth), conBorde = bw > 0 && cs.borderTopStyle !== 'none';
        const porFondo = ratio(propio, pad), porBorde = conBorde ? ratio(over(parse(cs.borderTopColor), pad), pad) : 0;
        out.push({n: nombre(e), t: texto(e), c: +Math.max(porFondo, porBorde).toFixed(2)});
      }
      return out;
    };
    // Todo lo tocable de la pantalla visible mide 48 px o más de alto.
    window.__tactil = raiz => [...document.querySelectorAll(raiz + ' button, ' + raiz + ' select, ' + raiz + ' input[type=text], ' + raiz + ' input[type=password], ' + raiz + ' .conv-item, ' + raiz + ' .aj-row, ' + raiz + ' .aj-seg-opt, ' + raiz + ' .aj-switch-row, ' + raiz + ' a[data-delta-view]')]
      .filter(vis).filter(e => e.getBoundingClientRect().height < 47.5).map(e => nombre(e) + ' ' + Math.round(e.getBoundingClientRect().height) + 'px');
    window.__sinScroll = () => ({ancho: document.documentElement.scrollWidth, fuera: [...document.querySelectorAll('body *')].filter(vis).filter(e => !e.closest('.studio-dock') || true).filter(e => { const r = e.getBoundingClientRect(); return r.right > 360.5 || r.left < -0.5; }).map(nombre).slice(0, 5)});
    return 1;
  })()`;
  const TEXTO = 'h1, h2, h3, label, p, span, small, summary, strong, b, a, button, select, input[type=text], textarea, .conv-text, pre';
  const medirPantalla = async (tema, pantalla, raiz) => {
    await run(MEDIR);
    const textos = await run(`window.__medir(${JSON.stringify(raiz)}, ${JSON.stringify(TEXTO)})`);
    const malos = textos.filter(x => !x.salta && x.c < 4.5);
    assert.deepEqual(malos, [], `${tema} · ${pantalla}: todo el texto visible debe tener 4,5:1 o más`);
    const salteados = textos.filter(x => x.salta).length;
    assert.ok(textos.length > 3 && salteados <= textos.length / 3, `${tema} · ${pantalla}: se midieron ${textos.length} textos (${salteados} sobre degradado)`);
    const bordes = await run(`window.__bordes(${JSON.stringify(raiz)}, 'select, input[type=text], input[type=password], textarea, .aj-seg, button.p, #pause, #mark, #openSheets, #writeNewNote')`);
    const flojos = bordes.filter(x => x.c < 3);
    assert.deepEqual(flojos, [], `${tema} · ${pantalla}: los controles deben tener 3:1 o más contra lo que los rodea`);
    // Hallazgo previo, fuera de esta tarea (se anota, no se arregla): en «Herramientas del cuaderno» cuatro botones miden 44 px desde antes de U5 (`.conv-tools button{min-height:44px}`).
    // Acá se exige que no empeoren (siguen en 44 px) y que todo lo demás mida 48 px o más.
    const PREVIOS = /^#(convRename|convCopyAll|convMoveAllBtn|convTxt) 44px$/;
    const chicos = (await run(`window.__tactil(${JSON.stringify(raiz)})`)).filter(x => !PREVIOS.test(x));
    assert.deepEqual(chicos, [], `${tema} · ${pantalla}: lo tocable mide 48 px o más`);
    const sc = await run('window.__sinScroll()');
    assert.ok(sc.ancho <= 360, `${tema} · ${pantalla}: sin desplazamiento horizontal (${sc.ancho})`); assert.deepEqual(sc.fuera, [], `${tema} · ${pantalla}: nada se sale de 360 px`);
    const peor = (lista, f) => lista.filter(f).reduce((m, x) => (!m || x.c < m.c) ? x : m, null);
    const prin = peor(textos, x => !x.salta && /^(h1|h2|h3)$/i.test('') || /^#?(?:h[1-3])?\.?(screen|record|aj-title|conv-h|aj-row-t|conv-item)/.test(x.n) || /^h\d/.test(x.n));
    const sec = peor(textos, x => !x.salta && /hint|sub|aj-group|small|mark-help|record-caption|aj-lbl|conv-meta|conv-stamp/.test(x.n));
    const bot = peor(textos, x => !x.salta && /button|^#(rec|pause|mark|openSheets|writeNewNote|loadAudioBtn|audioShortcut|ajCopy)|^\\./.test(x.n) && /\bbutton\b|^#(rec|pause|mark|openSheets|writeNewNote|loadAudioBtn|audioShortcut|ajCopy|save|studioDock)/.test(x.n));
    const mejor = (lista) => lista.filter(x => !x.salta).reduce((m, x) => (!m || x.c < m.c) ? x : m, null);
    tabla.push({tema, pantalla, total: textos.length, minimo: mejor(textos), principal: prin, secundario: sec, boton: bot, bordeMin: bordes.reduce((m, x) => (!m || x.c < m.c) ? x : m, null)});
    return textos;
  };
  const captura = async nombre => {
    const alto = await run('Math.min(Math.max(document.documentElement.scrollHeight, 740), 3200)');
    await call('Emulation.setDeviceMetricsOverride', {width: 360, height: alto, deviceScaleFactor: 2, mobile: true}); await sleep(200);
    const r = await call('Page.captureScreenshot', {format: 'png'}); writeFileSync(shots + '/' + nombre, Buffer.from(r.data, 'base64'));
    await call('Emulation.setDeviceMetricsOverride', {width: 360, height: 740, deviceScaleFactor: 2, mobile: true});
  };

  // =====================================================================================================
  // 1) Por defecto: Clara (la actual). Valores exactos de la paleta clara.
  await reset(null);
  let e = await estado();
  assert.deepEqual([e.tema, e.pref, e.esquema, e.color, e.css, e.fondo, e.radio], ['light', 'light', 'light', TC.light, 'light', BG.light, 'light'], 'por defecto: Clara');
  const paleta = await run(`(() => { const cs = getComputedStyle(document.documentElement); return ['--bg','--card','--bg2','--line','--ink','--mut','--acc','--acc-ink','--note-bg','--note-ink','--error-bg','--error'].map(v => cs.getPropertyValue(v).trim().toUpperCase()).join(' ') })()`);
  assert.equal(paleta, '#F7F2EA #FFFDF8 #EFDFE8 #D4C4CB #302933 #655964 #713F60 #FFFFFF #FFF4DD #7A4E00 #FBEAEA #9B2C26', 'la paleta clara es la actual');
  console.log('U5 · por defecto Clara OK');

  // =====================================================================================================
  // 2) La fila «Apariencia» en Ajustes, grupo LECTURA, con tres opciones; cada una cambia los colores y se guarda.
  await ir('ajustes');
  assert.equal(await run(`(() => { const g = [...document.querySelectorAll('#ajHome .aj-group')].find(h => h.textContent === 'Lectura'); return g && g.nextElementSibling.id })()`), 'settingsReading', 'el grupo LECTURA existe');
  assert.equal(await run(`document.querySelector('#settingsReading #ajAppearance') !== null`), true, '«Apariencia» está dentro del grupo LECTURA');
  assert.deepEqual(await run(`[...document.querySelectorAll('#ajAppearance label')].map(l => l.textContent)`), ['Clara', 'Nocturna', 'Automática']);
  assert.equal(await run(`document.getElementById('themeLbl').textContent`), 'Apariencia');
  assert.match(await run(`document.getElementById('themeHint').textContent`), /sigue la apariencia del sistema/);
  for (const [v, tema] of [['dark', 'dark'], ['light', 'light']]) {
    await elegir(v); e = await estado();
    assert.deepEqual([e.tema, e.pref, e.esquema, e.color, e.css, e.fondo, e.cfg, e.radio], [tema, v, tema, TC[tema], tema, BG[tema], v, v], 'elegir ' + v);
  }
  await elegir('dark'); e = await estado();
  assert.equal(e.tema, 'dark');
  // La elección sobrevive a recargar.
  await load(); e = await estado();
  assert.deepEqual([e.tema, e.pref, e.esquema, e.color, e.css, e.fondo, e.cfg, e.radio], ['dark', 'dark', 'dark', TC.dark, 'dark', BG.dark, 'dark', 'dark'], 'Nocturna sobrevive a recargar');
  const paletaN = await run(`(() => { const cs = getComputedStyle(document.documentElement); return ['--bg','--card','--bg2','--line','--ink','--mut','--acc','--acc-ink'].map(v => cs.getPropertyValue(v).trim().toUpperCase()).join(' ') })()`);
  assert.equal(paletaN, '#282229 #342D34 #4E3949 #675A64 #FAF0F1 #D1C2C9 #F0BDDA #282229', 'la paleta nocturna pedida');
  await elegir('light'); await load(); e = await estado();
  assert.deepEqual([e.tema, e.cfg, e.radio, e.fondo], ['light', 'light', 'light', BG.light], 'Clara sobrevive a recargar');
  console.log('U5 · Clara y Nocturna: cambian, se guardan y sobreviven a recargar OK');

  // Automática: sigue al sistema (preferencia oscura y clara emuladas), también en vivo y tras recargar.
  await sistema('dark'); await elegir('auto'); e = await estado();
  assert.deepEqual([e.tema, e.pref, e.esquema, e.color, e.fondo, e.cfg, e.radio], ['dark', 'auto', 'dark', TC.dark, BG.dark, 'auto', 'auto'], 'Automática con el sistema oscuro');
  await sistema('light'); await sleep(150); e = await estado();
  assert.deepEqual([e.tema, e.esquema, e.color, e.fondo], ['light', 'light', TC.light, BG.light], 'Automática sigue al sistema en vivo (pasa a claro)');
  await sistema('dark'); await sleep(150); e = await estado();
  assert.deepEqual([e.tema, e.esquema, e.color, e.fondo], ['dark', 'dark', TC.dark, BG.dark], 'Automática sigue al sistema en vivo (pasa a oscuro)');
  await load(); e = await estado();
  assert.deepEqual([e.tema, e.pref, e.cfg, e.radio, e.fondo], ['dark', 'auto', 'auto', 'auto', BG.dark], 'Automática sobrevive a recargar (sistema oscuro)');
  await sistema('light'); await load(); e = await estado();
  assert.deepEqual([e.tema, e.pref, e.cfg, e.radio, e.fondo], ['light', 'auto', 'auto', 'auto', BG.light], 'Automática sobrevive a recargar (sistema claro)');
  // Clara y Nocturna ignoran al sistema.
  await sistema('dark'); await elegir('light'); e = await estado(); assert.equal(e.tema, 'light', 'Clara ignora un sistema oscuro');
  await sistema('light'); await elegir('dark'); e = await estado(); assert.equal(e.tema, 'dark', 'Nocturna ignora un sistema claro');
  // Un valor desconocido en la configuración cae en Clara; el resto de la configuración no se toca.
  await reset({theme: 'violeta', textSize: 'large', listPreview: false}); e = await estado();
  assert.deepEqual([e.tema, e.radio], ['light', 'light'], 'un valor raro cae en Clara');
  await run(`document.getElementById('theme-dark').click()`); await sleep(100);
  assert.deepEqual(await run(`JSON.parse(localStorage.getItem(CKEY))`).then(c => [c.theme, c.textSize, c.listPreview]), ['dark', 'large', false], 'solo cambia theme: lo demás de la configuración sigue igual');
  await sistema('light');
  console.log('U5 · Automática (sistema claro y oscuro, en vivo y al recargar) OK');

  // =====================================================================================================
  // 3) Sin destello claro al abrir en nocturno: en cuanto existe <body> y en cada pintado, ya es oscuro.
  await reset({theme: 'dark'});
  await call('Page.addScriptToEvaluateOnNewDocument', {source: `window.__destello = []; const reg = w => { const d = document.documentElement, b = document.body; window.__destello.push({w, tema: d.dataset.theme, fondo: b ? getComputedStyle(b).backgroundColor : null, meta: (document.querySelector('meta[name="theme-color"]') || {}).content, esquema: getComputedStyle(d).colorScheme}); };
    new MutationObserver((m, o) => { if (document.body) { reg('body'); o.disconnect(); } }).observe(document, {childList: true, subtree: true});
    try { new PerformanceObserver(l => { for (const x of l.getEntries()) reg(x.name); }).observe({type: 'paint', buffered: true}); } catch (err) {}`});
  await load(); await sleep(600);
  const destello = await run('window.__destello');
  assert.ok(destello.length >= 2, 'se registró la creación del cuerpo y al menos un pintado (' + destello.length + ')');
  for (const d of destello) assert.deepEqual([d.tema, d.fondo, d.meta, d.esquema], ['dark', BG.dark, TC.dark, 'dark'], 'sin destello claro (' + d.w + ')');
  console.log('U5 · sin destello al abrir en nocturno (' + destello.map(d => d.w).join(', ') + ') OK');
  // En Automática con el sistema oscuro, igual.
  await sistema('dark'); await reset({theme: 'auto'}); await run('1');
  await load(); await sleep(400);
  for (const d of await run('window.__destello')) assert.deepEqual([d.tema, d.fondo], ['dark', BG.dark], 'sin destello en Automática oscura (' + d.w + ')');
  await sistema('light');

  // =====================================================================================================
  // 4) Pantallas, avisos y diálogos en las dos apariencias: contraste, bordes, 48 px, sin desplazamiento horizontal, capturas.
  const casos = [['claro', 'light'], ['nocturno', 'dark']];
  const grabando = (pausa) => run(`(() => { document.body.classList.add('delta-recording'); const r = document.getElementById('rec'); r.classList.add('on'); r.classList.toggle('paused', ${pausa}); document.getElementById('clock').classList.add('on'); document.getElementById('studioDockCapture').hidden = false; document.getElementById('studioDockCapture').classList.toggle('paused', ${pausa}); document.getElementById('studioDockNotes').hidden = true; return 1 })()`);
  const sinGrabar = () => run(`(() => { document.body.classList.remove('delta-recording'); const r = document.getElementById('rec'); r.classList.remove('on', 'paused'); document.getElementById('clock').classList.remove('on'); document.getElementById('studioDockCapture').hidden = true; document.getElementById('studioDockCapture').classList.remove('paused'); document.getElementById('studioDockNotes').hidden = false; return 1 })()`);
  for (const [nombre, tema] of casos) {
    await reset({theme: tema});
    e = await estado(); assert.equal(e.tema, tema);
    // ---- Dictar ----
    assert.equal(await ir('grabacion'), 'grabacion'); await sleep(150);
    await medirPantalla(nombre, 'Dictar', '.wrap');
    await medirPantalla(nombre, 'Dictar · barra inferior', '.studio-dock');
    const rec = await run(`(() => { const r = document.getElementById('rec').getBoundingClientRect(), cs = getComputedStyle(document.getElementById('rec')); return {ancho: Math.round(r.width), alto: Math.round(r.height), radio: cs.borderTopLeftRadius, anillo: cs.boxShadow} })()`);
    assert.ok(rec.ancho >= 144 && rec.ancho <= 152 && rec.ancho === rec.alto, nombre + ': el botón de grabar es redondo y mide unos 150 px (' + rec.ancho + ')');
    assert.ok(rec.radio.includes('%') ? parseFloat(rec.radio) >= 50 : parseFloat(rec.radio) >= rec.ancho / 2 - 1, 'es redondo (' + rec.radio + ')');
    assert.match(rec.anillo, /0px 0px 0px 12px/, 'tiene un anillo suave alrededor');
    // Revisión 22/11 (D1): «Guardar en» ya no es una tarjeta: es una línea plegable con borde de control.
    const dest = await run(`(() => { const d = document.getElementById('dictDest'), t = document.getElementById('dictDestToggle'), cs = getComputedStyle(t); return {borde: cs.borderTopWidth, radio: parseFloat(cs.borderTopLeftRadius), alto: t.getBoundingClientRect().height, contiene: !!d.querySelector('select#dictDestSel')} })()`);
    assert.ok(dest.contiene && dest.borde === '1px' && dest.radio >= 12 && dest.alto >= 47.5, nombre + ': «Se guarda en» es una línea de 48 px con borde fino');
    const tit = await run(`parseFloat(getComputedStyle(document.querySelector('.screen-title h2')).fontSize)`);
    assert.ok(tit >= 25.5 && tit <= 27, 'título de pantalla de unos 26 px (' + tit + ')');
    const tarj = await run(`parseFloat(getComputedStyle(document.querySelector('.c-rec')).borderTopLeftRadius)`);
    assert.ok(tarj >= 18 && tarj <= 20, 'tarjetas con esquinas de 18 a 20 px (' + tarj + ')');
    await captura(`u5-dictar-360-${nombre}.png`);
    // Grabando y en pausa (estados simulados): la franja de grabación y el botón también cumplen.
    await grabando(false); await sleep(100);
    await medirPantalla(nombre, 'Dictar · grabando', '.wrap'); await medirPantalla(nombre, 'Dictar · franja de grabación', '.studio-dock');
    if (nombre === 'nocturno' || nombre === 'claro') await captura(`u5-grabando-360-${nombre}.png`);
    await grabando(true); await sleep(100);
    await medirPantalla(nombre, 'Dictar · en pausa', '.wrap'); await medirPantalla(nombre, 'Dictar · franja en pausa', '.studio-dock');
    await sinGrabar();
    // ---- Cuadernos: lista ----
    assert.equal(await ir('transcripcion'), 'transcripcion'); await sleep(150);
    assert.equal(await run('document.querySelectorAll("#convList .conv-item").length'), 3);
    const item = await run(`(() => { const b = document.querySelector('#convList .conv-item'), cs = getComputedStyle(b), ico = b.querySelector('.conv-ico'), t = b.children[1], s = b.children[2];
      return {radio: parseFloat(cs.borderTopLeftRadius), borde: cs.borderBottomWidth, ico: !!ico && ico.getBoundingClientRect().width, icoFondo: getComputedStyle(ico).backgroundColor, icoRadio: parseFloat(getComputedStyle(ico).borderTopLeftRadius),
        peso: +getComputedStyle(t).fontWeight, tY: t.getBoundingClientRect().top, sY: s.getBoundingClientRect().top, icoX: ico.getBoundingClientRect().right, tX: t.getBoundingClientRect().left, small: s.tagName + ' ' + s.textContent, hijos: [...b.children].map(c => c.tagName.toLowerCase())} })()`);
    assert.ok(item.radio === 0 && item.borde === '1px', nombre + ': filas de índice con separador inferior');
    assert.equal(item.ico, 0, 'el índice reserva el ancho para los títulos');
    assert.ok(item.icoX <= item.tX, 'el ícono queda a la izquierda del nombre'); assert.ok(item.peso >= 700, 'nombre en negrita'); assert.ok(item.sY > item.tY, '«N notas · fecha» queda debajo del nombre');
    assert.match(item.small, /^SMALL 1 nota/, 'N notas · fecha');
    assert.deepEqual(item.hijos.slice(0, 3), ['span', 'span', 'small']);   // revisión 22/11 (C3): avatar (inicial o ícono) + nombre + «N notas · fecha»
    await medirPantalla(nombre, 'Cuadernos · lista', '.wrap'); await medirPantalla(nombre, 'Cuadernos · barra inferior', '.studio-dock');
    await captura(`u5-cuadernos-lista-360-${nombre}.png`);
    // ---- Cuadernos: un cuaderno abierto (con dos notas) ----
    await run('document.querySelector("#convList .conv-item").click()'); await sleep(150);
    await run(`(() => { const x = document.getElementById('text'); x.value = 'Segunda nota inventada para la captura.'; x.dispatchEvent(new Event('input', {bubbles: true})); document.getElementById('save').click(); return 1 })()`); await sleep(200);
    assert.ok(await run('document.querySelectorAll("#convBubbles .conv-bubble").length') >= 2);
    await medirPantalla(nombre, 'Cuadernos · cuaderno abierto', '.wrap'); await medirPantalla(nombre, 'Cuadernos · cuaderno abierto · barra', '.studio-dock');
    await captura(`u5-cuadernos-abierto-360-${nombre}.png`);
    // Menú «⋯» y diálogo de mover (diálogos de la app).
    await run('document.querySelector("#convBubbles .conv-more").click()'); await sleep(100);
    await medirPantalla(nombre, 'Cuadernos · menú ⋯', '#convBubbles');
    await run(`document.getElementById('convMoveDialog').showModal()`); await sleep(100);
    await medirPantalla(nombre, 'Diálogo · mover nota', '#convMoveDialog');
    const dlg = await run(`(() => { const d = document.getElementById('convMoveDialog'), cs = getComputedStyle(d), b = getComputedStyle(d, '::backdrop'); return {fondo: cs.backgroundColor, radio: parseFloat(cs.borderTopLeftRadius), backdrop: b.backgroundColor} })()`);
    assert.equal(dlg.fondo, tema === 'dark' ? 'rgb(52, 45, 52)' : 'rgb(255, 253, 248)', nombre + ': el diálogo usa la tarjeta de la apariencia'); assert.ok(dlg.radio >= 18 && dlg.radio <= 20);
    assert.notEqual(dlg.backdrop, 'rgba(0, 0, 0, 0)');
    await run(`document.getElementById('convMoveDialog').close()`);
    await run(`document.getElementById('correctionDialog').showModal()`); await sleep(100);
    await medirPantalla(nombre, 'Diálogo · corregir', '#correctionDialog');
    await captura(`u5-dialogo-360-${nombre}.png`);
    await run(`document.getElementById('correctionDialog').close()`);
    // ---- Avisos: aviso de la barra, advertencia de captura, error, éxito, nota suave ----
    await ir('grabacion'); await sleep(100);
    await run(`(() => { flash('Aviso de prueba inventado.'); const w = document.getElementById('captureWarning'); w.hidden = false; w.textContent = 'Advertencia de prueba inventada.'; const d = document.getElementById('audioDone'); d.hidden = false; document.getElementById('audioDoneText').textContent = 'Éxito de prueba inventado.'; return 1 })()`); await sleep(100);
    await medirPantalla(nombre, 'Avisos (barra, advertencia, éxito)', '.wrap'); await medirPantalla(nombre, 'Avisos · barra', '.studio-dock');
    await run(`(() => { document.getElementById('audioDone').hidden = true; document.getElementById('captureWarning').hidden = true; flash(''); return 1 })()`);
    // ---- Ajustes: pantalla principal y una subpantalla ----
    assert.equal(await ir('ajustes'), 'ajustes'); await sleep(150);
    await medirPantalla(nombre, 'Ajustes', '#ajustes'); await medirPantalla(nombre, 'Ajustes · barra inferior', '.studio-dock');
    const seg = await run(`(() => { const s = document.querySelector('.aj-seg'), cs = getComputedStyle(s), op = [...document.querySelectorAll('.aj-seg-opt')].map(l => Math.round(l.getBoundingClientRect().height)); return {ancho: Math.round(s.getBoundingClientRect().width), op, activa: getComputedStyle(document.querySelector('.aj-seg-opt:has(input:checked)')).backgroundColor} })()`);
    assert.ok(seg.op.every(h => h >= 48), 'las tres opciones miden 48 px o más');
    await captura(`u5-ajustes-360-${nombre}.png`);
    await run(`document.getElementById('ajRow-copias').click()`); await sleep(100);
    await medirPantalla(nombre, 'Ajustes · Copias de seguridad', '#ajustes');
    await run(`document.querySelector('.aj-sub:not([hidden]) [data-aj-back]').click()`);
    // ---- Anonimizar (cuarta pantalla) ----
    assert.equal(await ir('anonimizar'), 'anonimizar'); await sleep(150);
    await medirPantalla(nombre, 'Anonimizar', '.wrap');
    console.log('U5 · pantallas, avisos y diálogos · ' + nombre + ' OK');

    // ---- Pantalla de bloqueo (protección activada y bloqueada) ----
    await run(`(async () => { const r = await vault.enable(${JSON.stringify(PA)}); r.dek.fill(0); await vaultTakeTabLock(); vaultRefreshPanel(); return 1 })()`);
    await run(`vaultLockNow(false)`); await sleep(400);
    assert.equal(await run(`!document.getElementById('vaultLock').hidden`), true, 'la pantalla de bloqueo está a la vista');
    e = await estado(); assert.equal(e.tema, tema, 'el bloqueo también sigue la apariencia');
    const blq = await run(`(() => { const l = document.getElementById('vaultLock'), cs = getComputedStyle(l), c = getComputedStyle(l.querySelector('.vault-lock-card')); return {fondo: cs.backgroundColor, tarjeta: c.backgroundColor, radio: parseFloat(c.borderTopLeftRadius)} })()`);
    assert.equal(blq.fondo, BG[tema]); assert.equal(blq.tarjeta, tema === 'dark' ? 'rgb(52, 45, 52)' : 'rgb(255, 253, 248)');
    await medirPantalla(nombre, 'Pantalla de bloqueo', '#vaultLock');
    await captura(`u5-bloqueo-360-${nombre}.png`);
    // Al desbloquear con la contraseña, sigue igual.
    await run(`(async () => { await vault.unlockPassword(${JSON.stringify(PA)}); await vaultTakeTabLock(); await vaultAfterUnlock(); return 1 })()`); await sleep(300);
    e = await estado(); assert.equal(e.tema, tema, 'tras desbloquear, la misma apariencia');
    console.log('U5 · pantalla de bloqueo · ' + nombre + ' OK');
  }

  // =====================================================================================================
  // 5) Lo que exporta la app no cambia: Word y TXT salen en claro sobre blanco aunque la app esté en nocturno.
  await reset({theme: 'dark'});
  const exp = await run(`(() => { const f = document.documentElement.outerHTML; return {wordFondo: /<body[^>]*background/i.test(''), tieneDark: /0B1E24|12343D|1F4D57|7FD1C7/i.test(String(typeof exportDocx === 'function' ? exportDocx : '') + String(typeof exportTxt === 'function' ? exportTxt : ''))} })()`);
  assert.equal(exp.tieneDark, false, 'el código de exportación no usa colores nocturnos');
  const htmlSrc = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const word = htmlSrc.match(/const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office"[\s\S]*?';/)[0];
  assert.ok(!/var\(--|data-theme|0B1E24|12343D|1F4D57|7FD1C7/i.test(word), 'el Word se arma con colores propios (claro sobre blanco), sin variables de la app');
  console.log('U5 · exportación sin cambios OK');

  // Tabla de contrastes medidos (la que va en la descripción del PR).
  const f = x => x ? `${x.c}:1` : '—';
  const filas = tabla.map(t => `| ${t.tema} | ${t.pantalla} | ${t.total} | ${f(t.minimo)} (${t.minimo ? t.minimo.n + ' «' + t.minimo.t + '»' : ''}) | ${t.bordeMin ? t.bordeMin.c + ':1' : '—'} |`);
  if (process.env.TABLA_CONTRASTES) writeFileSync(process.env.TABLA_CONTRASTES, '| Apariencia | Pantalla | Textos medidos | Peor contraste de texto | Peor borde de control |\n|---|---|---|---|---|\n' + filas.join('\n') + '\n');
  console.log(filas.join('\n'));
  console.log('Capturas en ' + shots);
  console.log('apariencia-browser.mjs OK');
} finally {
  try { ws && ws.close(); } catch (e) {}
  chrome.kill('SIGKILL'); server.close();
  try { rmSync(profile, {recursive: true, force: true}); } catch (e) {}
}
process.exit(0);
