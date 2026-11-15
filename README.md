# Grabador de voz Delta — Prueba Delta

**Aplicación oficial:** https://ignabidon.github.io/notas-voz/

Esta es la **única versión web activa** del repositorio, basada en Delta 07 con una nueva navegación Android en Delta 08. Está pensada para Android/Brave.

> **Prueba Delta 08 — experimental.** El usuario confirmó grabación, Whisper, guardar TXT, recuperación de audio y Delta 07 en Brave Android. La nueva navegación de tres pantallas requiere otra prueba en el Motorola. No usar datos reales de pacientes.

## Funciones
- Grabación de voz, cronómetro, pausa/reanudación, marcas y detención.
- **Tres pantallas:** Grabar, Texto y Ajustes, accesibles desde la barra inferior. Mientras se graba, mantiene **Pausar/Reanudar** y **Detener** sin importar qué pantalla esté abierta.
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


## Guardar audio y compartir texto (Delta 11)

En Grabar, activá «Conservar también el audio» antes de empezar. Está sincronizado con Ajustes → Audio. Al terminar y completarse Whisper, tocá «Guardar audio» para descargar el audio guardado en Brave en su formato nativo (normalmente WebM, M4A u Ogg). Si no activaste la opción, no existe audio para descargar y el botón queda desactivado. El audio original no está anonimizado ni cifrado: evitá datos sensibles reales. La opción MP3 y la recuperación del último audio anterior siguen disponibles.

En Texto, sobre el editor, están a la vista «Corregir selección», «Copiar», «Seleccionar todo» y «Compartir». Compartir utiliza el menú nativo de Android para texto plano; si Brave falla o no tiene soporte, intenta copiar al portapapeles y, si eso también falla, selecciona el texto. Antes de compartir exige revisar si hay datos identificatorios y si la transcripción está incompleta. TXT y Word siguen disponibles.

En una prueba real, Whisper Small tardó 2:10 para transcribir ~1:10 de audio. Puede ser normal en un teléfono, pero para evaluar la diferencia con Base conviene transcribir exactamente el mismo archivo ficticio con ambos modelos.

## Un solo estado de transcripción y cómo investigar una demora (Delta 10)

El estado de Whisper queda **exclusivamente en la barra inferior fija** mientras la transcripción está en marcha. Ya no repite «Procesando», tiempo, barra de progreso o «Cancelar procesamiento» dentro de la pantalla Grabar o del editor. Los mensajes de finalización, errores y advertencias importantes se conservan al terminar. El cartel global también funciona si cambiás de Grabar a Texto o Ajustes.

Si parece que tarda más, abrí **Ajustes → Calidad de transcripción** y comprobá el modelo: **Small** suele exigir mucho más tiempo y memoria que **Base**. Para comparar sin cambiar la grabación, activá Guardar audio, conservá el TXT actual y retranscribí **el mismo audio ficticio** con Base y Small. Consultá **Grabar → Detalles técnicos de la última grabación**: se informan nombre del modelo, método GPU/CPU, partes y tiempo de proceso sin guardar lo que dijiste en esos detalles. El tiempo que muestra la barra es transcurrido de espera, no una medida del rendimiento de cada modelo.

El motor de inferencia y los modelos no cambiaron en esta etapa. Se redujeron escrituras visuales repetidas; no está demostrado que eso explique ni corrija una diferencia de velocidad. Las comparaciones confiables requieren el mismo audio, el mismo modelo y condiciones similares de teléfono.

## Progreso visible en cualquier pantalla (Delta 09)

Al transcribir con Whisper, un **cartel fijo sobre la barra inferior** informa que la transcripción sigue en marcha tanto en Grabar como en Texto o Ajustes. Tras detener la grabación muestra «Esperá mientras se completa la transcripción», tiempo y fragmentos pendientes. Mientras estás grabando con Whisper, el mensaje indica que podés seguir grabando o consultar Texto. Si no puede calcular un porcentaje, usa una animación sin número para evitar estimaciones falsas. Puede ofrecer **Cancelar transcripción**, reutilizando el control original y su confirmación de pérdida de las partes todavía sin transcribir.

