> **HISTÓRICO · no usar como fuente de estado ni de instrucciones** (17/11/2026). Describe cómo estaban las cosas el 16/11. Lo vigente: [CONTINUAR-AQUI.md](../CONTINUAR-AQUI.md), [DECISIONES.md](DECISIONES.md) y [INDICE.md](INDICE.md).

# DictaNota · Traspaso a ChatGPT tras la Etapa A (16/11/2026)

> **Responsable de este documento:** Claude. **Solo documentación.** No autoriza uniones a `main` ni reemplaza decisiones del usuario.
> **Para quién:** ChatGPT (Codex), que retoma el trabajo cuando el usuario pueda volver a usarlo.
> **Lectura previa obligatoria:** [CONTINUAR-AQUI.md](../CONTINUAR-AQUI.md), [AGENTS.md](../AGENTS.md), [SEGURIDAD.md](../SEGURIDAD.md) y [docs/PROPUESTA-ESTETICA-2026-11-16.md](PROPUESTA-ESTETICA-2026-11-16.md).

## 1. En una frase

Mientras ChatGPT no estaba disponible, Claude hizo **solo la Etapa A** (seis ajustes de presentación) en el **PR #41**, rama `estetica-a-ajustes-2026-11-16`, base `main` = `e89d0a1`. **No está unida a `main`**: espera la revisión y el permiso del usuario. Todo lo demás sigue pendiente y es tuyo.

## 2. Primero: verificá el estado real

