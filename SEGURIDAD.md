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
   - *16/11/2026, protección cifrada:* toda lectura o escritura de notas (`KEY`), borrador (`DRAFT`), deshacer (`UNDO`), personas (`PKEY`) y diccionario (`DKEY`) pasa por **`vaultStore`**, nunca por `localStorage` directo (hay una prueba que lo exige). Datos nuevos de pacientes van a una clave nueva agregada a `VAULT_KEYS`. Claves nuevas: `notasvoz.boveda.v1` (cabecera: parámetros y clave de datos envuelta, nunca en claro) y `notasvoz.boveda.v1.r.*` (registros cifrados). No bajar las iteraciones de PBKDF2 por velocidad, no guardar la contraseña ni la clave en ningún almacenamiento y no mostrar texto en claro si la cabecera está dañada.
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
| 1 | Notas, tabla de personas, borrador, deshacer y audio se guardan **sin cifrar** en el navegador; los TXT descargados tampoco están protegidos. Quien use el celular desbloqueado puede leerlos. | Alta si se usan datos reales | **MITIGADO EN PARTE (16/11/2026, sin validar en el Motorola).** Protección cifrada opcional para todo el texto (ver `DISENO-CIFRADO.md`). Siguen abiertos: **audios sin cifrar**, archivos descargados, y la prueba física de la huella. Hasta validarla en el teléfono: no usar datos reales. |
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
- [ ] Cifrar los audios guardados (segunda etapa).
- [ ] Copia cifrada exportable (respaldo y paso a una futura app de Android; ver `DISENO-CIFRADO.md`).
- [ ] Evaluar CSP más estricta (huellas/nonce en lugar de `'unsafe-inline'`) cuando el código se estabilice.
- [ ] Agregar fecha y resultado a este archivo cuando se complete cada punto.

