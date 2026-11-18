## 18/11/2026 · Elegir cuaderno y nombre desde Dictar (U12) (Claude Sonnet 5.5; entregado como `.patch`, sin tocar GitHub)

Base: `main` (#65 y #66). No cambian el formato de lo guardado, las claves, el cifrado, las copias ni K2: todo se sigue guardando por `vaultStore`, como hoy.

- **Selector «Guardar en» en Dictar:** «Cuaderno nuevo» (por defecto) o cualquier cuaderno existente, del más reciente al más viejo. Con «Cuaderno nuevo» aparece un campo opcional de nombre; vacío o solo espacios = fecha y hora (U7). El nombre se recorta y tiene un máximo de 120 caracteres.
- **Borrador (U13):** el dictado sigue siendo un borrador; no se guarda nada hasta tocar Guardar en Cuadernos. También se puede elegir el destino después de dictar.
- **Dentro de un cuaderno** no se ve el selector y lo dictado va a ese cuaderno (U7). Si la nota sin guardar ya tiene otro destino, o se edita una guardada, el selector se ve bloqueado con una explicación.
- **La elección dura solo la sesión** (variables en memoria, no se guarda). Al abrir la app vuelve a «Cuaderno nuevo». Si el cuaderno elegido desaparece, vuelve a «Cuaderno nuevo».
- **Código:** `convAddEntry` acepta `opts.title`; `convStartPending`, `refreshConvTarget` y `convBeginNew` usan el destino de Dictar; `dictDestRefresh` arma la lista solo si cambia (no cierra el selector del celular). Ninguna pantalla nueva.
- **Pruebas:** `tests/dictar-destino-browser.mjs` (Chrome a 360 px, con protección activada y desactivada) y se ajustó una regla de `tests/delta.test.mjs`. Capturas en `docs/capturas/u12-selector-360-*.png`.
- **Límite conocido:** tras recargar, un borrador restaurado va a un cuaderno nuevo, como hoy.

## 18/11/2026 · Prueba inestable de K2 corregida y reemplazo probado en el Motorola (Claude)

- **`tests/k2-candado-browser.mjs` (parte 6, «corte real»):** fallaba a veces (1 de cada 10 en laboratorio, también en el CI). Causa: `location.reload()` no detiene la página al instante, y a veces la restauración alcanzaba a terminar entera antes de recargar; la prueba solo aceptaba «vacía». Además miraba el estado a los 300 ms, sin esperar la limpieza asincrónica del arranque. Ahora espera hasta 10 s y exige **todo o nada**: vacía (lote limpiado) o la copia entera (cabecera y su audio), nunca a medias. **La app no cambió.** 0 fallas en 20 corridas.
- **Probado en el Motorola (Ignacio, 18/11, mañana):** recorrido del reemplazo K2 con datos inventados (copia, nota posterior, reemplazo, dos confirmaciones, descarga del respaldo previo, resultado y código nuevo). Sin problemas según Ignacio.

## 18/11/2026 · K2 de reemplazo: restaurar una copia sobre una instalación que ya tiene datos (Claude Sonnet 5.5; entregado como `.patch`, sin tocar GitHub)

Base: `main` con la capa `vault.records` (#64). Rama `feature/k2-reemplazo-2026-11-17`. Sin T. No cambian los formatos de copia 1 y 2, ni las claves, ni la cabecera, ni los archivos de ejemplo. Los registros cifrados se leen y escriben **solo** por `vault.records`.

- **Orden fijo del reemplazo (`k2Replace`, bloque K2):** comprobar la copia entera → comparar con lo que hay y mostrar qué se perdería → primera confirmación → **respaldo previo** completo, comprobado y descargado → segunda confirmación → diario «borrando» → borrado guiado → diario «borrado» → restauración con el código de K2 para instalaciones vacías (`k2RestoreLocked`). El todo o nada lo garantiza el respaldo previo, no el almacenamiento.
- **Respaldo previo:** formato 1 (el publicado), armado por `copiaMake` (extraído de `copiaCreate` sin cambiar su comportamiento; `copiaCreate` sigue comprobando antes de descargar). Se **rechaza antes de borrar** si saldría con exclusiones: audios dañados, audios sin cifrar, datos apartados por dañados, o audios cifrados con la protección apagada. No se usa el formato 2: escribirlo para el usuario sería publicarlo y A3/Q1 pide el permiso de Ignacio aparte.
- **Comparación y confirmaciones:** notas más nuevas que la copia o que la copia no tiene, audios que la copia no tiene, audios con el mismo identificador (los reemplaza el de la copia) y audio antiguo (`notasvoz-gamma-audio`, que ninguna copia lleva y no se recupera ni con el respaldo previo); fecha de la copia; aviso si viene de **otra instalación** (otro identificador); y que la contraseña y el código de la copia pasan a ser los de la instalación.
- **Marca «restauración en curso»** (`k2ReplaceActive` + diario `notasvoz.k2.reemplazo.v1`), **separada de `copiaBusyN`**: frena el autobloqueo (entra en el gancho `vaultSetHooks`), la creación y la comprobación de copias, y otro reemplazo. Con el diario presente tras un corte, tampoco se crean copias.
- **Diario reanudable:** `respaldo` (nada se borró; se limpia solo al abrir) → `borrando` → `borrado` (la instalación está vacía; se elige la copia nueva o el respaldo previo). El aviso se muestra al abrir y el botón «Reemplazar» retoma.
- **Espacio:** antes de empezar se compara lo necesario (tamaño de la copia + 10 % + 256 KB) con lo libre **más** lo que el borrado libera; si el navegador no permite medirlo, no se sigue (`k2SpaceCheck`).
- **A11:** los audios que estaban sin cifrar en la copia (formato 2) **se cifran al restaurar** con la clave de la copia (`anSealChunk`/`anSealDetail`) y quedan protegidos. Se comprueba cada fragmento contra su huella antes de cifrarlo; nunca se escribe audio descifrado. Esto reemplaza el rechazo anterior (también en la restauración para instalaciones vacías).
- **Deshacer:** el diario de la restauración pasa a la versión 3 y anota los ids de audio que **ya existían** antes del lote; `k2Rollback` solo borra los que creó el lote. Un id de la copia que ya está guardado se rechaza antes de escribir.
- **Capa de registros:** método nuevo `vault.records.quarantined()` (solo lectura) para saber si hay datos apartados por dañados, que el respaldo no puede incluir.
- **Al terminar:** se ofrece generar un código de recuperación nuevo (al abrir con la contraseña de la copia).
- **Pruebas nuevas:** `tests/k2-reemplazo-browser.mjs` (Chrome, datos inventados): recorrido completo; **15 cortes «duros»** (la escritura falla y todas las siguientes también) con recuperación desde el respaldo previo, que deja exactamente lo que había; id de audio repetido con otro contenido; respaldo previo con exclusiones (3 casos); copia de otra instalación, contraseña cambiada y copia hecha con protección apagada; autobloqueo durante el reemplazo; espacio justo y uno menos; formatos 1 y 2; audio sin cifrar que queda cifrado. Además `tests/k2-reemplazo.test.mjs` (Node, 4): orden fijo, marca propia, solo `vault.records`, sin formato 2. Pruebas de mutación: quitar la comprobación del respaldo, el cifrado de audios, la marca en el autobloqueo, el control de espacio o el filtro del deshacer hace fallar la prueba.
- **Pruebas existentes:** siguen en verde. Cambios mínimos: `delta.test.mjs` (el gancho del autobloqueo incluye la marca), `p2-correcciones.test.mjs` (la regla «B nunca se escribe en claro» pasa a «B se cifra antes de escribir», A11) y `k2-browser.mjs` (la copia formato 2 ya no se rechaza).
- **No probado en el Motorola.** Por probar en el celular: las dos confirmaciones y los avisos en pantalla chica, la descarga del respaldo previo, el tiempo con audios reales, la oferta de código nuevo al abrir y un corte real (cerrar el navegador durante el borrado).
- **Fuera de alcance, anotado y sin arreglar:** (1) `tests/k2-candado-browser.mjs` falla a veces también en `main` (1 de 8 corridas): es inestable. (2) La restauración K2 escribe la cabecera sin el campo informativo `created`, que la app no lee. (3) K2 sigue siendo experimental y el formato 2 sigue en laboratorio (Q1). (4) El audio antiguo no entra en ninguna copia.

## 17/11/2026 · Capa única de registros cifrados, paso previo a T (Claude Sonnet 5.5, fork propio; PR contra `main`)

Refactor **sin cambio de comportamiento**. Base: `9d47b99` (`main` con K2, #61). Rama `feature/capa-unica-registros-2026-11-17` en un fork propio; no se tocó `main` ni ninguna rama ajena, y no se hizo merge. Sin T: el almacenamiento sigue siendo `localStorage`.

- **Qué cambió:** dentro de `VAULT-CORE` hay un bloque nuevo, `REGISTROS-CIFRADOS`, con `createRecordStore` y `VAULT_REC_PREFIX`. Es el único código que sabe dónde y con qué clave se guarda cada registro `notasvoz.boveda.v1.r.*`. La bóveda lo expone como `vault.records` (`get`, `set`, `remove`, `all`, `any`, `owns`, `bytes`, `quarantine`, `clear`, `useBackend`). Pasan por esa capa: la bóveda (activar, desbloquear, guardar en segundo plano, apartar un registro dañado, quitar la protección), la creación de la copia (`copiaCreate`, que dejó de usar `vault.rawRecords()`), la restauración K2 (escribir, confirmar y deshacer un lote) y el panel de espacio de Ajustes. La comprobación de «instalación vacía» de K2 (`k2LocalEmpty`) ahora también mira los registros por la capa. La verificación de copias lee el archivo, no los registros guardados, así que no cambió.
- **Qué no cambió:** nombres de claves, cabecera, formatos de copia 1 y 2, sus archivos de ejemplo, el orden de las escrituras ni los mensajes. Las pruebas nuevas comprueban que cada registro sigue guardándose como `notasvoz.boveda.v1.r.<nombre>` y que la cuenta del panel de espacio es la misma de antes (2 por carácter, clave y valor). La capa es **sincrónica**, igual que `localStorage`: T tendrá que volverla asincrónica y sumar `await` en sus llamadores (todos están ya en funciones `async`, salvo `k2LocalEmpty`).
- **Pruebas nuevas:** `tests/capa-registros.test.mjs` (Node, 11): (a) prueba estática que falla si aparece, fuera de la capa, el prefijo, la clave escrita a mano, `rawRecords` o registros apartados (con controles que demuestran que falla: sobre el `index.html` de `main` da 17 hallazgos); (b) la capa y la bóveda con un almacén falso en memoria. `tests/capa-registros-browser.mjs` (Chrome): con el almacén interno de la capa cambiado por uno falso, activa la protección, guarda notas, crea la copia, la verifica y la restaura en una instalación vacía; comprueba que la copia lleva exactamente los mismos registros (mismos nombres y mismos textos cifrados) y, con un espía en `Storage`, que nada lee ni escribe claves de registros de `localStorage`. Se comprobó con tres mutaciones (K2, copia y bóveda con acceso directo) que estas pruebas fallan. Ambas están en el CI.
- **Pruebas existentes:** siguen igual. Único cambio: `tests/delta.test.mjs` busca `vault.records.all()` donde antes buscaba `vault.rawRecords()`. En laboratorio pasan `delta` (167), `entrega2` (10), `p2-correcciones` (10) y las 14 suites de Chrome anteriores. **No probado en el Motorola**: no cambia nada visible.
- **Fuera de alcance, anotado y sin arreglar:** (1) `tests/cifrado-browser.mjs` falló una vez en `main` sin estos cambios y pasó al repetirla: es inestable. (2) `CONTINUAR-AQUI.md` dice «166 de 166 en Node»; hoy `delta.test.mjs` solo tiene 167 y entre los tres archivos de Node suman 187 antes de este PR.

## 17/11/2026 · Cadena #59 → #60 → #61 unida a `main` (Claude)

Se unió `main` (con el #62) en la rama del #61; los conflictos eran solo de documentación (se tomó la versión ordenada del #62 y se actualizó). Condición A5 cumplida: segunda revisión externa sin hallazgos graves sobre `4e7758d` y `c4cb29f`, CI en verde y candado universal del #61. `CONTINUAR-AQUI.md` reescrita; `docs/DECISIONES.md` suma A10 (contraseña de 8) y A11 (cifrar al restaurar audios sin protección). Nada probado en el Motorola.

## 17/11/2026 · PR #61 actualizado con las correcciones del #60 (Claude)

Paso 3 del plan. Se unió la rama del #60 (incluido `4e7758d`, el arreglo de «Quitar la protección») en la del #61. Conflictos solo en `CAMBIOS.md` y el CI: se conservaron ambos lados.

- **K2 rechaza copias formato 2 incompletas** (hallazgo de la revisión externa del 17/11): con las correcciones del #60, la verificación admite copias con exclusiones; K2 ahora las rechaza con el detalle de lo que falta, en el botón y en `k2RestoreLocked`. No se escribe nada.
- **Rama peligrosa eliminada:** el fragmento de tipo B (audio que estaba en claro) ya no se descifra y escribe; lanza un error. Por decisión de Ignacio (M12), en el futuro esos audios se cifrarán al restaurar.
- La prueba estática del #60 que prohibía usar el formato 2 fuera de su bloque ahora permite el uso de K2 (su bloque y su botón). Prueba nueva para lo anterior.
- Pruebas: Node (`delta`, `entrega2`, `p2-correcciones`) y Chrome (K2, candado K2, correcciones #60, biblioteca P2, cifrado, copia K1) en verde en laboratorio. **No probado en el Motorola.** K2 sigue experimental, solo en instalación vacía; el reemplazo no está programado.

## 17/11/2026 · Quitar la protección no deja texto en claro si falla a mitad de camino (Claude, rama del PR #60)

Hallazgo grave de una revisión externa de seguridad (IA de un amigo de Ignacio, solo lectura), verificado contra `37e28a0`. Al quitar la protección, `v.disable` escribía en claro cada registro y, si una escritura o la relectura fallaba (por ejemplo, almacenamiento lleno), cortaba sin borrar lo ya escrito: la protección seguía activa pero quedaba texto legible hasta el próximo desbloqueo.

- Ahora se guarda el valor previo de cada clave y, ante cualquier error, se deshace lo escrito antes de avisar. La protección sigue activa y no queda nada en claro.
- Prueba nueva en `tests/delta.test.mjs`: almacenamiento que falla en la segunda escritura; comprueba que no queda ninguna clave en claro ni el texto ficticio, y que después se puede quitar la protección normalmente. Falla sin el arreglo y pasa con él.
- No cambia nada más: ni formatos, ni claves, ni la interfaz. Probado en laboratorio (Node); **no probado en el Motorola**.

## 17/11/2026 · Correcciones del PR #60 a pedido del propietario (Claude, misma rama; sin merge)

Pedido de Ignacio con seis puntos. Base: `314843d` (cabeza del #60). No se tocaron #59, #61 ni `main`. Nada nuevo se conectó a la interfaz habitual ni se implementó K2.

- **1 · Quitar la protección:** la guarda contaba **todas** las fichas de audio; una ficha sin cifrar (ensayo P2) trababa quitar la protección sin motivo. Ahora `anStoredKinds()` separa cifrados y sin cifrar y `vault.disableGuard` cuenta solo los cifrados. Para no abrir un hueco, «sin cifrar» exige la marca `mode: claro` **y** ninguna clave (`anIsPlainMeta`); una ficha ambigua o dañada cuenta como cifrada.
- **2 · Panel de almacenamiento (Ajustes):** antes decía «N audio(s) cifrado(s)» incluyendo los sin cifrar y les ofrecía «Preparar nota» y «Borrar audio», que usan la clave de la protección. Ahora muestra las dos cantidades por separado («SIN CIFRAR (ensayo, no protegidos)»), lista los sin cifrar **sin botones** (también con la protección apagada) y marca los cortados como «a medio guardar». `anAudioHealth`, `e3Play`, `e3Recover` y `e3Remove` rechazan una ficha sin cifrar sin tocarla.
- **3 · La copia no se presenta como completa si falta algo:**
  - *Formato 1 (el que usa la app):* los audios sin cifrar no entran (el formato 1 solo lleva cifrados), pero antes se contaban como «dañados o a medio guardar». Ahora se cuentan aparte y el mensaje dice «Atención, la copia NO está completa: N audios guardados sin cifrar no entraron…». La copia de solo texto también lo avisa. **El formato 1, su lector y su archivo fijo no cambian.**
  - *Formato 2 (ensayo):* el inventario cifrado ahora trae `exclusiones` (cada audio que no entró, con su motivo: `a-medio-guardar`, `danado`, `cifrado-sin-clave`, `solo-texto`) y `biblioteca` (cuántos audios había). El lector devuelve `exclusiones`, `motivos` y `todoIncluido`, y `copia2Describe` nunca dice «completa» si falta un audio.
- **4 · Copias mezcladas:** se comprobó que el formato 2 verifica audios cifrados y sin cifrar en la misma copia, en ambos órdenes, con contraseña y con código de recuperación.
- **5 · Cortes, archivos incompletos, memoria e inventario:**
  - Cada audio entra **entero o nada** en la copia 2 (los bloques se arman aparte y se agregan juntos); antes un fallo a mitad podía dejar medio audio.
  - El fragmento sin cifrar se vuelve a comprobar en el momento de cifrarlo: si cambió, el audio queda excluido como dañado.
  - Los fragmentos ya cifrados para la copia se guardan como `Blob` y no como memoria de JavaScript (audios largos).
  - El escritor no arma la copia si lo incluido más lo excluido no suma lo que había en la biblioteca; después de cerrarla no acepta nada más.
  - Nuevo recorrido de laboratorio `copia2Audios` (bloque `COPIA2-USO`, solo lee, sin botón).
- **Pruebas nuevas:** `tests/p2-correcciones.test.mjs` (Node, 9 pruebas: inventario, exclusiones, copia mezclada, corte en cada límite de bloque, byte cambiado en cada bloque, escritor todo-o-nada, formato 1 intacto) y `tests/p2-correcciones-browser.mjs` (Chrome: corte real de escritura simulado, guarda, panel, copia 1 con avisos, copia 2 mezclada, fragmento alterado, protección quitada con audios sin cifrar presentes). Ajustada una prueba de `delta.test.mjs` que fijaba el texto viejo de la guarda. Se comprobó que en el código anterior los tres problemas se reproducen.
- **Resultados:** Node 166 + 10 + 9 en verde; las 13 suites de Chrome en verde. `e2-correcciones-browser` falló una vez en local sin mensaje y pasó en las tres corridas siguientes (también con el código anterior): se anota como posible inestabilidad, a mirar en el CI.
- **Decisiones del propietario recibidas con este pedido:** los datos guardados hoy son de prueba y pueden descartarse (no hacen falta migraciones complejas); sin pruebas en el Motorola hasta una etapa más avanzada; las pruebas de Node y Chrome siguen siendo obligatorias; **no autoriza borrar datos automáticamente ni desproteger información futura**. Este cambio no borra ni migra nada.
**K2 (PR #61, borrador):** el bloqueo universal sin bóveda ya está programado y probado en laboratorio (ver la entrada de correcciones). Falta revisión cruzada de esas correcciones y el CI de GitHub antes de unir.

## 17/11/2026 · K2: correcciones de la revisión cruzada — candado universal (Claude, PR #61)

- **Candado universal (bloqueante 1):** cada pestaña pide el candado al arrancar, **con o sin bóveda**, antes de cargar o escribir. La segunda pestaña queda en solo lectura: no guarda notas, borrador, ajustes, diccionario ni audios (el almacén lanza `OtraPestana`, `saveCfg`/`saveDraft` devuelven `false`) y muestra el aviso. Sin bóveda, un navegador **sin** Web Locks sigue guardando como antes (no puede saber de otras pestañas); ahí K2 ya se niega a restaurar.
- **Limpieza tras el candado (bloqueante 2):** `k2RestoreEmpty` toma el candado **antes** de limpiar un lote viejo; `k2Rollback` y la limpieza de arranque se niegan a borrar sin candado. Durante la restauración, la propia pestaña tampoco escribe.
- **Confirmación clara (riesgo 3):** si algo falla después de escribir la cabecera completa, la restauración se informa como hecha; una cabecera distinta se informa como «estado dudoso» sin borrar nada.
- **Propiedad del lote (riesgo 4):** lote formato 2 con «firma» por audio (fecha de creación y tamaño); IDs repetidos, registros fuera de la lista conocida, versión vieja o firma distinta ⇒ **no se borra nada**.
- **Arreglo adicional:** el borrador vacío que la app guarda sola al abrirse ya no hace que una instalación nueva cuente como «ocupada», y no queda en claro junto a la bóveda restaurada.
- **Pruebas:** nueva `tests/k2-candado-browser.mjs` en el CI (dos pestañas reales escribiendo durante una restauración, limpieza solo con candado, cinco lotes alterados intactos, cuota simulada en 7 fases de IndexedDB/localStorage, relectura fallida de la cabecera y dos cortes reales por recarga). Actualizadas `k2-browser.mjs` (lote formato 2) y `audio-nota-browser.mjs` (la app ya tiene el candado al arrancar). Las 15 suites y los tests Node pasaron en laboratorio. **Motorola: sin probar.** Sigue en borrador, sin unir.

## 17/11/2026 · K2: ensayo de restauración solo en perfil vacío (ChatGPT, PR #61)

- **Código en rama, no publicado:** PR #61 apilado sobre #60 → #59. Se agregó lector/restaurador de copias formato 1/2 con verificación íntegra previa, comprobación de instalación realmente vacía, exclusión de segunda pestaña, lote recuperable y cabecera de bóveda escrita al final. Interfaz rotulada «experimental». **No mezcla, reemplaza, migra ni borra datos existentes.**
- **Seguridad:** se bloqueó específicamente restaurar copias formato 2 con audio originalmente en claro, para impedir que una bóveda aparentemente protegida conserve ese audio sin cifrar. La copia formato 2 aún no cubre audios heredados en `notasvoz-gamma-audio`; el formato 1 tampoco equivale a respaldo total en todos los modos. El nuevo lector no altera K1 ni formatos de copia. Los audios de prueba son ficticios.
- **Pruebas:** CI añade `tests/k2-browser.mjs` para copia sintética, contraseña incorrecta, copia truncada, perfil ocupado, limpieza de lote y recarga. **No marcar resultado verde hasta que GitHub Actions lo confirme**. Sin prueba física en Motorola.
- **Pendiente:** revisión independiente, matriz de cuotas/cortes, compatibilidad formato 1, manejo de audios no incluidos y reemplazo seguro con doble confirmación y autorización aparte. Informe: `docs/K2-RESTAURACION-VACIA-2026-11-17.md`.

## 17/11/2026 · Revisión cruzada del PR #60 — transición entre modalidades (ChatGPT)

- Sincronizado el PR #60 con el #59 corregido mediante un **commit de fusión en la rama apilada**; sin squash, sin force-push y sin fusionar `main`.
- La revisión E2 al abrir la bóveda excluye audios experimentales identificados como `mode: claro`: no los descarta ni los etiqueta falsamente como cifrado dañado. Prueba de Chrome con ficha completa e interrumpida tras activar la protección.
- Continúan bloqueadas la activación de P2 para usuarios, la copia integral restaurable, la exclusión entre pestañas sin bóveda y toda migración o eliminación de datos.

## 17/11/2026 · Biblioteca P2 y respaldo formato 2 en laboratorio (ChatGPT, rama dependiente del PR #59)

- Por aprobación del propietario, se prepara la modalidad de audio sin bóveda en la misma IndexedDB, distinguida explícitamente por `mode: claro`, con hash SHA-256 y verificación de fragmentos; **todavía sin conectarla a la grabación de uso real**.
- Se incorpora un escritor y lector de **ensayo** de copias `.dictanota` formato 2, con el audio inicialmente en claro cifrado durante la exportación; el formato 1 y su lector se mantienen intactos. No hay restauración todavía ni copia completa prometida en la interfaz.
- Se agrega prueba de Chrome y CI para el escenario con audio sintético e integridad/tamper. Decisiones, pendientes y límites en `docs/ENTREGA2-P2-RESPALDO-V2-PREPARACION.md`.
- **Motorola: no se probará a pedido del propietario**; los resultados de laboratorio no se atribuirán al teléfono. Sin K2/T/AO, cambios a bases históricas, migraciones, borrados ni fusión automática.

## 17/11/2026 · Segunda revisión del PR #59 (ChatGPT; sin merge)

- Ante falta de espacio, el autobloqueo ahora **oculta la interfaz y exige contraseña**, sin recargar ni perder el borrador. La bóveda permanece abierta **en RAM**: es un escudo de privacidad, no bloqueo criptográfico; queda registrado ese límite.
- Guardar nota con **texto más audio** también verifica íntegramente los fragmentos. Si están dañados no confirma el vínculo ni pierde el texto.
- Se aclara cuándo se puede reproducir un audio huérfano recuperado.
- Nuevas pruebas Node/Chrome de escudo, contraseña correcta/errónea, conservación del editor y audio dañado con transcripción. CI y auditoría posterior deben comprobarse en el SHA final; Motorola pendiente.
- Ninguna fusión, migración, K2, T, AO ni cambio de formato; los PR #60 y #61 siguen separados.

## 17/11/2026 · Entrega 2, revisión independiente y correcciones de P1/P4 (ChatGPT, PR #59 sin fusionar)

- **Autoguardado:** sin bóveda, el borrador se escribe sincrónicamente al editar y al ocultar/cerrar la página; con bóveda se mantiene la confirmación cifrada y se evita pisar versiones nuevas desde la cola. El navegador no garantiza completar un cifrado ante cierre forzado.
- **Bloqueo:** si el borrador no se confirma, bloquear o activar protección no borra ni recarga el editor; informa el problema.
- **Recuperación:** si un borrador viejo coincide con la nota ya confirmada por texto, audio y origen/identificador de edición, no se restaura como duplicado; se intenta limpiar, sin descartar borradores genuinamente distintos.
- **Pruebas agregadas:** `tests/entrega2.test.mjs` cubre cierre sin bóveda, cola pendiente, fallo de bloqueo, conciliación y preservación de cambios diferentes. Registro de detalles y limitaciones en `docs/ENTREGA2-ARQUITECTURA-B-IMPLEMENTACION-2026-11-17.md`.
- **Alcance:** sin cambios de formato de copia, K2/T/AO, migraciones ni borrados. Código guardado en la rama del PR #59; ver CI de esa rama. **Sin prueba física nueva en el Motorola ni merge a `main`**.
## 17/11/2026 · Orden de la documentación (Claude Sonnet 5.5, solo documentación)

- **Qué:** se reorganizó la documentación para que cada documento tenga un solo rol y las dos IA trabajen sobre lo mismo. Rama `docs/ordenar-documentacion-2026-11-17`, base `main` = `7171650`. **No se tocó `index.html`, ni pruebas, ni datos, ni formatos.**
- **Nuevo:** `docs/INDICE.md` (qué es cada documento y cuál manda), `docs/DECISIONES.md` (registro único de decisiones de Ignacio, con la fuente de cada una), `docs/PEDIDOS.md` (pedidos para copiar y pegar, iguales para cualquier IA) y `docs/historial/` (copia textual de los carteles de estado anteriores de `CONTINUAR-AQUI.md`, sin perder nada).
- **Reescrito:** `CONTINUAR-AQUI.md` (una página de estado, con los PR abiertos y su dueño). **Ajustado:** el tablero `docs/PLAN-ALMACENAMIENTO-CIFRADO.md` (columna «Dueño», cruce con la Entrega 2 de los PR #58 a #61, pedidos y decisiones ahora enlazados en vez de copiados), `AGENTS.md` y `CLAUDE.md` (solo los carteles de estado: pasan a enlaces; ninguna regla técnica se quitó). **Marcados como históricos:** `INFORME-CONTINUIDAD`, `TRASPASO-A-CHATGPT` y los dos `PROMPT-*.txt`.
- **Hallazgos de la primera pasada (después respondidos, ver abajo):** (1) el PR #61 implementaba un ensayo de K2 y el tablero decía que K2 se consulta siempre; no había permiso registrado. (2) Las decisiones A1 a A3 solo constaban en descripciones de PR sin unir. (3) `main` sigue sin protección (verificado por la API el 17/11): **sigue pendiente de Ignacio**.
- **Respuestas de Ignacio (17/11, tarde), ya anotadas en `docs/DECISIONES.md` y en `CONTINUAR-AQUI.md`:** K2 autorizado, ensayo y reemplazo, y se une sin consultar de nuevo con revisión cruzada sin hallazgos graves y CI en verde (A4, A5); arquitectura B, audio sin protección con aviso y formato 2 confirmados (A1 a A3); «Conservar audio» activado de entrada solo en instalaciones nuevas, con aviso (A6); se puede retirar la compatibilidad con el audio suelto viejo y borrar sus datos de prueba (A7, A8); T en la misma base que los audios, con su permiso explícito (A9); prioridad de mejoras: elegir cuaderno desde Dictar y rediseño de Ajustes con maqueta (U16). Quedan sin decidir: publicación del formato 2 (Q1), reglas de AO (Q2) y pendientes menores (Q3). **Nota:** el reemplazo de datos de K2 todavía no está programado y el bloqueante de #61 sigue abierto.
- **Conflictos esperables:** los PR #58 y #61 también tocan `AGENTS.md` y `CONTINUAR-AQUI.md`; #59, #60 y #61, `CAMBIOS.md`; #61, el tablero. Son líneas sueltas: se resuelven pasando sus dos líneas a las páginas nuevas.
- **Pendiente a propósito:** separar en `AGENTS.md` las reglas permanentes de las secciones fechadas del 15/11, y actualizar textos viejos de `README.md`; mover documentos históricos (hoy solo marcados) para no chocar con el PR #52.
- **Tres niveles:** código guardado: **ninguno** (solo documentos) · pruebas técnicas: enlaces entre documentos verificados y `node --test` sin cambios · Motorola: no aplica.

## 17/11/2026 · Nombre visible: DictaVoz (decisión del usuario)

- **Decisión de Ignacio (17/11, 9:27):** el nombre de la aplicación pasa a **DictaVoz** porque ya existe otra app «Dictanota». **Solo cambia lo que se ve dentro de la app**; el repositorio (`ignabidon/notas-voz`) y la dirección del sitio **no cambian**.
- **Cambió:** título de la pestaña del navegador y encabezado, avisos y mensajes (otra pestaña, bloqueo, copia, huella), nombre de la llave de acceso nueva, nombre del archivo de copia (`DictaVoz-copia-AAAA-MM-DD.dictanota`), y los textos de `README.md`, `AGENTS.md` y `CLAUDE.md`. Pruebas ajustadas a los textos nuevos (`delta.test`, `copia-browser`, `e2-correcciones-browser`).
- **No cambió, a propósito:** claves internas (`notasvoz.dictanota.v2`, `notasvoz-dictanota-audio`), candado `dictanota-una-pestana`, textos fijos del cifrado (`dictanota|v1`, etc.: cambiarlos dejaría ilegibles los datos ya guardados), la **extensión `.dictanota`** de las copias, las claves históricas «gamma» y los documentos históricos (siguen diciendo «DictaNota»).
- **Llave de acceso:** una huella registrada antes del cambio sigue apareciendo como «DictaNota» en el administrador de contraseñas; funciona igual.
- **Pruebas técnicas:** 166/166 Node y diez suites de Chrome en verde. **Motorola: sin probar** (se verá el nuevo nombre al abrir la página).
- **Nota del usuario:** tiene limitaciones técnicas para probar en el Motorola; se evitan las pruebas que se puedan hacer en laboratorio (registrado en `docs/PRUEBA-CORTA-MOTOROLA.md`).
- **Corrección de un fallo real del reproductor (descubierta por el CI de este PR):** si se tocaba «Pausar» mientras el navegador todavía estaba arrancando la reproducción, el navegador cancelaba esa orden (`AbortError`) y la app lo trataba como «No se pudo reproducir el audio» y soltaba el audio. Ahora un `AbortError` al reproducir o reanudar se toma como una pausa normal (2 líneas en `e3Part` y `e3Play`). En un celular lento esto se podía ver como un mensaje de error falso; la prueba `e3-browser` lo mostraba solo con la máquina cargada (fallaba 8 de 12 en paralelo, también en `main`; con la corrección, 12 de 12).

## 17/11/2026 · Reporte de la prueba en el Motorola y pendientes anotados (Claude, solo documentación)

- **Qué probó Ignacio en el Motorola (Brave), con E3 ya unido:** grabar y guardar, reproducir desde la nota, editar y cancelar la edición, protección con contraseña, quitar el audio de una nota, y el panel «Espacio y audios guardados». Sin probar todavía: copia cifrada (pasos 5 y 6), adelantar/pausar (11), «Ver nota» (14) y el Sí/No de «almacenamiento persistente» (12). Estado paso por paso en `docs/PRUEBA-CORTA-MOTOROLA.md`. **Motorola: probado solo lo que ese archivo marca ✔; el resto sigue sin probar.**
- **Observaciones del usuario, anotadas como pendientes (no son defectos de seguridad):** (1) el aviso «abierta en otra pestaña» al guardar es correcto, pero no dice cuál cerrar; (2) **no hay deshacer para una edición de nota ya guardada** (confirmado en el código: «Deshacer» existe solo para mover, borrar el borrador y anonimizar); (3) **Ajustes tiene demasiadas opciones y texto**: pendiente de rediseño, con maqueta y aprobación antes de programar; (4) recargar con un audio sonando bloquea y pide la contraseña: es lo esperado.
- **Nombre de la aplicación (pendiente, sin decidir):** el usuario informa que ya existe otra app «Dictanota» (no verificado) y que, con ChatGPT, pensó renombrar a **DictaVoz**. En `main` no hay documento que lo decida; solo la visión de ChatGPT sin unir (PR #52), que dice **no cambiar aún** nombre, repositorio, rutas ni claves. Inventario para cuando se decida: ~30 usos de «DictaNota» en `index.html` (título, encabezado, textos) y en README/docs; **no renombrar** las claves `notasvoz.dictanota.v2` y `notasvoz-dictanota-audio` ni el candado `dictanota-una-pestana` (guardan datos); revisar la extensión **`.dictanota`** de la copia cifrada (las copias ya hechas deben seguir abriéndose) y la URL del sitio si se renombra el repositorio.
- **Documentos tocados:** `docs/PRUEBA-CORTA-MOTOROLA.md` (reescrita con estado y pendientes), `docs/PRUEBA-MOTOROLA-Y-PENDIENTES-USUARIO-2026-11-16.md` (bloque de actualización arriba y dos frases desactualizadas), `CONTINUAR-AQUI.md`. **No se cambió código ni pruebas.** `GUIA-DEL-PROPIETARIO.md` sigue solo en el PR #49 (sin unir) y no se actualizó.

## 17/11/2026 · Paso E3: reproductor por nota y panel de espacio — cierre (ChatGPT programó; Claude completó y verificó)

- **Quién hizo qué:** el código de E3 es de ChatGPT (commit `d0f6b45`, PR #54, 17/11 07:26). Quedó **sin cerrar**: su prueba `tests/e3-browser.mjs` fallaba y no se había actualizado ningún documento ni el tablero. Claude (17/11, a pedido del usuario) la dejó en verde y completó el registro. **No se cambió el código de la app**, salvo un comentario desactualizado de `index.html`.
- **Qué hace E3 (sin cambios respecto de #54):** en cada nota con audio cifrado, un reproductor a pedido (Reproducir, Pausar, Reanudar y barra para adelantar); el audio se descifra por partes y solo hay una parte con URL a la vez; se libera al terminar, a los 60 s de pausa, al cambiar de cuaderno o de pestaña, al bloquear y al salir de la página. En el menú «⋯»: «Quitar audio de esta nota» (el texto se conserva). En Ajustes, «Espacio y audios guardados»: cantidad y tamaño de audios, espacio libre estimado, estado de protección contra limpieza automática (se pide solo una vez por apertura de la página, al guardar un audio, y también a pedido), orden por tamaño o fecha, **audios sin nota** (Crear nota / Borrar, D8) y aviso del **audio suelto anterior** con Descargar y Borrar (D7). La reproducción **no frena el autobloqueo** (D11).
- **Qué se corrigió en la prueba `e3-browser`** (la app no cambió): (1) la nota «de dos partes» se armaba con «Empezar de cero» tildado, así que el segundo archivo reemplazaba al primero y quedaba una sola parte; el «adelantar a la segunda parte» terminaba el audio. Ahora se destilda antes de guardar. (2) Tres `await` sueltos dentro de una expresión de Chrome daban `SyntaxError` y la prueba nunca llegaba a sus últimos tramos (audio sin nota, error de escritura, audio ausente, autobloqueo). (3) Una carrera al abrir Ajustes: la app y la prueba pedían actualizar el panel a la vez y una de las dos dejaba la lista vacía; ahora la prueba espera el resultado. Ninguna comprobación se quitó ni se saltea.
- **Pruebas técnicas (local, Chrome 153 headless):** 166/166 Node; las diez suites de Chrome en verde (`browser`, `cifrado`, `audio-nota`, `audio-cifrado`, `e2-correcciones`, `e2-revision2`, `copia`, `notas`, `editor`, `e3`); `e3-browser` seis corridas seguidas sin fallar. **Audio real solo con un tono WAV sintético en Chrome de laboratorio.**
- **Documentos al día:** `AGENTS.md` (frase del audio), `README.md`, `SEGURIDAD.md`, tablero `docs/PLAN-ALMACENAMIENTO-CIFRADO.md`, `CONTINUAR-AQUI.md`, `CLAUDE.md` y `docs/PRUEBA-CORTA-MOTOROLA.md` (pasos 8 a 12).
- **Tres niveles:** código guardado en la rama y en su PR · pruebas técnicas aprobadas en local (CI del PR por confirmar) · **Motorola: sin probar** (reproducción real en Brave/Android, adelantar en archivos largos y `navigator.storage.persist()`). Vuelta atrás: total (interfaz). Próximo paso: **K2** (con consulta previa al usuario).

## 17/11/2026 · B3: menú de las notas y lista de cuadernos más clara (Claude)

- **Autorización:** forma de trabajo acordada el 17/11. El usuario había aprobado el 16/11 el menú «⋯» y la vista previa, dejando el detalle a criterio. **Responsable:** Claude. Rama `claude/relaxed-lovelace-37wih1`, base `main` = `3a199b6` (K1 unido).
- **Notas:** en cada nota quedan a la vista **Copiar** y **Editar**; **Mover a otro cuaderno** y **Borrar esta nota** pasan al menú **«⋯»**. Antes eran cuatro botones en dos filas. El menú se abre dentro de la nota, uno solo a la vez, y se cierra al elegir, al tocar afuera o con Escape. Botones de 48 px o más, con nombre accesible.
- **Lista de cuadernos:** la segunda línea dice la cantidad de notas y una fecha corta («Hoy 12:44», «Ayer 09:10» o el día), sin repetir la fecha del título. Arriba, una línea con el comienzo de la última nota para distinguir cuadernos del mismo día.
- **Ajuste nuevo:** «Mostrar vista previa en la lista» (Ajustes → Lectura y comodidad), activado por defecto, con el aviso de que puede dejar a la vista nombres reales. Es un campo opcional (`listPreview`) de la configuración existente.
- **No cambia:** datos guardados, sellos de fecha, claves, cifrado, audio, Whisper ni CSP. Todo se muestra con `textContent`. Las funciones de mover, borrar, copiar y editar son las mismas.
- **Pruebas técnicas:** 166/166 Node (2 nuevas: fecha corta y vista previa; estructura de la burbuja y del ajuste). `notas-browser` amplía el recorrido: menú abierto y cerrado, foco, Escape, tocar afuera, un solo menú a la vez, mover desde el menú, lista con fecha corta, vista previa de una línea sin desborde, texto hostil mostrado como texto, y el ajuste apagado que se conserva al recargar. `editor-browser` actualizada (Borrar conserva el rojo, ahora en el menú). Capturas revisadas a 320 y 360 px.
- **Arreglo de la prueba, no de la app:** `notas-browser` podía terminar con error después de pasar todas sus comprobaciones, al borrar la carpeta temporal de Chrome mientras el navegador todavía la soltaba. Ahora ese borrado final tolera la falla, como ya hacían las otras suites. Ninguna comprobación se quitó ni se saltea.
- **Tres niveles:** código guardado en la rama y en su PR · pruebas técnicas aprobadas en local (CI en el PR) · **Motorola: sin probar**. Con esto la Etapa B queda completa y **E3 ya no espera nada**.

## 17/11/2026 · Paso K1: copia cifrada, crear y verificar (Claude)

- **Autorización:** forma de trabajo acordada con el usuario el 17/11 (plan contado al empezar; unión con el CI en verde). **Responsable:** Claude. Rama `claude/relaxed-lovelace-37wih1`, base `main` = `b5f611b` (E2 unido). Alcance: solo el paso K1 del tablero.
- **Para quien usa DictaNota:** en Ajustes → Privacidad y almacenamiento hay una sección nueva, **Copia cifrada**, con dos botones. **Crear copia cifrada** descarga un archivo `DictaNota-copia-AAAA-MM-DD.dictanota` con cuadernos, notas, personas, diccionario y ajustes. **Verificar una copia** deja elegir un archivo y dice si está entero y si la contraseña lo abre. **No restaura todavía** (K2) y la pantalla lo dice.
- **Con la protección activada:** pide la contraseña (para confirmar que se la recuerda), deja elegir «Completa» (con los audios cifrados por nota) o «Solo texto», y la copia se abre con la contraseña o el código de recuperación. **Con la protección apagada:** la copia igual sale cifrada, con una contraseña elegida solo para ese archivo, y lleva solo texto.
- **Seguridad de los datos guardados:** crear y verificar **solo leen**. Los registros y los fragmentos de audio se copian tal como están, sin recifrar. Antes de descargarla, la app comprueba la copia entera. Un audio dañado o a medio guardar no entra y se avisa.
- **Formato 1** (diseño 2.6, con sus precisiones): marca, cabecera en claro sin la huella, bloques R/C/M/A y un bloque final cifrado con los totales y una **huella encadenada** de todo el archivo (agregado al diseño: autentica también nombres, orden y fichas). Se rechaza entera una copia cortada, alterada, con datos de más o de un formato más nuevo.
- **Código:** bloques `COPIA` (formato y comprobación) y `COPIA-USO` (botones) en `index.html`; `vault.rawRecords()` (solo lectura) en el núcleo de la protección; crear o comprobar una copia cuenta como uso para el autobloqueo y frena el inicio de una grabación. Sin claves nuevas, sin orígenes nuevos, CSP idéntica.
- **Pruebas técnicas (datos inventados):** `node --test tests/delta.test.mjs` **164/164** (5 nuevas: armar y comprobar con contraseña y con código; corte en cada posición; un byte cambiado en cualquier lugar; formato más nuevo, bloques fuera de orden y copias mezcladas; archivo de ejemplo fijo; y una estática que exige que estos bloques no escriban ni borren). Nueva `tests/copia-browser.mjs` en Chrome a 360 px por los botones reales: sin y con protección, completa y solo texto, contraseña equivocada, código de recuperación, cancelar, archivo elegido con el selector real, archivos malos, audio dañado, cambio de contraseña posterior, y comparación de **todo** lo guardado antes y después. Las otras ocho suites de Chrome siguen pasando. Archivo de ejemplo fijo: `tests/copia-formato-1.dictanota`.
- **Lista corta para el celular:** nuevo `docs/PRUEBA-CORTA-MOTOROLA.md` (10 minutos, en lenguaje simple), con lo que solo se puede ver en el teléfono después de E2 y K1. No frena el avance.
- **Sin probar:** en Brave/Android, que la descarga conserve la extensión `.dictanota`, que el selector de archivos deje elegirla, y copias de cientos de MB (si fallara, plan B del diseño: volúmenes).
- **Tres niveles:** código guardado en la rama y en su PR · pruebas técnicas aprobadas en local (CI en el PR) · **Motorola: sin probar**. Vuelta atrás: total (solo agrega). Próximo paso: **B3**, después **E3**.

## 17/11/2026 · E2 integrado sobre el `main` actual y revisión independiente (Claude, PR #50)

- **Autorización:** el usuario pidió revisar el estado y avanzar con los pasos pendientes sin que lo frenen las pruebas que no puede hacer en el celular. Eligió empezar por terminar E2 y autorizó unir a `main` con el CI en verde, salvo K2 y T (forma de trabajo en `AGENTS.md`). **Responsable:** Claude. Rama `claude/relaxed-lovelace-37wih1`, base `main` = `2153dee`.
- **Qué es:** el PR #47 (E2, `71bb17f`) había quedado desactualizado frente al PR #48 y chocaba en `index.html` (dos lugares) y en `CAMBIOS.md`. Se unió su rama con el `main` actual, con sus cuatro commits intactos, y se resolvieron los cruces a mano conservando ambos trabajos. Para qué sirve E2 y sus límites: ver las tres entradas siguientes.
- **Cruces resueltos:** el estado del editor ampliado del #48 (`convEditorCollapsed`) convive con el audio pendiente de E2 (`convAudioId`, `convCtx`). Tocar «Editar» sobre la nota que ya se edita vuelve a ampliar el editor minimizado. Ajuste menor: al bloquear también se suelta la clave de audios.
- **Revisión independiente del código combinado, sin hallazgos graves:** derivación y uso de las claves de audio; clave de datos en bruto puesta en cero en todas las rutas; candado de una pestaña antes de cualquier escritura protegida y con falla cerrada; Guardar confirma recién cuando el cifrado llegó al almacenamiento; ninguna ruta del editor nuevo cambia de nota sin reiniciar el audio pendiente; sin orígenes nuevos ni cambios de CSP.
- **Límites que siguen (ya documentados en el #47):** con la protección activa, el audio nuevo queda guardado pero no se puede escuchar ni descargar hasta E3; mientras haya audios cifrados no se puede quitar la protección (se resuelve en AO), y un audio «sin nota» no se puede borrar hasta E3. **A mirar en el Motorola:** si DictaNota queda abierta y desbloqueada en una pestaña y se abre otra (por ejemplo desde un acceso directo), la nueva queda en solo lectura hasta cerrar la primera; es seguro, pero puede resultar molesto.
- **Pruebas técnicas (datos y audios inventados):** 159/159 Node; Chrome: `browser`, `cifrado-browser`, `audio-nota-browser`, `audio-cifrado-browser`, `e2-correcciones-browser`, `e2-revision2-browser`, `notas-browser` y `editor-browser`, todas sobre el código combinado; el CI ahora corre las ocho.
- **Prueba extra de laboratorio (fuera del CI):** recorrido por la interfaz real a 360 px con el micrófono sintético de Chrome y `MediaRecorder` real: activar la protección, «Conservar audio», grabar 13 s con pausa y reanudación, detener, escribir, Guardar, recargar y desbloquear. Resultado: tres fragmentos cifrados, nada en claro en la base, el audio descifrado es WebM válido y se decodifica completo (12,96 s), la nota queda con su audio y tras recargar el audio es idéntico (misma huella SHA-256). **No se ejecutó Whisper** en ese entorno (sin acceso de red a los modelos): el texto se escribió a mano. Capturas a 360 px de Dictar, editor, nota guardada y aviso de «otra pestaña»: sin desbordes ni errores de consola.
- **Documentación puesta al día:** `CLAUDE.md`, `AGENTS.md`, `CONTINUAR-AQUI.md` y el tablero decían que E1 o el #48 seguían sin unir. El tablero registra además que B1 y B2 se hicieron dentro del #48 y que falta B3.
- **Tres niveles:** código guardado en la rama y en el PR #50 · pruebas técnicas aprobadas en local (CI en el PR) · **Motorola: sin probar**. Próximo paso: **K1**.

## 16/11/2026 · Correcciones móviles de Clínica editorial (ChatGPT, PR #48)

- **Autorización:** «continua con esas correcciones entonces», después del informe independiente. **Responsable:** ChatGPT (Codex). Base main `aab2b903`; revisión del PR #48 en `b6ae882`. Rama local `correcciones-clinica-editorial-2026-11-16`, entrega en la rama existente de #48 `visual-clinica-editorial-chatgpt-2026-11-16`. Sin autorización para unir main ni publicar Pages.
- **Lectura y edición:** el cuaderno conserva un acceso compacto cuando no se escribe. El mismo `#text` se amplía al escribir, editar, recuperar el borrador o recibir una transcripción. Volver minimiza sin descartar ni cambiar destino; Guardar conserva fecha/sello y Cancelar conserva el texto guardado. Herramientas se mueve dentro del editor, sin duplicar controles. Guardar se oculta si no hay texto. Se mantienen las advertencias de guardado durante captura/procesamiento.
- **Captura:** resumen de Whisper con Detalles ampliables, sin un segundo estado/Worker/timer. Micrófono completo en las pruebas de 320/360/412, Normal/Grande; en pantallas cortas se reducen espacios y títulos secundarios. Las indicaciones distinguen grabación, pausa, transcripción y reposo. Grabar inferior en Dictar solo cuando el círculo sale de la vista; en Cuadernos es secundario.
- **Controles:** Borrar recupera rojo y Reanudar evita blanco sobre blanco en la tarjeta, bordes de campos/acciones con contraste ≥3:1 en la muestra medida, acciones de notas con texto ajustable y alto ≥48 px, indicador superior en pestaña activa y filas de encabezado que admiten salto. Deshabilitados con colores explícitos, sin opacidad reducida.
- **Alcance:** ahora CSS, HTML y JS de presentación; la entrada anterior describe únicamente la versión inicial del PR. Sin cambios en CSP, orígenes, dependencias, formatos, claves, cifrado, lógica de audio, Whisper o Worker. E2/#47 (`71bb17f`) y el feedback documental #49 (`19770c7`) permanecen separados. No se implementan B3, E3, selector de destino ni cambios de voseo.
- **Verificaciones:** 139/139 Node; suites `browser`, `cifrado-browser`, `audio-nota-browser`, `notas-browser` y nueva `editor-browser` (resultados finales y capturas en `docs/CORRECCIONES-PR48-2026-11-16.md`). La prueba de notas comprueba el tamaño visible del editor en vez de imponer `display:block`. La suite nueva prueba lectura, teclado 320/360/412 Normal/Grande, controles alcanzables, herramientas/corrección, Volver, destino, sello, cancelar, recuperación de borrador, llegada de transcripción, pausa/reanudación, navegación durante captura, prioridad del control nativo simulado, detalles y contraste.
- **Diferencia entre navegadores detectada por CI:** a 320 px el Chrome del runner exigió más espacio que el Chromium local; en pantallas cortas y estrechas el reloj pasa al lado del micrófono y se reducen márgenes secundarios, conservando la prueba que exige el círculo completo y verificando un reloj de más de una hora sin desborde.
- **Tres niveles:** código en rama/PR, verificación técnica con datos ficticios, **Motorola sin probar**. Micrófono, teclado e inferencia reales no se validan con estas simulaciones. El propietario ya informó que un audio descargado se escucha bien (#49); eso no valida automáticamente estas correcciones.

## 16/11/2026 · Rediseño visual «Clínica editorial» (ChatGPT, PR independiente)

- **Responsable:** ChatGPT. Rama: `visual-clinica-editorial-chatgpt-2026-11-16`. Base: `main` = `aab2b9035615e97389b2329b59a3f106b419ffa6`. **Alcance exclusivamente visual:** 37 líneas nuevas de CSS, añadidas al final del bloque de estilos de `index.html`, sin reordenar reglas existentes ni introducir dependencias.
- **Dictar:** micrófono de mayor jerarquía con azul petróleo en reposo, coral `#B53D3B` durante la grabación y ámbar `#B78228` al pausar; cronómetro con cifras tabulares grandes; acciones secundarias y accesos a audio con menor peso visual. «Conservar audio» sigue arriba y funciona exactamente igual.
- **Cuadernos:** sin modificar la conversación, se refinan superficies de la lista y burbujas, tipografía, metadatos y separación visual de botones. Ninguna vista previa, menú nuevo, reproductor u onda de audio; E3 y B3 siguen pendientes.
- **Barra inferior:** las cuatro pestañas conservan orden, enlaces, tamaños táctiles y lógica; la activa destaca por relleno, borde interno, grosor del ícono y texto, no solo por color. Los controles fijos de grabación/edición y el tratamiento del teclado permanecen iguales.
- **Fuera de alcance y sin cambios:** JS, audio, Whisper, Workers, captura, E2/K1/B3/E3, almacenamientos, cifrado, datos, claves históricas, políticas CSP, navegación, guardado, Anonimizar y Ajustes (salvo estilo compartido de pestaña activa). Nada unido a `main`.
- **Revisión estática:** el cambio es aditivo dentro de `<style>`; el contenido previo de `index.html` queda idéntico al retirar ese bloque de CSS. Contraste de los pares esenciales calculado: blanco/azul petróleo 7,8:1; blanco/coral 5,68:1; tinta oscura/ámbar 4,66:1. Las etiquetas «Grabando»/«Pausar»/«Reanudar» existentes continúan diferenciando estados. No se agregaron transiciones ni animaciones.
- **Pruebas automáticas comprobadas:** GitHub Actions, ejecución [43986670462](https://github.com/ignabidon/notas-voz/actions/runs/43986670462): **139/139 en Node**, suites Chrome `browser.mjs`, `cifrado-browser.mjs`, `audio-nota-browser.mjs`, `notas-browser.mjs` aprobadas. Chrome simuló 320/360/412 px, vista de las cuatro pantallas, captura y pausa, texto grande, movimiento reducido y teclado. Se trata de simulación de navegador, no prueba física del Motorola.
- **Capturas comparativas reales (Chrome CI, 412×850, datos ficticios):** [Dictar antes](docs/capturas/clinica-editorial-antes-dictar-412.jpg) y [después](docs/capturas/clinica-editorial-despues-dictar-412.jpg); [Cuadernos antes](docs/capturas/clinica-editorial-antes-cuadernos-412.jpg) y [después](docs/capturas/clinica-editorial-despues-cuadernos-412.jpg). El sello horario difiere entre ejecuciones por el momento de la prueba; no se cambió el tratamiento de fechas.
- **Pruebas de inspección visual pendientes antes de aprobar el PR:** el CI cubrió funcionalidad y geometría a 320/360/412 px y las capturas de 412 px ya están adjuntas; todavía falta una revisión visual humana completa a 320/360 px, especialmente grabación activa, pausa, procesamiento, cuaderno abierto, editor y teclado emergente. La validación con micrófono y teclado físicos en el Motorola G56 5G sigue pendiente.
- **Concurrencia:** al comenzar, PR #47 (E2) estaba abierto en `71bb17f`; E1 ya estaba en `main`, y K1/B3/E3 no tenían PR abierto. El PR visual no modifica el trabajo de almacenamiento y debe volver a cotejarse con `main` y las ramas activas antes de cualquier integración.

## 16/11/2026 · Paso E2: segunda revisión (PR #47, sobre `745f36b`)

- **Responsable:** Claude (Sonnet 5.5), con permiso explícito del usuario para corregir dentro de E2 (misma rama `e2-cifrado-audios-por-nota`, sin squash, sin force-push, sin unir). La revisión se hizo sobre `745f36b`; se comprobó que ese seguía siendo el último commit remoto antes de editar. No se avanzó a K1.
- **Hallazgo 1 · borrador viejo podía recortar audio ya confirmado: CONFIRMADO y corregido.** Guardar confirma la nota y recién después se limpia el borrador; si esa segunda escritura se cortaba o fallaba, al reabrir volvía una edición con `audioBase` antiguo y «Cancelar» recortaba partes confirmadas. Ahora **la propia nota** guarda cuántas partes de audio confirmó (`audioParts`, escrito en el mismo registro que la nota). Al restaurar un borrador, si la nota confirmó más partes que el borrador, no queda nada por recortar; y «Cancelar» nunca recorta por debajo de `max(borrador, audioParts)`. Con el corte entre las dos escrituras no hace falta otro flush: el dato que protege viaja en la escritura de la nota.
- **Hallazgo 2 · escrituras fuera del candado: CONFIRMADO y corregido.** `unlockPassword`/`unlockBio` escribían (cifrar copias en claro, apartar registros dañados) **antes** de tomar el candado; `unlockRecovery` reescribía la cabecera antes; `enable` miraba y escribía la cabecera sin candado, así que dos activaciones simultáneas se pisaban (reproducido: las dos «ganaban»). Ahora el candado se pide **antes** de cualquier escritura: `enable` lo pide antes de mirar la cabecera; `unlockRecovery` primero verifica el código (solo lectura) y recién después pide el candado, y sin él no escribe; el desbloqueo con contraseña o huella sin candado abre **en solo lectura** (no cifra, no aparta, no borra nada). **Candado no disponible o con error → falla cerrada:** sin Web Locks o con un error, la pestaña queda en solo lectura con un aviso que dice cuál fue el motivo (antes se asumía que no había problema). Costo: un navegador sin Web Locks (o `file://`) puede leer pero no guardar datos protegidos.
- **Hallazgo 3 · audio dañado que aún podía modificarse: CONFIRMADO y corregido.** `anOpenForPart` no consultaba `anDamaged` ni validaba los fragmentos. Ahora `anAudioHealth` revisa, **sin escribir**, antes de ampliar o recortar: ficha, clave y detalle; que las claves guardadas sean exactamente (parte, posición) sin faltantes, sobrantes ni cambios de lugar; y descifra cada fragmento (etiqueta GCM y AAD con parte y posición: detecta alterados y mal posicionados), comparando los bytes con el detalle. Si algo falla: se marca dañado, no se amplía, no se recorta, no se reemplaza (ni se crea otro audio en su lugar), se conserva todo y se explica al usuario. **Costo:** lee y descifra el audio entero, O(tamaño), cada vez que se va a ampliar o recortar (no al reproducir ni al guardar la nota). Medido en Chrome headless de escritorio: 24 MB en ~0,15 s. **No medido en el Motorola.**
- **Dos avisos falsos corregidos (hallados al probar):** (a) si la **ficha final** de una grabación no se podía escribir por falta de espacio, el aviso decía «queda marcado como incompleto» aunque la ficha seguía en «grabando»; ahora dice que no se pudo cerrar y que se recupera al abrir (y así ocurre: se cierra como interrumpida). (b) **Cancelar** una edición o **descartar** una nota anunciaba que se había quitado/borrado el audio aunque el borrado fallara; ahora espera el resultado y, si no se borró, lo dice (queda guardado aparte, sin nota). Guardar ahora marca «guardando» durante todo su recorrido (lee las partes del audio antes de confirmar), así un doble toque no lo repite.
- **Pruebas técnicas (datos y audios inventados):** `node --test tests/delta.test.mjs` **159/159** (9 nuevas; 2 actualizadas porque comprobaban el texto del código). Nueva `tests/e2-revision2-browser.mjs` (Chrome real, dos y más pestañas reales): activaciones simultáneas; recuperación y desbloqueo en segunda pestaña con copia en claro y registro dañado (se compara **todo** `localStorage` antes/después); candado ausente y con error; nota confirmada + borrador viejo + recarga + cancelar, con corte «descartado» y con corte «falla» (se comprueban partes y bytes por huella); audio con fragmento faltante, alterado y mal posicionado: ampliar, grabar y cancelar no cambian ficha ni fragmentos; recortar un audio alterado se niega; falta de espacio en la ficha final (grabación y archivo); borrado fallido en cancelar y en descartar. Contra `745f36b` la misma prueba falla en 31 puntos (modo `REV2_BLANDO=1`); con la corrección pasa. Se sumó al CI.
- **Cortes SIMULADOS, no cierres reales:** los «cortes» de las pruebas descartan o hacen fallar escrituras a propósito dentro de una sesión de Chrome. **No** se cerró el navegador a la fuerza ni se cortó la energía, y **no se probó en Brave/Motorola**.
- **Límites y pendientes:** (a) el candado solo protege contra pestañas que ya tengan este código; una pestaña abierta con una versión anterior no lo pide. (b) Con la protección apagada, dos pestañas siguen pudiendo pisarse (sin cambios). (c) Los fragmentos de partes sin confirmar se siguen limpiando solo al abrir. (d) Las notas ya guardadas con audio antes de esta corrección no tienen `audioParts`: para ellas rige el valor del borrador (como antes). (e) Escrituras fuera del candado: no se afirma que alguna sea inofensiva; las vías conocidas (desbloquear, recuperar, activar) ahora piden el candado antes. (f) El tiempo de la revisión completa en grabaciones largas debe medirse en el Motorola.
- **Estado:** código en la rama · pruebas técnicas aprobadas en local · CI: ver el PR · **Motorola/Brave: sin probar**. No unir sin permiso del usuario (merge normal, sin squash).

## 16/11/2026 · Paso E2 corregido tras la revisión de ChatGPT (PR #47)

- **Responsable:** Claude (Opus 5.5), con permiso explícito del usuario para corregir dentro de E2. Misma rama `e2-cifrado-audios-por-nota`, sobre `2c88ce1`. La revisión de ChatGPT (sobre `2c88ce1`) llegó por el usuario; en GitHub el PR no tenía comentarios. **Cada hallazgo se verificó primero contra el código y los cuatro aplicaban** (con el código viejo, la prueba nueva falla en cada sección; por ejemplo: editar A, grabarle una parte, pasar a B y guardar dejaba a B con el audio de A, y borrar B borraba el audio que usa A).
- **1 · Quitar la protección con audios guardados: se impide.** Quitarla borra la cabecera, y la clave de los audios sale de ella: quedarían ilegibles para siempre. Hasta que exista el recorrido completo de D3 (copia + borrar audios, con AO), si hay audios en `notasvoz-dictanota-audio` la app explica por qué no se puede y la protección sigue activa (`vault.disableGuard`; se consulta antes de pedir la contraseña y otra vez dentro de `disable`). Cuenta los audios **sin crear la base** si no existe. Si no puede comprobarlo, tampoco la quita.
- **2 · Notas A y B: el audio nunca se cruza.** Pasar de editar una nota a otra solo se permite si la actual no tiene cambios ni audio agregado (si no, pide guardar o cancelar); al pasar, el audio pendiente se reinicia. Cada grabación o archivo recuerda en qué nota empezó (`convCtx`): si termina de guardarse cuando el editor ya está en otra, **queda sin nota** (D8) y se avisa. No se puede editar otra nota, cancelar ni descartar mientras se graba, se transcribe o se cifra. Guardar se niega a unir un audio que ya usa otra nota, o a reemplazar el audio de la nota editada. **Borrar una nota nunca borra un audio que usa otra** (`convAudioInUse`), ni el que está en el editor. Editando una nota sin audio, la segunda grabación se suma como parte al audio nuevo (antes dejaba el primero suelto).
- **3 · Guardar espera la confirmación real.** Con la protección abierta, Guardar recién limpia el editor y anuncia «Guardado…» cuando el registro cifrado llegó al almacenamiento (`vault.saved`). Si no hay lugar: vuelve atrás (`convStore.revert`), no aparece la burbuja, **el texto y su vínculo con el audio quedan en el editor** y se puede reintentar. Mientras se confirma, el editor queda de solo lectura y no se puede grabar ni cambiar de nota.
- **4 · Una sola pestaña escribe todo lo protegido.** El candado de `navigator.locks` (diseño 2.5) se toma al desbloquear o activar, **antes** de cargar notas y borrador, y vale para toda la app: en la segunda pestaña `vaultStore` no escribe notas, cuadernos, borrador, deshacer, personas ni diccionario, ni se cambia la cabecera (contraseña, código, huella, quitar la protección), ni audios. Aviso fijo arriba. **Además:** activar la protección en una pestaña vieja, cuando otra ya la activó, ya no reemplaza su cabecera (eso dejaba sus datos y audios ilegibles).
- **Audio incompleto por falta de espacio:** la parte queda marcada `incompleta`, **sin duración** (`ms: null`), y la nota no recibe una duración total (`durationMs: null`): nunca se presenta como completa. El aviso distingue «quedó incompleto» de «quedó sin audio».
- **Cancelar edición:** ahora el resultado coincide con el mensaje. Se quitan las partes grabadas o cargadas durante la edición (ficha y fragmentos en una sola operación) o, si la nota no tenía audio, se borra el nuevo. La confirmación y el aviso lo dicen. Si no se puede quitar, la edición sigue abierta y se avisa. Sobrevive a un corte: el borrador recuerda cuántas partes tenía el audio (`audioBase`).
- **Audio dañado:** al desbloquear se comprueba la clave, el detalle cifrado y que no falten fragmentos; un audio dañado se cuenta, se avisa y **no se toca** (no se cierra, ni se limpia, ni se borra). Grabar o cargar sobre la nota de un audio dañado no lo modifica ni crea otro en su lugar: el texto sigue y se avisa.
- **Supera dos «casos aceptados» de la entrada anterior:** «Cancelar edición deja la parte nueva» y «quitar la protección no borra los audios: quedan cifrados y sin usar» (ahora se impide quitarla).
- **Pruebas técnicas (datos y audios inventados):** `node --test tests/delta.test.mjs` **150/150** (6 nuevas; 4 actualizadas: Guardar asíncrono, borrador con `audioBase`, duración desconocida y destino de una grabación). Nueva **`tests/e2-correcciones-browser.mjs`** en Chrome real, con tono sintético: quitar la protección con audios; editar A, grabar, intentar pasar a B y cancelar; pasar A → B sin cambios y grabar en B; dos grabaciones en una edición; cancelar una edición de nota sin audio; audio que termina tarde; borrar con audio compartido; **falta de espacio al guardar el texto** (reintento exitoso); **falta de espacio en plena grabación**; **corte al agregar una segunda parte** (grabación y archivo); audio dañado; **dos pestañas reales** (la segunda no cambia nada del almacenamiento). Se probó contra el código viejo: falla en cada sección. Las otras cinco pruebas de Chrome siguen pasando. Se suma al CI.
- **Pendientes y límites:** (a) con audios «sin nota» (D8) tampoco se puede quitar la protección, y hasta E3 no hay pantalla para borrarlos; (b) el candado se toma después de abrir la protección: el arreglo automático de copias sin cifrar que quedaron (`leftovers`) puede correr también en la segunda pestaña (inofensivo: cifra y borra la copia en claro); (c) con la protección **apagada**, dos pestañas siguen pudiendo pisarse como antes (texto sin cifrar, sin cambios en este paso); (d) renombrar, mover y borrar cuadernos siguen sin esperar la confirmación del disco (solo Guardar lo hace); (e) una grabación con 0 fragmentos en estado «grabando» se sigue descartando al abrir (no hay audio que conservar); (f) el candado y el aviso no se probaron en Brave/Android.
- **Estado:** código guardado en la rama · pruebas técnicas aprobadas en local (CI en el PR) · **Motorola: sin probar**. No unir sin permiso del usuario (merge normal, sin squash). Lista para una nueva revisión independiente.

## 16/11/2026 · Paso E2: audios cifrados y guardados con su nota

- **Responsable:** Claude (Opus 5.5), con permiso explícito del usuario (plan mostrado y aprobado; decisiones 1a y 2a). Rama: `e2-cifrado-audios-por-nota`. Base: `aab2b90` (`main`, con E1 unido). Alcance: solo el paso E2 del tablero [docs/PLAN-ALMACENAMIENTO-CIFRADO.md](docs/PLAN-ALMACENAMIENTO-CIFRADO.md). El PR #46 (solo decía «E1 unido») se cerró por pedido del usuario: ese cambio del tablero va en este PR.
- **Cifrado (diseño 2.4):** `vaultDeriveAudioKey` saca `K_audio` de la clave de datos con HKDF-SHA256 (sal = id de la protección, info `dictanota audio v1`), no extraíble, sin tocar la cabecera. Cada audio tiene su propia clave (CEK) envuelta con `K_audio`; cada fragmento va como `IV ‖ cifrado` con AES-GCM y AAD `…|audio|<audioId>|<parte>|<n>`; el detalle de las partes (formato, tamaños, duración y **nombre del archivo cargado**) va cifrado. Al desbloquear, la clave de datos en bruto **se pone en cero** en todas las rutas (`openWith`).
- **Cuándo se usa:** solo con la protección abierta y «Conservar audio» encendido. Sin protección, «Conservar audio» sigue usando la base histórica como antes (D2). Con «Conservar audio» apagado no se crea nada. **Decisión 1a del usuario:** con la protección abierta, el audio se guarda solo cifrado (nunca en la base vieja); hasta E3 no se puede escuchar desde la app.
- **Grabación:** se cifra cada fragmento de 10 s apenas llega; el primero de cada parte va junto con la ficha. Grabar de nuevo sobre una nota en edición, o sobre una nota sin guardar cuyo texto se conserva, **agrega una parte** al mismo audio. El borrador recuerda el audio pendiente; Guardar lo une a la nota (`audioId`, `durationMs`) y espera a que la nota llegue cifrada.
- **Archivo cargado:** tope **30 MB** (D4; `LOAD_MAX_BYTES` se quitó porque solo repetía el tope). Se transcribe como hoy y en paralelo se guarda cifrado en partes de 1 MB, sin leerlo entero; antes se mira si hay lugar (`storage.estimate`, tamaño + 20 %). Cifrarlo cuenta como «ocupado»: no se autobloquea a la mitad.
- **Borrar y descartar:** borrar una nota borra su audio (la confirmación lo dice; primero la nota, después el audio). Descartar una nota nueva sin guardar borra su audio pendiente, con aviso. Guardar, descartar y «nota nueva» esperan si se está guardando un audio.
- **Al desbloquear (tabla 2.5):** una grabación cortada se cierra con lo que alcanzó a guardarse; un archivo a medio guardar se descarta (el usuario tiene el original); restos de una parte que no se confirmó se limpian. No crea la base si no existe; no borra audios sin nota (D8). **Candado de una pestaña conectado (decisión 2a):** si DictaNota está abierta en otra pestaña, en esa no se guardan audios y avisa.
- **Textos:** ayuda de «Conservar audio», aviso y ayuda de cargar archivo, Ajustes y estado de la protección ya no dicen que los audios no se cifran.
- **Fallo encontrado y corregido en las pruebas:** si una grabación se cortaba antes de que hubiera texto, el borrador no recordaba su audio al reabrir. Ahora sí.
- **No incluye:** reproductor, panel de espacio, `persist()`, copia cifrada, lista de audios sin nota ni aviso del audio viejo (E3/K1). Quitar la protección no borra los audios por nota (D3 va en AO): quedan cifrados y sin usar. *(Superado: ver «Paso E2 corregido»; ahora quitar la protección se impide si hay audios.)*
- **Casos aceptados:** «Cancelar edición» después de grabar sobre una nota deja la parte nueva en su audio; si la nota no tenía audio, el nuevo queda «sin nota» (recuperable en E3). Con «Empezar de cero al grabar», el audio pendiente anterior queda «sin nota». *(Lo de «Cancelar edición» está superado: ver «Paso E2 corregido». Lo de «Empezar de cero» sigue igual.)*
- **Pruebas técnicas:** `node --test tests/delta.test.mjs` 144/144 (5 nuevas de E2, 6 actualizadas: tope 30 MB, textos, confirmaciones, estados y la prueba estática de que ningún fragmento se escribe sin cifrar). Nueva `tests/audio-cifrado-browser.mjs` en Chrome real con tono sintético y bytes inventados: sin protección o sin «Conservar audio» no se usa la base nueva; grabación y archivo vuelven idénticos (SHA-256); ninguna cabecera WebM/MP3 ni el nombre del archivo en claro; partes; nota unida; descartar y borrar; grabación cortada y archivo a medio guardar resueltos al reabrir. `browser`, `cifrado-browser`, `audio-nota-browser` y `notas-browser` siguen pasando. Se suma al CI.
- **Estado:** código guardado en la rama · pruebas técnicas aprobadas en local (CI en el PR) · **Motorola: sin probar** (en particular, grabar 10 y 60 minutos con la protección activa). Vuelta atrás: el código sí; los audios ya guardados quedan cifrados y sin usar. No unir a `main` sin permiso del usuario (merge normal, sin squash). Conviene la revisión cruzada de ChatGPT antes de unir.

## 16/11/2026 · Paso E1: base nueva de audios por nota, SIN ACTIVAR

- **Responsable:** Claude (Sonnet 5.5), con permiso explícito del usuario (plan mostrado y aprobado). Rama: `e1-base-audios-por-nota`. Base: `fc86681` (`main`). Alcance: solo el paso E1 del tablero [docs/PLAN-ALMACENAMIENTO-CIFRADO.md](docs/PLAN-ALMACENAMIENTO-CIFRADO.md).
- **Qué agrega (nada visible):** en `index.html`, un bloque `AUDIONOTA` (funciones `an…`) con: base IndexedDB `notasvoz-dictanota-audio` v1 (almacenes `meta` y `chunks`, clave de fragmento `[id, parte, n]`); estados de un audio (`grabando`, `escribiendo`, `cerrado`, `importando`) y cambios permitidos; plan de partes de un archivo (1 MB); **revisión al abrir** que solo mira y propone qué hacer (tabla 2.5 del diseño), sin borrar nada; guardar ficha + primer fragmento en una sola transacción, y borrar un audio completo en otra; **candado de una sola pestaña** (`navigator.locks`).
- **Apagado:** nada de la app llama al bloque. La base nueva **no se crea** al cargar la app. El candado queda escrito y probado pero **sin conectar** (decisión del usuario; se conecta en E2). No se toca `notasvoz-gamma-audio`, ni claves, ni CSP, ni dependencias, ni textos de la interfaz.
- **Sin cifrado todavía:** por eso ningún dato real puede entrar a esta base hasta E2. Una prueba estática exige que nadie fuera del bloque lo use y que no escriba en otro lado que `meta` y `chunks`.
- **Fallo encontrado y corregido durante las pruebas:** una transacción que fallaba a mitad (por ejemplo, un fragmento no guardable) dejaba la ficha escrita sin su fragmento. Ahora se cancela entera.
- **Pruebas técnicas:** `node --test tests/delta.test.mjs` 139/139 (5 nuevas); nueva `tests/audio-nota-browser.mjs` en Chrome real (datos de Delta 11 sembrados quedan idénticos, la base nueva no existe al cargar, ficha + fragmento atómicos, borrado, candado entre tomas); `browser`, `cifrado-browser` y `notas-browser` siguen pasando. Todo con datos inventados. Se suma al CI.
- **Estado:** código guardado en la rama · pruebas técnicas aprobadas en local (CI en el PR) · **Motorola: sin probar** (no hay nada visible que probar). Vuelta atrás: total. No unir a `main` sin permiso del usuario (merge normal, sin squash).

## 16/11/2026 · Diseño del almacenamiento cifrado: Etapa E + original recuperable (SOLO documentación)

- **Responsable:** Claude (Fable 5.2). Rama: `docs-diseno-almacenamiento-cifrado-2026-11-16`. Base: `3383584` (`main`). **No toca `index.html` ni las pruebas.** Sin datos persistidos nuevos, claves, orígenes ni dependencias.
- **Qué agrega:** [docs/DISENO-ALMACENAMIENTO-CIFRADO-2026-11-16.md](docs/DISENO-ALMACENAMIENTO-CIFRADO-2026-11-16.md): un solo modelo de datos y de cifrado para los audios por nota (Etapa E) y la anonimización con original recuperable; copia cifrada exportable y versionada (Brave → app de Android); migración aditiva desde Delta 11; espacio; casos de falla; plan de pruebas con datos inventados; subetapas E1 → E2 → K1 → E3 → K2 → AO.
- **Verificado en el código y a tener en cuenta:** el código de recuperación sigue valiendo después de usarse; `convStore.save` comprueba contra la copia en memoria, no contra el disco; el texto cifrado vive en `localStorage` (cupo chico); `convCleanEntry` descarta campos desconocidos; los mensajes ya tienen `audioId`, que nada escribe todavía.
- **Decisiones del usuario (16/11/2026, 17:30–17:50): las trece tomadas** (tabla en la Parte 1 del documento). Originales y audios por nota solo con protección activa; tope de **30 MB** para cargar archivos (antes 200); copia cifrada a elegir (completa o solo texto) y antes del reproductor; restaurar solo en app vacía o reemplazando; el **código de recuperación no cambia solo** (solo a pedido, con contraseña); la app **se bloquea aunque suene un audio**; el **texto se muda de `localStorage` a IndexedDB** antes de los originales (nueva subetapa T). Descartado: cuentas (Gmail), copia en Google Drive y botón a Google Docs. Orden: E1 → E2 → K1 → E3 → K2 → T → AO.
- **Tablero para las próximas IA (nombre fijo):** [docs/PLAN-ALMACENAMIENTO-CIFRADO.md](docs/PLAN-ALMACENAMIENTO-CIFRADO.md): pasos E1 → E2 → K1 → E3 → K2 → T → AO con su estado, de qué depende cada uno, qué modelo conviene (Claude y equivalente en ChatGPT) y el pedido listo para copiar. Quien haga un paso actualiza ahí la columna «Estado». Enlazado desde AGENTS.md («Protección cifrada»).
- **Verificado el 16/11, 18:00:** la Etapa N no está «en curso»: ChatGPT (Codex) la terminó en el PR #43 (CI en verde, sin conflictos) y espera el permiso del usuario; lo mismo el PR #42 (documentación). `main` sigue sin protección.
- **Sigue valiendo:** decidir no es autorizar a programar. **No se programa nada sin permiso explícito**, y recién cuando le toque a la Etapa E (orden: N → B → E → C → D).
- **Uniones a `main` (16/11/2026, 18:15–18:40), con permiso explícito del usuario y merge normal, sin squash:** PR #42 (`8a7ecb8`), PR #43 Etapa N (`4d3cd01`) y este PR #44. Para poder unir el #43, Claude unió `main` dentro de su rama y resolvió el cruce en CAMBIOS.md y CONTINUAR-AQUI.md conservando ambos textos; no tocó `index.html` ni las pruebas de ChatGPT, y el CI volvió a pasar. De paso se ordenó el comienzo de este archivo (la entrada del PR #42 había quedado dentro de la de la Etapa A). **Próximo paso: E1**, por indicación del usuario; CONTINUAR-AQUI.md y CLAUDE.md apuntan al tablero.
- **Estado:** documento guardado en la rama y PR abierto · pruebas técnicas: no corresponde (no hay código) · **Motorola: nada probado**. No unir a `main` sin permiso del usuario (merge normal, sin squash).

## 16/11/2026 · Etapa N: pestañas Dictar y Cuadernos (PR #43)

> **Etapa N — ChatGPT (Codex), 16/11/2026:** rama `etapa-n-dictar-cuadernos`, base `3383584`. Textos visibles: Dictar / Cuadernos / Anonimizar / Ajustes; hoja pasa a cuaderno. No cambian ids, claves, datos guardados ni motores. PR #36 y #41 ya integrados; PR #42 documental separado. Validación automática en el PR; Motorola pendiente. Merge normal, sin squash, solo con permiso para publicar.

## 16/11/2026 — Continuidad tras PR #36 y #41

- Responsable: ChatGPT (Codex). Rama: `continuidad-chatgpt-post-41`; base: `3383584`.
- Leído `docs/DECISIONES-USUARIO-2026-11-16.md` en el commit `0961e50` de Claude (PR #37, aún separado de main).
- Corregidos CONTINUAR-AQUI.md, CLAUDE.md y encabezado de AGENTS.md: el tema claro, chat y Etapa A ya están integrados.
- Registrado el orden vigente y las decisiones posteriores de Dictar/Cuadernos, sin reabrirlas. Se preservan autorías y ramas anteriores.
- Verificación: historial Git y revisión del diff; cambio exclusivamente documental. No se repiten suites de navegador ni se afirma validación en Motorola.
- PR nuevo; sin squash ni autorización implícita para fusionar.

## 16/11/2026 · Etapa A estética: ajustes menores de presentación (PR #41)

- **Responsable:** Claude. Rama: `estetica-a-ajustes-2026-11-16`. Base: `e89d0a1` (`main`). **Toca `index.html` y `tests/delta.test.mjs`. Solo presentación**: sin datos persistidos nuevos, claves, orígenes, dependencias ni cambios de CSP, cifrado, Whisper, captura ni almacenamiento de audio. Detalle de cada ítem y de lo que **no** se hizo: [docs/TRASPASO-A-CHATGPT-2026-11-16.md](docs/TRASPASO-A-CHATGPT-2026-11-16.md).
- **Autorización:** el usuario pidió (16/11/2026, 13:54) preparar la Etapa A mientras ChatGPT no está disponible. **No se une a `main` sin su permiso explícito** (merge normal, sin squash).
- **A1** Se quitan los cinco rótulos viejos «Texto»; las frases ya no nombran ninguna pestaña (para no repetirlas en la Etapa N). **A2** «Ver hojas guardadas» y «Escribir una nota» con el mismo estilo. **A3** Ajustes: botón (i) en línea con su etiqueta, opciones del modelo con nombre corto (la descripción sigue debajo) e íconos SVG en línea, uno por módulo. **A4** El punto de estado es rojo al grabar y ámbar al pausar. **A5** «Procesamiento local» visible en el celular (antes se ocultaba bajo 760 px). **A6** Audio: «Conservar audio» en una fila propia y la tarjeta repetida «Descargar audio» solo aparece si hay un audio; `#audioBox` y «Mis grabaciones» siguen siempre visibles.
- **No incluido:** pulso animado del punto de grabación; unificar los tres botones «Descargar audio» cuando hay audio (queda para la Etapa E); etiqueta «Protegida».
- **Pruebas técnicas (Chrome local, sin conexión):** `node --test tests/delta.test.mjs` **134/134** (128 + 6 nuevas «Etapa A»), `tests/browser.mjs`, `tests/cifrado-browser.mjs` y `tests/notas-browser.mjs` OK. Capturas antes/después a 360 y 412 px con datos ficticios (estados de captura simulados con clases CSS).
- **Estado:** código guardado en la rama y PR abierto · prueba técnica: aprobada en local; CI del PR: ver el PR · **Motorola: sin probar**. Pendiente: revisión visual del usuario y su permiso para unir.
- **Documentación nueva:** [traspaso a ChatGPT](docs/TRASPASO-A-CHATGPT-2026-11-16.md) y [pendientes del usuario y prueba en el Motorola](docs/PRUEBA-MOTOROLA-Y-PENDIENTES-USUARIO-2026-11-16.md).

## 16/11/2026 · Decisión: pestaña «Cuadernos» y audios cargados guardados con la nota (SOLO documentación)

- **Responsable:** Claude. Rama: `docs-cuadernos-audios-importados-2026-11-16`. Base: `53441eb` (`main`, tras unir el PR #39 con commit de merge). **No modifica `index.html`, pruebas, AGENTS.md ni almacenamiento.**
- **Decisiones del usuario (16/11/2026, 13:31):** (1) la **segunda pestaña se llama «Cuadernos»**; las pestañas quedan **Dictar · Cuadernos · Anonimizar · Ajustes** y, en la interfaz, «hoja» pasa a «cuaderno» (Etapa N, aún no implementada: hoy la app sigue diciendo «hoja»); (2) los **audios cargados desde un archivo también se guardan unidos a su nota** (Etapa E), lo que **reemplaza** la decisión previa de que un archivo importado no se conserva; (3) autorizó unir el PR #39 a `main`. **A las 13:43:** los audios cargados obedecen al interruptor «Conservar audio» (apagado = no se guardan) y autorizó unir este PR #40.
- [docs/PROPUESTA-ESTETICA-2026-11-16.md](docs/PROPUESTA-ESTETICA-2026-11-16.md): la Etapa E pasa a prever una **base nueva de IndexedDB** para los audios por nota (sin subir la versión de `notasvoz-gamma-audio`) y deja anotado que un archivo cargado puede pesar mucho más que una grabación de la app (hasta 200 MB y 15 minutos por archivo). Interruptor «Conservar audio»: resuelto (13:43), los audios cargados lo obedecen.
- Quitado un nombre propio de ejemplo de la propuesta (el repositorio es público).
- Estado: documentación guardada; nada implementado ni probado en el Motorola.

## 16/11/2026 · Decisiones del usuario sobre pestañas y audio en la burbuja (SOLO documentación)

- **Responsable:** Claude. Rama: `docs-audio-burbuja-pestanas-2026-11-16`. Base: `73780b7` (`main`). **No modifica `index.html`, pruebas, AGENTS.md ni almacenamiento.**
- Actualiza [docs/PROPUESTA-ESTETICA-2026-11-16.md](docs/PROPUESTA-ESTETICA-2026-11-16.md) y [docs/PROMPT-CHATGPT-ESTETICA-2026-11-16.txt](docs/PROMPT-CHATGPT-ESTETICA-2026-11-16.txt) con tres decisiones del usuario del 16/11/2026: (1) **B2 confirmado**; (2) **primera pestaña = «Dictar»**, que reúne todo lo de grabar y cargar audios para transcribir; el nombre de la **segunda pestaña (las hojas) sigue pendiente** («Bitácora» descartado; alternativas en la Etapa N); (3) **audio dentro de la burbuja** (reproductor arriba, transcripción abajo, para volver a escuchar y corregir), sin resaltar la palabra que se escucha.
- Nuevas **Etapa N** (nombres de pestañas) y **Etapa E** (audio en la burbuja, en tres subetapas: almacén por nota y vínculo → cifrado de los audios → reproductor, almacenamiento persistente y espacio usado). La Etapa E **toca almacenamiento y reemplaza** la frase de AGENTS.md «Audio solo a pedido, fuera de las burbujas»: exige plan y permiso explícito, y esa frase se actualiza en el PR que la implemente. Hoy las burbujas **no** llevan audio.
- Estimación registrada: ≈14 MB por hora de audio (≈0,7 MB por nota de 3 minutos); sin costo extra de procesamiento. Riesgos a resolver: audio sin cifrar y sin anonimizar, duración/avance de los WebM y datos que el navegador puede borrar sin almacenamiento persistente.
- Estado: documentación guardada; nada implementado ni probado en el Motorola.

## 16/11/2026 · Propuesta estética de Claude (SOLO documentación)

- **Responsable:** Claude. Rama: `estetica-propuesta-claude-2026-11-16`. Base: `2f56388` (`main`). **No modifica `index.html`, pruebas ni almacenamiento.**
- Nuevo [docs/PROPUESTA-ESTETICA-2026-11-16.md](docs/PROPUESTA-ESTETICA-2026-11-16.md): perspectiva de diseño y mejoras en cuatro etapas (A ajustes menores, B jerarquía y densidad, C anonimización y contraste, D cimientos de CSS), con mediciones, ids afectados, criterios de aceptación y restricciones del repositorio. Y [docs/PROMPT-CHATGPT-ESTETICA-2026-11-16.txt](docs/PROMPT-CHATGPT-ESTETICA-2026-11-16.txt), texto para pasarle el pedido a ChatGPT.
- Orden acordado con el usuario: ChatGPT **termina primero** su rama `rediseno-04-clinica-chat-chatgpt`; recién después incorpora estas mejoras, cada etapa en su rama y con permiso del usuario para unir a `main`.
- **Decisiones del usuario (16/11/2026, 13:02):** autorizó unir esta documentación a `main`; aprobó el menú ⋯ en las burbujas, la vista previa del texto en la lista (activada por defecto, con interruptor en Ajustes) y un **modo oscuro opcional** (después de consolidar el CSS). Siguen pendientes los nombres de las pestañas y el cambio de «Grabar» en la barra de Audio.
- Revisión hecha en Chrome sin conexión (412×892 y 360×740, datos ficticios; estados de captura simulados con clases CSS). **Sin prueba en el Motorola.**

## 16/11/2026 · Clínica contemporánea y notas en chat — ChatGPT

- **Responsable:** ChatGPT (Codex). Rama: `rediseno-04-clinica-chat-chatgpt`. Base: `089ebbecfccf596fa8e5505d44224909bebb6b11`. Autorización: el usuario pidió comenzar con la estética clara y disposición de chat; navegación final y ampliación de anonimización quedan para la siguiente etapa.
- Paleta clara unificada, azul petróleo, controles y estados de error/captura/protección adaptados. Sin nuevas fuentes, dependencias ni conexiones.
- Inicio listo para grabar con accesos «Ver hojas guardadas» y «Escribir una nota». Lista de hojas separada de la hoja abierta; notas como burbujas y editor en la barra inferior, junto a Grabar y Guardar. La misma medida de barra reserva espacio para el contenido y teclado.
- «Nueva nota» desde una hoja inicia un destino independiente. Si hay borrador, edición, grabación o transcripción activa, conserva el contenido y destino y explica cómo continuar. Herramientas de corrección, selección, copia y exportación agrupadas; ninguna eliminada.
- **Terminología del usuario:** nota = una grabación transcripta o texto manual. Hoja = contenedor con nombre (fecha/hora inicial salvo nombre elegido). Las notas nuevas dentro de una hoja se agregan a ella; una nota independiente se puede mover después. El sello de cada nota continúa siendo la hora de guardado.
- **Anonimización acordada para próxima etapa:** actúa sobre la nota que se transcribe; añadir después acción para toda la hoja. El original debe ser recuperable incluso después de guardar/reabrir. El Deshacer actual no garantiza esa recuperación persistente: no presentar ese requisito como implementado por esta entrega.
- Pruebas locales: 128/128 Node. Chromium local no pudo arrancar por restricciones de sockets del entorno; suites de navegador y capturas se ejecutan mediante CI en esta rama. Registrar resultado final antes de integrar.
- **Publicación:** pendiente de revisión visual del usuario; no unir a main en esta entrega. **Motorola:** sin probar; el usuario confirmó que todavía no probó la fase anterior.

## 16/11/2026 · Informe de continuidad (SOLO documentación)

- Tras probar la fase 3, el usuario notó que **la estética no cambió**: es correcto, la estética clara «Clínica contemporánea» se aprobó y se mostró en maquetas, pero no se implementó. Nuevo [informe de continuidad](docs/INFORME-CONTINUIDAD-2026-11-16.md) con lo hecho, lo que falta y el orden recomendado; `CONTINUAR-AQUI.md`, `CLAUDE.md`, `AGENTS.md` y `README.md` apuntan a él. Sin cambios en la app.

## 16/11/2026 · Rediseño conversacional · fase 3: pantalla Notas con hojas y mensajes

Base: `main` en `4215fe9`; rama `rediseno-03-pantalla-notas-2026-11-16`. Autorizado por el usuario el 16/11/2026 (09:52: «continúe con los siguientes pasos»).

- **La pestaña «Texto» pasa a llamarse «Notas»** (id interno `transcripcion` sin cambios). Arriba muestra **todas las hojas**; al abrir una se ven sus **mensajes como burbujas**, cada uno con la **fecha y hora de guardado**, «nota anterior» o «editado …» si corresponde.
- **El editor es el mensaje sin guardar.** Una línea indica el destino: «se crea una hoja nueva» o «se agrega a «…»». **Guardar** (antes «Guardar nota .txt») lo agrega como burbuja; **ya no descarga un .txt** (exportar sigue en «Exportar este mensaje» y en la hoja). **Descartar** pide confirmación. Sin Guardar no queda en ninguna hoja.
- **Destino:** grabar desde **Audio** (captura global) siempre crea una hoja nueva, aunque haya una hoja abierta en Notas; grabar o escribir con una hoja abierta en Notas la agrega ahí. El destino se fija al empezar el mensaje.
- **En cada burbuja:** Copiar, Editar (vuelve al editor; Guardar cambia el texto, no la fecha), Mover (con Deshacer) y Borrar (con confirmación). **En cada hoja:** Renombrar, Copiar todo, Pasar todo a otra hoja (con Deshacer), Descargar .txt y Borrar hoja vacía.
- **Notas anteriores:** al abrir la app se pasan solas a hojas, **una burbuja por nota**, con su fecha de último guardado. `notasvoz.gamma.v1` **no se modifica** y sirve de respaldo.
- **Recuperación automática:** el borrador guarda también el destino y si se estaba editando; al volver ofrece «Guardar o Descartar».
- **Audio (decisión del usuario, 09:52):** los mensajes son solo texto; el audio no va en las burbujas. Se conserva **solo a pedido** («Conservar audio», apagado por defecto); no se cambió esa parte.
- Sin orígenes, dependencias ni cambios de CSP, Whisper, grabación o cifrado. Textos del usuario con `textContent`.
- Pruebas: **128/128** Node; nueva `tests/notas-browser.mjs` (agregada al CI) en Chrome a 320/360/412 px con datos ficticios: migración, hoja nueva, agregar, captura global, editar sin cambiar la fecha, mover y deshacer, copiar y pasar todo, descartar, recuperación al recargar y textos hostiles. `browser.mjs` y `cifrado-browser.mjs` aprobadas.
- **Motorola: pendiente.** Probar con datos ficticios (ver README, «Notas en hojas»).

## 16/11/2026 · Rediseño conversacional · fase 2: guardado protegido y migración (sin cambios visibles)

Base: `main` en `7bd0240`; rama `rediseno-02-guardado-conversaciones-2026-11-16`. Autorizado por el usuario el 16/11/2026 (09:14).

- **Ajuste del modelo a las decisiones de las 08:01:** el sello de cada burbuja es `savedAt`, el momento en que terminó de guardarse (botón Guardar). La hora de inicio de la grabación (`recordedAt`) queda como dato técnico opcional. El título de una hoja nueva usa la hora de guardado. Ninguna de las dos se puede cambiar después (`convCheckWrite`).
- **Hoja completa:** `convMoveAll` pasa todos los mensajes de una hoja a otra (con «Deshacer»; la hoja de origen queda vacía y no se borra sola) y `convCopyText` arma el texto de toda la hoja para copiarlo (título y, por mensaje, su fecha en una línea aparte).
- **Notas viejas:** `convFromLegacy` convierte cada nota en una hoja con **una burbuja**, con su fecha de último guardado. Repetirla no duplica y no modifica `notasvoz.gamma.v1`.
- **Guardado:** `convMakeStore` carga y guarda la clave nueva `notasvoz.dictanota.v2`, verifica releyendo, rechaza cambios de sello, no lee ni escribe con la protección bloqueada y no sobrescribe datos dañados. La clave se sumó a `VAULT_KEYS` («conversaciones»): con la protección activada se guarda cifrada.
- **La app todavía no carga, migra ni guarda conversaciones** (una prueba lo verifica). Nada cambia en el celular hasta la fase 3, que conecta la pantalla Notas y el botón Guardar. La recuperación automática del texto sin guardar se mantiene (decisión del usuario) y se usará para el mensaje pendiente.
- Pruebas: **125/125** Node (15 del rediseño, datos ficticios; incluye cifrado real con la hoja protegida); `tests/browser.mjs` y `tests/cifrado-browser.mjs` aprobadas en Chrome local. Motorola: no aplica todavía.

## 16/11/2026 · Rediseño conversacional · fase 1: modelo de datos (sin cambios visibles)

Base: `main` en `65ec519`; rama `rediseno-01-modelo-conversaciones-2026-11-16`. Autorizado por el usuario el 16/11/2026 (fase 1).

- Nuevo bloque `/*CONV-START*/ … /*CONV-END*/` en `index.html` con **funciones puras** del modelo nota/mensaje: crear mensaje (la captura global siempre crea una nota nueva; dentro de una nota se agrega ahí), editar texto, renombrar, mover con «Deshacer», control que impide cambiar la fecha y hora de registro, lectura defensiva y conversión de vuelta al formato anterior de notas planas.
- Decisiones del usuario aplicadas: la nota nueva se titula con **la fecha y hora del registro** (`16/11/2026 · 10:42`); la nota se crea **solo si hay texto o audio válido**.
- **La app todavía no usa este bloque**: no lee ni escribe almacenamiento, no crea claves nuevas, no toca `vaultStore`, IndexedDB, Whisper, la interfaz ni la CSP. Una prueba lo verifica.
- Pendiente: migración de las notas viejas (falta la decisión del usuario sobre cómo mostrarlas), guardado real con `vaultStore` (clave nueva en `VAULT_KEYS`) y todo lo visible.
- Pruebas: **118/118** Node (8 nuevas, datos ficticios); `tests/browser.mjs` y `tests/cifrado-browser.mjs` aprobadas en Chrome local. Motorola: no aplica todavía (sin cambios visibles).

## 16/11/2026 · Traspaso del rediseño conversacional (SOLO documentación)

- Nuevo punto de entrada para agentes: [CONTINUAR-AQUI.md](CONTINUAR-AQUI.md), enlazado desde AGENTS.md, CLAUDE.md y README.md.
- Publicados [informe de rediseño](docs/REDISENO-CONVERSACIONAL-2026-11-16.md) e [instrucciones para la próxima IA](docs/PROMPT-SIGUIENTE-IA-2026-11-16.txt).
- Resume decisiones de interfaz Clínica contemporánea, tres secciones propuestas (Notas / Biblioteca / Ajustes), captura rápida que crea nota nueva por defecto, movimientos de mensajes y fecha/hora de registro inmutable desde la interfaz.
- **No se modificó `index.html`, los datos, las pruebas, el almacenamiento, la aplicación publicada ni el motor de audio.** La implementación queda pendiente de aprobación expresa del usuario, con migración segura y pruebas.

## 16/11/2026 · Código de recuperación: copiar y generar uno nuevo

Lo informó el usuario después de activar la protección en el Motorola: no podía copiar el código de recuperación. La huella sí le funcionó (primera validación real: activar, salir, volver a entrar y desbloquear con la huella en Brave/Android).
- Botón «Copiar código». Si el portapapeles falla, deja el código seleccionado. El estilo `user-select:all`, que complicaba la selección en Android, pasa a `user-select:text`.
- Nuevo «Nuevo código de recuperación» en Ajustes (pide la contraseña). Reemplaza el código anterior, que deja de servir. Se verifica antes de guardar.
- Pruebas: 110/110 Node (una nueva) y `tests/cifrado-browser.mjs` amplía el recorrido con el código nuevo y el botón Copiar. Motorola: falta probar Copiar y el código nuevo.

## 16/11/2026 · Protección cifrada con contraseña y huella

Base: main `702cedd`; rama `seguridad-02-cifrado-2026-11-16`. Pedido del usuario: cifrar toda la app, desbloquear con huella y contraseña, autobloqueo a los 15 minutos y audios en una segunda etapa. Pensado para que sirva también a una futura app de Android.

- Nuevo en Ajustes → Privacidad y almacenamiento: «Protección con contraseña y huella». Permite activar, ver el código de recuperación una sola vez, activar o quitar la huella, bloquear ahora, cambiar la contraseña y quitar la protección (con contraseña). Se agrega un botón «Bloquear» en el encabezado y una pantalla de bloqueo que deja la app inutilizable detrás (`inert`).
- Cifrado: AES-GCM de 256 bits por registro. La clave de datos se envuelve con la contraseña (PBKDF2-SHA256, 600.000 iteraciones), con el código de recuperación (HKDF) y con la huella (passkey con WebAuthn PRF + HKDF). Detalle y límites en DISENO-CIFRADO.md.
- La app usa `vaultStore` en lugar de `localStorage` para notas, borrador, deshacer, personas y diccionario. La carga de esos datos se hace en `vaultWhenReady`. **Sin la protección activada, el comportamiento es el mismo que antes.**
- Sin orígenes nuevos, sin cambios en la CSP ni en Whisper, la grabación o los audios. Las claves históricas `gamma` se conservan.
- Pruebas: 109/109 en Node (10 nuevas de cifrado) y `tests/cifrado-browser.mjs` (nueva, agregada al CI) en Chrome real a 412 px con autenticador virtual con PRF. Se ajustaron dos pruebas existentes: el borrado de textos ahora usa `vaultStore`, y el conteo de la clave del diccionario excluye la lista de claves protegidas. `tests/browser.mjs` sigue aprobada.
- **Motorola: pendiente.** Probar con datos ficticios: activar → anotar el código → activar la huella → recargar → desbloquear con huella → bloquear → contraseña → dejar 15 minutos sin uso con la pantalla apagada → volver. Medir cuánto tarda el desbloqueo con contraseña.

## 15/11/2026 · Claridad visual y uso con una mano

Base: main `0bdd11d65d2e7c81e7da96f26de9fc399baebb54`; rama `mejora-claridad-movil`.

- Conservar audio arriba a la derecha, interruptor con Sí/No, configuración existente sincronizada y bloqueada durante captura/procesamiento. Ayuda distingue copia local de descarga.
- Barra global: punto amarillo suave mientras graba, fijo con «En pausa», oculto al detener; preferencia de conservación visible. Sin temporizadores nuevos; movimiento reducido sin animación. Puntos verdes de novedades intactos.
- Ayudas ⓘ desplegables debajo, con botón nativo, nombre accesible, aria-expanded y aria-controls. Anonimizar conserva advertencia visible; errores, estados y límites de importación siguen visibles.
- Descargar audio unificado; Guardar nota .txt mantiene copia local y descarga. Espacio dinámico de barra conservado, editor ajustado para teclado y renglón final con margen.
- README y AGENTS corregidos: cuatro pantallas, Audio y límite vigente de 15 minutos inclusive / 200 MB. Historial anterior conserva sus fechas y resultados.
- Sin cambios de claves, datos, Whisper, CSP, orígenes o dependencias. Importados nunca se guardan.
- Verificación local: 99/99 pruebas Node. Chromium local no inicia por restricción de sockets del entorno. Se agrega prueba de interfaz sin dependencias usando Chrome del runner y CDP nativo de Node: anchos 320/360/412/760/1365, normal/grande, ayudas, sincronización, bloqueo, captura/pausa/fin y teclado simulado. CI de la rama: 99/99 y prueba Chrome aprobadas (run 43795049824). Revisión de capturas: se reemplazó el glifo de información por SVG integrado y se compactó el encabezado. Ajuste final aprobado en run 43795311185 (99 pruebas + Chrome). Capturas a 412 px con letra Grande revisadas. La prueba incluye captura global en las cuatro pantallas. Publicación se informa en la entrega.
- **Motorola real: pendiente.** No hubo micrófono ni teclado físico; probar con datos ficticios grabar → pausar → reanudar → cambiar de pantalla → detener → editar último renglón → descargar. La revisión anterior tampoco era prueba física.

## 15/11/2026 · Diseño compacto y controles de entrada

- Audio más compacto; herramientas de Texto en una fila desde 480 px, acciones secundarias menos destacadas; barra inferior más pequeña con medidas dinámicas existentes; Personas y códigos cerrado inicialmente; explicaciones de Ajustes abreviadas.
- validNotes valida estructura de notas y etiquetas al leer; un guardado que sustituya datos inválidos requiere confirmación. No cambia claves ni elimina automáticamente el almacenamiento original.
- Importaciones: máximo 200 MB y 15 minutos, comprobados con metadatos y plazo de 10 s ANTES de decodeAudioData; se verifica nuevamente duración del PCM. Los archivos sin duración verificable se rechazan. Grabaciones propias conservan comportamiento previo.
- Límite: los metadatos y la decodificación dependen del navegador. Esto reduce exposición, no garantiza una cota de memoria frente a códecs o archivos maliciosos. El timeout no cancela decodeAudioData. No se implementó cifrado, copia propia de Whisper ni cambios de acceso.
- Verificación local: 97/97 pruebas Node. Pruebas nuevas de almacenamiento malformado, tamaños, duraciones inválidas y orden de validación. Validación física Motorola pendiente.

# Registro de cambios — Grabador de voz Delta

## DictaNota · Pestaña «Audio»: cargar un audio, aviso verde de grabación completa y puntos de novedad — 16/11/2026

Base: `main` en `61969cf`. Pedido del usuario tras probar en el celular (decisiones acordadas en la conversación): cerrar el circuito «audio → transcripción → anonimizar».

- **La primera pestaña de la barra se llama «Audio»** (antes «Grabar»; el botón Grabar de la barra de acciones y los identificadores internos, incluido `#grabacion`, no cambian). Reúne grabar, cargar un audio y las grabaciones guardadas.
- **Cargar un audio para transcribir:** botón «Cargar un audio para transcribir» (selector de archivos de audio). Usa el mismo proceso de transcripción que «Transcribir este audio» (`transcribeBlob`, extraído de `transcribeSaved` sin cambiar el motor, el Worker ni la cola). **El audio cargado NO se guarda**: se lee, se transcribe y se descarta; no toca el audio principal ni la copia temporal. Límites: 200 MB y 90 minutos; avisa si el archivo no es un audio o no se puede leer. Pide confirmación y recuerda que el texto del editor se reemplaza si «Empezar de cero al grabar» está activado. El archivo no sale del dispositivo; sin orígenes nuevos.
- **Aviso verde «Grabación completa»** dentro de la pestaña Audio (tilde, degradado verde vibrante, botón «Descargar audio» y ✕): aparece al terminar de guardarse una grabación nueva, solo si «Conservar también el audio» estaba activado. El botón de descarga queda desactivado, con una nota, hasta que termine la transcripción. Se cierra con la ✕, al descargar o al empezar otra grabación. Reemplaza al aviso fijo de la barra de abajo (quitado).
- **«Mis grabaciones»:** botón debajo del micrófono grande que lleva al cuadro «Tus audios guardados» (muestra la duración si hay audio).
- **Puntos de novedad en la barra:** un punto verde en «Texto» cuando termina una transcripción y en «Audio» cuando queda un audio nuevo, solo si se está en otra pantalla; se apagan al entrar. Con texto accesible (`aria-label`, p. ej. «Texto · transcripción lista»).

### Verificación
- **Pruebas automáticas:** 95/95 en local. **Navegador de laboratorio** (datos ficticios): aviso verde, punto en la barra y su desaparición, botón «Mis grabaciones», carga de un WAV sintético (se lee y decodifica, pide confirmación y llega a preparar el modelo; la descarga del modelo no es posible en el laboratorio sin internet), rechazo de un archivo no sonoro. **No se probó una transcripción real de un archivo cargado.**
- **Motorola/Brave: NO confirmado.** Probar: cargar un audio corto ficticio (MP3/M4A/WAV) y comprobar que se transcribe y que no aparece en «Tus audios guardados»; grabar con «Conservar también el audio» y mirar el aviso verde y los puntos de la barra; probar con letra Normal y Grande.

## DictaNota · Anonimizar como pantalla propia, audios a la vista y aprendizaje automático de correcciones — 16/11/2026

Base: `main` en `7ba0289e827244f50cb35630ff9256506d6b5c89` (verificado antes de editar), rama `claude/notavoz-ux-improvements-o95axk`. Pedido del usuario: (1) el audio está muy escondido; (2) la barra fija debe incluir Anonimizar (Grabar · Texto · Anonimizar · Ajustes); (3) explicar con palabras simples qué hace Anonimizar; (4) las correcciones del usuario deben aprenderse solas, sin un botón extra, y Anonimizar debe permitir asociar nombre ↔ código.

### Qué cambió (en español sencillo)
- **Cuatro pantallas en la barra fija:** Grabar · Texto · **Anonimizar** · Ajustes. Anonimizar es una pantalla completa (antes era un bloque al final de Texto). Se quitó el botón «Anonimizar» repetido de la barra de acciones de Texto, que ejecutaba la anonimización sin explicar nada; en Texto quedan «Grabar» y «Guardar .txt». Mismos IDs de los controles (`anon`, `undo`, `peopleBox`, `pName`…), mismo motor de anonimización.
- **Explicación de Anonimizar:** «¿Para qué sirve?», un ejemplo con datos inventados (texto original / sin cargar a nadie / con «Ana = madre, código P-001») verificado con el motor real, indicaciones de uso y aviso de que puede fallar. Vista de solo lectura del texto actual dentro de la pantalla, para ver el resultado sin cambiar de pantalla.
- **Personas y códigos** (nombre ↔ código/relación) quedó abierta por defecto, con rótulos más claros («1. Nombre», «2. ¿Quién es?», «3. Código»), una línea «se va a escribir así: [madre de P-001]» que se actualiza mientras se escribe y la lista cargada indica exactamente cómo se escribe cada persona. Tipos de reemplazo: con código (`[P-024]`), con relación (`[madre de P-024]`) o solo ocultar (`[Persona 1]`, si se deja el código vacío). Sin cambios en el formato guardado de la tabla.
- **Audios a la vista:** el cuadro «Tus audios guardados» ya no está oculto ni al final de la pantalla: aparece justo debajo de «Conservar también el audio», siempre visible (con un mensaje si todavía no hay audio). Si hay audio, un botón arriba de todo en Grabar («Audio guardado · 01:05 · Ver, descargar o recuperar») lleva a ese cuadro; además hay accesos directos desde Texto y desde Ajustes → Audio. «Recuperar audio anterior» sigue apareciendo cuando existe esa copia.
- **Aprendizaje automático:** si se corrige el texto (al salir del editor, al guardar, al anonimizar, al borrar o al pasar la app a segundo plano, o con «Corregir selección») DictaNota compara con lo que escribió Whisper y guarda sola la corrección en el diccionario, bajo «# Aprendido de tus correcciones». Aparece un aviso con **Deshacer**. Solo aprende errores de transcripción parecidos (suenan o se escriben parecido): frases partidas que se unen («contra transferencia» → «contratransferencia», sin contexto) y correcciones de ortografía (con la palabra anterior como contexto). **No aprende** reescrituras de contenido, palabras cortas (el → la), nombres con mayúscula, números, ni lo que cambia la anonimización. Se puede apagar en Ajustes → Diccionario → «Aprender de mis correcciones» (campo opcional `learnAuto` en la configuración existente). Con el aprendizaje apagado se conserva el comportamiento anterior (sugerencias al guardar). En «Corregir selección», la casilla pasó a ser «Reemplazar siempre, en cualquier contexto» (opcional, desmarcada); la corrección en sí se aprende automáticamente.
- **Regla del proyecto actualizada con consentimiento del usuario:** antes AGENTS.md decía «nunca automáticamente sin consentimiento». El usuario pidió explícitamente aprendizaje automático; el consentimiento queda en el ajuste (activado por defecto, apagable).

### Qué NO cambió
- Grabación, pausa, barra fija de captura, Whisper, segmentador, audio (IndexedDB), motor de anonimización, exportaciones, claves de almacenamiento (se reutilizan `notasvoz.gamma.dict.v1` y `notasvoz.gamma.cfg.v1`; no hay claves nuevas).

### Verificación (tres niveles)
- **Código guardado:** en la rama indicada; **no** unido a `main` ni publicado.
- **Pruebas técnicas:** `node --test tests/delta.test.mjs`: **93/93** (86 anteriores —5 adaptadas a cuatro pantallas y a la barra sin botón duplicado— + 7 nuevas). Chromium de laboratorio (Playwright) con datos ficticios a 320/360/412 px: la navegación de cuatro destinos cabe sin desbordar; cambio de pantalla; anonimización con y sin tabla de personas; vista previa; alta de persona con código generado; aprendizaje (unión de palabras, ortografía, deshacer, apagado, diálogo de corrección, persistencia); audio vacío / con audio / acceso directo desde Texto y Ajustes; nota ficticia de 8.000 palabras comparada en ~2 ms. Sin errores de consola.
- **Motorola/Brave: NO confirmado.** Probar con datos ficticios: abrir Anonimizar y leer la explicación; cargar una persona con código y anonimizar; deshacer; corregir una palabra en Texto, cerrar el teclado y ver el aviso «Aprendí…»; grabar con «Conservar también el audio» y encontrar el audio desde Grabar, Texto y Ajustes; comprobar que los cuatro botones de la barra se leen bien con letra Normal y Grande.

### Límites conocidos
- El aprendizaje por ortografía usa la palabra anterior como contexto para no reemplazar palabras reales en todas partes; por eso una corrección de una sola palabra puede tardar en repetirse. Reglas más amplias se pueden escribir a mano en Ajustes → Diccionario.
- El diccionario se guarda sin cifrar, igual que antes. Las palabras aprendidas son siempre minúsculas (sin nombres propios), pero provienen de lo dictado: no usar datos reales.
- Un navegador que no dispare el evento `change` al cerrar el teclado (poco habitual) aprende igualmente al guardar, anonimizar, borrar o pasar a segundo plano.

## Seguridad 01 · revisión («pen testing») inicial, política CSP y huella de la librería MP3 — 15/11/2026

**Leer también [SEGURIDAD.md](SEGURIDAD.md): es el registro vivo de la revisión (reglas, hallazgos, pendientes).** Base: `main` en `63bc33bd99d75e6b6bf681c6cc23cc6f4bf9e86f`, rama `seguridad-01-csp-huella-2026-11-15`.

### Qué se hizo
- **Revisión de seguridad de la aplicación del propio usuario** (código publicado, sitio, configuración del repositorio). Resultado resumido: sin inyección de código; sin envío propio de datos; riesgos abiertos: notas sin cifrar, librerías externas sin verificación completa, `main` sin protección. Detalle en SEGURIDAD.md.
- **Política de seguridad (CSP) dentro de `index.html`** (`<meta http-equiv="Content-Security-Policy">`, antes de cualquier script): la página solo puede cargar código y conectarse a jsDelivr (librerías) y a Hugging Face (modelos), más recursos propios en memoria (`blob:`/`data:`). Sin `eval`, sin objetos, marcos, formularios ni `<base>`. Permite scripts en línea (`'unsafe-inline'`) porque la aplicación los usa; es una limitación documentada.
- **Huella SHA-384 (`integrity`) y `crossOrigin` en la carga de la librería MP3** (`lamejs@1.2.1`): si el servicio externo entregara otro archivo, el navegador lo rechaza.
- **Documentación visible desde el inicio:** nuevo `SEGURIDAD.md`; aviso en las primeras líneas de `AGENTS.md`, `CLAUDE.md` y `README.md`; nuevas reglas en «Forma de trabajo» de AGENTS.md.
- **No se tocaron** el motor Whisper, la captura, la segmentación, el almacenamiento ni sus claves, ni el diseño.

### Pruebas
- **Automáticas (7 nuevas, «Seguridad»):** la CSP existe, va antes de los scripts y cierra lo innecesario; sin `unsafe-eval` ni comodines; toda dirección externa del código está revisada; la huella MP3 está presente; sin `eval`/`new Function`/`document.write`/`innerHTML` con datos; sin `fetch`/`WebSocket`/etc.; SEGURIDAD.md existe y se menciona en las primeras líneas de AGENTS/CLAUDE/README. Se comprobó, introduciendo fallas a propósito en una copia, que estas pruebas las detectan.
- **Resultado local:** **86/86 aprobadas** (79 anteriores + 7 nuevas) con el mismo arnés de pruebas en el navegador integrado usado antes (esta computadora no tiene Node). **Falta el resultado de GitHub Actions** (`node --test` real).
- **Navegador integrado (Chromium/Windows), servido desde `localhost`, con la política activa y sin bloqueos inesperados:** carga de la página; Whisper Tiny por procesador y Whisper Base por placa de video, ambos transcribiendo audio sintético de 3 s; librería MP3 cargada con huella; huella falsa rechazada; sitio no permitido y script ajeno bloqueados; captura (AudioWorklet), reproducción de audio, descarga TXT e IndexedDB funcionando.
- **Prueba de inyección sobre el sitio publicado (versión anterior):** una nota ficticia con código de ataque falso en título, texto y etiqueta se mostró como texto sin ejecutarse.

### Estado (tres niveles)
- **Código guardado:** en la rama indicada; falta unir a `main`.
- **Pruebas técnicas:** 86/86 locales; CI pendiente; sin probar en Firefox ni de punta a punta la conversión a MP3.
- **Motorola/Brave:** **NO confirmado.** Hay que probar con datos ficticios: grabar, transcribir con Base y Small, convertir a MP3, descargar TXT, compartir y recuperar audio. Si algo no carga, ver «Cómo volver atrás» en SEGURIDAD.md.

## DictaNota · identidad visible — 15/11/2026

- Nombre elegido por el usuario: **DictaNota**, en singular. Reemplaza «Grabador de voz Delta» en encabezado, título inicial y dinámico de la pestaña, presentación de Ajustes y nombre accesible de navegación.
- **Prueba Delta 11** permanece como identificación de desarrollo en el pie y los diagnósticos; el título de la pestaña conserva «Prueba Delta», incluso al grabar o transcribir.
- Se actualizan referencias de identidad vigentes en README, AGENTS y CLAUDE. Se preserva el historial de nombres/versiones anteriores.
- Sin renombrar repositorio, URL, rutas, funciones, IDs HTML, claves localStorage/IndexedDB ni datos guardados. Sin cambios en grabación, Whisper, edición, exportación o estilos.
- Base: `4539aa77679437b703b2666d1ecce2231a5d764d`, rama `chore/dictanota-name`. Verificación: 79/79 pruebas automáticas aprobadas; revisión de textos y título dinámico. Fusión/CI/publicación se informan separadamente al entregar. No se repiten pruebas físicas de audio por tratarse solo de identidad visible.


## Delta 11 · Legibilidad, controles con una mano y teclado — 15/11/2026

**Base:** `e561eb7eb968f15b21aee5aebd188cc69d9164e2`, rama `fix/mobile-ergonomics`. La distribución propuesta se comunicó antes de editar: conservar tres vistas/estilo oscuro, tamaño configurable, controles inferiores y adaptación de espacio/teclado. Se registra que el usuario informó haber probado la versión anterior de feedback de texto; sin detalle de dispositivo/casos y sin extrapolar a esta revisión.

### Cambios progresivos

- Lectura y comodidad en Ajustes: Compacto/Normal/Grande. Editor ~16,2/18/21,6 px y menús, ayudas y controles escalados con mínimos legibles. Se conserva el 18 px previo como Normal y se permite zoom del navegador. `textSize` se guarda como campo opcional validado de CKEY histórico; no hay migración ni cambios al texto/exportaciones. Fallo de almacenamiento se avisa sin deshacer la elección visual de sesión.
- Áreas principales de al menos 48 px, más separación entre botones (10–12 px), rótulos que pueden envolver. Pausar y Detener conservan diferenciación y accesibilidad inferior. Grabar aparece también en Texto junto a Anonimizar/Guardar, reutilizando exactamente el comando #rec y la opción Empezar de cero; no es una captura nueva paralela.
- Herramientas Corregir/Copiar/Seleccionar/Compartir movidas como grupo directo de la tarjeta y sticky al desplazar notas largas. Con teclado o poca altura táctil dejan de flotar para no ocupar permanentemente la zona de escritura; quedan disponibles en su lugar, junto a la corrección contextual existente.
- Altura real del dock observada con ResizeObserver y márgenes inferiores calculados: captura, avisos y letra grande no dependen de un margen fijo que pueda quedar corto. Medidas agrupadas por requestAnimationFrame; sin polling ni timers nuevos. Fallback a MutationObserver si falta ResizeObserver.
- Meta viewport permite al navegador usar interactive-widget=resizes-content. VisualViewport/foco/escala/altura permiten inferir teclado en dispositivos táctiles pequeños (hasta 1024 px) y ubicar barra sobre él si solo se reduce viewport visual; si layout se redimensiona no se duplica el desplazamiento. Se conserva referencia de altura ante foco transitorio en botones y se reinicia con cambio importante de ancho. Evita tratar zoom por gestos como teclado. No cambia foco, selección ni contenido desde layout.
- Barra compacta con teclado o pantalla táctil de poca altura: mantiene comandos, navegación textual, estado principal y cancelación; omite iconos y detalle secundario del aviso. No oculta errores. Cuadro de corrección alineado y limitado al viewport visible, con scroll interno. Estilo oscuro conservado, sin agregar efectos decorativos.
- **Sin cambios de motor:** 12 funciones críticas comparadas idénticas a base: makeSegmenter, workerBody, startCapture, stopCapture, toMono16k, ensureModel, pump, onSegment, startWhisper, stopWhisper, appendMachine y setPaused. No se modifican calidad, CPU/GPU, audio ni cola de Whisper.

### Verificación y límites

- **Código:** documentado en esta rama; fusión/CI/Pages se informan por separado al entregar.
- **Local:** `node --test tests/delta.test.mjs`: **79/79 aprobadas**, `git diff --check` limpio. Pruebas nuevas de teclado (viewport visual y layout, offsets, foco, zoom, escritorio), tamaños válidos/fallback, persistencia sin perder configuración y fallo de almacenamiento, reutilización de controles y margen según altura real.
- **Firefox 153/Linux, interfaz:** 320/360/412/760/1365×915 con tres tamaños: sin desborde horizontal ni botones principales recortados, alturas >=48 px, preferencia conservada al recargar, nota ficticia larga y corrección por diálogo. Grabar desde Texto, Pausar/Reanudar y Detener accionaron comandos con captura simulada mientras se desplazaba. Horizontal 915×412 también aprobado, dock de captura menor de 300 px y controles dentro de pantalla.
- **Teclado simulado:** pruebas a 320/360/412/760 con foco editable y reducción de 330 px del viewport visual, y layout completo a 470 px; barra sobre zona de teclado sin doble inset, corrección dentro del área visible, cambio de foco a botones/diálogo sin perder compacción, restauración al cerrar. Se inspeccionaron capturas de móvil/Grande, teclado simulado y grabación.
- **No confirmado físicamente:** teclado Android, teclados flotantes, pantalla dividida, navegador del Motorola, micrófono/grabación reales en esta revisión. La detección de teclado es heurística; un navegador que no notifique geometría puede no activar compacción. No se asegura compatibilidad universal ni se midió rendimiento/batería. La captura de prueba fue simulada, no inferencia real.
- **Prueba del usuario:** README → Lectura y uso con una mano. Validar tamaño/persistencia, nota larga, scroll, Grabar en Texto, Pausar/Detener, teclado abierto/cerrado, corrección y horizontal. Repetir con datos ficticios antes de dar por verificada la revisión en el Motorola.

Referencias técnicas: [VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport), [meta viewport / interactive-widget](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport). No dependencias nuevas ni servicios/telemetría.


## Delta 11 · Explicar el texto por fragmentos durante la grabación — 15/11/2026

**Base:** `14e8dbe757f0b02a670df3d903ae60bdcedb8cdd`, rama `fix/transcription-feedback`. Revisión técnica y propuesta comunicadas al usuario antes de editar. Se respeta la decisión previa de dejar en pausa el desarrollo del dictado del navegador. Mismos modelos, almacenamiento y URL.

### Evaluación previa

- **Dictado local del navegador:** ya solicita `interimResults=true`, muestra provisional separado y agrega finales sin duplicados. Esa API admite parciales si el motor los entrega. En el celular del usuario está deshabilitada; no se intenta otra habilitación ni se añade dictado remoto.
- **Whisper de Delta:** ya puede transcribir y agregar partes mientras se sigue grabando, pero el primer resultado necesita reunir un fragmento, prepararlo e inferirlo. Corte por pausa después de ~20 s acumulados, máximo ~29 s de audio segmentado, o flush manual; silencio comprimido y procesamiento impiden prometer tiempo de reloj fijo. Grabaciones breves pueden entregar todo después de Detener.
- **Streaming de tokens:** [WhisperTextStreamer de Transformers.js 3.8.1](https://huggingface.co/docs/transformers.js/v3.8.1/api/generation/streamers) permitiría ampliar el protocolo Worker/UI y mantener un provisional mientras se decodifica una parte. No implica necesariamente repetir inferencia, pero tampoco elimina la espera de reunir el fragmento. Exige gestión de provisionales, errores/reintentos y más mensajes/renderizados. No se implementa en esta corrección.
- **Ventanas cortas/solapadas:** requerirían cambiar buffering/segmentación y reconciliación. Repetir inferencia de audio puede aumentar CPU/GPU, memoria, batería y calor; menos contexto puede afectar precisión. No se implementa ni se cambian cortes por requisitos de calidad/estabilidad. Estas consecuencias son evaluación de diseño, no mediciones físicas. [Parciales nativos: MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/interimResults).

### Solución implementada

- Placeholder explícito en el campo vacío durante captura/procesamiento/pausa, con ayuda accesible sobre cómo llegan los fragmentos. Nunca se escriben esas indicaciones dentro de `textarea.value` ni se guardan como nota. El texto confirmado y editado sigue acumulándose con la función existente.
- El aviso global único anteriormente desaparecía cuando el modelo estaba listo pero todavía no había ningún trabajo, aunque la captura seguía activa. Ahora permanece durante captura/pausa y dice «Grabación en curso · Whisper por partes»; explica que el texto puede llegar después de detener. Distingue reunir audio de procesar partes. Barra y spinner animado se ocultan/detienen al no haber procesamiento; cronómetro de captura existente conservado.
- Sin nuevos timers, modelos, inferencias, servicios ni dependencias. Actualizaciones visuales comparan valores y usan ciclos existentes. No se cuantifica ahorro ni consumo de batería. No se ocultan errores de preparación al mantener activo un aviso de grabación: `modelErr` retira el aviso para preservar el error y la ayuda remite a Grabar.
- Se conservan provisionales del motor nativo sin tocar su reconocimiento. La integración de feedback se limita a presentación.

### Verificación

- **Código:** documentado en la rama; fusión, CI y publicación se comunican por separado al entregar.
- **Automática local:** `node --test tests/delta.test.mjs`: **75/75 aprobadas**; `git diff --check` correcto. Pruebas de espera inicial, pausa, procesamiento, cancelación/error, mensajes nativos, estado global sin trabajos y render sin escrituras en la nota (setter de value prohibido durante la prueba).
- **Comparación contra base:** 11 funciones críticas idénticas: makeSegmenter, workerBody, startCapture, stopCapture, toMono16k, ensureModel, pump, onSegment, startWhisper, stopWhisper y appendMachine. Los cambios de interfaz no alteran audio, parámetros de inferencia, cortes ni acumulación final. No se volvió a medir precisión ni velocidad del modelo porque no se cambió su recorrido.
- **Interfaz Firefox 153/Linux:** anchos 412×915 y 1365×900, con estados de captura/inferencia simulados, verificaron campo vacío explicado, aviso único visible antes del primer fragmento, barra oculta al reunir audio, pausa/reanudación, dos frases acumuladas, procesamiento posterior, final y error de descarga visible. Inspección visual de vista móvil realizada. Flujo completo nativo con API simulada también aprobado (provisional, finales, pausa/reanudación y permiso denegado).
- **Dispositivos reales:** no hay nueva prueba de micrófono físico, Motorola ni batería. No se afirma que se vean palabras instantáneamente ni que todo teléfono procese más rápido que el audio. Prueba manual detallada en README → Texto mientras grabás.


## Delta 11 · Dictado del navegador: disponibilidad y sesiones — 15/11/2026

**Base:** `a3e44551a7510dcc1fa2d101ff4f40d3fa69428e`, rama `fix/native-dictation`. Alcance limitado al dictado del navegador; misma URL y sin migraciones, dependencias, telemetría ni servicios nuevos.

**Confirmación recibida del usuario:** Whisper ya funciona en Firefox. El usuario también indica que Whisper funciona desde su celular. No extrapolar estas confirmaciones al dictado del navegador ni a todas las funciones de Delta.

### Hallazgos

- Se permitía dictar con `processLocally` aunque faltara `available()`; eso no verificaba que hubiera un servicio/idioma local operativo. La existencia de SpeechRecognition no garantiza soporte local: algunos navegadores ofrecen solo un servicio remoto, o una superficie de API sin motor utilizable.
- Se pedía exclusivamente es-AR. Motores que documentan español local como es-ES podían rechazar el idioma argentino. No se obtuvo un error real del Motorola: estos son fallos identificados en implementación, no una causa física demostrada del cierre reportado.
- Se mostraba Escuchando, se borraba el editor y se activaba el cronómetro inmediatamente al llamar start(), antes de onstart. La pausa/reanudación usaba 250 ms arbitrarios; podía iniciar otra sesión antes de que terminara la anterior. Algunos errores no preservaban mensaje técnico y onend intentaba reinicios automáticos.
- Compatibilidad actual contrastada con fuentes primarias: [MDN Browser Compat Data](https://github.com/mdn/browser-compat-data/blob/main/api/SpeechRecognition.json), [Edge local](https://learn.microsoft.com/en-us/microsoft-edge/web-platform/speech-recognition-api), [Brave: implementación inicial solo inglés](https://github.com/brave/brave-browser/issues/56487), [idiomas locales según agente](https://github.com/WebAudio/web-speech-api/blob/main/explainers/on-device-speech-recognition.md), [errores de reconocimiento](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/error_event). Android no debe darse por compatible con modo local por compartir Chromium o tener dictado del teclado; Edge documenta canales/configuración específicos y Firefox desktop soporte según versión. Consultar README y, sobre todo, el resultado real de available().

### Corrección

- Opción «Dictado del navegador · solo local», deshabilitada desde el HTML y habilitada solo con API local y `available()` que confirme un idioma instalado. Consulta es-AR/es-ES/es en paralelo con plazo; prioriza un español instalado y muestra cuál se usará. El acento puede afectar precisión si se usa es-ES. Nunca se cambia a reconocimiento remoto.
- Preparación explícita del paquete e instalación solo con confirmación, con estados downloadable/downloading/unavailable y errores visibles. No se afirma que la descarga del navegador avance por estar en downloading. Reconsulta accesible; no se habilita con un paquete ausente ni con consultas fallidas.
- Máquina de sesión nativa: starting/listening/pausing/stopping. Solo onstart confirma grabación y prepara editor. Resultados finales sin duplicados; provisional visible en Grabar y Texto. Stop/pause esperan los últimos finales y onend; reanudar crea una instancia nueva después del cierre sin borrar texto ni reiniciar el cronómetro acumulado. Natural end no reinicia en bucle; cierre inmediato exige reconsulta.
- Errores muestran código original y mensaje técnico si existe; las excepciones síncronas conservan nombre/mensaje. onend y eventos tardíos no tapan errores ni escriben sobre sesiones nuevas. Permisos de micrófono se solicitan mediante el propio motor, sin abrir otra captura paralela para probarlos; se explican permisos del sitio y del navegador en Android.
- Plazos propios: disponibilidad 8 s, inicio 20 s, cierre 8 s, instalación 5 min. Al fallar se liberan controles y se conserva el texto confirmado. Una instalación puede continuar dentro del navegador aunque Delta agote su espera. Diagnóstico separado (60 líneas máximo), sin texto reconocido ni audio y sin nuevos console.log.
- **Whisper:** comparación de fuente confirmó que su motor, captura, remuestreo, Worker, cola, cancelación y reintento permanecen idénticos al commit base. Solo cambian las ramas nativas de los controles compartidos Grabar/Pausar/Detener.

### Verificación

- **Código:** documentado en esta rama; fusión, CI y publicación se informan separadamente al entregar.
- **Automática local:** `node --test tests/delta.test.mjs`: **71/71 aprobadas**, incluido todo el conjunto de Whisper; `git diff --check` correcto. Pruebas nuevas: API ausente/incompleta, consulta local, preferencia es-ES instalado frente a es-AR descargable, paquetes y consentimiento, errores/plazos, onstart antes de borrar, provisional, finales tardíos/sin duplicados, error que onend no tapa, eventos viejos, pausa/reanudación y excepciones de start/stop.
- **Navegador real:** Firefox 153/Linux confirmó ausencia de SpeechRecognition y la opción quedó bloqueada con motivo técnico claro. Prueba de interfaz completa en ese navegador con API inyectada/simulada: navegación Ajustes/Grabar/Texto, inicio confirmado, provisional visible en Texto, pausa/reanudación, final recibido al detener, permiso not-allowed y controles recuperados; diagnóstico sin las frases ficticias. Esto comprueba integración/UI, no un motor de reconocimiento real.
- **Límites del entorno:** Chromium local no inició por restricciones de sockets del sistema. No se eludieron permisos; se usó Firefox para la integración simulada. Sin Brave Android, Chrome/Edge reales ni Firefox 160 con voz física; no se certifica reconocimiento nativo en ninguno de ellos.
- **Prueba del usuario pendiente:** seguir README → Dictado del navegador → Prueba desde el celular. Si la opción está deshabilitada por API/idioma ausente, ese es el comportamiento esperado: usar Whisper. Si está habilitada, probar voz ficticia, provisionales en Texto, pausa, reanudación y final; ante fallo informar código y diagnóstico nativo, sin notas privadas.


## Delta 11 · corrección Firefox, plazos y reintento — 15/11/2026

**Alcance:** únicamente el bloqueo de Whisper y la recuperación del audio. Base de trabajo: `123ec9ba7085745c850b2457930e62030ae8e0bb`. No se cambian la URL, las claves de almacenamiento ni las ramas de respaldo.

### Investigación

- La transcripción en vivo NO consume el contenedor de MediaRecorder. Captura PCM con AudioWorklet/ScriptProcessor, segmenta, remuestrea a mono 16 kHz y transfiere una copia Float32Array al Worker. El Worker ejecuta Transformers.js 3.8.1/Whisper local. No hay POST a una API de Whisper: la red descarga librería, WASM y modelos; la respuesta de transcripción es un mensaje local identificado por id.
- MediaRecorder selecciona un MIME compatible por `isTypeSupported`. Firefox 153/Linux de prueba declaró WebM/Opus y Ogg/Opus, no MP4. El archivo persistido se reconstruye concatenando fragmentos ordenados por claves de seis dígitos; se decodifica completo, no parte por parte.
- Había promesas sin plazo en las respuestas del Worker, remuestreo y decodificación. Un motor que no respondiera dejaba `outstanding/busy` activos. Los errores de transferencia tampoco limpiaban todos los pendientes. El fallback al hilo principal podía bloquear la interfaz e impedir cancelación/plazos.
- **No se reprodujo ni se identificó la causa exacta del bloqueo en Firefox Windows del usuario.** La ruta CPU de Firefox es una medida de compatibilidad; no constituye prueba de que WebGPU o el códec fueran la causa. Referencia de hilos WASM/aislamiento y proxy: https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html . Eventos finales de MediaRecorder: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/dataavailable_event .

### Corrección

- Firefox usa CPU; sin aislamiento, un hilo WASM y sin proxy anidado. Android mantiene la selección anterior de CPU/GPU y la misma versión de librería/modelos.
- Worker obligatorio para poder interrumpir inferencia: si no puede crearse o falla, se informa y se puede reintentar. Se limpian timers y solicitudes al responder, fallar, cancelar o agotar tiempo; se termina el Worker en fallos estructurales. Reintentar crea otro motor. Se ignoran ids desconocidos y tareas de sesiones anteriores.
- Plazos absolutos: cargar modelo o transcribir una parte, 5 minutos por petición; activar AudioContext, 10 s; módulo Worklet/remuestreo/lectura, 15 s; decodificación, 30 s. No se reinician los plazos por recibir progreso. Small o descargas lentas pueden agotarlos. Pestañas/sistemas suspendidos pueden retrasar temporizadores.
- Se conserva el MIME completo del grabador, incluidos códecs; se solicita cerrar MediaRecorder antes de cortar las pistas, para recibir su último fragmento. Los detalles incluyen MIME, cantidades de fragmentos/bytes y etapa, sin audio ni transcripción en los nuevos diagnósticos.
- Botón de reintento en memoria para la última captura: preserva partes con voz aun si falla el motor, transfiere copias, pide confirmación antes de reemplazar texto y no vuelve a pedir micrófono. No persiste datos nuevos. Límite 32 MB: si se supera se descarta toda la caché temporal y se explica en diagnósticos. Se pierde al recargar/iniciar otra grabación. Para audio largo usar la opción existente Conservar también el audio y Transcribir este audio; retranscribir archivos no ofrece una caché parcial como completa.

### Verificación y límites

- **Código:** cambio en rama `fix/firefox-whisper`; estado de fusión/CI/Pages se comunica por separado en la entrega.
- **Automática local:** `node --test tests/delta.test.mjs`: **61/61 aprobadas**; `git diff --check` sin errores. Incluye protocolo load/run con id, éxito, timeout, crash, messageerror, respuestas inválidas, cancelación, reintento y limpieza de timers; configuración Firefox/Android simulada; plazos de audio y límite de caché.
- **Firefox 153.0/Linux headless, Whisper Tiny real/CPU:** descargó y preparó modelo; remuestreo 48→16 kHz correcto. WebM/Opus (108534 bytes) y Ogg/Opus (105128 bytes), 11 s de voz pública, se dividieron en tres fragmentos, guardaron en IndexedDB, reconstruyeron, decodificaron y transcribieron desde la aplicación; ambos entregaron texto, estado «Transcripción completa» e indicador apagado. Fuente pública: https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav ; conversiones locales con FFmpeg. El material es inglés y el pipeline pide español: se comprueba integración, no precisión de una nota en español. No se registró el texto de salida. El navegador de prueba necesitó omitir validación TLS del proxy de este entorno; **no se cambia TLS en la aplicación**.
- **Recorrido PCM y reintento en Firefox real:** la misma voz pública atravesó segmentación, remuestreo, Worker e inserción en el editor. Apareció el botón de reintento; al usarlo se reinició el motor, volvió a entregar texto y apagó el indicador. En ese reintento el analizador marcó una parte como repetitiva/casi numérica: se conservó el aviso de revisión, no se certifica exactitud lingüística.
- **Captura física no validada:** AudioContext no activó salida en el entorno headless, por lo que no se afirma que se haya grabado con un micrófono físico. La preparación PCM y el resto del recorrido se prueban por separado con la misma voz pública.
- **Firefox Windows y Motorola/Brave físicos:** pendientes de prueba por el usuario con este cambio. El éxito previo de Android no demuestra ausencia de regresiones en esta revisión. No se avanzó a otras funciones.

**Prueba manual:** seguir la sección «Corrección de bloqueo en Firefox» del README, con 20–30 s de voz ficticia, Base, pausa/reanudar, detener, cierre del indicador, reproducción del audio, retranscripción guardada y reintento tras cancelar. Repetir en Brave/Motorola cambiando de vistas durante la captura. Si falla, informar navegador/modelo, duración, etapa y detalles técnicos sin notas privadas.


## Entrega a otras IA · Estado consolidado — 15 de noviembre de 2026

**Alcance de esta entrada:** documentación de continuidad, sin cambios de funcionamiento.

- **Código de referencia:** rama `main`, aplicación única `index.html`, etapa **Delta 11**. GitHub Pages: https://ignabidon.github.io/notas-voz/. Cada IA debe comprobar el último commit de `main` antes de editar.
- **Documentos para leer en orden:** `AGENTS.md` (reglas y pendientes), `README.md` (arquitectura y uso), `CAMBIOS.md` (decisiones cronológicas); `CLAUDE.md` remite a estas reglas para Claude.
- **Verificado:** 53/53 tests automáticos de Delta 11; ejecución de publicación Pages finalizada con éxito. El usuario confirmó anteriormente grabación, TXT, recuperar el último audio, grabación larga y rediseño Delta 08.
- **Pendiente de prueba física:** las nuevas acciones de Delta 11 —guardar el audio con botón visible, compartir texto en Brave, copiar y seleccionar desde Texto—. **No presentarlas como confirmadas por el usuario.**
- **Lentitud observada:** 1:10 de audio con Whisper Small requirió ~2:10 de transcripción; evitar atribución sin comparar contra Base con el mismo audio.
- **Riesgo de información sensible:** texto, audios locales y descargas sin cifrado; evitar pacientes reales. La anonimización requiere revisión.
- **Normas para evitar pisar trabajo:** partir del `main` vigente; rama de trabajo específica; ediciones mínimas; conservar respaldos y claves históricas `gamma`; tests y CI antes de fusionar; actualizar CAMBIOS.md y separar claramente pruebas automatizadas de pruebas en Motorola.


## Delta 11 · Descarga de audio y acciones de texto accesibles — 15 de noviembre de 2026

- En Grabar aparece «Conservar también el audio», sincronizado con Ajustes → Audio. Debe activarse antes de comenzar. El botón «Guardar audio» descarga el audio guardado en Brave, reutilizando la función existente y respetando el bloqueo durante captura y transcripción.
- En Texto, «Corregir selección», «Copiar», «Seleccionar todo» y «Compartir» están visibles sobre el editor, sin pasar por Anonimizar.
- «Compartir» ahora usa Web Share para compartir TEXTO en vez de requerir que Brave comparta un archivo Word. Si falla o falta el soporte, intenta copiar al portapapeles y muestra una explicación. Conserva las advertencias por transcripciones incompletas y datos identificables; no envía nada sin interacción del usuario.
- Se conservan Whisper, audio anterior recuperable, exportaciones Word/TXT y almacenamiento, sin migraciones.
- Medición real reportada: Whisper Small necesitó 2:10 para procesar aproximadamente 1:10 de audio; no demuestra una regresión. Para medir velocidad, comparar modelos con el mismo audio y condiciones.
- Se agregan pruebas automáticas. Pendiente prueba de las acciones nuevas en Brave Android con contenido ficticio.


## Delta 10 · Progreso único y revisión de demora — 15 de noviembre de 2026

- Se quitan visualmente las duplicaciones de estado en Grabar y Texto **solo mientras** el indicador global fijo de Whisper está activo. Los elementos históricos siguen en DOM para que la lógica, cancelar y compatibilidad no se rompan. Cuando Whisper termina o falla, los mensajes finales y advertencias vuelven a mostrarse como siempre.
- La barra fija conserva el tiempo, texto de espera, fragmentos pendientes y control de cancelación. No se duplica la acción de cancelación.
- En Delta 09 el indicador global añadía operaciones sobre elementos del DOM cada 500 ms; Delta 10 comprueba si el texto, anchura o atributo cambió antes de escribirlos. Se reemplaza el selector CSS `:has()` de padding inferior por una clase de estado explícita.
- **Diagnóstico de velocidad:** se comparó el código de Delta 09 con Delta 08; no hay cambios en modelo elegido, motor Whisper, segmentación, carga de audio ni inferencia. La demora observada podría deberse a un modelo más grande (Small vs Base), procesamiento CPU o carga del dispositivo, pero **no se ha demostrado la causa** y tampoco se puede afirmar que optimizar la UI la resuelva. Los detalles técnicos muestran modelo, backend y segundos de procesamiento de cada parte, sin audio ni transcripciones.
- No se cambian modelos, audio, notas, claves de Brave ni recuperación del audio previo. Requiere prueba funcional real en Motorola y comparación controlada con el mismo audio.


## Delta 09 · Progreso fijo de Whisper e iconografía coherente — 15 de noviembre de 2026

**Solicitud del usuario:** cuando Whisper siga transcribiendo, mostrar su estado sobre los controles inferiores en **Grabar / Texto / Ajustes**, incluyendo un aviso de espera, y sustituir el sol de Ajustes por sliders con un lenguaje visual consistente.

- Se agrega **un único aviso fijo**, ubicado en el contenedor de navegación existente, visible en todas las vistas cuando Whisper está cargando o procesando partes pendientes.
- Durante una grabación con trabajo de Whisper, indica «transcribiendo en vivo» y permite seguir en Texto. Después de detener, indica «Esperá mientras se completa la transcripción», partes pendientes y tiempo de procesamiento.
- El indicador de avance es **animado sin porcentaje** cuando no hay datos suficientes; solo muestra porcentaje aproximado si hay métricas reales de partes ya procesadas, y nunca anuncia 100% antes de completar.
- El botón de cancelar del panel fijo delega al mismo control de cancelación ya existente, con su confirmación y la advertencia de texto incompleto. El panel se oculta cuando termina, se cancela o falla; no se duplica Whisper.
- Iconos de **Grabar (micrófono), Texto (documento), Ajustes (sliders)** normalizados al mismo tamaño, trazo y grosor, sin dependencias externas.
- Se agregan pruebas automáticas para estado, vistas, porcentaje indeterminado, cierre/cancelación e iconografía.
- Se conservan audio previo, Whisper, diccionario, anonimización, notas, descargas, claves de Brave y respaldo Delta 07. Ningún contenido de voz se incorpora a diagnósticos.
- **Validación pendiente:** prueba real desde Brave Android con material ficticio, pasando de Grabar a Texto mientras procesa, midiendo legibilidad y espacio útil sobre el teclado.


## Delta 08 · Tres pantallas reales con estética Android — 15 de noviembre de 2026

**Alcance:** rediseño estructural y visual. Se conserva un único `index.html`, un solo motor de grabación, un solo editor, un solo almacenamiento y la misma URL pública.

- **Grabar:** pantalla independiente con cronómetro central de gran tamaño, micrófono protagonista, estado de captura, marcas, audio anterior/recuperación y detalles técnicos plegados.
- **Texto:** pantalla de lectura y edición amplia (18 px en móvil), acciones visibles de corrección y copia y herramientas secundarias plegadas. Barra inferior contextual con **Anonimizar** y **Guardar .txt**.
- **Ajustes:** pantalla propia con módulos de calidad Whisper, audio, privacidad, diccionario y otras opciones (estas últimas plegadas). Todos los IDs y controles existentes se conservaron.
- Navegación fija con tres pestañas **Grabar / Texto / Ajustes**. Cambiar de pantalla solo cambia qué parte del mismo DOM se ve: no detiene la grabación, no vuelve a crear instancias ni borra borradores. Los enlaces directos `#localPrivacy` siguen abriendo privacidad.
- La barra inferior muestra un botón **Grabar** al estar en inicio, acciones de nota en Texto y ninguna acción destructiva adicional en Ajustes; durante una grabación mantiene **Pausar / Detener** en cualquiera de las tres pantallas.
- Se reemplaza la estética de varias tarjetas apiladas por superficies oscuras con acento verde agua, espacios claros, botones accesibles y una jerarquía visual móvil distinta de Delta 07.
- La versión anterior queda como respaldo en la rama `respaldo-delta-07-antes-de-delta-08`. No se cambian las claves de Brave, la lógica de Whisper, descargas TXT, audio, recuperación anterior, anonimización ni cifrado.
- **Pruebas:** validaciones de navegación, pantalla activa, preservación de elementos, tamaño de texto y controles; sigue pendiente prueba real en Brave Android para este rediseño.

**Pendientes posteriores:** comprobar la navegación de una mano, transcribir mientras se consulta Texto, pasar por Ajustes sin interrumpir audio, legibilidad con teclado visible y orientación vertical/horizontal. No usar datos reales sensibles durante pruebas.


## Delta 07 · Rediseño de legibilidad y una sola mano — 15 de noviembre de 2026

**Objetivo:** mejorar lectura y acciones desde el pulgar, evitando información visual innecesaria sin alterar las funciones ya verificadas en Motorola.

- Se elevan los tamaños de texto, etiquetas, advertencias, resúmenes y botones. El editor usa fuente de 17 px; se mejora el contraste de tarjetas, campos y texto secundario.
- La barra inferior se convierte en el punto de acción habitual: **Grabar / Anonimizar / Guardar .txt**; durante una captura sigue mostrando **Pausar / Detener**. El botón Grabar inferior llama al mismo control de grabación original y sincroniza su estado deshabilitado.
- Se amplía la navegación inferior a **Grabar / Texto / Ajustes / Privacidad**; este último acceso abre los dos paneles necesarios y salta directamente a los controles de almacenamiento.
- El panel de privacidad pasa al primer lugar de Ajustes. Se acortan descripciones de grabación, Whisper, micrófono, corrección y audio, manteniendo los avisos indispensables.
- Se consideran las zonas seguras del dispositivo y los controles de 48 px o más, con adaptación para pantallas estrechas y respetando reducción de movimiento.
- No se cambian los motores, modelos, grabación, tratamiento de notas, descarga TXT ni persistencia de datos; se agregan pruebas automatizadas de navegación y presentación.

**Validación:** GitHub Actions en la rama y `main`; falta confirmar en Brave Android el alcance del pulgar, lectura y accesos desde una pantalla pequeña. Se conserva el respaldo histórico y no se borra ningún dato del navegador.


## Delta 06a · Visibilidad y limpieza de textos locales — 15 de noviembre de 2026

**Alcance:** seguridad del texto, sin cambios en el audio ni en Whisper.

- Auditado `localStorage`: notas, borrador, deshacer, configuraciones, diccionario y tabla de asociaciones se conservan en el navegador. Audio y recuperación temporal permanecen en IndexedDB; los TXT descargados están fuera de ambos mecanismos.
- Se muestra un panel en Ajustes que explica la persistencia y falta de cifrado, y muestra únicamente el **número de notas** y existencia de borrador/deshacer; nunca enseña transcripciones en diagnósticos.
- Nuevo botón optativo **Borrar notas y borradores de Brave**: exige confirmación, rechaza borrado durante grabación/transcripción, elimina exclusivamente las claves históricas de notas/borrador/deshacer y vacía el texto en pantalla sin recrear automáticamente el borrador.
- **No se borra** audio, modelos, tabla de personas, diccionario, configuración ni archivos descargados; tampoco se realiza limpieza automática, migración o cifrado.
- **Riesgos pendientes:** contenido local y archivos TXT/Word sin cifrado, dependencias externas para modelos/bibliotecas y limitaciones del borrado lógico. Antes de usar datos reales habrá que definir cifrado, claves y copias de seguridad. No se promete borrado seguro.
- Verificación automatizada adicional; la prueba real del botón en Brave con datos ficticios está pendiente.

**Modelo Whisper:** Small ya está disponible en Ajustes. Se recomienda comparación controlada del mismo audio con Base y Small (guardar antes la transcripción base), sin modificar todavía el segmentador ni instalar modelos nuevos.


## Delta 05 · Primera etapa de confiabilidad de grabaciones largas — 15 de noviembre de 2026

**Objetivo:** evitar pérdidas silenciosas y facilitar la recuperación de audio cuando Brave retrasa la entrega de datos o Whisper se atrasa; sin alterar los modelos ni los fragmentos usados por Whisper.

- Si está activado «Guardar el audio», Delta solicita un fragmento adicional al **pausar**, agregar una **marca** o pasar la página a **segundo plano**. Esto complementa los fragmentos periódicos que proporciona MediaRecorder; no garantiza grabar con pantalla apagada.
- Vigila cuándo llegaron por última vez muestras del micrófono. Si pasan al menos 7 segundos sin recibirlas, muestra un aviso en la pantalla.
- Avisa cuando hay 6 o más fragmentos pendientes de transcribir; recomienda pausar para que Whisper alcance al audio. **No elimina fragmentos ni corta automáticamente la grabación.** El riesgo de memoria en sesiones extensas sigue siendo una cuestión a medir.
- Detecta cierres y errores de MediaRecorder y distingue si se detuvo a pedido o inesperadamente. Incluso con error, intenta conservar el último fragmento entregado. Anota solo estados técnicos, nunca audio o contenido de las notas.
- No cambia IndexedDB, la recuperación del audio anterior, Whisper, el dictado alternativo, la descarga TXT ni ajustes previos.
- **Verificación:** pruebas automáticas agregadas; aún hace falta ensayar una grabación ficticia de varios minutos con pantalla encendida en Brave Android.

**Límites:** con la pantalla bloqueada Android puede suspender el navegador y retrasar los eventos de audio. Los avisos y cortes preventivos no garantizan impedirlo. Para pruebas largas conviene activar «Guardar el audio» y conservar una copia descargada.


## Delta 04 · Recuperar el último audio anterior — 15 de noviembre de 2026

**Objetivo:** permitir deshacer el último reemplazo accidental sin crear una biblioteca permanente de grabaciones.

- Se conserva un audio principal y **una sola copia temporal anterior** para recuperarlo. Cada grabación nueva reemplaza la copia temporal más antigua.
- El audio anterior **no se borra antes de solicitar el micrófono**; se desplaza a recuperación en una transacción IndexedDB cuando se guarda el primer fragmento del nuevo audio. Así, si la captura falla, se conserva lo previo.
- El botón «Recuperar audio anterior» intercambia las referencias principal y anterior sin duplicar los archivos; también permite revertir el intercambio.
- «Borrar audio» elimina principal y temporal con aviso claro. La descarga TXT, Whisper, dictado local y claves históricas permanecen sin cambios.
- Se agregan pruebas automáticas de rotación, recuperación, primeras partes y ausencia de borrado prematuro. **Validación real:** el usuario confirmó en su Motorola que funcionó recuperar el audio anterior (15/11/2026).
- **Límites:** solo sirve para el último reemplazo; los datos todavía dependen de IndexedDB y no tienen cifrado. No se realizó limpieza automática del navegador ni migración.


## Delta 03 · Preparación y diagnóstico del dictado local — 15 de noviembre de 2026

**Objetivo:** evitar que el modo «Dictado del navegador» se active y se detenga sin información cuando falta el paquete de idioma o hay errores del navegador.

- Antes de habilitar el modo se consulta al navegador si el idioma **es-AR** está disponible para reconocimiento **local** (si implementa la consulta).
- Cuando el navegador ofrece instalar el idioma se muestra una acción explícita; **solo se descarga con confirmación del usuario**. Si no ofrece esa posibilidad se explica y se recomienda Whisper.
- Se conserva `processLocally = true`; **no se habilita ningún servicio de dictado remoto**.
- Los errores y cierres inmediatos informan qué ocurrió. Se evita intentar reiniciar indefinidamente tras una detención rápida.
- Se agregan tres comprobaciones automáticas; no se modifica la grabación Whisper, la descarga TXT ni el almacenamiento de notas.

**Validación:** 22/22 pruebas automáticas aprobadas en GitHub Actions. **Prueba real comunicada por el usuario (Brave en Motorola Android, 15/11/2026): el dictado del navegador no funciona; Whisper sí funciona.** No se obtuvo código de error ni detalles de disponibilidad, por lo que la causa exacta no está demostrada. La compatibilidad del reconocimiento local es limitada en Android y no corresponde habilitar dictado remoto automáticamente. Mantener Whisper como opción recomendada; no borrar el código alternativo sin autorización.


## Delta 02 · Guardar nota en archivo TXT — 15 de noviembre de 2026

**Objetivo:** que el botón principal «Guardar .txt» solicite la descarga de la transcripción como archivo de texto en el dispositivo (en la ubicación que use Brave para las descargas), sin enviar contenido a GitHub.

- Se reutiliza la exportación TXT, con título y texto; los archivos se nombran según el título o «nota».
- El guardado local previo permanece como respaldo; no se borra, migra ni limpia el contenido del navegador.
- Si falla el guardado local se avisa, en vez de asegurar que todo se guardó.
- El mensaje de descarga dice «solicitada»: el navegador decide si guarda el archivo y dónde.
- Se agregan dos pruebas automáticas con texto ficticio, sin información personal.
- **Validación:** CI de GitHub Actions para la rama y prueba real de descarga/apertura en Brave Android. Esta última sigue pendiente.

**Limitación intencional:** la lista de notas guardadas en el navegador sigue oculta y la descarga no es una copia integral de ajustes o audios. En esta etapa se cambió solo el comportamiento del botón Guardar.


## Delta 01 · diagnósticos v1 — 15 de noviembre de 2026

**Objetivo:** poder averiguar la causa de los números y errores vistos al grabar, **sin cambiar cómo se graba ni cómo se transcribe**. No se tocó el motor Whisper ni la lógica de corte del audio.

**Qué cambió (todo se ve en «Detalles técnicos de la última grabación»):**
- Cada parte transcripta muestra cuánta voz real tenía, su volumen máximo, el ruido de fondo y por qué se cortó (pausa en el habla, límite de ~29 s, o pausa/marca/fin).
- Las partes descartadas por no tener voz también quedan anotadas.
- Cada parte indica cuántas cifras tiene el texto y avisa «⚠ texto repetitivo» o «⚠ casi solo números». Solo se anotan cantidades: **nunca el contenido** de lo dicho. Si alguna parte se marca así, el estado final lo avisa.
- Los errores del motor Whisper indican en qué etapa ocurrieron (descarga de la librería, preparación del modelo o transcripción). También se anota si la placa de video falló y se pasó al procesador.
- Se anotan errores inesperados de la página, cierres del motor en segundo plano, pausas y reanudaciones (con el segundo en que ocurrieron) y cuántos segundos de audio llegaron del micrófono.
- Se agrega una línea con la versión («Delta 01 · diagnósticos v1»), navegador, núcleos, memoria, WebGPU y tipo de captura, para confirmar que el celular cargó la versión nueva.
- Pruebas nuevas: 9 (corte del audio con silencio, voz, silencios largos, grabaciones largas y golpecitos; análisis de texto; presencia de los diagnósticos).

**Estado:**
- Código guardado: ver commit de esta rama.
- Pruebas técnicas: las 16 pruebas (7 anteriores + 9 nuevas) pasaron en una ejecución local con el navegador integrado y un motor Whisper simulado; falta confirmar el resultado de GitHub Actions. No se ejecutó `node --test` localmente (esta computadora no tiene Node).
- Funcionamiento en el Motorola: **confirmado parcialmente** (15/11/2026). Una grabación ficticia de ~30 s con la pantalla encendida, modelo whisper-base: grabar, pausar, reanudar con el botón, detener y transcribir funcionaron sin errores ni avisos (62 y 10 palabras, ~3 palabras por voz-segundo; 17 s y 11 s de proceso en el procesador). **No reprodujo** los números/errores observados antes. Sin probar: grabaciones largas, pantalla que se apaga, ruido de fondo.
- Hallazgo: en el Motorola la transcripción corrió en el **procesador**, aunque el navegador informa WebGPU. Falta anotar el motivo (ver «diagnósticos v2»).

**Pendiente siguiente (paso 2):** reproducir el problema original (grabación larga, ruido, pantalla apagándose) y decidir con los detalles si hace falta filtrar partes sin voz o texto repetitivo antes de que lleguen al texto final.

## Delta 01 · diagnósticos v2 — 15 de noviembre de 2026

**Objetivo:** saber por qué no se usa la placa de video y cuántos hilos de cálculo usa el procesador. Tampoco cambia el motor ni el corte del audio: solo agrega notas en «Detalles técnicos de la última grabación».

- Se anota si se intentó la placa de video y por qué no se usó: el navegador no ofrece WebGPU, no encontró una placa compatible, falló al cargar o se eligió solo procesador. Si encuentra una, se anota su fabricante.
- Se anota cuántos hilos de cálculo usa el procesador y si la página está «aislada» (condición necesaria para usar varios hilos). Sin aislamiento, el motor trabaja con un solo hilo. En una prueba local en el navegador integrado se observó exactamente eso: 1 hilo y página no aislada.
- Al reanudar, se anota cuántos segundos duró la pausa.
- La línea de versión pasa a «Delta 01 · diagnósticos v2».
- Prueba nueva (17 en total): comprueba que estas notas existen. Además se probó el motor real (modelo tiny) en el navegador integrado: con placa de video disponible, la nota la detectó; con «solo procesador», se anotó la elección.
- Estado: código y pruebas locales listos; falta resultado de GitHub Actions y prueba real en el Motorola.

## Prueba Delta 01 — 15 de noviembre de 2026

**Objetivo:** una sola aplicación oficial, comprensible para el usuario y para distintas IA.

- Se copia Gamma Studio Diseño 07 como único `/index.html` activo.
- Se cambia el nombre visible a «Grabador de voz Delta · Prueba Delta 01».
- Se retiran de `main` los prototipos web previos, Android Alfa y su workflow antiguo.
- Antes de retirar nada se crea la rama de recuperación `archivo-antes-de-delta-2026-11-15`.
- Se mantienen todas las claves locales para notas, borrador, correcciones, ajustes y audio.
- Se incorporan README.md, AGENTS.md, CLAUDE.md y pruebas automáticas.
- Estado: revisión estática realizada antes de publicar; CI y pruebas reales Android pendientes de confirmar.

### Pendientes
- Números inesperados/errores de grabación informados en Motorola: falta «Detalles técnicos de la última grabación».
- Pruebas de permisos, Whisper con audio largo, persistencia del diccionario y borrador.
- Comprobar publicación de la URL raíz y mejorar estética cuando se valide la funcionalidad.

### Origen
Gamma Studio Diseño 06: corrección contextual. Diseño 07: barra inferior fija Detener/Pausar.