1. `git fetch` y mirá el HEAD de `main`: **¿se unió el PR #41?** Si sí, partí del `main` nuevo. Si no, **no rehagas la Etapa A**: preguntale al usuario si la unió o si quiere cambios.
2. PR abiertos que no son tuyos: **#41** (Etapa A, Claude), **#37** (documentación: decisiones del 16/11 sobre motor Whisper propio y autoría), #22 y #1 (antiguos). No los toques sin coordinarlo con el usuario.
3. Tu rama `rediseno-04-clinica-chat-chatgpt` **no tiene commits sin unir**: todo lo que contenía ya está en `main` (PR #36, estética «Clínica contemporánea», inicio listo para grabar y notas como burbujas). No hay nada que «terminar» ahí; lo que faltaba está en la sección 5.

## 3. Qué hizo Claude en la Etapa A (PR #41)

Solo `index.html` y `tests/delta.test.mjs`. Sin datos nuevos, claves de almacenamiento nuevas, orígenes, dependencias ni cambios en Whisper, captura, cifrado ni almacenamiento de audio.

| Ítem | Qué cambió | Dónde mirar |
|---|---|---|
| A1 | Se quitaron los 5 rótulos viejos «Texto». Las frases **no nombran ninguna pestaña** («la nota», «el texto de una nota»), para no tocarlas otra vez en la Etapa N. | `.anon-preview:empty::before`, `#learnHelp`, `#anonPreviewLabel`, botón `data-go-view="transcripcion"`, mensaje de dictado local |
| A2 | «Ver hojas guardadas» (`#openSheets`) y «Escribir una nota» (`#writeNewNote`) comparten fondo y color de texto. | regla `#openSheets,#writeNewNote{…}` |
| A3 | Ajustes: el botón (i) de «Tamaño del texto» y el de «Aprender de mis correcciones» quedan **en línea con su etiqueta** (`.label-row`, `.chk-row`); las opciones de `#model` tienen nombre corto («Tiny · más liviano», «Base · equilibrado», «Small · más preciso») y la descripción sigue en `#modelHint`; cada módulo tiene un **ícono SVG en línea** distinto. | `#settingsReading`, `#settingsQuality`, `#settingsAudio`, `#settingsPrivacy`, `#settingsDictionary` |
| A4 | El punto de estado es **rojo al grabar** y **ámbar al pausar** (antes siempre ámbar). | `.dock-capture-status .capture-dot`, `#studioDockCapture.paused .capture-dot` |
| A5 | «Procesamiento local» **se ve en el celular** (antes `.pill{display:none}` bajo 760 px); queda en una línea bajo el logo. Texto sin cambios: nunca «sin nube». | `.pill` y `@media(max-width:760px)` al final del `<style>` |
| A6 | Audio: «Conservar audio» en una fila propia; la tarjeta repetida «Descargar audio» + aviso (`#recordDownloadCard`) **solo se muestra si hay un audio** (la lógica es `refreshAudioBox()`: `recordDownloadCard.hidden = !m`). `#audioBox` y «Mis grabaciones» siguen siempre visibles, como exige AGENTS.md. | `#recordDownloadCard`, `refreshAudioBox()` |

Los estilos nuevos están en un único bloque comentado «Etapa A · ajustes menores» al final de la hoja de estilos.

**Pruebas:** `node --test tests/delta.test.mjs` = **134/134** (128 anteriores + 6 nuevas «Etapa A: …»); `tests/browser.mjs`, `tests/cifrado-browser.mjs` y `tests/notas-browser.mjs` pasan en Chrome local. Capturas antes/después a 360 y 412 px con datos ficticios (el usuario las revisa aparte). **Probado en el Motorola: NO.**

## 4. Qué NO se hizo de la Etapa A (decisión de Claude, para no tocar lógica de audio)

- **Pulso animado** del punto de grabación (la propuesta decía «rojo con pulso»; hoy es rojo fijo). Si lo agregás, respetá «reducir movimiento».
- **Unificar los botones «Descargar audio»** cuando sí hay un audio: hoy siguen `#recordDownloadAudio`, `#aDown` y `#audioDoneDownload`. Se resuelve mejor junto con la Etapa E (el audio pasa a la burbuja).
- Etiqueta «Protegida» junto a «Procesamiento local» cuando la protección está activa (era opcional).
- `README.md` todavía dice «Cuatro pantallas: Audio, Texto, Anonimizar y Ajustes» y su prueba de «Notas en hojas» habla de «Audio» y «hojas»: se actualiza con la Etapa N.

## 5. Qué falta, en este orden (cada etapa en su rama nueva desde el `main` actualizado)

| Paso | Etapa | Antes de programar |
|---|---|---|
| 1 | **Etapa N**: pestañas **Dictar · Cuadernos · Anonimizar · Ajustes**; en la interfaz «hoja» pasa a «cuaderno». Ids `grabacion`/`transcripcion` y claves `gamma` **no se renombran**. | Plan breve al usuario y su permiso. Actualizá AGENTS.md **en el mismo PR**. Cuidado con «dictado local» (es otra cosa: el reconocimiento nativo del teléfono). |
| 2 | **Etapa B** (B1 barra más baja en Notas, B2 «Grabar» en la barra de Audio solo si no se ve el círculo —confirmada—, B3 burbujas con menú ⋯ y vista previa en la lista) | Un PR por ítem. Tocan el compositor y las burbujas (tu zona). |
| 3 | **Etapa E**: reproductor de audio dentro de cada burbuja (estilo WhatsApp: reproductor arriba, transcripción abajo; **sin resaltar la palabra que suena**). Base nueva de IndexedDB, audios cifrados, también los audios cargados desde archivo, y **obedece el interruptor «Conservar audio»** (apagado = no se guarda). | **Toca almacenamiento y revierte una regla de AGENTS.md**: plan + permiso explícito del usuario. Subetapas E1→E2→E3 en la propuesta. |
| 4 | **Etapa C**: anonimización visible y contraste. C1 va **antes** de la anonimización con original recuperable (la «próxima etapa» que dejó tu entrada de CAMBIOS: actuar sobre la nota que se transcribe, luego sobre todo el cuaderno). | |
| 5 | **Etapa D**: cimientos de CSS (variables, tokens), modo oscuro opcional después de D1. | Antes de la app de Android. |
| — | Pendientes anteriores aún vigentes: **Vista Documento** de un cuaderno, búsqueda (solo con la app desbloqueada), Ajustes reordenado por temas (informe de continuidad, 3.4), cifrado de audios y copia cifrada exportable. | Según prioridad del usuario. |

**Decisiones del usuario que ya no se reabren** (detalle en la propuesta, sección 6): B2 confirmado; menú ⋯ y vista previa en la lista (activada por defecto, con interruptor en Ajustes); modo oscuro opcional; nombres «Dictar» y «Cuadernos»; audio dentro de la burbuja **sin** marcar la palabra que suena; audios cargados se guardan unidos a su nota y obedecen «Conservar audio».

## 6. Reglas que no cambian

- Rama nueva desde el último `main` por cada etapa o ítem; no sobrescribir avances ni borrar respaldos.
- Pruebas antes de cada PR: `node --test tests/delta.test.mjs` y las tres de navegador; entrada en `CAMBIOS.md` (responsable, rama, SHA base, alcance, pruebas, pendientes) y los **tres niveles de estado separados**: código guardado · prueba técnica · probado en el Motorola.
- Capturas con datos ficticios (360 y 412 px) antes de publicar. **No unir a `main` sin permiso explícito del usuario; merge normal, sin squash.**
- Sin `innerHTML` con datos del usuario, sin dependencias ni servicios externos, íconos SVG en línea, sin tocar Whisper, captura, Worker, cola ni almacenamiento de audio (salvo la Etapa E, con permiso).
- El repositorio es **público**: ningún dato real de pacientes ni nombres propios en documentos, pruebas o capturas.
- Sin nombres de IA ni créditos en la interfaz. Texto «Procesamiento local», nunca «sin nube».
- Un flaqueo conocido del CI: a veces `prueba-estatica` falla por «Chrome timeout» (infraestructura). Reintentar con `gh run rerun <id> --failed` antes de buscar un error en el código.

## 7. Primer mensaje sugerido para el usuario

«Verifiqué `main` y los PR abiertos. [El PR #41 (Etapa A de Claude) ya está unido / sigue abierto.] Mi rama anterior no tiene nada pendiente. Propongo empezar por la Etapa N; te muestro el plan (archivos, funciones y pruebas) y espero tu permiso antes de programar.»
