# DictaVoz · Prueba corta en el celular

> **Para:** Ignacio. Este archivo no cambia de nombre. Lo mantiene la IA que haga cada paso.
> **Aviso de Ignacio (17/11/2026):** tengo **limitaciones técnicas para hacer pruebas en el Motorola**. **Si una prueba se puede evitar, se evita**: las IA deben probar todo en laboratorio y pedirme solo lo que únicamente se ve en el teléfono, con pasos cortos y de a pocos. Los pasos que siguen sin probar **no frenan** el avance.
> **No es obligatoria para seguir avanzando.** Las IA prueban todo lo posible en laboratorio; esto es solo lo que **únicamente se ve en tu teléfono**.
> **Usá solo datos inventados.** Nada de pacientes reales.
> Última actualización: 17/11/2026, 9:19 (con tu reporte de la prueba en el Motorola, ya con E3 unido a `main`).

## Dónde estás

**Hecho y andando (según tu reporte):** grabar y guardar, reproducir desde la nota, editar y cancelar la edición, protección con contraseña, quitar el audio de una nota, y el panel de espacio en Ajustes.
**Falta confirmar** (en la tabla, «sin probar»): la copia cifrada (pasos 5 y 6), adelantar y pausar el audio (11), qué contesta «almacenamiento persistente» (12) y «Ver nota» (14).
Con eso ya podés dar por buena la parte de audio. Lo que sigue importando es la **copia cifrada**: es lo único que no se puede probar en laboratorio.

## Antes de empezar

Abrí **https://ignabidon.github.io/notas-voz/** en Brave. Si ya la tenías abierta, **cerrá esa pestaña y abrila de nuevo**. **Tené una sola pestaña de DictaNota abierta**: con dos, la segunda no puede guardar (te pasó hoy; es lo correcto, ver «Lo que viste» más abajo).

Texto inventado para leer en voz alta: *«Hoy hablé con Ana Ejemplo. Si querés, mañana seguimos. Su teléfono inventado es 11 5555 1234.»*

## Los pasos

Marcá cada uno como **bien** o **falló**. Si falló, sacá una captura.

| # | Qué hacés | Qué deberías ver | Estado (17/11) |
|---|---|---|---|
| 1 | En **Dictar**, tocá el micrófono, leé el texto y tocá **Detener**. | Aparece el texto escrito. | ✔ bien |
| 2 | Tocá **Guardar**. | La nota aparece como un globo dentro de un cuaderno. | ✔ bien (la primera vez no guardó por tener dos pestañas abiertas; al cerrar una, guardó) |
| 3 | Cerrá Brave y volvé a abrir la dirección. Entrá a **Cuadernos**. | La nota sigue ahí, con el comienzo del texto y «Hoy» con la hora. | ✔ probablemente (reproduciste la nota después de cerrar). Confirmalo si no cerraste Brave del todo |
| 4 | Tocá **Editar** en una nota y después **Cancelar edición**. Tocá **⋯**. | Vuelve al mensaje anterior. El menú muestra «Mover a otro cuaderno» y «Borrar esta nota». | ✔ Editar y Cancelar. ⋯ → Mover y Borrar: sin confirmar |
| 5 | **Ajustes → Copia cifrada → Crear copia cifrada**, con una contraseña de prueba (por ejemplo `prueba inventada 123`). | Dice «Copia creada y comprobada» y Brave descarga un archivo. | ☐ sin probar |
| 6 | Tocá **Verificar una copia**, elegí ese archivo y poné la misma contraseña. | Dice «Copia correcta». | ☐ sin probar |
| 7 | **Ajustes → Protección con contraseña y huella.** | La protección activada funciona: se desbloquea con la contraseña. | ✔ bien (ya la tenías activa) |
| 8 | En **Dictar**, con **Conservar audio** encendido, grabá 20 segundos, **Detener** y **Guardar**. | Dice «Audio guardado cifrado» y la nota se guarda. | ✔ bien |
| 9 | Abrí la misma dirección en **otra pestaña** con la primera abierta. | Aviso «DictaNota está abierta en otra pestaña». Es correcto. | ✔ bien (te pasó sin querer al guardar) |
| 10 | En **Cuadernos**, abrí la nota con audio y tocá **Reproducir**. | Se escucha la grabación; el botón pasa a **Pausar**. | ✔ bien |
| 11 | Con el audio sonando, arrastrá la barra y soltala. Probá **Pausar** y **Reanudar**. | Salta a ese punto y sigue. | ☐ sin probar |
| 12 | **Ajustes → Espacio y audios guardados → Actualizar espacio.** Después **Solicitar almacenamiento persistente**. | Cantidad de audios, espacio libre estimado, y «Sí» o «No» para la protección contra limpieza. | ✔ parcial: viste el espacio libre y los botones. Falta anotar qué dijo la protección persistente (Sí o No) |
| 13 | En la nota: **⋯ → Quitar audio de esta nota**. | El texto sigue igual; el reproductor desaparece. | ✔ bien (después el panel mostró 0 audios) |
| 14 | **Ajustes → Espacio y audios guardados**: en un audio, **Ver nota**. | Te lleva al cuaderno de esa nota. | ☐ sin probar (no quedaban audios) |

