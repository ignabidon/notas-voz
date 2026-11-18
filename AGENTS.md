# AGENTS.md — Instrucciones para ChatGPT, Claude y otras IA

> **▶ Este archivo contiene solo reglas permanentes.** El estado de hoy está en [CONTINUAR-AQUI.md](CONTINUAR-AQUI.md); lo que decidió el usuario, en [docs/DECISIONES.md](docs/DECISIONES.md); qué documento manda sobre cuál, en [docs/INDICE.md](docs/INDICE.md); los pasos con dueño, en [docs/PLAN-ALMACENAMIENTO-CIFRADO.md](docs/PLAN-ALMACENAMIENTO-CIFRADO.md), y los pedidos para copiar y pegar, en [docs/PEDIDOS.md](docs/PEDIDOS.md). No agregar acá carteles de estado ni decisiones: enlazarlas. Prueba física Motorola pendiente.

> **Forma de trabajo (acordada con el usuario el 17/11/2026 con Claude; detalle en `docs/DECISIONES.md`, W1 a W4):** el plan de cada paso se le cuenta en lenguaje simple al empezar, sin esperar su aprobación; se puede unir a `main` con el CI en verde (merge normal, sin squash); las pruebas que el usuario no puede hacer en el celular no frenan el avance; lo guardado hoy en su celular son datos de prueba. **T exige su permiso explícito antes de programar y antes de unir. K2 (ensayo y reemplazo) lo autorizó el 17/11 y puede unirse con revisión cruzada sin hallazgos graves, CI en verde y el bloqueante de las otras pestañas resuelto (`docs/DECISIONES.md`, A4 y A5).** Esta autorización la dio a Claude en esa sesión: **otra IA debe confirmarla con el usuario antes de aplicársela.** Reemplaza la frase «plan corto y permiso explícito antes de programar» que aparece más abajo y en el tablero.

> **⚠ SEGURIDAD — LEER PRIMERO: [SEGURIDAD.md](SEGURIDAD.md).** Hay una revisión de seguridad («pen testing») en curso desde el 15/11/2026, con reglas obligatorias para editar el código (política CSP, orígenes permitidos, huella de la librería MP3, prohibición de `eval`/`innerHTML` con datos), hallazgos abiertos y pendientes. La CSP y la huella MP3 **no están confirmadas en el Motorola**. No lo ignores ni repitas la revisión desde cero: continuala.

**Leer también README.md y CAMBIOS.md antes de editar.**

## Coordinación y autoría (acordado con el usuario, 16/11/2026)

- Registrar **solo en documentación** quién implementó cada entrega: ChatGPT, Claude u otro responsable confirmado, rama/PR, SHA base, alcance, pruebas y pendientes. Usar CAMBIOS.md y el informe de continuidad. No poner nombres de IA, créditos ni identificación del agente en la interfaz.
- Antes de comenzar, revisar main y PRs abiertos; no trabajar sobre una rama de otra IA ni atribuirle retrospectivamente cambios sin evidencia. Si hay trabajo concurrente, documentar qué archivos/área ocupa cada rama y coordinar a través del usuario/documentación. No afirmar comunicación directa entre agentes externos.
- Vocabulario vigente: **nota** = cada texto escrito o transcripto; **cuaderno** = conjunto de notas con nombre editable. Fecha/hora inicial del título, y sello de guardado inmutable por nota. Una nota con audio cifrado muestra un reproductor **a pedido** (E3): nada se descifra hasta tocar **Reproducir**, suena un solo audio a la vez, se libera al terminar, al pausar más de 60 s, al cambiar de cuaderno o de pestaña, al bloquear y al salir de la página, y no hay resaltado de palabras. El autobloqueo de 15 minutos **no** se frena por reproducir (D11).
- Primera etapa autorizada: tema claro y disposición de chat; inicio listo para grabar, acceso fácil a hojas. Navegación final y anonimización de hoja con original recuperable son siguientes etapas. Ver el estado de rama en CONTINUAR-AQUI.md.

