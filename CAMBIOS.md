# Registro de cambios — Grabador de voz Delta

## Delta 03 · Preparación y diagnóstico del dictado local — 15 de noviembre de 2026

**Objetivo:** evitar que el modo «Dictado del navegador» se active y se detenga sin información cuando falta el paquete de idioma o hay errores del navegador.

- Antes de habilitar el modo se consulta al navegador si el idioma **es-AR** está disponible para reconocimiento **local** (si implementa la consulta).
- Cuando el navegador ofrece instalar el idioma se muestra una acción explícita; **solo se descarga con confirmación del usuario**. Si no ofrece esa posibilidad se explica y se recomienda Whisper.
- Se conserva `processLocally = true`; **no se habilita ningún servicio de dictado remoto**.
- Los errores y cierres inmediatos informan qué ocurrió. Se evita intentar reiniciar indefinidamente tras una detención rápida.
- Se agregan tres comprobaciones automáticas; no se modifica la grabación Whisper, la descarga TXT ni el almacenamiento de notas.

**Validación:** revisar CI en GitHub Actions; falta prueba real en Brave Android. No se garantiza compatibilidad: depende de si el navegador implementa reconocimiento local y dispone del paquete es-AR.


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
