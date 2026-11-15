import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);

test('título y punto único de entrada', () => {
  assert.match(html, /<title>Grabador de voz Delta/);
  assert.match(html, /<h1>Grabador de voz Delta<\/h1>/);
  assert.match(html, /Prueba Delta 01/);
});

test('los scripts se pueden analizar', () => {
  assert.ok(scripts.length >= 2);
  scripts.forEach((s,i) => assert.doesNotThrow(() => new Script(s, { filename: 'inline-'+i+'.js' })));
});

test('IDs únicos y referencias existentes', () => {
  assert.equal(new Set(ids).size, ids.length, 'IDs duplicados');
  const refs = [...html.matchAll(/\$\('([^']+)'\)/g)].map(m => m[1]);
  for (const id of refs) assert.ok(ids.includes(id), 'falta #'+id);
});

test('controles de voz visibles y sincronizados', () => {
  for (const id of ['rec','pause','save','studioDockNotes','studioDockCapture','studioDockPause','studioDockStop','studioAnonAction']) assert.ok(ids.includes(id), 'falta #'+id);
  assert.ok(html.includes("document.getElementById('studioSettingsLink')"));
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

test('Guardar .txt solicita una descarga sin perder el guardado local', () => {
  const handler = html.match(/\$\('save'\)\.onclick = \(\) => \{([\s\S]*?)\n\};/);
  assert.ok(handler, 'falta acción de Guardar nota');
  assert.match(handler[1], /const savedLocally = persist\(\)/);
  assert.match(handler[1], /download\(makeTxt\(\)\)/);
  assert.match(html, /<span>Guardar \.txt<\/span>/);
  assert.doesNotMatch(handler[1], /fetch\(|XMLHttpRequest|sendBeacon\(/);
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
  assert.match(html, /SR\.available\(\{langs: \['es-AR'\], processLocally: true\}\)/);
  assert.match(html, /SR\.install\(\{langs: \['es-AR'\], processLocally: true\}\)/);
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
  assert.match(html, /else if \(e\.error === 'no-speech'\)/);
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
  assert.match(m[1], /removeLocalTextKeys\(localStorage, TEXT_STORAGE_KEYS\)/);
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
