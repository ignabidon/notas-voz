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
  assert.match(html, /DELTA 11 · VERSIÓN DE PRUEBA/);
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



test('Delta 08: navegación inferior de tres pantallas reales', () => {
  const nav=html.match(/<nav class="studio-nav"[\s\S]*?<\/nav>/);
  assert.ok(nav);
  assert.equal((nav[0].match(/data-delta-view="/g)||[]).length,3);
  for(const tab of ['grabacion','transcripcion','ajustes']) assert.match(nav[0],new RegExp('data-delta-view="'+tab+'"'));
  assert.doesNotMatch(nav[0],/studioPrivacyLink/);
  assert.match(html, /<body data-view="grabacion">/);
  assert.match(html, /body\[data-view="grabacion"\] \.c-edit/);
  assert.match(html, /body\[data-view="transcripcion"\] \.c-rec/);
  assert.match(html, /body\[data-view="ajustes"\] \.c-rec/);
});

test('Delta 08: cambiar pantallas conserva un único DOM y actualiza el tab activo', () => {
  const match=html.match(/function chooseDeltaView\(view, scrollToTop=true\) \{[\s\S]*?\n  \}/);
  assert.ok(match,'falta selector de pantallas');
  const settings={open:false};
  const tabs=['grabacion','transcripcion','ajustes'].map(deltaView=>({
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
    match[0]+'; return chooseDeltaView;')(['grabacion','transcripcion','ajustes'],doc,win);
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
  assert.match(html,/id="studioAnonAction"/);
  assert.match(html,/id="save"/);
  assert.match(html,/function updateDockRecording\(\)/);
  assert.match(html,/studioDockStop'\)\.addEventListener\('click',\(\)=>\$\('rec'\)\.click\(\)/);
  assert.match(html,/record-clock/);
  assert.match(html,/id="clock"/);
});

test('Delta 08: editor protagonista y herramientas secundarias accesibles', () => {
  assert.match(html,/class="screen-title text-screen-title"/);
  assert.match(html,/textarea#text\{background:#0e1a24/);
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
  assert.match(html, /class="settings-module-top"/);
  assert.match(html, /Micrófono y rendimiento/);
  assert.match(html, /Otras opciones/);
  assert.match(html, /No elimina los archivos de Descargas/);
  assert.match(html, /removeLocalTextKeys\(localStorage, TEXT_STORAGE_KEYS\)/);
  assert.match(html, /'localPrivacy'\)\.open=true/);
});

test('Delta 08: nuevo sistema visual y diseño móvil adaptable', () => {
  assert.match(html,/\/\* DELTA 08: three real screens/);
  assert.match(html,/--bg:#090f18/);
  assert.match(html,/#rec\{width:154px;height:154px/);
  assert.match(html,/#clock\{font-size:64px/);
  assert.match(html,/\.studio-dock \.studio-nav\{display:grid;grid-template-columns:repeat\(3,1fr\)/);
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
  assert.match(recording.title,/en vivo/);
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
  assert.equal(icons.length,3);
  for(const icon of icons) {
    assert.match(icon,/viewBox="0 0 24 24"/);
    assert.match(icon,/stroke-width="1.9"/);
    assert.match(icon,/stroke-linecap="round"/);
    assert.match(icon,/stroke-linejoin="round"/);
  }
  assert.match(nav[0],/id="studioSettingsLink"[\s\S]*?<circle cx="12" cy="6" r="2"\/><circle cx="17" cy="12" r="2"\/><circle cx="9" cy="18" r="2"\/>/);
  assert.match(nav[0],/data-delta-view="grabacion"/);
  assert.match(nav[0],/data-delta-view="transcripcion"/);
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


test('Delta 11: guardar audio accesible en Grabar reutiliza audio existente', () => {
  assert.match(html, /id="recordDownloadAudio"/);
  assert.match(html, /id="recordSaveAudio"/);
  assert.match(html, /id="recordAudioHint"/);
  assert.match(html, /\$\('recordDownloadAudio'\)\.onclick = \(\) => \{/);
  assert.match(html, /\$\('aDown'\)\.click\(\)/);
  assert.match(html, /\$\('recordDownloadAudio'\)\.disabled = !m \|\| audioBusy\(\)/);
  assert.match(html, /refreshAudioBox\(\); \/\/ habilita Guardar audio/);
  assert.match(html, /audioGetBlob\(m\)/);
});

test('Delta 11: interruptor de guardar audio sincroniza Ajustes y pantalla Grabar', () => {
  assert.match(html, /\$\('recordSaveAudio'\)\.addEventListener\('change'/);
  assert.match(html, /\$\('saveAudio'\)\.checked = \$\('recordSaveAudio'\)\.checked/);
  assert.match(html, /\$\('saveAudio'\)\.dispatchEvent\(new Event\('change', \{bubbles:true\}\)\)/);
  assert.match(html, /\$\('saveAudio'\)\.addEventListener\('change'/);
  assert.match(html, /\$\('recordSaveAudio'\)\.checked = \$\('saveAudio'\)\.checked/);
  assert.match(html, /loadCfg\(\); \$\('recordSaveAudio'\)\.checked = \$\('saveAudio'\)\.checked/);
  assert.match(html, /\$\('recordSaveAudio'\)\.disabled = on;/);
  assert.match(html, /Solo con Whisper|recEng === 'whisper'/);
});

test('Delta 11: Compartir texto no exige archivo Word ni oculta errores', async () => {
  const match = html.match(/async function shareNote\(\) \{[\s\S]*?\n\}/);
  assert.ok(match);
  assert.match(match[0], /navigator\.share\(payload\)/);
  assert.doesNotMatch(match[0], /makeDoc\(\)|navigator\.canShare/);
  assert.match(match[0], /e\.name === 'AbortError'/);
  assert.match(match[0], /No se pudo compartir/);
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
