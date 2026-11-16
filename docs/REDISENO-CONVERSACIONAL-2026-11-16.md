# DictaNota — Documento de continuidad para otra IA
## Rediseño conversacional, bitácora rápida y biblioteca unificada

**Fecha de elaboración:** 16 de noviembre de 2026 (Argentina)  
**Estado:** especificación de producto/UX. **NO implementada.**  
**Autorización:** el usuario autorizó expresamente **publicar esta documentación de continuidad en GitHub**. No autorizó modificar el código de la aplicación, los datos, el diseño en producción ni desplegar funcionalidades. Solicitar permiso explícito antes de implementar.  
**Proyecto:** `ignabidon/notas-voz` · rama oficial `main` · aplicación https://ignabidon.github.io/notas-voz/  
**Punto de control consultado:** `main` = `b75cdeaaf04d722ad96da2080773e0218ec4b5ab`, commit del 16/11/2026 a las 03:30:25 UTC (00:30:25 Argentina). **Verificar nuevamente HEAD antes de trabajar:** el repositorio puede haber avanzado.

---

## 1. Resumen ejecutivo: qué se quiere lograr

DictaNota es una aplicación personal de grabación, transcripción local y gestión de notas, orientada hoy a web móvil y, en el futuro, a Android. Se acordó conceptualizar una **interfaz de estética Clínica contemporánea** y **lógica de conversación privada consigo mismo**: cada grabación rápida se transforma en un mensaje (burbuja con transcripción) dentro de una nota/conversación nueva; el usuario puede ponerle título más tarde o mover mensajes a una conversación temática existente.

**No es mensajería:** no hay destinatarios, envío real, servidores de conversación ni transmisión de contenidos por defecto. La metáfora «enviar» significa **registrar localmente** una entrada en su nota.

Objetivos principales:

1. Capturar una idea instantáneamente sin obligar a elegir título o destino.
2. Hacer de las grabaciones y transcripciones **dos representaciones de un mismo mensaje**, sin separación artificial entre Audio y Texto.
3. Mantener la **biblioteca** como destino prominente: recuperar notas, conversaciones, transcripciones y audios preservados.
4. Permitir reorganizar entradas después de registrarlas sin perder su fecha y hora originales.
5. Conservar edición, correcciones, aprendizaje de diccionario, anonimización, seguridad y exportación de la aplicación actual.
6. Diseñar componentes táctiles y una estructura que admitan migración futura a Android, sin comprometer esa migración ahora.

---

## 2. Decisiones ya aprobadas por el usuario — NO reinterpretar como opciones abiertas

### 2.1 Organización y navegación

- **Sistema híbrido (opción C)**: existe una **bitácora rápida** para registrar inmediatamente y existen **conversaciones/notas temáticas** que pueden contener múltiples entradas.
- Una **grabación desde la acción principal de captura rápida crea, por defecto, una nota/conversación nueva**. No se agrega automáticamente a la última conversación usada.
- La nueva nota se crea sin exigir título; admite nombre provisional basado en fecha/hora, luego renombrable. Ejemplos elegidos por el usuario: «Supermercado», «Días lunes».
- Tras grabar/transcribir, el mensaje puede **permanecer en la nota recién creada (predeterminado)** o **moverse a una conversación existente** por decisión explícita del usuario.
- El usuario puede seleccionar una nota/mensaje transcripto y añadirlo a una nota existente. **Mover**, en lugar de duplicar, es la recomendación de UX ya presentada y aceptada en términos generales; acompañar con «Deshacer» y evitar pérdida accidental.
- Si el usuario graba *dentro de una conversación abierta*, la propuesta es agregar ahí el nuevo mensaje; si graba desde el acceso global de **Nueva nota**, se crea una conversación distinta. No mezclar ambos comportamientos.
- La **biblioteca y los audios** deben conservar un lugar destacado, no quedar escondidos.

### 2.2 Modelo de contenidos

- **Mensaje/entrada**: unidad individual registrada mediante voz o escritura; puede contener texto transcripto, audio cuando fue conservado, observaciones y metadatos propios.
- **Nota/conversación**: contenedor con título editable y una o más entradas. Se presenta visualmente como chat personal.
- **Biblioteca**: índice desde el que se consultan todas las notas/conversaciones, textos/documentos y audios disponibles; no implica duplicarlos físicamente.
- El texto transcripto es editable y corregible; las aclaraciones son texto **del usuario**, separado semánticamente de los datos automáticos.
- La vista «Documento» puede unir los mensajes para lectura, revisión y exportación; es una **recomendación de diseño aceptada conceptualmente**, no una operación implementada ni una obligación de mantener copias redundantes.

