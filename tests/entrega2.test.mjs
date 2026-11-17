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
    "let lastDraft = '', draftWriteQueue = Promise.resolve(), draftErrorShown = false, draftWriteVersion = 0;\n" + code +
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
  assert.deepEqual(await Promise.all([old,newer]),[false,true], 'la versión anterior fue superada; solo se confirma la nueva');
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
  assert.match(recover,/convAudioId = id; convAudioMs = anTotalMs\(h.detail\)/);
  assert.match(recover,/const saved = await saveDraft\(\)/);
  assert.match(recover,/Audio recuperado como borrador/);
  assert.doesNotMatch(recover,/convAddEntry\(|e3Write\(/);
});

test('P1/P4: el formato de copia y los identificadores criptográficos no cambian', () => {
  assert.match(html,/const VAULT_HEADER = 'notasvoz.boveda.v1'/);
  assert.match(html,/const AN_DB = 'notasvoz-dictanota-audio'/);
  assert.match(html,/const AN_DB_VERSION = 1/);
  assert.match(html,/const COPIA_FORMATO = 1|\bv: 1\b/);
});

test('P1: sin bóveda, escribir en pagehide no espera microtareas ni cola', async () => {
  const data = new Map(), snapshot = {value: 'primera versión'}, warnings = [];
  const storage = {setItem(k,v){data.set(k,v)}, getItem(k){return data.get(k) ?? null}};
  let release;
  const vault = {state:'open', readOnly:false, flush:() => new Promise(r=>{release=r}), saved:()=>true};
  const b = borrador(storage, vault, snapshot, warnings);
  const old=b.saveDraft();
  for (let i=0; i<6 && !release; i++) await Promise.resolve();
  assert.equal(typeof release,'function');
  vault.state='off';
  snapshot.value='última edición antes de cerrar';
  const closing=b.saveDraft(); // el manejador de pagehide no espera una promesa
  assert.equal(data.get('notasvoz.gamma.draft.v1'),snapshot.value,'la escritura ocurre dentro del mismo evento');
  assert.equal(await closing,true);
  release(); await old;
  assert.equal(data.get('notasvoz.gamma.draft.v1'),snapshot.value,'un borrador viejo no pisa la última edición');
  assert.equal(warnings.length,0);
});

test('P1: con bóveda, un bloqueo no puede ignorar un borrador sin confirmar', async () => {
  const code = html.match(/async function vaultLockNow\(\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(code,'existe la función de bloqueo');
  let reloaded=0, flushes=0, msg='';
  const vault={state:'open',pending:new Set(),cache:new Map(),key:{},audioKey:{},
    flush:async()=>{flushes++}};
  const lock=new Function('vault','vaultBusy','vaultBeforeLock','e3Stop','vaultPanelMsg','location',
    code+'\nreturn vaultLockNow;')(vault,()=>false,async()=>false,()=>{},s=>{msg=s},{reload(){reloaded++}});
  assert.equal(await lock(),false);
  assert.equal(vault.state,'open','si falla el borrador, no recargar ni descartar el editor');
  assert.equal(reloaded,0);
  assert.equal(flushes,0);
  assert.match(msg,/borrador no pudo guardarse/);
  assert.match(html,/if \(!\(await vaultBeforeLock\(\)\)\) throw new Error\('No se activó la protección/);
});

test('P1: borrador viejo ya guardado no duplica nota; distinto destino o contenido se recupera', () => {
  const start=html.indexOf('function draftAlreadyConfirmed(');
  const end=html.indexOf('\nfunction restoreDraft(){',start);
  assert.ok(start>=0 && end>start,'existe conciliación al restaurar');
  const store={data:{entries:[
    {id:'nota-1',text:'Texto confirmado',audioId:'audio-A',audioParts:2,recordedAt:101},
    {id:'nota-2',text:'Edición confirmada',audioId:null,recordedAt:77}
  ]}};
  const fn=new Function('convStore',html.slice(start,end)+'\nreturn draftAlreadyConfirmed;')(store);
  const draft=(recordedAt,text='Texto confirmado',audioId='audio-A',editing=null)=>({
    title:'',tags:[],text,conv:{recordedAt,audioId,editing}
  });
  assert.equal(fn(draft(101)),true,'no recuperar la nota ya guardada como un mensaje nuevo');
  assert.equal(fn(draft(102)),false,'texto igual escrito después es un borrador diferente');
  assert.equal(fn(draft(101,'Texto nuevo')),false,'una edición pendiente no se descarta');
  assert.equal(fn(draft(101,'Texto confirmado','audio-B')),false,'audio diferente no es el mismo borrador');
  assert.equal(fn(draft(null,'Edición confirmada',null,'nota-2')),true,'la edición ya confirmada se reconoce');
  const editConAudio = {...draft(null,'Texto confirmado','audio-A','nota-1'),conv:{editing:'nota-1',audioId:'audio-A',audioBase:2}};
  assert.equal(fn(editConAudio),false,'si se agregaron partes de audio pero la nota aún no las confirma, hay que recuperar la edición');
  assert.equal(fn({...editConAudio,conv:{...editConAudio.conv,audioBase:1}}),true,'si la nota confirma más partes, es un borrador viejo');
  assert.equal(fn({...draft(101),tags:['pendiente']}),false,'conservar etiquetas que aún puedan ser un borrador');
  assert.match(html,/lastDraft = staleConfirmed \? storedDraft : snap\(\)/,'el borrador viejo debe intentar limpiarse');
  assert.match(html,/if \(staleConfirmed\) void saveDraft\(\)/,'reintenta la limpieza');
});
