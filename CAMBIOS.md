# Registro de cambios — Grabador de voz Delta

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
