// Correcciones del PR #60 (P2 y copia formato 2). Solo datos inventados; sin navegador.
// Cubre: inventario con exclusiones declaradas, copias mezcladas (cifrado + sin cifrar), cortes en cada byte
// de los límites de bloque, escritor atómico por audio, y que el formato 1 y su lector no cambian.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const block = name => {
  const m = html.match(new RegExp('/\\*' + name + '-START\\*/([\\s\\S]*?)/\\*' + name + '-END\\*/'));
  assert.ok(m, 'falta el bloque ' + name); return m[1];
};
const api = new Function('vault', block('VAULT-CORE') + block('AUDIONOTA') + block('P2-BIBLIOTECA') + block('COPIA') + block('COPIA2') +
  `;return {copia2Writer, copia2Verify, copia2CheckInventory, copia2Describe, copiaWriter, copiaVerify, copiaOpenWithSecret,
    vaultCreate, vaultImportDataKey, vaultDeriveAudioKey, vaultSealRecord, anNewMeta, anSetState, anNewCek, anSealChunk, anSealDetail,
    anPlainHash, anIsPlainMeta, anPlainValidMeta, COPIA2_MOTIVOS, AN_PLAIN_MODE};`)({state: 'off'});

const PASS = 'frase inventada de prueba 905';
const T0 = 1763340000000;

/* Audio cifrado inventado (dos fragmentos) y audio sin cifrar inventado (dos fragmentos). */
async function material(){
  const c = await api.vaultCreate(PASS);
  const key = await api.vaultImportDataKey(c.dek), audioKey = await api.vaultDeriveAudioKey(c.dek, c.header.id); c.dek.fill(0);
  const hid = c.header.id;
  const eid = 'audio-cifrado-inventado', k = await api.anNewCek(audioKey, hid, eid);
  const eChunks = [];
  for (const [n, bytes] of [[0, new Uint8Array(400).fill(3)], [1, new Uint8Array(100).fill(4)]]) eChunks.push({part: 0, n, blob: await api.anSealChunk(k.cek, hid, eid, 0, n, bytes)});
  const eDetail = {parts: [{mime: 'audio/webm', chunks: 2, bytes: 500, ms: 1000, origin: 'grabado', complete: true}]};
  const eMeta = {...api.anSetState(api.anNewMeta(eid, T0, 'grabando'), 'cerrado'), parts: 1, bytes: 500, key: k.box, sealed: await api.anSealDetail(audioKey, hid, eid, eDetail)};
  const raw = [new Uint8Array(300).fill(5), new Uint8Array(70).fill(6)];
  const pChunks = raw.map((b, n) => ({part: 0, n, blob: new Blob([b])}));
  const hashes = []; for (const x of pChunks) hashes.push(await api.anPlainHash(x.blob));
  const pMeta = {...api.anNewMeta('audio-claro-inventado', T0, 'cerrado'), mode: api.AN_PLAIN_MODE, parts: 1, bytes: 370,
    plain: {parts: [{mime: 'audio/wav', origin: 'cargado', name: 'tono-inventado.wav', chunks: 2, bytes: 370, ms: 800, complete: true, hashes}]}};
  return {header: c.header, recovery: c.recovery, key, audioKey, eMeta, eChunks, pMeta, pChunks};
}
const open = h => api.copiaOpenWithSecret(h, PASS);
async function mixta(m, opts = {}){
  const w = api.copia2Writer(m.header, m.key, opts.contenido || 'completa', T0);
  await w.config({cfg: null, generador: null});
  if ((opts.contenido || 'completa') === 'completa') { await w.audioCifrado(m.eMeta, m.eChunks); await w.audioClaro(m.pMeta, m.pChunks); }
  for (const [id, modo, motivo] of opts.excluir || []) w.exclusion({id}, modo, motivo);
  return w.finish(opts.biblioteca);
}
const fails = async (blob) => { try { await api.copia2Verify(blob, open); return null; } catch (e) { return e.copia || 'otro: ' + e.message; } };

