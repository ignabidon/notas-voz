// Entrega 2, P1/P4: datos inventados; sin navegadores ni contraseñas reales.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function borrador(storage, vault, snapshot, warnings){
  const start = html.indexOf('async function draftWriteConfirmed(');
  const end = html.indexOf('\nfunction restoreDraft(){', start);
  assert.ok(start > 0 && end > start, 'falta la rutina de confirmación del borrador');
  const code = html.slice(start, end);
  return new Function('vaultStore', 'vault', 'snap', 'flash', 'DRAFT',
    "let lastDraft = '', draftWriteQueue = Promise.resolve(), draftErrorShown = false;\n" + code +
    '\nreturn {saveDraft, last: () => lastDraft};'
  )(storage, vault, () => snapshot.value, s => warnings.push(s), 'notasvoz.gamma.draft.v1');
}

test('P1: una cuota agotada no adelanta el borrador marcado como persistido; reintenta', async () => {
  const data = new Map(), snapshot = {value: 'borrador uno'}, warnings = [];
  let quota = false;
  const storage = {
    setItem(k, v){ if(quota) throw new DOMException('lleno','QuotaExceededError'); data.set(k,v); },
    getItem(k){ return data.get(k) ?? null; }
  };
  const vault = {state:'off', readOnly:false, flush: async()=>{}, saved:()=>true};
  const b = borrador(storage, vault, snapshot, warnings);
  assert.equal(await b.saveDraft(), true);
  assert.equal(b.last(), 'borrador uno');
  quota = true; snapshot.value = 'borrador dos';
  assert.equal(await b.saveDraft(), false);
  assert.equal(b.last(), 'borrador uno', 'una escritura fallida no se registra como guardada');
  assert.equal(data.get('notasvoz.gamma.draft.v1'), 'borrador uno');
  assert.equal(warnings.length, 1);
  assert.equal(await b.saveDraft(), false);
  assert.equal(warnings.length, 1, 'no repetir avisos cada 1,5 segundos');
  quota = false;
  assert.equal(await b.saveDraft(), true);
  assert.equal(b.last(), 'borrador dos');
});

test('P1: no confirma borrador cifrado mientras el volcado no esté persistido', async () => {
  const data = new Map(), snapshot = {value: 'nota X-901'}, warnings = [];
  const storage = {setItem(k,v){data.set(k,v)}, getItem(k){return data.get(k) ?? null}};
  let stored = false, flushes = 0;
  const vault = {state:'open', readOnly:false, flush:async()=>{flushes++}, saved:()=>stored};
  const b = borrador(storage, vault, snapshot, warnings);
  assert.equal(await b.saveDraft(), false);
  assert.equal(b.last(), '', 'la caché descifrada no equivale a disco confirmado');
  stored = true;
  assert.equal(await b.saveDraft(), true);
  assert.equal(b.last(), snapshot.value);
  assert.equal(flushes, 2);
});

test('P1: la cola impide que un borrador viejo pise el nuevo', async () => {
  const data = new Map(), snapshot = {value:'anterior'}, warnings = [];
  const storage = {setItem(k,v){data.set(k,v)}, getItem(k){return data.get(k) ?? null}};
  let release;
  let first = true;
  const vault = {state:'open', readOnly:false,
    flush(){if (first){first=false;return new Promise(r=>{release=r})}return Promise.resolve()},
    saved:()=>true};
  const b = borrador(storage, vault, snapshot, warnings);
  const old = b.saveDraft();
  for (let i = 0; i < 5 && !release; i++) await Promise.resolve();
  assert.equal(typeof release,'function');
  snapshot.value='nuevo después de Guardar';
  const newer=b.saveDraft();
  release();
  assert.deepEqual(await Promise.all([old,newer]),[true,true]);
  assert.equal(b.last(),snapshot.value);
  assert.equal(data.get('notasvoz.gamma.draft.v1'),snapshot.value);
});

test('P4: una nota solo audio conserva estado, referencia y fecha sin texto ficticio', () => {
  const m = html.match(/\/\*CONV-START\*\/([\s\S]*?)\/\*CONV-END\*\//);
  assert.ok(m);
  const c = new Function(m[1]+';return {convEmpty,convAddEntry,convValid};')();
  let i=0;
  const now=1763382000000;
  const r=c.convAddEntry(c.convEmpty(), {conversationId:null,kind:'audio',savedAt:now,
    text:'',audioId:'audio-de-prueba', audioParts:1,transcriptionStatus:'error'},
    {newId:()=> 'id-'+(++i)});
  assert.equal(r.entry.text,'');
  assert.equal(r.entry.audioId,'audio-de-prueba');
  assert.equal(r.entry.transcriptionStatus,'error');
  assert.equal(r.entry.savedAt,now);
  assert.equal(c.convValid(JSON.parse(JSON.stringify(r.data))).ok,true);
  assert.equal(c.convAddEntry(c.convEmpty(),{kind:'audio',savedAt:now,text:''},{newId:()=> 'id'}).entry,null);
});

test('P4: guardado sin texto requiere audio íntegro; recuperación no inventa transcripción', () => {
  assert.match(html,/if \(!text\.trim\(\) && !convAudioId\) return flash/);
  assert.match(html,/if \(!text\.trim\(\) && convAudioId\) \{[\s\S]*?anAudioHealth\(/);
  assert.match(html,/if \(saveLabel\) saveLabel\.textContent = hasAudio && !hasText \? 'Guardar solo audio'/);
  const recover=html.match(/async function e3Recover\(id\)\{[\s\S]*?\n\}/)?.[0] || '';
  assert.match(recover,/text: '', transcriptionStatus: 'pendiente'/);
  assert.doesNotMatch(recover,/text: 'Audio recuperado/);
});

test('P1/P4: el formato de copia y los identificadores criptográficos no cambian', () => {
  assert.match(html,/const VAULT_HEADER = 'notasvoz.boveda.v1'/);
  assert.match(html,/const AN_DB = 'notasvoz-dictanota-audio'/);
  assert.match(html,/const AN_DB_VERSION = 1/);
  assert.match(html,/const COPIA_FORMATO = 1|\bv: 1\b/);
});
