# DictaNota — Devolución de uso real y ajustes pendientes

**Fecha:** 16 de noviembre de 2026 (Argentina).  
**Origen:** relato del propietario luego de recorrer el punto 3 de la Guía del propietario y de editar una nota guardada.  
**Dispositivo de referencia:** Motorola G56 5G; el propietario describe la experiencia en la aplicación web. **No informó en este mensaje la versión exacta del navegador, el modelo Whisper elegido, la duración del audio, ni un listado paso por paso.** No inferirlos.  
**Código contrastado:** `main` en `aab2b903`. **Alcance de este archivo: documentación de pruebas y requisitos; no implementa cambios ni autoriza integrar PR.**

## 1. Resultados comunicados por el propietario

| Recorrido | Estado | Evidencia / alcance |
| --- | --- | --- |
| Inicio desde **Dictar** | **Confirmado por observación del usuario** | Se presenta «Captura rápida», «Nueva nota» y el selector «Conservar audio». |
| Grabación y transcripción a texto | **Confirmado en términos generales** | El usuario describe la transcripción resultante; reporta sustitución de voseo argentino por formas de España. No se confirmó que todas las palabras ni el final del audio sean correctos. |
| Pausar y reanudar, detener, permiso del micrófono | **Declarado como parte del punto 3 completado; detalle sin comprobar** | El usuario dijo que considera cumplidos todos los pasos del punto 3 de la guía. No describió individualmente estos controles en esta devolución. |
| Guardar una nota en un cuaderno | **Confirmado por observación del usuario** | Al tocar Guardar, ve la nota como burbuja de chat y el texto se lee mejor. No se verificó que se conserve tras recargar. |
| Abrir **Editar** en una nota guardada | **Confirmado por observación del usuario** | Vuelve a un editor demasiado bajo. No se confirmó haber guardado posteriormente esa edición. |
| Acciones de burbuja «Copiar» y «Mover» | **Visibles, no verificadas funcionalmente** | Las identificó en la pantalla; no describió una copia pegada ni el resultado de un movimiento. |
| Descarga del audio | **Confirmado por observación del usuario** | Se descargó un archivo de **168 KB**. Esto comprueba la acción de descarga, **no** que se reproduzca, cubra todo el audio ni que convierta a MP3. |
| Reproductor dentro de la burbuja | **No disponible todavía en `main`** | Es trabajo planificado para E3; no es un fallo de la descarga actual. |
| TXT, compartir, anonimización, seguridad, huella, recuperación, rendimiento Base/Small | **Sin nueva confirmación** | Estos pasos no se detallan en esta devolución y no deben marcarse como validados por extensión. |

**Interpretación fiel:** el propietario informó que cumplió el punto 3 de la guía de uso, no que completó **todos los puntos de la prueba técnica extensa** `docs/PRUEBA-MOTOROLA-Y-PENDIENTES-USUARIO-2026-11-16.md`. El punto 3 de la guía es el flujo básico de grabación/guardado. Las demás verificaciones no se cierran automáticamente.

## 2. Mejoras pedidas — no implementadas

### A. Elegir el destino y el nombre antes de grabar — prioridad alta de flujo

**Observación:** en Dictar, el encabezado «Nueva nota» es estático. El propietario quiere tocarlo y escribir un nombre o elegir desde ahí el cuaderno de destino.

**Comportamiento deseado:**
- Valor inicial: **Nueva nota en cuaderno nuevo**, manteniendo Dictar listo para grabar, sin pasos obligatorios.
- Permitir, antes de comenzar, elegir **Crear cuaderno nuevo** (opcionalmente escribir su nombre) o **Agregar al cuaderno existente** (elegir uno de los cuadernos guardados).
- Mostrar el destino elegido con claridad **antes**, **durante** y **al guardar**; que no aparezca como una carpeta del sistema.
- En el modelo actual, el título editable corresponde al **cuaderno** y la nota es el mensaje de texto con fecha de guardado. Aclarar esta diferencia en la interfaz. No introducir un nuevo campo de título por nota sin propuesta y migración explícitas.
- Si hay un borrador, edición o grabación en curso, evitar un cambio de destino que lo pierda o mande a otro cuaderno por accidente. Confirmar o bloquear según el caso; respetar el guardado explícito.
- Probar creación, selección, cambio de destino, cierre y recuperación de borrador, edición y guardado en un cuaderno existente; verificar que no se dupliquen ni crucen notas.

**Relación con diseño previo:** la elección de destino desde Dictar amplía el flujo actual; **no está implementada** y necesita revisión de estado/datos además de diseño visual.

### B. Editor amplio al transcribir o editar una nota — prioridad máxima de usabilidad

**Observación confirmada:** al corregir el texto previo a Guardar y al tocar Editar en una burbuja guardada, el cuadro de edición ocupa una fracción pequeña de la pantalla. Leer y corregir transcripciones extensas resulta impráctico.

**Evidencia del código de `main`:** el CSS de `index.html` define `#convComposer textarea#text{min-height:76px;height:90px;max-height:25vh}`, y con teclado abierto `min-height:64px;height:76px;max-height:22vh`. No es un problema meramente tipográfico.

**Comportamiento deseado:** al **revisar una transcripción recién generada** o **editar una nota existente**, ofrecer un **editor ampliado o vista de edición a pantalla completa**, que deje leer párrafos y desplazarse por el texto; conservar controles visibles de **Guardar**, **Cancelar edición** y corrección, diferenciando cambios guardados de no guardados. Al entrar, no reemplazar el texto por un campo vacío; al salir sin guardar, no perder los originales.

