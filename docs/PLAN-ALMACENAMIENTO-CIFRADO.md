# DictaVoz · Plan de trabajo del almacenamiento cifrado (tablero)

> **Este archivo no cambia de nombre.** Los pedidos que Ignacio copia y pega apuntan acá. Es el tablero: dice qué paso toca, qué hay que hacer en cada uno y en qué estado está.
> **Lo que Ignacio decidió** está en [DECISIONES.md](DECISIONES.md) (no se repite acá). **Los pedidos para copiar y pegar** están en [PEDIDOS.md](PEDIDOS.md). **El mapa de documentos**, en [INDICE.md](INDICE.md).
> **El diseño completo** (el porqué de cada cosa) está en [DISENO-ALMACENAMIENTO-CIFRADO-2026-11-16.md](DISENO-ALMACENAMIENTO-CIFRADO-2026-11-16.md). Si este tablero y el diseño no coinciden, vale el diseño; si el diseño y el código no coinciden, vale el código, y avisale a Ignacio.
> Última actualización: 17/11/2026, mediodía (Claude, solo documentación). **E1, E2, K1 y E3 unidos a `main`; la Etapa B quedó completa con B3.** **K2 quedó autorizado por Ignacio el 17/11** (ensayo y reemplazo; `DECISIONES.md`, A4 y A5); hoy existe solo el ensayo, en borrador (PR #61, de ChatGPT). **T sigue exigiendo su permiso explícito.**

## Si sos la IA a la que le pidieron un paso, empezá acá

1. Leé, en este orden: `AGENTS.md`, `SEGURIDAD.md`, `docs/INDICE.md`, `CONTINUAR-AQUI.md`, `docs/DECISIONES.md`, **este archivo** y, si hace falta el porqué, el diseño completo. Después, el código real que vas a tocar en `/index.html`. Revisá también `main` y los PR abiertos.
2. Buscá tu paso en la tabla de abajo. **Hacé solo ese paso.** Si su estado no es «Pendiente», si ya tiene **dueño**, o si alguno de los pasos de los que depende no está «Unido a `main`», frená y avisale a Ignacio. Para tomar un paso sin dueño, anotá tu nombre y tu PR en la columna «Dueño» **antes** de programar.
3. **Antes de programar, contale a Ignacio el plan en lenguaje simple.** Desde el 17/11/2026 (ver «Forma de trabajo» más abajo) no hace falta esperar su aprobación, **salvo en T**, donde sí hay que esperar su permiso explícito. K2 ya fue autorizado (A4, A5). Todos estos pasos tocan almacenamiento. Si sos otra IA, confirmá con Ignacio que el acuerdo vale también para vos.
4. Trabajá en una rama nueva desde el `main` actualizado. No uses la rama de otra IA. Revisá los PR abiertos antes de empezar.
5. Al terminar: pruebas, registro en `CAMBIOS.md`, PR, y **actualizá la columna «Estado» de este archivo en el mismo PR**. Unir a `main` (merge normal, sin squash) solo con el CI en verde y dentro del acuerdo del 17/11; **T no se une sin el permiso explícito de Ignacio; K2 se une según `DECISIONES.md` (A5)**.
6. Informá siempre en tres niveles: código guardado · pruebas técnicas · probado en el Motorola.

### Reglas que valen para todos los pasos

- Una sola app: `/index.html`. Sin servicios externos, telemetría, orígenes ni dependencias nuevas.
- **Nunca datos reales de pacientes** (el repositorio es público). Usá «Persona Inventada Uno», código `X-901`, «madre de X-901» y audios sintéticos.
- No renombrar claves históricas («gamma»). Datos protegidos solo con `vaultStore` o cifrados con una clave derivada de la clave de datos.
- No cambiar el formato de `notasvoz.boveda.v1` ni de los registros, salvo lo que el diseño indica para el paso T.
- No prometer en la interfaz «cifrado seguro» ni «sin nube». Ignacio es psicólogo, no programador: explicale en español rioplatense, claro y sin relleno.
- No adelantes otro paso «de paso». Si encontrás algo fuera de tu alcance, anotalo en el PR.

## Contexto de partida (dato del 16/11, histórico; el estado vigente está en `CONTINUAR-AQUI.md`)

El orden general del proyecto es **Etapa N → B → E → C → D**. Estos pasos son la Etapa E y lo que cuelga de ella.

| Etapa previa | Estado al 16/11/2026, 18:40 |
|---|---|
| **N** (pestañas «Dictar» y «Cuadernos») | **Unida a `main`** (PR #43 de ChatGPT, commit de merge `4d3cd01`), con permiso de Ignacio. Publicada. **Sin probar en el Motorola** |
| Documentación de continuidad | **Unida a `main`** (PR #42 de ChatGPT, `8a7ecb8`) |
| Este diseño y este tablero | **Unidos a `main`** (PR #44 de Claude), con permiso de Ignacio |
| **B** (jerarquía y densidad: B1, B2, B3) | **Completa.** B1 y B2 dentro del PR #48 (`2153dee`); **B3 el 17/11/2026** (menú «⋯» en las notas, lista con fecha corta y vista previa). Sin probar en el Motorola |

- **Ignacio indicó (16/11/2026, 18:06) que la próxima IA retome desde E1.** E1, E2, K1 y K2 no tocan la burbuja y pueden ir antes de la Etapa B. **E3 espera a B3** (el reproductor vive en la burbuja ya limpia).
- **Forma de trabajo (decisión de Ignacio, 17/11/2026, sesión con Claude):** el plan se le cuenta en simple al empezar, sin esperar aprobación; se une a `main` con el CI en verde; **T siempre con consulta previa; K2 ya autorizado (A4, A5)**; las pruebas que no puede hacer en el celular no frenan el avance (laboratorio ampliado y lista corta para el Motorola); lo guardado hoy en su celular son datos de prueba. Detalle en `AGENTS.md`.
- **Vocabulario:** desde la Etapa N, en la interfaz «hoja» se llama **«cuaderno»** y las pestañas son Dictar / Cuadernos / Anonimizar / Ajustes. Los ids internos, las claves y los nombres de funciones (`conv…`) no cambiaron. El diseño se escribió antes de esa unión y dice «hoja»: es lo mismo.
- El diseño cita líneas de `index.html` de `3383584`. La Etapa N cambió textos en el lugar (59 líneas), así que las referencias siguen sirviendo de guía; confirmá siempre en el código actual.
- Para resolver un cruce en `CAMBIOS.md` y `CONTINUAR-AQUI.md`, Claude unió `main` dentro de la rama del PR #43 (solo esos dos archivos, conservando ambos textos) antes de unirlo. `index.html` y las pruebas de ChatGPT no se tocaron; el CI volvió a pasar.
- `main` sigue **sin protección** en GitHub (verificado el 16/11). Lo activa Ignacio.
- PR abiertos: la lista vigente, con dueño, está en `CONTINUAR-AQUI.md`.

## Tablero de pasos (con dueño)

Orden decidido por Ignacio: **E1 → E2 → K1 → E3 → K2 → T → AO**. **Dueño** = quien tiene la rama o el PR abierto; en los pasos ya unidos, quien lo programó. No se toca el paso de otro.

| Paso | Qué es | Depende de | Dueño | Modelo sugerido (Claude / ChatGPT) | Estado |
|---|---|---|---|---|---|
| **E1** | Base nueva de audios por nota, sin activar | — | Claude | Sonnet 5.5 / estándar | Unido a `main` (`aab2b90`, PR #45) |
| **E2** | Cifrado de audios y guardado por nota | E1 | Claude (Opus 5.5); revisó ChatGPT | Opus 5.5 / el más capaz | Unido a `main` (PR #50, que integra el #47; 17/11). Sin probar en el Motorola |
| **K1** | Copia cifrada: exportar y verificar | E2 | Claude | Opus 5.5 / el más capaz | Unido a `main` (PR #51; 17/11). Sin probar en el Motorola |
| **E3** | Reproductor en la burbuja, espacio en Ajustes | E2, K1, B3 | ChatGPT (código, #54); Claude (cierre, #55) | Sonnet 5.5 / estándar | Unido a `main` (PR #55; 17/11). Motorola: reproducir, quitar audio y panel de espacio probados por Ignacio; adelantar/pausar y «Ver nota» sin probar |
| **K2** | Restaurar una copia cifrada | K1 | **ChatGPT: ensayo en instalación vacía (#61, unido). Claude: reemplazo, programado el 18/11 y PR #65** | Opus 5.5 / el más capaz | **Autorizado por Ignacio el 17/11 (ensayo y reemplazo).** Hoy solo existe el ensayo en el PR #61 (borrador, bloqueado por el candado universal sin bóveda). Se une con revisión cruzada sin hallazgos graves y CI en verde (A5) |
| **Capa** | Capa única de lectura y escritura de los registros cifrados (`vault.records`). Refactor sin cambio de comportamiento; el almacenamiento sigue en `localStorage` | K1 y K2 | Claude (Sonnet 5.5), desde un fork propio | Opus 5.5 / el más capaz | PR #64 contra `main` (base `9d47b99`). Sin probar en el Motorola: no cambia nada visible. Sin ella, una copia posterior a T saldría sin notas |
| **T** | Mudar el texto al depósito grande | K1, K2 y Capa | Sin dueño | Opus 5.5 / el más capaz | Pendiente. **Permiso explícito de Ignacio antes de programar.** Texto en la misma base que los audios (A9). Antes: K2 terminado |
| **AO** | Anonimización con original recuperable | T y Etapa C1 | Sin dueño | Sonnet 5.5 u Opus 5.5 / cualquiera | Pendiente. Antes: T y reglas de AO (Q2) |

Estados posibles: Pendiente · Plan aprobado · PR abierto (n.º) · Unido a `main` (commit) · Probado en el Motorola (fecha).

### Entrega 2 · arquitectura B (trabajo de ChatGPT, 17/11; **ninguno unido**)

Viene de la auditoría del PR #58 y de la decisión A1 de `DECISIONES.md`. Usa fases P0–P7. **No reemplaza** el tablero de arriba: lo cruza.

| Fase (auditoría §9) | Qué es | PR | Dueño | Estado | Equivale a |
|---|---|---|---|---|---|
| P0 | Aprobar la arquitectura B y la política de audio sin bóveda | #58 | Ignacio | Aprobada según PR #59 (A1, A2) | — |
| P1 | Confirmar y recuperar borradores | #59 | ChatGPT | PR abierto, borrador, con correcciones tras revisión | — |
| P4 (parcial) | Nota de solo audio; Whisper fallido conserva el borrador | #59 | ChatGPT | PR abierto, borrador | U14 |
| P2 | Biblioteca única de audio, sin activar; copia formato 2 (ensayo) | #60 (sobre #59) | ChatGPT | PR abierto, borrador, CI verde en su rama | Formato 2 de copia |
| P3 | Completar K2 | #61 (sobre #60) | ChatGPT | PR abierto, borrador, **bloqueado**: falta el candado de escritura universal sin bóveda. K2 autorizado (A4) | **K2** del tablero |
| P5, P6 | «Conservar audio» por defecto; retirar rutas históricas | — | Sin dueño | Pendiente. Autorizados por Ignacio (A6, A7, A8); dependen de A2 y de las copias | — |
| P7 | T, AO y Android, por etapas separadas | — | Sin dueño | Pendiente | **T** y **AO** del tablero |

**Orden obligatorio:** #59 → #60 → #61. Están apilados: si se une uno fuera de orden, los siguientes se rehacen. Hasta que se unan, valen como **trabajo en curso**, no como reglas.

**Sobre los modelos.** Los pasos de cifrado y de migración (E2, K1, K2, T) van con el modelo más capaz; los de interfaz y estructura, con uno intermedio. No usar modelos chicos (Claude Haiku, o los «mini» de ChatGPT) en nada de este tablero. Los nombres de los modelos de ChatGPT cambian seguido y dependen del plan: al 16/11/2026 la ayuda de OpenAI lista GPT-6 Astra y GPT-5.6 Sol para Codex; elegí el más capaz que te aparezca para los pasos delicados.

**Revisión cruzada.** En E2, K1, K2 y T, conviene que una IA programe y la otra revise el PR antes de unir (pedido de revisión al final).

## Pedidos para copiar y pegar

Están en [PEDIDOS.md](PEDIDOS.md), un solo lugar para cualquier IA. Los pedidos que antes estaban acá (con «esperá mi permiso» y el nombre viejo de la app) quedaron reemplazados: la forma de trabajo vigente es la de `DECISIONES.md`, W1 y W2.

## Qué incluye cada paso

Las secciones entre paréntesis son del diseño completo.

### E1 · Base nueva de audios por nota, sin activar
- **Hacer:** módulo de la IndexedDB nueva `notasvoz-dictanota-audio` (almacenes `meta` y `chunks`), funciones puras para partes, estados y revisión de consistencia, y el candado de una sola pestaña (2.3 y 2.5).
- **No hacer:** nada visible para el usuario. La base no se crea en el celular todavía. No tocar `notasvoz-gamma-audio`. Nada de cifrado ni de interfaz.
- **Listo cuando:** las pruebas de Node y Chrome cubren estados, mover y borrar, y demuestran que los datos de Delta 11 quedan intactos.
- **Vuelta atrás:** total.

### E2 · Cifrado de audios y guardado por nota
- **Hacer:** clave `K_audio` derivada de la clave de datos, clave propia por audio, fragmentos cifrados (2.4); activar el guardado por nota para grabaciones y archivos cargados, solo con la protección abierta y «Conservar audio» encendido (2.5 y 2.8); poner en cero la clave en bruto tras usarla; marcar como «ocupado» el cifrado de un archivo; **bajar el tope de carga a 30 MB** (2.7).
- **Decisiones de Ignacio que aplican:** D1, D2, D4, D7, D8. Con la protección apagada, «Conservar audio» sigue como hoy.
- **No hacer:** reproductor, panel de espacio, copia cifrada.
- **Listo cuando:** un audio grabado y uno cargado se guardan cifrados y se recuperan idénticos; ningún fragmento queda en claro; con «Conservar audio» apagado la base nueva queda vacía; los cortes dejan los estados de la tabla de 2.5.
- **Actualizar:** `SEGURIDAD.md` (regla 7 y hallazgo 1), `AGENTS.md` (frase «un audio cargado nunca se guarda»), `DISENO-CIFRADO.md`, y los textos de la interfaz que dicen que los audios no se cifran.
- **Vuelta atrás:** el código sí; los audios ya guardados quedan cifrados y sin usar, no se pierden.

### K1 · Copia cifrada: exportar y verificar
- **Hacer:** archivo `.dictanota` formato 1 (2.6), con opción «Completa» o «Solo texto» (D5); botón «Verificar copia»; archivo de ejemplo fijo con datos inventados en `tests/`.
- **No hacer:** restaurar. No recifrar nada: los registros y fragmentos se copian como están.
- **Listo cuando:** la copia se arma, se verifica, y se rechaza si está cortada, alterada o es de un formato más nuevo.
- **Sin probar todavía:** descarga de un archivo de cientos de MB en Brave/Android. Si falla, plan B del diseño (volúmenes).
- **Vuelta atrás:** total; solo agrega.

### E3 · Reproductor, persistencia y espacio
- **Hacer:** reproductor en la burbuja (según la Etapa E de `docs/PROPUESTA-ESTETICA-2026-11-16.md`, sin resaltar palabras), `navigator.storage.persist()`, panel de espacio en Ajustes, lista de audios sin nota (D8), aviso del audio suelto viejo (D7).
- **Decisión de Ignacio que aplica:** **D11: la reproducción no frena el autobloqueo.** A los 15 minutos sin tocar la pantalla la app se bloquea aunque suene un audio.
- **Listo cuando:** se reproduce, pausa y adelanta; suena un solo audio a la vez; al bloquear no queda ningún audio descifrado accesible.
- **Actualizar:** la frase de `AGENTS.md` «Audio solo a pedido, fuera de las burbujas».
- **Vuelta atrás:** total (interfaz).

### K2 · Restaurar una copia cifrada
- **Estado (18/11/2026):** instalación vacía: unido (#61). **Reemplazo: programado** (respaldo previo comprobado, comparación, doble confirmación, marca propia, diario reanudable, espacio, audios sin cifrar cifrados al restaurar); entregado como parche, falta revisión cruzada y prueba en el Motorola.
- **Hacer:** restaurar en una app vacía o reemplazando todo, con doble confirmación (D6). Dos recorridos: validar todo, después escribir; la cabecera se escribe al final (2.6).
- **No hacer:** mezclar con lo existente.
- **Listo cuando:** exportar → borrar → restaurar devuelve lo mismo, y una restauración cortada a propósito no deja la app a medias.
- **Vuelta atrás:** el código sí; un reemplazo ya hecho, no. Es el paso que puede borrar datos.

### T · Mudar el texto al depósito grande
- **Hacer:** los registros cifrados pasan de `localStorage` a IndexedDB (2.13), con los cuatro pasos de migración y su punto de confirmación. De paso, que el guardado de notas confirme recién cuando llegó a disco.
- **Condición:** exigir una copia cifrada verificada antes de migrar, o confirmación explícita de seguir sin ella.
- **Listo cuando:** datos de Delta 11 sembrados migran y quedan idénticos; un corte en cada paso no pierde nada.
- **Vuelta atrás:** difícil. Una versión anterior de la app no vería las notas. Es la única migración de datos del plan.

### AO · Anonimización con original recuperable
- **Hacer:** registro nuevo «originales» en `VAULT_KEYS`, ver el original manteniendo apretada la burbuja, «volver al original», diálogo de exportación con «Anonimizada» preseleccionada (2.3); comportamiento al quitar la protección (D3).
- **Decisiones de Ignacio que aplican:** D1, D3, D9.
- **Listo cuando:** guardar, cerrar y reabrir conserva el original; anonimizar dos veces no pierde el primero; ver el original no cambia el sello de guardado.
- **Vuelta atrás:** total; una versión anterior ignora el registro.

## Decisiones de Ignacio

Todas están en [DECISIONES.md](DECISIONES.md): D1–D13 (almacenamiento), U (experiencia), W (forma de trabajo), A (arquitectura B) y las preguntas abiertas (Q). No se copian acá para que no se desactualicen.

## Historial de este tablero

- 16/11/2026, 18:10 · Claude (Fable 5.2): creado junto con el diseño. Ningún paso empezado. Nada probado en el Motorola.
- 16/11/2026, 18:40 · Claude (Fable 5.2): con permiso de Ignacio se unieron a `main` los PR #42, #43 (Etapa N) y #44. Próximo paso: **E1**.
- 16/11/2026 · Claude (Sonnet 5.5): E1 programado con permiso de Ignacio (bloque apagado, sin cifrado, candado sin conectar). PR #45 unido a `main` (`aab2b90`) con permiso de Ignacio, merge normal. Motorola: sin probar.
- 16/11/2026, 18:40 · Claude (Opus 5.5): E2 programado con permiso de Ignacio, PR #47 abierto; sin unir. Decisiones del plan: **1a** (con la protección abierta, el audio se guarda solo cifrado; hasta E3 no se escucha desde la app) y **2a** (candado de una pestaña conectado para los audios). PR #46 cerrado a pedido de Ignacio (su cambio va acá). Detalle, casos aceptados y lo que no incluye: `CAMBIOS.md`. Motorola: sin probar. Conviene revisión cruzada de ChatGPT antes de unir.
- 16/11/2026, 19:20 · Claude (Opus 5.5): correcciones de E2 por la revisión de ChatGPT sobre `2c88ce1`, con permiso de Ignacio, en el mismo PR #47: no se puede quitar la protección con audios guardados (hasta AO); el audio no se cruza entre notas A y B ni se borra si lo usa otra; Guardar espera la confirmación del disco; una sola pestaña escribe todo lo protegido; audio incompleto marcado sin duración; cancelar quita lo agregado; audio dañado conservado. Prueba nueva `tests/e2-correcciones-browser.mjs` (dos pestañas reales, sin espacio, cortes). Detalle y límites: `CAMBIOS.md`. Motorola: sin probar. Pide una nueva revisión independiente antes de unir.
- 16/11/2026, 21:00 · Claude (Sonnet 5.5): segunda revisión de E2 corregida en el PR #47 (candado antes de escribir y falla cerrada; `audioParts` contra el borrador viejo; revisión completa del audio antes de ampliar o recortar; avisos veraces de ficha final y borrado). Sin unir, sin K1. Cortes de las pruebas simulados; Brave/Motorola sin probar. Qué debe comprobar la próxima revisión: ver CAMBIOS.md.
- 17/11/2026 · Claude: E2 integrado sobre el `main` con Clínica editorial (PR #50; el #47 tenía cruces en `index.html` y `CAMBIOS.md`). Revisión independiente del código combinado sin hallazgos graves; 159/159 Node y ocho suites de Chrome; prueba extra de laboratorio con el micrófono sintético de Chrome por la interfaz real. Registrada la forma de trabajo acordada con Ignacio el 17/11 y el avance real de la Etapa B (B1 y B2 en el #48). Motorola: sin probar. Próximo paso: **K1**.
- 17/11/2026 · Claude: K1 programado (plan contado a Ignacio al empezar, según el acuerdo del 17/11): formato 1 del archivo `.dictanota`, «Crear copia cifrada» y «Verificar una copia» en Ajustes → Privacidad, archivo de ejemplo fijo en `tests/`. Solo lee: no restaura ni modifica nada. Se agregó al formato una huella encadenada (`cadena`) en el bloque final; detalle en el diseño, 2.6. Con la protección apagada la copia lleva una contraseña propia y solo texto. Motorola: sin probar (descarga y selección del archivo en Brave). Próximo paso: **B3**, después **E3**.
- 17/11/2026 · Claude: **B3** hecho (no es un paso de este tablero, pero E3 lo esperaba): Copiar y Editar a la vista, Mover y Borrar en el menú «⋯»; lista de cuadernos con fecha corta y vista previa que se puede apagar. Solo presentación; un campo opcional nuevo (`listPreview`) en la configuración existente. Próximo paso: **E3**.
- 17/11/2026 · ChatGPT (Codex): E3 programado en el PR #54 (`d0f6b45`): reproductor por nota, panel de espacio y audios sin nota. Quedó sin cerrar: la prueba `tests/e3-browser.mjs` fallaba y no había documentación.
- 17/11/2026 · Claude (Sonnet 5.5): E3 cerrado sobre ese código, a pedido de Ignacio: prueba `e3-browser` arreglada (solo la prueba; seis corridas seguidas en verde), las diez suites de Chrome y 166/166 Node en verde, y documentos al día (`CAMBIOS.md`, `SEGURIDAD.md`, `AGENTS.md`, `README.md`, este tablero y la prueba corta del Motorola). Falta que Ignacio autorice unirlo. Motorola: sin probar. Próximo paso: **K2** (con consulta previa).
- 17/11/2026, mediodía · Claude (Sonnet 5.5): ordenada la documentación (solo documentación; PR de orden). Se agregó la columna «Dueño» y el cruce con la Entrega 2 (#58 a #61); los pedidos pasaron a `PEDIDOS.md`; el resumen de decisiones, a `DECISIONES.md`. Marcado como pregunta abierta (P3) que el PR #61 trae un ensayo de K2 sin permiso registrado. Motorola: sin probar.
- 17/11/2026, tarde · Claude (Sonnet 5.5): anotadas las respuestas de Ignacio: K2 autorizado (ensayo y reemplazo, se une con revisión cruzada sin hallazgos graves; A4 y A5), arquitectura B confirmada (A1 a A3), «Conservar audio» por defecto en instalaciones nuevas (A6), retirar compatibilidad y borrar datos de prueba viejos (A7, A8), T en la misma base que los audios (A9). Próximo: revisión cruzada de #59 → #60 → #61.
