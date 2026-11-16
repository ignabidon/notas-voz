import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);

test('título y punto único de entrada', () => {
  assert.match(html, /<title>DictaNota · Prueba Delta/);
  assert.match(html, /<h1>DictaNota<\/h1>/);
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

test('Guardar agrega el mensaje a una hoja, sin descargar archivos ni usar las notas anteriores', () => {
  const handler = html.match(/\$\('save'\)\.onclick = \(\) => \{([\s\S]*?)\n\};/);
  assert.ok(handler, 'falta acción de Guardar');
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
  assert.match(html, /class="settings-module-top"/);
  assert.match(html, /Micrófono y rendimiento/);
  assert.match(html, /Otras opciones/);
  assert.match(html, /No elimina los archivos de Descargas/);
  assert.match(html, /removeLocalTextKeys\(vaultStore, TEXT_STORAGE_KEYS\)/);
  assert.match(html, /'localPrivacy'\)\.open=true/);
});

test('Delta 08: nuevo sistema visual y diseño móvil adaptable', () => {
  assert.match(html,/\/\* DELTA 08: three real screens/);
  assert.match(html,/--bg:#F4F7F8/);
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
  assert.match(recording.title,/Whisper por partes/);
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


test('Delta 11: guardar audio accesible en Grabar reutiliza audio existente', () => {
  assert.match(html, /id="recordDownloadAudio"/);
  assert.match(html, /id="recordSaveAudio"/);
  assert.match(html, /id="recordAudioHint"/);
  assert.match(html, /\$\('recordDownloadAudio'\)\.onclick = \(\) => \{/);
  assert.match(html, /\$\('aDown'\)\.click\(\)/);
  assert.match(html, /\$\('recordDownloadAudio'\)\.disabled = !m \|\| audioBusy\(\)/);
  assert.match(html, /refreshAudioBox\(\); \/\/ habilita Descargar audio/);
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
  const make=storage=>new Function('localStorage','$','eng','CKEY',line+';return saveCfg;')(storage,id=>({value:values[id],checked:true}),()=> 'whisper','notasvoz.gamma.cfg.v1');
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
  assert.match(html, /function refreshAnonPreview\(\)\{ \$\('anonPreview'\)\.textContent = \$\('text'\)\.value; \}/);
  assert.match(html, /attributeFilter: \['data-view'\]/);
  assert.match(html, /function updatePersonPreview\(\)/);
  assert.match(html, /se va a escribir así: /);
  assert.match(html, /'Se escribe: ' \+ \(p\.code/);
});

test('Audios: siempre a la vista, con acceso directo desde Grabar, Texto y Ajustes', () => {
  assert.doesNotMatch(html, /<div class="abox" id="audioBox" style="display:none">/);
  assert.doesNotMatch(html, /\$\('audioBox'\)\.style\.display/);
  assert.match(html, /<div class="abox" id="audioBox">/);
  assert.match(html, /Tus audios guardados/);
  assert.match(html, /id="audioEmpty"/);
  assert.match(html, /id="audioShortcut"/);
  // el cuadro de audio está antes del estado de transcripción y de los detalles técnicos
  assert.ok(html.indexOf('id="audioBox"') < html.indexOf('id="keepOn"'));
  assert.equal((html.match(/data-go-target="audioBox"/g) || []).length, 3, 'accesos desde Audio, Texto y Ajustes');
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
  assert.match(nav, /data-delta-view="grabacion"[\s\S]*?<span>Audio<\/span>/);
  assert.match(html, /<h2>Nueva nota<\/h2>/);
  for (const id of ['audioDone','audioDoneText','audioDoneDownload','audioDoneClose','audioDoneWait','audioShortcut','loadAudioBtn','loadAudioFile'])
    assert.ok(ids.includes(id), 'falta #' + id);
  assert.doesNotMatch(html, /id="audioNotice"/, 'el aviso fijo de la barra se reemplazó por el de la pestaña Audio');
  assert.match(html, /\.audio-done\{background:var\(--success-bg\)/);
  assert.match(html, /\.then\(refreshAudioBox\)\.then\(\(\) => \{ if \(!audioSaveFailed && audioN\) showAudioDone\(\); \}\)/);
  assert.match(html, /mr\.start\(10000\); hideAudioDone\(\);/);
  // botón «Mis grabaciones» debajo del micrófono grande, antes de «Conservar también el audio»
  assert.ok(html.indexOf('id="rec"') < html.indexOf('id="audioShortcut"') && html.indexOf('id="recordSaveAudio"') < html.indexOf('id="rec"'));
  // puntos de novedad
  assert.match(html, /a\[data-badge\]::after/);
  assert.match(html, /notifyNav\('grabacion', 'audio guardado'\)/);
  assert.match(html, /notifyNav\('transcripcion', 'transcripción lista'\)/);
  assert.match(html, /function clearNavBadge\(view\)/);
  assert.match(html, /attributeFilter: \['data-view'\]\}\);\nlet armTextBadge/);
});

test('Audio cargado: se transcribe sin guardarse y con límites claros', () => {
  assert.match(html, /async function transcribeBlob\(getBlob, ms, what, imported = false\)/);
  assert.match(html, /transcribeBlob\(\(\) => f, null, 'el audio cargado', true\)/);
  assert.match(html, /transcribeBlob\(\(\) => withDeadline\(audioGetBlob\(m\)/);
  const loader = html.match(/\$\('loadAudioFile'\)\.addEventListener\('change'[\s\S]*?\n\}\);/)[0];
  assert.doesNotMatch(loader, /audioPut|audioClear|IndexedDB|localStorage/, 'el audio cargado no se guarda');
  assert.match(html, /LOAD_MAX_SEC = 90 \* 60, LOAD_MAX_BYTES = 200 \* 1024 \* 1024/);
  assert.match(html, /no se guarda<\/b>: solo se transcribe/);
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
  assert.doesNotThrow(() => validate(200*1024*1024, 900));
  for (const sec of [0, -1, Infinity, NaN, 901]) assert.throws(() => validate(1024, sec));
  assert.throws(() => validate(200*1024*1024+1, 1));
  assert.match(html, /if \(imported\) await inspectImport\(blob\); pcm = await decodePcm/);
  const probe = html.slice(html.indexOf('function inspectImport'), html.indexOf('async function decodePcm'));
  assert.match(probe, /URL.revokeObjectURL/); assert.match(probe, /clearTimeout/);
});

test('captura global: grabando, pausa y fin, con preferencia de conservación', () => {
  const source = html.match(/function updateDockRecording\(\)\{[\s\S]*?\n\}/)[0];
  const elements = Object.fromEntries(['studioDockCapture','studioDockNotes','studioDockMode','studioDockRetention','studioDockClock','studioDockPause','studioDockStop','pause','rec','saveAudio'].map(id=>[id,{classList:{toggle(){}},checked:true,disabled:false}]));
  const context = { $:id=>elements[id], recording:true, paused:false, elapsedMs:()=>3000, fmtClock:()=> '00:03' };
  new Script(source+';updateDockRecording()').runInNewContext(context);
  assert.equal(elements.studioDockCapture.hidden,false);
  assert.equal(elements.studioDockMode.textContent,'Grabando');
  assert.equal(elements.studioDockRetention.textContent,'Conservar audio: Sí');
  context.paused=true; elements.saveAudio.checked=false;
  new Script(source+';updateDockRecording()').runInNewContext(context);
  assert.equal(elements.studioDockMode.textContent,'En pausa');
  assert.equal(elements.studioDockRetention.textContent,'Conservar audio: No');
  context.recording=false;
  new Script(source+';updateDockRecording()').runInNewContext(context);
  assert.equal(elements.studioDockCapture.hidden,true);
  assert.doesNotMatch(source,/setInterval|setTimeout/);
});

test('ayudas accesibles: controles únicos, destino debajo y advertencias fuera', () => {
  const buttons=[...html.matchAll(/<button[^>]*class="info-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="([^"]+)"/g)];
  assert.ok(buttons.length>=4);
  for(const m of buttons){
    assert.ok(ids.includes(m[1]));
    assert.ok(html.indexOf('id="'+m[1]+'"')>m.index);
    assert.match(m[0],/aria-label=/);
  }
  assert.match(html, /#studioDockCapture:not\(\[hidden\]\):not\(.paused\) .capture-dot\{animation:capturePulse/);
  assert.match(html, /prefers-reduced-motion:reduce\)\{#studioDockCapture .capture-dot\{animation:none!important/);
  assert.match(html, /id="loadAudioHint">[\s\S]*?200 MB y 15 minutos/);
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
  assert.match(html, /vaultSetHooks\(\(\) => recording \|\| busy \|\| outstanding > 0 \|\| feeding, saveDraft\);/);
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
const conv = new Function(convSrc + ';return {convDeleteEntry, convDeleteConversation, convSummaries, CONV_KEY, convEmpty, convStamp, convValid, convEntriesOf, convAddEntry, convEditText, convRename, convMoveEntry, convMoveEntries, convMoveAll, convUndoMove, convIsEmpty, convCopyText, convCheckWrite, convFromLegacy, convToLegacyNotes, convMakeStore};')();
const BA = 180; // getTimezoneOffset() de Buenos Aires
const T1042 = Date.UTC(2026, 10, 16, 13, 42); // 16/11/2026 10:42 en Argentina
const seqIds = () => { let n = 0; return () => 'id' + (++n); };
const guardar = (d, extra, ids) => conv.convAddEntry(d, {kind: 'audio', tzOffsetMin: BA, ...extra}, {newId: ids || seqIds()});

test('conversaciones: el bloque está aislado y la pantalla Notas lo usa con el almacén cifrado', () => {
  assert.ok(convSrc, 'falta el bloque CONV');
  assert.doesNotMatch(convSrc, /localStorage|vaultStore|indexedDB|innerHTML|document\.|\beval\b|new Function|fetch\(/);
  assert.match(html, /const convStore = convMakeStore\(vaultStore, \(\) => vault\.state === 'off' \|\| vault\.state === 'open'\);/);
  assert.match(html, /renderList\(\); convInit\(\); restoreDraft\(\);/, 'se carga y migra al desbloquear, antes de recuperar el borrador');
  assert.ok(!/localStorage\.(get|set|remove)Item\(CONV_KEY|localStorage\.(get|set|remove)Item\('notasvoz\.dictanota/.test(html), 'las hojas no se leen por fuera del almacén cifrado');
  const ui = html.slice(html.indexOf('/* ---------- Notas en hojas'), html.indexOf('function convInit()'));
  assert.ok(ui.length > 1000);
  assert.doesNotMatch(ui, /\.innerHTML = (?!'')/, 'los textos del usuario van con textContent');
  assert.doesNotMatch(ui, /insertAdjacentHTML|outerHTML|\beval\b/);
});

test('Notas: la captura global va a hoja nueva y dentro de una hoja abierta se agrega ahí', () => {
  assert.match(html, /function prepareNew\(\)\{[\s\S]*?convStartPending\(true\);\n\}/);
  assert.match(html, /convTargetId = fromAudio && document\.body\.dataset\.view !== 'transcripcion' \? null : convOpenId;/);
  assert.match(html, /<span>Notas<\/span><\/a>/);
  for (const id of ['convPanel', 'convList', 'convBubbles', 'convTarget', 'convDiscard', 'convCancelEdit', 'convMoveDialog', 'convMoveAllBtn', 'convCopyAll', 'convUndo', 'convRename']) assert.ok(ids.includes(id), 'falta #' + id);
});

test('Notas: descartar pide confirmación y la recuperación automática guarda el estado del mensaje', () => {
  assert.match(html, /confirm\('¿Descartar esta nota sin guardar\?'\)/);
  assert.match(html, /const snap = \(\) => JSON\.stringify\(\{[^}]*conv: \{open: convOpenId, target: convTargetId, targetSet: convTargetSet, editing: convEditingId/);
  assert.match(html, /Se recuperó un mensaje sin guardar\. Tocá Guardar o Descartar\./);
  assert.match(html, /confirm\('¿Borrar esta nota\? No se puede deshacer\.'\)/);
});

test('conversaciones: la clave nueva queda protegida por el cifrado', () => {
  assert.equal(conv.CONV_KEY, 'notasvoz.dictanota.v2');
  assert.match(html, /'notasvoz\.dictanota\.v2': 'conversaciones'/);
  const vk = new Function((html.match(/const VAULT_KEYS = \{[\s\S]*?\};/) || [''])[0] + ';return VAULT_KEYS;')();
  assert.equal(vk['notasvoz.dictanota.v2'], 'conversaciones');
  for (const k of ['notasvoz.gamma.v1', 'notasvoz.gamma.draft.v1', 'notasvoz.gamma.undo.v1', 'notasvoz.gamma.people.v1', 'notasvoz.gamma.dict.v1']) assert.ok(vk[k], 'se conserva ' + k);
});

test('conversaciones: el sello es la hora de guardado y titula la hoja nueva', () => {
  assert.equal(conv.convStamp(T1042, BA), '16/11/2026 · 10:42');
  assert.equal(conv.convStamp(Date.UTC(2026, 0, 1, 2, 5), BA), '31/12/2025 · 23:05');
  const r = guardar(conv.convEmpty(), {savedAt: T1042, recordedAt: T1042 - 300000, text: 'Comprar yerba.'});
  assert.equal(r.created, true);
  assert.equal(r.conversation.title, '16/11/2026 · 10:42', 'título = hora de guardado, no de inicio de grabación');
  assert.equal(r.entry.savedAt, T1042);
  assert.equal(r.entry.recordedAt, T1042 - 300000);
  assert.throws(() => guardar(conv.convEmpty(), {text: 'x'}), /guardado/);
});

test('conversaciones: sin texto ni audio no se crea ninguna hoja', () => {
  const d = conv.convEmpty();
  for (const text of ['', '   \n ']) {
    const r = guardar(d, {savedAt: T1042, text});
    assert.equal(r.entry, null); assert.equal(r.data, d);
  }
  assert.equal(guardar(d, {savedAt: T1042, text: '', audioId: 'a1'}).created, true, 'un audio guardado sin transcribir sí crea la hoja');
  assert.throws(() => conv.convAddEntry(d, {kind: 'heredado', savedAt: T1042, text: 'x'}), /Tipo/);
});

test('conversaciones: dos guardados globales son dos hojas; dentro de una hoja se agrega ahí', () => {
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
  assert.ok(conv.convIsEmpty(m.data, origen) && m.data.conversations.some(c => c.id === origen), 'la hoja de origen queda vacía pero no se borra sola');
  assert.equal(conv.convCheckWrite(antes, m.data), '');
  assert.equal(conv.convUndoMove(m.data, m.undo).entries.find(x => x.id === e.id).conversationId, origen);
  assert.throws(() => conv.convMoveEntry(d, e.id, 'no-existe'), /no existe/);
  assert.throws(() => conv.convRename(d, destino, '   '), /vacío/);
});

test('conversaciones: pasar toda una hoja a otra conserva sellos y se puede deshacer', () => {
  const ids = seqIds();
  let r = guardar(conv.convEmpty(), {savedAt: T1042, text: 'Sesión ficticia 1.'}, ids);
  const hojaA = r.conversation.id;
  r = conv.convAddEntry(r.data, {conversationId: hojaA, kind: 'audio', savedAt: T1042 + 7 * 864e5, tzOffsetMin: BA, text: 'Sesión ficticia 2.'}, {newId: ids});
  r = guardar(r.data, {savedAt: T1042 + 1e5, text: 'Otra hoja.'}, ids);
  const hojaB = r.conversation.id, antes = r.data;
  const m = conv.convMoveAll(antes, hojaA, hojaB, T1042 + 9e8);
  assert.equal(conv.convEntriesOf(m.data, hojaB).length, 3);
  assert.ok(conv.convIsEmpty(m.data, hojaA));
  assert.equal(conv.convCheckWrite(antes, m.data), '');
  assert.deepEqual(conv.convEntriesOf(m.data, hojaB).map(e => e.text), ['Sesión ficticia 1.', 'Otra hoja.', 'Sesión ficticia 2.'], 'quedan ordenadas por hora de guardado');
  const vuelta = conv.convUndoMove(m.data, m.undo);
  assert.equal(conv.convEntriesOf(vuelta, hojaA).length, 2);
  assert.equal(conv.convEntriesOf(vuelta, hojaB).length, 1);
  assert.throws(() => conv.convMoveAll(antes, hojaA, hojaA), /otra hoja/);
});

test('conversaciones: copiar toda una hoja lleva título, fecha de cada mensaje y texto', () => {
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
      {id: 'e3', conversationId: 'cX', kind: 'texto', savedAt: T1042, text: 'sin hoja'},
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

test('conversaciones: con la protección activada la hoja se guarda cifrada y bloqueada no se ve', async () => {
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

test('conversaciones: borrar un mensaje y solo hojas vacías; lista de hojas por actividad', () => {
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
