// K2 de reemplazo: reglas que se comprueban leyendo el código (el recorrido real está en k2-reemplazo-browser.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const k2 = html.slice(html.indexOf('/*K2-START*/'), html.indexOf('/*K2-END*/'));
const fn = name => { const a = k2.indexOf('async function ' + name + '('); assert.ok(a >= 0, name); const b = k2.indexOf('\nasync function ', a + 10); return k2.slice(a, b < 0 ? undefined : b); };

test('K2 reemplazo: el orden es fijo y no se borra nada antes del respaldo previo y de las dos confirmaciones', () => {
  const r = fn('k2Replace'), pos = s => { const i = r.indexOf(s); assert.ok(i >= 0, s); return i; };
  const orden = ['copia2Verify(file, open)', 'k2Compare(', 'k2Space(verified)', 'ui.confirm(1, info)', 'k2PriorBackup(ui)', 'ui.saveBackup(', 'ui.confirm(2, info', "k2rSet('borrando'", 'k2rWipe()', "k2rSet('borrado'", 'k2RestoreLocked('].map(pos);
  assert.deepEqual(orden, [...orden].sort((a, b) => a - b));
});

test('K2 reemplazo: la marca propia no usa copiaBusyN y el autobloqueo la ve', () => {
  assert.doesNotMatch(fn('k2Replace').replace(/if \(vaultBusy\(\) \|\| convSaving \|\| copiaBusyN\) throw/, ''), /copiaBusyN\s*(\+\+|--|=)/);
  assert.match(html, /copiaBusyN > 0 \|\| k2ReplaceActive, saveDraft\)/);
  assert.match(html, /vaultBusy\(\) \|\| convSaving \|\| k2ReplaceMark\(\)/, 'copiaCreate y copiaCheck respetan la marca');
});

test('K2 reemplazo: solo usa la capa de registros y nunca el formato 2 para el respaldo del usuario', () => {
  assert.doesNotMatch(k2, /VAULT_REC_PREFIX|\.danado\.|rawRecords/);
  assert.match(fn('k2PriorBackup'), /copiaMake\(pw, \{completa: true\}\)/);
  assert.doesNotMatch(fn('k2PriorBackup') + fn('k2Replace'), /copia2Writer|copia2Seal/);
  assert.match(fn('k2PriorBackup'), /if \(gaps\.length\) throw[\s\S]*INCOMPLETO/);
});

test('K2 reemplazo: el respaldo previo no es creado ni descargado por copiaCreate dos veces (copiaMake comprueba y copiaCreate descarga)', () => {
  const uso = html.slice(html.indexOf('/*COPIA-USO-START*/'), html.indexOf('/*COPIA-USO-END*/'));
  assert.ok(uso.indexOf('await copiaVerify(file') < uso.indexOf('download(file)'));
  assert.doesNotMatch(uso.slice(uso.indexOf('async function copiaMake'), uso.indexOf('async function copiaCreate')), /download\(/);
});