test('#60: una ficha sin cifrar solo se reconoce con marca expresa y sin claves; lo ambiguo cuenta como cifrado', async () => {
  const m = await material();
  assert.equal(api.anIsPlainMeta(m.pMeta), true);
  assert.equal(api.anIsPlainMeta(m.eMeta), false);
  assert.equal(api.anIsPlainMeta({...m.pMeta, key: m.eMeta.key}), false, 'claro con clave: se trata como cifrado');
  assert.equal(api.anIsPlainMeta({...m.eMeta, mode: undefined}), false);
  assert.equal(api.anIsPlainMeta(null), false);
  // A medio escribir (sin huellas completas) igual es «sin cifrar»: no traba la protección y se informa aparte.
  assert.equal(api.anIsPlainMeta({...m.pMeta, state: 'escribiendo', plain: {parts: [{...m.pMeta.plain.parts[0], hashes: []}]}}), true);
});

test('#60: copia 2 con audios cifrados y sin cifrar mezclados se verifica, con contraseña y con código', async () => {
  const m = await material(), blob = await mixta(m);
  const r = await api.copia2Verify(blob, open);
  assert.deepEqual({audios: r.audios, cifrado: r.cifrado, claro: r.claro, fragmentos: r.fragmentos, bytesAudio: r.bytesAudio, exclusiones: r.exclusiones, todoIncluido: r.todoIncluido, biblioteca: r.biblioteca},
    {audios: 2, cifrado: 1, claro: 1, fragmentos: 4, bytesAudio: 870, exclusiones: 0, todoIncluido: true, biblioteca: 2});
  assert.equal((await api.copia2Verify(blob, h => api.copiaOpenWithSecret(h, m.recovery))).audios, 2);
  assert.match(api.copia2Describe(r), /incluye todos los audios/);
  // El audio que estaba sin cifrar no aparece legible dentro del archivo.
  const bytes = Buffer.from(await blob.arrayBuffer());
  assert.ok(!bytes.includes(Buffer.from(new Uint8Array(64).fill(5))), 'el audio sin cifrar viaja cifrado');
  assert.doesNotMatch(bytes.toString('latin1'), /tono-inventado/);
  // El orden opuesto (primero el sin cifrar) también se verifica.
  const w = api.copia2Writer(m.header, m.key, 'completa', T0); await w.config({});
  await w.audioClaro(m.pMeta, m.pChunks); await w.audioCifrado(m.eMeta, m.eChunks);
  assert.equal((await api.copia2Verify(await w.finish(2), open)).audios, 2);
});

test('#60: una copia que omite audios lo declara y nunca se presenta como completa', async () => {
  const m = await material();
  const blob = await mixta(m, {excluir: [['audio-roto-inventado', 'claro', 'danado'], ['audio-sin-clave-inventado', 'cifrado', 'cifrado-sin-clave'], ['audio-a-medias-inventado', 'claro', 'a-medio-guardar']]});
  const r = await api.copia2Verify(blob, open);
  assert.equal(r.exclusiones, 3); assert.equal(r.todoIncluido, false); assert.equal(r.biblioteca, 5);
  assert.deepEqual(r.motivos, {'danado': 1, 'cifrado-sin-clave': 1, 'a-medio-guardar': 1});
  const d = api.copia2Describe(r);
  assert.match(d, /INCOMPLETA: faltan 3 audios de la biblioteca/);
  assert.match(d, /1 audio quedó a medio guardar/); assert.match(d, /1 audio está cifrado y la protección no está abierta/);
  assert.doesNotMatch(d, /incluye todos/);
  // Solo texto: los audios que había quedan declarados como no incluidos.
  const t = await api.copia2Verify(await mixta(m, {contenido: 'solo-texto', excluir: [['audio-claro-inventado', 'claro', 'solo-texto']]}), open);
  assert.equal(t.audios, 0); assert.equal(t.exclusiones, 1); assert.equal(t.todoIncluido, false);
  assert.match(api.copia2Describe(t), /solo texto, sin audios · INCOMPLETA: faltan 1 audio/);
});

