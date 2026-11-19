**PR #61 — bloqueo universal (corregido en rama, 17/11/2026, Claude):** toda pestaña toma el candado al arrancar, con o sin bóveda; la que no lo tiene no escribe nada (notas, borrador, ajustes, audios). K2 toma el candado antes de limpiar o escribir, y el lote solo se borra si su «firma» coincide. Probado con dos pestañas reales, cuota por fase y cortes reales (`tests/k2-candado-browser.mjs`). **Pendiente antes de unir:** revisión cruzada de estas correcciones y CI de GitHub en verde. Límite conocido: sin bóveda, un navegador sin Web Locks no puede excluir otras pestañas (sigue guardando como antes; K2 no restaura ahí).

> **K2 en ensayo — 17/11/2026 (PR #61, no fusionado).** Se añadió un restaurador experimental que exige instalación vacía, valida íntegramente los archivos `.dictanota` antes de escribir **y, desde el 18/11/2026, cifra al restaurar los audios que estaban sin cifrar en la copia (A11): nunca se escribe audio descifrado bajo una bóveda activa.** El **reemplazo** de datos (restaurar sobre una instalación que ya tiene datos) existe como `k2Replace`: exige un respaldo previo completo y comprobado, dos confirmaciones con lo que se perdería, una marca propia «restauración en curso» y un diario reanudable; sigue experimental y sin probar en el celular. La copia formato 2 aún omite audios históricos de `notasvoz-gamma-audio`; no es un respaldo integral del dispositivo. Pendientes los ensayos de cuota, cortes, dos pestañas, formato 1 y revisión independiente. No usar todavía con información sensible real. Detalle: `docs/K2-RESTAURACION-VACIA-2026-11-17.md`.

**17/11/2026 — PR #59 (segunda revisión, sin fusionar):** con bóveda activa, si falla el guardado del borrador al vencer la inactividad, la app muestra una cobertura de privacidad que exige contraseña y oculta la interfaz. **NO cierra la bóveda criptográficamente:** mantiene temporalmente el texto y las claves en RAM para evitar pérdida del borrador no confirmado; se debe liberar espacio y guardar al reingresar. La revisión de integridad del audio también se aplica a notas que contienen texto. Pendientes verificación en Motorola y evaluación futura de un bloqueo criptográfico seguro bajo fallo de almacenamiento.

## 16/11/2026 · Correcciones de lectura y edición del PR #48 (ChatGPT)

Cambios de presentación, estructura del editor y estado visual en memoria, autorizados por el usuario después de la revisión independiente. Se conserva un solo textarea `#text`, el borrador existente y su destino. Herramientas se mueve dentro del mismo editor; Volver no descarta, y Guardar/Cancelar conservan sus acciones existentes. Sin claves o datos persistidos nuevos, orígenes, dependencias, cambios de CSP, captura, Worker, modelos ni cifrado. Los audios de main siguen sin cifrar; E2/#47 continúa separado. Pruebas de laboratorio con datos ficticios; Motorola pendiente.

## 16/11/2026 · Etapa A estética (Claude, PR #41)

Solo presentación en Audio, Anonimizar, Ajustes y encabezado: sin nuevos datos persistidos, claves, dependencias, orígenes ni cambios de CSP, cifrado, parámetros de Whisper o almacenamiento de audio. Sin `innerHTML` con datos del usuario; íconos SVG en línea. «Procesamiento local» pasa a verse también en el celular (el texto no cambia; nunca «sin nube»). `#audioBox` y las acciones de audio siguen siempre disponibles; la tarjeta repetida «Descargar audio» solo se muestra si hay un audio. Prueba técnica local; **sin prueba en el Motorola**. Sigue abierto el hallazgo 4 (proteger `main`): los pasos para el usuario están en [docs/PRUEBA-MOTOROLA-Y-PENDIENTES-USUARIO-2026-11-16.md](docs/PRUEBA-MOTOROLA-Y-PENDIENTES-USUARIO-2026-11-16.md).

## 16/11/2026 · Presentación clara y chat (ChatGPT)

Sin nuevos datos persistidos, claves, dependencias, orígenes ni cambios de CSP, cifrado, parámetros de Whisper o almacenamiento de audio. El editor existente cambia de ubicación y sigue dentro de la barra protegida. Las notas/títulos siguen mostrándose con textContent. La anonimización con recuperación persistente de originales es un requisito de la etapa siguiente, no una garantía actual.

## 15/11/2026 · Claridad visual

Cambio de presentación y ayudas; sin datos persistentes nuevos, claves nuevas, orígenes, dependencias ni cambios de CSP/Whisper. Advertencias de anonimización, importación y borrado siguen visibles. Prueba física de CSP/MP3 en Motorola sigue pendiente.

## 15/11/2026 · Diseño compacto y controles de entrada

- Audio más compacto; herramientas de Texto en una fila desde 480 px, acciones secundarias menos destacadas; barra inferior más pequeña con medidas dinámicas existentes; Personas y códigos cerrado inicialmente; explicaciones de Ajustes abreviadas.
- validNotes valida estructura de notas y etiquetas al leer; un guardado que sustituya datos inválidos requiere confirmación. No cambia claves ni elimina automáticamente el almacenamiento original.
- Importaciones: máximo 200 MB y 15 minutos, comprobados con metadatos y plazo de 10 s ANTES de decodeAudioData; se verifica nuevamente duración del PCM. Los archivos sin duración verificable se rechazan. Grabaciones propias conservan comportamiento previo.
- Límite: los metadatos y la decodificación dependen del navegador. Esto reduce exposición, no garantiza una cota de memoria frente a códecs o archivos maliciosos. El timeout no cancela decodeAudioData. No se implementó cifrado, copia propia de Whisper ni cambios de acceso.
- Verificación local: 97/97 pruebas Node. Pruebas nuevas de almacenamiento malformado, tamaños, duraciones inválidas y orden de validación. Validación física Motorola pendiente.

# SEGURIDAD.md — Revisión de seguridad («pen testing») de DictaNota

**Leer antes de tocar `index.html`.** Este archivo es el registro vivo de la revisión de seguridad iniciada el 15 de noviembre de 2026. Otras IA: no repitan la revisión desde cero; continúen la lista de pendientes de abajo y actualicen este archivo y `CAMBIOS.md`.

- **Estado de la revisión:** EN CURSO. Se hizo una revisión estática del código publicado y una prueba dinámica de inyección. Quedan pendientes los puntos de la sección «Pendientes de la revisión».
- **Alcance:** solo la propia aplicación del usuario (`index.html` en `main`, su sitio de GitHub Pages y la configuración del repositorio). No se probó ningún sitio ajeno.
- **Regla de datos:** todas las pruebas usan información ficticia. Nunca datos reales de pacientes, ni en pruebas, ni en capturas, ni en diagnósticos.

## 17/11/2026 · Reproducción de audios (paso E3, hallazgo 1)

**[código + prueba técnica]** Con la protección abierta, un audio solo se descifra cuando el usuario toca **Reproducir**, un fragmento a la vez; la parte en curso se arma como `Blob` y se le da una URL temporal (`blob:`). Al terminar, pausar más de 60 s, cambiar de cuaderno o de pestaña, bloquear o salir de la página, se revoca la URL y se descarta la clave del audio de la memoria. Los datos cifrados en disco no se tocan al reproducir (la prueba compara el contenido antes y después).
- **Límite que sigue:** mientras suena, la voz está descifrada en la memoria de la página y accesible por esa URL. Es inherente a escuchar; no se anonimiza (D1).
- **Autobloqueo:** reproducir **no** lo frena (D11); la prueba fuerza el reloj de inactividad y verifica que el audio se libera.
- **Sin cambios:** claves, formatos, CSP, orígenes y dependencias. Un audio dañado o ausente no rompe la pantalla ni se borra: se avisa y el texto sigue.
- **Sin probar en el Motorola:** reproducción real en Brave/Android y `navigator.storage.persist()`.

## 17/11/2026 · Copia cifrada: crear y verificar (paso K1, hallazgo 1)

**[código + prueba técnica]** Ajustes → Privacidad → «Copia cifrada». Detalle del formato en `docs/DISENO-ALMACENAMIENTO-CIFRADO-2026-11-16.md`, 2.6.
- **Solo lee.** Crear o verificar una copia no escribe ni borra nada en `localStorage` ni en IndexedDB (hay pruebas que comparan todo antes y después). **No restaura**: eso es K2.
- **Qué viaja cifrado:** los registros de la protección tal como están guardados, los ajustes y el generador de códigos, y (en la copia «Completa») las fichas y los fragmentos de los audios por nota, sin recifrar. La huella (`bio`) no viaja.
- **Qué queda a la vista en el archivo:** la fecha de creación, el id de la protección, los parámetros para derivar la clave (sal e iteraciones), si es completa o de solo texto, y los nombres y tamaños de los bloques (nombres de registros como «conversaciones», identificadores aleatorios de audios y sus tamaños). **Ningún texto, título, nombre de persona, nombre de archivo ni audio en claro.**
- **Integridad:** cada pieza se autentica con AES-GCM y el bloque final cifrado lleva los totales y una huella encadenada de todo lo anterior: un archivo cortado, alterado, reordenado o mezclado con otra copia se rechaza entero. Un formato más nuevo se rechaza sin pedir la contraseña.
- **Con qué se abre:** con la contraseña o el código de recuperación que valían **al crearla**. Cambiar la contraseña después no cierra las copias viejas: si una contraseña quedó expuesta, hay que borrar las copias hechas con ella. La interfaz lo dice.
- **Protección apagada:** la copia igual sale cifrada, con una contraseña elegida para ese archivo (PBKDF2-SHA256, 600.000 iteraciones). Quien tenga el archivo puede probar contraseñas sin límite: conviene una frase larga. Lleva solo texto (los audios de «Mis grabaciones» no entran, D7).
- **Audios dañados o a medio guardar** no entran en la copia; se cuentan y se avisa. No se tocan.
- Sin orígenes nuevos ni cambios en la CSP: la descarga usa un enlace `blob:`, ya permitido. Crear y verificar cuentan como uso para el autobloqueo.
- **No probado en el Motorola:** que Brave descargue el archivo con la extensión `.dictanota`, que el selector de archivos lo deje elegir, y copias grandes (cientos de MB).

## 16/11/2026 · Segunda revisión de E2: candado antes de escribir, borrador viejo y audio dañado (hallazgos 1 y 7)

**[código + prueba técnica]** Rama `e2-cifrado-audios-por-nota`, sobre `745f36b`. Detalle en `CAMBIOS.md`.
- **Candado:** se pide **antes** de cualquier escritura de datos protegidos o de la cabecera (activar, desbloquear con contraseña o huella, recuperar con código). Sin candado: solo lectura, y la recuperación y la activación se rechazan sin escribir. **Si el navegador no ofrece Web Locks o da un error, falla cerrada** (solo lectura). Límite: no protege frente a una pestaña abierta con una versión anterior del código. No se declara inofensiva ninguna escritura fuera del candado.
- **Borrador viejo:** la nota guarda `audioParts` (partes de audio confirmadas, dentro del registro cifrado de cuadernos); cancelar nunca recorta por debajo de ese número.
- **Audio dañado:** antes de ampliarlo o recortarlo se revisan clave, detalle, posiciones y la etiqueta de cada fragmento; si algo falla no se toca y se avisa. Sin datos nuevos ni claves nuevas: `audioParts` es un campo más del registro cifrado de cuadernos.
**No probado en el Motorola ni en Brave; los «cortes» de las pruebas son simulados.**

## 16/11/2026 · Correcciones de E2 tras la revisión de ChatGPT (hallazgos 1 y 7)

**[código + prueba técnica]** Misma rama `e2-cifrado-audios-por-nota`. Riesgos verificados en `2c88ce1` y corregidos:
- **Pérdida de audios al quitar la protección:** la clave de los audios sale de la cabecera, que se borra al quitarla. Ahora **se impide quitarla si hay audios guardados** (también desde la segunda pestaña). Activar la protección en una pestaña vieja ya no reemplaza la cabecera que creó otra.
- **Dos pestañas:** el candado (`navigator.locks`) vale para **todo lo protegido** y la cabecera, no solo para los audios: la segunda pestaña lee, pero no escribe nada. Sin probar en Brave/Android; con la protección apagada, dos pestañas siguen pudiendo pisarse.
- **Audios cruzados entre notas** y **borrado de un audio que usa otra nota:** corregido; Guardar recién avisa cuando el cifrado llegó al almacenamiento.
- Un audio dañado se conserva sin tocar; uno incompleto queda marcado y sin duración.
**No probado en el Motorola.**

## 16/11/2026 · Audios cifrados por nota (paso E2, hallazgo 1)

**[código + prueba técnica]** Rama `e2-cifrado-audios-por-nota`. Con la protección abierta y «Conservar audio» encendido, lo grabado y los archivos cargados se guardan **cifrados** en `notasvoz-dictanota-audio`, unidos a su nota: clave propia por audio, envuelta con una clave derivada de la clave de datos (HKDF); AES-GCM por fragmento con AAD que lo ata a su audio, parte y posición. El nombre de un archivo cargado va cifrado. Sin protección, «Conservar audio» sigue guardando sin cifrar en la base vieja, como antes. **Queda visible sin la clave:** cantidad de audios, tamaños y fechas. **No probado en el Motorola.**

## 16/11/2026 · Protección cifrada (hallazgo 1)

**[código + prueba técnica]** Rama `seguridad-02-cifrado-2026-11-16`. El detalle está en `DISENO-CIFRADO.md`.
- Opcional, desde Ajustes → Privacidad. Cifra notas, borrador, deshacer, personas y diccionario con AES-GCM de 256 bits. Se desbloquea con contraseña (PBKDF2-SHA256, 600.000 iteraciones), con un código de recuperación o con la huella (passkey con WebAuthn PRF). Se autobloquea a los 15 minutos sin uso, pero nunca mientras se graba o transcribe.
- **Los audios todavía no se cifran.** Los TXT, Word, lo copiado y lo compartido salen sin cifrar.
- Sin orígenes nuevos ni cambios en la CSP: WebAuthn no usa red.
- **No probado en el Motorola:** huella en Brave, tiempo de desbloqueo y autobloqueo con la pantalla apagada.

## Reglas obligatorias para cualquier IA que edite el código

1. **Orígenes externos.** La página solo puede hablar con los servidores de la tabla «Orígenes permitidos». Agregar uno nuevo exige: permiso del usuario, actualizar la política CSP de `index.html`, actualizar esa tabla y las pruebas (`tests/delta.test.mjs`, sección «Seguridad»). Las pruebas fallan si aparece una dirección externa sin revisar.
2. **Sin ejecución dinámica de código:** no usar `eval`, `new Function`, `document.write`, `outerHTML` ni `insertAdjacentHTML`. `innerHTML` solo con texto fijo o vacío; los datos del usuario (notas, títulos, etiquetas, nombres de personas, texto transcripto) se insertan siempre con `textContent` o `createElement`.
3. **Sin envío propio de datos:** el código no usa `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon` ni `EventSource`. Las únicas conexiones son la carga de librerías y modelos (motor Whisper) y la librería MP3. Compartir y descargar ocurren solo por acción del usuario.
4. **Librería MP3 (`lamejs`):** se carga con huella SHA-384 (`integrity`). Si se cambia la versión hay que recalcular la huella del archivo exacto y actualizarla.
5. **Motor Whisper (`@huggingface/transformers@3.8.1`):** se carga con `import()` dinámico desde jsDelivr; el navegador no permite huella en ese tipo de carga. Mantener la versión fija. Cambiarla requiere probar CPU y placa de video.
6. **No ampliar la CSP por comodidad** (`unsafe-eval`, comodines `*`, `https:` genérico). Si una función deja de andar, mirar la consola del navegador: los bloqueos aparecen como «Content Security Policy» y dicen qué dirección o directiva falló.
7. **No guardar datos nuevos** (ni en `localStorage`, ni en IndexedDB) sin documentar aquí qué datos son y si quedan sin cifrar.
   - *16/11/2026, protección cifrada:* toda lectura o escritura de notas (`KEY`), borrador (`DRAFT`), deshacer (`UNDO`), personas (`PKEY`) y diccionario (`DKEY`) pasa por **`vaultStore`**, nunca por `localStorage` directo (hay una prueba que lo exige). Datos nuevos de pacientes van a una clave nueva agregada a `VAULT_KEYS`. Claves nuevas: `notasvoz.boveda.v1` (cabecera: parámetros y clave de datos envuelta, nunca en claro) y `notasvoz.boveda.v1.r.*` (registros cifrados; desde el 17/11/2026 solo se tocan por la capa `vault.records`, con prueba estática). No bajar las iteraciones de PBKDF2 por velocidad, no guardar la contraseña ni la clave en ningún almacenamiento y no mostrar texto en claro si la cabecera está dañada.
   - *16/11/2026, rediseño conversacional (fase 2):* clave nueva `notasvoz.dictanota.v2` con hojas y mensajes (títulos, textos, fechas de guardado). Está en `VAULT_KEYS` («conversaciones»): **cifrada si la protección está activa**, en claro si no. Desde la fase 3 la pantalla Notas la lee y escribe (solo a través del almacén cifrado). Los audios siguen sin cifrar. Copiar todo y Descargar .txt de una hoja salen sin cifrar.
   - *16/11/2026, audio por nota (paso E1):* base IndexedDB nueva `notasvoz-dictanota-audio` (`meta`, `chunks`), escrita pero apagada en E1. `notasvoz-gamma-audio` no cambia. Detalle en `docs/DISENO-ALMACENAMIENTO-CIFRADO-2026-11-16.md`.
   - *16/11/2026, correcciones de E2:* sin claves nuevas. El borrador (cifrado) suma el campo `audioBase` (cuántas partes tenía el audio de la nota en edición). El detalle cifrado de cada parte puede llevar `incompleta: true` (falta de espacio) o `interrumpida: true`. La segunda pestaña no escribe nada protegido (`vault.readOnly`).
   - *16/11/2026, audio por nota (paso E2):* la base `notasvoz-dictanota-audio` **se usa** solo con la protección abierta y «Conservar audio» encendido. `chunks`: fragmentos **cifrados** (`IV ‖ AES-GCM`). `meta`: id aleatorio, estado, fecha, tamaño total y cantidad de partes **en claro**; clave del audio **envuelta** y detalle de las partes (formato, tamaños, duración, origen y nombre del archivo cargado) **cifrado**. El vínculo nota → audio (`audioId`) vive dentro del registro cifrado de cuadernos, y el borrador recuerda el audio pendiente (también cifrado). Ningún fragmento se escribe sin pasar por `anSealChunk` (hay una prueba que lo exige). La clave de audios no se guarda: se deriva al desbloquear y la clave de datos en bruto se pone en cero. Sin protección no se escribe nada ahí.
   - *17/11/2026, B3 (lista y menú de notas):* sin claves nuevas. La configuración existente (`notasvoz.gamma.cfg.v1`, sin cifrar) suma el campo booleano opcional `listPreview`. La vista previa de la lista muestra en pantalla el comienzo de la última nota de cada cuaderno (con `textContent`); **no guarda nada nuevo**, se puede apagar en Ajustes y, con la protección activa, queda detrás del bloqueo.
   - *18/11/2026, rediseño de Ajustes (U16):* **un solo dato nuevo: `lastBackupAt`**, la fecha (milisegundos) de la última copia creada con «Crear una copia». Va en la configuración existente `notasvoz.gamma.cfg.v1` (sin cifrar, como el resto de esa configuración); no contiene texto, nombres ni datos de pacientes. Se escribe solo con `saveCfg` (el bloque `COPIA-USO` no escribe: solo avisa con el evento `dictavoz:copia-creada`) y solo cuando una copia se creó y se comprobó; el respaldo previo de K2 no la cambia. Viaja dentro de la copia (la configuración se copia entera): al restaurar, vuelve la fecha de esa copia. No hay claves nuevas, ni bases nuevas, ni cambios de cifrado, de formatos de copia o de K2. Detalle en CAMBIOS.md.
   - *18/11/2026, apariencia (U5, U18):* **un solo dato nuevo: `theme`**, con el valor `light`, `dark` o `auto` (Clara, Nocturna o Automática; por defecto Clara). Va en la configuración existente `notasvoz.gamma.cfg.v1` (sin cifrar, como el resto de esa configuración); **no contiene texto, nombres ni datos de pacientes**. Lo escribe solo `saveCfg` y lo lee un script al comienzo de `<head>` (`dvTheme`) para aplicar la apariencia antes de pintar; no usa red, ni claves nuevas, ni bases nuevas, ni cambia la CSP (sin fuentes ni imágenes externas). Viaja dentro de la copia (la configuración se copia entera). No cambia el cifrado, los formatos de copia ni K2.
   - *17/11/2026, copia cifrada (paso K1):* **no guarda datos nuevos en el navegador.** Produce un archivo descargado por acción del usuario (ver la sección del 17/11). `vault.records.all()` (antes `vault.rawRecords()`) solo lee los registros ya cifrados.
   - *16/11/2026:* el aprendizaje automático de correcciones agrega líneas `a => b` al diccionario existente (`notasvoz.gamma.dict.v1`, **sin cifrar**) y el campo booleano `learnAuto` a la configuración existente (`notasvoz.gamma.cfg.v1`). No hay claves nuevas. Solo se aprenden palabras en minúscula y sin cifras (no nombres propios), pero provienen de lo dictado: no usar datos reales. El aviso de lo aprendido usa `textContent`.

## Qué está confirmado

Marcar siempre el nivel: **[código]** guardado en GitHub · **[prueba técnica]** verificado por pruebas o en un navegador de laboratorio · **[Motorola]** confirmado por el usuario en el celular.

- **[prueba técnica] 15/11/2026, sin inyección de código.** Con la versión publicada (`63bc33b`) se guardó una nota ficticia cuyo título, texto y etiqueta contenían código de ataque falso (`<img onerror>` y `<script>`). Se mostró como texto, no se ejecutó nada, y tampoco al abrir la nota. Navegador integrado de la aplicación de escritorio de Claude (Chromium). Se restauró el almacenamiento.
- **[prueba técnica] Revisión del código.** Las listas de notas y personas usan `textContent`; todos los `innerHTML` son vacíos o texto fijo; la exportación a Word escapa `& < >` en título, etiquetas y párrafos (solo en contenido de elementos, nunca en atributos); los nombres de archivo se limpian.
- **[prueba técnica] Sin envío propio de datos.** No hay `fetch`, `XMLHttpRequest`, `WebSocket` ni `sendBeacon` en el código de la página.
- **[prueba técnica] Búsqueda de claves y datos personales** en `index.html`, `CAMBIOS.md`, `README.md`, `AGENTS.md` y pruebas de `main`: sin claves, correos ni teléfonos. No se revisó el historial completo ni las otras ramas.
- **[prueba técnica] Sitio publicado con HTTPS y HSTS.**
- **[código + prueba técnica] Política CSP y huella de la librería MP3** (rama `seguridad-01-csp-huella-2026-11-15`; ver `CAMBIOS.md`). Probado en el navegador integrado (Chromium, Windows) servido desde `localhost`: la página carga; el motor Whisper Tiny y Base se descarga y transcribe por procesador; Base también por placa de video; el Worker en memoria, la captura de audio (AudioWorklet desde blob), la reproducción de audio, la descarga TXT y IndexedDB funcionan; la librería MP3 carga con su huella y una huella falsa es rechazada; una conexión a un sitio no permitido y un script de otro sitio quedan bloqueados.

## Qué NO está confirmado

- **[Motorola] La política CSP y la huella MP3 no fueron probadas en Brave/Android.** Hasta que el usuario lo confirme, tratarlas como no confirmadas. Si Brave bloqueara algo, la consecuencia más probable es que Whisper no cargue; ver «Cómo volver atrás».
- Firefox (Windows y Linux) con la CSP: no se probó. Es el navegador donde ya hubo problemas con el Worker de Whisper, así que conviene probarlo.
- La conversión a MP3 de punta a punta con un audio guardado (solo se probó la carga de la librería).
- Que el sitio publicado en GitHub Pages sirva la política igual que el servidor local (se verifica tras unir y publicar).
- Permisos del micrófono, comportamiento con archivos de audio dañados o enormes, y límites de memoria.
- Otras ramas del repositorio y el historial completo de commits.

## Hallazgos y estado

| # | Riesgo | Gravedad | Estado |
|---|--------|----------|--------|
| 1 | Notas, tabla de personas, borrador, deshacer y audio se guardan **sin cifrar** en el navegador; los TXT descargados tampoco están protegidos. Quien use el celular desbloqueado puede leerlos. | Alta si se usan datos reales | **MITIGADO EN PARTE (16/11/2026, sin validar en el Motorola).** Protección cifrada opcional para todo el texto (ver `DISENO-CIFRADO.md`) y, desde E2, para los audios nuevos guardados con su nota. Siguen abiertos: audios guardados **sin la protección** o antes de E2 (base vieja, sin cifrar), archivos descargados, y la prueba física de la huella. Hasta validarla en el teléfono: no usar datos reales. |
| 2 | Librerías de internet sin verificación: motor Whisper (jsDelivr) y librería MP3. Si jsDelivr fuera vulnerado, ese código podría leer las notas. | Media | **MITIGADO EN PARTE.** MP3 con huella. Whisper: versión fija y la CSP limita orígenes, pero no hay huella posible con `import()`. Riesgo residual: aceptado hasta decidir si se aloja una copia propia (más pesada y con mantenimiento). |
| 3 | Sin política de seguridad del navegador. | Media | **HECHO** (CSP en `<meta>`), pendiente de prueba en el Motorola. Limitación: permite scripts en línea (`'unsafe-inline'`) porque la aplicación tiene tres scripts embebidos; mejora futura: huellas o nonce. Un `<meta>` no puede impedir que otro sitio incruste la página (`frame-ancestors`); GitHub Pages no permite cabeceras propias. |
| 4 | La rama `main` no está protegida: se puede publicar aunque las pruebas fallen. | Baja/Media | **ABIERTO. Decisión del usuario** (configuración de GitHub: exigir que pasen las pruebas antes de unir). Ninguna IA debe cambiarla sin pedido. |
| 5 | Todas las páginas bajo `ignabidon.github.io` comparten el almacenamiento del navegador. Hoy solo existe esta; si se publicara otra, podría leer las notas. | Baja hoy | **VIGILAR.** No publicar otra página en esa cuenta sin aislar (dominio propio) o sin revisar este punto. |
| 6 | El flujo de GitHub Actions usa `actions/checkout@v4` y `setup-node@v4` por etiqueta, no por huella; permisos ya limitados a lectura. | Baja | Abierto, menor. |

## Orígenes permitidos (CSP)

| Origen | Para qué | Directivas |
|--------|----------|-----------|
| `https://cdn.jsdelivr.net` | Librería del motor Whisper (`@huggingface/transformers@3.8.1`), sus archivos WASM y la librería MP3 (`lamejs@1.2.1`) | script, worker, connect |
| `https://huggingface.co`, `https://*.huggingface.co`, `https://*.hf.co` | Descarga de los modelos Whisper (tiny/base/small) y sus redirecciones de almacenamiento | connect |
| `blob:` | Worker de Whisper, AudioWorklet de captura, audio guardado y descargas, creados por la propia página | script, worker, connect, media, img |
| `data:` | Audios e imágenes generados en memoria | connect, media, img |
| `'wasm-unsafe-eval'` | Permite compilar WebAssembly (el motor). **No** permite `eval` de texto. | script |

Todo lo demás está en `default-src 'none'` (sin objetos, sin marcos, sin formularios, sin `<base>`, sin manifiesto).

## Cómo volver atrás si la CSP rompe algo en el celular

1. **Síntoma típico:** el modelo Whisper no termina de cargar, o aparece un error de «etapa: descarga de la librería» o «preparación del modelo» en los detalles técnicos, o el botón de MP3 dice que no se cargó el conversor.
2. Pedir al usuario (o mirar con las herramientas del navegador) la consola: buscar «Content Security Policy». Indica la directiva y la dirección bloqueada.
3. Opciones: (a) agregar solo esa dirección a la CSP, a esta tabla y a las pruebas, con permiso del usuario; (b) si no es claro, quitar temporalmente la línea `<meta http-equiv="Content-Security-Policy" …>` de `index.html` y abrir un aviso en `CAMBIOS.md`. Quitarla no afecta las notas guardadas.
4. Si la huella de MP3 fallara (el servicio cambió el archivo): no desactivar la verificación; recalcular la huella con el archivo exacto de la versión fijada, confirmar que el contenido es el esperado y actualizar `index.html`.

## Cómo repetir las pruebas

- **Inyección (datos ficticios):** en el sitio, guardar en `localStorage['notasvoz.gamma.v1']` una nota con título/texto/etiquetas `<img src=x onerror="window.__xss=1">`, recargar, y comprobar que `window.__xss` sigue sin definir, la lista muestra el texto literal y abrir la nota tampoco ejecuta nada. Guardar antes y restaurar después el contenido real del almacenamiento.
- **CSP:** en la consola, `fetch('https://example.com/',{mode:'no-cors'})` debe fallar y el registro debe mostrar «violates the following Content Security Policy directive».
- **Huella MP3:** cargar un script con la misma dirección y una huella falsa debe ser rechazado.
- **Whisper:** elegir Tiny y «solo procesador», preparar el modelo y transcribir 3 s de audio sintético; repetir con Base y aceleración automática. En ambos casos no deben aparecer bloqueos de CSP.
- **Automáticas:** `node --test tests/delta.test.mjs` (sección «Seguridad»).

## Pendientes de la revisión

- [ ] Probar la CSP y la huella MP3 en Brave del Motorola con datos ficticios (grabar, transcribir con Base y Small, convertir a MP3, descargar TXT, compartir, recuperar audio). **Confirmación del usuario necesaria.**
- [ ] Verificar en el sitio publicado que la CSP quedó activa y nada se bloquea.
- [ ] Probar en Firefox.
- [ ] Revisar permisos del micrófono y audios dañados o muy grandes (comportamiento ante errores).
- [ ] Revisar las otras ramas y el historial por datos sensibles o claves.
- [ ] Decisión del usuario sobre proteger `main` (punto 4) y sobre alojar copia propia del motor (punto 2).
- [x] Decisión del usuario sobre el cifrado (punto 1): **toda la app**, huella + contraseña + código de recuperación, autobloqueo de 15 minutos y audios en una segunda etapa (16/11/2026). Implementado en `seguridad-02-cifrado-2026-11-16`.
- [ ] Probar la protección cifrada en Brave del Motorola con datos ficticios: activar, anotar el código, registrar la huella, recargar, desbloquear con huella y con contraseña, autobloqueo con la pantalla apagada y tiempo de desbloqueo. **Confirmación del usuario necesaria.**
- [x] Cifrar los audios guardados (segunda etapa): **hecho en E2 para los audios nuevos por nota** (16/11/2026, sin probar en el Motorola). El audio suelto viejo no se migra (D7).
- [x] Copia cifrada exportable, **crear y verificar** (K1, 17/11/2026; prueba técnica, sin probar en el Motorola).
- [ ] Copia cifrada: **restaurar** (K2). Hasta entonces la copia no se puede volver a cargar en la app.
- [ ] Evaluar CSP más estricta (huellas/nonce en lugar de `'unsafe-inline'`) cuando el código se estabilice.
- [ ] Agregar fecha y resultado a este archivo cuando se complete cada punto.

