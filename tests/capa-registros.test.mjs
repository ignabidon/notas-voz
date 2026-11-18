// Capa única de registros cifrados (paso previo a T). Solo datos inventados.
// (a) prueba estática: nadie fuera de la capa toca los registros «notasvoz.boveda.v1.r.*».
// (b) la capa y la bóveda con un almacén falso en memoria: todo registro pasa por la capa y nada llega a localStorage.
// La parte de copia y restauración con almacén falso va en tests/capa-registros-browser.mjs (necesita Chrome).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const NUCLEO = /\/\*VAULT-CORE-START\*\/([\s\S]*?)\/\*VAULT-CORE-END\*\//;
const CAPA = /\/\*REGISTROS-CIFRADOS-START\*\/[\s\S]*?\/\*REGISTROS-CIFRADOS-END\*\//;

/* ---------- (a) Prueba estática ---------- */
/* Devuelve la lista de accesos directos a los registros que hay fuera de la capa (vacía = todo bien).
   Un registro solo se puede tocar armando su clave (prefijo o texto fijo) o con las funciones viejas: se buscan esas formas. */
function accesosDirectos(texto) {
  const fuera = texto.replace(CAPA, '');
  const reglas = [
    [/VAULT_REC_PREFIX/, 'usa el prefijo de las claves de los registros'],
    [/boveda\.v1\.r/, 'escribe a mano la clave de un registro'],
    [/VAULT_HEADER\s*\+\s*['"`]\.r\b/, 'arma la clave de un registro a partir de la cabecera'],
    [/['"`]\.r\.?['"`]/, 'arma la clave de un registro con «.r.»'],
    [/rawRecords/, 'usa rawRecords (se reemplazó por vault.records.all)'],
    [/\.danado\./, 'maneja registros apartados por dañados']
  ];
  const hallazgos = [];
  for (const [regla, porque] of reglas) {
    for (const m of fuera.matchAll(new RegExp(regla.source, 'g'))) {
      const linea = fuera.slice(0, m.index).split('\n').length;
      hallazgos.push('línea ' + linea + ' (sin contar la capa): ' + porque);
    }
  }
  return hallazgos;
}

test('capa de registros: ningún código fuera de la capa lee ni escribe los registros cifrados', () => {
  assert.deepEqual(accesosDirectos(html), []);
});

test('capa de registros: la prueba estática falla de verdad cuando aparece un acceso directo', () => {
  const casos = [
    "localStorage.getItem('notasvoz.boveda.v1.r.notas')",
    "localStorage.setItem(VAULT_REC_PREFIX + name, raw)",
    "localStorage.removeItem(VAULT_HEADER + '.r.' + name)",
    "const k = 'x' + '.r.' + name",
    'vault.rawRecords()',
    "localStorage.setItem(clave + '.danado.' + Date.now(), raw)"
  ];
  for (const caso of casos) {
    // Metido en el código de la aplicación (fuera de la capa)…
    assert.notDeepEqual(accesosDirectos(html.replace('</script>', caso + ';\n</script>')), [], 'no detectó: ' + caso);
    // …y metido dentro de la bóveda, que también cuenta como «fuera de la capa».
    assert.notDeepEqual(accesosDirectos(html.replace('v.checkPassword = ', caso + ';\n  v.checkPassword = ')), [], 'no detectó dentro de la bóveda: ' + caso);
  }
  // Y lo que está dentro de la capa no cuenta.
  const dentro = html.replace('/*REGISTROS-CIFRADOS-END*/', "localStorage.getItem('notasvoz.boveda.v1.r.notas');\n/*REGISTROS-CIFRADOS-END*/");
  assert.deepEqual(accesosDirectos(dentro), []);
});

test('capa de registros: está una sola vez, dentro de VAULT-CORE, y la bóveda la usa', () => {
  assert.equal((html.match(/\/\*REGISTROS-CIFRADOS-START\*\//g) || []).length, 1);
  assert.equal((html.match(/\/\*REGISTROS-CIFRADOS-END\*\//g) || []).length, 1);
  const nucleo = html.match(NUCLEO)[1];
  assert.match(nucleo, CAPA, 'la capa está dentro del bloque VAULT-CORE');
  const sinCapa = nucleo.replace(CAPA, '');
  assert.match(sinCapa, /v\.records = \(opts && opts\.records\) \|\| createRecordStore\(storage\);/);
  for (const llamada of ['v.records.get(name)', 'v.records.quarantine(name, raw)', 'v.records.set(name, rec)', 'v.records.remove(name)', 'v.records.clear()', 'v.records.set(VAULT_KEYS[k]', 'v.records.remove(VAULT_KEYS[k])']) {
    assert.ok(sinCapa.includes(llamada), 'la bóveda debe usar ' + llamada);
  }
  // Copia cifrada y restauración K2 usan la capa de la bóveda.
  assert.match(html, /for \(const \[name, raw\] of vault\.records\.all\(\)\) await w\.registro\(name, raw\);/);
  assert.match(html, /vault\.records\.set\(name,raw\);\s*if\(vault\.records\.get\(name\)!==raw\)/);
  assert.match(html, /for\(const name of j\.names\) vault\.records\.remove\(name\);/);
  assert.match(html, /if \(vault\.records\.any\(\)\) return false;/, 'K2 mira los registros por la capa para decidir si la instalación está vacía');
});

/* ---------- (b) La capa y la bóveda con almacén falso ---------- */
const nucleo = new Function(html.match(NUCLEO)[1] + ';return {createVault, createRecordStore, VAULT_KEYS, VAULT_REC_PREFIX, VAULT_HEADER};')();
const PREFIJO = nucleo.VAULT_REC_PREFIX;
const MARCA = 'PACIENTE-FICTICIO-7Q';
const CLAVE = 'frase de prueba inventada 5521';

/* Almacén falso en memoria con la forma de Storage (incluye length y key). Anota cada operación. */
class AlmacenFalso {
  constructor(inicial = {}) { this.mapa = new Map(Object.entries(inicial)); this.ops = []; this.fallarEn = null; this.escrituras = 0; }
  get length() { return this.mapa.size; }
  key(i) { return [...this.mapa.keys()][i] ?? null; }
  getItem(k) { this.ops.push(['get', k]); return this.mapa.has(k) ? this.mapa.get(k) : null; }
  setItem(k, v) {
    this.ops.push(['set', k]); this.escrituras++;
    if (this.fallarEn !== null && this.escrituras >= this.fallarEn) throw new DOMException('cuota inventada', 'QuotaExceededError');
    this.mapa.set(k, String(v));
  }
  removeItem(k) { this.ops.push(['remove', k]); this.mapa.delete(k); }
  claves() { return [...this.mapa.keys()].sort(); }
}
/* Almacén mínimo sin length ni key (como el de las pruebas viejas). */
const almacenMinimo = (inicial = {}) => {
  const m = new Map(Object.entries(inicial));
  return {getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); }, mapa: m};
};
const datos = () => ({
  'notasvoz.gamma.v1': JSON.stringify([{id: 'a1', title: 'Sesión ' + MARCA, text: 'Texto de ' + MARCA, ts: 1, tags: ['prueba']}]),
  'notasvoz.gamma.draft.v1': JSON.stringify({title: '', text: 'Borrador ' + MARCA, tags: [], cur: null, baseline: ''}),
  'notasvoz.gamma.people.v1': JSON.stringify([{names: [MARCA], code: 'P-001', rel: ''}]),
  'notasvoz.gamma.dict.v1': 'pasiente => paciente',
  'notasvoz.gamma.cfg.v1': '{"textSize":"normal"}'   // ajuste: no es un registro protegido
});
const CONV = 'notasvoz.dictanota.v2';
const registrosDe = a => a.claves().filter(k => k.startsWith(PREFIJO));

test('capa: leer, escribir, borrar y listar con un almacén falso', () => {
  const falso = new AlmacenFalso(), capa = nucleo.createRecordStore(falso);
  assert.equal(capa.get('notas'), null); assert.equal(capa.any(), false); assert.deepEqual(capa.all(), []); assert.equal(capa.bytes(), 0);
  capa.set('diccionario', 'registro inventado D'); capa.set('notas', 'registro inventado N'); capa.set('conversaciones', 'registro inventado C');
  assert.equal(capa.get('notas'), 'registro inventado N');
  assert.deepEqual(capa.all(), [['notas', 'registro inventado N'], ['diccionario', 'registro inventado D'], ['conversaciones', 'registro inventado C']], 'siempre en el orden de VAULT_KEYS');
  assert.deepEqual(registrosDe(falso), [PREFIJO + 'conversaciones', PREFIJO + 'diccionario', PREFIJO + 'notas'], 'la clave guardada no cambió');
  assert.equal(capa.any(), true);
  assert.equal(capa.owns(PREFIJO + 'notas'), true); assert.equal(capa.owns('notasvoz.gamma.v1'), false); assert.equal(capa.owns(null), false);
  const esperado = ['notas', 'diccionario', 'conversaciones'].reduce((t, n) => t + 2 * ((PREFIJO + n).length + capa.get(n).length), 0);
  assert.equal(capa.bytes(), esperado, 'misma cuenta que el panel de espacio: 2 por carácter, clave y valor');
  capa.remove('notas'); assert.equal(capa.get('notas'), null); assert.equal(capa.all().length, 2);
  capa.clear(); assert.equal(capa.any(), false); assert.deepEqual(registrosDe(falso), []);
});

test('capa: un registro dañado se aparta intacto, cuenta como registro y clear() lo conserva', () => {
  const falso = new AlmacenFalso(), capa = nucleo.createRecordStore(falso);
  capa.set('personas', '{dañado inventado');
  capa.quarantine('personas', capa.get('personas'));
  assert.equal(capa.get('personas'), null);
  const apartados = registrosDe(falso);
  assert.equal(apartados.length, 1); assert.match(apartados[0], new RegExp('^' + PREFIJO.replace(/\./g, '\\.') + 'personas\\.danado\\.\\d+$'));
  assert.equal(falso.getItem(apartados[0]), '{dañado inventado');
  assert.equal(capa.any(), true, 'un registro apartado sigue contando: la instalación no está vacía');
  assert.deepEqual(capa.all(), [], 'pero no entra en la copia');
  capa.clear(); assert.equal(registrosDe(falso).length, 1, 'quitar la protección no borra lo apartado');
});

test('capa: cambiar el almacén de fondo mueve todas las operaciones', () => {
  const a = new AlmacenFalso(), b = new AlmacenFalso(), capa = nucleo.createRecordStore(a);
  capa.set('notas', 'en A');
  assert.equal(capa.useBackend(b), a, 'devuelve el anterior');
  assert.equal(capa.get('notas'), null, 'ahora lee de B'); capa.set('notas', 'en B');
  assert.equal(a.getItem(PREFIJO + 'notas'), 'en A'); assert.equal(b.getItem(PREFIJO + 'notas'), 'en B');
  capa.remove('notas'); assert.equal(a.getItem(PREFIJO + 'notas'), 'en A', 'borrar actúa solo sobre el almacén actual');
});

test('capa: con un almacén sin length ni key igual lista y mide los registros conocidos', () => {
  const m = almacenMinimo(), capa = nucleo.createRecordStore(m);
  assert.equal(capa.any(), false); capa.set('notas', 'x');
  assert.equal(capa.any(), true); assert.equal(capa.bytes(), 2 * ((PREFIJO + 'notas').length + 1));
});

test('bóveda con almacén falso de registros: activar, recargar, desbloquear y quitar la protección', async () => {
  const cabecera = almacenMinimo(datos()), falso = new AlmacenFalso();
  const capa = () => nucleo.createRecordStore(falso);
  const v = nucleo.createVault(cabecera, {records: capa()});
  const {dek} = await v.enable(CLAVE); dek.fill(0);
  // Los registros fueron al almacén falso; en el almacén de la cabecera (localStorage) no quedó ninguno ni nada en claro.
  assert.equal(registrosDe(falso).length, 4, 'notas, borrador, personas y diccionario');
  assert.deepEqual([...cabecera.mapa.keys()].filter(k => k.startsWith(PREFIJO)), [], 'ningún registro en el almacén de la cabecera');
  assert.ok([...cabecera.mapa.values()].every(x => !x.includes(MARCA)), 'nada en claro quedó en localStorage');
  assert.ok(registrosDe(falso).every(k => !falso.getItem(k).includes(MARCA)), 'los registros están cifrados');
  assert.equal(v.records.all().length, 4);
  // Escribir por el almacén cifrado llega al almacén falso, no al de la cabecera.
  v.store.setItem(CONV, JSON.stringify({schema: 1, conversations: [], entries: []}));
  await v.flush();
  assert.equal(registrosDe(falso).length, 5); assert.deepEqual([...cabecera.mapa.keys()].filter(k => k.startsWith(PREFIJO)), []);
  // «Recargar»: bóveda nueva sobre los mismos almacenes.
  const w = nucleo.createVault(cabecera, {records: capa()});
  assert.equal(w.state, 'locked');
  await w.unlockPassword(CLAVE);
  assert.equal(w.state, 'open');
  assert.match(w.store.getItem('notasvoz.gamma.v1'), new RegExp(MARCA));
  assert.equal(w.store.getItem(CONV), JSON.stringify({schema: 1, conversations: [], entries: []}));
  // Borrar un dato también llega al almacén falso.
  w.store.removeItem('notasvoz.gamma.dict.v1'); await w.flush();
  assert.equal(falso.getItem(PREFIJO + 'diccionario'), null);
  // Quitar la protección: vuelve a claro (como antes), vacía los registros del almacén falso y no toca otro lugar.
  await w.disable(CLAVE);
  assert.equal(w.state, 'off'); assert.deepEqual(registrosDe(falso), []);
  assert.match(cabecera.getItem('notasvoz.gamma.v1'), new RegExp(MARCA)); assert.equal(cabecera.getItem('notasvoz.boveda.v1'), null);
});

test('bóveda con almacén falso: un registro dañado se aparta en el mismo almacén y no se sobrescribe', async () => {
  const cabecera = almacenMinimo(datos()), falso = new AlmacenFalso();
  const v = nucleo.createVault(cabecera, {records: nucleo.createRecordStore(falso)});
  const {dek} = await v.enable(CLAVE); dek.fill(0);
  falso.setItem(PREFIJO + 'personas', '{dañado inventado');
  const w = nucleo.createVault(cabecera, {records: nucleo.createRecordStore(falso)});
  await w.unlockPassword(CLAVE);
  assert.deepEqual(w.damaged, ['personas']);
  const apartado = registrosDe(falso).filter(k => k.includes('.danado.'));
  assert.equal(apartado.length, 1); assert.equal(falso.getItem(apartado[0]), '{dañado inventado', 'se conserva intacto');
  assert.equal(falso.getItem(PREFIJO + 'personas'), null);
  assert.deepEqual([...cabecera.mapa.keys()].filter(k => k.startsWith(PREFIJO)), []);
});

test('bóveda con almacén falso: si activar falla por falta de espacio no queda nada a medias', async () => {
  const cabecera = almacenMinimo(datos()), falso = new AlmacenFalso();
  falso.fallarEn = 2;   // la segunda escritura de un registro falla
  const v = nucleo.createVault(cabecera, {records: nucleo.createRecordStore(falso)});
  await assert.rejects(v.enable(CLAVE), /No hay espacio/);
  assert.deepEqual(registrosDe(falso), [], 'se deshizo lo escrito');
  assert.equal(cabecera.getItem('notasvoz.boveda.v1'), null, 'no se escribió la cabecera');
  assert.match(cabecera.getItem('notasvoz.gamma.v1'), new RegExp(MARCA), 'los datos en claro siguen donde estaban');
  assert.equal(v.state, 'off');
});

test('bóveda: sin indicar almacén de registros usa el mismo almacén que la cabecera (nada cambia en la app)', async () => {
  const st = almacenMinimo(datos());
  const v = nucleo.createVault(st);
  const {dek} = await v.enable(CLAVE); dek.fill(0);
  assert.equal([...st.mapa.keys()].filter(k => k.startsWith(PREFIJO)).length, 4, 'las claves guardadas son las de siempre');
  assert.deepEqual(v.records.all().map(x => x[0]), ['notas', 'borrador', 'personas', 'diccionario']);
});
