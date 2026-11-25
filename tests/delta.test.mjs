import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);

test('título y punto único de entrada', () => {
  assert.match(html, /<title>DictaVoz · Prueba Delta/);
  assert.match(html, /<h1>DictaVoz<\/h1>/);
  assert.match(html, /<footer>Versión de prueba · usá solo datos ficticios<\/footer>/);   // revisión estética 22/11: pie de una línea
});

test('los scripts se pueden analizar', () => {
  assert.ok(scripts.length >= 2);
  scripts.forEach((s,i) => assert.doesNotThrow(() => new Script(s, { filename: 'inline-'+i+'.js' })));
});

test('voseo: «queréis», «podéis» y «tú» se llevan a la forma rioplatense, y el diccionario nuevo ya lo trae', () => {
  const match = html.match(/\/\*PURE-START\*\/([\s\S]*?)\/\*PURE-END\*\//);
  const {parseDict,applyDict} = new Function(match[1]+';return {parseDict,applyDict};')();
  const v = html.match(/const VOSEO = \[([\s\S]*?)\];/);
  assert.ok(v, 'falta la lista VOSEO');
  const reglas = new Function('return [' + v[1] + ']')().filter(l => l.includes('=>')).join('\n');
  const D = parseDict(reglas);
  assert.equal(applyDict('¿Queréis venir? Vosotros podéis, tú tienes tiempo.', D), '¿Querés venir? Ustedes podés, vos tenés tiempo.');
  assert.equal(applyDict('Sois muy amable y sabéis hacéis pensáis.', D), 'Sos muy amable y sabés hacés pensás.');
  assert.equal(applyDict('Ya querés, podés y tenés.', D), 'Ya querés, podés y tenés.');   // lo que ya está bien no cambia
  assert.match(html, /const DEFAULT_DICT = \[[\s\S]*?\.\.\.VOSEO,[\s\S]*?\]\.join/, 'el diccionario inicial debe traer el voseo');
  assert.ok(html.indexOf('const VOSEO =') < html.indexOf('const DEFAULT_DICT ='), 'VOSEO se define antes de usarse');
});

test('IDs únicos y referencias existentes', () => {
  assert.equal(new Set(ids).size, ids.length, 'IDs duplicados');
  const refs = [...html.matchAll(/\$\('([^']+)'\)/g)].map(m => m[1]);
  for (const id of refs) assert.ok(ids.includes(id), 'falta #'+id);
});

test('controles de voz visibles y sincronizados', () => {
  for (const id of ['rec','pause','save','studioDockNotes','studioDockCapture','studioDockPause','studioDockStop','anon','undo']) assert.ok(ids.includes(id), 'falta #'+id);
  assert.match(html, /id="studioSettingsLink" data-delta-view="ajustes"/);
  assert.match(html, /if \(view==='ajustes'\) document\.getElementById\('ajustes'\)\.open=true;/);
  assert.ok(html.includes("$('studioDockStop').addEventListener('click',()=>$('rec').click())"));
  assert.ok(html.includes("$('studioDockPause').addEventListener('click',()=>$('pause').click())"));
});

test('diccionario y corrección contextual', () => {
  for (const id of ['text','quickCorrect','correctionDialog','correctionReplacement','correctionRemember','dict']) assert.ok(ids.includes(id), 'falta #'+id);
  const match = html.match(/\/\*PURE-START\*\/([\s\S]*?)\/\*PURE-END\*\//);
  assert.ok(match, 'falta el bloque de funciones puras');
  const {parseDict,applyDict} = new Function(match[1]+';return {parseDict,applyDict};')();
  assert.equal(applyDict('El pasiente llegó.',parseDict('pasiente => paciente')), 'El paciente llegó.');
});

test('se mantienen las claves del almacenamiento', () => {
  for (const key of ['notasvoz.gamma.v1','notasvoz.gamma.dict.v1','notasvoz.gamma.cfg.v1','notasvoz.gamma.draft.v1','notasvoz.gamma.undo.v1','notasvoz-gamma-audio']) assert.ok(html.includes(key), 'falta '+key);
});

test('funciones esenciales sin quitar', () => {
  for (const func of ['function startWhisper(','function stopWhisper(','function setPaused(','function anonymize(','function saveDraft(','function updateDockRecording(']) assert.ok(html.includes(func), 'falta '+func);
});

/* ---- Pruebas de diagnóstico (Delta 01, diagnósticos v1) ---- */
const pure = (() => {
  const m = html.match(/\/\*PURE-START\*\/([\s\S]*?)\/\*PURE-END\*\//);
  return new Function(m[1] + ';return {makeSegmenter, analyzeText};')();
})();
const RATE = 48000;
const block = amp => new Float32Array(4096).fill(amp);          // bloque de ~85 ms con volumen constante
const push = (sg, amp, n) => { for (let i = 0; i < n; i++) sg.push(block(amp)); };
const run = (fn) => {
  const parts = [], skipped = [];
  const sg = pure.makeSegmenter(RATE, (blocks, info) => parts.push({blocks, info}), {onSkip: i => skipped.push(i)});
  fn(sg); sg.flush();
  return {parts, skipped};
};

test('segmentador: solo silencio no se envía a Whisper y queda anotado', () => {
  const {parts, skipped} = run(sg => push(sg, 0.001, 100));
  assert.equal(parts.length, 0);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].voiceSec, 0);
});

test('segmentador: la voz se envía con su resumen', () => {
  const {parts, skipped} = run(sg => push(sg, 0.1, 36));
  assert.equal(skipped.length, 0);
  assert.equal(parts.length, 1);
  const i = parts[0].info;
  assert.equal(i.why, 'manual');
  assert.equal(i.blocks, 36);
  assert.ok(Math.abs(i.voiceSec - 36 * 4096 / RATE) < 1e-6);
  assert.ok(Math.abs(i.maxRms - 0.1) < 1e-4);
});

test('segmentador: un silencio largo se comprime', () => {
  const {parts} = run(sg => { push(sg, 0.1, 36); push(sg, 0.001, 59); push(sg, 0.1, 36); });
  assert.equal(parts.length, 1);
  assert.equal(parts[0].blocks.length, 36 + 9 + 36);   // 0,8 s de silencio como máximo
});

test('segmentador: una grabación larga se corta sin perder audio con voz', () => {
  const {parts} = run(sg => push(sg, 0.1, 469));         // ~40 s seguidos
  assert.ok(parts.length >= 2);
  assert.equal(parts.reduce((s, p) => s + p.blocks.length, 0), 469);
  parts.forEach(p => assert.ok(p.blocks.length <= 340, 'parte de más de 29 s'));
  assert.equal(parts[0].info.why, 'limite');
});

test('segmentador: un golpecito corto no cuenta como voz', () => {
  const {parts, skipped} = run(sg => { push(sg, 0.001, 20); push(sg, 0.2, 2); push(sg, 0.001, 5); });
  assert.equal(parts.length, 0);
  assert.equal(skipped.length, 1);
});

test('analizador de texto: frases normales no se marcan', () => {
  const a = pure.analyzeText('El paciente llegó a las 10 con dos hijos y refiere dolor de cabeza desde ayer.');
  assert.equal(a.loop, false);
  assert.equal(a.mostlyNumbers, false);
  assert.ok(a.digits >= 2);
});

test('analizador de texto: detecta repeticiones y números', () => {
  assert.equal(pure.analyzeText('1 1 1 1 1 1 1').loop, true);
  assert.equal(pure.analyzeText('1 2 3 4 5 6').mostlyNumbers, true);
  assert.equal(pure.analyzeText('gracias por ver el video gracias por ver el video gracias por ver el video').loop, true);
  assert.equal(pure.analyzeText('').loop, false);
});

test('analizador de texto: solo devuelve números y marcas, nunca el texto', () => {
  const a = pure.analyzeText('Palabras de ejemplo ficticio 123');
  Object.values(a).forEach(v => assert.notEqual(typeof v, 'string'));
});

test('diagnósticos: errores con etapa y errores inesperados', () => {
  for (const s of ["addEventListener('error'", "addEventListener('unhandledrejection'", "type:'note'", 'stage', 'analyzeText(c)', 'onSkip: skipDiag', 'audio recibido del micrófono'])
    assert.ok(html.includes(s), 'falta ' + s);
});
test('diagnósticos v2: motivo de la placa de video, hilos y duración de pausas', () => {
  for (const s of ['WebGPU sin adaptador', 'no ofrece WebGPU', 'hilos de cálculo del procesador', 'página aislada', 'estuvo en pausa', 'vigilancia de grabaciones largas'])
    assert.ok(html.includes(s), 'falta ' + s);
});

test('Guardar agrega el mensaje a un cuaderno, sin descargar archivos ni usar las notas anteriores', () => {
  // Segunda revisión de E2: el botón marca «guardando» y llama a convSave (que antes de confirmar lee cuántas partes tiene el audio).
  assert.match(html, /\$\('save'\)\.onclick = async \(\) => \{\n  if \(convSaving\) return;\n  convSaving = true;\n  try \{ await convSave\(\); \} finally \{ convSaving = false; \}\n\};/);
  const handler = html.match(/async function convSave\(\)\{([\s\S]*?)\n\}\nfunction convInit/);
  assert.ok(handler, 'falta acción de Guardar');
  // E2 (correcciones): recién limpia el editor y avisa cuando el cifrado llegó al almacenamiento; si no, vuelve atrás.
  const h = handler[1];
  assert.ok(h.indexOf('await vault.flush(); ok = vault.saved(CONV_KEY);') > 0 && h.indexOf('await vault.flush()') < h.indexOf('convClearComposer()'), 'espera el guardado cifrado antes de limpiar');
  assert.match(h, /if \(!ok\) \{\n\s*convStore\.revert\(before, prevRaw\); renderConv\(\);\n\s*return flash\('No se guardó: no hay espacio/);
  assert.match(handler[1], /convAddEntry\(/);
  assert.match(handler[1], /savedAt: now/);
  assert.match(handler[1], /const w = convStore\.save\(next\)/);
  assert.match(handler[1], /if \(!w\.ok\) return flash\('No se guardó: '/, 'si falla no se limpia el editor');
  assert.doesNotMatch(handler[1], /download\(|persist\(\)|fetch\(|XMLHttpRequest|sendBeacon\(/);
  assert.match(html, /<span>Guardar<\/span><\/button>/);
  assert.ok(html.includes("$('txt').onclick") && html.includes("$('doc').onclick"), 'exportar el mensaje sigue disponible');
});

test('el archivo de texto contiene título y transcripción ficticios', () => {
  const match = html.match(/function makeTxt\(\)\{([\s\S]*?)\n\}/);
  assert.ok(match, 'falta constructor del archivo');
  class FakeFile {
    constructor(parts, name, options) { Object.assign(this, {parts, name, type: options.type}); }
  }
  const $ = id => ({value: id === 'title' ? 'Nota de prueba' : 'Texto ficticio de verificación.'});
  const build = new Function('$', 'fname', 'File', match[0] + '; return makeTxt;')($, ext => 'Nota_de_prueba.' + ext, FakeFile);
  const file = build();
  assert.equal(file.name, 'Nota_de_prueba.txt');
  assert.equal(file.parts.join(''), 'Nota de prueba\n\nTexto ficticio de verificación.');
  assert.match(file.type, /^text\/plain/);
});

test('dictado local: consulta idioma español sin habilitar servicios remotos', () => {
  assert.match(html, /SR\.available\(\{langs: \[lang\], processLocally: true\}\)/);
  assert.match(html, /SR\.install\(\{langs: \[candidate.lang\], processLocally: true\}\)/);
  assert.match(html, /rec\.processLocally = true/);
  assert.doesNotMatch(html, /rec\.processLocally = false/);
  for (const id of ['nativeSetup', 'nativePrepare', 'nativeNote']) assert.ok(ids.includes(id), 'falta #'+id);
});

test('dictado local: radio deshabilitado sin idioma, conserva Whisper', () => {
  const match = html.match(/function setNativeAvailability\(ready, detail, canPrepare\) \{[\s\S]*?\n\}/);
  assert.ok(match, 'falta control de disponibilidad');
  const nativeRadio = {disabled:false, checked:true};
  const whisperRadio = {checked:false};
  const label = {style:{opacity:''}};
  const note = {textContent:''};
  const nativeSetup = {hidden:true};
  const $ = id => id === 'lblNative' ? label : note;
  const document = {querySelector: () => whisperRadio};
  const helper = new Function('nativeRadio','nativeSetup','$','document',
    'let nativeReady=false;\n' + match[0] + '\nreturn {setNativeAvailability, getReady:()=>nativeReady};');
  const {setNativeAvailability, getReady} = helper(nativeRadio, nativeSetup, $, document);
  setNativeAvailability(false, 'No está instalado español', true);
  assert.equal(nativeRadio.disabled, true);
  assert.equal(nativeSetup.hidden, false);
  assert.equal(whisperRadio.checked, true);
  assert.equal(getReady(), false);
  setNativeAvailability(true, 'Disponible', false);
  assert.equal(nativeRadio.disabled, false);
  assert.equal(nativeSetup.hidden, true);
  assert.equal(getReady(), true);
});

test('dictado local: detención inmediata deja mensaje y no reinicia sin límite', () => {
  assert.match(html, /Date\.now\(\) - nativeStartedAt < 1200/);
  assert.match(html, /El navegador detuvo el dictado inmediatamente/);
  assert.match(html, /rec\.onerror = e => \{/);
  assert.match(html, /'no-speech':'No se detectó voz/);
  assert.match(html, /r\.disabled = on \|\| \(r\.value === 'native' && !nativeReady\)/);
});


test('audio: conserva un principal y solo la última copia recuperable', () => {
  const match = html.match(/function audioHistoryPlan\(current, previous, next\) \{[\s\S]*?\n\}/);
  assert.ok(match);
  const plan = new Function(match[0] + '; return audioHistoryPlan;')();
  const old = {id:'last',sid:'A',complete:true};
  const previous = {id:'previous',sid:'B',complete:true};
  const r = plan(old, previous, {sid:'C'});
  assert.deepEqual(r.keepPrevious, {...old,id:'previous'});
  assert.equal(r.expiredSid, 'B');
  assert.deepEqual(plan(null, previous, {sid:'C'}), {keepPrevious:null,expiredSid:'B'});
});

test('audio: la primera parte nueva conserva el audio previo y elimina solo el más antiguo', async () => {
  const matchPlan = html.match(/function audioHistoryPlan\(current, previous, next\) \{[\s\S]*?\n\}/);
  const matchFirst = html.match(/async function audioPutFirstChunk\(sid, n, b, meta\) \{[\s\S]*?\n\}/);
  assert.ok(matchFirst);
  const plan = new Function(matchPlan[0] + '; return audioHistoryPlan;')();
  const metas = new Map([['last',{id:'last',sid:'A'}],['previous',{id:'previous',sid:'B'}]]);
  const chunks = new Map([['A:000000','AUDIO A'],['B:000000','AUDIO B']]);
  const idbDo = async (stores, mode, fn) => {
    assert.deepEqual(stores,['chunks','meta']);
    assert.equal(mode,'readwrite');
    fn({objectStore: name => name === 'meta'
      ? {put:o=>metas.set(o.id,o),delete:k=>metas.delete(k)}
      : {put:o=>chunks.set(o.k,o.b),delete:range=>{
          for(const k of [...chunks.keys()]) if(k>=range.lower&&k<=range.upper) chunks.delete(k);
        }}});
  };
  const get = async id => metas.get(id);
  const IDBKeyRange = {bound:(lower,upper)=>({lower,upper})};
  const commit = new Function('audioGetMeta','audioGetPrevious','audioHistoryPlan','idbDo','IDBKeyRange',
    matchFirst[0]+'; return audioPutFirstChunk;')(()=>get('last'),()=>get('previous'),plan,idbDo,IDBKeyRange);
  await commit('C',0,'AUDIO C',{id:'last',sid:'C',complete:false});
  assert.equal(metas.get('last').sid,'C');
  assert.equal(metas.get('previous').sid,'A');
  assert.equal(chunks.has('A:000000'),true);
  assert.equal(chunks.has('B:000000'),false);
  assert.equal(chunks.get('C:000000'),'AUDIO C');
});

test('audio: recupera el anterior intercambiando referencias sin copiar ni borrar archivos', async () => {
  const m = html.match(/async function audioUndoReplace\(\) \{[\s\S]*?\n\}/);
  assert.ok(m);
  const metas = new Map([['last',{id:'last',sid:'C'}],['previous',{id:'previous',sid:'A'}]]);
  const idbDo = async (stores,mode,fn) => {
    assert.deepEqual(stores,['meta']);
    assert.equal(mode,'readwrite');
    fn({objectStore:()=>({put:o=>metas.set(o.id,o)})});
  };
  const recover = new Function('audioGetMeta','audioGetPrevious','idbDo',
    m[0] + '; return audioUndoReplace;')(
      async()=>metas.get('last'),async()=>metas.get('previous'),idbDo);
  assert.equal(await recover(),true);
  assert.equal(metas.get('last').sid,'A');
  assert.equal(metas.get('previous').sid,'C');
  assert.equal(await recover(),true);
  assert.equal(metas.get('last').sid,'C');
});

test('audio: antes de grabar no destruye el anterior', async () => {
  const m = html.match(/async function audioSlotOk\(\)\{[\s\S]*?\n\}/);
  assert.ok(m);
  assert.doesNotMatch(m[0], /audioClear\(/);
  let confirms=0;
  const fn = new Function('audioGetMeta','confirm',m[0]+'; return audioSlotOk;')(
    async()=>({sid:'A',downloaded:false}),()=>{confirms++;return true;});
  assert.equal(await fn(),'ok');
  assert.equal(confirms,1);
  assert.match(html, /id="aUndoAudio"/);
  assert.match(html, /id="audioUndoRow"/);
});


test('Delta 05: los avisos de grabación larga no requieren el contenido de las notas', () => {
  const found = html.match(/function captureHealthWarning\([\s\S]*?\n\}/);
  assert.ok(found, 'falta evaluación de salud de grabación');
  const warn = new Function(found[0] + '; return captureHealthWarning;')();
  assert.equal(warn(false, false, 10000, 1000, 9, true, true), '');
  assert.equal(warn(true, true, 10000, 1000, 9, true, true), '');
  assert.match(warn(true, false, 10000, 2000, 0, false, false), /micrófono/);
  assert.equal(warn(true, false, 10000, 4000, 0, false, false), '');
  assert.match(warn(true, false, 10000, 9950, 6, false, true), /6 fragmentos pendientes/);
  assert.match(warn(true, false, 10000, 9950, 0, true, true), /dejó de guardar el audio/);
  assert.equal(warn(true, false, 10000, 9950, 0, true, false), '');
  assert.match(html, /id="captureWarning"/);
});

test('Delta 05: un corte preventivo solicita los datos sin borrar ni parar audio', () => {
  const found = html.match(/function checkpointRecordedAudio\(reason\)\{[\s\S]*?\n\}/);
  assert.ok(found, 'falta checkpoint de MediaRecorder');
  const notes = [];
  const recorder = {state:'recording', calls:0, requestData(){this.calls++;}};
  const checkpoint = new Function('recorder','notes',
    'let mr=recorder; const logDiag = s => notes.push(s); '+found[0]+'; return {checkpointRecordedAudio,setRecorder:r=>mr=r};')(recorder, notes);
  assert.equal(checkpoint.checkpointRecordedAudio('pausa'), true);
  assert.equal(recorder.calls,1);
  assert.match(notes[0], /pausa/);
  recorder.state='inactive';
  assert.equal(checkpoint.checkpointRecordedAudio('pausa'), false);
  assert.equal(recorder.calls,1);
  checkpoint.setRecorder({state:'recording',requestData(){throw Error('ficticio')}});
  assert.equal(checkpoint.checkpointRecordedAudio('segundo plano'), false);
  assert.match(notes.at(-1), /no pudo solicitar/);
  assert.doesNotMatch(found[0], /audioClear\(|\.stop\(/);
});

test('Delta 05: identifica errores y finales inesperados del grabador', () => {
  assert.match(html, /recorder\.onerror = e => \{/);
  assert.match(html, /se intentará conservar lo recibido/);
  const m = html.match(/recorder\.onerror = e => \{([\s\S]*?)\n  \};/);
  assert.ok(m, 'falta handler de error');
  assert.doesNotMatch(m[1], /audioSaveFailed = true|audioErr\(/);
  assert.match(html, /recorder\._deltaStopRequested = false/);
  assert.match(html, /mr\._deltaStopRequested = true; mr\.stop\(\)/);
  assert.match(html, /complete: !!expected/);
  assert.match(html, /checkpointRecordedAudio\('pausa'\)/);
  assert.match(html, /checkpointRecordedAudio\('marca'\)/);
  assert.match(html, /checkpointRecordedAudio\('segundo plano'\)/);
  assert.match(html, /lastMicBlockAt = Date\.now\(\)/);
});


test('Delta 06a: borrar textos locales deja audios, diccionario y configuración intactos', () => {
  const match = html.match(/function removeLocalTextKeys\(store, keys\) \{[\s\S]*?\n\}/);
  assert.ok(match, 'falta utilidad de borrado limitado');
  const run = new Function(match[0] + '; return removeLocalTextKeys;')();
  const store = new Map([
    ['notasvoz.gamma.v1', 'texto ficticio'],
    ['notasvoz.gamma.draft.v1', 'borrador ficticio'],
    ['notasvoz.gamma.undo.v1', 'anterior ficticio'],
    ['notasvoz.gamma.dict.v1', 'palabra de prueba'],
    ['notasvoz.gamma.people.v1', 'alias ficticio'],
    ['notasvoz.gamma.cfg.v1', 'configuración'],
  ]);
  const local = {removeItem:k => store.delete(k)};
  assert.equal(run(local, ['notasvoz.gamma.v1','notasvoz.gamma.draft.v1','notasvoz.gamma.undo.v1']), true);
  assert.equal(store.has('notasvoz.gamma.v1'), false);
  assert.equal(store.has('notasvoz.gamma.draft.v1'), false);
  assert.equal(store.has('notasvoz.gamma.undo.v1'), false);
  assert.equal(store.has('notasvoz.gamma.dict.v1'), true);
  assert.equal(store.has('notasvoz.gamma.people.v1'), true);
  assert.equal(store.has('notasvoz.gamma.cfg.v1'), true);
  assert.equal(run({removeItem(){throw Error('sin permiso')}}, ['x']), false);
});

test('Delta 06a: la eliminación requiere confirmación y deja fuera el audio', () => {
  const m = html.match(/\$\('clearLocalTexts'\)\.onclick = \(\) => \{([\s\S]*?)\n\};/);
  assert.ok(m, 'falta control para borrar textos');
  assert.match(m[1], /if \(!confirm\(/);
  assert.match(m[1], /if \(recording \|\| busy \|\| outstanding > 0 \|\| feeding\)/);
  assert.match(m[1], /removeLocalTextKeys\(vaultStore, TEXT_STORAGE_KEYS\)/);
  assert.match(m[1], /lastDraft = snap\(\)/);
  assert.doesNotMatch(m[1], /audioClear\(|indexedDB|localStorage\.clear\(/);
  assert.match(html, /id="localPrivacy"/);
  assert.match(html, /Estas copias no están cifradas/);
  assert.match(html, /No elimina los archivos de Descargas/);
});

test('Delta 06a: jamás se borra automáticamente al iniciar o guardar notas', () => {
  const calls = html.match(/removeLocalTextKeys\(/g) || [];
  assert.equal(calls.length, 2, 'la utilidad debe ser definida y usada solo en la acción explícita');
  assert.match(html, /\$\('clearLocalTexts'\)\.onclick/);
  assert.match(html, /const TEXT_STORAGE_KEYS = \[KEY, DRAFT, UNDO\]/);
});



test('Delta 08: navegación inferior de tres pantallas reales', () => {
  const nav=html.match(/<nav class="studio-nav"[\s\S]*?<\/nav>/);
  assert.ok(nav);
  assert.equal((nav[0].match(/data-delta-view="/g)||[]).length,4);
  for(const tab of ['grabacion','transcripcion','anonimizar','ajustes']) assert.match(nav[0],new RegExp('data-delta-view="'+tab+'"'));
  assert.doesNotMatch(nav[0],/studioPrivacyLink/);
  assert.match(html, /<body data-view="grabacion">/);
  assert.match(html, /body\[data-view="grabacion"\] \.c-edit/);
  assert.match(html, /body\[data-view="transcripcion"\] \.c-rec/);
  assert.match(html, /body\[data-view="ajustes"\] \.c-rec/);
  assert.match(html, /body\[data-view="anonimizar"\] \.c-rec/);
});

test('Delta 08: cambiar pantallas conserva un único DOM y actualiza el tab activo', () => {
  const match=html.match(/function chooseDeltaView\(view, scrollToTop=true\) \{[\s\S]*?\n  \}/);
  assert.ok(match,'falta selector de pantallas');
  const settings={open:false};
  const tabs=['grabacion','transcripcion','anonimizar','ajustes'].map(deltaView=>({
    dataset:{deltaView},attrs:{},
    setAttribute(k,v){this.attrs[k]=v;},
    removeAttribute(k){delete this.attrs[k];}
  }));
  let scrolled=0;
  const doc={
    body:{dataset:{view:'grabacion'}},
    getElementById:id=>id==='ajustes'?settings:null,
    querySelectorAll:selector=>{
      assert.equal(selector,'[data-delta-view]');
      return tabs;
    }
  };
  const win={scrollTo:()=>scrolled++};
  const choose=new Function('validDeltaViews','document','window',
    match[0]+'; return chooseDeltaView;')(['grabacion','transcripcion','anonimizar','ajustes'],doc,win);
  assert.equal(choose('transcripcion'), 'transcripcion');
  assert.equal(doc.body.dataset.view,'transcripcion');
  assert.equal(tabs[1].attrs['aria-current'],'page');
  assert.equal(tabs[0].attrs['aria-current'],undefined);
  assert.equal(scrolled,1);
  assert.equal(choose('ajustes',false),'ajustes');
  assert.equal(settings.open,true);
  assert.equal(scrolled,1);
  assert.equal(choose('desconocido',false),'grabacion');
  assert.equal(doc.body.dataset.view,'grabacion');
});

test('Delta 08: Grabar Texto Ajustes comparten acciones sin duplicar ni borrar estado', () => {
  assert.match(html,/id="studioDockStart"/);
  assert.match(html,/startAction\.addEventListener\('click',\(\)=>startButton\.click\(\)\)/);
  assert.match(html,/startAction\.disabled=startButton\.disabled/);
  assert.match(html,/new MutationObserver\(syncStart\)/);
  assert.match(html,/#studioDockNotes\{display:none\}/);
  assert.match(html,/id="studioDockStop"/);
  assert.match(html,/id="studioDockPause"/);
  assert.doesNotMatch(html,/id="studioAnonAction"/,'Anonimizar ya está en la navegación fija, no se repite');
  assert.match(html,/id="save"/);
  assert.match(html,/function updateDockRecording\(\)/);
  assert.match(html,/studioDockStop'\)\.addEventListener\('click',\(\)=>\$\('rec'\)\.click\(\)/);
  assert.match(html,/record-clock/);
  assert.match(html,/id="clock"/);
});

test('Delta 08: editor protagonista y herramientas secundarias accesibles', () => {
  assert.match(html,/class="screen-title text-screen-title"/);
  assert.match(html,/textarea#text\{background:var\(--surface-soft\)/);
  assert.match(html,/min-height:48svh;font-size:18px/);
  assert.match(html,/<details class="text-tools">/);
  for(const id of ['correctSelection','copyAll','selAll','clear','undoClear','quickCorrect','text','anon','undo','title','doc','txt'])
    assert.ok(ids.includes(id),'falta #'+id);
  assert.match(html,/body\[data-view="transcripcion"\] #studioDockStart\{display:none\}/);
});

test('Delta 08: ajustes agrupados y privacidad, audio y diccionario intactos', () => {
  for(const id of ['settingsQuality','settingsAudio','settingsPrivacy','settingsDictionary','settingsAdvanced','model','accel','mic','saveAudio','localPrivacy','clearLocalTexts','dict','nativeNote','nativePrepare'])
    assert.ok(ids.includes(id),'falta #'+id);
  assert.match(html, /<details class="card c-set" id="ajustes" open>/);
  // U16: los módulos ya no llevan encabezado propio; cada sección es una fila de la lista o una subpantalla (ver tests/ajustes-browser.mjs).
  assert.match(html, /class="aj-row" data-aj-open="calidad"/);
  assert.match(html, /Micrófono y rendimiento/);
  assert.match(html, /Cómo transcribir y otras opciones/);   // U16: «Otras opciones» pasó a Calidad de transcripción
  assert.match(html, /No elimina los archivos de Descargas/);
  assert.match(html, /removeLocalTextKeys\(vaultStore, TEXT_STORAGE_KEYS\)/);
  assert.match(html, /'localPrivacy'\)\.open=true/);
});

test('Delta 08: nuevo sistema visual y diseño móvil adaptable', () => {
  assert.match(html,/\/\* DELTA 08: three real screens/);
  assert.match(html,/--bg:#F7F2EA/);
  assert.match(html,/#rec\{width:154px;height:154px/);
  assert.match(html,/#clock\{font-size:64px/);
  assert.match(html,/\.studio-dock \.studio-nav\{display:grid;grid-template-columns:repeat\(4,1fr\)/);
  assert.match(html,/\.studio-dock \.studio-nav a\[aria-current="page"\]/);
  assert.match(html,/@media\(max-width:760px\)/);
  assert.match(html,/env\(safe-area-inset-bottom\)/);
  assert.match(html,/@media\(max-width:380px\)/);
});


test('Delta 09: banner global en barra fija y visible desde las tres pantallas', () => {
  const aside=html.match(/<aside class="studio-dock"[\s\S]*?<\/aside>/);
  assert.ok(aside);
  const banner=aside[0].match(/<section id="transcriptionDock"[\s\S]*?<\/section>/);
  assert.ok(banner,'banner no está dentro de barra fija');
  for(const id of ['transcriptionDockTitle','transcriptionDockMessage','transcriptionDockParts',
    'transcriptionDockTime','transcriptionDockPercent','transcriptionDockBar','transcriptionDockBarFill','transcriptionDockCancel'])
    assert.match(banner[0],new RegExp('id="'+id+'"'));
  assert.match(banner[0],/Esperá mientras se completa la transcripción/);
  assert.match(html,/\.transcription-dock\[hidden\]\{display:none!important\}/);
  assert.match(html,/body\.delta-transcribing\{padding-bottom:/);
  assert.match(html,/document\.body\.classList\.toggle\('delta-transcribing', state\.active\)/);
  assert.doesNotMatch(banner[0],/data-delta-view/);
});

test('Delta 09: estado único de Whisper incluye trabajo, grabación y fin', () => {
  const found=html.match(/function transcriptionDockState\([\s\S]*?\n\}/);
  assert.ok(found);
  const f=new Function(found[0]+';return transcriptionDockState;')();
  const idle=f(true,false,false,0,false,false,false,null,true);
  assert.deepEqual(idle,{active:false,cancel:false,progress:null});
  assert.equal(f(false,false,true,2,false,false,false,null,true).active,false,'sin Whisper no se muestra');
  assert.equal(f(true,false,true,2,false,false,true,null,true).active,false,'cancelado o fallado no se muestra');
  const active=f(true,false,true,2,false,false,false,37.6,true);
  assert.equal(active.active,true);
  assert.equal(active.cancel,true);
  assert.equal(active.progress,38);
  assert.match(active.message,/Esperá mientras se completa/);
  assert.match(active.parts,/2 partes pendientes/);
  const recording=f(true,true,true,1,false,false,false,null,true);
  assert.equal(recording.active,true);
  assert.equal(recording.cancel,false);
  assert.equal(recording.progress,null);
  assert.match(recording.title,/por partes/);   // revisión 22/11: sin nombre técnico, pero sigue diciendo «por partes»
  assert.match(recording.message,/Podés seguir grabando/);
  assert.equal(f(true,false,false,0,false,true,false,null,false).active,true,'carga del modelo');
  assert.equal(f(true,false,false,0,true,false,false,null,false).active,true,'transcribe audio guardado');
  assert.equal(f(true,false,true,1,false,false,false,100,true).progress,99,'sin 100% prematuro');
});

test('Delta 09: la barra es indeterminada cuando no hay estimación fiable', () => {
  assert.match(html,/const hasProgress = recording \? null/);
  assert.match(html,/state\.progress === null \? '' : '≈ '/);
  assert.match(html,/bar\.classList\.toggle\('indeterminate', pending\)/);
  assert.match(html,/bar\.removeAttribute\('aria-valuenow'\)/);
  assert.match(html,/bar\.setAttribute\('aria-valuenow', String\(state\.progress\)\)/);
  assert.match(html,/\.transcription-dock-bar\.indeterminate i\{animation:/);
  assert.match(html,/@media\(prefers-reduced-motion:reduce\)/);
});

test('Delta 09: un mismo ciclo de actualización muestra y oculta el aviso', () => {
  assert.match(html,/function updProgress\(\)\{[\s\S]*?refreshTranscriptionDock\(\);/);
  assert.match(html,/function maybeDone\(\)\{[\s\S]*?updProgress\(\);/);
  assert.match(html,/processingStartedAt = 0;\s+refreshTranscriptionDock\(\);\s+setStatus\('Procesamiento cancelado/);
  assert.match(html,/\$\('transcriptionDockCancel'\)\.onclick = \(\) => \$\('cancelProcessing'\)\.click\(\)/);
  assert.match(html,/if \(dock\.hidden === state\.active\) dock\.hidden = !state\.active/);
  assert.match(html,/if \(!state\.active\) return/);
  assert.match(html,/recEng === 'whisper'/);
  assert.match(html,/id="cancelProcessing"/);
});

test('Delta 09: todos los íconos del menú tienen el mismo grosor y Ajustes usa sliders', () => {
  const nav=html.match(/<nav class="studio-nav"[\s\S]*?<\/nav>/);
  assert.ok(nav);
  const icons=[...nav[0].matchAll(/<svg\b[^>]*>[\s\S]*?<\/svg>/g)].map(x=>x[0]);
  assert.equal(icons.length,4);
  for(const icon of icons) {
    assert.match(icon,/viewBox="0 0 24 24"/);
    assert.match(icon,/stroke-width="1.9"/);
    assert.match(icon,/stroke-linecap="round"/);
    assert.match(icon,/stroke-linejoin="round"/);
  }
  assert.match(nav[0],/id="studioSettingsLink"[\s\S]*?<circle cx="12" cy="6" r="2"\/><circle cx="17" cy="12" r="2"\/><circle cx="9" cy="18" r="2"\/>/);
  assert.match(nav[0],/data-delta-view="grabacion"/);
  assert.match(nav[0],/data-delta-view="transcripcion"/);
  assert.match(nav[0],/data-delta-view="anonimizar"/);
  assert.match(nav[0],/data-delta-view="ajustes"/);
});


test('Delta 10: indicador fijo reemplaza los mensajes anteriores durante la transcripción', () => {
  for (const selector of ['#status','#processingTimer','#cancelProcessing','#cancelNote','#tp','#busy','#interim']) {
    assert.match(html, new RegExp('body\\.delta-transcribing '+selector));
  }
  assert.match(html,/body\.delta-transcribing #interim\{display:none!important\}/);
  assert.match(html,/id="transcriptionDock"/);
  assert.match(html,/id="transcriptionDockCancel"/);
  assert.match(html,/body\.delta-transcribing\{padding-bottom:/);
  assert.match(html,/body\.delta-transcribing\.delta-recording\{padding-bottom:/);
  assert.doesNotMatch(html,/delta-transcribing:has\(/);
});

test('Delta 10: conserva advertencias de errores y mensajes finales', () => {
  assert.doesNotMatch(html,/body\.delta-transcribing #captureWarning/);
  assert.doesNotMatch(html,/body\.delta-transcribing #audioMsg/);
  assert.match(html,/setStatus\(gotText \? 'Transcripción completa/);
  assert.match(html,/setStatus\('No se pudo transcribir:/);
  assert.match(html,/if \(!state\.active\) return;/);
  assert.match(html,/document\.body\.classList\.toggle\('delta-transcribing', state\.active\)/);
  assert.match(html,/refreshTranscriptionDock\(\);\s+setStatus\('Procesamiento cancelado/);
});

test('Delta 10: no repite escrituras innecesarias en el panel cada medio segundo', () => {
  const m=html.match(/function refreshTranscriptionDock\(\)\{[\s\S]*?\n\}/);
  assert.ok(m);
  assert.match(m[0],/if \(el\.textContent !== value\) el\.textContent = value/);
  assert.match(m[0],/if \(\$\('transcriptionDockBarFill'\)\.style\.width !== width\)/);
  assert.match(m[0],/if \(cancel\.hidden === state\.cancel\)/);
  assert.match(m[0],/if \(dock\.hidden === state\.active\)/);
  assert.match(m[0],/getAttribute\('aria-valuenow'\) !== String\(state\.progress\)/);
  assert.match(m[0],/classList\.toggle\('delta-recording', state\.active && recording\)/);
  assert.match(html,/function updProgress\(\)/);
  assert.match(html,/refreshTranscriptionDock\(\)/);
});

test('Delta 10: no cambia configuración del modelo ni el motor de Whisper', () => {
  assert.match(html,/const MODEL_HELP = \{/);
  assert.match(html,/'Xenova\/whisper-small': 'Small: prioriza la precisión/);
  assert.match(html,/else if \(!c\.model && matchMedia\('\(pointer:coarse\)'\)\.matches\) \$\('model'\)\.value = 'Xenova\/whisper-base'/);
  assert.match(html,/function startWhisper\(\)/);
  assert.match(html,/const WL = "class P extends AudioWorkletProcessor/);
  assert.match(html,/processingStartedAt = 0/);
});


test('U19: botón de descarga histórico conservado en Ajustes y conectado a su acción', () => {
  assert.match(html, /id="recordDownloadAudio"/);
  assert.doesNotMatch(html, /id="recordSaveAudio"/);
  assert.match(html, /id="recordAudioHint"/);
  assert.match(html, /\$\('recordDownloadAudio'\)\.onclick = \(\) => \{/);
  assert.match(html, /\$\('aDown'\)\.click\(\)/);
  assert.match(html, /\$\('recordDownloadAudio'\)\.disabled = !m \|\| audioBusy\(\)/);
  assert.match(html, /refreshAudioBox\(\); \/\/ habilita Descargar audio/);
  assert.match(html, /audioGetBlob\(m\)/);
});

test('U19: único interruptor de conservar audio en Ajustes, se bloquea durante la captura', () => {
  assert.match(html, /id="saveAudio"/);
  assert.doesNotMatch(html, /id="recordSaveAudio"|id="recordSaveState"/);
  assert.match(html, /\$\('saveAudio'\)\.addEventListener\('change', refreshAudioBox\)/);
  assert.match(html, /\$\('saveAudio'\)\.disabled = on;/);
  assert.match(html, /Solo con Whisper|recEng === 'whisper'/);
});

test('Delta 11: Compartir texto no exige archivo Word ni oculta errores', async () => {
  const match = html.match(/async function shareNote\(\) \{[\s\S]*?\n\}/);
  assert.ok(match);
  assert.match(match[0], /navigator\.share\(payload\)/);
  assert.doesNotMatch(match[0], /makeDoc\(\)|navigator\.canShare/);
  assert.match(match[0], /e\.name === 'AbortError'/);
  assert.match(match[0], /Brave no pudo abrir Compartir/);
  assert.match(match[0], /navigator\.clipboard\.writeText\(text\)/);
  assert.match(html, /\$\('share'\)\.onclick = shareNote/);
  assert.equal((html.match(/id="share"/g) || []).length, 1);
});

test('Delta 11: Compartir usa Web Share de texto cuando el navegador lo admite', async () => {
  const match = html.match(/async function shareNote\(\) \{[\s\S]*?\n\}/);
  assert.ok(match);
  const shared=[];
  const nav={share:async payload=>shared.push(payload)};
  const els={text:{value:'Prueba ficticia para compartir'},title:{value:'Mi nota'}};
  const fn = new Function('$','navigator','pendingOk','anonOk','flash',
    match[0]+'; return shareNote;')(
    id=>els[id],nav,()=>true,()=>true,()=>{});
  await fn();
  assert.deepEqual(shared,[{title:'Mi nota',text:'Prueba ficticia para compartir'}]);
});

test('Delta 11: al faltar Web Share copia el texto y muestra alternativa', async () => {
  const match = html.match(/async function shareNote\(\) \{[\s\S]*?\n\}/);
  assert.ok(match);
  let copied='',feedback='';
  const els={text:{value:'Texto ficticio'},title:{value:''}};
  const fn = new Function('$','navigator','pendingOk','anonOk','flash',
    match[0]+'; return shareNote;')(
    id=>els[id],{clipboard:{writeText:async t=>{copied=t}}},
    ()=>true,()=>true,t=>{feedback=t});
  await fn();
  assert.equal(copied,'Texto ficticio');
  assert.match(feedback,/se copió/);
});

test('Delta 11: Seleccionar, Copiar y Compartir están visibles fuera de anonimización', () => {
  const area=html.match(/<div class="editor-quick-actions">([\s\S]*?)<\/div>/);
  assert.ok(area);
  for(const id of ['correctSelection','copyAll','selAll','share'])
    assert.match(area[1],new RegExp('id="'+id+'"'));
  assert.doesNotMatch(area[1], /style="display:none"/);
  assert.match(html, /\.editor-quick-actions\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(html, /\$\('copyAll'\)\.onclick/);
  assert.match(html, /\$\('selAll'\)\.onclick/);
  assert.match(html, /\$\('share'\)\.onclick/);
});

// Protocolo real de la página con Worker y relojes controlados, sin modelos ni datos privados.
function engineHarness(){
  const start = html.indexOf('let engine = null');
  const end = html.indexOf('\nlet backend', start);
  const timers = new Map(), workers = [], nodes = {};
  let next = 0;
  class FakeWorker {
    constructor(){ workers.push(this); }
    postMessage(m){ this.sent = m; if (this.throwPost) throw Error('DataCloneError'); }
    terminate(){ this.terminated = true; }
  }
  const api = new Function('Worker','URL','Blob','$','setTimeout','clearTimeout','workerBody',
    html.slice(start,end) + `\nlet ready=null,readyKey='',modelLoading=false;
    return {call,onMsg,failAll,withDeadline, pending:()=>waiters.size};`)(
      FakeWorker,{createObjectURL:()=> 'blob:test',revokeObjectURL:()=>{}},Blob,
      id=>nodes[id] ||= {style:{}},
      fn=>{timers.set(++next,fn);return next;}, id=>timers.delete(id), ()=>{});
  return {api,workers,timers, expire(){const [id,fn]=timers.entries().next().value;timers.delete(id);fn();}};
}
test('Whisper: ready y result resuelven por id y limpian sus plazos', async()=>{
  const h=engineHarness(), p=h.api.call({type:'load'}), id=h.workers[0].sent.id;
  h.api.onMsg({id:id+10,type:'ready',backend:'CPU'});
  assert.equal(h.api.pending(),1);
  h.api.onMsg({id,type:'ready',backend:'CPU'});
  assert.equal((await p).backend,'CPU'); assert.equal(h.timers.size,0);
  const audio = new Float32Array([0.1,0.2]);
  const r=h.api.call({type:'run',audio},[audio.buffer]);
  assert.equal(h.workers[0].sent.audio,audio);
  h.api.onMsg({id:h.workers[0].sent.id,type:'result',text:'Frase ficticia.',backend:'CPU'});
  assert.equal((await r).text,'Frase ficticia.'); assert.equal(h.api.pending(),0);
});
test('Whisper: timeout termina Worker, rechaza pendientes y permite reintentar', async()=>{
  const h=engineHarness(), p=h.api.call({type:'load'});
  const rejected=assert.rejects(p,/Se agotó el tiempo/); h.expire(); await rejected;
  assert.ok(h.workers[0].terminated); assert.equal(h.api.pending(),0);
  const retry=h.api.call({type:'load'});
  assert.equal(h.workers.length,2);
  h.api.onMsg({id:h.workers[1].sent.id,type:'ready',backend:'CPU'}); await retry;
  assert.equal(h.timers.size,0);
});
test('Whisper: error, respuesta inválida y cancelación liberan solicitudes sin exponer contenido',async()=>{
  for(const mode of ['error','invalid','cancel','messageerror','crash']){
    const h=engineHarness(),p=h.api.call({type:'run'}),w=h.workers[0];
    const rejected=assert.rejects(p,e=>!e.message.includes('SECRETO'));
    if(mode==='cancel') h.api.failAll(Error('cancelado'));
    else if(mode==='messageerror') w.onmessageerror();
    else if(mode==='crash') w.onerror({preventDefault(){}});
    else h.api.onMsg({id:w.sent.id,type:mode==='error'?'error':'result',message:'SECRETO',text:42});
    await rejected;assert.equal(h.api.pending(),0);assert.equal(h.timers.size,0);
  }
});
test('audio: decodificación y remuestreo tienen plazos y tareas tardías no se mezclan',async()=>{
  const h=engineHarness();
  const p=h.api.withDeadline(new Promise(()=>{}),15,'lectura');
  const rejected=assert.rejects(p,/lectura/);h.expire();await rejected;
  assert.match(html,/withDeadline\(off.startRendering\(\), 15000/);
  assert.match(html,/withDeadline\(new Promise\(\(res, rej\) => ctx.decodeAudioData/);
  assert.match(html,/!dead && epoch === processingEpoch/);
});
test('reintento: conserva muestras originales antes de transferir copias y no exige guardado persistente',()=>{
  assert.match(html,/retainRetryAudio\(blocks, rate, info\);\n  if \(dead\) return/);
  assert.match(html,/copy = job.a.slice\(\)/);
  assert.match(html,/for \(const part of parts\) onSegment\(part.blocks, part.rate, part.info\)/);
  assert.ok(ids.includes('retryTranscription'));
});
test('compatibilidad: Firefox usa CPU y un hilo sin aislamiento; Android conserva aceleración automática',async()=>{
  const source=html.slice(html.indexOf('function workerBody(){'),html.indexOf('let engine = null'));
  for(const firefox of [true,false]){
    const messages=[],options=[];
    const wasm={numThreads:4,proxy:true};
    const lib={env:{backends:{onnx:{wasm}}},pipeline:async(task,model,opts)=>{options.push(opts);return async()=>({text:'Prueba ficticia.'});}};
    const self={postMessage:m=>messages.push(m)};
    const global={crossOriginIsolated:false,navigator:{userAgent:firefox?'Firefox/153.0':'Chrome/142 Android',gpu:{requestAdapter:async()=>({info:{}})}}};
    const code=source.replace("import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1')",'Promise.resolve(testLib)');
    new Function('self','globalThis','testLib',code+';workerBody();')(self,global,lib);
    await self.onmessage({data:{type:'load',id:1,model:'tiny',accel:'auto'}});
    assert.equal(messages.at(-1).type,'ready');
    assert.equal(messages.at(-1).backend,firefox?'CPU':'GPU');
    assert.equal(wasm.numThreads,firefox?1:4);assert.equal(wasm.proxy,!firefox);
    await self.onmessage({data:{type:'run',id:2,audio:new Float32Array(1600)}});
    assert.equal(messages.at(-1).text,'Prueba ficticia.');
  }
});
test('reintento en memoria: límite sin audio parcial y sin copiar el archivo guardado',()=>{
  const start=html.indexOf('let retryAudio = []'),end=html.indexOf('function refreshRetry()',start);
  const notes=[];
  const api=new Function('logDiag',html.slice(start,end)+`;let feeding=false;
    return {add:retainRetryAudio,clear:clearRetryAudio,state:()=>({length:retryAudio.length,unavailable:retryUnavailable})};`)(s=>notes.push(s));
  api.add([new Float32Array(4096)],48000,{});assert.equal(api.state().length,1);
  api.add([{byteLength:33*1024*1024}],48000,{});
  assert.deepEqual(api.state(),{length:0,unavailable:true});
  api.add([new Float32Array(4096)],48000,{});assert.equal(api.state().length,0);
  api.clear();api.add([new Float32Array(4096)],48000,{});assert.equal(api.state().length,1);
});
test('captura: plazos de AudioContext y Worklet, cierre del grabador antes de cortar pistas y MIME real',()=>{
  assert.match(html,/withDeadline\(ctx.resume\(\), 10000/);
  assert.match(html,/withDeadline\(ctx.audioWorklet.addModule\(url\), 15000/);
  const stop=html.slice(html.indexOf('function stopWhisper(){'),html.indexOf('function cancelProcessing(){'));
  assert.ok(stop.indexOf('mr.stop()')<stop.indexOf('stopCapture(cap)'));
  assert.match(html,/audioMime = mr.mimeType \|\| mime/);
});

// Adaptador nativo con eventos y temporizadores controlados: no requiere micrófono ni envía voz.
function nativeHarness(options = {}){
  const nodes = {}, timers = new Map(), instances = [], calls = [], state = {prepare:0,locked:false,status:''};
  let next=0;
  const node = id => nodes[id] ||= {textContent:'',value:'texto previo ficticio',disabled:false,hidden:false,checked:false,style:{},classList:{add(){},remove(){},toggle(){}}};
  const nativeRadio=node('nativeRadio'), whisperRadio=node('whisperRadio');
  class Recognition {
    constructor(){if(options.constructError)throw options.constructError;instances.push(this);}
    start(){calls.push(['start']);if(options.startError)throw options.startError;}
    stop(){calls.push(['stop']);if(options.stopError)throw options.stopError;}
    abort(){calls.push(['abort']);}
  }
  if(!options.noLocal) Object.defineProperty(Recognition.prototype,'processLocally',{value:false,writable:true});
  if(!options.noAvailable) Recognition.available = async opts => {
    calls.push(['available',opts]);
    if(options.availableError)throw options.availableError;
    if(options.hangAvailable)return new Promise(()=>{});
    return (options.states || {'es-AR':'available'})[opts.langs[0]] || 'unavailable';
  };
  Recognition.install = async opts => {calls.push(['install',opts]);return options.installed !== false;};
  const win={isSecureContext:options.secure!==false};
  if(!options.noAPI) win[options.prefixed?'webkitSpeechRecognition':'SpeechRecognition']=Recognition;
  let code=html.slice(html.indexOf('/* Dictado del navegador:'),html.indexOf('/* ---------- Whisper local:'));
  code=code.replace('\ncheckNativeAvailability();\n','\nconst initialNativeCheck = checkNativeAvailability();\n');
  const api=new Function('window','document','$','setTimeout','clearTimeout','confirm','state',`
    let recording=false,paused=false,tRun=0;
    const cleanText=t=>t,liveAnon=t=>t,applyDict=t=>t,D={};
    function appendMachine(t){$('text').value += t;}
    function prepareNew(){state.prepare++;$('text').value='';}
    function stopUI(){recording=false;paused=false;}
    function lockUI(on){state.locked=on;}
    function beginClock(){state.clockStarted=true;}
    function endClock(){state.clockStopped=true;}
    function refreshEditorFeedback(){} function updClock(){} function setCtl(){} function updateDockRecording(){}
    function setStatus(t){state.status=t;}
    ${code}
    return {initial:initialNativeCheck,check:checkNativeAvailability,start:startNative,stop:stopNative,pause:pauseNative,
      prepare:()=> $('nativePrepare').onclick(),
      get:()=>({ready:nativeReady,lang:nativeLang,recording,paused,phase:nativeSession?.phase}),note:()=> $('nativeNote').textContent};
  `)(win,{querySelector:s=>s.includes('whisper')?whisperRadio:nativeRadio},node,
      (fn,ms)=>{timers.set(++next,{fn,ms});return next;},id=>timers.delete(id),()=>options.confirm!==false,state);
  return {api,nodes,node,state,calls,instances,timers,nativeRadio,whisperRadio,
    expire(ms){for(const [id,t] of [...timers])if(t.ms===ms){timers.delete(id);t.fn();}}};
}
const nativeResult = (text,final=false) => Object.assign([{transcript:text}],{isFinal:final});
test('dictado: sin API, sin processLocally o sin consulta no habilita ni inicia micrófono',async()=>{
  for(const opts of [{noAPI:true},{noLocal:true},{noAvailable:true},{secure:false}]){
    const h=nativeHarness(opts);await h.api.initial;
    assert.equal(h.api.get().ready,false);assert.equal(h.nativeRadio.disabled,true);
    h.api.start();assert.equal(h.instances.length,0);assert.equal(h.state.prepare,0);
    assert.match(h.state.status,/No se puede iniciar/);
  }
});
test('dictado: consulta solo paquetes locales y prefiere español instalado sobre uno descargable',async()=>{
  const h=nativeHarness({prefixed:true,states:{'es-AR':'downloadable','es-ES':'available'}});await h.api.initial;
  assert.equal(h.api.get().lang,'es-ES');assert.equal(h.api.get().ready,true);assert.match(h.api.note(),/acento/);
  assert.equal(h.calls.filter(c=>c[0]==='install').length,0);
  for(const [,opts] of h.calls.filter(c=>c[0]==='available'))assert.equal(opts.processLocally,true);
});
test('dictado: downloadable/downloading/unavailable no habilitan Grabar; instalación requiere confirmación',async()=>{
  for(const status of ['downloadable','downloading','unavailable']){
    const h=nativeHarness({states:{'es-AR':status},confirm:false});await h.api.initial;
    assert.equal(h.api.get().ready,false);h.api.start();assert.equal(h.instances.length,0);
    await h.api.prepare();assert.equal(h.calls.filter(c=>c[0]==='install').length,0);
  }
  const h=nativeHarness({states:{'es-AR':'downloadable'},installed:false});await h.api.initial;await h.api.prepare();
  assert.equal(h.calls.find(c=>c[0]==='install')[1].processLocally,true);assert.match(h.api.note(),/install-false/);
});
test('dictado: errores de disponibilidad y consultas sin respuesta dejan códigos y opción bloqueada',async()=>{
  const h=nativeHarness({availableError:Object.assign(Error('política bloqueada'),{name:'SecurityError'})});await h.api.initial;
  assert.equal(h.api.get().ready,false);assert.match(h.api.note(),/SecurityError: política bloqueada/);
  const hung=nativeHarness({hangAvailable:true});hung.expire(8000);await hung.api.initial;
  assert.equal(hung.api.get().ready,false);assert.match(hung.api.note(),/TimeoutError/);assert.equal(hung.timers.size,0);
});
test('dictado: espera start real antes de borrar texto o indicar grabación, timeout libera controles',async()=>{
  const h=nativeHarness();await h.api.initial;h.api.start();
  assert.equal(h.api.get().recording,false);assert.equal(h.state.prepare,0);assert.equal(h.node('rec').disabled,true);
  h.expire(20000);assert.equal(h.api.get().phase,undefined);assert.equal(h.node('rec').disabled,false);
  assert.equal(h.state.locked,false);assert.match(h.state.status,/start-timeout/);assert.equal(h.state.prepare,0);
});
test('dictado: muestra provisional en Texto, confirma una sola vez y conserva el último resultado al detener',async()=>{
  const h=nativeHarness();await h.api.initial;h.api.start();const rec=h.instances[0];rec.onstart();
  assert.equal(rec.processLocally,true);assert.equal(rec.interimResults,true);assert.equal(h.state.prepare,1);
  rec.onresult({resultIndex:0,results:[nativeResult('Prueba ficticia')]});
  assert.match(h.node('nativeInterim').textContent,/Provisional: Prueba ficticia/);assert.equal(h.node('text').value,'');
  const finals=[nativeResult('Prueba ficticia.',true)];rec.onresult({resultIndex:0,results:finals});rec.onresult({resultIndex:0,results:finals});
  assert.equal(h.node('text').value,'Prueba ficticia.');
  h.api.stop();rec.onresult({resultIndex:1,results:[...finals,nativeResult(' Final.',true)]});rec.onend();
  assert.equal(h.node('text').value,'Prueba ficticia. Final.');assert.equal(h.api.get().recording,false);
  assert.equal(h.node('nativeInterim').textContent,'');assert.equal(h.timers.size,0);
  assert.doesNotMatch(h.node('nativeDiag').textContent,/Prueba ficticia|Final\./);
});
test('dictado: errores muestran código exacto, end no los tapa y eventos viejos no afectan la sesión siguiente',async()=>{
  for(const error of ['not-allowed','service-not-allowed','language-not-supported','audio-capture','no-speech','network','aborted']){
    const h=nativeHarness();await h.api.initial;h.api.start();const r=h.instances[0],end=r.onend;r.onstart();
    const late=r.onresult;r.onerror({error,message:'detalle técnico ficticio'});const message=h.state.status;end();
    assert.equal(h.state.status,message);assert.ok(message.includes(error));assert.ok(message.includes('detalle técnico ficticio'));
    assert.equal(h.state.locked,false);assert.equal(h.node('rec').disabled,false);
    if(['service-not-allowed','language-not-supported'].includes(error))assert.equal(h.nativeRadio.disabled,true);
    await h.api.check();h.api.start();h.instances[1].onstart();late({results:[nativeResult('evento viejo',true)]});
    assert.doesNotMatch(h.node('text').value,/evento viejo/);
  }
});
test('dictado: end inmediato o natural no reinicia en bucle y no borra el texto',async()=>{
  const h=nativeHarness();await h.api.initial;h.api.start();h.instances[0].onend();
  assert.match(h.state.status,/end-sin-start/);assert.equal(h.state.prepare,0);assert.equal(h.nativeRadio.disabled,true);
  assert.equal(h.calls.filter(c=>c[0]==='start').length,1);assert.equal(h.node('rec').disabled,false);
});
test('dictado: pausar espera end; reanudar crea sesión nueva sin borrar texto; stop tiene plazo',async()=>{
  const h=nativeHarness();await h.api.initial;h.api.start();const first=h.instances[0];first.onstart();
  first.onresult({results:[nativeResult('Inicio.',true)]});h.api.pause(true);
  h.api.pause(false);assert.equal(h.instances.length,1);first.onend();
  assert.equal(h.api.get().paused,true);h.api.pause(false);const second=h.instances[1];second.onstart();
  assert.equal(h.state.prepare,1);assert.equal(h.api.get().paused,false);assert.equal(h.node('text').value,'Inicio.');
  h.api.stop();h.expire(8000);assert.equal(h.api.get().recording,false);assert.match(h.state.status,/end-timeout/);
  assert.equal(h.node('text').value,'Inicio.');assert.equal(h.state.locked,false);
});
test('dictado: excepciones síncronas de start y stop informan el tipo y liberan controles',async()=>{
  const h=nativeHarness({startError:Object.assign(Error('modelo ausente'),{name:'NotSupportedError'})});await h.api.initial;h.api.start();
  assert.match(h.state.status,/NotSupportedError: modelo ausente/);assert.equal(h.node('rec').disabled,false);assert.equal(h.timers.size,0);assert.equal(h.nativeRadio.disabled,true);
  const s=nativeHarness({stopError:Object.assign(Error('ya terminó'),{name:'InvalidStateError'})});await s.api.initial;s.api.start();s.instances[0].onstart();s.api.stop();
  assert.match(s.state.status,/InvalidStateError: ya terminó/);assert.equal(s.node('rec').disabled,false);assert.equal(s.timers.size,0);
});

const feedback = new Function(html.match(/function editorFeedbackState\([\s\S]*?\n\}/)[0]+';return editorFeedbackState;')();
test('texto: Whisper explica la espera antes del primer fragmento, pausa y procesamiento posterior',()=>{
  assert.match(feedback(true,true,false,false,false).placeholder,/Grabando audio/);
  assert.match(feedback(true,true,false,false,false).placeholder,/después de detener/);
  assert.match(feedback(true,true,false,false,false).help,/no palabra por palabra/);
  assert.match(feedback(true,true,true,true,false).placeholder,/Grabación en pausa/);
  assert.match(feedback(true,false,false,true,false).placeholder,/Procesando el audio/);
  assert.match(feedback(true,false,false,false,true).placeholder,/se detuvo/);
  assert.equal(feedback(true,false,false,false,false).help,'');
});
test('texto: dictado nativo distingue inicio, provisional, pausa y cierre sin prometer resultados',()=>{
  assert.match(feedback(false,false,false,false,false,'starting').placeholder,/Esperando/);
  assert.match(feedback(false,true,false,false,false,'listening').placeholder,/puede mostrar texto provisional/);
  assert.match(feedback(false,true,false,false,false,'listening').help,/Solo las frases confirmadas/);
  assert.match(feedback(false,true,true,false,false,undefined).placeholder,/Dictado en pausa/);
  assert.match(feedback(false,true,false,false,false,'stopping').placeholder,/últimos resultados/);
});
test('texto: actualizar la explicación no escribe mensajes en la nota ni altera contenido confirmado o editado',()=>{
  const text={value:'Texto ficticio confirmado y editado.'},help={hidden:true,textContent:''};
  let placeholder='',writes=0;
  Object.defineProperty(text,'placeholder',{get:()=>placeholder,set:v=>{placeholder=v;writes++;}});
  Object.defineProperty(text,'value',{get:()=> 'Texto ficticio confirmado y editado.',set:()=>assert.fail('la interfaz intentó cambiar la nota')});
  const code=html.match(/function refreshEditorFeedback\(\)\{[\s\S]*?\n\}/)[0];
  const render=new Function('$','editorFeedbackState',`let recEng='whisper',recording=true,paused=false,busy=false,outstanding=0,feeding=false,modelLoading=false,dead=false,modelErr='',nativeSession=null;${code};return refreshEditorFeedback;`)(id=>id==='text'?text:help,feedback);
  render();render();assert.equal(writes,1);assert.match(placeholder,/Grabando/);assert.equal(help.hidden,false);
  assert.equal(text.value,'Texto ficticio confirmado y editado.');
  assert.match(html,/aria-describedby="transcriptionHelp convTarget"/);
});
test('aviso único: permanece durante la captura sin trabajos pendientes y no simula inferencia activa',()=>{
  const f=new Function(html.match(/function transcriptionDockState\([\s\S]*?\n\}/)[0]+';return transcriptionDockState;')();
  const gathering=f(true,true,false,0,false,false,false,null,true);
  assert.equal(gathering.active,true);assert.equal(gathering.processing,false);assert.equal(gathering.cancel,false);
  assert.match(gathering.parts,/Reuniendo audio/);assert.doesNotMatch(gathering.title,/en vivo/);
  const paused=f(true,true,false,0,false,false,false,null,true,true);
  assert.match(paused.title,/en pausa/);assert.match(paused.parts,/No hay fragmentos pendientes/);
  assert.equal(f(true,true,false,0,false,true,false,null,true).processing,true);
  assert.equal(f(true,false,true,1,false,false,false,null,true).processing,true);
  assert.equal(f(true,true,false,0,false,false,true,null,true).active,false);
  assert.match(html,/bar.hidden = !state.processing/);
});

const keyboardGeometry = new Function(html.match(/function keyboardLayoutState\([\s\S]*?\n\}/)[0]+';return keyboardLayoutState;')();
test('ergonomía: teclado distingue reducción visual, layout redimensionado y zoom',()=>{
  assert.deepEqual(keyboardGeometry(true,true,800,470,0,1,800),{open:true,inset:330});
  assert.deepEqual(keyboardGeometry(true,true,470,470,0,1,800),{open:true,inset:0});
  assert.deepEqual(keyboardGeometry(true,true,800,480,20,1,800),{open:true,inset:300});
  assert.deepEqual(keyboardGeometry(true,false,800,470,0,1,800),{open:false,inset:0});
  assert.deepEqual(keyboardGeometry(false,true,800,470,0,1,800),{open:false,inset:0});
  assert.deepEqual(keyboardGeometry(true,true,800,400,0,2,800),{open:false,inset:0});
  assert.deepEqual(keyboardGeometry(true,true,800,760,0,1,800),{open:false,inset:0});
});
test('ergonomía: tamaño se valida y solo modifica presentación, con fallback normal',()=>{
  const root={dataset:{}},select={value:''};
  const apply=new Function('document','$',html.match(/function applyTextSize\([\s\S]*?\n\}/)[0]+';return applyTextSize;')({documentElement:root},()=>select);
  for(const value of ['compact','normal','large']){apply(value);assert.equal(root.dataset.textSize,value);assert.equal(select.value,value);}
  for(const value of ['enorme',undefined,null,'<script>']){apply(value);assert.equal(root.dataset.textSize,'normal');}
  assert.match(html,/textSize:\$\('textSize'\)\.value/);
  assert.match(html,/applyTextSize\(c.textSize\)/);
});
test('ergonomía: barra de Texto conserva acceso a Grabar y controles de grabación existentes',()=>{
  assert.match(html,/body\[data-view="transcripcion"\] #studioDockStart\{display:flex\}/);
  assert.match(html,/startAction.addEventListener\('click',\(\)=>startButton.click\(\)\)/);
  assert.match(html,/\$\('studioDockStop'\)\.addEventListener\('click',\(\)=>\$\('rec'\)\.click\(\)\)/);
  assert.match(html,/\$\('studioDockPause'\)\.addEventListener\('click',\(\)=>\$\('pause'\)\.click\(\)\)/);
  assert.match(html,/dock.getBoundingClientRect\(\).height \+ state.inset \+ 24/);
  assert.match(html,/new ResizeObserver\(schedule\).observe\(dock\)/);
  assert.match(html,/interactive-widget=resizes-content/);
});
test('ergonomía: guardar tamaño conserva configuración anterior y comunica fallo de persistencia',()=>{
  const line=html.match(/const saveCfg = \(\) => \{[^\n]+/)[0];let saved=null;
  const values={textSize:'large',model:'Xenova/whisper-small',accel:'cpu',mic:'raw'};
  const make=storage=>new Function('localStorage','$','eng','CKEY','cfgLastBackup',line+';return saveCfg;')(storage,id=>({value:values[id],checked:true}),()=> 'whisper','notasvoz.gamma.cfg.v1',0);   // U16: saveCfg lee cfgLastBackup (fecha de la última copia)
  const save=make({setItem:(key,value)=>{saved={key,cfg:JSON.parse(value)};}});assert.equal(save(),true);
  assert.equal(saved.key,'notasvoz.gamma.cfg.v1');assert.equal(saved.cfg.textSize,'large');assert.equal(saved.cfg.model,values.model);assert.equal(saved.cfg.accel,'cpu');assert.equal(saved.cfg.saveAudio,true);
  assert.equal(make({setItem(){throw Error('storage blocked');}})(),false);
  assert.match(html,/El tamaño se aplicó, pero este navegador no permitió guardar el ajuste/);
});

/* ---- Seguridad (revisión de seguridad 15/11/2026; ver SEGURIDAD.md) ---- */
const csp = (html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
const cspDir = name => ((csp.split(';').map(s => s.trim()).find(s => s.startsWith(name + ' ')) || '').split(/\s+/).slice(1));
const ORIGENES_PERMITIDOS = ['https://cdn.jsdelivr.net', 'https://huggingface.co', 'https://*.huggingface.co', 'https://*.hf.co'];

test('seguridad: la política CSP existe, va antes de cualquier script y cierra lo innecesario', () => {
  assert.ok(csp, 'falta la política Content-Security-Policy');
  assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('<script'), 'la política debe ir antes de los scripts');
  assert.deepEqual(cspDir('default-src'), ["'none'"]);
  for (const d of ['object-src', 'base-uri', 'form-action', 'frame-src', 'manifest-src']) assert.deepEqual(cspDir(d), ["'none'"], d);
});

test('seguridad: la CSP no permite eval ni orígenes comodín ni http', () => {
  assert.ok(!csp.includes("'unsafe-eval'"), 'no se debe permitir unsafe-eval (sí wasm-unsafe-eval para el motor)');
  for (const d of ['script-src', 'connect-src', 'worker-src']) {
    const v = cspDir(d);
    assert.ok(v.length, 'falta ' + d);
    assert.ok(!v.includes('*') && !v.includes('http:') && !v.includes('https:'), d + ' demasiado abierto');
    v.filter(x => x.startsWith('http')).forEach(o => assert.ok(ORIGENES_PERMITIDOS.includes(o), 'origen no revisado en ' + d + ': ' + o));
  }
});

test('seguridad: todas las direcciones externas del código están revisadas', () => {
  const hosts = new Set([...html.replace(csp, '').matchAll(/https?:\/\/[^'"\s)<>]+/g)].map(m => new URL(m[0]).origin));
  const ok = new Set(['https://cdn.jsdelivr.net', 'http://www.w3.org', 'https://www.w3.org']);   // w3.org solo en espacios de nombres XML de la exportación Word
  for (const h of hosts) assert.ok(ok.has(h), 'dirección externa nueva sin revisar: ' + h + ' (documentar en SEGURIDAD.md y en la CSP)');
});

test('seguridad: el conversor MP3 se carga con huella SHA-384', () => {
  assert.match(html, /s\.integrity = 'sha384-[A-Za-z0-9+\/]{64}'/);
  assert.match(html, /s\.crossOrigin = 'anonymous'/);
  assert.ok(html.indexOf("s.integrity") > html.indexOf("lamejs@1.2.1/lame.min.js") && html.indexOf("s.integrity") < html.indexOf('document.head.append(s)'));
});

test('seguridad: no hay ejecución dinámica de código ni escritura directa de HTML con datos', () => {
  assert.ok(!/\beval\s*\(/.test(html), 'eval');
  assert.ok(!/\bnew Function\b/.test(html), 'new Function');
  assert.ok(!/document\.write\s*\(/.test(html), 'document.write');
  assert.ok(!/\.(outerHTML|insertAdjacentHTML)\b/.test(html), 'outerHTML/insertAdjacentHTML');
  // innerHTML solo con vacío o con textos fijos entre comillas simples; nunca con variables de notas o personas
  for (const m of html.matchAll(/\.innerHTML\s*=\s*([^;\n]+)/g)) assert.match(m[1].trim(), /^(''|'<div class="warn">[^']*'|'<div class="warn">'.*'<\/div>')/, 'innerHTML con contenido no fijo: ' + m[0]);
  assert.ok(!/\son(click|error|load)\s*=/.test(html.replace(/<script[\s\S]*?<\/script>/gi, '')), 'manejadores en línea dentro del HTML');
});

test('seguridad: no se envían datos a internet por código propio', () => {
  for (const f of ['fetch(', 'sendBeacon', 'XMLHttpRequest', 'WebSocket', 'EventSource']) assert.ok(!html.includes(f), 'uso de ' + f + ' (documentar en SEGURIDAD.md)');
});

test('seguridad: SEGURIDAD.md existe y las IA lo ven primero', () => {
  const rd = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
  const seg = rd('SEGURIDAD.md');
  for (const s of ['Qué está confirmado', 'Qué NO está confirmado', 'Cómo volver atrás']) assert.ok(seg.includes(s), 'falta sección «' + s + '» en SEGURIDAD.md');
  for (const f of ['AGENTS.md', 'CLAUDE.md', 'README.md']) assert.ok(rd(f).split('\n').slice(0, 12).join('\n').includes('SEGURIDAD.md'), f + ' debe mencionar SEGURIDAD.md en sus primeras líneas');
});


/* ---- DictaNota: cuarta pantalla Anonimizar, audios a la vista y aprendizaje automático ---- */
const learnPure = (() => {
  const m = html.match(/\/\*PURE-START\*\/([\s\S]*?)\/\*PURE-END\*\//);
  return new Function(m[1] + ';return {autoLearn, learnable, changedWindow, parseDict, applyDict};')();
})();

test('Anonimizar: pantalla propia en la barra fija, con explicación sencilla y ejemplo', () => {
  const section = html.match(/<section class="card c-anon" id="anonimizar">[\s\S]*?<\/section>\n\n<\/div>\n\n<\/main>/);
  assert.ok(section, 'falta la sección Anonimizar');
  for (const id of ['anon','undo','anonRes','susBox','hideX','keepX','peopleBox','pName','pRel','pCode','pAdd','pApply','pList','pFormPreview','anonPreview','privacidad'])
    assert.match(section[0], new RegExp('id="' + id + '"'), 'falta #' + id + ' dentro de Anonimizar');
  assert.match(section[0], /Cómo funciona la anonimización/);
  assert.match(section[0], /nombres de personas, teléfonos, correos o fechas/);
  assert.match(section[0], /\[Persona 1\]/);
  assert.match(section[0], /\[madre de P-001\]/);
  assert.match(section[0], /<details id="peopleBox" class="studio-patients">/);
  assert.match(section[0], /Si dejás el código vacío/);
  assert.match(html, /<a href="#anonimizar" id="studioAnonLink" data-delta-view="anonimizar"/);
  assert.match(html, /body:not\(\[data-view="anonimizar"\]\) \.c-anon\{display:none!important\}/);
  assert.match(html, /body\[data-view="anonimizar"\] #studioDockNotes\{display:none\}/);
  assert.doesNotMatch(html.match(/<section class="card c-edit" id="transcripcion">[\s\S]*?<\/section>/)[0], /id="anon"/, 'el botón ya no está duplicado en Texto');
});

test('Anonimizar: la vista previa y la lista de personas muestran cómo se escribe cada nombre', () => {
  // Revisión 22/11: la vista previa resalta las etiquetas con createElement/textContent, nunca con innerHTML.
  const prev = html.match(/function refreshAnonPreview\(\)\{[\s\S]*?\n\}/)[0];
  assert.match(prev, /box\.textContent = '';/); assert.match(prev, /chip\.className = 'anon-chip'; chip\.textContent = m\[0\]/); assert.match(prev, /createTextNode/);
  assert.doesNotMatch(prev, /innerHTML|insertAdjacentHTML|outerHTML/);
  const sum = html.match(/function anonSummary\([\s\S]*?\n\}/)[0]; assert.doesNotMatch(sum, /innerHTML|insertAdjacentHTML|outerHTML/);
  assert.match(html, /attributeFilter: \['data-view'\]/);
  assert.match(html, /function updatePersonPreview\(\)/);
  assert.match(html, /se va a escribir así: /);
  assert.match(html, /'Se escribe: ' \+ \(p\.code/);
});

test('U19: audios plegados en Espacio de Ajustes sin perder sus controles ni enlaces', () => {
  assert.match(html, /<details id="audioAdvanced">/);
  assert.match(html, /Audios guardados en este dispositivo \(avanzado\)/);
  assert.match(html, /<div class="abox" id="audioBox">/);
  assert.match(html, /id="audioEmpty"/);
  assert.match(html, /id="audioShortcut"/);
  assert.match(html, /advancedAudio\.append\(node\)/);
  assert.equal((html.match(/data-go-target="audioBox"/g) || []).length, 2, 'accesos desde Cuadernos y Ajustes');
  assert.match(html, /link\.dataset\.goTarget/);
  for (const id of ['aDown','aMp3','aTx','aDel','aUndoAudio','audioUndoRow']) assert.ok(ids.includes(id), 'falta #' + id);
  assert.match(html, /\$\('audioReady'\)\.hidden = !m; \$\('audioEmpty'\)\.hidden = !!m;/);
});

test('Aprendizaje: aprende errores de transcripción parecidos y nada más', () => {
  const {autoLearn} = learnPure;
  // una frase partida que se une en una palabra: regla sin contexto
  assert.deepEqual(autoLearn('Hablamos de la contra transferencia hoy.', 'Hablamos de la contratransferencia hoy.', []),
    [{a: 'contra transferencia', b: 'contratransferencia'}]);
  // error de ortografía: regla con la palabra anterior como contexto (no cambia el resto del texto)
  assert.deepEqual(autoLearn('Sentía tenes ganas.', 'Sentía tenés ganas.', []), [{a: 'sentía tenes', b: 'sentía tenés'}]);
  // no aprende: cambio de contenido, palabras cortas, nombres con mayúscula, cifras, agregados y borrados
  assert.deepEqual(autoLearn('Dijo que estaba cansado.', 'Mencionó que estaba cansado.', []), []);
  assert.deepEqual(autoLearn('Llegó con el niño.', 'Llegó con la niña.', []), []);
  assert.deepEqual(autoLearn('Vino Jose con su madre.', 'Vino José con su madre.', []), []);
  assert.deepEqual(autoLearn('Tiene 12 años.', 'Tiene 13 años.', []), []);
  assert.deepEqual(autoLearn('Una frase.', 'Una frase. Y otra agregada.', []), []);
  assert.deepEqual(autoLearn('Una frase larga.', 'Una larga.', []), []);
  assert.deepEqual(autoLearn('igual', 'igual', []), []);
});

test('Aprendizaje: no repite reglas conocidas y funciona en notas largas', () => {
  const {autoLearn, parseDict, applyDict} = learnPure;
  assert.deepEqual(autoLearn('Habló de la contra transferencia.', 'Habló de la contratransferencia.', ['contra transferencia']), []);
  const base = Array.from({length: 9000}, (_, i) => ['la', 'sesión', 'fue', 'tranquila', 'hoy', 'con', 'calma'][i % 7]).join(' ');
  const edited = base.replace('sesión', 'sesion');
  const t0 = Date.now();
  const found = autoLearn(base, edited, []);
  assert.ok(Date.now() - t0 < 1500, 'demasiado lento para una nota larga');
  assert.equal(found.length, 1);
  assert.match(found[0].b, /sesion$/);
  // lo aprendido se aplica a la próxima transcripción
  const rules = parseDict(autoLearn('Hablamos de la contra transferencia hoy.', 'Hablamos de la contratransferencia hoy.', []).map(r => r.a + ' => ' + r.b).join('\n'));
  assert.equal(applyDict('Hoy surgió la contra transferencia en la sesión.', rules), 'Hoy surgió la contratransferencia en la sesión.');
  assert.equal(applyDict('Una transferencia distinta.', rules), 'Una transferencia distinta.');
});

test('Aprendizaje: se activa solo al editar, se puede apagar y se puede deshacer', () => {
  assert.match(html, /id="learnAuto" checked/);
  assert.match(html, /\$\('text'\)\.addEventListener\('change', learnFromEdits\)/);
  assert.match(html, /\$\('text'\)\.addEventListener\('blur', learnFromEdits\)/);
  assert.match(html, /document\.addEventListener\('visibilitychange', \(\) => \{ if \(document\.hidden\) learnFromEdits\(\); \}\)/);
  assert.match(html, /function learnFromEdits\(\)\{\s+if \(!\$\('learnAuto'\)\.checked\) return;/);
  assert.match(html, /learnFromEdits\(\); \/\/ lo que corregiste antes se aprende ANTES de ocultar nombres/);
  assert.match(html, /function doClear\(auto\)\{[\s\S]*?learnFromEdits\(\);\s+stash\(\);/);
  assert.match(html, /if \(\$\('learnAuto'\)\.checked\) learnFromEdits\(\);\s+else \{ showSuggestions\(/);
  assert.match(html, /learnAuto:\$\('learnAuto'\)\.checked/);
  assert.match(html, /typeof c\.learnAuto === 'boolean'/);
  assert.match(html, /function forgetRule\(a, b\)/);
  assert.match(html, /u\.textContent = 'Deshacer'/);
  assert.match(html, /'# Aprendido de tus correcciones'/);
  // se reutiliza la clave de diccionario existente: no hay datos nuevos en el navegador
  // (la lista de claves protegidas de la protección cifrada la nombra a propósito y se excluye)
  const sinBoveda = html.replace(/\/\*VAULT-CORE-START\*\/[\s\S]*?\/\*VAULT-CORE-END\*\//, '');
  assert.equal((sinBoveda.match(/notasvoz\.gamma\.dict\.v1/g) || []).length, 1);
});

test('Aprendizaje: el aviso usa textContent y la corrección del diálogo también aprende', () => {
  const body = html.match(/function showLearned\([\s\S]*?\n\}/)[0];
  assert.doesNotMatch(body, /innerHTML/);
  assert.match(body, /t\.textContent = 'Aprendí tu corrección/);
  assert.match(html, /else \{ flash\('Corrección aplicada\.'\); learnFromEdits\(\); \}/);
});

test('Audio: pestaña renombrada, aviso verde de grabación completa y puntos de novedad', () => {
  const nav = html.match(/<nav class="studio-nav"[\s\S]*?<\/nav>/)[0];
  assert.match(nav, /data-delta-view="grabacion"[\s\S]*?<span>Dictar<\/span>/);
  assert.doesNotMatch(html, /<h2>Nueva nota<\/h2>/);
  assert.match(html, /<div class="dict-dest" id="dictDest">/);
  for (const id of ['audioDone','audioDoneText','audioDoneDownload','audioDoneClose','audioDoneWait','audioShortcut','loadAudioBtn','loadAudioFile'])
    assert.ok(ids.includes(id), 'falta #' + id);
  assert.doesNotMatch(html, /id="audioNotice"/, 'el aviso fijo de la barra se reemplazó por el de la pestaña Audio');
  assert.match(html, /\.audio-done\{background:var\(--success-bg\)/);
  assert.match(html, /\.then\(refreshAudioBox\)\.then\(\(\) => \{ if \(!audioSaveFailed && audioN\) showAudioDone\(\); \}\)/);
  assert.match(html, /mr\.start\(10000\); hideAudioDone\(\);/);
  // Revisión 22/11: Dictar empieza con Grabar; el destino va debajo, en una línea, y «Subir un audio» abre el mismo selector de archivo.
  assert.ok(html.indexOf('id="rec"') < html.indexOf('id="dictDest"'));
  assert.ok(html.indexOf('id="dictDest"') < html.indexOf('id="dictUpload"'));
  assert.ok(html.indexOf('id="rec"') < html.indexOf('id="audioShortcut"'));
  assert.match(html, /\$\('dictUpload'\)\.addEventListener\('click', \(\) => \$\('loadAudioFile'\)\.click\(\)\);/);
  // puntos de novedad
  assert.match(html, /a\[data-badge\]::after/);
  assert.match(html, /notifyNav\('grabacion', 'audio guardado'\)/);
  assert.match(html, /notifyNav\('transcripcion', 'transcripción lista'\)/);
  assert.match(html, /function clearNavBadge\(view\)/);
  assert.match(html, /attributeFilter: \['data-view'\]\}\);\nlet armTextBadge/);
});

test('Audio cargado: se transcribe y solo se guarda cifrado (E2), con límites claros', () => {
  assert.match(html, /async function transcribeBlob\(getBlob, ms, what, imported = false\)/);
  assert.match(html, /transcribeBlob\(\(\) => f, null, 'el audio cargado', true\)/);
  assert.match(html, /transcribeBlob\(\(\) => withDeadline\(audioGetBlob\(m\)/);
  const loader = html.match(/\$\('loadAudioFile'\)\.addEventListener\('change'[\s\S]*?\n\}\);/)[0];
  assert.doesNotMatch(loader, /audioPut|audioClear|IndexedDB|localStorage|anPut|anSave/, 'el cargador no guarda nada por su cuenta');
  assert.match(loader, /const guarda = anUsable\(\) && \$\('saveAudio'\)\.checked;/, 'el aviso dice si se guarda o no');
  assert.match(html, /if \(imported\) anSaveFile\(blob, ms\);/, 'solo se guarda a través del bloque cifrado');
  assert.match(html, /const LOAD_MAX_SEC = 90 \* 60;/);
  assert.doesNotMatch(html, /LOAD_MAX_BYTES|200 MB/, 'el tope viejo de 200 MB ya no aparece');
  assert.match(html, /si no, <b>no se guarda<\/b>/);
  assert.match(html, /accept="audio\/\*/);
});


test('seguridad: notas dañadas se filtran sin ejecutar contenido ni tocar almacenamiento', () => {
  const src = html.slice(html.indexOf('function validNotes('), html.indexOf('let notesReadWarning'));
  const run = value => new Script(src + ';validNotes(' + JSON.stringify(value) + ')').runInNewContext();
  for (const bad of [null, {}, [null], [2], [{text:'hola'}]]) assert.equal(run(bad).length, 0);
  const valid = run([{id:'a',text:'<script>ataque</script>',title:12,ts:1e99,tags:['bien',null,{}]}])[0];
  assert.equal(valid.text, '<script>ataque</script>');
  assert.equal(valid.title, ''); assert.equal(valid.ts, 0); assert.equal(valid.tags.length, 1);
  assert.match(html, /notesReadWarning && !confirm/);
});
test('seguridad: importación valida bytes y duración antes de decodificar', () => {
  const src = html.slice(html.indexOf('const IMPORT_MAX_BYTES'), html.indexOf('function inspectImport'));
  const validate = new Script(src + ';validateImport').runInNewContext();
  assert.doesNotThrow(() => validate(1024, 60));
  assert.doesNotThrow(() => validate(30*1024*1024, 900));
  for (const sec of [0, -1, Infinity, NaN, 901]) assert.throws(() => validate(1024, sec));
  assert.throws(() => validate(30*1024*1024+1, 1), /30 MB/, 'D4: 30 MB + 1 byte se rechaza antes de decodificar');
  assert.match(html, /if \(imported\) await inspectImport\(blob\); pcm = await decodePcm/);
  const probe = html.slice(html.indexOf('function inspectImport'), html.indexOf('async function decodePcm'));
  assert.match(probe, /URL.revokeObjectURL/); assert.match(probe, /clearTimeout/);
});

test('captura global: grabando, pausa y fin, con preferencia de conservación', () => {
  const source = html.match(/function updateDockRecording\(\)\{[\s\S]*?\n\}/)[0];
  const elements = Object.fromEntries(['studioDockCapture','studioDockNotes','studioDockMode','studioDockRetention','studioDockClock','studioDockPause','studioDockStop','pause','rec','saveAudio'].map(id=>[id,{classList:{toggle(){}},checked:true,disabled:false,dataset:{}}]));
  const context = { $:id=>elements[id], recording:true, paused:false, elapsedMs:()=>3000, fmtClock:()=> '00:03' };
  new Script(source+';updateDockRecording()').runInNewContext(context);
  assert.equal(elements.studioDockCapture.hidden,false);
  assert.equal(elements.studioDockMode.textContent,'Grabando');
  assert.equal(elements.studioDockRetention.textContent,'Guardando audio');
  context.paused=true; elements.saveAudio.checked=false;
  new Script(source+';updateDockRecording()').runInNewContext(context);
  assert.equal(elements.studioDockMode.textContent,'En pausa');
  assert.equal(elements.studioDockRetention.textContent,'Sin guardar audio');
  context.recording=false;
  new Script(source+';updateDockRecording()').runInNewContext(context);
  assert.equal(elements.studioDockCapture.hidden,true);
  assert.doesNotMatch(source,/setInterval|setTimeout/);
});

test('ayudas accesibles: controles únicos, destino debajo y advertencias fuera', () => {
  const buttons=[...html.matchAll(/<button[^>]*class="info-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="([^"]+)"/g)];
  assert.ok(buttons.length>=3);   // U19: sin la ayuda de «Conservar audio» en Dictar
  for(const m of buttons){
    assert.ok(ids.includes(m[1]));
    assert.ok(html.indexOf('id="'+m[1]+'"')>m.index);
    assert.match(m[0],/aria-label=/);
  }
  assert.match(html, /#studioDockCapture:not\(\[hidden\]\):not\(.paused\) .capture-dot\{animation:capturePulse/);
  assert.match(html, /prefers-reduced-motion:reduce\)\{#studioDockCapture .capture-dot\{animation:none!important/);
  assert.match(html, /id="loadAudioHint">[\s\S]*?30 MB y 15 minutos/);
  assert.match(html,/La anonimización es automática y puede fallar: revisá siempre/);
});

/* ---- Protección cifrada (seguridad-02, 16/11/2026). Datos ficticios. ---- */
const vaultCore = (() => {
  const m = html.match(/\/\*VAULT-CORE-START\*\/([\s\S]*?)\/\*VAULT-CORE-END\*\//);
  return new Function(m[1] + ';return {createVault, vaultParseHeader, vaultNewRecoveryCode, vaultNormalizeRecovery, VAULT_HEADER, VAULT_REC_PREFIX, VAULT_KEYS};')();
})();
const MARCA = 'PACIENTE-FICTICIO-7Q';
const memStorage = (init = {}) => {
  const m = new Map(Object.entries(init));
  return {getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); }, map: m};
};
const datosFicticios = () => ({
  'notasvoz.gamma.v1': JSON.stringify([{id: 'a1', title: 'Sesión ' + MARCA, text: 'Texto de ' + MARCA, ts: 1, tags: ['prueba']}]),
  'notasvoz.gamma.draft.v1': JSON.stringify({title: '', text: 'Borrador ' + MARCA, tags: [], cur: null, baseline: ''}),
  'notasvoz.gamma.people.v1': JSON.stringify([{names: [MARCA], code: 'P-001', rel: ''}]),
  'notasvoz.gamma.dict.v1': 'pasiente => paciente\n' + MARCA.toLowerCase() + ' => x',
  'notasvoz.gamma.cfg.v1': '{"textSize":"normal"}'
});
const sinMarca = st => [...st.map.values()].every(v => !v.includes(MARCA) && !v.includes(MARCA.toLowerCase()));
const tick = () => new Promise(r => setTimeout(r, 5));

test('cifrado: sin protección el almacén pasa directo a localStorage', () => {
  const st = memStorage(datosFicticios()), v = vaultCore.createVault(st);
  assert.equal(v.state, 'off');
  assert.equal(v.store.getItem('notasvoz.gamma.v1'), st.getItem('notasvoz.gamma.v1'));
  v.store.setItem('notasvoz.gamma.draft.v1', 'x'); assert.equal(st.getItem('notasvoz.gamma.draft.v1'), 'x');
});

test('cifrado: activar cifra todo lo protegido, borra las copias en claro y deja la configuración', async () => {
  const st = memStorage(datosFicticios()), v = vaultCore.createVault(st);
  const {recovery, dek} = await v.enable('frase de prueba larga');
  assert.match(recovery, /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){5}$/);
  assert.equal(dek.length, 32);
  assert.equal(v.state, 'open');
  assert.ok(sinMarca(st), 'quedó texto ficticio sin cifrar en el almacenamiento');
  for (const k of ['notasvoz.gamma.v1', 'notasvoz.gamma.draft.v1', 'notasvoz.gamma.people.v1', 'notasvoz.gamma.dict.v1']) {
    assert.equal(st.getItem(k), null, 'quedó en claro: ' + k);
    assert.ok(v.store.getItem(k).length > 0);
  }
  assert.equal(st.getItem('notasvoz.gamma.cfg.v1'), '{"textSize":"normal"}', 'la configuración no es sensible y no se toca');
  assert.ok(st.getItem(vaultCore.VAULT_HEADER));
  // Escrituras nuevas: se guardan cifradas, nunca en claro.
  v.store.setItem('notasvoz.gamma.undo.v1', JSON.stringify({text: 'Deshacer ' + MARCA}));
  await tick(); await v.flush();
  assert.ok(sinMarca(st));
  assert.ok(st.getItem(vaultCore.VAULT_REC_PREFIX + 'deshacer'));
});

test('cifrado: bloqueada no lee ni escribe; contraseña incorrecta rechazada; la correcta abre', async () => {
  const st = memStorage(datosFicticios()), v1 = vaultCore.createVault(st);
  await v1.enable('frase de prueba larga');
  const antes = new Map(st.map);
  const v = vaultCore.createVault(st);   // como al recargar la página
  assert.equal(v.state, 'locked');
  assert.equal(v.store.getItem('notasvoz.gamma.v1'), null);
  v.store.setItem('notasvoz.gamma.v1', '[]'); v.store.removeItem('notasvoz.gamma.dict.v1'); await tick();
  assert.deepEqual(st.map, antes, 'bloqueada no debe modificar nada');
  await assert.rejects(v.unlockPassword('otra contraseña'), e => e.name === 'OperationError');
  assert.equal(v.state, 'locked');
  await v.unlockPassword('frase de prueba larga');
  assert.equal(v.state, 'open');
  assert.match(v.store.getItem('notasvoz.gamma.v1'), new RegExp(MARCA));
  assert.deepEqual(v.damaged, []); assert.deepEqual(v.leftovers, []);
});

test('cifrado: el código de recuperación abre y reemplaza la contraseña', async () => {
  const st = memStorage(datosFicticios()), v1 = vaultCore.createVault(st);
  const {recovery} = await v1.enable('frase de prueba larga');
  const v = vaultCore.createVault(st);
  await assert.rejects(v.unlockRecovery('0000-0000-0000-0000-0000-0000', 'nueva frase segura'));
  await v.unlockRecovery(recovery.toLowerCase().replace(/-/g, ' '), 'nueva frase segura');
  assert.equal(v.state, 'open');
  const v2 = vaultCore.createVault(st);
  await assert.rejects(v2.unlockPassword('frase de prueba larga'));
  await v2.unlockPassword('nueva frase segura');
  assert.match(v2.store.getItem('notasvoz.gamma.draft.v1'), new RegExp(MARCA));
  assert.equal(vaultCore.vaultNormalizeRecovery('abio-l0o1'), 'AB10100' + '1');
});

test('cifrado: huella (salida PRF simulada) envuelve la misma clave; otra salida no abre', async () => {
  const st = memStorage(datosFicticios()), v1 = vaultCore.createVault(st);
  const {dek} = await v1.enable('frase de prueba larga');
  const prf = crypto.getRandomValues(new Uint8Array(32));
  await v1.addBio(dek, new Uint8Array([1, 2, 3]), new Uint8Array(32), prf);
  assert.ok(v1.header.bio);
  const v = vaultCore.createVault(st);
  await assert.rejects(v.unlockBio(crypto.getRandomValues(new Uint8Array(32))));
  await v.unlockBio(prf);
  assert.match(v.store.getItem('notasvoz.gamma.people.v1'), new RegExp(MARCA));
  v.removeBio(); assert.equal(vaultCore.createVault(st).header.bio, null);
});

test('cifrado: un registro alterado o intercambiado no se usa ni se borra', async () => {
  const st = memStorage(datosFicticios()), v1 = vaultCore.createVault(st);
  await v1.enable('frase de prueba larga');
  const P = vaultCore.VAULT_REC_PREFIX;
  const notas = JSON.parse(st.getItem(P + 'notas'));
  notas.box.ct = notas.box.ct.slice(0, -4) + (notas.box.ct.endsWith('AAA=') ? 'BBB=' : 'AAA=');
  st.setItem(P + 'notas', JSON.stringify(notas));
  // intercambio: el registro de personas puesto en lugar del diccionario (con su nombre cambiado)
  const pers = JSON.parse(st.getItem(P + 'personas')); pers.n = 'diccionario'; st.setItem(P + 'diccionario', JSON.stringify(pers));
  const v = vaultCore.createVault(st);
  await v.unlockPassword('frase de prueba larga');
  assert.deepEqual(v.damaged.sort(), ['diccionario', 'notas']);
  assert.equal(v.store.getItem('notasvoz.gamma.v1'), null);
  assert.equal([...st.map.keys()].filter(k => k.includes('.danado.')).length, 2, 'los registros dañados se apartan intactos');
  assert.match(v.store.getItem('notasvoz.gamma.people.v1'), new RegExp(MARCA));
});

test('cifrado: copias en claro que quedaron se cifran si faltan y se conservan si son distintas', async () => {
  const st = memStorage(datosFicticios()), v1 = vaultCore.createVault(st);
  await v1.enable('frase de prueba larga');
  st.setItem('notasvoz.gamma.undo.v1', '{"text":"' + MARCA + '"}');       // faltaba cifrada
  st.setItem('notasvoz.gamma.draft.v1', '{"text":"otra versión"}');        // distinta de la cifrada
  const v = vaultCore.createVault(st);
  await v.unlockPassword('frase de prueba larga');
  assert.equal(st.getItem('notasvoz.gamma.undo.v1'), null);
  assert.match(v.store.getItem('notasvoz.gamma.undo.v1'), new RegExp(MARCA));
  assert.deepEqual(v.leftovers, ['borrador']);
  assert.equal(st.getItem('notasvoz.gamma.draft.v1'), '{"text":"otra versión"}', 'no se borra lo que no coincide');
});

test('cifrado: quitar la protección exige la contraseña y deja los datos como antes', async () => {
  const datos = datosFicticios(), st = memStorage(datos), v = vaultCore.createVault(st);
  await v.enable('frase de prueba larga');
  await assert.rejects(v.disable('mal'));
  assert.equal(v.state, 'open');
  await v.disable('frase de prueba larga');
  assert.equal(v.state, 'off');
  for (const [k, val] of Object.entries(datos)) assert.equal(st.getItem(k), val);
  assert.ok([...st.map.keys()].every(k => !k.startsWith(vaultCore.VAULT_HEADER)));
});

test('cifrado: si quitar la protección falla a mitad de camino, no queda texto en claro', async () => {
  const datos = datosFicticios(), st = memStorage(datos), v = vaultCore.createVault(st);
  await v.enable('frase de prueba larga');
  const claves = Object.keys(vaultCore.VAULT_KEYS);
  assert.ok(claves.every(k => st.getItem(k) === null), 'con la protección activa no hay claves en claro');
  // Almacenamiento que se llena en la segunda escritura en claro
  const setOriginal = st.setItem.bind(st); let escrituras = 0;
  st.setItem = (k, val) => { if (claves.includes(k) && ++escrituras === 2) throw new Error('QuotaExceededError'); return setOriginal(k, val); };
  await assert.rejects(v.disable('frase de prueba larga'), /QuotaExceededError/);
  st.setItem = setOriginal;
  assert.equal(v.state, 'open', 'la protección sigue activa');
  assert.ok(claves.every(k => st.getItem(k) === null), 'no quedó ninguna clave en claro');
  assert.ok(sinMarca(st), 'el texto ficticio no aparece legible en ningún lado');
  assert.ok(st.getItem(vaultCore.VAULT_HEADER));
  await v.disable('frase de prueba larga');
  for (const [k, val] of Object.entries(datos)) assert.equal(st.getItem(k), val);
});

test('cifrado: cabecera dañada o con parámetros abusivos deja todo bloqueado, sin caer a texto en claro', () => {
  const st = memStorage({...datosFicticios()});
  st.setItem(vaultCore.VAULT_HEADER, JSON.stringify({v: 1, id: 'AAAAAAAAAAAAAAAAAAAAAA==', pw: {kdf: 'PBKDF2-SHA256', it: 999999999, salt: 'AA==', box: {iv: 'AA==', ct: 'AA=='}}, rec: {kdf: 'HKDF-SHA256', salt: 'AA==', box: {iv: 'AA==', ct: 'AA=='}}, bio: null}));
  const v = vaultCore.createVault(st);
  assert.equal(v.state, 'broken');
  assert.equal(v.store.getItem('notasvoz.gamma.v1'), null);
  v.store.setItem('notasvoz.gamma.v1', '[]');
  assert.notEqual(st.getItem('notasvoz.gamma.v1'), '[]');
  assert.throws(() => vaultCore.vaultParseHeader('{"v":2}'));
});

test('cifrado: la app lee y escribe lo protegido solo a través del almacén cifrado', () => {
  const main = html.replace(/\/\*VAULT-CORE-START\*\/[\s\S]*?\/\*VAULT-CORE-END\*\//, '');
  assert.doesNotMatch(main, /localStorage\.(getItem|setItem|removeItem)\(\s*(KEY|DRAFT|UNDO|PKEY|DKEY)\b/);
  assert.match(html, /vaultWhenReady\(\(\) => \{ loadNotes\(\); loadDict\(\); loadPeople\(\);[^\n]*restoreDraft\(\);/);
  assert.match(html, /vaultSetHooks\(\(\) => recording \|\| busy \|\| outstanding > 0 \|\| feeding \|\| anBusyN > 0 \|\| copiaBusyN > 0 \|\| k2ReplaceActive, saveDraft\);/, 'cifrar un archivo y crear o comprobar una copia cuentan como uso');
  assert.match(html, /const VAULT_IDLE_MS = 15 \* 60 \* 1000;/);
  assert.match(html, /const VAULT_PBKDF2_IT = 600000;/);
  assert.ok(html.indexOf('const vault = createVault(localStorage)') < html.indexOf('function loadNotes()'), 'el almacén cifrado se crea antes que la app');
  for (const id of ['vaultLock', 'vaultLockForm', 'vaultBioUnlock', 'vaultRecoverForm', 'vaultEnable', 'vaultSetup', 'vaultRecoveryBox', 'vaultOn', 'topLock']) assert.ok(ids.includes(id), 'falta #' + id);
});

test('cifrado: un código de recuperación nuevo reemplaza al anterior (pide la contraseña)', async () => {
  const st = memStorage(datosFicticios()), v1 = vaultCore.createVault(st);
  const {recovery: viejo} = await v1.enable('frase de prueba larga');
  await assert.rejects(v1.newRecovery('mal'));
  const nuevo = await v1.newRecovery('frase de prueba larga');
  assert.notEqual(nuevo, viejo);
  await assert.rejects(vaultCore.createVault(st).unlockRecovery(viejo, 'otra frase segura'));
  const v = vaultCore.createVault(st);
  await v.unlockRecovery(nuevo, 'otra frase segura');
  assert.match(v.store.getItem('notasvoz.gamma.v1'), new RegExp(MARCA));
  assert.ok(html.includes('id="vaultRecoveryCopy"') && html.includes('id="vaultNewCode"'));
  assert.doesNotMatch(html, /\.vault-code\{[^}]*user-select:all/, 'el código tiene que poder seleccionarse en Android');
});

/* ---- Rediseño conversacional · modelo y guardado (fases 1 y 2, 16/11/2026). Datos ficticios. ---- */
const convSrc = (html.match(/\/\*CONV-START\*\/([\s\S]*?)\/\*CONV-END\*\//) || [])[1];
const conv = new Function(convSrc + ';return {convDeleteEntry, convDeleteConversation, convSummaries, CONV_KEY, convEmpty, convStamp, convValid, convEntriesOf, convAddEntry, convEditText, convRename, convMoveEntry, convMoveEntries, convMoveAll, convUndoMove, convIsEmpty, convCopyText, convCheckWrite, convFromLegacy, convToLegacyNotes, convMakeStore, convSetAudio, convAudioInUse, convRelative, convPreview};')();
const BA = 180; // getTimezoneOffset() de Buenos Aires
const T1042 = Date.UTC(2026, 10, 16, 13, 42); // 16/11/2026 10:42 en Argentina
const seqIds = () => { let n = 0; return () => 'id' + (++n); };
const guardar = (d, extra, ids) => conv.convAddEntry(d, {kind: 'audio', tzOffsetMin: BA, ...extra}, {newId: ids || seqIds()});

test('conversaciones: el bloque está aislado y la pantalla Notas lo usa con el almacén cifrado', () => {
  assert.ok(convSrc, 'falta el bloque CONV');
  assert.doesNotMatch(convSrc, /localStorage|vaultStore|indexedDB|innerHTML|document\.|\beval\b|new Function|fetch\(/);
  assert.match(html, /const convStore = convMakeStore\(vaultStore, \(\) => vault\.state === 'off' \|\| vault\.state === 'open'\);/);
  assert.match(html, /renderList\(\); convInit\(\); restoreDraft\(\);/, 'se carga y migra al desbloquear, antes de recuperar el borrador');
  assert.ok(!/localStorage\.(get|set|remove)Item\(CONV_KEY|localStorage\.(get|set|remove)Item\('notasvoz\.dictanota/.test(html), 'los cuadernos no se leen por fuera del almacén cifrado');
  const ui = html.slice(html.indexOf('/* ---------- Notas en cuadernos'), html.indexOf('function convInit()'));
  assert.ok(ui.length > 1000);
  assert.doesNotMatch(ui, /\.innerHTML = (?!'')/, 'los textos del usuario van con textContent');
  assert.doesNotMatch(ui, /insertAdjacentHTML|outerHTML|\beval\b/);
});

test('Notas: la captura global va a cuaderno nuevo y dentro de un cuaderno abierto se agrega ahí', () => {
  assert.match(html, /function prepareNew\(\)\{[\s\S]*?convStartPending\(true\);\n\}/);
  // U7 + U12: dentro de un cuaderno, ese cuaderno; desde Dictar, el destino que eligió el usuario (por defecto, uno nuevo).
  assert.match(html, /const fromDictar = \(fromAudio && document\.body\.dataset\.view !== 'transcripcion'\) \|\| \(convDictarArmed && !convOpenId\);\n\s*convTargetId = fromDictar \? \(dictDestId && convHas\(dictDestId\) \? dictDestId : null\) : convOpenId;/);
  assert.match(html, /<span>Cuadernos<\/span><\/a>/);
  for (const id of ['convPanel', 'convList', 'convBubbles', 'convTarget', 'convDiscard', 'convCancelEdit', 'convMoveDialog', 'convMoveAllBtn', 'convCopyAll', 'convUndo', 'convRename']) assert.ok(ids.includes(id), 'falta #' + id);
});

test('Notas: descartar pide confirmación y la recuperación automática guarda el estado del mensaje', () => {
  assert.match(html, /'¿Descartar esta nota sin guardar\?'\)\) return;/);
  assert.match(html, /'¿Descartar esta nota sin guardar\? También se borra su audio\.'/);
  assert.match(html, /const snap = \(\) => JSON\.stringify\(\{[^}]*conv: \{open: convOpenId, target: convTargetId, targetSet: convTargetSet, editing: convEditingId/);
  assert.match(html, /Se recuperó un mensaje sin guardar\. Tocá Guardar o Descartar\./);
  assert.match(html, /'¿Borrar esta nota y su audio\? No se puede deshacer\.' : '¿Borrar esta nota\? No se puede deshacer\.'/);
});

test('conversaciones: la clave nueva queda protegida por el cifrado', () => {
  assert.equal(conv.CONV_KEY, 'notasvoz.dictanota.v2');
  assert.match(html, /'notasvoz\.dictanota\.v2': 'conversaciones'/);
  const vk = new Function((html.match(/const VAULT_KEYS = \{[\s\S]*?\};/) || [''])[0] + ';return VAULT_KEYS;')();
  assert.equal(vk['notasvoz.dictanota.v2'], 'conversaciones');
  for (const k of ['notasvoz.gamma.v1', 'notasvoz.gamma.draft.v1', 'notasvoz.gamma.undo.v1', 'notasvoz.gamma.people.v1', 'notasvoz.gamma.dict.v1']) assert.ok(vk[k], 'se conserva ' + k);
});

test('conversaciones: el sello es la hora de guardado y titulal cuaderno nuevo', () => {
  assert.equal(conv.convStamp(T1042, BA), '16/11/2026 · 10:42');
  assert.equal(conv.convStamp(Date.UTC(2026, 0, 1, 2, 5), BA), '31/12/2025 · 23:05');
  const r = guardar(conv.convEmpty(), {savedAt: T1042, recordedAt: T1042 - 300000, text: 'Comprar yerba.'});
  assert.equal(r.created, true);
  assert.equal(r.conversation.title, '16/11/2026 · 10:42', 'título = hora de guardado, no de inicio de grabación');
  assert.equal(r.entry.savedAt, T1042);
  assert.equal(r.entry.recordedAt, T1042 - 300000);
  assert.throws(() => guardar(conv.convEmpty(), {text: 'x'}), /guardado/);
});

test('conversaciones: sin texto ni audio no se crea ningún cuaderno', () => {
  const d = conv.convEmpty();
  for (const text of ['', '   \n ']) {
    const r = guardar(d, {savedAt: T1042, text});
    assert.equal(r.entry, null); assert.equal(r.data, d);
  }
  assert.equal(guardar(d, {savedAt: T1042, text: '', audioId: 'a1'}).created, true, 'un audio guardado sin transcribir sí creal cuaderno');
  assert.throws(() => conv.convAddEntry(d, {kind: 'heredado', savedAt: T1042, text: 'x'}), /Tipo/);
});

test('conversaciones: dos guardados globales son dos cuadernos; dentro de un cuaderno se agrega ahí', () => {
  const ids = seqIds();
  let r = guardar(conv.convEmpty(), {savedAt: T1042, text: 'Uno.'}, ids);
  const primera = r.conversation.id;
  r = guardar(r.data, {savedAt: T1042 + 120000, text: 'Dos.'}, ids);
  assert.notEqual(r.conversation.id, primera);
  r = conv.convAddEntry(r.data, {conversationId: primera, kind: 'texto', savedAt: T1042 + 7 * 864e5, tzOffsetMin: BA, text: 'Tres, otro lunes.'}, {newId: ids});
  assert.equal(r.created, false);
  assert.equal(r.data.conversations.length, 2);
  assert.deepEqual(conv.convEntriesOf(r.data, primera).map(e => conv.convStamp(e.savedAt, e.tzOffsetMin)), ['16/11/2026 · 10:42', '23/11/2026 · 10:42']);
  assert.throws(() => conv.convAddEntry(r.data, {conversationId: 'no-existe', kind: 'texto', savedAt: T1042, text: 'x'}), /no existe/);
});

test('conversaciones: editar, renombrar y mover nunca cambian el sello', () => {
  const ids = seqIds();
  let r = guardar(conv.convEmpty(), {savedAt: T1042, text: 'Pasiente ficticio.', audioId: 'aud-1', durationMs: 48000}, ids);
  const e = r.entry, origen = r.conversation.id;
  r = conv.convAddEntry(r.data, {kind: 'texto', savedAt: T1042 + 9e5, tzOffsetMin: BA, text: 'Lista ficticia.'}, {newId: ids});
  const destino = r.conversation.id, antes = r.data;
  let d = conv.convEditText(antes, e.id, 'Paciente ficticio.', T1042 + 1e6);
  d = conv.convRename(d, destino, 'Supermercado');
  const m = conv.convMoveEntry(d, e.id, destino, T1042 + 2e6);
  const movido = m.data.entries.find(x => x.id === e.id);
  assert.deepEqual([movido.savedAt, movido.tzOffsetMin, movido.text, movido.textEditedAt, movido.audioId, movido.durationMs, movido.conversationId],
    [T1042, BA, 'Paciente ficticio.', T1042 + 1e6, 'aud-1', 48000, destino]);
  assert.equal(m.data.entries.length, antes.entries.length, 'mover no duplica');
  assert.ok(conv.convIsEmpty(m.data, origen) && m.data.conversations.some(c => c.id === origen), 'el cuaderno de origen queda vacía pero no se borra solo');
  assert.equal(conv.convCheckWrite(antes, m.data), '');
  assert.equal(conv.convUndoMove(m.data, m.undo).entries.find(x => x.id === e.id).conversationId, origen);
  assert.throws(() => conv.convMoveEntry(d, e.id, 'no-existe'), /no existe/);
  assert.throws(() => conv.convRename(d, destino, '   '), /vacío/);
});

test('conversaciones: pasar todo un cuaderno a otra conserva sellos y se puede deshacer', () => {
  const ids = seqIds();
  let r = guardar(conv.convEmpty(), {savedAt: T1042, text: 'Sesión ficticia 1.'}, ids);
  const hojaA = r.conversation.id;
  r = conv.convAddEntry(r.data, {conversationId: hojaA, kind: 'audio', savedAt: T1042 + 7 * 864e5, tzOffsetMin: BA, text: 'Sesión ficticia 2.'}, {newId: ids});
  r = guardar(r.data, {savedAt: T1042 + 1e5, text: 'Otro cuaderno.'}, ids);
  const hojaB = r.conversation.id, antes = r.data;
  const m = conv.convMoveAll(antes, hojaA, hojaB, T1042 + 9e8);
  assert.equal(conv.convEntriesOf(m.data, hojaB).length, 3);
  assert.ok(conv.convIsEmpty(m.data, hojaA));
  assert.equal(conv.convCheckWrite(antes, m.data), '');
  assert.deepEqual(conv.convEntriesOf(m.data, hojaB).map(e => e.text), ['Sesión ficticia 1.', 'Otro cuaderno.', 'Sesión ficticia 2.'], 'quedan ordenadas por hora de guardado');
  const vuelta = conv.convUndoMove(m.data, m.undo);
  assert.equal(conv.convEntriesOf(vuelta, hojaA).length, 2);
  assert.equal(conv.convEntriesOf(vuelta, hojaB).length, 1);
  assert.throws(() => conv.convMoveAll(antes, hojaA, hojaA), /otro cuaderno/);
});

test('conversaciones: copiar todo un cuaderno lleva título, fecha de cada mensaje y texto', () => {
  const ids = seqIds();
  let r = guardar(conv.convEmpty(), {savedAt: T1042, text: '  Primera sesión ficticia.  '}, ids);
  const h = r.conversation.id;
  r = conv.convAddEntry(r.data, {conversationId: h, kind: 'audio', savedAt: T1042 + 7 * 864e5, tzOffsetMin: BA, text: '', audioId: 'a2'}, {newId: ids});
  r = conv.convAddEntry(r.data, {conversationId: h, kind: 'texto', savedAt: T1042 + 14 * 864e5, tzOffsetMin: BA, text: 'Tercera.'}, {newId: ids});
  const d = conv.convRename(r.data, h, 'Paciente ficticio P-001');
  assert.equal(conv.convCopyText(d, h), 'Paciente ficticio P-001\n\n16/11/2026 · 10:42\nPrimera sesión ficticia.\n\n30/11/2026 · 10:42\nTercera.');
});

test('conversaciones: el control de escritura rechaza cambiar sellos o duplicar mensajes', () => {
  const r = guardar(conv.convEmpty(), {savedAt: T1042, recordedAt: T1042 - 1, text: 'Hola.'});
  const cambiar = f => ({...r.data, entries: r.data.entries.map(e => ({...e, ...f(e)}))});
  assert.match(conv.convCheckWrite(r.data, cambiar(e => ({savedAt: e.savedAt + 1}))), /fecha y hora/);
  assert.match(conv.convCheckWrite(r.data, cambiar(e => ({recordedAt: null}))), /fecha y hora/);
  assert.match(conv.convCheckWrite(r.data, cambiar(() => ({tzOffsetMin: 0}))), /zona/);
  assert.match(conv.convCheckWrite(r.data, {...r.data, entries: r.data.entries.concat(r.data.entries)}), /duplicado/);
});

test('conversaciones: lectura defensiva descarta lo dañado sin ejecutar contenido', () => {
  const raw = {schema: 2, conversations: [{id: 'c1', title: '<img src=x onerror=alert(1)>', createdAt: T1042, tags: ['a', 3]}, {id: 'c1', title: 'repetida'}, {title: 'sin id'}],
    entries: [{id: 'e1', conversationId: 'c1', kind: 'audio', savedAt: T1042, text: 'ok'},
      {id: 'e2', conversationId: 'c1', kind: 'audio', savedAt: 'ayer', text: 'fecha mala'},
      {id: 'e3', conversationId: 'cX', kind: 'texto', savedAt: T1042, text: 'sin cuaderno'},
      {id: 'e4', conversationId: 'c1', kind: 'heredado', savedAt: null, text: 'vieja'},
      {id: 'e5', conversationId: 'c1', kind: 'raro', savedAt: T1042, text: 'x'}]};
  const v = conv.convValid(raw);
  assert.equal(v.ok, false); assert.equal(v.dropped, 5);
  assert.deepEqual(v.data.entries.map(e => e.id), ['e1', 'e4']);
  assert.deepEqual(v.data.conversations[0].tags, ['a']);
  assert.equal(conv.convValid(null).ok, true);
  assert.equal(conv.convValid({schema: 1}).ok, false);
  assert.deepEqual(conv.convEntriesOf(v.data, 'c1').map(e => e.id), ['e4', 'e1'], 'lo heredado sin fecha va primero');
});

test('conversaciones: notas viejas → una burbuja por nota, con su fecha de guardado, sin duplicar', () => {
  const viejas = [{id: 'n1', title: 'Paciente ficticio', text: 'Sesión del lunes.', ts: T1042, tags: ['clínica']},
    {id: 'n2', title: '', text: 'Sin título.', ts: T1042 + 864e5, tags: []},
    {id: 'n3', title: 'Vacía', text: '   ', ts: T1042, tags: []},
    {id: 'n4', title: 'Sin fecha', text: 'Antigua.', ts: 0, tags: []}];
  const copia = JSON.stringify(viejas);
  const r = conv.convFromLegacy(conv.convEmpty(), viejas);
  assert.equal(JSON.stringify(viejas), copia, 'no modifica las notas viejas');
  assert.equal(r.added, 3);
  assert.deepEqual(r.data.conversations.map(c => [c.id, c.title, c.tags]), [['legacy:n1', 'Paciente ficticio', ['clínica']], ['legacy:n2', conv.convStamp(T1042 + 864e5), []], ['legacy:n4', 'Sin fecha', []]]);
  assert.deepEqual(r.data.entries.map(e => [e.conversationId, e.kind, e.savedAt, e.text]),
    [['legacy:n1', 'heredado', T1042, 'Sesión del lunes.'], ['legacy:n2', 'heredado', T1042 + 864e5, 'Sin título.'], ['legacy:n4', 'heredado', null, 'Antigua.']]);
  assert.equal(conv.convFromLegacy(r.data, viejas).added, 0, 'repetir la migración no duplica');
  assert.ok(conv.convValid(JSON.parse(JSON.stringify(r.data))).ok, 'el resultado se puede releer');
});

test('conversaciones: volver al formato anterior produce notas planas válidas', () => {
  const ids = seqIds();
  let r = guardar(conv.convEmpty(), {savedAt: T1042, text: 'Uno.'}, ids);
  const c = r.conversation.id;
  r = conv.convAddEntry(r.data, {conversationId: c, kind: 'texto', savedAt: T1042 + 6e4, tzOffsetMin: BA, text: 'Dos.'}, {newId: ids});
  r = guardar(r.data, {savedAt: T1042 + 7e4, text: '', audioId: 'a9'}, ids);
  const notas = conv.convToLegacyNotes(r.data);
  assert.deepEqual(notas, [{id: c, title: '16/11/2026 · 10:42', text: 'Uno.\n\nDos.', ts: T1042 + 6e4, tags: []}]);
});

test('conversaciones: guardado verificado; bloqueada no lee ni escribe; dañado no se sobrescribe', () => {
  const st = memStorage(); let abierta = true;
  const s = conv.convMakeStore(st, () => abierta);
  assert.equal(s.save(conv.convEmpty()).ok, false, 'sin cargar no guarda');
  assert.equal(s.load().ok, true);
  const r = guardar(s.data, {savedAt: T1042, text: 'Ficticio.'});
  assert.equal(s.save(r.data).ok, true);
  assert.equal(JSON.parse(st.getItem('notasvoz.dictanota.v2')).entries[0].text, 'Ficticio.');
  const alterado = {...r.data, entries: r.data.entries.map(e => ({...e, savedAt: 1}))};
  assert.match(s.save(alterado).error, /fecha y hora/);
  assert.equal(JSON.parse(st.getItem('notasvoz.dictanota.v2')).entries[0].savedAt, T1042, 'un guardado rechazado no toca lo anterior');
  abierta = false;
  assert.equal(s.load().ok, false); assert.equal(s.data, null);
  assert.equal(s.save(conv.convEmpty()).ok, false);
  assert.equal(JSON.parse(st.getItem('notasvoz.dictanota.v2')).entries.length, 1, 'bloqueada no escribe');
  abierta = true;
  st.setItem('notasvoz.dictanota.v2', '{dañado');
  assert.equal(s.load().ok, false); assert.equal(s.readWarning, true);
  assert.equal(s.save(conv.convEmpty()).ok, false);
  assert.equal(st.getItem('notasvoz.dictanota.v2'), '{dañado', 'lo dañado no se sobrescribe');
  const lleno = conv.convMakeStore({getItem: () => null, setItem(){ throw new Error('QuotaExceededError'); }}, () => true);
  lleno.load();
  assert.match(lleno.save(guardar(conv.convEmpty(), {savedAt: T1042, text: 'x'}).data).error, /No se pudo guardar/);
});

test('conversaciones: migrar desde el almacén es repetible y deja intactas las notas viejas', () => {
  const viejas = [{id: 'n1', title: 'Ficticia', text: 'Texto.', ts: T1042, tags: []}];
  const st = memStorage({'notasvoz.gamma.v1': JSON.stringify(viejas)});
  const s = conv.convMakeStore(st, () => true); s.load();
  assert.deepEqual(s.migrate(JSON.parse(st.getItem('notasvoz.gamma.v1'))), {ok: true, added: 1, error: undefined});
  assert.equal(s.migrate(viejas).added, 0);
  assert.equal(st.getItem('notasvoz.gamma.v1'), JSON.stringify(viejas));
  const s2 = conv.convMakeStore(st, () => true); s2.load();
  assert.equal(s2.data.conversations[0].id, 'legacy:n1');
});

test('conversaciones: con la protección activadal cuaderno se guarda cifrada y bloqueada no se ve', async () => {
  const st = memStorage(datosFicticios()), v = vaultCore.createVault(st);
  await v.enable('frase de prueba larga');
  const s = conv.convMakeStore(v.store, () => v.state === 'off' || v.state === 'open'); s.load();
  assert.equal(s.save(guardar(s.data, {savedAt: T1042, text: 'Texto ficticio secreto.'}).data).ok, true);
  await v.flush();
  assert.equal(st.getItem('notasvoz.dictanota.v2'), null, 'no queda copia en claro');
  const rec = st.getItem(vaultCore.VAULT_REC_PREFIX + 'conversaciones');
  assert.ok(rec && !rec.includes('secreto'));
  const v2 = vaultCore.createVault(st), s2 = conv.convMakeStore(v2.store, () => v2.state === 'off' || v2.state === 'open');
  assert.equal(s2.load().ok, false, 'bloqueada no carga');
  await v2.unlockPassword('frase de prueba larga');
  assert.equal(s2.load().ok, true);
  assert.equal(s2.data.entries[0].text, 'Texto ficticio secreto.');
});

test('conversaciones: borrar un mensaje y solo cuadernos vacías; lista de cuadernos por actividad', () => {
  const ids = seqIds();
  let r = guardar(conv.convEmpty(), {savedAt: T1042, text: 'Uno.'}, ids);
  const a = r.conversation.id;
  r = guardar(r.data, {savedAt: T1042 + 6e4, text: 'Dos.'}, ids);
  const b = r.conversation.id;
  assert.deepEqual(conv.convSummaries(r.data).map(x => [x.id, x.count, x.lastSavedAt]), [[b, 1, T1042 + 6e4], [a, 1, T1042]]);
  assert.throws(() => conv.convDeleteConversation(r.data, a), /mensajes/);
  const sinMsg = conv.convDeleteEntry(r.data, r.data.entries[0].id);
  assert.ok(conv.convIsEmpty(sinMsg, a));
  assert.equal(conv.convDeleteConversation(sinMsg, a).conversations.length, 1);
  assert.equal(conv.convCheckWrite(r.data, sinMsg), '');
});

/* Etapa A (Claude, 16/11/2026): ajustes estéticos menores. Solo presentación; no tocan datos ni claves. */
test('Etapa A: no quedan referencias a la pestaña vieja «Texto» en el texto visible', () => {
  assert.ok(!html.includes('se edita en «Texto»'));
  assert.ok(!html.includes('Ir a Texto para editarlo'));
  assert.ok(!html.includes('Grabá o escribí algo en «Texto»'));
  assert.ok(!html.includes('Los resultados aparecen en Texto'));
  assert.ok(!html.includes('Si corregís una palabra en «Texto»'));
});

test('Etapa A: «Procesamiento local» sigue en el encabezado y ya no se oculta en el celular', () => {
  assert.ok(html.includes('Procesamiento local'));
  assert.ok(!html.includes('sin nube'));
  assert.ok(!/\.pill\{display:none\}/.test(html), 'ninguna regla vuelve a ocultar la leyenda de privacidad');
});

test('Etapa A: el punto de grabación es rojo y el de pausa es ámbar', () => {
  assert.ok(html.includes('.dock-capture-status .capture-dot{background:var(--error);box-shadow:0 0 0 3px var(--error-bg)}'));
  assert.ok(html.includes('#studioDockCapture.paused .capture-dot{background:var(--note-ink);box-shadow:0 0 0 3px var(--note-bg)}'));
});

test('Etapa A: la tarjeta repetida de «Descargar audio» se muestra solo si hay audio y los ids siguen', () => {
  assert.ok(html.includes('id="recordDownloadCard"'));
  assert.ok(html.includes("$('recordDownloadCard').hidden = !m;"));
  for (const id of ['recordDownloadAudio', 'recordAudioHint', 'audioBox', 'audioReady', 'audioEmpty', 'aDown', 'aMp3', 'aTx', 'aDel']) {
    assert.ok(html.includes('id="' + id + '"'), 'falta #' + id);
  }
});

test('Etapa A: los íconos de Ajustes son SVG en línea y los módulos y claves siguen', () => {
  for (const id of ['settingsReading', 'settingsQuality', 'settingsAudio', 'settingsPrivacy', 'settingsDictionary', 'model', 'learnAuto', 'textSize']) {
    assert.ok(html.includes('id="' + id + '"'), 'falta #' + id);
  }
  assert.ok(!/<span class="module-icon">[^<]/.test(html), 'ya no hay íconos de texto suelto en los módulos');
  assert.ok(!/https?:\/\/[^"' ]*\.(svg|woff2?|ttf)/.test(html.replace(/xmlns="[^"]*"/g, '')), 'sin fuentes ni íconos externos');
});

test('Etapa A: el selector de modelo conserva sus tres valores', () => {
  for (const v of ['Xenova/whisper-tiny', 'Xenova/whisper-base', 'Xenova/whisper-small']) assert.ok(html.includes('value="' + v + '"'));
});

/* ---------- Audio por nota, etapa E1 (apagado; datos inventados) ---------- */
const anBlock = (html.match(/\/\*AUDIONOTA-START\*\/([\s\S]*?)\/\*AUDIONOTA-END\*\//) || [])[1];
const an = () => new Function(anBlock + ';return {AN_DB,AN_STATES,anNewId,anNewMeta,anValidMeta,anCanMove,anSetState,anChunkKey,anChunkBounds,anFilePlan,anReview,anTakeLock};')();

test('audio por nota E1: ficha y estados', () => {
  assert.ok(anBlock, 'falta el bloque AUDIONOTA');
  const a = an();
  assert.equal(a.AN_DB, 'notasvoz-dictanota-audio');
  assert.match(a.anNewId(), /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.notEqual(a.anNewId(), a.anNewId());
  const m = a.anNewMeta('x-1', 1763300000000);
  assert.equal(m.state, 'grabando'); assert.equal(m.bytes, 0); assert.equal(m.parts, 0);
  assert.equal(a.anSetState(m, 'cerrado').state, 'cerrado');
  assert.equal(m.state, 'grabando', 'no modifica la ficha original');
  for (const from of ['grabando', 'escribiendo', 'importando']) assert.equal(a.anCanMove(from, 'cerrado'), true);
  assert.equal(a.anCanMove('cerrado', 'grabando'), true, 'E2: grabar de nuevo sobre la nota agrega una parte');
  assert.equal(a.anCanMove('cerrado', 'escribiendo'), false);
  assert.equal(a.anCanMove('grabando', 'escribiendo'), false);
  assert.throws(() => a.anSetState(a.anSetState(m, 'cerrado'), 'importando'));
  assert.throws(() => a.anSetState(m, 'inventado'));
  for (const mala of [null, {}, {...m, id: ''}, {...m, state: 'x'}, {...m, createdAt: NaN}, {...m, bytes: -1}, {...m, parts: 1.5}, {...m, key: 'texto'}]) assert.equal(a.anValidMeta(mala), false);
  assert.throws(() => a.anNewMeta('', 1));
});

test('audio por nota E1: claves de fragmentos y plan de partes de un archivo', () => {
  const a = an();
  assert.deepEqual(a.anChunkKey('x-1', 0, 5), ['x-1', 0, 5]);
  for (const mala of [['', 0, 0], ['x', -1, 0], ['x', 0, 1.2], [5, 0, 0]]) assert.throws(() => a.anChunkKey(...mala));
  const b = a.anChunkBounds('x-1');
  assert.deepEqual(b.lower, ['x-1', 0, 0]); assert.deepEqual(b.upper, ['x-1', Infinity, Infinity]);
  assert.deepEqual(a.anFilePlan(0), []);
  assert.deepEqual(a.anFilePlan(10, 4), [{n: 0, start: 0, end: 4}, {n: 1, start: 4, end: 8}, {n: 2, start: 8, end: 10}]);
  const grande = a.anFilePlan(30 * 1024 * 1024);
  assert.equal(grande.length, 30); assert.equal(grande.at(-1).end, 30 * 1024 * 1024);
  assert.throws(() => a.anFilePlan(-1)); assert.throws(() => a.anFilePlan(10, 0));
});

test('audio por nota E1: revisión al abrir solo mira y propone (tabla 2.5)', () => {
  const a = an(), mk = (id, state, parts = 1) => ({...a.anNewMeta(id, 1), state, parts});
  const metas = [mk('a', 'grabando'), mk('b', 'grabando'), mk('c', 'escribiendo'), mk('d', 'importando'), mk('e', 'cerrado'), mk('f', 'cerrado'), mk('g', 'cerrado'), mk('h', 'cerrado'), {id: 'roto', state: 'x'}];
  const copia = JSON.stringify(metas);
  const r = a.anReview(metas, {a: 3, c: 2, e: 4, f: 4, g: 0, h: 4}, ['e'], ['h']);
  const acc = Object.fromEntries(r.audios.map(x => [x.id, x.action]));
  assert.deepEqual(acc, {a: 'cerrar-interrumpida', b: 'descartar', c: 'descartar', d: 'limpiar-lote', e: 'ok', f: 'sin-nota', g: 'danado', h: 'ok', roto: 'danado'});
  assert.equal(JSON.stringify(metas), copia, 'no modifica nada');
  assert.deepEqual(a.anReview([mk('e', 'cerrado')], {e: 1}, ['e', 'no-existe', null], []).notasSinAudio, ['no-existe']);
  // Mover una nota de cuaderno no cambia su audioId: el audio sigue «ok». Borrar la nota lo deja «sin-nota», nunca borrado solo.
  assert.equal(a.anReview([mk('e', 'cerrado')], {e: 1}, ['e'], []).audios[0].action, 'ok');
  assert.equal(a.anReview([mk('e', 'cerrado')], {e: 1}, [], []).audios[0].action, 'sin-nota');
  assert.deepEqual(a.anReview(undefined, undefined, undefined, undefined), {audios: [], notasSinAudio: []});
});

test('audio por nota E1: candado de una sola pestaña', async () => {
  const a = an();
  const fake = () => { let held = false; return {locks: {request(name, opts, cb) { assert.equal(opts.ifAvailable, true); if (held) return Promise.resolve(cb(null)); held = true; const p = cb({name}); return p.then(() => { held = false; }); }}}; };
  const nav = fake();
  const uno = await a.anTakeLock(nav);
  assert.equal(uno.ok, true);
  const dos = await a.anTakeLock(nav);
  assert.equal(dos.ok, false, 'la segunda pestaña no obtiene el candado');
  uno.release(); await new Promise(r => setTimeout(r, 5));
  assert.equal((await a.anTakeLock(nav)).ok, true, 'liberado, se puede volver a tomar');
  const sin = await a.anTakeLock({});
  assert.equal(sin.ok, true); assert.equal(sin.soportado, false);
});

test('audio por nota: E2 sigue cifrado; la beta agrega modo sin cifrar explícito para notas', () => {
  // E2 sigue cifrando sus fragmentos. La beta activa en paralelo el formato P2 de audio en claro, con modo explícito.
  const fuera = html.replace(/\/\*AUDIONOTA-START\*\/[\s\S]*?\/\*AUDIONOTA-END\*\//, '')
    .replace(/\/\*P2-BIBLIOTECA-START\*\/[\s\S]*?\/\*P2-BIBLIOTECA-END\*\//, '')
    .replace(/\/\*K2-START\*\/[\s\S]*?\/\*K2-END\*\//, '');
  assert.equal((html.match(/notasvoz-gamma-audio/g) || []).length, 1, 'la base histórica sigue igual');
  assert.doesNotMatch(fuera, /notasvoz-dictanota-audio/, 'nada fuera del bloque nombra la base nueva');
  assert.doesNotMatch(anBlock, /localStorage|fetch\(|XMLHttpRequest|innerHTML|\beval\b|new Function|gamma|document\./);
  assert.equal((anBlock.match(/indexedDB/g) || []).length, 1, 'solo el argumento por defecto de anOpen');
  assert.doesNotMatch(anBlock, /\.(clear|deleteObjectStore|deleteDatabase)\(/);
  // En E2 toda escritura usa AES-GCM; el tercer punto es la grabación P2 explícitamente en claro.
  const puts = [...fuera.matchAll(/^.*\banPut(Chunk|ChunkMeta)\(.*$/gm)].map(m => m[0]);
  assert.equal(puts.length, 3, 'grabación P2, grabación E2 y archivo E2');
  assert.match(puts.join('\n'), /anPutChunk\(db, id, part, c\.n, await anSealChunk\(/);
  assert.match(fuera, /const n = r\.saved, blob = await anSealChunk\([^\n]*\n\s*await anPutChunkMeta\(r\.db, [^\n]*, blob\);/);
  assert.match(fuera, /if \(vault\.state === 'off'\) return startAudioClaro\(mr\)/);
  assert.doesNotMatch(fuera, /\banStart\(/, 'no se usa la escritura sin cifrar de E1');
  // Conservar audio vale sin protección: E2 queda reservado a la bóveda abierta.
  assert.match(fuera, /const anUsable = \(\) => vault\.state === 'open' && !!vault\.audioKey && !!vault\.header;/);
  assert.match(fuera, /const anAudioReady = \(\) => anUsable\(\) \|\| vault\.state === 'off';/);
  assert.match(fuera, /if \(anUsable\(\)\) return startAudioNota\(mr\);/);
  assert.match(fuera, /if \(vault\.state === 'off'\) return startAudioClaro\(mr\);/);
  assert.match(fuera, /async function anSaveFile\(f, ms\)\{\n  if \(!anAudioReady\(\) \|\| !\$\('saveAudio'\)\.checked\) return null;/);
  // Primero el audio, después el vínculo; guardar espera a que termine de cifrarse.
  assert.match(fuera, /if \(anBusyN > 0\) return flash\('Esperá unos segundos: se está guardando el audio cifrado\.'\);/);
  assert.match(fuera, /text, audioId: convAudioId, durationMs: convAudioMs, audioParts,/);
  assert.match(fuera, /transcriptionStatus: convFromAudio \?/,'un audio sin texto retiene el estado de la transcripción');
  assert.match(fuera, /audioId: convAudioId, audioMs: convAudioMs, audioBase: convAudioBase\}\}\);/, 'el borrador recuerda el audio pendiente y cuántas partes tenía');
  assert.match(fuera, /\|\| \(d\.conv && typeof d\.conv\.audioId === 'string' && d\.conv\.audioId\)\)\) \{/, 'un audio pendiente sin texto también se recupera');
  // La revisión al abrir no crea la base si no existe.
  assert.match(fuera, /if \(indexedDB\.databases\) \{ const list = await indexedDB\.databases\(\); if \(!list\.some\(d => d\.name === AN_DB\)\) return; \}/);
  assert.ok(html.indexOf("vaultWhenReady(() => { loadNotes();") < html.indexOf('vaultWhenReady(async () => { await anRepairPlainOnOpen(); if (anUsable()) await anReviewOnOpen(); });'), 'las revisiones de audios en claro y cifrados corren después de cargar notas y borrador');
  // El candado de una pestaña se toma antes de cargar nada (correcciones E2).
  assert.match(html, /async function vaultAfterUnlock\(\)\{\n  await vaultTakeTabLock\(\);/);
});

/* ---------- Audio por nota, etapa E2 (cifrado; datos y audios inventados) ---------- */
const vaultFns = () => {
  const m = html.match(/\/\*VAULT-CORE-START\*\/([\s\S]*?)\/\*VAULT-CORE-END\*\//);
  return new Function(m[1] + ';return {vaultDeriveAudioKey, createVault, vaultCreate};')();
};
const an2 = () => new Function(anBlock + ';return {anNewCek,anOpenCek,anSealChunk,anOpenChunk,anSealDetail,anOpenDetail,anValidDetail,anPickTarget,anCloseDetail,anTotalMs,AN_IV,AN_TAG};')();
const randomBytes = n => crypto.getRandomValues(new Uint8Array(n));
const hidFicticio = () => Buffer.from(randomBytes(16)).toString('base64');

test('audio por nota E2: K_audio sale de la clave de datos y del id de la protección', async () => {
  const {vaultDeriveAudioKey} = vaultFns(), a = an2();
  const dek = randomBytes(32), hid = hidFicticio();
  const k1 = await vaultDeriveAudioKey(dek, hid), k2 = await vaultDeriveAudioKey(dek, hid);
  assert.equal(k1.extractable, false, 'la clave de audios no se puede exportar');
  const {box} = await a.anNewCek(k1, hid, 'audio-1');
  await a.anOpenCek(k2, hid, 'audio-1', box);   // misma DEK + mismo id → misma clave
  await assert.rejects(a.anOpenCek(await vaultDeriveAudioKey(dek, hidFicticio()), hid, 'audio-1', box), 'otro id no abre');
  await assert.rejects(a.anOpenCek(await vaultDeriveAudioKey(randomBytes(32), hid), hid, 'audio-1', box), 'otra DEK no abre');
  await assert.rejects(a.anOpenCek(k1, hid, 'audio-2', box), 'la clave de un audio no sirve para otro');
});

test('audio por nota E2: fragmentos cifrados de ida y vuelta, atados a su lugar', async () => {
  const {vaultDeriveAudioKey} = vaultFns(), a = an2();
  const hid = hidFicticio(), k = await vaultDeriveAudioKey(randomBytes(32), hid);
  const {cek} = await a.anNewCek(k, hid, 'audio-1');
  assert.equal(cek.extractable, false);
  // «Audio» inventado: cabecera WebM de mentira + bytes al azar.
  const plain = new Uint8Array([0x1A, 0x45, 0xDF, 0xA3, ...randomBytes(4000)]);
  const sealed = await a.anSealChunk(cek, hid, 'audio-1', 0, 3, new Blob([plain]));
  const raw = new Uint8Array(await sealed.arrayBuffer());
  assert.equal(raw.length, plain.length + a.AN_IV + a.AN_TAG, 'solo 28 bytes de más por fragmento');
  assert.ok(!Buffer.from(raw).includes(Buffer.from([0x1A, 0x45, 0xDF, 0xA3])), 'no queda la cabecera en claro');
  assert.deepEqual(await a.anOpenChunk(cek, hid, 'audio-1', 0, 3, sealed), plain);
  await assert.rejects(a.anOpenChunk(cek, hid, 'audio-1', 0, 4, sealed), 'otro índice');
  await assert.rejects(a.anOpenChunk(cek, hid, 'audio-1', 1, 3, sealed), 'otra parte');
  await assert.rejects(a.anOpenChunk(cek, hid, 'audio-2', 0, 3, sealed), 'otro audio');
  const roto = raw.slice(); roto[40] ^= 1;
  await assert.rejects(a.anOpenChunk(cek, hid, 'audio-1', 0, 3, new Blob([roto])), 'un byte cambiado');
  await assert.rejects(a.anOpenChunk(cek, hid, 'audio-1', 0, 3, new Blob([raw.slice(0, 20)])), 'cortado');
  const datos = new Uint8Array([1, 2, 3]);
  await a.anSealChunk(cek, hid, 'audio-1', 0, 0, datos);
  assert.deepEqual([...datos], [1, 2, 3], 'no toca los datos que recibe si no son un Blob propio');
});

test('audio por nota E2: el detalle va cifrado (nombre del archivo incluido) y detecta lo que falta', async () => {
  const {vaultDeriveAudioKey} = vaultFns(), a = an2();
  const hid = hidFicticio(), k = await vaultDeriveAudioKey(randomBytes(32), hid);
  const detail = {parts: [{mime: 'audio/mpeg', chunks: 3, bytes: 2500000, ms: 90000, origin: 'cargado', name: 'Persona Inventada Uno.mp3', complete: true}]};
  const box = await a.anSealDetail(k, hid, 'audio-1', detail);
  assert.doesNotMatch(JSON.stringify(box), /Persona|Inventada|mpeg/, 'nada del detalle queda en claro');
  assert.deepEqual(await a.anOpenDetail(k, hid, 'audio-1', box), detail);
  await assert.rejects(a.anOpenDetail(k, hid, 'audio-9', box), 'atado a su audio');
  for (const malo of [{}, {parts: [{}]}, {parts: [{...detail.parts[0], chunks: -1}]}, {parts: [{...detail.parts[0], origin: 'otro'}]}]) {
    assert.equal(a.anValidDetail(malo), false);
    await assert.rejects(a.anSealDetail(k, hid, 'audio-1', malo));
  }
  // Una parte sin duración conocida o incompleta: la duración total no se informa (nunca una duración engañosa).
  assert.equal(a.anTotalMs({parts: [{ms: 1000}, {ms: null}, {ms: 500}]}), null);
  assert.equal(a.anTotalMs({parts: [{ms: 1000}, {ms: 500, incompleta: true}]}), null);
  assert.equal(a.anTotalMs({parts: [{ms: 1000}, {ms: 500}]}), 1500);
  assert.equal(a.anValidDetail({parts: [{...detail.parts[0], incompleta: true, interrumpida: true}]}), true);
  assert.equal(a.anValidDetail({parts: [{...detail.parts[0], incompleta: 'sí'}]}), false);
});

test('audio por nota E2: a qué audio va cada grabación y cómo se cierra una cortada', () => {
  const a = an2();
  assert.deepEqual(a.anPickTarget({editing: true, editingAudioId: 'x', pendingAudioId: 'y', replace: true}), {mode: 'parte', id: 'x', obligatorio: true});
  // Editando una nota sin audio: la segunda grabación de la misma edición se suma al audio nuevo (no deja otro suelto).
  assert.deepEqual(a.anPickTarget({editing: true, editingAudioId: null, pendingAudioId: 'y', replace: false}), {mode: 'parte', id: 'y'});
  assert.deepEqual(a.anPickTarget({editing: true, editingAudioId: null, pendingAudioId: null, replace: false}), {mode: 'nuevo'});
  assert.deepEqual(a.anPickTarget({editing: false, pendingAudioId: 'y', replace: false}), {mode: 'parte', id: 'y'});
  assert.deepEqual(a.anPickTarget({editing: false, pendingAudioId: 'y', replace: true}), {mode: 'nuevo'}, 'empezar de cero: audio nuevo; el anterior queda sin nota');
  assert.deepEqual(a.anPickTarget({editing: false, pendingAudioId: null, replace: false}), {mode: 'nuevo'});
  const p = (complete, chunks) => ({mime: 'audio/webm', chunks, bytes: chunks * 10, ms: complete ? 1000 : null, origin: 'grabado', complete});
  const c1 = a.anCloseDetail({parts: [p(true, 2), p(false, 0)]}, 2, 3, 120);
  assert.deepEqual(c1.parts[1], {...p(false, 0), chunks: 3, bytes: 120, interrumpida: true, complete: true});
  assert.equal(c1.parts[0].chunks, 2, 'la parte anterior no cambia');
  assert.equal(a.anCloseDetail({parts: [p(true, 2), p(false, 0)]}, 2, 0, 0).parts.length, 1, 'parte sin nada: se quita, el resto queda');
  assert.equal(a.anCloseDetail({parts: [p(false, 0)]}, 1, 0, 0).parts.length, 0);
});

test('audio por nota E2: la protección deriva K_audio al abrir, la borra al quitarla y pone en cero la DEK', async () => {
  const {createVault} = vaultFns();
  assert.match(html, /async function openWith\(dek\)\{\n    try \{ const ok = await v\.acquire\(\); await openWithRaw\(dek, !ok\); \} finally \{ dek\.fill\(0\); \}/);   // la clave en bruto se pone en cero salga como salga
  const st = memStorage(datosFicticios()), v1 = createVault(st);
  const {dek} = await v1.enable('frase de prueba larga');
  assert.ok(v1.audioKey && v1.audioKey.extractable === false, 'al activar ya hay clave de audios');
  const v = createVault(st);
  assert.equal(v.audioKey, null, 'bloqueada: sin clave de audios');
  await v.unlockPassword('frase de prueba larga');
  assert.ok(v.audioKey);
  // Las dos sesiones derivan la misma clave: lo cifrado en una se abre en la otra.
  const a = an2(), {box} = await a.anNewCek(v1.audioKey, v.header.id, 'audio-1');
  await a.anOpenCek(v.audioKey, v.header.id, 'audio-1', box);
  dek.fill(0);
  await v.disable('frase de prueba larga');
  assert.equal(v.audioKey, null, 'sin protección no queda clave de audios');
  assert.equal(st.getItem('notasvoz.boveda.v1'), null);
});

/* ---------- Correcciones de E2 tras la revisión de ChatGPT (datos inventados) ---------- */
test('correcciones E2: una nota nunca toma el audio de otra', () => {
  const c = conv;
  let d = c.convEmpty();
  d = c.convAddEntry(d, {conversationId: null, kind: 'audio', savedAt: 1, text: 'Persona Inventada Uno', audioId: 'audio-A'}).data;
  const a = d.entries[0];
  d = c.convAddEntry(d, {conversationId: a.conversationId, kind: 'texto', savedAt: 2, text: 'X-901 sin audio'}).data;
  const b = d.entries[1];
  assert.equal(c.convAudioInUse(d, 'audio-A'), true);
  assert.equal(c.convAudioInUse(d, 'audio-A', a.id), false, 'la propia nota no cuenta');
  assert.equal(c.convAudioInUse(d, 'audio-B'), false);
  assert.equal(c.convAudioInUse(d, null), false);
  // Un dato viejo con el mismo audio en dos notas: borrar una no debe llevarse el audio de la otra.
  const doble = c.convSetAudio(d, b.id, 'audio-A', null);
  assert.equal(c.convAudioInUse(c.convDeleteEntry(doble, b.id), 'audio-A'), true);
  // En la interfaz: cambiar de nota en edición reinicia el audio pendiente, y Guardar se niega a cruzar audios.
  const ui = html.slice(html.indexOf('function convEdit(id){'), html.indexOf('function convAskMove('));
  assert.match(ui, /if \(convEditingId && \(convAudioId \|\| \$\('text'\)\.value !== baseline\)\) return flash\(/);
  assert.match(ui, /convCtx\+\+; convAudioId = null; convAudioMs = null; convAudioBase = null;\n  convEditingId = id;/);
  assert.match(ui, /const shared = !!audioId && \(convAudioInUse\(convStore\.data, audioId, id\) \|\| \(convAudioId === audioId && convEditingId !== id\)\);/);
  assert.match(html, /if \(convAudioId && \(convAudioInUse\(convStore\.data, convAudioId, editing \? editing\.id : null\) \|\| \(editing && editing\.audioId && editing\.audioId !== convAudioId\)\)\)/);
  // Un audio que termina tarde solo se une si el editor sigue en la misma nota.
  assert.match(html, /function anLinkPending\(job, id, ms\)\{\n  if \(job\.ctx !== convCtx\) \{/);
});

test('correcciones E2: guardar vuelve atrás si el cifrado no llegó al almacenamiento', () => {
  const c = conv, mem = new Map(), store = {getItem: k => mem.has(k) ? mem.get(k) : null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k)};
  const s = c.convMakeStore(store, () => true); s.load();
  const before = s.data, prev = store.getItem(c.CONV_KEY);
  const r = c.convAddEntry(before, {conversationId: null, kind: 'texto', savedAt: 5, text: 'Texto inventado X-901', audioId: 'audio-Z'});
  assert.equal(s.save(r.data).ok, true);
  s.revert(before, prev);
  assert.equal(s.data, before, 'vuelve a los datos anteriores');
  assert.equal(store.getItem(c.CONV_KEY), null, 'y a lo que había en el almacén');
  // Otra pestaña: el error se explica tal cual.
  const ro = c.convMakeStore({getItem: () => null, setItem(){ const e = new Error('abierta en otra pestaña'); e.name = 'OtraPestana'; throw e; }, removeItem(){}}, () => true); ro.load();
  assert.equal(ro.save(c.convAddEntry(ro.data, {conversationId: null, kind: 'texto', savedAt: 1, text: 'y'}).data).error, 'abierta en otra pestaña');
});

test('correcciones E2: la segunda pestaña no escribe nada protegido (notas, borrador, cabecera)', async () => {
  const {createVault} = vaultFns();
  const st = memStorage(datosFicticios());
  const a = createVault(st); await a.enable('frase de prueba larga');
  const b = createVault(st); await b.unlockPassword('frase de prueba larga');
  b.readOnly = true;   // lo decide el candado de la app
  const foto = JSON.stringify([...st.map.entries()].sort());
  assert.throws(() => b.store.setItem('notasvoz.gamma.draft.v1', 'borrador de otra pestaña'), e => e.name === 'OtraPestana');
  assert.throws(() => b.store.removeItem('notasvoz.dictanota.v2'), e => e.name === 'OtraPestana');
  await assert.rejects(b.changePassword('frase de prueba larga', 'otra frase larga'), e => e.name === 'OtraPestana');
  await assert.rejects(b.newRecovery('frase de prueba larga'), e => e.name === 'OtraPestana');
  await assert.rejects(b.disable('frase de prueba larga'), e => e.name === 'OtraPestana');
  assert.throws(() => b.removeBio(), e => e.name === 'OtraPestana');
  await b.flush();
  assert.equal(JSON.stringify([...st.map.entries()].sort()), foto, 'el almacenamiento quedó idéntico');
  assert.equal(b.store.getItem('notasvoz.gamma.v1'), a.store.getItem('notasvoz.gamma.v1'), 'leer sí puede');
  // La primera pestaña sigue guardando.
  a.store.setItem('notasvoz.gamma.draft.v1', 'borrador nuevo'); await tick(); await a.flush();
  assert.equal(a.saved('notasvoz.gamma.draft.v1'), true);
});

test('correcciones E2: activar en una pestaña vieja no reemplaza la protección que activó otra', async () => {
  const {createVault} = vaultFns();
  const st = memStorage(datosFicticios());
  const vieja = createVault(st), nueva = createVault(st);   // las dos abiertas sin protección
  await nueva.enable('frase de prueba larga');
  const cabecera = st.getItem('notasvoz.boveda.v1');
  await assert.rejects(vieja.enable('otra frase larga'), /otra pestaña/);
  assert.equal(st.getItem('notasvoz.boveda.v1'), cabecera);
});

test('correcciones E2: quitar la protección se impide si hay audios que quedarían irrecuperables', async () => {
  const {createVault} = vaultFns();
  const st = memStorage(datosFicticios()), v = createVault(st);
  await v.enable('frase de prueba larga');
  let audios = 2; v.disableGuard = async () => audios ? 'hay ' + audios + ' audios' : '';
  await assert.rejects(v.disable('frase de prueba larga'), /hay 2 audios/);
  assert.equal(v.state, 'open'); assert.ok(st.getItem('notasvoz.boveda.v1'), 'la cabecera sigue');
  audios = 0; await v.disable('frase de prueba larga');
  assert.equal(v.state, 'off');
  // En la app: la guarda cuenta los audios sin crear la base y el botón la consulta antes de pedir la contraseña.
  // Desde la corrección del PR #60: solo cuentan los audios cifrados; uno guardado sin cifrar (ensayo P2) no la traba.
  assert.match(html, /vault\.disableGuard = async \(\) => \{\n  const k = await anStoredKinds\(\);\n[^\n]*\n  const n = k\.cifrados;/);
  // Lo «sin cifrar» exige la marca expresa y ninguna clave: una ficha ambigua o dañada cuenta como cifrada.
  assert.match(html, /const anIsPlainMeta = m => !!m && typeof m === 'object' && m\.mode === AN_PLAIN_MODE && m\.key == null && m\.sealed == null;/);
  const btn = html.slice(html.indexOf("vaultEl('vaultDisable').addEventListener"), html.indexOf("// Bloqueo automático tras 15 minutos"));
  assert.ok(btn.indexOf('vault.disableGuard()') < btn.indexOf('vaultAskPassword('));
});

test('correcciones E2: cancelar una edición quita solo las partes agregadas', () => {
  const a = new Function(anBlock + ';return {anTruncateDetail};')();
  const p = n => ({mime: 'audio/webm', chunks: n, bytes: n * 10, ms: 1000, origin: 'grabado', complete: true});
  const d = {parts: [p(2), p(3), p(1)]};
  assert.deepEqual(a.anTruncateDetail(d, 1), {parts: [p(2)]});
  assert.equal(d.parts.length, 3, 'no modifica el original');
  for (const k of [0, 4, 1.5, -1]) assert.throws(() => a.anTruncateDetail(d, k));
  assert.match(anBlock, /function anTruncate\(db, meta, keep\)\{[\s\S]*?anTx\(db, \['meta', 'chunks'\], 'readwrite'/, 'ficha y fragmentos juntos');
});

/* ---------- Segunda revisión de E2: el candado se pide ANTES de cualquier escritura (datos ficticios) ---------- */
const PASS_REV = 'frase de prueba inventada 333';
const instantanea = st => JSON.stringify([...st.map.entries()].sort());
const sinCandado = () => ({takeLock: async () => false});
const conCandado = () => ({takeLock: async () => true});

test('revisión 2: sin candado no se activa la protección y no se escribe nada', async () => {
  const {createVault} = vaultFns();
  const st = memStorage(datosFicticios()), antes = instantanea(st);
  const v = createVault(st, sinCandado());
  await assert.rejects(v.enable(PASS_REV), e => e.name === 'OtraPestana');
  assert.equal(instantanea(st), antes, 'ni cabecera ni registros: todo igual');
  assert.equal(v.state, 'off'); assert.equal(v.readOnly, true);
});

test('revisión 2: dos activaciones con el mismo almacenamiento: gana una sola, la otra no pisa la cabecera', async () => {
  const {createVault} = vaultFns();
  const st = memStorage(datosFicticios());
  let tomado = false;   // un candado exclusivo: el primero que lo pide lo tiene
  const unico = () => ({takeLock: async () => { if (tomado) return false; tomado = true; return true; }});
  const a = createVault(st, unico()), b = createVault(st, unico());
  const r = await Promise.allSettled([a.enable(PASS_REV), b.enable('otra frase inventada 444')]);
  assert.equal(r.filter(x => x.status === 'fulfilled').length, 1);
  const ganadora = r[0].status === 'fulfilled' ? a : b;
  assert.equal(JSON.parse(st.getItem('notasvoz.boveda.v1')).id, ganadora.header.id, 'la cabecera es la de la ganadora');
  const perdedora = ganadora === a ? b : a;
  assert.equal(perdedora.state, 'off');
});

test('revisión 2: recuperar el acceso sin candado no cambia la cabecera', async () => {
  const {createVault} = vaultFns();
  const st = memStorage(datosFicticios());
  const v1 = createVault(st, conCandado()); const {recovery, dek} = await v1.enable(PASS_REV); dek.fill(0);
  const antes = instantanea(st);
  const v2 = createVault(st, sinCandado());
  await assert.rejects(v2.unlockRecovery(recovery, 'clave nueva inventada 555'), e => e.name === 'OtraPestana');
  assert.equal(instantanea(st), antes, 'la cabecera y los registros no cambiaron');
  assert.equal(v2.state, 'locked');
  // Con un código que no sirve ni se pide el candado.
  let pedido = 0; const v3 = createVault(st, {takeLock: async () => { pedido++; return true; }});
  await assert.rejects(v3.unlockRecovery('AAAA-AAAA-AAAA-AAAA-AAAA-AAAA', 'clave nueva inventada 555'));
  assert.equal(pedido, 0, 'un código incorrecto no toma el candado');
  assert.equal(instantanea(st), antes);
});

test('revisión 2: desbloquear sin candado abre en solo lectura y no cifra, aparta ni borra nada', async () => {
  const {createVault} = vaultFns();
  const st = memStorage(datosFicticios());
  const v1 = createVault(st, conCandado()); const {dek} = await v1.enable(PASS_REV); dek.fill(0);
  // Una copia en claro que quedó de otra pestaña vieja, y un registro dañado.
  st.setItem('notasvoz.gamma.dict.v1', 'copia en claro inventada => x');
  st.setItem('notasvoz.boveda.v1.r.personas', '{dañado inventado');
  const antes = instantanea(st);
  const v = createVault(st, sinCandado());
  await v.unlockPassword(PASS_REV);
  assert.equal(v.state, 'open'); assert.equal(v.readOnly, true);
  assert.deepEqual(v.damaged, ['personas']);
  assert.equal(instantanea(st), antes, 'no se escribió, apartó ni borró nada');
  assert.throws(() => v.store.setItem('notasvoz.gamma.dict.v1', 'x'), e => e.name === 'OtraPestana');
  await v.flush();
  assert.equal(instantanea(st), antes, 'tampoco al vaciar la cola');
  // Con el candado, el mismo desbloqueo sí cifra la copia en claro y aparta el registro dañado.
  const w = createVault(st, conCandado()); await w.unlockPassword(PASS_REV);
  assert.equal(w.readOnly, false); assert.notEqual(instantanea(st), antes);
  assert.ok([...st.map.keys()].some(k => k.includes('.danado.')), 'con candado sí se aparta lo dañado');
});

test('revisión 2: si el candado falla (excepción) también falla cerrada', async () => {
  const {createVault} = vaultFns();
  const st = memStorage(datosFicticios()), antes = instantanea(st);
  const v = createVault(st, {takeLock: async () => { throw new Error('prueba'); }});
  await assert.rejects(v.enable(PASS_REV), e => e.name === 'OtraPestana');
  assert.equal(instantanea(st), antes); assert.equal(v.readOnly, true);
});

test('revisión 2: la aplicación falla cerrada sin Web Locks y el candado se pide antes de escribir', () => {
  assert.match(html, /vault\.takeLock = \(\) => vaultTakeTabLock\(\);/);
  assert.match(html, /const ok = !!l\.ok && l\.soportado !== false;/, 'sin Web Locks queda en solo lectura');
  assert.match(html, /anTakeLock\(\)\.catch\(\(\) => \(\{ok: false, soportado: true, fallo: true/, 'un error del candado también');
  const core = html.match(/\/\*VAULT-CORE-START\*\/([\s\S]*?)\/\*VAULT-CORE-END\*\//)[1];
  const enable = core.slice(core.indexOf('v.enable = async'), core.indexOf('v.checkPassword'));
  assert.ok(enable.indexOf('await v.acquire()') > 0 && enable.indexOf('await v.acquire()') < enable.indexOf('storage.getItem(VAULT_HEADER)'), 'enable pide el candado antes de mirar la cabecera');
  const rec = core.slice(core.indexOf('v.unlockRecovery = async'), core.indexOf('v.unlockBio'));
  assert.ok(rec.indexOf('await v.acquire()') > 0 && rec.indexOf('await v.acquire()') < rec.indexOf('storage.setItem(VAULT_HEADER'), 'la recuperación pide el candado antes de escribir la cabecera');
});

test('revisión 2: cada nota recuerda las partes de audio confirmadas y cancelar nunca recorta por debajo', () => {
  const m = html.match(/function convCleanEntry\(e\)\{[\s\S]*?\n\}/)[0];
  assert.match(m, /audioParts: aid && Number\.isInteger\(e\.audioParts\)/);
  assert.match(html, /Math\.max\(convAudioBase, Number\.isInteger\(e\.audioParts\) \? e\.audioParts : 0\)/, 'cancelar usa el máximo entre el borrador y lo confirmado');
  assert.match(html, /enNota\.audioParts > convAudioBase\) convAudioBase = null;/, 'un borrador viejo de una edición ya guardada no deja nada por recortar');
  // El audio sin ficha cerrada no se toca nunca: la revisión previa devuelve 'danado' y nada se escribe.
  assert.match(html, /return 'danado';/);
});

test('revisión 2: todo audio que se amplía o recorta pasa antes por la revisión completa', () => {
  const an = html.match(/async function anAudioHealth[\s\S]*?\n\}\n/)[0];
  assert.doesNotMatch(an, /\.put\(|\.delete\(|anPutMeta|anPutChunk|anDelete|setItem/, 'la revisión nunca escribe');
  assert.match(an, /getAllKeys/, 'comprueba las posiciones sin leer los datos');
  assert.match(an, /anOpenChunk\(cek, hid, id, i, n/, 'descifra cada fragmento: etiqueta y lugar');
  const part = html.match(/async function anOpenForPart[\s\S]*?\n\}\n/)[0];
  assert.match(part, /anAudioHealth\(/); assert.match(part, /anDamaged\.has\(target\.id\)/);
  const trunc = html.match(/async function anTruncateAudio[\s\S]*?\n\}\n/)[0];
  const cifrado = trunc.slice(trunc.indexOf('const hid = vault.header.id'));
  assert.ok(cifrado.indexOf('anAudioHealth(') > 0 && cifrado.indexOf('anAudioHealth(') < cifrado.indexOf('anTruncate(db'), 'E2 cifrado se revisa antes de recortar');
  const claro = trunc.slice(trunc.indexOf('if (anIsPlainMeta(m))'), trunc.indexOf('const hid = vault.header.id'));
  assert.ok(claro.indexOf('anPlainHealth(') > 0 && claro.indexOf('anPlainHealth(') < claro.indexOf('anTruncate(db'), 'la parte sin cifrar se revisa antes de recortar');
});

test('revisión 2: la ficha final sin espacio y el borrado fallido no dan avisos falsos', () => {
  assert.match(html, /\.catch\(e => anRecFinishErr\(r, e\)\)\.finally/);
  assert.match(html, /no se pudo cerrar su ficha/);
  assert.match(html, /quitado = await anDeleteAudio\(audio\)/);
  assert.match(html, /anDeleteAudio\(pendingAudio\)\.then\(ok => flash\(ok \?/, 'descartar espera el borrado antes de decir que se hizo');
});

/* ---------- Copia cifrada, paso K1 (formato 1; datos inventados) ---------- */
const copiaBlock = (html.match(/\/\*COPIA-START\*\/([\s\S]*?)\/\*COPIA-END\*\//) || [])[1];
const copiaUso = (html.match(/\/\*COPIA-USO-START\*\/([\s\S]*?)\/\*COPIA-USO-END\*\//) || [])[1];
const copiaApi = (() => {
  const v = html.match(/\/\*VAULT-CORE-START\*\/([\s\S]*?)\/\*VAULT-CORE-END\*\//)[1];
  return new Function(v + anBlock + copiaBlock + `;return {copiaWriter, copiaVerify, copiaOpenWithSecret, copiaName, copiaHead, COPIA_MAGIC, COPIA_MSG,
    vaultCreate, vaultImportDataKey, vaultDeriveAudioKey, vaultSealRecord, vaultOpenRecord, vaultWithPassword,
    anNewMeta, anSetState, anNewCek, anSealChunk, anSealDetail};`)();
})();
const COPIA_PASS = 'frase de prueba inventada 901';
/* Arma una copia de ejemplo con datos inventados: tres registros, ajustes y un audio de dos partes (tres fragmentos). */
async function copiaEjemplo(opts = {}){
  const c = copiaApi, {header, dek, recovery} = await c.vaultCreate(COPIA_PASS);
  const key = await c.vaultImportDataKey(dek), audioKey = await c.vaultDeriveAudioKey(dek, header.id);
  const conv = {schema: 1, conversations: [{id: 'c1', title: 'Cuaderno inventado', createdAt: 1, updatedAt: 2}],
    entries: [{id: 'e1', conversationId: 'c1', kind: 'audio', savedAt: 1, text: 'Persona Inventada Uno, X-901', audioId: 'audio-inventado-1'},
      {id: 'e2', conversationId: 'c1', kind: 'texto', savedAt: 2, text: 'madre de X-901'}]};
  const w = c.copiaWriter(header, key, opts.contenido || 'completa', 1763340000000);
  await w.registro('conversaciones', await c.vaultSealRecord(key, header.id, 'conversaciones', JSON.stringify(conv)));
  await w.registro('personas', await c.vaultSealRecord(key, header.id, 'personas', JSON.stringify([{names: ['Persona Inventada Uno'], code: 'X-901', rel: ''}])));
  await w.registro('diccionario', await c.vaultSealRecord(key, header.id, 'diccionario', 'pasiente => paciente'));
  await w.config({cfg: '{"textSize":"normal"}', generador: '{"prefix":"X","next":902,"digits":3,"mode":"sequential"}'});
  if (!opts.sinAudio) {
    const id = 'audio-inventado-1', k = await c.anNewCek(audioKey, header.id, id);
    const datos = [[0, 0, new Uint8Array(700).fill(7)], [0, 1, new Uint8Array(300).fill(8)], [1, 0, new Uint8Array(50).fill(9)]];
    const chunks = [];
    for (const [part, n, bytes] of datos) chunks.push({part, n, blob: await c.anSealChunk(k.cek, header.id, id, part, n, bytes)});
    const detail = {parts: [{mime: 'audio/webm', chunks: 2, bytes: 1000, ms: 2000, origin: 'grabado', complete: true}, {mime: 'audio/mpeg', chunks: 1, bytes: 50, ms: 500, origin: 'cargado', name: 'inventado.mp3', complete: true}]};
    const meta = {...c.anSetState(c.anNewMeta(id, 1763340000000, 'grabando'), 'cerrado'), parts: 2, bytes: 1050, key: k.box, sealed: await c.anSealDetail(audioKey, header.id, id, detail)};
    await w.audio(meta, opts.audioAlReves ? [chunks[1], chunks[0], chunks[2]] : chunks);
  }
  const blob = await w.finish();
  dek.fill(0);
  return {blob, bytes: new Uint8Array(await blob.arrayBuffer()), header, key, audioKey, recovery, abrir: async () => ({key, audioKey})};
}
const copiaFalla = async (bytes, abrir) => { try { await copiaApi.copiaVerify(new Blob([bytes]), abrir); return null; } catch (e) { return e.copia || ('otro: ' + e.message); } };

test('copia K1: se arma y se comprueba con la contraseña y con el código; otra clave no la abre', async () => {
  assert.ok(copiaBlock && copiaUso, 'faltan los bloques COPIA');
  const c = copiaApi, e = await copiaEjemplo();
  assert.equal(new TextDecoder().decode(e.bytes.subarray(0, 16)), 'DICTANOTA-COPIA\n');
  const r = await c.copiaVerify(e.blob, h => c.copiaOpenWithSecret(h, COPIA_PASS));
  assert.deepEqual({formato: r.formato, contenido: r.contenido, registros: r.registros, audios: r.audios, fragmentos: r.fragmentos, bytesAudio: r.bytesAudio, cuadernos: r.cuadernos, notas: r.notas, bytes: r.bytes},
    {formato: 1, contenido: 'completa', registros: 3, audios: 1, fragmentos: 3, bytesAudio: 1050, cuadernos: 1, notas: 2, bytes: e.bytes.length});
  assert.equal(r.creado, 1763340000000); assert.equal(r.id, e.header.id);
  // El código de recuperación también la abre (escrito en minúsculas y sin guiones).
  assert.equal((await c.copiaVerify(e.blob, h => c.copiaOpenWithSecret(h, e.recovery.toLowerCase().replace(/-/g, ' ')))).registros, 3);
  assert.equal(await copiaFalla(e.bytes, h => c.copiaOpenWithSecret(h, 'otra frase inventada 902')), 'Clave');
  assert.equal(await copiaFalla(e.bytes, h => c.copiaOpenWithSecret(h, 'ABCD-EFGH-JKMN-PQRS-TVWX-YZ01')), 'Clave');
  // La cabecera en claro no lleva la huella, y en todo el archivo no aparece texto de las notas.
  const claro = Buffer.from(e.bytes).toString('latin1');
  assert.doesNotMatch(claro, /Persona Inventada|X-901|pasiente|"bio"|inventado\.mp3/);
  const cab = JSON.parse(Buffer.from(e.bytes.subarray(24, 24 + new DataView(e.bytes.buffer).getUint32(20))).toString('utf8'));
  assert.deepEqual(Object.keys(cab).sort(), ['app', 'bloques', 'contenido', 'creado', 'formato', 'id', 'pw', 'rec']);
  assert.equal(cab.bloques, 9, 'tres registros, ajustes, ficha, tres fragmentos y fin');
  assert.match(c.copiaName(new Date(2026, 10, 17, 9, 5).getTime()), /^DictaVoz-copia-2026-11-17\.dictanota$/);
});

test('copia K1: una copia cortada o alterada en cualquier lugar se rechaza entera', async () => {
  const e = await copiaEjemplo(), n = e.bytes.length;
  assert.equal(await copiaFalla(e.bytes, e.abrir), null, 'la copia intacta pasa');
  // Cortada en cada posición (de a 5 bytes y en los últimos 40): nunca pasa, y dice que está incompleta.
  const cortes = new Set([0, 1, 15, 16, 20, 23, 24]);
  for (let i = 0; i < n; i += 5) cortes.add(i);
  for (let i = Math.max(0, n - 40); i < n; i++) cortes.add(i);
  for (const i of cortes) {
    const why = await copiaFalla(e.bytes.subarray(0, i), e.abrir);
    assert.ok(why === 'Cortada' || (i === 0 && why === 'NoEsCopia'), 'corte en ' + i + ': ' + why);
  }
  // Un byte cambiado en cualquier lugar (de a 3): siempre se rechaza.
  for (let i = 0; i < n; i += 3) {
    const b = e.bytes.slice(); b[i] ^= 0x20;
    const why = await copiaFalla(b, e.abrir);
    assert.ok(['Alterada', 'NoEsCopia', 'FormatoNuevo', 'Cortada'].includes(why), 'byte ' + i + ': ' + why);
  }
  // Datos de más al final.
  assert.equal(await copiaFalla(new Uint8Array([...e.bytes, 0]), e.abrir), 'Alterada');
  // Un archivo que no es una copia.
  assert.equal(await copiaFalla(new TextEncoder().encode('Persona Inventada Uno: esto es un texto cualquiera.'), e.abrir), 'NoEsCopia');
  assert.equal(await copiaFalla(new Uint8Array(0), e.abrir), 'NoEsCopia');
});

test('copia K1: formato más nuevo, bloques fuera de lugar y copias mezcladas se rechazan', async () => {
  const c = copiaApi, e = await copiaEjemplo();
  // Formato mayor: se niega antes de pedir la contraseña.
  const nuevo = e.bytes.slice(); new DataView(nuevo.buffer).setUint32(16, 2);
  let pidio = false;
  assert.equal(await copiaFalla(nuevo, async () => { pidio = true; return e.abrir(); }), 'FormatoNuevo');
  assert.equal(pidio, false, 'no pide la contraseña de un formato que no conoce');
  assert.match(c.COPIA_MSG.FormatoNuevo, /versión más nueva/);
  // Fragmentos de audio en otro orden: el archivo se arma, pero no pasa la comprobación.
  assert.equal(await copiaFalla((await copiaEjemplo({audioAlReves: true})).bytes, e.abrir).then(x => x), 'Alterada');
  // Una copia «solo texto» no puede llevar audios.
  await assert.rejects(copiaEjemplo({contenido: 'solo-texto'}), /solo texto/);
  const solo = await copiaEjemplo({contenido: 'solo-texto', sinAudio: true});
  const r = await c.copiaVerify(solo.blob, solo.abrir);
  assert.deepEqual([r.contenido, r.audios, r.fragmentos, r.registros], ['solo-texto', 0, 0, 3]);
  // Las claves de otra protección no abren esta copia (cada copia va atada a su id).
  assert.equal(await copiaFalla(e.bytes, solo.abrir), 'Alterada');
  // Cambiar la contraseña después no afecta a la copia: sigue abriendo con la que valía al crearla.
  assert.equal((await c.copiaVerify(e.blob, h => c.copiaOpenWithSecret(h, COPIA_PASS))).audios, 1);
  // Nombres y tamaños de bloque fuera de rango.
  assert.throws(() => c.copiaHead('X', 'a', 1)); assert.throws(() => c.copiaHead('R', '', 1)); assert.throws(() => c.copiaHead('R', 'a'.repeat(201), 1)); assert.throws(() => c.copiaHead('R', 'a', -1));
});

test('copia K1: el archivo de ejemplo fijo del formato 1 se sigue abriendo', async () => {
  const c = copiaApi, bytes = readFileSync(new URL('./copia-formato-1.dictanota', import.meta.url));
  const file = new Blob([bytes]);
  const r = await c.copiaVerify(file, h => c.copiaOpenWithSecret(h, COPIA_PASS));
  assert.deepEqual({formato: r.formato, contenido: r.contenido, registros: r.registros, audios: r.audios, fragmentos: r.fragmentos, bytesAudio: r.bytesAudio, cuadernos: r.cuadernos, notas: r.notas, creado: r.creado},
    {formato: 1, contenido: 'completa', registros: 3, audios: 1, fragmentos: 3, bytesAudio: 1050, cuadernos: 1, notas: 2, creado: 1763340000000});
  // También con su código de recuperación (inventado, guardado junto al archivo solo para esta prueba).
  const codigo = readFileSync(new URL('./copia-formato-1.codigo.txt', import.meta.url), 'utf8').trim();
  assert.match(codigo, /^([0-9A-Z]{4}-){5}[0-9A-Z]{4}$/);
  assert.equal((await c.copiaVerify(file, h => c.copiaOpenWithSecret(h, codigo))).registros, 3);
});

test('copia K1: solo lee; no escribe, no borra y no sale a la red', () => {
  assert.doesNotMatch(copiaBlock, /localStorage|indexedDB|fetch\(|XMLHttpRequest|innerHTML|\beval\b|new Function|document\.|setItem|removeItem/);
  assert.doesNotMatch(copiaUso, /setItem\(|removeItem\(|anPut\w*\(|anDelete\w*\(|anTruncate\w*\(|\.put\(|\.delete\(|\.clear\(|fetch\(|XMLHttpRequest|innerHTML|\beval\b|new Function|convStore\.save|vault\.(enable|disable|changePassword|newRecovery|addBio|removeBio)/);
  // Lo protegido se lee por el almacén cifrado o como registros ya cifrados; nunca en claro desde localStorage.
  assert.deepEqual([...copiaUso.matchAll(/localStorage\.getItem\((\w+)\)/g)].map(m => m[1]).sort(), ['CKEY', 'GKEY']);
  assert.match(copiaUso, /vault\.records\.all\(\)/); assert.match(copiaUso, /vaultStore\.getItem\(k\)/);
  // Se comprueba entera antes de descargarla.
  assert.ok(copiaUso.indexOf('await copiaVerify(file') < copiaUso.indexOf('download(file)'), 'primero se comprueba, después se descarga');
  for (const id of ['copiaPanel', 'copiaCrear', 'copiaVerificar', 'copiaArchivo', 'copiaContenido', 'copiaCompleta', 'copiaSoloTexto', 'copiaPwForm', 'copiaClaveForm', 'copiaMsg']) assert.ok(ids.includes(id), 'falta #' + id);
  // La interfaz no promete lo que todavía no existe ni usa palabras prohibidas.
  const panel = html.match(/<section class="vault-panel" id="copiaPanel"[\s\S]*?<\/section>/)[0];
  assert.match(panel, /Una copia es un archivo cifrado/); assert.doesNotMatch(panel + copiaUso, /cifrado seguro|sin nube|restaurad[ao] correctamente/i);
});

/* ---------- B3: lista de cuadernos y menú de la nota (solo presentación; datos inventados) ---------- */
test('B3: fecha corta y vista previa de la lista, sin tocar los sellos guardados', () => {
  const c = conv, ahora = new Date(2026, 10, 17, 15, 30).getTime();
  assert.equal(c.convRelative(new Date(2026, 10, 17, 9, 5).getTime(), ahora), 'Hoy 09:05');
  assert.equal(c.convRelative(new Date(2026, 10, 16, 23, 59).getTime(), ahora), 'Ayer 23:59');
  assert.equal(c.convRelative(new Date(2026, 10, 17, 0, 0).getTime(), ahora), 'Hoy 00:00');
  assert.equal(c.convRelative(new Date(2026, 10, 15, 12, 0).getTime(), ahora), '15/11/2026');
  assert.equal(c.convRelative(new Date(2025, 11, 31, 12, 0).getTime(), new Date(2026, 0, 1, 8, 0).getTime()), 'Ayer 12:00', 'cambio de año');
  assert.equal(c.convRelative(null, ahora), ''); assert.equal(c.convRelative(NaN, ahora), '');
  assert.equal(c.convPreview('  Persona Inventada Uno\n\n  dijo   algo  '), 'Persona Inventada Uno dijo algo');
  const largo = c.convPreview('X-901 '.repeat(40));
  assert.equal(largo.length, 60); assert.ok(largo.endsWith('…'));
  assert.equal(c.convPreview(''), ''); assert.equal(c.convPreview(null), ''); assert.equal(c.convPreview(undefined), '');
  // El resumen trae el texto de la nota más reciente con texto, y no cambia nada de los datos.
  let d = c.convEmpty();
  const r1 = c.convAddEntry(d, {conversationId: null, kind: 'texto', savedAt: 1000, text: 'Primera nota inventada'}); d = r1.data;
  d = c.convAddEntry(d, {conversationId: r1.conversation.id, kind: 'texto', savedAt: 2000, text: 'Segunda nota, madre de X-901'}).data;
  const antes = JSON.stringify(d), s = c.convSummaries(d);
  assert.deepEqual([s[0].count, s[0].lastSavedAt, s[0].preview], [2, 2000, 'Segunda nota, madre de X-901']);
  assert.equal(JSON.stringify(d), antes, 'armar el resumen no modifica los datos');
});

test('B3 (revisión 22/11): la burbuja permite copiar directamente; Copiar, Editar, Mover y Borrar van en el menú', () => {
  const render = html.match(/function renderConv\(\)\{[\s\S]*?\n\}/)[0];
  assert.ok(render.includes("acts.append(convButton('Copiar', () => convCopy(e.text)), more)"));
  assert.match(render, /menu\.append\(item\('Copiar'[^\n]*item\('Editar'[^\n]*item\('Mover a otro cuaderno'[^\n]*item\('Borrar esta nota'[^\n]*'ghost danger'\)\);/);
  assert.match(render, /aria-haspopup', 'menu'/); assert.match(render, /aria-expanded', 'false'/); assert.match(render, /setAttribute\('role', 'menu'\)/);
  // Todo con textContent (convButton y createElement); nada de innerHTML con datos.
  assert.doesNotMatch(render, /innerHTML|insertAdjacentHTML|outerHTML/);
  assert.match(html, /\.conv-menu\[hidden\]\{display:none\}/, 'el menú cerrado no ocupa lugar');
  assert.match(html, /\.conv-actions \.conv-more\{flex:0 0 56px;min-width:56px/, 'el botón del menú mide al menos 48 px');
  // El ajuste es un campo opcional de la configuración existente: sin claves nuevas.
  assert.ok(ids.includes('listPreview'));
  assert.match(html, /listPreview:\$\('listPreview'\)\.checked, \.\.\.\(cfgLastBackup \? \{lastBackupAt: cfgLastBackup\} : \{\}\)\}\)\);/);   // U16: lastBackupAt es el único campo nuevo
  assert.match(html, /if \(typeof c\.listPreview === 'boolean'\) \$\('listPreview'\)\.checked = c\.listPreview;/);
  assert.match(html, /id="listPreview" class="aj-sw" checked>/, 'activada por defecto');   // U16: ahora es un interruptor
});


test('Revisión estética y de marketing 22/11: marca, encabezado, Dictar y honestidad', () => {
  assert.match(html, /<meta name="description" content="Dictá, transcribí en tu celular y anonimizá antes de compartir\.">/);
  assert.match(html, /<link rel="icon" href="data:image\/svg\+xml,/, 'favicon en línea (img-src permite data:)');
  assert.ok(/img-src 'self' data: blob:/.test(html));
  assert.ok(html.includes('<span class="vh">Procesamiento local</span>'), 'el chip «Local» conserva el texto completo para lectores de pantalla');
  assert.doesNotMatch(html, /Beta · solo datos ficticios|BETA VISUAL SEPARADA/);
  assert.doesNotMatch(html, /sin nube|100 ?% privado|cifrado infalible|anonimización infalible/i);
  assert.match(html, /body\[data-view="grabacion"\]\.record-mic-visible #studioDockCapture\{display:none!important\}/, 'R1: sin controles repetidos con el círculo a la vista');
  assert.match(html, /'Transcribiendo por partes mientras grabás'/);
  assert.ok(!/class="beta-whisper-shortcut"/.test(html), 'S1: Ajustes ya no empieza por el motor');
  assert.ok(html.indexOf('id="ajProtect"') < html.indexOf('id="ajCopy"'), 'S2: Activar protección es la acción principal de la tarjeta');
  assert.doesNotMatch(html, /screen-overline">(CUADERNOS|PRIVACIDAD|PERSONALIZACIÓN)/, 'G5: un título por pantalla');
  const empty = html.match(/function convEmptyState\(\)\{[\s\S]*?\n\}/)[0], av = html.match(/function convAvatar\([\s\S]*?\n\}/)[0];
  for (const f of [empty, av]) assert.doesNotMatch(f, /innerHTML|insertAdjacentHTML|outerHTML/);
});