### 2.3 Fecha y hora — decisión explícita final del usuario

> **Actualizado el 16/11/2026 (08:01) por el usuario:** el sello de la burbuja es el **momento en que se terminó de guardar** el mensaje (botón Guardar), no el inicio de la grabación. Todo lo demás de esta sección sigue vigente: es metadato, no se edita desde la app y no cambia al corregir, anonimizar, mover o exportar. La hora de inicio de la grabación puede guardarse como dato técnico aparte, sin mostrarse como sello. Ver 2.5.

**Regla obligatoria:** cada burbuja debe mostrar **fecha completa + hora originales** de registro, como el sello horario de un mensaje de chat, por ejemplo **`16/11/2026 · 10:42`**.

- La fecha/hora son **metadatos de la entrada**, **NO parte del texto transcripto**.
- El usuario **NO puede editar** desde la aplicación ese sello de tiempo original.
- No cambiarlo al corregir el texto, anonimizar, poner título, generar documento, exportar ni mover el mensaje entre conversaciones.
- Si el usuario necesita aclarar o cuestionar una fecha, escribe la aclaración **manualmente en el campo de texto ya disponible**, sin alterar el sello original.
- La fecha/hora de última modificación, si se muestra o guarda, será otro metadato claramente separado del registro original.
- **No confundir** las fechas mencionadas en el audio/transcripción («el jueves pasado») con el sello temporal de registro.
- Precisión técnica: el registro se deriva del reloj del dispositivo; **no es una certificación forense ni imposible de manipular fuera de la interfaz**.

**Detalle técnico recomendado, pendiente de validar en diseño técnico:** para grabaciones nuevas capturar una vez `recordedAt` en el momento en que el micrófono comienza realmente a capturar; para entradas escritas, `createdAt` cuando el usuario confirma/guarda el mensaje. Conservar el instante original en UTC/epoch y presentar hora/fecha local, respetando zona horaria y cambios de horario. NO atribuir una fecha inventada a registros antiguos que no permitan conocerla. Para audios importados, distinguir «fecha de importación» de «fecha de grabación original» cuando no sea comprobable.

### 2.4 Apariencia y uso

- **Estética seleccionada:** «Clínica contemporánea»: clara, sobria, profesional, fondos claros y azul petróleo/azules suaves; tarjetas legibles, información jerarquizada y controles táctiles sencillos. Estas elecciones superan preferencias estéticas más antiguas.
- **Burbuja de chat privada:** texto transcripto, reproductor si existe audio conservado, estado de procesamiento/corrección, acciones contextuales y sello **fecha + hora** siempre legible dentro de la burbuja, fuera del área editable.
- Componentes pensados para celular Android y uso con una mano; evitar recargar una pantalla con ajustes técnicos secundarios.
- La metáfora visual no debe inducir a creer que los mensajes se envían por internet ni que el audio se conserva cuando el usuario eligió no conservarlo.

---

### 2.5 Decisiones del usuario del 16/11/2026 (01:31, después de ver la propuesta)

- **Título de una nota nueva:** la fecha y hora del registro (por ejemplo `16/11/2026 · 10:42`). Se puede renombrar.
- **Cuándo se crea la nota:** solo cuando hay audio o texto válido. Un permiso denegado o una grabación sin nada no crean notas.
- **Audios que el usuario no conserva:** se descartan. No hace falta mantener una copia temporal «recuperable»; a lo sumo, pedir confirmación antes de descartar. (Reemplaza, para el diseño nuevo, la lógica de «audio anterior recuperable»; aplicarlo en la fase de audio, no antes.)
- **Audios y datos guardados hasta hoy:** son material de prueba. No hace falta migrar los audios viejos a la biblioteca nueva; el usuario puede borrarlos con el botón «Borrar» actual.
- **Notas viejas → formato nuevo (01:43):** **una burbuja por nota**. Cada nota guardada es un mensaje dentro de la conversación (por ejemplo, la de un paciente ficticio: una burbuja por cada sesión), con la fecha en que se guardó. Lo que no se guarda no aparece en ningún lado.
- **Cada burbuja:** transcribir, copiar el texto y llevarlo fácilmente a otro lado.
- **Trasladar todo el conjunto:** además de un mensaje suelto, se tiene que poder llevar **todos los mensajes de una conversación** (por ejemplo, todas las notas de un paciente ficticio en su hoja). Interpretación a confirmar: copiar/exportar la conversación entera de una vez; falta saber si también se quiere unirla a otra conversación.