## Una sola versión oficial
- Repositorio: ignabidon/notas-voz, rama activa: **main**.
- Única aplicación web: **/index.html**.
- Nombre visible: **DictaVoz** (antes DictaNota; las claves internas y la extensión `.dictanota` no cambian), etapa **Prueba Delta 11**.
- Publicación: https://ignabidon.github.io/notas-voz/
- No crear carpetas paralelas como delta-v2, nueva-gamma o copias index2.html.
- Versionar cambios mediante commits; documentarlos en CAMBIOS.md.
- Archivo inalterable de prototipos antiguos: rama **archivo-antes-de-delta-2026-11-15**. No usarla como fuente de desarrollo ni borrarla.
- Respaldo exacto antes del rediseño en tres pantallas: **respaldo-delta-07-antes-de-delta-08**. Conservarla.
- El aviso de transcripción es único y global dentro de `.studio-dock`; no duplicar Worker, temporizadores ni acciones de cancelación. Ocultar visualmente los antiguos indicadores solo si `body.delta-transcribing` está activo; conservar mensajes de error y finalización. Mantenerlo sincronizado con `updProgress`, `maybeDone` y cancelación.
- No renombrar el repositorio, cambiar la URL de Pages o modificar ramas ajenas sin solicitud del usuario.

## Funcionalidades que deben preservarse
1. Inicio, pausa, reanudación y detención de voz; marcas y cronómetro.
2. Etapa N: solo cambian nombres visibles; ids grabacion/transcripcion y claves históricas se conservan. Cuatro pantallas visibles de a una: **Dictar / Cuadernos / Anonimizar / Ajustes** (desde la fase 3 del rediseño, 16/11/2026, «Texto» se llama «Notas»: hojas con mensajes; el editor es el mensaje sin guardar; Guardar agrega una burbuja con la hora de guardado; la captura desde Audio crea hoja nueva; ver CAMBIOS.md y `docs/REDISENO-CONVERSACIONAL-2026-11-16.md`. Antes: **Audio / Texto / Anonimizar / Ajustes** (la primera se llamaba Grabar; el id interno sigue siendo `grabacion`; desde 16/11/2026; Anonimizar es pantalla propia y su botón ya no se repite en la barra de acciones). Cambiar de pantalla no debe detener la captura. Barra fija de **Detener** y **Pausar/Reanudar** mientras se graba. En Dictar, Grabar inferior solo cuando el círculo no está a la vista (IntersectionObserver; sin duplicar captura); en Cuadernos, Grabar secundario y Guardar principal solo con texto. El compositor vacío es compacto; escribir, editar o revisar una transcripción amplía el mismo `#text`. «Volver» lo minimiza sin descartar texto ni cambiar su cuaderno. No reemplazar ni duplicar el textarea ni guardar el estado visual en almacenamiento.
3. Whisper local, progreso, estado y diagnósticos de errores. Primera carga de modelos puede requerir internet.
4. Corrección contextual sobre selección en Android. **Aprendizaje automático de correcciones (pedido del usuario, 16/11/2026):** al editar el texto se guardan solas en el diccionario las correcciones que parecen errores de transcripción (`autoLearn`), con aviso y «Deshacer»; el consentimiento es el ajuste «Aprender de mis correcciones» (activado por defecto, `learnAuto` en CKEY). Nunca aprender nombres con mayúscula, cifras ni cambios provocados por la anonimización; no ampliar los filtros sin pedido del usuario. La regla de «Reemplazar siempre» del diálogo sigue siendo opcional.
5. Edición, borrador, notas, audio local, guardar, copiar y exportar.
6. Anonimización posterior (pantalla Anonimizar con explicación visible), revisar antes de compartir, deshacer, códigos/alias de personas. El audio guardado debe seguir siempre visible en la pestaña Audio (`#audioBox`, botón «Mis grabaciones») con accesos desde Texto y Ajustes. Un audio cargado desde el celular se transcribe y **solo se guarda cifrado con su nota**, con la protección abierta y «Conservar audio» encendido (paso E2, decisión del usuario del 16/11/2026); si no, no se guarda. Tope: 30 MB.
7. Advertencias al guardar mientras se graba o transcribe.

## Protección cifrada (16/11/2026; leer `DISENO-CIFRADO.md`)
- Notas, borrador, deshacer, personas y diccionario se leen y escriben **solo con `vaultStore`** (misma forma que `localStorage`). Nunca usar `localStorage` directo para esas claves: hay una prueba que lo exige.
- Lo que lee esos datos al arrancar va dentro de `vaultWhenReady(...)`, porque con la protección activada se carga recién al desbloquear.
- No bloquear mientras se graba o transcribe: lo controla `vaultSetHooks`. Si se agrega otro trabajo largo, sumarlo ahí.
- No cambiar el formato (`notasvoz.boveda.v1`, AAD y parámetros) sin versión nueva y migración. Una futura app de Android depende de él.
- **Audios (desde E2):** con la protección abierta y «Conservar audio», lo grabado y lo cargado van **solo cifrados** a `notasvoz-dictanota-audio`, unidos a su nota (bloque `AUDIONOTA` + funciones `an…` que lo usan). Todo fragmento pasa por `anSealChunk`; hay una prueba que lo exige. Sin protección, «Conservar audio» sigue usando la base vieja, sin cifrar: no decir lo contrario en la interfaz. Cifrar un archivo cuenta como «ocupado» en `vaultSetHooks` (`anBusyN`).
- **Correcciones de E2 (revisión de ChatGPT):** (1) **una sola pestaña escribe**: `vaultTakeTabLock` toma el candado al desbloquear o activar, antes de cargar datos; en la otra, `vault.readOnly` hace que `vaultStore` y las operaciones de cabecera fallen con `OtraPestana`. No escribir datos protegidos por otro camino. (2) **No se puede quitar la protección si hay audios guardados** (`vault.disableGuard`) hasta el recorrido completo de D3 en AO. (3) **Guardar espera** `vault.flush()` y `vault.saved(CONV_KEY)`; si falla, `convStore.revert` y el editor conserva texto y audio. (4) **Un audio se une solo a la nota donde empezó** (`convCtx`, `anLinkPending(job, …)`), nunca a una que ya tiene otro, y no se borra si lo usa otra nota (`convAudioInUse`). Cancelar una edición quita lo agregado (`anTruncateAudio`). Prueba: `tests/e2-correcciones-browser.mjs`.
- **Segunda revisión de E2 (PR #47):** (1) el candado (`vault.acquire`) se pide **antes** de escribir la cabecera o cualquier dato protegido (activar, desbloquear, recuperar); sin candado, o si falla o no existe Web Locks, la pestaña queda en solo lectura. (2) La nota guarda `audioParts`; cancelar nunca recorta por debajo. (3) Todo audio que se amplíe o recorte pasa antes por `anAudioHealth` (no escribe). Prueba: `tests/e2-revision2-browser.mjs`. Los cortes de las pruebas son simulados.
- **Burbujas y lista (B3, 17/11/2026):** en cada nota quedan a la vista **Copiar** y **Editar**; **Mover** y **Borrar** van en el menú «⋯» (`.conv-menu`, uno solo abierto a la vez, se cierra con Escape o al tocar afuera). Las acciones nuevas de una nota (por ejemplo las de audio de E3) se agregan a ese menú, no como botones sueltos. La lista de cuadernos muestra cantidad, fecha corta («Hoy 12:44») y una línea de vista previa que el usuario puede apagar (`listPreview`). El sello de guardado de cada nota no cambia.
- **Copia cifrada (K1, 17/11/2026):** bloques `COPIA` (formato y comprobación, sin acceso al almacenamiento) y `COPIA-USO` (botones) en `index.html`. **Solo lee**: una prueba falla si esos bloques escriben o borran algo. El formato 1 está publicado: no cambiarlo; un formato nuevo lleva número nuevo y su propio archivo de ejemplo fijo en `tests/`. No decir en la interfaz que la copia se puede restaurar hasta que exista K2.
- **Audios por nota, copia cifrada, mudanza del texto y original recuperable (plan del 16/11/2026; E1, E2, K1 y E3 ya en `main`):** el tablero con los pasos, su estado y los pedidos para cada IA es [docs/PLAN-ALMACENAMIENTO-CIFRADO.md](docs/PLAN-ALMACENAMIENTO-CIFRADO.md) (nombre fijo); el diseño, [docs/DISENO-ALMACENAMIENTO-CIFRADO-2026-11-16.md](docs/DISENO-ALMACENAMIENTO-CIFRADO-2026-11-16.md). Un paso por vez; el plan y el permiso se manejan según `docs/DECISIONES.md` (W1 y W2).

## Almacenamiento: preservarlo
Las claves de localStorage e IndexedDB mantienen nombres históricos con «gamma». **No renombrarlas por estética ni borrarlas.** Ejemplos: `notasvoz.gamma.v1`, `notasvoz.gamma.dict.v1`, `notasvoz.gamma.cfg.v1`, `notasvoz.gamma.draft.v1`, `notasvoz.gamma.undo.v1`, IndexedDB `notasvoz-gamma-audio`.
Son datos vinculados al origen de GitHub Pages, no al nombre de la carpeta. Cualquier migración exige plan, copia de seguridad y pruebas.

## Forma de trabajo
- Inspeccionar el último commit y el código de la función afectada antes de tocarlo.
- Explicar brevemente el cambio y limitarlo a lo necesario; no reescribir toda la aplicación.
- No incorporar telemetría, servicios externos o dependencias sin permiso. Cualquier dirección externa nueva exige actualizar la política CSP de `index.html`, la tabla de orígenes de SEGURIDAD.md y las pruebas de seguridad (fallan solas si se olvida).
- Datos del usuario (notas, títulos, etiquetas, personas, texto transcripto) nunca con `innerHTML`; solo `textContent`/`createElement`. Sin `eval` ni `new Function`.
- No usar datos reales de pacientes en ninguna prueba, captura o registro. No incluir conversaciones en diagnósticos.
- No prometer anonimización infalible ni cifrado seguro: son funciones experimentales.
- Probar con `node --test tests/delta.test.mjs` y revisar el CI en GitHub Actions. Sumar pruebas cuando se modifique una función crítica.
- Probar con datos ficticios en Motorola G56 5G: iniciar > pausar > reanudar > scroll > detener > transcripción > corrección > anonimización > guardar > reabrir.
- Registrar resultado y pendientes en CAMBIOS.md tras cada cambio.
- Si algo falla, consultar «Detalles técnicos de la última grabación» antes de modificar el motor de audio.
- Comunicar siempre **tres niveles separados**: (a) código guardado, (b) verificaciones técnicas, (c) validación real en Motorola. No declarar completado el tercer nivel sin una prueba real.

## Estado de entrega — 15/11/2026 (Delta 11)

**Punto de partida para cualquier IA nueva:** leer AGENTS.md, README.md y CAMBIOS.md; obtener el SHA actual de `main`; inspeccionar el código de `index.html` y el test correspondiente. No basarse solo en una conversación anterior o en la numeración de versión. Delta 11 es la versión vigente; el último código confirmado antes de este ajuste exclusivamente documental fue `36eb407e7ca7804c52f7462b725df72a81ca3b1c`.

- **Validado realmente por el usuario en Brave/Motorola:** grabar y transcribir; guardar TXT; recuperar el audio anterior; prueba de grabación larga y funcionamiento general del rediseño de tres pantallas. No inferir que todas las funciones añadidas posteriormente han sido probadas.
- **Delta 11, todavía sin validación real en Android:** «Conservar audio» y «Descargar audio» en Audio; «Compartir» texto mediante menú Android o copia alternativa; acciones visibles «Seleccionar todo», «Copiar» y «Corregir selección». El código y **53/53 pruebas automáticas** pasaron y GitHub Pages se publicó, pero estas interacciones deben probarse con datos ficticios antes de darlas por solucionadas en el teléfono.
- **Rendimiento conocido:** el usuario midió unos **2:10 de procesamiento para 1:10 de audio con Whisper Small**. No se conoce causa específica ni se demostró regresión. Comparar Base y Small con el *mismo* audio ficticio, mismo dispositivo y configuración; registrar backend CPU/GPU, duración por parte y eventuales errores sin registrar texto o audio. No modificar Whisper sin diagnóstico.
- **Diseño actual:** cuatro vistas Audio / Texto / Anonimizar / Ajustes; progreso único de Whisper sobre la barra inferior. No duplicar mensajes de procesamiento en las vistas ni cambiar íconos a estilos inconsistentes.
- **Seguridad pendiente (detalle y estado en SEGURIDAD.md):** localStorage, IndexedDB y TXT descargados no están cifrados. No probar con datos de pacientes reales. Decidir estrategia de copia de seguridad, cifrado y retención antes de habilitar uso sensible.
- **Audio:** hay un principal y una sola copia temporal recuperable. Conservar esa lógica, sin borrados previos a permisos ni migraciones de datos no solicitadas.
- **Método de continuidad:** cada IA crea una rama de cambio desde el `main` actualizado, toca solo los archivos necesarios, agrega tests, documenta en CAMBIOS.md, ejecuta CI y fusiona si corresponde. No sobrescribir cambios de otras ramas ni borrar respaldos. Confirmar por separado fusión, CI, publicación en Pages y prueba física.
- **Próximos pasos aconsejados:** validar Delta 11 en Brave; comparar rendimiento Base/Small; después continuar con mejoras pedidas por el usuario. No asumir que están autorizadas funcionalidades nuevas que no se hayan acordado.

## Nota histórica (no es un fallo vigente confirmado)

En una etapa anterior de Gamma se observaron números o errores en la transcripción sin diagnóstico reproducible. Se conserva el antecedente por contexto, pero **no debe atribuirse a Delta 11** ni tratarse como incidencia actual sin una nueva prueba.

## Corrección Firefox — 15/11/2026

- Mantener Delta 11 y la misma URL. La nueva marca BUILD contiene «corrección Firefox».
- Firefox fuerza CPU y configura WASM antes de crear sesiones. Android mantiene el backend automático. No se ha demostrado la causa exacta del bloqueo en Firefox/Windows del usuario.
- No restaurar el fallback de inferencia en el hilo principal: un cálculo síncrono allí impide garantizar cancelación y temporizadores. Si falla el Worker, informar y permitir reintentar en un Worker nuevo.
- Cada petición load/run tiene límite absoluto de 5 minutos; no renovarlo por progreso de descarga. Remuestreo/lectura/decodificación tienen plazos propios. Respuestas tardías no deben modificar una sesión nueva (`processingEpoch`).
- `retryAudio` es temporal, solo partes con voz, límite 32 MB sin copias parciales ofrecidas como completas. Se vacía al comenzar otra grabación. La retranscripción de archivos usa el archivo persistido, no una caché parcial. No cambiar claves de IndexedDB/localStorage.
- Suite: 61 pruebas. Ver CAMBIOS.md para ejecución de navegador y límites. El usuario confirmó posteriormente que Whisper ya funciona en Firefox (15/11/2026). No extrapolar esa confirmación al dictado del navegador ni a funciones nuevas.

## Dictado del navegador — 15/11/2026

- Mantener solo local y Whisper recomendado. No quitar `processLocally=true` para hacer funcionar un servicio remoto sin autorización expresa. No confundir el dictado del teclado Android con esta API web.
- No habilitar con solo constructor/prototype: exigir `available()` y paquete español instalado. Consultar es-AR/es-ES/es; informar la variante elegida. No prometer soporte por nombre de navegador ni atribuir una causa exacta al Motorola sin diagnóstico.
- `nativeSession` controla inicio, escucha, cierre y pausa. No marcar grabación ni borrar texto antes de onstart. Aceptar finales durante stop/pause; esperar onend antes de reanudar; no reiniciar automáticamente al terminar. Ignorar eventos de instancias anteriores.
- Plazos nativos separados de Whisper: consulta 8 s, inicio 20 s, cierre 8 s, instalación 5 min. No ocultar el código/error original. Diagnósticos nativos en nativeDiag (máximo 60 líneas), sin transcripciones/audio. Provisional en nativeInterim de Texto y en interim de Grabar.
- Motor, captura, Worker y cola de Whisper idénticos a `a3e44551a7510dcc1fa2d101ff4f40d3fa69428e`. Solo se ajustan las ramas nativas de los controles compartidos.
- 71 pruebas locales aprobadas, interfaz con API simulada y bloqueo real de API ausente en Firefox 153/Linux. Chrome no inició en este entorno por restricciones del sistema; ningún dictado nativo real con micrófono físico o Android validado. Ver README y CAMBIOS antes de continuar.

## Texto durante captura — 15/11/2026

- Mantener Whisper por fragmentos; no bajar minSec/maxSec, cambiar modelos, generación o audio para adelantar texto sin nueva evaluación. No confundir streaming de tokens de un fragmento ya reunido con escuchar/transcribir palabra por palabra en tiempo real.
- `editorFeedbackState`/`refreshEditorFeedback` solo modifican placeholder y ayuda asociada a textarea. Jamás insertar mensajes de interfaz en value/baseline, borradores o exportaciones. Se invocan desde ciclos/eventos existentes, sin timers nuevos.
- El aviso inferior sigue siendo único. Activo durante captura Whisper aun con cero trabajos; decir «por partes», distinguir pausa y reunir audio de inferencia. Sin barra/spinner animado cuando no hay trabajo. No esconder el estado de error de preparación (`modelErr`). La ayuda junto al editor explica el modo: no duplicar porcentajes/tiempos/cancelación allí.
- Dictado del navegador queda en pausa de desarrollo, conforme al usuario: no reintentar habilitar motores o servicios remotos. Se conservan provisionales y finales separados cuando una plataforma lo admite.
- 75 pruebas locales y UI Firefox 153 a anchos 412/1365 con estados simulados; flujo nativo simulado también pasó. No prueba física Motorola ni mediciones de batería. Ver CAMBIOS y README.

## Ergonomía progresiva — 15/11/2026

- El usuario informó que probó la versión de feedback de texto; no indicó cada caso/dispositivo. No extrapolar esa confirmación a esta revisión.
- Mantener cuatro vistas y misma identidad visual. `textSize` es un campo adicional opcional de CKEY existente, con compacto/normal/grande validados; no renombrar claves ni modificar notas/exportaciones al cambiar tamaño. Si falla persistencia, avisar y conservar aplicación en sesión.
- Grabar accesible también desde Texto, reutiliza #rec. Pausar/Detener inferiores siguen reutilizando controles originales. No duplicar lógica de captura. Respetar Empezar de cero al grabar.
- Herramientas de edición sticky dentro de tarjeta Texto; estáticas con teclado o poca altura táctil para dejar espacio de escritura. Mínimos táctiles 48 px en principales; separación 10–12 px. No recortar rótulos para hacerlos entrar.
- `initErgonomics` mide barra con ResizeObserver y usa eventos/RAF agrupados, sin polling/timers nuevos de teclado. Margen inferior dinámico; teclado inferido por foco y geometría, nunca certeza universal. Considerar viewport visual y layout, zoom, orientación y foco transitorio de botones. No cambiar foco ni texto desde medidas de layout.
- Barra compacta mantiene comandos/navegación/estado principal; ocultar solo detalles secundarios del aviso cuando teclado/poca altura. Cuadro de corrección dentro del viewport visual, desplazable.
- 79 tests locales y UI Firefox 153 a 320/360/412/760/1365, horizontal 915×412; teclado y captura simulados. Sin teclado/micrófono real Motorola. Audio/transcripción no modificados; leer CAMBIOS para límites.