**Relación con el diseño:** la etapa B1 propone un compositor **compacto cuando está vacío**; eso **no contradice** un editor **amplio cuando hay texto para revisar o se pulsa Editar**. La fase B3 limpia las burbujas. El PR #48 «Clínica editorial» es un rediseño visual de bajo riesgo, **abierto como borrador**, y no debe usarse como excusa para modificar la lógica del editor ni hacer cambios que compitan con esa rama.

**Pruebas necesarias:** 320/360/412 px, tamaño de letra Normal/Grande, teclado abierto y cerrado, scroll por textos largos, grabación en curso y barra de Pausar/Detener, borrador recuperable, Cancelar edición, Guardar y bloqueo. No imponer altura del editor que tape el teclado o comandos críticos.

### C. Whisper conserva mal el voseo argentino — prioridad alta de fidelidad

**Observación confirmada:** el usuario dictó «si querés» y encontró «si queréis». Distinguir entre el audio realmente emitido y el resultado transcripto. No es una preferencia estética: modifica palabras y el registro dialectal.

**Evidencia del código:** en `index.html` la opción de Whisper usa `{language:'spanish', task:'transcribe'}`. Eso solicita transcripción en español y **no traducción**; no fija una variante regional. Por separado, el motor nativo del navegador prioriza `es-AR` si existe, pero no debe confundirse con Whisper.

**Investigación sugerida antes de modificar:**
1. Reproducir con un audio sintético o voluntariamente creado para la prueba: pares «vos querés / vosotros queréis», «vos tenés / tú tienes», registrando lo pronunciado, el resultado y el modelo Tiny/Base/Small.
2. Comprobar qué opciones de contexto o `initial_prompt` admite realmente la versión instalada de Transformers/Whisper, su impacto, rendimiento y riesgos de invención. Evitar afirmar que `es-AR` es un identificador de idioma admitido por Whisper sin verificarlo.
3. Considerar una preferencia **«Español rioplatense (respetar voseo)»** solo si se puede respaldar con pruebas y sin forzar reemplazos erróneos. Un diccionario de correcciones no debe sustituir automáticamente expresiones correctas de otra variedad ni inventar lo que no se dijo.
4. Verificar negaciones, nombres, cifras, tiempos de transcripción y texto guardado. Mantener el audio original cuando el usuario lo eligió y revisar manualmente todo material sensible.

**No cambia en este PR:** motor Whisper, modelos, diccionario, reglas automáticas, claves ni seguridad.

## 3. Pendientes que siguen siendo del propietario

- Reproducir el archivo descargado y comprobar que se escucha completo; opcionalmente verificar MP3 y la opción de retranscribir el audio.
- Verificar que la nota guardada **persiste después de cerrar y reabrir** la app y que una edición guardada persiste también.
- Confirmar con pasos separados **Pausar/Reanudar**, grabar desde dentro de un cuaderno y cambio de destino al guardar (la opción nueva desde Dictar no existe aún).
- Probar con datos ficticios **Anonimizar/Deshacer** y comprobar que no queden identificadores.
- Probar protección con contraseña/código y, si corresponde, huella real en Motorola (sin compartir secretos).
- Verificar **Descargar TXT** y **Compartir**, conversión MP3, recuperación de audios y el efecto del teclado con letra Grande.
- Comparar **Base vs Small** en un mismo audio inventado, incluyendo voseo, tiempo y resultado.
- Configurar la protección de la rama `main` desde GitHub (todavía aparece como **sin protección** en la API). No es una prueba de DictaNota.

No hace falta repetir de entrada toda la prueba básica de grabación: concentrar la próxima sesión en estos **casos no confirmados** y en las regresiones que aparezcan después de nuevos PR.

## 4. Estado de las tareas paralelas al 16/11/2026

- `main`: `aab2b903`; E1 de audios por nota integrado como base **apagada**, sin nueva función visible.
- PR #47 (**E2, audios cifrados y asociados a notas**): abierto, no integrado; en revisión/corrección. No avanzar el reproductor E3 sin respetar sus dependencias.
- PR #48 (**Clínica editorial**): abierto como **borrador**, trabajo visual no publicado. Revisar esa estética antes de implementar nuevas pantallas.
- PR #49 (**guía del propietario**): rama de documentación; esta devolución se añade allí. No fusionar sin permiso.
- B1/B2/B3 (compositor, acciones y burbujas): pendientes de su respectiva implementación; los problemas nuevos de edición y destino deben coordinarse con ellos.

## 5. Próxima secuencia de trabajo sugerida

1. Terminar la revisión de integridad de **E2/#47** sin mezclar cambios de interfaz ni poner datos reales.
2. Examinar el **PR #48** y las referencias estéticas antes de diseñar la edición ampliada y el selector de destino.
3. Diseñar un flujo integrado: **Dictar → destino/nombre → grabar o escribir → revisar en editor amplio → Guardar → burbuja**, con pantalla de edición amplia para notas anteriores. Primero prototipo/pruebas; después PR funcional independiente.
4. Investigar y probar por separado el **voseo con Whisper**, sin cambiar el motor a ciegas.
5. Continuar B1/B2/B3, K1, E3 y demás dependencias según el tablero vigente; no prometer que el audio en burbuja ya se publicó.

**Todas estas modificaciones funcionales son propuestas.** Esta actualización solo registra hallazgos y criterios para que otra IA pueda implementarlos con un pedido específico.
