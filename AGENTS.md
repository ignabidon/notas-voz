# AGENTS.md — Instrucciones para ChatGPT, Claude y otras IA

**Leer también README.md y CAMBIOS.md antes de editar.**

## Una sola versión oficial
- Repositorio: ignabidon/notas-voz, rama activa: **main**.
- Única aplicación web: **/index.html**.
- Nombre visible: **Grabador de voz Delta**, etapa **Prueba Delta 10**.
- Publicación: https://ignabidon.github.io/notas-voz/
- No crear carpetas paralelas como delta-v2, nueva-gamma o copias index2.html.
- Versionar cambios mediante commits; documentarlos en CAMBIOS.md.
- Archivo inalterable de prototipos antiguos: rama **archivo-antes-de-delta-2026-11-15**. No usarla como fuente de desarrollo ni borrarla.
- Respaldo exacto antes del rediseño en tres pantallas: **respaldo-delta-07-antes-de-delta-08**. Conservarla.
- El aviso de transcripción es único y global dentro de `.studio-dock`; no duplicar Worker, temporizadores ni acciones de cancelación. Ocultar visualmente los antiguos indicadores solo si `body.delta-transcribing` está activo; conservar mensajes de error y finalización. Mantenerlo sincronizado con `updProgress`, `maybeDone` y cancelación.
- No renombrar el repositorio, cambiar la URL de Pages o modificar ramas ajenas sin solicitud del usuario.

## Funcionalidades que deben preservarse
1. Inicio, pausa, reanudación y detención de voz; marcas y cronómetro.
2. Tres pantallas visibles de a una: **Grabar / Texto / Ajustes**. Cambiar de pantalla no debe detener la captura. Barra fija de **Detener** y **Pausar/Reanudar** mientras se graba; al terminar, Grabar en la pantalla Grabar y Anonimizar/Guardar en Texto.
3. Whisper local, progreso, estado y diagnósticos de errores. Primera carga de modelos puede requerir internet.
4. Corrección contextual sobre selección en Android, con opción de guardar regla en diccionario (nunca automáticamente sin consentimiento).
5. Edición, borrador, notas, audio local, guardar, copiar y exportar.
6. Anonimización posterior, revisar antes de compartir, deshacer, códigos/alias de personas.
7. Advertencias al guardar mientras se graba o transcribe.

## Almacenamiento: preservarlo
Las claves de localStorage e IndexedDB mantienen nombres históricos con «gamma». **No renombrarlas por estética ni borrarlas.** Ejemplos: `notasvoz.gamma.v1`, `notasvoz.gamma.dict.v1`, `notasvoz.gamma.cfg.v1`, `notasvoz.gamma.draft.v1`, `notasvoz.gamma.undo.v1`, IndexedDB `notasvoz-gamma-audio`.
Son datos vinculados al origen de GitHub Pages, no al nombre de la carpeta. Cualquier migración exige plan, copia de seguridad y pruebas.

## Forma de trabajo
- Inspeccionar el último commit y el código de la función afectada antes de tocarlo.
- Explicar brevemente el cambio y limitarlo a lo necesario; no reescribir toda la aplicación.
- No incorporar telemetría, servicios externos o dependencias sin permiso.
- No usar datos reales de pacientes en ninguna prueba, captura o registro. No incluir conversaciones en diagnósticos.
- No prometer anonimización infalible ni cifrado seguro: son funciones experimentales.
- Probar con `node --test tests/delta.test.mjs` y revisar el CI en GitHub Actions. Sumar pruebas cuando se modifique una función crítica.
- Probar con datos ficticios en Motorola G56 5G: iniciar > pausar > reanudar > scroll > detener > transcripción > corrección > anonimización > guardar > reabrir.
- Registrar resultado y pendientes en CAMBIOS.md tras cada cambio.
- Si algo falla, consultar «Detalles técnicos de la última grabación» antes de modificar el motor de audio.
- Comunicar siempre **tres niveles separados**: (a) código guardado, (b) verificaciones técnicas, (c) validación real en Motorola. No declarar completado el tercer nivel sin una prueba real.

## Situación pendiente a 15/11/2026
En Gamma Studio Diseño 07 se observaron números/errores durante una grabación en el Motorola, pero sin diagnóstico reproducible. No atribuirlo a la barra fija sin evidencia. Delta 01 no modifica la lógica de audio: solamente hace más claro el punto único de entrada y renombra la interfaz.