### 2.6 Decisiones del usuario del 16/11/2026 (08:01) — reemplazan lo anterior donde choquen

- **Botón Guardar:** al terminar de grabar y transcribir, el mensaje queda **sin guardar** hasta tocar **Guardar**. Si no se guarda, **se descarta** (con una confirmación antes de descartar, según lo dicho a la 01:31). Lo no guardado no aparece en Biblioteca ni en ninguna conversación. Esto reemplaza el paso 3 y el 6 del Flujo A («conservar una entrada nueva sin exigir…» / «queda en Biblioteca automáticamente»).
- **Sello de la burbuja:** fecha y hora en que **se terminó de guardar** (`16/11/2026 · 10:42`). Inmutable desde la app. El título provisional de una nota nueva usa ese mismo momento.
- **Notas viejas:** una burbuja por nota con su fecha de guardado (coincide con la regla nueva).
- **09:14:** se **mantiene la recuperación automática** del texto sin guardar (si el celular cierra la app, al volver se ofrece Guardar o Descartar). **Trasladar el conjunto** = las dos cosas: copiar todas las notas de la hoja y pasarlas a otra hoja.
- **Fase 2 hecha (rama `rediseno-02-guardado-conversaciones-2026-11-16`):** sello `savedAt`, mover/copiar hoja completa, migración de notas viejas y guardado protegido; la app todavía no los usa. Ver CAMBIOS.md.
- **Impacto técnico (texto original, ya resuelto en la fase 2):** el modelo de la fase 1 usa `recordedAt` como sello; hay que agregar `savedAt` como sello visible y dejar `recordedAt` como dato técnico opcional. Revisar qué pasa con el borrador automático actual (`notasvoz.gamma.draft.v1`): sirve para recuperar texto si el celular cierra la app, pero choca con «si no se guarda, se descarta». Decisión pendiente del usuario.
- **Fase 1 (modelo de datos, sin cambios visibles):** autorizada e implementada en la rama `rediseno-01-modelo-conversaciones-2026-11-16`.

## 3. Nueva arquitectura de información propuesta

Se propone pasar de las **cuatro pestañas actuales** `Audio / Texto / Anonimizar / Ajustes` a **tres destinos principales**:

| Nueva pestaña | Propósito | Contenido y controles indispensables |
|---|---|---|
| **Notas** | Capturar y trabajar | Acción global «Nueva nota»/micrófono, conversación actual, burbujas de audio o texto, editar/corregir, renombrar, mover entrada, alternar conversación ↔ documento |
| **Biblioteca** | Encontrar y recuperar | Buscar notas, filtro por notas/audios/documentos, abrir conversaciones, recuperar/descargar/retranscribir audio cuando exista, estado local y respaldo |
| **Ajustes** | Configurar y proteger | Whisper, preferencia Conservar audio, diccionario/aprendizaje, tamaño de texto, privacidad, cifrado/huella, personas y códigos, copia de seguridad, diagnósticos |

**Anonimizar:** dejaría de ser una pestaña global y pasaría a ser una acción contextual de una nota o documento («Anonimizar texto»). Preservar el motor actual, previsualización, deshacer y tabla de personas/códigos; preferir una **versión anonimizada separada** para no destruir el original, sujeta a diseño y pruebas. Su prominencia no debe caer: acceso visible en menú de nota y en vista Documento.

**Texto:** deja de ser pestaña independiente, **no desaparece** como funcionalidad: edición, búsqueda, corrección, copiar, compartir, exportar y vista Documento pasan a la nota/conversación. No eliminar herramientas existentes.

**Biblioteca de audio:** debe persistir como sección propia dentro de Biblioteca, **incluso cuando el audio no esté transcripto**. No reemplazarla por una lista de mensajes sin gestión de archivos.

---

## 4. Flujos de uso — requisitos y casos borde

