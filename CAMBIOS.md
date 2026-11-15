# Registro de cambios — Grabador de voz Delta

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
- Funcionamiento en el Motorola: **sin confirmar**. Falta una grabación corta con información ficticia y copiar los detalles técnicos.

**Pendiente siguiente (paso 2):** con esos detalles decidir si hace falta filtrar partes sin voz o texto repetitivo antes de que lleguen al texto final.

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
