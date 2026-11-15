# Grabador de voz Delta — Prueba Delta

**Aplicación oficial:** https://ignabidon.github.io/notas-voz/

Esta es la **única versión web activa** del repositorio, derivada de Gamma Studio Diseño 07 (15 de noviembre de 2026). Está pensada para Android/Brave.

> **Prueba Delta 01 — experimental.** El código se revisó estáticamente; la grabación y transcripción todavía deben validarse en el Motorola G56 5G. No usar datos reales de pacientes.

## Funciones
- Grabación de voz, cronómetro, pausa/reanudación, marcas y detención.
- Barra fija: durante la grabación muestra **Detener** y **Pausar/Reanudar**; al terminar vuelve a **Anonimizar** y **Guardar nota**.
- Transcripción local con Whisper. Descargar o cambiar de modelo puede requerir conexión a internet.
- Corrección contextual de palabras o frases; guardar correcciones frecuentes en un diccionario solo si se elige esa opción.
- Edición de texto, anonimización posterior (revisar siempre), deshacer, códigos o alias de personas.
- Borrador, notas y audio guardados en el navegador; el botón Guardar solicita además un archivo TXT descargable; exportación y diagnósticos técnicos.

## Organización

| Ruta | Para qué sirve |
| --- | --- |
| `index.html` | **Única aplicación web oficial.** Modificarla para mejorar Delta. |
| `README.md` | Esta guía para el usuario. |
| `AGENTS.md` | Reglas comunes para ChatGPT, Claude y otras IA. |
| `CLAUDE.md` | Indicaciones para Claude y referencia a AGENTS.md. |
| `CAMBIOS.md` | Historial de cambios y problemas pendientes. |
| `tests/delta.test.mjs` | Pruebas automáticas básicas sin dependencias. |
| `.github/workflows/verificar-delta.yml` | Ejecuta pruebas en GitHub Actions. |

## Versiones anteriores