test('#60: el escritor no arma una copia cuyo inventario no cierra con la biblioteca', async () => {
  const m = await material();
  await assert.rejects(mixta(m, {biblioteca: 3}), /no coincide con la biblioteca/, 'había 3 audios y solo se dieron cuenta de 2');
  // Excluir un audio que ya entró, repetirlo, motivo desconocido o motivo de otro tipo de copia: se rechaza.
  const w = api.copia2Writer(m.header, m.key, 'completa', T0); await w.config({});
  await w.audioClaro(m.pMeta, m.pChunks);
  assert.throws(() => w.exclusion(m.pMeta, 'claro', 'danado'), /exclusión inválida/);
  assert.throws(() => w.exclusion({id: 'x-inventado'}, 'claro', 'perdido'), /exclusión inválida/);
  assert.throws(() => w.exclusion({id: 'x-inventado'}, 'claro', 'solo-texto'), /exclusión inválida/);
  assert.throws(() => w.exclusion({id: 'x-inventado'}, 'otro', 'danado'), /exclusión inválida/);
  w.exclusion({id: 'x-inventado'}, 'claro', 'danado');
  assert.throws(() => w.exclusion({id: 'x-inventado'}, 'claro', 'danado'), /exclusión inválida/);
  await w.finish(2);
  await assert.rejects(w.audioCifrado(m.eMeta, m.eChunks), /se cerró/, 'después de cerrar no se agrega nada');
});

test('#60: un audio que falla a mitad no deja bloques sueltos en la copia (todo o nada)', async () => {
  const m = await material(), w = api.copia2Writer(m.header, m.key, 'completa', T0); await w.config({});
  // Fragmento cambiado: su huella no coincide con la ficha → el audio no entra, y la copia sigue siendo válida.
  await assert.rejects(w.audioClaro(m.pMeta, [m.pChunks[0], {part: 0, n: 1, blob: new Blob([new Uint8Array(70).fill(9)])}]), /no coincide/);
  // Fragmento que no es Blob a mitad de un audio cifrado: nada del audio entra.
  await assert.rejects(w.audioCifrado(m.eMeta, [m.eChunks[0], {part: 0, n: 1, blob: 'no-blob'}]), /audio cifrado inválido/);
  assert.deepEqual(w.resumen().audios, 0);
  w.exclusion(m.pMeta, 'claro', 'danado'); w.exclusion(m.eMeta, 'cifrado', 'danado');
  const r = await api.copia2Verify(await w.finish(2), open);
  assert.equal(r.audios, 0); assert.equal(r.fragmentos, 0); assert.equal(r.exclusiones, 2);
});

test('#60: inventario: cada inconsistencia se rechaza (comprobación pura)', () => {
  const a = [{id: 'a1', mode: 'claro', parts: 1, chunks: 2, bytes: 3}];
  const ok = {formato: 2, contenido: 'completa', audios: a, exclusiones: [{id: 'b1', modo: 'cifrado', motivo: 'danado'}], biblioteca: 2};
  assert.deepEqual(api.copia2CheckInventory(ok, a, 'completa'), {exclusiones: 1, biblioteca: 2});
  // El ejemplo fijo de formato 2 (anterior a esta corrección) no trae «biblioteca»: sigue valiendo.
  assert.deepEqual(api.copia2CheckInventory({formato: 2, contenido: 'completa', audios: a, exclusiones: []}, a, 'completa'), {exclusiones: 0, biblioteca: null});
  const bad = [
    {...ok, biblioteca: 3},                                                     // falta dar cuenta de un audio
    {...ok, biblioteca: 1},
    {...ok, exclusiones: [{id: 'a1', modo: 'claro', motivo: 'danado'}]},        // incluido y excluido a la vez
    {...ok, exclusiones: [{id: 'b1', modo: 'cifrado', motivo: 'danado'}, {id: 'b1', modo: 'cifrado', motivo: 'danado'}], biblioteca: 3},
    {...ok, exclusiones: [{id: 'b1', modo: 'cifrado', motivo: 'olvido'}]},
    {...ok, exclusiones: [{id: 'b1', modo: 'claro', motivo: 'cifrado-sin-clave'}]},
    {...ok, exclusiones: [{id: 'b1', modo: 'cifrado', motivo: 'danado', extra: 1}]},
    {...ok, exclusiones: [{id: 'b1', modo: 'cifrado', motivo: 'solo-texto'}]},  // motivo de otra clase de copia
    {...ok, audios: []},                                                        // el inventario no coincide con lo leído
    {...ok, contenido: 'solo-texto'},
    {...ok, formato: 1}
  ];
  for (const inv of bad) assert.throws(() => api.copia2CheckInventory(inv, a, 'completa'), /inventario inconsistente/, JSON.stringify(inv));
  assert.throws(() => api.copia2CheckInventory({formato: 2, contenido: 'solo-texto', audios: a, exclusiones: []}, a, 'solo-texto'), /inconsistente/, 'solo texto con audios');
});

