# DictaNota · Propuesta estética: perspectiva y cambios (16/11/2026)

> **Responsable de este documento:** Claude. **Solo documentación**: no cambia código, no autoriza uniones a `main` y no reemplaza decisiones del usuario.
> **Base revisada:** `main` = `2f56388` (Delta 11, estética «Clínica contemporánea», PR #36).
> **Para quién:** ChatGPT, que lo retoma **después de terminar** el trabajo de su rama `rediseno-04-clinica-chat-chatgpt` (nuevo PR, sin squash). Hasta entonces, **no tocar** esa rama ni las partes que ocupa (compositor y burbujas de Notas).
> Lectura previa obligatoria: [AGENTS.md](../AGENTS.md), [SEGURIDAD.md](../SEGURIDAD.md), [CONTINUAR-AQUI.md](../CONTINUAR-AQUI.md).
> **Actualizado el 16/11/2026 (13:22):** el usuario confirmó B2, eligió **«Dictar»** como nombre de la primera pestaña (nueva **Etapa N**) y aprobó un **reproductor de audio dentro de cada burbuja** (nueva **Etapa E**, que modifica una regla de AGENTS.md). El nombre de la segunda pestaña sigue pendiente. Ver secciones 4 (N y E), 5 y 6.

---

## 1. Cómo se revisó (y qué no)

- `index.html` abierto en Chrome sin conexión, a **412×892** y **360×740**, con datos ficticios. Se recorrieron Audio, Notas (lista, hoja con notas, compositor), Anonimizar y Ajustes.
- Los estados «grabando», «pausado» y «transcribiendo» se **simularon forzando clases CSS**: no hubo micrófono ni Whisper. Se leyó el CSS completo y se calcularon contrastes.
- **No se probó** en el Motorola/Brave, ni el diálogo «Corregir selección», ni la pantalla de desbloqueo, ni modo horizontal.
- Mediciones y recuentos citados acá son del `main` indicado; si `main` cambió, **volver a medir** antes de aplicar.

## 2. Mi perspectiva

**Veredicto:** la base visual es buena. El estilo (azul petróleo, fondos fríos claros, rojo solo para grabar y borrar) transmite calma y es apropiado para una herramienta de trabajo con material delicado. Lo que le falta no es estilo sino **jerarquía y densidad**: varias pantallas ponen a competir los mismos pesos visuales y la barra fija se come la pantalla de Notas. Además quedaron rótulos de una etapa anterior.

**Lo que ya funciona (conservar tal cual):**
- Paleta contenida y estados de captura claros (grabando = rojo, pausado = ámbar, transcribiendo = tarjeta azul con barra y «Cancelar»).
- Texto con contraste muy bueno (5,8:1 a 7,8:1), tipografía de 16–18 px, objetivos táctiles ≥48 px, cronómetro grande con cifras tabulares.
- Navegación inferior con ícono y texto, foco visible, respeto de «reducir movimiento», tamaño de texto ajustable.

**Principios que guían las propuestas:**
1. **Una acción principal por pantalla.** Si dos botones tienen el mismo peso, ninguno es el principal.
2. **El contenido manda.** La barra fija no debería ocupar más de ~30 % de la altura en reposo (objetivo sugerido por mí; hoy 44–53 %).
3. **Menos bordes, más jerarquía.** Lo secundario va en un menú; lo frecuente, a la vista.
4. **Un solo vocabulario** en toda la interfaz.
5. **Lo privado se ve, y sin prometer de más.** Estado de protección visible; ninguna frase que AGENTS.md prohíba («anonimización infalible», «cifrado seguro»).
6. **Legible al sol.** Los controles necesitan borde con contraste suficiente, no solo el texto.

## 3. Restricciones del repositorio que condicionan cada cambio

Resumen de AGENTS.md/SEGURIDAD.md aplicado a esta propuesta (si hay conflicto, **vale el repositorio**):

- **Nada de `innerHTML` con datos del usuario**, ni `eval`. Todo resaltado o vista previa se arma con `createElement`/`textContent`.
- **Sin dependencias, fuentes, íconos ni servicios externos.** Íconos SVG **en línea** (como los de la barra inferior). Una dirección externa nueva exige CSP + SEGURIDAD.md + pruebas.
- Almacenamiento: no renombrar claves «gamma»; datos protegidos solo con `vaultStore`. Las etapas A–D **no necesitan tocar almacenamiento**; la **Etapa E** (audio en la burbuja) sí, y exige plan y permiso explícito.
- **No tocar** Whisper, captura, Worker ni cola. Tampoco el audio guardado, salvo en la Etapa E (con permiso explícito). El aviso de transcripción sigue siendo **único y global** en `.studio-dock`.
- Objetivos táctiles ≥48 px en controles principales; **no recortar rótulos para que entren**.
- **No poner nombres de IA ni créditos en la interfaz**; la autoría va solo en documentación.
- Las **pestañas se mantienen en cuatro**. La primera se llama «Dictar» (decidido); el nombre de la segunda lo decide el usuario (Etapa N). Hasta entonces solo se corrigen rótulos viejos (A1).
- Funcionalidades nuevas **requieren autorización expresa**. Autorizado el 16/11/2026: **modo oscuro opcional** (D2) y **audio en la burbuja** (E, con plan y permiso antes de programar).
- Cada etapa: rama nueva desde `main` actualizado, pruebas, registro en CAMBIOS.md, **tres niveles de estado** (código guardado / pruebas técnicas / probado en el Motorola), **capturas al usuario antes de publicar** y **unión a `main` solo con su permiso**, sin squash.

## 4. Cambios propuestos

Cada ítem indica: qué se ve hoy → cambio → dónde → criterio de aceptación. Los nombres de ids/clases son los del `index.html` actual.

### Etapa A · Ajustes menores (riesgo bajo)

**A1. Rótulos viejos «Texto».** La pestaña es «Notas», pero la interfaz sigue diciendo «Texto» en cinco lugares:
`.anon-preview:empty::before` («…algo en «Texto»»), `#learnHelp` («Si corregís una palabra en «Texto»…»), `#anonPreviewLabel` («se edita en «Texto»»), el botón `data-go-view="transcripcion"` («Ir a Texto para editarlo») y el mensaje de estado del dictado local («Los resultados aparecen en Texto»).
→ Reemplazar por «Notas» (o «la nota»). **No renombrar pestañas** en esta etapa (eso es la Etapa N).
*Aviso:* como el nombre de la segunda pestaña cambiará (Etapa N), conviene redactar estas frases **sin nombrar la pestaña** («la nota», «el texto de la nota») para no tocarlas dos veces.
*Criterio:* búsqueda de «Texto» entre «», sin resultados viejos; las pruebas que fijen esas cadenas se actualizan.

**A2. Accesos de Audio con el mismo estilo.** `#openSheets` («Ver hojas guardadas») tiene texto azul; `#writeNewNote` («Escribir una nota») texto oscuro, sin motivo (regla `#openSheets{…color:var(--acc)}`).
→ Mismo fondo, borde y color de texto en ambos.

**A3. Ajustes ordenados.**
- El botón (i) (`.info-toggle`) queda **solo en una línea** debajo del selector (tamaño de texto) y del diccionario → ponerlo **en línea con la etiqueta**.
- El selector `#model` **corta el texto** («Base · equilibrio entre velocidad y p…»). Sin recortar rótulos: dejar la opción con nombre corto y una **descripción debajo** (ya existe el texto de ayuda), o permitir el salto de línea.
- Íconos de módulo (`.module-icon`) mezclan glifos de texto: «Aa» (dos veces), «✦», «◉», «◇». → Un set de **SVG en línea de trazo** (mismo grosor que la barra inferior), uno distinto por módulo.

**A4. Punto de estado de grabación.** `.dock-capture-status .capture-dot` es ámbar tanto grabando como en pausa, mientras que `#rec.on` y el cronómetro son rojos.
→ Rojo con pulso al grabar; ámbar fijo al pausar. Mantener el respeto de «reducir movimiento».

**A5. «Procesamiento local» visible en el celular.** `.pill` se oculta en pantallas ≤760 px (justo el celular).
→ Mostrar la misma señal en una línea compacta bajo el logo (ícono de candado SVG).
⚠ **Mantener el texto «Procesamiento local».** No escribir «sin nube» ni «todo en tu celular»: el motor se carga desde `cdn.jsdelivr.net` y los modelos desde `huggingface.co` (ver CSP), y los audios aún no están cifrados. Si hay protección activada, se puede sumar «Protegida».

**A6. Pantalla Audio sin repeticiones.**
*Hoy:* casi la misma frase aparece **dos veces** en el estado vacío («Activá «Conservar audio» antes de grabar», en `#recordAudioHint` y en `#audioEmpty`); hay **tres botones «Descargar audio»** (`#recordDownloadAudio`, `#aDown`, `#audioDoneDownload`) y el primero queda **deshabilitado** aunque no haya nada que bajar; y en el encabezado de la tarjeta la etiqueta «Conservar audio» queda flotando sobre el interruptor, separada del título.
*Cambio:* mantener `#audioBox` y «Mis grabaciones» **siempre visibles** (AGENTS.md lo exige), pero dejar **un solo mensaje** de estado vacío; mostrar `#recordDownloadAudio` solo cuando hay un audio para descargar (o unificarlo con `#aDown`); poner «Conservar audio» en una fila propia (etiqueta e interruptor en la misma línea, ayuda debajo).
*Criterio:* en el estado vacío no hay frases repetidas ni botones deshabilitados sin motivo; con audio guardado se conservan todas las acciones actuales (descargar, convertir a MP3, transcribir, borrar, recuperar anterior). Actualizar las pruebas que fijen esos ids.

### Etapa B · Jerarquía y densidad (impacto alto; toca el compositor y las burbujas)

> Esperar a que **termine y se integre** la rama de ChatGPT: B1 y B3 modifican exactamente esas partes.

**B1. Barra fija de Notas más baja.**
*Hoy:* con una hoja abierta y el compositor vacío, `.studio-dock` mide **396 px de 892 (44 %)** a 412 px y **393 px de 740 (53 %)** a 360 px; las burbujas quedan en la mitad superior y sus botones se cortan detrás de la barra.
*Cambio:* `#convComposer` arranca **colapsado** como una línea («Escribí o grabá…», estilo chat) y se expande al tocarlo o al llegar texto. La frase «Al guardar, se crea una hoja nueva…» (`#convTarget`) pasa a un texto breve dentro del campo o a un aviso que se oculta. «Herramientas» (`#convToolsToggle`) y «Descartar» (`#convDiscard`) pasan a un menú ⋯. «Guardar» (`#save`) aparece **solo cuando hay texto**.
*No romper:* advertencias al guardar mientras se graba o transcribe; `initErgonomics`/`--dock-space` (ResizeObserver); `body.keyboard-open`; el borrador y el aprendizaje de correcciones; el textarea sigue siendo `#text`.
*Criterio:* a 360×740, hoja abierta y compositor en reposo, la barra mide **≲30 %** de la altura; los botones de la última burbuja se ven completos sin desplazar; con teclado abierto no empeora lo actual. Verificar a 320/360/412/760.

**B2. Una sola acción principal.**
*Hoy:* en Audio hay **dos «Grabar»** (círculo `#rec` y `#studioDockStart`); en Notas, «Grabar» y «Guardar» tienen el mismo relleno.
*Cambio:*
- Audio: mostrar `#studioDockStart` **solo cuando `#rec` quedó fuera de la vista** (IntersectionObserver), para conservar el acceso al desplazarse sin duplicarlo.
- Notas: «Guardar» relleno; «Grabar» como botón secundario (contorno o redondo con micrófono).
**Estado: CONFIRMADO por el usuario (16/11/2026, después de la explicación con captura).** Aplica a las dos partes. «Audio» es la pestaña que pasará a llamarse «Dictar» (Etapa N): la regla vale igual con el nombre nuevo. AGENTS.md (punto 2 de la lista de pantallas) dice «Grabar en las pantallas Audio y Texto y Guardar en Texto»; este cambio la matiza (en Audio, Grabar en la barra solo cuando el círculo no se ve; en Notas, Grabar pasa a secundario): **actualizar esa frase en el mismo PR que lo implemente.** La línea «Grabar accesible también desde Texto, reutiliza #rec» sigue valiendo.
*Pruebas a actualizar:* las que fijan `#studioDockStart{display:none/flex}` por vista (`tests/delta.test.mjs`).

**B3. Burbujas y lista de hojas.**
*Hoy:* cada burbuja lleva **cuatro botones con borde** (Copiar, Editar, Mover, Borrar: `.conv-actions`). La lista (`.conv-item`) nombra cada hoja por fecha y repite la misma fecha en la segunda línea («1 nota · último 16/11/2026 · 12:44»); dos hojas del mismo día se ven casi iguales.
*Cambio:*
- Burbuja limpia: texto + sello de hora + **menú ⋯** (≥48 px, `aria-haspopup`). «Copiar» puede quedar visible. Reservar la **pulsación larga** para «ver original» cuando exista la anonimización con original recuperable (idea del usuario).
- Lista: segunda línea con cantidad de notas y **fecha relativa** («Hoy 12:44», «Ayer»), sin repetir la fecha. **El sello de guardado de cada nota sigue inmutable.**
- *Vista previa del texto en la lista:* **aprobada por el usuario (16/11, 13:02)**, que dejó el detalle a criterio de lo que mejor funcione. Criterio de Claude: **activada por defecto**, porque sin ella las hojas se distinguen solo por la fecha; **una línea, unos 60 caracteres**, armada con `textContent`; y un interruptor **«Mostrar vista previa en la lista»** en Ajustes, a un toque, cuyo texto de ayuda avise que la lista puede mostrar nombres reales mientras no se anonimicen. Con la protección activada queda cubierta por el bloqueo.

### Etapa C · Anonimización y contraste

**C1. Anonimizar: mostrar lo que se ocultó.**
*Hoy:* `refreshAnonPreview()` hace `anonPreview.textContent = text.value` (texto plano; hay una **prueba que fija esa línea exacta**). Para verificar hay que leer todo; el resumen («Se ocultaron 2 nombre(s) y 1 dato(s)…») es texto gris.
*Cambio:*
- Resaltar cada etiqueta reemplazada ([Persona 1], [número], códigos) como pastilla suave **armada con `createElement`/`textContent`** (clase nueva, p. ej. `.anon-chip`; `.anon-tag` ya existe con otro uso).
- Convertir el resumen en chips («2 nombres · 1 teléfono»).
- Quitar la tarjeta dentro de tarjeta de `#privacidad` (`.privacy-group` dentro de `.c-anon`): hoy suma borde y relleno de más.
- **No** implementar todavía el selector «Anonimizado / Original»: pertenece a la etapa de anonimización con original recuperable. Dejar el espacio previsto.
- Conservar el aviso «puede fallar: revisá siempre el texto».
*Pruebas:* actualizar la que fija `refreshAnonPreview`; agregar una que verifique que los resaltes no usan `innerHTML`.

**C2. Contraste de bordes y estados.**
*Hoy:* `--line` (`#D6E1E5`) tiene **1,24–1,33:1** contra sus fondos: campos, selectores y botones secundarios se desdibujan al sol (WCAG pide 3:1 para el contorno de controles). Deshabilitados: «Pausar»/«Marcar momento» ≈2,4:1 de texto, «Descargar audio» ≈2,5:1 (se logra bajando `opacity`). La pestaña activa se distingue casi solo por el color del texto (su fondo `#E6F0F3` sobre la barra blanca ≈1,15:1).
*Cambio:*
- Token nuevo `--line-strong`, por ejemplo **`#768F97`** (3,4:1 sobre blanco, 3,2:1 sobre `#F4F7F8`), para **controles** (inputs, selects, textarea, interruptor, botones secundarios). `--line` queda para separadores y tarjetas.
- Deshabilitados con colores explícitos en vez de `opacity`, texto ≥3:1 y aspecto claramente inactivo.
- Pestaña activa: sumar un indicador (barra superior de 3 px en `--acc` o ícono relleno).
*Criterio:* medir con script de contraste en CI o en prueba; capturas antes/después.

### Etapa D · Cimientos (antes de la app de Android)

**D1. Consolidar el CSS en tokens, sin cambiar cómo se ve.**
*Hoy:* `--surface-soft` vale lo mismo que `--bg` (`#F4F7F8`) y se usa **107 veces**; `.studio-dock{` se declara **14 veces** a lo largo de las capas Delta 07 → 11 → «Clínica contemporánea». Funciona, pero cada cambio exige pelear con capas anteriores.
*Cambio:* una hoja ordenada con tokens (`--surface`, `--surface-raised`, `--border`, `--border-strong`, `--accent`, `--danger`, `--warn`), **sin diferencias visuales** (comparar capturas de las cuatro pantallas a 360/412 antes y después).

**D2. Modo oscuro (opcional).** Hoy `color-scheme: light` y no hay `prefers-color-scheme`. **Autorizado por el usuario el 16/11/2026, como opción.**
→ Ajustes → «Apariencia»: **Claro** (predeterminado, como hoy) / **Oscuro** / **Automático** (sigue al sistema). Se guarda como campo adicional opcional de la configuración existente (igual que `textSize`), **sin claves nuevas**. Se hace **después de D1**.
*Criterio:* mismos mínimos de contraste que el tema claro (texto ≥4,5:1, bordes de controles ≥3:1); rojo de grabación y ámbar de pausa legibles; sin negro puro; capturas de las cuatro pantallas y de los estados de captura en ambos temas.

### Etapa N · Nombres y alcance de las pestañas (decidida en parte, 16/11/2026)

*Decisión del usuario:*
- **Pestaña 1 = «Dictar»** (reemplaza a «Audio»). Reúne **todo lo que tiene que ver con grabar o cargar audios para transcribir**: el círculo `#rec`, pausa, marcas y cronómetro, la carga de un archivo de audio, el estado de la transcripción, «Conservar audio» y «Mis grabaciones» (`#audioBox`).
- **Pestaña 2 = el lugar de las hojas**: conjuntos de notas relacionadas (p. ej. «Luciano», con varias notas tomadas en distintos días) y, al abrir una, sus notas en burbujas. **Nombre pendiente.** «Bitácora» queda descartado por demasiado formal; «Hojas» es exacto, pero al usuario le preocupa que no se entienda en el uso diario.
- **Pestañas 3 y 4:** Anonimizar y Ajustes, sin cambios.

*Alternativas para la pestaña 2 (propuestas por Claude, a elección del usuario):* **Cuadernos** (recomendada: cada cuaderno reúne las notas de una persona o tema, se lee natural en «Mis cuadernos» y no repite «Notas»), Carpetas, Hilos, Temas y, como último recurso, Hojas. Si se elige otro nombre, cambia también la palabra «hoja» en toda la interfaz.

*Dónde se toca:* etiquetas de la barra inferior, títulos, mensajes y ayudas de la interfaz, AGENTS.md (punto 2 de las pantallas y vocabulario vigente), README.md, CONTINUAR-AQUI.md y las pruebas que fijan esas cadenas. **No cambian** los ids internos (`grabacion`, `transcripcion`) ni las claves de almacenamiento.
*Cuidado:* en la app ya existe el «dictado local» del navegador; al llamar «Dictar» a la pestaña, revisar los mensajes de ese modo para que no se confundan.
*Orden:* después de terminar la rama de ChatGPT y **cuando el usuario fije el nombre de la pestaña 2**; hasta entonces no se renombra nada. Puede ir junto con la Etapa A (misma familia de textos).

### Etapa E · Audio dentro de la burbuja (aprobada el 16/11/2026)

*Idea del usuario:* en cada burbuja de una hoja, como en WhatsApp: arriba un **reproductor** (botón de reproducir/pausar, barra de avance y duración) y **debajo la transcripción**. Si la transcripción salió mal, se vuelve a escuchar el propio audio y se corrige.
*No se quiere:* resaltar en el texto la palabra que se está escuchando. El usuario lo descartó: no proponerlo ni implementarlo.
*Cambia una regla:* AGENTS.md dice «Audio solo a pedido, fuera de las burbujas». Esta etapa la reemplaza; **actualizar esa frase en el PR que la implemente**. Hasta entonces las burbujas no llevan audio.

*Alcance:*
- El reproductor aparece **solo en las notas que tienen audio guardado**, es decir, las grabadas con «Conservar audio» activado. Las notas escritas, o dictadas sin conservar audio, se ven como hoy.
- Se reproduce con el elemento de audio del navegador y una dirección `blob:` (la CSP ya permite `media-src 'self' blob: data:`), sin librerías ni servicios externos.
- Suena **un solo audio a la vez**; el audio se carga **recién al tocar reproducir**, no al abrir la hoja, y se libera el `blob:` (`URL.revokeObjectURL`) al terminar o salir de la hoja.
- Accesibilidad: botón ≥48 px con nombre que cambia («Reproducir» / «Pausar»), barra de avance operable con teclado, respetar «reducir movimiento».
- **Duración:** usar la duración (`ms`) que la app ya guarda con cada audio. Los WebM que graba el navegador suelen no declarar duración y la barra puede fallar al adelantar; **probar en el Motorola con Brave** (adelantar, retroceder, pausa, duración).
- Sugerido (a confirmar con el usuario): en el menú ⋯ de la burbuja, «Descargar audio» y «Borrar audio» (sin borrar el texto).

*Almacenamiento y datos (la parte delicada):*
- Hoy hay solo dos audios sueltos (`last` y `previous`, en la base `notasvoz-gamma-audio`), **sin vínculo con ninguna nota**. Hace falta un **almacén nuevo de audios por nota**, enlazado por el identificador de la nota, **sin renombrar ni tocar** lo existente (`chunks`, `meta`, claves históricas). Migración solo aditiva, con prueba de que las notas y el audio actuales quedan intactos.
- Reglas: **mover** una nota a otra hoja conserva su audio; **borrar una nota** borra su audio (la confirmación lo avisa); **borrar una hoja** borra los audios de sus notas.
- Tamaño: grabación a 32 kbps ≈ **14 MB por hora**, ≈ **0,7 MB** por una nota de 3 minutos; 100 notas ≈ 70 MB y 1000 ≈ 700 MB (el texto ocupa unos KB). **Procesamiento:** sin costo extra; reproducir no usa Whisper.
- Riesgo: sin almacenamiento persistente, el navegador puede borrar datos si falta espacio. Pedir `navigator.storage.persist()` y mostrar en Ajustes cuánto ocupan los audios (`navigator.storage.estimate()`), con aviso cuando quede poco.
- Los audios **cargados desde archivo hoy no se conservan**. **Decisión pendiente del usuario:** ¿conservarlos también, vinculados a su nota?

*Privacidad (condición para activarla):*
- El audio **no se puede anonimizar**: aunque el texto diga «[Persona 1]», la voz dice el nombre real. Por eso los audios guardados con cada nota deben quedar **cifrados con la protección del repositorio** (revisar `vaultStore` y SEGURIDAD.md), **antes o junto con** el reproductor, nunca después. Aviso breve junto a «Conservar audio»: guarda la voz real en este dispositivo.
- Las exportaciones (texto, Word, anonimizado) **no incluyen audio**.
- Pruebas con audios ficticios; nada de datos reales de pacientes.

*Subetapas, en este orden:*
1. **E1** · almacén por nota y vínculo (sin pantalla nueva); pruebas de migración, mover y borrar.
2. **E2** · cifrado de los audios guardados (puede ir junto con E1).
3. **E3** · reproductor en la burbuja, almacenamiento persistente y espacio usado en Ajustes.

*Condiciones:* **después de B3** (el reproductor vive en la burbuja ya limpia) y con el modo oscuro (D2) incluyéndolo. Toca almacenamiento: **plan breve y permiso explícito del usuario antes de programar**; una rama y un PR por subetapa, sin squash.

## 5. Orden y ramas sugeridos

| Paso | Qué | Notas |
|---|---|---|
| 0 | Terminar el trabajo de `rediseno-04-clinica-chat-chatgpt` (PR nuevo, sin squash) | Con permiso del usuario para unir |
| 1 | **Etapa A** en una rama (p. ej. `estetica-a-ajustes-2026-11-16`) | Riesgo bajo; mostrar capturas |
| 2 | **Etapa N** (nombres de pestañas) | Cuando el usuario fije el nombre de la pestaña 2; puede ir junto con A |
| 3 | **Etapa B** (B1, B2, B3), una rama o PR por ítem | Tras 0; coordinar con el usuario |
| 4 | **Etapa E** (audio en la burbuja): E1 → E2 → E3 | Tras B3; permiso explícito por tocar almacenamiento |
| 5 | **Etapa C** | C1 antes de la anonimización con original recuperable |
| 6 | **Etapa D** | Antes de la app de Android; D2 incluye el reproductor |

En cada PR: pruebas Node + las tres de navegador (`browser.mjs`, `cifrado-browser.mjs`, `notas-browser.mjs`), entrada en CAMBIOS.md (responsable, rama, SHA base, alcance, pruebas, pendientes) y capturas con datos ficticios a 360 y 412 px.

## 6. Decisiones del usuario (16/11/2026, 13:02)

1. **Unir este documento a `main`:** autorizado (es solo documentación y no toca `index.html` ni lo que ocupa la rama de ChatGPT).
2. **Nombres definitivos de las pestañas:** *(actualizado, ver punto 7)* A1 no los cambia; la Etapa N los resuelve.
3. **B2 (Grabar en la barra de Audio solo cuando el círculo no se ve):** *(actualizado)* pidió una explicación más clara y después **confirmó**.
4. **B3:** **aprobados** el menú ⋯ en las burbujas y la vista previa del texto en la lista; el detalle queda a criterio de lo que mejor funcione (ver B3).
5. **D2:** **aprobado** un modo oscuro **opcional** (ver D2).

**Decisiones posteriores (16/11/2026, hasta las 13:22):**

6. **B2 confirmado** («Sí, confirmo lo de grabar»): se aplica en las dos partes (Audio y Notas).
7. **Pestañas:** la primera se llama **«Dictar»** y reúne todo lo de grabar y cargar audios para transcribir. La segunda contiene las hojas; **su nombre sigue pendiente** (descartado «Bitácora»; ver Etapa N).
8. **Audio en la burbuja:** **aprobado** un reproductor estilo WhatsApp sobre la transcripción de cada nota, para volver a escuchar y corregir (Etapa E). **No** se quiere el resaltado de la palabra que se escucha.
9. **Orden:** la Etapa E va **después del trabajo de ChatGPT** y de B3; antes de programar, plan breve y permiso explícito, porque toca almacenamiento y reemplaza la frase de AGENTS.md «Audio solo a pedido, fuera de las burbujas».

## 7. Qué NO cambia esta propuesta

Captura, pausa, marcas y cronómetro; Whisper y su aviso único; correcciones y aprendizaje; diccionario; anonimización (lógica); protección cifrada; almacenamiento y claves (salvo el almacén nuevo de audios de la Etapa E, solo aditivo); exportaciones; barra de navegación de cuatro pestañas (se renombran dos, ver Etapa N; los ids internos no cambian); paleta general.