Los iconos de navegación ahora tienen un estilo uniforme: micrófono para Grabar, hoja para Texto y **sliders** para Ajustes. El indicador desaparece al finalizar, cancelar o fallar el procesamiento. La transcripción y el reconocimiento no cambian.

**Prueba:** con contenido ficticio, grabá y detené; mientras Whisper termina, entrá a Texto, revisá que el aviso continúe arriba de la navegación y que las últimas palabras aparezcan. Volvé a Ajustes y comprobá que el aviso persiste y que el símbolo es de sliders. Al completarse, el indicador debe desaparecer. No hace falta probar «Cancelar» si querés conservar la transcripción completa.

## Navegación en tres pantallas (Delta 08)

El rediseño crea tres vistas distintas, sin instalar otra app: **Grabar** (micrófono grande, cronómetro, estado y audio conservado), **Texto** (editor amplio, corregir, copiar, anonimizar y Guardar .txt) y **Ajustes** (calidad de Whisper, audio, privacidad, diccionario y opciones avanzadas). La barra inferior cambia las acciones disponibles según la pantalla. Durante una grabación, los controles fijos Pausar y Detener se mantienen visibles incluso si entrás en Texto para consultar la transcripción.

Todos los controles originales siguen existiendo y sus datos permanecen en Brave. Las tres pantallas son distintas vistas del **mismo** documento web: cambiar entre ellas no debe detener el micrófono, reiniciar Whisper, borrar texto ni alterar datos. Privacidad está dentro de Ajustes, y el enlace directo `#localPrivacy` sigue funcionando.

### Prueba recomendada en Brave Android

1. Abrí la web, verificá que aparece **Grabar** como pantalla inicial y que la barra inferior tiene tres destinos.
2. Grabá una frase ficticia; mientras grabás, entrá en **Texto** y regresá a **Grabar**, sin detener la sesión. Probá Pausar, Marcar y Detener.
3. En Texto, corregí una palabra y guardá un TXT; comprobá la descarga.
4. En Ajustes, comprobá que podés elegir Base/Small, activar Guardar audio, abrir Privacidad y consultar el Diccionario.
5. Verificá que el audio anterior todavía puede recuperarse y que los textos no desaparecen al cambiar de pestaña.

La rama de recuperación de la interfaz previa es [respaldo-delta-07-antes-de-delta-08](https://github.com/ignabidon/notas-voz/tree/respaldo-delta-07-antes-de-delta-08). No se modificó la lógica de Whisper ni el almacenamiento.

## Diseño cómodo para una mano (Delta 07)

La interfaz móvil de Delta ahora utiliza textos y controles más grandes, mayor contraste y explicaciones breves. En teléfonos, la barra fija queda pegada al borde inferior del dispositivo y permite **Grabar**, **Anonimizar** y **Guardar .txt** sin estirar el pulgar hasta arriba. Durante una grabación se reemplaza por **Pausar/Reanudar** y **Detener**, igual que antes. Los controles principales no se duplican funcionalmente: los botones inferiores accionan los mismos comandos de Delta.

En la navegación inferior aparecen **Grabar**, **Texto**, **Ajustes** y **Privacidad**. Privacidad abre directamente la sección «Privacidad y datos guardados» aunque Ajustes esté cerrado. También se movió esa sección al principio de Ajustes. Las opciones avanzadas y los detalles técnicos siguen disponibles cuando los necesitás, y las advertencias sobre información sensible se conservan.

La revisión es visual y de navegación: no cambia el reconocimiento de voz, el segmentador, la persistencia de audio y notas, los modelos ni el cifrado. Se validan las rutas mediante pruebas automáticas; todavía hace falta comprobar legibilidad, desplazamiento y alcance del pulgar en Brave Android, con datos ficticios.

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