test('#60: archivo cortado en cualquier límite de bloque o alterado en cualquier bloque: nunca pasa', async () => {
  const m = await material(), blob = await mixta(m, {excluir: [['audio-roto-inventado', 'claro', 'danado']]});
  const bytes = new Uint8Array(await blob.arrayBuffer());
  // Recorre el archivo para hallar cada límite de bloque.
  const dv = new DataView(bytes.buffer); let pos = 16 + 4; const cabLen = dv.getUint32(pos); pos += 4 + cabLen;
  const limites = [16, 20, 24, pos];
  const centros = [];
  while (pos < bytes.length) {
    const nl = dv.getUint32(pos + 1), dl = Number(dv.getBigUint64(pos + 5 + nl));
    centros.push(pos + 13 + nl + Math.floor(dl / 2)); pos += 13 + nl + dl; limites.push(pos);
  }
  assert.equal(pos, bytes.length);
  for (const cut of new Set([...limites.slice(0, -1), ...limites.slice(0, -1).map(x => x + 1), bytes.length - 1])) {
    const r = await fails(new Blob([bytes.subarray(0, cut)]));
    assert.ok(r === 'Cortada' || r === 'Alterada', 'corte en ' + cut + ' → ' + r);
  }
  for (const c of centros) {
    const x = bytes.slice(); x[c] ^= 1;
    assert.equal(await fails(new Blob([x])), 'Alterada', 'byte cambiado en ' + c);
  }
  // Bytes de más al final.
  assert.equal(await fails(new Blob([bytes, new Uint8Array([0])])), 'Alterada');
});

test('#60: el formato 1 y su lector no cambian; el lector 1 rechaza el 2 y el lector 2 abre el 1', async () => {
  const m = await material();
  const fixed = new Blob([readFileSync(new URL('./copia-formato-1.dictanota', import.meta.url))]);
  const PASS1 = 'frase de prueba inventada 901';
  const via2 = await api.copia2Verify(fixed, h => api.copiaOpenWithSecret(h, PASS1));
  const via1 = await api.copiaVerify(fixed, h => api.copiaOpenWithSecret(h, PASS1));
  assert.equal(via2.formato, 1); assert.deepEqual(via2, via1);
  await assert.rejects(api.copiaVerify(await mixta(m), open), e => e.copia === 'FormatoNuevo');
  // El ejemplo fijo de formato 2 (creado antes de esta corrección) sigue verificándose.
  const b64 = readFileSync(new URL('./copia-formato-2.dictanota.base64', import.meta.url), 'utf8').trim();
  const r2 = await api.copia2Verify(new Blob([Buffer.from(b64, 'base64')]), h => api.copiaOpenWithSecret(h, 'clave-fixture-dictavoz-903'));
  assert.equal(r2.claro, 1); assert.equal(r2.exclusiones, 0); assert.equal(r2.biblioteca, null);
  // Ni la constante ni los tipos ni el escritor del formato 1 se modificaron.
  assert.match(block('COPIA'), /const COPIA_MAGIC = 'DICTANOTA-COPIA\\n', COPIA_FORMATO = 1, COPIA_TIPOS = 'RCMAF';/);
  assert.doesNotMatch(block('COPIA'), /claro|AN_PLAIN|exclus/);
});