Los prototipos web (`gamma-studio`, `gamma-profesional`, `gamma`, `prueba` y la web original), el experimento Android Alfa y su workflow se retiraron de **main**, pero se conservaron en la rama de archivo: [archivo-antes-de-delta-2026-11-15](https://github.com/ignabidon/notas-voz/tree/archivo-antes-de-delta-2026-11-15). También siguen en el historial de Git.

La URL del repositorio permanece como **ignabidon/notas-voz** para no cambiar los enlaces. El nombre visible de la app es **Grabador de voz Delta**.

## Guardar en Descargas (Delta 02)

Al tocar **Guardar .txt** se solicita al navegador descargar un archivo de texto con el título y la transcripción actual. En Android, buscá el archivo en **Descargas de Brave** o en la carpeta de descargas configurada en el dispositivo. El navegador puede consultar dónde guardarlo. La aplicación no puede comprobar desde la página que el archivo terminó de guardarse: abrí el archivo para verificarlo.

Este botón también conserva la copia local anterior como respaldo; no borra ni migra contenido. La lista interna de notas guardadas sigue oculta en este cambio. La descarga TXT es únicamente de la nota actual; no incluye audio, diccionario, claves o ajustes. No usar información sensible real antes de validar el proceso.

## Privacidad del texto y limpieza optativa (Delta 06a)

La descarga **Guardar .txt** no está cifrada y el navegador también conserva una copia local. El borrador de trabajo se guarda automáticamente; la opción **Deshacer borrado** puede contener otra copia del texto. Brave puede conservar estos datos aunque se cierre. Tampoco se cifran todavía el audio guardado, las asociaciones de personas o el diccionario. Los archivos TXT/Word descargados quedan fuera del control de la aplicación.

En **Ajustes de transcripción → Privacidad y almacenamiento local** podés consultar la cantidad de notas guardadas y si existen copias de borrador/deshacer, sin mostrar el contenido. El botón **Borrar notas y borradores de Brave** pide confirmación y borra solo los textos de las notas, el borrador y la copia para deshacer, además de vaciar el editor visible. **No borra** audios de IndexedDB, nombres/códigos, diccionario, ajustes, modelos o archivos de Descargas. No se realiza ninguna limpieza automática.

Este borrado no equivale a destrucción segura de datos del dispositivo, y no protege los archivos descargados. No guardar información clínica real hasta que se evalúen cifrado, protección del dispositivo y política de retención.

## Precisión de Whisper: prueba Base contra Small

La aplicación ya ofrece **Whisper Small** en Ajustes. Para comparar con Base, activá «Guardar el audio» y grabá material ficticio. Descargá primero el texto Base como archivo TXT, cambiá a Small y elegí «Transcribir este audio» sobre el audio guardado; el texto del editor puede reemplazarse. Verificá errores en términos técnicos, omisiones de frases, tiempo de procesamiento y posibles avisos de memoria. Si ambos modelos omiten exactamente las mismas frases, conviene revisar el segmentador de pausas antes de instalar modelos más grandes. No se modifica el motor ni se promete mejor precisión sin esa comparación.

## Grabaciones largas (Delta 05)

Si vas a grabar durante varios minutos, elegí Whisper y activá «Guardar el audio de la grabación» antes de empezar. Mantené la pantalla encendida y preferentemente Brave en primer plano. Delta solicitará guardar fragmentos parciales al pausar, marcar momentos o pasar la página al fondo. Si el micrófono deja de enviar muestras o Whisper tiene muchos fragmentos pendientes, la aplicación mostrará un aviso. En el segundo caso, pausá la grabación para permitir que la transcripción alcance lo ya grabado.

Los avisos **no interrumpen automáticamente la grabación**, ni sustituyen una copia descargada del audio. La transcripción de una sesión muy larga todavía puede agotar memoria; la continuidad con pantalla apagada no está garantizada. Después de la prueba, comprobá las primeras y últimas frases, los mensajes de aviso, los fragmentos pendientes y la descarga del audio.

## Audio: un principal y recuperación temporal (Delta 04)

Si activás «Guardar el audio», Delta conserva **un audio principal** y, cuando lo reemplazás, una **única copia temporal del audio anterior**. Al iniciar una nueva grabación, el anterior no se borra anticipadamente: se reemplaza recién cuando el navegador guarda el primer fragmento de audio nuevo. Si falla la captura antes de eso, sigue disponible el anterior.

En «Audio guardado» aparece **Recuperar audio anterior** cuando existe esa copia temporal. El botón intercambia cuál es el audio principal y permite deshacer el cambio. Cuando guardás otra grabación, se descarta la copia más antigua; no es un historial ni una copia de seguridad permanente. La copia temporal sigue ocupando espacio en el navegador. «Borrar audio» elimina tanto el principal como la copia temporal, con confirmación.

Las grabaciones se almacenan en IndexedDB, no en GitHub. La grabación breve puede no producir fragmentos si falla antes de que MediaRecorder entregue audio, y el sistema operativo puede borrar datos del navegador. Descargar el audio sigue siendo la forma de conservarlo fuera de Brave. Probar recuperación únicamente con audios ficticios en Android antes de usar información sensible.

## Notas y almacenamiento

La web almacena información en localStorage e IndexedDB. Las claves técnicas existentes (algunas llevan el término «gamma») **se conservaron deliberadamente** para no ocultar las notas, ajustes, audio y diccionario guardados en Brave. GitHub Pages usa el mismo origen en la nueva URL raíz. **No borres los datos del sitio en Brave.** Antes de hacer cambios grandes, exportá copias de notas ficticias que quieras conservar.

Este prototipo no ha sido auditado para procesar información identificatoria real. La anonimización automática puede equivocarse y el almacenamiento local no supone cifrado seguro o control biométrico.

## Cómo continuar con cualquier IA

1. Pedir que lea `README.md`, `AGENTS.md` y `CAMBIOS.md`.
2. Trabajar sobre la única app: `index.html`.
3. Realizar cambios pequeños, con commit identificable y explicación sencilla.
4. Ejecutar: `node --test tests/delta.test.mjs`.
5. Confirmar con información ficticia en el Motorola: grabar, pausar, desplazarse, detener, terminar transcripción, corregir, guardar, anonimizar, recuperar al reabrir.
6. Registrar en `CAMBIOS.md` qué cambió, qué pasó las pruebas y qué queda pendiente.

**Tres estados distintos:** código subido a GitHub ≠ pruebas automáticas aprobadas ≠ funcionamiento confirmado en Android.

## Problemas pendientes

- Investigar números inesperados y errores observados al grabar en el Motorola. Necesitamos «Detalles técnicos de la última grabación» para confirmar el origen.
- Validar Whisper, almacenamiento y permisos en sesiones largas.
- Confirmar recuperación de borrador y diccionario al abrir la URL raíz.
- Mejorar la estética de la barra fija sin perder claridad ni controles.
- La app Android nativa sigue siendo una idea futura, no la versión web oficial.