### Flujo A — captura rápida (predeterminado)
1. Abrir app y tocar el micrófono global («Nueva nota»).
2. Registrar `recordedAt` al inicio real de captura. Mostrar micrófono activo, cronómetro y controles Pausar/Reanudar/Detener accesibles.
3. Al detener, conservar una entrada nueva con su identidad y metadatos, sin exigir nombre de nota ni pregunta sobre destino.
4. Mostrar burbuja «Transcribiendo…» mientras Whisper procesa. El contenido llega **por fragmentos**, no se debe prometer palabra por palabra.
5. Al finalizar, mostrar texto y fecha/hora originales; si se conservó audio, mostrar reproductor; si no, no prometer reproducción posterior.
6. La nota queda en Biblioteca automáticamente **cuando la escritura local haya sido confirmada**. Puede renombrarse o moverse después.
7. Ofrecer acción secundaria «Agregar a nota existente», sin hacer obligatoria una pantalla de decisión o una confirmación de «Dejar como nueva».

**Casos borde:** permiso de micrófono denegado, captura que nunca comienza, detención inesperada, sin voz, transcripción fallida, falta de espacio, cerrar app, reintento y interrupción por el sistema. Nunca crear una nota vacía engañosa ni marcar como guardado algo que falló al persistirse. La conservación del audio y su recuperabilidad dependerán del modo elegido y del almacenamiento real.

### Flujo B — continuar conversación temática
1. Abrir «Supermercado» desde Biblioteca.
2. Grabar o escribir dentro de esa conversación.
3. La nueva entrada aparece en esa conversación con **su propio** registro de fecha/hora, no con la fecha de creación de la conversación.
4. Cada entrada se puede editar o mover sin cambiar su sello original.

### Flujo C — mover una entrada
1. Abrir menú de una burbuja o selección múltiple; elegir «Mover a conversación».
2. Buscar y seleccionar destino; confirmar solo si es necesario para evitar pérdida.
3. Realizar operación **atómica**: la entrada aparece en un solo destino, conserva audio/enlace, texto, `recordedAt`, identificación y asociaciones.
4. Mostrar «Deshacer» accesible; ante fallo, mantener el origen sin cambios.
5. No reescribir fechas, texto ni anotaciones. Evitar colisiones de identificadores y mensajes duplicados.

### Flujo D — documento y anonimización
1. Dentro de nota, abrir «Ver como documento» y combinar/leer el contenido en orden temporal.
2. Corregir texto y usar el diccionario existente, sin alterar metadatos.
3. «Anonimizar» produce vista previa y, preferentemente, salida independiente; indicar que puede fallar y requiere revisión.
4. Copiar, exportar, compartir o descargar solo por solicitud del usuario; advertir que los archivos exportados no heredan automáticamente el cifrado local.
5. Al exportar fechas, presentarlas como **metadatos** (separadas del contenido) según preferencia o formato, no insertarlas dentro del campo editable ni dárselas al diccionario como texto hablado.

### Flujo E — localizar y recuperar audio
1. Biblioteca → Audios muestra audios efectivamente conservados.
2. Permite localizar su conversación, reproducir, descargar, retranscribir, y revisar estado de guardado; las acciones deben basarse en datos realmente persistidos.
3. Un archivo **importado para transcripción** actualmente no se conserva por decisión explícita previa; respetarlo hasta autorización distinta.
4. Si un audio conservado no está asociado a una conversación, mostrarlo igualmente y ofrecer organización, sin borrado silencioso.

---

## 5. Modelo de datos sugerido, NO codificar sin estudio/migración

Esquema conceptual, no prescripción de claves de almacenamiento:

```text
Conversation (nota)
  id (estable)
  title (editable, puede ser provisional)
  createdAt (fecha de creación de conversación)
  updatedAt (actividad)
  tags? / estado?

Entry (mensaje)
  id (estable)
  conversationId (destino actual)
  kind = audio | text | imported_audio
  recordedAt / createdAt (sello original, inmutable en UI)
  text (transcripción o texto escrito, editable)
  textEditedAt? (distinto de recordedAt)
  audioId? (referencia solo si existe audio conservado)
  durationMs? (duración si se conoce)
  transcriptionStatus (pendiente / procesando / listo / error)
  notes? (aclaraciones del usuario, distintas de metadatos)
  source? (grabado / escrito / importado)

AudioAsset (si se conserva)
  id, storageRef, mime, durationMs, bytes, integrity/status
  recordedAt (si está comprobado)
  retention / cifrado (según capacidad real)
```