test('#60: el recorrido de la copia 2 y el panel solo leen; nada nuevo se conecta a la interfaz', () => {
  const uso = block('COPIA2-USO'), c2 = block('COPIA2');
  assert.doesNotMatch(uso + c2, /anPut\w*\(|anDelete\w*\(|anTruncate\w*\(|\.put\(|\.delete\(|\.clear\(|setItem\(|removeItem\(|localStorage|fetch\(|innerHTML|\beval\b|new Function|download\(/);
  // Ningún botón ni código fuera de su bloque llama al formato 2 ni al ensayo P2.
  const fuera = html.replace(/\/\*COPIA2-START\*\/[\s\S]*?\/\*COPIA2-USO-END\*\//, '').replace(/\/\*P2-BIBLIOTECA-START\*\/[\s\S]*?\/\*P2-BIBLIOTECA-END\*\//, '')
    // Al integrarse con el PR #61, la restauración experimental K2 (su bloque y el botón «K2 interfaz») sí usa
    // la verificación del formato 2: es el único uso permitido fuera de los bloques del formato 2.
    .replace(/\/\*K2-START\*\/[\s\S]*?\/\*K2-END\*\//, '').replace(/\/\* K2 interfaz[\s\S]*?\n\}\);/, '');
  assert.doesNotMatch(fuera, /copia2(Writer|Verify|Audios|Describe)\(|anPlain(StageFile|Read)\(/);
  assert.equal((html.match(/const AN_DB_VERSION = 1;/g) || []).length, 1, 'la versión de la base no cambia');
  // Panel: cuenta aparte lo cifrado y lo sin cifrar, y a un audio sin cifrar no le ofrece acciones de la protección.
  const panel = html.slice(html.indexOf('async function e3RefreshSpace'), html.indexOf("$('e3Refresh').onclick"));
  assert.match(panel, /cifrados = metas\.filter\(m => !anIsPlainMeta\(m\)\), claros = metas\.filter\(anIsPlainMeta\)/);
  assert.match(panel, /SIN CIFRAR \(ensayo, no protegidos\)/);
  const filasClaras = panel.slice(panel.indexOf('for (const m of claros'));
  assert.doesNotMatch(filasClaras, /convButton|e3Recover|e3Remove|e3Play/);
  // Acciones de la protección rechazan una ficha sin cifrar aunque alguien llegue a ellas.
  assert.match(html, /if \(anIsPlainMeta\(m\)\) return \{ok: false, m, why: 'sin cifrar'\};/);
  assert.match(html, /if \(anIsPlainMeta\(meta\)\) \{ e3Failure\(s, /);
  // La copia que usa la app (formato 1) avisa los audios sin cifrar que no lleva, sin llamarlos dañados.
  assert.match(html, /if \(anIsPlainMeta\(m\)\) \{ sinCifrar\+\+; continue; \}/);
  assert.match(html, /'Atención, la copia NO está completa: '/);
});

test('#61 + #60: K2 no restaura una copia formato 2 incompleta ni escribe audio descifrado', () => {
  const k2 = html.slice(html.indexOf('/*K2-START*/'), html.indexOf('/*K2-END*/'));
  assert.match(k2, /if\(verified\.exclusiones>0\)throw new Error\('Esta copia está INCOMPLETA/);
  assert.match(html, /if\(summary\.exclusiones>0\)throw new Error\('La copia está INCOMPLETA/);
  assert.match(k2, /if\(c\.type==='B'\)throw new Error/);
  assert.doesNotMatch(k2, /copia2Open\(key,plan\.header\.id,'chunk\|'/);
});