**Extra que comprobaste:** con un audio sonando, recargar la página la bloquea y pide la contraseña de nuevo. Es lo esperado: recargar bloquea la protección.

### Lo que falta, en orden de importancia

1. **Pasos 5 y 6** (copia cifrada): confirman que Brave descarga el archivo y después deja elegirlo.
2. **Paso 14 y 11:** para probarlos necesitás volver a grabar un audio con **Conservar audio** (20 a 30 segundos, o más para probar el adelantar).
3. **Paso 12:** solo anotar si «Solicitar almacenamiento persistente» dijo Sí o No.
4. **Si tenés ganas:** dejar un audio sonando 15 minutos sin tocar la pantalla: la app debería bloquearse sola (es lo acordado). Y probar adelantar en un audio largo (varios minutos): ¿tarda mucho?

## Lo que viste y quedó anotado (no es una prueba, son pendientes)

| Qué notaste | Qué pasa hoy | Estado |
|---|---|---|
| Guardar dice que no se guardó porque DictaNota está abierta en otra pestaña | Es el comportamiento correcto y seguro (solo una pestaña escribe). Pero el mensaje no te dice cuál pestaña cerrar ni cómo encontrarla | A revisar: mensaje más claro |
| Después de aceptar un cambio en una nota, no se puede volver atrás | Cierto: «Deshacer» existe para mover notas, borrar el borrador y anonimizar, **pero no para una edición ya guardada** | A decidir con vos: ¿hace falta deshacer o historial de ediciones? |
| Ajustes tiene demasiadas opciones y mucho texto; no se entiende dónde está cada cosa | Es un problema de diseño real, no de funcionamiento | Pendiente de rediseño (ver «Ajustes» abajo) |
| «Espacio y audios guardados» mostraba 0 audios | Correcto: habías quitado el único audio | Sin acción |

### Ajustes: qué habría que resolver
Ideas para cuando se encare (no están decididas): agrupar por tarea («Protección», «Copias», «Audio y espacio», «Transcripción», «Aspecto»), que cada grupo se abra aparte con una línea corta, textos más breves, y un buscador o un acceso rápido a lo que más se usa. Antes de programar, la IA te muestra una maqueta y espera tu aprobación.

## Nombre de la aplicación (decidido el 17/11/2026)

La app se llama ahora **DictaVoz** (antes DictaNota, que ya usaba otra aplicación). Cambió **solo lo que se ve dentro de la app**: título, encabezado, avisos y el nombre del archivo de copia (`DictaVoz-copia-AAAA-MM-DD.dictanota`).
- **No cambia** (decisión de Ignacio): el repositorio y la dirección del sitio (`ignabidon.github.io/notas-voz/`), las claves internas de lo guardado, el candado de una pestaña y la extensión `.dictanota`. Así no se pierde ninguna nota ni copia ya hecha.
- Una llave de acceso (huella) creada antes del cambio sigue apareciendo como «DictaNota» en el administrador de contraseñas del teléfono. Funciona igual.
- **Para vos:** si tenías el acceso directo en la pantalla principal, puede seguir mostrando el nombre viejo hasta que lo vuelvas a agregar. No afecta el funcionamiento.
- Falta que verifiques por tu cuenta que «DictaVoz» tampoco esté tomado.

## Cómo contarlo

Escribí algo así en el chat, y pegá las capturas de lo que falló:

`5 bien · 6 bien · 11 bien · 12 persistente: No · 14 bien`

Con eso la IA marca como «probado en el Motorola» **solo** lo que vos confirmaste.

La prueba larga y detallada (Whisper, MP3, huella, etc.) sigue en [PRUEBA-MOTOROLA-Y-PENDIENTES-USUARIO-2026-11-16.md](PRUEBA-MOTOROLA-Y-PENDIENTES-USUARIO-2026-11-16.md), para cuando haga falta.