**No escribir timestamps como cadenas localizadas** que después cambien al mover o exportar. Usar almacenamiento consistente (UTC/epoch o ISO con zona) y convertir para mostrar. El campo de tiempo debe ser *write-once* en la lógica ordinaria y validar intentos de sobrescribirlo. Esto evita alteración accidental en la aplicación, pero no equivale a inmutabilidad criptográfica o certificación notarial.

**Revisión urgente del modelo actual:** en `index.html` se observó `validNotes()` con estructura `{id, text, title, ts, tags}`, sin entradas de conversación. La función de audio IndexedDB usa `notasvoz-gamma-audio` con stores `chunks` y `meta`, y `audioHistoryPlan` mantiene **un audio principal y un anterior**, no una biblioteca ilimitada de adjuntos por mensaje. El cambio propuesto exige diseñar nueva persistencia de mensajes y múltiples audios. **NO sugerir que ya existe esa biblioteca multi-audio ni agregar silenciosamente múltiples archivos al almacén histórico.**

### Migración y compatibilidad de datos heredados
- Conservar las claves históricas: `notasvoz.gamma.v1`, `.dict.v1`, `.cfg.v1`, `.draft.v1`, `.undo.v1`, `notasvoz-gamma-audio`, y los registros de protección. No renombrar por motivos visuales.
- Antes de migrar, crear **respaldo comprobable** y función de regreso a la versión anterior; no sobrescribir directamente los datos legacy con una estructura incompatible.
- Las notas antiguas ya tienen `ts`, pero comprobar **qué evento significa** en cada una (guardado, creación, actualización): no afirmarlo como hora original de grabación si no puede demostrarse. Identificar metadatos heredados sin inventar precisión.
- Planear migración versionada, idempotente y reanudable; resistir fallas de energía/cuota y datos corruptos; validar rollback.
- Al salir de la interfaz actual, las grabaciones que no se conservaron **no pueden aparecer mágicamente** en la nueva biblioteca.
- Si está activado el cifrado, mantener aislamiento de datos y comportamiento bloqueado durante migración; evitar copias en claro inadvertidas.

---

## 6. Estado técnico revisado del proyecto (16/11/2026)

**Fuente:** `main` consultada en GitHub, commit `b75cdeaaf04d722ad96da2080773e0218ec4b5ab`, junto con `AGENTS.md`, `SEGURIDAD.md`, `README.md`, `CAMBIOS.md`, `DISENO-CIFRADO.md` e `index.html`.

- Estado actual de interfaz: **Audio / Texto / Anonimizar / Ajustes**, no la arquitectura propuesta de tres pestañas.
- Transcripción local Whisper, grabación con pausa/reanudación y segmentación por partes. Mantener un solo motor, cola y aviso global.
- Audio en `IndexedDB` con capacidad actual de último audio + anterior recuperable. El usuario elige «Conservar audio»; importaciones no se conservan. La nueva biblioteca demandará resolver **múltiples audios persistentes y su ciclo de vida**, respetando límites del dispositivo.
- Texto y preferencias viven en almacenamiento histórico `gamma`; hay protección opcional de **notas, borrador, deshacer, personas y diccionario** mediante `vaultStore` y `vaultWhenReady`, con contraseña/recuperación/huella.
- **Audios aún no cifrados**. Descargas, copias y compartidos salen en claro. No afirmar lo contrario ni poner datos reales de pacientes en pruebas.
- `CAMBIOS.md` registra que el desbloqueo con huella en Motorola/Brave **sí fue confirmado** por el usuario en una prueba; otras comprobaciones (copiar y regenerar código, etc.) siguen pendientes según la documentación. Algunos textos de README/AGENTS conservan fragmentos históricos o contradictorios: tomar el **código + registro más reciente + pruebas** como base, señalar inconsistencias sin borrarlas arbitrariamente.
- Reglas de SEGURIDAD: CSP, sin nuevos dominios sin permiso, sin `eval`/ejecución dinámica ni insertar contenido del usuario mediante `innerHTML`, sin telemetría nueva, no incluir datos sensibles en diagnósticos.
- Pruebas existentes en `tests/delta.test.mjs`, `tests/browser.mjs` y `tests/cifrado-browser.mjs`; `CAMBIOS.md` registra 110 pruebas Node en el último cambio de recuperación. Confirmar la cifra actual antes de presentar resultados.
- La versión Android nativa futura se contempla, pero **no está desarrollada como parte de este rediseño**. La estrategia anterior evaluaba Capacitor; nuevas decisiones no implican iniciarla ahora.

