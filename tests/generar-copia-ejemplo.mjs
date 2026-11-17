// Genera el archivo de ejemplo FIJO de un formato de copia cifrada (K1). No corre en el CI.
// Usar SOLO al publicar un formato nuevo: `node tests/generar-copia-ejemplo.mjs 1`. El archivo ya publicado de un
// formato no se regenera nunca: todas las versiones futuras (web y Android) tienen que poder abrirlo tal como está.
// Datos 100 % inventados; la contraseña y el código son de prueba y no protegen nada real.
import {readFileSync, writeFileSync, existsSync} from 'node:fs';

const formato = Number(process.argv[2] || 1);
const destino = new URL(`./copia-formato-${formato}.dictanota`, import.meta.url);
if (existsSync(destino) && process.argv[3] !== '--reemplazar') { console.error('Ya existe ' + destino.pathname + '. Un formato publicado no se regenera.'); process.exit(1); }
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const bloque = n => html.match(new RegExp('/\\*' + n + '-START\\*/([\\s\\S]*?)/\\*' + n + '-END\\*/'))[1];
const c = new Function(bloque('VAULT-CORE') + bloque('AUDIONOTA') + bloque('COPIA') + `;return {COPIA_FORMATO, copiaWriter, copiaVerify, copiaOpenWithSecret,
  vaultCreate, vaultImportDataKey, vaultDeriveAudioKey, vaultSealRecord, anNewMeta, anSetState, anNewCek, anSealChunk, anSealDetail};`)();
if (c.COPIA_FORMATO !== formato) { console.error('La app escribe el formato ' + c.COPIA_FORMATO + ', no el ' + formato + '.'); process.exit(1); }

const PASS = 'frase de prueba inventada 901', CREADO = 1763340000000;
const {header, dek, recovery} = await c.vaultCreate(PASS);
const key = await c.vaultImportDataKey(dek), audioKey = await c.vaultDeriveAudioKey(dek, header.id);
const conv = {schema: 1, conversations: [{id: 'c1', title: 'Cuaderno inventado', createdAt: 1, updatedAt: 2}],
  entries: [{id: 'e1', conversationId: 'c1', kind: 'audio', savedAt: 1, text: 'Persona Inventada Uno, X-901', audioId: 'audio-inventado-1'},
    {id: 'e2', conversationId: 'c1', kind: 'texto', savedAt: 2, text: 'madre de X-901'}]};
const w = c.copiaWriter(header, key, 'completa', CREADO);
await w.registro('conversaciones', await c.vaultSealRecord(key, header.id, 'conversaciones', JSON.stringify(conv)));
await w.registro('personas', await c.vaultSealRecord(key, header.id, 'personas', JSON.stringify([{names: ['Persona Inventada Uno'], code: 'X-901', rel: ''}])));
await w.registro('diccionario', await c.vaultSealRecord(key, header.id, 'diccionario', 'pasiente => paciente'));
await w.config({cfg: '{"textSize":"normal"}', generador: '{"prefix":"X","next":902,"digits":3,"mode":"sequential"}'});
const id = 'audio-inventado-1', k = await c.anNewCek(audioKey, header.id, id), chunks = [];
for (const [part, n, bytes] of [[0, 0, new Uint8Array(700).fill(7)], [0, 1, new Uint8Array(300).fill(8)], [1, 0, new Uint8Array(50).fill(9)]])
  chunks.push({part, n, blob: await c.anSealChunk(k.cek, header.id, id, part, n, bytes)});
const detail = {parts: [{mime: 'audio/webm', chunks: 2, bytes: 1000, ms: 2000, origin: 'grabado', complete: true},
  {mime: 'audio/mpeg', chunks: 1, bytes: 50, ms: 500, origin: 'cargado', name: 'inventado.mp3', complete: true}]};
await w.audio({...c.anSetState(c.anNewMeta(id, CREADO, 'grabando'), 'cerrado'), parts: 2, bytes: 1050, key: k.box, sealed: await c.anSealDetail(audioKey, header.id, id, detail)}, chunks);
const blob = await w.finish(); dek.fill(0);
const r = await c.copiaVerify(blob, h => c.copiaOpenWithSecret(h, PASS));
writeFileSync(destino, new Uint8Array(await blob.arrayBuffer()));
writeFileSync(new URL(`./copia-formato-${formato}.codigo.txt`, import.meta.url), recovery + '\n');
console.log('Escrito ' + destino.pathname + ' · ' + r.bytes + ' bytes · ' + r.registros + ' registros · ' + r.audios + ' audio · ' + r.fragmentos + ' fragmentos');
