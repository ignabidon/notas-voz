# DictaNota · Diseño del almacenamiento cifrado (Etapa E + anonimización con original recuperable)

> **Qué es esto:** un plan, solo en documento. **No se programó nada ni se tocó `index.html`.**
> **Responsable:** Claude (Fable 5.2), 16/11/2026. Rama `docs-diseno-almacenamiento-cifrado-2026-11-16`, base `main` = `3383584`.
> **Estado en tres niveles:** código guardado: **ninguno** (solo este documento) · pruebas técnicas: **ninguna** · probado en el Motorola: **nada**.
> **Condición:** toca almacenamiento. No se programa nada de esto sin **permiso explícito de Ignacio**, y recién cuando le toque a la Etapa E (orden vigente: N → B → E → C → D). La Etapa N (ChatGPT, PR #43) se unió a `main` el 16/11 a las 18:30, después de escrito este diseño: en la interfaz «hoja» ahora se llama «cuaderno»; ids, claves y funciones no cambiaron.
> **Para saber qué paso toca y cómo pedirlo: [PLAN-ALMACENAMIENTO-CIFRADO.md](PLAN-ALMACENAMIENTO-CIFRADO.md)** (tablero, nombre fijo).
> **Decisiones de Ignacio (16/11/2026, 17:30–17:50): las trece están tomadas** (tabla de la Parte 1). Dos difieren de lo recomendado: el código de recuperación **no** cambia solo (D10) y la app **sí** se bloquea aunque esté sonando un audio (D11). Se sumó una decisión nueva: mudar el texto al depósito grande (D13).
> Todo lo afirmado sobre el código se verificó leyendo `index.html` de `main` (`3383584`). Donde algo no se pudo comprobar, lo dice.

---

## PARTE 1 · Resumen para Ignacio (una página)

### Qué se propone

1. **Cada nota puede llevar su audio, siempre cifrado.** Lo grabado o cargado desde un archivo se guarda unido a su nota en un depósito nuevo, pensado para archivos grandes. Se cifra en el momento, con la misma protección que ya tenés (huella, contraseña o código de recuperación). Lo viejo no se toca.
2. **Al anonimizar, el original se guarda aparte y cifrado.** La nota muestra la versión anonimizada; manteniendo apretada la burbuja ves el original. Al exportar elegís cada vez cuál sale. Recuperar el original no depende de la tabla de personas: se guarda el texto tal cual era.
3. **Una sola llave maestra para todo.** No hay contraseñas nuevas. Cuando la app se bloquea (a los 15 minutos o a mano) se recarga la página y no queda nada descifrado en memoria, ni texto ni audio.
4. **Copia cifrada en un archivo** (`.dictanota`): sirve de respaldo y para pasar todo de Brave a la futura app de Android. Se abre con tu contraseña o con el código de recuperación. Incluye un botón «Verificar copia» para saber si el archivo quedó entero.
5. **Espacio a la vista en Ajustes:** cuánto ocupan los audios, cuánto queda, y aviso antes de que se llene.

### Qué riesgos hay

- **Sin contraseña ni código de recuperación (y sin huella) no hay forma de recuperar nada.** Es el precio del cifrado. La copia cifrada tampoco se abre sin ellos.
- **Si se borran los «datos del sitio» en Brave se pierde todo**, como hoy. La única defensa es la copia cifrada guardada fuera del navegador.
- **El audio no se puede anonimizar:** la voz dice el nombre real. Por eso se propone que solo exista cifrado.
- **Límite del texto:** las notas (no los audios) viven en un depósito chico del navegador, de unos 5 MB en total (valor habitual; sin medir en tu Motorola). Alcanza para cientos de notas, no para miles. Guardar originales lo llena más rápido. **Decidido (D13): se muda el texto al depósito grande**, antes de guardar originales.
- **Archivos cargados muy pesados:** resuelto con el tope de 30 MB (D4). Un WAV largo ya no se puede cargar.
- **Nada de esto está probado en el Motorola.** En particular: huella real, grabar con cifrado en simultáneo, reproducir, y descargar una copia grande.

### Decisiones tomadas (Ignacio, 16/11/2026)

| # | Tema | Decisión |
|---|---|---|
| D1 | Originales | Solo con la protección cifrada activa |
| D2 | Audios por nota | Solo con la protección cifrada activa. Sin protección, «Conservar audio» sigue como hoy |
| D3 | Quitar la protección | La app ofrece una copia cifrada, borra los audios por nota y pregunta si volver al original o quedarse con la versión anonimizada |
| D4 | Archivos cargados | **Tope de 30 MB para cargar** (antes 200 MB). Se limita por tamaño, no por formato |
| D5 | Copia cifrada | Elegir cada vez: «Completa» o «Solo texto» |
| D6 | Restaurar | Solo en app vacía, o reemplazando todo con doble confirmación |
| D7 | Audio suelto viejo | No se migra. Aviso en Ajustes con «Descargar» y «Borrar» |
| D8 | Audios sin nota | No se borran solos. Lista en Ajustes: «Crear nota» o «Borrar» |
| D9 | Exportar «anonimizada» con notas sin anonimizar | Avisar cuántas son y dejar decidir |
| D10 | Código de recuperación | **Es único. Solo cambia si el usuario pide uno nuevo, con su contraseña** (como funciona hoy) |
| D11 | Autobloqueo y reproducción | **Se bloquea igual** a los 15 minutos sin tocar la pantalla, aunque esté sonando un audio |
| D12 | Orden | La copia cifrada va **antes** del reproductor |
| D13 | Texto de las notas | **Se muda al depósito grande** (el de los audios), antes de los originales |

**Descartado en la misma conversación:** entrar con una cuenta (Gmail u otra), ligar la huella a la cuenta de Google, guardar la copia en Google Drive y un botón de exportación directa a Google Docs (los cuatro exigen conectar la app con un servicio externo). Para llevar texto a Google Docs quedan copiar y pegar, o «Descargar Word» y abrir ese archivo.
**Distribución de la futura app de Android:** entre conocidos y como experimental, pasando el archivo de instalación. Sin Google Play por ahora.

---

## PARTE 2 · Detalle técnico (para quien lo implemente)

### 2.1 Punto de partida verificado en el código (`main` = `3383584`)

- **Bóveda** (`createVault`, líneas ≈1176–1400): una clave de datos (DEK) aleatoria de 32 bytes; AES-GCM 256, IV aleatorio de 96 bits, AAD `dictanota|v1|<id>|<tipo>`. La DEK se guarda envuelta en la cabecera `notasvoz.boveda.v1`: `pw` (PBKDF2-SHA256, 600.000 iteraciones), `rec` (HKDF-SHA256 sobre el código de 120 bits) y `bio` (salida PRF de WebAuthn + HKDF).
- **`vaultStore`** imita a `localStorage`. Cada clave protegida es **un solo registro** `notasvoz.boveda.v1.r.<nombre>`, cifrado **entero** y en base64, guardado en `localStorage`. Al abrir, **todos** los registros se descifran a una copia en memoria (`cache`); las escrituras se cifran en segundo plano (`flush`).
- **`VAULT_KEYS`** hoy: notas, borrador, deshacer, personas, diccionario y conversaciones (`notasvoz.dictanota.v2`).
- **Notas/hojas:** `convMakeStore(vaultStore, …)`. Cada mensaje (`convCleanEntry`) ya tiene los campos `audioId` y `durationMs`, **pero nada los escribe todavía**. `convCleanEntry` **descarta cualquier campo que no conozca**.
- **Tabla de relaciones:** ya existe. Es `people` en `notasvoz.gamma.people.v1` (registro «personas»): `{names:[…], code, rel}`; con `rel` se escribe `[madre de P-001]`.
- **Audio:** IndexedDB `notasvoz-gamma-audio` v1, almacenes `chunks` y `meta`. Solo dos audios sueltos (`last` y `previous`), **sin cifrar y sin vínculo con ninguna nota**. `MediaRecorder` a 32 kbps, un fragmento cada 10 s, el primero en una transacción junto con el `meta`.
- **Archivos cargados:** no se guardan (`transcribeBlob(() => f, …)`; el `confirm` dice «El archivo no se guarda en DictaNota»). Límites `IMPORT_MAX_BYTES` = 200 MB, `IMPORT_MAX_SEC` = 15 min.
- **Autobloqueo:** `VAULT_IDLE_MS` = 15 min; `vaultLockNow()` espera el `flush` y hace `location.reload()`. No bloquea si `vaultBusy()` (grabar o transcribir).
- **No hay** `navigator.storage.persist()` ni `estimate()` en el código.

**Diferencias con lo documentado o detalles a tener en cuenta:**

1. `unlockRecovery` cambia la contraseña pero **no rota el código**: el código usado sigue abriendo. **Se mantiene así por decisión del usuario (D10):** solo cambia con `newRecovery`, que ya pide la contraseña.
2. Las rutas de desbloqueo no ponen en cero la DEK en bruto después de importarla (`openWith(await vaultUnwrap…)`); `enable` la devuelve para ofrecer la huella.
3. `convStore.save` «comprueba» releyendo de `vaultStore`, que con protección activa es la **copia en memoria**, no el disco. No confirma que el cifrado llegó a `localStorage`.
4. `convDeleteConversation` solo borra hojas **vacías**. La regla de la propuesta «borrar una hoja borra los audios de sus notas» hoy no puede ocurrir.
5. Dos pestañas abiertas con protección activa tienen cada una su copia en memoria: la última que guarda pisa el registro entero. Riesgo ya existente; crece con audios y originales.
6. El texto cifrado vive en `localStorage` (cupo habitual ≈5 MB por sitio, **sin medir en Brave/Motorola**), con expansión ×1,33 por base64. Las notas viejas (`notasvoz.gamma.v1`) y su copia convertida en hojas conviven, así que ese texto ocupa doble.

### 2.2 Principios del diseño

- **Aditivo.** No se renombra ni se reescribe ninguna clave histórica. No se sube la versión de `notasvoz-gamma-audio`. La cabecera `notasvoz.boveda.v1` y el formato de los registros **no cambian**.
- **Una sola raíz de claves:** la DEK actual. Nada de contraseñas nuevas.
- **Datos de pacientes solo cifrados:** originales y audios por nota existen únicamente con la bóveda abierta (D1 y D2). Así hay **un solo formato** de audio por nota y no hace falta cifrar/descifrar cientos de MB al activar o quitar la protección.
- **Primero el dato pesado, después el vínculo.** Nunca una nota que apunte a un audio inexistente; a lo sumo, un audio sin nota (recuperable).
- **Compatible hacia atrás:** una versión anterior de la app (pestaña vieja o vuelta atrás del código) no debe poder destruir datos nuevos sin darse cuenta.

### 2.3 Modelo de datos

| Qué | Dónde vive | Cifrado | Cambio |
|---|---|---|---|
| Hojas y notas (`conversaciones`) | `localStorage`, registro de bóveda | DEK | Sin cambio de esquema. Se empieza a usar `audioId` y `durationMs`, que ya existen. |
| **Originales de notas anonimizadas** | `localStorage`, **registro nuevo** `notasvoz.dictanota.originales.v1` → `VAULT_KEYS` «originales» | DEK | Nuevo |
| Tabla de personas/relaciones | Registro «personas» (ya existe) | DEK | Sin cambio |
| Borrador | Registro «borrador» | DEK | Campo opcional nuevo: `audioId` del audio pendiente |
| **Audios por nota** | **IndexedDB nueva** `notasvoz-dictanota-audio` v1 | Clave propia por audio | Nuevo |
| Audio suelto anterior | `notasvoz-gamma-audio` (histórica) | Sin cifrar | No se toca ni se migra (D7) |
| Configuración y generador de códigos | `localStorage` en claro (`cfg`, `generator`) | No | Sin cambio; se incluyen en la copia cifrada |

#### Originales: registro aparte, unido por el id de la nota

```json
{ "schema": 1,
  "originals": { "<entryId>": { "text": "<texto original completo>", "savedAt": 1763300000000 } } }
```

- Para el usuario el original está «dentro de la nota» (misma burbuja, mantener apretado). Físicamente va en **otro registro** por tres motivos verificados en el código: (a) `convCleanEntry` descarta campos desconocidos, así que una versión anterior de la app **borraría los originales al guardar** si estuvieran dentro del mensaje; (b) no hace falta subir `CONV_SCHEMA` (subirlo haría que una versión anterior no mostrara ninguna hoja); (c) la exportación «anonimizada» y la copia «solo anonimizada» pueden omitir ese registro entero.
- **Reglas:**
  - Anonimizar una nota: si no tiene original, se guarda `text` actual como original y **después** se escribe el texto anonimizado. Si ya tiene original, **no se pisa** (anonimizar dos veces no pierde el primero).
  - Orden de escritura: primero «originales», después «conversaciones» (el `flush` respeta el orden de inserción de `pending`). Si se corta en el medio queda un original igual al texto de la nota: inofensivo, se limpia solo.
  - Ver el original (mantener apretado): solo lectura. No cambia `savedAt` ni `textEditedAt`.
  - «Volver al original»: `text` ← original y se borra la entrada. `textEditedAt` se actualiza; el sello `savedAt` no.
  - Editar la versión anonimizada no toca el original (avisar que el original no recibe esa corrección).
  - Borrar la nota borra su original. Mover la nota no requiere nada.
  - Limpieza al abrir: originales cuyo `entryId` no existe (por ejemplo, nota borrada por una versión anterior) se listan en Ajustes; no se borran solos en la primera versión.
- **La tabla de personas no participa en la recuperación.** Quitar a alguien de la tabla no rompe nada.
- **Exportar** (copiar, TXT, Word, compartir): diálogo con «Anonimizada» (preseleccionada) y «Original». Si se eligió «Anonimizada» y hay notas sin anonimizar, mostrar cuántas (D9). Sigue saliendo **sin cifrar** y sin audio, como hoy.
- Con D1 = sí: si `vault.state !== 'open'`, no se escribe ningún original; la anonimización se comporta como hoy.

#### Audios por nota: IndexedDB nueva

Se elige **IndexedDB** y no OPFS: es lo que la app ya usa para audio y lo único validado en el Motorola (grabaciones largas); tiene transacciones (el primer fragmento y su ficha quedan juntos o no queda ninguno) y funciona igual en el WebView de Capacitor. OPFS no está probado en Brave/Android y sumaría una segunda API sin ventaja a estos tamaños.

Base `notasvoz-dictanota-audio`, versión 1:

- **`meta`** (clave `id`):
  ```
  { id,                      // UUID aleatorio, es el audioId de la nota
    state,                   // 'grabando' | 'escribiendo' | 'cerrado' | 'importando'
    createdAt, bytes,        // en claro: hacen falta para listar espacio sin descifrar
    parts,                   // cantidad de partes
    key,                     // clave del audio (CEK) envuelta: {iv, ct}
    sealed }                 // {iv, ct}: JSON cifrado con el detalle de cada parte
  ```
  Dentro de `sealed`: por parte, `mime`, `chunks`, `bytes`, `ms`, `origin` ('grabado' | 'cargado') y, si es cargado, el **nombre del archivo** (puede contener un nombre propio: nunca en claro).
- **`chunks`** (clave `[id, part, n]`): `Blob` con `IV (12 bytes) ‖ texto cifrado`. Como `Blob`, Chromium lo guarda en disco y se puede encadenar en otro `Blob` sin cargarlo en memoria (clave para exportar).

Notas del modelo:

- **Partes:** una nota puede venir de más de una grabación (grabar de nuevo sobre una nota en edición). Cada grabación es una parte, un archivo válido por sí mismo; el reproductor las toca en orden. Así `audioId` sigue siendo uno solo y no cambia el esquema de notas.
- **Tamaño de fragmento:** grabaciones, el que entrega `MediaRecorder` cada 10 s (≈40 KB; se conserva la propiedad actual de perder como mucho 10 s ante un corte). Archivos cargados: `File.slice()` de 1 MB, sin cargar el archivo entero.
- **El vínculo vive en la nota** (`audioId`, dentro del registro cifrado). En `meta` no se guarda a qué nota pertenece.
- **Lo que queda visible sin la clave:** cantidad de audios, tamaños y fechas. Se acepta y se documenta en SEGURIDAD.md.
- **Borrar nota** → borra su audio (la confirmación lo avisa). **«Borrar audio»** → borra el audio y deja el texto (`audioId` = null). **Mover** → nada.

### 2.4 Cifrado

```
contraseña ─PBKDF2─┐
código ─────HKDF───┼─ desenvuelven ─► DEK (32 bytes, ya existe)
huella ─PRF+HKDF───┘                    │
                                        ├─ AES-GCM directo ─► registros de texto (como hoy, + «originales»)
                                        └─ HKDF-SHA256 ─► K_audio
                                              ├─ envuelve la CEK de cada audio
                                              └─ cifra el «sealed» de cada meta
                                           CEK (aleatoria, una por audio) ─► fragmentos
```

- **K_audio** = HKDF-SHA256(clave = DEK, sal = bytes de `header.id`, info = `dictanota audio v1`) → AES-GCM 256, no extraíble. Se deriva en `openWith`, donde la DEK en bruto está disponible; después, `dek.fill(0)` en todas las rutas (ver 2.1, punto 2). **No se agrega nada a la cabecera.**
- **CEK por audio:** 32 bytes aleatorios, envuelta con K_audio. AAD `dictanota|v1|<id>|audio-clave|<audioId>`.
- **Fragmentos:** AES-GCM con la CEK, IV aleatorio de 96 bits, AAD `dictanota|v1|<id>|audio|<audioId>|<parte>|<n>`. El AAD impide reordenar o trasplantar fragmentos; `chunks` y `bytes` dentro de `sealed` (AAD `…|audio-meta|<audioId>`) detectan un audio truncado.
- **Por qué una clave por audio:** (a) rotar la DEK en el futuro solo re-envuelve claves chicas, sin recifrar gigas; (b) borrar un audio es borrar su clave; (c) la copia exportable lleva los fragmentos **tal como están**, sin recifrar.
- **Rotación:**
  - Cambiar contraseña: re-envuelve la DEK (ya existe). No toca datos.
  - Código de recuperación: **no cambia al usarse (D10)**. Solo con «código nuevo» pedido por el usuario con su contraseña (`newRecovery`, ya existe). Conviene decirlo en la pantalla de recuperación: «este código sigue valiendo; si alguien más lo vio, pedí uno nuevo».
  - Huella: quitar y volver a registrar (ya existe).
  - Rotar la DEK (sospecha de exposición): **queda diseñado, no se implementa en la Etapa E.** Sería: DEK nueva, recifrar los registros de texto, re-envolver las CEK, conservar `id`.
  - Ojo: una copia exportada antes de cambiar la contraseña **se sigue abriendo con la contraseña vieja**. Decirlo en la pantalla de la copia.
- **Bloqueo y memoria:**
  - Abierta: en memoria están el texto de todos los registros (como hoy, ahora también los originales), `K_audio` (no extraíble) y, como máximo, **un** audio descifrado: el que suena.
  - Reproducir: se descifra recién al tocar «reproducir», a un `Blob` y una dirección `blob:`; se revoca al terminar, al pausar más de un rato, al cambiar de nota o al salir de la hoja.
  - Bloqueo (15 min o manual): `location.reload()`, como hoy. Se va todo: texto, claves, `Blob` y direcciones `blob:`. JavaScript no puede garantizar el borrado de memoria; la recarga es el mecanismo.
  - **Sumar a `vaultSetHooks`** como «ocupado»: cifrado de un archivo cargado, exportación, verificación y restauración de una copia. Si no, el autobloqueo las corta por la mitad.
  - **La reproducción NO cuenta como uso (D11):** si pasan 15 minutos sin tocar la pantalla, la app se bloquea aunque esté sonando un audio, y el audio se corta. Con el tope de 15 minutos por archivo esto solo alcanza a grabaciones largas de la app.
  - Grabando: los fragmentos se cifran a medida que llegan. La app nunca se bloquea grabando, así que la CEK está disponible hasta el final.
- **Límites que no cambian:** no protege una sesión abierta, ni el micrófono, ni lo exportado, ni código comprometido (hallazgo 2 de SEGURIDAD.md). No prometer «cifrado seguro» en la interfaz.

### 2.5 Flujos de guardado y resistencia a cortes

**Grabación (bóveda abierta + «Conservar audio» encendido):**

1. Al empezar: crear CEK; transacción con `meta` (`state:'grabando'`) + primer fragmento.
2. Cada 10 s: cifrar y guardar el fragmento.
3. Al detener: actualizar `sealed` (fragmentos, bytes, ms) y `state:'cerrado'`. Anotar el `audioId` en el borrador.
4. Al tocar **Guardar**: la nota se guarda con `audioId` y `durationMs`. **Esperar `vault.flush()`** y recién entonces dar por vinculado (corrige el punto 3 de 2.1 para este caso).
5. **Descartar** el borrador: borra su audio pendiente (con aviso).

**Archivo cargado:** se transcribe como hoy; en paralelo o al terminar, `state:'escribiendo'`, fragmentos de 1 MB, y `cerrado` al final. Antes de empezar se verifica el espacio (2.7).

**Al abrir la bóveda (revisión de consistencia, sin borrar nada sola):**

| Lo que encuentra | Qué hace |
|---|---|
| `grabando` con fragmentos (corte en plena grabación) | Lo cierra con lo recibido y lo ofrece como «grabación interrumpida» (no se puede volver a grabar) |
| `escribiendo` (corte al guardar un archivo cargado) | Lo descarta: el usuario todavía tiene el archivo |
| `cerrado` sin nota ni borrador que lo use | «Audio sin nota» en Ajustes: Crear nota / Borrar (D8) |
| Nota con `audioId` que no existe | La burbuja dice «audio no disponible» y ofrece quitar la referencia; nunca falla la pantalla |
| `importando` (restauración cortada) | Limpia ese lote (ver 2.6) |
| Fragmento que no autentica | El audio se marca dañado; no se borra ni se sobrescribe (misma política que los registros `.danado.`) |

**Una sola pestaña:** tomar un candado con `navigator.locks` al abrir la bóveda; si otra pestaña ya lo tiene, avisar «DictaNota está abierta en otra pestaña» y no escribir. Mitiga el punto 5 de 2.1. (Sin probar en Brave/Android.) *Implementado en E2 (correcciones del 16/11/2026): vale para todo lo protegido y la cabecera, no solo para los audios.*

**Quitar la protección antes de AO** (implementado en las correcciones de E2): mientras no exista el recorrido de D3, si hay audios por nota guardados la app no deja quitarla y explica por qué (si no, quedarían ilegibles).

### 2.6 Copia cifrada exportable y versionada

**Objetivo:** respaldo y paso de Brave a la app de Android (Capacitor), cuyo almacenamiento es otro.

**Archivo:** `DictaNota-copia-AAAA-MM-DD.dictanota`, binario, de un solo recorrido:

```
"DICTANOTA-COPIA\n"                     16 bytes
formato (u32) = 1
largo (u32) + cabecera JSON en claro:
    { formato:1, creado, app:"Delta 11", id, pw:{…}, rec:{…},      ← igual que notasvoz.boveda.v1, SIN «bio»
      contenido:"completa"|"solo-texto", bloques:N }
bloque × N:  tipo (u8) · largo del nombre (u32) · nombre · largo de datos (u64) · datos
    R  registro de bóveda, tal como está en localStorage (notas, conversaciones, personas, originales, …)
    C  configuración y generador de códigos, cifrados con la DEK (AAD «copia|config»)
    M  meta de un audio (con su CEK envuelta y su «sealed»)
    A  fragmento de audio, tal como está en IndexedDB
    F  FIN: JSON cifrado con la DEK {bloques, bytes, registros, audios}
```

- **Se abre con la contraseña o el código de recuperación** vigentes al exportar. La huella no viaja: está atada al dispositivo.
- **No se recifra nada:** registros y fragmentos se copian como están, así que exportar no puede dañar el original ni requiere tener todo en memoria. El archivo se arma como `new Blob([cabecera, …blobs])` y se descarga con un enlace `blob:` (la CSP ya lo permite). `showSaveFilePicker` no está disponible en Chrome para Android (confirmar en Brave).
- **Integridad:** cada bloque se autentica solo (AES-GCM + AAD); el bloque F, cifrado, repite los totales. Un archivo cortado no tiene F o no coincide: se rechaza entero con mensaje claro.
- **El generador de códigos va en la copia** (bloque C): si se perdiera el contador, la app nueva podría repetir un código `P-001` ya usado.
- **Protección apagada:** la copia igual sale cifrada; se pide una contraseña solo para el archivo (cabecera efímera). En ese caso no hay audios por nota ni originales (D1/D2).
- **«Verificar copia»:** se elige el archivo y la app lo recorre y autentica todo sin restaurar. Necesario porque una página no puede saber si una descarga terminó bien.
- **Restaurar (D6):** solo en app vacía, o «reemplazar todo» con doble confirmación.
  1. Primer recorrido: validar todo (formato, autenticación, FIN). Si algo falla, no se escribe nada.
  2. Segundo recorrido: audios a IndexedDB con `state:'importando'` y un id de lote; registros a `localStorage`.
  3. **La cabecera `notasvoz.boveda.v1` se escribe al final:** es el punto de confirmación. Después, los audios pasan a `cerrado`.
  4. Si se corta antes del paso 3, la app sigue como estaba y el próximo intento limpia el lote.
  La app restaurada queda con el mismo `id`, la misma contraseña y el mismo código; la huella se registra de nuevo.
- **Versionado:** `formato` entero. Un lector que encuentre un formato mayor al que conoce **se niega** («esta copia es de una versión más nueva») y nunca interpreta a medias. Cada registro conserva su propio esquema (`CONV_SCHEMA`, etc.). Cada formato publicado deja en `tests/` un **archivo de ejemplo fijo, con datos inventados**, que todas las versiones futuras (web y Android) deben poder abrir.
- **Android:** la app restaura la copia y agrega la envoltura `android` (Keystore + BiometricPrompt) a la cabecera, como prevé `DISENO-CIFRADO.md`. `vaultParseHeader` ignora campos que no conoce y los `{...h}` los conservan (verificado). El mismo `index.html` y la misma IndexedDB sirven dentro del WebView; pasar los audios a archivos nativos es una decisión posterior.
- **Implementado en K1 (17/11/2026), formato 1. Precisiones que valen como parte del formato:**
  - Números en orden de red (big-endian). El largo de la cabecera es de hasta 64 KB; el nombre de un bloque, de 1 a 200 bytes UTF-8; los datos de un bloque, hasta 64 MB.
  - `bloques` cuenta todos los bloques, incluido F. `app` vale «Delta 11».
  - Nombres: R lleva el nombre del registro (`notas`, `conversaciones`, …); C se llama `config` y su contenido es `{cfg, generador}` (los textos de `notasvoz.gamma.cfg.v1` y `notasvoz.gamma.generator.v1`, o `null`); M lleva el id del audio y su ficha en JSON; A se llama `<audioId>|<parte>|<n>`; F se llama `fin`.
  - Orden: cada M va seguido de **todos** sus A, en orden de parte y de posición. Solo entran audios `cerrado` y sanos. F es siempre el último y después no hay nada.
  - C y F son `{iv, ct}` en JSON, cifrados con la clave de datos; AAD `dictanota|v1|<id>|copia|config` y `…|copia|fin`.
  - F contiene `{bloques, bytes, registros, audios, fragmentos, cadena}`. `bytes` es el tamaño de todo lo anterior a F. **`cadena` (agregado al diseño):** huella encadenada, `c0 = SHA-256(marca ‖ formato ‖ largo ‖ cabecera)` y, por cada bloque anterior a F, `c = SHA-256(c ‖ encabezado del bloque ‖ SHA-256(datos))`, en base64. Autentica también la cabecera en claro, los nombres, el orden y las fichas de audio, y detecta un registro reemplazado por otro más viejo de la misma protección.
  - El lector recorre el archivo por tramos (nunca entero en memoria) y, antes de descargar, la app comprueba la copia recién armada.
  - Un lector debe aceptar nombres de registro que no conoce (`[a-z0-9.-]`, hasta 60): se autentican igual. Qué hacer con ellos lo decide la restauración (K2).
  - Archivo de ejemplo fijo: `tests/copia-formato-1.dictanota` (contraseña de prueba en `tests/delta.test.mjs`, código en `tests/copia-formato-1.codigo.txt`). **No se regenera.**
- **Sin probar:** que Brave/Android descargue un `Blob` compuesto de cientos de MB. Si falla: copia «solo texto» + audios en volúmenes de ≤200 MB.

### 2.7 Espacio

| Caso | Tamaño |
|---|---|
| Grabación de la app (32 kbps) | ≈14 MB por hora · ≈0,7 MB una nota de 3 min · 100 notas ≈ 70 MB |
| Archivo cargado MP3/M4A de 15 min | ≈10–15 MB |
| Archivo cargado WAV de 15 min | ≈80–160 MB: **ya no entra** (tope nuevo de 30 MB, D4) |
| Costo del cifrado | 28 bytes por fragmento: despreciable |
| Texto | KB por nota, pero en `localStorage` (≈5 MB en total) |

- **Almacenamiento persistente:** llamar a `navigator.storage.persist()` la primera vez que se guarda un audio por nota. Chromium decide solo, sin preguntar, y **puede negarlo**; mostrar el resultado en Ajustes («Protegido contra la limpieza automática: Sí/No») y, si es No, recomendar la copia cifrada. Comportamiento en Brave: sin probar.
- **Ajustes → Datos:** espacio de audios (suma de `meta.bytes`), cantidad, estimación libre (`navigator.storage.estimate()`), y **uso del texto** en `localStorage` con aviso al 50 % y al 80 % del cupo medido. Lista de audios ordenable por tamaño, con «Borrar audio».
- **Tope de carga (D4):** `IMPORT_MAX_BYTES` baja de 200 MB a **30 MB**; un archivo más pesado se rechaza antes de decodificar, con el mensaje de «cortalo en partes». Los 15 minutos (`IMPORT_MAX_SEC`) no cambian. El manejador de carga compara también contra `LOAD_MAX_BYTES` (200 MB, línea ≈4038): revisar qué más usa esa constante antes de tocarla.
- **Antes de guardar un archivo cargado:** si `estimate()` no da margen (tamaño + 20 %), se transcribe y **no se guarda**, con aviso. No se intenta y falla a la mitad.
- **Sin lugar en plena grabación** (`QuotaExceededError`): prioridad al texto. La transcripción sigue, el audio queda con lo recibido, marcado «incompleto», y se avisa una vez (es lo que ya hace `audioErr`).
- **Sin lugar para el texto:** ya contemplado por la bóveda (`pending` + aviso «Liberá espacio»). Con originales, ese caso llega antes: de ahí el medidor.
- **El texto en `localStorage` tiene techo: se muda a IndexedDB (D13, sección 2.13).** El formato de la copia no depende de dónde viva el texto.
- **Reproducción:** con el tope de 30 MB (D4) el audio descifrado entra en memoria.

### 2.8 «Conservar audio» apagado

- No se crea `meta`, ni fragmentos, ni CEK; la nota se guarda con `audioId` = null. Vale igual para lo grabado y para lo cargado.
- El archivo cargado se transcribe y se descarta. Queda, como hoy, `retryAudio` **solo en memoria** (máx. 32 MB) para reintentar la transcripción, y se vacía al empezar otra grabación.
- Apagarlo **no borra** audios ya guardados. Encenderlo no recupera audios pasados.
- El interruptor ya está deshabilitado durante la captura (verificado), así que no cambia a mitad de una grabación.
- Corregir el `confirm` de carga de archivo («El archivo no se guarda en DictaNota») para que diga lo que corresponda según el interruptor, y la frase de AGENTS.md «Un audio cargado… nunca se guarda».
- Con la protección apagada (D2 = sí): «Conservar audio» sigue escribiendo el audio suelto en la base histórica, sin cifrar, con su aviso actual. La burbuja no muestra reproductor.

### 2.9 Migración desde Delta 11

En la Etapa E no hay conversión de datos: todo es aditivo. La única migración real del plan es la mudanza del texto (D13, sección 2.13), que va aparte y con su propio permiso.

| Dato existente | Qué pasa |
|---|---|
| Claves `notasvoz.gamma.*` y `notasvoz.dictanota.v2` | Intactas, mismos nombres |
| Cabecera y registros `notasvoz.boveda.v1*` | Intactos. Se agrega «originales» a `VAULT_KEYS`; aparece recién al primer original |
| `notasvoz-gamma-audio` (`last`/`previous`) | No se abre con versión nueva, no se migra, no se borra. Aviso en Ajustes (D7). `#audioBox` y «Mis grabaciones» siguen visibles (regla 6 de AGENTS.md) |
| Notas existentes | `audioId` = null: se ven como hoy |
| `notasvoz-dictanota-audio` | Se crea recién al guardar el primer audio por nota |

- Todo dato nuevo de pacientes entra por `vaultStore` o cifrado con una clave derivada de la DEK; nada va a `localStorage` directo. Mantener la prueba que lo exige y extenderla a la base nueva (ningún `put` de audio por nota sin cifrar).
- **Vuelta atrás del código:** una versión anterior ignora «originales» y la base nueva, y conserva `audioId` (ya lo conoce). Puede dejar huérfanos al borrar notas; nunca corrompe.
- Antes de E2, ofrecer al usuario una copia (cuando exista la copia cifrada; mientras tanto, «Descargar .txt» de sus hojas).
- Actualizar en el mismo PR que implemente: SEGURIDAD.md (regla 7 y hallazgo 1), AGENTS.md (frases de audio en burbuja y de archivos cargados), DISENO-CIFRADO.md (audios ya cifrados) y los textos de la interfaz que digan que los audios no se cifran.

### 2.10 Casos de falla

| Caso | Resultado esperado |
|---|---|
| Cierre o corte durante una grabación | Se pierden como mucho ~10 s de audio. Al abrir: «grabación interrumpida». El texto sigue en el borrador, como hoy |
| Corte al guardar un archivo cargado | Se descarta lo parcial; la nota queda sin audio |
| Corte entre «audio cerrado» y «nota guardada» | Audio sin nota, recuperable desde Ajustes |
| Corte al anonimizar | Original guardado y nota sin cambiar, o ambos bien. Nunca la nota anonimizada sin su original |
| Contraseña perdida | Código de recuperación → contraseña nueva. Con huella se puede seguir entrando |
| Contraseña y código perdidos, sin huella | **Irrecuperable**, también las copias. Decirlo al activar y al exportar |
| Código de recuperación usado | Se entra y se pide contraseña nueva. **El código sigue siendo el mismo (D10)**; la pantalla recuerda que se puede pedir uno nuevo |
| Borrado de «datos del sitio» | Se pierde todo. Solo se recupera desde una copia cifrada |
| Se pierde IndexedDB pero no `localStorage` | Notas con «audio no disponible»; el texto intacto |
| Se pierde la cabecera pero quedan audios | Indescifrables sin una copia (que trae la cabecera). No se borran solos |
| Exportación a medias | El original no se modifica. El archivo cortado no pasa «Verificar copia» |
| Restauración a medias | No se confirma (falta la cabecera); se limpia el lote y se reintenta |
| Autobloqueo durante una tarea larga | No ocurre al grabar, transcribir, cifrar un archivo, exportar, verificar o restaurar. **Sí ocurre reproduciendo (D11):** el audio se corta y hay que desbloquear |
| Fragmento o registro alterado | No se usa, no se sobrescribe, se avisa |
| Dos pestañas | La segunda no escribe (candado) |
| Falta espacio | Ver 2.7: el texto primero, el audio se marca incompleto |

### 2.11 Plan de pruebas (datos 100 % inventados)

El repositorio es público: **ningún** nombre, voz ni texto real. Usar siempre material como «Persona Inventada Uno», código `X-901`, relación `madre de X-901`, y audios sintéticos (tonos o silencio generados en la prueba). Para el Motorola, Ignacio lee en voz alta un texto inventado.

**Node (`tests/delta.test.mjs`, sin dependencias nuevas; usa WebCrypto de Node):**
- K_audio: misma DEK + mismo id → misma clave; otro id → no descifra.
- Fragmento: ida y vuelta; falla si se cambia el índice, la parte, el `audioId` o un byte.
- CEK envuelta: no abre con otra DEK. `sealed` detecta fragmentos faltantes.
- Originales: anonimizar dos veces conserva el primero; «volver al original»; borrar nota borra su original; ver el original no cambia sellos; nada se escribe con la bóveda apagada (D1).
- Compatibilidad: el `convValid` actual lee datos con `audioId` y no pierde nada; con «originales» presente, el código de `main` de hoy no lo toca.
- Copia: armar y leer; rechazo si falta FIN, si se corta en cada posición de bloque, si `formato` es mayor, si la contraseña es otra. Abrir el archivo de ejemplo fijo del formato 1.
- Estática: ningún `put` en la base nueva sin cifrar; ninguna clave nueva fuera de `VAULT_KEYS`; sin `fetch` ni orígenes nuevos.

**Chrome (`tests/cifrado-browser.mjs` y uno nuevo de audio, 412 px, autenticador virtual):**
- Grabar con micrófono simulado, guardar, recargar, desbloquear, comprobar que el audio descifrado coincide byte a byte y que en IndexedDB no aparece ninguna cabecera WebM/MP4 en claro.
- Cerrar la pestaña en plena grabación y en pleno guardado de archivo: revisar la tabla de 2.5.
- «Conservar audio» apagado: la base nueva no se crea o queda vacía, con grabación y con archivo.
- Autobloqueo: no bloquea exportando ni cifrando un archivo; **sí bloquea reproduciendo** a los 15 minutos sin interacción (D11); al bloquear no quedan direcciones `blob:` utilizables.
- Código de recuperación: después de usarlo sigue abriendo; cambia solo con «código nuevo» y contraseña (D10).
- Tope de carga: un archivo de 30 MB + 1 byte se rechaza antes de decodificar (D4).
- Cupo: simular `QuotaExceededError` en el `put` de un fragmento y en `localStorage`.
- Exportar → borrar todo → restaurar → comparar. Restauración interrumpida a propósito.
- Dos pestañas: la segunda avisa y no escribe.
- Datos de Delta 11 sembrados antes de cargar la versión nueva: todo queda igual, incluido el audio suelto.

**Motorola (Brave), con datos inventados; lo hace Ignacio:**
- Grabar 1, 10 y 60 minutos con protección activa: que no se corte, batería y temperatura razonables.
- Cargar un M4A de 15 min y uno que supere los 30 MB.
- Dejar sonando una grabación larga sin tocar la pantalla: a los 15 minutos tiene que bloquearse.
- Reproducir, adelantar, pausar; apagar la pantalla durante la reproducción.
- Estado de `persist()` y números de espacio creíbles.
- Descargar una copia completa de más de 200 MB, verificarla y restaurarla en otro perfil o navegador.
- Huella después de restaurar (registrar de nuevo).

### 2.12 Subetapas, riesgos y qué se deshace fácil

Cada una en su rama desde el `main` actualizado, con plan corto, permiso de Ignacio, PR propio y commit de merge sin squash.

| Paso | Qué incluye | Riesgo | ¿Se deshace fácil? |
|---|---|---|---|
| **E1** · Base nueva y vínculo | Módulo de la IndexedDB nueva, funciones puras (partes, estados, revisión de consistencia), candado de una pestaña. **Sin activar para el usuario** | Bajo | **Sí, total.** La base ni siquiera se crea en el celular |
| **E2** · Cifrado de audios | K_audio, CEK, fragmentos cifrados; se activa el guardado por nota (grabado y cargado) con protección abierta e interruptor encendido; `dek.fill(0)`; tareas largas como «ocupado» | **Medio/alto:** cifrar mientras se graba es lo más delicado para el celular | El código sí. Los audios ya guardados quedan cifrados y sin usar, no se pierden; al volver a activar se leen |
| **K1** · Copia cifrada: exportar y verificar (va antes del reproductor, D12) | Formato 1, archivo de ejemplo fijo, «Verificar copia» | Medio (descargas grandes en Android) | **Sí.** Solo agrega; no modifica datos |
| **E3** · Reproductor, persistencia y espacio | Reproductor en la burbuja, `persist()`, panel de espacio, audios sin nota, aviso del audio suelto viejo | Medio (duración y avance en WebM; memoria) | **Sí** (interfaz). `persist()` no se revierte, pero es inofensivo |
| **K2** · Restaurar | Restauración en app vacía o con reemplazo | **Alto: es lo único que puede borrar datos** | El código sí; un reemplazo hecho, **no**. Exigir «Verificar» y doble confirmación |
| **T** · Texto al depósito grande (D13, ver 2.13) | Los registros cifrados pasan de `localStorage` a IndexedDB | **Alto: es la única migración de datos del plan** | **No fácilmente.** Exige K1 hecha y una copia verificada antes |
| **AO** · Original recuperable | Registro «originales», mantener apretado, diálogo de exportación, comportamiento al quitar la protección (D3) | Medio (llena antes el cupo de texto) | **Sí.** Una versión anterior ignora el registro |

- **Orden decidido:** E1 → E2 → K1 → E3 → K2 → T → AO. **AO** va después de C1 (propuesta estética) y después de T (D13).
- En E2 entra también el tope de carga de 30 MB (D4).
- **No se deshace:** audios borrados al quitar la protección (D3), «reemplazar todo» al restaurar y cualquier «Borrar audio». Los tres llevan confirmación explícita y oferta de copia previa.
- **Coordinación:** los PR #42 y #43 (ChatGPT) y este (#44) se unieron a `main` el 16/11/2026, en ese orden, con permiso de Ignacio.
- **Estado y pedidos por paso:** se llevan en [PLAN-ALMACENAMIENTO-CIFRADO.md](PLAN-ALMACENAMIENTO-CIFRADO.md), no acá.

### 2.13 Mudanza del texto al depósito grande (D13)

**Por qué:** `localStorage` tiene un cupo chico (≈5 MB habituales, sin medir en Brave), cada guardado recifra el registro entero y los originales lo duplicarían. IndexedDB comparte el cupo grande de los audios.

**Alcance propuesto:** solo los **registros cifrados** (`notasvoz.boveda.v1.r.*`). La cabecera `notasvoz.boveda.v1` queda en `localStorage` (es chica y decide el estado al arrancar). Con la protección apagada todo sigue en `localStorage` como hoy; quien implemente puede proponer ampliarlo, con otro permiso.

- Base nueva `notasvoz-dictanota-datos` v1, almacén `registros` (clave = nombre del registro; valor = el mismo JSON cifrado de hoy, sin recifrar).
- `vaultStore` no cambia hacia afuera: sigue siendo sincrónico sobre la copia en memoria. Cambia solo adónde escribe `flush` y de dónde lee `openWith`. La app ya espera el desbloqueo con `vaultWhenReady`.
- De paso se corrige el punto 3 de 2.1: `convStore.save` (y el guardado de originales) confirman recién cuando el `flush` terminó en disco.
- **Pasos de la migración, al desbloquear:**
  1. Exigir una copia cifrada verificada reciente (K1) o confirmación explícita de seguir sin ella.
  2. Copiar cada registro a IndexedDB, releerlo y **descifrarlo** para comprobarlo.
  3. Escribir en la cabecera una marca `datos: "idb"`. Es el punto de confirmación (`vaultParseHeader` conserva campos que no conoce; verificado).
  4. Recién entonces borrar los registros de `localStorage`.
  Si se corta antes del paso 3, se sigue leyendo de `localStorage` y se reintenta. Si se corta entre 3 y 4, al abrir se borran las copias viejas que coincidan; si difieren, **no se borran** y se avisa (misma política que las «copias en claro que quedaron»).
- **Vuelta atrás:** una versión anterior de la app no sabe leer IndexedDB y vería la bóveda sin notas (no las borra, pero no las muestra). Por eso es el paso menos reversible del plan y va después de K1/K2.
- **Pruebas propias:** datos de Delta 11 sembrados → migrar → comparar byte a byte; corte en cada paso; cupo lleno en IndexedDB; dos pestañas; restaurar una copia hecha antes de la mudanza.
- Actualizar SEGURIDAD.md (regla 7), AGENTS.md y DISENO-CIFRADO.md («Dónde queda cada cosa»).

---

## PARTE 3 · Decisiones: opciones consideradas y qué se eligió

> **Todas resueltas por Ignacio el 16/11/2026.** Lo elegido figura en la tabla de la Parte 1. En D1–D9 y D12 coincidió con la opción marcada como recomendada. En **D10** eligió (b): el código no cambia solo. En **D11** eligió (b): bloquear igual. **D13** (texto al depósito grande, antes de los originales) se agregó en la misma conversación; las opciones descartadas fueron «solo medir por ahora» y «esperar a la app de Android». En **D4** el tope de 30 MB vale para **cargar**, no solo para guardar.

**D1 · Originales y protección.** (a) Solo con protección activa — *recomendada*: nunca quedan nombres reales en claro junto a la versión anonimizada. (b) Permitir sin protección con un aviso fuerte: más simple de usar, pero anula el sentido de anonimizar en el dispositivo.

**D2 · Audios por nota y protección.** (a) Solo con protección activa — *recomendada*: un único formato, la voz nunca en claro. (b) Permitir sin cifrar y cifrar al activar: obliga a dos formatos y a convertir cientos de MB al activar o quitar; más código y más casos de corte.

**D3 · Quitar la protección con originales y audios.** (a) Ofrecer copia, borrar audios por nota y elegir qué hacer con los originales — *recomendada*, coherente con D1 y D2. (b) Descifrar todo y dejarlo en claro: lento, riesgoso si se corta y contradice D1/D2. (c) Impedir quitar la protección mientras existan: simple, pero te deja sin salida.

**D4 · Archivos cargados.** (a) Tal cual hasta 30 MB; más pesado no se guarda — *recomendada*: fiel y simple; cubre MP3/M4A de 15 min. (b) Tal cual hasta 200 MB: riesgo real de quedarse sin memoria al reproducir. (c) Comprimir siempre a MP3 con la librería que la app ya usa: ahorra mucho, pero depende de `lamejs` (hoy se baja de jsDelivr; pendiente la copia propia) y suma tiempo de proceso. Buena mejora posterior.

**D5 · Contenido de la copia.** (a) Elegir cada vez — *recomendada*. (b) Siempre completa: segura pero pesada. (c) Siempre solo texto: liviana, pero los audios no pasarían a Android.

**D6 · Restaurar.** (a) Solo app vacía o reemplazo — *recomendada* para la primera versión. (b) Fusionar por id de nota: útil si usás dos dispositivos, pero hay que resolver conflictos; dejarlo para después.

**D7 · Audio suelto viejo.** (a) No migrar; aviso con Descargar/Borrar — *recomendada* (el rediseño ya lo trata como material de prueba). (b) Convertirlo en una nota con audio: no hay forma segura de saber a qué nota pertenece.

**D8 · Audios sin nota.** (a) Nunca borrarlos solos; listarlos — *recomendada*: una grabación no se puede repetir. (b) Borrarlos a los 7 días: ordena solo, pero puede borrar algo que querías.

**D9 · Exportar «anonimizada» con notas sin anonimizar.** (a) Avisar cuántas y dejar elegir — *recomendada*. (b) Anonimizarlas en el momento solo para esa exportación: cómodo, pero sale sin que la revises. (c) Impedir exportar hasta anonimizarlas: seguro y rígido.

**D10 · Código de recuperación tras usarlo.** (a) Emitir uno nuevo en el acto — *recomendada*. (b) Dejarlo como hoy (sigue valiendo): si lo usaste porque alguien más lo vio, queda expuesto.

**D11 · Autobloqueo y reproducción.** (a) No bloquear mientras suena — *recomendada*. (b) Bloquear igual a los 15 minutos: corta un audio largo por la mitad.

**D12 · Orden de la copia cifrada.** (a) Después de E2 y antes del reproductor — *recomendada* si vas a empezar a guardar audios enseguida. (b) Después de E3: ves el reproductor antes, con más tiempo sin respaldo.

**Decisiones técnicas ya tomadas en este documento** (no hace falta que las resuelvas; quien implemente puede objetarlas con fundamento): originales en un registro aparte; IndexedDB en vez de OPFS; una clave por audio; cabecera `notasvoz.boveda.v1` sin cambios; fragmentos de 10 s (grabación) y 1 MB (archivo); copia sin recifrar.