---

## 7. Aspectos pendientes — recomendaciones, NO decisiones confirmadas

1. **Cuándo crear físicamente la nota vacía:** al comenzar captura o al obtener los primeros datos válidos; evitar registros vacíos en caso de denegación, y evitar perder capturas tras interrupciones. El usuario solo fijó la regla «grabación rápida → nota nueva».
2. **Significado exacto del timestamp en captura:** se recomienda instante de inicio efectivo de grabación, no fin de Whisper; validar comportamiento al pausar y para importaciones.
3. **Política de borrado/retención de audio:** si se mueve o elimina un mensaje, cuándo se elimina el archivo físico; si un audio puede estar referenciado por varios documentos; cómo evitar archivos huérfanos.
4. **Diseño de la vista Documento:** ¿vista derivada o documento editado y versionado de modo independiente?, cómo preservar las correcciones.
5. **Estado del texto entre burbuja y editor continuo:** garantizar que una edición se refleja en ambas sin duplicar ni romper aprendizaje de correcciones.
6. **Qué muestra la biblioteca cuando hay protección activada y está bloqueada:** no exponer títulos, contenido ni metadatos sensibles inadvertidamente.
7. **Búsqueda:** limitarla a datos ya descifrados/disponibles; no indexar contenido sensible en almacenamiento abierto por comodidad.
8. **Qué debe contener una copia de seguridad completa** al introducir múltiples audios y conversaciones; diseño compatible con futuro Android, sin afirmar que ya existe.
9. **Comportamiento ante almacenamiento lleno** y grabaciones largas; estimar capacidad y costos en un celular de gama media.
10. **Marcado de palabras dudosas:** propuesta UX previa (resaltado rojo suave y transparente, corrección rápida, navegación) **no implementada**; solo proponer detección con evidencia técnica, sin fingir confianza por palabra que Whisper no entregue. Es una línea de trabajo relacionada pero distinta, que no debe bloquear el rediseño conversacional.

---

## 8. Orden recomendado de trabajo para la próxima IA

**Fase 0 — lectura y diagnóstico (solo lectura, sin tocar código).**
- Confirmar el nuevo SHA de `main`, leer `AGENTS.md`, `SEGURIDAD.md`, `README.md`, `CAMBIOS.md`, `DISENO-CIFRADO.md` y pruebas.
- Diagramar las entidades actuales de notas, borradores, grabaciones, diccionario y cifrado; identificar puntos de escritura/lectura y pérdidas posibles.
- Enumerar incompatibilidades del modelo actual con mensajes múltiples; destacar la limitación de audio principal + audio anterior.

**Fase 1 — prototipos de UX (sin tocar la app).**
- Diseñar mockups navegables o pantallas de referencia para **Notas**, **Biblioteca** y **Ajustes** con estética Clínica contemporánea, incluyendo teclado, navegación inferior, burbuja con sello `dd/mm/aaaa · hh:mm`, transcripción en progreso, estado de fallo, menú mover, vista Documento y audio no conservado.
- Verificar ergonomía a 320, 360, 412 px, zoom/letra grande, orientación horizontal, foco del teclado, controles inferiores y capturas prolongadas.
- Presentar al usuario los mockups y decisiones aún abiertas. **Pedir aprobación explícita antes de implementar.**

**Fase 2 — diseño de migración y seguridad (propuesta técnica, sin ejecución destructiva).**
- Proponer modelo versionado de conversación + entrada + audio, migración y rollback; inventariar dependencias del vault y claves históricas.
- Diseñar estrategia multi-audio en IndexedDB y copia de seguridad compatible con Android futuro.
- Revisar amenazas: exposición en bloqueado, copia al portapapeles, exportación, anonimización, datos perdidos, regresiones.
- Entregar un plan por lotes pequeños que respete los componentes existentes.

**Fase 3 — implementación, SOLO TRAS autorización.**
- Crear rama desde el `main` actualizado; no editar `main` directamente ni borrar respaldos.
- Integrar nuevas estructuras **sin romper datos actuales**. Hacer primero migrador y pruebas, después interfaz y acciones.
- Preservar grabación, pausa, reanudación, Whisper, Worker, edición, diccionario, anonimización, audio, cifrado y exportaciones.
- Añadir pruebas automáticas y de navegador, CI; documentar cambios reales y riesgos en `CAMBIOS.md` / `SEGURIDAD.md` / `README.md` / `AGENTS.md` cuando corresponda.
- Informar separadamente: (a) cambios guardados/commits, (b) verificaciones técnicas/CI, (c) validación física del usuario en Motorola.

---

## 9. Criterios de aceptación (propuestos para pruebas; no presentarlos como aprobados todavía)

- Tocar micrófono global y dictar una frase de prueba ficticia crea **una sola** nota nueva, sin preguntas previas.
- La transcripción aparece en burbuja; su fecha y hora originales son visibles y **no editables**. Cambiar texto/título y transcribir de nuevo no cambian el sello.
- Dos grabaciones rápidas sucesivas originan **dos notas nuevas** por defecto (no se adjuntan por accidente a la última).
- Grabar desde una nota concreta añade una entrada **a esa nota**, sin cambiar mensajes anteriores.
- Mover una entrada de «Nota nueva» a «Supermercado» conserva su texto, audio conservado, identificador y fecha/hora; se puede deshacer y no queda duplicada.
- Biblioteca recupera todas las notas y **todos los audios realmente conservados**, no solo el último; audio no conservado se identifica como no reproducible.
- Texto editado, corrector y diccionario conservan comportamiento válido; cambios de anonimización no entrenan erróneamente el diccionario.
- Anonimización ofrece revisión y no destruye silenciosamente la fuente.
- Sin datos visibles mientras protección esté bloqueada; metadatos, títulos y borradores sujetos a las mismas reglas de acceso; audio no cifrado sigue señalado sin ambigüedad.
- Migración reproduce notas históricas sin pérdida, y preserva `ts` heredado sin atribuirle significado no confirmado.
- Si hay error de almacenamiento, no se muestra un falso «guardado»; reintentar no duplica entrada ni borra audio.
- Captura y controles siguen disponibles al cambiar de sección; navegación y teclado no ocultan Detener/Pausar.
- Exportación y copia de seguridad se prueban con datos ficticios; recuperación después de cerrar/reabrir también.

**Reglas de prueba:** no usar datos reales de pacientes. Para verificación física usar el Motorola G56 5G; sin esa prueba, no declarar Android validado.

---

## 10. Entregables esperados de la siguiente IA

1. **Informe de compatibilidad**: qué hay hoy, qué debe cambiar, qué se conserva, qué riesgos existen, con SHA verificado.
2. **Maquetas y flujo de interacción** de tres pestañas más estados de mensajes, sin implementar antes de aprobación.
3. **Diseño de datos y plan de migración** que proteja datos previos, audio histórico, cifrado y reversión.
4. **Lista priorizada de tareas** y matriz de pruebas/criterios de aceptación.
5. Solo si el usuario autoriza posteriormente: rama, commits, pruebas, CI y documentación actualizada.

### Frase de inicio recomendada para esa IA

> Continuá el rediseño de DictaNota a partir de este documento. Es una **especificación de UX, no una autorización de implementación**. Confirmá el SHA actual de `main`, leé los documentos obligatorios y primero presentá análisis técnico y maquetas de la interfaz Clínica contemporánea con tres pestañas (Notas, Biblioteca, Ajustes). Respetá la bitácora rápida: cada grabación global crea una nota nueva por defecto; el usuario puede mover el mensaje luego a una conversación existente. Cada burbuja muestra **fecha completa y hora de registro originales, como metadatos no editables**, separados del texto y de las aclaraciones. No pierdas la biblioteca de audios ni las protecciones existentes; el almacenamiento actual solo retiene el audio principal y uno anterior. No toques código, datos, GitHub ni despliegues hasta que el usuario apruebe una propuesta y autorice los cambios.

---

**Límite de este documento:** se confeccionó a partir de las decisiones expresas de esta conversación y una lectura de la versión de GitHub indicada. Los flujos, modelo y fases técnicos son **propuestas** pendientes de validación. Ninguna función nueva se declara existente ni probada. Su publicación en GitHub es **únicamente documental**; la aplicación no se modificó.